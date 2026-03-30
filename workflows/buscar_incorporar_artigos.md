# Workflow: Buscar e Incorporar Artigos ao Índice

## Objetivo
Pesquisar artigos no PubMed, restrito a PRS e ASJ (fase atual), e adicioná-los ao índice da biblioteca.

## Periódicos Ativos
- **PRS** — Plastic and Reconstructive Surgery
- **ASJ** — Aesthetic Surgery Journal
> Limitado a 2 periódicos para economia de créditos. Expandir futuramente.

## Inputs Necessários
- `query`: Termos de busca com filtro de journal (ver exemplos abaixo)
- `area_tematica`: Classificação para o índice (ex: "Rinoplastia")
- `max_results`: Número de artigos a buscar (padrão: 10)
- `years` (opcional): Limitar aos últimos N anos

## Queries Recomendadas por Área
```
"Rhinoplasty"[MeSH] AND "Plastic and Reconstructive Surgery"[Journal]
"Rhinoplasty"[MeSH] AND "Aesthetic Surgery Journal"[Journal]
"Blepharoplasty"[MeSH] AND "Plastic and Reconstructive Surgery"[Journal]
"Blepharoplasty"[MeSH] AND "Aesthetic Surgery Journal"[Journal]
"Rhytidoplasty"[MeSH] AND "Plastic and Reconstructive Surgery"[Journal]
"Rhytidoplasty"[MeSH] AND "Aesthetic Surgery Journal"[Journal]
otoplasty AND "Plastic and Reconstructive Surgery"[Journal]
otoplasty AND "Aesthetic Surgery Journal"[Journal]
"Mammaplasty"[MeSH] AND "Plastic and Reconstructive Surgery"[Journal]
"Abdominoplasty"[MeSH] AND "Plastic and Reconstructive Surgery"[Journal]
```

## Ferramentas
- `tools/search_pubmed.py` — busca e salva resultado em `.tmp/`
- `tools/update_article_index.py` — adiciona ao CSV

## Passo a Passo

### 1. Buscar artigos
```bash
python tools/search_pubmed.py \
    --query '"Rhinoplasty"[MeSH] AND "Plastic and Reconstructive Surgery"[Journal]' \
    --max 10 --years 2 \
    --output .tmp/prs_rinoplastia.json
```

### 2. Revisar o JSON antes de indexar
Abrir `.tmp/prs_rinoplastia.json` e verificar:
- O artigo é de PRS ou ASJ? *(confirmar campo `journal`)*
- O tema é relevante?
- O DOI está presente?

### 3. Indexar
```bash
python tools/update_article_index.py \
    --input .tmp/prs_rinoplastia.json \
    --area "Rinoplastia"
```

### 4. Confirmar no CSV
Verificar que `02-Artigos-Periodicos/indice-artigos.csv` foi atualizado.

## Saída Esperada
- `02-Artigos-Periodicos/indice-artigos.csv` atualizado (apenas PRS/ASJ)
- `.tmp/*.json` descartável após confirmação

## Edge Cases
- **Query retorna artigos de outros journals:** o script não filtra por journal — revisar o JSON antes de indexar
- **Sem resultados:** ampliar `--years` ou usar termo MeSH alternativo
- **Rate limit NCBI:** aguardar 30 segundos; com API key, limite é 10 req/s

## Observação VPN
O PubMed não requer VPN. O **texto completo** dos artigos (PDF) requer VPN UNICAMP.
A busca de metadados (etapa deste workflow) pode ser feita sem VPN.
