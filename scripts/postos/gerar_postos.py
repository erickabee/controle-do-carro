#!/usr/bin/env python3
"""
Prepara os dados da tela "Postos" a partir de fontes oficiais, sem serviços pagos nem chaves:

  1. ANP — Levantamento de Preços de Combustíveis, planilha semanal "Preços por posto revendedor"
     https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas
     (a pesquisa é semanal e por amostragem: nem todos os postos nem todas as cidades entram)
  2. IBGE — CNEFE 2022 (Cadastro Nacional de Endereços para Fins Estatísticos), com latitude e
     longitude de cada endereço, um arquivo por município:
     https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/

A planilha da ANP não traz coordenadas. Cada posto é localizado pelo endereço, nesta ordem:
  - "endereco": mesmo CEP e mesmo número no CNEFE;
  - "rua":      mesma rua no município, com o número mais próximo (até 100 números de diferença);
  - "cep":      centro do CEP, só quando o CEP é pequeno (endereços a até 1,5 km do centro);
  - sem localização: o posto aparece com o preço, mas sem distância (nada é inventado).

Saída (arquivos estáticos publicados junto com o site, em postos/):
  indice.json                  fonte, semana pesquisada, municípios (centro e arquivo)
  municipios/<código>.json     postos do município com preços e localização
  cep/<3 primeiros dígitos>.json  centro de cada CEP das cidades pesquisadas (para buscar por CEP)

Uso:
  python3 scripts/postos/gerar_postos.py --saida _site/postos [--revendas arquivo.xlsx]
         [--cnefe pasta-de-cache] [--cache coordenadas.json] [--municipios "CAMPINAS/SP" ...]
"""
import argparse, csv, io, json, os, re, statistics, sys, time, unicodedata, urllib.parse, urllib.request, zipfile, datetime, math

PAGINA_ANP = ('https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/'
              'levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas')
CNEFE = ('https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/'
         'Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/')
UFS = {'RONDONIA': ('11', 'RO'), 'ACRE': ('12', 'AC'), 'AMAZONAS': ('13', 'AM'), 'RORAIMA': ('14', 'RR'),
       'PARA': ('15', 'PA'), 'AMAPA': ('16', 'AP'), 'TOCANTINS': ('17', 'TO'), 'MARANHAO': ('21', 'MA'),
       'PIAUI': ('22', 'PI'), 'CEARA': ('23', 'CE'), 'RIO GRANDE DO NORTE': ('24', 'RN'), 'PARAIBA': ('25', 'PB'),
       'PERNAMBUCO': ('26', 'PE'), 'ALAGOAS': ('27', 'AL'), 'SERGIPE': ('28', 'SE'), 'BAHIA': ('29', 'BA'),
       'MINAS GERAIS': ('31', 'MG'), 'ESPIRITO SANTO': ('32', 'ES'), 'RIO DE JANEIRO': ('33', 'RJ'),
       'SAO PAULO': ('35', 'SP'), 'PARANA': ('41', 'PR'), 'SANTA CATARINA': ('42', 'SC'),
       'RIO GRANDE DO SUL': ('43', 'RS'), 'MATO GROSSO DO SUL': ('50', 'MS'), 'MATO GROSSO': ('51', 'MT'),
       'GOIAS': ('52', 'GO'), 'DISTRITO FEDERAL': ('53', 'DF')}
PRODUTOS = {'GASOLINA COMUM': 'GC', 'GASOLINA ADITIVADA': 'GA', 'ETANOL': 'ET',
            'DIESEL S10': 'S10', 'DIESEL S500': 'S500', 'GNV': 'GNV'}   # GLP (botijão) fica de fora
TIPOS_VIA = {'RUA', 'R', 'AVENIDA', 'AV', 'RODOVIA', 'ROD', 'ESTRADA', 'EST', 'PRACA', 'TRAVESSA', 'ALAMEDA',
             'VIA', 'ACESSO', 'MARGINAL', 'LARGO', 'VIADUTO', 'PARQUE', 'BR', 'KM'}
