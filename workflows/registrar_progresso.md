# Workflow: Registrar Progresso de Estudo

## Objetivo
Registrar sessões de estudo no diário de progresso, mantendo um histórico acumulado em CSV e entradas diárias em Markdown.

## Inputs Necessários
- `tema`: Tema estudado (ex: "Abdominoplastia", "Lipoaspiração")
- `atividade`: Descrição do que foi feito (ex: "Leitura do documento 11-1 + revisão de 3 artigos")
- `duracao`: Duração em minutos
- `notas` (opcional): Observações, pontos de dúvida, referências para revisar

## Ferramentas
- `tools/log_progress.py` — registra a entrada no CSV e no Markdown diário

## Passo a Passo

### 1. Registrar a sessão de estudo
```bash
python tools/log_progress.py \
    --tema "<tema>" \
    --atividade "<descricao>" \
    --duracao <minutos> \
    --notas "<observacoes>"
```

**Exemplo:**
```bash
python tools/log_progress.py \
    --tema "Abdominoplastia" \
    --atividade "Revisão das classificações de Matarasso e técnica de plicatura" \
    --duracao 75 \
    --notas "Verificar diferença entre mini e full abdominoplastia para casos pós-bariátricos"
```

**Saída esperada:**
- `05-Registro-Progresso/progresso.csv` atualizado
- `05-Registro-Progresso/YYYY-MM-DD.md` criado/atualizado

### 2. Verificar registro
Confirmar que a entrada aparece em `05-Registro-Progresso/progresso.csv` e no arquivo Markdown do dia.

## Saída Esperada
- `05-Registro-Progresso/progresso.csv` com registro acumulado de todas as sessões
- `05-Registro-Progresso/<data>.md` com entradas organizadas por data

## Edge Cases
- **Data retroativa:** usar `--data YYYY-MM-DD` para registrar sessões de dias anteriores
- **Tema não padronizado:** usar sempre os mesmos nomes de tema para facilitar agrupamento posterior (ver lista abaixo)

## Temas Padronizados
- `Abdominoplastia`
- `Lipoaspiração`
- `Contorno Corporal Pós-Bariátrico`
- `Gluteoplastia`
- `Mamoplastia`
- `Rinoplastia`
- `Revisão Geral`
