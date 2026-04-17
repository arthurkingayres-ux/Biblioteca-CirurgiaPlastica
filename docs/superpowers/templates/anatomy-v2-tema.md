# Template Canônico — Migração de Anatomia para Schema v2

Este documento é o **prompt operacional** do subagente Haiku que reescreve `anatomia.json` de cada tema no formato v2 durante a Fase 4.

## Contexto passado ao subagente

Você vai receber três artefatos:
1. O arquivo `anatomia.json` legacy do tema a ser migrado
2. Os library entries já criados para o tema (em `content/images/<tema>/img-*.json`)
3. A lista de quais cards legacy devem receber `images[]` referenciando as library entries

Seu trabalho: produzir um **novo `anatomia.json`** contendo todos os cards legacy migrados para schema v2.

## Regras invioláveis

1. **Português brasileiro com acentuação correta** em todos os campos textuais (`one_liner`, `structures[].description`, `clinical_hook`, `how_to_identify`, `aliases`). Exemplos:
   - `fáscia` (não `fascia`)
   - `músculo` (não `musculo`)
   - `dissecação` (não `disseccao`)
   - `perfusão` (não `perfusao`)
   - `estética` (não `estetica`)
   - `técnica` (não `tecnica`)
   - `artéria`, `veia`, `nervo` (nomes anatômicos preservam acento)

2. **Termos técnicos em inglês ou siglas NÃO levam acento português:** Scarpa, Huger, PDSEA, SAT, DAT, Matarasso, Neligan, Grabb, Smith, Colwell, DIEA, SIEA, SMAS, TCA. Mantenha exatamente como no material-fonte.

3. **Preserve o `id` do card legacy.** `lipo-anat-001` continua `lipo-anat-001`. Não renumere.

4. **Mapeamento de campos legacy → v2:**

| Campo legacy | Campo v2 | Regra |
|---|---|---|
| `definition` | `one_liner` | Condensar para ≤160 caracteres |
| `location` | `how_to_identify` OU 1 entry em `structures[]` | Decisão editorial: se a location é uma região espacial numerável na figura, vira structure; caso contrário, integra how_to_identify |
| `relations` | `clinical_hook` OU `structures[].description` | Mesma lógica |
| `surgical_relevance` | `clinical_hook` | Condensar para ≤200 caracteres, preservar vírgulas e acentos |
| `how_to_identify` | `how_to_identify` | Mantém (limpar acentos se necessário) |
| `id` | `id` | Preservado |
| `tags`, `aliases`, `citations`, `updates` | Idem | Mantém |
| `images[{file,caption,credit}]` | `images[{ref}]` via library entry | Apenas nos cards escolhidos |

5. **Para cards SEM anatomia espacial clara** (ex: "PMI", "Zonas de Segurança e Perigo", "Melanócito epidérmico"): use `structures[]` com **uma única entry** representando o conceito principal.

   Exemplo:
   ```json
   "structures": [
     { "label": "PMI", "description": "Ponto mais côncavo da silhueta lateral." }
   ]
   ```

6. **Respeitar limites de caracteres do schema:**
   - `structures[].label`: ≤60 chars
   - `structures[].description`: ≤80 chars
   - `one_liner`: ≤160 chars (recomendado)
   - `clinical_hook`: ≤200 chars (recomendado)

7. **Output:** JSON válido puro. Sem comentários, sem prosa, sem markdown. O arquivo de saída deve ser aceito por `ajv validate` contra `content/cards/schema.json`.

## Estrutura esperada de cada card v2

```json
{
  "id": "<preservado-do-legacy>",
  "type": "anatomy",
  "title": "<título do card>",
  "aliases": ["...", "..."],
  "topic": "<tema>",
  "area": "<area>",
  "one_liner": "Frase-resumo em português com acentos.",
  "structures": [
    { "label": "...", "description": "..." }
  ],
  "clinical_hook": "Por que isto importa cirurgicamente, em português.",
  "how_to_identify": "Como reconhecer a estrutura no campo operatório.",
  "images": [
    { "ref": "img-<slug>-NNN" }
  ],
  "citations": ["Neligan ...", "Grabb ..."],
  "updates": [],
  "tags": ["anatomia", "<tema>", ...]
}
```

Cards que **não** devem receber imagens: `"images": []`.

## Checklist antes de retornar o JSON

- [ ] Todos os `id` legacy preservados
- [ ] Nenhum campo `definition`, `location`, `relations`, `surgical_relevance` restante
- [ ] Textos em português com diacríticos corretos
- [ ] Termos técnicos em inglês sem acento
- [ ] `structures[]` presente em cada card (min 1 entry para cards conceituais)
- [ ] `images` preenchido só nos cards escolhidos
- [ ] JSON sintaticamente válido (array de objetos)
