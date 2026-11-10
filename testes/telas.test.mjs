// Testes de tela do Controle de Bordo (navegador real + emuladores do Firebase).
// Nada aqui toca o projeto Firebase real.
//   npm install
//   npx playwright install chromium
//   npm run test:telas
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const PROJ = 'demo-controle-do-carro';
const AUTH = 'http://127.0.0.1:9099';
const FS = `http://127.0.0.1:8080/v1/projects/${PROJ}/databases/(default)/documents`;
const DONO = { Authorization: 'Bearer owner', 'content-type': 'application/json' };
const RAIZ = fileURLToPath(new URL('..', import.meta.url));

// ---------- servidor do site, com a configuração apontando para os emuladores ----------
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const servidor = createServer(async (req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (caminho === '/firebase-config.js') {
    res.writeHead(200, { 'content-type': 'text/javascript' });
    return res.end(`window.FIREBASE_CONFIG = { apiKey: 'x', authDomain: '${PROJ}.firebaseapp.com', projectId: '${PROJ}', appId: '1:1:web:1', emulador: true };`);
  }
  if (caminho === '/sw.js') { res.writeHead(404); return res.end(); } // sem cache entre testes
  try {
    const arq = normalize(join(RAIZ, caminho === '/' ? 'index.html' : caminho));
    if (!arq.startsWith(RAIZ)) throw new Error('fora');
    const corpo = await readFile(arq);
    res.writeHead(200, { 'content-type': TIPOS[extname(arq)] || 'application/octet-stream' });
    res.end(corpo);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => servidor.listen(0, '127.0.0.1', r));
const SITE = `http://127.0.0.1:${servidor.address().port}/`;

// ---------- apoio: emuladores ----------
async function criarUsuario(email, senha) {
  const r = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=x`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: senha, returnSecureToken: true })
  })).json();
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJ}/accounts:update`, {
    method: 'POST', headers: DONO, body: JSON.stringify({ localId: r.localId, emailVerified: true })
  });
  return r.localId;
}
function valor(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(valor) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, valor(x)])) } };
}
function ler(v) {
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(ler);
  return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, ler(x)]));
}
async function gravarDoc(caminho, dados) {
  const r = await fetch(`${FS}/${caminho}`, { method: 'PATCH', headers: DONO, body: JSON.stringify({ fields: valor(dados).mapValue.fields }) });
  assert.ok(r.ok, 'falha ao preparar ' + caminho);
}
async function listar(caminho) {
  const r = await (await fetch(`${FS}/${caminho}?pageSize=300`, { headers: DONO })).json();
  return (r.documents || []).map(d => ({ id: d.name.split('/').pop(), atualizado: d.updateTime, ...ler({ mapValue: { fields: d.fields || {} } }) }));
}
async function familiaDe(email) {
  return (await listar('familias')).find(f => (f.emails || []).includes(email));
}
// Espera a nuvem refletir uma condição (as gravações do app não bloqueiam a tela).
async function esperarNuvem(fn, msg) {
  for (let i = 0; i < 60; i++) { if (await fn()) return; await new Promise(r => setTimeout(r, 250)); }
  assert.fail('a nuvem não refletiu: ' + msg);
}

// ---------- apoio: navegador ----------
const navegador = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } } : {});
async function novaPagina() {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  p.errosJs = [];
  p.on('pageerror', e => p.errosJs.push(e.message));
  return p;
}
async function entrar(p, email, senha) {
  await p.goto(SITE);
  await p.waitForSelector('#form-login', { timeout: 30000 });
  await p.fill('#email', email); await p.fill('#senha', senha); await p.click('#botao-entrar');
}
const ir = (p, rota) => p.evaluate(r => { location.hash = r; }, rota).then(() => p.waitForTimeout(200));
async function okJanela(p) { await p.click('[data-janela=ok]'); await p.waitForTimeout(150); }
async function cadastrarCarro(p, nome) {
  await ir(p, '#carro/novo');
  await p.fill('#nome', nome);
  await p.click('#form-carro button[type=submit]');
  await okJanela(p);
}
async function escolher(p, nome) {
  await ir(p, '#inicio');
  await p.waitForSelector('.garagem .escolha-carro');
  await p.click(`.garagem .escolha-carro:has(.nome:text-is("${nome}"))`);
  await p.waitForSelector(`.topo-nome:has-text("${nome}")`);
}
// Salva o formulário; se o app pedir confirmação de algo "diferente", confirma.
async function salvarFormulario(p, seletor) {
  await p.click(seletor);
  await p.waitForSelector('.janela');
  if (await p.isVisible('[data-janela=salvar]')) { await p.click('[data-janela=salvar]'); await p.waitForSelector('.janela'); }
  const texto = (await p.textContent('.janela')).replace(/\s+/g, ' ');
  await okJanela(p);
  return texto;
}
async function abastecer(p, km, litros, valor) {
  await ir(p, '#abastecer');
  await p.fill('#km', km); await p.fill('#litros', litros); await p.fill('#valor', valor);
  return salvarFormulario(p, '#form-abast button[type=submit]');
}
async function abrirCorrecao(p, aba) {
  await ir(p, '#historico');
  await p.click(`[data-aba=${aba}]`); await p.click('[data-periodo=tudo]');
  await p.click('.registro a:has-text("Corrigir") >> nth=0');
  await p.waitForSelector(aba === 'abastecimentos' ? '#form-abast' : '#form-manut');
}
const doCarro = async (col, carroId) => (await listar(`familias/${fid}/${col}`)).filter(r => r.carroId === carroId);
const textoLembretes = async (p, carroId) => { await ir(p, '#painel/' + carroId); return (await p.textContent('.tela')).replace(/\s+/g, ' '); };

async function arquivoDeCopia(dados) {
  const caminho = join(RAIZ, 'testes', '.copia-teste-' + Math.random().toString(36).slice(2) + '.json');
  await (await import('node:fs/promises')).writeFile(caminho, JSON.stringify({ aplicativo: 'controle-do-carro', versao: 2, criadoEm: new Date().toISOString(), dados }));
  return caminho;
}

let falhas = 0, total = 0;
async function teste(nome, fn) {
  total++;
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { falhas++; console.log('  FALHOU  ' + nome + '\n        ' + (e && e.message)); }
}

console.log('Telas (navegador + emuladores)');
await criarUsuario('responsavel@example.com', 'senha-teste-1');
const p = await novaPagina();
let fid, idAbastCarro2;

await teste('família nova começa sem nenhum carro', async () => {
  await entrar(p, 'responsavel@example.com', 'senha-teste-1');
  await p.click('#criar'); await p.click('[data-janela=sim]');
  await p.waitForSelector('text=Nenhum carro cadastrado ainda');
  assert.ok(await p.isVisible('a:has-text("Cadastrar primeiro carro")'));
  assert.equal(await p.$('#nome1'), null, 'não deve haver nomes de carro pré-preenchidos');
  fid = (await familiaDe('responsavel@example.com')).id;
  assert.equal((await listar(`familias/${fid}/veiculos`)).length, 0);
});

