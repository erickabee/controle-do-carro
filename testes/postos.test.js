// Testes da busca de postos (sem rede, sem navegador). Rodar com: node testes/postos.test.js
'use strict';
var assert = require('assert');
var P = require('../js/postos.js');

var falhas = 0, total = 0;
function teste(nome, fn) {
  total++;
  try { fn(); console.log('  ok  ' + nome); }
  catch (e) { falhas++; console.log('  FALHOU  ' + nome + '\n        ' + e.message); }
}
function perto(a, b, msg, tol) { assert.ok(Math.abs(a - b) < (tol || 1e-6), (msg || '') + ' esperado ' + b + ', veio ' + a); }

// Ponto de partida e postos fictícios (1 grau de latitude ≈ 111,2 km)
var CASA = { la: -22.9, lo: -47.06 };
function emKm(km) { return CASA.la + km / 111.195; }
var POSTOS = [
  { id: 'A', n: 'Posto A', b: 'Ipiranga', la: emKm(0.5), lo: CASA.lo, pr: 'endereco', p: { GC: [6.29, '2026-11-04'], ET: [4.29, '2026-11-04'] } },
  { id: 'B', n: 'Posto B', b: null, la: emKm(3), lo: CASA.lo, pr: 'rua', p: { GC: [5.99, '2026-11-05'] } },
  { id: 'C', n: 'Posto C', b: 'Vibra', la: emKm(8), lo: CASA.lo, pr: 'endereco', p: { GC: [5.79, '2026-11-03'] } },
  { id: 'D', n: 'Posto D', b: 'Raizen', la: emKm(1), lo: CASA.lo, pr: 'cep', p: { GC: [6.09, '2026-11-02'] } },
  { id: 'E', n: 'Posto E', b: null, la: null, lo: null, pr: null, p: { GC: [5.49, '2026-11-02'] } },
  { id: 'F', n: 'Posto F', b: 'Ale', la: emKm(30), lo: CASA.lo, pr: 'endereco', p: { GC: [5.19, '2026-11-02'] } },
  { id: 'G', n: 'Posto G', b: null, la: emKm(2), lo: CASA.lo, pr: 'endereco', p: { GNV: [5.59, '2026-11-06'] } }
];
var MUNICIPIOS = [
  { c: '3509502', n: 'Campinas', uf: 'SP', la: -22.9, lo: -47.06, r: 12, q: 25 },
  { c: '4304606', n: 'Canoas', uf: 'RS', la: -29.92, lo: -51.18, r: 8, q: 17 },
  { c: '9999999', n: 'São José', uf: 'SC', la: -27.6, lo: -48.6, r: 9, q: 3 },
  { c: '8888888', n: 'São José', uf: 'RN', la: -6.0, lo: -35.0, r: 3, q: 1 }
];

console.log('Postos');

teste('distância em linha reta (haversine)', function () {
  perto(P.distanciaKm(CASA, { la: emKm(3), lo: CASA.lo }), 3, '', 0.001);
  perto(P.distanciaKm({ la: -23.5505, lo: -46.6333 }, { la: -22.9056, lo: -47.0608 }), 83.8, 'São Paulo–Campinas', 0.5);
});

teste('busca: CEP, cidade (com e sem UF), nome ambíguo, texto vazio e inválido', function () {
  assert.deepStrictEqual(P.interpretarBusca('13010-000', MUNICIPIOS), { tipo: 'cep', cep: '13010000' });
  assert.deepStrictEqual(P.interpretarBusca('13010000', MUNICIPIOS), { tipo: 'cep', cep: '13010000' });
  assert.strictEqual(P.interpretarBusca('campinas', MUNICIPIOS).candidatos[0].c, '3509502');
  assert.strictEqual(P.interpretarBusca('CAMPINAS - SP', MUNICIPIOS).candidatos[0].c, '3509502');
  assert.strictEqual(P.interpretarBusca('Campinas/SP', MUNICIPIOS).candidatos.length, 1);
  assert.strictEqual(P.interpretarBusca('Sao Jose', MUNICIPIOS).candidatos.length, 2, 'mesmo nome em dois estados: pergunta qual');
  assert.strictEqual(P.interpretarBusca('São José SC', MUNICIPIOS).candidatos.length, 1);
  assert.deepStrictEqual(P.interpretarBusca('Cidadezinha', MUNICIPIOS).candidatos, [], 'cidade fora da pesquisa da ANP');
  assert.strictEqual(P.interpretarBusca('  ', MUNICIPIOS).tipo, 'vazio');
  assert.strictEqual(P.interpretarBusca('1301', MUNICIPIOS).tipo, 'invalido');
});

