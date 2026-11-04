# 🚗 Controle do Carro

Aplicativo web, em português, para uma família acompanhar **abastecimentos**, **consumo**, **gastos** e **manutenções** de até **dois carros**, com os mesmos dados em vários celulares.

Feito para pessoas pouco acostumadas com tecnologia: botões grandes, letras legíveis, formulários curtos, números no formato brasileiro (R$, vírgula decimal) e mensagens simples.

| Entrar | Painel | Relatórios |
|---|---|---|
| ![Tela de entrada](docs/imagens/login.png) | ![Painel do carro](docs/imagens/painel.png) | ![Relatórios](docs/imagens/relatorios.png) |

<sub>Imagens geradas no modo demonstração, com dados inventados.</sub>

**Funcionalidades**

- Registro de abastecimento com cálculo na hora: preço por litro, km rodados, consumo (km/L), custo por km e variação do preço do litro.
- Validações simples. A quilometragem não pode ser menor que a anterior, e litros e valor precisam ser maiores que zero. Valores estranhos pedem confirmação antes de salvar.
- Manutenções com lembretes:
  - troca de óleo a cada 5.000 km (configurável) e, se quiser, também por meses;
  - pneus e outros serviços com lembrete por km ou por data, definido pela pessoa.
- Painel com quilometragem atual, consumo recente, gasto do mês, último abastecimento e a próxima manutenção. Os avisos aparecem em amarelo (chegando) e vermelho (atrasada).
- Histórico com filtros por período, edição e exclusão (sempre com confirmação).
- Relatórios: gasto com combustível por mês e consumo mês a mês.
- Dois carros com dados e cálculos separados. Cada carro tem uma cor própria na tela para não registrar no carro errado.
- **Nuvem da família (Firebase):** login com Google ou com e-mail e senha. Só entram os e-mails autorizados, e o que um celular registra aparece no outro em segundos.
- **Funciona sem internet:** os registros ficam guardados no celular e são enviados quando a conexão voltar.
- Cópia de segurança (.json), restauração e planilha (.csv para Excel e Google Planilhas).
- Modo demonstração com dados de exemplo, sem login. Nada desse modo vai para a nuvem.

> 📱 **Instruções para quem vai usar no celular:** [COMO-USAR.md](COMO-USAR.md)

---

## Tecnologia

| Parte | Escolha |
|---|---|
| Interface | HTML, CSS e JavaScript puro, sem framework e sem etapa de compilação |
| Login | Firebase Authentication: Google e e-mail/senha |
| Banco de dados | Cloud Firestore com cache persistente no aparelho (funciona sem internet) |
| SDK | Firebase JS SDK 10.14.1, carregado do CDN oficial do Google (`gstatic.com`) |
| Hospedagem | GitHub Pages, publicado pelo GitHub Actions |
| Testes | Node (cálculos) e Firebase Emulator Suite com `@firebase/rules-unit-testing` (regras de segurança) |

### Estrutura dos dados no Firestore

```
familias/{familiaId}                       nome, emails autorizados, quem criou
familias/{familiaId}/veiculos/{id}         nome, marca, modelo, ano, cor, intervalo da troca de óleo
familias/{familiaId}/abastecimentos/{id}   carroId, data, km, litros, valor, tanqueCheio, combustível, obs
familias/{familiaId}/manutencoes/{id}      carroId, tipo, data, km, valor, lembretes, obs
```

Todo registro guarda o `carroId`. Cálculos, histórico, relatórios e lembretes são sempre filtrados por carro, então os dois carros nunca se misturam.

### Arquivos

```
index.html                 página do aplicativo
css/estilo.css             aparência
js/calculos.js             fórmulas, validações e formatação brasileira (sem dependências)
js/nuvem.js                Firebase: login, leitura em tempo real e gravação
js/app.js                  telas, fluxo de login/família, importação, cópia de segurança e planilha
js/demo.js                 dados de demonstração (inventados)
firestore.rules            regras de segurança do Firestore
firebase-config.example.js modelo da configuração do Firebase (a real fica fora do Git)
scripts/gerar-config.mjs   gera firebase-config.js a partir de um segredo (usado na publicação)
.github/workflows/         testes e publicação no GitHub Pages
testes/                    testes dos cálculos e das regras
sw.js, manifest.webmanifest  uso sem internet e “Adicionar à tela inicial”
```

---

## Segurança e privacidade

- **Negado por padrão.** As regras em [`firestore.rules`](firestore.rules) recusam qualquer acesso que não esteja liberado explicitamente. Para ler ou gravar é preciso:
  1. estar logado;
  2. ter o **e-mail verificado** (contas Google já vêm verificadas; contas de e-mail e senha confirmam pelo link enviado no primeiro acesso);
  3. ter o e-mail na lista `emails` do documento da família.
