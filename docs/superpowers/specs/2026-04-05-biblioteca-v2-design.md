# Design: Biblioteca Cirurgia Plastica v2

**Data:** 2026-04-05
**Status:** Aprovado pelo Dr. Arthur
**Escopo:** Reestruturacao completa do sistema de conteudo e entrega

---

## 1. Problema

O sistema v1 produz documentos .docx lineares de 50+ paginas que replicam livros-texto. O Dr. Arthur nao tem rotina de estudo para ler documentos longos. Suas necessidades reais sao:

- Consulta rapida no corredor do hospital (30 segundos para uma resposta)
- Respostas estruturadas a perguntas de preceptores ("quais as 3 tecnicas para ptose?")
- Teste sob demanda para identificar lacunas de conhecimento
- Tudo no celular

O formato linear e inferior ao livro-texto para consulta rapida e inutil para estudo ativo. O esforco de construcao e desproporcional ao valor entregue.

## 2. Solucao

Substituir o pipeline linear por fichas atomicas consumidas via PWA com 5 modos de uso: busca, fichas, pre-op, teste sob demanda e chat IA.

### Arquitetura geral

```
┌─────────────────────────────────────────────────┐
│              INTERFACE (PWA Library)             │
│  Busca . Fichas . Pre-Op . Teste . Chat IA      │
├─────────────────────────────────────────────────┤
│            INTELIGENCIA (AI + Search)            │
│  Busca instantanea . RAG . Teste adaptativo     │
├─────────────────────────────────────────────────┤
│               CONTEUDO (JSON)                    │
│  Fichas atomicas (cards/) + Imagens (assets/)   │
└─────────────────────────────────────────────────┘
```

Principio: construir diretamente as fichas atomicas a partir dos livros. Nao existe documento linear intermediario.

## 3. Conteudo: Fichas Atomicas

### 3.1 Estrutura de arquivos

```
content/cards/
├── estetica-facial/
│   ├── blefaroplastia/
│   │   ├── _meta.json
│   │   ├── anatomia.json
│   │   ├── tecnicas.json
│   │   ├── decisoes.json
│   │   ├── notas.json
│   │   └── flashcards.json
│   ├── rinoplastia/
│   │   └── ...
│   └── ...
├── contorno-corporal/
│   └── ...
└── ...
```

### 3.2 Cinco tipos de ficha

#### Tecnica

Responde a: "Como se faz X? Passo a passo."

```json
{
  "id": "blef-tec-reinserção-aponeurose-meps",
  "type": "technique",
  "title": "Reinsercao da Aponeurose do MEPS",
  "aliases": ["Levator advancement", "Levator repair"],
  "topic": "blefaroplastia",
  "area": "estetica-facial",
  "indication": "Ptose adquirida involucional com funcao do MEPS >= 5 mm",
  "contraindication": "Ptose congenita com funcao do MEPS < 4 mm",
  "steps": [
    "1. Marcacao do sulco palpebral (8-10 mm do bordo ciliar)",
    "2. Incisao cutanea e disseccao do orbicular pre-tarsal",
    "3. Abertura do septo orbital e identificacao da gordura pre-aponevrotica",
    "4. Identificacao da aponeurose do MEPS (branca, brilhante, posterior a gordura)",
    "5. Desinsercao da aponeurose do tarso",
    "6. Avanco e reinsercao com suturas 5-0 absorviveis no terco superior do tarso",
    "7. Ajuste intraoperatorio: sentar paciente, verificar altura e contorno",
    "8. Fechamento cutaneo"
  ],
  "complications": [
    "Hipocorrecao (mais comum) -> reoperacao",
    "Hipercorrecao -> lagoftalmo",
    "Assimetria -> ajuste com suturas"
  ],
  "pearls": [
    "A gordura pre-aponevrotica e o landmark mais confiavel para encontrar a aponeurose",
    "Sempre verificar com paciente sentado antes de fechar"
  ],
  "images": ["blef-13-29-incisao-levantador-plicatura.png"],
  "citations": ["Neligan, 2023, vol. 2, cap. 8", "Core Procedures, 2020, cap. 3"],
  "updates": [],
  "tags": ["ptose", "palpebra superior", "aponeurose", "MEPS"]
}
```

#### Anatomia

Responde a: "O que e X? Onde fica? Como identifico?"

