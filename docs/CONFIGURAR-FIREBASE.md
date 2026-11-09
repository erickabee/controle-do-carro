# Configurar o Firebase e publicar o Controle do Carro

Guia completo para colocar o app no ar: criar o projeto Firebase, cadastrar as pessoas da família, configurar o app e publicar no GitHub Pages.

> Voltar para o [README](../README.md) · Guia para quem usa no celular: [COMO-USAR.md](../COMO-USAR.md) · Desenvolvimento e testes: [DESENVOLVIMENTO.md](DESENVOLVIMENTO.md)

Leva uns 20 minutos. Tudo é gratuito no plano **Spark**, que é mais do que suficiente para uma família.

---

## 1. Criar o projeto
1. Acesse <https://console.firebase.google.com> e clique em **Criar um projeto**.
2. Dê um nome (ex.: `controle-do-carro`). O Google Analytics não é necessário e pode ser desativado.

## 2. Registrar o aplicativo Web
1. Na página inicial do projeto, clique no ícone **Web** (`</>`).
2. Apelido: `Controle do Carro`. **Não** marque “Firebase Hosting”.
3. Ele mostra um trecho `const firebaseConfig = { apiKey: ..., ... }`. **Guarde esse trecho**: ele será usado nos passos 10 e 11. Se perder, ele fica em ⚙️ **Configurações do projeto → Geral → Seus apps**.

## 3. Ativar o login
**Criação → Authentication → Vamos começar → Método de login**:
- **Google:** ativar e escolher o e-mail de suporte.
- **E-mail/senha:** ativar só a primeira opção (sem “Link do e-mail”).

## 4. Autorizar o endereço do site
**Authentication → Configurações → Domínios autorizados → Adicionar domínio**: `erickabee.github.io` (troque pelo seu usuário do GitHub). `localhost` já vem na lista.

## 5. (Recomendado) Impedir cadastros por conta própria
**Authentication → Configurações → Ações do usuário**: desmarque **Ativar criação (inscrição)**. Assim só você cria contas de e-mail e senha. Mesmo sem isso, ninguém de fora acessa os dados, porque as regras exigem um e-mail autorizado e verificado.

## 6. E-mails em português
**Authentication → Modelos → idioma** (ícone de lápis/globo): escolha **Português (Brasil)**. Isso traduz os e-mails de confirmação e de redefinição de senha.

## 7. Criar o banco de dados
**Criação → Firestore Database → Criar banco de dados**:
- Local: **`southamerica-east1` (São Paulo)**. Esse local não pode ser mudado depois.
- Comece no **modo de produção**, que nega tudo.

## 8. Publicar as regras de segurança
**Firestore Database → Regras**: apague o conteúdo, cole o arquivo [`firestore.rules`](../firestore.rules) inteiro e clique em **Publicar**.

Se preferir a linha de comando:

```bash
npx firebase-tools login
```

```bash
npx firebase-tools deploy --only firestore:rules --project SEU-PROJETO
```

