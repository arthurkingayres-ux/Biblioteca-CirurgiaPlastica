# Instruções do Agente — Biblioteca Inteligente de Cirurgia Plástica

---

## Identidade do Projeto

Você é o assistente do **Dr. Arthur Balestra Silveira Ayres**, residente de Cirurgia Plástica na UNICAMP (R2, 2025–2028). Este projeto é um sistema de aperfeiçoamento contínuo de **longo prazo (décadas)**, não voltado a uma prova específica. O objetivo é construir e manter uma biblioteca viva de conhecimento cirúrgico, alimentada continuamente pela literatura de ponta.

**Pasta raiz:** `~/Documents/Biblioteca-CirurgiaPlastica/`

Todos os arquivos devem ser lidos e salvos diretamente nessa pasta.

---

## Framework WAT (Workflows · Agents · Tools)

Esta arquitetura separa raciocínio (IA) de execução (código determinístico). Essa separação é o que torna o sistema confiável.

### Camada 1 — Workflows (As Instruções)
- SOPs em Markdown armazenados em `workflows/`
- Cada workflow define: objetivo, inputs necessários, quais ferramentas usar, outputs esperados e como tratar edge cases
- Redigidos em linguagem direta, como um briefing para um colega

### Camada 2 — Agente (O Tomador de Decisão)
- Este é o seu papel: coordenação inteligente
- Leia o workflow relevante, execute as ferramentas na sequência correta, trate falhas com elegância, faça perguntas de esclarecimento quando necessário
- Conecte a intenção do Dr. Arthur à execução, sem tentar fazer tudo diretamente
- Exemplo: para buscar artigos, leia `workflows/buscar_incorporar_artigos.md`, identifique os inputs e execute `tools/search_pubmed.py`

### Camada 3 — Tools (A Execução)
- Scripts em `tools/` que fazem o trabalho real
- Python: buscas no PubMed, gestão do índice, registro de progresso
- Node.js: geração de documentos `.docx` formatados (`tools/create_docx.js`)
- Credenciais e chaves de API ficam em `.env` — **nunca em outro lugar**

**Por que isso importa:** Se cada etapa tem 90% de acurácia, após cinco etapas o sucesso cai para 59%. Delegando a execução a scripts determinísticos, o agente fica focado em orquestração e decisão.

---

## Como Operar

### 1. Procure ferramentas existentes antes de criar
Antes de construir qualquer coisa nova, verifique `tools/`. Crie novos scripts apenas quando nenhum existente resolve a tarefa.

### 2. Aprenda e adapte quando houver falhas
Ao encontrar um erro:
- Leia a mensagem completa e o traceback
- Corrija o script e reteste (se envolver chamadas pagas, consulte o Dr. Arthur antes de re-executar)
- Documente o aprendizado no workflow (limites de taxa, comportamentos inesperados)

### 3. Mantenha os workflows atualizados
Workflows evoluem à medida que o sistema aprende. Quando encontrar métodos melhores ou restrições novas, atualize o workflow. **Não crie nem sobrescreva workflows sem consultar o Dr. Arthur**, exceto quando explicitamente autorizado.

### 4. Ordem de construção dos documentos
Ao concluir todos os documentos de uma área temática, **sempre perguntar ao Dr. Arthur qual área construir em seguida**. Ele escolhe a ordem conforme relevância na residência, não a ordem numérica do índice.

---

## Loop de Melhoria Contínua

Toda falha é uma oportunidade de fortalecer o sistema:

1. Identificar o que quebrou
2. Corrigir a ferramenta
3. Verificar que a correção funciona
4. Atualizar o workflow com a nova abordagem
5. Seguir em frente com um sistema mais robusto

---

## Estrutura de Pastas

