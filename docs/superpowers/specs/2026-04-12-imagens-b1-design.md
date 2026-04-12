# Enriquecimento de Imagens — Temas Carentes (Frente B / B1)

**Data:** 2026-04-12
**Status:** Aprovado
**Autor:** Dr. Arthur Balestra Silveira Ayres + Claude

---

## Objetivo

Nivelar a densidade de imagens dos quatro temas atualmente em déficit, de modo que cada ficha de anatomia e técnica tenha apoio visual relevante. Isso torna o briefing pré-op utilizável no celular para esses temas, onde hoje a consulta rápida é prejudicada pela ausência de suporte visual.

## Escopo

### Temas alvo (ordem de execução)

| # | Tema | Imagens atuais | Área |
|---|---|---|---|
| 1 | Lipoaspiração | 0 | contorno-corporal |
| 2 | Gluteoplastia | 6 | contorno-corporal |
| 3 | Contorno Pós-Bariátrico | 9 | contorno-corporal |
| 4 | Otoplastia | 12 | estetica-facial |

Ordem escolhida por urgência (lipoaspiração começa do zero) e por continuidade de contexto (três temas de contorno corporal em sequência, depois otoplastia).

### Critério de concluído por tema

- **Anatomia**: toda ficha com ≥1 imagem relevante
- **Técnica**: toda ficha com ≥1 imagem relevante
- **Decisão**: algoritmo/fluxograma visual quando fizer sentido (opcional, não obrigatório)
- **Flashcards e notas**: sem exigência

Imagens devem conter labels anatômicos identificando cada estrutura (regra invariante — ver `feedback_image_annotations` na memória). Se uma imagem não tiver labels no original, o caption do card deve compensar descrevendo claramente o que está sendo mostrado.

## Fontes de Imagens

### Primária: KenHub

- Plataforma de educação anatômica com conteúdo visual de alta qualidade
- Usar apenas páginas públicas (sem login/assinatura)
- Preferir diagramas rotulados

### Secundária: NCBI/PMC

- Artigos open-access com figuras anatômicas e cirúrgicas
- Licença Creative Commons (CC-BY, CC-BY-SA, CC-BY-NC)
- Prioridade para figuras de revisões anatômicas e artigos de técnica cirúrgica

### Outras fontes aceitas

- Wikimedia Commons (domínio público ou CC)
- Repositórios acadêmicos abertos
- Imagens geradas via `tools/generate_diagrams.py` quando nenhuma fonte adequada existir (último recurso)

## Arquitetura

### Infraestrutura já existente

- **Schema:** campo `images` (array de strings) em todos os tipos de card
- **Renderer:** `webapp/library/renderer.js` → função `_images()` gera `<img>` com lazy loading
- **Path no PWA:** `../../assets/images/<topico>/<filename>`
- **Diretórios:** já existem para os 4 temas em `assets/images/` (lipoaspiração precisa ser criado — hoje não há pasta)

### O que NÃO muda

- HTML/JS do renderer
- CSS de imagens
- Schema dos cards
- Estrutura de pastas

## Workflow por Tema

### Passo 1: Mapear gaps

- Ler todas as fichas de anatomia, técnica e decisão do tema em `content/cards/<area>/<topico>/`
- Para cada ficha, listar: (a) se já tem `images` populado, (b) que estrutura/conceito a ficha descreve, (c) que tipo de imagem seria mais útil
- Produzir uma tabela de gaps como artefato intermediário (pode ir no corpo do PR)

### Passo 2: Buscar

- WebSearch para localizar páginas relevantes no KenHub, PMC, Wikimedia
- WebFetch para acessar as páginas e extrair URLs de imagens
- Priorizar qualidade e relevância sobre quantidade
- Verificar licença antes de baixar

### Passo 3: Baixar e salvar

- Salvar em `assets/images/<topico>/` (criar pasta de `lipoaspiracao` se não existir)
- Naming convention: `<sigla>-<tipo>-<descricao>.<ext>`
  - Siglas por tema: `lipo-`, `glut-`, `bari-`, `oto-`
  - Tipos: `anat-`, `tec-`, `dec-`
  - Exemplos: `lipo-anat-zones.jpg`, `glut-tec-brazilianbuttlift.png`, `oto-dec-algorithm.svg`
- Formatos aceitos: PNG, JPG, SVG
- **Nomes sempre ASCII sem acentos** (regra invariante — ver `feedback_image_filenames_no_accents`)

### Passo 4: Associar aos cards

- Atualizar campo `images` no JSON da ficha: `"images": ["lipo-anat-zones.jpg"]`
- Caption do card deve descrever claramente a imagem (especialmente se ela não tiver labels)

### Passo 5: Validar

- Confirmar que o renderer exibe as imagens corretamente em mobile viewport via Playwright
- Bump de `CACHE_NAME` no service worker após cada tema para forçar atualização no iPhone

## Entrega

- **Branch:** `feat/v2-imagens-b1`
- **PR:** #8 (ou seguinte; independente da Frente A)
- **Commits por tema:**
  1. `feat(imagens): lipoaspiracao — anatomia e tecnicas`
  2. `feat(imagens): gluteoplastia — nivelar anatomia e tecnicas`
  3. `feat(imagens): contorno-pos-bariatrico — completar anatomia e tecnicas`
  4. `feat(imagens): otoplastia — completar anatomia e tecnicas`
  5. `chore(pwa): bump CACHE_NAME apos enriquecimento de imagens`
- **Validação no iPhone:** Dr. Arthur revisa cada tema antes do próximo commit
- **Code review:** `/code-review:code-review` antes de mergear

## Critérios de Aceitação

- [ ] Lipoaspiração: toda ficha de anatomia e técnica com ≥1 imagem
- [ ] Gluteoplastia: toda ficha de anatomia e técnica com ≥1 imagem
- [ ] Contorno pós-bariátrico: toda ficha de anatomia e técnica com ≥1 imagem
- [ ] Otoplastia: toda ficha de anatomia e técnica com ≥1 imagem
- [ ] Todas as imagens com licença compatível e atribuição registrada quando exigido
- [ ] Nomes de arquivo em ASCII sem acentos
- [ ] Captions descrevem o que está na imagem (especialmente quando sem labels originais)
- [ ] Service worker com `CACHE_NAME` bumpado
- [ ] Playwright confirma renderização em mobile viewport

## Regras de Conteúdo

Valem todas as regras invariantes do `CLAUDE.md`:

1. Nunca apagar conteúdo existente
2. Imagens DEVEM ter labels identificando estruturas (ou caption compensatório)
3. Nomes de arquivo: ASCII sem acentos
4. Agente tem autonomia total para incorporar imagens sem revisão prévia (ver `feedback_image_autonomy`)

## Paralelismo com Frente A

Esta spec roda em branch independente da spec `2026-04-12-pele-tumores-reconstrutivo-design.md` (Frente A). As duas frentes tocam arquivos disjuntos — zero risco de conflito. Podem mergear em qualquer ordem.
