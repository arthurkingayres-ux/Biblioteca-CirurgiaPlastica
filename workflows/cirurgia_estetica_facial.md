# Workflow: Cirurgia Estética Facial

## Objetivo
Manter os documentos de estudo de cirurgia estética facial atualizados com a literatura mais recente, restrita aos periódicos PRS e ASJ na fase atual.

## Documentos desta Área
| Arquivo | Tema | Versão Atual |
|---|---|---|
| `01-Documentos-Estudo/12-1-Rinoplastia.docx` | Rinoplastia | v1.0 |
| `01-Documentos-Estudo/12-2-Blefaroplastia.docx` | Blefaroplastia | v1.0 |
| `01-Documentos-Estudo/12-3-Ritidoplastia.docx` | Ritidoplastia (Facelift) | v1.0 |
| `01-Documentos-Estudo/12-4-Otoplastia.docx` | Otoplastia | v1.0 |

## Periódicos Ativos (fase atual)
**PRS** — Plastic and Reconstructive Surgery
**ASJ** — Aesthetic Surgery Journal
> Expandir para outros periódicos conforme viabilidade de créditos.

## Queries PubMed (restritas a PRS e ASJ)
```
Rinoplastia:
  "Rhinoplasty"[MeSH] AND "Plastic and Reconstructive Surgery"[Journal]
  "Rhinoplasty"[MeSH] AND "Aesthetic Surgery Journal"[Journal]

Blefaroplastia:
  "Blepharoplasty"[MeSH] AND "Plastic and Reconstructive Surgery"[Journal]
  "Blepharoplasty"[MeSH] AND "Aesthetic Surgery Journal"[Journal]

Ritidoplastia:
  "Rhytidoplasty"[MeSH] AND "Plastic and Reconstructive Surgery"[Journal]
  "Rhytidoplasty"[MeSH] AND "Aesthetic Surgery Journal"[Journal]

Otoplastia:
  otoplasty AND "Plastic and Reconstructive Surgery"[Journal]
  otoplasty AND "Aesthetic Surgery Journal"[Journal]
```

## Pré-requisito
Node.js instalado + dependências:
```bash
cd ~/Documents/Biblioteca-CirurgiaPlastica
npm install
```

## Passo a Passo

### 1. Buscar novos artigos (a cada 4–8 semanas)
```bash
python tools/search_pubmed.py \
  --query '"Rhinoplasty"[MeSH] AND "Plastic and Reconstructive Surgery"[Journal]' \
  --max 10 --years 1 --output .tmp/prs_rinoplastia.json

python tools/search_pubmed.py \
  --query '"Rhinoplasty"[MeSH] AND "Aesthetic Surgery Journal"[Journal]' \
  --max 10 --years 1 --output .tmp/asj_rinoplastia.json
```
*(Repetir para cada tema e journal)*

### 2. Indexar artigos encontrados
```bash
python tools/update_article_index.py --input .tmp/prs_rinoplastia.json --area "Rinoplastia"
python tools/update_article_index.py --input .tmp/asj_rinoplastia.json --area "Rinoplastia"
```

### 3. Revisar artigos não incorporados
Abrir `02-Artigos-Periodicos/indice-artigos.csv`, filtrar por `incorporado_em_documento` vazio. Para cada artigo relevante:
1. Acessar texto completo via VPN UNICAMP + DOI
2. Classificar: complementa (AZUL) ou muda paradigma (VERMELHO)?
3. Extrair: achado principal, metodologia resumida, conclusão prática

### 4. Regenerar o documento .docx atualizado
Editar `tools/create_docx.js`, seção do tema correspondente:
- Adicionar novo `s.blue(...)` ou `s.red(...)` na seção correta
- Adicionar referência em "Atualizações Incorporadas"
- Incrementar versão e histórico no campo `version` e `history`

```bash
node tools/create_docx.js --topic rinoplastia
# ou
npm run criar-rinoplastia
```

### 5. Marcar artigo como incorporado no índice
```bash
python tools/mark_article_incorporated.py \
  --doi "10.1097/PRS.0000000000012301" \
  --documento "12-1-Rinoplastia.docx"
```

### 6. Registrar progresso
```bash
python tools/log_progress.py \
  --tema "Rinoplastia" \
  --atividade "Incorporação de 2 artigos PRS (enxertos)" \
  --duracao 45
```

## Regras de Atualização do Documento (obrigatórias)
- **NUNCA** apagar conteúdo existente no `create_docx.js`
- **SEMPRE** adicionar citação inline no novo conteúdo
- Box **AZUL** → artigo que complementa o conhecimento existente
- Box **VERMELHO** → artigo que muda conduta ou paradigma
- Box **VERDE** → dica prática cirúrgica
- Atualizar flashcards com novos dados numéricos relevantes
- Incrementar versão na capa e registrar no histórico

## Observações sobre VPN
Acesso ao texto completo de PRS e ASJ requer VPN institucional UNICAMP.
Arthur deve ativar o VPN manualmente antes de sessões de varredura.
Há lembrete agendado para **domingo às 9h**.

## Edge Cases
- **Artigo de revisão sistemática ou meta-análise:** alta prioridade; usar box AZUL com dados quantitativos
- **Artigo muda recomendação de técnica:** usar box VERMELHO; descrever a mudança claramente
- **Artigo fora de PRS/ASJ encontrado por engano:** não indexar na fase atual; descartar
- **Artigo de fissura labiopalatal em rinoplastia:** indexar em Rinoplastia; seção 5.1 do documento
