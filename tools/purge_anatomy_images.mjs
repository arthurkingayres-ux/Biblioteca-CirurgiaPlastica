#!/usr/bin/env node
// Phase 7.2 — Purge imagens dos cards anatomia v2 em 8 temas contorno+face.
// Uso:
//   node tools/purge_anatomy_images.mjs             # dry-run (padrão)
//   node tools/purge_anatomy_images.mjs --execute   # aplica mudanças
//
// Mutações (execute):
//   - remove campo `images` de cada card anatomia nos 8 temas
//   - move registry JSONs órfãos para content/images/<tema>/_archived/
//   - move PNGs órfãos para assets/images/<tema>/_archived/ e webapp/library/assets/.../_archived/
//   - remove entradas arquivadas de content/images/manifest.json
//   - remove entradas arquivadas de tools/_coords/<tema>.json (arquivo inteiro se zerar)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXECUTE = process.argv.includes('--execute');

const SCOPE = [
  { area: 'contorno-corporal', topic: 'abdominoplastia' },
  { area: 'contorno-corporal', topic: 'contorno-pos-bariatrico' },
  { area: 'contorno-corporal', topic: 'gluteoplastia' },
  { area: 'contorno-corporal', topic: 'lipoaspiracao' },
  { area: 'estetica-facial',   topic: 'blefaroplastia' },
  { area: 'estetica-facial',   topic: 'otoplastia' },
  { area: 'estetica-facial',   topic: 'rinoplastia' },
  { area: 'estetica-facial',   topic: 'ritidoplastia' },
];

// ---------- Helpers ----------

function rel(p) { return path.relative(ROOT, p); }

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf-8')); }

function writeJSON(p, data) {
  const body = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(p, body);
}

function mvFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
}

function allCardFiles(topicDir) {
  return fs.readdirSync(topicDir)
    .filter(f => f.endsWith('.json') && f !== '_meta.json')
    .map(f => path.join(topicDir, f));
}

function imageRefsInCards(cardFiles) {
  const refs = new Set();
  for (const f of cardFiles) {
    const data = readJSON(f);
    const cards = Array.isArray(data) ? data : [data];
    for (const c of cards) {
      if (!Array.isArray(c.images)) continue;
      for (const img of c.images) if (img?.ref) refs.add(img.ref);
    }
  }
  return refs;
}

// ---------- Phase A: collect planned mutations ----------

const plan = {
  cardFilesModified: [],      // [{ path, cards: [{id, removedImages}] }]
  registriesToArchive: [],    // [{ imgId, src, dest }]
  registriesKept: [],         // [{ imgId, reason }]
  pngsToArchive: [],          // [{ src, dest }]
  manifestEntriesToRemove: [], // [imgId]
  coordsEntriesToRemove: [],   // [{ file, imgIds, willBeEmpty }]
};

// manifest.json uses a flat `entries` array: [{ id, file, ... }]
const manifestPath = path.join(ROOT, 'content/images/manifest.json');
const manifest = readJSON(manifestPath);
// Build a Set of manifest entry IDs for quick lookup
const manifestIds = new Set(
  Array.isArray(manifest.entries)
    ? manifest.entries.map(e => e.id)
    : []
);

for (const { area, topic } of SCOPE) {
  const topicDir = path.join(ROOT, 'content/cards', area, topic);
  const anatomyPath = path.join(topicDir, 'anatomia.json');
  if (!fs.existsSync(anatomyPath)) {
    console.error(`[skip] ${rel(anatomyPath)} missing`);
    continue;
  }

  const anatomy = readJSON(anatomyPath);
  const modified = [];
  const anatomyRefs = new Set();
  for (const c of anatomy) {
    if (!Array.isArray(c.images) || c.images.length === 0) continue;
    modified.push({ id: c.id, removedImages: c.images.map(i => i.ref).filter(Boolean) });
    for (const i of c.images) if (i?.ref) anatomyRefs.add(i.ref);
  }
  if (modified.length > 0) {
    plan.cardFilesModified.push({ path: anatomyPath, cards: modified });
  }

  // Check if each ref is shared with other card types in the same topic
  const otherCardFiles = allCardFiles(topicDir).filter(f => path.basename(f) !== 'anatomia.json');
  const otherRefs = imageRefsInCards(otherCardFiles);

  for (const imgId of anatomyRefs) {
    if (otherRefs.has(imgId)) {
      plan.registriesKept.push({ imgId, reason: `shared with non-anatomy cards in ${topic}` });
      continue;
    }

    // Archive registry JSON — registry lives in content/images/<topic>/<imgId>.json
    const registrySrc = path.join(ROOT, 'content/images', topic, `${imgId}.json`);
    if (fs.existsSync(registrySrc)) {
      const registryDest = path.join(ROOT, 'content/images', topic, '_archived', `${imgId}.json`);
      plan.registriesToArchive.push({ imgId, src: registrySrc, dest: registryDest });

      // Find PNG from registry
      const registry = readJSON(registrySrc);
      if (registry.file) {
        // assets/images/<file>
        const pngRel = registry.file;
        const assetSrc = path.join(ROOT, 'assets/images', pngRel);
        const pngName = path.basename(pngRel);
        const pngTopicDir = path.dirname(pngRel);
        if (fs.existsSync(assetSrc)) {
          plan.pngsToArchive.push({
            src: assetSrc,
            dest: path.join(ROOT, 'assets/images', pngTopicDir, '_archived', pngName),
          });
        }
        // webapp/library/assets/images/<file>
        const webappSrc = path.join(ROOT, 'webapp/library/assets/images', pngRel);
        if (fs.existsSync(webappSrc)) {
          plan.pngsToArchive.push({
            src: webappSrc,
            dest: path.join(ROOT, 'webapp/library/assets/images', pngTopicDir, '_archived', pngName),
          });
        }
      }

      // Manifest entry (flat entries array, keyed by .id)
      if (manifestIds.has(imgId)) {
        plan.manifestEntriesToRemove.push(imgId);
      }
    }

    // Coords entry — coords files are arrays with { image_id, label_num, x, y }
    const coordsPath = path.join(ROOT, 'tools/_coords', `${topic}.json`);
    if (fs.existsSync(coordsPath)) {
      const coords = readJSON(coordsPath);
      const hasEntry = Array.isArray(coords) && coords.some(e => e.image_id === imgId);
      if (hasEntry) {
        let entry = plan.coordsEntriesToRemove.find(e => e.file === coordsPath);
        if (!entry) {
          entry = { file: coordsPath, imgIds: [], willBeEmpty: false };
          plan.coordsEntriesToRemove.push(entry);
        }
        if (!entry.imgIds.includes(imgId)) entry.imgIds.push(imgId);
      }
    }
  }
}

