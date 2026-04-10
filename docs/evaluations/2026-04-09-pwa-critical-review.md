# Avaliação Crítica do PWA Biblioteca — 09 de abril de 2026

**Autor da avaliação:** Claude (agente do Dr. Arthur)
**Escopo acordado:** UX no iPhone + Qualidade do conteúdo. Temas inspecionados a fundo: **Abdominoplastia, Rinoplastia, Gluteoplastia**.
**Estado do produto avaliado:** commit de merge `7c5e965` — fim da Fase 3 do motor v2. Manifest com 6 temas `complete` (abdominoplastia, contorno-pos-bariatrico, gluteoplastia, blefaroplastia, rinoplastia, ritidoplastia) e 2 `draft` (lipoaspiração, otoplastia).

---

## 1. Resumo Executivo

- **O PWA já é utilizável como briefing pré-op.** Navegação fluida no iPhone, touch targets dentro do mínimo de acessibilidade (≥ 44 px), service worker v10 ativo, busca instantânea, briefing colapsável por seção. A arquitetura está madura. Não há bug bloqueante para consulta pré-cirurgia.
- **A qualidade do conteúdo é desigual entre temas.** Rinoplastia, blefaroplastia e gluteoplastia têm texto limpo em português correto; abdominoplastia, contorno pós-bariátrico e ritidoplastia têm **erros sistemáticos de acentuação** (material de ensino com "nao", "apos", "ate", "classica", "apice" etc.). Isso viola a regra 2 do CLAUDE.md e é o achado de maior peso.
- **Dois temas promovidos a `complete` não têm UMA imagem sequer.** Contorno pós-bariátrico (0 imagens em 27 cards) e gluteoplastia (0 imagens em 24 cards). O manifest marca `complete` mas a densidade visual é nula — o Dr. Arthur expandiu a regra de anatomia privilegiada justamente para termos imagens anotadas nesses temas.
- **A busca da home é acentuação-sensível e não encontra "abdome".** Digitar o radical de um dos temas principais retorna zero resultados. Em contraste, temas novos conseguem ser encontrados pelo nome exato. É um problema sutil de normalização que degrada a descoberta.
- **O manifest está desalinhado com o renderer.** Campos `displayName` existem mas não são lidos — a home imprime o slug em Title Case ("Contorno Pos Bariatrico" sem acento, "Ritidoplastia" sem "(Facelift)"). O trabalho de curar os nomes foi desperdiçado.

**Veredicto:** é seguro continuar usando o PWA no celular. **Não é seguro** promover mais temas a `complete` até que: (a) o pipeline de limpeza de acentuação rode nos 3 temas afetados, (b) os 2 temas sem imagens recebam anatomia ilustrada, e (c) a busca normalize acentos e o renderer passe a ler `displayName`.

---

## 2. Metodologia

### Ambiente
- Servidor HTTP estático local: `python -m http.server 8000` na raiz do projeto
- URL base: `http://localhost:8000/webapp/library/index.html`
- Browser: Playwright Chromium emulando iPhone 14 Pro
  - Viewport lógico: **393×852**
  - `deviceScaleFactor: 3`, `isMobile: true`, `hasTouch: true`
  - User-agent iOS Safari

### Fluxo executado
1. Home inicial + busca (abdome / huger / decisão / vazia)
2. Abertura sistemática dos 6 briefings `complete` — captura em estado colapsado + seções expandidas
3. Chat — captura do estado inicial (não foi enviado mensagem; escopo da avaliação é UX do container)
4. Checagens de instalabilidade superficial (`navigator.serviceWorker.controller`)
5. Inspeção direta dos JSONs de abdominoplastia, gluteoplastia e rinoplastia
6. Auditoria transversal por `browser_evaluate` e `grep`: contagem de cards, imagens referenciadas, status HTTP das imagens, ocorrências de erros de acentuação via regex com fronteira de palavra

### Limitações explícitas
- Não avaliei corretude clínica linha a linha contra o Neligan — esse é papel do Dr. Arthur
- Não testei chat real (não enviei mensagens ao Worker)
- Não rodei Lighthouse, nem análise de performance
- Temas `draft` (lipoaspiração, otoplastia) não entraram na inspeção profunda

### Screenshots
Salvos em [`docs/evaluations/screenshots/2026-04-09-pwa-review/`](screenshots/2026-04-09-pwa-review/). 13 capturas:

