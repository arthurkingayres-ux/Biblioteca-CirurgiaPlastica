import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const PORT = 8768;
const OUT_DIR = join(ROOT, 'tools', '_validation_all');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const full = join(ROOT, p);
      if (!full.startsWith(ROOT)) return res.writeHead(403).end();
      const st = await stat(full).catch(() => null);
      if (!st || !st.isFile()) return res.writeHead(404).end('not found');
      res.writeHead(200, { 'Content-Type': MIME[extname(full)] || 'application/octet-stream' });
      res.end(await readFile(full));
    } catch (e) { res.writeHead(500).end(String(e)); }
  });
  return new Promise(r => server.listen(PORT, () => r(server)));
}

async function validateTopic(page, topic) {
  const errors = [];
  const handler = e => errors.push(e.message);
  page.on('pageerror', handler);
  await page.goto(`http://localhost:${PORT}/webapp/library/`, { waitUntil: 'networkidle' });
  await page.waitForSelector(`.topic-item[data-topic="${topic}"]`, { timeout: 8000 });
  await page.click(`.topic-item[data-topic="${topic}"]`);
  await page.waitForSelector('#screen-briefing:not(.hidden)', { timeout: 8000 });
  await page.waitForTimeout(600);

  const report = await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll('#screen-briefing img'));
    imgs.forEach(i => { i.loading = 'eager'; if (!i.complete) { const s = i.src; i.src = ''; i.src = s; } });
    await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => {
      const done = () => r();
      i.addEventListener('load', done, { once: true });
      i.addEventListener('error', done, { once: true });
      setTimeout(done, 8000);
    })));
    const broken = imgs.filter(i => !i.complete || i.naturalWidth === 0)
      .map(i => ({ src: i.getAttribute('src'), alt: i.alt }));
    const cardCount = document.querySelectorAll('#screen-briefing .card, #screen-briefing article, #screen-briefing section').length;
    const bodyText = (document.querySelector('#screen-briefing')?.innerText || '').trim();
    const hasEmpty = bodyText.length < 80;
    return { totalImgs: imgs.length, broken, cardCount, bodyLen: bodyText.length, hasEmpty };
  });

  page.off('pageerror', handler);
  await mkdir(OUT_DIR, { recursive: true });
  await page.screenshot({ path: join(OUT_DIR, `${topic}.png`), fullPage: true });
  return { ...report, pageErrors: errors };
}

(async () => {
  const server = await startServer();
  const manifest = JSON.parse(await readFile(join(ROOT, 'content/cards/manifest.json'), 'utf-8'));
  const topics = manifest.filter(m => m.status === 'complete').map(m => m.topic);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();

  const results = {};
  let ok = true;
  for (const t of topics) {
    try {
      const r = await validateTopic(page, t);
      results[t] = r;
      const pass = r.broken.length === 0 && !r.hasEmpty && r.pageErrors.length === 0;
      if (!pass) ok = false;
      const flags = [
        r.broken.length ? `${r.broken.length} broken-img` : '',
        r.hasEmpty ? 'EMPTY' : '',
        r.pageErrors.length ? `${r.pageErrors.length} page-error` : '',
      ].filter(Boolean).join(', ');
      console.log(`${pass ? 'PASS' : 'FAIL'} ${t.padEnd(35)} imgs=${r.totalImgs} bodyLen=${r.bodyLen} ${flags}`);
      if (r.broken.length) console.log('  broken:', r.broken.slice(0, 3));
      if (r.pageErrors.length) console.log('  errors:', r.pageErrors.slice(0, 3));
    } catch (e) {
      ok = false;
      console.log(`FAIL ${t}: ${e.message}`);
      results[t] = { error: e.message };
    }
  }

  await browser.close();
  server.close();
  console.log(`\n${ok ? 'ALL PASS' : 'FAILURES DETECTED'}`);
  console.log(`screenshots: ${OUT_DIR}`);
  process.exit(ok ? 0 : 1);
})();
