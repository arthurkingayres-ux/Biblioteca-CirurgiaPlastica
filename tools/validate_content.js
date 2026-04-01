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

  return { errors, warnings };
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

  console.log(`\n─── Resumo: ${topics.length} tema(s), ${totalErrors} erro(s), ${totalWarnings} aviso(s) ───`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
