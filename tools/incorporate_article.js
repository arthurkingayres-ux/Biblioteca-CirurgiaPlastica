/**
 * incorporate_article.js
 * Incorpora um artigo classificado ao JSON do tema e regenera o .docx.
 *
 * Uso:
 *   node tools/incorporate_article.js \
 *     --tema rinoplastia \
 *     --color blue \
 *     --title "Título do box" \
 *     --lines "Linha 1" "Linha 2" "Linha 3" \
 *     --citation "Autor et al. Journal 2026;1:1-10. DOI: 10.xxx" \
 *     --doi "10.1097/PRS.xxx" \
 *     --after-heading "4. Técnicas Cirúrgicas" \
 *     --flashcard "Parâmetro|Valor" \
 *     --description "Descrição para o histórico"
 *
 * Flags:
 *   --tema         (obrigatório) Nome do tema (ex: rinoplastia)
 *   --color        (obrigatório) Cor do box: blue, red, green
 *   --title        (obrigatório) Título do box
 *   --lines        (obrigatório) Linhas de conteúdo (múltiplos argumentos)
 *   --citation     (obrigatório) Citação completa
 *   --doi          (opcional)    DOI do artigo
 *   --after-heading (obrigatório) Heading após o qual inserir o box
 *   --flashcard    (opcional)    Par "Parâmetro|Valor" para adicionar a flashcards
 *   --description  (opcional)    Descrição para o histórico de versão
 *   --dry-run      (opcional)    Mostra o que faria sem salvar
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONTENT_DIR = path.join(__dirname, '..', 'content');

// ─── Parse de argumentos ─────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { lines: [], flashcards: [] };
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    if (arg === '--tema')          { args.tema = argv[++i]; }
    else if (arg === '--color')    { args.color = argv[++i]; }
    else if (arg === '--title')    { args.title = argv[++i]; }
    else if (arg === '--citation') { args.citation = argv[++i]; }
    else if (arg === '--doi')      { args.doi = argv[++i]; }
    else if (arg === '--after-heading') { args.afterHeading = argv[++i]; }
    else if (arg === '--description')   { args.description = argv[++i]; }
    else if (arg === '--dry-run')  { args.dryRun = true; }
    else if (arg === '--lines') {
      // Consome todos os próximos argumentos até encontrar outro flag
      i++;
      while (i < argv.length && !argv[i].startsWith('--')) {
        args.lines.push(argv[i]);
        i++;
      }
      continue; // não incrementar i novamente
    }
    else if (arg === '--flashcard') {
      i++;
      while (i < argv.length && !argv[i].startsWith('--')) {
        args.flashcards.push(argv[i]);
        i++;
      }
      continue;
    }

    i++;
  }

  return args;
}

// ─── Validação de argumentos ─────────────────────────────────────────────────

function validate(args) {
  const errs = [];
  if (!args.tema)         errs.push('--tema é obrigatório');
  if (!args.color)        errs.push('--color é obrigatório');
  if (!['blue', 'red', 'green'].includes(args.color)) errs.push('--color deve ser blue, red ou green');
  if (!args.title)        errs.push('--title é obrigatório');
  if (!args.lines.length) errs.push('--lines é obrigatório (ao menos 1 linha)');
  if (!args.citation)     errs.push('--citation é obrigatório');
  if (!args.afterHeading) errs.push('--after-heading é obrigatório');

  if (errs.length) {
    console.error('Erros de validação:');
    errs.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
}

// ─── Encontrar posição de inserção ───────────────────────────────────────────

function findInsertIndex(body, afterHeading) {
  // Encontrar o heading alvo
  let headingIdx = -1;
  let headingLevel = null;

  for (let i = 0; i < body.length; i++) {
    const el = body[i];
    if (el.type === 'heading' && el.text === afterHeading) {
      headingIdx = i;
      headingLevel = el.level;
      break;
    }
  }

  if (headingIdx === -1) {
    // Tentar busca parcial (o heading começa com o texto fornecido)
    for (let i = 0; i < body.length; i++) {
      const el = body[i];
      if (el.type === 'heading' && el.text.startsWith(afterHeading)) {
        headingIdx = i;
        headingLevel = el.level;
        break;
      }
    }
  }

  if (headingIdx === -1) {
    return { index: -1, headingLevel: null };
  }

  // Avançar até o próximo heading de nível igual ou superior (menor número = maior nível)
  let insertIdx = body.length; // default: final do body
  for (let i = headingIdx + 1; i < body.length; i++) {
    const el = body[i];
    if (el.type === 'heading' && el.level <= headingLevel) {
      insertIdx = i;
      break;
    }
  }

  return { index: insertIdx, headingLevel };
}

// ─── Encontrar flashcards mais próximo da seção ──────────────────────────────

function findNearestFlashcards(body, afterHeading) {
  const { index: sectionEnd } = findInsertIndex(body, afterHeading);
  let headingIdx = -1;

  for (let i = 0; i < body.length; i++) {
    if (body[i].type === 'heading' && (body[i].text === afterHeading || body[i].text.startsWith(afterHeading))) {
      headingIdx = i;
      break;
    }
  }

  if (headingIdx === -1) return -1;

  // Procurar flashcards entre headingIdx e sectionEnd
  for (let i = headingIdx; i < sectionEnd; i++) {
    if (body[i].type === 'flashcards') return i;
  }

  // Se não encontrou na seção, procurar no body inteiro (flashcards mais próximo)
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < body.length; i++) {
    if (body[i].type === 'flashcards') {
      const dist = Math.abs(i - headingIdx);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
  }

  return bestIdx;
}

// ─── Incrementar versão minor ────────────────────────────────────────────────

function bumpMinor(version) {
  const match = version.match(/^v(\d+)\.(\d+)$/);
  if (!match) return version;
  return `v${match[1]}.${parseInt(match[2]) + 1}`;
}

// ─── Validação básica do JSON contra o schema ────────────────────────────────

function validateContent(doc) {
  const required = ['filename', 'title', 'version', 'date', 'history', 'references', 'updates', 'body'];
  const missing = required.filter(f => !(f in doc));
  if (missing.length) {
    throw new Error(`Campos obrigatórios ausentes: ${missing.join(', ')}`);
  }

  if (!Array.isArray(doc.body)) throw new Error('body deve ser um array');
  if (!Array.isArray(doc.history)) throw new Error('history deve ser um array');
  if (!Array.isArray(doc.references)) throw new Error('references deve ser um array');

  const validTypes = ['heading', 'paragraph', 'box', 'flashcards', 'dataTable', 'figure'];
  const validColors = ['blue', 'red', 'green'];

  for (let i = 0; i < doc.body.length; i++) {
    const el = doc.body[i];
    if (!validTypes.includes(el.type)) {
      throw new Error(`body[${i}]: tipo inválido "${el.type}"`);
    }
    if (el.type === 'box' && !validColors.includes(el.color)) {
      throw new Error(`body[${i}]: cor de box inválida "${el.color}"`);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv.slice(2));
  validate(args);

  // Carregar JSON do tema
  const jsonPath = path.join(CONTENT_DIR, `${args.tema}.json`);
  if (!fs.existsSync(jsonPath)) {
    const temas = fs.readdirSync(CONTENT_DIR)
      .filter(f => f.endsWith('.json') && f !== 'schema.json')
      .map(f => f.replace('.json', ''));
    console.error(`Tema "${args.tema}" não encontrado.`);
    console.error(`Temas disponíveis: ${temas.join(', ')}`);
    process.exit(1);
  }

  const doc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Validar estado atual
  validateContent(doc);

  // 1. Criar o novo box
  const newBox = {
    type: 'box',
    color: args.color,
    title: args.title,
    lines: args.lines,
    citation: args.citation,
  };

  // 2. Encontrar posição de inserção
  const { index: insertIdx } = findInsertIndex(doc.body, args.afterHeading);
  if (insertIdx === -1) {
    const headings = doc.body
      .filter(el => el.type === 'heading')
      .map(el => `  "${el.text}"`);
    console.error(`Heading "${args.afterHeading}" não encontrado no tema "${args.tema}".`);
    console.error('Headings disponíveis:');
    headings.forEach(h => console.error(h));
    process.exit(1);
  }

  // 3. Inserir box
  doc.body.splice(insertIdx, 0, newBox);
  console.log(`✓ Box ${args.color.toUpperCase()} inserido na posição ${insertIdx}`);

  // 4. Flashcards (se fornecidos)
  if (args.flashcards.length) {
    const fcIdx = findNearestFlashcards(doc.body, args.afterHeading);
    if (fcIdx >= 0) {
      for (const fc of args.flashcards) {
        const [param, valor] = fc.split('|');
        if (param && valor) {
          doc.body[fcIdx].rows.push([param.trim(), valor.trim()]);
          console.log(`✓ Flashcard adicionado: "${param.trim()}" → "${valor.trim()}"`);
        }
      }
    } else {
      console.log('⚠ Nenhuma tabela de flashcards encontrada — flashcard não adicionado');
    }
  }

  // 5. Atualizar updates.entries
  doc.updates.entries.push(args.citation);
  console.log('✓ Citação adicionada a updates.entries');

  // 6. Incrementar versão
  const oldVersion = doc.version;
  doc.version = bumpMinor(oldVersion);
  console.log(`✓ Versão: ${oldVersion} → ${doc.version}`);

  // 7. Atualizar data e histórico
  const today = new Date().toISOString().slice(0, 10);
  doc.date = today;
  doc.updates.label = `${doc.version} (${today})`;
  const desc = args.description || `Incorporação: ${args.title}`;
  doc.history.push([doc.version, today, desc]);
  console.log(`✓ Histórico atualizado: ${doc.version} — ${desc}`);

  // 8. Validar resultado
  validateContent(doc);
  console.log('✓ JSON validado contra schema');

  if (args.dryRun) {
    console.log('\n[DRY RUN] Nenhuma alteração salva.');
    return;
  }

  // 9. Salvar JSON
  fs.writeFileSync(jsonPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  console.log(`✓ Salvo: ${jsonPath}`);

  // 10. Regenerar .docx
  try {
    const nodeExe = process.execPath;
    const createDocx = path.join(__dirname, 'create_docx.js');
    execSync(`"${nodeExe}" "${createDocx}" --topic ${args.tema}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
  } catch (e) {
    console.error('⚠ Falha ao regenerar .docx:', e.message);
  }

  // 11. Marcar artigo como incorporado (se DOI fornecido e Python disponível)
  if (args.doi) {
    try {
      const markScript = path.join(__dirname, 'mark_article_incorporated.py');
      if (fs.existsSync(markScript)) {
        execSync(
          `python "${markScript}" --doi "${args.doi}" --documento "${doc.filename}"`,
          { stdio: 'inherit', cwd: path.join(__dirname, '..') }
        );
      }
    } catch (e) {
      console.log('⚠ mark_article_incorporated.py não executado:', e.message.split('\n')[0]);
    }
  }

  console.log('\n✓ Incorporação concluída.');
}

main();
