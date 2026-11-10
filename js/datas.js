/*
 * Campo de data do Controle de Bordo, em português e no formato brasileiro (dd/mm/aaaa).
 *
 * - A pessoa pode DIGITAR a data (as barras entram sozinhas: "05112026" vira 05/11/2026)
 *   ou tocar no botão do calendário.
 * - Calendário próprio, sem bibliotecas nem serviços externos: navegação entre meses,
 *   atalho "Hoje", teclado (setas, Page Up/Down, Home/End, Enter, Esc).
 * - O valor continua num <input type="hidden"> com o mesmo id de antes (ex.: #data) e no
 *   formato aaaa-mm-dd: o resto do app lê e valida a data exatamente como antes.
 *   Quando o valor muda, o campo escondido dispara "input" e "change".
 */
(function (root) {
  'use strict';

  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var DIAS = [['D', 'domingo'], ['S', 'segunda-feira'], ['T', 'terça-feira'], ['Q', 'quarta-feira'], ['Q', 'quinta-feira'], ['S', 'sexta-feira'], ['S', 'sábado']];
  var ICONE = '<svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2"/></svg>';

  function dois(n) { return (n < 10 ? '0' : '') + n; }
  function iso(a, m, d) { return a + '-' + dois(m) + '-' + dois(d); }
  function hojeISO() { var h = new Date(); return iso(h.getFullYear(), h.getMonth() + 1, h.getDate()); }
  function partes(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    return m ? { a: +m[1], m: +m[2], d: +m[3] } : null;
  }
  function diasNoMes(a, m) { return new Date(a, m, 0).getDate(); }
  function valida(a, m, d) { return a >= 1900 && a <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= diasNoMes(a, m); }
  function paraTexto(v) { var p = partes(v); return p ? dois(p.d) + '/' + dois(p.m) + '/' + p.a : ''; }
  function porExtenso(v) { var p = partes(v); return p ? p.d + ' de ' + MESES[p.m - 1] + ' de ' + p.a : ''; }
  // "05/11/2026", "5/11/2026", "05112026", "05-11-2026" → "2026-11-05"; incompleto ou inválido → null
  function lerTexto(t) {
    t = String(t || '').trim();
    var m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(t) || /^(\d{2})(\d{2})(\d{4})$/.exec(t);
    if (!m) return null;
    var d = +m[1], mes = +m[2], a = +m[3];
    return valida(a, mes, d) ? iso(a, mes, d) : null;
  }
  // Máscara enquanto digita: só números, barras automáticas.
  function mascarar(t) {
    var n = String(t || '').replace(/\D/g, '').slice(0, 8);
    if (n.length > 4) return n.slice(0, 2) + '/' + n.slice(2, 4) + '/' + n.slice(4);
    if (n.length > 2) return n.slice(0, 2) + '/' + n.slice(2);
    return n;
  }
  function somarDias(v, n) { var p = partes(v); var dt = new Date(p.a, p.m - 1, p.d + n); return iso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()); }
  function somarMeses(v, n) {
    var p = partes(v); var a = p.a, m = p.m + n;
    while (m > 12) { m -= 12; a++; } while (m < 1) { m += 12; a--; }
    return iso(a, m, Math.min(p.d, diasNoMes(a, m)));
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  // HTML do campo. opts: { id, rotulo, valor, min, max, opcional, dica }
  function html(o) {
    var id = o.id;
    return '<div class="campo campo-data" data-campo-data="' + esc(id) + '">' +
      '<label for="' + esc(id) + '-texto">' + o.rotulo + (o.opcional ? ' <span class="opcional">(opcional)</span>' : '') + '</label>' +
      '<div class="data-caixa">' +
      '<input type="text" id="' + esc(id) + '-texto" class="data-texto" inputmode="numeric" autocomplete="off" placeholder="dd/mm/aaaa" maxlength="10"' +
      ' value="' + esc(paraTexto(o.valor)) + '" aria-describedby="' + esc(id) + '-ajuda">' +
      '<button type="button" class="data-abrir" aria-haspopup="dialog" aria-expanded="false" aria-controls="' + esc(id) + '-cal">' + ICONE +
      '<span class="sr">Abrir calendário para escolher ' + esc(String(o.rotulo).replace(/<[^>]*>/g, '').toLowerCase()) + '</span></button>' +
      '<input type="hidden" id="' + esc(id) + '" value="' + esc(o.valor || '') + '"' + (o.min ? ' min="' + esc(o.min) + '"' : '') + (o.max ? ' max="' + esc(o.max) + '"' : '') + '>' +
      '</div>' +
      '<span class="dica data-ajuda" id="' + esc(id) + '-ajuda" aria-live="polite">' + (o.dica || 'Digite como 05/11/2026 ou toque no calendário.') + '</span>' +
      '<div class="calendario" id="' + esc(id) + '-cal" role="dialog" aria-modal="false" aria-label="Escolher data" hidden></div>' +
      '</div>';
  }

  function ligar(raiz) {
    Array.prototype.forEach.call((raiz || document).querySelectorAll('[data-campo-data]'), function (caixa) {
      if (caixa.dataset.ligado) return;
      caixa.dataset.ligado = '1';
      var oculto = caixa.querySelector('input[type=hidden]');
      var texto = caixa.querySelector('.data-texto');
      var botao = caixa.querySelector('.data-abrir');
      var cal = caixa.querySelector('.calendario');
      var ajuda = caixa.querySelector('.data-ajuda');
      var ajudaPadrao = ajuda.innerHTML;
      var mes = null;       // primeiro dia do mês mostrado (aaaa-mm-01)
      var foco = null;      // dia com o foco no calendário

      function limites() { return { min: oculto.getAttribute('min') || null, max: oculto.getAttribute('max') || null }; }
      function foraDoLimite(v) { var l = limites(); return (l.min && v < l.min) || (l.max && v > l.max); }
      function definir(v) {
        if (oculto.value === v) return;
        oculto.value = v;
        oculto.dispatchEvent(new Event('input', { bubbles: true }));
        oculto.dispatchEvent(new Event('change', { bubbles: true }));
      }
      function aviso(msg) { ajuda.innerHTML = msg || ajudaPadrao; caixa.classList.toggle('data-invalida', !!msg); }

      texto.addEventListener('input', function () {
        var pos = texto.selectionStart, antes = texto.value.length;
        texto.value = mascarar(texto.value);
        if (pos !== null && document.activeElement === texto) { var p = pos + (texto.value.length - antes); texto.setSelectionRange(p, p); }
        var v = lerTexto(texto.value);
        if (v) { aviso(''); definir(v); }
        else if (!texto.value) { aviso(''); definir(''); }
        else if (oculto.value) { oculto.value = ''; oculto.dispatchEvent(new Event('input', { bubbles: true })); }
      });
      texto.addEventListener('blur', function () {
        if (!texto.value) return;
        var v = lerTexto(texto.value);
        if (!v) aviso(texto.value.replace(/\D/g, '').length < 8 ? 'Data incompleta. Use dia/mês/ano, por exemplo 05/11/2026.' : 'Essa data não existe. Confira o dia e o mês.');
        else { texto.value = paraTexto(v); aviso(''); }
      });
      // o app pode mudar o valor por fora (ex.: "Usar a última quilometragem" não mexe aqui, mas fica pronto)
      oculto.addEventListener('change', function () { if (lerTexto(texto.value) !== oculto.value) texto.value = paraTexto(oculto.value); });

      function desenhar(focar) {
        var p = partes(mes), primeiro = new Date(p.a, p.m - 1, 1).getDay(), total = diasNoMes(p.a, p.m);
        var hoje = hojeISO(), sel = oculto.value;
        var mesAnt = somarMeses(mes, -1), mesProx = somarMeses(mes, 1);
        var l = limites();
        var podeAnt = !l.min || iso(partes(mesAnt).a, partes(mesAnt).m, diasNoMes(partes(mesAnt).a, partes(mesAnt).m)) >= l.min;
        var podeProx = !l.max || mesProx <= l.max;
        var h = '<div class="cal-topo">' +
          '<button type="button" class="cal-nav" data-cal="ant"' + (podeAnt ? '' : ' disabled') + ' aria-label="Mês anterior">‹</button>' +
          '<p class="cal-titulo" aria-live="polite">' + MESES[p.m - 1] + ' de ' + p.a + '</p>' +
          '<button type="button" class="cal-nav" data-cal="prox"' + (podeProx ? '' : ' disabled') + ' aria-label="Próximo mês">›</button></div>' +
          '<table class="cal-grade" role="grid" aria-label="' + MESES[p.m - 1] + ' de ' + p.a + '"><thead><tr>' +
          DIAS.map(function (d) { return '<th scope="col" abbr="' + d[1] + '"><span aria-hidden="true">' + d[0] + '</span><span class="sr">' + d[1] + '</span></th>'; }).join('') +
          '</tr></thead><tbody><tr>';
        for (var i = 0; i < primeiro; i++) h += '<td></td>';
        for (var d = 1; d <= total; d++) {
          var v = iso(p.a, p.m, d), col = (primeiro + d - 1) % 7;
          if (col === 0 && d > 1) h += '</tr><tr>';
          var fora = foraDoLimite(v);
          h += '<td><button type="button" class="cal-dia' + (v === sel ? ' escolhido' : '') + (v === hoje ? ' hoje' : '') + '" data-dia="' + v + '"' +
            ' tabindex="' + (v === foco ? '0' : '-1') + '"' + (fora ? ' disabled aria-disabled="true"' : '') +
            ' aria-label="' + porExtenso(v) + (v === hoje ? ', hoje' : '') + '"' + (v === sel ? ' aria-pressed="true"' : ' aria-pressed="false"') +
            (v === hoje ? ' aria-current="date"' : '') + '>' + d + '</button></td>';
        }
        var resto = (7 - (primeiro + total) % 7) % 7;
        for (var k = 0; k < resto; k++) h += '<td></td>';
        h += '</tr></tbody></table><div class="cal-rodape">' +
          '<button type="button" class="cal-acao cal-hoje" data-cal="hoje"' + (foraDoLimite(hoje) ? ' disabled' : '') + '>Hoje</button>' +
          (oculto.value && caixa.querySelector('.opcional') ? '<button type="button" class="cal-acao" data-cal="limpar">Limpar</button>' : '') +
          '<button type="button" class="cal-acao" data-cal="fechar">Fechar</button></div>';
        cal.innerHTML = h;
        if (focar) { var b = cal.querySelector('[data-dia="' + foco + '"]'); if (b) b.focus(); }
      }
      function abrir() {
        var base = oculto.value || lerTexto(texto.value) || hojeISO();
        if (foraDoLimite(base)) { var l = limites(); base = l.max && base > l.max ? l.max : (l.min || base); }
        foco = base; mes = base.slice(0, 8) + '01';
        cal.hidden = false; botao.setAttribute('aria-expanded', 'true'); caixa.classList.add('aberto');
        desenhar(true);
        document.addEventListener('mousedown', foraClique, true);
      }
      function fechar(voltarFoco) {
        if (cal.hidden) return;
        cal.hidden = true; cal.innerHTML = ''; botao.setAttribute('aria-expanded', 'false'); caixa.classList.remove('aberto');
        document.removeEventListener('mousedown', foraClique, true);
        if (voltarFoco) botao.focus();
      }
      function foraClique(ev) { if (!caixa.contains(ev.target)) fechar(false); }
      function escolher(v) {
        if (foraDoLimite(v)) return;
        texto.value = paraTexto(v); aviso(''); definir(v);
        fechar(true);
      }
      function moverFoco(v) {
        if (!v) return;
        foco = v;
        if (v.slice(0, 7) !== mes.slice(0, 7)) mes = v.slice(0, 8) + '01';
        desenhar(true);
      }

      botao.addEventListener('click', function () { if (cal.hidden) abrir(); else fechar(true); });
      texto.addEventListener('keydown', function (ev) { if (ev.key === 'ArrowDown' && ev.altKey) { ev.preventDefault(); abrir(); } });
      cal.addEventListener('click', function (ev) {
        var b = ev.target.closest('button'); if (!b || b.disabled) return;
        var a = b.getAttribute('data-cal');
        if (b.hasAttribute('data-dia')) escolher(b.getAttribute('data-dia'));
        else if (a === 'ant' || a === 'prox') { mes = somarMeses(mes, a === 'ant' ? -1 : 1); foco = somarMeses(foco, a === 'ant' ? -1 : 1); desenhar(false); cal.querySelector('[data-cal="' + a + '"]').focus(); }
        else if (a === 'hoje') escolher(hojeISO());
        else if (a === 'limpar') { texto.value = ''; aviso(''); definir(''); fechar(true); }
        else if (a === 'fechar') fechar(true);
      });
      cal.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') { ev.preventDefault(); fechar(true); return; }
        var b = ev.target.closest('[data-dia]'); if (!b) return;
        var passos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
        if (passos[ev.key] !== undefined) { ev.preventDefault(); moverFoco(somarDias(foco, passos[ev.key])); }
        else if (ev.key === 'PageUp' || ev.key === 'PageDown') { ev.preventDefault(); moverFoco(somarMeses(foco, ev.key === 'PageUp' ? -1 : 1)); }
        else if (ev.key === 'Home' || ev.key === 'End') {
          ev.preventDefault();
          var dia = new Date(partes(foco).a, partes(foco).m - 1, partes(foco).d).getDay();
          moverFoco(somarDias(foco, ev.key === 'Home' ? -dia : 6 - dia));
        }
      });
    });
  }

  var api = { html: html, ligar: ligar, lerTexto: lerTexto, mascarar: mascarar, paraTexto: paraTexto };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CampoData = api;
})(this);
