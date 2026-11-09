/*
 * Ligação com o Firebase (login + Cloud Firestore).
 * O SDK é carregado do CDN oficial do Google (versão fixa). Nenhuma credencial
 * administrativa é usada aqui: só a configuração WEB pública do projeto, que
 * fica em firebase-config.js (fora do Git). A proteção dos dados é feita pelas
 * regras em firestore.rules.
 */
(function (root) {
  'use strict';

  var VERSAO_SDK = '10.14.1';
  var BASE = 'https://www.gstatic.com/firebasejs/' + VERSAO_SDK + '/';
  var TAMANHO_LOTE = 200;

  var fb = null, auth = null, db = null;
  var familiaId = null;
  var cancelamentos = [];

  function configValida(c) {
    return !!(c && typeof c === 'object' && c.apiKey && c.projectId && c.appId &&
      String(c.apiKey).indexOf('COLE') < 0);
  }

  async function iniciar(config) {
    var mods = await Promise.all([
      import(BASE + 'firebase-app.js'),
      import(BASE + 'firebase-auth.js'),
      import(BASE + 'firebase-firestore.js')
    ]);
    fb = Object.assign({}, mods[0], mods[1], mods[2]);
    var app = fb.initializeApp(config);
    auth = fb.getAuth(app);
    auth.languageCode = 'pt-BR';
    try {
      // Cache no aparelho: funciona sem internet e envia quando a conexão voltar.
      db = fb.initializeFirestore(app, {
        localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() })
      });
    } catch (e) {
      db = fb.getFirestore(app);
    }
    // Só para desenvolvimento/testes: { emulador: true } usa os emuladores locais do Firebase.
    if (config.emulador) {
      fb.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      fb.connectFirestoreEmulator(db, '127.0.0.1', 8080);
    }
  }

  // ---------- Login ----------
  function aoMudarUsuario(cb) { return fb.onAuthStateChanged(auth, cb); }
  function usuario() { return auth ? auth.currentUser : null; }
  function entrarGoogle() {
    var p = new fb.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    return fb.signInWithPopup(auth, p);
  }
  function entrarEmail(email, senha) { return fb.signInWithEmailAndPassword(auth, email, senha); }
  function esqueciSenha(email) { return fb.sendPasswordResetEmail(auth, email); }
  function enviarVerificacao() { return fb.sendEmailVerification(auth.currentUser); }
  async function recarregarUsuario() {
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true); // atualiza o "e-mail verificado" para as regras
    return auth.currentUser;
  }
  function sair() { pararDeOuvir(); pararPerfil(); familiaId = null; return fb.signOut(auth); }

  // ---------- Família ----------
  async function buscarFamilia(email) {
    var q = fb.query(fb.collection(db, 'familias'), fb.where('emails', 'array-contains', email), fb.limit(1));
    var r = await fb.getDocs(q);
    if (r.empty) return null;
    var d = r.docs[0];
    return Object.assign({ id: d.id }, d.data());
  }
  async function criarFamilia(nome, email, uid) {
    var ref = fb.doc(fb.collection(db, 'familias'));
    await fb.setDoc(ref, { nome: nome, emails: [email], criadoPor: uid, criadoPorEmail: email, criadoEm: Date.now() });
    return { id: ref.id, nome: nome, emails: [email], criadoPor: uid, criadoPorEmail: email };
  }
  function atualizarEmails(emails) {
    return fb.updateDoc(fb.doc(db, 'familias', familiaId), { emails: emails });
  }

  // ---------- Leitura em tempo real ----------
  // cb({ colecao, docs: [...], pendentes: bool, doCache: bool }) ; erro(e)
  function ouvir(fid, cb, erro) {
    pararDeOuvir();
    familiaId = fid;
    cancelamentos.push(fb.onSnapshot(fb.doc(db, 'familias', fid), { includeMetadataChanges: true }, function (s) {
      cb({ colecao: 'familia', doc: s.exists() ? Object.assign({ id: s.id }, s.data()) : null, pendentes: s.metadata.hasPendingWrites, doCache: s.metadata.fromCache });
    }, erro));
    ['veiculos', 'abastecimentos', 'manutencoes'].forEach(function (col) {
      cancelamentos.push(fb.onSnapshot(fb.collection(db, 'familias', fid, col), { includeMetadataChanges: true }, function (s) {
        cb({
          colecao: col,
          docs: s.docs.map(function (d) { return Object.assign({}, d.data(), { id: d.id }); }),
          pendentes: s.metadata.hasPendingWrites, doCache: s.metadata.fromCache
        });
      }, erro));
    });
  }
  function pararDeOuvir() {
    cancelamentos.forEach(function (c) { try { c(); } catch (e) { /* ok */ } });
    cancelamentos = [];
  }

  // ---------- Gravação ----------
  function semId(dados) {
    var d = Object.assign({}, dados);
    delete d.id; delete d.carroIdAntigo;
    return d;
  }
  function gravar(colecao, id, dados) {
    return fb.setDoc(fb.doc(db, 'familias', familiaId, colecao, id), semId(dados));
  }
  function apagar(colecao, id) {
    return fb.deleteDoc(fb.doc(db, 'familias', familiaId, colecao, id));
  }
  // operacoes: [{ tipo: 'set'|'delete', colecao, id, dados }]
  function emLotes(operacoes) {
    var promessas = [];
    for (var i = 0; i < operacoes.length; i += TAMANHO_LOTE) {
      var lote = fb.writeBatch(db);
      operacoes.slice(i, i + TAMANHO_LOTE).forEach(function (op) {
        var ref = fb.doc(db, 'familias', familiaId, op.colecao, op.id);
        if (op.tipo === 'delete') lote.delete(ref); else lote.set(ref, semId(op.dados));
      });
      promessas.push(lote.commit());
    }
    return Promise.all(promessas);
  }
  // ---------- Preferências da pessoa (perfis/{uid}) ----------
  // Separadas dos dados da família; as regras só deixam cada um ler e gravar o próprio.
  // O cache do Firestore guarda a última versão: sem internet, ela continua valendo,
  // e uma mudança feita sem internet é enviada quando a conexão voltar.
  var cancelarPerfil = null;
  function ouvirPerfil(uid, cb) {
    pararPerfil();
    cancelarPerfil = fb.onSnapshot(fb.doc(db, 'perfis', uid), function (s) {
      cb(s.exists() ? s.data() : null);
    }, function () { /* sem acesso ao perfil: o app segue com a preferência do aparelho */ });
  }
  function pararPerfil() {
    if (cancelarPerfil) { try { cancelarPerfil(); } catch (e) { /* ok */ } }
    cancelarPerfil = null;
  }
  function gravarPerfil(uid, dados) {
    return fb.setDoc(fb.doc(db, 'perfis', uid), { tema: dados.tema, texto: dados.texto, atualizadoEm: Date.now() });
  }

  function novoId(colecao) { return fb.doc(fb.collection(db, 'familias', familiaId || '_', colecao)).id; }

  root.Nuvem = {
    configValida: configValida, iniciar: iniciar,
    aoMudarUsuario: aoMudarUsuario, usuario: usuario, entrarGoogle: entrarGoogle, entrarEmail: entrarEmail,
    esqueciSenha: esqueciSenha, enviarVerificacao: enviarVerificacao, recarregarUsuario: recarregarUsuario, sair: sair,
    buscarFamilia: buscarFamilia, criarFamilia: criarFamilia, atualizarEmails: atualizarEmails,
    ouvir: ouvir, pararDeOuvir: pararDeOuvir, ouvirPerfil: ouvirPerfil, pararPerfil: pararPerfil, gravarPerfil: gravarPerfil, gravar: gravar, apagar: apagar, emLotes: emLotes, novoId: novoId
  };
})(this);
