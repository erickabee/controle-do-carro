/*
 * Reconhecimento da marca do carro, para mostrar um emblema na Garagem.
 *
 * Não usamos logotipos oficiais: eles são marcas registradas e não há um pacote
 * de ícones com licença clara para isso. Em vez disso, o app desenha um emblema
 * próprio, só com letras (a sigla ou o nome curto da marca). Tudo é local: nada
 * é buscado na internet, e funciona sem conexão.
 * Marca não reconhecida (ou vazia): o app usa um emblema genérico com um carro.
 */
(function (root) {
  'use strict';

  // nome oficial, sigla do emblema, outras formas de escrever
  var MARCAS = [
    ['Volkswagen', 'VW', ['vw', 'volks', 'volkswagem', 'wolkswagen']],
    ['Chevrolet', 'GM', ['chevrolet', 'chevrolé', 'chevy', 'gm', 'general motors']],
    ['Fiat', 'FIAT', []],
    ['Ford', 'FORD', []],
    ['Toyota', 'TOYOTA', []],
    ['Honda', 'HONDA', []],
    ['Hyundai', 'HYUNDAI', ['hiunday', 'hyunday', 'hiundai']],
    ['Renault', 'RENAULT', ['reno', 'renô']],
    ['Nissan', 'NISSAN', []],
    ['Jeep', 'JEEP', []],
    ['Peugeot', 'PEUGEOT', ['pegeot', 'peugeout']],
    ['Citroën', 'CITROËN', ['citroen', 'citroem']],
    ['Mitsubishi', 'MITSU', []],
    ['Kia', 'KIA', []],
    ['BMW', 'BMW', []],
    ['Mercedes-Benz', 'MB', ['mercedes', 'mercedes benz', 'mercedesbenz', 'benz']],
    ['Audi', 'AUDI', []],
    ['Volvo', 'VOLVO', []],
    ['Caoa Chery', 'CHERY', ['chery', 'caoa', 'caoa chery']],
    ['BYD', 'BYD', []],
    ['GWM', 'GWM', ['great wall', 'haval']],
    ['Suzuki', 'SUZUKI', []],
    ['Subaru', 'SUBARU', []],
    ['Land Rover', 'LR', ['landrover', 'range rover']],
    ['RAM', 'RAM', []],
    ['Dodge', 'DODGE', []],
    ['Chrysler', 'CHRYSLER', []],
    ['Mini', 'MINI', []],
    ['Porsche', 'PORSCHE', []],
    ['Lexus', 'LEXUS', []],
    ['JAC', 'JAC', []],
    ['Troller', 'TROLLER', []]
  ];

  function normalizar(t) {
    return String(t || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  var indice = {};
  MARCAS.forEach(function (m) {
    var info = { nome: m[0], sigla: m[1] };
    [m[0]].concat(m[2]).forEach(function (forma) { indice[normalizar(forma)] = info; });
  });

  // Devolve { nome, sigla } da marca, ou null se não for reconhecida.
  function reconhecerMarca(texto) {
    var n = normalizar(texto);
    if (!n) return null;
    return indice[n] || indice[n.replace(/ /g, '')] || null;
  }

  var api = { reconhecerMarca: reconhecerMarca, normalizar: normalizar, total: MARCAS.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Marcas = api;
})(this);
