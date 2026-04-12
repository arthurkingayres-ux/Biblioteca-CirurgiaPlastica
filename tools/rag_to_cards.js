#!/usr/bin/env node
// tools/rag_to_cards.js — Gera cards atômicos a partir de documentos RAG
//
// Uso:
//   node tools/rag_to_cards.js --topic otoplastia --area estetica-facial
//   node tools/rag_to_cards.js --topic lipoaspiracao --area contorno-corporal
//   node tools/rag_to_cards.js --all              # processa todos os RAG docs
//   node tools/rag_to_cards.js --topic X --dry-run # preview sem escrever
//
// Saída:
//   content/cards/<area>/<topic>/anatomia.json, tecnicas.json, decisoes.json,
//   notas.json, flashcards.json, _meta.json

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT = path.join(__dirname, '..');
const MODEL = 'claude-haiku-4-5-20251001';
const DELAY_MS = 400;
const MAX_RETRIES = 3;

const PREFIXES = JSON.parse(fs.readFileSync(path.join(__dirname, 'topic_prefixes.json'), 'utf8'));

// --- Markdown Parser ---

function parseRAG(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    const h4 = line.match(/^#### (.+)$/);

    if (h2) {
      current = { level: 2, title: h2[1].trim(), content: '', children: [] };
      sections.push(current);
    } else if (h3 && current && current.level === 2) {
      const child = { level: 3, title: h3[1].trim(), content: '', children: [], parent: current.title };
      current.children.push(child);
    } else if (h4 && current && current.children.length > 0) {
      const parent3 = current.children[current.children.length - 1];
      const child = { level: 4, title: h4[1].trim(), content: '', parent: parent3.title };
      parent3.children = parent3.children || [];
      parent3.children.push(child);
    } else {
      // Append content to deepest open section
      const target = getDeepest(current);
      if (target) target.content += line + '\n';
    }
  }
  return sections;
}

function getDeepest(section) {
  if (!section) return null;
  if (section.children && section.children.length > 0) {
    const last = section.children[section.children.length - 1];
    if (last.children && last.children.length > 0) {
      return last.children[last.children.length - 1];
    }
    return last;
  }
  return section;
}

// --- Section-to-CardType Mapping ---

