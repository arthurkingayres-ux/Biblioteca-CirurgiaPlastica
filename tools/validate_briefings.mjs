import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const PORT = 8767;
const TOPICS = ['lipoaspiracao', 'gluteoplastia', 'contorno-pos-bariatrico', 'otoplastia', 'abdominoplastia'];

const EXPECTED_IMAGE_COUNTS = {
  lipoaspiracao: null,
  gluteoplastia: null,
  'contorno-pos-bariatrico': null,
  otoplastia: null,
  abdominoplastia: null, // flipa para 6 no PR #2
};
const OUT_DIR = join(ROOT, 'tools', '_validation');

const themeArg = (process.argv.find(a => a.startsWith('--theme=')) || '--theme=both').split('=')[1];
const THEMES = themeArg === 'both' ? ['light', 'dark'] : [themeArg];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.woff2': 'font/woff2',
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

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('atlasTheme', t);
    window.AtlasTheme && window.AtlasTheme.apply(t);
  }, theme);
}

async function validateTopic(page, topic, theme) {
  await page.goto(`http://localhost:${PORT}/webapp/library/?t=${theme}`, { waitUntil: 'networkidle' });
  await setTheme(page, theme);
  await page.waitForSelector(`.topic-item[data-topic="${topic}"]`, { timeout: 5000 });
  await page.click(`.topic-item[data-topic="${topic}"]`);
  await page.waitForSelector('#screen-briefing:not(.hidden)', { timeout: 5000 });
  await page.waitForTimeout(400);

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
    const theme = document.documentElement.getAttribute('data-theme');
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const heroCount = document.querySelectorAll('.briefing-hero .role-hero').length;
    const badgeTypes = [...new Set(Array.from(document.querySelectorAll('.card-badge')).map(b => [...b.classList].find(c => c.startsWith('badge-'))))];
    const placeholders = document.querySelectorAll('.card-figure.placeholder').length;
    return { total: imgs.length, broken, theme, bodyBg, heroCount, badgeTypes, placeholders };
  });

  await mkdir(OUT_DIR, { recursive: true });
  await page.screenshot({ path: join(OUT_DIR, `${topic}-${theme}.png`), fullPage: true });
  return report;
}

async function smokeToggle(page) {
  await page.goto(`http://localhost:${PORT}/webapp/library/`, { waitUntil: 'networkidle' });
  const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.click('#btn-theme');
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  return { before, after, toggled: before !== after };
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('[pageerror]', e.message));

  let ok = true;
  for (const theme of THEMES) {
    console.log(`\n=== Theme: ${theme} ===`);
    for (const t of TOPICS) {
      try {
        const r = await validateTopic(page, t, theme);
        const pass = r.broken.length === 0 && r.total > 0 && r.heroCount === 1 && r.theme === theme && r.placeholders === 0;
        if (!pass) ok = false;
        console.log(`${pass ? 'PASS' : 'FAIL'} ${t} [${theme}]: ${r.total} img, ${r.broken.length} broken, ${r.placeholders} placeholder, hero=${r.heroCount}, bg=${r.bodyBg}, badges=${r.badgeTypes.join(',')}`);
        if (r.broken.length) console.log('  broken:', r.broken.slice(0, 5));
        const expected = EXPECTED_IMAGE_COUNTS[t];
        if (expected !== null && r.total !== expected) {
          console.log(`  WARN expected ${expected} images for ${t}, got ${r.total}`);
        }
      } catch (e) { ok = false; console.log(`FAIL ${t} [${theme}]: ${e.message}`); }
    }
  }

  const toggle = await smokeToggle(page);
  const togglePass = toggle.toggled;
  if (!togglePass) ok = false;
  console.log(`\nToggle smoke: ${togglePass ? 'PASS' : 'FAIL'} (${toggle.before} -> ${toggle.after})`);

  await browser.close();
  server.close();
  console.log(`\n${ok ? 'ALL PASS' : 'FAILURES DETECTED'}`);
  console.log(`screenshots: ${OUT_DIR}`);
  process.exit(ok ? 0 : 1);
})();
