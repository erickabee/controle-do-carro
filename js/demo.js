/*
 * Dados de DEMONSTRAÇÃO (inventados). Usados só quando a pessoa toca em
 * "Ver demonstração". Todos os registros ficam marcados com demo: true.
 */
(function (root) {
  'use strict';

  function gerar(C, novoId) {
    var semente = 7;
    function aleatorio() { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; }
    function entre(a, b) { return a + (b - a) * aleatorio(); }
    function r2(n) { return Math.round(n * 100) / 100; }
    function diasAtras(n) { var d = new Date(); d.setDate(d.getDate() - n); return C.dataISO(d); }

    var estado = { versao: 1, carros: [], abastecimentos: [], manutencoes: [], carroAtual: null,
      demo: true, ultimoBackup: null, alteracoesDesdeBackup: 0 };

    function criarCarro(cfg) {
      var carro = { id: novoId(), nome: cfg.nome, marca: cfg.marca, modelo: cfg.modelo, ano: cfg.ano,
        cor: cfg.cor, oleoKm: 5000, oleoMeses: cfg.oleoMeses || null };
      estado.carros.push(carro);
      var km = cfg.kmInicial, dia = 240, preco = cfg.preco, usado = 0, colocado = 0, n = 0;
      var historico = [];
      while (dia > 2) {
        var passo = Math.round(entre(cfg.dias[0], cfg.dias[1]));
        dia -= passo; if (dia < 2) dia = 2;
        var dist = Math.round(passo * entre(cfg.kmDia[0], cfg.kmDia[1]));
        km += dist;
        usado += dist / entre(cfg.kmL[0], cfg.kmL[1]);
        preco = Math.max(cfg.preco - 0.3, preco + entre(-0.08, 0.11));
        n++;
        var parcial = n % 6 === 0 && usado - colocado > 22;
        var litros = parcial ? 15 : usado - colocado;
        litros = r2(litros);
        var reg = { id: novoId(), carroId: carro.id, data: diasAtras(dia), km: km, distanciaInformada: null,
          litros: litros, valor: r2(litros * preco), tanqueCheio: !parcial, combustivel: cfg.combustivel,
          obs: n === 3 ? 'Exemplo de observação: viagem para o sítio' : '', criadoEm: Date.now() - dia * 86400000, demo: true };
        historico.push(reg);
        if (parcial) colocado += litros; else { usado = 0; colocado = 0; }
      }
      estado.abastecimentos = estado.abastecimentos.concat(historico);

      var atual = historico[historico.length - 1].km;
      function perto(kmAlvo) {
        // data aproximada do abastecimento mais próximo daquela quilometragem
        var melhor = historico[0];
        historico.forEach(function (h) { if (Math.abs(h.km - kmAlvo) < Math.abs(melhor.km - kmAlvo)) melhor = h; });
        return melhor.data;
      }
      cfg.manutencoes(atual, historico).forEach(function (m) {
        var km2 = m.km;
        estado.manutencoes.push({ id: novoId(), carroId: carro.id, tipo: m.tipo, descricao: m.descricao || '',
          data: m.data || perto(km2), km: km2, valor: m.valor || null, lembreteKm: m.lembreteKm || null,
          lembreteData: m.lembreteData || null, obs: m.obs || '', criadoEm: Date.now(), demo: true });
      });
      return carro;
    }

    var hoje = C.hojeISO();
    criarCarro({
      nome: 'Carro 1 (exemplo)', marca: 'Marca X', modelo: 'Modelo A', ano: '2016', cor: '#1e40af',
      kmInicial: 42000, dias: [8, 12], kmDia: [32, 42], kmL: [11, 12.8], preco: 5.89, combustivel: 'Gasolina',
      manutencoes: function (atual, h) {
        return [
          { tipo: 'pneus', km: h[1].km, valor: 1640, lembreteKm: 40000, obs: 'Exemplo: 4 pneus novos' },
          { tipo: 'oleo', km: atual - 9700, valor: 210 },
          { tipo: 'oleo', km: atual - 4650, valor: 230, obs: 'Exemplo: óleo 5W30 e filtro' },
          { tipo: 'revisao', km: atual - 2500, valor: 480, lembreteData: C.somaMeses(hoje, 2) }
        ];
      }
    });
    criarCarro({
      nome: 'Carro 2 (exemplo)', marca: 'Marca Y', modelo: 'Modelo B', ano: '2012', cor: '#b91c1c',
      kmInicial: 98500, dias: [12, 16], kmDia: [20, 27], kmL: [7.4, 8.6], preco: 3.99, combustivel: 'Etanol', oleoMeses: 6,
      manutencoes: function (atual) {
        return [
          { tipo: 'oleo', km: atual - 5200, valor: 190 },
          { tipo: 'alinhamento', km: atual - 3000, valor: 120, lembreteKm: 10000 },
          { tipo: 'bateria', km: atual - 1500, valor: 450 }
        ];
      }
    });
    estado.carroAtual = estado.carros[0].id;
    return estado;
  }

  root.DadosDemo = { gerar: gerar };
})(this);
