// Testes da leitura de datas digitadas (formato brasileiro). Rodar com: node testes/datas.test.js
'use strict';
var assert = require('assert');
var D = require('../js/datas.js');

var falhas = 0, total = 0;
function teste(nome, fn) {
  total++;
  try { fn(); console.log('  ok  ' + nome); }
  catch (e) { falhas++; console.log('  FALHOU  ' + nome + '\n        ' + e.message); }
}

console.log('Datas');
teste('lê dd/mm/aaaa e devolve aaaa-mm-dd', function () {
  assert.strictEqual(D.lerTexto('05/11/2026'), '2026-11-05');
  assert.strictEqual(D.lerTexto('5/1/2026'), '2026-01-05');
  assert.strictEqual(D.lerTexto('05112026'), '2026-11-05');
  assert.strictEqual(D.lerTexto('05-11-2026'), '2026-11-05');
  assert.strictEqual(D.lerTexto(' 31/12/2025 '), '2025-12-31');
});
teste('recusa data incompleta ou que não existe', function () {
  assert.strictEqual(D.lerTexto('05/11'), null);
  assert.strictEqual(D.lerTexto('31/02/2026'), null);
  assert.strictEqual(D.lerTexto('29/02/2026'), null);
  assert.strictEqual(D.lerTexto('00/10/2026'), null);
  assert.strictEqual(D.lerTexto('10/13/2026'), null);
  assert.strictEqual(D.lerTexto('abc'), null);
  assert.strictEqual(D.lerTexto(''), null);
});
teste('ano bissexto', function () { assert.strictEqual(D.lerTexto('29/02/2028'), '2028-02-29'); });
teste('máscara põe as barras enquanto digita', function () {
  assert.strictEqual(D.mascarar('05'), '05');
  assert.strictEqual(D.mascarar('051'), '05/1');
  assert.strictEqual(D.mascarar('05112026'), '05/11/2026');
  assert.strictEqual(D.mascarar('05/11/20261'), '05/11/2026');
  assert.strictEqual(D.mascarar('5a1'), '51');
});
teste('mostra aaaa-mm-dd como dd/mm/aaaa', function () {
  assert.strictEqual(D.paraTexto('2026-11-05'), '05/11/2026');
  assert.strictEqual(D.paraTexto(''), '');
  assert.strictEqual(D.paraTexto(null), '');
});

console.log('\n' + (total - falhas) + ' de ' + total + ' testes passaram.');
process.exit(falhas ? 1 : 0);