AGENTE = {'User-Agent': 'controle-de-bordo (dados abertos ANP/IBGE)'}
# Nomes que a ANP e o IBGE escrevem de jeitos diferentes (ANP -> IBGE)
APELIDOS = {('MOGI MIRIM', 'SP'): 'MOJI MIRIM', ('EMBU DAS ARTES', 'SP'): 'EMBU',
            ('SANTA ISABEL DO PARA', 'PA'): 'SANTA IZABEL DO PARA', ('ITAPAGE', 'CE'): 'ITAPAJE',
            ('SAO LUIZ DO PARAITINGA', 'SP'): 'SAO LUIS DO PARAITINGA', ('PARATI', 'RJ'): 'PARATY',
            ('BALNEARIO DE PICARRAS', 'SC'): 'BALNEARIO PICARRAS', ('ASSU', 'RN'): 'ACU'}


def norm(t):
    t = unicodedata.normalize('NFD', str(t if t is not None else '')).encode('ascii', 'ignore').decode().upper()
    return ' '.join(re.sub(r'[^A-Z0-9 ]', ' ', t).split())


def baixar(url, destino=None, tentativas=3):
    for t in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=AGENTE), timeout=600) as r:
                dados = r.read()
            break
        except Exception:
            if t == tentativas - 1:
                raise
            time.sleep(5 * (t + 1))
    if destino:
        with open(destino + '.parcial', 'wb') as f:
            f.write(dados)
        os.replace(destino + '.parcial', destino)   # nunca deixa um arquivo pela metade
    return dados


def link_planilha_mais_recente():
    """A ANP lista as planilhas semanais numa página oficial; os nomes não seguem um padrão fixo
    (às vezes com '_' e às vezes com '-'), então o link do arquivo é lido dessa página."""
    html = baixar(PAGINA_ANP).decode('utf-8', 'replace')
    links = re.findall(r'href="([^"]*/revendas_lpc_[^"]*\.xlsx)"', html)
    if not links:
        sys.exit('Não encontrei a planilha "revendas_lpc" na página da ANP.')
    return links[0]   # a página lista da semana mais recente para a mais antiga


def ler_planilha(caminho):
    import openpyxl
    ws = openpyxl.load_workbook(caminho, read_only=True).worksheets[0]
    linhas = list(ws.iter_rows(values_only=True))
    periodo = None
    for l in linhas[:12]:
        m = re.search(r'(\d\d/\d\d/\d{4})\s*A\s*(\d\d/\d\d/\d{4})', str(l[0] or ''))
        if m:
            periodo = [datetime.datetime.strptime(x, '%d/%m/%Y').date().isoformat() for x in m.groups()]
    cab = next(i for i, l in enumerate(linhas) if l and l[0] == 'CNPJ')
    col = {c: i for i, c in enumerate(linhas[cab])}
    for obrig in ('CNPJ', 'RAZÃO', 'FANTASIA', 'ENDEREÇO', 'NÚMERO', 'BAIRRO', 'CEP', 'MUNICÍPIO', 'ESTADO',
                  'BANDEIRA', 'PRODUTO', 'UNIDADE DE MEDIDA', 'PREÇO DE REVENDA', 'DATA DA COLETA'):
        if obrig not in col:
            sys.exit('A planilha da ANP mudou de formato: falta a coluna ' + obrig)
    postos = {}
    for l in linhas[cab + 1:]:
        if not l or not l[col['CNPJ']]:
            continue
        prod = PRODUTOS.get(norm(l[col['PRODUTO']]))
        preco = l[col['PREÇO DE REVENDA']]
        if not prod or not isinstance(preco, (int, float)) or preco <= 0:
            continue
        uf = UFS.get(norm(l[col['ESTADO']]))
        if not uf:
            continue
        cnpj = str(l[col['CNPJ']]).zfill(14)
        data = l[col['DATA DA COLETA']]
        data = data.date().isoformat() if hasattr(data, 'date') else str(data)[:10]
        p = postos.setdefault(cnpj, {
            'id': cnpj,
            'n': (str(l[col['FANTASIA']] or '').strip() or str(l[col['RAZÃO']] or '').strip()).title(),
            'b': None if norm(l[col['BANDEIRA']]) in ('', 'BRANCA') else str(l[col['BANDEIRA']]).strip().title(),
            'rua': str(l[col['ENDEREÇO']] or '').strip(), 'num': str(l[col['NÚMERO']] or '').strip(),
            'bairro': str(l[col['BAIRRO']] or '').strip(),
            'cep': str(l[col['CEP']] or '').zfill(8), 'm': norm(l[col['MUNICÍPIO']]), 'uf': uf[1], 'cuf': uf[0],
            'p': {}})
        antigo = p['p'].get(prod)
        if not antigo or data > antigo[1]:
            p['p'][prod] = [round(float(preco), 3), data]
    return periodo, postos


