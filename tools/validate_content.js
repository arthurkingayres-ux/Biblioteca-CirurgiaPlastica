/**
 * validate_content.js
 * Valida todos os arquivos content/*.json contra o schema e verifica integridade.
 *
 * Uso:
 *   node tools/validate_content.js            # valida todos os temas
 *   node tools/validate_content.js --topic X   # valida apenas o tema X
 *
 * Verifica:
 *   1. Conformidade com content/schema.json (via Ajv)
 *   2. Headings level 1 numerados sequencialmente
 *   3. Boxes com citation presente
 *   4. Flashcards com ao menos 1 row
 *   5. Versão e data coerentes com history
 *   6. Referências de imagem existem em assets/images/<tema>/
 *   7. Acentuação portuguesa (detecta palavras sem diacríticos)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const Ajv2020  = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const ASSETS_DIR  = path.join(__dirname, '..', 'assets', 'images');
const SCHEMA_PATH = path.join(CONTENT_DIR, 'schema.json');

// ─── Schema validation ─────────────────────────────────────────────────────

function loadValidator() {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

// ─── Accent checks ─────────────────────────────────────────────────────────

// Words that MUST have diacritics in Portuguese medical text.
// Each entry: [regex pattern (case-insensitive), correct form for display]
const ACCENT_RULES = [
  // -ção/-ções patterns (most common)
  [/\bdisseccao\b/gi, 'dissecção'],
  [/\bvascularizacao\b/gi, 'vascularização'],
  [/\bmarcacoes?\b/gi, 'marcação/marcações'],
  [/\binfiltracoes?\b/gi, 'infiltração/infiltrações'],
  [/\blipoaspiracao\b/gi, 'lipoaspiração'],
  [/\bcomplicacoes?\b/gi, 'complicação/complicações'],
  [/\barticulacoes?\b/gi, 'articulação/articulações'],
  [/\bindicacoes?\b/gi, 'indicação/indicações'],
  [/\bcontraindicacoes?\b/gi, 'contraindicação'],
  [/\belevacao\b/gi, 'elevação'],
  [/\bperfusao\b/gi, 'perfusão'],
  [/\btransluminacao\b/gi, 'transluminação'],
  [/\bescarificacao\b/gi, 'escarificação'],
  [/\bnutricao\b/gi, 'nutrição'],
  [/\bclassificacao\b/gi, 'classificação'],
  [/\birrigacao\b/gi, 'irrigação'],
  [/\binervacao\b/gi, 'inervação'],
  [/\bfixacao\b/gi, 'fixação'],
  [/\bresseccao\b/gi, 'ressecção'],
  [/\bexcisao\b/gi, 'excisão'],
  [/\bincisao\b/gi, 'incisão'],
  [/\bcicatrizacao\b/gi, 'cicatrização'],
  [/\bavaliacao\b/gi, 'avaliação'],
  [/\bverificacao\b/gi, 'verificação'],
  [/\bseparacao\b/gi, 'separação'],
  [/\bpreservacao\b/gi, 'preservação'],
  [/\bsustentacao\b/gi, 'sustentação'],
  [/\bprojecao\b/gi, 'projeção'],
  [/\brotacao\b/gi, 'rotação'],
  [/\bpreparacao\b/gi, 'preparação'],
  [/\bmanipulacao\b/gi, 'manipulação'],
  [/\breconstrucao\b/gi, 'reconstrução'],
  [/\breducao\b/gi, 'redução'],
  [/\bcorrecao\b/gi, 'correção'],
  [/\bposicao\b/gi, 'posição'],
  [/\bdepressao\b/gi, 'depressão'],
  [/\bporcao\b/gi, 'porção'],
  [/\bporcoes\b/gi, 'porções'],
  [/\bdimensoes\b/gi, 'dimensões'],
  [/\bregioes?\b/gi, 'região/regiões'],

  // -ão
  [/\bpavilhao\b/gi, 'pavilhão'],
  [/\bregiao\b/gi, 'região'],
  [/\bextensao\b/gi, 'extensão'],
  [/\bdimensao\b/gi, 'dimensão'],

  // Accent on vowels
  [/\bsubcutanea?\b/gi, 'subcutânea/subcutâneo'],
  [/\bmusculos?\b/gi, 'músculo/músculos'],
  [/\barterias?\b/gi, 'artéria/artérias'],
  [/\blinfaticos?\b/gi, 'linfático/linfáticos'],
  [/\bsubdermicos?\b/gi, 'subdérmico/subdérmicos'],
  [/\bepigastrica\b/gi, 'epigástrica'],
  [/\biliaca\b/gi, 'ilíaca'],
  [/\bestetica\b/gi, 'estética'],
  [/\bestetico\b/gi, 'estético'],
  [/\bcirurgica\b/gi, 'cirúrgica'],
  [/\bcirurgico\b/gi, 'cirúrgico'],
  [/\btecnicas?\b/gi, 'técnica/técnicas'],
  [/\btecnico\b/gi, 'técnico'],
  [/\banatomica\b/gi, 'anatômica'],
  [/\banatomico\b/gi, 'anatômico'],
  [/\bacustico\b/gi, 'acústico'],
  [/\belastica\b/gi, 'elástica'],
  [/\bplastica\b/gi, 'plástica'],
  [/\bplastico\b/gi, 'plástico'],
  [/\bpalpebras?\b/gi, 'pálpebra/pálpebras'],
  [/\borbita\b/gi, 'órbita'],
  [/\bosseo\b/gi, 'ósseo'],
  [/\bossea\b/gi, 'óssea'],
  [/\bperiosteo\b/gi, 'periósteo'],
  [/\bcranio\b/gi, 'crânio'],
  [/\bangulo\b/gi, 'ângulo'],
  [/\blobulo\b/gi, 'lóbulo'],
  [/\bfascia\b/gi, 'fáscia'],
  [/\bminima\b/gi, 'mínima'],
  [/\bminimo\b/gi, 'mínimo'],
  [/\bmaximo\b/gi, 'máximo'],
  [/\bmaxima\b/gi, 'máxima'],
  [/\bmovel\b/gi, 'móvel'],
  [/\bnivel\b/gi, 'nível'],
  [/\bniveis\b/gi, 'níveis'],
  [/\bvisivel\b/gi, 'visível'],
  [/\bpossivel\b/gi, 'possível'],
  [/\bsuscetivel\b/gi, 'suscetível'],
  [/\bprincipio\b/gi, 'princípio'],
  [/\bintrinsecas?\b/gi, 'intrínseca/intrínsecas'],
  [/\bextrinsecas?\b/gi, 'extrínseca/extrínsecas'],
  [/\besbranquicada\b/gi, 'esbranquiçada'],
  [/\barcabouco\b/gi, 'arcabouço'],
  [/\bprotuberancia\b/gi, 'protuberância'],
  [/\bzigomatico\b/gi, 'zigomático'],
  [/\bzigomatica\b/gi, 'zigomática'],
];

/**
 * Scans a string for Portuguese words missing diacritics.
 * Returns array of { word, correct, count }.
 */
