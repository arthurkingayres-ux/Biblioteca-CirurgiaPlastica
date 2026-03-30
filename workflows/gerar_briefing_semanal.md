# Workflow: Gerar Briefing Semanal

## Objetivo
Compilar um relatório semanal em Markdown com os artigos adicionados recentemente ao índice, organizados por área temática.

## Inputs Necessários
- Nenhum obrigatório — o script usa os artigos do índice com `data_download` nos últimos 30 dias
- `area` (opcional): filtrar por área temática específica
- `semana` (opcional): identificador da semana no formato `YYYY-WNN` (padrão: semana atual)

## Ferramentas
- `tools/generate_briefing.py` — gera o arquivo Markdown do briefing

## Passo a Passo

### 1. Verificar se há artigos recentes no índice
Abrir `02-Artigos-Periodicos/indice-artigos.csv` e confirmar que há entradas com `data_download` nos últimos 30 dias.

Se não houver artigos recentes, executar o workflow `buscar_incorporar_artigos.md` primeiro.

### 2. Gerar o briefing
```bash
# Briefing geral (todos os temas)
python tools/generate_briefing.py

# Briefing por área específica
python tools/generate_briefing.py --area "Abdominoplastia"

# Briefing de uma semana específica
python tools/generate_briefing.py --semana 2026-W13
```
**Saída esperada:** `04-Briefings-Semanais/YYYY-WNN-briefing.md`

**Se falhar:**
- `FileNotFoundError` no CSV: garantir que o índice existe em `02-Artigos-Periodicos/indice-artigos.csv`
- Briefing vazio: aumentar a janela de tempo com `--days 60`

### 3. Revisar o briefing gerado
Abrir o arquivo gerado em `04-Briefings-Semanais/` e verificar:
- Todos os artigos esperados estão presentes?
- Links DOI estão corretos?
- Organização por seção temática está adequada?

### 4. (Opcional) Compartilhar via Google Drive
Mover o arquivo para a pasta correspondente no Google Drive para acesso externo.

## Saída Esperada
- `04-Briefings-Semanais/YYYY-WNN-briefing.md` com artigos organizados por tema

## Edge Cases
- **Sem artigos recentes:** ampliar a janela com `--days 90` ou executar buscas adicionais
- **Muitos artigos:** filtrar por `--area` para briefings mais focados
- **Artigos sem DOI:** aparecerão no briefing sem link clicável — sem impacto funcional