function classifySections(sections) {
  const mapped = {
    anatomy: [],     // #### subsections under ### Anatomy
    technique: [],   // ### subsections under ## Treatment / Surgical Technique
    decision: [],    // Decision trees from ## Patient Selection
    note: [],        // ## Synopsis, Introduction, Diagnosis, Postoperative Care, etc.
    flashcard: [],   // Entire document (numerical params extracted)
  };

  for (const s of sections) {
    const title = s.title.toLowerCase();

    if (title.startsWith('basic science')) {
      for (const child of s.children || []) {
        if (child.title.toLowerCase().includes('anatomy')) {
          for (const structure of child.children || []) {
            mapped.anatomy.push({ title: structure.title, content: structure.content });
          }
          // Also add the ### Anatomy content itself if it has direct content
          if (child.content.trim()) {
            mapped.note.push({ title: child.title, content: child.content, section: 'anatomia' });
          }
        } else if (child.title.toLowerCase().includes('physiology') || child.title.toLowerCase().includes('pathophysiology')) {
          mapped.note.push({ title: child.title, content: child.content, section: 'fisiopatologia' });
        }
      }
    } else if (title.startsWith('treatment') || title.startsWith('surgical technique')) {
      for (const tech of s.children || []) {
        mapped.technique.push({ title: tech.title, content: tech.content });
      }
      if (s.content.trim()) {
        mapped.note.push({ title: 'Princípios Cirúrgicos', content: s.content, section: 'técnica' });
      }
    } else if (title.startsWith('patient selection')) {
      // Decision trees go to decision; general content goes to note
      const fullContent = s.content + '\n' + (s.children || []).map(c => `### ${c.title}\n${c.content}`).join('\n');
      if (fullContent.includes('→') || fullContent.includes('Se ') || fullContent.includes('Sim') || fullContent.includes('opções')) {
        mapped.decision.push({ title: s.title, content: fullContent });
      } else {
        mapped.note.push({ title: s.title, content: fullContent, section: 'seleção' });
      }
      // Also check individual children for decision trees
      for (const child of s.children || []) {
        const childTitle = child.title.toLowerCase();
        if (childTitle.includes('algoritmo') || childTitle.includes('decisão') || childTitle.includes('decisao') || childTitle.includes('classificação')) {
          mapped.decision.push({ title: child.title, content: child.content });
        }
      }
    } else if (title.startsWith('outcomes') || title.startsWith('complications')) {
      for (const comp of s.children || []) {
        mapped.note.push({ title: comp.title, content: comp.content, section: 'complicações' });
      }
      if (s.content.trim()) {
        mapped.note.push({ title: 'Complicações — Visão Geral', content: s.content, section: 'complicações' });
      }
    } else if (title === 'synopsis') {
      mapped.note.push({ title: 'Synopsis', content: s.content, section: 'synopsis' });
    } else if (title === 'introduction') {
      mapped.note.push({ title: 'Introdução', content: s.content, section: 'introdução' });
    } else if (title.startsWith('diagnosis') || title.startsWith('patient presentation')) {
      mapped.note.push({ title: s.title, content: s.content, section: 'diagnóstico' });
      for (const child of s.children || []) {
        mapped.note.push({ title: child.title, content: child.content, section: 'diagnóstico' });
      }
    } else if (title.startsWith('postoperative')) {
      mapped.note.push({ title: 'Cuidados Pós-operatórios', content: s.content, section: 'pós-operatório' });
      for (const child of s.children || []) {
        mapped.note.push({ title: child.title, content: child.content, section: 'pós-operatório' });
      }
    } else if (title.startsWith('secondary')) {
      mapped.note.push({ title: 'Procedimentos Secundários', content: s.content, section: 'revisão' });
      for (const child of s.children || []) {
        mapped.note.push({ title: child.title, content: child.content, section: 'revisão' });
      }
    }
    // Skip: Referências, Atualizações de Artigos (these are metadata, not cards)
  }

  // Flashcard source: entire document for numerical extraction
  mapped.flashcard.push({ title: 'all', content: sections.map(s => sectionToText(s)).join('\n') });

  return mapped;
}

function sectionToText(s) {
  let text = `## ${s.title}\n${s.content}`;
  for (const child of s.children || []) {
    text += `### ${child.title}\n${child.content}`;
    for (const grandchild of child.children || []) {
      text += `#### ${grandchild.title}\n${grandchild.content}`;
    }
  }
  return text;
}

// --- LLM Card Generation ---

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildAnatomyPrompt(title, content, topic, area, prefix, nextId) {
  return `Você é um extrator de dados médicos estruturados. Extraia UMA ficha de anatomia a partir do texto abaixo.

Tema: ${topic} | Área: ${area}

Texto da seção "${title}":
${content.slice(0, 3000)}

Retorne APENAS JSON válido (sem texto extra, sem blocos de código):
{
  "id": "${prefix}-anat-${String(nextId).padStart(3, '0')}",
  "type": "anatomy",
  "title": "${title}",
  "aliases": [],
  "topic": "${topic}",
  "area": "${area}",
  "definition": "definição concisa da estrutura",
  "location": "localização topográfica",
  "relations": ["estrutura relacionada 1", "estrutura 2"],
  "surgical_relevance": "relevância para a cirurgia",
  "how_to_identify": "como identificar intraoperatoriamente",
  "images": [],
  "citations": ["citação extraída do texto"],
  "updates": [],
  "tags": ["anatomia", "tag-específica"]
}

Regras:
- Extrair TODAS as citações inline presentes no texto (ex: [Neligan, 2023, vol. 2, cap. 8])
- Extrair imagens referenciadas como [Imagem: xxx] → colocar "xxx" no array images
- Manter conteúdo em português
- Tags devem ser lowercase sem acentos
- Se um campo não tem informação no texto, usar string vazia`;
}

