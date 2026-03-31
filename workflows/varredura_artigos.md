# Workflow: Varredura de Artigos

## Objetivo
Buscar artigos recentes nos periódicos PRS e ASJ, selecionar os mais relevantes, e incorporar as atualizações ao documento de estudo da área mais desatualizada.

## Limite por Sessão
**10 artigos por sessão** — para controlar consumo de créditos e manter qualidade de análise.

## Visão Geral do Pipeline

```
PubMed (descoberta de metadados)
  → Agente apresenta lista triada ao Dr. Arthur
  → Dr. Arthur liga VPN, acessa journals, salva PDFs
  → Agente lê PDFs, analisa, classifica (AZUL / VERMELHO / VERDE)
  → Agente incorpora via incorporate_article.js
  → Agente marca artigo como incorporado no CSV
```

**Princípio:** PubMed é para descoberta. O conteúdo vem dos PDFs — formato canônico, estável, permanente.

---

## Passo a Passo

### 1. Identificar a área mais desatualizada
Ler `02-Artigos-Periodicos/indice-artigos.csv` e identificar qual área temática tem a `data_incorporacao` mais antiga (ou nunca teve artigo incorporado).

Critério de desempate: seguir a ordem dos documentos existentes em `01-Documentos-Estudo/`.

### 2. Buscar artigos novos no PubMed
Executar busca via NCBI API para a área identificada, restrita a PRS e ASJ.

```bash
python tools/search_pubmed.py \
    --query '"Rhinoplasty"[MeSH] AND "Plastic and Reconstructive Surgery"[Journal]' \
    --max 15 --years 1 \
    --output .tmp/varredura_prs.json

python tools/search_pubmed.py \
    --query '"Rhinoplasty"[MeSH] AND "Aesthetic Surgery Journal"[Journal]' \
    --max 15 --years 1 \
    --output .tmp/varredura_asj.json
```

### 3. Filtrar artigos já indexados
Comparar os DOIs retornados com os já presentes em `indice-artigos.csv`.
Manter apenas artigos novos (não indexados) para análise.

### 4. Selecionar os 10 mais relevantes
A partir dos artigos novos, selecionar os 10 com maior pertinência clínica:
- Priorizar: meta-análises, RCTs, estudos com n > 50, técnicas cirúrgicas com dados de outcome
- Descartar: relatos de caso isolados, estudos em animais, temas periféricos à área

Apresentar a lista ao Dr. Arthur com:
- Título, autores, journal, ano
- Abstract (quando disponível pelo PubMed)
- Justificativa da seleção (1 linha)

O Dr. Arthur aprova, ajusta ou substitui artigos da lista.

### 5. Download dos PDFs (etapa do Dr. Arthur)

> **Pré-requisito:** VPN UNICAMP ativo.

Solicitar ao Dr. Arthur:
> "Para os artigos selecionados, por favor:
> 1. Conecte o VPN UNICAMP
> 2. Acesse cada artigo pelo DOI no navegador
> 3. Salve o PDF em `02-Artigos-Periodicos/PRS/` ou `02-Artigos-Periodicos/ASJ/`
>    conforme o periódico
>
> Nomeie os PDFs como: `<PrimeiroAutor>_<Ano>_<PalavraChave>.pdf`
> Exemplo: `Smith_2026_Rhinoplasty_Spreader.pdf`
>
> Confirme quando os PDFs estiverem salvos."

Aguardar confirmação antes de prosseguir.

### 6. Indexar artigos no CSV
```bash
python tools/update_article_index.py \
    --input .tmp/varredura_prs.json \
    --area "<AreaTematica>"
```

### 7. Ler e analisar os PDFs
Para cada PDF salvo, ler com o Read tool e:
- Extrair: **achado principal**, **metodologia resumida**, **conclusão prática**
- Identificar dados numéricos relevantes (n, %, p-value, follow-up, medidas)
- Classificar o artigo:
  - **AZUL** → complementa conhecimento existente
  - **VERMELHO** → muda conduta ou paradigma
  - **VERDE** → dica prática cirúrgica

> ⚠️ **Regra inviolável:** nunca incorporar ao documento baseado apenas em abstract ou título.
> O PDF completo deve ter sido lido e analisado antes de classificar e incorporar.

### 8. Incorporar ao documento de estudo
Para cada artigo analisado:

```bash
node tools/incorporate_article.js \
  --tema <tema> --color <blue|red|green> \
  --title "Título do box" \
  --lines "Achado 1" "Achado 2" "Achado 3" \
  --citation "Autor et al. Journal Ano;Vol:Pág. DOI: 10.xxx" \
  --doi "10.xxx" \
  --after-heading "<Seção mais adequada>" \
  --flashcard "Parâmetro|Valor" \
  --description "Descrição breve para o histórico"
```

Isso automaticamente:
- Insere o box na posição correta do JSON
- Adiciona flashcards se houver dados numéricos
- Incrementa a versão
- Regenera o `.docx`
- Marca o artigo como incorporado no CSV

### 9. Verificar resultado
```bash
node tools/validate_content.js --topic <tema>
```

Abrir o `.docx` gerado e confirmar que:
- O box está na seção correta
- A citação está formatada
- A versão foi incrementada
- O flashcard contém dados corretos

### 10. Registrar progresso
```bash
python tools/log_progress.py \
    --tema "<Área>" \
    --atividade "Varredura: X artigos PRS/ASJ incorporados" \
    --duracao <minutos>
```

---

## Saída Esperada
- PDFs arquivados em `02-Artigos-Periodicos/PRS/` e `ASJ/` (arquivo permanente)
- `01-Documentos-Estudo/<tema>.docx` atualizado com novos boxes e versão incrementada
- `02-Artigos-Periodicos/indice-artigos.csv` com artigos indexados e marcados como incorporados
- `content/<tema>.json` atualizado com os novos elementos

---

## Edge Cases
- **PDF protegido ou não-legível:** Informar ao Dr. Arthur; tentar OCR ou pedir versão alternativa.
- **Artigo relevante de outro periódico:** Não indexar na fase atual; registrar para expansão futura.
- **Área com artigos recentes já suficientes:** Avançar para a próxima área mais desatualizada.
- **Rate limit NCBI:** Aguardar 30 segundos; com API key, limite é 10 req/s.
- **Informação conflitante entre artigos:** Documentar ambas as perspectivas com referências.

---

## Ordem de Prioridade das Áreas
Determinada automaticamente pela data de última incorporação no CSV.
Se todas estiverem empatadas, seguir ordem numérica dos documentos.
Após concluir um ciclo completo (todas as áreas atualizadas), perguntar ao Dr. Arthur se deseja expandir para novas áreas.