- **Cada família só acessa os próprios registros.** A busca “qual é a minha família” só devolve famílias que contêm o seu e-mail, e listar todas as famílias é negado.
- **Validação dos dados.** As regras conferem tipos, campos permitidos, tamanhos e valores (por exemplo, litros e valor maiores que zero). Quem criou a família não pode ser removido nem substituído, e só essa pessoa pode apagar a família.
- **O repositório tem só código e documentação.** Não guarda dados dos carros, cópias de segurança, senhas nem credenciais administrativas. O `.gitignore` bloqueia `firebase-config.js`, `.env`, chaves de conta de serviço e os arquivos exportados pelo app.
- **A configuração web do Firebase não é segredo.** `apiKey`, `projectId` e `appId` só identificam o projeto e acabam visíveis no navegador de qualquer site que use Firebase. Quem protege os dados são o login e as regras. Mesmo assim, ela fica fora do Git (em um segredo do GitHub) e a chave é restrita ao domínio do site (passo 9 abaixo).
- **Nenhuma credencial administrativa é usada.** Não há Admin SDK nem conta de serviço. O script de publicação recusa um conteúdo que pareça chave de conta de serviço.
- As regras têm **41 testes automáticos** (`testes/regras.test.mjs`), que rodam no emulador a cada envio para o GitHub.

---

## Passo a passo: criar e configurar o Firebase

Leva uns 20 minutos. Tudo é gratuito no plano **Spark**, que é mais do que suficiente para uma família.

### 1. Criar o projeto
1. Acesse <https://console.firebase.google.com> e clique em **Criar um projeto**.
2. Dê um nome (ex.: `controle-do-carro`). O Google Analytics não é necessário e pode ser desativado.

### 2. Registrar o aplicativo Web
1. Na página inicial do projeto, clique no ícone **Web** (`</>`).
2. Apelido: `Controle do Carro`. **Não** marque “Firebase Hosting”.
3. Ele mostra um trecho `const firebaseConfig = { apiKey: ..., ... }`. **Guarde esse trecho**: ele será usado nos passos 10 e 11. Se perder, ele fica em ⚙️ **Configurações do projeto → Geral → Seus apps**.

### 3. Ativar o login
**Criação → Authentication → Vamos começar → Método de login**:
- **Google:** ativar e escolher o e-mail de suporte.
- **E-mail/senha:** ativar só a primeira opção (sem “Link do e-mail”).

### 4. Autorizar o endereço do site
**Authentication → Configurações → Domínios autorizados → Adicionar domínio**: `erickabee.github.io` (troque pelo seu usuário do GitHub). `localhost` já vem na lista.

### 5. (Recomendado) Impedir cadastros por conta própria
**Authentication → Configurações → Ações do usuário**: desmarque **Ativar criação (inscrição)**. Assim só você cria contas de e-mail e senha. Mesmo sem isso, ninguém de fora acessa os dados, porque as regras exigem um e-mail autorizado e verificado.

### 6. E-mails em português
**Authentication → Modelos → idioma** (ícone de lápis/globo): escolha **Português (Brasil)**. Isso traduz os e-mails de confirmação e de redefinição de senha.

### 7. Criar o banco de dados
**Criação → Firestore Database → Criar banco de dados**:
- Local: **`southamerica-east1` (São Paulo)**. Esse local não pode ser mudado depois.
- Comece no **modo de produção**, que nega tudo.

### 8. Publicar as regras de segurança
**Firestore Database → Regras**: apague o conteúdo, cole o arquivo [`firestore.rules`](firestore.rules) inteiro e clique em **Publicar**.

Se preferir a linha de comando:

```bash
npx firebase-tools login
```

```bash
npx firebase-tools deploy --only firestore:rules --project SEU-PROJETO
```

