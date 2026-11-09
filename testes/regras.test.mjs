// Testes das regras de segurança do Firestore (rodam no emulador local, sem tocar no projeto real).
//   npm install
//   npm run test:regras
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

const env = await initializeTestEnvironment({
  projectId: 'demo-controle-do-carro',
  firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 }
});

let falhas = 0, total = 0;
async function teste(nome, fn) {
  total++;
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { falhas++; console.log('  FALHOU  ' + nome + '\n        ' + (e && e.message)); }
}

const usuario = (uid, email, verificado = true) => env.authenticatedContext(uid, { email, email_verified: verificado }).firestore();
const anonimo = () => env.unauthenticatedContext().firestore();

const filho = () => usuario('u-filho', 'filho@example.com');
const mae = () => usuario('u-mae', 'mae@example.com');
const pai = () => usuario('u-pai', 'pai@example.com');
const estranho = () => usuario('u-x', 'estranho@example.com');

const familiaA = { nome: 'Família A', emails: ['filho@example.com', 'mae@example.com', 'pai@example.com'], criadoPor: 'u-filho', criadoPorEmail: 'filho@example.com', criadoEm: 1 };
const familiaB = { nome: 'Família B', emails: ['estranho@example.com'], criadoPor: 'u-x', criadoPorEmail: 'estranho@example.com', criadoEm: 1 };
const veiculo = { nome: 'Carro 1', marca: '', modelo: '', ano: '', cor: '#1e40af', oleoKm: 5000, oleoMeses: null, criadoEm: 1 };
const abast = { carroId: 'v1', data: '2026-11-01', km: 45230, distanciaInformada: null, litros: 35.5, valor: 220, tanqueCheio: true, combustivel: 'Gasolina', obs: '', criadoEm: 1 };
const manut = { carroId: 'v1', tipo: 'pneus', descricao: '', data: '2026-11-01', km: 45230, valor: null, lembreteKm: 40000, lembreteData: null, obs: '', criadoEm: 1 };

async function prepararDados() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc('familias/A').set(familiaA);
    await db.doc('familias/B').set(familiaB);
    await db.doc('familias/A/veiculos/v1').set(veiculo);
    await db.doc('familias/A/abastecimentos/a1').set(abast);
    await db.doc('familias/B/abastecimentos/b1').set(abast);
    await db.doc('outra/x').set({ a: 1 });
  });
}

console.log('Regras do Firestore');
await prepararDados();

// ---------- Quem não está logado ----------
await teste('sem login: não lê a família', () => assertFails(anonimo().doc('familias/A').get()));
await teste('sem login: não lê abastecimentos', () => assertFails(anonimo().collection('familias/A/abastecimentos').get()));
await teste('sem login: não grava abastecimento', () => assertFails(anonimo().doc('familias/A/abastecimentos/z').set(abast)));
await teste('sem login: não cria família', () => assertFails(anonimo().collection('familias').add(familiaB)));
await teste('nada fora de /familias é acessível', () => assertFails(filho().doc('outra/x').get()));

// ---------- E-mail não verificado ----------
await teste('e-mail da lista mas NÃO verificado: negado', () =>
  assertFails(usuario('u-mae2', 'mae@example.com', false).doc('familias/A/abastecimentos/a1').get()));

// ---------- Membros ----------
await teste('membro lê a família', () => assertSucceeds(mae().doc('familias/A').get()));
await teste('membro lê abastecimentos', () => assertSucceeds(mae().collection('familias/A/abastecimentos').get()));
await teste('membro grava abastecimento válido', () => assertSucceeds(pai().doc('familias/A/abastecimentos/a2').set(abast)));
await teste('membro edita abastecimento', () => assertSucceeds(mae().doc('familias/A/abastecimentos/a2').set({ ...abast, valor: 230 })));
await teste('membro apaga abastecimento', () => assertSucceeds(mae().doc('familias/A/abastecimentos/a2').delete()));
await teste('membro grava manutenção válida', () => assertSucceeds(mae().doc('familias/A/manutencoes/m1').set(manut)));
await teste('membro grava veículo válido', () => assertSucceeds(filho().doc('familias/A/veiculos/v2').set({ ...veiculo, nome: 'Carro 2' })));
// ---------- Vários carros e arquivamento ----------
await teste('não há limite de carros: família cadastra 12 carros', async () => {
  const db = filho();
  for (let i = 1; i <= 12; i++) await assertSucceeds(db.doc('familias/A/veiculos/frota' + i).set({ ...veiculo, nome: 'Carro ' + i }));
});
await teste('carro antigo, sem os campos novos, continua válido ao ser editado', () =>
  assertSucceeds(mae().doc('familias/A/veiculos/v1').set({ ...veiculo, nome: 'Carro 1 renomeado' })));
await teste('arquivar um carro é aceito', () =>
  assertSucceeds(mae().doc('familias/A/veiculos/v1').set({ ...veiculo, arquivado: true, arquivadoEm: 1767000000000 })));
await teste('registros do carro arquivado continuam guardados e legíveis', () =>
  assertSucceeds(mae().doc('familias/A/abastecimentos/a1').get()));
await teste('reativar um carro é aceito', () =>
  assertSucceeds(pai().doc('familias/A/veiculos/v1').set({ ...veiculo, arquivado: false, arquivadoEm: null })));
await teste('"arquivado" que não seja verdadeiro/falso é recusado', () =>
  assertFails(mae().doc('familias/A/veiculos/v1').set({ ...veiculo, arquivado: 'sim' })));
