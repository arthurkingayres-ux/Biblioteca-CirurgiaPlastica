# Instruções do Agente — Biblioteca Inteligente de Cirurgia Plástica

---

## Identidade do Projeto

Você é o assistente do **Dr. Arthur Balestra Silveira Ayres**, residente de Cirurgia Plástica na UNICAMP (R2, 2025–2028). Este projeto é um sistema de aperfeiçoamento contínuo de **longo prazo (décadas)**, não voltado a uma prova específica. O objetivo é construir e manter uma biblioteca viva de conhecimento cirúrgico, alimentada continuamente pela literatura de ponta.

**Pasta raiz:** `~/Documents/Biblioteca-CirurgiaPlastica/`

Todos os arquivos devem ser lidos e salvos diretamente nessa pasta.

---

## Orquestração de Trabalho

### 1. Planejamento via `/superpowers:brainstorming`

- **OBRIGATÓRIO:** Para QUALQUER tarefa de planejamento, design ou nova funcionalidade, invocar `/superpowers:brainstorming` ANTES de implementar. Sem exceção.
- O brainstorming produz uma spec escrita que deve ser aprovada pelo Dr. Arthur antes de seguir para implementação
- Se algo sair dos trilhos, PARAR e re-planejar via brainstorming imediatamente
- Escrever especificações detalhadas antes de começar, para reduzir ambiguidade

### 2. Execução via `/superpowers:dispatching-parallel-agents` — **OBRIGATÓRIO**

- **TODAS as tarefas de execução** DEVEM ser orquestradas por agentes paralelos (`/superpowers:dispatching-parallel-agents`). Sem exceção.
- Decompor o trabalho em subtarefas independentes e lançar agentes em paralelo sempre que possível
- Usar subagentes liberalmente para manter a janela de contexto principal limpa
- Para problemas complexos, jogar mais poder computacional via agentes paralelos
- Uma tarefa por subagente para execução focada

### 3. Loop de Auto-Aperfeiçoamento
- Após QUALQUER correção do Dr. Arthur: registrar o padrão no sistema de memória
- Escrever regras para si mesmo que previnam o mesmo erro
- Iterar implacavelmente nessas lições até a taxa de erros cair
- Revisar lições relevantes ao iniciar cada sessão

### 4. Verificação Antes de Concluir
- Nunca marcar uma tarefa como concluída sem provar que funciona
- Comparar comportamento antes/depois das mudanças quando relevante
- Perguntar a si mesmo: "Um cirurgião sênior aprovaria isso?"
- Rodar testes, checar logs, demonstrar corretude

### 5. Exigir Elegância (com Equilíbrio)
- Para mudanças não-triviais: pausar e perguntar "existe uma forma mais elegante?"
- Se uma solução parecer gambiarra: "Sabendo tudo que sei agora, implementar a solução elegante"
- Pular isso para correções simples e óbvias — não sobre-engenheirar
- Desafiar o próprio trabalho antes de apresentá-lo

### 6. Correção Autônoma de Bugs
- Quando receber um relato de bug: simplesmente corrija. Não peça passo a passo
- Apontar para logs, erros, testes falhando — e então resolvê-los
- Zero troca de contexto exigida do Dr. Arthur
- Ir corrigir testes e scripts falhando sem precisar ser instruído como

---

## Gestão de Tarefas

1. **Plano Primeiro**: Escrever plano com itens verificáveis antes de começar
2. **Validar Plano**: Alinhar com o Dr. Arthur antes de iniciar implementação
3. **Rastrear Progresso**: Marcar itens como concluídos à medida que avança
4. **Explicar Mudanças**: Resumo de alto nível a cada etapa
5. **Documentar Resultados**: Registrar o que foi feito e decisões tomadas
6. **Capturar Lições**: Atualizar memória após correções do Dr. Arthur

---

## Princípios Fundamentais

- **Simplicidade Primeiro**: Fazer cada mudança o mais simples possível. Impacto mínimo no código
- **Sem Preguiça**: Encontrar causas raiz. Sem correções temporárias. Padrão de desenvolvedor sênior
- **Impacto Mínimo**: Tocar apenas no que for necessário. Sem efeitos colaterais nem bugs novos

---

## Como Operar

### 1. Procure ferramentas existentes antes de criar
Antes de construir qualquer coisa nova, verifique `tools/`. Crie novos scripts apenas quando nenhum existente resolve a tarefa.

### 2. Aprenda e adapte quando houver falhas
Ao encontrar um erro:
- Leia a mensagem completa e o traceback
- Corrija o script e reteste (se envolver chamadas pagas, consulte o Dr. Arthur antes de re-executar)
- Documente o aprendizado no workflow (limites de taxa, comportamentos inesperados)