### 9. Restringir a chave da API ao seu site
No [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (mesmo projeto), abra **APIs e serviços → Credenciais → Browser key (auto created by Firebase)**:
- **Restrições de aplicativos → Referenciadores HTTP** e adicione:
  - `https://erickabee.github.io/*`
  - `https://SEU-PROJETO.firebaseapp.com/*` (necessário para o login com Google)
  - `http://localhost:8000/*` (só se for testar no computador)
- Salve. A mudança pode levar alguns minutos para valer.

### 10. Configurar o app no seu computador (opcional, para testar)

```bash
cp firebase-config.example.js firebase-config.js
```

Abra `firebase-config.js` e cole os valores do passo 2. Esse arquivo **não vai para o Git**. Depois rode um servidor local:

```bash
python3 -m http.server 8000
```

e abra <http://localhost:8000>.

### 11. Publicar o site no GitHub Pages
1. No GitHub, abra o repositório → **Settings → Secrets and variables → Actions → New repository secret**:
   - **Name:** `FIREBASE_CONFIG`
   - **Secret:** cole o objeto do passo 2 (pode ser o trecho `const firebaseConfig = {...};` inteiro ou só o `{...}`).
2. **Settings → Pages → Build and deployment → Source:** escolha **GitHub Actions**.
3. Envie algo para o branch `main` ou rode o workflow manualmente (**Actions → Testar e publicar → Run workflow**). Ele:
   - roda os testes dos cálculos e das regras;
   - cria o `firebase-config.js` a partir do segredo, só dentro da publicação;
   - publica em `https://erickabee.github.io/controle-do-carro/`.

---

## Cadastrar as pessoas da família

1. **Você (responsável):** abra o site, toque em **Entrar com Google**, depois em **Criar família**, e cadastre os carros.
2. Em **Ajustes → Pessoas com acesso**, inclua o e-mail de cada pessoa.
3. Para cada pessoa:
   - **Tem conta Google (Gmail):** ela só precisa tocar em **Entrar com Google**.
   - **Vai usar e-mail e senha:** no Console do Firebase, em **Authentication → Usuários → Adicionar usuário**, informe o e-mail e uma senha e passe a senha para ela. No primeiro acesso o app pede para confirmar o e-mail, tocando no link que chega na caixa de entrada.
4. Para tirar o acesso de alguém: **Ajustes → Pessoas com acesso → Remover acesso**. A pessoa perde o acesso na hora.

> Dica: no **iPhone**, o login com Google às vezes não abre quando o app está na tela inicial. Nesse caso use **e-mail e senha**, ou entre pelo Safari e depois adicione à tela inicial.

---

## Migração dos dados da versão antiga

A versão anterior guardava tudo só no navegador do aparelho. Nada se perde na migração:

- **Automática:** se o celular já usou a versão antiga no mesmo endereço, o app novo mostra no painel o aviso **“Registros antigos neste celular → Enviar para a nuvem”**.
- **Por arquivo:** em **Ajustes → Usar uma cópia de segurança**, escolha o arquivo `.json` salvo pela versão antiga. São aceitas cópias da versão antiga e da nova.
- **Juntar ou substituir:**
  - **Juntar (recomendado):** traz o que está na cópia sem apagar nada. Um carro com o mesmo nome é unido ao existente. Para os outros, o app pergunta se deve criar um carro novo ou juntar com um existente.
  - **Substituir tudo:** deixa a nuvem igual à cópia, com confirmação dupla.
- **Sem duplicar:** cada registro mantém o mesmo identificador, então importar duas vezes não cria cópias.
- **Nada é apagado no aparelho:** os dados locais antigos continuam lá. Os dados de demonstração nunca são enviados.

---

## Desenvolvimento e testes

```bash
npm install
```

Testes dos cálculos (Node puro):

```bash
npm test
```

Testes das regras de segurança (precisa de Java 11 ou mais novo; usa o emulador, não o projeto real):

```bash
npm run test:regras
```

Para rodar o app inteiro contra os emuladores (login e banco falsos, locais), crie um `firebase-config.js` com o projeto de demonstração e a opção de emulador:

```js
window.FIREBASE_CONFIG = { apiKey: 'x', authDomain: 'demo-controle-do-carro.firebaseapp.com', projectId: 'demo-controle-do-carro', appId: '1:1:web:1', emulador: true };
```

Depois inicie os emuladores:

```bash
npx firebase emulators:start --only firestore,auth --project demo-controle-do-carro
```

e, em outro terminal, o servidor:

```bash
python3 -m http.server 8000
```

> Ao alterar arquivos do app, aumente `VERSAO` em `sw.js` para os celulares baixarem a versão nova.

---

## Como os cálculos são feitos

Todas as fórmulas estão em `js/calculos.js` e são verificadas por `testes/calculos.test.js`.

| Cálculo | Fórmula |
|---|---|
| Preço por litro | `valor pago ÷ litros` |
| Km rodados desde o anterior | `km deste abastecimento − km do abastecimento anterior` |
| Variação do preço | `preço/litro atual − preço/litro anterior` (em R$ e em %) |
| Consumo (km/L) | `km entre dois tanques cheios ÷ litros colocados depois do tanque cheio anterior (incluindo o atual)` |
| Custo por km | `soma dos valores pagos no trecho ÷ km do trecho` |
| Consumo recente (painel) | `soma dos km dos 3 últimos trechos ÷ soma dos litros desses trechos` |
| Consumo do mês (relatórios) | `km dos trechos que terminam no mês ÷ litros desses trechos` |
| Quilometragem atual | maior quilometragem anotada (abastecimentos ou manutenções) |
| Próxima troca de óleo | `km da última troca + intervalo` (padrão 5.000 km) e, se configurado, `data + N meses`; vale o que vier primeiro |
| Outros lembretes | `km da manutenção + “avisar daqui a X km”` e/ou uma data, só se a pessoa definir |

**Tanque cheio:** o formulário pergunta “Encheu o tanque até o fim?”. Quando o tanque **não** é completado, os litros daquele abastecimento são somados ao próximo tanque cheio e o consumo é calculado para o trecho inteiro. Se alguém marcar “Sim” sem ter completado, o consumo daquele trecho sai impreciso. Quando não há dados suficientes, o app explica o motivo em vez de mostrar um número.

**Avisos:** 🟡 chegando = faltam até 500 km ou 30 dias; 🔴 atrasada = passou do km ou da data.

---

## Custos e limites

O plano gratuito (Spark) permite 50 mil leituras e 20 mil gravações por dia no Firestore. Uma família registra algumas dezenas de itens por mês e, ao abrir o app, lê no máximo alguns milhares de documentos, bem abaixo do limite.

## Licença

[MIT](LICENSE)
