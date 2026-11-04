/*
 * Controle do Carro — telas e armazenamento.
 * Os dados ficam no navegador deste aparelho (localStorage).
 */
(function () {
  'use strict';

  var C = window.Calc;
  var CHAVE = 'controleCarro.v1';
  var MAX_CARROS = 2;
  var CORES = [
    { nome: 'Azul', valor: '#1e40af' },
    { nome: 'Vermelho', valor: '#b91c1c' },
    { nome: 'Verde', valor: '#15803d' },
    { nome: 'Roxo', valor: '#6d28d9' },
    { nome: 'Laranja', valor: '#c2410c' },
    { nome: 'Cinza', valor: '#374151' }
  ];
  var COMBUSTIVEIS = ['Gasolina', 'Etanol', 'Diesel', 'GNV'];
  var TIPOS_ORDEM = ['oleo', 'pneus', 'revisao', 'freios', 'bateria', 'alinhamento', 'outro'];

  var tela = document.getElementById('tela');
  var topo = document.getElementById('topo');
  var menu = document.getElementById('menu');
  var faixaDemo = document.getElementById('faixa-demo');
  var janela = document.getElementById('janela');

  var sessao = {
    escolheuCarro: false,
    abaHistorico: 'abastecimentos',
    periodoHistorico: '90',
    deHistorico: '', ateHistorico: '',
    periodoRelatorio: '12'
  };
  var acoesJanela = {};

  // =====================================================================
  // Armazenamento
  // =====================================================================
  function estadoVazio() {
    return { versao: 1, carros: [], abastecimentos: [], manutencoes: [], carroAtual: null,
      demo: false, ultimoBackup: null, alteracoesDesdeBackup: 0 };
  }
  function carregar() {
    try {
      var txt = localStorage.getItem(CHAVE);
      if (!txt) return estadoVazio();
      return normalizar(JSON.parse(txt));
    } catch (e) {
      return estadoVazio();
    }
  }
  function normalizar(d) {
    var e = estadoVazio();
    if (!d || typeof d !== 'object') return e;
    e.carros = Array.isArray(d.carros) ? d.carros : [];
    e.abastecimentos = Array.isArray(d.abastecimentos) ? d.abastecimentos : [];
    e.manutencoes = Array.isArray(d.manutencoes) ? d.manutencoes : [];
    e.carroAtual = d.carroAtual || (e.carros[0] && e.carros[0].id) || null;
    e.demo = !!d.demo;
    e.ultimoBackup = d.ultimoBackup || null;
    e.alteracoesDesdeBackup = d.alteracoesDesdeBackup || 0;
    return e;
  }
  var estado = carregar();

  function salvar(contarAlteracao) {
    if (contarAlteracao && !estado.demo) estado.alteracoesDesdeBackup = (estado.alteracoesDesdeBackup || 0) + 1;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
      return true;
    } catch (e) {
      alert('Não foi possível salvar os dados neste aparelho. Verifique se o navegador não está em modo anônimo e se há espaço livre.');
      return false;
    }
  }
  if (navigator.storage && navigator.storage.persist) {
    try { navigator.storage.persist(); } catch (e) { /* sem problema */ }
  }

  function novoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  // =====================================================================
  // Acesso aos dados
  // =====================================================================
  function carroPorId(id) { return estado.carros.filter(function (c) { return c.id === id; })[0] || null; }
  function carroAtual() {
    var c = carroPorId(estado.carroAtual);
    if (!c && estado.carros.length) { c = estado.carros[0]; estado.carroAtual = c.id; }
    return c;
  }
  function abastDoCarro(id) { return estado.abastecimentos.filter(function (a) { return a.carroId === id; }); }
  function manutDoCarro(id) { return estado.manutencoes.filter(function (m) { return m.carroId === id; }); }

  function resumoCarro(carro) {
    var ab = abastDoCarro(carro.id), man = manutDoCarro(carro.id);
    var analise = C.analisarAbastecimentos(ab);
    var km = C.kmAtual(ab, man);
    return {
      abastecimentos: ab, manutencoes: man, analise: analise, km: km,
      lembretes: C.lembretes(carro, man, km, C.hojeISO()),
      recente: C.consumoMedio(analise, 3),
      geral: C.consumoMedio(analise)
    };
  }
  function descricaoCarro(c) {
    return [c.marca, c.modelo, c.ano].filter(Boolean).join(' ');
  }

  // =====================================================================
  // Utilidades de tela
  // =====================================================================
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }
  // Muda de tela. Se a rota já é a atual, redesenha direto (não haverá 'hashchange').
  function ir(rota, substituir) {
    if (location.hash === '#' + rota) { desenhar(); return; }
    if (substituir) location.replace('#' + rota);
    else location.hash = '#' + rota;
  }
  function textoNumero(n, casas) { return (n === null || n === undefined) ? '' : C.fmtNum(n, casas); }

  function caixa(tipo, titulo, itens) {
    var h = '<div class="caixa caixa-' + tipo + '" role="' + (tipo === 'erro' ? 'alert' : 'status') + '">';
    if (titulo) h += '<strong>' + esc(titulo) + '</strong>';
    if (itens && itens.length) h += '<ul>' + itens.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
    return h + '</div>';
  }

  function abrirJanela(html, acoes) {
    acoesJanela = acoes || {};
    janela.innerHTML = '<div class="janela" role="dialog" aria-modal="true">' + html + '</div>';
    janela.hidden = false;
    document.body.style.overflow = 'hidden';
    var foco = $('[data-janela]', janela);
    if (foco) foco.focus();
  }
  function fecharJanela() {
    janela.hidden = true; janela.innerHTML = ''; acoesJanela = {};
    document.body.style.overflow = '';
  }
  janela.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-janela]');
    if (b) {
      var fn = acoesJanela[b.getAttribute('data-janela')];
      fecharJanela();
      if (fn) fn();
    }
  });

  function confirmar(opcoes) {
    abrirJanela(
      (opcoes.icone ? '<div class="grande-icone" aria-hidden="true">' + opcoes.icone + '</div>' : '') +
      '<h2>' + esc(opcoes.titulo) + '</h2>' +
      (opcoes.texto ? '<p>' + opcoes.texto + '</p>' : '') +
      '<button class="botao ' + (opcoes.perigo ? 'botao-perigo-cheio' : 'botao-principal') + '" data-janela="sim">' + esc(opcoes.sim) + '</button>' +
      '<button class="botao botao-secundario" data-janela="nao">' + esc(opcoes.nao || 'Cancelar') + '</button>',
      { sim: opcoes.aoConfirmar, nao: opcoes.aoCancelar }
    );
  }

  function aviso(titulo, texto, depois) {
    abrirJanela('<h2>' + esc(titulo) + '</h2><p>' + texto + '</p><button class="botao botao-principal" data-janela="ok">OK</button>', { ok: depois });
  }

  // =====================================================================
  // Moldura: topo com o carro, faixa de demonstração e menu
  // =====================================================================
  function montarMoldura(rota) {
    var carro = carroAtual();
    var semCarro = !carro || rota === 'boas-vindas' || rota === 'escolher';
    var emFormulario = rota === 'abastecer' || rota === 'manutencao' || rota === 'carro';

    if (estado.demo) {
      faixaDemo.hidden = false;
      faixaDemo.innerHTML = '⚠️ DEMONSTRAÇÃO: estes dados são apenas um exemplo. <button type="button" data-acao="sair-demo">Apagar e começar</button>';
    } else {
      faixaDemo.hidden = true;
    }

    if (semCarro) {
      topo.hidden = true; menu.hidden = true; document.body.classList.add('sem-menu');
      document.documentElement.style.setProperty('--cor-carro', '#1e40af');
      return;
    }
    document.documentElement.style.setProperty('--cor-carro', carro.cor || CORES[0].valor);
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', carro.cor || CORES[0].valor);

    topo.hidden = false;
    var desc = descricaoCarro(carro);
    topo.innerHTML = '<div class="topo-dentro"><div class="topo-carro">' +
      '<span class="topo-rotulo">Carro selecionado</span>' +
      '<span class="topo-nome">🚗 ' + esc(carro.nome) + '</span>' +
      (desc ? '<span class="topo-rotulo">' + esc(desc) + '</span>' : '') + '</div>' +
      (estado.carros.length > 1 && !emFormulario ? '<button type="button" data-acao="trocar-carro">Trocar<br>carro</button>' : '') +
      '</div>';

    menu.hidden = emFormulario;
    document.body.classList.toggle('sem-menu', emFormulario);
    $$('a', menu).forEach(function (a) {
      var ativo = a.getAttribute('data-rota') === rota;
      a.classList.toggle('ativo', ativo);
      if (ativo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  // =====================================================================
  // Rotas
  // =====================================================================
  function rotaAtual() {
    var h = (location.hash || '').replace(/^#/, '');
    var p = h.split('/');
    return { nome: p[0] || 'inicio', param: p[1] ? decodeURIComponent(p[1]) : null };
  }

  function desenhar() {
    fecharJanela();
    var r = rotaAtual();
    var nome = r.nome;

    if (!estado.carros.length && nome !== 'ajuda') nome = 'boas-vindas';
    else if (estado.carros.length > 1 && !sessao.escolheuCarro && nome !== 'ajuda') nome = 'escolher';
    else if (nome === 'escolher' && estado.carros.length < 2) nome = 'inicio';
    if (estado.carros.length && estado.carros.length < 2) sessao.escolheuCarro = true;

    montarMoldura(nome);
    var telas = {
      'boas-vindas': telaBoasVindas, escolher: telaEscolher, inicio: telaInicio,
      abastecer: telaAbastecer, manutencao: telaManutencao, historico: telaHistorico,
      relatorios: telaRelatorios, ajustes: telaAjustes, carro: telaCarro, ajuda: telaAjuda
    };
    (telas[nome] || telaInicio)(r.param);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', desenhar);

  // Cliques gerais
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-acao]');
    if (!b) return;
    var acao = b.getAttribute('data-acao');
    var id = b.getAttribute('data-id');
    if (acao === 'trocar-carro') { sessao.escolheuCarro = false; ir('escolher'); }
    else if (acao === 'sair-demo') sairDemo();
    else if (acao === 'apagar-abast') apagarAbastecimento(id);
    else if (acao === 'apagar-manut') apagarManutencao(id);
    else if (acao === 'voltar') history.length > 1 ? history.back() : ir('inicio');
    else if (acao === 'backup') fazerBackup();
    else if (acao === 'restaurar') escolherArquivoRestaurar();
    else if (acao === 'planilha') exportarPlanilha();
    else if (acao === 'demo') carregarDemo();
  });

  // =====================================================================
  // Tela: boas-vindas (primeiro uso)
  // =====================================================================
  function telaBoasVindas() {
    tela.innerHTML =
      '<h1>🚗 Controle do Carro</h1>' +
      '<p>Aqui vocês anotam os abastecimentos e as manutenções do carro. O aplicativo calcula sozinho o consumo, os gastos e avisa quando chegar a hora da troca de óleo.</p>' +
      '<div class="cartao"><form id="form-inicio" novalidate>' +
      '<h2>Vamos começar</h2>' +
      '<div class="campo"><label for="nome1">Nome do primeiro carro</label>' +
      '<input type="text" id="nome1" value="Carro 1" maxlength="40" autocomplete="off">' +
      '<span class="dica">Exemplo: “Carro do Pai”, “Gol prata”.</span></div>' +
      '<div class="campo"><label for="nome2">Nome do segundo carro <span class="opcional">(deixe em branco se for só um)</span></label>' +
      '<input type="text" id="nome2" value="Carro 2" maxlength="40" autocomplete="off"></div>' +
      '<div id="erros-inicio"></div>' +
      '<button class="botao botao-principal botao-grande" type="submit">Começar</button>' +
      '</form></div>' +
      '<div class="cartao"><h2>Quer ver um exemplo antes?</h2>' +
      '<p>Mostramos o aplicativo com dados inventados, só para conhecer. Depois é só apagar.</p>' +
      '<button class="botao botao-secundario" type="button" data-acao="demo">Ver demonstração</button></div>' +
      '<div class="cartao"><h2>Já usava em outro celular?</h2>' +
      '<p>Se você tem uma cópia de segurança (arquivo salvo pelo aplicativo), pode trazê-la para cá.</p>' +
      '<button class="botao botao-secundario" type="button" data-acao="restaurar">Restaurar cópia de segurança</button></div>' +
      '<p class="legenda-simples">Os dados ficam guardados somente neste aparelho. <a href="#ajuda">Saiba mais</a>.</p>';

    $('#form-inicio').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var n1 = $('#nome1').value.trim(), n2 = $('#nome2').value.trim();
      if (!n1) { $('#erros-inicio').innerHTML = caixa('erro', 'Escreva o nome do primeiro carro.'); return; }
      estado = estadoVazio();
      estado.carros.push(novoCarro(n1, CORES[0].valor));
      if (n2) estado.carros.push(novoCarro(n2, CORES[1].valor));
      estado.carroAtual = estado.carros[0].id;
      salvar();
      sessao.escolheuCarro = estado.carros.length < 2;
      aviso('Tudo pronto! ✔', 'Agora registre a <strong>última troca de óleo</strong> de cada carro (em Registrar manutenção) para receber os avisos da próxima troca.', function () {
        ir(estado.carros.length > 1 ? 'escolher' : 'inicio', true);
      });
    });
  }

  function novoCarro(nome, cor) {
    return { id: novoId(), nome: nome, marca: '', modelo: '', ano: '', cor: cor, oleoKm: 5000, oleoMeses: null };
  }

  // =====================================================================
  // Tela: escolher carro
  // =====================================================================
  function telaEscolher() {
    var h = '<h1>Qual carro você quer ver?</h1><p>Toque no carro.</p>';
    estado.carros.forEach(function (c) {
      var r = resumoCarro(c);
      var pior = r.lembretes.filter(function (l) { return l.situacao === 'atrasada' || l.situacao === 'proxima'; })[0];
      h += '<button type="button" class="escolha-carro" data-carro="' + esc(c.id) + '" style="background:' + esc(c.cor) + '">' +
        '<span class="nome">🚗 ' + esc(c.nome) + '</span>' +
        (descricaoCarro(c) ? '<span class="sub">' + esc(descricaoCarro(c)) + '</span>' : '') +
        '<span class="sub">' + (r.km !== null ? 'Quilometragem: ' + C.fmtKm(r.km) : 'Nenhum registro ainda') + '</span>' +
        (pior ? '<span class="alerta">' + (pior.situacao === 'atrasada' ? '🔴 ' : '🟡 ') + esc(pior.nome) + (pior.situacao === 'atrasada' ? ' atrasada' : ' chegando') + '</span>' : '') +
        '</button>';
    });
    tela.innerHTML = h;
    $$('[data-carro]').forEach(function (b) {
      b.addEventListener('click', function () {
        estado.carroAtual = b.getAttribute('data-carro');
        sessao.escolheuCarro = true;
        salvar();
        ir('inicio', true);
      });
    });
  }

  // =====================================================================
  // Tela: início (painel)
  // =====================================================================
  function htmlLembrete(l) {
    var selos = { atrasada: 'ATRASADA', proxima: 'CHEGANDO', ok: 'EM DIA', semDados: 'SEM REGISTRO' };
    var icones = { atrasada: '🔴', proxima: '🟡', ok: '🟢', semDados: '⚪' };
    var detalhe = '';
    if (l.ultima) {
      detalhe = '<p class="legenda-simples">Última: ' + C.fmtData(l.ultima.data) + ' com ' + C.fmtKm(l.ultima.km) +
        (l.proxKm !== null ? ' • Próxima: ' + C.fmtKm(l.proxKm) : '') +
        (l.proxData ? ' • até ' + C.fmtData(l.proxData) : '') + '</p>';
    }
    return '<div class="lembrete lembrete-' + l.situacao + '"><span class="icone" aria-hidden="true">' + icones[l.situacao] + '</span><div>' +
      '<span class="selo">' + selos[l.situacao] + '</span> <strong>' + esc(l.nome) + '</strong>' +
      '<p>' + esc(l.mensagem) + '</p>' + detalhe + '</div></div>';
  }

  function telaInicio() {
    var carro = carroAtual();
    var r = resumoCarro(carro);
    var hoje = C.hojeISO(), mes = hoje.slice(0, 7);
    var doMes = r.abastecimentos.filter(function (a) { return a.data.slice(0, 7) === mes; });
    var gastoMes = doMes.reduce(function (s, a) { return s + a.valor; }, 0);
    var manutMes = r.manutencoes.filter(function (m) { return m.data.slice(0, 7) === mes && m.valor; })
      .reduce(function (s, m) { return s + m.valor; }, 0);
    var ultimo = r.analise[r.analise.length - 1];
    var urgentes = r.lembretes.filter(function (l) { return l.situacao === 'atrasada' || l.situacao === 'proxima'; });
    var proxima = r.lembretes.filter(function (l) { return l.situacao !== 'semDados'; })[0];

    var h = '';
    urgentes.forEach(function (l) { h += htmlLembrete(l); });

    h += '<a class="botao botao-carro botao-grande" href="#abastecer"><span class="icone" aria-hidden="true">⛽</span> Registrar abastecimento</a>';
    h += '<a class="botao botao-secundario botao-grande" href="#manutencao"><span class="icone" aria-hidden="true">🔧</span> Registrar manutenção</a>';

    h += '<div class="grade">';
    h += '<div class="cartao"><span class="info-rotulo">Quilometragem atual</span><span class="info-valor">' +
      (r.km !== null ? C.fmtKm(r.km) : '—') + '</span>' +
      (r.km === null ? '<span class="info-extra">Aparece depois do primeiro registro.</span>' : '<span class="info-extra">Último número anotado</span>') + '</div>';

    h += '<div class="cartao"><span class="info-rotulo">Consumo recente</span>';
    if (r.recente) {
      h += '<span class="info-valor">' + C.fmtNum(r.recente.kmPorLitro, 1) + ' km/L</span>' +
        '<span class="info-extra">Anda ' + C.fmtNum(r.recente.kmPorLitro, 1) + ' km com 1 litro. Custo de ' + C.fmtDinheiro(r.recente.custoPorKm) + ' por km.</span>';
    } else {
      h += '<span class="info-valor">—</span><span class="info-extra">Ainda não dá para calcular: são necessários pelo menos 2 abastecimentos com tanque cheio.</span>';
    }
    h += '</div>';

    h += '<div class="cartao"><span class="info-rotulo">Gasto com combustível em ' + C.fmtMes(mes).split(' de ')[0].toLowerCase() + '</span>' +
      '<span class="info-valor">' + C.fmtDinheiro(gastoMes) + '</span>' +
      '<span class="info-extra">' + (doMes.length ? C.plural(doMes.length, 'abastecimento', 'abastecimentos') : 'Nenhum abastecimento neste mês') +
      (manutMes ? '. Mais ' + C.fmtDinheiro(manutMes) + ' em manutenção.' : '') + '</span></div>';

    h += '<div class="cartao"><span class="info-rotulo">Último abastecimento</span>';
    if (ultimo) {
      h += '<span class="info-valor">' + C.fmtDinheiro(ultimo.valor) + '</span><span class="info-extra">em ' + C.fmtData(ultimo.data) +
        ' • ' + C.fmtNum(ultimo.litros, 2) + ' L</span>';
    } else {
      h += '<span class="info-valor">—</span><span class="info-extra">Nenhum abastecimento registrado.</span>';
    }
    h += '</div>';

    h += '<div class="cartao cheio"><span class="info-rotulo">Próxima manutenção</span>';
    if (proxima) {
      h += '<span class="info-valor">' + esc(proxima.nome) + '</span>' +
        '<span class="info-extra" style="font-size:1.05rem;color:var(--texto)">' + esc(proxima.mensagem) + '</span>';
    } else {
      h += '<span class="info-valor">—</span><span class="info-extra">Registre a última troca de óleo para ver aqui quando será a próxima.</span>';
    }
    h += '</div></div>';

    // Lembrete de cópia de segurança
    var temDados = r.abastecimentos.length + r.manutencoes.length > 0;
    var diasSemBackup = estado.ultimoBackup ? C.diasEntre(estado.ultimoBackup.slice(0, 10), hoje) : null;
    if (!estado.demo && temDados && (estado.alteracoesDesdeBackup >= 10 || (diasSemBackup !== null && diasSemBackup > 30 && estado.alteracoesDesdeBackup > 0))) {
      h += '<div class="caixa caixa-info"><strong>Lembrete: salve uma cópia de segurança</strong>' +
        '<p style="margin:6px 0 10px">Os dados ficam só neste celular. Uma cópia evita perder tudo se o celular quebrar ou for trocado.</p>' +
        '<button class="botao botao-secundario botao-pequeno" type="button" data-acao="backup">Salvar cópia agora</button></div>';
    }

    h += '<h2>Lembretes de manutenção</h2>';
    if (r.lembretes.length) {
      r.lembretes.filter(function (l) { return urgentes.indexOf(l) < 0; }).forEach(function (l) { h += htmlLembrete(l); });
      if (urgentes.length && urgentes.length === r.lembretes.length) h += '<p class="legenda-simples">Os lembretes estão no alto da tela.</p>';
    }
    h += '<p class="legenda-simples">Para ser avisado de pneus e outras manutenções, preencha o lembrete ao registrar a manutenção. O intervalo da troca de óleo pode ser mudado em <a href="#carro/' + esc(carro.id) + '">Ajustes do carro</a>.</p>';

    tela.innerHTML = h;
  }

  // =====================================================================
  // Tela: registrar / corrigir abastecimento
  // =====================================================================
  function campoNumero(id, rotulo, valor, unidade, dica, opts) {
    opts = opts || {};
    return '<div class="campo"><label for="' + id + '">' + rotulo + (opts.opcional ? ' <span class="opcional">(opcional)</span>' : '') + '</label>' +
      '<div class="entrada-unidade' + (opts.prefixo ? ' prefixo' : '') + '"><input type="text" id="' + id + '" inputmode="' + (opts.inteiro ? 'numeric' : 'decimal') +
      '" autocomplete="off" value="' + esc(valor) + '"' + (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '') + '>' +
      '<span class="unidade" aria-hidden="true">' + unidade + '</span></div>' +
      (dica ? '<span class="dica">' + dica + '</span>' : '') + '</div>';
  }
  function cabecalhoCarroRegistro(carro, texto) {
    return '<div class="carro-do-registro" aria-live="polite">' + texto + '<strong>🚗 ' + esc(carro.nome) + '</strong>' +
      (descricaoCarro(carro) ? esc(descricaoCarro(carro)) : '') + '</div>';
  }

  function telaAbastecer(id) {
    var carro = carroAtual();
    var reg = id ? estado.abastecimentos.filter(function (a) { return a.id === id; })[0] : null;
    if (id && !reg) { ir('historico', true); return; }
    if (reg && reg.carroId !== carro.id) { estado.carroAtual = reg.carroId; carro = carroAtual(); montarMoldura('abastecer'); }

    var outros = abastDoCarro(carro.id).filter(function (a) { return !reg || a.id !== reg.id; });
    var ord = C.ordenarAbastecimentos(outros);
    var ultimo = ord[ord.length - 1];
    var combustivelPadrao = reg ? reg.combustivel : (ultimo ? ultimo.combustivel : '');
    var hoje = C.hojeISO();

    var h = '<div class="titulo-tela"><h1>' + (reg ? 'Corrigir abastecimento' : '⛽ Novo abastecimento') + '</h1></div>';
    h += cabecalhoCarroRegistro(carro, reg ? 'Abastecimento do carro:' : 'Este abastecimento será salvo no carro:');
    h += '<form id="form-abast" novalidate><div id="erros"></div>';

    h += '<div class="campo"><label for="data">Data</label><input type="date" id="data" max="' + hoje + '" value="' + esc(reg ? reg.data : hoje) + '"></div>';

    h += campoNumero('km', 'Quilometragem no painel', reg ? textoNumero(reg.km) : '', 'km',
      'É o número total que aparece no painel (hodômetro). Exemplo: 45.230' +
      (ultimo ? '<br>Último registrado: <strong>' + C.fmtKm(ultimo.km) + '</strong> em ' + C.fmtData(ultimo.data) : ''),
      { inteiro: true, placeholder: 'Ex.: 45.230' });

    if (ultimo || (reg && reg.distanciaInformada)) {
      h += '<details class="mais"' + (reg && reg.distanciaInformada ? ' open' : '') + '><summary>Não sabe a quilometragem total? Toque aqui</summary>' +
        campoNumero('distancia', 'Quantos km andou desde o último abastecimento', reg && reg.distanciaInformada ? textoNumero(reg.distanciaInformada) : '', 'km',
          'Se você zerou o marcador parcial do painel, use esse número. Exemplo: 420.<br>Se preencher a quilometragem total acima, ela é que vale.',
          { inteiro: true, opcional: true }) + '</details>';
    }

    h += campoNumero('litros', 'Quantos litros', reg ? textoNumero(reg.litros, 2) : '', 'litros',
      'Está na nota ou na bomba. Exemplo: 35,5', { placeholder: 'Ex.: 35,5' });
    h += campoNumero('valor', 'Valor total pago', reg ? textoNumero(reg.valor, 2) : '', 'R$',
      'Exemplo: 220,00', { prefixo: true, placeholder: '0,00' });

    h += '<div class="calculo-ao-vivo" id="ao-vivo" aria-live="polite"></div>';

    var cheio = reg ? reg.tanqueCheio !== false : true;
    h += '<div class="campo"><span class="rotulo" id="rot-cheio">Encheu o tanque até o fim?</span>' +
      '<div class="opcoes duas" role="radiogroup" aria-labelledby="rot-cheio">' +
      '<label class="opcao"><input type="radio" name="cheio" value="sim"' + (cheio ? ' checked' : '') + '><span>Sim, completou</span></label>' +
      '<label class="opcao"><input type="radio" name="cheio" value="nao"' + (!cheio ? ' checked' : '') + '><span>Não</span></label></div>' +
      '<span class="dica">Isso é importante para calcular o consumo corretamente. Na dúvida, deixe “Sim” se o frentista completou o tanque.</span></div>';

    h += '<div class="campo"><span class="rotulo" id="rot-comb">Combustível <span class="opcional">(opcional)</span></span>' +
      '<div class="opcoes" role="radiogroup" aria-labelledby="rot-comb">' +
      COMBUSTIVEIS.map(function (c) {
        return '<label class="opcao"><input type="radio" name="combustivel" value="' + c + '"' + (combustivelPadrao === c ? ' checked' : '') + '><span>' + c + '</span></label>';
      }).join('') + '</div></div>';

    h += '<div class="campo"><label for="obs">Observações <span class="opcional">(opcional)</span></label>' +
      '<textarea id="obs" maxlength="300" placeholder="Ex.: posto da esquina, viagem para a praia">' + esc(reg ? reg.obs : '') + '</textarea></div>';

    h += '<button class="botao botao-carro botao-grande" type="submit">✔ Salvar abastecimento</button>';
    h += '<button class="botao botao-secundario" type="button" data-acao="voltar">Cancelar</button>';
    if (reg) h += '<button class="botao botao-perigo" type="button" data-acao="apagar-abast" data-id="' + esc(reg.id) + '">Apagar este abastecimento</button>';
    h += '</form>';
    tela.innerHTML = h;

    function atualizarAoVivo() {
      var l = C.lerNumero($('#litros').value), v = C.lerNumero($('#valor').value);
      var km = C.lerNumero($('#km').value, true);
      var dist = $('#distancia') ? C.lerNumero($('#distancia').value, true) : null;
      var partes = [];
      if (l > 0 && v > 0) partes.push('Preço por litro: <strong>' + C.fmtDinheiro(v / l) + '</strong>');
      else partes.push('O preço por litro aparece aqui quando você preencher os litros e o valor.');
      var ant = null;
      var data = $('#data').value || hoje;
      var antes = ord.filter(function (a) { return a.data <= data; });
      ant = antes[antes.length - 1];
      if (ant && km !== null && km >= ant.km) partes.push('Andou <strong>' + C.fmtKm(km - ant.km) + '</strong> desde o abastecimento anterior.');
      else if (ant && km === null && dist !== null) partes.push('A quilometragem ficará em <strong>' + C.fmtKm(ant.km + dist) + '</strong>.');
      $('#ao-vivo').innerHTML = partes.join('<br>');
    }
    $$('#form-abast input').forEach(function (i) { i.addEventListener('input', atualizarAoVivo); });
    atualizarAoVivo();

    $('#form-abast').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var problemas = [];
      function num(sel, nome, inteiro) {
        var el = $(sel);
        if (!el) return null;
        var t = el.value.trim();
        if (!t) return null;
        var n = C.lerNumero(t, inteiro);
        if (n === null) problemas.push('Não entendi o número em “' + nome + '”. Use só números, por exemplo ' + (inteiro ? '45230' : '35,5') + '.');
        return n;
      }
      var dados = {
        id: reg ? reg.id : null,
        data: $('#data').value,
        km: num('#km', 'Quilometragem', true),
        distancia: num('#distancia', 'km desde o último abastecimento', true),
        litros: num('#litros', 'Quantos litros'),
        valor: num('#valor', 'Valor total pago'),
        tanqueCheio: ($('input[name=cheio]:checked') || {}).value !== 'nao'
      };
      if (problemas.length) return mostrarErros(problemas);
      var v = C.validarAbastecimento(dados, outros, hoje);
      if (v.erros.length) return mostrarErros(v.erros);

      var registro = {
        id: reg ? reg.id : novoId(), carroId: carro.id, data: dados.data, km: v.km,
        distanciaInformada: dados.distancia, litros: dados.litros, valor: dados.valor,
        tanqueCheio: dados.tanqueCheio,
        combustivel: ($('input[name=combustivel]:checked') || {}).value || '',
        obs: $('#obs').value.trim(), criadoEm: reg ? reg.criadoEm : Date.now()
      };
      if (estado.demo) registro.demo = true;

      var gravar = function () {
        if (reg) {
          estado.abastecimentos = estado.abastecimentos.map(function (a) { return a.id === reg.id ? registro : a; });
        } else {
          estado.abastecimentos.push(registro);
        }
        if (!salvar(true)) return;
        mostrarResultadoAbastecimento(registro, !!reg);
      };
      if (v.avisos.length) confirmarAvisos(v.avisos, gravar);
      else gravar();
    });
  }

  function mostrarErros(lista) {
    $('#erros').innerHTML = caixa('erro', lista.length > 1 ? 'Confira estes pontos antes de salvar:' : 'Confira antes de salvar:', lista);
    $('#erros').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function confirmarAvisos(avisos, aoSalvar) {
    abrirJanela('<div class="grande-icone" aria-hidden="true">🤔</div><h2>Algo parece diferente</h2>' +
      '<p>Antes de salvar, confira:</p>' + caixa('aviso', '', avisos) +
      '<button class="botao botao-principal" data-janela="corrigir">Voltar e corrigir</button>' +
      '<button class="botao botao-secundario" data-janela="salvar">Está certo, salvar assim</button>',
      { salvar: aoSalvar });
  }

  function mostrarResultadoAbastecimento(registro, editado) {
    var an = C.analisarAbastecimentos(abastDoCarro(registro.carroId));
    var a = an.filter(function (x) { return x.id === registro.id; })[0];
    var itens = [];
    itens.push('📅 ' + C.fmtData(a.data) + ' • ' + C.fmtNum(a.litros, 2) + ' litros • ' + C.fmtDinheiro(a.valor));
    if (a.kmDesdeAnterior !== null) itens.push('🛣️ Andou <strong>' + C.fmtKm(a.kmDesdeAnterior) + '</strong> desde o abastecimento anterior.');
    if (a.trecho) {
      itens.push('⛽ Consumo: <strong>' + C.fmtNum(a.trecho.kmPorLitro, 1) + ' km por litro</strong>' +
        (a.trecho.abastecimentos > 1 ? ' (somando ' + a.trecho.abastecimentos + ' abastecimentos desde o último tanque cheio)' : '') + '.');
      itens.push('💰 Custo: <strong>' + C.fmtDinheiro(a.trecho.custoPorKm) + ' por km</strong> rodado.');
    } else {
      itens.push('⛽ ' + explicarSemConsumo(a.semConsumo));
    }
    var preco = '🏷️ Preço do litro: <strong>' + C.fmtDinheiro(a.precoLitro) + '</strong>';
    if (a.variacaoPreco) {
      var vr = a.variacaoPreco.reais;
      if (Math.abs(vr) < 0.005) preco += ' (igual ao anterior)';
      else preco += ' (' + (vr > 0 ? 'subiu ' : 'baixou ') + C.fmtDinheiro(Math.abs(vr)) + ', ' + C.fmtNum(Math.abs(a.variacaoPreco.pct), 1) + '% ' + (vr > 0 ? 'mais caro' : 'mais barato') + ' que no anterior)';
    }
    itens.push(preco + '.');

    abrirJanela('<div class="grande-icone" aria-hidden="true">✅</div><h2>' + (editado ? 'Abastecimento corrigido!' : 'Abastecimento salvo!') + '</h2>' +
      '<p>No carro <strong>' + esc(carroPorId(registro.carroId).nome) + '</strong>.</p>' +
      '<ul class="resultado">' + itens.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>' +
      '<button class="botao botao-principal botao-grande" data-janela="ok">OK</button>',
      { ok: function () { ir(editado ? 'historico' : 'inicio', true); } });
  }

  function explicarSemConsumo(motivo) {
    if (motivo === 'primeiroCheio') return 'O consumo será calculado no próximo abastecimento com tanque cheio (é preciso saber quanto o carro andou entre dois tanques cheios).';
    if (motivo === 'naoCheio') return 'Como o tanque não foi completado, o consumo será calculado no próximo abastecimento com tanque cheio, somando os litros deste.';
    if (motivo === 'semDistancia') return 'Não dá para calcular o consumo: a quilometragem é igual à do tanque cheio anterior.';
    return 'Ainda não há dados suficientes para calcular o consumo.';
  }

  function apagarAbastecimento(id) {
    var a = estado.abastecimentos.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    confirmar({
      icone: '🗑️', titulo: 'Apagar este abastecimento?', perigo: true,
      texto: 'Abastecimento de <strong>' + C.fmtData(a.data) + '</strong>, ' + C.fmtNum(a.litros, 2) + ' litros, ' + C.fmtDinheiro(a.valor) +
        ', no carro <strong>' + esc((carroPorId(a.carroId) || {}).nome) + '</strong>.<br>Isso não pode ser desfeito.',
      sim: 'Sim, apagar', nao: 'Não, manter',
      aoConfirmar: function () {
        estado.abastecimentos = estado.abastecimentos.filter(function (x) { return x.id !== id; });
        salvar(true);
        aviso('Apagado', 'O abastecimento foi apagado.', function () {
          if (rotaAtual().nome === 'historico') desenhar(); else ir('historico', true);
        });
      }
    });
  }

  // =====================================================================
  // Tela: registrar / corrigir manutenção
  // =====================================================================
  function telaManutencao(id) {
    var carro = carroAtual();
    var reg = id ? estado.manutencoes.filter(function (m) { return m.id === id; })[0] : null;
    if (id && !reg) { ir('historico', true); return; }
    if (reg && reg.carroId !== carro.id) { estado.carroAtual = reg.carroId; carro = carroAtual(); montarMoldura('manutencao'); }
    var r = resumoCarro(carro);
    var hoje = C.hojeISO();
    var tipo = reg ? reg.tipo : '';

    var h = '<div class="titulo-tela"><h1>' + (reg ? 'Corrigir manutenção' : '🔧 Nova manutenção') + '</h1></div>';
    h += cabecalhoCarroRegistro(carro, reg ? 'Manutenção do carro:' : 'Esta manutenção será salva no carro:');
    h += '<form id="form-manut" novalidate><div id="erros"></div>';

    h += '<div class="campo"><span class="rotulo" id="rot-tipo">O que foi feito?</span><div class="opcoes tipos" role="radiogroup" aria-labelledby="rot-tipo">' +
      TIPOS_ORDEM.map(function (t) {
        return '<label class="opcao"><input type="radio" name="tipo" value="' + t + '"' + (tipo === t ? ' checked' : '') + '><span>' +
          (t === 'outro' ? 'Outra coisa' : C.TIPOS[t].nome) + '</span></label>';
      }).join('') + '</div></div>';

    h += '<div class="campo" id="campo-descricao" hidden><label for="descricao">Qual manutenção?</label>' +
      '<input type="text" id="descricao" maxlength="60" value="' + esc(reg ? reg.descricao : '') + '" placeholder="Ex.: troca do filtro de ar"></div>';

    h += '<div class="campo"><label for="data">Data</label><input type="date" id="data" max="' + hoje + '" value="' + esc(reg ? reg.data : hoje) + '"></div>';

    h += campoNumero('km', 'Quilometragem no painel naquele dia', reg ? textoNumero(reg.km) : '', 'km',
      'Exemplo: 45.230', { inteiro: true, placeholder: 'Ex.: 45.230' });
    if (r.km !== null && !reg) {
      h += '<button type="button" class="botao botao-secundario botao-pequeno" id="usar-km" style="margin-top:-8px">Usar a última quilometragem anotada (' + C.fmtKm(r.km) + ')</button>';
    }

    h += '<div id="bloco-oleo" class="caixa caixa-info" hidden></div>';

    var temLembrete = reg && (reg.lembreteKm || reg.lembreteData);
    h += '<div id="bloco-lembrete" hidden><details class="mais"' + (temLembrete ? ' open' : '') + '><summary>Quer um lembrete para a próxima vez? <span class="opcional">(opcional)</span></summary>' +
      '<p class="dica" id="dica-lembrete">Preencha um dos dois, ou os dois. Será avisado o que vier primeiro.</p>' +
      campoNumero('lembreteKm', 'Avisar daqui a quantos km?', reg && reg.lembreteKm ? textoNumero(reg.lembreteKm) : '', 'km',
        '<span id="dica-lembrete-km">Exemplo: 10.000</span>', { inteiro: true, opcional: true }) +
      '<div class="campo"><label for="lembreteData">Ou avisar em qual data? <span class="opcional">(opcional)</span></label>' +
      '<input type="date" id="lembreteData" min="' + hoje + '" value="' + esc(reg && reg.lembreteData ? reg.lembreteData : '') + '"></div>' +
      '</details></div>';

    h += campoNumero('valorManut', 'Quanto custou', reg && reg.valor ? textoNumero(reg.valor, 2) : '', 'R$', 'Exemplo: 180,00', { prefixo: true, opcional: true, placeholder: '0,00' });

    h += '<div class="campo"><label for="obs">Observações <span class="opcional">(opcional)</span></label>' +
      '<textarea id="obs" maxlength="300" placeholder="Ex.: óleo 5W30, oficina do Zé">' + esc(reg ? reg.obs : '') + '</textarea></div>';

    h += '<button class="botao botao-carro botao-grande" type="submit">✔ Salvar manutenção</button>';
    h += '<button class="botao botao-secundario" type="button" data-acao="voltar">Cancelar</button>';
    if (reg) h += '<button class="botao botao-perigo" type="button" data-acao="apagar-manut" data-id="' + esc(reg.id) + '">Apagar esta manutenção</button>';
    h += '</form>';
    tela.innerHTML = h;

    if ($('#usar-km')) $('#usar-km').addEventListener('click', function () { $('#km').value = C.fmtNum(r.km); atualizarTipo(); });

    function atualizarTipo() {
      var t = ($('input[name=tipo]:checked') || {}).value;
      $('#campo-descricao').hidden = t !== 'outro';
      $('#bloco-lembrete').hidden = !t || t === 'oleo';
      var blocoOleo = $('#bloco-oleo');
      blocoOleo.hidden = t !== 'oleo';
      if (t === 'oleo') {
        var km = C.lerNumero($('#km').value, true);
        var txt = '<strong>Lembrete automático da troca de óleo</strong><br>';
        if (carro.oleoKm) {
          txt += 'A próxima troca será avisada a cada <strong>' + C.fmtKm(carro.oleoKm) + '</strong>';
          if (km !== null) txt += ', ou seja, com <strong>' + C.fmtKm(km + carro.oleoKm) + '</strong>';
        } else {
          txt += 'Aviso por quilometragem desligado';
        }
        if (carro.oleoMeses) {
          var d = $('#data').value;
          txt += carro.oleoMeses ? ', ou a cada ' + C.plural(carro.oleoMeses, 'mês', 'meses') + (d ? ' (até ' + C.fmtData(C.somaMeses(d, carro.oleoMeses)) + ')' : '') : '';
        }
        txt += '.<br><a href="#carro/' + esc(carro.id) + '">Mudar o intervalo</a>';
        blocoOleo.innerHTML = txt;
      }
      if (t === 'pneus') {
        $('#dica-lembrete-km').textContent = 'Não existe um número fixo: veja o manual do carro ou pergunte ao borracheiro. Exemplo: 40.000';
      } else {
        $('#dica-lembrete-km').textContent = 'Exemplo: 10.000';
      }
    }
    $$('input[name=tipo]').forEach(function (i) { i.addEventListener('change', atualizarTipo); });
    $('#km').addEventListener('input', atualizarTipo);
    $('#data').addEventListener('input', atualizarTipo);
    atualizarTipo();

    $('#form-manut').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var problemas = [];
      function num(sel, nome, inteiro) {
        var t = $(sel).value.trim();
        if (!t) return null;
        var n = C.lerNumero(t, inteiro);
        if (n === null) problemas.push('Não entendi o número em “' + nome + '”. Use só números.');
        return n;
      }
      var t = ($('input[name=tipo]:checked') || {}).value || '';
      var dados = {
        tipo: t,
        descricao: t === 'outro' ? $('#descricao').value.trim() : '',
        data: $('#data').value,
        km: num('#km', 'Quilometragem', true),
        valor: num('#valorManut', 'Quanto custou'),
        lembreteKm: t !== 'oleo' ? num('#lembreteKm', 'Avisar daqui a quantos km', true) : null,
        lembreteData: t !== 'oleo' ? ($('#lembreteData').value || null) : null
      };
      if (problemas.length) return mostrarErros(problemas);
      var v = C.validarManutencao(dados, abastDoCarro(carro.id), hoje);
      if (v.erros.length) return mostrarErros(v.erros);

      var registro = Object.assign({ id: reg ? reg.id : novoId(), carroId: carro.id, obs: $('#obs').value.trim(),
        criadoEm: reg ? reg.criadoEm : Date.now() }, dados);
      if (estado.demo) registro.demo = true;

      var gravar = function () {
        if (reg) estado.manutencoes = estado.manutencoes.map(function (m) { return m.id === reg.id ? registro : m; });
        else estado.manutencoes.push(registro);
        if (!salvar(true)) return;
        var res = resumoCarro(carro);
        var lemb = res.lembretes.filter(function (l) { return l.ultima && l.ultima.id === registro.id; })[0];
        var itens = ['📅 ' + C.fmtData(registro.data) + ' com ' + C.fmtKm(registro.km) + (registro.valor ? ' • ' + C.fmtDinheiro(registro.valor) : '')];
        if (lemb) itens.push('🔔 ' + esc(lemb.mensagem));
        else if (registro.tipo !== 'oleo') itens.push('Nenhum lembrete foi definido para a próxima vez.');
        abrirJanela('<div class="grande-icone" aria-hidden="true">✅</div><h2>' + (reg ? 'Manutenção corrigida!' : 'Manutenção salva!') + '</h2>' +
          '<p><strong>' + esc(C.nomeManutencao(registro)) + '</strong> no carro <strong>' + esc(carro.nome) + '</strong>.</p>' +
          '<ul class="resultado">' + itens.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>' +
          '<button class="botao botao-principal botao-grande" data-janela="ok">OK</button>',
          { ok: function () { ir(reg ? 'historico' : 'inicio', true); } });
      };
      if (v.avisos.length) confirmarAvisos(v.avisos, gravar);
      else gravar();
    });
  }

  function apagarManutencao(id) {
    var m = estado.manutencoes.filter(function (x) { return x.id === id; })[0];
    if (!m) return;
    confirmar({
      icone: '🗑️', titulo: 'Apagar esta manutenção?', perigo: true,
      texto: '<strong>' + esc(C.nomeManutencao(m)) + '</strong> de ' + C.fmtData(m.data) + ', no carro <strong>' +
        esc((carroPorId(m.carroId) || {}).nome) + '</strong>.<br>Isso não pode ser desfeito.',
      sim: 'Sim, apagar', nao: 'Não, manter',
      aoConfirmar: function () {
        estado.manutencoes = estado.manutencoes.filter(function (x) { return x.id !== id; });
        salvar(true);
        aviso('Apagada', 'A manutenção foi apagada.', function () {
          if (rotaAtual().nome === 'historico') desenhar(); else ir('historico', true);
        });
      }
    });
  }

  // =====================================================================
  // Tela: histórico
  // =====================================================================
  function inicioPeriodo(periodo, hoje) {
    if (periodo === 'tudo' || periodo === 'datas') return null;
    var d = C.parseData(hoje);
    d.setDate(d.getDate() - Number(periodo) + 1);
    return C.dataISO(d);
  }
  function dentroDoPeriodo(data, de, ate) {
    return (!de || data >= de) && (!ate || data <= ate);
  }
  function botoesFiltro(opcoes, atual, nome) {
    return '<div class="filtros" role="group" aria-label="Período">' + opcoes.map(function (o) {
      return '<button type="button" data-' + nome + '="' + o[0] + '" aria-pressed="' + (atual === o[0]) + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }

  function telaHistorico() {
    var carro = carroAtual();
    var r = resumoCarro(carro);
    var hoje = C.hojeISO();
    var de, ate;
    if (sessao.periodoHistorico === 'datas') { de = sessao.deHistorico || null; ate = sessao.ateHistorico || null; }
    else { de = inicioPeriodo(sessao.periodoHistorico, hoje); ate = null; }

    var h = '<h1>Histórico</h1>';
    h += '<div class="abas" role="group" aria-label="O que mostrar">' +
      '<button type="button" data-aba="abastecimentos" aria-pressed="' + (sessao.abaHistorico === 'abastecimentos') + '">⛽ Abastecimentos</button>' +
      '<button type="button" data-aba="manutencoes" aria-pressed="' + (sessao.abaHistorico === 'manutencoes') + '">🔧 Manutenções</button></div>';
    h += botoesFiltro([['30', 'Últimos 30 dias'], ['90', '3 meses'], ['365', '12 meses'], ['tudo', 'Tudo'], ['datas', 'Escolher datas']], sessao.periodoHistorico, 'periodo');
    if (sessao.periodoHistorico === 'datas') {
      h += '<div class="datas-filtro"><div><label for="de">De</label><input type="date" id="de" value="' + esc(sessao.deHistorico) + '"></div>' +
        '<div><label for="ate">Até</label><input type="date" id="ate" value="' + esc(sessao.ateHistorico) + '"></div></div>';
    }

    if (sessao.abaHistorico === 'abastecimentos') {
      var lista = r.analise.filter(function (a) { return dentroDoPeriodo(a.data, de, ate); }).reverse();
      if (lista.length) {
        var total = 0, litros = 0, km = 0, dist = 0, lt = 0;
        lista.forEach(function (a) {
          total += a.valor; litros += a.litros; if (a.kmDesdeAnterior) km += a.kmDesdeAnterior;
          if (a.trecho) { dist += a.trecho.distancia; lt += a.trecho.litros; }
        });
        h += '<div class="resumo-periodo"><strong>' + C.plural(lista.length, 'abastecimento', 'abastecimentos') + '</strong> no período<br>' +
          'Total gasto: <strong>' + C.fmtDinheiro(total) + '</strong><br>' + C.fmtNum(litros, 1) + ' litros' +
          (km ? ' • ' + C.fmtKm(km) + ' rodados' : '') +
          (lt ? '<br>Consumo médio: <strong>' + C.fmtNum(dist / lt, 1) + ' km/L</strong>' : '') + '</div>';
        lista.forEach(function (a) { h += htmlAbastecimento(a); });
      } else {
        h += vazio('⛽', r.abastecimentos.length ? 'Nenhum abastecimento neste período. Tente “Tudo”.' : 'Nenhum abastecimento registrado ainda.');
      }
      h += '<a class="botao botao-carro" href="#abastecer">⛽ Registrar abastecimento</a>';
    } else {
      var ms = r.manutencoes.filter(function (m) { return dentroDoPeriodo(m.data, de, ate); }).sort(function (a, b) {
        if (a.data !== b.data) return a.data < b.data ? 1 : -1;
        return b.km - a.km;
      });
      if (ms.length) {
        var gasto = ms.reduce(function (s, m) { return s + (m.valor || 0); }, 0);
        h += '<div class="resumo-periodo"><strong>' + C.plural(ms.length, 'manutenção', 'manutenções') + '</strong> no período' +
          (gasto ? '<br>Total gasto: <strong>' + C.fmtDinheiro(gasto) + '</strong>' : '') + '</div>';
        ms.forEach(function (m) { h += htmlManutencao(m); });
      } else {
        h += vazio('🔧', r.manutencoes.length ? 'Nenhuma manutenção neste período. Tente “Tudo”.' : 'Nenhuma manutenção registrada ainda.');
      }
      h += '<a class="botao botao-carro" href="#manutencao">🔧 Registrar manutenção</a>';
    }
    tela.innerHTML = h;

    $$('[data-aba]').forEach(function (b) { b.addEventListener('click', function () { sessao.abaHistorico = b.getAttribute('data-aba'); desenhar(); }); });
    $$('[data-periodo]').forEach(function (b) { b.addEventListener('click', function () { sessao.periodoHistorico = b.getAttribute('data-periodo'); desenhar(); }); });
    if ($('#de')) {
      $('#de').addEventListener('change', function () { sessao.deHistorico = this.value; desenhar(); });
      $('#ate').addEventListener('change', function () { sessao.ateHistorico = this.value; desenhar(); });
    }
  }

  function vazio(icone, texto) {
    return '<div class="cartao vazio"><span class="icone" aria-hidden="true">' + icone + '</span>' + esc(texto) + '</div>';
  }

  function htmlAbastecimento(a) {
    var calc = [];
    if (a.kmDesdeAnterior !== null) calc.push('Andou ' + C.fmtKm(a.kmDesdeAnterior));
    if (a.trecho) calc.push('<strong>' + C.fmtNum(a.trecho.kmPorLitro, 1) + ' km/L</strong>', C.fmtDinheiro(a.trecho.custoPorKm) + '/km');
    var calcTxt = calc.join(' • ');
    if (!a.trecho) calcTxt += (calcTxt ? '<br>' : '') + '<span class="legenda-simples">' +
      (a.semConsumo === 'naoCheio' ? 'Tanque não completado: o consumo entra no próximo tanque cheio.' :
        a.semConsumo === 'primeiroCheio' ? 'Primeiro tanque cheio: ainda sem consumo.' : 'Sem cálculo de consumo.') + '</span>';
    var variacao = '';
    if (a.variacaoPreco && Math.abs(a.variacaoPreco.reais) >= 0.005) {
      variacao = ' (' + (a.variacaoPreco.reais > 0 ? '▲ ' : '▼ ') + C.fmtNum(Math.abs(a.variacaoPreco.pct), 1) + '% ' +
        (a.variacaoPreco.reais > 0 ? 'mais caro' : 'mais barato') + ')';
    }
    return '<div class="cartao registro">' +
      '<div class="linha-topo"><span class="data">' + C.fmtData(a.data) + '</span><span class="valor">' + C.fmtDinheiro(a.valor) + '</span></div>' +
      '<p class="detalhes">' + C.fmtKm(a.km) + ' • ' + C.fmtNum(a.litros, 2) + ' L • ' + C.fmtDinheiro(a.precoLitro) + '/L' + variacao +
      (a.combustivel ? ' • ' + esc(a.combustivel) : '') + (a.tanqueCheio === false ? ' <span class="etiqueta">não completou</span>' : '') + '</p>' +
      '<p class="calc">' + calcTxt + '</p>' +
      (a.obs ? '<p class="obs">' + esc(a.obs) + '</p>' : '') +
      '<div class="acoes"><a class="botao botao-secundario" href="#abastecer/' + encodeURIComponent(a.id) + '">✏️ Corrigir</a>' +
      '<button class="botao botao-perigo" type="button" data-acao="apagar-abast" data-id="' + esc(a.id) + '">🗑️ Apagar</button></div></div>';
  }

  function htmlManutencao(m) {
    var lemb = [];
    if (m.lembreteKm) lemb.push('daqui a ' + C.fmtKm(m.lembreteKm) + ' (com ' + C.fmtKm(m.km + m.lembreteKm) + ')');
    if (m.lembreteData) lemb.push('em ' + C.fmtData(m.lembreteData));
    return '<div class="cartao registro">' +
      '<div class="linha-topo"><span class="data">' + C.fmtData(m.data) + '</span>' + (m.valor ? '<span class="valor">' + C.fmtDinheiro(m.valor) + '</span>' : '') + '</div>' +
      '<p class="detalhes"><strong>' + esc(C.nomeManutencao(m)) + '</strong> • ' + C.fmtKm(m.km) + '</p>' +
      (lemb.length ? '<p class="calc">🔔 Lembrete: ' + lemb.join(' ou ') + '</p>' : '') +
      (m.obs ? '<p class="obs">' + esc(m.obs) + '</p>' : '') +
      '<div class="acoes"><a class="botao botao-secundario" href="#manutencao/' + encodeURIComponent(m.id) + '">✏️ Corrigir</a>' +
      '<button class="botao botao-perigo" type="button" data-acao="apagar-manut" data-id="' + esc(m.id) + '">🗑️ Apagar</button></div></div>';
  }

  // =====================================================================
  // Tela: relatórios
  // =====================================================================
  function mesesEntre(inicio, fim) {
    var res = [], a = Number(inicio.slice(0, 4)), m = Number(inicio.slice(5, 7));
    var fa = Number(fim.slice(0, 4)), fm = Number(fim.slice(5, 7));
    while (a < fa || (a === fa && m <= fm)) {
      res.push(a + '-' + (m < 10 ? '0' : '') + m);
      m++; if (m > 12) { m = 1; a++; }
    }
    return res;
  }

  function barras(itens, maximo, destaqueUltimo) {
    return '<ul class="barras">' + itens.map(function (it, i) {
      var pct = maximo > 0 ? Math.max(0, it.valor / maximo * 100) : 0;
      return '<li><div class="rotulos"><span>' + esc(it.rotulo) + '</span><strong>' + esc(it.texto) + '</strong></div>' +
        '<div class="trilho" aria-hidden="true">' + (it.valor > 0 ? '<div class="barra' + (destaqueUltimo && i === itens.length - 1 ? ' destaque' : '') + '" style="width:' + pct.toFixed(1) + '%"></div>' : '') + '</div></li>';
    }).join('') + '</ul>';
  }

  function telaRelatorios() {
    var carro = carroAtual();
    var r = resumoCarro(carro);
    var hoje = C.hojeISO();
    var p = sessao.periodoRelatorio;
    var mesFim = hoje.slice(0, 7);
    var mesInicio;
    if (p === 'tudo') {
      var datas = r.abastecimentos.map(function (a) { return a.data; }).sort();
      mesInicio = datas.length ? datas[0].slice(0, 7) : mesFim;
    } else {
      var d = C.parseData(hoje.slice(0, 8) + '01');
      d.setMonth(d.getMonth() - Number(p) + 1);
      mesInicio = C.dataISO(d).slice(0, 7);
    }
    // Não mostrar meses anteriores ao primeiro abastecimento (evita barras vazias e média distorcida)
    var primeiro = r.abastecimentos.map(function (a) { return a.data; }).sort()[0];
    if (primeiro && primeiro.slice(0, 7) > mesInicio) mesInicio = primeiro.slice(0, 7);
    var meses = mesesEntre(mesInicio, mesFim);

    var h = '<h1>Relatórios</h1>';
    h += botoesFiltro([['6', 'Últimos 6 meses'], ['12', '12 meses'], ['tudo', 'Tudo']], p, 'rel');

    if (!r.abastecimentos.length) {
      h += vazio('📊', 'Os relatórios aparecem depois que houver abastecimentos registrados.');
      tela.innerHTML = h;
      ligarFiltroRel();
      return;
    }

    // ---- Gasto por mês
    var gastos = {};
    C.gastoPorMes(r.abastecimentos).forEach(function (g) { gastos[g.mes] = g; });
    var itensGasto = meses.map(function (m) {
      var g = gastos[m];
      return { rotulo: C.fmtMes(m, true), valor: g ? g.valor : 0, texto: g ? C.fmtDinheiro(g.valor) : 'R$ 0,00', litros: g ? g.litros : 0 };
    });
    var totalGasto = itensGasto.reduce(function (s, i) { return s + i.valor; }, 0);
    var maxGasto = Math.max.apply(null, itensGasto.map(function (i) { return i.valor; }));
    var mesesComGasto = itensGasto.filter(function (i) { return i.valor > 0; }).length;

    h += '<div class="cartao"><h2>⛽ Gasto com combustível por mês</h2>';
    h += '<p>Total no período: <strong>' + C.fmtDinheiro(totalGasto) + '</strong>' +
      (mesesComGasto ? '<br>Média: <strong>' + C.fmtDinheiro(totalGasto / meses.length) + '</strong> por mês' : '') + '</p>';
    h += barras(itensGasto, maxGasto, false) + '</div>';

    // ---- Consumo por mês
    var consumos = {};
    C.consumoPorMes(r.analise).forEach(function (c) { consumos[c.mes] = c; });
    var itensCons = meses.filter(function (m) { return consumos[m]; }).map(function (m) {
      return { mes: m, rotulo: C.fmtMes(m, true), valor: consumos[m].kmPorLitro, texto: C.fmtNum(consumos[m].kmPorLitro, 1) + ' km/L', c: consumos[m] };
    });
    h += '<div class="cartao"><h2>🚗 Consumo médio ao longo do tempo</h2>';
    if (itensCons.length) {
      var dist = 0, lit = 0;
      itensCons.forEach(function (i) { dist += i.c.distancia; lit += i.c.litros; });
      var media = dist / lit;
      var melhor = itensCons.slice().sort(function (a, b) { return b.valor - a.valor; })[0];
      var pior = itensCons.slice().sort(function (a, b) { return a.valor - b.valor; })[0];
      h += '<p>Neste período o carro fez em média <strong>' + C.fmtNum(media, 1) + ' km por litro</strong>.</p>';
      h += '<p class="legenda-simples">Quanto <strong>maior</strong> o número, <strong>mais econômico</strong> (anda mais com cada litro).</p>';
      if (itensCons.length > 1) {
        h += '<p>👍 Melhor mês: <strong>' + esc(C.fmtMes(melhor.mes)) + '</strong> (' + melhor.texto + ')<br>' +
          '👎 Pior mês: <strong>' + esc(C.fmtMes(pior.mes)) + '</strong> (' + pior.texto + ')</p>';
        var ult = itensCons[itensCons.length - 1];
        var dif = (ult.valor - media) / media * 100;
        var frase;
        if (Math.abs(dif) < 3) frase = 'parecido com a média';
        else if (dif > 0) frase = C.fmtNum(dif, 0) + '% melhor que a média';
        else frase = C.fmtNum(-dif, 0) + '% pior que a média';
        h += '<p>No mês mais recente com dados (' + esc(C.fmtMes(ult.mes)) + '), o consumo ficou <strong>' + frase + '</strong>.</p>';
      }
      var maxC = Math.max.apply(null, itensCons.map(function (i) { return i.valor; }));
      h += barras(itensCons, maxC, true);
      h += '<p class="legenda-simples">Cada barra é a média do mês (km rodados ÷ litros). A barra verde é o mês mais recente.</p>';

      // Tabela detalhada
      var trechos = r.analise.filter(function (a) { return a.trecho && a.data.slice(0, 7) >= mesInicio; }).reverse();
      h += '<details class="mais"><summary>Ver consumo de cada abastecimento</summary><table class="tabela"><thead><tr>' +
        '<th>Data</th><th class="num">Rodou</th><th class="num">Litros</th><th class="num">km/L</th></tr></thead><tbody>' +
        trechos.map(function (a) {
          return '<tr><td>' + C.fmtData(a.data) + '</td><td class="num">' + C.fmtKm(a.trecho.distancia) + '</td><td class="num">' +
            C.fmtNum(a.trecho.litros, 1) + '</td><td class="num"><strong>' + C.fmtNum(a.trecho.kmPorLitro, 1) + '</strong></td></tr>';
        }).join('') + '</tbody></table></details>';
    } else {
      h += '<p>Ainda não dá para mostrar o consumo neste período. É preciso ter pelo menos <strong>dois abastecimentos com tanque cheio</strong>: o consumo é calculado pela distância entre eles.</p>';
    }
    h += '</div>';

    // ---- Preço do litro
    var precos = r.analise.filter(function (a) { return a.data.slice(0, 7) >= mesInicio; });
    if (precos.length > 1) {
      var pPrim = precos[0], pUlt = precos[precos.length - 1];
      var dp = (pUlt.precoLitro - pPrim.precoLitro) / pPrim.precoLitro * 100;
      h += '<div class="cartao"><h2>🏷️ Preço do litro</h2><p>Primeiro abastecimento do período (' + C.fmtData(pPrim.data) + '): <strong>' + C.fmtDinheiro(pPrim.precoLitro) + '</strong><br>' +
        'Último (' + C.fmtData(pUlt.data) + '): <strong>' + C.fmtDinheiro(pUlt.precoLitro) + '</strong><br>' +
        (Math.abs(dp) < 0.5 ? 'O preço ficou praticamente igual.' : 'O litro ficou <strong>' + C.fmtNum(Math.abs(dp), 1) + '% ' + (dp > 0 ? 'mais caro' : 'mais barato') + '</strong>.') + '</p></div>';
    }

    // ---- Manutenção
    var manutPeriodo = r.manutencoes.filter(function (m) { return m.data.slice(0, 7) >= mesInicio && m.valor; });
    if (manutPeriodo.length) {
      var tm = manutPeriodo.reduce(function (s, m) { return s + m.valor; }, 0);
      h += '<div class="cartao"><h2>🔧 Gasto com manutenção</h2><p>Total no período: <strong>' + C.fmtDinheiro(tm) + '</strong> em ' +
        C.plural(manutPeriodo.length, 'serviço', 'serviços') + '.</p></div>';
    }

    tela.innerHTML = h;
    ligarFiltroRel();
  }
  function ligarFiltroRel() {
    $$('[data-rel]').forEach(function (b) { b.addEventListener('click', function () { sessao.periodoRelatorio = b.getAttribute('data-rel'); desenhar(); }); });
  }

  // =====================================================================
  // Tela: ajustes
  // =====================================================================
  function telaAjustes() {
    var h = '<h1>Ajustes</h1>';
    h += '<div class="cartao"><h2>🚗 Carros</h2>';
    estado.carros.forEach(function (c) {
      h += '<a class="botao botao-secundario" href="#carro/' + encodeURIComponent(c.id) + '" style="justify-content:flex-start">' +
        '<span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:' + esc(c.cor) + '"></span> Dados do ' + esc(c.nome) + '</a>';
    });
    if (estado.carros.length < MAX_CARROS) h += '<a class="botao botao-secundario" href="#carro/novo">➕ Adicionar outro carro</a>';
    if (estado.carros.length > 1) h += '<button class="botao botao-secundario" type="button" data-acao="trocar-carro">🔁 Trocar o carro que estou vendo</button>';
    h += '<p class="legenda-simples">Nos dados de cada carro você também muda o intervalo da troca de óleo.</p></div>';

    h += '<div class="cartao"><h2>💾 Cópia de segurança</h2>' +
      '<p>Os dados ficam guardados <strong>somente neste celular, neste navegador</strong>. Não vão para a internet e não aparecem em outro aparelho.</p>' +
      '<p>Salve uma cópia de vez em quando. Você pode enviá-la para si mesmo pelo WhatsApp ou e-mail, ou guardar no Google Drive.</p>' +
      (estado.ultimoBackup ? '<p class="legenda-simples">Última cópia: ' + C.fmtData(estado.ultimoBackup.slice(0, 10)) + '</p>' : '<p class="legenda-simples">Nenhuma cópia salva ainda.</p>') +
      '<button class="botao botao-principal" type="button" data-acao="backup">Salvar cópia de segurança</button>' +
      '<button class="botao botao-secundario" type="button" data-acao="restaurar">Restaurar uma cópia</button>' +
      '<button class="botao botao-secundario" type="button" data-acao="planilha">Exportar planilha (Excel)</button></div>';

    h += '<div class="cartao"><h2>❓ Ajuda</h2><a class="botao botao-secundario" href="#ajuda">Como usar e como os cálculos são feitos</a></div>';

    h += '<div class="cartao"><h2>Apagar dados</h2>';
    if (estado.demo) h += '<button class="botao botao-perigo" type="button" data-acao="sair-demo">Apagar a demonstração e começar</button>';
    h += '<button class="botao botao-perigo" type="button" id="apagar-tudo">Apagar todos os dados deste aparelho</button></div>';
    tela.innerHTML = h;

    $('#apagar-tudo').addEventListener('click', function () {
      confirmar({
        icone: '⚠️', titulo: 'Apagar TODOS os dados?', perigo: true,
        texto: 'Todos os carros, abastecimentos e manutenções serão apagados deste aparelho. Isso não pode ser desfeito.<br><br>Se quiser, salve antes uma cópia de segurança.',
        sim: 'Continuar', nao: 'Não, manter',
        aoConfirmar: function () {
          confirmar({
            titulo: 'Tem certeza mesmo?', perigo: true, texto: 'Última confirmação.',
            sim: 'Sim, apagar tudo', nao: 'Cancelar',
            aoConfirmar: function () {
              estado = estadoVazio(); salvar(); sessao.escolheuCarro = false; ir('inicio', true);
            }
          });
        }
      });
    });
  }

  // =====================================================================
  // Tela: dados do carro
  // =====================================================================
  function telaCarro(id) {
    var novo = id === 'novo';
    if (novo && estado.carros.length >= MAX_CARROS) { ir('ajustes', true); return; }
    var c = novo ? novoCarro('Carro ' + (estado.carros.length + 1), CORES.filter(function (k) {
      return !estado.carros.some(function (x) { return x.cor === k.valor; });
    })[0].valor) : carroPorId(id);
    if (!c) { ir('ajustes', true); return; }

    var h = '<h1>' + (novo ? 'Novo carro' : 'Dados do carro') + '</h1><form id="form-carro" novalidate><div id="erros"></div>';
    h += '<div class="campo"><label for="nome">Nome do carro</label><input type="text" id="nome" maxlength="40" value="' + esc(c.nome) + '">' +
      '<span class="dica">Como vocês chamam este carro. Ex.: “Carro do Pai”.</span></div>';
    h += '<div class="campo"><label for="marca">Marca <span class="opcional">(opcional)</span></label><input type="text" id="marca" maxlength="30" value="' + esc(c.marca) + '" placeholder="Ex.: Fiat"></div>';
    h += '<div class="campo"><label for="modelo">Modelo <span class="opcional">(opcional)</span></label><input type="text" id="modelo" maxlength="30" value="' + esc(c.modelo) + '" placeholder="Ex.: Uno"></div>';
    h += '<div class="campo"><label for="ano">Ano <span class="opcional">(opcional)</span></label><input type="text" id="ano" inputmode="numeric" maxlength="4" value="' + esc(c.ano) + '" placeholder="Ex.: 2015"></div>';
    h += '<div class="campo"><span class="rotulo" id="rot-cor">Cor na tela</span><span class="dica" style="margin:0 0 8px">Ajuda a não confundir os carros: o topo da tela fica desta cor.</span>' +
      '<div class="opcoes" role="radiogroup" aria-labelledby="rot-cor">' + CORES.map(function (k) {
        return '<label class="opcao"><input type="radio" name="cor" value="' + k.valor + '"' + (c.cor === k.valor ? ' checked' : '') + '>' +
          '<span><span style="display:inline-block;width:18px;height:18px;border-radius:50%;margin-right:6px;background:' + k.valor + '"></span>' + k.nome + '</span></label>';
      }).join('') + '</div></div>';
    h += '<hr class="separador"><h2>🛢️ Troca de óleo</h2>';
    h += campoNumero('oleoKm', 'Trocar o óleo a cada', textoNumero(c.oleoKm), 'km', 'O padrão é 5.000 km. Confira no manual do carro. Deixe em branco para não ser avisado por quilometragem.', { inteiro: true });
    h += campoNumero('oleoMeses', 'Ou a cada quantos meses', c.oleoMeses ? String(c.oleoMeses) : '', 'meses', 'Opcional. Ex.: 6 ou 12. Será avisado o que vier primeiro.', { inteiro: true, opcional: true });
    h += '<button class="botao botao-principal botao-grande" type="submit">✔ Salvar</button>';
    h += '<a class="botao botao-secundario" href="#ajustes">Cancelar</a>';
    if (!novo && estado.carros.length > 1) h += '<button class="botao botao-perigo" type="button" id="remover-carro">Remover este carro</button>';
    h += '</form>';
    tela.innerHTML = h;

    $('#form-carro').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var erros = [];
      var nome = $('#nome').value.trim();
      if (!nome) erros.push('Escreva o nome do carro.');
      if (estado.carros.some(function (x) { return x.id !== c.id && x.nome.toLowerCase() === nome.toLowerCase(); })) erros.push('Já existe um carro com esse nome. Use um nome diferente para não confundir.');
      var oleoKmTxt = $('#oleoKm').value.trim(), oleoMesesTxt = $('#oleoMeses').value.trim();
      var oleoKm = oleoKmTxt ? C.lerNumero(oleoKmTxt, true) : null;
      var oleoMeses = oleoMesesTxt ? C.lerNumero(oleoMesesTxt, true) : null;
      if (oleoKmTxt && !(oleoKm > 0)) erros.push('O intervalo da troca de óleo precisa ser um número maior que zero (ex.: 5000).');
      if (oleoMesesTxt && !(oleoMeses > 0 && oleoMeses <= 48 && Math.round(oleoMeses) === oleoMeses)) erros.push('Os meses precisam ser um número inteiro, de 1 a 48.');
      var ano = $('#ano').value.trim();
      if (ano && !/^\d{4}$/.test(ano)) erros.push('O ano precisa ter 4 números, ex.: 2015.');
      if (erros.length) return mostrarErros(erros);
      var dados = { nome: nome, marca: $('#marca').value.trim(), modelo: $('#modelo').value.trim(), ano: ano,
        cor: ($('input[name=cor]:checked') || {}).value || c.cor, oleoKm: oleoKm || 0, oleoMeses: oleoMeses || null };
      if (novo) {
        var carroNovo = Object.assign(c, dados);
        estado.carros.push(carroNovo);
        estado.carroAtual = carroNovo.id;
      } else {
        Object.assign(c, dados);
      }
      salvar();
      aviso('Salvo! ✔', novo ? 'O carro <strong>' + esc(nome) + '</strong> foi adicionado e agora está selecionado.' : 'Os dados do carro foram atualizados.', function () { ir(novo ? 'inicio' : 'ajustes', true); });
    });

    if ($('#remover-carro')) $('#remover-carro').addEventListener('click', function () {
      var nA = abastDoCarro(c.id).length, nM = manutDoCarro(c.id).length;
      confirmar({
        icone: '⚠️', titulo: 'Remover o ' + c.nome + '?', perigo: true,
        texto: 'Serão apagados também ' + C.plural(nA, 'abastecimento', 'abastecimentos') + ' e ' + C.plural(nM, 'manutenção', 'manutenções') + ' deste carro. Isso não pode ser desfeito.',
        sim: 'Sim, remover', nao: 'Não, manter',
        aoConfirmar: function () {
          estado.carros = estado.carros.filter(function (x) { return x.id !== c.id; });
          estado.abastecimentos = estado.abastecimentos.filter(function (x) { return x.carroId !== c.id; });
          estado.manutencoes = estado.manutencoes.filter(function (x) { return x.carroId !== c.id; });
          estado.carroAtual = estado.carros[0].id;
          salvar();
          ir('inicio', true);
        }
      });
    });
  }

  // =====================================================================
  // Tela: ajuda
  // =====================================================================
  function telaAjuda() {
    tela.innerHTML = '<div class="texto-ajuda"><h1>Ajuda</h1>' +
      (estado.carros.length ? '' : '<p><a href="#inicio">← Voltar</a></p>') +
      '<div class="cartao"><h2>Como usar</h2>' +
      '<p><strong>1.</strong> Toda vez que abastecer, toque em <strong>Registrar abastecimento</strong> e preencha: quilometragem do painel, litros e valor pago (estão na nota).</p>' +
      '<p><strong>2.</strong> Quando fizer troca de óleo, pneus ou outro serviço, toque em <strong>Registrar manutenção</strong>.</p>' +
      '<p><strong>3.</strong> A tela de <strong>Início</strong> mostra os números mais importantes e avisa quando uma manutenção estiver chegando ou atrasada.</p>' +
      '<p><strong>4.</strong> Confira sempre o nome do carro no topo colorido da tela antes de salvar.</p>' +
      '<p><strong>Dica:</strong> para abrir mais rápido, adicione este aplicativo à tela inicial do celular (no menu do navegador, toque em “Adicionar à tela inicial”).</p></div>' +
      '<div class="cartao"><h2>Onde ficam os dados?</h2>' +
      '<p>Somente neste celular, dentro do navegador. Nada é enviado para a internet. Se o celular for trocado, formatado, ou se os dados do navegador forem limpos, os registros se perdem — por isso salve uma <strong>cópia de segurança</strong> em Ajustes de vez em quando.</p>' +
      '<p>Se duas pessoas usam celulares diferentes, cada celular tem os seus próprios dados. Para passar os dados de um para outro, salve a cópia em um e restaure no outro.</p></div>' +
      '<div class="cartao"><h2>Como os cálculos são feitos</h2>' +
      '<h3>Preço por litro</h3><div class="formula">valor pago ÷ litros</div>' +
      '<h3>Km rodados</h3><div class="formula">quilometragem deste abastecimento − quilometragem do abastecimento anterior</div>' +
      '<h3>Consumo (km por litro)</h3>' +
      '<p>Usa o método do <strong>tanque cheio</strong>, o mais confiável:</p>' +
      '<div class="formula">km rodados entre dois tanques cheios ÷ litros colocados para completar o tanque</div>' +
      '<p>Exemplo: encheu o tanque com 40.000 km. Depois encheu de novo com 40.420 km, colocando 35 litros. Consumo = 420 ÷ 35 = <strong>12 km/L</strong>.</p>' +
      '<p>Se em algum abastecimento o tanque <strong>não</strong> foi completado, o consumo daquele dia não é calculado. Os litros dele são somados ao próximo abastecimento com tanque cheio, e aí o cálculo é feito para o trecho inteiro.</p>' +
      '<p><strong>Limitação:</strong> se você marcar “Sim, completou” sem ter completado de verdade, o consumo daquele trecho sai errado (e o seguinte também). Por isso a pergunta “Encheu o tanque?” é importante.</p>' +
      '<h3>Custo por km</h3><div class="formula">valor pago no trecho ÷ km rodados no trecho</div>' +
      '<h3>Consumo recente (tela inicial)</h3><div class="formula">soma dos km dos 3 últimos trechos ÷ soma dos litros desses trechos</div>' +
      '<h3>Variação do preço</h3><div class="formula">preço do litro agora − preço do litro no abastecimento anterior</div>' +
      '<h3>Troca de óleo</h3><div class="formula">próxima troca = km da última troca + intervalo (padrão 5.000 km)</div>' +
      '<p>Se configurar também um prazo em meses, vale o que vier primeiro.</p>' +
      '<h3>Avisos</h3><p>🟡 <strong>Chegando</strong>: faltam até ' + C.LIMITE_KM_PROXIMO + ' km ou até ' + C.LIMITE_DIAS_PROXIMO + ' dias.<br>🔴 <strong>Atrasada</strong>: passou da quilometragem ou da data.</p>' +
      '<p>A “quilometragem atual” é o maior número já anotado em abastecimentos ou manutenções.</p></div></div>';
  }

  // =====================================================================
  // Cópia de segurança, restauração e planilha
  // =====================================================================
  function nomeArquivo(prefixo, ext) {
    var d = C.hojeISO();
    return prefixo + '-' + d + '.' + ext;
  }
  function entregarArquivo(conteudo, nome, tipo, aoTerminar) {
    var blob = new Blob([conteudo], { type: tipo });
    var arquivo = null;
    try { arquivo = new File([blob], nome, { type: tipo }); } catch (e) { arquivo = null; }
    if (arquivo && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      navigator.share({ files: [arquivo], title: nome }).then(function () { aoTerminar(true); })
        .catch(function (e) { if (e && e.name === 'AbortError') return; baixar(blob, nome); aoTerminar(true); });
      return;
    }
    baixar(blob, nome);
    aoTerminar(true);
  }
  function baixar(blob, nome) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }

  function fazerBackup() {
    var conteudo = JSON.stringify({ aplicativo: 'controle-do-carro', versao: 1, criadoEm: new Date().toISOString(), dados: estado }, null, 1);
    entregarArquivo(conteudo, nomeArquivo('copia-controle-carro', 'json'), 'application/json', function () {
      estado.ultimoBackup = new Date().toISOString();
      estado.alteracoesDesdeBackup = 0;
      salvar();
      aviso('Cópia de segurança pronta ✔', 'Guarde o arquivo em um lugar seguro (por exemplo, envie para você mesmo no WhatsApp ou e-mail). Para trazer os dados de volta, use “Restaurar uma cópia”.', function () { desenhar(); });
    });
  }

  function escolherArquivoRestaurar() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var leitor = new FileReader();
      leitor.onload = function () {
        var d;
        try { d = JSON.parse(leitor.result); } catch (e) { d = null; }
        if (!d || d.aplicativo !== 'controle-do-carro' || !d.dados || !Array.isArray(d.dados.carros)) {
          aviso('Arquivo não reconhecido', 'Este arquivo não é uma cópia de segurança do Controle do Carro.');
          return;
        }
        var novo = normalizar(d.dados);
        confirmar({
          icone: '📥', titulo: 'Restaurar esta cópia?',
          texto: 'Cópia de ' + (d.criadoEm ? C.fmtData(d.criadoEm.slice(0, 10)) : 'data desconhecida') + ' com ' +
            C.plural(novo.carros.length, 'carro', 'carros') + ', ' + C.plural(novo.abastecimentos.length, 'abastecimento', 'abastecimentos') +
            ' e ' + C.plural(novo.manutencoes.length, 'manutenção', 'manutenções') + '.<br><br><strong>Os dados atuais deste aparelho serão substituídos.</strong>',
          sim: 'Sim, restaurar', nao: 'Cancelar', perigo: true,
          aoConfirmar: function () {
            estado = novo;
            estado.ultimoBackup = d.criadoEm || null;
            estado.alteracoesDesdeBackup = 0;
            salvar();
            sessao.escolheuCarro = false;
            aviso('Dados restaurados ✔', 'Os registros da cópia foram carregados neste aparelho.', function () { ir('inicio', true); });
          }
        });
      };
      leitor.readAsText(f);
    });
    input.click();
  }

  function exportarPlanilha() {
    function cel(v) {
      var s = v === null || v === undefined ? '' : String(v);
      return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    function n(v, casas) { return v === null || v === undefined ? '' : Number(v).toFixed(casas).replace('.', ','); }
    var linhas = [['Carro', 'Registro', 'Data', 'Quilometragem', 'Litros', 'Valor (R$)', 'Preço por litro (R$)', 'Combustível', 'Tanque cheio',
      'Km rodados', 'Consumo (km/L)', 'Custo por km (R$)', 'Manutenção', 'Lembrete (km)', 'Lembrete (data)', 'Observações'].join(';')];
    estado.carros.forEach(function (c) {
      C.analisarAbastecimentos(abastDoCarro(c.id)).forEach(function (a) {
        linhas.push([cel(c.nome), 'Abastecimento', C.fmtData(a.data), a.km, n(a.litros, 2), n(a.valor, 2), n(a.precoLitro, 3), cel(a.combustivel),
          a.tanqueCheio === false ? 'Não' : 'Sim', a.kmDesdeAnterior === null ? '' : a.kmDesdeAnterior,
          a.trecho ? n(a.trecho.kmPorLitro, 2) : '', a.trecho ? n(a.trecho.custoPorKm, 3) : '', '', '', '', cel(a.obs)].join(';'));
      });
      manutDoCarro(c.id).slice().sort(function (a, b) { return a.data < b.data ? -1 : 1; }).forEach(function (m) {
        linhas.push([cel(c.nome), 'Manutenção', C.fmtData(m.data), m.km, '', n(m.valor, 2), '', '', '', '', '', '',
          cel(C.nomeManutencao(m)), m.lembreteKm || '', m.lembreteData ? C.fmtData(m.lembreteData) : '', cel(m.obs)].join(';'));
      });
    });
    entregarArquivo('﻿' + linhas.join('\r\n'), nomeArquivo('planilha-controle-carro', 'csv'), 'text/csv', function () {
      aviso('Planilha pronta ✔', 'O arquivo pode ser aberto no Excel ou no Google Planilhas. Atenção: a planilha serve para consulta; para guardar os dados use a “cópia de segurança”.');
    });
  }

  // =====================================================================
  // Demonstração
  // =====================================================================
  function carregarDemo() {
    estado = window.DadosDemo ? window.DadosDemo.gerar(C, novoId) : estadoVazio();
    salvar();
    sessao.escolheuCarro = false;
    ir('escolher', true);
  }
  function sairDemo() {
    confirmar({
      icone: '🧹', titulo: 'Apagar a demonstração?',
      texto: 'Todos os dados de exemplo serão apagados e você começa do zero com os seus carros.' +
        (estado.abastecimentos.concat(estado.manutencoes).some(function (x) { return !x.demo; }) ? '<br><strong>Atenção: os registros que você fez durante a demonstração também serão apagados.</strong>' : ''),
      sim: 'Sim, apagar e começar', nao: 'Continuar vendo',
      aoConfirmar: function () { estado = estadoVazio(); salvar(); sessao.escolheuCarro = false; ir('inicio', true); }
    });
  }

  // =====================================================================
  // Início
  // =====================================================================
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
  desenhar();
})();