def arquivos_cnefe_da_uf(cuf, sigla, cache_listas):
    chave = cuf + '_' + sigla
    if chave not in cache_listas:
        html = baixar(CNEFE + chave + '/').decode('latin-1')
        # os nomes vêm codificados (ex.: HORTOL%c3%82NDIA) e com hífen (MOJI-MIRIM)
        cache_listas[chave] = {norm(re.sub(r'^\d+_', '', urllib.parse.unquote(n)[:-4]).replace('_', ' ').replace('-', ' ')): n
                               for n in re.findall(r'href="(\d{7}_[^"]+\.zip)"', html)}
    return cache_listas[chave]


def indice_cnefe(zip_caminho):
    por_cep, por_cep_num, por_rua = {}, {}, {}
    z = zipfile.ZipFile(zip_caminho)
    with io.TextIOWrapper(z.open(z.namelist()[0]), encoding='latin-1') as f:
        rd = csv.reader(f, delimiter=';')
        c = {k: i for i, k in enumerate(next(rd))}
        for l in rd:
            try:
                la, lo = float(l[c['LATITUDE']]), float(l[c['LONGITUDE']])
            except ValueError:
                continue
            cep, num = l[c['CEP']], l[c['NUM_ENDERECO']]
            s = por_cep.setdefault(cep, [0.0, 0.0, 0, []])
            s[0] += la; s[1] += lo; s[2] += 1
            if len(s[3]) < 400:
                s[3].append((la, lo))
            por_cep_num.setdefault((cep, num), (la, lo))
            if num.isdigit():
                rua = ' '.join(w for w in norm(l[c['NOM_TITULO_SEGLOGR']] + ' ' + l[c['NOM_SEGLOGR']]).split() if w not in TIPOS_VIA)
                por_rua.setdefault(rua, []).append((int(num), la, lo, cep))
    centros = {}
    for cep, (sla, slo, n, amostra) in por_cep.items():
        la, lo = sla / n, slo / n
        raio = max((distancia_km(la, lo, a, b) for a, b in amostra), default=0)
        centros[cep] = (round(la, 5), round(lo, 5), raio)
    return centros, por_cep_num, por_rua


