# 🚗 Controle do Carro

Aplicativo simples, em português, para anotar **abastecimentos** e **manutenções** de até **dois carros** e acompanhar quilometragem, consumo, gastos e lembretes (troca de óleo, pneus etc.).

Feito para ser usado no celular, com botões grandes, letras legíveis e poucos campos.

---

## Tecnologia e onde os dados ficam

- É uma **página web comum** (HTML, CSS e JavaScript puro). Não precisa instalar nada, não tem servidor, não tem cadastro nem senha e não usa bibliotecas externas.
- Os dados ficam salvos **somente no navegador do aparelho** onde o app é usado (`localStorage`). Nada vai para a internet.
- **Consequências importantes:**
  - Se o pai usa no celular dele e a mãe no dela, **cada celular terá seus próprios dados** — eles não se sincronizam. O ideal é escolher **um celular** para fazer as anotações.
  - Se o celular for trocado, formatado, ou se os “dados de navegação/sites” forem apagados, os registros se perdem.
  - Por isso existe a **cópia de segurança** (veja abaixo).

## Como iniciar

### Opção 1 — Publicar no GitHub Pages (recomendado para usar no celular)

1. No GitHub, abra o repositório → **Settings** → **Pages**.
2. Em *Source*, escolha **Deploy from a branch**, selecione o branch com estes arquivos e a pasta **/ (root)**. Salve.
3. Depois de 1–2 minutos aparecerá o endereço (algo como `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`).
4. Abra esse endereço **no celular dos seus pais**, no Chrome (Android) ou Safari (iPhone).
5. Adicione à tela inicial para abrir como um aplicativo:
   - **Android/Chrome:** menu ⋮ → **Adicionar à tela inicial** (ou “Instalar app”).
   - **iPhone/Safari:** botão Compartilhar → **Adicionar à Tela de Início**.

Assim o app ganha um ícone, abre em tela cheia e **funciona mesmo sem internet**. Os dados continuam somente no celular — o GitHub só entrega os arquivos do app, nunca recebe os registros.

### Opção 2 — Testar no computador

Basta abrir o arquivo `index.html` no navegador (dois cliques). Tudo funciona, só não fica disponível sem internet como app instalado.

Se preferir um servidor local:

```bash
python3 -m http.server 8000
```

e abra `http://localhost:8000`.

## Como usar (resumo para os pais)

1. **Primeira vez:** escreva o nome dos carros (ex.: “Carro do Pai”, “Carro da Mãe”) e toque em **Começar**. Se tiver só um carro, apague o nome do segundo.
2. **Escolha o carro** ao abrir o app. O topo da tela fica sempre com a **cor e o nome do carro escolhido** — confira antes de salvar.
3. **Registre a última troca de óleo** (botão *Registrar manutenção*) para que os avisos comecem a funcionar.
4. **Toda vez que abastecer:** *Registrar abastecimento* → quilometragem do painel, litros e valor pago (estão na nota) → *Salvar*. O app mostra na hora o preço por litro, quanto o carro andou, o consumo e o custo por km.
5. **Início** mostra: quilometragem atual, consumo recente, gasto do mês, último abastecimento e a próxima manutenção, com avisos em amarelo (chegando) ou vermelho (atrasada).
6. **Histórico:** lista do mais recente para o mais antigo, com filtros de período, e botões para **Corrigir** ou **Apagar** (sempre pede confirmação).
7. **Relatórios:** gasto com combustível por mês e consumo médio mês a mês, com frases explicando (“melhor mês”, “pior mês”).
8. **Ajustes:** dados dos carros, intervalo da troca de óleo, cópia de segurança, planilha e ajuda.

## Cópia de segurança e exportação

Em **Ajustes → Cópia de segurança**:

- **Salvar cópia de segurança:** gera um arquivo `.json` com todos os dados. No celular, abre a tela de compartilhar — dá para mandar para si mesmo no **WhatsApp**, **e-mail** ou salvar no **Google Drive**.
- **Restaurar uma cópia:** escolhe esse arquivo e traz os dados de volta (substitui os dados atuais do aparelho, com confirmação). Serve também para **passar os dados de um celular para outro**.
- **Exportar planilha (Excel):** gera um `.csv` (separado por ponto e vírgula, com vírgula decimal) que abre no Excel ou no Google Planilhas. Serve para consulta; para guardar os dados use a cópia de segurança.

O próprio app lembra de fazer a cópia depois de 10 registros novos ou 30 dias sem cópia.

## Dados de demonstração

Na tela inicial há o botão **Ver demonstração**, que carrega dois carros inventados — “Carro 1 (exemplo)” e “Carro 2 (exemplo)” — com 8 meses de abastecimentos e algumas manutenções (um com troca de óleo chegando, outro com troca atrasada). Enquanto a demonstração estiver ativa, uma **faixa amarela “DEMONSTRAÇÃO”** aparece em todas as telas, com o botão **Apagar e começar**. O app comum começa **sem nenhum dado**.