| # | Arquivo | Contexto |
|---|---------|----------|
| 01 | `01-home-initial.png` | Home inicial |
| 02 | `02-search-abdome-nothing.png` | Busca por "abdome" (zero resultados) |
| 03 | `03-briefing-abdomino-collapsed.png` | Briefing abdominoplastia colapsado |
| 04 | `04-abdomino-anatomia-expanded.png` | Abdominoplastia — Anatomia expandida |
| 05 | `05-abdomino-huger-expanded.png` | Card Zonas de Huger aberto |
| 06 | `06-abdomino-tecnica-classica.png` | Técnica clássica completa |
| 07 | `07-abdomino-parametros.png` | Parâmetros técnicos |
| 08 | `08-briefing-bariatrico.png` | Contorno pós-bariátrico |
| 09 | `09-briefing-gluteo.png` | Gluteoplastia |
| 10 | `10-briefing-blefaro.png` | Blefaroplastia |
| 11 | `11-briefing-rino.png` | Rinoplastia |
| 12 | `12-briefing-ritido.png` | Ritidoplastia |
| 13 | `13-chat-initial.png` | Chat — estado inicial |

---

## 3. Achados — UX no iPhone

### Escala de severidade
- **Crítico**: bloqueia uso do PWA para o propósito (briefing pré-op antes de cirurgia)
- **Alto**: degrada significativamente a experiência ou utilidade clínica
- **Médio**: melhoria clara mas não bloqueante
- **Baixo**: polimento

### 3.1 Críticos
*Nenhum achado crítico de UX.* O PWA carrega, navega e renderiza briefings de forma estável. Service worker ativo (`navigator.serviceWorker.controller` retornou objeto válido). Não há tela em branco, crash, loop de navegação ou perda de estado observável.

### 3.2 Altos

#### UX-A1 — Busca não normaliza acentos nem indexa radicais
**Evidência:** [`02-search-abdome-nothing.png`](screenshots/2026-04-09-pwa-review/02-search-abdome-nothing.png). Digitar "abdome" retorna **zero resultados** apesar de abdominoplastia existir como card principal. "Decisao" (sem acento) também não encontra cards cujo título contém "decisão". Por outro lado, digitar "abdominoplastia" por extenso funciona.
**Causa provável:** o índice da busca (webapp/library/search.js) casa strings literais contra o campo do card sem normalizar NFD + remoção de diacríticos, e não faz substring/radical matching no slug do tema.
**Impacto:** cenário de uso mais frequente (Dr. Arthur chega à home com a cirurgia na cabeça e digita o radical) falha silenciosamente. Silencioso é pior que erro: ele pode concluir "não tem conteúdo" quando tem.
**Recomendação:** normalizar query + corpus via `.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()` antes de comparar; adicionar os slugs de tema ao índice para que o radical case.

#### UX-A2 — Manifest tem `displayName` curado, renderer ignora
**Evidência:** no manifest, `contorno-corporal/contorno-pos-bariatrico` tem `displayName: "Contorno Pós-Bariátrico"`, `estetica-facial/ritidoplastia` tem `displayName: "Ritidoplastia (Facelift)"`. Na home renderizada os cards exibem "Contorno Pos Bariatrico" e "Ritidoplastia" — título gerado a partir do slug por Title Case, sem acento e sem sufixo esclarecedor.
**Causa:** `webapp/library/app.js` monta o texto do card a partir do `topic` (slug), não do `displayName`.
**Impacto:** nomes do produto ficam errados em português, e desambiguação curada ("Facelift") não aparece. É invisível mas cumulativo: cada tema novo curado no manifest é perdido no frontend.
**Recomendação:** trocar a fonte do label dos cards da home para `displayName` com fallback no Title Case do slug.

### 3.3 Médios

#### UX-M1 — Card "Zonas de Huger" com imagens que carregam via lazy-load
**Evidência:** [`05-abdomino-huger-expanded.png`](screenshots/2026-04-09-pwa-review/05-abdomino-huger-expanded.png). Ao expandir o card, os 3 JPGs começam como placeholders vazios até entrarem no viewport. Durante inspeção inicial cheguei a marcá-los como 404 — re-teste por HEAD confirmou HTTP 200 para todos. Não é bug; é lazy-load honesto.
**Impacto:** baixo em uso real (o Dr. Arthur rola), mas há um segundo de salto de layout no primeiro render que seria bom eliminar em cards de anatomia (onde a imagem é o protagonista).
**Recomendação:** remover `loading="lazy"` específicamente dentro de seções de anatomia expandidas, ou pré-carregar as imagens do card assim que o accordion abrir.

