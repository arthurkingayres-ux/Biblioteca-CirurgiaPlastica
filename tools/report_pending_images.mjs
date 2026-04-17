#!/usr/bin/env node
// Varre content/cards/**/anatomia.json, detecta cards v2 com images: [],
// e escreve content/cards/_pending_images.md agrupado por topico.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CARDS_ROOT = path.join(ROOT, 'content', 'cards');
const OUTPUT = path.join(CARDS_ROOT, '_pending_images.md');
const MANIFEST = path.join(CARDS_ROOT, 'manifest.json');

function isV2(card) {
  return typeof card.one_liner === 'string';
}

function walk() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const results = [];
  for (const { area, topic, displayName } of manifest) {
    const p = path.join(CARDS_ROOT, area, topic, 'anatomia.json');
    if (!fs.existsSync(p)) continue;
    const cards = JSON.parse(fs.readFileSync(p, 'utf8'));
    const v2 = cards.filter(isV2);
    if (v2.length === 0) continue;
    const pending = v2.filter(c => !Array.isArray(c.images) || c.images.length === 0);
    results.push({ topic, displayName, area, total: v2.length, pending });
  }
  return results;
}

function render(results) {
  const lines = [];
  lines.push('# Pendências de imagem — cards anatomia v2');
  lines.push('');
  lines.push('Gerado automaticamente por `tools/report_pending_images.mjs`. Rode o script e commite junto com cada PR de tema.');
  lines.push('');
  lines.push('| Tema | v2 cards | Com imagem | Pendentes |');
  lines.push('|---|---|---|---|');

  let totalPending = 0;
  for (const r of results) {
    const withImg = r.total - r.pending.length;
    totalPending += r.pending.length;
    lines.push(`| ${r.displayName} | ${r.total} | ${withImg} | ${r.pending.length} |`);
  }
  lines.push(`| **Total** | | | **${totalPending}** |`);
  lines.push('');

  for (const r of results) {
    if (r.pending.length === 0) continue;
    lines.push(`## ${r.displayName} (${r.area}/${r.topic})`);
    lines.push('');
    for (const c of r.pending) {
      lines.push(`- \`${c.id}\` — ${c.title}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function main() {
  const results = walk();
  const md = render(results);
  fs.writeFileSync(OUTPUT, md, 'utf8');
  const totalPending = results.reduce((a, r) => a + r.pending.length, 0);
  console.log(`Wrote ${OUTPUT} (${totalPending} pendentes)`);
}

main();
