# Workflow: Atualizar Documento de Estudo

## Objetivo
Incorporar informações de artigos científicos já disponíveis (PDFs salvos) a um documento de estudo existente em `01-Documentos-Estudo/`.

## Quando usar
Quando já existem PDFs de artigos salvos em `02-Artigos-Periodicos/PRS/` ou `ASJ/` que ainda não foram incorporados ao documento do tema correspondente.

> Para o fluxo completo (busca + download + incorporação), use `workflows/varredura_artigos.md`.

## Inputs Necessários
- `tema`: Nome do tema no sistema (ex: `rinoplastia`, `abdominoplastia`)
- PDFs salvos em `02-Artigos-Periodicos/PRS/` ou `ASJ/`
- Artigos indexados em `02-Artigos-Periodicos/indice-artigos.csv` com `incorporado_em_documento` vazio

## Passo a Passo

### 1. Identificar artigos pendentes
Abrir `02-Artigos-Periodicos/indice-artigos.csv` e filtrar por:
- `area_tematica` = área desejada
- `incorporado_em_documento` = (vazio)

### 2. Localizar os PDFs correspondentes
Para cada artigo pendente, verificar se o PDF existe em:
- `02-Artigos-Periodicos/PRS/<arquivo>.pdf`
- `02-Artigos-Periodicos/ASJ/<arquivo>.pdf`

Se o PDF não estiver salvo, solicitar ao Dr. Arthur que o baixe com VPN ativo.

### 3. Ler e analisar cada PDF
Usar o Read tool para ler o PDF completo. Extrair:
- **Achado principal** e conclusão prática
- **Metodologia** resumida (tipo de estudo, n, follow-up)
- **Dados numéricos** relevantes (medidas, ângulos, taxas, p-values)
- **Classificação:**
  - **AZUL** → complementa conhecimento existente
  - **VERMELHO** → muda conduta ou paradigma
  - **VERDE** → dica prática cirúrgica

> ⚠️ Nunca incorporar baseado apenas no abstract. O PDF completo deve ser lido.

### 4. Incorporar ao documento
```bash
node tools/incorporate_article.js \
  --tema <tema> --color <blue|red|green> \
  --title "Título do box" \
  --lines "Achado 1" "Achado 2" \
  --citation "Autor et al. Journal Ano;Vol:Pág. DOI: 10.xxx" \
  --doi "10.xxx" \
  --after-heading "<Seção mais adequada>" \
  --flashcard "Parâmetro|Valor" \
  --description "Descrição breve"
```

### 5. Verificar resultado
```bash
node tools/validate_content.js --topic <tema>
```

### 6. Marcar artigos como incorporados
O `incorporate_article.js` já tenta marcar automaticamente via `mark_article_incorporated.py`. Se falhar, executar manualmente:

```bash
python tools/mark_article_incorporated.py \
    --doi "<doi>" \
    --documento "<12-X-Tema.docx>"
```

## Saída Esperada
- `content/<tema>.json` atualizado com novos boxes, flashcards, versão incrementada
- `01-Documentos-Estudo/<tema>.docx` regenerado
- `02-Artigos-Periodicos/indice-artigos.csv` com artigos marcados como incorporados

## Documentos Existentes e Suas Áreas
| Documento | Tema (content JSON) | Área no Índice |
|---|---|---|
| `11-1-Abdominoplastia.docx` | `abdominoplastia` | Abdominoplastia |
| `12-1-Rinoplastia.docx` | `rinoplastia` | Rinoplastia |
| `12-2-Blefaroplastia.docx` | `blefaroplastia` | Blefaroplastia |
| `12-3-Ritidoplastia.docx` | `ritidoplastia` | Ritidoplastia |
| `12-4-Otoplastia.docx` | `otoplastia` | Otoplastia |

## Edge Cases
- **PDF não-legível ou protegido:** Informar ao Dr. Arthur; tentar abordagem alternativa.
- **Informação conflitante entre artigos:** Documentar ambas as perspectivas com referências.
- **Artigo não pertence à área:** Verificar se há outro documento mais adequado antes de incorporar.
