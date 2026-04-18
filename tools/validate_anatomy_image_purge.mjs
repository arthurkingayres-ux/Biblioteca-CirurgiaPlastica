#!/usr/bin/env node
// Valida que zero <img>/<figure> renderizam em cards anatomia dos 8 temas v2.
// Uso: node tools/validate_anatomy_image_purge.mjs
// Sobe seu próprio servidor HTTP na porta 8779 (ou BASE_URL para servidor externo).

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const PORT = 8779;

const BRIEFINGS = [
  'abdominoplastia',
  'contorno-pos-bariatrico',
  'gluteoplastia',
  'lipoaspiracao',
  'blefaroplastia',
  'otoplastia',
  'rinoplastia',
  'ritidoplastia',
];

const BASE = process.env.BASE_URL || `http://localhost:${PORT}`;
const IPHONE = { width: 390, height: 844 };

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function serve() {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const fp = join(ROOT, p);
      if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      const st = await stat(fp).catch(() => null);
      if (!st || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
      const data = await readFile(fp);
      res.writeHead(200, { 'Content-Type': MIME[extname(fp).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
  return new Promise(ok => server.listen(PORT, () => ok(server)));
}

async function countAnatomyFigures(page) {
  return page.evaluate(() => {
    const anatomySection = document.querySelector('.briefing-section--anatomy');
    if (!anatomySection) return { figures: 0, imgs: 0, cardCount: 0, error: 'section not found' };
    const cards = anatomySection.querySelectorAll('.card, [data-card-id]');
    let figures = 0, imgs = 0;
    for (const c of cards) {
      figures += c.querySelectorAll('figure').length;
      imgs += c.querySelectorAll('img').length;
    }
    return { figures, imgs, cardCount: cards.length };
  });
}

const server = process.env.BASE_URL ? null : await serve();

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: IPHONE });
const page = await ctx.newPage();

let failed = 0;
for (const topic of BRIEFINGS) {
  // Navigate home first, then click the topic item (SPA navigation)
  await page.goto(`${BASE}/webapp/library/`, { waitUntil: 'networkidle' });
  await page.waitForSelector(`.topic-item[data-topic="${topic}"]`, { timeout: 10000 });
  await page.click(`.topic-item[data-topic="${topic}"]`);
  await page.waitForSelector('#screen-briefing:not(.hidden)', { timeout: 8000 });
  await page.waitForTimeout(600);

  // Force lazy images to resolve eagerly
  await page.evaluate(() => {
    document.querySelectorAll('img[loading="lazy"]').forEach(i => i.loading = 'eager');
  });
  await page.waitForTimeout(600);

  const res = await countAnatomyFigures(page);
  const ok = res.figures === 0 && res.imgs === 0 && res.cardCount > 0 && !res.error;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${topic.padEnd(28)} cards=${res.cardCount} figures=${res.figures} imgs=${res.imgs}${res.error ? ' (' + res.error + ')' : ''}`);
  if (!ok) failed++;
}

await browser.close();
if (server) server.close();

if (failed > 0) {
  console.error(`\n${failed}/${BRIEFINGS.length} briefings failed.`);
  process.exit(1);
}
console.log(`\nAll ${BRIEFINGS.length} briefings clean — zero anatomy figures.`);