function buildTechniquePrompt(title, content, topic, area, prefix, nextId) {
  return `Você é um extrator de dados médicos estruturados. Extraia UMA ficha de técnica cirúrgica a partir do texto abaixo.

Tema: ${topic} | Área: ${area}

Texto da seção "${title}":
${content.slice(0, 4000)}

Retorne APENAS JSON válido:
{
  "id": "${prefix}-tec-${String(nextId).padStart(3, '0')}",
  "type": "technique",
  "title": "${title}",
  "aliases": [],
  "topic": "${topic}",
  "area": "${area}",
  "indication": "quando usar esta técnica",
  "contraindication": "quando NÃO usar",
  "steps": ["1. Passo um", "2. Passo dois"],
  "complications": ["complicação 1 (X%)", "complicação 2"],
  "pearls": ["dica prática 1"],
  "images": [],
  "citations": ["citação extraída"],
  "updates": [],
  "tags": ["tecnica", "tag-específica"]
}

Regras:
- steps: numerados, sequenciais, extrair TODOS os passos do texto
- complications: incluir percentuais quando disponíveis
- Extrair imagens referenciadas como [Imagem: xxx]
- Extrair TODAS as citações inline
- Tags lowercase sem acentos`;
}

function buildDecisionPrompt(title, content, topic, area, prefix, nextId) {
  return `Você é um extrator de dados médicos estruturados. Extraia UMA ficha de árvore de decisão clínica a partir do texto abaixo.

Tema: ${topic} | Área: ${area}

Texto da seção "${title}":
${content.slice(0, 4000)}

Retorne APENAS JSON válido:
{
  "id": "${prefix}-dec-${String(nextId).padStart(3, '0')}",
  "type": "decision",
  "title": "${title}",
  "topic": "${topic}",
  "area": "${area}",
  "trigger": "condição clínica que inicia esta decisão",
  "steps": [
    {
      "question": "Pergunta de avaliação?",
      "options": [
        { "answer": "Sim / Opção A", "next": "próximo passo ou conduta" },
        { "answer": "Não / Opção B", "next": "outro caminho" }
      ]
    }
  ],
  "citations": ["citação"],
  "updates": [],
  "tags": ["decisao", "tag-específica"]
}

Regras:
- Cada step deve ter uma question clara e 2+ options
- Cada option tem answer (resposta curta) e next (destino: outra pergunta ou conduta final)
- Modelar como fluxograma de decisão clínica
- Tags lowercase sem acentos`;
}

function buildNotePrompt(title, content, topic, area, prefix, nextId, section) {
  return `Você é um extrator de dados médicos estruturados. Extraia UMA ficha de nota clínica a partir do texto abaixo.

Tema: ${topic} | Área: ${area} | Seção: ${section}

Texto da seção "${title}":
${content.slice(0, 3000)}

Retorne APENAS JSON válido:
{
  "id": "${prefix}-nota-${String(nextId).padStart(3, '0')}",
  "type": "note",
  "title": "${title}",
  "topic": "${topic}",
  "area": "${area}",
  "section": "${section}",
  "content": ["Parágrafo 1...", "Parágrafo 2..."],
  "images": [],
  "citations": ["citação"],
  "updates": [],
  "tags": ["${section.replace(/[áéíóúãõç]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u',ã:'a',õ:'o',ç:'c'})[c] || c)}", "tag-específica"]
}

Regras:
- content: array de parágrafos com informação clínica relevante
- Preservar dados numéricos (medidas, percentuais, doses)
- Extrair imagens referenciadas como [Imagem: xxx]
- Extrair TODAS as citações inline
- Tags lowercase sem acentos`;
}

function buildFlashcardPrompt(content, topic, area, prefix, nextId) {
  return `Você é um professor de cirurgia plástica. Extraia pares pergunta/resposta (flashcards) de parâmetros numéricos, medidas, classificações e fatos-chave do texto abaixo.

Tema: ${topic} | Área: ${area}

Texto (resumido):
${content.slice(0, 6000)}

Retorne APENAS JSON válido:
{
  "id": "${prefix}-fc-${String(nextId).padStart(3, '0')}",
  "type": "flashcard",
  "topic": "${topic}",
  "area": "${area}",
  "cards": [
    {
      "front": "Qual a espessura da pele pálpebral?",
      "back": "~0.5mm (mais fina do corpo)",
      "citation": "Neligan, 2023, vol. 2, cap. 8",
      "domain": "anatomia"
    }
  ],
  "tags": ["flashcard", "${topic}"]
}

Regras:
- Focar em dados NUMÉRICOS: medidas (mm, cm), ângulos (graus), percentuais, doses, classificações
- Mínimo 10 flashcards, máximo 50
- Cada card deve ter citation se disponível no texto
- domain: anatomia, tecnica, decisao, complicacao, pos-operatorio, fisiopatologia
- Perguntas devem ser diretas e objetivas (1 frase)
- Respostas devem incluir o valor numérico exato
- Tags lowercase sem acentos`;
}

