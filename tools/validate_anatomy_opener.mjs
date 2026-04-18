// tools/validate_anatomy_opener.mjs
// Valida presença do chapter-opener da seção Anatomia em múltiplos briefings.
import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const PORT = 8778;
const TOPICS = ['abdominoplastia', 'rinoplastia', 'blefaroplastia', 'otoplastia'];
const OUT_DIR = join(ROOT, 'tools', '_validation', 'anatomy-opener');

const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.woff2':'font/woff2' };

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

async function run() {
  await (await import('node:fs/promises')).mkdir(OUT_DIR, { recursive: true });
  const server = await serve();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();

  const failures = [];
  for (const topic of TOPICS) {
    await page.goto(`http://localhost:${PORT}/webapp/library/`, { waitUntil: 'networkidle' });
    await page.waitForSelector(`.topic-item[data-topic="${topic}"]`, { timeout: 8000 });
    await page.click(`.topic-item[data-topic="${topic}"]`);
    await page.waitForSelector('#screen-briefing:not(.hidden)', { timeout: 8000 });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      document.querySelectorAll('img[loading="lazy"]').forEach(i => (i.loading = 'eager'));
    });
    await page.waitForLoadState('networkidle');

    const hasModifier = await page.locator('.briefing-section--anatomy').count();
    if (hasModifier === 0) failures.push(`${topic}: .briefing-section--anatomy AUSENTE`);

    const anatomyDetails = page.locator('.briefing-section--anatomy').first();
    if (await anatomyDetails.count() > 0) {
      await anatomyDetails.evaluate(el => el.setAttribute('open', ''));
    }
    await page.screenshot({ path: join(OUT_DIR, `${topic}-anatomy.png`), fullPage: true });
  }

  await browser.close();
  server.close();

  if (failures.length) {
    console.error('FAIL:');
    failures.forEach(f => console.error(' -', f));
    process.exit(1);
  }
  console.log('OK — screenshots em tools/_validation/anatomy-opener/');
}

run();
