# Phase 7 — Reconstrução Facial por Sub-Unidade (roadmap)

**Spec:** [`docs/superpowers/specs/2026-04-18-reconstrucao-facial-subunidade-design.md`](../specs/2026-04-18-reconstrucao-facial-subunidade-design.md)

Umbrella plan listando os sub-planos de cada sub-fase. Execução é sequencial por onda; dentro de uma onda os temas podem ir em paralelo.

## Sub-planos e status

| Sub-fase | Escopo | Plano | PR | Status |
| --- | --- | --- | --- | --- |
| 7.0 | Remediação blefaroplastia (anatomia) | [`2026-04-18-phase-7-0-blefaroplastia-image-remediation.md`](2026-04-18-phase-7-0-blefaroplastia-image-remediation.md) | #24 | ✅ concluída |
| 7.1 | Chapter-opener editorial (Anatomia) | [`2026-04-18-phase-7-1-chapter-opener-anatomy.md`](2026-04-18-phase-7-1-chapter-opener-anatomy.md) | #25 | ✅ concluída |
| 7.2 | Anatomy image purge (8 temas) | (sem plano dedicado — PR atômico) | #26 | ✅ concluída |
| 7.3 | RAGs horizontais (princípios + atlas) | [`2026-04-18-phase-7-3-kaufman-horizontais.md`](2026-04-18-phase-7-3-kaufman-horizontais.md) | #27 | ✅ concluída |
| 7.4 | Onda 1 — Reconstrução de nariz | [`2026-04-18-phase-7-4-reconstrucao-nariz.md`](2026-04-18-phase-7-4-reconstrucao-nariz.md) | #28 | ✅ concluída |
| 7.5 | Onda 1 — Reconstrução de lábio | [`2026-04-23-phase-7-5-reconstrucao-labio.md`](2026-04-23-phase-7-5-reconstrucao-labio.md) | local merge `6af38ad` | ✅ concluída |
| 7.6a | Onda 2 — Reconstrução de bochecha | [`2026-04-23-phase-7-6a-reconstrucao-bochecha.md`](2026-04-23-phase-7-6a-reconstrucao-bochecha.md) | local merge `673fbe3` | ✅ concluída |
| 7.6b | Onda 2 — Reconstrução de pálpebra + enriquecimento blefaroplastia | [`2026-04-26-phase-7-6b-palpebra-blefaro-expanded.md`](2026-04-26-phase-7-6b-palpebra-blefaro-expanded.md) | local merges 7.6b.1 `fcc54c0`+`27b7090`; 7.6b.2 `fcf5dd5`; 7.6b.3 `7f12f5b` | ✅ concluída |
| 7.6c | Onda 2 — Reconstrução de orelha | (pendente) | — | ⏳ não iniciada |
| 7.6d | Onda 2 — Reconstrução de fronte/têmpora | (pendente) | — | ⏳ não iniciada |
| 7.7 | Onda 3 — couro cabeludo + queixo | (pendente) | — | ⏳ não iniciada |
| 7.8 | Encerramento — remoção de `pele-tumores/` do manifest + arquivo RAG | (pendente) | — | ⏳ não iniciada |

## Notas

- Numeração do plano difere da spec: a spec original previa 7.3 = onda 1 bundled (nariz + lábio paralelo) e 7.4 = onda 2 bundled (bochecha + pálpebra + orelha + fronte/têmpora). Execução dividiu em sub-fases sequenciais — uma sub-unidade por fase — decisão ratificada pelo Dr. Arthur em 2026-04-23 (Onda 1: 7.4→7.5; Onda 2: 7.6a→7.6d). Este roadmap reflete o cronograma real.
- RAGs horizontais (`_principios-reconstrucao.md`, `_atlas-retalhos.md`) são compartilhados por todas as sub-unidades — não duplicar conteúdo neles quando adicionar nova onda.
- Ordem recomendada para novas ondas: seguir a tabela de "frequência clínica" da spec §4 (nariz → lábio → bochecha → pálpebra → orelha → fronte/têmpora → couro cabeludo → queixo).