// Recompute willBeEmpty for coords (arrays — check if any row survives)
for (const entry of plan.coordsEntriesToRemove) {
  const coords = readJSON(entry.file);
  const remaining = coords.filter(e => !entry.imgIds.includes(e.image_id));
  entry.willBeEmpty = remaining.length === 0;
}

// ---------- Phase B: report ----------

const cardCount = plan.cardFilesModified.reduce((n, f) => n + f.cards.length, 0);
console.log(`=== Phase 7.2 purge plan ${EXECUTE ? '(EXECUTING)' : '(dry-run)'} ===`);
console.log(`Topics in scope            : ${SCOPE.length}`);
console.log(`Card files modified        : ${plan.cardFilesModified.length}`);
console.log(`Cards losing images        : ${cardCount}`);
console.log(`Registry JSONs → _archived : ${plan.registriesToArchive.length}`);
console.log(`Registry JSONs kept (shared): ${plan.registriesKept.length}`);
console.log(`PNGs → _archived           : ${plan.pngsToArchive.length}`);
console.log(`Manifest entries removed   : ${plan.manifestEntriesToRemove.length}`);
console.log(`Coords files touched       : ${plan.coordsEntriesToRemove.length}`);
console.log();

if (plan.registriesKept.length > 0) {
  console.log('Kept (shared):');
  for (const k of plan.registriesKept) console.log(`  ${k.imgId} — ${k.reason}`);
  console.log();
}

if (!EXECUTE) {
  console.log('Dry-run — no files modified. Re-run with --execute to apply.');
  process.exit(0);
}

// ---------- Phase C: execute ----------

// C1. Strip `images` field from each anatomy card
for (const { path: p, cards } of plan.cardFilesModified) {
  const data = readJSON(p);
  const targetIds = new Set(cards.map(c => c.id));
  for (const c of data) {
    if (targetIds.has(c.id)) delete c.images;
  }
  writeJSON(p, data);
  console.log(`  stripped images from ${cards.length} cards in ${rel(p)}`);
}

// C2. Move registry JSONs to _archived/
for (const { src, dest } of plan.registriesToArchive) {
  mvFile(src, dest);
}
console.log(`  archived ${plan.registriesToArchive.length} registry JSONs`);

// C3. Move PNGs to _archived/
for (const { src, dest } of plan.pngsToArchive) {
  mvFile(src, dest);
}
console.log(`  archived ${plan.pngsToArchive.length} PNGs`);

// C4. Manifest — filter entries array (NOT delete keys)
if (plan.manifestEntriesToRemove.length > 0) {
  const m = readJSON(manifestPath);
  const removeSet = new Set(plan.manifestEntriesToRemove);
  m.entries = m.entries.filter(e => !removeSet.has(e.id));
  writeJSON(manifestPath, m);
  console.log(`  removed ${plan.manifestEntriesToRemove.length} manifest entries`);
}

// C5. Coords — filter array by image_id (NOT delete keys)
for (const entry of plan.coordsEntriesToRemove) {
  if (entry.willBeEmpty) {
    const archivedDir = path.join(ROOT, 'tools/_coords/_archived');
    fs.mkdirSync(archivedDir, { recursive: true });
    mvFile(entry.file, path.join(archivedDir, path.basename(entry.file)));
    console.log(`  archived empty coords file ${rel(entry.file)}`);
  } else {
    const coords = readJSON(entry.file);
    const removeSet = new Set(entry.imgIds);
    const filtered = coords.filter(c => !removeSet.has(c.image_id));
    writeJSON(entry.file, filtered);
    console.log(`  removed ${entry.imgIds.length} image IDs (${coords.length - filtered.length} rows) from ${rel(entry.file)}`);
  }
}

console.log('\nDone.');
