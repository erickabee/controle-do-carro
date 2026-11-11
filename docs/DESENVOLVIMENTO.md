# Desenvolvimento e testes

Como rodar o Controle de Bordo no computador, executar os testes e entender a organização do código.

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

Testes dos cálculos, das datas e do reconhecimento de marcas (Node):

```bash
npm test
```

Testes das regras de segurança no emulador do Firestore (precisa de Java 11 ou mais novo; não toca no projeto real):

```bash
npm run test:regras
```

Testes de tela: abrem o app num navegador de verdade (Playwright) contra os emuladores de login e banco, e conferem o resultado direto no banco do emulador. Precisam de Java e do navegador do Playwright:

```bash
npx playwright install chromium
```

```bash
npm run test:telas
```

| Teste | Arquivo | O que verifica | Onde foi executado |
|---|---|---|---|
| Postos | [`testes/postos.test.js`](../testes/postos.test.js) | 14 testes: distância em linha reta, busca por CEP e cidade (com UF, nomes repetidos, fora da pesquisa), raio, combustível, postos sem localização ou com localização aproximada, filtro de bandeira, ordenação por preço, distância e custo total, recomendação (economia no abastecimento menos o deslocamento, tanque pequeno, diferença menor que R$ 1, motivos para não recomendar) e dados atuais, antigos, desatualizados ou ausentes | No ambiente de desenvolvimento (Node) e no GitHub Actions |
| Datas | [`testes/datas.test.js`](../testes/datas.test.js) | 5 testes: leitura de `dd/mm/aaaa` digitado (com ou sem barras), datas impossíveis recusadas, ano bissexto, máscara ao digitar | No ambiente de desenvolvimento (Node) e no GitHub Actions |
| Marcas | [`testes/marcas.test.js`](../testes/marcas.test.js) | 6 testes: reconhecimento da marca escrita pela pessoa (maiúsculas, acentos, apelidos como “VW” e “GM”), marca desconhecida ou vazia sem emblema, sem reconhecimento por pedaço do nome | No ambiente de desenvolvimento (Node) e no GitHub Actions |
| Lógica dos cálculos | [`testes/calculos.test.js`](../testes/calculos.test.js) | 27 testes: preço por litro (valor ÷ litros, rótulo por combustível, GNV em m³, média por combustível), leitura de números no formato brasileiro, consumo pelo tanque cheio, validações, lembretes de óleo e pneus, e cálculos refeitos após corrigir abastecimentos e manutenções | No ambiente de desenvolvimento (Node) e no GitHub Actions |
| Regras de segurança | [`testes/regras.test.mjs`](../testes/regras.test.mjs) | 69 testes: acesso sem login, e-mail não verificado, isolamento entre famílias, validação dos dados, gravação em lote, vários carros, arquivar e reativar; perfil de preferências só da própria pessoa (nem alguém da mesma família lê ou grava), valores permitidos, campos extras recusados, perfil não dá acesso a família | No **emulador** do Firestore, no ambiente de desenvolvimento e no GitHub Actions |
| Telas | [`testes/telas.test.mjs`](../testes/telas.test.mjs) | 50 testes: família começando sem carros, primeiro carro, Garagem abrindo sempre (mesmo com um carro) e sem escolha obrigatória, cartões com marca/modelo, quilometragem e próximo aviso, vários carros com cores repetidas e busca, painel com “← Garagem” e “Trocar carro” (nome do carro inteiro no celular), “Mostrando” e “Trocar” no Histórico e nos Relatórios, volta ao painel do carro depois de salvar, registros separados por carro, arquivar e reativar, histórico somente leitura, corrigir abastecimento e manutenção, editar o carro, restauração e importação sem corte, família antiga sem alteração automática, demonstração; ordem da tela de entrada (e-mail, senha, Entrar, “ou”, Google, demonstração separada) e tudo visível sem rolar no celular; emblema da marca ou genérico e nenhuma linha vazia nos cartões; “← Voltar” e “Cancelar” voltando ao painel, ao Histórico ou a Ajustes, com pergunta só quando há mudanças; tema e tamanho do texto aplicados na hora, gravados no perfil, valendo em outro aparelho, guardados sem internet e enviados quando a conexão volta; na demonstração, nada vai para a nuvem; campo de data em `dd/mm/aaaa` (digitar, data impossível, calendário pelo teclado, troca de mês, “Hoje”, futuro bloqueado, Esc) e filtro do Histórico por datas digitadas; odômetro que não anima ao abrir, rola só quando a quilometragem muda, termina no valor certo em menos de 1 s, anuncia o valor final e não anima com “reduzir movimento”; preço por litro calculado no formulário, na confirmação, no painel, no Histórico e nos Relatórios, sem campo manual e sem gravar o preço; com combustíveis diferentes no período, nenhuma média combinada no relatório nem no Histórico (cada combustível com a própria média); tela Postos com dados fictícios (menu, localização pedida só no toque e nunca acompanhada nem guardada, raio, ordenações, filtro de bandeira, recomendação com as contas, busca por cidade e CEP, região sem resultados, permissão negada, dados antigos/desatualizados/ausentes, nenhuma gravação nos dados da família) | Navegador (Playwright) + **emuladores** de login e Firestore, no ambiente de desenvolvimento e no GitHub Actions |
| Firebase real | — | Verificação manual em 09/11/2026: a tela de entrada carrega, os logins por Google e por e-mail e senha estão ativos e o Firestore recusa leitura sem login | Projeto de produção. O fluxo completo com contas reais **ainda não foi verificado**, e não há testes automáticos contra o projeto real |

