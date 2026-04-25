import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('validate_cards_schema.mjs runs and reports OK/FAIL counts', () => {
  const r = spawnSync('node', ['tools/validate_cards_schema.mjs'], { encoding: 'utf8' });
  // Antes do schema relax: exit 1 esperado (drift). Depois: exit 0.
  // Independente disso, o stdout precisa conter o resumo.
  assert.match(r.stdout, /OK:\s*\d+/, `stdout missing OK count: ${r.stdout}`);
  assert.match(r.stdout, /FAIL:\s*\d+/, `stdout missing FAIL count: ${r.stdout}`);
});

test('validate_cards_schema.mjs exits 0 when all cards pass', () => {
  const r = spawnSync('node', ['tools/validate_cards_schema.mjs'], { encoding: 'utf8' });
  assert.equal(r.status, 0, `exit ${r.status}; stdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
});