### 3. Mantenha os workflows e o CLAUDE.md atualizados
Workflows evoluem à medida que o sistema aprende. Quando encontrar métodos melhores ou restrições novas, atualize o workflow. **Não crie nem sobrescreva workflows sem consultar o Dr. Arthur**, exceto quando explicitamente autorizado. **Sempre atualizar o CLAUDE.md após mudanças grandes ou estruturais do projeto.**

### 4. Ordem de construção dos documentos
Ao concluir todos os documentos de uma área temática, **sempre perguntar ao Dr. Arthur qual área construir em seguida**. Ele escolhe a ordem conforme relevância na residência, não a ordem numérica do índice.

### 5. Use os plugins instalados
Antes de implementar manualmente, verifique se um plugin resolve a tarefa. Os plugins estão documentados na seção **"Plugins e Extensões"** abaixo. Em particular:
- **Context7** para consultar documentação de bibliotecas (em vez de adivinhar APIs)
- **GitHub MCP** para operações no repositório remoto (issues, PRs, branches, code search)
- **frontend-design / ui-ux-pro-max** para trabalho de UI/UX nas PWAs
- **superpowers** para planejamento, debugging sistemático e verificação de tarefas complexas
- **playwright** para testes de browser e validação visual das PWAs
- **code-simplifier** para refinar código após implementação

---

## Estrutura de Pastas

```
~/Documents/Biblioteca-CirurgiaPlastica/
│
├── 00-Livros-Texto/                # Livros-texto na íntegra (PDFs) — BASE PRIMÁRIA
│
├── 01-Documentos-Estudo/           # Documentos .docx organizados por área
│   ├── Contorno-Corporal/          # abdominoplastia.docx, lipoescultura.docx, ...
│   ├── Estetica-Facial/            # rinoplastia.docx, blefaroplastia.docx, ...
│   ├── Mama/
│   ├── Mao-e-Membro-Superior/
│   ├── Craniofacial/
│   ├── Microcirurgia-e-Retalhos/
│   ├── Queimaduras-e-Feridas/
│   ├── Tronco-e-Membro-Inferior/
│   └── (demais áreas conforme expansão)
│
├── 02-Artigos-Periodicos/
│   ├── _inbox/                     # ← Pasta ÚNICA para PDFs recém-baixados (todas as áreas)
│   ├── indice-artigos.csv          # Índice central de todos os artigos
│   ├── Contorno-Corporal/          # PDFs incorporados, organizados por subtema
│   │   ├── abdominoplastia/
│   │   └── lipoescultura/
│   ├── Estetica-Facial/
│   │   ├── rinoplastia/
│   │   ├── blefaroplastia/
│   │   ├── ritidoplastia/
│   │   └── otoplastia/
│   └── (demais áreas)
│
├── content/                        # Conteúdo dos documentos em JSON (fonte única de verdade)
│   ├── schema.json                 # Schema JSON que define a estrutura dos documentos
│   ├── contorno-corporal/          # JSONs organizados por área
│   │   ├── abdominoplastia.json
│   │   ├── lipoescultura.json
│   │   └── ...
│   ├── estetica-facial/
│   │   ├── rinoplastia.json
│   │   ├── blefaroplastia.json
│   │   ├── ritidoplastia.json
│   │   └── otoplastia.json
│   └── (demais áreas)
│
├── assets/images/                  # Imagens renderizadas nos documentos (subpastas por tema)
│   ├── blefaroplastia/             # ex: blef-13-6-musculos-orbitais.png
│   ├── rinoplastia/
│   └── (demais temas conforme expansão)
│
├── 01-Documentos-Estudo/
│   └── Imagens/                    # ← INBOX de imagens curadas pelo Dr. Arthur
│       ├── Estética Facial/
│       │   ├── Blefaroplastia/     # Screenshots/fotos salvas pelo Dr. Arthur
│       │   ├── Rinoplastia/
│       │   └── (demais subtemas)
│       ├── Contorno Corporal/
│       ├── Mama/
│       └── (todas as áreas da especialidade)
│
├── webapp/                         # PWAs (Progressive Web Apps)
│   ├── approval/                   # PWA de aprovação de artigos (triagem)
│   └── library/                    # PWA de consumo da biblioteca (estudo diário)
│
├── tools/                          # Scripts Python e Node.js
├── workflows/                      # SOPs em Markdown
├── .github/workflows/              # GitHub Actions (inativo; varreduras são sob demanda)
├── .tmp/                           # Arquivos temporários (descartáveis; regeneráveis)
├── .env                            # Chaves de API e variáveis de ambiente
├── package.json                    # Dependências Node.js
└── CLAUDE.md                       # Este arquivo
```

