# Phase 6 — Qualidade Visual Anatomia v2

## Contexto

Phase 4 migrou 65 anatomy cards para o schema v2 nos 7 temas contorno+face. Phase 5 populou `images[]` em 34 cards pendentes. Ao consumir o resultado no PWA (iPhone, 2026-04-18), Dr. Arthur reportou 3 problemas que quebram a utilidade didática do briefing pré-operatório:

1. **Global:** todas as 53 library entries têm `labels: [{num:1,...}, {num:2,...}]` mas nenhuma imagem tem os números desenhados sobre as estruturas. A legenda cita "1, 2, 3, 4, 5" sem nada pra mapear visualmente — o usuário não sabe onde está a estrutura 3 na figura.
2. **Otoplastia:** a foto do card "cartilagem auricular" não representa cartilagem auricular. Provável mismatch conteúdo-visual (`subject` da library entry bate com o card, mas o arquivo `.jpg` aponta para figura errada).
3. **Contorno pós-bariátrico (CPB):** 6 pares de cards (001↔007 até 006↔012) estão marcados como "principal + complementar" e reusam a mesma imagem. Textos são complementares e enriquecem o material, mas a duplicação visual ficou ruim.

Produto: anatomia v2 com qualidade visual equivalente ao padrão editorial `theplasticsfella`. Resolve o principal débito antes da Phase 7 (reconstrução facial por sub-unidade).

## Decisões arquiteturais

| Escolha | Decisão | Racional |
|---|---|---|
| Overlays numéricos | **Runtime CSS** (não pre-bake) | PWA é único consumidor; coords no JSON viram hot-reload; edição barata; zero arquivos binários novos |
| CPB duplicatas | **Merge 12→6** consolidando texto de ambos, 1 imagem por card | Textos são distintos e complementares (rico), mas imagem duplicada ficou ruim |
| Otoplastia | **Auditar só os 2 cards reportados** | Escopo focal; auditoria global fica pra outro momento se surgir mais mismatch |
| Estrutura de PRs | **2 PRs** — 6A (conteúdo) + 6B (infra visual) | Casa natureza das mudanças; overlays operam sobre base estável (pós-6A) |

## PR 6A — Conteúdo (otoplastia + CPB)

### Otoplastia (2 cards)

**Arquivos tocados:**
- `content/cards/estetica-facial/otoplastia/anatomia.json` (2 cards)
- `content/images/otoplastia/img-auricular-landmarks-001.json`
- `content/images/otoplastia/img-auricular-cartilage-001.json`
- `assets/images/otoplastia/*.jpg` (possivelmente 1-2 arquivos substituídos)

**Workflow por card:**
1. Read multimodal no arquivo atual (`oto-anat-pavilhao-anatomia.jpg`, `oto-anat-cartilagem-deformidades.jpg`).
2. Conferir se conteúdo visual representa o `subject` da library entry e os textos das `labels`.
3. Se mismatch: extrair figura correta do Neligan vol 2 (cap. Otoplasty) via `tools/extract_figures.py`. Fallback: `01-Documentos-Estudo/Imagens/otoplastia/` ou Grabb & Smith's 9ed.
4. Substituir `assets/images/otoplastia/<nome>.jpg` (preservando o nome ASCII existente quando possível) e atualizar `file` na library entry se o nome mudar.
5. Reescrever `labels[]` se a figura nova tiver estruturas diferentes — preservando diacríticos portugueses.

**Ids dos cards estáveis** (`oto-anat-001`, `oto-anat-002`) — só muda conteúdo da library entry e/ou arquivo binário.

### CPB merge (12 → 6 cards)

**Arquivo tocado:** `content/cards/contorno-corporal/contorno-pos-bariatrico/anatomia.json`

**Pares a consolidar:**