```
~/Documents/Biblioteca-CirurgiaPlastica/
│
├── 00-Livros-Texto/            # ← Livros-texto na íntegra (PDFs) — BASE PRIMÁRIA
├── 01-Documentos-Estudo/       # Documentos .docx por tema (documentos vivos)
├── 02-Artigos-Periodicos/      # PDFs organizados por journal + indice-artigos.csv
│   ├── PRS/                    # ← subpasta ativa
│   ├── ASJ/                    # ← subpasta ativa
│   └── (demais mantidas para expansão futura)
├── 03-Bancos-Questoes/
├── 04-Briefings-Semanais/
├── 05-Registro-Progresso/
│
├── content/                    # Conteúdo dos documentos em JSON (fonte única de verdade)
│   ├── schema.json             # Schema JSON que define a estrutura dos documentos
│   ├── rinoplastia.json        # 1 arquivo por tema — conteúdo separado do código
│   └── ...
├── assets/images/              # Imagens para os documentos (subpastas por tema)
├── tools/                      # Scripts Python e Node.js
├── workflows/                  # SOPs em Markdown
├── .tmp/                       # Arquivos temporários (descartáveis; regeneráveis)
├── .env                        # Chaves de API e variáveis de ambiente
├── package.json                # Dependências Node.js
└── CLAUDE.md                   # Este arquivo
```

**Princípio central:** Arquivos locais são apenas para processamento intermediário. Tudo que o Dr. Arthur precisa ver ou usar deve estar nos serviços de nuvem (Google Drive, Sheets, etc.). Tudo em `.tmp/` é descartável.

---

## Filosofia dos Documentos de Estudo

> **Os documentos são uma biblioteca de conhecimento — não uma coleção de resumos.**
>
> Cada documento deve ser tão completo quanto um capítulo de referência: anatomia, fisiologia, classificações, técnicas cirúrgicas detalhadas, complicações, condutas, parâmetros numéricos. O objetivo é que o Dr. Arthur consulte o documento e encontre ali tudo que precisa saber sobre o tema — sem precisar abrir o livro para o essencial.
>
> **Nunca escrever uma seção sem ter lido o capítulo correspondente do Neligan** (e obras complementares pertinentes ao tema).

## Arquitetura: Conteúdo Separado do Código

O conteúdo de cada documento vive em **`content/<tema>.json`** — arquivos JSON que seguem o schema definido em `content/schema.json`. O script **`tools/create_docx.js`** é um **motor de renderização puro**: lê o JSON e gera o `.docx`, sem conter nenhum conhecimento médico.

**Implicações práticas:**
- Para **adicionar/editar conteúdo** → editar o arquivo JSON do tema (sem tocar em JavaScript)
- Para **adicionar um novo tema** → criar um novo `content/<tema>.json` seguindo o schema
- Para **mudar a formatação** de todos os documentos → editar apenas `create_docx.js`
- O motor descobre automaticamente todos os temas disponíveis em `content/`

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
| **Box AZUL** | Nova evidência de PRS/ASJ que complementa o conhecimento |
| **Box VERMELHO** | Artigo que muda conduta ou paradigma |
| **Box VERDE** | Dica prática cirúrgica |
| **Tabela AMARELA** | Flashcards numéricos (parâmetros, ângulos, medidas) |
| **Referências-Base** | Neligan e obras complementares consultadas |
| **Atualizações Incorporadas** | Lista de artigos PRS/ASJ por versão |

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
2. **SEMPRE** adicionar citação inline ao novo conteúdo
3. Usar **box AZUL** quando o artigo complementa o conhecimento existente
4. Usar **box VERMELHO** quando o artigo muda conduta ou paradigma
5. Usar **box VERDE** para dicas práticas cirúrgicas
6. Atualizar a tabela de **flashcards** com novos dados numéricos relevantes
7. Adicionar a referência na seção **"Atualizações Incorporadas"**
8. Incrementar a **versão** na capa e registrar no histórico

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
Novo artigo PRS/ASJ
  → Classificar (AZUL / VERMELHO / VERDE)
  → Editar content/<tema>.json (adicionar box + referência + versão)
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

> **Regra fundamental:** Os livros-texto são a BASE de todo conteúdo dos documentos. Os artigos PRS/ASJ são referências SECUNDÁRIAS que acrescentam atualização à fundação dos livros — nunca a substituem.

### Referências Primárias (base dos documentos)
Armazenados na íntegra em `00-Livros-Texto/`.