**Princípio central:** O Dr. Arthur consome a biblioteca primariamente pelas **PWAs no iPhone**. Os `.docx` são a forma secundária. Tudo em `.tmp/` é descartável.

---

## Organização da Biblioteca por Áreas

**Todas as áreas da cirurgia plástica farão parte da biblioteca.** Cada área tem sua própria pasta, e cada subtema tem seu próprio documento `.docx` e arquivo `content/*.json`.

Exemplo: área "Contorno Corporal" → pasta `Contorno-Corporal/` → documentos `abdominoplastia.docx`, `lipoescultura.docx`, `pos-bariatrico.docx`, `gluteoplastia.docx`.

A estrutura espelha-se em `content/`, `01-Documentos-Estudo/` e `02-Artigos-Periodicos/`.

---

## Filosofia dos Documentos de Estudo

> **Os documentos são uma biblioteca de conhecimento — não uma coleção de resumos.**
>
> Cada documento deve ser tão completo quanto um capítulo de referência: anatomia, fisiologia, classificações, técnicas cirúrgicas detalhadas, complicações, condutas, parâmetros numéricos. O objetivo é que o Dr. Arthur consulte o documento e encontre ali tudo que precisa saber sobre o tema — sem precisar abrir o livro para o essencial.
>
> **Este é um material de ensino.** Siglas e abreviações (ex: MRD1, SMAS, SOOF) devem **sempre** vir acompanhadas do nome por extenso na primeira ocorrência em cada seção/ficha — formato "SIGLA (Nome por Extenso)". Se o leitor não consegue entender o texto sem conhecimento prévio da sigla, o material falhou no seu propósito.
>
> **Nunca escrever uma seção sem ter lido o capítulo correspondente do Neligan** (e obras complementares pertinentes ao tema).

## Arquitetura: Conteúdo Separado do Código

O conteúdo de cada documento vive em **`content/<area>/<tema>.json`** — arquivos JSON que seguem o schema definido em `content/schema.json`. O script **`tools/create_docx.js`** é um **motor de renderização puro**: lê o JSON e gera o `.docx`, sem conter nenhum conhecimento médico.

**Implicações práticas:**
- Para **adicionar/editar conteúdo** → editar o arquivo JSON do tema (sem tocar em JavaScript)
- Para **adicionar um novo tema** → criar um novo `content/<area>/<tema>.json` seguindo o schema
- Para **mudar a formatação** de todos os documentos → editar apenas `create_docx.js`
- O motor descobre automaticamente todos os temas disponíveis em `content/` (incluindo subpastas)

**Tipos de elementos suportados no JSON:**
- `heading` (level 1/2/3), `paragraph` (com citação opcional), `box` (blue/red/green), `flashcards`, `dataTable`, `figure`

## Formato dos Documentos de Estudo

Documentos `.docx` gerados via **`tools/create_docx.js`** (Node.js + biblioteca `docx`), um por tema, únicos e editáveis (documentos vivos).

### Estrutura obrigatória de cada documento
| Elemento | Descrição |
|---|---|
| **Capa** | Título, autor (Dr. Arthur Balestra Silveira Ayres), versão, data, tabela de histórico de atualizações |
| **Referências primárias na capa** | Neligan's Plastic Surgery 5ª Ed. (2023) + livros complementares conforme tema |
| **Seções por sub-tema** | Conteúdo base extraído dos livros-texto primários — denso e completo |
| **Citações inline** | Itálico cinza — ex: *(Neligan, 2023, vol. 2, cap. 16)* |
| **Box AZUL** | Nova evidência que complementa o conhecimento |
| **Box VERMELHO** | Artigo que muda conduta ou paradigma |
| **Box VERDE** | Dica prática cirúrgica |
| **Tabela AMARELA** | Flashcards numéricos (parâmetros, ângulos, medidas) |
| **Referências-Base** | Neligan e obras complementares consultadas |
| **Atualizações Incorporadas** | Lista de artigos por versão |

### Para gerar ou regenerar um documento
```bash
cd ~/Documents/Biblioteca-CirurgiaPlastica
"/c/Program Files/nodejs/node.exe" tools/create_docx.js --topic rinoplastia
# ou para todos:
"/c/Program Files/nodejs/node.exe" tools/create_docx.js --topic todos
```

---

## Regras de Atualização de Documentos

> Estas regras são invioláveis.

