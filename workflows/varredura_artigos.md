# Workflow: Varredura de Artigos

## Objetivo
Buscar artigos recentes nos periódicos PRS e ASJ, extrair o texto completo de cada artigo via Playwright, analisar o conteúdo e incorporar as atualizações ao documento de estudo da área mais desatualizada.

## Limite por Sessão
**10 artigos por sessão** — para controlar consumo de créditos e manter qualidade de análise.

## Pré-requisitos Obrigatórios (Dr. Arthur)

> **Antes de iniciar qualquer sessão de varredura:**
>
> 1. **VPN UNICAMP (OpenVPN)** — necessário para acesso ao texto completo de PRS (Wolters Kluwer) e ASJ (Oxford Academic). O agente não consegue abrir o OpenVPN — etapa manual.
> 2. **Edge com debug ativo** — necessário para artigos ASJ. Abrir pelo atalho **"Edge (Debug ASJ)"** na área de trabalho (habilita CDP na porta 9222 para que o Playwright conecte ao browser real, bypassando o Cloudflare do Oxford Academic).
>
> O agente deve solicitar confirmação de ambos antes de prosseguir com o passo 6.

### Por que Edge e não Chrome?
O Chrome 115+ não expõe a porta CDP de forma confiável no Windows (não cria `DevToolsActivePort` apesar do flag `--remote-debugging-port`). O Edge (Chromium-based) funciona perfeitamente com CDP e tem acesso institucional idêntico via VPN.

---

## Passo a Passo

### 1. Lembrar o Dr. Arthur dos pré-requisitos
Exibir mensagem:
> "Antes de iniciar a varredura:
> 1. Conecte o VPN UNICAMP (OpenVPN)
> 2. Abra o Edge pelo atalho **'Edge (Debug ASJ)'** na área de trabalho
> Confirme quando ambos estiverem prontos."

Aguardar confirmação antes de prosseguir.

### 2. Identificar a área mais desatualizada
Ler `02-Artigos-Periodicos/indice-artigos.csv` e identificar qual área temática tem a `data_incorporacao` mais antiga (ou nunca teve artigo incorporado).

Critério de desempate: seguir a ordem dos documentos existentes em `01-Documentos-Estudo/`.

### 3. Buscar artigos novos no PubMed
Executar busca via NCBI API (script `tools/search_pubmed.py`) para a área identificada, restrita a PRS e ASJ.

```bash
# Exemplos — substituir pela área selecionada:
python tools/search_pubmed.py \
    --query '"Rhinoplasty"[MeSH] AND "Plastic and Reconstructive Surgery"[Journal]' \
    --max 15 --years 1 \
    --output .tmp/varredura_prs.json

python tools/search_pubmed.py \
    --query '"Rhinoplasty"[MeSH] AND "Aesthetic Surgery Journal"[Journal]' \
    --max 15 --years 1 \
    --output .tmp/varredura_asj.json
```

### 4. Filtrar artigos já indexados
Comparar os DOIs retornados com os já presentes em `indice-artigos.csv`.
Manter apenas artigos novos (não indexados) para análise.

### 5. Selecionar os 10 mais relevantes
A partir dos artigos novos, selecionar os 10 com maior pertinência clínica:
- Priorizar: meta-análises, RCTs, estudos com n > 50, técnicas cirúrgicas com dados de outcome
- Descartar: relatos de caso isolados, estudos em animais, temas periféricos à área

### 6. Extrair texto completo via Playwright

**Pré-requisito:**
- VPN UNICAMP ativo (para PRS e ASJ)
- Edge aberto pelo atalho "Edge (Debug ASJ)" (para ASJ)

```bash
# PRS (10.1097): Playwright Chromium local roteado pelo VPN
# ASJ (10.1093): Playwright conecta ao Edge real do usuário via CDP (porta 9222)
node tools/fetch_article_text.js --doi "10.1097/PRS.xxx,10.1093/asj/xxx"
# ou em lote:
node tools/fetch_article_text.js --input .tmp/doi_list.json
```

Saída: `.tmp/article_texts/<doi_sanitizado>.json` por artigo + `.tmp/article_texts/index.json`

**Se falhar (conteúdo insuficiente < 200 chars):**
- PRS: verificar se VPN está ativo; re-executar
- ASJ: verificar se Edge foi aberto pelo atalho "Edge (Debug ASJ)"; confirmar que `http://localhost:9222/json/version` responde

### 7. Ler e extrair informações dos artigos
Para cada `.json` em `.tmp/article_texts/`, ler o texto completo e:
- Extrair: **achado principal**, **metodologia resumida**, **conclusão prática**
- Identificar dados numéricos relevantes (n, %, p-value, follow-up)
- Classificar o artigo:
  - **AZUL** → complementa conhecimento existente
  - **VERMELHO** → muda conduta ou paradigma
  - **VERDE** → dica prática cirúrgica

> ⚠️ **Regra inviolável:** nunca incorporar ao documento baseado apenas em abstract ou título. O texto completo deve ter sido extraído com sucesso (seções > 1 e chars > 5.000) antes de classificar e incorporar.

### 8. Indexar artigos no CSV
```bash
python tools/update_article_index.py \
    --input .tmp/varredura_prs.json \
    --area "<AreaTematica>"
```

### 9. Atualizar o documento de estudo
Editar `tools/create_docx.js`:
- Adicionar novo `s.blue(...)`, `s.red(...)` ou `s.green(...)` na seção correspondente
- Incluir dados numéricos relevantes na tabela de flashcards (`s.flashcards(...)`)
- Adicionar referência em "Atualizações Incorporadas"
- Incrementar versão e atualizar histórico

```bash
"/c/Program Files/nodejs/node.exe" tools/create_docx.js --topic <tema>
```

### 10. Marcar artigos como incorporados
```bash
python tools/mark_article_incorporated.py \
    --doi "<doi>" \
    --documento "<12-X-Tema.docx>"
```

### 11. Registrar progresso
```bash
python tools/log_progress.py \
    --tema "<Área>" \
    --atividade "Varredura: 10 artigos PRS/ASJ incorporados" \
    --duracao <minutos>
```

---

## Saída Esperada
- `01-Documentos-Estudo/12-X-Tema.docx` atualizado com novos boxes e versão incrementada
- `02-Artigos-Periodicos/indice-artigos.csv` com novos artigos indexados e marcados como incorporados
- `.tmp/article_texts/*.json` — textos extraídos (descartável após confirmação)
- `.tmp/*.json` — demais temporários descartáveis após confirmação

---

## Edge Cases
- **Texto insuficiente no ASJ (< 200 chars):** Verificar se o Edge está aberto com CDP ativo (`curl http://localhost:9222/json/version`). Se não responder, fechar o Edge e reabrir pelo atalho "Edge (Debug ASJ)".
- **Texto insuficiente no PRS (< 200 chars):** VPN pode estar desconectado. Reconectar e re-executar.
- **Artigo relevante de outro periódico encontrado:** Não indexar na fase atual; registrar para expansão futura.
- **Área com artigos recentes já suficientes:** Avançar para a próxima área mais desatualizada.
- **create_docx.js muito extenso:** Dividir a sessão em duas partes (5 artigos cada).
- **Rate limit NCBI:** Aguardar 30 segundos; com API key, limite é 10 req/s.

---

## Ordem de Prioridade das Áreas
Determinada automaticamente pela data de última incorporação no CSV.
Se todas estiverem empatadas, seguir ordem numérica dos documentos.
Após concluir um ciclo completo (todas as áreas atualizadas), perguntar ao Dr. Arthur se deseja expandir para novas áreas.
