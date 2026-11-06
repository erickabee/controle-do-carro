# 🚗 Controle do Carro

Aplicativo web feito para a minha família registrar os **abastecimentos**, acompanhar os **gastos** e lembrar das **manutenções** de dois carros. É pensado para os meus pais, que não têm muita familiaridade com tecnologia: botões grandes, poucos campos e tudo em português do Brasil.

Os dados ficam numa conta do Firebase da família, e cada pessoa autorizada pode vê-los no próprio celular: o que um registra, o outro também vê.

**Status:** o app **ainda não está publicado**. A publicação depende de criar o projeto no Firebase e configurar o GitHub Pages, e o passo a passo está em [docs/CONFIGURAR-FIREBASE.md](docs/CONFIGURAR-FIREBASE.md). Enquanto isso, dá para conhecer o app no modo demonstração, rodando no computador (veja [Executar localmente](#executar-localmente)).

## Demonstração

| Entrada | Painel do carro | Relatórios |
|---|---|---|
| ![Tela de entrada com login pelo Google ou por e-mail e senha](docs/imagens/login.png) | ![Painel com aviso de troca de óleo, quilometragem e consumo](docs/imagens/painel.png) | ![Relatório de gasto com combustível por mês](docs/imagens/relatorios.png) |

<sub>As imagens foram geradas no modo demonstração, com **dados fictícios**.</sub>

## O problema

Com dois carros em casa, é difícil acompanhar tudo de cabeça:

- quanto se abasteceu, quando e com que quilometragem;
- se o carro está gastando mais combustível do que antes;
- quanto foi gasto com combustível no mês;
- quando chega a próxima troca de óleo, ou outra manutenção, como a troca de pneus.

E as anotações precisavam ser fáceis o bastante para os meus pais fazerem sozinhos, cada um no seu celular, sem misturar os dados de um carro com os do outro.

## O que o app faz

- **Abastecimentos:** data, quilometragem do painel, litros e valor pago. O preço por litro é calculado sozinho.
- **Cálculos automáticos:** km rodados desde o último abastecimento, consumo em km por litro, custo por km e quanto o preço do litro subiu ou baixou.
- **Gastos:** gasto com combustível no mês e, se informado, com manutenção.
- **Manutenção e lembretes:**
  - troca de óleo a cada 5.000 km (o intervalo pode ser mudado) e, se quiser, também por meses;
  - pneus e outros serviços com lembrete por km ou por data, só quando a pessoa define;
  - avisos em amarelo quando está chegando e em vermelho quando está atrasada, por exemplo “Faltam 500 km para a troca de óleo”.
- **Histórico:** do mais recente para o mais antigo, com filtro por período, e opções para corrigir ou apagar (sempre com confirmação).
- **Relatórios:** gasto com combustível por mês e consumo médio mês a mês, com frases como “melhor mês” e “pior mês”.
- **Dois carros separados:** cada carro tem seus próprios registros, cálculos e lembretes, e uma cor própria na tela.
- **Vários celulares:** com o Firebase configurado, as pessoas autorizadas veem os mesmos dados.
- **Sem internet:** os registros ficam guardados no celular e são enviados quando a conexão voltar.
- **Cópia de segurança:** arquivo `.json` para guardar e restaurar os dados, e planilha `.csv` para abrir no Excel ou no Google Planilhas.

## Como é usado pela família

1. **Entrar:** com a conta Google ou com e-mail e senha. No primeiro acesso por e-mail e senha, o app pede para confirmar o e-mail uma vez.
2. **Escolher o carro:** ao abrir, a pessoa toca no carro que quer ver. A faixa colorida no alto da tela mostra sempre qual está selecionado.
3. **Anotar:**
   - abastecimento: quilometragem, litros, valor e se encheu o tanque;
   - manutenção: o que foi feito, a data e a quilometragem.

   Ao salvar um abastecimento, o app mostra quanto o carro andou, o consumo e o preço do litro.
4. **Consultar:** a tela inicial mostra os avisos de manutenção, e o **Histórico** e os **Relatórios** ficam no menu de baixo.

Depois que o Firebase estiver configurado e o site publicado, o que um celular registra aparece nos outros celulares autorizados. O guia passo a passo para os meus pais está em [COMO-USAR.md](COMO-USAR.md).

## Decisões do projeto

**Feito para o celular e para quem não é da área.** Letras grandes, botões grandes, formulários curtos e exemplos em cada campo. Datas, dinheiro e números no formato brasileiro (R$ 220,00; 35,5 litros). Quando falta dado para um cálculo, o app explica por quê em vez de mostrar um número confuso.

**Poucos campos para anotar.** Para um abastecimento bastam a quilometragem do painel, os litros e o valor da nota. Se a pessoa não souber a quilometragem total, pode informar só quantos km andou desde o último abastecimento.

**Consumo calculado pelo tanque cheio.** O consumo é a distância entre dois abastecimentos com tanque cheio dividida pelos litros colocados para completar o tanque. Quando o tanque não é completado, os litros entram no próximo tanque cheio. Por isso o formulário pergunta “Encheu o tanque até o fim?”. Se alguém marcar “Sim” sem ter completado, o consumo daquele trecho sai impreciso.

**Validação antes de salvar.** A quilometragem não pode ser menor que a do registro anterior, e litros e valor precisam ser maiores que zero. Valores estranhos, como um preço por litro fora do normal, mostram um aviso e deixam a pessoa corrigir ou salvar assim mesmo.

**Cada carro com seus dados.** Todo registro guarda o carro a que pertence, e os cálculos, o histórico, os relatórios e os lembretes são sempre filtrados por carro. Nas telas de anotar, o nome e a cor do carro ficam bem visíveis para evitar registrar no carro errado.

**Acesso limitado à família.** As regras do Firestore só deixam ler e gravar quem fez login, confirmou o e-mail e está na lista de e-mails da família. A lista é mantida dentro do app, em **Ajustes → Pessoas com acesso**.

## Segurança e privacidade

- Os dados ficam no **Cloud Firestore** do projeto Firebase da família.
- As regras em [`firestore.rules`](firestore.rules) **negam tudo por padrão**. Para ler ou gravar é preciso:
  - estar logado;
  - ter o **e-mail verificado**;
  - ter o e-mail na **lista de autorizados** da família.

  Cada família só acessa os próprios registros, e as regras também conferem o formato dos dados gravados.
- A configuração web do Firebase **não fica no Git**. No computador, ela vai num `firebase-config.js` criado a partir do modelo [`firebase-config.example.js`](firebase-config.example.js). Na publicação, ela vem de um segredo do GitHub. Nenhuma credencial administrativa é usada.
- O repositório tem só código e documentação: sem dados reais, cópias de segurança ou senhas.
- **Importante:** as regras foram testadas **apenas no emulador do Firebase**. Isso não substitui uma verificação num projeto Firebase real, que ainda não foi feita (veja [Testes](#testes)).

## Testes

| Teste | Arquivo | O que verifica | Onde foi executado |
|---|---|---|---|
| Lógica dos cálculos | [`testes/calculos.test.js`](testes/calculos.test.js) | 15 testes: leitura de números no formato brasileiro, consumo pelo tanque cheio, validações, lembretes de óleo e pneus | No ambiente de desenvolvimento (Node) e no GitHub Actions |
| Regras de segurança | [`testes/regras.test.mjs`](testes/regras.test.mjs) | 41 testes: acesso sem login, e-mail não verificado, isolamento entre famílias, validação dos dados, gravação em lote | No **emulador** do Firestore, no ambiente de desenvolvimento e no GitHub Actions |
| Firebase real | — | — | **Ainda não executado**: o projeto de produção não foi criado |

O workflow [`.github/workflows/publicar.yml`](.github/workflows/publicar.yml) roda os dois conjuntos a cada envio para o `main`. Na primeira execução, em 04/11/2026, a etapa de testes passou e a de publicação falhou porque o segredo `FIREBASE_CONFIG` ainda não existia.

Não há testes automatizados de tela no repositório.

## Tecnologias

- **HTML, CSS e JavaScript**, sem framework e sem etapa de build
- **Firebase Authentication** (Google e e-mail/senha) e **Cloud Firestore**, com o SDK web 10.14.1 carregado do CDN do Google
- **GitHub Actions** para testes e publicação no **GitHub Pages**
- Testes com **Node**, **Firebase Emulator Suite** (`firebase-tools`) e **`@firebase/rules-unit-testing`**

### Estrutura

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
docs/                      guia do Firebase e imagens
```

## Executar localmente

Instalar as dependências de desenvolvimento:

```bash
npm install
```

Testes dos cálculos:

```bash
npm test
```

Testes das regras no emulador (precisa de Java 11 ou mais novo):

```bash
npm run test:regras
```

Para abrir o **modo demonstração**, inicie um servidor na pasta do projeto:

```bash
python3 -m http.server 8000
```

Abra <http://localhost:8000> e toque em **Ver demonstração**. Sem o arquivo `firebase-config.js`, o app avisa que falta configurar o Firebase e oferece a demonstração, com dados fictícios que não são salvos.

Para usar com um Firebase de verdade, ou com os emuladores, siga o [guia de configuração](docs/CONFIGURAR-FIREBASE.md).

## Documentação

- [Guia de configuração e publicação do Firebase](docs/CONFIGURAR-FIREBASE.md): criar o projeto, publicar as regras, cadastrar as pessoas, migrar dados antigos e publicar no GitHub Pages.
- [Guia de uso no celular](COMO-USAR.md): passo a passo para os meus pais.

## Como os cálculos são feitos

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

Os avisos aparecem como “chegando” quando faltam até 500 km ou 30 dias, e como “atrasada” quando passou do km ou da data. As fórmulas estão em [`js/calculos.js`](js/calculos.js).

---

<!-- CRÉDITO SUGERIDO — A CONFIRMAR antes de ir para o branch principal -->
Projeto de [Erick Abe](https://github.com/erickabee), idealizado para a família e desenvolvido com o auxílio do Claude (IA da Anthropic).

## Licença

Distribuído sob a licença [MIT](LICENSE): pode ser usado, copiado e modificado, desde que o aviso de copyright e a licença sejam mantidos.