```json
{
  "id": "blef-anat-ligamento-lockwood",
  "type": "anatomy",
  "title": "Ligamento de Lockwood",
  "aliases": ["Lockwood's ligament", "Suspensory ligament of the eye"],
  "topic": "blefaroplastia",
  "area": "estetica-facial",
  "definition": "Condensacao da fascia capsulopalpebral inferior e da bainha do reto inferior que forma uma rede de suporte (hammock) para o globo ocular.",
  "location": "Palpebra inferior, entre os ligamentos cantais medial e lateral, posterior ao septo orbital.",
  "relations": [
    "Superior: globo ocular e musculo reto inferior",
    "Inferior: gordura orbitaria inferior",
    "Medial: ligamento cantal medial",
    "Lateral: ligamento cantal lateral"
  ],
  "surgical_relevance": "Ancora inferior do globo — lesao causa enoftalmo e distopia. Na blefaroplastia inferior transconjuntival, a disseccao deve permanecer anterior ao Lockwood.",
  "how_to_identify": "Apos abertura do septo orbital inferior e retracao da gordura, visualiza-se como faixa fibrosa branca horizontal que conecta os retinaculos cantais. Tracionar a palpebra inferiormente tenciona o ligamento.",
  "images": ["blef-13-2-corte-horizontal-orbita.png"],
  "citations": ["Neligan, 2023, vol. 2, cap. 8"],
  "tags": ["ligamento", "orbita", "palpebra inferior", "suporte"]
}
```

Campos diferenciais vs. livro-texto: `how_to_identify` e `surgical_relevance` — a informacao pratica que o livro enterra em paragrafos.

#### Decisao

Responde a: "Qual a conduta para Y?"

```json
{
  "id": "blef-dec-ptose-palpebral",
  "type": "decision",
  "title": "Escolha de Tecnica para Ptose Palpebral",
  "topic": "blefaroplastia",
  "area": "estetica-facial",
  "trigger": "Paciente com ptose palpebral indicada para correcao cirurgica",
  "steps": [
    {
      "question": "Qual a funcao do MEPS?",
      "options": [
        { "answer": "Boa (>= 10 mm)", "next": "Plicatura ou reinsercao da aponeurose" },
        { "answer": "Moderada (5-9 mm)", "next": "Reinsercao/avanco da aponeurose" },
        { "answer": "Ruim (< 4 mm)", "next": "Suspensao frontal (frontalis sling)" }
      ]
    },
    {
      "question": "Ptose congenita ou adquirida?",
      "options": [
        { "answer": "Congenita com funcao ruim", "next": "Suspensao frontal com fascia lata ou silicone" },
        { "answer": "Adquirida involucional", "next": "Reinsercao da aponeurose (mais comum)" },
        { "answer": "Mecanica/neurogenica", "next": "Tratar causa base primeiro" }
      ]
    }
  ],
  "citations": ["Neligan, 2023, vol. 2, cap. 8", "Grabb & Smith, 2024, cap. 35"],
  "tags": ["ptose", "decisao", "MEPS", "frontalis sling"]
}
```

#### Nota

Para tudo que nao e tecnica, anatomia, decisao ou flashcard: fisiopatologia, principios, contexto historico, nuances entre autores.

```json
{
  "id": "blef-nota-involucao-periorbital",
  "type": "note",
  "title": "Envelhecimento Periorbital — Fisiopatologia",
  "topic": "blefaroplastia",
  "area": "estetica-facial",
  "section": "Fisiopatologia",
  "content": [
    "Deflacao progressiva dos compartimentos de gordura superficial e profundo",
    "Atenuacao do septo orbital -> pseudoherniacao da gordura orbitaria",
    "Perda de suporte osseo (reabsorcao do rebordo orbitario inferior)",
    "Laxidez do tendao cantal lateral -> arredondamento do canto externo",
    "Descenso do midface expoe a transicao palpebra-bochecha (tear trough)"
  ],
  "citations": ["Neligan, 2023, vol. 2, cap. 8", "Grabb & Smith, 2024, cap. 34"],
  "tags": ["envelhecimento", "fisiopatologia", "gordura orbital"]
}
```

Formato bullet-point, nao prosa.

#### Flashcard

Pares pergunta/resposta para teste sob demanda.

```json
{
  "id": "blef-fc-001",
  "type": "flashcard",
  "topic": "blefaroplastia",
  "area": "estetica-facial",
  "cards": [
    {
      "front": "Quais as 3 principais tecnicas cirurgicas para ptose palpebral?",
      "back": "1. Plicatura/reinsercao da aponeurose do MEPS (funcao >= 5mm)\n2. Resseccao do musculo de Muller — Fasanella-Servat (ptose leve, 1-2mm)\n3. Suspensao frontal — frontalis sling (funcao < 4mm)",
      "citation": "Neligan, 2023, vol. 2, cap. 8",
      "domain": "tecnicas"
    }
  ],
  "tags": ["ptose", "anatomia", "palpebra"]
}
```