teste('municípios próximos: só baixa as cidades que podem ter postos no raio', function () {
  assert.deepStrictEqual(P.municipiosProximos(CASA, MUNICIPIOS, 5).map(function (m) { return m.c; }), ['3509502']);
  assert.strictEqual(P.municipiosProximos({ la: 0, lo: 0 }, MUNICIPIOS, 20).length, 0);
});

teste('resultados: raio, combustível, sem localização e localização aproximada', function () {
  var r = P.montarResultados(POSTOS, { produto: 'GC', ponto: CASA, raio: 10 });
  assert.deepStrictEqual(r.lista.map(function (i) { return i.posto.id; }).sort(), ['A', 'B', 'C', 'D']);
  assert.strictEqual(r.foraDoRaio, 1, 'F está a 30 km');
  assert.strictEqual(r.semProduto, 1, 'G só tem GNV');
  assert.deepStrictEqual(r.semLocalizacao.map(function (i) { return i.posto.id; }), ['E'], 'sem localização não some: vai à parte');
  var d = r.lista.filter(function (i) { return i.posto.id === 'D'; })[0];
  assert.ok(d.aproximada && !d.precisa, 'localização pelo centro do CEP é aproximada');
  perto(r.lista.filter(function (i) { return i.posto.id === 'B'; })[0].distancia, 3, '', 0.001);
});

teste('busca por cidade (sem ponto de partida): todos com preço, sem distância', function () {
  var r = P.montarResultados(POSTOS, { produto: 'GC', ponto: null, raio: 5 });
  assert.strictEqual(r.lista.length, 6);
  assert.ok(r.lista.every(function (i) { return i.distancia === null; }));
});

teste('filtro "Com bandeira" só tira os sem bandeira quando ligado', function () {
  var todos = P.montarResultados(POSTOS, { produto: 'GC', ponto: CASA, raio: 10 }).lista;
  var comBandeira = P.montarResultados(POSTOS, { produto: 'GC', ponto: CASA, raio: 10, soBandeira: true }).lista;
  assert.strictEqual(todos.length, 4, 'desligado (padrão): mostra todos');
  assert.deepStrictEqual(comBandeira.map(function (i) { return i.posto.id; }).sort(), ['A', 'C', 'D']);
});

teste('ordenar por menor preço e por menor distância', function () {
  var l = P.montarResultados(POSTOS, { produto: 'GC', ponto: CASA, raio: 10 }).lista;
  assert.deepStrictEqual(P.ordenar(l, 'preco').map(function (i) { return i.posto.id; }), ['C', 'B', 'D', 'A']);
  assert.deepStrictEqual(P.ordenar(l, 'distancia').map(function (i) { return i.posto.id; }), ['A', 'D', 'B', 'C']);
  var semPonto = P.montarResultados(POSTOS, { produto: 'GC', ponto: null }).lista;
  assert.deepStrictEqual(P.ordenar(semPonto, 'preco').map(function (i) { return i.posto.id; }), ['F', 'E', 'C', 'B', 'D', 'A']);
});

teste('recomendação: economia no abastecimento menos o custo do deslocamento (ida e volta)', function () {
  var l = P.montarResultados(POSTOS, { produto: 'GC', ponto: CASA, raio: 10 }).lista;
  var r = P.recomendar(l, { temPonto: true, litros: 40, kmPorLitro: 10 });
  assert.ok(r.confiavel);
  assert.strictEqual(r.referencia.item.posto.id, 'A', 'compara com o posto mais próximo de localização precisa');
  // A: 6,29×40 + 2×0,5×1,3/10×6,29 = 251,60 + 0,8177 = 252,4177
  // B: 5,99×40 + 2×3×1,3/10×5,99  = 239,60 + 4,6722 = 244,2722
  // C: 5,79×40 + 2×8×1,3/10×5,79  = 231,60 + 12,0432 = 243,6432  ← menor custo total
  assert.strictEqual(r.melhor.item.posto.id, 'C');
  perto(r.economiaPreco, (6.29 - 5.79) * 40, 'economia só no preço');
  perto(r.custoExtra, 12.0432 - 0.8177, 'custo extra do deslocamento', 1e-3);
  perto(r.economiaLiquida, 252.4177 - 243.6432, 'economia líquida', 1e-3);
  assert.ok(r.compensa);
  assert.ok(!r.custos.some(function (c) { return c.item.posto.id === 'D'; }), 'localização aproximada fica fora da conta');
});

