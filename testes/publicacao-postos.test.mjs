// Testes da decisão de publicação dos dados de postos (scripts/postos/preparar_publicacao.py).
// Simula o site no ar (dados anteriores) com um servidor local. Rodar com: node testes/publicacao-postos.test.mjs
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const SCRIPT = fileURLToPath(new URL('../scripts/postos/preparar_publicacao.py', import.meta.url));
const iso = (diasAtras) => new Date(Date.now() - diasAtras * 86400000).toISOString().slice(0, 10);

function conjunto(pasta, { fim = iso(3), postos = 4500, municipios = 120, localizados = 3000, geradoEm = '2026-11-10T12:00:00+00:00', faltaArquivo = false } = {}) {
  mkdirSync(join(pasta, 'municipios'), { recursive: true }); mkdirSync(join(pasta, 'cep'), { recursive: true });
  const ms = Array.from({ length: municipios }, (_, i) => ({ c: String(1000000 + i), n: 'Cidade ' + i, uf: 'SP', la: -22, lo: -47, r: 5, q: 1 }));
  ms.forEach((m, i) => { if (!(faltaArquivo && i === 7)) writeFileSync(join(pasta, 'municipios', m.c + '.json'), JSON.stringify({ m: m.n, uf: 'SP', postos: [] })); });
  writeFileSync(join(pasta, 'cep', '130.json'), '{}');
  const ind = { fonte: { nome: 'ANP' }, periodo: { inicio: iso(9), fim }, geradoEm,
    estatisticas: { postos, municipios, localizados, aproximados: 0, semLocalizacao: postos - localizados, falhasIbge: [], semArquivoIbge: [] },
    ceps: ['130'], municipios: ms };
  writeFileSync(join(pasta, 'indice.json'), JSON.stringify(ind));
  return ind;
}

let raizSite = null;
const servidor = createServer((req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const arq = raizSite && join(raizSite, caminho.replace(/^\/postos\//, ''));
  if (!raizSite || !caminho.startsWith('/postos/') || !existsSync(arq)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': 'application/json' }); res.end(readFileSync(arq));
});
await new Promise(r => servidor.listen(0, '127.0.0.1', r));
const SITE = `http://127.0.0.1:${servidor.address().port}`;

// Assíncrono: o servidor do "site anterior" roda neste mesmo processo e precisa responder.
function rodar(novo) {
  const saida = mkdtempSync(join(tmpdir(), 'saida-')); rmSync(saida, { recursive: true });
  return new Promise((ok) => {
    const p = spawn('python3', ['-I', SCRIPT, '--novo', novo, '--saida', saida, '--site', SITE]);
    let texto = '';
    p.stdout.on('data', d => texto += d); p.stderr.on('data', d => texto += d);
    p.on('close', (codigo) => {
      const ind = existsSync(join(saida, 'indice.json')) ? JSON.parse(readFileSync(join(saida, 'indice.json'), 'utf8')) : null;
      ok({ codigo, ind, saida, texto });
    });
  });
}
const nova = (opts) => { const d = mkdtempSync(join(tmpdir(), 'novo-')); conjunto(d, opts); return d; };
const semNada = () => join(tmpdir(), 'nao-existe-' + Math.random());

let falhas = 0, total = 0;
async function teste(nome, fn) {
  total++;
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { falhas++; console.log('  FALHOU  ' + nome + '\n        ' + (e && e.message)); }
}
console.log('Publicação dos dados de postos');

await teste('dados novos válidos: são publicados e marcados como atualização bem-sucedida', async () => {
  raizSite = null;
  const r = await rodar(nova());
  assert.equal(r.codigo, 0, r.texto);
  assert.equal(r.ind.atualizacao.ok, true);
  assert.equal(r.ind.estatisticas.postos, 4500);
  assert.ok(existsSync(join(r.saida, 'municipios', '1000000.json')));
});

await teste('ANP/IBGE fora do ar e nenhum dado anterior: NÃO publica (erro)', async () => {
  raizSite = null;
  const r = await rodar(semNada());
  assert.equal(r.codigo, 1);
  assert.equal(r.ind, null, 'nenhum dado vazio vai para a publicação');
  assert.match(r.texto, /publicação foi interrompida/);
});

const anterior = mkdtempSync(join(tmpdir(), 'site-'));
conjunto(anterior, { fim: iso(10), postos: 4400, geradoEm: '2026-11-03T12:00:00+00:00' });

await teste('fonte indisponível: preserva os últimos dados válidos, com a data da última atualização bem-sucedida', async () => {
  raizSite = anterior;
  const r = await rodar(semNada());
  assert.equal(r.codigo, 0, r.texto);
  assert.equal(r.ind.periodo.fim, iso(10), 'mesma semana de antes');
  assert.equal(r.ind.geradoEm, '2026-11-03T12:00:00+00:00', 'mantém a data da última atualização bem-sucedida');
  assert.equal(r.ind.atualizacao.ok, false);
  assert.match(r.ind.atualizacao.motivo, /geração dos dados falhou/);
  assert.equal(readFileSync(join(r.saida, 'municipios', '1000005.json'), 'utf8'), readFileSync(join(anterior, 'municipios', '1000005.json'), 'utf8'), 'arquivos anteriores copiados');
});

await teste('dados novos incompletos (poucos postos, poucos localizados, arquivo faltando): ficam os anteriores', async () => {
  raizSite = anterior;
  for (const [opts, motivo] of [[{ postos: 500, localizados: 400 }, /poucos postos/], [{ localizados: 300 }, /poucos postos localizados/],
    [{ municipios: 40 }, /poucos municípios/], [{ faltaArquivo: true }, /ausente ou ilegível/], [{ postos: 2000, localizados: 1500 }, /muito menos postos/]]) {
    const r = await rodar(nova(opts));
    assert.equal(r.codigo, 0, r.texto);
    assert.equal(r.ind.atualizacao.ok, false);
    assert.match(r.ind.atualizacao.motivo, motivo);
    assert.equal(r.ind.estatisticas.postos, 4400, 'continua com os dados anteriores');
  }
});

await teste('semana mais antiga que a já publicada ou no futuro: não substitui', async () => {
  raizSite = anterior;
  let r = await rodar(nova({ fim: iso(20) }));
  assert.match(r.ind.atualizacao.motivo, /mais antiga que a já publicada/);
  r = await rodar(nova({ fim: iso(-5) }));
  assert.match(r.ind.atualizacao.motivo, /no futuro/);
});

await teste('mesma semana de novo (ANP ainda não publicou a próxima): aceita, sem perder nada', async () => {
  raizSite = anterior;
  const r = await rodar(nova({ fim: iso(10), postos: 4400 }));
  assert.equal(r.ind.atualizacao.ok, true);
});

await teste('dados anteriores do site também inválidos: NÃO publica', async () => {
  const ruim = mkdtempSync(join(tmpdir(), 'site-ruim-'));
  conjunto(ruim, { faltaArquivo: true });
  raizSite = ruim;
  const r = await rodar(semNada());
  assert.equal(r.codigo, 1);
  assert.match(r.texto, /também não passaram na conferência/);
});

servidor.close();
console.log('\n' + (total - falhas) + ' de ' + total + ' testes passaram.');
process.exit(falhas ? 1 : 0);