await teste('"arquivadoEm" que não seja número é recusado', () =>
  assertFails(mae().doc('familias/A/veiculos/v1').set({ ...veiculo, arquivado: true, arquivadoEm: 'ontem' })));
await teste('quem não é da família não arquiva carro', () =>
  assertFails(estranho().doc('familias/A/veiculos/v1').set({ ...veiculo, arquivado: true, arquivadoEm: 1 })));

await teste('e-mail com maiúsculas no login também vale', () =>
  assertSucceeds(usuario('u-mae', 'Mae@Example.com').doc('familias/A').get()));
await teste('membro encontra a própria família pela busca por e-mail', () =>
  assertSucceeds(mae().collection('familias').where('emails', 'array-contains', 'mae@example.com').get()));

// ---------- Isolamento entre famílias ----------
await teste('quem não é da família não lê', () => assertFails(estranho().doc('familias/A').get()));
await teste('quem não é da família não lê registros', () => assertFails(estranho().collection('familias/A/abastecimentos').get()));
await teste('quem não é da família não grava', () => assertFails(estranho().doc('familias/A/abastecimentos/z').set(abast)));
await teste('quem não é da família não apaga', () => assertFails(estranho().doc('familias/A/abastecimentos/a1').delete()));
await teste('membro da família A não lê a família B', () => assertFails(mae().doc('familias/B/abastecimentos/b1').get()));
await teste('busca por e-mail de outra pessoa é negada', () =>
  assertFails(estranho().collection('familias').where('emails', 'array-contains', 'mae@example.com').get()));
await teste('listar todas as famílias é negado', () => assertFails(mae().collection('familias').get()));
await teste('estranho não se inclui na família A', () =>
  assertFails(estranho().doc('familias/A').update({ emails: [...familiaA.emails, 'estranho@example.com'] })));

// ---------- Validação dos dados ----------
await teste('litros zero é recusado', () => assertFails(mae().doc('familias/A/abastecimentos/r1').set({ ...abast, litros: 0 })));
await teste('valor negativo é recusado', () => assertFails(mae().doc('familias/A/abastecimentos/r2').set({ ...abast, valor: -5 })));
await teste('data em formato errado é recusada', () => assertFails(mae().doc('familias/A/abastecimentos/r3').set({ ...abast, data: '01/11/2026' })));
await teste('campo desconhecido é recusado', () => assertFails(mae().doc('familias/A/abastecimentos/r4').set({ ...abast, hack: true })));
await teste('tipo de manutenção inválido é recusado', () => assertFails(mae().doc('familias/A/manutencoes/r5').set({ ...manut, tipo: 'x' })));
await teste('cor de veículo inválida é recusada', () => assertFails(mae().doc('familias/A/veiculos/r6').set({ ...veiculo, cor: 'red;x' })));
await teste('observação longa demais é recusada', () => assertFails(mae().doc('familias/A/abastecimentos/r7').set({ ...abast, obs: 'x'.repeat(301) })));

// ---------- Família: criar, incluir pessoas, apagar ----------
await teste('pessoa verificada cria a própria família', () =>
  assertSucceeds(usuario('u-novo', 'novo@example.com').collection('familias').add({ nome: 'Nova', emails: ['novo@example.com'], criadoPor: 'u-novo', criadoPorEmail: 'novo@example.com', criadoEm: 1 })));
await teste('não cria família em nome de outra pessoa', () =>
  assertFails(usuario('u-novo', 'novo@example.com').collection('familias').add({ nome: 'X', emails: ['mae@example.com'], criadoPor: 'u-mae', criadoPorEmail: 'mae@example.com', criadoEm: 1 })));
await teste('não verificado não cria família', () =>
  assertFails(usuario('u-nv', 'nv@example.com', false).collection('familias').add({ nome: 'X', emails: ['nv@example.com'], criadoPor: 'u-nv', criadoPorEmail: 'nv@example.com', criadoEm: 1 })));
await teste('membro inclui um e-mail', () =>
  assertSucceeds(filho().doc('familias/A').update({ emails: [...familiaA.emails, 'tia@example.com'] })));
await teste('membro remove um e-mail', () =>
  assertSucceeds(filho().doc('familias/A').update({ emails: familiaA.emails })));
await teste('não dá para remover quem criou a família', () =>
  assertFails(mae().doc('familias/A').update({ emails: ['mae@example.com', 'pai@example.com'] })));
await teste('não dá para trocar quem criou a família', () =>
  assertFails(mae().doc('familias/A').update({ criadoPor: 'u-mae', criadoPorEmail: 'mae@example.com', emails: ['mae@example.com'] })));
await teste('membro que não criou não apaga a família', () => assertFails(mae().doc('familias/A').delete()));

// ---------- Restauração em lote ----------
await teste('lote com 200 registros (restauração de cópia) é aceito', async () => {
  const db = mae();
  const lote = db.batch();
  for (let i = 0; i < 200; i++) lote.set(db.doc('familias/A/abastecimentos/lote' + i), { ...abast, km: 50000 + i });
  await assertSucceeds(lote.commit());
});

await teste('quem criou apaga a família', () => assertSucceeds(filho().doc('familias/A').delete()));
await teste('depois de apagada a família, ninguém lê os registros', () => assertFails(filho().doc('familias/A/abastecimentos/a1').get()));

await env.cleanup();
console.log('\n' + (total - falhas) + ' de ' + total + ' testes passaram.');
process.exit(falhas ? 1 : 0);