#### UX-M2 — Alt text das imagens é o nome do arquivo
**Evidência:** inspecionando o DOM das imagens de abdominoplastia, o atributo `alt` é igual ao basename do arquivo (`huger-zones.jpg`, `camper-scarpa.jpg`). Deveria conter uma legenda descritiva.
**Impacto:** leitor de tela inutilizável, mas principalmente: o Dr. Arthur abriu regra específica pedindo **labels nas imagens**. O alt do `<img>` é a mais barata das legendas.
**Recomendação:** cada entrada em `images[]` nos JSONs deveria ter um campo `caption` ou `label`, lido pelo renderer como `alt` e renderizado como `<figcaption>`.

#### UX-M3 — Acordeão da seção abre um card por vez sem indicação de quantos há dentro
**Evidência:** [`03-briefing-abdomino-collapsed.png`](screenshots/2026-04-09-pwa-review/03-briefing-abdomino-collapsed.png). As 5 seções (Anatomia/Técnicas/Decisões/Notas/Flashcards) aparecem como linhas sem contagem. Ao abrir Anatomia em abdominoplastia, são 13 cards. Ao abrir Anatomia em blefaroplastia, são 9 — mas visualmente são indistinguíveis antes de expandir.
**Impacto:** dificulta calibrar "vou ter tempo de ler isso antes de entrar na sala?". É discoverability, não bloqueante.
**Recomendação:** adicionar badge com a contagem ao lado de cada seção, lendo de `_meta.json.cardCounts`.

### 3.4 Baixos

#### UX-B1 — Chat screen sem mensagens sugeridas
**Evidência:** [`13-chat-initial.png`](screenshots/2026-04-09-pwa-review/13-chat-initial.png). Chat abre num estado vazio com apenas o input. Nenhuma sugestão do tipo "Como comparar DIEP x TRAM?" ou "Critérios de indicação de rinoplastia estruturada".
**Impacto:** baixo, mas cada vez que Dr. Arthur abre o chat tem o custo cognitivo de formular a pergunta. Sugestões contextuais economizariam esse atrito.
**Recomendação:** 3-5 prompts fixos iniciais na v2.1.

#### UX-B2 — Home não tem indicador de conectividade
**Evidência:** ao abrir o chat offline não há pré-aviso de que aquele motor exige internet. Briefings funcionam offline, chat não.
**Impacto:** baixo, mas previsível: um dia o Dr. Arthur vai tentar o chat no centro cirúrgico sem sinal e só saberá depois de digitar a pergunta.
**Recomendação:** badge no ícone do chat indicando "requer internet" quando `navigator.onLine === false`.

#### UX-B3 — Safe area inferior — conferido OK
Capturas de home e briefings mostram espaçamento correto na barra inferior do iPhone (home indicator). Não há botão coberto. Touch targets medidos:
- Cards da home: 67.19 px (mínimo 44 ✅)
- Input de busca: 52.39 px (✅)
- Botão de chat: 44×44 px (✅)

Sem achado aqui; registro como baseline positivo.

---

## 4. Achados — Qualidade do conteúdo

### 4.1 Abdominoplastia

**Densidade:** boa. `_meta.json` declara 13 cards de anatomia, 4 técnicas, decisões, notas e flashcards. Card principal **Zonas de Huger (1979)** tem 3 imagens, citação Neligan vol. 2 cap. 27 (Matarasso) inline — cumpre a regra de citação.

**Técnica:** o card "Abdominoplastia Clássica Completa" está estruturalmente completo — passo a passo, indicações, contraindicações, complicações presentes. Conteúdo clínico aparentemente rico (Dr. Arthur valida correção médica).

**Problemas encontrados:**

**CONT-A1 — Erros sistemáticos de acentuação** (CRÍTICO como conteúdo)
Scan por regex de palavra inteira em `tecnicas.json` revelou: "nao corrigida", "apos", "ate", "apice", "decubito", "classica", "Indice", "Dismorfico", "deficiencias", "incidencia". Viola diretamente a regra 2 do CLAUDE.md ("SEMPRE validar acentuação portuguesa — este é material de ensino") e desrespeita a identidade de material de ensino para residente.

**CONT-A2 — Campo `pearls` ainda presente nos JSONs** (MÉDIO)
A memória do projeto registra que Pearls foi removida a pedido do Dr. Arthur. O renderer corretamente **não** renderiza `pearls` no DOM (verificado via `browser_evaluate`), mas o campo continua nos JSONs. Lixo latente que pode reaparecer se alguém ressuscitar a renderização.

**CONT-A3 — Imagens: alt = nome do arquivo** (ver UX-M2). Transversal, mas confirmado aqui em todas as 20 imagens referenciadas de abdominoplastia.

