/**
 * test_generate.js
 * Testa a geração de todos os .docx a partir dos JSONs em content/.
 *
 * Uso:
 *   node tools/test_generate.js
 *
 * Verifica:
 *   1. Executa validate_content.js (schema + semântica)
 *   2. Gera todos os .docx via create_docx.js --topic todos
 *   3. Confere que cada .docx existe e tem tamanho > 0
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const OUTDIR      = path.join(__dirname, '..', '01-Documentos-Estudo');
const ROOT        = path.join(__dirname, '..');

function listTopics() {
  const topics = [];
  for (const entry of fs.readdirSync(CONTENT_DIR, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const areaDir = path.join(CONTENT_DIR, entry.name);
      for (const f of fs.readdirSync(areaDir)) {
        if (f.endsWith('.json') && f !== 'schema.json') {
          topics.push({ topic: f.replace('.json', ''), area: entry.name, jsonPath: path.join(areaDir, f) });
        }
      }
    } else if (entry.name.endsWith('.json') && entry.name !== 'schema.json') {
      topics.push({ topic: entry.name.replace('.json', ''), area: null, jsonPath: path.join(CONTENT_DIR, entry.name) });
    }
  }
  return topics;
}

function main() {
  const nodeExe = process.execPath;
  let failed = false;

  // Step 1: Validate all content
  console.log('═══ Etapa 1: Validação de conteúdo ═══\n');
  try {
    execSync(`"${nodeExe}" "${path.join(__dirname, 'validate_content.js')}"`, {
      stdio: 'inherit',
      cwd: ROOT,
    });
    console.log('');
  } catch (e) {
    console.error('\n✗ Validação falhou. Corrija os erros antes de gerar.\n');
    process.exit(1);
  }

  // Step 2: Generate all .docx
  console.log('═══ Etapa 2: Geração de documentos ═══\n');
  try {
    execSync(`"${nodeExe}" "${path.join(__dirname, 'create_docx.js')}" --topic todos`, {
      stdio: 'inherit',
      cwd: ROOT,
    });
    console.log('');
  } catch (e) {
    console.error('\n✗ Geração falhou:', e.message.split('\n')[0]);
    process.exit(1);
  }

  // Step 3: Verify .docx files
  console.log('═══ Etapa 3: Verificação dos arquivos ═══\n');
  const topics = listTopics();

  const AREA_FOLDER_MAP = {
    'estetica-facial': 'Estetica-Facial',
    'contorno-corporal': 'Contorno-Corporal',
    'mama': 'Mama',
    'mao-e-membro-superior': 'Mao-e-Membro-Superior',
    'craniofacial': 'Craniofacial',
    'microcirurgia-e-retalhos': 'Microcirurgia-e-Retalhos',
    'queimaduras-e-feridas': 'Queimaduras-e-Feridas',
    'tronco-e-membro-inferior': 'Tronco-e-Membro-Inferior',
  };

  for (const { topic: tema, area, jsonPath } of topics) {
    const doc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const areaFolder = area ? AREA_FOLDER_MAP[area] || area : '';
    const outDir = areaFolder ? path.join(OUTDIR, areaFolder) : OUTDIR;
    const docxPath = path.join(outDir, doc.filename);

    if (!fs.existsSync(docxPath)) {
      console.error(`x ${tema}: ${doc.filename} nao encontrado em ${outDir}`);
      failed = true;
      continue;
    }

    const stats = fs.statSync(docxPath);
    if (stats.size === 0) {
      console.error(`x ${tema}: ${doc.filename} esta vazio (0 bytes)`);
      failed = true;
      continue;
    }

    const sizeKB = (stats.size / 1024).toFixed(1);
    const bodyCount = doc.body.length;
    console.log(`OK ${tema}: ${doc.filename} (${sizeKB} KB, ${bodyCount} elementos)`);
  }

  console.log(`\n--- Resultado: ${topics.length} tema(s) ${failed ? '--- COM FALHAS' : '--- TODOS OK'} ---`);
  process.exit(failed ? 1 : 0);
}

main();