teste('recomendação: com tanque pequeno, o posto distante deixa de compensar', function () {
  var l = P.montarResultados(POSTOS, { produto: 'GC', ponto: CASA, raio: 10 }).lista;
  var r = P.recomendar(l, { temPonto: true, litros: 5, kmPorLitro: 8 });
  // com 5 litros, B e C não compensam o deslocamento; o mais próximo (A) é o de menor custo total
  assert.strictEqual(r.melhor.item.posto.id, 'A');
  assert.ok(r.mesmoPosto && !r.compensa);
});

teste('recomendação: diferença menor que R$ 1 não é chamada de "compensa"', function () {
  var l = [
    { posto: { id: 'X' }, preco: 6.00, distancia: 1, precisa: true },
    { posto: { id: 'Y' }, preco: 5.98, distancia: 1.2, precisa: true }
  ];
  var r = P.recomendar(l, { temPonto: true, litros: 40, kmPorLitro: 10 });
  assert.ok(r.confiavel && r.melhor.item.posto.id === 'Y' && r.economiaLiquida < 1 && !r.compensa);
});

teste('recomendação não é feita sem dados confiáveis (e diz o motivo)', function () {
  var l = P.montarResultados(POSTOS, { produto: 'GC', ponto: CASA, raio: 10 }).lista;
  assert.strictEqual(P.recomendar(l, { temPonto: false, litros: 40, kmPorLitro: 10 }).motivo, 'semPonto');
  assert.strictEqual(P.recomendar(l, { temPonto: true, litros: 0, kmPorLitro: 10 }).motivo, 'semLitros');
  assert.strictEqual(P.recomendar(l, { temPonto: true, litros: 40 }).motivo, 'semConsumo');
  var so1 = l.filter(function (i) { return i.posto.id === 'A' || i.posto.id === 'D'; });
  assert.strictEqual(P.recomendar(so1, { temPonto: true, litros: 40, kmPorLitro: 10 }).motivo, 'poucosPostos');
  assert.strictEqual(P.recomendar([], { temPonto: true, litros: 40, kmPorLitro: 10 }).confiavel, false);
});

teste('ordenar por "melhor opção" usa o custo total; sem recomendação, cai no menor preço', function () {
  var l = P.montarResultados(POSTOS, { produto: 'GC', ponto: CASA, raio: 10 }).lista;
  var r = P.recomendar(l, { temPonto: true, litros: 40, kmPorLitro: 10 });
  assert.deepStrictEqual(P.ordenar(l, 'melhor', r).map(function (i) { return i.posto.id; }), ['C', 'B', 'A', 'D'], 'aproximada vai para o fim');
  assert.deepStrictEqual(P.ordenar(l, 'melhor', { confiavel: false }).map(function (i) { return i.posto.id; }), ['C', 'B', 'D', 'A']);
});

teste('dados atuais, antigos, desatualizados ou ausentes', function () {
  var ind = { periodo: { inicio: '2026-11-01', fim: '2026-11-07' } };
  assert.deepStrictEqual(P.statusDados(ind, '2026-11-10'), { nivel: 'atual', dias: 3 });
  assert.strictEqual(P.statusDados(ind, '2026-11-20').nivel, 'antigo');
  assert.strictEqual(P.statusDados(ind, '2026-12-05').nivel, 'desatualizado');
  assert.strictEqual(P.statusDados(null, '2026-11-10').nivel, 'ausente');
  assert.strictEqual(P.statusDados({}, '2026-11-10').nivel, 'ausente');
});

teste('combustível do app vira o produto da ANP; GNV em m³', function () {
  assert.strictEqual(P.produtoDoCombustivel('Gasolina'), 'GC');
  assert.strictEqual(P.produtoDoCombustivel('Diesel'), 'S10');
  assert.strictEqual(P.produtoDoCombustivel(''), 'GC');
  assert.strictEqual(P.produto('GNV').un, 'm³');
});

console.log('\n' + (total - falhas) + ' de ' + total + ' testes passaram.');
process.exit(falhas ? 1 : 0);