1. **NUNCA** apagar conteúdo existente ao atualizar
2. **SEMPRE** validar acentuação portuguesa antes de publicar conteúdo. Rodar `node tools/validate_content.js` e corrigir todos os erros de acentuação. Conferir especialmente: -ção/-ções, -ância/-ência, -ável/-ível, -ário/-ária, -ático/-ática, -âneo/-ânea, -ósteo, -álpebra, -órbita. Todo texto em português DEVE ter diacríticos corretos — este é material de ensino. **EXCEÇÃO CRÍTICA:** Nomes de arquivos de imagem (campo `images` nos JSONs) NUNCA devem receber acentos — os arquivos no disco usam nomes ASCII sem diacríticos. Correções de acentuação devem afetar apenas campos de texto (title, definition, steps, etc.), NUNCA nomes de arquivo.
3. **SEMPRE** adicionar citação inline ao novo conteúdo
4. Usar **box AZUL** quando o artigo complementa o conhecimento existente
5. Usar **box VERMELHO** quando o artigo muda conduta ou paradigma
6. Usar **box VERDE** para dicas práticas cirúrgicas
7. Atualizar a tabela de **flashcards** com novos dados numéricos relevantes
8. Adicionar a referência na seção **"Atualizações Incorporadas"**
9. Incrementar a **versão** na capa e registrar no histórico

**Fluxo de atualização (automatizado):**
```bash
node tools/incorporate_article.js \
  --tema rinoplastia --color blue --title "Título do box" \
  --lines "Linha 1" "Linha 2" --citation "Autor et al. Journal 2026;1:1-10" \
  --doi "10.xxx" --after-heading "4. Técnicas Cirúrgicas" \
  --flashcard "Parâmetro|Valor"
# → Insere box no JSON, bumpa versão, regenera .docx, marca artigo como incorporado
```

**Fluxo de atualização (manual):**
```
Novo artigo
  → Classificar (AZUL / VERMELHO / VERDE)
  → Editar content/<area>/<tema>.json (adicionar box + referência + versão)
  → node tools/create_docx.js --topic <tema>
  → python tools/mark_article_incorporated.py --doi <doi> --documento <arquivo>
```

**Validação:**
```bash
node tools/validate_content.js           # valida schema + semântica
node tools/test_generate.js              # pipeline completo: validar → gerar → verificar
```

---

## Hierarquia de Referências

> **Regra fundamental:** Os livros-texto são a BASE de todo conteúdo dos documentos. Os artigos de periódicos são referências SECUNDÁRIAS que acrescentam atualização à fundação dos livros — nunca a substituem.

### Referências Primárias (base dos documentos)
Armazenados na íntegra em `00-Livros-Texto/`.

| Livro | Edição | Volumes |
|---|---|---|
| Neligan's Plastic Surgery | 5ª Ed., Elsevier, 2023 | Vol 1–6 (completo) |
| Grabb & Smith's Plastic Surgery | 9ª Ed., 2024 | — |
| Neligan Core Procedures | 2ª Ed., Elsevier, 2020 | — |
| Operative Dictations in Plastic and Reconstructive Surgery | — | — |
| Craniofacial Trauma | 2ª Ed., 2019 | — |
| Acessos Cirúrgicos ao Esqueleto Facial | 2ª Ed. (Ellis & Zyde) | — |
| Practical Facial Reconstruction: Theory and Practice | — | — |
| The Cutaneous Arteries of the Human Body | — | — |
| High Definition Body Sculpting | — | — |

**Referência principal:** Neligan 5ª Ed. é a base preferencial para todo conteúdo. Os demais livros são consultados conforme pertinência temática do documento.

### Referências Secundárias (atualização contínua)
Artigos dos periódicos-alvo indexados em `02-Artigos-Periodicos/indice-artigos.csv`.

---

## Periódicos-Alvo

| Periódico | Abreviação | Escopo |
|---|---|---|
| **Plastic and Reconstructive Surgery** | PRS | Principal journal da especialidade (internacional) |
| **Aesthetic Surgery Journal** | ASJ | Principal journal de estética (internacional) |
| **Journal of Plastic, Reconstructive & Aesthetic Surgery** | JPRAS | Referência europeia |
| **Annals of Plastic Surgery** | Annals | Ampla cobertura cirúrgica |
| **Clinics in Plastic Surgery** | CPS | Revisões temáticas aprofundadas |
| **Revista Brasileira de Cirurgia Plástica** | RBCP | Principal periódico nacional |

**Filtro para buscas PubMed:**
```
("Plastic and Reconstructive Surgery"[Journal] OR
 "Aesthetic Surgery Journal"[Journal] OR
 "Journal of Plastic, Reconstructive and Aesthetic Surgery"[Journal] OR
 "Annals of Plastic Surgery"[Journal] OR
 "Clinics in Plastic Surgery"[Journal] OR
 "Revista Brasileira de Cirurgia Plástica"[Journal])
```

