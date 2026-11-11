/*
 * Controle de Bordo — telas e armazenamento.
 * Os dados ficam no Cloud Firestore (nuvem da família); veja js/nuvem.js e firestore.rules.
 */
(function () {
  'use strict';

  var C = window.Calc;
  var CHAVE = 'controleCarro.v1';
  var CORES = [
    { nome: 'Azul', valor: '#1e40af' },
    { nome: 'Vermelho', valor: '#b91c1c' },
    { nome: 'Verde', valor: '#15803d' },
    { nome: 'Roxo', valor: '#6d28d9' },
    { nome: 'Laranja', valor: '#c2410c' },
    { nome: 'Cinza', valor: '#374151' }
  ];
  // Tons sóbrios usados SÓ na tela. O valor salvo de cada carro continua o mesmo.
  var TONS = {
    '#1e40af': '#4f7299', '#b91c1c': '#c0504a', '#15803d': '#3b8a65',
    '#6d28d9': '#7660b0', '#c2410c': '#bf6a22', '#374151': '#6b7280'
  };
  function tom(cor) { var c = String(cor || '').toLowerCase(); return TONS[c] || (/^#[0-9a-f]{6}$/.test(c) ? c : TONS['#1e40af']); }
  function marca(tipo) { return '<div class="marca marca-' + tipo + '" aria-hidden="true"></div>'; }

  // Ícones próprios do app (traço único, cantos arredondados), desenhados para o Controle de Bordo.
  function svg(corpo, extra) {
    return '<svg class="icone' + (extra ? ' ' + extra : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + corpo + '</svg>';
  }
  var ICONES = {
    bomba: svg('<path d="M5 20.5V5.5A1.5 1.5 0 0 1 6.5 4h7A1.5 1.5 0 0 1 15 5.5v15M3.5 20.5h13"/><path d="M7.5 7.5h5v3.5h-5z"/><path d="M15 9.5h1.6a1.4 1.4 0 0 1 1.4 1.4v5.1a1.5 1.5 0 0 0 3 0V8.6L18.5 6"/>'),
    chave: svg('<path d="M14.6 6.2a4 4 0 0 0-5.3 5.2l-5.1 5.1a1.6 1.6 0 0 0 2.3 2.3l5.1-5.1a4 4 0 0 0 5.2-5.3l-2.4 2.4-2.1-.5-.5-2.1z"/>'),
    carro: svg('<path d="M4.5 15.5v-3l1.7-4.3A2 2 0 0 1 8 7h8a2 2 0 0 1 1.8 1.2l1.7 4.3v3"/><path d="M3.5 15.5h17v2.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-10v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z"/><path d="M5 12.5h14"/><circle cx="7.5" cy="14.5" r=".6"/><circle cx="16.5" cy="14.5" r=".6"/>'),
    seta: svg('<path d="m9.5 6 6 6-6 6"/>', 'icone-seta'),
    voltar: svg('<path d="M14.5 6l-6 6 6 6"/>'),
    sol: svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M5.6 18.4l1.3-1.3M17.1 6.9l1.3-1.3"/>'),
    lua: svg('<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>'),
    auto: svg('<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M12 7.5a3.5 3.5 0 0 0 0 7z" fill="currentColor"/><circle cx="12" cy="11" r="3.5"/>'),
    pessoas: svg('<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.8a3 3 0 0 1 0 5.4M17.5 14.2A5.5 5.5 0 0 1 20.5 19"/>'),
    sair: svg('<path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14"/><path d="M10 8l-4 4 4 4M6 12h9"/>'),
    nuvem: svg('<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 10a4.25 4.25 0 0 0 0 8.5z"/><path d="M12 15.5v-5M9.8 12.7 12 10.5l2.2 2.2"/>'),
    ajuda: svg('<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4"/><circle cx="12" cy="16.8" r=".5" fill="currentColor"/>'),
    olho: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    mais: svg('<path d="M12 5v14M5 12h14"/>'),
    alerta: svg('<path d="M12 4.5 2.8 19.5h18.4z"/><path d="M12 10v4.2"/><circle cx="12" cy="16.9" r=".5" fill="currentColor"/>')
  };
  var G_GOOGLE = '<svg class="icone icone-google" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.73z"/>' +
    '<path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z"/>' +
    '<path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58V6.61H1.28a12 12 0 0 0 0 10.78z"/>' +
    '<path fill="#EA4335" d="M12 4.76c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 1.28 6.61l4.01 3.1C6.23 6.87 8.88 4.76 12 4.76z"/></svg>';

  // Emblema do carro: sigla da marca reconhecida (desenho próprio, sem logotipo oficial)
  // ou um carro genérico. A marca escrita aparece também no texto, ao lado.
  function emblema(c) {
    var m = window.Marcas ? Marcas.reconhecerMarca(c.marca) : null;
    if (!m) return '<span class="emblema emblema-generico" style="--tom:' + tom(c.cor) + '" aria-hidden="true">' + ICONES.carro + '</span>';
    return '<span class="emblema" style="--tom:' + tom(c.cor) + '" data-marca="' + esc(m.nome) + '" aria-hidden="true">' +
      '<span class="sigla' + (m.sigla.length > 4 ? ' sigla-longa' : '') + (m.sigla.length > 6 ? ' sigla-muito-longa' : '') + '">' + esc(m.sigla) + '</span></span>';
  }
  // Quilometragem com cara de odômetro: cada algarismo numa casinha.
  // Quando a quilometragem de um carro MUDA (ex.: depois de um registro), os algarismos que
  // mudaram rolam do valor antigo até o novo, em menos de 1 segundo. Ao abrir o app não há
  // animação (não há valor anterior), e com "reduzir movimento" o número aparece direto.
  // O valor final já está no texto desde o início (para leitores de tela e para o app).
  var DURACAO_ROLAGEM = 800;
  var kmMostrado = {};   // última quilometragem mostrada de cada carro, nesta sessão
  var rolagens = {};     // carroId -> { de, para, inicio }
  var menosMovimento = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var anuncio = document.getElementById('anuncio');
  function lembrarKm(carroId, km) { if (carroId && typeof km === 'number') kmMostrado[carroId] = km; }
  function esquecerKms() { kmMostrado = {}; rolagens = {}; }
  function fitaDeDigitos(de, para, sobe) {
    if (de === '') return ['\u00a0', para];          // algarismo novo à esquerda (ex.: 9.999 → 10.000)
    var lista = [de], d = +de, alvo = +para;
    while (d !== alvo) { d = (d + (sobe ? 1 : 9)) % 10; lista.push(String(d)); }
    return lista;
  }
  function odometro(km, carroId) {
    var anim = null;
    if (carroId) {
      var antes = kmMostrado[carroId];
      if (typeof antes === 'number' && antes !== km && !(menosMovimento && menosMovimento.matches)) {
        rolagens[carroId] = { de: antes, para: km, inicio: Date.now() };
        if (anuncio) setTimeout(function () { anuncio.textContent = 'Quilometragem atualizada: ' + C.fmtKm(km); }, 150);
      }
      lembrarKm(carroId, km);
      var r = rolagens[carroId];
      // redesenho durante a animação: continua de onde estava (atraso negativo)
      if (r && r.para === km && Date.now() - r.inicio < DURACAO_ROLAGEM) anim = r;
    }
    var novo = C.fmtNum(km).split(''), velho = anim ? C.fmtNum(anim.de).split('') : null;
    var desloc = velho ? novo.length - velho.length : 0;
    var visual = novo.map(function (ch, i) {
      if (!/\d/.test(ch)) return '<span class="sep">' + ch + '</span>';
      var antigo = velho ? (velho[i - desloc] !== undefined && /\d/.test(velho[i - desloc]) ? velho[i - desloc] : '') : ch;
      if (!anim || antigo === ch) return '<span class="dig">' + ch + '</span>';
      var fita = fitaDeDigitos(antigo, ch, anim.para > anim.de);
      return '<span class="dig rola" data-fim="' + ch + '"><span class="fita" style="--passos:' + (fita.length - 1) +
        ';animation-delay:-' + (Date.now() - anim.inicio) + 'ms">' + fita.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</span></span>';
    }).join('');
    return '<span class="odometro' + (anim ? ' rolando' : '') + '"><span class="sr">' + C.fmtKm(km) + '</span>' +
      '<span class="odo-visual" aria-hidden="true">' + visual + '<span class="un"> km</span></span></span>';
  }
  // Fim da rolagem: troca a fita pelo algarismo final.
  document.addEventListener('animationend', function (ev) {
    if (!ev.target.classList || !ev.target.classList.contains('fita')) return;
    var dig = ev.target.parentNode;
    dig.classList.remove('rola'); dig.textContent = dig.getAttribute('data-fim');
    var odo = dig.closest('.odometro');
    if (odo && !odo.querySelector('.fita')) odo.classList.remove('rolando');
  });
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
  // Estado e armazenamento
  //  - modo 'nuvem': dados da família no Cloud Firestore (tempo real);
  //  - modo 'demo' : dados inventados, só na memória deste aparelho.
  // Preferências do aparelho (carro escolhido, lembrete de cópia) ficam no localStorage.
  // =====================================================================
  var CHAVE_ANTIGA = 'controleCarro.v1';          // dados da versão antiga (só no aparelho)
  var CHAVE_PREF = 'controleCarro.preferencias';
  var COLECOES = { veiculos: 'carros', abastecimentos: 'abastecimentos', manutencoes: 'manutencoes' };
  var CAMPOS = {
    veiculos: ['nome', 'marca', 'modelo', 'ano', 'cor', 'oleoKm', 'oleoMeses', 'criadoEm', 'arquivado', 'arquivadoEm'],
    abastecimentos: ['carroId', 'data', 'km', 'distanciaInformada', 'litros', 'valor', 'tanqueCheio', 'combustivel', 'obs', 'criadoEm'],
    manutencoes: ['carroId', 'tipo', 'descricao', 'data', 'km', 'valor', 'lembreteKm', 'lembreteData', 'obs', 'criadoEm']
  };

  // 'iniciando' | 'sem-config' | 'erro-carga' | 'login' | 'verificar' | 'sem-familia' | 'sem-acesso' | 'carregando-dados' | 'nuvem' | 'demo'
  var modo = 'iniciando';
  var usuarioAtual = null;
  var familia = null;
  var carregado = {};
  var assinaturas = {};
  var pendentes = {};
  var redesenhoPendente = false;

  function lerPrefs() {
    try { return JSON.parse(localStorage.getItem(CHAVE_PREF)) || {}; } catch (e) { return {}; }
  }
  var prefs = lerPrefs();
  function salvarPrefs() {
    try { localStorage.setItem(CHAVE_PREF, JSON.stringify(prefs)); } catch (e) { /* sem problema */ }
  }

  // ---------------------------------------------------------------------
  // Aparência (tema e tamanho do texto)
  //  - fica guardada no aparelho (vale na hora, mesmo sem internet);
  //  - com login, também no perfil da pessoa na nuvem (perfis/{uid}), para valer
  //    em qualquer celular onde ela entrar. Na demonstração, só no aparelho.
  // ---------------------------------------------------------------------
  var CHAVE_APARENCIA = 'controleCarro.aparencia';
  var TEMAS = ['claro', 'escuro', 'auto'];
  var TEXTOS = ['padrao', 'maior', 'enorme'];
  function aparenciaValida(a) {
    return !!a && TEMAS.indexOf(a.tema) >= 0 && TEXTOS.indexOf(a.texto) >= 0;
  }
  function lerAparencia() {
    var a = null;
    try { a = JSON.parse(localStorage.getItem(CHAVE_APARENCIA)); } catch (e) { a = null; }
    return { tema: a && TEMAS.indexOf(a.tema) >= 0 ? a.tema : 'claro', texto: a && TEXTOS.indexOf(a.texto) >= 0 ? a.texto : 'padrao' };
  }
  var aparencia = lerAparencia();
  var escuroNoCelular = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function temaEfetivo() {
    return aparencia.tema === 'auto' ? (escuroNoCelular && escuroNoCelular.matches ? 'escuro' : 'claro') : aparencia.tema;
  }
  function aplicarAparencia() {
    var h = document.documentElement;
    h.setAttribute('data-tema', aparencia.tema);
    h.setAttribute('data-texto', aparencia.texto);
    var esquema = document.querySelector('meta[name=color-scheme]');
    if (esquema) esquema.setAttribute('content', aparencia.tema === 'auto' ? 'light dark' : (aparencia.tema === 'escuro' ? 'dark' : 'light'));
    var cor = document.querySelector('meta[name=theme-color]');
    if (cor) cor.setAttribute('content', temaEfetivo() === 'escuro' ? '#1b1e22' : '#f5f6f7');
  }
  if (escuroNoCelular && escuroNoCelular.addEventListener) escuroNoCelular.addEventListener('change', aplicarAparencia);
  function guardarAparenciaNoAparelho() {
    try { localStorage.setItem(CHAVE_APARENCIA, JSON.stringify(aparencia)); } catch (e) { /* sem problema */ }
  }
  // Mudança feita pela pessoa em Ajustes.
  function mudarAparencia(campo, valor) {
    if ((campo === 'tema' ? TEMAS : TEXTOS).indexOf(valor) < 0) return;
    aparencia = Object.assign({}, aparencia);
    aparencia[campo] = valor;
    aplicarAparencia();
    guardarAparenciaNoAparelho();
    // Demonstração: nunca vai para a nuvem. Sem internet: o Firestore guarda e envia depois.
    if (!estado.demo && modo === 'nuvem' && usuarioAtual) {
      Nuvem.gravarPerfil(usuarioAtual.uid, aparencia).catch(function () { /* continua valendo no aparelho */ });
    }
  }
  // Preferência vinda do perfil na nuvem (outro celular, ou o cache do próprio aparelho).
  function aoReceberPerfil(d) {
    if (modo === 'demo' || !aparenciaValida(d)) return;
    if (d.tema === aparencia.tema && d.texto === aparencia.texto) return;
    aparencia = { tema: d.tema, texto: d.texto };
    aplicarAparencia();
    guardarAparenciaNoAparelho();
    if (modo === 'nuvem' && rotaAtual().nome === 'ajustes' && janela.hidden) redesenharSePossivel();
  }
  aplicarAparencia();

  function estadoVazio() {
    return { carros: [], abastecimentos: [], manutencoes: [], carroAtual: prefs.carroAtual || null,
      demo: false, ultimoBackup: prefs.ultimoBackup || null, alteracoesDesdeBackup: prefs.alteracoesDesdeBackup || 0 };
  }
  var estado = estadoVazio();

  // Guarda as preferências do aparelho. (Os registros são gravados pela camada "Dados" abaixo.)
  function salvar(contarAlteracao) {
    if (contarAlteracao && !estado.demo) estado.alteracoesDesdeBackup = (estado.alteracoesDesdeBackup || 0) + 1;
    if (estado.demo) return true;
    prefs.carroAtual = estado.carroAtual;
    prefs.ultimoBackup = estado.ultimoBackup;
    prefs.alteracoesDesdeBackup = estado.alteracoesDesdeBackup;
    salvarPrefs();
    return true;
  }

  // Só os campos permitidos pelas regras do Firestore; sem campos vazios (undefined).
  var TAMANHOS = { nome: 40, marca: 30, modelo: 30, ano: 4, combustivel: 20, obs: 300, descricao: 60 };
  function limpar(colecao, reg) {
    var r = {};
    CAMPOS[colecao].forEach(function (k) {
      if (reg[k] === undefined) return;
      r[k] = (TAMANHOS[k] && typeof reg[k] === 'string') ? reg[k].slice(0, TAMANHOS[k]) : reg[k];
    });
    if (colecao === 'veiculos') {
      r.oleoKm = Number(r.oleoKm) || 0;
      r.oleoMeses = r.oleoMeses ? Math.round(r.oleoMeses) : null;
      r.ano = r.ano ? String(r.ano) : '';
      if (!/^#[0-9a-fA-F]{6}$/.test(r.cor || '')) r.cor = CORES[0].valor;
      r.arquivado = r.arquivado === true;
      r.arquivadoEm = r.arquivado && typeof r.arquivadoEm === 'number' ? r.arquivadoEm : null;
    }
    return r;
  }
  function listaDe(colecao) { return estado[COLECOES[colecao]]; }
  function aplicarLocal(colecao, reg) {
    var chave = COLECOES[colecao];
    var achou = false;
    estado[chave] = estado[chave].map(function (x) { if (x.id === reg.id) { achou = true; return reg; } return x; });
    if (!achou) estado[chave].push(reg);
  }
  function removerLocal(colecao, id) {
    var chave = COLECOES[colecao];
    estado[chave] = estado[chave].filter(function (x) { return x.id !== id; });
  }
  function acompanhar(promessa) {
    promessa.catch(function (e) { mostrarErroNuvem(e); });
  }

  // Toda gravação passa por aqui: atualiza a tela na hora e envia para a nuvem.
  // Sem internet, o Firestore guarda no aparelho e envia quando a conexão voltar.
  var Dados = {
    gravar: function (colecao, reg) {
      aplicarLocal(colecao, reg);
      if (modo === 'nuvem') acompanhar(Nuvem.gravar(colecao, reg.id, limpar(colecao, reg)));
    },
    apagar: function (colecao, id) {
      removerLocal(colecao, id);
      if (modo === 'nuvem') acompanhar(Nuvem.apagar(colecao, id));
    },
    lotes: function (ops) {
      ops.forEach(function (op) { if (op.tipo === 'delete') removerLocal(op.colecao, op.id); else aplicarLocal(op.colecao, op.dados); });
      if (modo === 'nuvem') {
        acompanhar(Nuvem.emLotes(ops.map(function (op) {
          return op.tipo === 'delete' ? op : { tipo: 'set', colecao: op.colecao, id: op.id, dados: limpar(op.colecao, op.dados) };
        })));
      }
    }
  };

  function mostrarErroNuvem(e) {
    var cod = (e && e.code) || '';
    var msg = cod === 'permission-denied'
      ? 'A nuvem recusou a gravação. Seu e-mail pode ter sido removido da família, ou algum dado está fora do formato esperado.'
      : 'Não foi possível salvar na nuvem (' + esc(cod || (e && e.message) || 'erro desconhecido') + '). Confira a internet e tente de novo.';
    abrirJanela(marca('aviso') + '<h2>Não foi salvo na nuvem</h2><p>' + msg + '</p>' +
      '<button class="botao botao-principal" data-janela="ok">OK</button>', { ok: function () { desenhar(); } });
  }

  function novoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  // =====================================================================
  // Acesso aos dados
  // =====================================================================
  function carroPorId(id) { return estado.carros.filter(function (c) { return c.id === id; })[0] || null; }
  // Carros arquivados não aparecem na escolha nem recebem registros novos.
  function carrosAtivos() { return estado.carros.filter(function (c) { return !c.arquivado; }); }
  function carrosArquivados() { return estado.carros.filter(function (c) { return c.arquivado; }); }
  function carroAtual() {
    var ativos = carrosAtivos();
    var c = ativos.filter(function (x) { return x.id === estado.carroAtual; })[0];
    if (!c && ativos.length) { c = ativos[0]; estado.carroAtual = c.id; }
    return c || null;
  }
  function carroArquivado(id) { var c = carroPorId(id); return !!(c && c.arquivado); }
  // Carro arquivado é somente leitura: avisa e leva ao histórico dele.
  function avisarArquivado(carroId) {
    aviso('Carro arquivado', 'Este registro é de um carro arquivado. Para corrigir ou anotar algo nele, reative o carro em Ajustes.',
      function () { ir('arquivo/' + encodeURIComponent(carroId), true); });
  }
  // Sugere a cor menos usada entre os carros ativos (as cores podem se repetir).
  function proximaCor() {
    var uso = {};
    carrosAtivos().forEach(function (c) { uso[c.cor] = (uso[c.cor] || 0) + 1; });
    return CORES.slice().sort(function (a, b) { return (uso[a.valor] || 0) - (uso[b.valor] || 0); })[0].valor;
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
    var t = function (x) { return String(x === null || x === undefined ? '' : x).trim(); };
    var mm = [t(c.marca), t(c.modelo)].filter(Boolean).join(' ');
    return [mm, t(c.ano)].filter(Boolean).join(' · ');
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
  var navegacaoSubstituida = false;
  function ir(rota, substituir) {
    if (location.hash === '#' + rota) { desenhar(); return; }
    if (substituir) { navegacaoSubstituida = true; location.replace('#' + rota); }
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
      (opcoes.perigo ? marca('aviso') : '') +
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
  var FORMULARIOS = { abastecer: true, manutencao: true, carro: true };
  function montarMoldura(rota, param) {
    var carro = carroAtual();
    var emFormulario = !!FORMULARIOS[rota];
    // Garagem e Ajustes são da família toda: não mostram um carro no topo.
    var semCarro = !emFormulario && (!carro || rota === 'boas-vindas' || rota === 'sistema' || rota === 'arquivo');
    var semTopo = rota === 'inicio' || rota === 'ajustes' || rota === 'familia' || rota === 'ajuda' || rota === 'postos';

    document.body.classList.toggle('modo-entrada', rota === 'sistema' && modo === 'login');
    if (estado.demo) {
      faixaDemo.hidden = false;
      faixaDemo.innerHTML = '<span><strong>Demonstração</strong> · dados de exemplo, nada é salvo.</span> <button type="button" data-acao="sair-demo">Sair da demonstração</button>';
    } else {
      faixaDemo.hidden = true;
    }

    if (semCarro) {
      topo.hidden = true; menu.hidden = true; document.body.classList.add('sem-menu');
      document.documentElement.style.setProperty('--cor-carro', tom(null));
      return;
    }
    marcarMenu(rota === 'painel' ? 'inicio' : rota);
    if (semTopo) {
      topo.hidden = true; menu.hidden = false; document.body.classList.remove('sem-menu');
      return;
    }
    document.documentElement.style.setProperty('--cor-carro', tom(carro ? carro.cor : null));

    topo.hidden = false;
    if (emFormulario) {
      // Formulários: "← Voltar" no topo (o "Cancelar" continua no fim do formulário).
      var editado = rota === 'carro' && param && param !== 'novo' ? carroPorId(param) : null;
      var cab;
      if (rota === 'carro') {
        cab = '<span class="topo-rotulo">' + (editado ? 'Dados do carro' : 'Cadastro') + '</span>' +
          '<span class="topo-nome">' + (editado ? '<span class="ponto-carro" aria-hidden="true" style="background:' + tom(editado.cor) + '"></span>' + esc(editado.nome) : 'Novo carro') + '</span>';
      } else {
        cab = '<span class="topo-rotulo">Carro selecionado</span>' +
          '<span class="topo-nome"><span class="ponto-carro" aria-hidden="true"></span>' + esc(carro ? carro.nome : '') + '</span>';
      }
      topo.innerHTML = '<div class="topo-dentro topo-formulario">' +
        '<button type="button" class="botao-voltar" data-acao="voltar-form">' + ICONES.voltar + 'Voltar</button>' +
        '<div class="topo-carro">' + cab + '</div></div>';
      menu.hidden = true; document.body.classList.add('sem-menu');
      return;
    }

    var desc = descricaoCarro(carro);
    topo.innerHTML = '<div class="topo-dentro' + (rota === 'painel' ? ' topo-painel' : '') + '">' +
      (rota === 'painel' ? '<a class="topo-voltar" href="#inicio" aria-label="Voltar para a Garagem">' + ICONES.voltar + 'Garagem</a>' : '') +
      '<div class="topo-carro">' +
      '<span class="topo-rotulo">' + (rota === 'painel' ? 'Painel do carro' : 'Carro selecionado') + '</span>' +
      '<span class="topo-nome"><span class="ponto-carro" aria-hidden="true"></span>' + esc(carro.nome) + '</span>' +
      (desc ? '<span class="topo-rotulo">' + esc(desc) + '</span>' : '') + '</div>' +
      (carrosAtivos().length > 1 ? '<button type="button" data-acao="trocar-carro">Trocar carro</button>' : '') +
      '</div>';
    menu.hidden = false;
    document.body.classList.remove('sem-menu');
  }
  function marcarMenu(rota) {
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

  var TELAS_SISTEMA = {
    iniciando: telaIniciando, 'carregando-dados': telaIniciando, 'sem-config': telaSemConfig, 'erro-carga': telaErroCarga,
    login: telaLogin, verificar: telaVerificar, 'sem-familia': telaSemFamilia, 'sem-acesso': telaSemAcesso
  };

  // manterRolagem: usado quando a tela é atualizada por dados vindos de outro celular.
  function desenhar(manterRolagem) {
    fecharJanela();
    redesenhoPendente = false;
    if (TELAS_SISTEMA[modo]) {
      formulario = null;
      document.body.setAttribute('data-rota', 'sistema');
      montarMoldura('sistema');
      atualizarIndicador();
      TELAS_SISTEMA[modo]();
      window.scrollTo(0, 0);
      return;
    }
    var r = rotaAtual();
    var nome = r.nome;
    var ativos = carrosAtivos().length;
    // Telas que funcionam mesmo sem carro ativo escolhido
    var livre = nome === 'ajuda' || nome === 'carro' || nome === 'arquivo' || nome === 'postos' || (nome === 'familia' && !estado.demo);

    if (!ativos && !livre) nome = 'boas-vindas';
    if (nome === 'escolher') nome = 'inicio';   // a escolha agora é a própria Garagem

    // Formulário: guarda de onde a pessoa veio (uma vez por formulário aberto).
    var hashAgora = location.hash || '#inicio';
    if (FORMULARIOS[nome]) {
      if (!formulario || formulario.hash !== hashAgora) {
        var veioDe = hashDesenhado && hashDesenhado !== hashAgora ? hashDesenhado : null;
        formulario = { hash: hashAgora, origem: veioDe ? veioDe.replace(/^#/, '') : null, empilhado: !!veioDe && chegouEmpilhando, inicial: null };
      }
    } else {
      formulario = null;
    }
    hashDesenhado = hashAgora;
    document.body.setAttribute('data-rota', nome);

    montarMoldura(nome, r.param);
    var telas = {
      'boas-vindas': telaBoasVindas, inicio: telaGaragem, painel: telaPainel,
      abastecer: telaAbastecer, manutencao: telaManutencao, historico: telaHistorico,
      relatorios: telaRelatorios, postos: telaPostos, ajustes: telaAjustes, carro: telaCarro, ajuda: telaAjuda, familia: telaFamilia,
      arquivo: telaArquivo
    };
    (telas[nome] || telaGaragem)(r.param);
    if (window.CampoData) CampoData.ligar(tela);
    if (formulario && formulario.hash === (location.hash || '#inicio')) formulario.inicial = $('.tela form') ? estadoDosCampos() : null;
    if (manterRolagem !== true) window.scrollTo(0, 0);
  }
  // De onde a pessoa veio, para "Voltar" e "Cancelar" dos formulários voltarem ao lugar certo.
  var hashDesenhado = null;     // tela mostrada antes desta mudança
  var chegouEmpilhando = false; // a tela atual foi aberta por um link (entrada nova no histórico)
  window.addEventListener('hashchange', function () {
    chegouEmpilhando = !navegacaoSubstituida;
    navegacaoSubstituida = false;
    desenhar();
  });
  var formulario = null;        // { hash, origem, empilhado, inicial }
  function estadoDosCampos() {
    return $$('.tela form input, .tela form textarea, .tela form select').map(function (el) {
      return el.id + '|' + el.name + '|' + ((el.type === 'radio' || el.type === 'checkbox') ? el.checked : el.value);
    }).join('\n');
  }
  function formularioAlterado() {
    return !!(formulario && formulario.inicial !== null && $('.tela form') && estadoDosCampos() !== formulario.inicial);
  }
  function origemPadrao() {
    var r = rotaAtual();
    if (r.nome === 'carro') return r.param && r.param !== 'novo' ? 'ajustes' : 'inicio';
    if (r.param) return 'historico';
    var c = carroAtual();
    return c ? 'painel/' + encodeURIComponent(c.id) : 'inicio';
  }
  // "← Voltar" e "Cancelar": volta à tela de origem; se algo foi preenchido, pergunta antes.
  function voltarDoFormulario() {
    var f = formulario;
    function sair() {
      formulario = null;
      if (f && f.empilhado) history.back();
      else ir((f && f.origem) || origemPadrao(), true);
    }
    if (!formularioAlterado()) { sair(); return; }
    confirmar({
      titulo: 'Descartar o que foi preenchido?', perigo: true,
      texto: 'As mudanças neste formulário <strong>ainda não foram salvas</strong>.',
      sim: 'Sim, descartar', nao: 'Continuar preenchendo', aoConfirmar: sair
    });
  }
  window.addEventListener('beforeunload', function (ev) {
    if (formularioAlterado()) { ev.preventDefault(); ev.returnValue = ''; }
  });

  // Cliques gerais
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-acao]');
    if (!b) return;
    var acao = b.getAttribute('data-acao');
    var id = b.getAttribute('data-id');
    if (acao === 'trocar-carro') trocarCarro();
    else if (acao === 'sair-demo') sairDemo();
    else if (acao === 'apagar-abast') apagarAbastecimento(id);
    else if (acao === 'apagar-manut') apagarManutencao(id);
    else if (acao === 'voltar') history.length > 1 ? history.back() : ir('inicio');
    else if (acao === 'voltar-form') voltarDoFormulario();
    else if (acao === 'backup') fazerBackup();
    else if (acao === 'restaurar') escolherArquivoRestaurar();
    else if (acao === 'planilha') exportarPlanilha();
    else if (acao === 'demo') carregarDemo();
    else if (acao === 'sair-conta') sairDaConta();
    else if (acao === 'importar-antigos') importarAntigos();
    else if (acao === 'reativar-carro') reativarCarro(id);
  });

  // =====================================================================
  // Tela: boas-vindas (primeiro uso)
  // =====================================================================
  function telaBoasVindas() {
    var arquivados = carrosArquivados();
    var h = '<h1>Nenhum carro cadastrado ainda</h1>' +
      '<p>Cadastre o primeiro carro da família. Depois é só anotar os abastecimentos e as manutenções: o aplicativo calcula o consumo, os gastos e avisa quando chegar a hora da troca de óleo.</p>' +
      '<a class="botao botao-carro botao-grande" href="#carro/novo">Cadastrar primeiro carro</a>' +
      '<p class="legenda-simples">Mais carros podem ser adicionados depois, em Ajustes.</p>';
    if (arquivados.length) {
      h += '<div class="cartao"><h2>Carros arquivados</h2><p>Estes carros estão guardados com todos os registros.</p>' +
        arquivados.map(htmlCarroArquivado).join('') + '</div>';
    }
    h += (dadosAntigosDoAparelho() ? '<div class="cartao"><h2>Já usava o aplicativo neste celular?</h2>' +
        '<p>Encontramos registros da versão antiga guardados neste aparelho. Você pode enviá-los para a nuvem.</p>' +
        '<button class="botao botao-secundario" type="button" data-acao="importar-antigos">Enviar registros antigos para a nuvem</button></div>' : '') +
      '<div class="cartao"><h2>Tem uma cópia de segurança?</h2>' +
      '<p>Se você tem um arquivo de cópia salvo pelo aplicativo, pode trazê-lo para cá.</p>' +
      '<button class="botao botao-secundario" type="button" data-acao="restaurar">Usar cópia de segurança</button></div>' +
      '<div class="cartao"><h2>Pessoas com acesso</h2><p>Autorize os e-mails da família para que todos vejam os mesmos dados.</p>' +
      '<a class="botao botao-secundario" href="#familia">Pessoas com acesso</a></div>' +
      '<p class="legenda-simples"><a href="#ajuda">Ajuda</a> • <button type="button" class="link-botao" data-acao="sair-conta">Sair da conta</button></p>';
    tela.innerHTML = h;
  }

  // Linha de um carro arquivado, com as duas ações possíveis.
  function htmlCarroArquivado(c) {
    var n = abastDoCarro(c.id).length, m = manutDoCarro(c.id).length;
    return '<div class="carro-arquivado" style="--tom:' + tom(c.cor) + '">' +
      '<p class="carro-arquivado-nome"><span class="ponto-carro" aria-hidden="true"></span>' + esc(c.nome) + '</p>' +
      '<p class="legenda-simples">' + C.plural(n, 'abastecimento', 'abastecimentos') + ' e ' + C.plural(m, 'manutenção', 'manutenções') +
      (c.arquivadoEm ? ' • arquivado em ' + C.fmtData(C.dataISO(new Date(c.arquivadoEm))) : '') + '</p>' +
      '<div class="botoes-lado"><a class="botao botao-secundario botao-pequeno" href="#arquivo/' + encodeURIComponent(c.id) + '">Ver histórico</a>' +
      '<button class="botao botao-secundario botao-pequeno" type="button" data-acao="reativar-carro" data-id="' + esc(c.id) + '">Reativar</button></div></div>';
  }

  function novoCarro(nome, cor) {
    return { id: novoId(), nome: nome, marca: '', modelo: '', ano: '', cor: cor, oleoKm: 5000, oleoMeses: null, criadoEm: Date.now() };
  }

  // =====================================================================
  // Tela: escolher carro
  // =====================================================================
  // =====================================================================
  // Tela: início (painel)
  // =====================================================================
  function htmlLembrete(l) {
    var selos = { atrasada: 'ATRASADA', proxima: 'CHEGANDO', ok: 'EM DIA', semDados: 'SEM REGISTRO' };
    var detalhe = '';
    if (l.ultima) {
      detalhe = '<p class="legenda-simples">Última: ' + C.fmtData(l.ultima.data) + ' com ' + C.fmtKm(l.ultima.km) +
        (l.proxKm !== null ? ' • Próxima: ' + C.fmtKm(l.proxKm) : '') +
        (l.proxData ? ' • até ' + C.fmtData(l.proxData) : '') + '</p>';
    }
    return '<div class="lembrete lembrete-' + l.situacao + '"><span class="ponto-status" aria-hidden="true"></span><div>' +
      '<span class="selo">' + selos[l.situacao] + '</span> <strong>' + esc(l.nome) + '</strong>' +
      '<p>' + esc(l.mensagem) + '</p>' + detalhe + '</div></div>';
  }

  // Garagem: todos os carros ativos da família. É a primeira tela, mesmo com um carro só.
  function telaGaragem() {
    var ativos = carrosAtivos();
    var hoje = C.hojeISO();
    var compacta = ativos.length > 3;
    var h = '<header class="cabecalho-tela">' +
      '<span class="sobretitulo linha-marca"><span class="logo-mini">' + SIMBOLO_LOGO + '</span>' +
      (familia && familia.nome && !estado.demo ? esc(familia.nome) : '<span class="sr">Controle de Bordo</span>') + '</span>' +
      '<h1>Garagem</h1><p>' + C.plural(ativos.length, 'carro', 'carros') + ' · toque no carro para abrir o painel dele.</p></header>';
    if (!estado.demo && dadosAntigosDoAparelho()) {
      h += '<div class="caixa caixa-info"><strong>Registros antigos neste celular</strong>' +
        '<p style="margin:6px 0 10px">Encontramos registros da versão antiga do aplicativo guardados só neste aparelho. Envie para a nuvem para não perdê-los.</p>' +
        '<button class="botao botao-principal botao-pequeno" type="button" data-acao="importar-antigos">Enviar para a nuvem</button></div>';
    }
    var temDados = estado.abastecimentos.length + estado.manutencoes.length > 0;
    var diasSemBackup = estado.ultimoBackup ? C.diasEntre(estado.ultimoBackup.slice(0, 10), hoje) : null;
    if (!estado.demo && temDados && (estado.alteracoesDesdeBackup >= 20 || (diasSemBackup !== null && diasSemBackup > 60 && estado.alteracoesDesdeBackup > 0))) {
      h += '<div class="caixa caixa-info"><strong>Lembrete: salve uma cópia de segurança</strong>' +
        '<p style="margin:6px 0 10px">Os dados estão na nuvem, mas uma cópia guardada com você protege contra apagar algo sem querer.</p>' +
        '<button class="botao botao-secundario botao-pequeno" type="button" data-acao="backup">Salvar cópia agora</button></div>';
    }
    if (ativos.length > 6) {
      h += '<div class="campo busca"><label for="busca-carro">Procurar pelo nome</label>' +
        '<input type="text" id="busca-carro" autocomplete="off" placeholder="Ex.: Gol"></div>';
    }
    h += '<div class="lista-carros garagem' + (compacta ? ' lista-compacta' : '') + '">';
    ativos.forEach(function (c) {
      var r = resumoCarro(c);
      var aviso = r.lembretes.filter(function (l) { return l.situacao !== 'semDados'; })[0] || r.lembretes[0];
      var desc = descricaoCarro(c);
      h += '<a class="escolha-carro" href="#painel/' + encodeURIComponent(c.id) + '" data-carro="' + esc(c.id) + '" data-nome="' + esc(c.nome.toLowerCase()) + '" style="--tom:' + tom(c.cor) + '">' +
        '<span class="cartao-carro-topo">' + emblema(c) +
        '<span class="identidade"><span class="nome">' + esc(c.nome) + '</span>' +
        (desc ? '<span class="sub descricao">' + esc(desc) + '</span>' : '') + '</span>' +
        '<span class="abrir">' + ICONES.seta + '<span class="sr">Abrir painel</span></span></span>' +
        '<span class="km-carro"><span class="sobretitulo">Quilometragem</span>' +
        (r.km !== null ? (compacta ? (lembrarKm(c.id, r.km), '<strong class="km-texto">' + C.fmtKm(r.km) + '</strong>') : odometro(r.km, c.id)) : '<span class="sem-registro">Nenhum registro ainda</span>') + '</span>' +
        (aviso ? '<span class="alerta alerta-' + aviso.situacao + '">' + esc(aviso.mensagem) + '</span>' : '') +
        '</a>';
    });
    h += '<a class="vaga-livre" href="#carro/novo">' + ICONES.mais + '<span>+ Adicionar carro</span></a>';
    h += '</div><p class="vazio" id="busca-vazia" hidden>Nenhum carro com esse nome.</p>';
    var arq = carrosArquivados().length;
    if (arq) h += '<p class="legenda-simples">' + C.plural(arq, 'carro arquivado', 'carros arquivados') + ': veja em <a href="#ajustes">Ajustes</a>.</p>';
    tela.innerHTML = h;
    if ($('#busca-carro')) $('#busca-carro').addEventListener('input', function () {
      var t = this.value.trim().toLowerCase(), algum = false;
      $$('[data-carro]').forEach(function (b) { var ok = !t || b.getAttribute('data-nome').indexOf(t) >= 0; b.hidden = !ok; algum = algum || ok; });
      $('#busca-vazia').hidden = algum;
    });
  }

  // "Trocar carro" no Histórico e nos Relatórios: lista curta numa janela; continua na mesma tela.
  function trocarCarro() {
    var ativos = carrosAtivos();
    var acoes = {};
    var lista = ativos.map(function (c, k) {
      acoes['c' + k] = function () {
        estado.carroAtual = c.id; salvar();
        var r = rotaAtual().nome;
        if (r === 'painel') ir('painel/' + encodeURIComponent(c.id), true); else desenhar();
      };
      return '<button class="opcao-carro' + (c.id === estado.carroAtual ? ' atual' : '') + '" data-janela="c' + k + '" style="--tom:' + tom(c.cor) + '">' +
        '<span class="ponto-carro" aria-hidden="true"></span><span>' + esc(c.nome) +
        (descricaoCarro(c) ? '<small>' + esc(descricaoCarro(c)) + '</small>' : '') + '</span>' +
        (c.id === estado.carroAtual ? '<em>atual</em>' : '') + '</button>';
    }).join('');
    abrirJanela('<h2>Qual carro mostrar?</h2><div class="lista-trocar">' + lista + '</div>' +
      '<button class="botao botao-secundario" data-janela="cancelar">Cancelar</button>', acoes);
  }

  function telaPainel(id) {
    var escolhido = carroPorId(id);
    if (escolhido && escolhido.arquivado) { ir('arquivo/' + encodeURIComponent(id), true); return; }
    if (!escolhido) { ir('inicio', true); return; }
    if (estado.carroAtual !== id) { estado.carroAtual = id; salvar(); montarMoldura('painel'); }
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

    // Quadro de instrumentos: quilometragem (odômetro) e consumo recente.
    h += '<section class="quadro" aria-label="Números do carro" style="--tom:' + tom(carro.cor) + '">' +
      '<div class="quadro-item"><span class="info-rotulo">Quilometragem atual</span>' +
      (r.km !== null ? '<span class="info-valor">' + odometro(r.km, carro.id) + '</span><span class="info-extra">Último número anotado</span>'
        : '<span class="info-valor">—</span><span class="info-extra">Aparece depois do primeiro registro.</span>') + '</div>' +
      '<div class="quadro-item"><span class="info-rotulo">Consumo recente</span>' +
      (r.recente ? '<span class="info-valor">' + C.fmtNum(r.recente.kmPorLitro, 1) + ' <small>km/L</small></span>' +
        '<span class="info-extra">Anda ' + C.fmtNum(r.recente.kmPorLitro, 1) + ' km com 1 litro. Custo de ' + C.fmtDinheiro(r.recente.custoPorKm) + ' por km.</span>'
        : '<span class="info-valor">—</span><span class="info-extra">Ainda não dá para calcular: são necessários pelo menos 2 abastecimentos com tanque cheio.</span>') +
      '</div></section>';

    h += '<div class="acoes-principais">' +
      '<a class="botao botao-carro botao-grande acao-registro" href="#abastecer">' + ICONES.bomba + '<span>Registrar abastecimento</span></a>' +
      '<a class="botao botao-secundario botao-grande acao-registro" href="#manutencao">' + ICONES.chave + '<span>Registrar manutenção</span></a></div>';

    h += '<div class="grade">';

    h += '<div class="cartao"><span class="info-rotulo">Gasto com combustível em ' + C.fmtMes(mes).split(' de ')[0].toLowerCase() + '</span>' +
      '<span class="info-valor">' + C.fmtDinheiro(gastoMes) + '</span>' +
      '<span class="info-extra">' + (doMes.length ? C.plural(doMes.length, 'abastecimento', 'abastecimentos') : 'Nenhum abastecimento neste mês') +
      (manutMes ? '. Mais ' + C.fmtDinheiro(manutMes) + ' em manutenção.' : '') + '</span></div>';

    h += '<div class="cartao"><span class="info-rotulo">Último abastecimento</span>';
    if (ultimo) {
      h += '<span class="info-valor">' + C.fmtDinheiro(ultimo.valor) + '</span><span class="info-extra">em ' + C.fmtData(ultimo.data) +
        ' • ' + C.fmtNum(ultimo.litros, 2) + ' ' + C.unidadeCombustivel(ultimo.combustivel) + (ultimo.combustivel ? ' • ' + esc(ultimo.combustivel) : '') + '</span>' +
        '<span class="info-preco"><span>' + esc(C.rotuloPreco(ultimo.combustivel)) + '</span><strong>' + C.fmtDinheiro(ultimo.precoLitro) +
        '<small>/' + C.unidadeCombustivel(ultimo.combustivel) + '</small></strong></span>';
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
    return '<div class="carro-do-registro" aria-live="polite">' + texto + '<strong>' + esc(carro.nome) + '</strong>' +
      (descricaoCarro(carro) ? esc(descricaoCarro(carro)) : '') + '</div>';
  }

  function telaAbastecer(id) {
    var carro = carroAtual();
    var reg = id ? estado.abastecimentos.filter(function (a) { return a.id === id; })[0] : null;
    if (id && !reg) { ir('historico', true); return; }
    if (reg && carroArquivado(reg.carroId)) { avisarArquivado(reg.carroId); return; }
    if (!carro) { ir('inicio', true); return; }
    if (reg && reg.carroId !== carro.id) { estado.carroAtual = reg.carroId; carro = carroAtual(); montarMoldura('abastecer'); }

    var outros = abastDoCarro(carro.id).filter(function (a) { return !reg || a.id !== reg.id; });
    var ord = C.ordenarAbastecimentos(outros);
    var ultimo = ord[ord.length - 1];
    var combustivelPadrao = reg ? reg.combustivel : (ultimo ? ultimo.combustivel : '');
    var hoje = C.hojeISO();

    var h = '<div class="titulo-tela"><h1>' + (reg ? 'Corrigir abastecimento' : 'Novo abastecimento') + '</h1></div>';
    h += cabecalhoCarroRegistro(carro, reg ? 'Abastecimento do carro:' : 'Este abastecimento será salvo no carro:');
    h += '<form id="form-abast" novalidate><div id="erros"></div>';

    h += CampoData.html({ id: 'data', rotulo: 'Data', valor: reg ? reg.data : hoje, max: hoje });

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

    h += '<div class="preco-ao-vivo" id="preco-ao-vivo" aria-live="polite"></div>';
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

    h += '<button class="botao botao-carro botao-grande" type="submit">Salvar abastecimento</button>';
    h += '<button class="botao botao-secundario" type="button" data-acao="voltar-form">Cancelar</button>';
    if (reg) h += '<button class="botao botao-perigo" type="button" data-acao="apagar-abast" data-id="' + esc(reg.id) + '">Apagar este abastecimento</button>';
    h += '</form>';
    tela.innerHTML = h;

    function atualizarAoVivo() {
      var l = C.lerNumero($('#litros').value), v = C.lerNumero($('#valor').value);
      var km = C.lerNumero($('#km').value, true);
      var dist = $('#distancia') ? C.lerNumero($('#distancia').value, true) : null;
      var partes = [];
      var comb = ($('input[name=combustivel]:checked') || {}).value || '';
      var preco = C.precoPorLitro(v, l);
      $('#preco-ao-vivo').innerHTML = preco !== null
        ? '<span class="preco-rotulo">' + esc(C.rotuloPreco(comb)) + '</span><strong class="preco-valor">' + C.fmtDinheiro(preco) + '<small>/' + C.unidadeCombustivel(comb) + '</small></strong>' +
          '<span class="preco-conta">' + C.fmtDinheiro(v) + ' ÷ ' + C.fmtNum(l, 2) + ' ' + (comb === 'GNV' ? 'm³' : 'litros') + '</span>'
        : '<span class="preco-rotulo">' + esc(C.rotuloPreco(comb)) + '</span><span class="preco-espera">Aparece aqui quando você preencher os litros e o valor total. É calculado sozinho: valor ÷ litros.</span>';
      var ant = null;
      var data = $('#data').value || hoje;
      var antes = ord.filter(function (a) { return a.data <= data; });
      ant = antes[antes.length - 1];
      if (ant && km !== null && km >= ant.km) partes.push('Andou <strong>' + C.fmtKm(km - ant.km) + '</strong> desde o abastecimento anterior.');
      else if (ant && km === null && dist !== null) partes.push('A quilometragem ficará em <strong>' + C.fmtKm(ant.km + dist) + '</strong>.');
      $('#ao-vivo').innerHTML = partes.join('<br>');
      $('#ao-vivo').hidden = !partes.length;
    }
    $$('#form-abast input').forEach(function (i) { i.addEventListener('input', atualizarAoVivo); i.addEventListener('change', atualizarAoVivo); });
    atualizarAoVivo();

    $('#form-abast').addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (carroArquivado(carro.id)) return mostrarErros(['Este carro foi arquivado. Reative-o em Ajustes para anotar abastecimentos.']);
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
      var gravar = function () {
        Dados.gravar('abastecimentos', registro);
        salvar(true);
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
    abrirJanela(marca('aviso') + '<h2>Algo parece diferente</h2>' +
      '<p>Antes de salvar, confira:</p>' + caixa('aviso', '', avisos) +
      '<button class="botao botao-principal" data-janela="corrigir">Voltar e corrigir</button>' +
      '<button class="botao botao-secundario" data-janela="salvar">Está certo, salvar assim</button>',
      { salvar: aoSalvar });
  }

  function mostrarResultadoAbastecimento(registro, editado) {
    var an = C.analisarAbastecimentos(abastDoCarro(registro.carroId));
    var a = an.filter(function (x) { return x.id === registro.id; })[0];
    var itens = [];
    var un = C.unidadeCombustivel(a.combustivel);
    var resumo = '<dl class="resumo-abastecimento">' +
      '<div><dt>Valor total</dt><dd>' + C.fmtDinheiro(a.valor) + '</dd></div>' +
      '<div><dt>' + (un === 'm³' ? 'Quantidade' : 'Litros') + '</dt><dd>' + C.fmtNum(a.litros, 2) + ' ' + un + '</dd></div>' +
      '<div class="destaque-preco"><dt>' + esc(C.rotuloPreco(a.combustivel)) + '</dt><dd>' + C.fmtDinheiro(a.precoLitro) + '<small>/' + un + '</small></dd></div></dl>';
    itens.push('Em ' + C.fmtData(a.data) + (a.combustivel ? ' • ' + esc(a.combustivel) : ''));
    if (a.kmDesdeAnterior !== null) itens.push('Andou <strong>' + C.fmtKm(a.kmDesdeAnterior) + '</strong> desde o abastecimento anterior.');
    if (a.trecho) {
      itens.push('Consumo: <strong>' + C.fmtNum(a.trecho.kmPorLitro, 1) + ' km por litro</strong>' +
        (a.trecho.abastecimentos > 1 ? ' (somando ' + a.trecho.abastecimentos + ' abastecimentos desde o último tanque cheio)' : '') + '.');
      itens.push('Custo: <strong>' + C.fmtDinheiro(a.trecho.custoPorKm) + ' por km</strong> rodado.');
    } else {
      itens.push('' + explicarSemConsumo(a.semConsumo));
    }
    if (a.variacaoPreco) {
      var vr = a.variacaoPreco.reais;
      itens.push(Math.abs(vr) < 0.005 ? 'O ' + C.rotuloPreco(a.combustivel, true) + ' ficou igual ao do abastecimento anterior.'
        : 'Comparado ao abastecimento anterior, o preço ' + (vr > 0 ? 'subiu ' : 'baixou ') + '<strong>' + C.fmtDinheiro(Math.abs(vr)) + '</strong> por ' + (un === 'm³' ? 'm³' : 'litro') +
          ' (' + C.fmtNum(Math.abs(a.variacaoPreco.pct), 1) + '% ' + (vr > 0 ? 'mais caro' : 'mais barato') + ').');
    }

    abrirJanela(marca('ok') + '<h2>' + (editado ? 'Abastecimento corrigido!' : 'Abastecimento salvo!') + '</h2>' +
      '<p>No carro <strong>' + esc(carroPorId(registro.carroId).nome) + '</strong>.</p>' + resumo +
      '<ul class="resultado">' + itens.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>' +
      '<button class="botao botao-principal botao-grande" data-janela="ok">OK</button>',
      { ok: function () { ir(editado ? 'historico' : 'painel/' + encodeURIComponent(registro.carroId), true); } });
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
    if (carroArquivado(a.carroId)) { avisarArquivado(a.carroId); return; }
    confirmar({
      icone: '', titulo: 'Apagar este abastecimento?', perigo: true,
      texto: 'Abastecimento de <strong>' + C.fmtData(a.data) + '</strong>, ' + C.fmtNum(a.litros, 2) + ' litros, ' + C.fmtDinheiro(a.valor) +
        ', no carro <strong>' + esc((carroPorId(a.carroId) || {}).nome) + '</strong>.<br>Isso não pode ser desfeito.',
      sim: 'Sim, apagar', nao: 'Não, manter',
      aoConfirmar: function () {
        Dados.apagar('abastecimentos', id);
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
    if (reg && carroArquivado(reg.carroId)) { avisarArquivado(reg.carroId); return; }
    if (!carro) { ir('inicio', true); return; }
    if (reg && reg.carroId !== carro.id) { estado.carroAtual = reg.carroId; carro = carroAtual(); montarMoldura('manutencao'); }
    var r = resumoCarro(carro);
    var hoje = C.hojeISO();
    var tipo = reg ? reg.tipo : '';

    var h = '<div class="titulo-tela"><h1>' + (reg ? 'Corrigir manutenção' : 'Nova manutenção') + '</h1></div>';
    h += cabecalhoCarroRegistro(carro, reg ? 'Manutenção do carro:' : 'Esta manutenção será salva no carro:');
    h += '<form id="form-manut" novalidate><div id="erros"></div>';

    h += '<div class="campo"><span class="rotulo" id="rot-tipo">O que foi feito?</span><div class="opcoes tipos" role="radiogroup" aria-labelledby="rot-tipo">' +
      TIPOS_ORDEM.map(function (t) {
        return '<label class="opcao"><input type="radio" name="tipo" value="' + t + '"' + (tipo === t ? ' checked' : '') + '><span>' +
          (t === 'outro' ? 'Outra coisa' : C.TIPOS[t].nome) + '</span></label>';
      }).join('') + '</div></div>';

    h += '<div class="campo" id="campo-descricao" hidden><label for="descricao">Qual manutenção?</label>' +
      '<input type="text" id="descricao" maxlength="60" value="' + esc(reg ? reg.descricao : '') + '" placeholder="Ex.: troca do filtro de ar"></div>';

    h += CampoData.html({ id: 'data', rotulo: 'Data', valor: reg ? reg.data : hoje, max: hoje });

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
      CampoData.html({ id: 'lembreteData', rotulo: 'Ou avisar em qual data?', opcional: true, min: hoje, valor: reg && reg.lembreteData ? reg.lembreteData : '',
        dica: 'Digite como 05/11/2027 ou toque no calendário.' }) +
      '</details></div>';

    h += campoNumero('valorManut', 'Quanto custou', reg && reg.valor ? textoNumero(reg.valor, 2) : '', 'R$', 'Exemplo: 180,00', { prefixo: true, opcional: true, placeholder: '0,00' });

    h += '<div class="campo"><label for="obs">Observações <span class="opcional">(opcional)</span></label>' +
      '<textarea id="obs" maxlength="300" placeholder="Ex.: óleo 5W30, oficina do Zé">' + esc(reg ? reg.obs : '') + '</textarea></div>';

    h += '<button class="botao botao-carro botao-grande" type="submit">Salvar manutenção</button>';
    h += '<button class="botao botao-secundario" type="button" data-acao="voltar-form">Cancelar</button>';
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
      if (carroArquivado(carro.id)) return mostrarErros(['Este carro foi arquivado. Reative-o em Ajustes para anotar manutenções.']);
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
      var gravar = function () {
        Dados.gravar('manutencoes', registro);
        salvar(true);
        var res = resumoCarro(carro);
        var lemb = res.lembretes.filter(function (l) { return l.ultima && l.ultima.id === registro.id; })[0];
        var itens = ['' + C.fmtData(registro.data) + ' com ' + C.fmtKm(registro.km) + (registro.valor ? ' • ' + C.fmtDinheiro(registro.valor) : '')];
        if (lemb) itens.push('' + esc(lemb.mensagem));
        else if (registro.tipo !== 'oleo') itens.push('Nenhum lembrete foi definido para a próxima vez.');
        abrirJanela(marca('ok') + '<h2>' + (reg ? 'Manutenção corrigida!' : 'Manutenção salva!') + '</h2>' +
          '<p><strong>' + esc(C.nomeManutencao(registro)) + '</strong> no carro <strong>' + esc(carro.nome) + '</strong>.</p>' +
          '<ul class="resultado">' + itens.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>' +
          '<button class="botao botao-principal botao-grande" data-janela="ok">OK</button>',
          { ok: function () { ir(reg ? 'historico' : 'painel/' + encodeURIComponent(carro.id), true); } });
      };
      if (v.avisos.length) confirmarAvisos(v.avisos, gravar);
      else gravar();
    });
  }

  function apagarManutencao(id) {
    var m = estado.manutencoes.filter(function (x) { return x.id === id; })[0];
    if (!m) return;
    if (carroArquivado(m.carroId)) { avisarArquivado(m.carroId); return; }
    confirmar({
      icone: '', titulo: 'Apagar esta manutenção?', perigo: true,
      texto: '<strong>' + esc(C.nomeManutencao(m)) + '</strong> de ' + C.fmtData(m.data) + ', no carro <strong>' +
        esc((carroPorId(m.carroId) || {}).nome) + '</strong>.<br>Isso não pode ser desfeito.',
      sim: 'Sim, apagar', nao: 'Não, manter',
      aoConfirmar: function () {
        Dados.apagar('manutencoes', id);
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
    if (!carro) { ir('inicio', true); return; }
    historico(carro, false, '<h1>Histórico</h1>' + linhaDoCarro(carro));
  }

  // Histórico de um carro arquivado: somente leitura (sem registrar, corrigir ou apagar).
  function telaArquivo(id) {
    var carro = carroPorId(id);
    if (!carro) { ir('ajustes', true); return; }
    if (!carro.arquivado) { estado.carroAtual = carro.id; sessao.escolheuCarro = true; ir('historico', true); return; }
    var cab = '<p><button type="button" class="link-botao" data-acao="voltar">← Voltar</button></p>' +
      '<div class="arquivo-cabecalho" style="--tom:' + tom(carro.cor) + '">' +
      '<p class="arquivo-nome"><span class="ponto-carro" aria-hidden="true"></span>' + esc(carro.nome) + '</p>' +
      '<p class="legenda-simples">Carro arquivado' + (carro.arquivadoEm ? ' em ' + C.fmtData(C.dataISO(new Date(carro.arquivadoEm))) : '') +
      '. Este histórico é <strong>somente leitura</strong>: para anotar ou corrigir algo, reative o carro.</p>' +
      '<button class="botao botao-secundario" type="button" data-acao="reativar-carro" data-id="' + esc(carro.id) + '">Reativar este carro</button></div>' +
      '<h1>Histórico</h1>';
    historico(carro, true, cab);
  }

  // Linha logo abaixo do título: de qual carro é esta tela, com atalho para trocar.
  function linhaDoCarro(carro) {
    return '<p class="carro-da-tela" style="--tom:' + tom(carro.cor) + '"><span class="ponto-carro" aria-hidden="true"></span>' +
      '<span>Mostrando: <strong>' + esc(carro.nome) + '</strong></span>' +
      (carrosAtivos().length > 1 ? '<button type="button" class="link-botao" data-acao="trocar-carro">Trocar</button>' : '') + '</p>';
  }

  function historico(carro, somenteLeitura, cabecalho) {
    var r = resumoCarro(carro);
    var hoje = C.hojeISO();
    var de, ate;
    if (sessao.periodoHistorico === 'datas') { de = sessao.deHistorico || null; ate = sessao.ateHistorico || null; }
    else { de = inicioPeriodo(sessao.periodoHistorico, hoje); ate = null; }

    var h = cabecalho;
    h += '<div class="abas" role="group" aria-label="O que mostrar">' +
      '<button type="button" data-aba="abastecimentos" aria-pressed="' + (sessao.abaHistorico === 'abastecimentos') + '">Abastecimentos</button>' +
      '<button type="button" data-aba="manutencoes" aria-pressed="' + (sessao.abaHistorico === 'manutencoes') + '">Manutenções</button></div>';
    h += botoesFiltro([['30', 'Últimos 30 dias'], ['90', '3 meses'], ['365', '12 meses'], ['tudo', 'Tudo'], ['datas', 'Escolher datas']], sessao.periodoHistorico, 'periodo');
    if (sessao.periodoHistorico === 'datas') {
      h += '<div class="datas-filtro">' + CampoData.html({ id: 'de', rotulo: 'De', valor: sessao.deHistorico, dica: 'dd/mm/aaaa' }) +
        CampoData.html({ id: 'ate', rotulo: 'Até', valor: sessao.ateHistorico, dica: 'dd/mm/aaaa' }) + '</div>';
    }

    if (sessao.abaHistorico === 'abastecimentos') {
      var lista = r.analise.filter(function (a) { return dentroDoPeriodo(a.data, de, ate); }).reverse();
      if (lista.length) {
        var total = 0, litros = 0, km = 0, dist = 0, lt = 0;
        lista.forEach(function (a) {
          total += a.valor; litros += a.litros; if (a.kmDesdeAnterior) km += a.kmDesdeAnterior;
          if (a.trecho) { dist += a.trecho.distancia; lt += a.trecho.litros; }
        });
        h += '<div class="resumo-periodo"><p class="resumo-titulo"><strong>' + C.plural(lista.length, 'abastecimento', 'abastecimentos') + '</strong> no período</p>' +
          '<dl class="numeros"><div><dt>Total gasto</dt><dd>' + C.fmtDinheiro(total) + '</dd></div>' +
          '<div><dt>Litros</dt><dd>' + C.fmtNum(litros, 1) + ' L</dd></div>' +
          (precoMedioDoPeriodo(lista)) +
          (lt ? '<div><dt>Consumo médio</dt><dd>' + C.fmtNum(dist / lt, 1) + ' km/L</dd></div>' : '') +
          (km ? '<div><dt>Rodados</dt><dd>' + C.fmtKm(km) + '</dd></div>' : '') + '</dl></div>';
        lista.forEach(function (a) { h += htmlAbastecimento(a, somenteLeitura); });
      } else {
        h += vazio('', r.abastecimentos.length ? 'Nenhum abastecimento neste período. Tente “Tudo”.' : 'Nenhum abastecimento registrado ainda.');
      }
      if (!somenteLeitura) h += '<a class="botao botao-carro" href="#abastecer">Registrar abastecimento</a>';
    } else {
      var ms = r.manutencoes.filter(function (m) { return dentroDoPeriodo(m.data, de, ate); }).sort(function (a, b) {
        if (a.data !== b.data) return a.data < b.data ? 1 : -1;
        return b.km - a.km;
      });
      if (ms.length) {
        var gasto = ms.reduce(function (s, m) { return s + (m.valor || 0); }, 0);
        h += '<div class="resumo-periodo"><p class="resumo-titulo"><strong>' + C.plural(ms.length, 'manutenção', 'manutenções') + '</strong> no período</p>' +
          (gasto ? '<dl class="numeros"><div><dt>Total gasto</dt><dd>' + C.fmtDinheiro(gasto) + '</dd></div></dl>' : '') + '</div>';
        ms.forEach(function (m) { h += htmlManutencao(m, somenteLeitura); });
      } else {
        h += vazio('', r.manutencoes.length ? 'Nenhuma manutenção neste período. Tente “Tudo”.' : 'Nenhuma manutenção registrada ainda.');
      }
      if (!somenteLeitura) h += '<a class="botao botao-carro" href="#manutencao">Registrar manutenção</a>';
    }
    tela.innerHTML = h;

    $$('[data-aba]').forEach(function (b) { b.addEventListener('click', function () { sessao.abaHistorico = b.getAttribute('data-aba'); desenhar(); }); });
    $$('[data-periodo]').forEach(function (b) { b.addEventListener('click', function () { sessao.periodoHistorico = b.getAttribute('data-periodo'); desenhar(); }); });
    if ($('#de')) {
      $('#de').addEventListener('change', function () { sessao.deHistorico = this.value; desenhar(); });
      $('#ate').addEventListener('change', function () { sessao.ateHistorico = this.value; desenhar(); });
    }
  }

  // Preço médio do período (soma dos valores ÷ soma dos litros), só quando há um único combustível:
  // misturar gasolina e etanol daria um número enganoso. A comparação por tipo fica nos Relatórios.
  function precoMedioDoPeriodo(lista) {
    var tipos = {};
    lista.forEach(function (a) { if (a.combustivel) tipos[a.combustivel] = true; });
    var nomes = Object.keys(tipos);
    if (nomes.length > 1) return '';
    var v = 0, l = 0;
    lista.forEach(function (a) { v += a.valor; l += a.litros; });
    return l > 0 ? '<div><dt>Preço médio (' + C.rotuloPreco(nomes[0], true) + ')</dt><dd>' + C.fmtDinheiro(v / l) + '</dd></div>' : '';
  }

  function vazio(icone, texto) {
    return '<div class="vazio"><p>' + esc(texto) + '</p></div>';
  }

  function htmlAbastecimento(a, somenteLeitura) {
    var calc = [];
    if (a.kmDesdeAnterior !== null) calc.push('Andou ' + C.fmtKm(a.kmDesdeAnterior));
    if (a.trecho) calc.push('<strong>' + C.fmtNum(a.trecho.kmPorLitro, 1) + ' km/L</strong>', C.fmtDinheiro(a.trecho.custoPorKm) + '/km');
    var calcTxt = calc.join(' • ');
    if (!a.trecho) calcTxt += (calcTxt ? '<br>' : '') + '<span class="legenda-simples">' +
      (a.semConsumo === 'naoCheio' ? 'Tanque não completado: o consumo entra no próximo tanque cheio.' :
        a.semConsumo === 'primeiroCheio' ? 'Primeiro tanque cheio: ainda sem consumo.' : 'Sem cálculo de consumo.') + '</span>';
    var variacao = '';
    if (a.variacaoPreco && Math.abs(a.variacaoPreco.reais) >= 0.005) {
      variacao = '<span class="variacao variacao-' + (a.variacaoPreco.reais > 0 ? 'alta' : 'baixa') + '">' + (a.variacaoPreco.reais > 0 ? '▲ ' : '▼ ') + C.fmtNum(Math.abs(a.variacaoPreco.pct), 1) + '% ' +
        (a.variacaoPreco.reais > 0 ? 'mais caro' : 'mais barato') + '</span>';
    }
    var un = C.unidadeCombustivel(a.combustivel);
    return '<div class="cartao registro">' + '<span class="registro-icone registro-abast">' + ICONES.bomba + '</span><div class="registro-corpo">' +
      '<div class="linha-topo"><span class="data">' + C.fmtData(a.data) + '</span><span class="valor">' + C.fmtDinheiro(a.valor) + '</span></div>' +
      '<p class="detalhes">' + C.fmtKm(a.km) + ' • ' + C.fmtNum(a.litros, 2) + ' ' + un +
      (a.combustivel ? ' • ' + esc(a.combustivel) : '') + (a.tanqueCheio === false ? ' <span class="etiqueta">não completou</span>' : '') + '</p>' +
      '<p class="preco-linha"><span class="preco-chip" title="' + esc(C.rotuloPreco(a.combustivel)) + '"><span class="sr">' + esc(C.rotuloPreco(a.combustivel)) + ': </span>' +
      C.fmtDinheiro(a.precoLitro) + '<small>/' + un + '</small></span>' + variacao + '</p>' +
      '<p class="calc">' + calcTxt + '</p>' +
      (a.obs ? '<p class="obs">' + esc(a.obs) + '</p>' : '') +
      (somenteLeitura ? '' : '<div class="acoes"><a class="botao botao-secundario" href="#abastecer/' + encodeURIComponent(a.id) + '">Corrigir</a>' +
      '<button class="botao botao-perigo" type="button" data-acao="apagar-abast" data-id="' + esc(a.id) + '">Apagar</button></div>') + '</div></div>';
  }

  function htmlManutencao(m, somenteLeitura) {
    var lemb = [];
    if (m.lembreteKm) lemb.push('daqui a ' + C.fmtKm(m.lembreteKm) + ' (com ' + C.fmtKm(m.km + m.lembreteKm) + ')');
    if (m.lembreteData) lemb.push('em ' + C.fmtData(m.lembreteData));
    return '<div class="cartao registro">' + '<span class="registro-icone registro-manut">' + ICONES.chave + '</span><div class="registro-corpo">' +
      '<div class="linha-topo"><span class="data">' + C.fmtData(m.data) + '</span>' + (m.valor ? '<span class="valor">' + C.fmtDinheiro(m.valor) + '</span>' : '') + '</div>' +
      '<p class="detalhes"><strong>' + esc(C.nomeManutencao(m)) + '</strong> • ' + C.fmtKm(m.km) + '</p>' +
      (lemb.length ? '<p class="calc">Lembrete: ' + lemb.join(' ou ') + '</p>' : '') +
      (m.obs ? '<p class="obs">' + esc(m.obs) + '</p>' : '') +
      (somenteLeitura ? '' : '<div class="acoes"><a class="botao botao-secundario" href="#manutencao/' + encodeURIComponent(m.id) + '">Corrigir</a>' +
      '<button class="botao botao-perigo" type="button" data-acao="apagar-manut" data-id="' + esc(m.id) + '">Apagar</button></div>') + '</div></div>';
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

    var h = '<h1>Relatórios</h1>' + linhaDoCarro(carro);
    h += botoesFiltro([['6', 'Últimos 6 meses'], ['12', '12 meses'], ['tudo', 'Tudo']], p, 'rel');

    if (!r.abastecimentos.length) {
      h += vazio('', 'Os relatórios aparecem depois que houver abastecimentos registrados.');
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

    h += '<div class="cartao"><h2>Gasto com combustível por mês</h2>';
    h += '<p>Total no período: <strong>' + C.fmtDinheiro(totalGasto) + '</strong>' +
      (mesesComGasto ? '<br>Média: <strong>' + C.fmtDinheiro(totalGasto / meses.length) + '</strong> por mês' : '') + '</p>';
    h += barras(itensGasto, maxGasto, false) + '</div>';

    // ---- Consumo por mês
    var consumos = {};
    C.consumoPorMes(r.analise).forEach(function (c) { consumos[c.mes] = c; });
    var itensCons = meses.filter(function (m) { return consumos[m]; }).map(function (m) {
      return { mes: m, rotulo: C.fmtMes(m, true), valor: consumos[m].kmPorLitro, texto: C.fmtNum(consumos[m].kmPorLitro, 1) + ' km/L', c: consumos[m] };
    });
    h += '<div class="cartao"><h2>Consumo médio ao longo do tempo</h2>';
    if (itensCons.length) {
      var dist = 0, lit = 0;
      itensCons.forEach(function (i) { dist += i.c.distancia; lit += i.c.litros; });
      var media = dist / lit;
      var melhor = itensCons.slice().sort(function (a, b) { return b.valor - a.valor; })[0];
      var pior = itensCons.slice().sort(function (a, b) { return a.valor - b.valor; })[0];
      h += '<p>Neste período o carro fez em média <strong>' + C.fmtNum(media, 1) + ' km por litro</strong>.</p>';
      h += '<p class="legenda-simples">Quanto <strong>maior</strong> o número, <strong>mais econômico</strong> (anda mais com cada litro).</p>';
      if (itensCons.length > 1) {
        h += '<p>Melhor mês: <strong>' + esc(C.fmtMes(melhor.mes)) + '</strong> (' + melhor.texto + ')<br>' +
          'Pior mês: <strong>' + esc(C.fmtMes(pior.mes)) + '</strong> (' + pior.texto + ')</p>';
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
      h += '<p class="legenda-simples">Cada barra é a média do mês (km rodados ÷ litros). A barra mais forte é o mês mais recente.</p>';

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

    // ---- Preço por litro (separado por combustível: gasolina e etanol não se misturam)
    var grupos = C.precoPorCombustivel(r.abastecimentos.filter(function (a) { return a.data.slice(0, 7) >= mesInicio; }));
    if (grupos.length) {
      h += '<div class="cartao"><h2>Preço por litro</h2><p class="legenda-simples">Calculado em cada abastecimento: valor pago ÷ litros. A média do período soma os valores e divide pela soma dos litros.</p>';
      grupos.forEach(function (g) {
        var un = C.unidadeCombustivel(g.combustivel);
        var dp = g.abastecimentos > 1 ? (g.ultimo.precoLitro - g.primeiro.precoLitro) / g.primeiro.precoLitro * 100 : null;
        h += '<div class="preco-grupo"><h3>' + esc(g.combustivel || 'Combustível não informado') + ' <span class="legenda-simples">' + C.plural(g.abastecimentos, 'abastecimento', 'abastecimentos') + '</span></h3>' +
          '<dl class="numeros numeros-claros"><div><dt>Último (' + C.fmtData(g.ultimo.data) + ')</dt><dd>' + C.fmtDinheiro(g.ultimo.precoLitro) + '<small>/' + un + '</small></dd></div>' +
          '<div><dt>Média do período</dt><dd>' + C.fmtDinheiro(g.precoMedio) + '<small>/' + un + '</small></dd></div>' +
          (dp !== null ? '<div><dt>Primeiro (' + C.fmtData(g.primeiro.data) + ')</dt><dd>' + C.fmtDinheiro(g.primeiro.precoLitro) + '<small>/' + un + '</small></dd></div>' : '') + '</dl>' +
          (dp !== null ? '<p>' + (Math.abs(dp) < 0.5 ? 'O preço ficou praticamente igual no período.' : 'Do primeiro ao último abastecimento, o ' + (un === 'm³' ? 'm³' : 'litro') + ' ficou <strong>' +
            C.fmtNum(Math.abs(dp), 1) + '% ' + (dp > 0 ? 'mais caro' : 'mais barato') + '</strong>.') + '</p>' : '') + '</div>';
      });
      h += '</div>';
    }

    // ---- Manutenção
    var manutPeriodo = r.manutencoes.filter(function (m) { return m.data.slice(0, 7) >= mesInicio && m.valor; });
    if (manutPeriodo.length) {
      var tm = manutPeriodo.reduce(function (s, m) { return s + m.valor; }, 0);
      h += '<div class="cartao"><h2>Gasto com manutenção</h2><p>Total no período: <strong>' + C.fmtDinheiro(tm) + '</strong> em ' +
        C.plural(manutPeriodo.length, 'serviço', 'serviços') + '.</p></div>';
    }

    tela.innerHTML = h;
    ligarFiltroRel();
  }
  function ligarFiltroRel() {
    $$('[data-rel]').forEach(function (b) { b.addEventListener('click', function () { sessao.periodoRelatorio = b.getAttribute('data-rel'); desenhar(); }); });
  }

  // =====================================================================
  // Tela: Postos (preços da ANP; consulta separada do histórico da família)
  //  - Nada aqui grava abastecimentos nem dados da família.
  //  - A localização é pedida só ao tocar em "Buscar postos", uma vez, e fica só na memória.
  //  - Os dados vêm de arquivos estáticos (postos/…) gerados toda semana a partir da ANP e do IBGE.
  // =====================================================================
  var PostosDados = { indice: undefined, municipios: {}, ceps: {} };
  function baixarJSON(caminho) {
    return fetch(caminho, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) { var e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
      return r.json();
    });
  }
  function carregarIndicePostos() {
    if (PostosDados.indice !== undefined) return Promise.resolve(PostosDados.indice);
    return baixarJSON('postos/indice.json').then(function (d) { PostosDados.indice = d; return d; })
      .catch(function (e) { PostosDados.erroIndice = e; PostosDados.indice = null; return null; });
  }
  function carregarMunicipio(c) {
    if (PostosDados.municipios[c]) return Promise.resolve(PostosDados.municipios[c]);
    return baixarJSON('postos/municipios/' + c + '.json').then(function (d) { PostosDados.municipios[c] = d; return d; });
  }
  function estadoPostos() {
    if (!sessao.postos) {
      var carro = carroAtual();
      var ab = carro ? C.ordenarAbastecimentos(abastDoCarro(carro.id)) : [];
      var ultimo = ab[ab.length - 1];
      var cheios = ab.filter(function (a) { return a.tanqueCheio !== false; }).slice(-5);
      var media = carro ? C.consumoMedio(C.analisarAbastecimentos(abastDoCarro(carro.id))) : null;
      sessao.postos = {
        produto: Postos.produtoDoCombustivel(ultimo && ultimo.combustivel), onde: 'local', texto: '', raio: 5,
        ordem: 'preco', soBandeira: false,
        litros: cheios.length ? Math.round(cheios.reduce(function (s, a) { return s + a.litros; }, 0) / cheios.length) : '',
        kmL: media ? Math.round(media.kmPorLitro * 10) / 10 : '',
        carroNome: carro ? carro.nome : '', resultado: null, buscando: false, erro: null
      };
    }
    return sessao.postos;
  }
  function fmtKmCurto(km) {
    var m = Math.round(km * 100) * 10;          // metros, de 10 em 10
    if (m < 10) return 'menos de 10 m';
    return m < 1000 ? C.fmtNum(m) + ' m' : C.fmtNum(km, km < 9.95 ? 1 : 0) + ' km';
  }

  function telaPostos() {
    var st = estadoPostos();
    if (PostosDados.indice === undefined) {
      tela.innerHTML = '<header class="cabecalho-tela"><h1>Postos</h1></header><p class="carregando">Carregando os preços da ANP…</p>';
      carregarIndicePostos().then(function () { if (rotaAtual().nome === 'postos') desenhar(true); });
      return;
    }
    var ind = PostosDados.indice;
    var status = Postos.statusDados(ind, C.hojeISO());
    var prod = Postos.produto(st.produto);
    var h = '<header class="cabecalho-tela"><h1>Postos</h1><p>Compare preços de postos próximos, pesquisados pela ANP.</p></header>';

    if (!ind) {
      h += '<div class="caixa caixa-aviso"><strong>Os preços dos postos não estão disponíveis agora</strong><p style="margin:6px 0 0">' +
        (navigator.onLine === false ? 'O celular está sem internet e os preços ainda não foram guardados neste aparelho.' :
          'Os arquivos com os preços da ANP ainda não foram publicados neste endereço.') + ' Nenhum preço é mostrado sem dados oficiais.</p></div>' +
        fontePostos(null);
      tela.innerHTML = h; return;
    }
    h += avisoDados(ind, status);

    // ---- Formulário de busca
    h += '<form id="form-postos" class="cartao busca-postos" novalidate>' +
      '<div class="campo"><span class="rotulo" id="rot-prod">Combustível</span><div class="opcoes" role="radiogroup" aria-labelledby="rot-prod">' +
      Postos.PRODUTOS.map(function (p) {
        return '<label class="opcao"><input type="radio" name="produto" value="' + p.c + '"' + (st.produto === p.c ? ' checked' : '') + '><span>' + p.nome + '</span></label>';
      }).join('') + '</div></div>' +
      '<div class="campo"><span class="rotulo" id="rot-onde">Onde procurar</span><div class="opcoes duas" role="radiogroup" aria-labelledby="rot-onde">' +
      '<label class="opcao"><input type="radio" name="onde" value="local"' + (st.onde === 'local' ? ' checked' : '') + '><span>Perto de mim</span></label>' +
      '<label class="opcao"><input type="radio" name="onde" value="texto"' + (st.onde === 'texto' ? ' checked' : '') + '><span>Cidade ou CEP</span></label></div>' +
      (st.onde === 'local'
        ? '<span class="dica">A localização do celular é pedida só quando você tocar em “Buscar postos”, uma vez. Ela é usada aqui no aparelho para calcular as distâncias e não é guardada.</span>'
        : '<div class="campo-texto-postos"><label for="busca-postos" class="sr">Cidade ou CEP</label><input type="text" id="busca-postos" list="lista-cidades" autocomplete="off" value="' + esc(st.texto) + '" placeholder="Ex.: Campinas ou 13010-000">' +
          '<datalist id="lista-cidades">' + ind.municipios.map(function (m) { return '<option value="' + esc(m.n + ' - ' + m.uf) + '">'; }).join('') + '</datalist>' +
          '<span class="dica">A ANP pesquisa ' + C.plural(ind.municipios.length, 'cidade', 'cidades') + ' por semana. Com o CEP, as distâncias são calculadas a partir do centro do CEP.</span></div>') +
      '</div>' +
      '<div class="campo"' + (st.onde === 'texto' && !/\d{5}/.test(st.texto) ? ' hidden' : '') + ' id="campo-raio"><span class="rotulo" id="rot-raio">Até que distância</span><div class="opcoes" role="radiogroup" aria-labelledby="rot-raio">' +
      [2, 5, 10, 20].map(function (r) { return '<label class="opcao"><input type="radio" name="raio" value="' + r + '"' + (st.raio === r ? ' checked' : '') + '><span>' + r + ' km</span></label>'; }).join('') +
      '</div><span class="dica">Distância em linha reta.</span></div>' +
      '<button class="botao botao-principal botao-grande" type="submit" id="buscar-postos"' + (st.buscando ? ' disabled' : '') + '>' + ICONES.bomba + (st.buscando ? 'Buscando…' : 'Buscar postos') + '</button>' +
      '</form>';
    h += '<div id="resultado-postos" aria-live="polite">' + (st.erro ? caixa('erro', st.erro) : '') + htmlResultadoPostos(st, prod) + '</div>';
    h += fontePostos(ind);
    tela.innerHTML = h;
    ligarTelaPostos(st);
  }

  function avisoDados(ind, status) {
    var periodo = ind.periodo ? C.fmtData(ind.periodo.inicio) + ' a ' + C.fmtData(ind.periodo.fim) : 'período não informado';
    if (status.nivel === 'atual') return '<p class="selo-dados"><span class="ponto-status" aria-hidden="true"></span><span>Preços pesquisados pela ANP na semana de <strong>' + periodo + '</strong>.</span></p>';
    return '<div class="caixa caixa-aviso"><strong>' + (status.nivel === 'antigo' ? 'Os preços podem estar desatualizados' : 'Os preços estão desatualizados') + '</strong>' +
      '<p style="margin:6px 0 0">A última pesquisa disponível é da semana de ' + periodo + (status.dias !== null ? ' (há ' + C.plural(status.dias, 'dia', 'dias') + ')' : '') +
      '. Os preços podem ter mudado; confira no posto.</p></div>';
  }
  function fontePostos(ind) {
    return '<section class="fonte-postos"><h2>De onde vêm estes dados</h2>' +
      '<p><strong>Preços:</strong> ANP, Levantamento de Preços de Combustíveis (preços por posto revendedor). A pesquisa é <strong>semanal e por amostragem</strong>: nem todos os postos nem todas as cidades são pesquisados, e o preço pode ter mudado depois da coleta. ' +
      '<a href="https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas" target="_blank" rel="noopener">Página oficial da ANP</a></p>' +
      '<p><strong>Localização dos postos:</strong> estimada pelo endereço informado à ANP, com o Cadastro Nacional de Endereços do IBGE (CNEFE 2022). Quando não dá para localizar com segurança, o posto aparece sem distância.</p>' +
      (ind && ind.geradoEm ? '<p class="legenda-simples">Dados preparados em ' + C.fmtData(ind.geradoEm.slice(0, 10)) + '.</p>' : '') +
      '<p class="legenda-simples">Esta consulta não grava nada nos abastecimentos da família.</p></section>';
  }

  function htmlPosto(i, unidade, destaque) {
    var p = i.posto;
    return '<li class="posto' + (destaque ? ' posto-destaque' : '') + '"><div class="posto-topo"><div class="posto-nome"><strong>' + esc(p.n) + '</strong>' +
      '<span class="etiqueta">' + (p.b ? esc(p.b) : 'Sem bandeira') + '</span></div>' +
      '<span class="posto-preco">' + C.fmtDinheiro(i.preco) + '<small>/' + unidade + '</small></span></div>' +
      '<p class="posto-end">' + esc(p.e) + '</p>' +
      '<p class="posto-info">' + (i.distancia !== null ? '<span class="posto-dist">' + (i.aproximada ? '≈ ' : '') + fmtKmCurto(i.distancia) + '</span>' +
        (i.aproximada ? ' <span class="legenda-simples">(localização aproximada, pelo CEP)</span>' : '') + ' • ' : '') +
      'Coletado em ' + C.fmtData(i.data) + '</p></li>';
  }

  function htmlResultadoPostos(st, prod) {
    var r = st.resultado;
    if (!r) return '';
    var res = Postos.montarResultados(r.postos, { produto: st.produto, ponto: r.ponto, raio: st.raio, soBandeira: st.soBandeira });
    var semFiltro = st.soBandeira ? Postos.montarResultados(r.postos, { produto: st.produto, ponto: r.ponto, raio: st.raio }) : res;
    var rec = Postos.recomendar(res.lista, { temPonto: !!r.ponto, litros: st.litros, kmPorLitro: st.kmL });
    var ordem = st.ordem === 'melhor' && !rec.confiavel ? 'preco' : (st.ordem === 'distancia' && !r.ponto ? 'preco' : st.ordem);
    var lista = Postos.ordenar(res.lista, ordem, rec);
    var h = '<section class="resultado-postos"><h2>' + (lista.length ? C.plural(lista.length, 'posto', 'postos') : 'Nenhum posto') + ' com ' + esc(prod.nome) +
      (r.ponto ? ' até ' + st.raio + ' km' : ' em ' + esc(r.descricao)) + '</h2>' +
      '<p class="legenda-simples">' + (r.ponto ? 'Distâncias em linha reta a partir ' + (r.descricao === 'sua localização' ? 'da ' : 'do ') + esc(r.descricao) + '.' : 'Sem ponto de partida, as distâncias não são calculadas. Para comparar distâncias, busque perto de você ou por CEP.') + '</p>';

    if (!semFiltro.lista.length && !semFiltro.semLocalizacao.length) {
      h += '<div class="vazio"><p>' + (r.ponto ? 'A ANP não pesquisou ' + esc(prod.nome.toLowerCase()) + ' em nenhum posto até ' + st.raio + ' km nesta semana.' +
        (st.raio < 20 ? ' Tente uma distância maior.' : '') : 'A ANP não pesquisou ' + esc(prod.nome.toLowerCase()) + ' nesta cidade nesta semana.') +
        ' Isso não quer dizer que não haja postos: a pesquisa é por amostragem.</p></div></section>';
      return h;
    }

    h += '<div class="controles-postos"><div class="filtros" role="group" aria-label="Ordenar por">' +
      [['preco', 'Menor preço', true], ['distancia', 'Menor distância', !!r.ponto], ['melhor', 'Melhor opção', rec.confiavel]].map(function (o) {
        return '<button type="button" data-ordem="' + o[0] + '" aria-pressed="' + (ordem === o[0]) + '"' + (o[2] ? '' : ' disabled') + '>' + o[1] + '</button>';
      }).join('') + '</div>' +
      '<label class="caixa-marcar"><input type="checkbox" id="so-bandeira"' + (st.soBandeira ? ' checked' : '') + '> Só postos com bandeira</label></div>';
    if (st.ordem === 'melhor' && !rec.confiavel) h += '<p class="legenda-simples">“Melhor opção” precisa da distância e do consumo do carro; os postos estão por menor preço.</p>';

    h += htmlRecomendacao(st, rec, prod, !!r.ponto);
    if (lista.length) h += '<ul class="lista-postos">' + lista.map(function (i) { return htmlPosto(i, prod.un, rec.confiavel && rec.compensa && i === rec.melhor.item); }).join('') + '</ul>';
    else h += '<div class="vazio"><p>Nenhum posto com bandeira neste raio. Desligue o filtro para ver os ' + C.plural(semFiltro.lista.length, 'posto', 'postos') + ' sem bandeira.</p></div>';
    if (res.semLocalizacao.length) {
      h += '<details class="mais sem-localizacao"><summary>' + C.plural(res.semLocalizacao.length, 'posto', 'postos') + ' da região sem localização exata</summary>' +
        '<p class="legenda-simples">Não foi possível localizar estes endereços com segurança, então a distância não é mostrada.</p>' +
        '<ul class="lista-postos">' + Postos.ordenar(res.semLocalizacao, 'preco').map(function (i) { return htmlPosto(i, prod.un); }).join('') + '</ul></details>';
    }
    return h + '</section>';
  }

  function htmlRecomendacao(st, rec, prod, temPonto) {
    if (!temPonto) return '';
    var un = prod.un;
    var campos = '<details class="mais conta-postos"' + (rec.confiavel ? '' : ' open') + '><summary>Como a conta é feita</summary>' +
      '<div class="campos-lado">' +
      campoNumero('litros-postos', 'Quanto vai abastecer', st.litros === '' ? '' : textoNumero(st.litros), un === 'm³' ? 'm³' : 'litros', '', { placeholder: 'Ex.: 40' }) +
      campoNumero('kml-postos', 'Consumo do carro', st.kmL === '' ? '' : textoNumero(st.kmL, 1), 'km/' + (un === 'm³' ? 'm³' : 'L'), '', { placeholder: 'Ex.: 11' }) +
      '</div><p class="legenda-simples">' + (st.carroNome ? 'Sugestões tiradas do histórico do carro ' + esc(st.carroNome) + '. ' : '') +
      'Para cada posto: preço × quantidade + o combustível gasto para ir e voltar. A distância em linha reta é multiplicada por ' + C.fmtNum(Postos.FATOR_ROTA, 1) +
      ' para estimar o caminho de carro. É uma estimativa: trânsito, caminho real e filas não entram na conta.</p></details>';
    if (!rec.confiavel) {
      var motivo = { semLitros: 'Informe quanto vai abastecer', semConsumo: 'Informe o consumo do carro', poucosPostos: 'São necessários pelo menos dois postos com localização precisa' }[rec.motivo] || '';
      return '<div class="recomendacao recomendacao-sem"><strong>Sem estimativa de economia</strong><p>' + motivo +
        ' para comparar preço e distância. Enquanto isso, veja o preço e a distância de cada posto abaixo.</p>' + campos + '</div>';
    }
    var ref = rec.referencia.item, mel = rec.melhor.item;
    var texto;
    if (rec.mesmoPosto) {
      texto = '<strong>O posto mais próximo já sai mais em conta.</strong> Considerando ' + C.fmtNum(rec.litros) + ' ' + (un === 'm³' ? 'm³' : 'litros') +
        ' e o combustível para ir e voltar, nenhum posto mais longe compensa: <strong>' + esc(ref.posto.n) + '</strong>, a ' + fmtKmCurto(ref.distancia) + ', por ' + C.fmtDinheiro(ref.preco) + '/' + un + '.';
    } else if (rec.compensa) {
      texto = '<strong>Pode compensar ir até ' + esc(mel.posto.n) + '</strong> (' + fmtKmCurto(mel.distancia) + ', ' + C.fmtDinheiro(mel.preco) + '/' + un + ').<br>' +
        'Comparado ao mais próximo (' + esc(ref.posto.n) + ', ' + fmtKmCurto(ref.distancia) + ', ' + C.fmtDinheiro(ref.preco) + '/' + un + '): ' +
        'economia de <strong>' + C.fmtDinheiro(rec.economiaPreco) + '</strong> no abastecimento, menos cerca de <strong>' + C.fmtDinheiro(rec.custoExtra) + '</strong> de combustível no caminho a mais. ' +
        'Economia estimada: <strong>' + C.fmtDinheiro(rec.economiaLiquida) + '</strong>.';
    } else {
      texto = '<strong>A diferença é pequena.</strong> O menor custo estimado é em ' + esc(mel.posto.n) + ' (' + fmtKmCurto(mel.distancia) + '), mas a economia em relação ao mais próximo fica abaixo de ' +
        C.fmtDinheiro(Postos.ECONOMIA_MINIMA) + ' (' + C.fmtDinheiro(rec.economiaLiquida) + '). Vale escolher o que for mais prático.';
    }
    return '<div class="recomendacao"><p>' + texto + '</p><p class="legenda-simples">Critério: menor custo total estimado (abastecimento + ida e volta). Os preços são da pesquisa da ANP e podem ter mudado.</p>' + campos + '</div>';
  }

  function ligarTelaPostos(st) {
    var form = $('#form-postos');
    $$('input[name=produto]').forEach(function (i) { i.addEventListener('change', function () { st.produto = i.value; desenhar(true); }); });
    $$('input[name=onde]').forEach(function (i) { i.addEventListener('change', function () { st.onde = i.value; st.erro = null; desenhar(true); }); });
    $$('input[name=raio]').forEach(function (i) { i.addEventListener('change', function () { st.raio = Number(i.value); if (st.resultado && st.resultado.ponto) atualizarBuscaRaio(st); else desenhar(true); }); });
    if ($('#busca-postos')) $('#busca-postos').addEventListener('input', function () {
      st.texto = this.value; $('#campo-raio').hidden = !/\d{5}/.test(this.value);
    });
    form.addEventListener('submit', function (ev) { ev.preventDefault(); buscarPostos(st); });
    $$('[data-ordem]').forEach(function (b) { b.addEventListener('click', function () { st.ordem = b.getAttribute('data-ordem'); desenhar(true); }); });
    if ($('#so-bandeira')) $('#so-bandeira').addEventListener('change', function () { st.soBandeira = this.checked; desenhar(true); });
    [['#litros-postos', 'litros'], ['#kml-postos', 'kmL']].forEach(function (par) {
      var el = $(par[0]); if (!el) return;
      el.addEventListener('change', function () { var n = C.lerNumero(el.value); st[par[1]] = n > 0 ? n : ''; desenhar(true); });
    });
  }

  function erroPostos(st, msg) { st.buscando = false; st.erro = msg; st.resultado = null; desenhar(true); }

  function buscarPostos(st) {
    var ind = PostosDados.indice;
    st.erro = null;
    if (st.onde === 'local') {
      if (!navigator.geolocation) return erroPostos(st, 'Este navegador não consegue informar a localização. Use “Cidade ou CEP”.');
      st.buscando = true; desenhar(true);
      // Um pedido só, quando a pessoa toca em "Buscar postos". Nada é acompanhado em segundo plano.
      navigator.geolocation.getCurrentPosition(function (pos) {
        buscarPerto(st, { la: pos.coords.latitude, lo: pos.coords.longitude }, 'sua localização');
      }, function (e) {
        erroPostos(st, e && e.code === 1 ? 'Sem permissão para usar a localização. Você pode autorizar nas configurações do navegador ou buscar por cidade ou CEP.'
          : 'Não foi possível obter a localização agora. Tente de novo ou busque por cidade ou CEP.');
      }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
      return;
    }
    var q = Postos.interpretarBusca(st.texto, ind.municipios);
    if (q.tipo === 'vazio') return erroPostos(st, 'Digite o nome da cidade ou o CEP.');
    if (q.tipo === 'invalido') return erroPostos(st, q.motivo);
    st.buscando = true; desenhar(true);
    if (q.tipo === 'cep') {
      var pre = q.cep.slice(0, 3);
      var tabela = PostosDados.ceps[pre] ? Promise.resolve(PostosDados.ceps[pre]) :
        baixarJSON('postos/cep/' + pre + '.json').then(function (t) { PostosDados.ceps[pre] = t; return t; }).catch(function (e) { if (e.status === 404) return {}; throw e; });
      tabela.then(function (t) {
        var c = t[q.cep];
        if (!c) return erroPostos(st, 'O CEP ' + q.cep.slice(0, 5) + '-' + q.cep.slice(5) + ' não está nas cidades pesquisadas pela ANP nesta semana (ou não foi encontrado). Tente a cidade mais próxima.');
        buscarPerto(st, { la: c[0], lo: c[1] }, 'CEP ' + q.cep.slice(0, 5) + '-' + q.cep.slice(5));
      }).catch(function () { erroPostos(st, 'Não foi possível consultar o CEP agora. Confira a internet.'); });
      return;
    }
    if (!q.candidatos.length) return erroPostos(st, 'A ANP não pesquisou “' + q.nome + '” nesta semana. Confira o nome ou tente uma cidade próxima: a lista aparece ao digitar.');
    if (q.candidatos.length > 1) return erroPostos(st, 'Existe mais de uma cidade com esse nome. Escreva também o estado, por exemplo: ' + q.candidatos.map(function (m) { return m.n + ' - ' + m.uf; }).join(' ou ') + '.');
    var m = q.candidatos[0];
    carregarMunicipio(m.c).then(function (d) {
      st.buscando = false; st.ordem = st.ordem === 'distancia' ? 'preco' : st.ordem;
      st.resultado = { ponto: null, descricao: m.n + ' - ' + m.uf, postos: d.postos, municipios: [m.c] };
      desenhar(true);
    }).catch(function () { erroPostos(st, 'Não foi possível baixar os preços desta cidade agora. Confira a internet.'); });
  }

  function buscarPerto(st, ponto, descricao) {
    var perto = Postos.municipiosProximos(ponto, PostosDados.indice.municipios, 20);
    Promise.all(perto.map(function (m) { return carregarMunicipio(m.c); })).then(function (lista) {
      var postos = [];
      lista.forEach(function (d) { postos = postos.concat(d.postos); });
      st.buscando = false;
      st.resultado = { ponto: ponto, descricao: descricao, postos: postos, municipios: perto.map(function (m) { return m.c; }) };
      desenhar(true);
    }).catch(function () { erroPostos(st, 'Não foi possível baixar os preços agora. Confira a internet.'); });
  }
  function atualizarBuscaRaio(st) { desenhar(true); }

  // =====================================================================
  // Tela: ajustes
  // =====================================================================
  function linhaAjuste(href, icone, titulo, sub, extra) {
    var tag = href ? 'a' : 'button';
    return '<' + tag + ' class="linha-ajuste"' + (href ? ' href="' + href + '"' : ' type="button"') + (extra || '') + '>' + icone +
      '<span class="linha-texto"><span class="linha-titulo">' + titulo + '</span>' + (sub ? '<span class="linha-sub">' + sub + '</span>' : '') + '</span>' +
      (href ? ICONES.seta : '') + '</' + tag + '>';
  }
  function grupoOpcoes(nome, rotulo, opcoes, atual) {
    return '<div class="campo"><span class="rotulo" id="rot-' + nome + '">' + rotulo + '</span>' +
      '<div class="opcoes segmentado" role="radiogroup" aria-labelledby="rot-' + nome + '">' + opcoes.map(function (o) {
        return '<label class="opcao"><input type="radio" name="' + nome + '" value="' + o[0] + '"' + (atual === o[0] ? ' checked' : '') + '>' +
          '<span>' + o[2] + '<span>' + o[1] + '</span></span></label>';
      }).join('') + '</div></div>';
  }

  function telaAjustes() {
    var h = '<header class="cabecalho-tela"><h1>Ajustes</h1></header>';
    h += '<section class="cartao grupo-ajustes"><h2>Carros</h2><div class="lista-ajustes">';
    carrosAtivos().forEach(function (c) {
      var desc = descricaoCarro(c);
      h += linhaAjuste('#carro/' + encodeURIComponent(c.id), emblema(c), esc(c.nome), (desc ? esc(desc) + ' · ' : '') + 'dados e troca de óleo');
    });
    h += linhaAjuste('#carro/novo', '<span class="emblema emblema-mais" aria-hidden="true">' + ICONES.mais + '</span>', 'Adicionar carro', '');
    h += '</div><p class="legenda-simples">Nos dados de cada carro você muda o intervalo da troca de óleo e pode arquivar o carro.</p></section>';
    var arquivados = carrosArquivados();
    if (arquivados.length) {
      h += '<section class="cartao"><h2>Carros arquivados</h2>' +
        '<p>Guardados com todos os abastecimentos e manutenções. Não recebem registros novos.</p>' +
        arquivados.map(htmlCarroArquivado).join('') + '</section>';
    }

    h += '<section class="cartao" id="aparencia"><h2>Aparência</h2>' +
      grupoOpcoes('texto', 'Tamanho do texto', [
        ['padrao', 'Padrão', '<span class="amostra amostra-1" aria-hidden="true">Aa</span>'],
        ['maior', 'Maior', '<span class="amostra amostra-2" aria-hidden="true">Aa</span>'],
        ['enorme', 'Ainda maior', '<span class="amostra amostra-3" aria-hidden="true">Aa</span>']], aparencia.texto) +
      grupoOpcoes('tema', 'Tema', [
        ['claro', 'Claro', ICONES.sol], ['escuro', 'Escuro', ICONES.lua], ['auto', 'Automático', ICONES.auto]], aparencia.tema) +
      '<p class="legenda-simples">Automático segue o modo claro ou escuro do celular. ' +
      (estado.demo ? 'Na demonstração, a escolha fica só neste aparelho.' : 'A escolha acompanha a sua conta: vale também em outro celular quando você entrar.') + '</p></section>';

    if (!estado.demo) {
      h += '<section class="cartao grupo-ajustes"><h2>Família</h2>' +
        '<p class="conectado">Conectado como <strong>' + esc(usuarioAtual && usuarioAtual.email) + '</strong></p><div class="lista-ajustes">' +
        linhaAjuste('#familia', ICONES.pessoas, 'Pessoas com acesso', 'Quem vê os mesmos carros e registros') +
        linhaAjuste(null, ICONES.sair, 'Sair da conta', '', ' data-acao="sair-conta"') + '</div></section>';
    }
    h += '<section class="cartao"><h2>Cópia de segurança</h2>' +
      (estado.demo ? '<p>Na demonstração os dados ficam só na memória deste aparelho.</p>' :
        '<p>Os dados ficam guardados na nuvem da família (Firebase) e aparecem em todos os celulares autorizados.</p>' +
        '<p>Mesmo assim, salve uma cópia de vez em quando: ela protege contra apagar algo sem querer. Você pode enviá-la para si mesmo pelo WhatsApp, e-mail ou Google Drive.</p>') +
      (estado.ultimoBackup ? '<p class="legenda-simples">Última cópia: ' + C.fmtData(estado.ultimoBackup.slice(0, 10)) + '</p>' : '<p class="legenda-simples">Nenhuma cópia salva ainda.</p>') +
      '<button class="botao botao-principal" type="button" data-acao="backup">Salvar cópia de segurança</button>' +
      '<button class="botao botao-secundario" type="button" data-acao="restaurar">Usar uma cópia de segurança</button>' +
      (dadosAntigosDoAparelho() && !estado.demo ? '<button class="botao botao-secundario" type="button" data-acao="importar-antigos">Enviar registros antigos deste aparelho</button>' : '') +
      '<button class="botao botao-secundario" type="button" data-acao="planilha">Exportar planilha (Excel)</button></section>';

    h += '<section class="cartao grupo-ajustes"><h2>Ajuda</h2><div class="lista-ajustes">' +
      linhaAjuste('#ajuda', ICONES.ajuda, 'Como usar e como os cálculos são feitos', '') + '</div></section>';

    h += '<section class="cartao zona-perigo"><h2>Apagar dados</h2>';
    if (estado.demo) h += '<button class="botao botao-perigo" type="button" data-acao="sair-demo">Sair da demonstração</button>';
    else h += '<button class="botao botao-perigo" type="button" id="apagar-tudo">Apagar todos os carros e registros</button>';
    h += '</section>';
    tela.innerHTML = h;

    $$('input[name=texto], input[name=tema]').forEach(function (i) {
      i.addEventListener('change', function () { mudarAparencia(i.name, i.value); });
    });

    if ($('#apagar-tudo')) $('#apagar-tudo').addEventListener('click', function () {
      confirmar({
        icone: '', titulo: 'Apagar TODOS os dados?', perigo: true,
        texto: 'Todos os carros, abastecimentos e manutenções da família serão apagados <strong>em todos os celulares</strong>. Isso não pode ser desfeito.<br><br>Se quiser, salve antes uma cópia de segurança.',
        sim: 'Continuar', nao: 'Não, manter',
        aoConfirmar: function () {
          confirmar({
            titulo: 'Tem certeza mesmo?', perigo: true, texto: 'Última confirmação.',
            sim: 'Sim, apagar tudo', nao: 'Cancelar',
            aoConfirmar: function () {
              Dados.lotes(operacoesApagarTudo());
              sessao.escolheuCarro = false; ir('inicio', true);
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
    var primeiro = novo && !carrosAtivos().length;
    var c = novo ? novoCarro('', proximaCor()) : carroPorId(id);
    if (!c) { ir('ajustes', true); return; }
    if (c.arquivado) { ir('arquivo/' + encodeURIComponent(c.id), true); return; }

    var h = '<h1>' + (primeiro ? 'Primeiro carro' : novo ? 'Novo carro' : 'Dados do carro') + '</h1><form id="form-carro" novalidate><div id="erros"></div>';
    h += '<div class="campo"><label for="nome">Nome do carro</label><input type="text" id="nome" maxlength="40" value="' + esc(c.nome) + '" placeholder="Ex.: Carro do Pai">' +
      '<span class="dica">Como vocês chamam este carro. Ex.: “Carro do Pai”, “Gol prata”.</span></div>';
    h += '<div class="campo"><label for="marca">Marca <span class="opcional">(opcional)</span></label><input type="text" id="marca" maxlength="30" value="' + esc(c.marca) + '" placeholder="Ex.: Fiat"></div>';
    h += '<div class="campo"><label for="modelo">Modelo <span class="opcional">(opcional)</span></label><input type="text" id="modelo" maxlength="30" value="' + esc(c.modelo) + '" placeholder="Ex.: Uno"></div>';
    h += '<div class="campo"><label for="ano">Ano <span class="opcional">(opcional)</span></label><input type="text" id="ano" inputmode="numeric" maxlength="4" value="' + esc(c.ano) + '" placeholder="Ex.: 2015"></div>';
    h += '<div class="campo"><span class="rotulo" id="rot-cor">Cor na tela</span><span class="dica" style="margin:0 0 8px">Ajuda a não confundir os carros: um ponto desta cor aparece ao lado do nome. Pode repetir a cor de outro carro.</span>' +
      '<div class="opcoes" role="radiogroup" aria-labelledby="rot-cor">' + CORES.map(function (k) {
        return '<label class="opcao"><input type="radio" name="cor" value="' + k.valor + '"' + (c.cor === k.valor ? ' checked' : '') + '>' +
          '<span><span style="display:inline-block;width:18px;height:18px;border-radius:50%;margin-right:6px;background:' + tom(k.valor) + '"></span>' + k.nome + '</span></label>';
      }).join('') + '</div></div>';
    h += '<hr class="separador"><h2>Troca de óleo</h2>';
    h += campoNumero('oleoKm', 'Trocar o óleo a cada', textoNumero(c.oleoKm), 'km', 'O padrão é 5.000 km. Confira no manual do carro. Deixe em branco para não ser avisado por quilometragem.', { inteiro: true });
    h += campoNumero('oleoMeses', 'Ou a cada quantos meses', c.oleoMeses ? String(c.oleoMeses) : '', 'meses', 'Opcional. Ex.: 6 ou 12. Será avisado o que vier primeiro.', { inteiro: true, opcional: true });
    h += '<button class="botao botao-principal botao-grande" type="submit">Salvar</button>';
    h += '<button class="botao botao-secundario" type="button" data-acao="voltar-form">Cancelar</button>';
    h += '</form>';
    if (!novo) {
      h += '<hr class="separador"><h2>Guardar ou apagar</h2>' +
        '<p>Se a família não usa mais este carro, <strong>arquive</strong>: ele sai da lista, mas todos os abastecimentos e manutenções ficam guardados e podem ser consultados ou reativados em Ajustes.</p>' +
        '<button class="botao botao-secundario" type="button" id="arquivar-carro">Arquivar este carro</button>' +
        '<details class="mais"><summary>Apagar este carro de vez</summary>' +
        '<p>Apaga o carro <strong>e todos os registros dele</strong>, em todos os celulares. Prefira arquivar.</p>' +
        '<button class="botao botao-perigo" type="button" id="remover-carro">Apagar carro e todos os registros</button></details>';
    }
    tela.innerHTML = h;

    $('#form-carro').addEventListener('submit', function (ev) {
      ev.preventDefault();
      // Relê o carro na hora de salvar: ele pode ter sido arquivado em outro celular
      // enquanto este formulário estava aberto (e salvar não pode desarquivá-lo).
      var atual = novo ? c : carroPorId(c.id);
      if (!novo && (!atual || atual.arquivado)) {
        return mostrarErros(['Este carro foi arquivado (ou removido) enquanto você editava. Para mudar os dados dele, reative-o em Ajustes.']);
      }
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
      var atualizado = Object.assign({}, atual, dados);
      Dados.gravar('veiculos', atualizado);
      if (novo) { estado.carroAtual = atualizado.id; sessao.escolheuCarro = true; }
      salvar();
      var msg = primeiro
        ? 'O carro <strong>' + esc(nome) + '</strong> foi cadastrado. Agora registre a <strong>última troca de óleo</strong> dele (em Registrar manutenção) para receber o aviso da próxima.'
        : novo ? 'O carro <strong>' + esc(nome) + '</strong> foi adicionado e agora está selecionado.' : 'Os dados do carro foram atualizados.';
      aviso(primeiro ? 'Tudo pronto!' : 'Salvo!', msg, function () { ir(novo ? 'painel/' + encodeURIComponent(atualizado.id) : 'ajustes', true); });
    });

    if ($('#arquivar-carro')) $('#arquivar-carro').addEventListener('click', function () {
      var nA = abastDoCarro(c.id).length, nM = manutDoCarro(c.id).length;
      confirmar({
        titulo: 'Arquivar o ' + c.nome + '?',
        texto: 'Ele sai da lista de carros e não recebe registros novos. Os ' + C.plural(nA, 'abastecimento', 'abastecimentos') + ' e ' +
          C.plural(nM, 'manutenção', 'manutenções') + ' continuam guardados. Você pode ver o histórico ou reativar em Ajustes.',
        sim: 'Sim, arquivar', nao: 'Cancelar',
        aoConfirmar: function () {
          Dados.gravar('veiculos', Object.assign({}, c, { arquivado: true, arquivadoEm: Date.now() }));
          carroAtual();
          salvar();
          aviso('Carro arquivado', 'O <strong>' + esc(c.nome) + '</strong> está em Ajustes → Carros arquivados.', function () { ir('ajustes', true); });
        }
      });
    });

    if ($('#remover-carro')) $('#remover-carro').addEventListener('click', function () {
      var nA = abastDoCarro(c.id).length, nM = manutDoCarro(c.id).length;
      confirmar({
        titulo: 'Apagar o ' + c.nome + ' de vez?', perigo: true,
        texto: 'Serão apagados também ' + C.plural(nA, 'abastecimento', 'abastecimentos') + ' e ' + C.plural(nM, 'manutenção', 'manutenções') + ' deste carro, em todos os celulares. Isso não pode ser desfeito. Para só guardar, use “Arquivar”.',
        sim: 'Continuar', nao: 'Não, manter',
        aoConfirmar: function () { confirmar({ titulo: 'Tem certeza mesmo?', perigo: true, texto: 'Última confirmação.', sim: 'Sim, apagar tudo deste carro', nao: 'Cancelar', aoConfirmar: function () {
          var ops = [];
          abastDoCarro(c.id).forEach(function (x) { ops.push({ tipo: 'delete', colecao: 'abastecimentos', id: x.id }); });
          manutDoCarro(c.id).forEach(function (x) { ops.push({ tipo: 'delete', colecao: 'manutencoes', id: x.id }); });
          ops.push({ tipo: 'delete', colecao: 'veiculos', id: c.id });
          Dados.lotes(ops);
          carroAtual();
          salvar();
          ir('inicio', true);
        } }); }
      });
    });
  }

  function reativarCarro(id) {
    var c = carroPorId(id);
    if (!c) return;
    Dados.gravar('veiculos', Object.assign({}, c, { arquivado: false, arquivadoEm: null }));
    if (carrosAtivos().length === 1) { estado.carroAtual = c.id; sessao.escolheuCarro = true; }
    salvar();
    aviso('Carro reativado', 'O <strong>' + esc(c.nome) + '</strong> voltou para a lista de carros e pode receber registros de novo.',
      function () { ir(rotaAtual().nome === 'arquivo' ? 'ajustes' : rotaAtual().nome, true); });
  }

  // =====================================================================
  // Tela: ajuda
  // =====================================================================
  function telaAjuda() {
    tela.innerHTML = '<div class="texto-ajuda"><h1>Ajuda</h1>' +
      '<p><button type="button" class="link-botao" data-acao="voltar">← Voltar</button></p>' +
      '<div class="cartao"><h2>Como usar</h2>' +
      '<p><strong>1.</strong> Toda vez que abastecer, toque em <strong>Registrar abastecimento</strong> e preencha: quilometragem do painel, litros e valor pago (estão na nota).</p>' +
      '<p><strong>2.</strong> Quando fizer troca de óleo, pneus ou outro serviço, toque em <strong>Registrar manutenção</strong>.</p>' +
      '<p><strong>3.</strong> O <strong>painel</strong> de cada carro mostra os números mais importantes e avisa quando uma manutenção estiver chegando ou atrasada.</p>' +
      '<p><strong>4.</strong> Confira sempre o nome do carro no alto da tela antes de salvar. Se desistir, toque em <strong>← Voltar</strong> ou <strong>Cancelar</strong>.</p>' +
      '<p><strong>Letras pequenas?</strong> Em <strong>Ajustes → Aparência</strong> dá para aumentar o texto e escolher o tema claro ou escuro.</p>' +
      '<p><strong>Dica:</strong> para abrir mais rápido, adicione este aplicativo à tela inicial do celular (no menu do navegador, toque em “Adicionar à tela inicial”).</p></div>' +
      '<div class="cartao"><h2>Onde ficam os dados?</h2>' +
      '<p>Na <strong>nuvem da família</strong> (Google Firebase). Todos os celulares autorizados veem os mesmos dados, e o que um registra aparece no outro em poucos segundos.</p>' +
      '<p>Só entram as pessoas cujo e-mail está em <strong>Ajustes → Pessoas com acesso</strong>.</p>' +
      '<p>Sem internet o aplicativo continua funcionando: os registros ficam guardados no celular e são enviados quando a conexão voltar.</p>' +
      '<p>Mesmo assim, salve uma <strong>cópia de segurança</strong> de vez em quando (Ajustes): ela protege contra apagar algo sem querer.</p></div>' +
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
      '<h3>Avisos</h3><p><strong>Chegando</strong>: faltam até ' + C.LIMITE_KM_PROXIMO + ' km ou até ' + C.LIMITE_DIAS_PROXIMO + ' dias.<br><strong>Atrasada</strong>: passou da quilometragem ou da data.</p>' +
      '<p>A “quilometragem atual” é o maior número já anotado em abastecimentos ou manutenções.</p></div></div>';
  }

  // =====================================================================
  // Cópia de segurança, importação, restauração e planilha
  // =====================================================================
  function nomeArquivo(prefixo, ext) {
    return prefixo + '-' + C.hojeISO() + '.' + ext;
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

  // Cópia no mesmo formato da versão antiga (versão 1), para poder ser usada em qualquer versão.
  function dadosParaCopia() {
    function lista(col) { return listaDe(col).map(function (x) { var r = limpar(col, x); r.id = x.id; return r; }); }
    return { carros: lista('veiculos'), abastecimentos: lista('abastecimentos'), manutencoes: lista('manutencoes') };
  }
  function fazerBackup() {
    var conteudo = JSON.stringify({ aplicativo: 'controle-do-carro', versao: 2, criadoEm: new Date().toISOString(), dados: dadosParaCopia() }, null, 1);
    entregarArquivo(conteudo, nomeArquivo('copia-controle-carro', 'json'), 'application/json', function () {
      estado.ultimoBackup = new Date().toISOString();
      estado.alteracoesDesdeBackup = 0;
      salvar();
      aviso('Cópia de segurança pronta', 'Guarde o arquivo em um lugar seguro (por exemplo, envie para você mesmo no WhatsApp ou e-mail). Ele contém os dados dos carros: não publique em lugares públicos.', function () { desenhar(); });
    });
  }

  // Confere um registro com as mesmas regras do Firestore (um registro inválido faria a nuvem recusar o lote todo).
  function registroValido(col, r) {
    var data = /^\d{4}-\d{2}-\d{2}$/;
    if (!r || typeof r.id !== 'string' || !r.id || r.id.length > 128 || r.id.indexOf('/') >= 0) return false;
    if (col === 'veiculos') return typeof r.nome === 'string' && r.nome.trim().length > 0;
    if (typeof r.carroId !== 'string' || !data.test(r.data || '') || typeof r.km !== 'number' || !(r.km >= 0)) return false;
    if (col === 'abastecimentos') return r.litros > 0 && r.litros < 1000 && r.valor > 0 && r.valor < 100000;
    return TIPOS_ORDEM.indexOf(r.tipo) >= 0;
  }

  // Lê uma cópia de segurança (da versão antiga ou da nova). Dados de demonstração são ignorados.
  function lerCopia(d) {
    if (!d || d.aplicativo !== 'controle-do-carro' || !d.dados || !Array.isArray(d.dados.carros)) return null;
    if (d.dados.demo) return { demo: true };
    function lista(x, col) {
      return (Array.isArray(x) ? x : []).filter(function (r) { return r && typeof r === 'object' && !r.demo && registroValido(col, r); });
    }
    return {
      carros: lista(d.dados.carros, 'veiculos'),
      abastecimentos: lista(d.dados.abastecimentos, 'abastecimentos'),
      manutencoes: lista(d.dados.manutencoes, 'manutencoes'),
      criadoEm: d.criadoEm || null
    };
  }

  // Registros da versão antiga (que guardava tudo só no aparelho).
  function dadosAntigosDoAparelho() {
    if (prefs.antigosImportados) return null;
    var bruto;
    try { bruto = JSON.parse(localStorage.getItem(CHAVE_ANTIGA)); } catch (e) { return null; }
    if (!bruto) return null;
    var d = lerCopia({ aplicativo: 'controle-do-carro', dados: bruto });
    if (!d || d.demo || !d.carros.length || (!d.abastecimentos.length && !d.manutencoes.length)) return null;
    return d;
  }
  function importarAntigos() {
    var d = dadosAntigosDoAparelho();
    if (!d) { aviso('Nada para enviar', 'Não há registros antigos neste aparelho.'); return; }
    importarJuntando(d, function () { prefs.antigosImportados = true; salvarPrefs(); });
  }

  function contar(lista, carroId) { return lista.filter(function (r) { return r.carroId === carroId; }).length; }

  // Junta os dados de uma cópia com os da nuvem. Os registros mantêm o mesmo identificador:
  // importar duas vezes NÃO duplica nada.
  function importarJuntando(dados, aoTerminar) {
    var mapa = {}, criar = [], semDestino = [];
    dados.carros.forEach(function (c) {
      var igual = carroPorId(c.id) || estado.carros.filter(function (x) {
        return x.nome.trim().toLowerCase() === String(c.nome).trim().toLowerCase();
      })[0];
      if (igual) { mapa[c.id] = igual.id; return; }
      // Já importado antes? Usa o carro para onde foram os mesmos registros.
      var jaNaNuvem = null;
      ['abastecimentos', 'manutencoes'].forEach(function (col) {
        dados[col].forEach(function (r) {
          if (jaNaNuvem || r.carroId !== c.id) return;
          var existente = listaDe(col).filter(function (x) { return x.id === r.id; })[0];
          if (existente && carroPorId(existente.carroId)) jaNaNuvem = existente.carroId;
        });
      });
      if (jaNaNuvem) mapa[c.id] = jaNaNuvem; else semDestino.push(c);
    });

    function perguntar(i) {
      if (i >= semDestino.length) return concluir();
      var c = semDestino[i];
      var acoes = { pular: function () { perguntar(i + 1); } };
      acoes.novo = function () { criar.push(c); mapa[c.id] = c.id; perguntar(i + 1); };
      var botoes = '<button class="botao botao-principal" data-janela="novo">Criar como carro novo</button>';
      carrosAtivos().forEach(function (x, k) {
        acoes['c' + k] = function () { mapa[c.id] = x.id; perguntar(i + 1); };
        botoes += '<button class="botao botao-secundario" data-janela="c' + k + '">Juntar com ' + esc(x.nome) + '</button>';
      });
      botoes += '<button class="botao botao-perigo" data-janela="pular">Não trazer este carro</button>';
      abrirJanela('<h2>Para qual carro vão estes registros?</h2><p>Na cópia existe o carro <strong>' + esc(c.nome) + '</strong> com ' +
        C.plural(contar(dados.abastecimentos, c.id), 'abastecimento', 'abastecimentos') + ' e ' +
        C.plural(contar(dados.manutencoes, c.id), 'manutenção', 'manutenções') + '.</p>' + botoes, acoes);
    }

    function concluir() {
      var ops = [], qtd = { abastecimentos: 0, manutencoes: 0 };
      criar.forEach(function (c) {
        ops.push({ tipo: 'set', colecao: 'veiculos', id: c.id, dados: Object.assign({ oleoKm: 5000, cor: proximaCor(), criadoEm: Date.now() }, c) });
      });
      ['abastecimentos', 'manutencoes'].forEach(function (col) {
        dados[col].forEach(function (r) {
          if (!mapa[r.carroId]) return;
          ops.push({ tipo: 'set', colecao: col, id: r.id, dados: Object.assign({}, r, { carroId: mapa[r.carroId] }) });
          qtd[col]++;
        });
      });
      if (!qtd.abastecimentos && !qtd.manutencoes && !criar.length) { aviso('Nada para trazer', 'Nenhum registro foi escolhido para importar.'); return; }
      confirmar({
        icone: '', titulo: 'Trazer estes registros?',
        texto: C.plural(qtd.abastecimentos, 'abastecimento', 'abastecimentos') + ' e ' + C.plural(qtd.manutencoes, 'manutenção', 'manutenções') +
          (criar.length ? ', e ' + C.plural(criar.length, 'carro novo', 'carros novos') : '') +
          '.<br>Registros que já estão na nuvem não serão duplicados. Nada será apagado.',
        sim: 'Sim, trazer', nao: 'Cancelar',
        aoConfirmar: function () {
          Dados.lotes(ops);
          if (aoTerminar) aoTerminar();
          carroAtual();
          salvar();
          if (carrosAtivos().length < 2) sessao.escolheuCarro = true;
          aviso('Registros trazidos', 'Os registros já aparecem no aplicativo' + (modo === 'nuvem' ? ' e em todos os celulares da família.' : '.'), function () { ir('inicio', true); });
        }
      });
    }
    perguntar(0);
  }

  function operacoesApagarTudo() {
    var ops = [];
    ['abastecimentos', 'manutencoes', 'veiculos'].forEach(function (col) {
      listaDe(col).forEach(function (x) { ops.push({ tipo: 'delete', colecao: col, id: x.id }); });
    });
    return ops;
  }

  // Substitui tudo pelos dados da cópia (apaga o que não estiver nela).
  function substituirTudo(dados) {
    var carros = dados.carros;
    var ids = {}, ops = [];
    carros.forEach(function (c) { ids['veiculos/' + c.id] = true; ops.push({ tipo: 'set', colecao: 'veiculos', id: c.id, dados: Object.assign({ oleoKm: 5000, criadoEm: Date.now() }, c) }); });
    ['abastecimentos', 'manutencoes'].forEach(function (col) {
      dados[col].forEach(function (r) {
        if (!ids['veiculos/' + r.carroId]) return;
        ids[col + '/' + r.id] = true;
        ops.push({ tipo: 'set', colecao: col, id: r.id, dados: r });
      });
    });
    var apagar = operacoesApagarTudo().filter(function (op) { return !ids[op.colecao + '/' + op.id]; });
    Dados.lotes(apagar.concat(ops));
    estado.carroAtual = null;
    carroAtual();
    salvar();
    sessao.escolheuCarro = false;
    aviso('Cópia aplicada', 'Os dados agora são os da cópia de segurança.', function () { ir('inicio', true); });
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
        var bruto;
        try { bruto = JSON.parse(leitor.result); } catch (e) { bruto = null; }
        var d = lerCopia(bruto);
        if (!d) { aviso('Arquivo não reconhecido', 'Este arquivo não é uma cópia de segurança do Controle de Bordo.'); return; }
        if (d.demo) { aviso('Cópia de demonstração', 'Este arquivo contém só os dados de exemplo da demonstração. Nada foi importado.'); return; }
        var resumo = 'Cópia de ' + (d.criadoEm ? C.fmtData(String(d.criadoEm).slice(0, 10)) : 'data desconhecida') + ' com ' +
          C.plural(d.carros.length, 'carro', 'carros') + ', ' + C.plural(d.abastecimentos.length, 'abastecimento', 'abastecimentos') +
          ' e ' + C.plural(d.manutencoes.length, 'manutenção', 'manutenções') + '.';
        if (!estado.carros.length) { importarJuntando(d); return; }
        abrirJanela('<h2>Usar esta cópia</h2><p>' + resumo + '</p>' +
          '<button class="botao botao-principal" data-janela="juntar">Juntar com os dados atuais (recomendado)</button>' +
          '<p class="legenda-simples">Traz o que está na cópia sem apagar nada. Não duplica registros.</p>' +
          '<button class="botao botao-perigo" data-janela="substituir">Substituir tudo pela cópia</button>' +
          '<p class="legenda-simples">Apaga o que não estiver na cópia' + (modo === 'nuvem' ? ', em todos os celulares da família' : '') + '.</p>' +
          '<button class="botao botao-secundario" data-janela="cancelar">Cancelar</button>', {
          juntar: function () { importarJuntando(d); },
          substituir: function () {
            confirmar({
              icone: '', titulo: 'Substituir tudo?', perigo: true,
              texto: 'Os carros e registros atuais que não estão na cópia serão <strong>apagados</strong>. Isso não pode ser desfeito.',
              sim: 'Sim, substituir', nao: 'Cancelar', aoConfirmar: function () { substituirTudo(d); }
            });
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
      var nomeCarro = c.nome + (c.arquivado ? ' (arquivado)' : '');
      C.analisarAbastecimentos(abastDoCarro(c.id)).forEach(function (a) {
        linhas.push([cel(nomeCarro), 'Abastecimento', C.fmtData(a.data), a.km, n(a.litros, 2), n(a.valor, 2), n(a.precoLitro, 3), cel(a.combustivel),
          a.tanqueCheio === false ? 'Não' : 'Sim', a.kmDesdeAnterior === null ? '' : a.kmDesdeAnterior,
          a.trecho ? n(a.trecho.kmPorLitro, 2) : '', a.trecho ? n(a.trecho.custoPorKm, 3) : '', '', '', '', cel(a.obs)].join(';'));
      });
      manutDoCarro(c.id).slice().sort(function (a, b) { return a.data < b.data ? -1 : 1; }).forEach(function (m) {
        linhas.push([cel(nomeCarro), 'Manutenção', C.fmtData(m.data), m.km, '', n(m.valor, 2), '', '', '', '', '', '',
          cel(C.nomeManutencao(m)), m.lembreteKm || '', m.lembreteData ? C.fmtData(m.lembreteData) : '', cel(m.obs)].join(';'));
      });
    });
    entregarArquivo('﻿' + linhas.join('\r\n'), nomeArquivo('planilha-controle-carro', 'csv'), 'text/csv', function () {
      aviso('Planilha pronta', 'O arquivo pode ser aberto no Excel ou no Google Planilhas. Atenção: a planilha serve para consulta; para guardar os dados use a “cópia de segurança”.');
    });
  }

  // =====================================================================
  // Demonstração (só na memória deste aparelho; nunca vai para a nuvem)
  // =====================================================================
  function carregarDemo() {
    if (window.Nuvem && nuvemPronta) { Nuvem.pararDeOuvir(); Nuvem.pararPerfil(); }
    esquecerKms();
    var d = window.DadosDemo.gerar(C, novoId);
    estado = estadoVazio();
    estado.carros = d.carros; estado.abastecimentos = d.abastecimentos; estado.manutencoes = d.manutencoes;
    estado.carroAtual = d.carroAtual; estado.demo = true;
    modo = 'demo';
    sessao.escolheuCarro = false;
    ir('inicio', true);
  }
  function sairDemo() {
    confirmar({
      icone: '', titulo: 'Sair da demonstração?',
      texto: 'Os dados de exemplo serão descartados. Nada da demonstração vai para a nuvem.',
      sim: 'Sim, sair', nao: 'Continuar vendo',
      aoConfirmar: function () {
        estado = estadoVazio(); sessao.escolheuCarro = false;
        modo = nuvemPronta ? 'login' : 'sem-config';
        if (location.hash !== '#inicio') location.replace('#inicio');
        if (nuvemPronta && usuarioAtual) Nuvem.ouvirPerfil(usuarioAtual.uid, aoReceberPerfil);
        if (nuvemPronta) decidirPorUsuario(); else desenhar();
      }
    });
  }

  // =====================================================================
  // Login, verificação de e-mail e família
  // =====================================================================
  var nuvemPronta = false;
  var erroCarga = null;

  function emailDoUsuario() { return usuarioAtual && usuarioAtual.email ? usuarioAtual.email.toLowerCase() : ''; }

  function mensagemErro(e) {
    var c = (e && e.code) || '';
    var m = {
      'auth/invalid-credential': 'E-mail ou senha incorretos.',
      'auth/wrong-password': 'E-mail ou senha incorretos.',
      'auth/user-not-found': 'E-mail ou senha incorretos.',
      'auth/invalid-email': 'O e-mail não parece correto. Confira se digitou certo.',
      'auth/missing-password': 'Digite a senha.',
      'auth/too-many-requests': 'Muitas tentativas. Espere alguns minutos e tente de novo.',
      'auth/network-request-failed': 'Sem internet. Confira a conexão e tente de novo.',
      'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita janelas (pop-ups) para este site, ou entre com e-mail e senha.',
      'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de terminar.',
      'auth/cancelled-popup-request': 'A janela do Google foi fechada antes de terminar.',
      'auth/unauthorized-domain': 'Este endereço ainda não foi autorizado no Firebase (Authentication → Settings → Authorized domains).',
      'auth/operation-not-allowed': 'Este tipo de login não foi ativado no Firebase.',
      'auth/user-disabled': 'Esta conta foi desativada.',
      'permission-denied': 'Sem permissão para acessar estes dados.',
      'unavailable': 'Sem conexão com a nuvem. Confira a internet.'
    };
    return m[c] || ('Não foi possível concluir (' + esc(c || (e && e.message) || 'erro') + ').');
  }

  function ocupado(botao, sim, texto) {
    if (!botao) return;
    if (sim) { botao.dataset.texto = botao.innerHTML; botao.disabled = true; botao.textContent = texto || 'Aguarde…'; }
    else { botao.disabled = false; if (botao.dataset.texto) botao.innerHTML = botao.dataset.texto; }
  }

  function telaIniciando() {
    tela.innerHTML = '<div class="vazio"><p class="carregando">' +
      (modo === 'carregando-dados' ? 'Carregando os dados da família…' : 'Carregando…') + '</p></div>';
  }

  function telaSemConfig() {
    tela.innerHTML = '<h1>Controle de Bordo</h1>' +
      '<div class="caixa caixa-aviso"><strong>Falta configurar o Firebase</strong>' +
      '<p style="margin-top:6px">Este endereço ainda não tem o arquivo <code>firebase-config.js</code> com a configuração do projeto. ' +
      'Quem cuida do aplicativo deve seguir o passo a passo do README.</p></div>' +
      '<div class="cartao"><h2>Só quer conhecer?</h2><p>Veja o aplicativo com dados de exemplo (nada é salvo).</p>' +
      '<button class="botao botao-secundario" type="button" data-acao="demo">Ver demonstração</button></div>';
  }

  function telaErroCarga() {
    tela.innerHTML = '<h1>Controle de Bordo</h1>' +
      '<div class="caixa caixa-erro"><strong>Não foi possível carregar</strong><p style="margin-top:6px">' +
      (navigator.onLine === false ? 'Parece que o celular está sem internet. ' : '') +
      'Confira a conexão e tente de novo.</p>' + (erroCarga ? '<p class="legenda-simples">' + mensagemErro(erroCarga) + '</p>' : '') + '</div>' +
      '<button class="botao botao-principal botao-grande" type="button" id="tentar">Tentar de novo</button>' +
      '<button class="botao botao-secundario" type="button" data-acao="demo">Ver demonstração</button>';
    $('#tentar').addEventListener('click', function () { location.reload(); });
  }

  // Logo do Controle de Bordo: símbolo (imagem, com uma versão para o tema escuro) e o nome em texto.
  var SIMBOLO_LOGO = '<span class="logo-simbolo" aria-hidden="true"><img class="so-claro" src="img/logo-simbolo.png" alt="" width="480" height="273"><img class="so-escuro" src="img/logo-simbolo-escuro.png" alt="" width="480" height="273"></span>';
  function logoHorizontal() {
    return '<div class="logo-app logo-horizontal">' + SIMBOLO_LOGO +
      '<span class="logo-texto"><span class="logo-nome"><b>Controle</b> de Bordo</span>' +
      '<small>Abastecimentos e manutenções da família</small></span></div>';
  }
  function telaLogin() {
    tela.innerHTML = '<div class="entrada">' +
      '<aside class="entrada-marca" aria-hidden="true">' +
      '<p class="entrada-frase">Cada abastecimento anotado.<br>Cada manutenção no prazo.</p>' +
      '<svg class="entrada-ilustracao" viewBox="0 0 320 190" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M40 160a120 120 0 0 1 240 0" stroke="currentColor" stroke-opacity=".22" stroke-width="14"/>' +
      '<path d="M40 160a120 120 0 0 1 178-105" stroke="var(--acento)" stroke-width="14"/>' +
      '<g stroke="currentColor" stroke-opacity=".5" stroke-width="3"><path d="M60 160h12M248 160h12M160 60v12M89 89l9 9M231 89l-9 9"/></g>' +
      '<path d="M160 160 214 104" stroke="currentColor" stroke-width="6"/><circle cx="160" cy="160" r="12" fill="currentColor"/>' +
      '<rect x="112" y="172" width="96" height="16" rx="5" fill="currentColor" fill-opacity=".14"/></svg>' +
      '<ul class="entrada-lista"><li>' + ICONES.bomba + 'Consumo e gastos calculados sozinhos</li>' +
      '<li>' + ICONES.chave + 'Aviso da troca de óleo e de outras manutenções</li>' +
      '<li>' + ICONES.pessoas + 'Os mesmos dados no celular de cada pessoa</li></ul></aside>' +
      '<div class="entrada-corpo">' + logoHorizontal() +
      '<section class="cartao entrada-cartao"><h1>Entrar</h1>' +
      '<div id="erros"></div>' +
      '<form id="form-login" novalidate>' +
      '<div class="campo"><label for="email">E-mail</label><input type="email" id="email" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false"></div>' +
      '<div class="campo campo-senha"><label for="senha">Senha</label><div class="senha-caixa"><input type="password" id="senha" autocomplete="current-password">' +
      '<button type="button" class="mostrar-senha" id="mostrar-senha" aria-pressed="false" aria-controls="senha">' + ICONES.olho + '<span>Mostrar</span></button></div>' +
      '<button class="link-botao esqueci" type="button" id="esqueci">Esqueci minha senha</button></div>' +
      '<button class="botao botao-principal botao-grande" type="submit" id="botao-entrar">Entrar</button></form>' +
      '<div class="separador-ou"><span>ou</span></div>' +
      '<button class="botao botao-secundario botao-google" type="button" id="entrar-google">' + G_GOOGLE + 'Entrar com Google</button>' +
      '<p class="legenda-simples entrada-gmail">Tem Gmail? Use a conta que já está no celular.</p></section>' +
      '<section class="entrada-demo"><p><strong>Só quer conhecer?</strong> Veja o app com dados de exemplo, sem entrar.</p>' +
      '<button class="botao botao-secundario" type="button" data-acao="demo">Ver demonstração</button></section>' +
      '<p class="legenda-simples entrada-rodape">Só as pessoas autorizadas pela família conseguem ver os dados.</p></div></div>';

    function erro(msg) { $('#erros').innerHTML = caixa('erro', msg); $('#erros').scrollIntoView({ block: 'center' }); }
    $('#mostrar-senha').addEventListener('click', function () {
      var mostrar = $('#senha').type === 'password';
      $('#senha').type = mostrar ? 'text' : 'password';
      this.setAttribute('aria-pressed', String(mostrar));
      $('span', this).textContent = mostrar ? 'Esconder' : 'Mostrar';
    });
    $('#entrar-google').addEventListener('click', function () {
      var b = this; ocupado(b, true, 'Abrindo o Google…');
      Nuvem.entrarGoogle().catch(function (e) { ocupado(b, false); erro(mensagemErro(e)); });
    });
    $('#form-login').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var email = $('#email').value.trim(), senha = $('#senha').value;
      if (!email || !senha) { erro('Digite o e-mail e a senha.'); return; }
      var b = $('#botao-entrar'); ocupado(b, true, 'Entrando…');
      Nuvem.entrarEmail(email, senha).catch(function (e) { ocupado(b, false); erro(mensagemErro(e)); });
    });
    $('#esqueci').addEventListener('click', function () {
      var email = $('#email').value.trim();
      if (!email) { erro('Digite seu e-mail no campo acima e toque de novo em “Esqueci minha senha”.'); return; }
      Nuvem.esqueciSenha(email).then(function () {
        aviso('Verifique seu e-mail', 'Se este e-mail estiver cadastrado, você vai receber um link para criar uma nova senha. Veja também a pasta de spam.');
      }).catch(function (e) { erro(mensagemErro(e)); });
    });
  }

  function telaVerificar() {
    tela.innerHTML = '<h1>Confirme seu e-mail</h1>' +
      '<p>Para proteger os dados, precisamos confirmar que o e-mail <strong>' + esc(emailDoUsuario()) + '</strong> é seu. É preciso fazer só uma vez.</p>' +
      '<div class="cartao"><ol style="padding-left:22px;margin:0">' +
      '<li>Toque em <strong>Enviar link de confirmação</strong>.</li>' +
      '<li>Abra seu e-mail (veja também a pasta de spam) e toque no link.</li>' +
      '<li>Volte aqui e toque em <strong>Já confirmei</strong>.</li></ol></div><div id="erros"></div>' +
      '<button class="botao botao-principal" type="button" id="enviar-link">Enviar link de confirmação</button>' +
      '<button class="botao botao-secundario" type="button" id="ja-confirmei">Já confirmei</button>' +
      '<button class="botao botao-secundario" type="button" data-acao="sair-conta">Sair</button>';
    $('#enviar-link').addEventListener('click', function () {
      var b = this; ocupado(b, true, 'Enviando…');
      Nuvem.enviarVerificacao().then(function () {
        ocupado(b, false);
        $('#erros').innerHTML = caixa('ok', 'Link enviado para ' + emailDoUsuario() + '. Abra seu e-mail.');
      }).catch(function (e) { ocupado(b, false); $('#erros').innerHTML = caixa('erro', mensagemErro(e)); });
    });
    $('#ja-confirmei').addEventListener('click', function () {
      var b = this; ocupado(b, true, 'Conferindo…');
      Nuvem.recarregarUsuario().then(function (u) {
        usuarioAtual = u;
        if (u.emailVerified) decidirPorUsuario();
        else { ocupado(b, false); $('#erros').innerHTML = caixa('aviso', 'O e-mail ainda não foi confirmado. Abra o link que enviamos e tente de novo.'); }
      }).catch(function (e) { ocupado(b, false); $('#erros').innerHTML = caixa('erro', mensagemErro(e)); });
    });
  }

  function telaSemFamilia() {
    tela.innerHTML = '<h1>Quase lá</h1>' +
      '<div class="caixa caixa-info">Você entrou como <strong>' + esc(emailDoUsuario()) + '</strong>, mas este e-mail ainda não tem acesso aos carros da família.</div>' +
      '<div class="cartao"><h2>Alguém da família já usa o aplicativo?</h2>' +
      '<p>Peça para essa pessoa abrir <strong>Ajustes → Pessoas com acesso</strong> e incluir o seu e-mail. Depois toque abaixo.</p>' +
      '<button class="botao botao-principal" type="button" id="tentar">Tentar de novo</button></div>' +
      '<div class="cartao"><h2>Você é quem está configurando?</h2>' +
      '<p>Crie a família. Depois você poderá incluir os e-mails das outras pessoas.</p>' +
      '<div class="campo"><label for="nome-familia">Nome da família</label><input type="text" id="nome-familia" maxlength="60" value="Família"></div>' +
      '<div id="erros"></div><button class="botao botao-secundario" type="button" id="criar">Criar família</button></div>' +
      '<button class="botao botao-secundario" type="button" data-acao="sair-conta">Sair e entrar com outra conta</button>';
    $('#tentar').addEventListener('click', function () { entrarNaFamilia(); });
    $('#criar').addEventListener('click', function () {
      var nome = $('#nome-familia').value.trim() || 'Família';
      confirmar({
        icone: '', titulo: 'Criar uma família nova?',
        texto: 'Faça isso só se ninguém da família ainda usa o aplicativo. Se alguém já usa, peça para incluir o seu e-mail — senão vocês ficarão com dados separados.',
        sim: 'Sim, criar', nao: 'Cancelar',
        aoConfirmar: function () {
          Nuvem.criarFamilia(nome, emailDoUsuario(), usuarioAtual.uid).then(function (f) {
            familia = f; comecarAOuvir();
          }).catch(function (e) { $('#erros').innerHTML = caixa('erro', mensagemErro(e)); });
        }
      });
    });
  }

  function telaSemAcesso() {
    tela.innerHTML = '<h1>Sem acesso</h1>' +
      '<div class="caixa caixa-aviso">O e-mail <strong>' + esc(emailDoUsuario()) + '</strong> não tem mais acesso aos dados desta família, ou o acesso ainda não foi liberado.</div>' +
      '<p>Peça para quem configurou o aplicativo conferir em <strong>Ajustes → Pessoas com acesso</strong>.</p>' +
      '<button class="botao botao-principal" type="button" id="tentar">Tentar de novo</button>' +
      '<button class="botao botao-secundario" type="button" data-acao="sair-conta">Sair</button>';
    $('#tentar').addEventListener('click', function () { entrarNaFamilia(); });
  }

  function telaFamilia() {
    if (estado.demo || !familia) { ir('inicio', true); return; }
    var meu = emailDoUsuario();
    var h = '<h1>Pessoas com acesso</h1>' +
      '<p>Estas pessoas entram no aplicativo e veem <strong>os mesmos carros e registros</strong>, em qualquer celular:</p><div id="erros"></div>';
    familia.emails.forEach(function (e) {
      var etiqueta = e === familia.criadoPorEmail ? ' <span class="etiqueta">responsável</span>' : '';
      if (e === meu) etiqueta += ' <span class="etiqueta">você</span>';
      var podeRemover = e !== familia.criadoPorEmail && e !== meu;
      h += '<div class="cartao registro"><div class="linha-topo"><span style="word-break:break-all"><strong>' + esc(e) + '</strong>' + etiqueta + '</span></div>' +
        (podeRemover ? '<div class="acoes"><button class="botao botao-perigo botao-pequeno" type="button" data-remover="' + esc(e) + '">Remover acesso</button></div>' : '') + '</div>';
    });
    h += '<div class="cartao"><h2>Incluir uma pessoa</h2><form id="form-email" novalidate>' +
      '<div class="campo"><label for="novo-email">E-mail da pessoa</label><input type="email" id="novo-email" inputmode="email" autocapitalize="none" spellcheck="false" placeholder="nome@gmail.com"></div>' +
      '<button class="botao botao-principal" type="submit">Incluir</button></form>' +
      '<p class="legenda-simples">A pessoa entra com <strong>“Entrar com Google”</strong> usando esse e-mail, ou, se não tiver Gmail, com <strong>e-mail e senha</strong>. Nesse caso, a conta e a senha são criadas por você no Console do Firebase (Authentication → Usuários → Adicionar usuário).</p></div>';
    h += '<button class="botao botao-secundario" type="button" data-acao="voltar">Voltar</button>';
    tela.innerHTML = h;

    function gravarEmails(lista, msg) {
      var antes = familia.emails;
      familia = Object.assign({}, familia, { emails: lista });
      Nuvem.atualizarEmails(lista).then(function () {
        aviso('Pronto', msg, function () { desenhar(); });
      }).catch(function (e) { familia = Object.assign({}, familia, { emails: antes }); mostrarErroNuvem(e); });
      if (navigator.onLine === false) aviso('Sem internet', 'A alteração será enviada quando a internet voltar.', function () { desenhar(); });
    }
    $('#form-email').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var e = $('#novo-email').value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { $('#erros').innerHTML = caixa('erro', 'Este e-mail não parece correto. Exemplo: maria@gmail.com'); return; }
      if (familia.emails.indexOf(e) >= 0) { $('#erros').innerHTML = caixa('aviso', 'Este e-mail já tem acesso.'); return; }
      if (familia.emails.length >= 20) { $('#erros').innerHTML = caixa('erro', 'Limite de 20 pessoas atingido.'); return; }
      gravarEmails(familia.emails.concat([e]), '<strong>' + esc(e) + '</strong> agora tem acesso. Peça para a pessoa abrir o aplicativo e entrar com esse e-mail.');
    });
    $$('[data-remover]').forEach(function (b) {
      b.addEventListener('click', function () {
        var e = b.getAttribute('data-remover');
        confirmar({
          icone: '', titulo: 'Remover o acesso?', perigo: true,
          texto: '<strong>' + esc(e) + '</strong> não vai mais conseguir ver nem alterar os dados dos carros.',
          sim: 'Sim, remover', nao: 'Cancelar',
          aoConfirmar: function () {
            gravarEmails(familia.emails.filter(function (x) { return x !== e; }), 'O acesso de <strong>' + esc(e) + '</strong> foi removido.');
          }
        });
      });
    });
  }

  function sairDaConta() {
    confirmar({
      icone: '', titulo: 'Sair da conta?',
      texto: 'Os dados continuam guardados na nuvem. Para voltar, é só entrar de novo.',
      sim: 'Sim, sair', nao: 'Cancelar',
      aoConfirmar: function () { estado = estadoVazio(); sessao.escolheuCarro = false; Nuvem.sair(); }
    });
  }

  // =====================================================================
  // Sincronização em tempo real
  // =====================================================================
  var indicador = document.getElementById('conexao');
  function atualizarIndicador() {
    if (modo !== 'nuvem') { indicador.hidden = true; return; }
    var offline = navigator.onLine === false;
    var temPendentes = Object.keys(pendentes).some(function (k) { return pendentes[k]; });
    if (offline) {
      indicador.hidden = false; indicador.className = 'conexao conexao-off';
      indicador.textContent = 'Sem internet. ' + (temPendentes
        ? 'Os registros novos estão guardados neste celular e serão enviados quando a internet voltar.'
        : 'Você pode continuar anotando normalmente.');
    } else if (temPendentes) {
      indicador.hidden = false; indicador.className = 'conexao';
      indicador.textContent = '⏳ Enviando para a nuvem…';
    } else {
      indicador.hidden = true;
    }
  }
  window.addEventListener('online', atualizarIndicador);
  window.addEventListener('offline', atualizarIndicador);

  async function entrarNaFamilia() {
    modo = 'iniciando'; desenhar();
    try {
      familia = await Nuvem.buscarFamilia(emailDoUsuario());
    } catch (e) {
      erroCarga = e;
      modo = e && e.code === 'permission-denied' ? 'sem-acesso' : 'erro-carga';
      desenhar(); return;
    }
    if (!familia) { modo = 'sem-familia'; desenhar(); return; }
    comecarAOuvir();
  }

  function comecarAOuvir() {
    estado = estadoVazio(); carregado = {}; assinaturas = {}; pendentes = {}; esquecerKms();
    modo = 'carregando-dados'; desenhar();
    Nuvem.ouvir(familia.id, aoReceber, function (e) {
      if (modo === 'demo') return;
      Nuvem.pararDeOuvir();
      erroCarga = e;
      modo = e && e.code === 'permission-denied' ? 'sem-acesso' : 'erro-carga';
      desenhar();
    });
  }

  function aoReceber(ev) {
    if (modo !== 'nuvem' && modo !== 'carregando-dados') return;
    pendentes[ev.colecao] = ev.pendentes;
    var assinatura, mudou;
    if (ev.colecao === 'familia') {
      if (!ev.doc) { Nuvem.pararDeOuvir(); familia = null; modo = 'sem-familia'; desenhar(); return; }
      if (!Array.isArray(ev.doc.emails) || ev.doc.emails.indexOf(emailDoUsuario()) < 0) {
        Nuvem.pararDeOuvir(); estado = estadoVazio(); modo = 'sem-acesso'; desenhar(); return;
      }
      assinatura = JSON.stringify(ev.doc);
      familia = ev.doc;
    } else {
      var docs = ev.docs.slice().sort(function (a, b) {
        return ((a.criadoEm || 0) - (b.criadoEm || 0)) || String(a.nome || a.id).localeCompare(String(b.nome || b.id), 'pt-BR');
      });
      assinatura = JSON.stringify(docs);
      estado[COLECOES[ev.colecao]] = docs;
    }
    mudou = assinatura !== assinaturas[ev.colecao];
    assinaturas[ev.colecao] = assinatura;
    carregado[ev.colecao] = true;

    if (modo === 'carregando-dados') {
      if (carregado.familia && carregado.veiculos && carregado.abastecimentos && carregado.manutencoes) {
        modo = 'nuvem';
        carroAtual();
        desenhar();
        atualizarIndicador();
      }
      return;
    }
    atualizarIndicador();
    if (mudou) redesenharSePossivel();
  }

  // Atualiza a tela com dados vindos de outro celular, sem atrapalhar quem está preenchendo um formulário.
  function redesenharSePossivel() {
    var r = rotaAtual().nome;
    var preenchendo = ['abastecer', 'manutencao', 'carro', 'familia'].indexOf(r) >= 0;
    if (!janela.hidden || preenchendo) { redesenhoPendente = true; return; }
    var y = window.scrollY;
    desenhar(true);
    window.scrollTo(0, y);
  }

  // =====================================================================
  // Início
  // =====================================================================
  async function iniciar() {
    desenhar();
    var cfg = window.FIREBASE_CONFIG;
    if (!window.Nuvem || !Nuvem.configValida(cfg)) { modo = 'sem-config'; desenhar(); return; }
    try {
      await Nuvem.iniciar(cfg);
      nuvemPronta = true;
    } catch (e) {
      erroCarga = e; modo = 'erro-carga'; desenhar(); return;
    }
    Nuvem.aoMudarUsuario(function (u) {
      usuarioAtual = u;
      // Preferências de aparência da pessoa: valem em qualquer celular em que ela entrar.
      if (u && modo !== 'demo') Nuvem.ouvirPerfil(u.uid, aoReceberPerfil); else Nuvem.pararPerfil();
      if (modo === 'demo') return;
      decidirPorUsuario();
    });
  }

  function decidirPorUsuario() {
    var u = usuarioAtual;
    if (!u) { Nuvem.pararDeOuvir(); familia = null; estado = estadoVazio(); modo = 'login'; desenhar(); return; }
    if (!u.emailVerified) { modo = 'verificar'; desenhar(); return; }
    entrarNaFamilia();
  }

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
  iniciar();
})();