function checkAccents(text) {
  const issues = [];
  for (const [regex, correct] of ACCENT_RULES) {
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      issues.push({ word: matches[0], correct, count: matches.length });
    }
  }
  return issues;
}

/**
 * Extract all text content from a JSON document (deep traversal).
 */
function extractAllText(obj) {
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map(extractAllText).join(' ');
  if (obj && typeof obj === 'object') {
    return Object.values(obj).map(extractAllText).join(' ');
  }
  return '';
}

// ─── Semantic checks ────────────────────────────────────────────────────────

function semanticChecks(doc, tema) {
  const warnings = [];
  const errors = [];

  // 1. Headings level 1 should be numbered sequentially
  const h1s = doc.body.filter(el => el.type === 'heading' && el.level === 1);
  let expectedNum = 1;
  for (const h of h1s) {
    const match = h.text.match(/^(\d+)\./);
    if (match) {
      const num = parseInt(match[1]);
      if (num !== expectedNum) {
        warnings.push(`Heading H1 "${h.text}": esperado número ${expectedNum}, encontrado ${num}`);
      }
      expectedNum = num + 1;
    }
  }

  // 2. Boxes should have citation
  doc.body.forEach((el, i) => {
    if (el.type === 'box' && !el.citation) {
      warnings.push(`body[${i}] box "${el.title}": sem citation`);
    }
  });

  // 3. Flashcards should have at least 1 row
  doc.body.forEach((el, i) => {
    if (el.type === 'flashcards' && (!el.rows || el.rows.length === 0)) {
      warnings.push(`body[${i}] flashcards: sem rows`);
    }
  });

  // 4. Version should match last history entry
  if (doc.history.length > 0) {
    const lastEntry = doc.history[doc.history.length - 1];
    if (lastEntry[0] !== doc.version) {
      errors.push(`version "${doc.version}" não corresponde ao último history "${lastEntry[0]}"`);
    }
    if (lastEntry[1] !== doc.date) {
      warnings.push(`date "${doc.date}" não corresponde ao último history "${lastEntry[1]}"`);
    }
  }

  // 5. updates.label should contain version
  if (!doc.updates.label.includes(doc.version)) {
    warnings.push(`updates.label "${doc.updates.label}" não contém a versão "${doc.version}"`);
  }

  // 6. Figure images should exist
  doc.body.forEach((el, i) => {
    if (el.type === 'figure') {
      const imgPath = path.join(ASSETS_DIR, tema, el.image);
      if (!fs.existsSync(imgPath)) {
        warnings.push(`body[${i}] figure "${el.image}": arquivo não encontrado em assets/images/${tema}/`);
      }
    }
  });

  // 7. DataTable rows should match header count
  doc.body.forEach((el, i) => {
    if (el.type === 'dataTable') {
      const colCount = el.headers.length;
      el.rows.forEach((row, ri) => {
        if (row.length !== colCount) {
          errors.push(`body[${i}] dataTable row[${ri}]: ${row.length} colunas, esperado ${colCount}`);
        }
      });
    }
  });

  // 8. Accent check — scan all text for missing diacritics
  const allText = extractAllText(doc);
  const accentIssues = checkAccents(allText);
  for (const issue of accentIssues) {
    errors.push(`Acentuação: "${issue.word}" → deveria ser "${issue.correct}" (${issue.count}x)`);
  }

  return { errors, warnings };
}