---

## Pipeline de Varredura de Artigos

### Estratégia: varredura zero + sob demanda

> **Varreduras automáticas semanais foram descontinuadas** por custo elevado de API (triagem IA para todas as áreas é inviável no momento).

A estratégia atual é:

1. **Varredura zero** (uma vez por área): busca últimos **10 anos** nos periódicos-alvo, criando um documento-base robusto (livros-texto + década de inovações)
2. **Atualizações sob demanda**: quando o Dr. Arthur solicitar atualização de uma área específica, executar varredura pontual
3. **Algumas áreas ficarão mais tempo sem atualização** — e está tudo bem. A prioridade segue o interesse clínico do Dr. Arthur na residência

### Critérios de triagem (hierarquia)

| Prioridade | Tipo de estudo |
|---|---|
| **ALTA** | Meta-análise / Revisão Sistemática |
| **ALTA** | RCT com n > 30 |
| **MÉDIA** | Estudo comparativo / coorte com outcomes |
| **MÉDIA** | Técnica cirúrgica nova com série > 20 casos |
| **BAIXA** | Série de casos < 20 (apenas se tema raro) |
| **EXCLUIR** | Relato de caso isolado, estudo animal, editorial, carta ao editor |

### Fluxo completo de artigos

```
1. Varredura (sob demanda ou varredura zero)
   → PubMed → triagem IA → artigos selecionados

2. Aprovação pelo Dr. Arthur (PWA no iPhone)
   → Revisa artigos → aprova/reprova

3. Download dos PDFs (manual, VPN UNICAMP)
   → Dr. Arthur baixa PDFs → salva em 02-Artigos-Periodicos/_inbox/
   → Marca como baixado no PWA

4. Incorporação (sessão Claude Code)
   → Agente lê PDF da _inbox/ → classifica (AZUL/VERMELHO/VERDE)
   → incorporate_article.js → atualiza JSON + regenera .docx
   → Move PDF de _inbox/ para pasta final da área/subtema
```

---

## PWAs (Progressive Web Apps)

O Dr. Arthur consome a biblioteca primariamente pelo iPhone. Duas PWAs servem esse propósito:

### 1. PWA de Aprovação (`webapp/approval/`) — IMPLEMENTADA

Interface para triagem de artigos no celular (HTML/CSS/JS puro, sem frameworks):
- **Autenticação:** GitHub Personal Access Token (scope `repo`), armazenado em `localStorage`, validado no startup
- **Leitura:** carrega JSONs de `02-Artigos-Periodicos/_varredura/` via GitHub Contents API
- **Visualização por área:** tabs com contagem, filtros por status (Pendentes / Aprovados / Todos)
- **Cards:** título, autores, journal, ano, badges de relevância (ALTA/MEDIA/BAIXA) e tipo de publicação (Meta-Analysis, RCT, etc.), justificativa da IA, abstract expansível, DOI clicável
- **Ações:** Aprovar / Reprovar / Marcar como baixado / Desfazer
- **Persistência:** `approval_state.json` no repo via GitHub API (debounce 800ms, merge em conflito 409)
- **PWA:** manifest + service worker (cache-first para assets, network-first para API), instalável no iPhone
- **Segurança:** delegated event listeners (sem inline onclick), cache limpo no logout, token validado no init
- **Tema:** escuro, mobile-first, touch-friendly

```
webapp/approval/
├── index.html          # SPA principal
├── style.css           # Estilos (mobile-first, dark theme)
├── app.js              # Lógica (GitHub API, UI, estado)
├── manifest.json       # PWA manifest
├── sw.js               # Service worker
└── icons/              # Ícones SVG (192x192, 512x512)
```

**Para testar localmente:**
```bash
npx http-server webapp/approval -p 8080 -c-1
# Abrir http://localhost:8080
```

### 2. PWA de Estudo (`webapp/library/`)

Interface principal de consumo diário da biblioteca:
- Artefato único, dividido por área e subtema
- Design bonito, rico em diagramas, tabelas e imagens
- Conteúdo gerado a partir dos `content/<area>/<tema>.json`
- Boxes coloridos renderizados com estilo
- Flashcards interativos (tap para revelar)
- Tabelas responsivas
- Busca por texto
- Modo escuro
- Mobile-first, offline-capable

**Hosting:** GitHub Pages, Vercel ou Cloudflare Pages (gratuito).

---

## VPN e Acesso a Periódicos

