import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const PORT = 8767;
const TOPICS = ['lipoaspiracao', 'gluteoplastia', 'contorno-pos-bariatrico', 'otoplastia', 'abdominoplastia', 'blefaroplastia', 'rinoplastia', 'ritidoplastia'];

const EXPECTED_IMAGE_COUNTS = {
  lipoaspiracao: null,
  gluteoplastia: null,
  'contorno-pos-bariatrico': null,
  otoplastia: null,
  abdominoplastia: 14,
};
const OUT_DIR = join(ROOT, 'tools', '_validation');
const CARDS_ROOT = join(ROOT, 'content', 'cards');
const MANIFEST_PATH = join(CARDS_ROOT, 'manifest.json');

const argv = process.argv.slice(2);
const themeArg = (argv.find(a => a.startsWith('--theme=')) || '--theme=both').split('=')[1];
const THEMES = themeArg === 'both' ? ['light', 'dark'] : [themeArg];
const CHECK_IMAGE_COUNTS_ONLY = argv.includes('--check-image-counts-only');
const REPORT_PENDING = argv.includes('--report-pending');
const topicFlagIdx = argv.indexOf('--topic');
const ONLY_TOPIC = topicFlagIdx >= 0 ? argv[topicFlagIdx + 1] : null;

function readAnatomia(area, topic) {
  const p = join(CARDS_ROOT, area, topic, 'anatomia.json');
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

function isV2Card(card) {
  return typeof card.one_liner === 'string';
}

function countImages(cards) {
  let withImages = 0;
  let pending = 0;
  const pendingCards = [];
  for (const c of cards) {
    if (!isV2Card(c)) continue;
    if (Array.isArray(c.images) && c.images.length > 0) {
      withImages++;
    } else {
      pending++;
      pendingCards.push(c);
    }
  }
  return { withImages, pending, pendingCards, totalV2: withImages + pending };
}

function checkImageCounts(topics, { reportPending = false } = {}) {
  const report = [];
  let hardFail = false;

  for (const { area, topic } of topics) {
    const cards = readAnatomia(area, topic);
    if (!cards) continue;
    const { withImages, pending, pendingCards, totalV2 } = countImages(cards);

    if (totalV2 === 0) {
      report.push(`${topic}: legacy (sem metrica v2)`);
      continue;
    }

    // Phase 7.2 invariant: anatomia v2 cards dos 8 temas contorno+face
    // NAO devem ter imagens. Reintroducao futura via visual companion
    // card-a-card exigira revisitar este check.
    if (withImages > 0) {
      hardFail = true;
      report.push(`${topic}: FAIL ${withImages} card(s) com imagem — Phase 7.2 purge exige zero`);
    } else {
      report.push(`${topic}: OK (${totalV2} cards anatomia, zero imagens — pos purge 7.2)`);
    }
    if (reportPending && pendingCards.length > 0) {
      for (const c of pendingCards) {
        report.push(`  pendente: ${c.id} - ${c.title}`);
      }
    }
  }

  return { report, hardFail };
}

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
    const figContainers = document.querySelectorAll('.fig-container').length;
    const markers = document.querySelectorAll('.fig-marker').length;
    return { total: imgs.length, broken, theme, bodyBg, heroCount, badgeTypes, placeholders, figContainers, markers };
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
  if (CHECK_IMAGE_COUNTS_ONLY) {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    const topics = ONLY_TOPIC ? manifest.filter(m => m.topic === ONLY_TOPIC) : manifest;
    const { report, hardFail } = checkImageCounts(topics, { reportPending: REPORT_PENDING });
    for (const line of report) console.log(line);
    process.exit(hardFail ? 1 : 0);
  }

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
        console.log(`${pass ? 'PASS' : 'FAIL'} ${t} [${theme}]: ${r.total} img, ${r.broken.length} broken, ${r.placeholders} placeholder, hero=${r.heroCount}, markers=${r.markers}/${r.figContainers}, bg=${r.bodyBg}, badges=${r.badgeTypes.join(',')}`);
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

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const { report: imgReport, hardFail: imgFail } = checkImageCounts(manifest);
  console.log('\n=== Image count check ===');
  for (const line of imgReport) console.log(line);
  if (imgFail) {
    ok = false;
    console.error('Image count check failed');
  }

  console.log(`\n${ok ? 'ALL PASS' : 'FAILURES DETECTED'}`);
  console.log(`screenshots: ${OUT_DIR}`);
  process.exit(ok ? 0 : 1);
})();
