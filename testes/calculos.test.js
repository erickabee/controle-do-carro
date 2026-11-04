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

console.log('\n' + (total - falhas) + ' de ' + total + ' testes passaram.');
process.exit(falhas ? 1 : 0);