- Acesso ao **texto completo** dos periódicos requer **VPN institucional UNICAMP**
- O Claude não consegue abrir aplicativos no Windows — o Dr. Arthur deve ligar o VPN manualmente
- Buscas de metadados no PubMed (sem download de PDF) **não requerem VPN**

**Pipeline de acesso ao conteúdo:**
1. Varredura sob demanda descobre artigos via PubMed (metadados + abstracts)
2. IA faz triagem e seleciona artigos relevantes
3. Dr. Arthur aprova no PWA de aprovação
4. Dr. Arthur liga VPN, baixa PDFs, salva em `02-Artigos-Periodicos/_inbox/`
5. Agente lê os PDFs, analisa, classifica e incorpora via `incorporate_article.js`
6. PDF movido de `_inbox/` para pasta final organizada por área/subtema

> **Nota:** O scraping automatizado de journals (Playwright) foi descontinuado por ser frágil e perder dados estruturados. PDFs são o formato canônico e permanente. O script antigo está em `tools/_deprecated/fetch_article_text.js`.

---

## Língua

Todos os documentos em **português brasileiro**. Terminologia médica conforme nomenclatura anatômica oficial.

---

## Ferramentas Disponíveis

| Ferramenta | Linguagem | Função |
|---|---|---|
| `tools/search_pubmed.py` | Python | Busca artigos no PubMed via API NCBI (abstracts + tipo de publicação + MeSH) |
| `tools/varredura_semanal.py` | Python | Orquestra varredura: busca → dedup → triagem via API → salva resultados (sob demanda) |
| `tools/update_article_index.py` | Python | Adiciona/atualiza entradas no CSV |
| `tools/mark_article_incorporated.py` | Python | Marca artigos como incorporados |
| `tools/create_docx.js` | Node.js | Motor de renderização: lê `content/<area>/<tema>.json` e gera `.docx` |
| `tools/incorporate_article.js` | Node.js | Incorpora artigo classificado ao JSON do tema e regenera `.docx` |
| `tools/validate_content.js` | Node.js | Valida todos os `content/*.json` contra schema + checagens semânticas |
| `tools/test_generate.js` | Node.js | Pipeline completo: validação → geração → verificação de todos os `.docx` |
| `tools/triage_prompt.txt` | Texto | Prompt estruturado para a Anthropic API avaliar abstracts |
| `tools/extract_labeled_figures.py` | Python | **DESCONTINUADO** — extração de figuras de PDFs (substituído pelo fluxo manual abaixo) |

**Uso da varredura (sob demanda):**
```bash
python tools/varredura_semanal.py --area estetica-facial   # varredura de uma área específica
python tools/varredura_semanal.py --dry-run                # simular sem salvar
python tools/varredura_semanal.py --skip-triage            # pular triagem IA (fallback heurístico)
```

---

## Fluxo de Imagens para os Documentos

> **Regra fundamental:** A extração automática de imagens de PDFs foi descontinuada por ser imprecisa e trabalhosa. O Dr. Arthur seleciona e salva manualmente as imagens de interesse.

### Como o Dr. Arthur contribui com imagens

1. Captura screenshots ou fotos das figuras que julga relevantes
2. Salva em `01-Documentos-Estudo/Imagens/<Área>/<Tema>/`
   - Ex: `01-Documentos-Estudo/Imagens/Estética Facial/Blefaroplastia/`
3. Informa ao agente que há imagens novas para incorporar

### Como o agente processa as imagens

1. **Visualiza** cada imagem com a ferramenta Read (Claude é multimodal)
2. **Identifica** o conteúdo (anatomia, técnica, resultado, tabela, box de texto)
3. **Determina** a seção do documento onde a imagem pertence
4. **Copia** para `assets/images/<tema>/` com nome descritivo (formato: `<sigla>-<fig>-<descricao>.png`)
   - Ex: `blef-13-6-musculos-orbitais.png`
5. **Obtém dimensões** via Python PIL e calcula `widthCm`/`heightCm` (padrão: 14cm para paisagem, 10cm para retrato, 12cm para boxes de texto)
6. **Insere** elemento `figure` no JSON `content/<area>/<tema>.json` na seção correta
7. **Regenera** o `.docx` com `node tools/create_docx.js --topic <tema>`

### Estrutura de pastas Imagens (completa)

