// Gera firebase-config.js a partir da variável de ambiente FIREBASE_CONFIG.
// Usado pelo GitHub Actions (segredo do repositório) e opcionalmente no seu computador:
//   FIREBASE_CONFIG='{"apiKey":"...","projectId":"..."}' node scripts/gerar-config.mjs
// Aceita JSON ou o trecho "const firebaseConfig = { ... };" copiado do Console do Firebase.
import { appendFileSync, writeFileSync } from 'node:fs';

const bruto = (process.env.FIREBASE_CONFIG || '').trim();
if (!bruto) {
  console.error('ERRO: o segredo FIREBASE_CONFIG está vazio. Veja o README, seção "Publicar no GitHub Pages".');
  process.exit(1);
}
if (/private_key|client_email|"type"\s*:\s*"service_account"/.test(bruto)) {
  console.error('ERRO: isto parece uma chave de CONTA DE SERVIÇO (credencial administrativa). Ela NUNCA deve ir para o site. Use a configuração do app Web.');
  process.exit(1);
}

let texto = bruto.slice(bruto.indexOf('{'), bruto.lastIndexOf('}') + 1)
  .replace(/\/\/.*$/gm, '')
  .replace(/'/g, '"')
  .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
  .replace(/,\s*}/g, '}');

let config;
try { config = JSON.parse(texto); } catch (e) {
  console.error('ERRO: não consegui ler FIREBASE_CONFIG. Cole o objeto { apiKey: ..., projectId: ... } do Console do Firebase.');
  process.exit(1);
}
const permitidos = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
for (const k of ['apiKey', 'authDomain', 'projectId', 'appId']) {
  if (!config[k]) { console.error('ERRO: falta o campo "' + k + '" em FIREBASE_CONFIG.'); process.exit(1); }
}
const limpo = {};
for (const k of permitidos) if (config[k]) limpo[k] = String(config[k]);

writeFileSync('firebase-config.js', '// Gerado automaticamente. Não editar.\nwindow.FIREBASE_CONFIG = ' + JSON.stringify(limpo, null, 2) + ';\n');
console.log('firebase-config.js criado para o projeto "' + limpo.projectId + '".');
// No GitHub Actions, informa o projeto para a etapa de publicação no Firebase Hosting.
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, 'projectId=' + limpo.projectId + '\n');
