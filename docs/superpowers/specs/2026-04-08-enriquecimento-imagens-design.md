# Enriquecimento de Fichas com Imagens Anatômicas

**Data:** 2026-04-08
**Status:** Aprovado
**Autor:** Dr. Arthur Balestra Silveira Ayres + Claude

---

## Objetivo

Enriquecer todas as fichas atômicas (cards) dos 3 tópicos sem imagens com conteúdo visual de fontes open-access. O objetivo é que cada ficha de anatomia, técnica e decisão tenha pelo menos uma imagem relevante que auxilie o estudo visual no PWA.

## Escopo

### Tópicos (ordem de execução)

| # | Tópico | Fichas anatomia | Fichas técnicas | Fichas decisões | Total |
|---|--------|-----------------|-----------------|-----------------|-------|
| 1 | Ritidoplastia | 4 | 7 | 2 | 13 |
| 2 | Otoplastia | 2 | 6 | 1 | 9 |
| 3 | Abdominoplastia | 6 | 4 | 2 | 12 |
| | **Total** | **12** | **17** | **5** | **34** |

### Tipos de fichas incluídos

- **Anatomia** — diagramas de estruturas, camadas, nervos, vasos, músculos
- **Técnicas** — ilustrações de passos cirúrgicos, marcações, posição de suturas
- **Decisões** — algoritmos, fluxogramas, tabelas comparativas

### Tipos de fichas excluídos

- Flashcards (parâmetros numéricos — não se beneficiam de imagens)
- Notas (conteúdo complementar textual)

## Fontes de Imagens

### Primária: KenHub

- Plataforma de educação anatômica com conteúdo visual de alta qualidade
- Usar apenas imagens disponíveis nas páginas públicas (sem login/assinatura)
- Prioridade para diagramas rotulados com estruturas identificadas

### Secundária: NCBI/PMC

- Artigos open-access com figuras anatômicas e cirúrgicas
- Licença Creative Commons (CC-BY, CC-BY-SA, CC-BY-NC)
- Prioridade para figuras de revisões anatômicas e artigos de técnica cirúrgica

### Tratamento de imagens sem labels

- Imagens sem rótulos anatômicos são aceitas se relevantes
- O caption no card JSON compensa a falta de labels na imagem
- Preferir imagens rotuladas quando disponíveis

## Arquitetura (existente — sem mudanças)

### Infraestrutura já implementada

- **Schema:** campo `images` (array de strings) em todos os tipos de card
- **Renderer:** `webapp/library/renderer.js` → função `_images()` gera `<img>` com lazy loading
- **Path:** `../../assets/images/<topico>/<filename>`
- **Diretórios:** `assets/images/ritidoplastia/`, `assets/images/otoplastia/`, `assets/images/abdominoplastia/` já existem (vazios)

### O que NÃO muda

- HTML/JS do renderer
- CSS de imagens
- Schema dos cards
- Estrutura de pastas

## Workflow por Tópico

### Passo 1: Mapear necessidades

Ler cada ficha dos 3 tipos (anatomia, técnicas, decisões) e identificar:
- Que estrutura/conceito a ficha descreve
- Que tipo de imagem seria mais útil (diagrama anatômico, ilustração cirúrgica, algoritmo)
- Termos de busca em inglês para pesquisar

### Passo 2: Buscar imagens

- WebSearch para encontrar páginas relevantes no KenHub e NCBI/PMC
- WebFetch para acessar as páginas e identificar URLs de imagens
- Priorizar qualidade e relevância sobre quantidade

### Passo 3: Baixar e salvar

- Salvar em `assets/images/<topico>/`
- Naming convention: `<sigla>-<id-curto>-<descricao>.<ext>`
  - Exemplos: `riti-anat-smas.jpg`, `oto-tec-mustarde.png`, `abdo-anat-huger.jpg`
- Formatos aceitos: PNG, JPG, SVG

### Passo 4: Associar aos cards

- Atualizar o campo `images` no JSON da ficha com o filename
- Exemplo: `"images": ["riti-anat-smas.jpg"]`

### Passo 5: Validar

