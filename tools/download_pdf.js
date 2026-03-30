'use strict';

/**
 * download_pdf.js
 * Baixa PDFs de artigos PRS e ASJ usando Playwright (Chromium local, roteado pelo VPN).
 *
 * Pré-requisito: VPN UNICAMP ativo antes de executar.
 *
 * Uso:
 *   node tools/download_pdf.js --doi "10.1097/PRS.xxx"
 *   node tools/download_pdf.js --doi "10.1097/PRS.xxx,10.1093/asj/xxx,..."
 *   node tools/download_pdf.js --input .tmp/doi_list.json
 *
 * Saída:
 *   PDFs salvos em 02-Artigos-Periodicos/PRS/ ou /ASJ/
 *   Mapa DOI → caminho local salvo em .tmp/pdf_paths.json
 */

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const ROOT    = path.join(__dirname, '..');
const OUT_PRS = path.join(ROOT, '02-Artigos-Periodicos', 'PRS');
const OUT_ASJ = path.join(ROOT, '02-Artigos-Periodicos', 'ASJ');

// Garante que as pastas existem
[OUT_PRS, OUT_ASJ].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeDoi(doi) {
  return doi.replace(/[/\\:*?"<>|]/g, '_');
}

function detectPublisher(url) {
  if (url.includes('lww.com') || url.includes('ovid.com')) return 'lww';
  if (url.includes('academic.oup.com'))                    return 'oxford';
  return 'unknown';
}

function getOutDir(publisher) {
  return publisher === 'oxford' ? OUT_ASJ : OUT_PRS;
}

// ─── Estratégias de download por publisher ───────────────────────────────────

/**
 * LWW (journals.lww.com) — Plastic and Reconstructive Surgery
 * A URL do PDF é geralmente a URL do artigo com .pdf no lugar de .aspx,
 * ou acessível via botão "PDF" no toolbar do artigo.
 */
async function tryLww(page, articleUrl) {
  // Estratégia 1: substituir .aspx por .pdf na URL
  if (articleUrl.includes('.aspx')) {
    const pdfUrl = articleUrl.replace('.aspx', '.pdf');
    try {
      const resp = await page.goto(pdfUrl, { timeout: 25000 });
      const ct = resp.headers()['content-type'] || '';
      if (ct.includes('pdf')) {
        return await resp.body();
      }
    } catch (_) { /* tenta próxima estratégia */ }
    // Volta para a página do artigo
    await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  }

  // Estratégia 2: aguardar renderização JS e procurar link de PDF no DOM
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

  const pdfHref = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('a'));
    const pdf = all.find(a =>
      a.href &&
      (a.href.toLowerCase().endsWith('.pdf') || a.href.toLowerCase().includes('/pdf')) &&
      !a.href.toLowerCase().includes('infographic') &&
      !a.href.toLowerCase().includes('supplement')
    );
    return pdf ? pdf.href : null;
  });

  if (pdfHref) {
    const resp = await page.goto(pdfHref, { timeout: 25000 });
    const ct = resp.headers()['content-type'] || '';
    if (ct.includes('pdf')) return await resp.body();
  }

  // Estratégia 3: interceptar download via clique no botão PDF
  await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

  const pdfSelectors = [
    'a[aria-label*="PDF" i]',
    'a[title*="PDF" i]',
    'button[aria-label*="PDF" i]',
    'a[href*=".pdf"]',
  ];

  for (const sel of pdfSelectors) {
    const el = await page.$(sel);
    if (el) {
      try {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 15000 }),
          el.click(),
        ]);
        const tmpPath = path.join(ROOT, '.tmp', '_dl_tmp.pdf');
        await download.saveAs(tmpPath);
        return fs.readFileSync(tmpPath);
      } catch (_) { /* tenta próximo */ }
    }
  }

  return null;
}

/**
 * Oxford Academic (academic.oup.com) — Aesthetic Surgery Journal
 */
async function tryOxford(page, articleUrl) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

  // Estratégia 1: link direto de PDF no DOM
  const pdfHref = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('a'));
    const pdf = all.find(a =>
      a.href &&
      (a.href.includes('/pdf/') || a.href.includes('-pdf-')) &&
      !a.href.includes('supplement')
    );
    return pdf ? pdf.href : null;
  });

  if (pdfHref) {
    const resp = await page.goto(pdfHref, { timeout: 25000 });
    const ct = resp.headers()['content-type'] || '';
    if (ct.includes('pdf')) return await resp.body();
    // Oxford às vezes serve o PDF num viewer — tentar outro selector
    await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  }

  // Estratégia 2: clique em botão/link de PDF
  const oxSelectors = [
    'a.article-pdflink',
    'a[class*="pdf"]',
    'a[href*="/pdf/"]',
    'a[aria-label*="PDF" i]',
    'a[title*="PDF" i]',
  ];

  for (const sel of oxSelectors) {
    const el = await page.$(sel);
    if (el) {
      try {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 15000 }),
          el.click(),
        ]);
        const tmpPath = path.join(ROOT, '.tmp', '_dl_tmp.pdf');
        await download.saveAs(tmpPath);
        return fs.readFileSync(tmpPath);
      } catch (_) {
        await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      }
    }
  }

  return null;
}

