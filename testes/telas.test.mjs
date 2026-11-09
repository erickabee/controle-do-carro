// Testes de tela do Controle do Carro (navegador real + emuladores do Firebase).
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
  await ir(p, '#ajustes');
  if (await p.isVisible('[data-acao=trocar-carro]')) {
    await p.click('[data-acao=trocar-carro] >> nth=0');
    await p.waitForSelector('.escolha-carro');
    await p.click(`.escolha-carro:has(.nome:text-is("${nome}"))`);
    await p.waitForTimeout(200);
  }
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
const textoLembretes = async (p) => { await ir(p, '#inicio'); return (await p.textContent('.tela')).replace(/\s+/g, ' '); };

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
  await esperarNuvem(async () => (await listar(`familias/${fid}/veiculos`)).length === 1, '1 carro');
});

await teste('cadastra vários carros (8), sem limite, e as cores podem se repetir', async () => {
  for (let i = 2; i <= 8; i++) await cadastrarCarro(p, 'Carro ' + i);
  await esperarNuvem(async () => (await listar(`familias/${fid}/veiculos`)).length === 8, '8 carros');
  const carros = await listar(`familias/${fid}/veiculos`);
  assert.ok(new Set(carros.map(c => c.cor)).size < carros.length, 'com 8 carros alguma cor se repete');
  assert.ok(carros.every(c => c.arquivado === false));
});

await teste('escolha do carro continua prática com muitos carros (lista compacta e busca)', async () => {
  await ir(p, '#ajustes'); await p.click('[data-acao=trocar-carro] >> nth=0');
  await p.waitForSelector('.escolha-carro');
  assert.equal(await p.locator('.escolha-carro').count(), 8);
  assert.ok(await p.isVisible('.lista-carros.lista-compacta'));
  await p.fill('#busca-carro', 'carro 3');
  await p.waitForTimeout(150);
  assert.equal(await p.locator('.escolha-carro:visible').count(), 1);
  await p.click('.escolha-carro:visible');
  await p.waitForSelector('.topo-nome:has-text("Carro 3")');
});

await teste('registros ficam separados por carro', async () => {
  await escolher(p, 'Carro 2');
  await ir(p, '#abastecer');
  assert.match(await p.textContent('.carro-do-registro'), /Carro 2/);
  await p.fill('#km', '10000'); await p.fill('#litros', '40'); await p.fill('#valor', '240');
  await p.click('#form-abast button[type=submit]'); await okJanela(p);
  await ir(p, '#historico'); await p.click('[data-periodo=tudo]');
  assert.match(await p.textContent('.resumo-periodo'), /1 abastecimento/);
  await escolher(p, 'Carro 3');
  await ir(p, '#historico'); await p.click('[data-periodo=tudo]');
  assert.ok(await p.isVisible('text=Nenhum abastecimento registrado ainda'));
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
  await p.click('[data-acao=trocar-carro] >> nth=0');
  await p.waitForSelector('.escolha-carro');
  assert.equal(await p.locator('.escolha-carro').count(), 7, 'arquivado some da escolha');
  await p.click('.escolha-carro >> nth=0');
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
  await p.click('[data-acao=trocar-carro] >> nth=0');
  await p.waitForSelector('.escolha-carro');
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
  assert.match(await textoLembretes(p), /Faltam 5\.000 km para a troca de óleo/);
  await esperarNuvem(async () => (await doCarro('manutencoes', idTeste)).length === 1, 'troca de óleo');
  idOleo = (await doCarro('manutencoes', idTeste))[0].id;

  await abrirCorrecao(p, 'manutencoes');
  await p.fill('#km', '20000');
  const t = await salvarFormulario(p, '#form-manut button[type=submit]');
  assert.match(t, /Manutenção corrigida/);
  assert.match(t, /Faltam 4\.400 km para a troca de óleo/);   // 20.000 + 5.000 - 20.600
  assert.match(await textoLembretes(p), /Faltam 4\.400 km para a troca de óleo/);
  await esperarNuvem(async () => (await doCarro('manutencoes', idTeste)).some(m => m.km === 20000), 'correção da manutenção');
  assert.deepEqual((await doCarro('manutencoes', idTeste)).map(m => m.id), [idOleo], 'mesmo ID');

  // Pneus: lembrete definido pela pessoa e corrigido depois
  await ir(p, '#manutencao');
  await p.click('.opcoes.tipos .opcao:has-text("Troca de pneus")');
  await p.fill('#km', '20600');
  await p.click('#bloco-lembrete summary'); await p.fill('#lembreteKm', '40000');
  await salvarFormulario(p, '#form-manut button[type=submit]');
  assert.match(await textoLembretes(p), /Faltam 40\.000 km para a troca de pneus/);
  await abrirCorrecao(p, 'manutencoes');                      // o mais recente é o de pneus
  assert.equal(await p.inputValue('#lembreteKm'), '40.000');
  await p.fill('#lembreteKm', '30000');
  await salvarFormulario(p, '#form-manut button[type=submit]');
  assert.match(await textoLembretes(p), /Faltam 30\.000 km para a troca de pneus/);
});

await teste('editar nome, marca, modelo, ano, cor e óleo do carro mantém o ID e os registros', async () => {
  const totalAntes = (await listar(`familias/${fid}/veiculos`)).length;
  await ir(p, '#ajustes');
  await p.click('a:has-text("Dados do Carro Teste")');
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
  const tela = await textoLembretes(p);
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
  await q.waitForSelector('.escolha-carro');
  assert.equal(await q.locator('.escolha-carro').count(), 2, 'os dois carros antigos aparecem ativos');
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
  await q.waitForSelector('.escolha-carro');
  const nomes = await q.locator('.escolha-carro .nome').allTextContents();
  assert.deepEqual(nomes.sort(), ['Carro 1 (exemplo)', 'Carro 2 (exemplo)']);
  assert.equal((await listar('familias')).length, antes);
});

await teste('nenhum erro de JavaScript durante os testes', async () => assert.deepEqual(p.errosJs, []));

await navegador.close();
servidor.close();
console.log('\n' + (total - falhas) + ' de ' + total + ' testes passaram.');
process.exit(falhas ? 1 : 0);