await teste('cadastra o primeiro carro pelo botão "Cadastrar primeiro carro"', async () => {
  await p.click('a:has-text("Cadastrar primeiro carro")');
  assert.equal(await p.inputValue('#nome'), '', 'o nome começa vazio');
  await p.click('#form-carro button[type=submit]');
  assert.match(await p.textContent('#erros'), /nome do carro/);
  await p.fill('#nome', 'Carro 1');
  await p.click('#form-carro button[type=submit]');
  assert.match(await p.textContent('.janela h2'), /Tudo pronto/);
  await okJanela(p);
  assert.match(await p.textContent('.topo-nome'), /Carro 1/);
  assert.match(await p.evaluate(() => location.hash), /^#painel\//, 'depois de cadastrar, abre o painel do carro novo');
  assert.ok(await p.isVisible('.topo-voltar'), 'painel tem "← Garagem"');
  assert.equal(await p.locator('#topo button[data-acao=trocar-carro]').count(), 0, 'com um carro só não há "Trocar carro"');
  await esperarNuvem(async () => (await listar(`familias/${fid}/veiculos`)).length === 1, '1 carro');
});

await teste('com um carro só, a Garagem abre mesmo assim e tem "Adicionar carro"', async () => {
  await p.goto(SITE); await p.waitForSelector('.garagem');   // abrir o app pelo endereço/ícone
  assert.equal(await p.textContent('h1'), 'Garagem');
  assert.equal(await p.locator('.garagem .escolha-carro').count(), 1);
  assert.ok(await p.isVisible('a:has-text("+ Adicionar carro")'));
  assert.equal(await p.locator('#menu a.ativo').textContent(), 'Garagem');
});

await teste('cadastra vários carros (8), sem limite, e as cores podem se repetir', async () => {
  for (let i = 2; i <= 8; i++) await cadastrarCarro(p, 'Carro ' + i);
  await esperarNuvem(async () => (await listar(`familias/${fid}/veiculos`)).length === 8, '8 carros');
  const carros = await listar(`familias/${fid}/veiculos`);
  assert.ok(new Set(carros.map(c => c.cor)).size < carros.length, 'com 8 carros alguma cor se repete');
  assert.ok(carros.every(c => c.arquivado === false));
});

await teste('Garagem continua prática com muitos carros (lista compacta e busca)', async () => {
  await ir(p, '#inicio');
  await p.waitForSelector('.garagem .escolha-carro');
  assert.equal(await p.locator('.escolha-carro').count(), 8);
  assert.ok(await p.isVisible('.lista-carros.lista-compacta'));
  await p.fill('#busca-carro', 'carro 3');
  await p.waitForTimeout(150);
  assert.equal(await p.locator('.escolha-carro:visible').count(), 1);
  await p.click('.escolha-carro:visible');
  await p.waitForSelector('.topo-nome:has-text("Carro 3")');
  assert.ok(await p.isVisible('.topo-voltar:has-text("Garagem")'), 'painel tem "← Garagem"');
});

await teste('no painel, "Trocar carro" alterna direto para outro carro e "← Garagem" volta à lista', async () => {
  await escolher(p, 'Carro 3');
  assert.ok(await p.isVisible('.topo-voltar:has-text("Garagem")'));
  assert.ok(await p.isVisible('#topo button[data-acao=trocar-carro]'));
  // no celular (390 px) o nome do carro aparece inteiro, sem ser cortado pelos dois botões
  assert.ok(await p.evaluate(() => { const n = document.querySelector('.topo-nome'); return n.scrollWidth <= n.clientWidth; }), 'nome do carro inteiro');
  await p.click('#topo button[data-acao=trocar-carro]');
  await p.waitForSelector('.lista-trocar');
  assert.ok(await p.isVisible('.opcao-carro.atual:has-text("Carro 3")'), 'o carro atual vem marcado');
  await p.click('.opcao-carro:has-text("Carro 5")');
  await p.waitForSelector('.topo-nome:has-text("Carro 5")');
  const c5 = (await listar(`familias/${fid}/veiculos`)).find(c => c.nome === 'Carro 5');
  assert.equal(await p.evaluate(() => location.hash), '#painel/' + c5.id, 'vai direto para o painel do outro carro, sem passar pela Garagem');
  assert.ok(await p.isVisible('a:has-text("Registrar abastecimento")'));
  await p.click('.topo-voltar');
  await p.waitForSelector('.garagem');
  assert.equal(await p.textContent('h1'), 'Garagem');
  assert.equal(await p.locator('.garagem .escolha-carro').count(), 8, '"← Garagem" mostra a lista completa');
});

await teste('entrar de novo abre a Garagem, sem pedir para escolher carro', async () => {
  await p.goto(SITE); await p.waitForSelector('.garagem');   // abrir o app pelo endereço/ícone
  assert.equal(await p.textContent('h1'), 'Garagem');
  assert.equal(await p.locator('text=Qual carro você quer ver?').count(), 0);
});

await teste('cartões da Garagem mostram nome, marca/modelo, quilometragem e próximo aviso', async () => {
  const c5 = (await listar(`familias/${fid}/veiculos`)).find(c => c.nome === 'Carro 5');
  await gravarDoc(`familias/${fid}/veiculos/${c5.id}`, { nome: 'Carro 5', marca: 'Marca W', modelo: 'Modelo K', ano: '2019', cor: c5.cor, oleoKm: 5000, oleoMeses: null, criadoEm: c5.criadoEm, arquivado: false, arquivadoEm: null });
  await gravarDoc(`familias/${fid}/abastecimentos/g1`, { carroId: c5.id, data: '2026-10-01', km: 33000, litros: 30, valor: 180, tanqueCheio: true });
  await gravarDoc(`familias/${fid}/manutencoes/g2`, { carroId: c5.id, tipo: 'oleo', data: '2026-10-01', km: 29000, valor: null });
  await p.waitForTimeout(800);
  await ir(p, '#inicio');
  const cartao = (await p.textContent(`.garagem .escolha-carro:has(.nome:text-is("Carro 5"))`)).replace(/\s+/g, ' ');
  assert.match(cartao, /Marca W Modelo K · 2019/);
  assert.match(cartao, /Quilometragem\s*33\.000 km/);
  assert.match(cartao, /Faltam 1\.000 km para a troca de óleo/);
  // limpa para não afetar os próximos testes
  for (const doc of ['abastecimentos/g1', 'manutencoes/g2']) await fetch(`${FS}/familias/${fid}/${doc}`, { method: 'DELETE', headers: DONO });
  await p.waitForTimeout(500);
});

await teste('registros ficam separados por carro', async () => {
  await escolher(p, 'Carro 2');
  await ir(p, '#abastecer');
  assert.match(await p.textContent('.carro-do-registro'), /Carro 2/);
  await p.fill('#km', '10000'); await p.fill('#litros', '40'); await p.fill('#valor', '240');
  await p.click('#form-abast button[type=submit]'); await okJanela(p);
  await p.waitForSelector('.topo-voltar');
  assert.match(await p.evaluate(() => location.hash), /^#painel\//, 'volta ao painel do carro');
  assert.match(await p.textContent('.topo-nome'), /Carro 2/);
  await ir(p, '#historico'); await p.click('[data-periodo=tudo]');
  assert.match(await p.textContent('.resumo-periodo'), /1 abastecimento/);
  assert.match(await p.textContent('.carro-da-tela'), /Mostrando: Carro 2/);
  // "Trocar" no Histórico: escolhe outro carro e continua no Histórico
  await p.click('.carro-da-tela [data-acao=trocar-carro]');
  await p.click('.opcao-carro:has-text("Carro 3")');
  await p.waitForSelector('.carro-da-tela:has-text("Carro 3")');
  assert.equal(await p.evaluate(() => location.hash), '#historico');
  assert.ok(await p.isVisible('text=Nenhum abastecimento registrado ainda'));
  await ir(p, '#relatorios');
  assert.match(await p.textContent('.carro-da-tela'), /Mostrando: Carro 3/);
  assert.match(await p.textContent('.topo-nome'), /Carro 3/);
  await esperarNuvem(async () => (await listar(`familias/${fid}/abastecimentos`)).length === 1, '1 abastecimento');
  idAbastCarro2 = (await listar(`familias/${fid}/abastecimentos`))[0].id;
});

await teste('arquivar um carro não apaga os registros dele', async () => {
  const carro2 = (await listar(`familias/${fid}/veiculos`)).find(c => c.nome === 'Carro 2');
  await ir(p, '#carro/' + carro2.id);
  await p.click('#arquivar-carro'); await p.click('[data-janela=sim]'); await okJanela(p);
  await esperarNuvem(async () => (await listar(`familias/${fid}/veiculos`)).find(c => c.id === carro2.id).arquivado === true, 'arquivado');
  assert.equal((await listar(`familias/${fid}/abastecimentos`)).length, 1, 'o abastecimento continua no banco');
  assert.equal((await listar(`familias/${fid}/veiculos`)).length, 8, 'o carro não foi apagado');
  assert.ok(await p.isVisible('h2:has-text("Carros arquivados")'));
  await ir(p, '#inicio'); await p.waitForSelector('.garagem .escolha-carro');
  assert.equal(await p.locator('.escolha-carro').count(), 7, 'arquivado some da Garagem');
  assert.ok(await p.isVisible('text=1 carro arquivado'));
});

await teste('"Ver histórico" do carro arquivado é somente leitura', async () => {
  await ir(p, '#ajustes');
  await p.click('.carro-arquivado a:has-text("Ver histórico")');
  await p.waitForSelector('.arquivo-cabecalho');
  assert.ok(await p.isVisible('text=somente leitura'));
  assert.match(await p.textContent('.arquivo-nome'), /Carro 2/);
  await p.click('[data-periodo=tudo]');
  assert.match(await p.textContent('.resumo-periodo'), /1 abastecimento/);
  for (const t of ['Corrigir', 'Apagar', 'Registrar abastecimento']) assert.equal(await p.locator(`.tela >> text="${t}"`).count(), 0, 'não deve mostrar ' + t);
  await p.click('[data-aba=manutencoes]');
  assert.equal(await p.locator('.tela >> text="Registrar manutenção"').count(), 0);
});

await teste('não é possível corrigir ou registrar no carro arquivado (nem por link direto)', async () => {
  await ir(p, '#abastecer/' + idAbastCarro2);
  assert.match(await p.textContent('.janela h2'), /Carro arquivado/);
  await okJanela(p);
  assert.ok(await p.isVisible('text=somente leitura'));
  await ir(p, '#abastecer');
  assert.doesNotMatch(await p.textContent('.carro-do-registro'), /Carro 2/, 'o formulário novo nunca usa o carro arquivado');
  await ir(p, '#inicio');
});

await teste('reativar devolve o carro à lista com os registros', async () => {
  await ir(p, '#ajustes');
  await p.click('.carro-arquivado [data-acao=reativar-carro]'); await okJanela(p);
  await esperarNuvem(async () => (await listar(`familias/${fid}/veiculos`)).every(c => c.arquivado === false), 'reativado');
  await ir(p, '#inicio'); await p.waitForSelector('.garagem .escolha-carro');
  assert.equal(await p.locator('.escolha-carro').count(), 8);
  await p.click('.escolha-carro:has(.nome:text-is("Carro 2"))');
  await p.waitForSelector('.topo-nome:has-text("Carro 2")');
  await ir(p, '#historico'); await p.click('[data-aba=abastecimentos]'); await p.click('[data-periodo=tudo]');
  assert.match(await p.textContent('.resumo-periodo'), /1 abastecimento/);
  assert.ok(await p.isVisible('.registro >> text=Corrigir'), 'volta a poder corrigir');
});

// ---------- Correção de registros e edição do carro ----------
let idTeste, idsAbast = [], idOleo;

await teste('corrigir um abastecimento mantém o ID e refaz distância, consumo, custo, preço e relatórios', async () => {
  await cadastrarCarro(p, 'Carro Teste');
  idTeste = (await listar(`familias/${fid}/veiculos`)).find(c => c.nome === 'Carro Teste').id;
  await abastecer(p, '20000', '40', '240');
  const t2 = await abastecer(p, '20500', '50', '300');
  assert.match(t2, /10,0 km por litro/);
  await esperarNuvem(async () => (await doCarro('abastecimentos', idTeste)).length === 2, '2 abastecimentos');
  idsAbast = (await doCarro('abastecimentos', idTeste)).map(a => a.id).sort();

  await abrirCorrecao(p, 'abastecimentos');
  assert.equal(await p.inputValue('#km'), '20.500', 'o formulário vem preenchido com o registro');
  await p.fill('#km', '20600'); await p.fill('#litros', '40'); await p.fill('#valor', '260');
  const t = await salvarFormulario(p, '#form-abast button[type=submit]');
  assert.match(t, /Abastecimento corrigido/);
  assert.match(t, /Andou 600 km/);
  assert.match(t, /15,0 km por litro/);          // 600 km / 40 L
  assert.match(t, /R\$ 0,43 por km/);            // 260 / 600
  assert.match(t, /R\$ 6,50/);                   // 260 / 40
  assert.match(t, /subiu R\$ 0,50/);             // 6,50 - 6,00

  await esperarNuvem(async () => (await doCarro('abastecimentos', idTeste)).some(a => a.km === 20600), 'correção gravada');
  const depois = await doCarro('abastecimentos', idTeste);
  assert.deepEqual(depois.map(a => a.id).sort(), idsAbast, 'mesmos IDs, nenhum registro novo');
  const corrigido = depois.find(a => a.km === 20600);
  assert.equal(corrigido.litros, 40); assert.equal(corrigido.valor, 260);

  await ir(p, '#historico'); await p.click('[data-aba=abastecimentos]'); await p.click('[data-periodo=tudo]');
  assert.match(await p.textContent('.resumo-periodo'), /R\$ 500,00/);
  assert.match(await p.textContent('.resumo-periodo'), /15,0 km\/L/);
  await ir(p, '#relatorios');
  assert.match(await p.textContent('.tela'), /Total no período: R\$ 500,00/);
});

await teste('corrigir uma manutenção mantém o ID e refaz o lembrete e a próxima troca', async () => {
  await ir(p, '#manutencao');
  await p.click('.opcoes.tipos .opcao:has-text("Troca de óleo")');
  await p.fill('#km', '20600');
  await salvarFormulario(p, '#form-manut button[type=submit]');
  assert.match(await textoLembretes(p, idTeste), /Faltam 5\.000 km para a troca de óleo/);
  await esperarNuvem(async () => (await doCarro('manutencoes', idTeste)).length === 1, 'troca de óleo');
  idOleo = (await doCarro('manutencoes', idTeste))[0].id;

  await abrirCorrecao(p, 'manutencoes');
  await p.fill('#km', '20000');
  const t = await salvarFormulario(p, '#form-manut button[type=submit]');
  assert.match(t, /Manutenção corrigida/);
  assert.match(t, /Faltam 4\.400 km para a troca de óleo/);   // 20.000 + 5.000 - 20.600
  assert.match(await textoLembretes(p, idTeste), /Faltam 4\.400 km para a troca de óleo/);
  await esperarNuvem(async () => (await doCarro('manutencoes', idTeste)).some(m => m.km === 20000), 'correção da manutenção');
  assert.deepEqual((await doCarro('manutencoes', idTeste)).map(m => m.id), [idOleo], 'mesmo ID');

  // Pneus: lembrete definido pela pessoa e corrigido depois
  await ir(p, '#manutencao');
  await p.click('.opcoes.tipos .opcao:has-text("Troca de pneus")');
  await p.fill('#km', '20600');
  await p.click('#bloco-lembrete summary'); await p.fill('#lembreteKm', '40000');
  await salvarFormulario(p, '#form-manut button[type=submit]');
  assert.match(await textoLembretes(p, idTeste), /Faltam 40\.000 km para a troca de pneus/);
  await abrirCorrecao(p, 'manutencoes');                      // o mais recente é o de pneus
  assert.equal(await p.inputValue('#lembreteKm'), '40.000');
  await p.fill('#lembreteKm', '30000');
  await salvarFormulario(p, '#form-manut button[type=submit]');
  assert.match(await textoLembretes(p, idTeste), /Faltam 30\.000 km para a troca de pneus/);
});

await teste('editar nome, marca, modelo, ano, cor e óleo do carro mantém o ID e os registros', async () => {
  const totalAntes = (await listar(`familias/${fid}/veiculos`)).length;
  await ir(p, '#ajustes');
  await p.click('.lista-ajustes a:has-text("Carro Teste")');
  await p.waitForSelector('#form-carro');
  assert.equal(await p.inputValue('#nome'), 'Carro Teste');
  await p.fill('#nome', 'Carro Renomeado'); await p.fill('#marca', 'Marca Z'); await p.fill('#modelo', 'Modelo Q'); await p.fill('#ano', '2020');
  await p.click('.opcao:has-text("Verde")');
  await p.fill('#oleoKm', '10000'); await p.fill('#oleoMeses', '6');
  await salvarFormulario(p, '#form-carro button[type=submit]');
  await esperarNuvem(async () => (await listar(`familias/${fid}/veiculos`)).some(c => c.id === idTeste && c.nome === 'Carro Renomeado'), 'carro editado');
  const carros = await listar(`familias/${fid}/veiculos`);
  const c = carros.find(x => x.id === idTeste);
  assert.equal(carros.length, totalAntes, 'nenhum carro novo foi criado');
  assert.deepEqual([c.nome, c.marca, c.modelo, c.ano, c.cor, c.oleoKm, c.oleoMeses], ['Carro Renomeado', 'Marca Z', 'Modelo Q', '2020', '#15803d', 10000, 6]);
  assert.equal((await doCarro('abastecimentos', idTeste)).length, 2, 'abastecimentos continuam ligados ao carro');
  assert.equal((await doCarro('manutencoes', idTeste)).length, 2, 'manutenções continuam ligadas ao carro');
  const tela = await textoLembretes(p, idTeste);
  assert.match(await p.textContent('.topo-nome'), /Carro Renomeado/);
  assert.match(tela, /Faltam 9\.400 km para a troca de óleo/);   // 20.000 + 10.000 - 20.600
});

await teste('carro arquivado é só consulta: não edita o carro, abastecimentos nem manutenções', async () => {
  await ir(p, '#carro/' + idTeste);
  await p.click('#arquivar-carro'); await p.click('[data-janela=sim]'); await okJanela(p);
  await esperarNuvem(async () => (await listar(`familias/${fid}/veiculos`)).find(c => c.id === idTeste).arquivado === true, 'arquivado');
  const antes = JSON.stringify([await doCarro('abastecimentos', idTeste), await doCarro('manutencoes', idTeste)]);

  await ir(p, '#carro/' + idTeste);
  await p.waitForSelector('.arquivo-cabecalho');
  assert.equal(await p.$('#form-carro'), null, 'o cadastro do carro arquivado não abre para edição');
  await ir(p, '#manutencao/' + idOleo);
  assert.match(await p.textContent('.janela h2'), /Carro arquivado/); await okJanela(p);
  await ir(p, '#abastecer/' + idsAbast[0]);
  assert.match(await p.textContent('.janela h2'), /Carro arquivado/); await okJanela(p);
  await p.waitForSelector('.arquivo-cabecalho');
  await p.click('[data-aba=manutencoes]'); await p.click('[data-periodo=tudo]');
  assert.equal(await p.locator('.tela >> text="Corrigir"').count(), 0);
  assert.equal(await p.locator('.registro').count(), 2, 'as manutenções aparecem para consulta');
  assert.equal(JSON.stringify([await doCarro('abastecimentos', idTeste), await doCarro('manutencoes', idTeste)]), antes, 'nada foi alterado');
});

await teste('se o carro for arquivado em outro celular durante a edição, salvar não o desarquiva', async () => {
  const outro = (await listar(`familias/${fid}/veiculos`)).find(c => c.nome === 'Carro 4');
  await ir(p, '#carro/' + outro.id);
  await p.waitForSelector('#form-carro');
  const { id, atualizado, ...dados } = outro;
  await gravarDoc(`familias/${fid}/veiculos/${outro.id}`, { ...dados, arquivado: true, arquivadoEm: Date.now() });  // "outro celular"
  await p.waitForTimeout(800);
  await p.fill('#nome', 'Carro 4 editado');
  await p.click('#form-carro button[type=submit]');
  assert.match(await p.textContent('#erros'), /arquivado/);
  await p.waitForTimeout(500);
  const c = (await listar(`familias/${fid}/veiculos`)).find(x => x.id === outro.id);
  assert.equal(c.arquivado, true, 'continua arquivado');
  assert.equal(c.nome, 'Carro 4', 'o nome não foi alterado');
});

await teste('restaurar uma cópia com 10 carros traz todos (sem corte)', async () => {
  const carros = [], abastecimentos = [];
  for (let i = 1; i <= 10; i++) {
    carros.push({ id: 'rest' + i, nome: 'Restaurado ' + i, cor: '#1e40af', oleoKm: 5000 });
    abastecimentos.push({ id: 'ra' + i, carroId: 'rest' + i, data: '2026-10-01', km: 1000 * i, litros: 30, valor: 180, tanqueCheio: true });
  }
  const arq = await arquivoDeCopia({ carros, abastecimentos, manutencoes: [] });
  await ir(p, '#ajustes');
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('text=Usar uma cópia de segurança')]);
  await fc.setFiles(arq);
  await p.click('[data-janela=substituir]'); await p.click('[data-janela=sim]'); await okJanela(p);
  await esperarNuvem(async () => (await listar(`familias/${fid}/veiculos`)).length === 10, '10 carros restaurados');
  assert.equal((await listar(`familias/${fid}/abastecimentos`)).length, 10);
  await (await import('node:fs/promises')).unlink(arq);
});