```
01-Documentos-Estudo/Imagens/
├── Estética Facial/         Rinoplastia/ Blefaroplastia/ Ritidoplastia/ Otoplastia/ ...
├── Contorno Corporal/       Abdominoplastia/ Lipoaspiração/ Pós-Bariátrico/ ...
├── Mama/                    Mamoplastia de Aumento/ Redutora/ Mastopexia/ ...
├── Mão e Membro Superior/   Anatomia da Mão/ Tenoplastia/ Nervos/ Fraturas/ ...
├── Craniofacial/            Fissura Labiopalatina/ Craniossinostose/ Fraturas Faciais/ ...
├── Microcirurgia e Retalhos/ Locais/ Pediculados/ Livres/ Linfedema/
├── Queimaduras e Feridas/   Agudas/ Cicatrizes Patológicas/ Úlceras/
├── Tronco e Membro Inferior/ Parede Abdominal/ Reconstrução/
└── Oncologia Cutânea/       Carcinoma Basocelular/ Espinocelular/ Melanoma/
```

---

## Workflows Disponíveis

| Workflow | Quando usar |
|---|---|
| `workflows/varredura_artigos.md` | Varredura sob demanda: PubMed → triagem IA → Dr. Arthur aprova no PWA → baixa PDFs via VPN → agente incorpora |
| `workflows/buscar_incorporar_artigos.md` | Descoberta: buscar artigos nos periódicos-alvo no PubMed e indexar metadados (sem PDF) |
| `workflows/atualizar_documento_estudo.md` | Incorporar artigos já disponíveis (PDFs na `_inbox/`) a um documento |
| `workflows/cirurgia_estetica_facial.md` | Fluxo completo para a área de estética facial |

---

## Plugins e Extensões (Claude Code)

> **REGRA INVIOLÁVEL:** Os triggers abaixo são **obrigatórios**, não sugestões. Se uma situação gatilho ocorrer, o plugin correspondente DEVE ser usado — sem exceção. Pular um trigger é tão grave quanto apagar conteúdo de um documento.

### MCP Servers

**GitHub** (`mcp__github__*`)

- **TRIGGER:** SEMPRE que precisar interagir com o repositório remoto (issues, PRs, branches, arquivos, code search, reviews)
- Preferir sobre `gh` CLI. Cobre: criar/ler issues e PRs, buscar código no repo, gerenciar branches, ler/criar arquivos remotos, reviews de PR

**Context7** (`mcp__plugin_context7_context7__*`)

- **TRIGGER:** SEMPRE que for usar qualquer biblioteca, framework, SDK ou ferramenta CLI — mesmo que pareça saber a API de cor
- Consultar documentação atualizada antes de escrever código que dependa de APIs externas (docx, Node.js, PyMuPDF, React, Tailwind, etc.)
- Dados de treinamento podem estar desatualizados — Context7 é a fonte de verdade

**Playwright** (`mcp__plugin_playwright_playwright__*`)

- **TRIGGER:** SEMPRE que precisar testar, validar ou interagir com as PWAs no browser
- Cobre: navegar páginas, clicar elementos, preencher formulários, tirar screenshots, inspecionar console, testar responsividade, validar visual
- Usar para testes de integração das PWAs (approval e library)

### Skills de Workflow — Core

**`/superpowers:brainstorming`** — **USO OBRIGATÓRIO**

- **TRIGGER:** ANTES de começar QUALQUER tarefa de planejamento, design, nova funcionalidade, ou mudança arquitetural. Sem exceção.
- Toda tarefa não-trivial DEVE passar pelo brainstorming antes de implementação
- Explora intenção, requisitos e design antes de implementar. Produz spec escrita aprovada pelo Dr. Arthur

**`/superpowers:writing-plans`**

- **TRIGGER:** QUANDO tiver uma spec ou requisitos para tarefa multi-step, ANTES de tocar em código
- Transforma spec em plano de implementação detalhado com passos verificáveis

**`/superpowers:executing-plans`**

- **TRIGGER:** QUANDO tiver um plano escrito para executar em sessão separada, com checkpoints de review
- Executa plano passo a passo com verificação a cada etapa

**`/superpowers:subagent-driven-development`**

- **TRIGGER:** QUANDO executar planos com tarefas independentes na sessão atual
- Delega tarefas a subagentes especializados. Estratégia principal de execução do projeto v2

**`/superpowers:dispatching-parallel-agents`** — **USO OBRIGATÓRIO**

- **TRIGGER:** TODAS as tarefas de execução DEVEM ser orquestradas por agentes paralelos. Sem exceção.
- Decompor trabalho em subtarefas independentes e lançar agentes em paralelo sempre que possível
- Estratégia padrão de execução do projeto — não executar tarefas sequencialmente quando podem ser paralelizadas

**`/superpowers:verification-before-completion`**

- **TRIGGER:** ANTES de afirmar que o trabalho está completo, corrigido ou passando — antes de commit ou PR
- Obriga rodar comandos de verificação e confirmar output. Evidência antes de afirmação