O workflow [`.github/workflows/publicar.yml`](../.github/workflows/publicar.yml) roda esses testes a cada envio para o `main`. Nas duas primeiras execuções, a etapa de testes passou e a de publicação falhou porque o segredo `FIREBASE_CONFIG` ainda não existia. Na terceira, em 09/11/2026, os testes passaram e o site foi publicado.

Testar no emulador não substitui uma verificação num projeto Firebase real.

---

## Estrutura do código

```
index.html                 página do aplicativo
css/estilo.css             aparência
js/calculos.js             fórmulas, validações e formatação brasileira
js/marcas.js               reconhece a marca do carro para o emblema da Garagem (sem logotipos)
js/datas.js                campo de data em dd/mm/aaaa com calendário próprio
js/postos.js               tela Postos: busca, filtros, ordenação e recomendação (funções puras)
scripts/postos/            gera os dados da tela Postos (ANP + IBGE) na publicação
js/nuvem.js                Firebase: login, leitura em tempo real e gravação
js/app.js                  telas, login e família, importação, cópia de segurança e planilha
js/demo.js                 dados fictícios do modo demonstração
firestore.rules            regras de segurança do Firestore
firebase-config.example.js modelo da configuração do Firebase
scripts/gerar-config.mjs   cria firebase-config.js a partir do segredo, na publicação
testes/                    testes dos cálculos, das datas, das marcas, das regras e das telas
docs/                      guias e imagens
sw.js, manifest.webmanifest  uso sem internet e “Adicionar à tela inicial”
```

## Estrutura dos dados no Firestore

```
familias/{familiaId}                       nome, emails autorizados, quem criou
familias/{familiaId}/veiculos/{id}         nome, marca, modelo, ano, cor, intervalo da troca de óleo, arquivado
familias/{familiaId}/abastecimentos/{id}   carroId, data, km, litros, valor, tanqueCheio, combustível, obs
familias/{familiaId}/manutencoes/{id}      carroId, tipo, data, km, valor, lembretes, obs
perfis/{uid}                               tema (claro, escuro, auto), texto (padrao, maior, enorme), atualizadoEm
```

O perfil guarda só as preferências de aparência da pessoa, separado dos dados da família. As regras deixam cada pessoa ler e gravar apenas o próprio `perfis/{uid}`, com os valores permitidos; ele não dá acesso a nenhuma família. No aparelho, a última escolha fica também no `localStorage` (`controleCarro.aparencia`), para valer na hora e sem internet. Na demonstração, a escolha fica só no aparelho.

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