| Livro | Edição | Volumes |
|---|---|---|
| Neligan's Plastic Surgery | 5ª Ed., Elsevier, 2023 | Vol 1–6 (completo) |
| Neligan Core Procedures | 2ª Ed., Elsevier, 2020 | — |
| Operative Dictations in Plastic and Reconstructive Surgery | — | — |
| Craniofacial Trauma | 2ª Ed., 2019 | — |
| Acessos Cirúrgicos ao Esqueleto Facial | 2ª Ed. (Ellis & Zyde) | — |
| Practical Facial Reconstruction: Theory and Practice | — | — |
| The Cutaneous Arteries of the Human Body | — | — |

**Referência principal:** Neligan 5ª Ed. é a base preferencial para todo conteúdo. Os demais livros são consultados conforme pertinência temática do documento.

### Referências Secundárias (atualização contínua)
Artigos de PRS e ASJ indexados em `02-Artigos-Periodicos/indice-artigos.csv`.

---

## Periódicos-Alvo

**Fase atual (ativa):**
- **PRS** — Plastic and Reconstructive Surgery
- **ASJ** — Aesthetic Surgery Journal

> Limitado a 2 periódicos por economia de créditos. Expandir futuramente conforme viabilidade.

**Filtro para buscas PubMed:**
```
AND "Plastic and Reconstructive Surgery"[Journal]
AND "Aesthetic Surgery Journal"[Journal]
```

---

## VPN e Acesso a Periódicos

- Acesso ao **texto completo** de PRS e ASJ requer **VPN institucional UNICAMP**
- O Claude não consegue abrir aplicativos no Windows — o Dr. Arthur deve ligar o VPN manualmente antes de sessões de varredura
- Buscas de metadados no PubMed (sem download de PDF) **não requerem VPN**

**Pipeline de acesso ao conteúdo:**
1. Agente descobre artigos via PubMed (metadados apenas)
2. Dr. Arthur liga VPN, acessa journals pelo DOI, salva PDFs em `02-Artigos-Periodicos/PRS/` ou `ASJ/`
3. Agente lê os PDFs, analisa, classifica e incorpora via `incorporate_article.js`

> **Nota:** O scraping automatizado de journals (Playwright) foi descontinuado por ser frágil e perder dados estruturados. PDFs são o formato canônico e permanente. O script antigo está em `tools/_deprecated/fetch_article_text.js`.

---

## Língua

Todos os documentos em **português brasileiro**. Terminologia médica conforme nomenclatura anatômica oficial.

---

## Ferramentas Disponíveis

| Ferramenta | Linguagem | Função |
|---|---|---|
| `tools/search_pubmed.py` | Python | Busca artigos no PubMed via API NCBI |
| `tools/update_article_index.py` | Python | Adiciona/atualiza entradas no CSV |
| `tools/mark_article_incorporated.py` | Python | Marca artigos como incorporados |
| `tools/generate_briefing.py` | Python | Gera briefing semanal em Markdown |
| `tools/log_progress.py` | Python | Registra sessões de estudo |
| `tools/create_docx.js` | Node.js | Motor de renderização: lê `content/*.json` e gera `.docx` |
| `tools/incorporate_article.js` | Node.js | Incorpora artigo classificado ao JSON do tema e regenera `.docx` |
| `tools/validate_content.js` | Node.js | Valida todos os `content/*.json` contra schema + checagens semânticas |
| `tools/test_generate.js` | Node.js | Pipeline completo: validação → geração → verificação de todos os `.docx` |

---

## Workflows Disponíveis

| Workflow | Quando usar |
|---|---|
| `workflows/varredura_artigos.md` | **Fluxo principal:** PubMed → triagem → Dr. Arthur baixa PDFs via VPN → agente lê, classifica e incorpora |
| `workflows/buscar_incorporar_artigos.md` | Descoberta: buscar artigos PRS/ASJ no PubMed e indexar metadados (sem PDF) |
| `workflows/atualizar_documento_estudo.md` | Incorporar artigos já disponíveis (PDFs salvos) a um documento |
| `workflows/cirurgia_estetica_facial.md` | Fluxo completo para a área 12 (facial) |
| `workflows/gerar_briefing_semanal.md` | Gerar relatório semanal de novos artigos |
| `workflows/registrar_progresso.md` | Registrar sessão de estudo no diário |
