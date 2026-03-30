'use strict';

/**
 * fetch_article_text.js
 * Acessa artigos PRS e ASJ via Playwright e extrai o texto completo.
 *
 * — PRS (LWW/Ovid): Chromium local roteado pelo VPN UNICAMP
 * — ASJ (Oxford Academic): conecta ao Chrome do usuário via CDP
 *     → Abra o Chrome com: "Chrome (Debug ASJ)" (atalho na área de trabalho)
 *       ou: chrome.exe --remote-debugging-port=9222
 *
 * Pré-requisito: VPN UNICAMP ativo antes de executar.
 *
 * Uso:
 *   node tools/fetch_article_text.js --doi "10.1097/PRS.xxx"
 *   node tools/fetch_article_text.js --doi "10.1097/PRS.xxx,10.1093/asj/xxx,..."
 *   node tools/fetch_article_text.js --input .tmp/doi_list.json
 *
 * Saída:
 *   .tmp/article_texts/<doi_sanitizado>.json  — texto completo por seção
 *   .tmp/article_texts/index.json             — mapa DOI → caminho do arquivo
 */

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());
const path = require('path');
const fs   = require('fs');

const ROOT   = path.join(__dirname, '..');
const OUTDIR = path.join(ROOT, '.tmp', 'article_texts');
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

