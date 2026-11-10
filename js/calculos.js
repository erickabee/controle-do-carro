/*
 * Cálculos do Controle de Bordo.
 * Funções puras (sem tela), usadas pelo app e pelos testes (node testes/calculos.test.js).
 * As fórmulas estão documentadas em README.md, seção "Como os cálculos são feitos".
 */
(function (root) {
  'use strict';

  var LIMITE_KM_PROXIMO = 500;   // avisar quando faltar até 500 km
  var LIMITE_DIAS_PROXIMO = 30;  // avisar quando faltar até 30 dias

  // ---------- Datas (sempre 'AAAA-MM-DD', sem fuso) ----------
  function parseData(s) {
    var p = String(s).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function dataISO(d) {
    var m = d.getMonth() + 1, dia = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dia < 10 ? '0' : '') + dia;
  }
  function hojeISO() { return dataISO(new Date()); }
  function somaMeses(iso, meses) {
    var d = parseData(iso);
    var dia = d.getDate();
    var r = new Date(d.getFullYear(), d.getMonth() + meses, 1);
    var ultimo = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(dia, ultimo));
    return dataISO(r);
  }
  function diasEntre(isoA, isoB) {
    return Math.round((parseData(isoB) - parseData(isoA)) / 86400000);
  }

  // ---------- Números em formato brasileiro ----------
  // Aceita "1.234,56", "45,3", "45.3", "R$ 220,00", "45.230" (km), etc.
  function lerNumero(texto, inteiro) {
    if (texto === null || texto === undefined) return null;
    if (typeof texto === 'number') return isFinite(texto) ? texto : null;
    var s = String(texto).replace(/R\$|\s|km|l$/gi, '').trim();
    if (s === '') return null;
    var temVirgula = s.indexOf(',') >= 0, temPonto = s.indexOf('.') >= 0;
    if (temVirgula && temPonto) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (temVirgula) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (temPonto) {
      // Só pontos: "45.230" ou "1.500.000" = milhar; "45.30" = decimal
      if (inteiro || /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    }
    if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  // ---------- Abastecimentos ----------
  function ordenarAbastecimentos(lista) {
    return lista.slice().sort(function (a, b) {
      if (a.data !== b.data) return a.data < b.data ? -1 : 1;
      if (a.km !== b.km) return a.km - b.km;
      return (a.criadoEm || 0) - (b.criadoEm || 0);
    });
  }

  /*
   * Recebe os abastecimentos de UM carro e devolve cada um (do mais antigo ao
   * mais recente) com os cálculos:
   *  - precoLitro      = valor / litros
   *  - kmDesdeAnterior = km atual - km do abastecimento anterior
   *  - variacaoPreco   = preço/litro atual - preço/litro anterior (R$ e %)
   *  - trecho          = consumo pelo método do tanque cheio:
   *        distância = km deste tanque cheio - km do tanque cheio anterior
   *        litros    = soma dos litros colocados DEPOIS do tanque cheio anterior,
   *                    incluindo este (abastecimentos parciais entram na soma)
   *        km/L      = distância / litros
   *        R$/km     = soma dos valores pagos nesses abastecimentos / distância
   *  - semConsumo      = motivo quando não dá para calcular
   */
  function analisarAbastecimentos(lista) {
    var ord = ordenarAbastecimentos(lista);
    var res = [];
    var ultimoCheio = null, litrosAcum = 0, valorAcum = 0, qtd = 0;
    ord.forEach(function (f, i) {
      var ant = i > 0 ? ord[i - 1] : null;
      var r = Object.assign({}, f);
      r.precoLitro = f.valor / f.litros;
      r.kmDesdeAnterior = ant ? f.km - ant.km : null;
      if (ant) {
        var pAnt = ant.valor / ant.litros;
        r.variacaoPreco = { reais: r.precoLitro - pAnt, pct: pAnt > 0 ? (r.precoLitro - pAnt) / pAnt * 100 : null };
      } else {
        r.variacaoPreco = null;
      }
      litrosAcum += f.litros; valorAcum += f.valor; qtd++;
      if (f.tanqueCheio !== false) {
        if (ultimoCheio) {
          var dist = f.km - ultimoCheio.km;
          if (dist > 0) {
            r.trecho = {
              distancia: dist, litros: litrosAcum, valor: valorAcum,
              kmPorLitro: dist / litrosAcum, custoPorKm: valorAcum / dist,
              abastecimentos: qtd, desdeData: ultimoCheio.data, desdeKm: ultimoCheio.km
            };
          } else {
            r.semConsumo = 'semDistancia';
          }
        } else {
          r.semConsumo = 'primeiroCheio';
        }
        ultimoCheio = f; litrosAcum = 0; valorAcum = 0; qtd = 0;
      } else {
        r.semConsumo = 'naoCheio';
      }
      res.push(r);
    });
    return res;
  }

  // Média dos últimos N trechos: soma das distâncias / soma dos litros
  function consumoMedio(analisados, ultimosN) {
    var trechos = analisados.filter(function (a) { return a.trecho; }).map(function (a) { return a.trecho; });
    if (ultimosN) trechos = trechos.slice(-ultimosN);
    if (!trechos.length) return null;
    var dist = 0, litros = 0, valor = 0;
    trechos.forEach(function (t) { dist += t.distancia; litros += t.litros; valor += t.valor; });
    return { kmPorLitro: dist / litros, custoPorKm: valor / dist, distancia: dist, litros: litros, trechos: trechos.length };
  }

  function gastoPorMes(abastecimentos) {
    var m = {};
    abastecimentos.forEach(function (f) {
      var k = f.data.slice(0, 7);
      if (!m[k]) m[k] = { mes: k, valor: 0, litros: 0, qtd: 0 };
      m[k].valor += f.valor; m[k].litros += f.litros; m[k].qtd++;
    });
    return Object.keys(m).sort().map(function (k) { return m[k]; });
  }

  // Consumo por mês: trechos são contados no mês do abastecimento que fecha o trecho
  function consumoPorMes(analisados) {
    var m = {};
    analisados.forEach(function (a) {
      if (!a.trecho) return;
      var k = a.data.slice(0, 7);
      if (!m[k]) m[k] = { mes: k, distancia: 0, litros: 0 };
      m[k].distancia += a.trecho.distancia; m[k].litros += a.trecho.litros;
    });
    return Object.keys(m).sort().map(function (k) {
      return { mes: k, distancia: m[k].distancia, litros: m[k].litros, kmPorLitro: m[k].distancia / m[k].litros };
    });
  }

  function kmAtual(abastecimentos, manutencoes) {
    var max = null;
    abastecimentos.concat(manutencoes).forEach(function (r) {
      if (typeof r.km === 'number' && (max === null || r.km > max)) max = r.km;
    });
    return max;
  }

  /*
   * Valida um abastecimento antes de salvar.
   * novo: {id?, data, km (pode ser null), distancia (pode ser null), litros, valor, tanqueCheio}
   * outros: abastecimentos já salvos do MESMO carro.
   * Devolve { erros: [...], avisos: [...], km: quilometragem final a usar, previa: análise do novo }
   */
  function validarAbastecimento(novo, outros, hoje) {
    hoje = hoje || hojeISO();
    var erros = [], avisos = [];
    var lista = outros.filter(function (o) { return o.id !== novo.id; });

    if (!novo.data) erros.push('Informe a data do abastecimento.');
    else if (novo.data > hoje) erros.push('A data está no futuro. Confira o dia do abastecimento.');

    if (novo.litros === null || novo.litros === undefined) erros.push('Informe quantos litros foram colocados.');
    else if (!(novo.litros > 0)) erros.push('A quantidade de litros precisa ser maior que zero.');
    else if (novo.litros >= 1000) erros.push('A quantidade de litros está alta demais. Confira o número.');

    if (novo.valor === null || novo.valor === undefined) erros.push('Informe o valor total pago.');
    else if (!(novo.valor > 0)) erros.push('O valor pago precisa ser maior que zero.');
    else if (novo.valor >= 100000) erros.push('O valor pago está alto demais. Confira o número.');

    // Vizinhos por data
    var data = novo.data || hoje;
    var anteriores = ordenarAbastecimentos(lista.filter(function (o) { return o.data <= data; }));
    var posteriores = ordenarAbastecimentos(lista.filter(function (o) { return o.data > data; }));
    var ant = anteriores.length ? anteriores[anteriores.length - 1] : null;
    var prox = posteriores.length ? posteriores[0] : null;

    var km = (typeof novo.km === 'number') ? novo.km : null;
    var dist = (typeof novo.distancia === 'number') ? novo.distancia : null;

    if (dist !== null && dist < 0) erros.push('A distância percorrida não pode ser negativa.');

    if (km === null) {
      if (dist !== null && ant) {
        km = ant.km + dist;
      } else if (dist !== null && !ant) {
        erros.push('Como este é o primeiro abastecimento, informe a quilometragem total que aparece no painel do carro.');
      } else {
        erros.push('Informe a quilometragem do painel do carro (ou a distância percorrida desde o último abastecimento).');
      }
    } else if (km < 0) {
      erros.push('A quilometragem não pode ser negativa.');
    } else if (dist !== null && ant && Math.abs((km - ant.km) - dist) > 2) {
      avisos.push('Você informou que andou ' + fmtKm(dist) + ', mas pela quilometragem do painel a diferença é de ' +
        fmtKm(km - ant.km) + '. Será usada a quilometragem do painel.');
    }

    if (km !== null) {
      if (ant && km < ant.km) {
        erros.push('A quilometragem (' + fmtKm(km) + ') é menor que a do abastecimento anterior (' + fmtKm(ant.km) +
          ', em ' + fmtData(ant.data) + '). Confira o número no painel do carro.');
      } else if (ant && km === ant.km) {
        avisos.push('A quilometragem é igual à do abastecimento anterior (' + fmtKm(ant.km) + '). O carro não andou desde então?');
      } else if (ant && km - ant.km > 1500) {
        avisos.push('Foram ' + fmtKm(km - ant.km) + ' desde o abastecimento anterior. É bastante — confira se o número está certo.');
      }
      if (prox && km > prox.km) {
        erros.push('A quilometragem (' + fmtKm(km) + ') é maior que a de um abastecimento mais recente (' + fmtKm(prox.km) +
          ', em ' + fmtData(prox.data) + '). Confira a data e a quilometragem.');
      }
    }

    var previa = null;
    if (novo.litros > 0 && novo.valor > 0) {
      var preco = novo.valor / novo.litros;
      if (preco < 2.5 || preco > 12) {
        avisos.push('O preço por litro ficou em ' + fmtDinheiro(preco) + ', o que parece fora do normal. Confira os litros e o valor pago.');
      }
      if (novo.litros > 100) {
        avisos.push(fmtNum(novo.litros, 2) + ' litros é mais do que cabe no tanque da maioria dos carros. Confira.');
      }
      if (km !== null && !erros.length) {
        var cand = Object.assign({}, novo, { km: km, id: novo.id || '__novo__' });
        var an = analisarAbastecimentos(lista.concat([cand]));
        previa = an.filter(function (a) { return a.id === cand.id; })[0] || null;
        if (previa && previa.trecho && (previa.trecho.kmPorLitro < 3 || previa.trecho.kmPorLitro > 30)) {
          avisos.push('O consumo calculado ficou em ' + fmtNum(previa.trecho.kmPorLitro, 1) +
            ' km por litro, o que parece fora do normal. Confira os litros e a quilometragem.');
        }
      }
    }
    return { erros: erros, avisos: avisos, km: km, previa: previa };
  }

  function validarManutencao(m, abastecimentos, hoje) {
    hoje = hoje || hojeISO();
    var erros = [], avisos = [];
    if (!m.tipo) erros.push('Escolha o que foi feito.');
    if (m.tipo === 'outro' && !String(m.descricao || '').trim()) erros.push('Escreva qual foi a manutenção.');
    if (!m.data) erros.push('Informe a data.');
    else if (m.data > hoje) erros.push('A data está no futuro. Confira o dia.');
    if (typeof m.km !== 'number') erros.push('Informe a quilometragem do painel do carro naquele dia.');
    else if (m.km < 0) erros.push('A quilometragem não pode ser negativa.');
    if (m.valor !== null && m.valor !== undefined && m.valor < 0) erros.push('O valor não pode ser negativo.');
    if (m.lembreteKm !== null && m.lembreteKm !== undefined && !(m.lembreteKm > 0)) erros.push('O lembrete em km precisa ser maior que zero.');
    if (m.lembreteData && m.data && m.lembreteData <= m.data) erros.push('A data do lembrete precisa ser depois da data da manutenção.');

    if (typeof m.km === 'number' && m.data) {
      var ord = ordenarAbastecimentos(abastecimentos);
      var antes = ord.filter(function (f) { return f.data <= m.data; });
      var depois = ord.filter(function (f) { return f.data > m.data; });
      var a = antes[antes.length - 1], d = depois[0];
      if (a && m.km < a.km) avisos.push('A quilometragem (' + fmtKm(m.km) + ') é menor que a do abastecimento de ' + fmtData(a.data) + ' (' + fmtKm(a.km) + '). Confira.');
      if (d && m.km > d.km) avisos.push('A quilometragem (' + fmtKm(m.km) + ') é maior que a do abastecimento de ' + fmtData(d.data) + ' (' + fmtKm(d.km) + '). Confira.');
    }
    return { erros: erros, avisos: avisos };
  }

  // ---------- Manutenção e lembretes ----------
  var TIPOS = {
    oleo:        { nome: 'Troca de óleo', frase: 'a troca de óleo', fem: true },
    pneus:       { nome: 'Troca de pneus', frase: 'a troca de pneus', fem: true },
    revisao:     { nome: 'Revisão', frase: 'a revisão', fem: true },
    freios:      { nome: 'Freios', frase: 'a manutenção dos freios', fem: true },
    bateria:     { nome: 'Bateria', frase: 'a troca da bateria', fem: true },
    alinhamento: { nome: 'Alinhamento e balanceamento', frase: 'o alinhamento e balanceamento', fem: false },
    outro:       { nome: 'Outro', frase: null, fem: true }
  };

  function nomeManutencao(m) {
    if (m.tipo === 'outro') return String(m.descricao || 'Outra manutenção').trim();
    return (TIPOS[m.tipo] || TIPOS.outro).nome;
  }
  function fraseManutencao(m) {
    if (m.tipo === 'outro') return '“' + nomeManutencao(m) + '”';
    return TIPOS[m.tipo].frase;
  }
  function chaveGrupo(m) {
    return m.tipo === 'outro' ? 'outro:' + nomeManutencao(m).toLowerCase() : m.tipo;
  }
  function maisRecente(a, b) {
    if (a.data !== b.data) return a.data > b.data ? a : b;
    if (a.km !== b.km) return a.km > b.km ? a : b;
    return (a.criadoEm || 0) >= (b.criadoEm || 0) ? a : b;
  }
  function capitalizar(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /*
   * Lembretes de um carro.
   * Troca de óleo: próxima = km da última troca + intervalo (padrão 5.000 km)
   *                e, se configurado, data da última troca + N meses.
   * Demais tipos (inclusive pneus): só existe lembrete se a pessoa definiu,
   *   no registro mais recente daquele tipo, "avisar daqui a X km" e/ou "avisar na data".
   * Situação: 'atrasada' se passou do km ou da data; 'proxima' se faltam até 500 km
   *   ou até 30 dias; senão 'ok'. Vale o que vier primeiro (km ou data).
   */
  function lembretes(carro, manutencoes, kmAtualCarro, hoje) {
    hoje = hoje || hojeISO();
    var ultimos = {};
    manutencoes.forEach(function (m) {
      var k = chaveGrupo(m);
      ultimos[k] = ultimos[k] ? maisRecente(ultimos[k], m) : m;
    });
    var lista = [];

    var cfgKm = carro.oleoKm === undefined ? 5000 : carro.oleoKm;
    var cfgMeses = carro.oleoMeses || null;
    if (!ultimos.oleo) {
      lista.push({ chave: 'oleo', nome: 'Troca de óleo', situacao: 'semDados',
        mensagem: 'Registre a última troca de óleo para receber o aviso da próxima.' });
    }

    Object.keys(ultimos).forEach(function (k) {
      var m = ultimos[k];
      var proxKm = null, proxData = null;
      if (m.tipo === 'oleo') {
        if (cfgKm) proxKm = m.km + cfgKm;
        if (cfgMeses) proxData = somaMeses(m.data, cfgMeses);
      } else {
        if (m.lembreteKm) proxKm = m.km + m.lembreteKm;
        if (m.lembreteData) proxData = m.lembreteData;
      }
      if (proxKm === null && proxData === null) return;
      lista.push(montarLembrete(m, proxKm, proxData, kmAtualCarro, hoje));
    });

    var ordem = { atrasada: 0, proxima: 1, ok: 2, semDados: 3 };
    lista.sort(function (a, b) {
      if (ordem[a.situacao] !== ordem[b.situacao]) return ordem[a.situacao] - ordem[b.situacao];
      var ua = urgencia(a), ub = urgencia(b);
      return ua - ub;
    });
    return lista;
  }

  // Para ordenar: aproxima km para dias (~40 km/dia) só para comparar urgências
  function urgencia(l) {
    var v = Infinity;
    if (l.faltamKm !== null && l.faltamKm !== undefined) v = Math.min(v, l.faltamKm / 40);
    if (l.faltamDias !== null && l.faltamDias !== undefined) v = Math.min(v, l.faltamDias);
    return v;
  }

  function montarLembrete(m, proxKm, proxData, kmAtualCarro, hoje) {
    var frase = fraseManutencao(m);
    var fem = m.tipo === 'outro' ? true : TIPOS[m.tipo].fem;
    var atras = fem ? 'atrasada' : 'atrasado';
    var faltamKm = (proxKm !== null && kmAtualCarro !== null) ? proxKm - kmAtualCarro : null;
    var faltamDias = proxData ? diasEntre(hoje, proxData) : null;
    var situacao = 'ok';
    if ((faltamKm !== null && faltamKm < 0) || (faltamDias !== null && faltamDias < 0)) situacao = 'atrasada';
    else if ((faltamKm !== null && faltamKm <= LIMITE_KM_PROXIMO) || (faltamDias !== null && faltamDias <= LIMITE_DIAS_PROXIMO)) situacao = 'proxima';

    var partes = [];
    if (faltamKm !== null) {
      if (faltamKm < 0) partes.push(capitalizar(frase) + ' está ' + atras + ' em ' + fmtKm(-faltamKm) + '.');
      else if (faltamKm === 0) partes.push('Chegou a hora d' + (fem ? 'a' : 'o') + ' ' + frase.replace(/^(a|o) /, '') + '.');
      else partes.push('Faltam ' + fmtKm(faltamKm) + ' para ' + frase + '.');
    }
    if (faltamDias !== null) {
      var txt;
      if (faltamDias < 0) txt = (faltamKm !== null ? 'O prazo' : capitalizar(frase)) + ' venceu em ' + fmtData(proxData) + ' (' + plural(-faltamDias, 'dia', 'dias') + ' atrás).';
      else if (faltamDias === 0) txt = (faltamKm !== null ? 'O prazo' : capitalizar(frase)) + ' vence hoje.';
      else txt = (faltamKm !== null ? 'Ou até ' : capitalizar(frase) + ' vence em ') + fmtData(proxData) + ' (faltam ' + plural(faltamDias, 'dia', 'dias') + ')' + (faltamKm !== null ? ', o que vier primeiro.' : '.');
      partes.push(txt);
    }
    return {
      chave: chaveGrupo(m), nome: nomeManutencao(m), ultima: m,
      proxKm: proxKm, proxData: proxData, faltamKm: faltamKm, faltamDias: faltamDias,
      situacao: situacao, mensagem: partes.join(' ')
    };
  }

  // ---------- Formatação (pt-BR) ----------
  function fmtNum(n, casas) {
    return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 });
  }
  function fmtKm(n) { return fmtNum(Math.round(n)) + ' km'; }
  function fmtDinheiro(n) {
    return 'R$ ' + fmtNum(n, 2);
  }
  function fmtData(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function fmtMes(chave, curto) {
    var p = chave.split('-');
    var nome = MESES[Number(p[1]) - 1];
    return curto ? nome.slice(0, 3) + '/' + p[0].slice(2) : capitalizar(nome) + ' de ' + p[0];
  }
  function plural(n, um, varios) { return fmtNum(n) + ' ' + (n === 1 ? um : varios); }

  var C = {
    LIMITE_KM_PROXIMO: LIMITE_KM_PROXIMO, LIMITE_DIAS_PROXIMO: LIMITE_DIAS_PROXIMO, TIPOS: TIPOS,
    parseData: parseData, dataISO: dataISO, hojeISO: hojeISO, somaMeses: somaMeses, diasEntre: diasEntre,
    lerNumero: lerNumero, ordenarAbastecimentos: ordenarAbastecimentos,
    analisarAbastecimentos: analisarAbastecimentos, consumoMedio: consumoMedio,
    gastoPorMes: gastoPorMes, consumoPorMes: consumoPorMes, kmAtual: kmAtual,
    validarAbastecimento: validarAbastecimento, validarManutencao: validarManutencao,
    lembretes: lembretes, nomeManutencao: nomeManutencao,
    fmtNum: fmtNum, fmtKm: fmtKm, fmtDinheiro: fmtDinheiro, fmtData: fmtData, fmtMes: fmtMes, plural: plural
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
  else root.Calc = C;
})(this);