await teste('importar (juntar) sempre oferece "Criar como carro novo" e não corta carros', async () => {
  const carros = [1, 2, 3].map(i => ({ id: 'imp' + i, nome: 'Importado ' + i, cor: '#b91c1c', oleoKm: 5000 }));
  const abastecimentos = carros.map((c, i) => ({ id: 'ia' + i, carroId: c.id, data: '2026-10-02', km: 500, litros: 20, valor: 120, tanqueCheio: true }));
  const arq = await arquivoDeCopia({ carros, abastecimentos, manutencoes: [] });
  if (await p.isVisible('.escolha-carro')) await p.click('.escolha-carro >> nth=0');
  await ir(p, '#ajustes');
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('text=Usar uma cópia de segurança')]);
  await fc.setFiles(arq);
  await p.click('[data-janela=juntar]');
  for (let i = 0; i < 3; i++) { await p.waitForSelector('[data-janela=novo]'); await p.click('[data-janela=novo]'); }
  await p.click('[data-janela=sim]'); await okJanela(p);
  await esperarNuvem(async () => (await listar(`familias/${fid}/veiculos`)).length === 13, '13 carros');
  assert.equal((await listar(`familias/${fid}/abastecimentos`)).length, 13);
  await (await import('node:fs/promises')).unlink(arq);
});

