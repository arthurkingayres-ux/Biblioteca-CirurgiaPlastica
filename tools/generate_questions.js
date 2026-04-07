#!/usr/bin/env node
// tools/generate_questions.js — Gera questões de teste a partir dos cards (Fase 3)
//
// Uso:
//   node tools/generate_questions.js --topic blefaroplastia
//   node tools/generate_questions.js --topic blefaroplastia --area estetica-facial
//   node tools/generate_questions.js --topic blefaroplastia --redo   # regenera mesmo se já existir
//
// Saída:
//   content/cards/<area>/<topic>/_questions.json

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT = path.join(__dirname, '..');
const MODEL = 'claude-haiku-4-5-20251001';
const CARD_FILES = ['anatomia', 'tecnicas', 'decisoes', 'notas'];
const QS_PER_CARD = 2;
const DELAY_MS = 400; // entre chamadas API

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function buildPrompt(card, domain) {
  // Extrair campos relevantes sem sobrecarregar o contexto
  const excerpt = {
    id: card.id,
    type: card.type,
    title: card.title,
    ...(card.definition ? { definition: card.definition } : {}),
    ...(card.location ? { location: card.location } : {}),
    ...(card.surgical_relevance ? { surgical_relevance: card.surgical_relevance } : {}),
    ...(card.how_to_identify ? { how_to_identify: card.how_to_identify } : {}),
    ...(card.indication ? { indication: card.indication } : {}),
    ...(card.contraindication ? { contraindication: card.contraindication } : {}),
    ...(card.steps ? { steps: card.steps.slice(0, 6) } : {}),  // primeiros 6 passos
    ...(card.complications ? { complications: card.complications.slice(0, 5) } : {}),
    ...(card.pearls ? { pearls: card.pearls } : {}),
    ...(card.trigger ? { trigger: card.trigger } : {}),
  };

  return `Você é um professor de cirurgia plástica gerando questões de avaliação para residentes.

Domínio: ${domain}
Card:
${JSON.stringify(excerpt, null, 2)}

Gere exatamente ${QS_PER_CARD} questões de avaliação. Responda APENAS com JSON válido, sem texto extra:

[
  {
    "question": "Pergunta clara e objetiva (1-2 frases em português)",
    "expected": "Resposta esperada completa (2-5 frases, incluindo dados numéricos importantes)"
  }
]

Regras:
- Perguntas devem avaliar conhecimento aplicável em sala cirúrgica
- Incluir valores numéricos quando relevantes (medidas, percentuais, tempos)
- Para técnicas: focar em passos críticos, armadilhas, complicações específicas
- Para anatomia: focar em localização, relações, relevância cirúrgica, como identificar
- Para decisões: focar em critérios de seleção, indicações vs contraindicações
- Variar o foco entre as ${QS_PER_CARD} perguntas — não repetir o mesmo aspecto`;
}

async function generateForCard(client, card, domain) {
  const prompt = buildPrompt(card, domain);
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  let raw = response.content[0].text.trim();
  // Remover blocos de código se presentes
  if (raw.startsWith('```')) {
    raw = raw.split('```')[1];
    if (raw.startsWith('json')) raw = raw.slice(4);
  }
  return JSON.parse(raw.trim());
}

async function main() {
  const args = process.argv.slice(2);
  const topicIdx = args.indexOf('--topic');
  const areaIdx = args.indexOf('--area');
  const redo = args.includes('--redo');

  if (topicIdx === -1) {
    console.error('Uso: node tools/generate_questions.js --topic <topic> [--area <area>] [--redo]');
    process.exit(1);
  }

  const topic = args[topicIdx + 1];
  const area = areaIdx !== -1 ? args[areaIdx + 1] : 'estetica-facial';

  const cardsDir = path.join(ROOT, 'content', 'cards', area, topic);
  if (!fs.existsSync(cardsDir)) {
    console.error(`Erro: pasta não encontrada: ${cardsDir}`);
    process.exit(1);
  }

  const outPath = path.join(cardsDir, '_questions.json');
  if (fs.existsSync(outPath) && !redo) {
    console.log(`_questions.json já existe. Use --redo para regenerar.`);
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    console.log(`  ${existing.total} questões geradas em ${existing.generated}`);
    process.exit(0);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Erro: ANTHROPIC_API_KEY não encontrada em .env');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const questions = [];
  let cardCount = 0;
  let errorCount = 0;

  console.log(`Tópico : ${topic}`);
  console.log(`Área   : ${area}`);
  console.log(`Modelo : ${MODEL}`);
  console.log(`Questões/card: ${QS_PER_CARD}`);
  console.log();

  // --- Cards regulares (anatomia, tecnicas, decisoes, notas) ---
  for (const domain of CARD_FILES) {
    const filePath = path.join(cardsDir, `${domain}.json`);
    if (!fs.existsSync(filePath)) continue;

    let cards;
    try {
      cards = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.error(`  [erro] Falha ao ler ${domain}.json: ${e.message}`);
      continue;
    }
    if (!Array.isArray(cards) || cards.length === 0) continue;

    console.log(`${domain}.json (${cards.length} cards):`);

    for (const card of cards) {
      process.stdout.write(`  ${card.id} ... `);
      let retries = 0;
      while (true) {
        try {
          const qs = await generateForCard(client, card, domain);
          for (let i = 0; i < qs.length; i++) {
            questions.push({
              id: `q-${card.id}-${i + 1}`,
              card_id: card.id,
              domain,
              question: qs[i].question,
              expected: qs[i].expected,
            });
          }
          console.log(`OK (${qs.length})`);
          cardCount++;
          break;
        } catch (e) {
          if (e.status === 429 && retries < 3) {
            retries++;
            const wait = 15 * retries;
            process.stdout.write(`[rate-limit, aguardando ${wait}s] `);
            await sleep(wait * 1000);
          } else {
            console.log(`ERRO: ${e.message}`);
            errorCount++;
            break;
          }
        }
      }
      await sleep(DELAY_MS);
    }
    console.log();
  }

  // --- Flashcards (incluídos diretamente, sem chamar API) ---
  const fcPath = path.join(cardsDir, 'flashcards.json');
  if (fs.existsSync(fcPath)) {
    try {
      const fcData = JSON.parse(fs.readFileSync(fcPath, 'utf8'));
      const fcCards = fcData.cards || [];
      let fcCount = 0;
      for (let i = 0; i < fcCards.length; i++) {
        const fc = fcCards[i];
        if (!fc.front || !fc.back) continue;
        questions.push({
          id: `q-flashcard-${i + 1}`,
          card_id: fcData.id || 'flashcard',
          domain: fc.domain || 'flashcards',
          question: fc.front,
          expected: fc.back,
        });
        fcCount++;
      }
      console.log(`flashcards.json: ${fcCount} questões adicionadas diretamente`);
      console.log();
    } catch (e) {
      console.warn(`  [aviso] Falha ao ler flashcards.json: ${e.message}`);
    }
  }

  // --- Salvar ---
  const output = {
    topic,
    area,
    generated: new Date().toISOString().split('T')[0],
    total: questions.length,
    questions,
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  console.log('='.repeat(50));
  console.log(`Cards processados : ${cardCount}`);
  console.log(`Questões geradas  : ${questions.length}`);
  console.log(`Erros             : ${errorCount}`);
  console.log(`Salvo em          : ${path.relative(ROOT, outPath)}`);
  console.log();
  console.log('Próximo passo:');
  console.log('  Abrir PWA e testar o modo Teste');
}

main().catch(e => { console.error(e.message); process.exit(1); });