---

## Como os cálculos são feitos

Todas as fórmulas estão em `js/calculos.js` e são verificadas pelos testes em `testes/calculos.test.js`.

| Cálculo | Fórmula |
|---|---|
| Preço por litro | `valor pago ÷ litros` |
| Km rodados desde o anterior | `km deste abastecimento − km do abastecimento anterior` |
| Variação do preço | `preço/litro atual − preço/litro anterior` (em R$ e em %: `diferença ÷ preço anterior × 100`) |
| Consumo (km/L) | `km entre dois tanques cheios ÷ litros colocados depois do tanque cheio anterior (incluindo o atual)` |
| Custo por km | `soma dos valores pagos nesse trecho ÷ km do trecho` |
| Consumo recente (Início) | `soma dos km dos 3 últimos trechos ÷ soma dos litros desses trechos` |
| Consumo do mês (Relatórios) | `soma dos km dos trechos que terminam no mês ÷ soma dos litros desses trechos` |
| Quilometragem atual | maior quilometragem já anotada (abastecimentos ou manutenções) |
| Próxima troca de óleo | `km da última troca + intervalo` (padrão 5.000 km, configurável) e, opcionalmente, `data da última troca + N meses` — vale o que vier primeiro |
| Outros lembretes (pneus etc.) | só existem se a pessoa definir: `km da manutenção + “avisar daqui a X km”` e/ou uma data |

### Consumo e o “tanque cheio”

O consumo usa o **método do tanque cheio**: a distância entre as quilometragens de dois abastecimentos com tanque completo, dividida pelos litros colocados no abastecimento que completa o percurso.

Exemplo: encheu o tanque com 40.000 km; no próximo abastecimento, com 40.420 km, colocou 35 litros para encher de novo → `420 ÷ 35 = 12 km/L`.

Como nem sempre se completa o tanque, o formulário pergunta **“Encheu o tanque até o fim?”** (padrão: *Sim*):

- Se **não** completou, aquele abastecimento não tem consumo próprio. Os litros dele são **somados** ao próximo abastecimento com tanque cheio, e o consumo é calculado para o trecho inteiro.
- O primeiro tanque cheio registrado não tem consumo (falta o ponto de partida).
- **Limitação:** se for marcado “Sim” sem o tanque ter sido realmente completado, o consumo daquele trecho (e do seguinte) sai impreciso. Quando não houver dados suficientes, o app **explica por quê** em vez de mostrar um número.

### Distância percorrida

Se a pessoa não souber a quilometragem total, pode informar só os **km andados desde o último abastecimento** (ex.: marcador parcial do painel). O app calcula `quilometragem = km do abastecimento anterior + distância`. Se as duas forem informadas e não baterem (diferença maior que 2 km), avisa e usa a do painel.

### Validações

Bloqueiam o salvamento (com mensagem simples):

- quilometragem menor que a do abastecimento anterior, ou maior que a de um abastecimento posterior (quando se registra algo antigo);
- litros ou valor iguais a zero ou vazios;
- data no futuro; número que não dá para entender.

Pedem confirmação (“Algo parece diferente… Voltar e corrigir / Está certo, salvar assim”):

- preço por litro abaixo de R$ 2,50 ou acima de R$ 12,00;
- mais de 100 litros;
- consumo calculado abaixo de 3 ou acima de 30 km/L;
- mais de 1.500 km desde o abastecimento anterior, ou quilometragem igual à anterior;
- distância informada que não bate com a quilometragem.

### Avisos de manutenção

- 🟡 **Chegando:** faltam até 500 km ou até 30 dias.
- 🔴 **Atrasada:** passou da quilometragem ou da data. Ex.: “A troca de óleo está atrasada em 200 km”.
- 🟢 **Em dia:** nos demais casos. Ex.: “Faltam 3.200 km para a troca de óleo”.

Pneus **não** têm intervalo fixo: ao registrar a troca, a pessoa escolhe (se quiser) “avisar daqui a X km” e/ou “avisar em tal data”.

### Dois carros

Cada abastecimento e manutenção é gravado com o identificador do carro. Todos os cálculos, históricos, relatórios e lembretes filtram por esse carro — nada é misturado.

---

## Estrutura dos arquivos

```
index.html            página principal
css/estilo.css        aparência (letras grandes, botões grandes)
js/calculos.js        fórmulas, validações e formatação brasileira
js/app.js             telas, armazenamento, cópia de segurança e planilha
js/demo.js            gerador dos dados de demonstração
sw.js                 permite usar sem internet (quando publicado)
manifest.webmanifest  permite “Adicionar à tela inicial”
testes/               testes dos cálculos
```

## Testes

```bash
node testes/calculos.test.js
```

> Ao alterar arquivos depois de publicado, aumente o número em `VERSAO` no `sw.js` para os celulares baixarem a versão nova.
