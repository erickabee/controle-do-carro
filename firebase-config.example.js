// EXEMPLO de configuração do Firebase.
//
// 1. Copie este arquivo para "firebase-config.js" (na mesma pasta).
// 2. Cole os valores do SEU projeto: Console do Firebase → ⚙️ Configurações do projeto
//    → Geral → Seus apps → app da Web → "Configuração do SDK" (opção "Config").
//
// "firebase-config.js" está no .gitignore: não vai para o GitHub.
// Na publicação pelo GitHub Actions ele é criado a partir do segredo FIREBASE_CONFIG.
//
// Observação: estes valores identificam o projeto, mas NÃO dão acesso aos dados.
// Quem protege os dados são o login e as regras em firestore.rules.
// NUNCA coloque aqui chaves de "conta de serviço" (service account) nem nada do Admin SDK.
window.FIREBASE_CONFIG = {
  apiKey: 'COLE_AQUI_A_API_KEY',
  authDomain: 'seu-projeto.firebaseapp.com',
  projectId: 'seu-projeto',
  storageBucket: 'seu-projeto.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:0000000000000000'
};
