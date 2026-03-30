# Workflow: Atualizar Documento de Estudo

## Objetivo
Incorporar informações de artigos científicos indexados a um documento de estudo (.docx) existente em `01-Documentos-Estudo/`, e registrar essa incorporação no índice.

## Inputs Necessários
- `documento`: Nome do arquivo .docx de destino (ex: `11-1-Abdominoplastia.docx`)
- `area_tematica`: Área correspondente no índice de artigos (ex: `Abdominoplastia`)
- Artigos já indexados em `02-Artigos-Periodicos/indice-artigos.csv` com `incorporado_em_documento` vazio

## Ferramentas
- `tools/mark_article_incorporated.py` — marca artigos como incorporados no índice

## Passo a Passo

### 1. Identificar artigos pendentes de incorporação
Abrir `02-Artigos-Periodicos/indice-artigos.csv` e filtrar por:
- `area_tematica` = área desejada
- `incorporado_em_documento` = (vazio)

Esses são os artigos que ainda precisam ser incorporados ao documento.

### 2. Ler os artigos e atualizar o documento
Para cada artigo pendente:
1. Acessar o conteúdo via DOI (abrir no navegador: `https://doi.org/<doi>`)
2. Extrair as informações relevantes: resultados principais, metodologia, conclusões
3. Adicionar ao documento .docx correspondente em `01-Documentos-Estudo/`
4. Seguir a estrutura já existente no documento (seções, formatação)

### 3. Marcar artigos como incorporados
Após atualizar o documento, registrar no índice:

```bash
# Por DOI (um artigo por vez):
python tools/mark_article_incorporated.py \
    --doi "<doi_do_artigo>" \
    --documento "<nome_do_documento.docx>"

# Em lote (todos da área ainda não incorporados):
python tools/mark_article_incorporated.py \
    --area "<area_tematica>" \
    --documento "<nome_do_documento.docx>" \
    --todos
```

**Saída esperada:** Confirmação de quantos artigos foram marcados

### 4. Verificar consistência
Confirmar no CSV que:
- `incorporado_em_documento` foi preenchido corretamente
- `data_incorporacao` registrou a data de hoje

## Saída Esperada
- Documento .docx atualizado com novos conteúdos
- `02-Artigos-Periodicos/indice-artigos.csv` com campos `incorporado_em_documento` e `data_incorporacao` preenchidos

## Edge Cases
- **Artigo sem acesso livre:** registrar o DOI e anotar nas notas do índice que requer acesso institucional
- **Informação conflitante entre artigos:** documentar ambas as perspectivas com referências
- **Documento não encontrado:** verificar se o nome do arquivo está correto; usar o nome exato como aparece em `01-Documentos-Estudo/`

## Documentos Existentes e Suas Áreas
| Documento | Área Temática no Índice |
|---|---|
| `11-1-Abdominoplastia.docx` | Abdominoplastia |
| `11-2-Lipoaspiracao.docx` | Lipoaspiração |
| `11-3-Contorno-Corporal-Pos-Bariatrico.docx` | Contorno Corporal Pós-Bariátrico |
| `11-4-Gluteoplastia.docx` | Gluteoplastia |