// --- API Call with Retry ---

async function callLLM(client, prompt) {
  let retries = 0;
  while (true) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      let raw = response.content[0].text.trim();
      // Strip code blocks if present
      if (raw.startsWith('```')) {
        raw = raw.split('```')[1];
        if (raw.startsWith('json')) raw = raw.slice(4);
      }
      // Handle trailing ``` after content
      if (raw.endsWith('```')) {
        raw = raw.slice(0, -3);
      }
      return JSON.parse(raw.trim());
    } catch (e) {
      if (e.status === 429 && retries < MAX_RETRIES) {
        retries++;
        const wait = 15 * retries;
        process.stdout.write(`[rate-limit, ${wait}s] `);
        await sleep(wait * 1000);
      } else if (e instanceof SyntaxError && retries < MAX_RETRIES) {
        retries++;
        process.stdout.write(`[JSON inválido, retry ${retries}] `);
        await sleep(DELAY_MS);
      } else {
        throw e;
      }
    }
  }
}

// --- Schema Validation ---

function loadValidator() {
  const schemaPath = path.join(ROOT, 'content', 'cards', 'schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  // Remove $schema key that ajv doesn't support natively for draft 2020-12
  delete schema.$schema;
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  // Register the root schema so $ref to #/$defs/update resolves
  ajv.addSchema(schema, 'root');

  return {
    anatomy: ajv.compile({ $ref: 'root#/$defs/anatomy' }),
    technique: ajv.compile({ $ref: 'root#/$defs/technique' }),
    decision: ajv.compile({ $ref: 'root#/$defs/decision' }),
    note: ajv.compile({ $ref: 'root#/$defs/note' }),
    flashcard: ajv.compile({ $ref: 'root#/$defs/flashcard' }),
  };
}

// --- Merge Logic ---

function mergeCards(existing, generated) {
  const byId = new Map();
  for (const card of existing) byId.set(card.id, card);
  for (const card of generated) byId.set(card.id, card); // new cards overwrite
  return [...byId.values()];
}

// --- Discover RAG Topics ---

function discoverTopics() {
  const ragDir = path.join(ROOT, 'content', 'rag');
  const topics = [];
  for (const area of fs.readdirSync(ragDir)) {
    const areaPath = path.join(ragDir, area);
    if (!fs.statSync(areaPath).isDirectory()) continue;
    for (const file of fs.readdirSync(areaPath)) {
      if (file.startsWith('_') || !file.endsWith('.md')) continue;
      topics.push({ area, topic: file.replace('.md', '') });
    }
  }
  return topics;
}

// --- Main ---

async function processTopic(client, validators, topic, area, dryRun) {
  const ragPath = path.join(ROOT, 'content', 'rag', area, `${topic}.md`);
  if (!fs.existsSync(ragPath)) {
    console.error(`RAG não encontrado: ${ragPath}`);
    return false;
  }

  const prefix = PREFIXES[topic];
  if (!prefix) {
    console.error(`Prefixo não encontrado para "${topic}". Adicione em tools/topic_prefixes.json`);
    return false;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Tema: ${topic} | Área: ${area} | Prefixo: ${prefix}`);
  console.log(`${'='.repeat(60)}\n`);

  const markdown = fs.readFileSync(ragPath, 'utf8');
  const sections = parseRAG(markdown);
  const mapped = classifySections(sections);

  const cardsDir = path.join(ROOT, 'content', 'cards', area, topic);
  if (!dryRun) fs.mkdirSync(cardsDir, { recursive: true });

  const results = { anatomia: [], tecnicas: [], decisoes: [], notas: [], flashcards: null };
  const stats = { generated: 0, errors: 0, validated: 0, invalid: 0 };

  // --- Anatomy ---
  console.log(`Anatomia (${mapped.anatomy.length} estruturas):`);
  let anatomyId = 1;
  // Load existing to find max ID
  const existingAnatPath = path.join(cardsDir, 'anatomia.json');
  const existingAnat = fs.existsSync(existingAnatPath) ? JSON.parse(fs.readFileSync(existingAnatPath, 'utf8')) : [];
  for (const ea of existingAnat) {
    const m = ea.id.match(/-(\d+)$/);
    if (m) anatomyId = Math.max(anatomyId, parseInt(m[1]) + 1);
  }

  for (const item of mapped.anatomy) {
    if (item.content.trim().length < 50) { continue; }
    process.stdout.write(`  ${prefix}-anat-${String(anatomyId).padStart(3, '0')} "${item.title}" ... `);
    try {
      const prompt = buildAnatomyPrompt(item.title, item.content, topic, area, prefix, anatomyId);
      const card = await callLLM(client, prompt);
      if (validators.anatomy(card)) {
        results.anatomia.push(card);
        stats.generated++;
        stats.validated++;
        console.log('OK ✓');
      } else {
        console.log(`SCHEMA INVALID: ${JSON.stringify(validators.anatomy.errors)}`);
        stats.invalid++;
        // Try to salvage by adding missing defaults
        card.aliases = card.aliases || [];
        card.relations = card.relations || [];
        card.images = card.images || [];
        card.updates = card.updates || [];
        if (validators.anatomy(card)) {
          results.anatomia.push(card);
          stats.generated++;
          stats.validated++;
          console.log('  → Salvaged with defaults ✓');
        }
      }
      anatomyId++;
    } catch (e) {
      console.log(`ERRO: ${e.message}`);
      stats.errors++;
      anatomyId++;
    }
    await sleep(DELAY_MS);
  }

  // --- Techniques ---
  console.log(`\nTécnicas (${mapped.technique.length} técnicas):`);
  let techId = 1;
  const existingTechPath = path.join(cardsDir, 'tecnicas.json');
  const existingTech = fs.existsSync(existingTechPath) ? JSON.parse(fs.readFileSync(existingTechPath, 'utf8')) : [];
  for (const et of existingTech) {
    const m = et.id.match(/-(\d+)$/);
    if (m) techId = Math.max(techId, parseInt(m[1]) + 1);
  }

  for (const item of mapped.technique) {
    if (item.content.trim().length < 50) { continue; }
    process.stdout.write(`  ${prefix}-tec-${String(techId).padStart(3, '0')} "${item.title}" ... `);
    try {
      const prompt = buildTechniquePrompt(item.title, item.content, topic, area, prefix, techId);
      const card = await callLLM(client, prompt);
      if (validators.technique(card)) {
        results.tecnicas.push(card);
        stats.generated++;
        stats.validated++;
        console.log('OK ✓');
      } else {
        card.aliases = card.aliases || [];
        card.complications = card.complications || [];
        card.pearls = card.pearls || [];
        card.images = card.images || [];
        card.updates = card.updates || [];
        if (validators.technique(card)) {
          results.tecnicas.push(card);
          stats.generated++;
          stats.validated++;
          console.log('OK (salvaged) ✓');
        } else {
          console.log(`SCHEMA INVALID: ${JSON.stringify(validators.technique.errors)}`);
          stats.invalid++;
        }
      }
      techId++;
    } catch (e) {
      console.log(`ERRO: ${e.message}`);
      stats.errors++;
      techId++;
    }
    await sleep(DELAY_MS);
  }

  // --- Decisions ---
  console.log(`\nDecisões (${mapped.decision.length} árvores):`);
  let decId = 1;
  const existingDecPath = path.join(cardsDir, 'decisoes.json');
  const existingDec = fs.existsSync(existingDecPath) ? JSON.parse(fs.readFileSync(existingDecPath, 'utf8')) : [];
  for (const ed of existingDec) {
    const m = ed.id.match(/-(\d+)$/);
    if (m) decId = Math.max(decId, parseInt(m[1]) + 1);
  }

  for (const item of mapped.decision) {
    if (item.content.trim().length < 50) { continue; }
    process.stdout.write(`  ${prefix}-dec-${String(decId).padStart(3, '0')} "${item.title}" ... `);
    try {
      const prompt = buildDecisionPrompt(item.title, item.content, topic, area, prefix, decId);
      const card = await callLLM(client, prompt);
      if (validators.decision(card)) {
        results.decisoes.push(card);
        stats.generated++;
        stats.validated++;
        console.log('OK ✓');
      } else {
        card.updates = card.updates || [];
        if (validators.decision(card)) {
          results.decisoes.push(card);
          stats.generated++;
          stats.validated++;
          console.log('OK (salvaged) ✓');
        } else {
          console.log(`SCHEMA INVALID: ${JSON.stringify(validators.decision.errors)}`);
          stats.invalid++;
        }
      }
      decId++;
    } catch (e) {
      console.log(`ERRO: ${e.message}`);
      stats.errors++;
      decId++;
    }
    await sleep(DELAY_MS);
  }

  // --- Notes ---
  // Filter out notes with too little content
  const meaningfulNotes = mapped.note.filter(n => n.content.trim().length >= 80);
  console.log(`\nNotas (${meaningfulNotes.length} seções):`);
  let noteId = 1;
  const existingNotePath = path.join(cardsDir, 'notas.json');
  const existingNote = fs.existsSync(existingNotePath) ? JSON.parse(fs.readFileSync(existingNotePath, 'utf8')) : [];
  for (const en of existingNote) {
    const m = en.id.match(/-(\d+)$/);
    if (m) noteId = Math.max(noteId, parseInt(m[1]) + 1);
  }

  for (const item of meaningfulNotes) {
    process.stdout.write(`  ${prefix}-nota-${String(noteId).padStart(3, '0')} "${item.title}" ... `);
    try {
      const prompt = buildNotePrompt(item.title, item.content, topic, area, prefix, noteId, item.section || 'geral');
      const card = await callLLM(client, prompt);
      // Salvage common LLM omissions before validation
      card.images = card.images || [];
      card.updates = card.updates || [];
      if (!card.citations || card.citations.length === 0) card.citations = ['Documento RAG — ' + topic];
      if (!card.content || card.content.length === 0) card.content = [card.title || 'Conteúdo pendente'];

      if (validators.note(card)) {
        results.notas.push(card);
        stats.generated++;
        stats.validated++;
        console.log('OK ✓');
      } else {
        console.log(`SCHEMA INVALID: ${JSON.stringify(validators.note.errors)}`);
        stats.invalid++;
      }
      noteId++;
    } catch (e) {
      console.log(`ERRO: ${e.message}`);
      stats.errors++;
      noteId++;
    }
    await sleep(DELAY_MS);
  }

  // --- Flashcards ---
  console.log(`\nFlashcards:`);
  let fcId = 1;
  const existingFcPath = path.join(cardsDir, 'flashcards.json');
  const existingFc = fs.existsSync(existingFcPath) ? JSON.parse(fs.readFileSync(existingFcPath, 'utf8')) : null;
  if (existingFc && existingFc.id) {
    const m = existingFc.id.match(/-(\d+)$/);
    if (m) fcId = Math.max(fcId, parseInt(m[1]) + 1);
  }

  if (mapped.flashcard.length > 0) {
    process.stdout.write(`  ${prefix}-fc-${String(fcId).padStart(3, '0')} ... `);
    try {
      const prompt = buildFlashcardPrompt(mapped.flashcard[0].content, topic, area, prefix, fcId);
      const card = await callLLM(client, prompt);
      if (validators.flashcard(card)) {
        results.flashcards = card;
        stats.generated++;
        stats.validated++;
        console.log(`OK (${card.cards.length} pares) ✓`);
      } else {
        console.log(`SCHEMA INVALID: ${JSON.stringify(validators.flashcard.errors)}`);
        stats.invalid++;
      }
    } catch (e) {
      console.log(`ERRO: ${e.message}`);
      stats.errors++;
    }
  }

  // --- Merge & Write ---
  if (!dryRun) {
    const mergedAnat = mergeCards(existingAnat, results.anatomia);
    const mergedTech = mergeCards(existingTech, results.tecnicas);
    const mergedDec = mergeCards(existingDec, results.decisoes);
    const mergedNote = mergeCards(existingNote, results.notas);

    fs.writeFileSync(path.join(cardsDir, 'anatomia.json'), JSON.stringify(mergedAnat, null, 2), 'utf8');
    fs.writeFileSync(path.join(cardsDir, 'tecnicas.json'), JSON.stringify(mergedTech, null, 2), 'utf8');
    fs.writeFileSync(path.join(cardsDir, 'decisoes.json'), JSON.stringify(mergedDec, null, 2), 'utf8');
    fs.writeFileSync(path.join(cardsDir, 'notas.json'), JSON.stringify(mergedNote, null, 2), 'utf8');

    if (results.flashcards) {
      // Merge flashcard cards arrays if existing
      if (existingFc && existingFc.cards) {
        const existingFronts = new Set(existingFc.cards.map(c => c.front));
        const newCards = results.flashcards.cards.filter(c => !existingFronts.has(c.front));
        results.flashcards.cards = [...existingFc.cards, ...newCards];
      }
      fs.writeFileSync(path.join(cardsDir, 'flashcards.json'), JSON.stringify(results.flashcards, null, 2), 'utf8');
    }

    // --- _meta.json ---
    const meta = {
      topic,
      area,
      displayName: topic.charAt(0).toUpperCase() + topic.slice(1).replace(/-/g, ' '),
      version: 'v1.0',
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      references: extractReferences(markdown),
      articles: extractArticles(markdown),
      cardCounts: {
        anatomia: mergedAnat.length,
        tecnicas: mergedTech.length,
        decisoes: mergedDec.length,
        notas: mergedNote.length,
        flashcards: results.flashcards ? results.flashcards.cards.length : (existingFc ? existingFc.cards.length : 0),
      },
    };
    fs.writeFileSync(path.join(cardsDir, '_meta.json'), JSON.stringify(meta, null, 2), 'utf8');

    console.log(`\nArquivos escritos em: content/cards/${area}/${topic}/`);
  } else {
    console.log('\n[DRY RUN] Nenhum arquivo escrito.');
  }

  // --- Summary ---
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Cards gerados   : ${stats.generated}`);
  console.log(`Validados       : ${stats.validated}`);
  console.log(`Inválidos       : ${stats.invalid}`);
  console.log(`Erros API       : ${stats.errors}`);

  return true;
}

function extractReferences(markdown) {
  const refs = [];
  // Accept both accented and non-accented headers ("Referências Primárias" or "Referencias Primarias")
  const refSection = markdown.match(/## Refer[eê]ncias Prim[aá]rias\n([\s\S]*?)(?=\n## |\n---)/);
  if (refSection) {
    for (const line of refSection[1].split('\n')) {
      const m = line.match(/^- (.+)/);
      if (m) refs.push(m[1].trim());
    }
  }
  return refs;
}

function extractArticles(markdown) {
  const arts = [];
  const artSection = markdown.match(/## Refer[eê]ncias Secund[aá]rias \(Artigos\)\n([\s\S]*?)(?=\n---|\n## )/);
  if (artSection) {
    for (const line of artSection[1].split('\n')) {
      const m = line.match(/^- (.+)/);
      if (m) arts.push(m[1].trim());
    }
  }
  return arts;
}

async function main() {
  const args = process.argv.slice(2);
  const topicIdx = args.indexOf('--topic');
  const areaIdx = args.indexOf('--area');
  const dryRun = args.includes('--dry-run');
  const all = args.includes('--all');

  if (!all && topicIdx === -1) {
    console.error('Uso:');
    console.error('  node tools/rag_to_cards.js --topic <topic> --area <area> [--dry-run]');
    console.error('  node tools/rag_to_cards.js --all [--dry-run]');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Erro: ANTHROPIC_API_KEY não encontrada em .env');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const validators = loadValidator();

  console.log(`Modelo: ${MODEL}`);
  if (dryRun) console.log('[DRY RUN MODE]');
  console.log();

  if (all) {
    const topics = discoverTopics();
    console.log(`Encontrados ${topics.length} temas RAG:\n`);
    for (const { area, topic } of topics) {
      console.log(`  ${area}/${topic}`);
    }
    for (const { area, topic } of topics) {
      await processTopic(client, validators, topic, area, dryRun);
    }
  } else {
    const topic = args[topicIdx + 1];
    const area = areaIdx !== -1 ? args[areaIdx + 1] : 'estetica-facial';
    await processTopic(client, validators, topic, area, dryRun);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