### 4.2 Gluteoplastia

**Densidade:** `_meta.json` declara 24 cards (6 anatomia, 4 técnicas, decisões, notas, flashcards). Texto dos cards está em português correto, sem erros de acentuação no scan — o tema é recente e foi escrito com as regras atuais vigentes.

**Técnicas:** cobrem prótese, lipoenxertia (BBL), híbrida e critérios de segurança. Estrutura alinhada ao padrão.

**Problemas encontrados:**

**CONT-G1 — ZERO imagens no tema** (ALTO)
Scan dos 24 cards: 0 entradas em `images[]`. O Dr. Arthur expandiu explicitamente a regra de anatomia privilegiada para incluir imagens anotadas — e aqui o tema inteiro é texto. Briefing de gluteoplastia sem imagem de zonas de segurança vascular (Del Vecchio — Zona 1/2/3 para pedículos glúteos) é insuficiente para planejamento de BBL.

**CONT-G2 — Marcado `complete` no manifest** (ALTO)
O status `complete` deveria implicar "pronto para consulta pré-op". Sem imagens, o tema é `draft` disfarçado. Isso corrói a confiança no manifest como sinal de prontidão.

**Recomendação:** rebaixar para `draft` até incorporar imagens OU rodar o pipeline de imagens (PyMuPDF + OpenCV + Claude Haiku, projetado para v2) antes de qualquer próxima promoção.

### 4.3 Rinoplastia

**Densidade:** `_meta.json` declara carga robusta (anatomia, técnicas, decisões, notas, flashcards). Os cards de técnica inspecionados têm texto em **português limpo e correto** — nenhum erro de acentuação encontrado no scan por regex. Citações inline presentes (formato `<span class="cite">`).

**Imagens:** 26 entradas em `images[]` ao longo do tema, todas retornando HTTP 200. Bom.

**Problemas encontrados:**

**CONT-R1 — Alt text = nome de arquivo** (igual a UX-M2, transversal)

**CONT-R2 — Não inspecionei corretude clínica contra Neligan** — limitação explícita do escopo. Registro para o Dr. Arthur: na fase de revisão médica, priorizar esse tema, porque ele é o único dos três inspecionados que NÃO tem débito textual ou de imagem aparente. Se o conteúdo clínico também passar, rinoplastia vira o tema de referência para o padrão de qualidade do projeto.

### 4.4 Achados transversais (regras do CLAUDE.md)

#### CONT-T1 — Acentuação quebrada em 3 dos 6 temas complete (CRÍTICO)
Scan por regex de palavra inteira em todos os JSONs dos temas `complete`:

| Tema | Erros de acentuação detectados | Status |
|------|---|---|
| abdominoplastia | **Sim (múltiplos)** | ❌ |
| contorno-pos-bariatrico | **Sim (múltiplos)** | ❌ |
| gluteoplastia | Nenhum | ✅ |
| blefaroplastia | Nenhum | ✅ |
| rinoplastia | Nenhum | ✅ |
| ritidoplastia | **Sim (múltiplos)** | ❌ |

Os 3 temas afetados (abdominoplastia, contorno-pos-bariatrico, ritidoplastia) são os mais antigos na base v2. É provável que tenham sido gerados antes do reforço da regra de acentuação. A solução é retroativa: passar esses 3 temas pelo mesmo pipeline que produziu gluteoplastia/blefaroplastia/rinoplastia, ou rodar um script de correção dirigida por dicionário.

**Isto é o achado mais sério do relatório.** É conteúdo de ensino para residente. O Dr. Arthur verá "nao" no meio de um parágrafo de planejamento pré-op e a credibilidade do material cai pela metade.

#### CONT-T2 — Imagens sem legenda visível em nenhum tema (ALTO)
Os JSONs de imagens têm campo efetivamente só com o nome do arquivo. Não há campo `caption`, `label`, `description`. O renderer usa o basename como `alt`. Isso viola a regra do Dr. Arthur: **imagens DEVEM ter labels identificando cada estrutura**. Aqui nem legenda elas têm.

**Recomendação:** estender o schema `images[]` (em [`content/cards/schema.json`](../../content/cards/schema.json)) para:
```json
{
  "file": "huger-zones.jpg",
  "caption": "Zonas de perfusão da parede abdominal anterior (Huger, 1979)",
  "credit": "Neligan vol. 2, cap. 27, fig. 27.4"
}
```
E ajustar o renderer para usar esses campos.