const CDP_URL = 'http://localhost:9222';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeDoi(doi) {
  return doi.replace(/[/\\:*?"<>|]/g, '_');
}

function detectPublisher(url) {
  if (url.includes('lww.com') || url.includes('ovid.com')) return 'lww';
  if (url.includes('academic.oup.com'))                    return 'oxford';
  return 'unknown';
}

// ─── Extração LWW (Plastic and Reconstructive Surgery) ──────────────────────

async function extractLww(page) {
  return await page.evaluate(() => {
    const result = { sections: [] };

    result.title = document.querySelector('.ejp-r-article-title, h1[class*="title"]')
      ?.innerText?.trim() || document.title.trim();

    result.authors = Array.from(document.querySelectorAll(
      '.ejp-r-article-author-name, [class*="author-name"]'
    )).map(el => el.innerText.trim()).filter(Boolean).join('; ');

    const abstractEl = document.querySelector('[class*="abstract"], .ejp-article-abstract');
    if (abstractEl) result.abstract = abstractEl.innerText.trim();

    // Parágrafos do corpo: IDs JCL-P-* e JCL-H-*
    const bodyEls = Array.from(document.querySelectorAll('[id^="JCL-P-"], [id^="JCL-H-"]'));

    if (bodyEls.length > 0) {
      let currentHeading = '';
      let currentContent = [];

      bodyEls.forEach(el => {
        const text = el.innerText?.trim() || '';
        if (!text) return;
        const isHeading = el.id.startsWith('JCL-H-') || /^H[1-6]$/.test(el.tagName);
        if (isHeading) {
          if (currentContent.length > 0) {
            result.sections.push({ heading: currentHeading, content: currentContent.join('\n\n') });
          }
          currentHeading = text;
          currentContent = [];
        } else {
          currentContent.push(text);
        }
      });
      if (currentContent.length > 0) {
        result.sections.push({ heading: currentHeading, content: currentContent.join('\n\n') });
      }
    }

    if (result.sections.length === 0) {
      const candidates = Array.from(document.querySelectorAll('div, section'))
        .filter(el => (el.innerText?.length || 0) > 500 && (el.innerText?.length || 0) < 100000)
        .sort((a, b) => (b.innerText?.length || 0) - (a.innerText?.length || 0));
      if (candidates[0]) {
        result.sections.push({ heading: 'Texto completo', content: candidates[0].innerText.trim() });
      }
    }

    return result;
  });
}

// ─── Extração Oxford Academic (Aesthetic Surgery Journal) ────────────────────
// Oxford Academic usa .chapter-para para parágrafos e .chapter-head para títulos
// dentro de [data-widgetname="ArticleFulltext"] / .widget-ArticleFulltext

async function extractOxford(page) {
  await page.waitForTimeout(2000);

  return await page.evaluate(() => {
    const result = { sections: [] };

    result.title = document.querySelector(
      'h1.article-title-main, h1[class*="wi-article-title"], h1[class*="title"]'
    )?.innerText?.trim() || document.title.trim();

    result.authors = Array.from(document.querySelectorAll(
      '.al-author-name, [class*="contrib-author"], span[class*="author"]'
    )).map(el => el.innerText.trim()).filter(Boolean).join('; ');

    const abstractEl = document.querySelector(
      '.abstract, [class*="abstract-content"], section.abstract, [data-widgetname*="abstract"]'
    );
    if (abstractEl) result.abstract = abstractEl.innerText.trim();

    // Estratégia 1: .chapter-para + headings dentro do ArticleFulltext
    const fullTextEl = document.querySelector(
      '[data-widgetname="ArticleFulltext"], .widget-ArticleFulltext'
    );

    if (fullTextEl) {
      // Percorre todos os filhos diretos e sub-elementos buscando headings + parágrafos
      const allEls = Array.from(fullTextEl.querySelectorAll(
        'h2, h3, h4, p.chapter-para, .chapter-para, .NLM_p, p[class*="para"]'
      ));

      let currentHeading = 'Texto';
      let currentContent = [];

      allEls.forEach(el => {
        const tag = el.tagName;
        const text = el.innerText?.trim() || '';
        if (!text) return;

        const isHeading = /^H[2-4]$/.test(tag);
        if (isHeading) {
          const lc = text.toLowerCase();
          if (lc.includes('reference') || lc.includes('supplementar') ||
              lc.includes('acknowledgement') || lc.includes('disclosures')) {
            // Encerra coleta ao chegar em referências
            if (currentContent.length > 0) {
              result.sections.push({ heading: currentHeading, content: currentContent.join('\n\n') });
              currentContent = [];
              currentHeading = '';
            }
            return;
          }
          if (currentContent.length > 0) {
            result.sections.push({ heading: currentHeading, content: currentContent.join('\n\n') });
          }
          currentHeading = text;
          currentContent = [];
        } else {
          currentContent.push(text);
        }
      });

      if (currentContent.length > 0) {
        result.sections.push({ heading: currentHeading, content: currentContent.join('\n\n') });
      }
    }

    // Estratégia 2 (fallback): maior bloco de conteúdo
    if (result.sections.length === 0) {
      const candidates = Array.from(document.querySelectorAll('div, article, main'))
        .filter(el => {
          const t = el.innerText?.trim() || '';
          return t.length > 1000 && t.length < 80000;
        })
        .sort((a, b) => (b.innerText?.length || 0) - (a.innerText?.length || 0));
      if (candidates[0]) {
        result.sections.push({ heading: 'Texto completo', content: candidates[0].innerText.trim() });
      }
    }

    return result;
  });
}

// ─── Função principal por DOI ────────────────────────────────────────────────

async function fetchOne(doi, page) {
  const safe    = sanitizeDoi(doi);
  const outPath = path.join(OUTDIR, safe + '.json');

  if (fs.existsSync(outPath)) {
    console.log(`  Já existe: ${outPath} — pulando`);
    return outPath;
  }

  console.log(`\n→ ${doi}`);

  try {
    await page.goto(`https://doi.org/${doi}`, {
      waitUntil: 'domcontentloaded',
      timeout: 40000,
    });
  } catch (e) {
    console.log(`  Aviso navegação: ${e.message.split('\n')[0]} — continuando`);
  }

  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  const finalUrl  = page.url();
  const publisher = detectPublisher(finalUrl);
  console.log(`  URL: ${finalUrl}`);
  console.log(`  Publisher: ${publisher}`);

  // Aguarda o corpo do artigo aparecer no DOM
  const bodySelectors = [
    '.article-body', '.article-full-text', '.NLM_body',
    '.widget-ArticleFulltext', '.article-section-wrapper',
    '[class*="article-body"]', '[class*="full-text"]',
  ];
  for (const sel of bodySelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 8000 });
      console.log(`  Corpo encontrado: ${sel}`);
      break;
    } catch (_) { /* tenta próximo */ }
  }

  let data;
  try {
    if (publisher === 'oxford') data = await extractOxford(page);
    else                        data = await extractLww(page);
  } catch (e) {
    console.log(`  ERRO na extração: ${e.message}`);
    return null;
  }

  data.doi       = doi;
  data.url       = finalUrl;
  data.publisher = publisher;
  data.fetchedAt = new Date().toISOString().slice(0, 10);

  const totalChars = (data.abstract || '').length +
    data.sections.reduce((sum, s) => sum + s.content.length, 0);

  if (totalChars < 200) {
    console.log(`  ✗ Conteúdo insuficiente (${totalChars} chars)`);
    data._warning = 'Conteúdo insuficiente — verificar acesso';
  } else {
    console.log(`  ✓ Extraído: ${data.sections.length} seções, ${totalChars} chars`);
  }

  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
  return outPath;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

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
    console.log('  node tools/fetch_article_text.js --doi "10.1097/PRS.xxx"');
    console.log('  node tools/fetch_article_text.js --doi "10.1097/PRS.xxx,10.1093/asj/xxx"');
    console.log('  node tools/fetch_article_text.js --input .tmp/doi_list.json');
    process.exit(1);
  }

  if (dois.length === 0) { console.log('Nenhum DOI fornecido.'); process.exit(1); }

  const lwwDois    = dois.filter(d => !d.startsWith('10.1093'));
  const oxfordDois = dois.filter(d => d.startsWith('10.1093'));

  console.log(`\n=== Fetching texto de ${dois.length} artigo(s) ===`);
  console.log('VPN UNICAMP deve estar ativo.\n');

  const index = {};

  // ── Artigos PRS via Chromium local ──────────────────────────────────────────
  if (lwwDois.length > 0) {
    console.log(`--- PRS (${lwwDois.length} artigo(s)) — Chromium local ---`);
    const browser = await chromium.launch({ headless: false, slowMo: 150 });
    const context = await browser.newContext();
    const page    = await context.newPage();

    for (const doi of lwwDois) {
      try {
        index[doi] = await fetchOne(doi, page);
      } catch (e) {
        console.log(`  ERRO fatal em ${doi}: ${e.message}`);
        index[doi] = null;
      }
    }
    await browser.close();
  }

  // ── Artigos ASJ via Chrome CDP ───────────────────────────────────────────────
  if (oxfordDois.length > 0) {
    console.log(`\n--- ASJ (${oxfordDois.length} artigo(s)) — Chrome CDP ---`);
    console.log('Conectando ao Chrome em localhost:9222...');
    console.log('→ Se falhar, abra o Chrome pelo atalho "Chrome (Debug ASJ)" na área de trabalho.\n');

    let cdpBrowser;
    try {
      cdpBrowser = await chromium.connectOverCDP(CDP_URL);
    } catch (e) {
      console.log(`  ✗ Não foi possível conectar: ${e.message}`);
      console.log('  → Abra o Chrome via atalho "Chrome (Debug ASJ)" e re-execute.\n');
      oxfordDois.forEach(d => { index[d] = null; });
      cdpBrowser = null;
    }

    if (cdpBrowser) {
      // Reutiliza o primeiro contexto existente (com cookies/sessão do usuário)
      const contexts = cdpBrowser.contexts();
      const ctx  = contexts.length > 0 ? contexts[0] : await cdpBrowser.newContext();
      const page = await ctx.newPage();

      for (const doi of oxfordDois) {
        try {
          index[doi] = await fetchOne(doi, page);
        } catch (e) {
          console.log(`  ERRO fatal em ${doi}: ${e.message}`);
          index[doi] = null;
        }
      }

      // Fecha apenas a aba aberta, não o browser do usuário
      await page.close();
      await cdpBrowser.close();
    }
  }

  // Salva índice
  const indexPath = path.join(OUTDIR, 'index.json');
  const existing  = fs.existsSync(indexPath)
    ? JSON.parse(fs.readFileSync(indexPath, 'utf8'))
    : {};
  fs.writeFileSync(indexPath, JSON.stringify({ ...existing, ...index }, null, 2));

  const ok   = Object.values(index).filter(Boolean).length;
  const fail = dois.length - ok;
  console.log(`\n=== Resultado: ${ok} extraídos, ${fail} falhos ===`);
  console.log(`Índice: ${indexPath}`);

  if (fail > 0) {
    console.log('\nDOIs que falharam:');
    Object.entries(index).filter(([, v]) => !v).forEach(([d]) => console.log(`  ${d}`));
  }
}

main().catch(err => {
  console.error('\nErro fatal:', err.message);
  process.exit(1);
});
