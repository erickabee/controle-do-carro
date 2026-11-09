// Testes dos cálculos. Rodar com: node testes/calculos.test.js
'use strict';
var assert = require('assert');
var C = require('../js/calculos.js');

var falhas = 0, total = 0;
function teste(nome, fn) {
  total++;
  try { fn(); console.log('  ok  ' + nome); }
  catch (e) { falhas++; console.log('  FALHOU  ' + nome + '\n        ' + e.message); }
}
function perto(a, b, msg) { assert.ok(Math.abs(a - b) < 1e-6, (msg || '') + ' esperado ' + b + ', veio ' + a); }

teste('lerNumero entende formatos brasileiros', function () {
  assert.strictEqual(C.lerNumero('1.234,56'), 1234.56);
  assert.strictEqual(C.lerNumero('45,3'), 45.3);
  assert.strictEqual(C.lerNumero('45.3'), 45.3);
  assert.strictEqual(C.lerNumero('R$ 220,00'), 220);
  assert.strictEqual(C.lerNumero('45.230'), 45230);
  assert.strictEqual(C.lerNumero('45.23', true), 4523);
  assert.strictEqual(C.lerNumero(''), null);
  assert.strictEqual(C.lerNumero('abc'), null);
});

var base = [
  { id: 'a', data: '2026-01-01', km: 10000, litros: 40, valor: 240, tanqueCheio: true },
  { id: 'b', data: '2026-01-10', km: 10400, litros: 40, valor: 248, tanqueCheio: true },
  { id: 'c', data: '2026-01-15', km: 10600, litros: 15, valor: 90, tanqueCheio: false },
  { id: 'd', data: '2026-01-20', km: 10900, litros: 25, valor: 150, tanqueCheio: true }
];

teste('analisa consumo pelo método do tanque cheio', function () {
  var r = C.analisarAbastecimentos(base);
  assert.strictEqual(r[0].semConsumo, 'primeiroCheio');
  assert.strictEqual(r[1].kmDesdeAnterior, 400);
  perto(r[1].trecho.kmPorLitro, 10);           // 400 km / 40 L
  perto(r[1].trecho.custoPorKm, 248 / 400);
  perto(r[1].precoLitro, 6.2);
  perto(r[1].variacaoPreco.reais, 0.2);
  perto(r[1].variacaoPreco.pct, 0.2 / 6 * 100);
  assert.strictEqual(r[2].semConsumo, 'naoCheio');
  assert.strictEqual(r[2].kmDesdeAnterior, 200);
  // trecho b->d: 500 km com 15 + 25 = 40 L
  perto(r[3].trecho.distancia, 500);
  perto(r[3].trecho.litros, 40);
  perto(r[3].trecho.kmPorLitro, 12.5);
  perto(r[3].trecho.custoPorKm, 240 / 500);
});

teste('consumo médio recente soma distâncias e litros', function () {
  var m = C.consumoMedio(C.analisarAbastecimentos(base), 3);
  perto(m.kmPorLitro, 900 / 80);
  assert.strictEqual(C.consumoMedio(C.analisarAbastecimentos(base.slice(0, 1)), 3), null);
});

teste('validação bloqueia km menor que o anterior', function () {
  var v = C.validarAbastecimento({ data: '2026-01-25', km: 10800, litros: 30, valor: 180 }, base, '2026-02-01');
  assert.ok(v.erros.length === 1 && /menor/.test(v.erros[0]));
});

teste('validação bloqueia litros e valor zerados', function () {
  var v = C.validarAbastecimento({ data: '2026-01-25', km: 11300, litros: 0, valor: 0 }, base, '2026-02-01');
  assert.strictEqual(v.erros.length, 2);
});

teste('validação calcula km a partir da distância percorrida', function () {
  var v = C.validarAbastecimento({ data: '2026-01-25', km: null, distancia: 400, litros: 32, valor: 192 }, base, '2026-02-01');
  assert.deepStrictEqual(v.erros, []);
  assert.strictEqual(v.km, 11300);
  perto(v.previa.trecho.kmPorLitro, 12.5);
});

teste('validação avisa sobre preço e consumo estranhos', function () {
  var v = C.validarAbastecimento({ data: '2026-01-25', km: 11300, litros: 3, valor: 180 }, base, '2026-02-01');
  assert.deepStrictEqual(v.erros, []);
  assert.ok(v.avisos.some(function (a) { return /preço/.test(a); }));
  assert.ok(v.avisos.some(function (a) { return /consumo/.test(a); }));
});