| Manter | Absorver | Estrutura |
|---|---|---|
| `cpb-anat-001` | `cpb-anat-007` | Parede Abdominal |
| `cpb-anat-002` | `cpb-anat-008` | Monte Púbico |
| `cpb-anat-003` | `cpb-anat-009` | Coxa Medial |
| `cpb-anat-004` | `cpb-anat-010` | Braço |
| `cpb-anat-005` | `cpb-anat-011` | Mama |
| `cpb-anat-006` | `cpb-anat-012` | Face e Pescoço |

**Política de merge por par:**
- `one_liner`: do principal (mais amplo); se o complementar agregar valor, incorporar uma frase no final.
- `structures[]`: união deduplicada (se mesma estrutura aparecer em ambos, manter a descrição mais completa).
- `clinical_hook`: fundir num parágrafo único que preserve ambos os ângulos (principal + ênfase em ramos vasculares / ancoragem / linfático / etc.). Memória `feedback_document_depth` aplica — não descartar conteúdo.
- `how_to_identify`: fundir.
- `images[]`: já é o mesmo ref nos dois; mantém 1.
- Deletar o card complementar (`cpb-anat-007..012`).

**Disciplina:** leitura atenta de cada par **antes** de fundir. Se algum par tiver divergência real de ensino (não só ênfase), a nuance vira seção dentro do `clinical_hook` consolidado.

**Execução:** Opus inline — são só 6 pares de texto rico, não justifica subagente. Se for delegar, prompt explícito preservando diacríticos (risco conhecido — memória `project_debt_abdominoplastia_v2_accents`).

### Validação PR 6A

- `ajv validate --spec=draft2020 --strict=false -s content/cards/schema.json -d 'content/cards/estetica-facial/otoplastia/anatomia.json'`
- `ajv validate ... -d 'content/cards/contorno-corporal/contorno-pos-bariatrico/anatomia.json'`
- `python tools/lint_acronyms.py` — sem warnings nos dois arquivos.
- `python tools/build_image_manifest.py` — manifest regenerado sem erros.
- `node tools/report_pending_images.mjs` — pending não piora (ainda 2 residuais conhecidos).
- `npx node tools/validate_briefings.mjs` — smoke test Playwright viewport mobile nos briefings de otoplastia e CPB, sem 404 no console.
- SW cache: `briefing-preop-v22` → `v23` em `webapp/library/sw.js`.

## PR 6B — Overlays runtime (infra visual)

### Schema update

Adicionar campos opcionais `x` e `y` ao objeto de `labels[]`:

```json
{
  "num": 1,
  "text": "Cartilagem lateral superior — abóbada média...",
  "x": 0.42,
  "y": 0.38
}
```

- Floats 0.0–1.0, normalizados como fração da largura/altura da imagem.
- Opcionais — library entries sem coords continuam válidas; renderer apenas não gera marker.
- Back-compat preservada: AJV não quebra em entries antigas.

### Library entries (~53 arquivos)

**Produção das coords:** subagente Haiku com vision, **1 por tema** (7 subagents em paralelo). Cada subagente recebe:
- Lista dos arquivos de imagem do tema (`content/images/<tema>/img-*.json` + `assets/images/<tema>/*.{jpg,png}`).
- Instrução para abrir cada imagem, localizar visualmente cada estrutura listada em `labels[].text`, retornar JSON com `{image_id, label_num, x, y}` onde x,y são % do centro da estrutura na imagem.
- Prompt explícito com exemplo calibrado + regra de formato.

**Merge no JSON:** pós-processamento lê os JSONs devolvidos pelos 7 subagents e faz Edit em cada library entry para inserir `x`/`y` nos objects de `labels[]`. Script auxiliar `tools/apply_label_coords.py` (novo, pequeno).

### Renderer (`webapp/library/renderer.js`)

**Função `_libraryImages()`** (linhas ~117–139):

- Envolver `<img>` num `<div class="fig-container">` com `position: relative`.
- Para cada label com `x` e `y` presentes, emitir:
  ```html
  <span class="fig-marker" style="left: {x*100}%; top: {y*100}%">{num}</span>
  ```