await teste('família já cadastrada: abrir o app não altera nenhum carro nem registro', async () => {
  await criarUsuario('antiga@example.com', 'senha-teste-2');
  await gravarDoc('familias/ANTIGA', { nome: 'Família antiga', emails: ['antiga@example.com'], criadoPor: 'x', criadoPorEmail: 'antiga@example.com', criadoEm: 1 });
  await gravarDoc('familias/ANTIGA/veiculos/c1', { nome: 'Carro 1', marca: '', modelo: '', ano: '', cor: '#1e40af', oleoKm: 5000, oleoMeses: null, criadoEm: 1 });
  await gravarDoc('familias/ANTIGA/veiculos/c2', { nome: 'Carro 2', marca: '', modelo: '', ano: '', cor: '#b91c1c', oleoKm: 5000, oleoMeses: null, criadoEm: 2 });
  await gravarDoc('familias/ANTIGA/abastecimentos/x1', { carroId: 'c2', data: '2026-09-01', km: 100, litros: 10, valor: 60, tanqueCheio: true });
  const antes = JSON.stringify([await listar('familias/ANTIGA/veiculos'), await listar('familias/ANTIGA/abastecimentos')]);
  const q = await novaPagina();
  await entrar(q, 'antiga@example.com', 'senha-teste-2');
  await q.waitForSelector('.garagem .escolha-carro');
  assert.equal(await q.locator('.escolha-carro').count(), 2, 'os dois carros antigos aparecem ativos na Garagem');
  await q.click('.escolha-carro >> nth=0');
  await ir(q, '#ajustes'); await ir(q, '#historico'); await q.waitForTimeout(1500);
  const depois = JSON.stringify([await listar('familias/ANTIGA/veiculos'), await listar('familias/ANTIGA/abastecimentos')]);
  assert.equal(depois, antes, 'nenhum documento foi criado, alterado ou apagado');
  assert.deepEqual(q.errosJs, []);
});