teste('validação bloqueia km maior que abastecimento mais recente', function () {
  var v = C.validarAbastecimento({ data: '2026-01-12', km: 11000, litros: 10, valor: 60 }, base, '2026-02-01');
  assert.ok(v.erros.some(function (e) { return /maior/.test(e); }));
});

teste('validação bloqueia data no futuro', function () {
  var v = C.validarAbastecimento({ data: '2026-03-01', km: 11300, litros: 30, valor: 180 }, base, '2026-02-01');
  assert.ok(v.erros.some(function (e) { return /futuro/.test(e); }));
});

teste('lembrete de óleo: faltam e atrasada', function () {
  var carro = { oleoKm: 5000 };
  var man = [{ id: 'm1', tipo: 'oleo', data: '2026-01-01', km: 10000 }];
  var l = C.lembretes(carro, man, 14500, '2026-02-01');
  assert.strictEqual(l[0].mensagem, 'Faltam 500 km para a troca de óleo.');
  assert.strictEqual(l[0].situacao, 'proxima');
  l = C.lembretes(carro, man, 15200, '2026-02-01');
  assert.strictEqual(l[0].mensagem, 'A troca de óleo está atrasada em 200 km.');
  assert.strictEqual(l[0].situacao, 'atrasada');
});

teste('lembrete de óleo por tempo vale o que vier primeiro', function () {
  var l = C.lembretes({ oleoKm: 5000, oleoMeses: 6 }, [{ tipo: 'oleo', data: '2026-01-01', km: 10000 }], 11000, '2026-07-05');
  assert.strictEqual(l[0].proxData, '2026-07-01');
  assert.strictEqual(l[0].situacao, 'atrasada');
});

teste('pneus só têm lembrete se a pessoa configurou', function () {
  var man = [{ tipo: 'oleo', data: '2026-01-01', km: 10000 }, { tipo: 'pneus', data: '2026-01-01', km: 10000 }];
  var l = C.lembretes({ oleoKm: 5000 }, man, 11000, '2026-02-01');
  assert.strictEqual(l.length, 1);
  man[1].lembreteKm = 40000;
  l = C.lembretes({ oleoKm: 5000 }, man, 11000, '2026-02-01');
  assert.strictEqual(l.length, 2);
  assert.ok(l.some(function (x) { return x.mensagem === 'Faltam 39.000 km para a troca de pneus.'; }));
});

teste('sem troca de óleo registrada mostra explicação', function () {
  var l = C.lembretes({ oleoKm: 5000 }, [], 11000, '2026-02-01');
  assert.strictEqual(l[0].situacao, 'semDados');
});

teste('somaMeses ajusta fim de mês', function () {
  assert.strictEqual(C.somaMeses('2026-01-31', 1), '2026-02-28');
  assert.strictEqual(C.somaMeses('2026-08-15', 6), '2027-02-15');
});

teste('gasto por mês agrupa valores', function () {
  var g = C.gastoPorMes(base);
  assert.strictEqual(g.length, 1);
  perto(g[0].valor, 728);
});

// ---------- Correção de registros (mesmo id, valores novos) ----------
function corrigir(lista, id, mudancas) {
  return lista.map(function (r) { return r.id === id ? Object.assign({}, r, mudancas) : r; });
}

teste('corrigir a quilometragem refaz distância, consumo e custo do registro e do seguinte', function () {
  // b: 10400 -> 10500. Trecho a->b passa a 500 km; trecho b->d passa a 400 km.
  var r = C.analisarAbastecimentos(corrigir(base, 'b', { km: 10500 }));
  var b = r.filter(function (x) { return x.id === 'b'; })[0];
  var c = r.filter(function (x) { return x.id === 'c'; })[0];
  var d = r.filter(function (x) { return x.id === 'd'; })[0];
  assert.strictEqual(b.id, 'b');
  assert.strictEqual(b.kmDesdeAnterior, 500);
  perto(b.trecho.kmPorLitro, 500 / 40);
  perto(b.trecho.custoPorKm, 248 / 500);
  assert.strictEqual(c.kmDesdeAnterior, 100);           // o seguinte também muda
  perto(d.trecho.distancia, 400);
  perto(d.trecho.kmPorLitro, 400 / 40);
});

