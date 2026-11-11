/*
 * Postos — busca, filtros, ordenação e recomendação (funções puras, testáveis no Node).
 *
 * Dados: ANP, Levantamento de Preços de Combustíveis (pesquisa SEMANAL e por AMOSTRAGEM),
 * com a localização de cada posto estimada pelo endereço no CNEFE 2022 do IBGE
 * (veja scripts/postos/gerar_postos.py). Nada aqui grava dados da família.
 *
 * Distâncias são em LINHA RETA. Para estimar o custo do deslocamento, a distância é
 * multiplicada por um fator de rota (padrão 1,3), porque o caminho de carro é maior.
 */
(function (root) {
  'use strict';

  var PRODUTOS = [
    { c: 'GC', nome: 'Gasolina comum', un: 'L' },
    { c: 'GA', nome: 'Gasolina aditivada', un: 'L' },
    { c: 'ET', nome: 'Etanol', un: 'L' },
    { c: 'S10', nome: 'Diesel S10', un: 'L' },
    { c: 'S500', nome: 'Diesel S500', un: 'L' },
    { c: 'GNV', nome: 'GNV', un: 'm³' }
  ];
  var DO_APP = { Gasolina: 'GC', Etanol: 'ET', Diesel: 'S10', GNV: 'GNV' };
  var PRECISAS = { endereco: true, rua: true };     // 'cep' = aproximada; null = sem localização
  var FATOR_ROTA = 1.3;
  var ECONOMIA_MINIMA = 1;                          // abaixo de R$ 1 não vale chamar de "compensa"

  function produto(c) { return PRODUTOS.filter(function (p) { return p.c === c; })[0] || null; }
  function produtoDoCombustivel(comb) { return DO_APP[comb] || 'GC'; }

  function normalizar(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function distanciaKm(a, b) {
    var R = 6371, rad = Math.PI / 180;
    var f1 = a.la * rad, f2 = b.la * rad;
    var x = Math.pow(Math.sin((f2 - f1) / 2), 2) + Math.cos(f1) * Math.cos(f2) * Math.pow(Math.sin((b.lo - a.lo) * rad / 2), 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function diasEntre(isoA, isoB) {
    return Math.round((Date.UTC(+isoB.slice(0, 4), +isoB.slice(5, 7) - 1, +isoB.slice(8, 10)) -
      Date.UTC(+isoA.slice(0, 4), +isoA.slice(5, 7) - 1, +isoA.slice(8, 10))) / 86400000);
  }

  // Quão recentes são os dados: a ANP publica a semana pesquisada na segunda-feira seguinte.
  function statusDados(indice, hoje) {
    if (!indice || !indice.periodo || !indice.periodo.fim) return { nivel: 'ausente', dias: null };
    var dias = diasEntre(indice.periodo.fim, hoje);
    return { nivel: dias <= 10 ? 'atual' : dias <= 21 ? 'antigo' : 'desatualizado', dias: dias };
  }

  // O que a pessoa digitou: CEP (8 números) ou nome de cidade (com ou sem UF).
  function interpretarBusca(texto, municipios) {
    var t = String(texto || '').trim();
    if (!t) return { tipo: 'vazio' };
    var digitos = t.replace(/\D/g, '');
    if (/^\d{5}-?\d{3}$/.test(t.replace(/\s/g, '')) || (digitos.length === 8 && /^[\d.\-\s]+$/.test(t))) return { tipo: 'cep', cep: digitos };
    if (/^\d+$/.test(digitos) && digitos.length && /^[\d.\-\s]+$/.test(t)) return { tipo: 'invalido', motivo: 'O CEP precisa ter 8 números, por exemplo 13010-000.' };
    var m = /^(.*?)(?:\s*[-/,]\s*|\s+)([a-zA-Z]{2})$/.exec(t);
    var nome = normalizar(m ? m[1] : t), uf = m ? m[2].toUpperCase() : null;
    var achados = (municipios || []).filter(function (x) { return normalizar(x.n) === nome && (!uf || x.uf === uf); });
    if (!achados.length && uf) achados = (municipios || []).filter(function (x) { return normalizar(x.n) === normalizar(t); });
    if (!achados.length) return { tipo: 'cidade', candidatos: [], nome: t };
    return { tipo: 'cidade', candidatos: achados, nome: t };
  }

  // Municípios cujos postos podem estar dentro do raio (centro + tamanho da cidade + folga).
  function municipiosProximos(ponto, municipios, raio) {
    return (municipios || []).filter(function (m) {
      return m.la !== null && m.la !== undefined && distanciaKm(ponto, m) <= raio + (m.r || 0) + 3;
    });
  }

  // Monta a lista para um combustível. ponto = null quando a busca é por cidade (sem distância).
  function montarResultados(postos, opts) {
    var res = { lista: [], semLocalizacao: [], foraDoRaio: 0, semProduto: 0 };
    (postos || []).forEach(function (p) {
      var preco = p.p && p.p[opts.produto];
      if (!preco) { res.semProduto++; return; }
      if (opts.soBandeira && !p.b) return;
      var item = { posto: p, preco: preco[0], data: preco[1], distancia: null, precisa: !!PRECISAS[p.pr], aproximada: p.pr === 'cep' };
      if (opts.ponto) {
        if (p.la === null || p.la === undefined) { res.semLocalizacao.push(item); return; }
        item.distancia = distanciaKm(opts.ponto, { la: p.la, lo: p.lo });
        if (item.distancia > opts.raio) { res.foraDoRaio++; return; }
      }
      res.lista.push(item);
    });
    return res;
  }

  // Custo para ir até o posto, abastecer e voltar (estimativa).
  function custoTotal(item, litros, kmPorLitro, fator) {
    var deslocamento = 2 * item.distancia * (fator || FATOR_ROTA) / kmPorLitro * item.preco;
    return { abastecimento: item.preco * litros, deslocamento: deslocamento, total: item.preco * litros + deslocamento };
  }

  // Compara com o posto mais próximo. Só recomenda quando dá para calcular com segurança.
  function recomendar(lista, opts) {
    opts = opts || {};
    var litros = Number(opts.litros), kmL = Number(opts.kmPorLitro), fator = opts.fatorRota || FATOR_ROTA;
    var base = { confiavel: false, fatorRota: fator, litros: litros, kmPorLitro: kmL };
    if (!opts.temPonto) return Object.assign(base, { motivo: 'semPonto' });
    if (!(litros > 0)) return Object.assign(base, { motivo: 'semLitros' });
    if (!(kmL > 0)) return Object.assign(base, { motivo: 'semConsumo' });
    var validos = (lista || []).filter(function (i) { return i.precisa && i.distancia !== null; });
    if (validos.length < 2) return Object.assign(base, { motivo: 'poucosPostos' });
    var custos = validos.map(function (i) { return { item: i, custo: custoTotal(i, litros, kmL, fator) }; });
    var maisPerto = custos.slice().sort(function (a, b) { return a.item.distancia - b.item.distancia || a.item.preco - b.item.preco; })[0];
    var melhor = custos.slice().sort(function (a, b) { return a.custo.total - b.custo.total || a.item.distancia - b.item.distancia; })[0];
    var economiaPreco = (maisPerto.item.preco - melhor.item.preco) * litros;
    var custoExtra = melhor.custo.deslocamento - maisPerto.custo.deslocamento;
    var liquida = maisPerto.custo.total - melhor.custo.total;
    return Object.assign(base, {
      confiavel: true, referencia: maisPerto, melhor: melhor, economiaPreco: economiaPreco, custoExtra: custoExtra,
      economiaLiquida: liquida, mesmoPosto: melhor === maisPerto, compensa: melhor !== maisPerto && liquida >= ECONOMIA_MINIMA,
      custos: custos
    });
  }

  // Ordenação. "melhor" usa o custo total estimado; postos sem distância precisa vão para o fim.
  function ordenar(lista, criterio, rec) {
    var l = lista.slice();
    var porPreco = function (a, b) { return a.preco - b.preco || (a.distancia || 0) - (b.distancia || 0); };
    if (criterio === 'distancia') {
      l.sort(function (a, b) {
        if (a.distancia === null || b.distancia === null) return (a.distancia === null) - (b.distancia === null) || porPreco(a, b);
        return a.distancia - b.distancia || a.preco - b.preco;
      });
    } else if (criterio === 'melhor' && rec && rec.confiavel) {
      var total = {};
      rec.custos.forEach(function (c) { total[c.item.posto.id] = c.custo.total; });
      l.sort(function (a, b) {
        var ta = total[a.posto.id], tb = total[b.posto.id];
        if (ta === undefined || tb === undefined) return (ta === undefined) - (tb === undefined) || porPreco(a, b);
        return ta - tb || a.distancia - b.distancia;
      });
    } else {
      l.sort(porPreco);
    }
    return l;
  }

  var api = {
    PRODUTOS: PRODUTOS, FATOR_ROTA: FATOR_ROTA, ECONOMIA_MINIMA: ECONOMIA_MINIMA,
    produto: produto, produtoDoCombustivel: produtoDoCombustivel, normalizar: normalizar,
    distanciaKm: distanciaKm, statusDados: statusDados, interpretarBusca: interpretarBusca,
    municipiosProximos: municipiosProximos, montarResultados: montarResultados,
    custoTotal: custoTotal, recomendar: recomendar, ordenar: ordenar
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Postos = api;
})(this);
