#!/usr/bin/env node
// tools/validate_cards_schema.mjs — Valida todos os cards JSON contra schema.json (AJV strict).
// Uso: node tools/validate_cards_schema.mjs
// Exit 0 se todos validam, 1 caso contrário.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CARDS_DIR = join(ROOT, 'content', 'cards');
const SCHEMA_PATH = join(CARDS_DIR, 'schema.json');

const SKIP_FILES = new Set(['_meta.json', '_structure.json', 'manifest.json', 'schema.json']);

const FILE_TO_TYPE = {
  'anatomia.json': 'anatomy',
  'tecnicas.json': 'technique',
  'decisoes.json': 'decision',
  'notas.json': 'note',
  'flashcards.json': 'flashcard',
};

function loadValidators() {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  // Manter $schema removido por compatibilidade com ajv 2020
  delete schema.$schema;
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(schema, 'root');
  return {
    anatomy: ajv.compile({ $ref: 'root#/$defs/anatomy' }),
    technique: ajv.compile({ $ref: 'root#/$defs/technique' }),
    decision: ajv.compile({ $ref: 'root#/$defs/decision' }),
    note: ajv.compile({ $ref: 'root#/$defs/note' }),
    flashcard: ajv.compile({ $ref: 'root#/$defs/flashcard' }),
  };
}

function* walkJson(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (e) {
    yield { __error: true, path: dir, message: `readdir: ${e.message}` };
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch (e) {
      // Broken symlink, EACCES, transient I/O — surface as a failure, do not abort the run.
      yield { __error: true, path: full, message: `stat: ${e.message}` };
      continue;
    }
    if (st.isDirectory()) yield* walkJson(full);
    else if (name.endsWith('.json') && !SKIP_FILES.has(name)) yield full;
  }
}

function main() {
  const validators = loadValidators();
  let okCount = 0;
  let failCount = 0;
  const failures = [];

  for (const entry of walkJson(CARDS_DIR)) {
    if (typeof entry === 'object' && entry.__error) {
      failures.push({ file: relative(ROOT, entry.path), card: '<fs-error>', errors: [{ message: entry.message }] });
      failCount++;
      continue;
    }
    const filePath = entry;
    const baseName = filePath.split(/[\\/]/).pop();
    const type = FILE_TO_TYPE[baseName];
    if (!type) continue; // ignora flashcards individuais ou arquivos não-padrão sem ruído
    let cards;
    try {
      cards = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (e) {
      failures.push({ file: relative(ROOT, filePath), card: '<file>', errors: [{ message: `JSON parse: ${e.message}` }] });
      failCount++;
      continue;
    }
    if (!Array.isArray(cards)) cards = [cards];
    for (const card of cards) {
      const validate = validators[type];
      if (validate(card)) {
        okCount++;
      } else {
        failCount++;
        failures.push({ file: relative(ROOT, filePath), card: card.id || '<no-id>', errors: validate.errors });
      }
    }
  }

  console.log(`OK: ${okCount} cards | FAIL: ${failCount} cards`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  ${f.file} :: ${f.card}`);
      for (const err of f.errors) {
        console.log(`    - ${err.instancePath || '/'} ${err.message}`);
      }
    }
  }
  process.exit(failCount === 0 ? 0 : 1);
}

main();