## Identidade visual

A direção é “painel de bordo”, com a paleta “grafite e ardósia”: a linguagem vem do painel de instrumentos do carro, sobre superfícies neutras.

- **Paleta:** modo claro com fundo `#f5f6f7`, superfícies brancas e texto `#1b1e23`; modo escuro em grafite com camadas distintas (fundo `#1b1e22`, superfícies `#2b2f36`, `#31353c` e `#373c45`, texto `#eef0f2`). A cor de destaque é discreta e pouco saturada: ardósia `#545d88` no claro e cinza-aço `#8fa0b8` no escuro, usada com moderação: botão principal, menu ativo, links, seleção e foco. Quilometragem, consumo e resumos ficam em superfícies neutras. Avisos usam as cores das luzes do painel: verde (em dia), âmbar (chegando) e vermelho (atrasada). Cada carro mantém a cor própria só em detalhes (faixa fina, ponto, emblema).
- **Tema escuro:** as mesmas cores, redefinidas em `css/estilo.css` para `data-tema="escuro"` e para `data-tema="auto"` com o celular no modo escuro.
- **Contraste (AA):** texto principal 15,4:1 (claro) e 14,6:1 (escuro); legendas 4,9:1 ou mais; botão principal 6,4:1 e 6,6:1; links 7,3:1 ou mais; avisos 4,7:1 ou mais; bordas de campos 3,4:1 e 3,9:1; algarismos do odômetro 13,6:1 (placas cinza-claras no claro) e 8,0:1 (placas grafite mais claras que o cartão no escuro).
- **Tipografia:** a fonte do próprio sistema (sem baixar fontes, para abrir rápido e funcionar sem internet), com títulos pesados, números tabulares e rótulos curtos em maiúsculas espaçadas. Tudo é medido em `rem`: os tamanhos “Maior” (112,5%) e “Ainda maior” (125%) aumentam texto, botões e campos juntos.
- **Componentes:** odômetro com cada algarismo numa placa discreta; quadro de instrumentos neutro no painel; cartões da Garagem como vagas, com emblema; “vaga livre” tracejada para adicionar carro; listas agrupadas em Ajustes; ícones próprios, de traço único, desenhados para o app.
- **Odômetro animado:** quando a quilometragem de um carro muda (por exemplo, depois de um registro), os algarismos que mudaram rolam até o valor novo em 0,8 s. Ao abrir o app não há animação, porque não há valor anterior. Com “reduzir movimento” ligado no aparelho, o número muda direto. O valor final está no texto desde o primeiro instante: os algarismos animados ficam escondidos dos leitores de tela, e uma região `aria-live` anuncia “Quilometragem atualizada: …” uma vez.
- **Campo de data** ([`js/datas.js`](../js/datas.js)): mostra e aceita `dd/mm/aaaa` (as barras entram sozinhas ao digitar) e tem um calendário próprio, em português, com troca de mês, atalho “Hoje”, dias fora do limite bloqueados e teclado (setas, Page Up/Down, Home/End, Enter, Esc). O valor continua num campo escondido com o mesmo `id` e no formato `aaaa-mm-dd`, então cálculos, validações e dados não mudaram.
- **Emblema da marca:** não usamos logotipos de montadoras (são marcas registradas e não há um pacote de ícones com licença clara para isso). O emblema é um selo próprio com a sigla da marca reconhecida (`VW`, `FIAT`…), desenhado em CSS. Marca desconhecida ou vazia mostra um carro genérico. Nada é buscado na internet.

## Tela Postos: dados da ANP

