// Testes do reconhecimento de marcas (emblema da Garagem). Rodar com: node testes/marcas.test.js
'use strict';
var assert = require('assert');
var M = require('../js/marcas.js');

var falhas = 0, total = 0;
function teste(nome, fn) {
  total++;
  try { fn(); console.log('  ok  ' + nome); }
  catch (e) { falhas++; console.log('  FALHOU  ' + nome + '\n        ' + e.message); }
}

console.log('Marcas');
teste('reconhece marcas comuns pelo nome', function () {
  assert.deepStrictEqual(M.reconhecerMarca('Volkswagen'), { nome: 'Volkswagen', sigla: 'VW' });
  assert.strictEqual(M.reconhecerMarca('Fiat').sigla, 'FIAT');
  assert.strictEqual(M.reconhecerMarca('Chevrolet').sigla, 'GM');
});
teste('ignora maiúsculas, acentos e espaços', function () {
  assert.strictEqual(M.reconhecerMarca('  volkswagen ').nome, 'Volkswagen');
  assert.strictEqual(M.reconhecerMarca('CITROEN').nome, 'Citroën');
  assert.strictEqual(M.reconhecerMarca('Citroën').nome, 'Citroën');
  assert.strictEqual(M.reconhecerMarca('Mercedes Benz').nome, 'Mercedes-Benz');
  assert.strictEqual(M.reconhecerMarca('mercedes-benz').nome, 'Mercedes-Benz');
});
teste('entende apelidos e erros comuns', function () {
  assert.strictEqual(M.reconhecerMarca('VW').nome, 'Volkswagen');
  assert.strictEqual(M.reconhecerMarca('Volks').nome, 'Volkswagen');
  assert.strictEqual(M.reconhecerMarca('GM').nome, 'Chevrolet');
  assert.strictEqual(M.reconhecerMarca('Hyunday').nome, 'Hyundai');
});
teste('marca desconhecida ou vazia não é reconhecida', function () {
  assert.strictEqual(M.reconhecerMarca('Marca W'), null);
  assert.strictEqual(M.reconhecerMarca(''), null);
  assert.strictEqual(M.reconhecerMarca(null), null);
  assert.strictEqual(M.reconhecerMarca(undefined), null);
});
teste('não reconhece por pedaço do nome (evita emblema errado)', function () {
  assert.strictEqual(M.reconhecerMarca('Fiat Uno'), null);
  assert.strictEqual(M.reconhecerMarca('For'), null);
});
teste('siglas cabem no emblema (até 8 letras)', function () {
  ['Volkswagen', 'Chevrolet', 'Fiat', 'Ford', 'Toyota', 'Honda', 'Hyundai', 'Renault', 'Nissan', 'Jeep', 'Peugeot', 'Citroën', 'Mitsubishi', 'Chrysler']
    .forEach(function (m) { assert.ok(M.reconhecerMarca(m).sigla.length <= 8, m); });
});

console.log('\n' + (total - falhas) + ' de ' + total + ' testes passaram.');
process.exit(falhas ? 1 : 0);