### 3.3 Metadados por tema (`_meta.json`)

```json
{
  "topic": "blefaroplastia",
  "area": "estetica-facial",
  "displayName": "Blefaroplastia",
  "version": "v1.0",
  "date": "2026-04-05",
  "status": "complete",
  "references": [
    "Neligan 5ed vol.2 caps. 8-9",
    "Grabb & Smith 9ed caps. 34-35",
    "Core Procedures 2ed cap. 3",
    "Operative Dictations caps. 8-10"
  ],
  "articles": [
    "Stein MJ et al. PRS 2025;155(5):895-901"
  ],
  "cardCounts": {
    "anatomia": 18,
    "tecnicas": 12,
    "decisoes": 4,
    "notas": 15,
    "flashcards": 45
  }
}
```

### 3.4 Pipeline de construcao de um tema

```
1. Agente le capitulos relevantes dos PDFs (Neligan + complementares)
2. Produz fichas diretamente:
   a) anatomia.json
   b) tecnicas.json
   c) decisoes.json
   d) notas.json
   e) flashcards.json (gerados a partir das fichas acima)
3. Pipeline de imagens extrai e vincula figuras automaticamente
4. _meta.json preenchido -> tema disponivel na PWA
```

### 3.5 Migracao dos temas existentes

Blefaroplastia e rinoplastia possuem JSONs lineares ricos (~1200 linhas cada). Migracao automatizada:

```
JSON linear existente -> Script extrai cards -> Revisao manual minima
```

### 3.6 Incorporacao de artigos

O fluxo de varredura/aprovacao/incorporacao de artigos continua. A diferenca e que artigos sao incorporados como campos extras nas fichas relevantes:

- Complemento (box azul): campo `updates[]` na ficha
- Mudanca de conduta (box vermelho): flag `paradigm_shift: true` na ficha
- Dica pratica (box verde): adicionado a `pearls[]`

## 4. Imagens: Pipeline Automatizado

### 4.1 Fluxo

```
PDF do livro (300 DPI)
  -> PyMuPDF renderiza paginas como imagem
  -> OpenCV detecta blocos visuais (contornos, whitespace)
  -> Recorta candidatos a figura automaticamente
  -> Claude Haiku (multimodal) classifica cada recorte:
     "Isso e uma figura? O que mostra? A que ficha pertence?"
  -> Galeria de revisao: Dr. Arthur aprova/rejeita (~5 min por capitulo)
  -> Imagens aprovadas -> assets/images/<tema>/ -> vinculadas as fichas
```

### 4.2 Tipos de imagem capturados

- Fotos cirurgicas intraoperatorias
- Diagramas anatomicos esquematicos
- Fluxogramas e algoritmos
- Tabelas ilustrativas
- Desenhos de tecnica cirurgica

### 4.3 Revisao pelo Dr. Arthur

Galeria HTML simples (ou reutilizar PWA de aprovacao):
- Miniatura de cada recorte
- Legenda sugerida pela IA
- Botoes aprovar/rejeitar
- ~5 minutos por capitulo (vs. ~2 horas de screenshots manuais)

### 4.4 Armazenamento

Imagens aprovadas em `assets/images/<tema>/`, referenciadas pelo campo `images[]` nas fichas. Nomeacao: `<sigla>-<fig>-<descricao>.png`.

## 5. PWA Library

### 5.1 Cinco modos de uso

#### Busca (tela inicial)

- Busca instantanea offline sobre todas as fichas
- Pesquisa em titulo, aliases, tags, conteudo
- Resultados agrupados por tipo (anatomia, tecnica, decisao)
- Tap -> abre ficha completa

#### Ficha (unidade de consumo)

- Renderiza qualquer tipo de ficha com destaque visual para campos-chave
- Anatomia: `Relevancia Cirurgica` e `Como Identificar` em destaque
- Tecnica: `Steps` e `Pearls` em destaque
- Imagens inline
- Citacoes no rodape

#### Modo Pre-Op

- Input: "Vou operar [procedimento]"
- Output: briefing montado automaticamente combinando fichas por tags:
  - Anatomia relevante (colapsavel)
  - Tecnica passo a passo
  - Complicacoes
  - Pearls
  - Botao "Me testa sobre isto"

#### Teste Sob Demanda