- Sidebar `<div class="fig-legend">` continua igual — lista numerada textual abaixo da figura.
- Labels sem coords: não geram marker, só aparecem na legenda (fallback).

### CSS (`webapp/library/style.css`)

```css
.fig-container {
  position: relative;
  display: inline-block;
  max-width: 100%;
}
.fig-container img {
  display: block;
  width: 100%;
  height: auto;
}
.fig-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  font-family: var(--font-sans);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}
```

`transform: translate(-50%, -50%)` faz o centro do marker cair exatamente em (x, y).

### Validação PR 6B

- AJV aceita schema atualizado (coords opcionais).
- Playwright `tools/validate_briefings.mjs` com `loading="eager"` + `img.complete`: screenshot mobile viewport de cada um dos 7 temas, conferir que markers aparecem **sobre** as estruturas (não fora da imagem, não agrupados em 0,0).
- Revisão manual das 7 screenshots — marker fora da estrutura → reposicionamento inline.
- Aceitar ~10-20% de correção manual pós-Haiku.
- SW cache: `briefing-preop-v23` → `v24`.

## Arquivos críticos

| Arquivo | PR | Tipo de mudança |
|---|---|---|
| `content/cards/estetica-facial/otoplastia/anatomia.json` | 6A | Eventualmente atualizar labels se figura mudar |
| `content/images/otoplastia/img-*.json` | 6A | `file` e/ou `labels` atualizados |
| `assets/images/otoplastia/*.jpg` | 6A | Eventual substituição do binário |
| `content/cards/contorno-corporal/contorno-pos-bariatrico/anatomia.json` | 6A | 12 cards → 6 cards |
| `content/images/manifest.json` | 6A + 6B | Regenerado |
| `content/cards/_pending_images.md` | 6A | Regenerado |
| `webapp/library/sw.js` | 6A + 6B | Bump v22→v23→v24 |
| `content/images/<tema>/img-*.json` (x53) | 6B | Adicionar `x,y` em cada label |
| `webapp/library/renderer.js` | 6B | Overlay rendering no `_libraryImages()` |
| `webapp/library/style.css` | 6B | `.fig-container` + `.fig-marker` |
| `tools/apply_label_coords.py` (novo) | 6B | Script helper para aplicar coords em batch |

## Ferramentas reutilizadas

- `tools/extract_figures.py` — extração Neligan para eventual substituição em otoplastia
- `tools/audit_images.py` — prevenir duplicatas PNG/JPEG após substituições
- `tools/build_image_manifest.py` — regenerar manifest
- `tools/report_pending_images.mjs` — regenerar pending report
- `tools/lint_acronyms.py` — validar diacríticos e expansão de siglas
- `tools/validate_briefings.mjs` — smoke test Playwright

## Riscos / mitigações

- **Haiku vision erra coords em ~10-20%.** Mitigação: Playwright screenshots são gate obrigatório antes do merge; correção manual inline.
- **Neligan não cobre cartilagem auricular na figura ideal.** Mitigação: fallback Grabb & Smith's 9ed / Kaufman / `01-Documentos-Estudo/Imagens/`. Se nada servir, aceitar figura coerente com `subject` atualizado — nunca manter mismatch.
- **Merge CPB perde nuance clínica.** Mitigação: ler cada par antes de fundir; nuances reais viram seção dentro do `clinical_hook`.
- **Subagente ASCII-ifica diacríticos.** Mitigação: prompt explícito com exemplo `pálpebra`/`sínfise`/`fáscia`; review manual do diff antes do commit.
- **Back-compat renderer.** Mitigação: labels sem `x,y` continuam funcionando (só sidebar). Permite mergear 6B mesmo se algum tema ficar para trás.

## Próximos passos após Phase 6

- Phase 7 — reconstrução facial por sub-unidade (Kaufman + Neligan + complementares), cards v2 (memória `project_phase7_reconstrucao_facial_redefined`).
- Phase 8 — SVG custom para débitos residuais sem figura Neligan (`abdo-anat-005`, `rino-anat-011`).