// ─── Função principal por DOI ────────────────────────────────────────────────

async function downloadOne(doi, page) {
  console.log(`\n→ ${doi}`);

  const filename = sanitizeDoi(doi) + '.pdf';
  const tmpCheck = [OUT_PRS, OUT_ASJ].find(d => fs.existsSync(path.join(d, filename)));
  if (tmpCheck) {
    const p = path.join(tmpCheck, filename);
    console.log(`  Já existe: ${p}`);
    return p;
  }

  // Navega via DOI
  let articleUrl;
  try {
    await page.goto(`https://doi.org/${doi}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    articleUrl = page.url();
    console.log(`  Redirecionado para: ${articleUrl}`);
  } catch (e) {
    console.log(`  ERRO de navegação: ${e.message}`);
    return null;
  }

  const publisher = detectPublisher(articleUrl);
  const outDir    = getOutDir(publisher);
  const outPath   = path.join(outDir, filename);

  console.log(`  Publisher: ${publisher}`);

  let pdfBuffer = null;
  try {
    if (publisher === 'lww')    pdfBuffer = await tryLww(page, articleUrl);
    else if (publisher === 'oxford') pdfBuffer = await tryOxford(page, articleUrl);
    else {
      console.log(`  Publisher desconhecido — tentando estratégia genérica`);
      pdfBuffer = await tryLww(page, articleUrl); // tenta LWW como fallback
    }
  } catch (e) {
    console.log(`  ERRO ao baixar PDF: ${e.message}`);
  }

  if (pdfBuffer && pdfBuffer.length > 1000) {
    fs.writeFileSync(outPath, pdfBuffer);
    console.log(`  ✓ Salvo (${Math.round(pdfBuffer.length / 1024)} KB): ${outPath}`);
    return outPath;
  }

  console.log(`  ✗ Não foi possível baixar o PDF`);
  return null;
}

// ─── Entrada CLI ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let dois = [];

  if (args.includes('--doi')) {
    const idx = args.indexOf('--doi');
    dois = args[idx + 1].split(',').map(d => d.trim()).filter(Boolean);
  } else if (args.includes('--input')) {
    const idx  = args.indexOf('--input');
    const data = JSON.parse(fs.readFileSync(args[idx + 1], 'utf8'));
    dois = Array.isArray(data) ? data : Object.keys(data).filter(k => data[k]);
  } else {
    console.log('Uso:');
    console.log('  node tools/download_pdf.js --doi "10.1097/PRS.xxx"');
    console.log('  node tools/download_pdf.js --doi "10.1097/PRS.xxx,10.1093/asj/xxx"');
    console.log('  node tools/download_pdf.js --input .tmp/doi_list.json');
    process.exit(1);
  }

  if (dois.length === 0) { console.log('Nenhum DOI fornecido.'); process.exit(1); }

  console.log(`\n=== Download de ${dois.length} PDF(s) ===`);
  console.log('VPN UNICAMP deve estar ativo.\n');

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ acceptDownloads: true });
  const page    = await context.newPage();

  // Garante pasta .tmp
  const tmpDir = path.join(ROOT, '.tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  const results = {};
  for (const doi of dois) {
    results[doi] = await downloadOne(doi, page);
  }

  await browser.close();

  // Salva mapa de resultados
  const outJson = path.join(ROOT, '.tmp', 'pdf_paths.json');
  fs.writeFileSync(outJson, JSON.stringify(results, null, 2));

  const ok   = Object.values(results).filter(Boolean).length;
  const fail = dois.length - ok;
  console.log(`\n=== Resultado: ${ok} baixados, ${fail} falhos ===`);
  console.log(`Mapa salvo em: .tmp/pdf_paths.json`);

  if (fail > 0) {
    console.log('\nDOIs que falharam:');
    Object.entries(results).filter(([, v]) => !v).forEach(([d]) => console.log(`  ${d}`));
  }
}

main().catch(err => {
  console.error('\nErro fatal:', err.message);
  process.exit(1);
});
