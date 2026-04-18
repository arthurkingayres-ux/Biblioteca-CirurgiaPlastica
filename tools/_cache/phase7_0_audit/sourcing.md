# Phase 7.0 — Blefaroplastia Anatomy Sourcing

Generated: 2026-04-18
Task: Source figures for 7 REPLACE cards in blef-anat anatomy deck.

---

## blef-anat-001 — Pele Palpebral (espessura pré-tarsal vs. pré-septal)

- Fonte: Reuso de diagrama existente `diagrama-camadas-palpebrais.png`
- Decisão: Figura mostra explicitamente "LAMELA ANTERIOR" (Pele, M. Orbicular) e "LAMELA POSTERIOR" com todas as estruturas em tabela visual. Pele é listada como "Pele mais fina do corpo (< 1mm)". Adequado para o conceito.
- Arquivo final: assets/images/blefaroplastia/diagrama-camadas-palpebrais.png (reutilizado, sem criação)
- Novo manifest ID proposto: img-pele-palpebral-001
- Crédito sugerido: "Neligan Plastic Surgery, 5th Ed. Elsevier 2023 — Diagrama adaptado"

---

## blef-anat-004 — Gordura Orbitária Superior (3 compartimentos medial/central/lateral com glândula lacrimal)

- Fonte: Reuso de `blef-p0592-anatomia-da-orbita-e-compartimentos-de-gordura-per.jpeg`
- Decisão: Figura mostra corte sagital completo da órbita com as zonas de gordura orbital visíveis (espaços amarelos pré e retrosseptais). Não tem labels de compartimentos nominados, mas a Task 4/5 adicionará overlays numéricos x,y apontando para os compartimentos medial, central, lateral e glândula lacrimal superolateral. Estrutura anatomicamente correta e suficientemente detalhada.
- Arquivo final: assets/images/blefaroplastia/blef-p0592-anatomia-da-orbita-e-compartimentos-de-gordura-per.jpeg (reutilizado, sem criação)
- Novo manifest ID proposto: img-gordura-orbital-superior-001
- Crédito sugerido: "Neligan Plastic Surgery, 5th Ed. Elsevier 2023, Vol. 2 p.592"

---

## blef-anat-007 — Müller (músculo tarsal superior, simpático, entre aponeurose e conjuntiva)

- Fonte: NOVO ARQUIVO — Grabb & Smith 9ed 2024, Cap 38 Fig 38.1 Panel A (upper eyelid sagittal), pág. 1305
- Decisão: Fig 38.1 Panel A é corte sagital colorido da pálpebra superior mostrando "Muller muscle" explicitamente labelado com seta, posicionado entre Levator palpebrae superioris e Tarsal plate/Conjunctiva. Figura completamente diferente do fig13-11 (Neligan Cap 13) — fonte diferente (Grabb vs. Neligan), capítulo diferente, estilo diferente (colorido vs. linha). Crop isolado no Panel A (superior esquerdo da figura completa), cortado em x=1320 para excluir Panel B.
- Arquivo final: assets/images/blefaroplastia/blef-anat-muller-musculo-tarsal.png (NOVO — crop de Grabb p1305 a 300 DPI, Panel A)
- Novo manifest ID proposto: img-musculo-muller-001
- Estruturas visíveis: Muller muscle, Levator palpebrae superioris muscle, Superior rectus muscle, Levator aponeurosis, Tarsal plate, Meibomian glands, Septum, Preaponeurotic fat, Orbicularis muscle
- Labels x,y sugeridos (0–1 normalizado):
  - "Músculo de Müller": (0.22, 0.65) — label na porção central-esquerda, apontando para a camada muscular fina entre LPS e tarso
  - "Aponeurose do levantador": (0.57, 0.48)
  - "Tarso superior": (0.57, 0.72)
  - "Glândulas de Meibomius": (0.57, 0.82)
- Crédito sugerido: "Grabb and Smith's Plastic Surgery, 9th Ed. Wolters Kluwer 2024, Cap. 38 Fig. 38.1A"

---

## blef-anat-009 — Tarso (superior 10–12 mm vs. inferior 3.5–5 mm, glândulas de Meibomius)

- Fonte: NOVO ARQUIVO — Grabb & Smith 9ed 2024, Cap 38 Fig 38.1 Panel B (lower eyelid sagittal), pág. 1305
- Decisão: Fig 38.1 Panel B é corte sagital colorido da pálpebra INFERIOR mostrando "Tarsal plate" e "Meibomian glands" explicitamente labelados. Crop isolado no Panel B (superior direito da figura completa), iniciando em x=1340 para excluir completamente Panel A e seus labels. Figura genuinamente diferente do Panel A (card 007) — visão anatômica oposta (pálpebra inferior vs. superior), estruturas diferentes em foco, posição diferente no espaço da página. Mostra o tarso inferior com glândulas de Meibomius — exatamente o conceito do card 009.
- Arquivo final: assets/images/blefaroplastia/blef-anat-tarso-placa-tarsal.png (NOVO — crop de Grabb p1305 a 300 DPI, Panel B)
- Novo manifest ID proposto: img-tarso-001
- Estruturas visíveis: Tarsal plate, Meibomian glands, Capsulopalpebral fascia, Septum, Orbicularis muscle, Retroseptal fat, Inferior rectus muscle, Inferior oblique muscle
- Labels x,y sugeridos (0–1 normalizado):
  - "Tarso inferior": (0.57, 0.22) — label superior-direito, apontando para a placa tarsal
  - "Glândulas de Meibomius": (0.57, 0.38) — abaixo do tarso, estruturas tubulares
  - "Fáscia capsulopalpebral": (0.57, 0.54)
  - "Músculo orbicular": (0.57, 0.75)