// ─── Validate card files ───────────────────────────────────────────────────

function validateCards() {
  const cardsDir = path.join(CONTENT_DIR, 'cards');
  if (!fs.existsSync(cardsDir)) return [];

  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.json') || entry.name === 'schema.json') continue;

      const content = fs.readFileSync(full, 'utf-8');
      const allText = extractAllText(JSON.parse(content));
      const accentIssues = checkAccents(allText);
      if (accentIssues.length > 0) {
        const rel = path.relative(CONTENT_DIR, full).replace(/\\/g, '/');
        results.push({ file: rel, issues: accentIssues });
      }
    }
  }
  walk(cardsDir);
  return results;
}

// ─── Validate one topic ─────────────────────────────────────────────────────

function validateTopic(tema, validate, jsonPath) {
  if (!jsonPath) jsonPath = path.join(CONTENT_DIR, `${tema}.json`);
  const doc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const result = { tema, schemaValid: true, schemaErrors: [], errors: [], warnings: [] };

  // Schema validation
  const valid = validate(doc);
  if (!valid) {
    result.schemaValid = false;
    result.schemaErrors = validate.errors.map(e => {
      const loc = e.instancePath || '/';
      return `${loc}: ${e.message}`;
    });
  }

  // Semantic checks
  const { errors, warnings } = semanticChecks(doc, tema);
  result.errors = errors;
  result.warnings = warnings;

  return result;
}

// ─── List topics ────────────────────────────────────────────────────────────

function listTopics() {
  const topics = [];
  for (const entry of fs.readdirSync(CONTENT_DIR, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const areaDir = path.join(CONTENT_DIR, entry.name);
      for (const f of fs.readdirSync(areaDir)) {
        if (f.endsWith('.json') && f !== 'schema.json') {
          topics.push({ topic: f.replace('.json', ''), jsonPath: path.join(areaDir, f) });
        }
      }
    } else if (entry.name.endsWith('.json') && entry.name !== 'schema.json') {
      topics.push({ topic: entry.name.replace('.json', ''), jsonPath: path.join(CONTENT_DIR, entry.name) });
    }
  }
  return topics;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const tIdx = args.indexOf('--topic');
  const topic = tIdx >= 0 ? args[tIdx + 1] : null;

  const validate = loadValidator();
  const allTopics = listTopics();
  const topics = topic
    ? allTopics.filter(t => t.topic === topic)
    : allTopics;

  if (topics.length === 0) {
    console.error(topic
      ? `Tema "${topic}" não encontrado. Disponíveis: ${allTopics.map(t => t.topic).join(', ')}`
      : 'Nenhum tema encontrado em content/');
    process.exit(1);
  }

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const { topic: tema, jsonPath } of topics) {
    if (!fs.existsSync(jsonPath)) {
      console.error(`x ${tema}: arquivo não encontrado`);
      totalErrors++;
      continue;
    }

    const result = validateTopic(tema, validate, jsonPath);

    if (result.schemaValid && result.errors.length === 0 && result.warnings.length === 0) {
      console.log(`✓ ${tema}: OK`);
    } else {
      const status = result.schemaValid && result.errors.length === 0 ? '⚠' : '✗';
      console.log(`${status} ${tema}:`);

      for (const e of result.schemaErrors) {
        console.log(`    SCHEMA: ${e}`);
        totalErrors++;
      }
      for (const e of result.errors) {
        console.log(`    ERRO: ${e}`);
        totalErrors++;
      }
      for (const w of result.warnings) {
        console.log(`    AVISO: ${w}`);
        totalWarnings++;
      }
    }
  }

  // Also check card files for accent issues
  const cardIssues = validateCards();
  if (cardIssues.length > 0) {
    console.log(`\n─── Acentuação em cards ───`);
    for (const { file, issues } of cardIssues) {
      console.log(`✗ ${file}:`);
      for (const issue of issues) {
        console.log(`    ACENTO: "${issue.word}" → "${issue.correct}" (${issue.count}x)`);
        totalErrors++;
      }
    }
  } else {
    console.log(`\n✓ Cards: acentuação OK`);
  }

  console.log(`\n─── Resumo: ${topics.length} tema(s), ${totalErrors} erro(s), ${totalWarnings} aviso(s) ───`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