#### CONT-T3 — Inconsistência de schema em `_meta.json.cardCounts` (MÉDIO)
Alguns `_meta.json` usam chaves com acento (`técnicas`, `decisões`), outros sem (`tecnicas`, `decisoes`). O campo `area` também oscila: `"estética-facial"` vs `"estetica-facial"`. Isso quebrará qualquer código cliente que leia `cardCounts.tecnicas` — hoje é silencioso porque o renderer não depende disso.

**Recomendação:** padronizar todas as chaves de schema para **ASCII sem acento** (consistente com a regra de nomes de arquivo de imagem), validar via `schema.json` em pre-commit.

#### CONT-T4 — Siglas: check parcial (BAIXO)
Em abdominoplastia tecnicas.json, "DIEP" e "TRAM" aparecem sem expansão na primeira ocorrência da seção. Regra 4 do CLAUDE.md: siglas com nome por extenso na primeira ocorrência por seção. O conteúdo é denso e várias siglas provavelmente estão OK, mas esse par foi violação concreta. Não fiz scan exaustivo.

---

## 5. Recomendações Priorizadas

Ordem de prioridade: começa pelo que mais dano causa ao uso atual.

1. **[CRÍTICO] Corrigir acentuação em abdominoplastia, contorno-pos-bariatrico, ritidoplastia.** Passar os 3 temas por um script de correção dirigida por dicionário + revisão final humana. Bloqueia a promoção de qualquer novo tema. Referência: CONT-T1.

2. **[ALTO] Remover status `complete` de gluteoplastia e contorno-pos-bariatrico no manifest até terem imagens.** Ou, alternativamente, rodar o pipeline de imagens v2 (PyMuPDF+OpenCV+Haiku) antes. A regra é: `complete` significa consultável no pré-op, incluindo imagens anotadas. Referência: CONT-G1, CONT-G2.

3. **[ALTO] Corrigir busca da home — normalização de acentos + indexação de radicais.** Editar `webapp/library/search.js`: normalizar query e corpus via `NFD`, incluir slug dos temas no corpus de busca. Teste de aceitação: "abdome" e "decisao" devem retornar cards. Referência: UX-A1.

4. **[ALTO] Renderer ler `displayName` do manifest.** Editar `webapp/library/app.js` para usar `item.displayName` com fallback no Title Case do slug. Referência: UX-A2.

5. **[ALTO] Estender schema de imagens para incluir `caption` + `credit` e renderer passar a exibir.** Editar `content/cards/schema.json`, `webapp/library/renderer.js`. Migrar os arrays `images[]` existentes (script de migração — para cada imagem existente, adicionar `caption: ""` placeholder e marcar para preenchimento). Referência: CONT-T2, UX-M2.

6. **[MÉDIO] Padronizar chaves de `_meta.json.cardCounts` e campo `area` para ASCII sem acento.** Validar em pre-commit via `schema.json`. Referência: CONT-T3.

7. **[MÉDIO] Remover campo `pearls` dos JSONs (limpeza retroativa).** Memória registra a decisão; os JSONs ainda têm o lixo. Referência: CONT-A2.

8. **[MÉDIO] Badge com contagem de cards em cada seção do acordeão.** Lê `_meta.json.cardCounts`. Referência: UX-M3.

9. **[BAIXO] Sugestões contextuais no chat ao abrir.** 3-5 prompts iniciais. Referência: UX-B1.

10. **[BAIXO] Indicador de conectividade no ícone do chat.** `navigator.onLine` → badge "requer internet". Referência: UX-B2.

11. **[BAIXO] Desabilitar `loading="lazy"` dentro de seções de anatomia expandidas.** Referência: UX-M1.

12. **[BAIXO] Auditoria de siglas expandidas** (regra 4 do CLAUDE.md). Grep por siglas conhecidas (`DIEP`, `TRAM`, `SMAS`, `BBL`, `VASER`, etc.) e validar que cada uma aparece por extenso na primeira ocorrência por seção. Referência: CONT-T4.

---

## 6. Anexos

- Pasta de screenshots: [`screenshots/2026-04-09-pwa-review/`](screenshots/2026-04-09-pwa-review/) (13 arquivos, `01-home-initial.png` a `13-chat-initial.png`)
- Plano que originou esta avaliação: `C:\Users\absay\.claude\plans\sleepy-wiggling-axolotl.md`
- Commit-base avaliado: `7c5e965` (merge Fase 3 v2)

**Próximo passo sugerido:** antes da próxima leva de promoção de temas, atacar os itens 1–5 desta lista. São os que mais separam o produto atual de "pronto para uso pré-op sem ressalvas".
