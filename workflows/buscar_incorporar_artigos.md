# Workflow: Buscar e Indexar Artigos via PubMed

## Objetivo
Pesquisar artigos no PubMed, restrito a PRS e ASJ (fase atual), e adicioná-los ao índice da biblioteca.

> **Este workflow é de descoberta.** O PubMed fornece apenas metadados (título, autores, DOI, abstract). O acesso ao conteúdo completo requer VPN UNICAMP + download do PDF direto do journal.

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
- `02-Artigos-Periodicos/indice-artigos.csv` atualizado com metadados (apenas PRS/ASJ)
- `.tmp/*.json` descartável após confirmação

## Próximos Passos
Artigos indexados aqui são **candidatos** para incorporação. Para incorporá-los:
1. Dr. Arthur baixa os PDFs relevantes via VPN → `02-Artigos-Periodicos/PRS/` ou `ASJ/`
2. Seguir `workflows/atualizar_documento_estudo.md` ou `workflows/varredura_artigos.md`

## Edge Cases
- **Query retorna artigos de outros journals:** o script não filtra por journal — revisar o JSON antes de indexar
- **Sem resultados:** ampliar `--years` ou usar termo MeSH alternativo
- **Rate limit NCBI:** aguardar 30 segundos; com API key, limite é 10 req/s
