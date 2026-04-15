# Pele/Tumores — Bloco Oncológico (Frente C)

**Data:** 2026-04-15
**Status:** Aprovado
**Autor:** Dr. Arthur Balestra Silveira Ayres + Claude

---

## Objetivo

Completar a área `pele-tumores` com os três temas oncológicos antecipados na spec da Frente A (`2026-04-12-pele-tumores-reconstrutivo-design.md`): carcinoma basocelular (CBC), carcinoma espinocelular (CEC) e melanoma cutâneo. A Frente A cobriu o bloco reconstrutivo (retalhos/enxertos/princípios de margens); esta Frente C cobre o bloco oncológico (decisão clínica por lesão específica, diagnóstico, estadiamento, conduta, seguimento).

## Escopo

### Temas

| # | Tema (topic) | displayName | Prefixo |
|---|---|---|---|
| 1 | `carcinoma-basocelular` | Carcinoma Basocelular (CBC) | `cbc` |
| 2 | `carcinoma-espinocelular` | Carcinoma Espinocelular (CEC) | `cec` |
| 3 | `melanoma-cutaneo` | Melanoma Cutâneo | `mel` |

### Conteúdo por tema

**1. Carcinoma Basocelular (CBC)**
- Epidemiologia, fatores de risco, fisiopatologia (via Hedgehog, PTCH1)
- Subtipos histológicos (nodular, superficial, morfeiforme, micronodular, infiltrativo) e implicações cirúrgicas
- Diagnóstico: dermatoscopia, biópsia (shave, punch, excisional)
- Estratificação de risco (NCCN): lesões de baixo vs alto risco
- Tratamento: excisão cirúrgica com margem, Mohs, curetagem/eletrodissecção, criocirurgia, imiquimod, 5-FU, radioterapia, vismodegibe (avançado)
- Seguimento: esquema clínico, recidiva

**2. Carcinoma Espinocelular (CEC)**
- Epidemiologia, fatores de risco (UV, imunossupressão, HPV, cicatrizes), precursores (queratose actínica, doença de Bowen)
- Subtipos e implicações (bem/moderadamente/pouco diferenciado, acantolítico, desmoplásico, verrucoso)
- Diagnóstico e estadiamento AJCC 8ª ed. (cabeça e pescoço cutâneo); Brigham & Women's como alternativa
- Estratificação de risco NCCN
- Tratamento: margens, Mohs, linfadenectomia seletiva, radioterapia adjuvante, cemiplimabe/pembrolizumabe em avançado
- Seguimento clínico + imagem em alto risco

**3. Melanoma Cutâneo**
- Epidemiologia, fatores de risco, subtipos clínico-patológicos
- Diagnóstico (dermatoscopia, ABCDE), biópsia excisional preferencial
- Estadiamento AJCC 8ª (Breslow, ulceração, mitoses, LNS)
- Margens cirúrgicas por Breslow
- LNS: indicações (Breslow > 0,8 mm ou ulceração), técnica básica
- Terapia sistêmica adjuvante/avançada (anti-PD-1, BRAF/MEK) — foco clínico, não prescritivo
- Seguimento estratificado por estágio

### Referências primárias

- **Neligan 5ª Ed. — Vol 1 (Principles)** — bloco Skin/Tumors (lesões cutâneas, CBC, CEC, melanoma)
- **Grabb and Smith 9ª Ed.** — capítulos de skin cancer
- **Operative Dictations in Plastic and Reconstructive Surgery** — descrições cirúrgicas
- **NCCN Guidelines** (CBC, CEC, Melanoma) — estratificação de risco

> **Correção em relação ao plan file inicial:** o plan mencionava "Neligan Vol 5 (Skin/Tumors)"; o Vol 5 de Neligan 5ª Ed. é **Mama**. O bloco Skin/Tumors está no **Vol 1 (Principles)**, como já utilizado na Frente A.

## Arquitetura

Idêntica à Frente A. Cada tema gera:

```
content/rag/pele-tumores/<tema>.md                  (RAG unificado)
content/cards/pele-tumores/<tema>/*.json            (derivados via tools/rag_to_cards.js)
```

### Fluxo por tema

1. Ler capítulos relevantes do Neligan Vol 1 (bloco Skin/Tumors)
2. Compor RAG seguindo `content/rag/_template.md`
3. `node tools/rag_to_cards.js content/rag/pele-tumores/<tema>.md`
4. Validar saída contra `content/cards/schema.json`

### Imagens

Fora de escopo desta frente (ciclo próprio posterior, análogo à Frente B).

## Entrega

- **Branch:** `feat/v2-pele-tumores-oncologico`
- **Worktree:** `../Biblioteca-CirurgiaPlastica-frenteC`
- **Ordem de commits:**
  1. `chore(tools): adicionar prefixos cbc/cec/mel em topic_prefixes.json`
  2. `feat(rag): adicionar carcinoma-basocelular`
  3. `feat(cards): derivar cards de carcinoma-basocelular`
  4. `feat(rag): adicionar carcinoma-espinocelular`
  5. `feat(cards): derivar cards de carcinoma-espinocelular`
  6. `feat(rag): adicionar melanoma-cutaneo`
  7. `feat(cards): derivar cards de melanoma-cutaneo`
  8. `chore(manifest): marcar 3 temas oncológicos como complete + bump CACHE_NAME v14`
  9. `docs(specs): adicionar spec 2026-04-15-pele-tumores-oncologico-design.md`
- **Code review:** `/code-review:code-review` antes de mergear
- **Merge:** após aprovação humana

## Critérios de Aceitação

- [ ] Três RAGs escritos seguindo template canônico, com citações inline ao Neligan Vol 1 + NCCN
- [ ] Três blocos de cards derivados e validados contra schema
- [ ] Manifest atualizado com três entradas `complete` (14 temas completos ao final)
- [ ] `tools/topic_prefixes.json` com `cbc`, `cec`, `mel`
- [ ] Índice RAG rebuildado (`node tools/build_rag_index.js`)
- [ ] `CACHE_NAME` bumpado v13 → v14
- [ ] `tools/validate_briefings.mjs` passa sem erro
- [ ] PWA renderiza os três temas em mobile viewport 375×667

## Regras de Conteúdo

Valem todas as regras invariantes do `CLAUDE.md`:

1. Nunca apagar conteúdo existente
2. Validar acentuação portuguesa
3. Citação inline em todo conteúdo novo
4. Siglas com nome por extenso na primeira ocorrência por seção (CBC = carcinoma basocelular; CEC = carcinoma espinocelular; LNS = linfonodo sentinela; AJCC = American Joint Committee on Cancer; NCCN = National Comprehensive Cancer Network; NMSC = non-melanoma skin cancer; etc.)
5. Nomes de arquivo de imagem: ASCII sem acentos (não aplicável neste ciclo — sem imagens)
6. Português brasileiro com terminologia oncológica oficial
7. Nunca escrever conteúdo sem ter lido o capítulo correspondente do Neligan

## Paralelismo

Branch independente. Zero conflito esperado com master (apenas adições). Pode mergear a qualquer momento após aprovação humana.
