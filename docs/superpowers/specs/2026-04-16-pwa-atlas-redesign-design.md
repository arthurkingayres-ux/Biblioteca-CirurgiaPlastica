# Redesign PWA Library — Direção "Atlas"

**Data:** 2026-04-16
**Autor:** Dr. Arthur + agente (via superpowers:brainstorming)
**Status:** Design aprovado, aguarda writing-plans

## Contexto

Avaliamos visualmente o PWA [webapp/library/](../../../webapp/library/) em viewport de iPhone 14 Pro (390×844) e diagnosticamos que a execução técnica está sólida (touch targets, stagger, spacing, animações suaves) mas a **identidade visual está em default-mode SaaS**:

- Paleta branco + cinza + laranja `#F97316` idêntica a metade dos produtos Linear-clones
- Ícones em emoji/Unicode (`←`, `✉`, `➸`) com cara amadora
- Cards todos iguais (topic / briefing section / mini card) — hierarquia visual inexistente
- Badges de 5 tipos compartilhando exatamente o mesmo estilo laranja monocromático ([`style.css:387-395`](../../../webapp/library/style.css))
- Empty state do chat replicando ChatGPT genérico
- Zero dark mode — problema real pro Dr. Arthur, que consulta em plantão/madrugada
- Nenhum sinal de identidade médica/editorial

