import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const PORT = 8769;
const OUT_DIR = join(ROOT, 'tools', '_validation_deep');
const FOCUS_TOPICS = ['carcinoma-basocelular', 'carcinoma-espinocelular', 'melanoma-cutaneo', 'otoplastia'];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
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

async function deepValidate(page, topic) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/webapp/library/`, { waitUntil: 'networkidle' });
  await page.waitForSelector(`.topic-item[data-topic="${topic}"]`, { timeout: 8000 });
  await page.click(`.topic-item[data-topic="${topic}"]`);
  await page.waitForSelector('#screen-briefing:not(.hidden)', { timeout: 8000 });
  await page.waitForTimeout(400);

  const report = await page.evaluate(async () => {
    document.querySelectorAll('#screen-briefing details').forEach(d => d.open = true);
    await new Promise(r => setTimeout(r, 300));

    const title = document.querySelector('.briefing-title')?.innerText || '';
    const sections = Array.from(document.querySelectorAll('#screen-briefing > .briefing > details.briefing-section')).map(s => {
      const head = s.querySelector('.briefing-section-title')?.innerText.trim() || '';
      const items = Array.from(s.querySelectorAll('details.briefing-item')).map(it => {
        const t = it.querySelector('.briefing-item-title')?.innerText.trim() || '';
        const bodyLen = (it.querySelector('.briefing-item-body')?.innerText || '').trim().length;
        return { title: t, bodyLen, empty: bodyLen < 40 };
      });
      const rawBody = (s.querySelector('.briefing-section-body')?.innerText || '').trim();
      return { head, itemCount: items.length, emptyItems: items.filter(i => i.empty).length, items, sectionBodyLen: rawBody.length };
    });

    const totalBodyLen = (document.querySelector('.briefing')?.innerText || '').length;
    return { title, sections, totalBodyLen };
  });

  await mkdir(OUT_DIR, { recursive: true });
  await page.screenshot({ path: join(OUT_DIR, `${topic}-expanded.png`), fullPage: true });
  return { ...report, pageErrors: errors };
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();

  for (const t of FOCUS_TOPICS) {
    try {
      const r = await deepValidate(page, t);
      console.log(`\n=== ${t} ===`);
      console.log(`title: "${r.title}" (${r.totalBodyLen} chars total)`);
      for (const s of r.sections) {
        const warn = s.emptyItems > 0 ? ` [${s.emptyItems} empty]` : '';
        console.log(`  ${s.head.padEnd(30)} items=${s.itemCount}${warn} sectionBody=${s.sectionBodyLen}`);
        s.items.filter(i => i.empty).forEach(i => console.log(`    EMPTY: ${i.title} (${i.bodyLen} chars)`));
      }
      if (r.pageErrors.length) console.log('  pageErrors:', r.pageErrors);
    } catch (e) { console.log(`FAIL ${t}: ${e.message}`); }
  }

  await browser.close();
  server.close();
})();
