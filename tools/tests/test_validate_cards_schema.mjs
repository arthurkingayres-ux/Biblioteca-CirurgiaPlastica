import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(REPO_ROOT, 'tools', 'validate_cards_schema.mjs');

test('validate_cards_schema.mjs runs and reports OK/FAIL counts', () => {
  const r = spawnSync('node', [SCRIPT], { encoding: 'utf8', cwd: REPO_ROOT });
  // Após o schema relax (Phase 7.6.5), o validator passa em master.
  assert.match(r.stdout, /OK:\s*\d+/, `stdout missing OK count: ${r.stdout}`);
  assert.match(r.stdout, /FAIL:\s*\d+/, `stdout missing FAIL count: ${r.stdout}`);
});

test('validate_cards_schema.mjs exits 0 when all cards pass', () => {
  const r = spawnSync('node', [SCRIPT], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.equal(r.status, 0, `exit ${r.status}; stdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
});