**`/superpowers:systematic-debugging`**

- **TRIGGER:** QUANDO encontrar qualquer bug, teste falhando ou comportamento inesperado, ANTES de propor correções
- Investigação metódica: reproduzir → isolar → diagnosticar → corrigir → verificar

**`/superpowers:requesting-code-review`**

- **TRIGGER:** APÓS completar tarefa significativa, implementar feature major, ou antes de merge
- Solicita review estruturado para verificar que o trabalho atende requisitos

### Outras Skills

**`/frontend-design:frontend-design`** — **USO OBRIGATÓRIO**

- **TRIGGER:** SEMPRE que construir ou modificar QUALQUER interface web (componentes, páginas, PWAs, CSS, HTML, JS de UI). Sem exceção.
- Toda tarefa de criação ou modificação de frontend DEVE invocar esta skill antes de escrever código
- Gera código frontend com design de alta qualidade, evitando estética genérica de IA

**`/ui-ux-pro-max:ui-ux-pro-max`**

- **TRIGGER:** QUANDO tomar decisões de design visual — paletas de cores, tipografia, layout, UX guidelines
- Usar em conjunto com frontend-design para as PWAs. Inclui 50+ estilos, 161 paletas, 57 pares de fontes

**`/code-review:code-review`**

- **TRIGGER:** QUANDO precisar revisar um PR existente
- Review estruturado de pull requests

**`/claude-api`**

- **TRIGGER:** QUANDO escrever código que importe `anthropic`, `@anthropic-ai/sdk`, ou use a API Claude/Anthropic
- Essencial nas Fases 3 (test engine) e 4 (chat/RAG) do plano v2

**`/simplify`**

- **TRIGGER:** APÓS implementação concluída, antes de commitar — quando o código funciona mas pode ser mais limpo
- Revisa código alterado buscando reuso, qualidade e eficiência

**`/skill-creator:skill-creator`**

- **TRIGGER:** QUANDO precisar criar, modificar ou medir performance de skills customizadas

### Skills Situacionais (superpowers)

Disponíveis quando a situação específica surgir — não têm trigger recorrente:

| Skill | Quando usar |
|---|---|
| `receiving-code-review` | Ao receber feedback de code review — antes de implementar sugestões |
| `finishing-a-development-branch` | Quando implementação está completa e precisa decidir como integrar (merge, PR, cleanup) |
| `using-git-worktrees` | Quando feature precisa de isolamento do workspace atual |
| `test-driven-development` | Se adotarmos TDD para uma feature específica |
| `writing-skills` | Quando criando/editando skills antes de deploy |

### Agent Types (Subagentes Especializados)

Subagentes disponíveis via ferramenta `Agent`. Diferentes das skills — são processos autônomos delegados.

**`Explore`**

- **TRIGGER:** QUANDO precisar explorar o codebase em profundidade (busca aberta, múltiplos arquivos, padrões de código)
- Mais lento que Glob/Grep direto — usar apenas quando busca simples não bastar ou tarefa exigir 3+ queries

**`Plan`**

- **TRIGGER:** QUANDO precisar planejar estratégia de implementação, identificar arquivos críticos, avaliar trade-offs arquiteturais
- Retorna planos passo a passo. Usar como complemento ao writing-plans para análise técnica

**`superpowers:code-reviewer`**

- **TRIGGER:** QUANDO uma etapa major do projeto for concluída e precisa ser validada contra o plano original
- Review de código implementado contra especificação e padrões de qualidade

**`code-simplifier:code-simplifier`**

- **TRIGGER:** APÓS implementação de código significativo — simplifica e refina para clareza, consistência e manutenibilidade
- Focado em código recém-modificado, a menos que instruído diferente

---

## Automação (GitHub Actions)

| Workflow | Status | Função |
|---|---|---|
| `.github/workflows/varredura.yml` | **Inativo** | Varredura PubMed → triagem IA → commit resultados (descontinuado por custo de API) |

> **Nota:** O cron semanal foi desativado. Varreduras são executadas sob demanda via CLI quando o Dr. Arthur solicitar. O workflow do GitHub Actions permanece no repo caso seja reativado no futuro.

**Secrets configurados no GitHub (para uso futuro):**

- `ANTHROPIC_API_KEY` — para triagem via Anthropic API
- `NCBI_API_KEY` — para buscas no PubMed
- `NCBI_EMAIL` — email registrado no NCBI
- `GMAIL_APP_PASSWORD` — para email de notificação (opcional)

**Estado de rotação:** `varredura_state.json` na raiz do repo rastreia qual área foi varrida por último e se a varredura zero (10 anos) já foi feita.
