#!/usr/bin/env python3
"""
Decide quais dados de postos vão para a publicação.

  1. Se os dados recém-gerados (--novo) passarem na conferência, são eles que vão.
  2. Senão (ANP ou IBGE fora do ar, planilha mudou, dados incompletos...), usa os ÚLTIMOS DADOS
     VÁLIDOS, que estão no próprio site publicado (--site). Eles mantêm a data da última
     atualização bem-sucedida; o app mostra essa data e avisa quando os preços estão antigos.
  3. Se não houver nem dados novos válidos nem dados anteriores, termina com erro: o workflow
     então NÃO publica (não vai para o ar uma versão sem dados válidos).

Uso: python3 preparar_publicacao.py --novo novo-postos --saida postos-publicar --site https://controlecarro.web.app
"""
import argparse, datetime, json, os, shutil, sys, urllib.request

MINIMO_POSTOS = 1000          # a ANP pesquisa uns 4.500 postos por semana
MINIMO_MUNICIPIOS = 100       # e uns 400 municípios
MINIMO_LOCALIZADOS = 0.40     # pelo menos 40% dos postos com localização pelo endereço
MINIMO_EM_RELACAO_AO_ANTERIOR = 0.70


def agora():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')


def baixar_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'controle-de-bordo (publicacao)', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode('utf-8'))


def arquivos_do_indice(ind):
    return ['indice.json'] + ['municipios/%s.json' % m['c'] for m in ind.get('municipios', [])] + \
           ['cep/%s.json' % c for c in ind.get('ceps', [])]


def conferir(ind, ler, anterior=None):
    """Devolve None se estiver tudo certo, ou o motivo do problema."""
    if not isinstance(ind, dict):
        return 'índice ausente ou ilegível'
    per = ind.get('periodo') or {}
    if not per.get('inicio') or not per.get('fim'):
        return 'sem a semana pesquisada'
    hoje = datetime.date.today().isoformat()
    if per['fim'] > hoje:
        return 'semana pesquisada no futuro (%s)' % per['fim']
    est = ind.get('estatisticas') or {}
    postos, munis = est.get('postos', 0), len(ind.get('municipios', []))
    if postos < MINIMO_POSTOS:
        return 'poucos postos (%d)' % postos
    if munis < MINIMO_MUNICIPIOS:
        return 'poucos municípios (%d)' % munis
    if est.get('localizados', 0) < MINIMO_LOCALIZADOS * postos:
        return 'poucos postos localizados (%d de %d): o IBGE pode ter falhado' % (est.get('localizados', 0), postos)
    if anterior:
        pa = (anterior.get('periodo') or {}).get('fim')
        if pa and per['fim'] < pa:
            return 'semana pesquisada (%s) mais antiga que a já publicada (%s)' % (per['fim'], pa)
        qa = (anterior.get('estatisticas') or {}).get('postos', 0)
        if qa and postos < MINIMO_EM_RELACAO_AO_ANTERIOR * qa:
            return 'muito menos postos que na publicação anterior (%d contra %d)' % (postos, qa)
    for caminho in arquivos_do_indice(ind)[1:]:
        try:
            d = ler(caminho)
        except Exception as e:
            return 'arquivo %s ausente ou ilegível (%s)' % (caminho, type(e).__name__)
        if caminho.startswith('municipios/') and not isinstance(d.get('postos'), list):
            return 'arquivo %s sem postos' % caminho
    return None


def gravar(destino, caminho, dados):
    os.makedirs(os.path.dirname(os.path.join(destino, caminho)), exist_ok=True)
    with open(os.path.join(destino, caminho), 'w') as f:
        json.dump(dados, f, ensure_ascii=False, separators=(',', ':'))


def resumo(texto):
    print(texto)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as f:
            f.write(texto + '\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--novo', required=True)
    ap.add_argument('--saida', required=True)
    ap.add_argument('--site', required=True)
    a = ap.parse_args()
    base = a.site.rstrip('/') + '/postos/'

    anterior = None
    try:
        anterior = baixar_json(base + 'indice.json')
    except Exception as e:
        print('Sem dados anteriores no site (%s).' % e)

    ind_novo, motivo = None, None
    caminho_novo = os.path.join(a.novo, 'indice.json')
    if os.path.exists(caminho_novo):
        try:
            ind_novo = json.load(open(caminho_novo))
        except Exception:
            ind_novo = None
        ler_novo = lambda c: json.load(open(os.path.join(a.novo, c)))
        motivo = conferir(ind_novo, ler_novo, anterior)
    else:
        motivo = 'a geração dos dados falhou (ANP ou IBGE indisponível?)'

    if os.path.exists(a.saida):
        shutil.rmtree(a.saida)
    if motivo is None:
        shutil.copytree(a.novo, a.saida)
        ind_novo['atualizacao'] = {'ultimaTentativa': agora(), 'ok': True}
        gravar(a.saida, 'indice.json', ind_novo)
        e = ind_novo['estatisticas']
        resumo('### Dados de postos: atualizados\nSemana %s a %s · %d postos em %d municípios · %d localizados pelo endereço, %d aproximados, %d sem localização.'
               % (ind_novo['periodo']['inicio'], ind_novo['periodo']['fim'], e['postos'], len(ind_novo['municipios']),
                  e['localizados'], e['aproximados'], e['semLocalizacao']))
        return 0

    resumo('### Dados de postos: os novos NÃO foram usados\nMotivo: ' + motivo)
    if not anterior:
        resumo('Não há dados anteriores válidos no site. **A publicação foi interrompida** para não ir ao ar sem dados válidos.')
        return 1
    cache = {}
    def ler_site(c):
        if c not in cache:
            cache[c] = baixar_json(base + c)
        return cache[c]
    problema = conferir(anterior, ler_site)
    if problema:
        resumo('Os dados anteriores do site também não passaram na conferência (%s). **A publicação foi interrompida.**' % problema)
        return 1
    for c in arquivos_do_indice(anterior)[1:]:
        gravar(a.saida, c, ler_site(c))
    anterior['atualizacao'] = {'ultimaTentativa': agora(), 'ok': False, 'motivo': motivo}
    gravar(a.saida, 'indice.json', anterior)
    resumo('Mantidos os últimos dados válidos: semana %s a %s, preparados em %s. O app avisa a data e se os preços estão antigos.'
           % (anterior['periodo']['inicio'], anterior['periodo']['fim'], anterior.get('geradoEm', '?')))
    return 0


if __name__ == '__main__':
    sys.exit(main())
