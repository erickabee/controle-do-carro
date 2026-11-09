# Desenvolvimento e testes

Como rodar o Controle do Carro no computador, executar os testes e entender a organização do código.

> Voltar para o [README](../README.md) · Configurar o Firebase e publicar: [CONFIGURAR-FIREBASE.md](CONFIGURAR-FIREBASE.md) · Guia de uso no celular: [COMO-USAR.md](../COMO-USAR.md)

---

## Instalar

As dependências são só de desenvolvimento (testes e emulador). O app em si não tem etapa de build.

```bash
npm install
```

## Abrir o modo demonstração

Inicie um servidor na pasta do projeto:

```bash
python3 -m http.server 8000
```

Abra <http://localhost:8000> e toque em **Ver demonstração**. Sem o arquivo `firebase-config.js`, o app avisa que falta configurar o Firebase e oferece a demonstração, com dados fictícios que não são salvos.

Para usar um Firebase de verdade, siga o [guia de configuração](CONFIGURAR-FIREBASE.md).

## Rodar o app contra os emuladores do Firebase

Para desenvolvimento, dá para usar login e banco falsos, locais, sem tocar em nenhum projeto real. Crie um `firebase-config.js` (ele está no `.gitignore`) com o projeto de demonstração e a opção de emulador:

```js
window.FIREBASE_CONFIG = { apiKey: 'x', authDomain: 'demo-controle-do-carro.firebaseapp.com', projectId: 'demo-controle-do-carro', appId: '1:1:web:1', emulador: true };
```

Inicie os emuladores (precisa de Java 11 ou mais novo):

```bash
npx firebase emulators:start --only firestore,auth --project demo-controle-do-carro
```

Em outro terminal, inicie o servidor:

```bash
python3 -m http.server 8000
```

> Ao alterar arquivos do app, aumente `VERSAO` em `sw.js` para os celulares baixarem a versão nova.

---

## Testes

Testes dos cálculos (Node):

```bash
npm test
```

Testes das regras de segurança no emulador do Firestore (precisa de Java 11 ou mais novo; não toca no projeto real):

```bash
npm run test:regras
```

| Teste | Arquivo | O que verifica | Onde foi executado |
|---|---|---|---|
| Lógica dos cálculos | [`testes/calculos.test.js`](../testes/calculos.test.js) | 15 testes: leitura de números no formato brasileiro, consumo pelo tanque cheio, validações, lembretes de óleo e pneus | No ambiente de desenvolvimento (Node) e no GitHub Actions |
| Regras de segurança | [`testes/regras.test.mjs`](../testes/regras.test.mjs) | 41 testes: acesso sem login, e-mail não verificado, isolamento entre famílias, validação dos dados, gravação em lote | No **emulador** do Firestore, no ambiente de desenvolvimento e no GitHub Actions |
| Firebase real | — | Verificação manual em 09/11/2026: a tela de entrada carrega, os logins por Google e por e-mail e senha estão ativos e o Firestore recusa leitura sem login | Projeto de produção. O fluxo completo com contas reais **ainda não foi verificado**, e não há testes automáticos contra o projeto real |

O workflow [`.github/workflows/publicar.yml`](../.github/workflows/publicar.yml) roda os dois conjuntos a cada envio para o `main`. Nas duas primeiras execuções, a etapa de testes passou e a de publicação falhou porque o segredo `FIREBASE_CONFIG` ainda não existia. Na terceira, em 09/11/2026, os testes passaram e o site foi publicado.

Não há testes automatizados de tela no repositório. Testar as regras no emulador não substitui uma verificação num projeto Firebase real.

---

## Estrutura do código

```
index.html                 página do aplicativo
css/estilo.css             aparência
js/calculos.js             fórmulas, validações e formatação brasileira
js/nuvem.js                Firebase: login, leitura em tempo real e gravação
js/app.js                  telas, login e família, importação, cópia de segurança e planilha
js/demo.js                 dados fictícios do modo demonstração
firestore.rules            regras de segurança do Firestore
firebase-config.example.js modelo da configuração do Firebase
scripts/gerar-config.mjs   cria firebase-config.js a partir do segredo, na publicação
testes/                    testes dos cálculos e das regras
docs/                      guias e imagens
sw.js, manifest.webmanifest  uso sem internet e “Adicionar à tela inicial”
```

## Estrutura dos dados no Firestore

```
familias/{familiaId}                       nome, emails autorizados, quem criou
familias/{familiaId}/veiculos/{id}         nome, marca, modelo, ano, cor, intervalo da troca de óleo
familias/{familiaId}/abastecimentos/{id}   carroId, data, km, litros, valor, tanqueCheio, combustível, obs
familias/{familiaId}/manutencoes/{id}      carroId, tipo, data, km, valor, lembretes, obs
```

Todo registro guarda o `carroId`. Cálculos, histórico, relatórios e lembretes são sempre filtrados por carro.

---

## Como os cálculos são feitos

Todas as fórmulas estão em [`js/calculos.js`](../js/calculos.js) e são verificadas por [`testes/calculos.test.js`](../testes/calculos.test.js).

| Cálculo | Fórmula |
|---|---|
| Preço por litro | `valor pago ÷ litros` |
| Km rodados | `km deste abastecimento − km do abastecimento anterior` |
| Variação do preço | `preço/litro atual − preço/litro anterior` (em R$ e em %) |
| Consumo (km/L) | `km entre dois tanques cheios ÷ litros colocados depois do tanque cheio anterior (incluindo o atual)` |
| Custo por km | `soma dos valores pagos no trecho ÷ km do trecho` |
| Consumo recente (painel) | `km dos 3 últimos trechos ÷ litros desses trechos` |
| Consumo do mês (relatórios) | `km dos trechos que terminam no mês ÷ litros desses trechos` |
| Quilometragem atual | maior quilometragem anotada (abastecimentos ou manutenções) |
| Próxima troca de óleo | `km da última troca + intervalo` (padrão 5.000 km) e, se configurado, `data + N meses`; vale o que vier primeiro |
| Outros lembretes | `km da manutenção + “avisar daqui a X km”` e/ou uma data, só se a pessoa definir |

**Tanque cheio:** quando o tanque não é completado, os litros daquele abastecimento são somados ao próximo tanque cheio, e o consumo é calculado para o trecho inteiro. Se alguém marcar “Sim” sem ter completado, o consumo daquele trecho sai impreciso.

**Avisos:** “chegando” quando faltam até 500 km ou 30 dias; “atrasada” quando passou do km ou da data.
