import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const PORT = 8767;
const TOPICS = ['lipoaspiracao', 'gluteoplastia', 'contorno-pos-bariatrico', 'otoplastia'];
const OUT_DIR = join(ROOT, 'tools', '_validation');

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
  await page.goto(`http://localhost:${PORT}/webapp/library/`, { waitUntil: 'networkidle' });
  await page.waitForSelector(`.topic-item[data-topic="${topic}"]`, { timeout: 5000 });
  await page.click(`.topic-item[data-topic="${topic}"]`);
  await page.waitForSelector('#screen-briefing:not(.hidden)', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Force eager load (bypass loading="lazy") and wait for all to settle.
  const report = await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll('#screen-briefing img'));
    imgs.forEach(i => { i.loading = 'eager'; if (!i.complete) { const s = i.src; i.src = ''; i.src = s; } });
    await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => {
      const done = () => r(); i.addEventListener('load', done, { once: true });
      i.addEventListener('error', done, { once: true });
      setTimeout(done, 8000);
    })));
    const broken = imgs.filter(i => !i.complete || i.naturalWidth === 0)
      .map(i => ({ src: i.getAttribute('src'), alt: i.alt }));
    return { total: imgs.length, broken };
  });

  await mkdir(OUT_DIR, { recursive: true });
  await page.screenshot({ path: join(OUT_DIR, `${topic}.png`), fullPage: true });
  return report;
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('[pageerror]', e.message));

  const results = {};
  let ok = true;
  for (const t of TOPICS) {
    try {
      const r = await validateTopic(page, t);
      results[t] = r;
      const pass = r.broken.length === 0 && r.total > 0;
      if (!pass) ok = false;
      console.log(`${pass ? 'PASS' : 'FAIL'} ${t}: ${r.total} imagens, ${r.broken.length} quebradas`);
      if (r.broken.length) console.log('  quebradas:', r.broken.slice(0, 5));
    } catch (e) { ok = false; console.log(`FAIL ${t}: ${e.message}`); results[t] = { error: e.message }; }
  }

  await browser.close();
  server.close();
  console.log(`\n${ok ? 'ALL PASS' : 'FAILURES DETECTED'}`);
  console.log(`screenshots: ${OUT_DIR}`);
  process.exit(ok ? 0 : 1);
})();