- Confirmar que o renderer exibe as imagens corretamente
- Bump do `CACHE_NAME` no service worker para forçar atualização no iPhone

## Critérios de Seleção de Imagens

| Tipo de ficha | Critério | Exemplo |
|---------------|----------|---------|
| Anatomia | Diagrama mostrando a estrutura descrita na ficha, com camadas e relações | Corte sagital do SMAS e planos faciais |
| Técnica | Ilustração dos passos cirúrgicos, marcações pré-operatórias, posição de instrumentos | Vetores de tração no deep plane facelift |
| Decisão | Algoritmo visual, fluxograma de decisão, tabela comparativa | Fluxograma: escolha da técnica de SMAS |

## Entrega

- **Incremental por tópico:** cada tópico é commitado e deployado separadamente
- **Validação no iPhone:** Dr. Arthur testa cada tópico antes de prosseguir ao próximo
- **Service Worker:** bump de `CACHE_NAME` após cada tópico para forçar atualização

## Inventário Completo de Fichas

### Ritidoplastia (13 fichas)

**Anatomia (4):**
- riti-anat-001: SMAS (Sistema Músculo-Aponeurótico Superficial)
- riti-anat-002: Ligamentos de Retenção Facial (Furnas)
- riti-anat-003: Nervo Facial — Ramos Vulneráveis na Ritidoplastia
- riti-anat-004: Platisma

**Técnicas (7):**
- riti-tec-001: Deep Plane Facelift
- riti-tec-002: Deep Plane em Pacientes Asiáticos
- riti-tec-003: U-SMAS Lift
- riti-tec-004: Manejo do Pescoço — Platismaplastia e Técnicas Cervicais
- riti-tec-005: Browlift Endoscópico
- riti-tec-006: Uso de Ácido Tranexâmico (TXA) Local no Facelift
- riti-tec-007: Ultrassom Microfocado com Visualização (MFU-V / Ultherapy)

**Decisões (2):**
- riti-dec-001: Escolha da Técnica de SMAS
- riti-dec-002: Manejo do Pescoço na Ritidoplastia

### Otoplastia (9 fichas)

**Anatomia (2):**
- oto-anat-001: Pavilhão Auricular — Estrutura e Dimensões Normais
- oto-anat-002: Cartilagem Auricular

**Técnicas (6):**
- oto-tec-001: Técnica de Mustardé (Suturas para Anti-hélice)
- oto-tec-002: Técnica de Furnas (Sutura Concha-Mastóide)
- oto-tec-003: Otoplastia Poupadora de Cartilagem (Cartilage-Sparing)
- oto-tec-004: Prevenção de Extrusão com Retalho Dermofascial Pós-Auricular
- oto-tec-005: Prevenção de Extrusão com Enxerto de Tecido Mole Livre
- oto-tec-006: Moldagem Neonatal (Ear Molding)

**Decisões (1):**
- oto-dec-001: Tratamento da Orelha em Abano

### Abdominoplastia (12 fichas)

**Anatomia (6):**
- abdo-anat-001: Camadas da Parede Abdominal
- abdo-anat-002: Zonas de Huger — Suprimento Vascular da Parede Abdominal
- abdo-anat-003: Fáscia de Scarpa e Sistema Linfático Abdominal
- abdo-anat-004: Anatomia do Umbigo
- abdo-anat-005: Unidades Estéticas do Abdome
- abdo-anat-006: Gordura Visceral (Intraabdominal)

**Técnicas (4):**
- abdo-tec-001: Abdominoplastia Clássica Completa (Matarasso — Tipo IV)
- abdo-tec-002: Mini-Abdominoplastia (Tipo II — Matarasso)
- abdo-tec-003: Lipoabdominoplastia (Saldanha)
- abdo-tec-004: Abdominoplastia Circunferencial (Belt Lipectomy / Lower Body Lift)

**Decisões (2):**
- abdo-dec-001: Classificação de Matarasso — Seleção da Técnica de Abdominoplastia
- abdo-dec-002: Contraindicações e Seleção de Pacientes para Abdominoplastia