teste('corrigir litros e valor refaz preço por litro, variação e consumo', function () {
  var r = C.analisarAbastecimentos(corrigir(base, 'b', { litros: 32, valor: 224 }));
  var b = r[1], c = r[2];
  perto(b.precoLitro, 7);                                // 224 / 32
  perto(b.variacaoPreco.reais, 1);                       // 7 - 6
  perto(b.trecho.kmPorLitro, 400 / 32);
  perto(b.trecho.custoPorKm, 224 / 400);
  perto(c.variacaoPreco.reais, 6 - 7);                   // a variação do seguinte usa o preço corrigido
});

teste('corrigir "tanque cheio" muda o trecho do consumo', function () {
  // c passa a ser tanque cheio: trecho b->c (200 km / 15 L) e c->d (300 km / 25 L)
  var r = C.analisarAbastecimentos(corrigir(base, 'c', { tanqueCheio: true }));
  perto(r[2].trecho.kmPorLitro, 200 / 15);
  perto(r[3].trecho.kmPorLitro, 300 / 25);
});

teste('corrigir abastecimento atualiza o gasto do mês e o consumo médio', function () {
  var corrigida = corrigir(base, 'd', { valor: 200 });
  perto(C.gastoPorMes(corrigida)[0].valor, 240 + 248 + 90 + 200);
  var m = C.consumoMedio(C.analisarAbastecimentos(corrigir(base, 'd', { km: 11000 })));
  perto(m.kmPorLitro, (400 + 600) / 80);
});

teste('corrigir a manutenção de óleo refaz a próxima troca', function () {
  var man = [{ id: 'm1', tipo: 'oleo', data: '2026-01-01', km: 10000 }];
  var antes = C.lembretes({ oleoKm: 5000 }, man, 12000, '2026-02-01')[0];
  assert.strictEqual(antes.proxKm, 15000);
  var depois = C.lembretes({ oleoKm: 5000 }, corrigir(man, 'm1', { km: 9000 }), 12000, '2026-02-01')[0];
  assert.strictEqual(depois.proxKm, 14000);
  assert.strictEqual(depois.mensagem, 'Faltam 2.000 km para a troca de óleo.');
});

teste('corrigir a data da troca de óleo refaz o prazo em meses', function () {
  var man = [{ id: 'm1', tipo: 'oleo', data: '2026-01-10', km: 10000 }];
  var l = C.lembretes({ oleoKm: 5000, oleoMeses: 6 }, corrigir(man, 'm1', { data: '2026-03-10' }), 11000, '2026-04-01')[0];
  assert.strictEqual(l.proxData, '2026-09-10');
});

teste('corrigir o lembrete de pneus refaz a próxima quilometragem e a data', function () {
  var man = [{ id: 'p1', tipo: 'pneus', data: '2026-01-01', km: 10000, lembreteKm: 40000 }];
  var l = C.lembretes({ oleoKm: 0 }, corrigir(man, 'p1', { lembreteKm: 30000 }), 11000, '2026-02-01')
    .filter(function (x) { return x.chave === 'pneus'; })[0];
  assert.strictEqual(l.proxKm, 40000);
  assert.strictEqual(l.mensagem, 'Faltam 29.000 km para a troca de pneus.');
  l = C.lembretes({ oleoKm: 0 }, corrigir(man, 'p1', { lembreteKm: null, lembreteData: '2026-12-01' }), 11000, '2026-02-01')
    .filter(function (x) { return x.chave === 'pneus'; })[0];
  assert.strictEqual(l.proxKm, null);
  assert.strictEqual(l.proxData, '2026-12-01');
});

teste('mudar o intervalo do óleo no carro refaz a próxima troca', function () {
  var man = [{ id: 'm1', tipo: 'oleo', data: '2026-01-01', km: 10000 }];
  assert.strictEqual(C.lembretes({ oleoKm: 10000 }, man, 12000, '2026-02-01')[0].proxKm, 20000);
});

teste('validar a correção ignora o próprio registro (não acusa km "menor que o anterior")', function () {
  var v = C.validarAbastecimento({ id: 'd', data: '2026-01-20', km: 10950, litros: 25, valor: 150 }, base, '2026-02-01');
  assert.deepStrictEqual(v.erros, []);
  v = C.validarAbastecimento({ id: 'b', data: '2026-01-10', km: 10700, litros: 40, valor: 248 }, base, '2026-02-01');
  assert.ok(v.erros.some(function (e) { return /maior/.test(e); }), 'não pode passar do abastecimento seguinte');
});

console.log('\n' + (total - falhas) + ' de ' + total + ' testes passaram.');
process.exit(falhas ? 1 : 0);