Execução técnica ~8/10; identidade visual ~4/10. O backend de cards/RAG está maduro (8/8 temas complete após PR #6, imagens niveladas após PR #8), então a camada visual é a peça que não acompanhou.

**Decisões do brainstorming (2026-04-16):**
- Ambição: **sistema de design novo** (nem polimento, nem ruptura arquitetural)
- Direção estética: **Atlas** — atlas anatômico encadernado em couro, gabinete de cirurgião do séc XIX em 2026
- Dark mode: **Atlas Noturno dedicado** — mesma família tonal do diurno, pra consulta em plantão
- Fontes: **gratuitas self-hosted** — Fraunces + Instrument Sans + JetBrains Mono (todas OFL 1.1)
- Ícones: **Lucide** (ISC license)
- Escopo de código: **CSS wholesale rewrite + HTML direcionado**

**Resultado visado**: PWA sente como atlas de Vesalius em 2026 — gravidade editorial, legibilidade em qualquer luz, identidade inconfundível de cirurgião erudito.

## Design System — Atlas

### Tokens de cor (light + dark)

| Token | Diurno (Atlas) | Noturno (Atlas Noir) | Uso |
|---|---|---|---|
| `--surface` | `#F4EFE4` | `#1A1713` | canvas da página |
| `--elevated` | `#FEFCF7` | `#22201C` | cards, nav sticky, input bg |
| `--ink` | `#1E1A15` | `#E8DFC8` | texto primário |
| `--ink-muted` | `#6E6457` | `#A89A81` | subtítulos, metadata |
| `--ink-faint` | `#8B7F6B` | `#8B8274` | placeholder, caption |
| `--rule` | `#D4C8B0` | `#2E2821` | bordas, filetes |
| `--rule-strong` | `#B8A98A` | `#3A3329` | bordas em hover/focus |
| `--anatomy-red` | `#7A2E2A` | `#C94E3E` | técnica, warning, acento primário |
| `--dissection-green` | `#2E4A3A` | `#5F8569` | anatomia, update-box |
| `--gold` | `#B8944B` | `#D4A858` | filete dourado, decisão, ornamento |

**Trigger de modo**: `prefers-color-scheme: dark` automático + toggle manual via ícone `moon`/`sun` na navbar, persistido em `localStorage.atlasTheme`. CSS consome via `[data-theme="dark"] { --surface: #1A1713; ... }` aplicado ao `<html>`.

**Eliminado**: laranja `#F97316` em todos os lugares. Verde Rolex `#006039` (atual, escondido em update-box) evolui pra família `dissection-green`.

### Tipografia

**Família**:
- **Fraunces** (Phaedra Charles & Flavio Charles, OFL 1.1) — variable font com eixos `opsz`, `wght`, `SOFT`, `WONK`. Editorial serif de contraste ajustável.
- **Instrument Sans** (mesmo estúdio, OFL 1.1) — variable, humanista, pareada com Fraunces.
- **JetBrains Mono** (OFL 1.1) — variable, tabular nums.

Todas self-hosted em `webapp/library/fonts/` (`.woff2` variable), zero request externo, offline-first preservado.

**Roles tipográficos**:

| Role | Fonte | Size | Weight | Tracking | Uso |
|---|---|---|---|---|---|
| `--role-hero` | Fraunces | 30–34px | 500 | -0.03em, `opsz 144` | nome do procedimento, "Biblioteca" |
| `--role-section` | Fraunces | 20px | 600 | -0.02em | Anatomia Relevante, Técnicas |
| `--role-card` | Fraunces | 16–18px | 600 | -0.015em | Camadas da Parede Abdominal |
| `--role-body` | Instrument Sans | 14–15px | 400 | 0, line-height 1.65 | corpo dos cards |
| `--role-label` | Instrument Sans | 10–11px | 700 | 1.4px, uppercase | DEFINIÇÃO/LOCALIZAÇÃO |
| `--role-meta` | Fraunces italic | 12–13px | 400 | 0.02em | citações (Neligan 5ed · Vol 2) |
| `--role-mono` | JetBrains Mono | 11–13px | 500 | 0.02em, tabular-nums | medidas, contadores |

### Ícones

`webapp/library/icons/lucide.js` exporta objeto `ICONS` com 8 ícones (Lucide 1.5-stroke inline SVG): `arrow-left`, `message-circle`, `search`, `chevron-right`, `chevron-down`, `send`, `moon`, `sun`, `wifi-off`, `book-open`. Helper `icon(name, size=16)` retorna SVG inline. Renderer injeta via `innerHTML` onde necessário. Zero runtime dependency.

Substitui todos os Unicode/emoji atuais (`&#8592;`, `&#9993;`, `&#10148;`).

### Badges tipadas (elimina monocromia laranja)

| Tipo | Diurno | Noturno |
|---|---|---|
| `technique` | fill anatomy-red + texto elevated | fill anatomy-red + texto surface |
| `anatomy` | fill dissection-green + texto elevated | fill dissection-green + texto surface |
| `decision` | fill gold + texto ink | fill gold + texto surface |
| `note` | outline ink-muted | outline ink-muted |
| `flashcard` | outline ink + mono letter-spacing 0.1em | idem |
| `update` | outline dashed dissection-green | idem |

Cada tipo de card (`anatomy`, `technique`, `decision`, `note`, `flashcard`) ganha classe `.badge-${type}` específica em vez da classe única compartilhada atual.

### Hero treatments

**Home** (editorial minimal): título grande `Biblioteca` em Fraunces hero-role + filete dourado 36×1px + subtítulo italic `Cirurgia Plástica · Briefings Pré-Op`. Sem ilustração.

**Briefing** (procedimento aberto): fleuron sutil `· · ·` dourado como abertura editorial, nome do procedimento em Fraunces hero, filete dourado 36×1px, linha meta italic com contador mono `17 fichas · rev 2026-04-13`. Lista de seções com contadores em JetBrains Mono (`03`, `06`, `04`, `31`) substituindo parênteses `(3)`, `(6)`.

**Chat empty state** (reescrita completa — remove pastel squares ChatGPT-like):
- Fleuron `· · ·`
- Hero serif `Consulta aberta.`
- Subtítulo italic `Pergunte sobre anatomia, técnicas ou decisões clínicas — respondo com base no acervo.`
- Label small-caps `Começar por`
- 3 sugestões como índice editorial (`I.` `II.` `III.` em mono) em vez de pill buttons
- Botão send Lucide-SVG

### Motion signature

Uma única assinatura, contida:

- Filete dourado do hero anima `width: 0 → 36px` em 420ms `cubic-bezier(0.2, 0.8, 0.2, 1)` na entrada de cada tela
- `--ease-atlas: cubic-bezier(0.2, 0.8, 0.2, 1)` como curva padrão do sistema
- `cardSlideIn` mantido mas translateY 12→4px, delay stagger 40→30ms
- Nenhuma animação "wow moment" — personalidade vive na tipografia

## Arquivos críticos

**Novos**:
- `webapp/library/fonts/` — 4 arquivos `.woff2` self-hosted (Fraunces variable, Instrument Sans variable, Instrument Sans italic, JetBrains Mono variable)
- `webapp/library/icons/lucide.js` — `ICONS` map + helper `icon(name, size)`
- `webapp/library/theme.js` — theme init + toggle + persist; script inline no `<head>` pra evitar flash

**Reescritos**:
- `webapp/library/style.css` — paleta Atlas, roles tipográficos, tema dark via `[data-theme]`, badges tipadas, hero editorial, motion signature. ~1500 linhas.

**Tocados pontualmente**:
- `webapp/library/index.html` — hero block na home, substituições Unicode→Lucide, `<link>` pra `theme.js`, cache-busting `?v=2026-04-16-atlas`
- `webapp/library/renderer.js` — badges tipadas por classe `.badge-${type}`, chevron Lucide, card figure caption com role-meta
- `webapp/library/preop.js` — hero block do briefing (fleuron + rule + meta mono + contadores mono)
- `webapp/library/chat.js` — empty state reescrito (índice editorial `I./II./III.`)
- `webapp/library/sw.js` — bump `CACHE_NAME` → `briefing-preop-v16`; adicionar `./theme.js`, `./icons/lucide.js`, 4 fontes ao `ASSETS`
- `tools/validate_briefings.mjs` — loop `for theme of ['light','dark']`, smoke test de toggle

## Verificação

### Automatizada
- `node tools/validate_briefings.mjs --theme=light` — todos 8 temas passam
- `node tools/validate_briefings.mjs --theme=dark` — todos 8 temas passam
- Lighthouse PWA audit ≥ 95 (mantém score atual)
- Build size: `webapp/library/` + fonts ≤ 500KB total gzipped

### Manual via Playwright MCP (mobile 390×844)
1. Home → hero `Biblioteca` + filete dourado + lista com badges count mono
2. Tap Abdominoplastia → hero briefing (fleuron + title + rule + meta) + 6 seções com contadores mono
3. Expandir Anatomia → abrir card → hierarquia (card-title Fraunces + body Instrument Sans + labels small-caps + citações italic)
4. Tap ícone moon → transição Noir sem flash branco (script inline)
5. Reload com tema dark persistido → confirma sem flash
6. Tap chat → empty state `Consulta aberta.` + 3 sugestões `I.` `II.` `III.`
7. Desativar Wi-Fi → banner offline com ícone `wifi-off`
8. Repetir 1–7 no diurno

### Regressão
- Imagens em cards anatômicos carregam (`loading="eager"` no validador)
- Accordion mantém state
- Search filter mantém funcionalidade (debounce, highlight)
- Chat API continua network-only

## Fora de escopo (deliberadamente)

- PWA de approval (`webapp/approval/`) — intocado
- Qualquer mudança em `content/cards/**` ou `content/rag/**`
- Novas features (favoritos, histórico, busca avançada)
- Expansão do motor de chat (mesma implementação)
- Rollback/feature flag: substituição direta, git guarda história

## Próximos passos

1. User review desse spec → aprovação
2. Invocar `superpowers:writing-plans` pra converter em implementation plan executável (checkpoints/sprints)
3. Executar via `superpowers:executing-plans` com `superpowers:using-git-worktrees`
4. Code review (`/code-review:code-review`) antes de PR merge