await teste('demonstração continua com os 2 carros fictícios e não grava na nuvem', async () => {
  const antes = (await listar('familias')).length;
  const q = await novaPagina();
  await q.goto(SITE); await q.waitForSelector('#form-login');
  await q.click('[data-acao=demo]');
  await q.waitForSelector('.garagem .escolha-carro');
  assert.equal(await q.textContent('h1'), 'Garagem');
  const nomes = await q.locator('.escolha-carro .nome').allTextContents();
  assert.deepEqual(nomes.sort(), ['Carro 1 (exemplo)', 'Carro 2 (exemplo)']);
  assert.equal((await listar('familias')).length, antes);
});

// ---------- Entrada, Garagem, formulários e aparência ----------
const UID_AP = await criarUsuario('aparencia@example.com', 'senha-teste-3');
await gravarDoc('familias/AP', { nome: 'Família AP', emails: ['aparencia@example.com'], criadoPor: UID_AP, criadoPorEmail: 'aparencia@example.com', criadoEm: 1 });
await gravarDoc('familias/AP/veiculos/vw', { nome: 'Carro do Pai', marca: 'volkswagen', modelo: 'Gol', ano: '2016', cor: '#1e40af', oleoKm: 5000, oleoMeses: null, criadoEm: 1, arquivado: false, arquivadoEm: null });
await gravarDoc('familias/AP/veiculos/mw', { nome: 'Carro da Mãe', marca: 'Marca W', modelo: '', ano: '', cor: '#b91c1c', oleoKm: 5000, oleoMeses: null, criadoEm: 2, arquivado: false, arquivadoEm: null });
await gravarDoc('familias/AP/veiculos/sd', { nome: 'Sem dados', marca: '', modelo: '', ano: '', cor: '#15803d', oleoKm: 5000, oleoMeses: null, criadoEm: 3, arquivado: false, arquivadoEm: null });
await gravarDoc('familias/AP/abastecimentos/ap1', { carroId: 'vw', data: '2026-10-01', km: 12000, litros: 30, valor: 180, tanqueCheio: true });
const perfisNaNuvem = async () => (await listar('perfis'));
const ap = await novaPagina();