## 9. Restringir a chave da API ao seu site
No [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (mesmo projeto), abra **APIs e serviços → Credenciais → Browser key (auto created by Firebase)**:
- **Restrições de aplicativos → Referenciadores HTTP** e adicione:
  - `https://erickabee.github.io/*`
  - `https://SEU-PROJETO.firebaseapp.com/*` (necessário para o login com Google)
  - `http://localhost:8000/*` (só se for testar no computador)
- Salve. A mudança pode levar alguns minutos para valer.

## 10. Configurar o app no seu computador (opcional, para testar)

```bash
cp firebase-config.example.js firebase-config.js
```

Abra `firebase-config.js` e cole os valores do passo 2. Esse arquivo **não vai para o Git** (está no `.gitignore`). Depois rode um servidor local:

```bash
python3 -m http.server 8000
```

e abra <http://localhost:8000>.

## 11. Publicar o site no GitHub Pages
1. No GitHub, abra o repositório → **Settings → Secrets and variables → Actions → New repository secret**:
   - **Name:** `FIREBASE_CONFIG`
   - **Secret:** cole o objeto do passo 2 (pode ser o trecho `const firebaseConfig = {...};` inteiro ou só o `{...}`).
2. **Settings → Pages → Build and deployment → Source:** escolha **GitHub Actions**.
3. Envie algo para o branch `main` ou rode o workflow manualmente (**Actions → Testar e publicar → Run workflow**). Ele:
   - roda os testes dos cálculos e das regras;
   - cria o `firebase-config.js` a partir do segredo, só dentro da publicação ([`scripts/gerar-config.mjs`](../scripts/gerar-config.mjs), que recusa conteúdo parecido com chave de conta de serviço);
   - publica em `https://erickabee.github.io/controle-do-carro/`.

Sem o segredo `FIREBASE_CONFIG`, a etapa de publicação falha de propósito, com uma mensagem explicando o que falta.

---

## Cadastrar as pessoas da família

1. **Você (responsável):** abra o site, toque em **Entrar com Google**, depois em **Criar família**, e cadastre os carros.
2. Em **Ajustes → Pessoas com acesso**, inclua o e-mail de cada pessoa.
3. Para cada pessoa:
   - **Tem conta Google (Gmail):** ela só precisa tocar em **Entrar com Google**.
   - **Não tem Gmail (vai usar e-mail e senha):** a pessoa não cria a senha no app. **Você** cria a conta no Console do Firebase, em **Authentication → Usuários → Adicionar usuário**: digite o e-mail dela e uma senha escolhida por você (mínimo de 6 caracteres). Anote a senha nesse momento e passe para a pessoa, porque o Firebase **não mostra a senha depois**. No primeiro acesso o app pede para confirmar o e-mail, tocando no link que chega na caixa de entrada.
   - **Para trocar ou recuperar a senha:** a própria pessoa toca em **Esqueci minha senha** na tela de entrada e recebe um link por e-mail para criar uma senha nova.
4. Para tirar o acesso de alguém: **Ajustes → Pessoas com acesso → Remover acesso**.

> Dica: no **iPhone**, o login com Google às vezes não abre quando o app está na tela inicial. Nesse caso use **e-mail e senha**, ou entre pelo Safari e depois adicione à tela inicial.

---

## Migração dos dados da versão antiga

A versão anterior guardava tudo só no navegador do aparelho. Para trazer esses dados para a nuvem:

- **Automática:** se o celular já usou a versão antiga no mesmo endereço, o app novo mostra no painel o aviso **“Registros antigos neste celular → Enviar para a nuvem”**.
- **Por arquivo:** em **Ajustes → Usar uma cópia de segurança**, escolha o arquivo `.json` salvo pela versão antiga. São aceitas cópias da versão antiga e da nova.
- **Juntar ou substituir:**
  - **Juntar (recomendado):** traz o que está na cópia sem apagar nada. Um carro com o mesmo nome é unido ao existente. Para os outros, o app pergunta se deve criar um carro novo ou juntar com um existente.
  - **Substituir tudo:** deixa a nuvem igual à cópia, com confirmação dupla.
- **Sem duplicar:** cada registro mantém o mesmo identificador, então importar duas vezes não cria cópias.
- **Nada é apagado no aparelho:** os dados locais antigos continuam lá. Os dados de demonstração nunca são enviados.

---

## Desenvolvimento com emuladores

Para testar sem tocar em nenhum projeto real (login e banco locais), veja [DESENVOLVIMENTO.md](DESENVOLVIMENTO.md#rodar-o-app-contra-os-emuladores-do-firebase).

---

## Custos e limites

O plano gratuito (Spark) permite 50 mil leituras e 20 mil gravações por dia no Firestore. Uma família registra algumas dezenas de itens por mês e, ao abrir o app, lê no máximo alguns milhares de documentos, bem abaixo do limite.