**Fonte dos preços:** ANP, [Levantamento de Preços de Combustíveis — últimas semanas pesquisadas](https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas), planilha semanal “Preços por posto revendedor” (`revendas_lpc_*.xlsx`).
- Colunas: CNPJ, razão social, nome fantasia, endereço, número, complemento, bairro, CEP, município, estado, bandeira, produto, unidade de medida, preço de revenda e data da coleta.
- Não há latitude e longitude. A pesquisa é semanal e por amostragem. Na semana de 01 a 07/11/2026 foram 4.649 postos de combustíveis automotivos em 405 municípios.
- Não existe API de preços em tempo real; a série histórica em CSV ([dados abertos](https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis)) sai com atraso e serve para histórico.

**Localização dos postos:** [CNEFE 2022 do IBGE](https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/), que traz CEP, logradouro, número, latitude e longitude de cada endereço, um arquivo por município. Ordem de busca: mesmo CEP e número; mesma rua com o número mais próximo (até 100 de diferença); centro do CEP quando o CEP é pequeno (até 1,5 km); se nada disso servir, o posto fica sem distância. Numa amostra de 56 postos (Campinas, Canoas e Montes Claros): 66% localizados pelo endereço, 7% pelo CEP e 25% sem localização.

**Geração:** [`scripts/postos/gerar_postos.py`](../scripts/postos/gerar_postos.py) grava arquivos estáticos em `postos/` e guarda os arquivos do IBGE, os centros de CEP e as coordenadas já calculadas no cache do GitHub Actions (o CNEFE é de 2022 e não muda: cada município só é relido quando aparece posto novo ou endereço mudou). Sem serviços pagos, chaves ou backend; o Firebase e as regras não mudam.

**Atualização semanal** (job `dados-postos` do workflow [`publicar.yml`](../.github/workflows/publicar.yml)):
- roda toda **terça-feira às 9h17 (Brasília)**, a cada envio ao `main` e quando alguém toca em **Actions → Testar e publicar → Run workflow** (atualização ou recuperação extraordinária). Em outro branch, gera e confere sem publicar;
- [`scripts/postos/preparar_publicacao.py`](../scripts/postos/preparar_publicacao.py) confere os dados novos: semana pesquisada (não pode ser mais antiga que a publicada nem no futuro), pelo menos 1.000 postos e 100 municípios, pelo menos 40% dos postos localizados pelo endereço, nada muito menor que a publicação anterior (70%) e todos os arquivos legíveis;
- se a ANP ou o IBGE falharem, ou os dados não passarem na conferência, **mantém os últimos dados válidos** do próprio site, com a data da última atualização bem-sucedida, e o app avisa que a tentativa não trouxe dados novos;
- se não houver nenhum dado válido (nem novo nem anterior), o job falha e **o site não é publicado**;
- o resumo da execução (aba *Summary*) mostra a semana, quantos postos, quanto tempo levou e o tamanho dos dados;
- **atenção:** o GitHub desliga agendamentos de repositórios públicos depois de 60 dias sem atividade no repositório. Se isso acontecer, o GitHub mostra o aviso na aba Actions e basta reativar o workflow ali (*Enable workflow*). O app avisa quando os preços ficam antigos (mais de 10 e de 21 dias).

**Condições de uso:** os dois conjuntos são dados abertos de órgãos federais, e a regra que encontramos é **citar a fonte**: a ANP publica a pesquisa como dado aberto (Decreto nº 8.777/2016) e o IBGE pede a citação do IBGE como fonte. A tela Postos cita as duas fontes, com o link da página da ANP. Não encontramos o texto de uma licença formal para a planilha semanal da ANP nem para o CNEFE.

**No aparelho:** a localização é pedida uma vez, ao tocar em “Buscar postos”, e fica só na memória. As distâncias são em linha reta, calculadas no próprio celular, que baixa só os arquivos das cidades próximas. O custo do deslocamento usa a distância × 1,3 (caminho de carro), ida e volta, com o consumo do carro.

Para gerar os dados no computador (baixa a planilha da ANP e os arquivos do IBGE das cidades escolhidas):

```bash
pip install openpyxl==3.1.5
```

```bash
python3 scripts/postos/gerar_postos.py --saida postos --cnefe .cnefe --municipios "CAMPINAS/SP"
```