await teste('entrada: e-mail, senha e "Entrar" primeiro; depois "ou" e Google; demonstração separada abaixo', async () => {
  await ap.goto(SITE); await ap.waitForSelector('#form-login');
  const ordem = await ap.evaluate(() => ['#email', '#senha', '#esqueci', '#botao-entrar', '.separador-ou', '#entrar-google', '[data-acao=demo]']
    .map(s => document.querySelector(s)).map((el, i, todos) => i === 0 || (todos[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) > 0));
  assert.ok(ordem.every(Boolean), 'ordem na tela: ' + JSON.stringify(ordem));
  assert.equal(await ap.textContent('.separador-ou'), 'ou');
  assert.ok(await ap.evaluate(() => document.querySelector('#esqueci').closest('.campo').contains(document.querySelector('#senha'))), '"Esqueci minha senha" fica junto do campo de senha');
  assert.ok(await ap.evaluate(() => !document.querySelector('.entrada-cartao').contains(document.querySelector('[data-acao=demo]'))), 'demonstração fora do cartão de login');
  await ap.click('#mostrar-senha');
  assert.equal(await ap.getAttribute('#senha', 'type'), 'text');
  await ap.click('#mostrar-senha');
  assert.equal(await ap.getAttribute('#senha', 'type'), 'password');
  // celular: tudo da entrada cabe na tela, sem rolar
  const fim = await ap.evaluate(() => document.querySelector('[data-acao=demo]').getBoundingClientRect().bottom);
  assert.ok(fim <= 844, 'botão de demonstração visível sem rolar (fim em ' + Math.round(fim) + ')');
});

await teste('Garagem mostra nome, marca, modelo e ano, com emblema da marca ou genérico', async () => {
  await entrar(ap, 'aparencia@example.com', 'senha-teste-3');
  await ap.waitForSelector('.garagem .escolha-carro');
  const cartao = (n) => ap.locator(`.escolha-carro:has(.nome:text-is("${n}"))`);
  assert.equal((await cartao('Carro do Pai').locator('.descricao').textContent()), 'volkswagen Gol · 2016');
  assert.equal(await cartao('Carro do Pai').locator('.emblema').getAttribute('data-marca'), 'Volkswagen');
  assert.equal((await cartao('Carro do Pai').locator('.emblema').textContent()), 'VW');
  assert.equal((await cartao('Carro da Mãe').locator('.descricao').textContent()), 'Marca W', 'só a marca, sem separadores sobrando');
  assert.equal(await cartao('Carro da Mãe').locator('.emblema-generico').count(), 1, 'marca desconhecida: emblema genérico');
  assert.equal(await cartao('Sem dados').locator('.descricao').count(), 0, 'sem marca/modelo/ano: nenhuma linha vazia');
  const textos = (await ap.locator('.garagem').textContent());
  assert.doesNotMatch(textos, /undefined|null|Marca X|Modelo A/);
  assert.equal(await ap.locator('img[src^="http"]').count(), 0, 'nenhuma imagem buscada fora do app');
});

await teste('formulário sem mudanças: "← Voltar" volta ao painel sem perguntar', async () => {
  await ap.click('.escolha-carro:has(.nome:text-is("Carro do Pai"))');
  await ap.waitForSelector('.topo-voltar');
  await ap.click('a:has-text("Registrar abastecimento")');
  await ap.waitForSelector('#form-abast');
  assert.ok(await ap.isVisible('#topo .botao-voltar'), '"← Voltar" no topo');
  assert.ok(await ap.isVisible('#form-abast [data-acao=voltar-form]:has-text("Cancelar")'), '"Cancelar" no fim');
  await ap.click('#topo .botao-voltar');
  await ap.waitForSelector('.topo-voltar');
  assert.equal(await ap.evaluate(() => location.hash), '#painel/vw');
  assert.equal(await ap.isVisible('.janela'), false);
});

await teste('formulário com mudanças: pergunta antes de descartar e respeita a resposta', async () => {
  await ap.click('a:has-text("Registrar manutenção")');
  await ap.waitForSelector('#form-manut');
  await ap.fill('#km', '12500');
  await ap.click('#form-manut [data-acao=voltar-form]');                     // Cancelar
  assert.match(await ap.textContent('.janela h2'), /Descartar/);
  await ap.click('[data-janela=nao]');                                          // continuar preenchendo
  assert.equal(await ap.inputValue('#km'), '12500', 'o que foi digitado continua lá');
  assert.match(await ap.evaluate(() => location.hash), /^#manutencao/);
  await ap.click('#topo .botao-voltar');
  await ap.click('[data-janela=sim]');                                          // descartar
  await ap.waitForSelector('.topo-voltar');
  assert.equal(await ap.evaluate(() => location.hash), '#painel/vw');
  assert.equal((await listar('familias/AP/manutencoes')).length, 0, 'nada foi salvo');
});

await teste('corrigir pelo Histórico: Voltar e Cancelar retornam ao Histórico', async () => {
  for (const botao of ['#topo .botao-voltar', '#form-abast [data-acao=voltar-form]']) {
    await ir(ap, '#historico'); await ap.click('[data-aba=abastecimentos]'); await ap.click('[data-periodo=tudo]');
    await ap.click('.registro a:has-text("Corrigir")');
    await ap.waitForSelector('#form-abast');
    await ap.click(botao);
    await ap.waitForSelector('.abas');
    assert.equal(await ap.evaluate(() => location.hash), '#historico', botao);
  }
});

await teste('dados do carro: Voltar retorna a Ajustes; salvar continua funcionando', async () => {
  await ir(ap, '#ajustes');
  await ap.click('.lista-ajustes a:has-text("Sem dados")');
  await ap.waitForSelector('#form-carro');
  assert.match(await ap.textContent('#topo'), /Sem dados/);
  await ap.click('#topo .botao-voltar');
  await ap.waitForSelector('#aparencia');
  assert.equal(await ap.evaluate(() => location.hash), '#ajustes');
  await ap.click('.lista-ajustes a:has-text("Sem dados")');
  await ap.fill('#ano', '2010');
  await ap.click('#form-carro button[type=submit]'); await okJanela(ap);
  await esperarNuvem(async () => (await listar('familias/AP/veiculos')).find(c => c.id === 'sd').ano === '2010', 'ano salvo');
});

await teste('formulário aberto direto pelo endereço: Voltar leva ao painel do carro', async () => {
  await ap.goto(SITE + '?direto=1#manutencao'); await ap.waitForSelector('#form-manut');
  await ap.click('#topo .botao-voltar');
  await ap.waitForSelector('.topo-voltar');
  assert.match(await ap.evaluate(() => location.hash), /^#painel\//);
});

await teste('Aparência: tema e tamanho do texto mudam na hora e vão para o perfil da pessoa', async () => {
  await ir(ap, '#ajustes');
  assert.equal(await ap.getAttribute('html', 'data-tema'), 'claro', 'padrão: claro');
  assert.equal(await ap.getAttribute('html', 'data-texto'), 'padrao');
  const tamanho = await ap.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  await ap.click('.opcao:has(input[name=tema][value=escuro])');
  await ap.click('.opcao:has(input[name=texto][value=enorme])');
  assert.equal(await ap.getAttribute('html', 'data-tema'), 'escuro');
  assert.equal(await ap.getAttribute('html', 'data-texto'), 'enorme');
  assert.ok(await ap.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize)) > tamanho * 1.2, 'o texto ficou maior');
  assert.equal(await ap.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(27, 30, 34)', 'fundo grafite');
  await esperarNuvem(async () => { const p = (await perfisNaNuvem()).find(x => x.id === UID_AP); return p && p.tema === 'escuro' && p.texto === 'enorme'; }, 'perfil gravado');
  const perfil = (await perfisNaNuvem()).find(x => x.id === UID_AP);
  assert.deepEqual(Object.keys(perfil).filter(k => !['id', 'atualizado'].includes(k)).sort(), ['atualizadoEm', 'tema', 'texto'], 'só as preferências, nada dos carros');
  const familia = (await listar('familias')).find(f => f.id === 'AP');
  assert.equal(familia.tema, undefined, 'a família não recebe as preferências');
});

await teste('Aparência acompanha a conta em outro celular', async () => {
  const outro = await novaPagina();              // aparelho novo: nada guardado
  await entrar(outro, 'aparencia@example.com', 'senha-teste-3');
  await outro.waitForSelector('.garagem');
  await outro.waitForFunction(() => document.documentElement.getAttribute('data-tema') === 'escuro', null, { timeout: 10000 });
  assert.equal(await outro.getAttribute('html', 'data-texto'), 'enorme');
  await ir(outro, '#ajustes');
  assert.ok(await outro.isChecked('input[name=tema][value=escuro]'));
  assert.ok(await outro.isChecked('input[name=texto][value=enorme]'));
  assert.deepEqual(outro.errosJs, []);
  await outro.context().close();
});

await teste('Aparência sem internet: vale na hora e sincroniza quando a conexão volta', async () => {
  await ir(ap, '#ajustes');
  await ap.context().setOffline(true);
  await ap.click('.opcao:has(input[name=tema][value=auto])');
  await ap.click('.opcao:has(input[name=texto][value=maior])');
  assert.equal(await ap.getAttribute('html', 'data-tema'), 'auto');
  assert.deepEqual(await ap.evaluate(() => JSON.parse(localStorage.getItem('controleCarro.aparencia'))), { tema: 'auto', texto: 'maior' });
  await ap.waitForTimeout(800);
  const naNuvem = (await perfisNaNuvem()).find(x => x.id === UID_AP);
  assert.equal(naNuvem.tema, 'escuro', 'sem internet ainda não chegou na nuvem');
  await ap.context().setOffline(false);
  await esperarNuvem(async () => { const p = (await perfisNaNuvem()).find(x => x.id === UID_AP); return p && p.tema === 'auto' && p.texto === 'maior'; }, 'sincronizou ao voltar a internet');
});

await teste('demonstração: aparência fica só no aparelho e nunca vai para a nuvem', async () => {
  const antes = JSON.stringify(await perfisNaNuvem());
  const q = await novaPagina();
  await q.goto(SITE); await q.waitForSelector('#form-login');
  await q.click('[data-acao=demo]'); await q.waitForSelector('.garagem');
  await ir(q, '#ajustes');
  assert.match(await q.textContent('#aparencia'), /só neste aparelho/);
  await q.click('.opcao:has(input[name=tema][value=escuro])');
  await q.click('.opcao:has(input[name=texto][value=maior])');
  assert.equal(await q.getAttribute('html', 'data-tema'), 'escuro');
  assert.deepEqual(await q.evaluate(() => JSON.parse(localStorage.getItem('controleCarro.aparencia'))), { tema: 'escuro', texto: 'maior' });
  await q.waitForTimeout(1000);
  assert.equal(JSON.stringify(await perfisNaNuvem()), antes, 'nenhum perfil criado ou alterado');
  assert.deepEqual(q.errosJs, []);
  await q.context().close();
});

// ---------- Campo de data e odômetro ----------
const isoLocal = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const HOJE = isoLocal(new Date());
const brasil = (v) => v.slice(8, 10) + '/' + v.slice(5, 7) + '/' + v.slice(0, 4);

await teste('campo de data: mostra dd/mm/aaaa, aceita digitar e guarda no formato de sempre', async () => {
  await ir(ap, '#painel/vw'); await ap.click('a:has-text("Registrar abastecimento")'); await ap.waitForSelector('#form-abast');
  assert.equal(await ap.inputValue('#data-texto'), brasil(HOJE), 'começa com hoje, em português');
  assert.equal(await ap.inputValue('#data'), HOJE, 'o valor guardado continua aaaa-mm-dd');
  assert.equal(await ap.locator('input[type=date]').count(), 0, 'sem o controle padrão do navegador');
  assert.equal(await ap.getAttribute('label[for="data-texto"]', 'for'), 'data-texto', 'rótulo ligado ao campo digitável');
  await ap.fill('#data-texto', ''); await ap.type('#data-texto', '01102026');
  assert.equal(await ap.inputValue('#data-texto'), '01/10/2026', 'barras entram sozinhas');
  assert.equal(await ap.inputValue('#data'), '2026-10-01');
  await ap.fill('#data-texto', '31/02/2026'); await ap.press('#data-texto', 'Tab');
  assert.match(await ap.textContent('#data-ajuda'), /não existe/);
  assert.equal(await ap.inputValue('#data'), '', 'data impossível não é guardada');
});

await teste('calendário: teclado, troca de mês, "Hoje", datas futuras bloqueadas e Esc', async () => {
  await ap.fill('#data-texto', '15/10/2026');
  await ap.click('.campo-data:has(#data) .data-abrir');
  assert.equal(await ap.getAttribute('.campo-data:has(#data) .data-abrir', 'aria-expanded'), 'true');
  assert.equal(await ap.evaluate(() => document.activeElement.getAttribute('data-dia')), '2026-10-15', 'foco no dia escolhido');
  assert.equal(await ap.getAttribute('[data-dia="2026-10-15"]', 'aria-label'), '15 de outubro de 2026');
  await ap.keyboard.press('ArrowLeft');
  assert.equal(await ap.evaluate(() => document.activeElement.getAttribute('data-dia')), '2026-10-14');
  await ap.keyboard.press('ArrowDown');
  assert.equal(await ap.evaluate(() => document.activeElement.getAttribute('data-dia')), '2026-10-21');
  await ap.keyboard.press('PageUp');
  assert.match(await ap.textContent('.cal-titulo'), /setembro de 2026/);
  await ap.keyboard.press('Enter');
  assert.equal(await ap.inputValue('#data'), '2026-09-21');
  assert.equal(await ap.inputValue('#data-texto'), '21/09/2026');
  assert.ok(await ap.isHidden('#data-cal'), 'fecha depois de escolher');
  assert.ok(await ap.evaluate(() => document.activeElement.classList.contains('data-abrir')), 'foco volta ao botão');
  await ap.click('.campo-data:has(#data) .data-abrir');
  await ap.click('#data-cal [data-cal=prox]');
  assert.match(await ap.textContent('.cal-titulo'), /outubro de 2026/);
  await ap.click('#data-cal [data-cal=hoje]');
  assert.equal(await ap.inputValue('#data'), HOJE, '"Hoje" escolhe a data de hoje');
  await ap.click('.campo-data:has(#data) .data-abrir');
  const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
  const botaoAmanha = ap.locator(`#data-cal [data-dia="${isoLocal(amanha)}"]`);
  if (await botaoAmanha.count()) assert.ok(await botaoAmanha.isDisabled(), 'abastecimento não pode ser no futuro');
  else assert.ok(await ap.isDisabled('#data-cal [data-cal=prox]'), 'não avança para meses futuros');
  await ap.keyboard.press('Escape');
  assert.ok(await ap.isHidden('#data-cal'));
});

await teste('odômetro: não rola ao abrir o app; rola só quando a quilometragem muda e termina no valor certo', async () => {
  await ap.goto(SITE + '?abrir=1#painel/vw'); await ap.waitForSelector('.quadro');
  assert.equal(await ap.locator('.odometro.rolando').count(), 0, 'abrir o app não anima');
  assert.match(await ap.textContent('.quadro .odometro .sr'), /^12\.000 km$/);
  await ap.click('a:has-text("Registrar abastecimento")'); await ap.waitForSelector('#form-abast');
  await ap.fill('#km', '12400'); await ap.fill('#litros', '30'); await ap.fill('#valor', '180');
  await salvarFormulario(ap, '#form-abast button[type=submit]');
  await ap.waitForSelector('.quadro');
  assert.equal(await ap.locator('.quadro .odometro.rolando').count(), 1, 'a quilometragem nova rola');
  assert.ok(await ap.locator('.quadro .fita').count() > 0);
  assert.equal(await ap.textContent('.quadro .odometro .sr'), '12.400 km', 'o valor final já está no texto');
  assert.equal(await ap.getAttribute('.quadro .odo-visual', 'aria-hidden'), 'true', 'leitor de tela não lê os números rolando');
  await ap.waitForFunction(() => /12\.400 km/.test(document.getElementById('anuncio').textContent), null, { timeout: 3000 });
  await ap.waitForTimeout(1100);
  assert.equal(await ap.locator('.quadro .fita').count(), 0, 'a rolagem termina em menos de 1 segundo');
  assert.equal((await ap.textContent('.quadro .odo-visual')).replace(/\s+/g, ' '), '12.400 km');
  await ir(ap, '#inicio'); await ap.waitForSelector('.garagem');
  assert.equal(await ap.locator('.odometro.rolando').count(), 0, 'na Garagem o número já é o novo, sem rolar de novo');
  await esperarNuvem(async () => (await listar('familias/AP/abastecimentos')).some(a => a.km === 12400 && a.data === HOJE), 'abastecimento com a data de hoje');
});

await teste('odômetro com "reduzir movimento": o número muda direto, sem rolar', async () => {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const q = await ctx.newPage(); q.errosJs = []; q.on('pageerror', e => q.errosJs.push(e.message));
  await entrar(q, 'aparencia@example.com', 'senha-teste-3');
  await q.waitForSelector('.garagem');
  await ir(q, '#painel/vw'); await q.waitForSelector('.quadro');
  await q.click('a:has-text("Registrar abastecimento")'); await q.waitForSelector('#form-abast');
  await q.fill('#km', '12800'); await q.fill('#litros', '30'); await q.fill('#valor', '180');
  await salvarFormulario(q, '#form-abast button[type=submit]');
  await q.waitForSelector('.quadro');
  assert.equal(await q.locator('.fita').count(), 0);
  assert.equal(await q.locator('.odometro.rolando').count(), 0);
  assert.equal((await q.textContent('.quadro .odo-visual')).replace(/\s+/g, ' '), '12.800 km');
  assert.deepEqual(q.errosJs, []);
  await ctx.close();
});

await teste('Histórico "Escolher datas": digitar a data filtra como antes', async () => {
  await ir(ap, '#painel/vw'); await ap.waitForSelector('.quadro');
  await ir(ap, '#historico'); await ap.click('[data-aba=abastecimentos]'); await ap.click('[data-periodo=datas]');
  await ap.waitForSelector('#de-texto');
  await ap.type('#de-texto', '02102026');
  await ap.waitForSelector('.resumo-periodo');
  assert.equal(await ap.inputValue('#de-texto'), '02/10/2026', 'a data fica no campo depois de filtrar');
  assert.match(await ap.textContent('.resumo-periodo'), /2 abastecimentos/, 'o de 01/10/2026 fica de fora');
  await ap.fill('#de-texto', ''); await ap.type('#de-texto', '01102026');
  await ap.waitForFunction(() => /3 abastecimentos/.test(document.querySelector('.resumo-periodo').textContent));
  await ap.click('[data-periodo=tudo]');
});

await teste('preço por litro: calculado ao preencher, na confirmação, no painel, no Histórico e nos Relatórios', async () => {
  await ir(ap, '#painel/vw'); await ap.waitForSelector('.quadro');
  await ap.click('a:has-text("Registrar abastecimento")'); await ap.waitForSelector('#form-abast');
  assert.equal(await ap.locator('#form-abast input[id*=preco], #form-abast input[name*=preco]').count(), 0, 'sem campo manual de preço');
  assert.match(await ap.textContent('#preco-ao-vivo'), /aparece aqui/i);
  await ap.fill('#km', '13200'); await ap.fill('#litros', '35,5'); await ap.fill('#valor', '220');
  assert.match((await ap.textContent('#preco-ao-vivo')).replace(/\s+/g, ' '), /Preço por litro\s*R\$ 6,20\/L/, '220 ÷ 35,5 = 6,197…');
  assert.match(await ap.textContent('#preco-ao-vivo'), /R\$ 220,00 ÷ 35,50 litros/);
  await ap.click('.opcao:has(input[name=combustivel][value=GNV])');
  assert.match(await ap.textContent('#preco-ao-vivo'), /Preço por m³ \(GNV\)\s*R\$ 6,20\/m³/);
  await ap.click('.opcao:has(input[name=combustivel][value=Gasolina])');
  assert.match(await ap.textContent('#preco-ao-vivo'), /Preço por litro \(Gasolina\)/);
  const t = await salvarFormulario(ap, '#form-abast button[type=submit]');
  assert.match(t, /Valor total\s*R\$ 220,00/);
  assert.match(t, /Litros\s*35,50 L/);
  assert.match(t, /Preço por litro \(Gasolina\)\s*R\$ 6,20\/L/);
  await ap.waitForSelector('.quadro');
  assert.match((await ap.textContent('.grade')).replace(/\s+/g, ' '), /Último abastecimento.*R\$ 220,00.*35,50 L • Gasolina.*Preço por litro \(Gasolina\)\s*R\$ 6,20\/L/);
  await ir(ap, '#historico'); await ap.click('[data-aba=abastecimentos]'); await ap.click('[data-periodo=tudo]');
  assert.match(await ap.textContent('.registro >> nth=0'), /R\$ 6,20\/L/);
  assert.match(await ap.textContent('.resumo-periodo'), /Preço médio \(R\$\/L\)/);
  assert.match(await ap.textContent('.resumo-periodo'), /Preço médio \(R\$\/L\)R\$ [\d.]+,\d\d/, 'um só combustível informado: mostra a média');
  await ir(ap, '#relatorios');
  const rel = (await ap.textContent('.tela')).replace(/\s+/g, ' ');
  assert.match(rel, /Preço por litro/);
  assert.match(rel, /Gasolina 1 abastecimento\s*Último \(\d\d\/\d\d\/\d{4}\)R\$ 6,20\/L/);
  await esperarNuvem(async () => (await listar('familias/AP/abastecimentos')).some(a => a.km === 13200), 'abastecimento gravado');
  const doc = (await listar('familias/AP/abastecimentos')).find(a => a.km === 13200);
  assert.deepEqual([doc.litros, doc.valor, doc.combustivel], [35.5, 220, 'Gasolina']);
  assert.ok(!Object.keys(doc).some(k => /preco/i.test(k)), 'o preço não é gravado: é sempre recalculado de valor ÷ litros');
});

await teste('nenhum erro de JavaScript nas telas novas', async () => assert.deepEqual(ap.errosJs, []));

await teste('nenhum erro de JavaScript durante os testes', async () => assert.deepEqual(p.errosJs, []));

await navegador.close();
servidor.close();
console.log('\n' + (total - falhas) + ' de ' + total + ' testes passaram.');
process.exit(falhas ? 1 : 0);