- Input: "Me testa sobre [tema]"
- Sistema gera 10 questoes (ponderadas por fraquezas anteriores)
- Questoes abertas (texto livre) — simula pergunta de preceptor
- IA avalia resposta contra ficha atomica
- Feedback parcial: "acertou X, faltou Y"
- Resultado final: nota crua + diagnostico por dominio + links para fichas
- Perfil de conhecimento armazenado localmente (localStorage)
- Score decai suavemente com o tempo (sem "cards vencidos", sem obrigacao)
- Tipos de questao: listagem, identificacao visual, aplicacao clinica, passo-a-passo, complicacao

#### Chat IA

- Perguntas livres em linguagem natural
- RAG: fichas atomicas do tema como contexto
- Para comparacoes, nuances, perguntas que nao encaixam em ficha
- Requer internet (Claude API)

### 5.2 Offline vs Online

| Funcionalidade | Online? |
|---|---|
| Busca em fichas | Offline |
| Exibir ficha | Offline |
| Montar briefing pre-op | Offline |
| Gerar questoes de teste | Online (Claude Haiku) |
| Avaliar resposta do teste | Online (Claude Haiku) |
| Chat livre | Online (Claude Sonnet) |

Tudo que pode funcionar offline, funciona offline.

### 5.3 Fallback offline para testes

- Questoes pre-geradas (cache da ultima sessao online)
- Auto-correcao: mostra resposta esperada, usuario julga
- Sincroniza resultado quando voltar online

## 6. Motor de Teste — Detalhamento

### 6.1 Perfil de conhecimento

```json
{
  "blefaroplastia": {
    "lastTested": "2026-04-03",
    "sessions": 4,
    "domains": {
      "anatomia-orbital": { "score": 0.9, "attempts": 12 },
      "tecnicas-superior": { "score": 0.7, "attempts": 8 },
      "tecnicas-inferior": { "score": 0.5, "attempts": 6 },
      "complicacoes": { "score": 0.3, "attempts": 4 }
    }
  }
}
```

### 6.2 Ponderacao adaptativa

- Dominios fracos recebem mais questoes (~50% das questoes)
- Dominios fortes recebem manutencao (~20%)
- Dominios nunca testados recebem exploracao (~30%)
- Score decai suavemente com o tempo (fator: dias desde ultimo teste)

### 6.3 Feedback

- Nota crua: "7/10"
- Por dominio: "Anatomia 3/3, Tecnicas 2/3, Complicacoes 1/3"
- Diagnostico textual direto, sem gamificacao
- Links para fichas que precisa revisar

## 7. Artefatos Descontinuados

| Artefato | Destino |
|---|---|
| `content/estetica-facial/*.json` (linear) | Migrado para cards -> arquivado |
| `tools/create_docx.js` | Descontinuado |
| `tools/incorporate_article.js` | Adaptado para fichas atomicas |
| `tools/validate_content.js` | Adaptado para novo schema |
| `content/schema.json` | Reescrito para schema atomico |
| `01-Documentos-Estudo/*.docx` | Nao mais gerados |
| Fluxo manual de imagens | Substituido pelo pipeline automatizado |
| `tools/extract_labeled_figures.py` | Substituido pelo pipeline OpenCV |

## 8. Fases de Construcao

| Fase | Entrega | Valor |
|---|---|---|
| **1** | Schema atomico + migracao blef/rino + PWA (busca + fichas + pre-op) | Consulta rapida no celular |
| **2** | Pipeline de imagens automatizado | Figuras em todas as fichas sem esforco manual |
| **3** | Motor de teste + perfil adaptativo | "Me testa sobre blefaroplastia" |
| **4** | Chat IA (RAG) | Perguntas livres |
| **5** | Expansao continua (tema a tema) | Cobertura da especialidade |

## 9. Custos

| Item | Estimativa |
|---|---|
| Hosting PWA | Gratuito (GitHub Pages) |
| API Claude (testes + chat) | ~$5/mes uso moderado |
| API Claude (imagens, por tema) | ~$1-2 por tema (uma vez) |
| Total mensal em regime | < $10/mes |

## 10. Criterio de Sucesso

O sistema e bem-sucedido quando:

1. Dr. Arthur consegue responder uma pergunta de preceptor em < 30 segundos usando a PWA
2. O modo pre-op entrega um briefing util antes de uma cirurgia
3. O modo teste identifica lacunas reais de conhecimento e orienta estudo
4. Adicionar um novo tema nao requer trabalho manual de imagens pelo Dr. Arthur (alem de 5 min de revisao)
5. O sistema e usado de fato no dia-a-dia, nao abandonado como os .docx
