import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv/dist/2020.js';

const schema = JSON.parse(readFileSync('content/cards/schema.json', 'utf-8'));
const ajv = new Ajv({ strict: false, allErrors: true });
const validateAnatomy = ajv.compile({ ...schema, $ref: '#/$defs/anatomy' });

test('legacy anatomy card with definition still validates', () => {
  const legacy = {
    id: 'abdo-anat-001',
    type: 'anatomy',
    title: 'Camadas',
    topic: 'abdominoplastia',
    area: 'contorno-corporal',
    definition: 'A parede abdominal tem sete camadas.',
    location: 'Abdome anterior.',
    citations: ['Neligan 2023'],
    tags: ['anatomia']
  };
  const ok = validateAnatomy(legacy);
  assert.equal(ok, true, JSON.stringify(validateAnatomy.errors));
});

test('v2 anatomy card with one_liner + clinical_hook validates', () => {
  const v2 = {
    id: 'abdo-anat-002',
    type: 'anatomy',
    title: 'Zonas de Huger',
    topic: 'abdominoplastia',
    area: 'contorno-corporal',
    one_liner: 'Tres zonas de perfusao; Zona III sustenta o retalho.',
    clinical_hook: 'V invertido preserva Zona III — chave de viabilidade.',
    citations: ['Neligan 2023'],
    tags: ['anatomia']
  };
  const ok = validateAnatomy(v2);
  assert.equal(ok, true, JSON.stringify(validateAnatomy.errors));
});

test('v2 anatomy rejects one_liner over cap', () => {
  const tooLong = {
    id: 'abdo-anat-003',
    type: 'anatomy',
    title: 'X',
    topic: 'abdominoplastia',
    area: 'contorno-corporal',
    one_liner: 'x'.repeat(161),
    clinical_hook: 'ok',
    citations: ['c'],
    tags: ['t']
  };
  const ok = validateAnatomy(tooLong);
  assert.equal(ok, false);
});

test('anatomy rejects card missing both definition and one_liner', () => {
  const bare = {
    id: 'abdo-anat-004',
    type: 'anatomy',
    title: 'X',
    topic: 'abdominoplastia',
    area: 'contorno-corporal',
    citations: ['c'],
    tags: ['t']
  };
  const ok = validateAnatomy(bare);
  assert.equal(ok, false);
});