def distancia_km(la1, lo1, la2, lo2):
    r = 6371.0
    f1, f2 = math.radians(la1), math.radians(la2)
    a = math.sin((f2 - f1) / 2) ** 2 + math.cos(f1) * math.cos(f2) * math.sin(math.radians(lo2 - lo1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def localizar(p, centros, por_cep_num, por_rua):
    num = re.sub(r'\D', '', p['num'])
    if (p['cep'], num) in por_cep_num and num:
        la, lo = por_cep_num[(p['cep'], num)]
        return la, lo, 'endereco'
    rua = ' '.join(w for w in norm(p['rua']).split() if w not in TIPOS_VIA)
    if num and rua in por_rua:
        cands = por_rua[rua]
        mesmo_cep = [x for x in cands if x[3][:5] == p['cep'][:5]] or cands
        n, la, lo, _ = min(mesmo_cep, key=lambda x: abs(x[0] - int(num)))
        if abs(n - int(num)) <= 100:
            return la, lo, 'rua'
    if p['cep'] in centros and centros[p['cep']][2] <= 1.5:
        la, lo, _ = centros[p['cep']]
        return la, lo, 'cep'
    return None, None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--saida', required=True)
    ap.add_argument('--revendas', help='planilha já baixada (senão, baixa a mais recente da ANP)')
    ap.add_argument('--cnefe', default='.cnefe', help='pasta onde guardar os arquivos do CNEFE (cache)')
    ap.add_argument('--cache', help='arquivo JSON com coordenadas já calculadas (por CNPJ e endereço)')
    ap.add_argument('--municipios', nargs='*', help='limitar a alguns municípios, ex.: "CAMPINAS/SP"')
    a = ap.parse_args()

    os.makedirs(a.cnefe, exist_ok=True)
    fonte_arquivo = a.revendas
    if not a.revendas:
        url = link_planilha_mais_recente()
        a.revendas = os.path.join(a.cnefe, 'revendas.xlsx')
        print('Baixando', url)
        baixar(url, a.revendas)
        fonte_arquivo = url
    periodo, postos = ler_planilha(a.revendas)
    if a.municipios:
        quero = {norm(x.split('/')[0]) + '/' + x.split('/')[1].upper() for x in a.municipios}
        postos = {k: p for k, p in postos.items() if p['m'] + '/' + p['uf'] in quero}
    print(len(postos), 'postos na semana', periodo)

    cache = json.load(open(a.cache)) if a.cache and os.path.exists(a.cache) else {}
    por_municipio = {}
    for p in postos.values():
        por_municipio.setdefault((p['cuf'], p['uf'], p['m']), []).append(p)

    listas, municipios, ceps = {}, [], {}
    falhas_ibge, sem_arquivo = [], []
    os.makedirs(os.path.join(a.saida, 'municipios'), exist_ok=True)
    os.makedirs(os.path.join(a.saida, 'cep'), exist_ok=True)
    os.makedirs(os.path.join(a.cnefe, 'zips'), exist_ok=True)
    os.makedirs(os.path.join(a.cnefe, 'centros'), exist_ok=True)
    contagem = {'endereco': 0, 'rua': 0, 'cep': 0, None: 0}
    chave_end = lambda p: norm(p['rua'] + ' ' + p['num'] + ' ' + p['cep'])
    for (cuf, uf, nome), lista in sorted(por_municipio.items()):
        try:
            arquivos = arquivos_cnefe_da_uf(cuf, uf, listas)
        except Exception as e:
            arquivos = {}; falhas_ibge.append(nome + '/' + uf + ' (lista: ' + type(e).__name__ + ')')
        arq = arquivos.get(APELIDOS.get((nome, uf), nome))
        if not arq and arquivos:
            sem_arquivo.append(nome + '/' + uf)
        codigo = arq[:7] if arq else 'x' + cuf + norm(nome).replace(' ', '')[:20]
        falta = [p for p in lista if not (p['id'] in cache and cache[p['id']].get('k') == chave_end(p))]
        arq_centros = os.path.join(a.cnefe, 'centros', codigo + '.json')
        centros = json.load(open(arq_centros)) if os.path.exists(arq_centros) else None
        if arq and (falta or centros is None):
            # O CNEFE (2022) não muda: só é lido quando há posto novo ou endereço mudou.
            try:
                zp = os.path.join(a.cnefe, 'zips', arq)
                if not os.path.exists(zp):
                    baixar(CNEFE + cuf + '_' + uf + '/' + arq, zp)
                centros, por_cep_num, por_rua = indice_cnefe(zp)
                for p in falta:
                    la, lo, pr = localizar(p, centros, por_cep_num, por_rua)
                    cache[p['id']] = {'k': chave_end(p), 'la': la, 'lo': lo, 'pr': pr}
                with open(arq_centros, 'w') as f:
                    json.dump(centros, f, separators=(',', ':'))
                del por_cep_num, por_rua
            except Exception as e:
                falhas_ibge.append(nome + '/' + uf + ' (' + type(e).__name__ + ')')
        for cep, v in (centros or {}).items():
            ceps.setdefault(cep[:3], {})[cep] = [v[0], v[1], codigo]
        saida = []
        for p in sorted(lista, key=lambda x: x['n']):
            c = cache.get(p['id'])
            if not c or c.get('k') != chave_end(p):
                c = {'la': None, 'lo': None, 'pr': None}      # sem localização segura: aparece sem distância
            contagem[c['pr']] += 1
            end = p['rua'].title() + (', ' + p['num'] if p['num'] else '') + (' - ' + p['bairro'].title() if p['bairro'] else '')
            saida.append({'id': p['id'], 'n': p['n'], 'b': p['b'], 'e': end, 'cep': p['cep'],
                          'la': c['la'], 'lo': c['lo'], 'pr': c['pr'], 'p': p['p']})
        pontos = [(x['la'], x['lo']) for x in saida if x['la'] is not None]
        if pontos:
            cla, clo = statistics.mean(x[0] for x in pontos), statistics.mean(x[1] for x in pontos)
        elif centros:
            cla = statistics.mean(v[0] for v in centros.values()); clo = statistics.mean(v[1] for v in centros.values())
        else:
            cla = clo = None
        raio_m = max((distancia_km(cla, clo, x, y) for x, y in pontos), default=0) if cla is not None else 0
        with open(os.path.join(a.saida, 'municipios', codigo + '.json'), 'w') as f:
            json.dump({'m': nome.title(), 'uf': uf, 'postos': saida}, f, ensure_ascii=False, separators=(',', ':'))
        municipios.append({'c': codigo, 'n': nome.title(), 'uf': uf, 'la': cla and round(cla, 5), 'lo': clo and round(clo, 5),
                           'r': round(raio_m, 1), 'q': len(saida)})
    for prefixo, tabela in ceps.items():
        with open(os.path.join(a.saida, 'cep', prefixo + '.json'), 'w') as f:
            json.dump(tabela, f, separators=(',', ':'))
    indice = {
        'fonte': {'nome': 'ANP — Levantamento de Preços de Combustíveis (preços por posto revendedor)',
                  'url': PAGINA_ANP, 'arquivo': fonte_arquivo if str(fonte_arquivo).startswith('http') else None,
                  'localizacao': 'IBGE — CNEFE 2022 (Cadastro Nacional de Endereços para Fins Estatísticos)'},
        'periodo': {'inicio': periodo[0], 'fim': periodo[1]} if periodo else None,
        'geradoEm': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
        'estatisticas': {'postos': sum(contagem.values()), 'municipios': len(municipios),
                         'localizados': contagem['endereco'] + contagem['rua'], 'aproximados': contagem['cep'],
                         'semLocalizacao': contagem[None], 'falhasIbge': falhas_ibge, 'semArquivoIbge': sem_arquivo},
        'ceps': sorted(ceps),
        'municipios': municipios}
    with open(os.path.join(a.saida, 'indice.json'), 'w') as f:
        json.dump(indice, f, ensure_ascii=False, separators=(',', ':'))
    if a.cache:
        with open(a.cache, 'w') as f:
            json.dump(cache, f, separators=(',', ':'))
    total = sum(contagem.values()) or 1
    print('Localização dos postos:', {str(k): f'{v} ({v * 100 // total}%)' for k, v in contagem.items()})
    print('Municípios sem arquivo no IBGE:', sem_arquivo or 'nenhum')
    print('Falhas ao ler o IBGE:', falhas_ibge or 'nenhuma')


if __name__ == '__main__':
    main()