- Crédito sugerido: "Grabb and Smith's Plastic Surgery, 9th Ed. Wolters Kluwer 2024, Cap. 38 Fig. 38.1B"

---

## blef-anat-012 — Whitnall (condensação transversal superior, fulcro do levantador)

- Fonte: NOVO ARQUIVO — Neligan Vol 2 Cap 13 Fig 13.28, pág. 608 (panel A)
- Decisão: Nenhuma figura existente mostrava Whitnall's ligament labelado. Fig 13.28 (panel A) mostra claramente "Whitnall's ligament" e "Levator aponeurosis" em visão cirúrgica intraoperatória com gordura preaponeurótica visível — contexto ideal para entender Whitnall como fulcro do levantador.
- Arquivo final: assets/images/blefaroplastia/blef-anat-whitnall-ligamento.png (NOVO — extraído de Neligan p608 a 300 DPI, crop panel A)
- Novo manifest ID proposto: img-whitnall-001
- Labels x,y sugeridos: Whitnall's ligament (centro-superior), Levator aponeurosis (direita), Gordura preaponeurótica (região amarela central)
- Crédito sugerido: "Neligan Plastic Surgery, 5th Ed. Elsevier 2023, Vol. 2 Cap. 13 Fig. 13.28"

---

## blef-anat-018 — Ossos da Órbita (completa, não cropada)

- Fonte: Reuso de `blef-p0592-ossos-da-orbita-vista-lateral-com-cavidade-orbitar.jpeg`
- Decisão: Figura mostra visão lateral da órbita óssea completa (rim orbital, cavidade, processos zigomático/frontal/maxilar visíveis). Adequada para o conceito de ossos orbitários completos. `fig13-1-ossos-orbitarios.jpeg` foi descartada por estar cropada (mostra apenas terço inferior da órbita frontal).
- Arquivo final: assets/images/blefaroplastia/blef-p0592-ossos-da-orbita-vista-lateral-com-cavidade-orbitar.jpeg (reutilizado, sem criação)
- Novo manifest ID proposto: img-ossos-orbita-001
- Labels x,y sugeridos: Rim orbital, Frontal bone, Maxilla, Zygoma, Orbital cavity, Fissuras orbitárias
- Crédito sugerido: "Neligan Plastic Surgery, 5th Ed. Elsevier 2023, Vol. 2 p.592"

---

## blef-anat-019 — ROOF (retro-orbicularis oculi fat, sob orbicular na sobrancelha lateral)

- Fonte: NOVO ARQUIVO — Neligan Vol 2 Cap 11 Fig 11.5, pág. 559
- Decisão: `fig13-16-anatomia-sobrancelha.jpeg` mostrava apenas ramos nervosos zigomáticos (facial VII) com asteriscos cobrindo região da sobrancelha — sem qualquer label de ROOF. Fig 11.5 (cap. forehead rejuvenation) mostra diagrama sagital completo com "Preseptal fat (ROOF)" explicitamente labelado, além de Suborbital fascia, Orbicularis oculi muscle e Orbital septum — contexto perfeito para o conceito.
- Arquivo final: assets/images/blefaroplastia/blef-anat-roof-gordura-retroorbicular.png (NOVO — extraído de Neligan p559 a 300 DPI, crop fig 11.5 panel sagital)
- Novo manifest ID proposto: img-roof-001
- Labels x,y sugeridos: Preseptal fat/ROOF (região inferior-central), Orbicularis oculi muscle (camada muscular), Suborbital fascia, Orbital rim, Orbital septum
- Crédito sugerido: "Neligan Plastic Surgery, 5th Ed. Elsevier 2023, Vol. 2 Cap. 11 Fig. 11.5"

---

## Resumo

| Card | Estratégia | Arquivo | Fonte | ID proposto |
| ---- | ---------- | ------- | ----- | ----------- |
| blef-anat-001 | REUSO | diagrama-camadas-palpebrais.png | Neligan Vol 2 diagrama interno | img-pele-palpebral-001 |
| blef-anat-004 | REUSO | blef-p0592-anatomia-da-orbita-e-compartimentos-de-gordura-per.jpeg | Neligan Vol 2 p.592 | img-gordura-orbital-superior-001 |
| blef-anat-007 | NOVO | blef-anat-muller-musculo-tarsal.png | Grabb & Smith 9ed p.1305 Fig 38.1A | img-musculo-muller-001 |
| blef-anat-009 | NOVO | blef-anat-tarso-placa-tarsal.png | Grabb & Smith 9ed p.1305 Fig 38.1B | img-tarso-001 |
| blef-anat-012 | NOVO | blef-anat-whitnall-ligamento.png | Neligan Vol 2 p.608 Fig 13.28A | img-whitnall-001 |
| blef-anat-018 | REUSO | blef-p0592-ossos-da-orbita-vista-lateral-com-cavidade-orbitar.jpeg | Neligan Vol 2 p.592 | img-ossos-orbita-001 |
| blef-anat-019 | NOVO | blef-anat-roof-gordura-retroorbicular.png | Neligan Vol 2 p.559 Fig 11.5 | img-roof-001 |

Reuso: 3 | Novo arquivo: 4 | Bloqueado: 0
