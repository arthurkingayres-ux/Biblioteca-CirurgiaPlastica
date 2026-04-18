#!/usr/bin/env node
// tools/build_rag_index.js — Gera índice de chunks RAG para busca BM25 no Chat IA
//
// Uso:
//   node tools/build_rag_index.js
//
// Saída:
//   webapp/library/rag-index.json

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RAG_DIR = path.join(ROOT, 'content', 'rag');
const OUTPUT = path.join(ROOT, 'webapp', 'library', 'rag-index.json');

// Target chunk size in characters (~300-500 words ≈ 1500-2500 chars)
const MIN_CHUNK_SIZE = 200;
const MAX_CHUNK_SIZE = 3000;

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTerms(text) {
  const STOPWORDS = new Set([
    'a', 'o', 'e', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
    'um', 'uma', 'uns', 'umas', 'por', 'para', 'com', 'sem', 'que', 'se', 'ou',
    'ao', 'aos', 'as', 'os', 'mais', 'menos', 'como', 'entre', 'sobre', 'ate',
    'ser', 'ter', 'estar', 'foi', 'sao', 'tem', 'pode', 'deve', 'esta', 'este',
    'esse', 'essa', 'isso', 'isto', 'the', 'and', 'of', 'in', 'to', 'is', 'for',
    'with', 'on', 'at', 'by', 'from', 'or', 'an', 'be', 'are', 'was', 'were',
  ]);
  const normalized = normalize(text);
  return [...new Set(
    normalized.split(' ')
      .filter(w => w.length > 2 && !STOPWORDS.has(w))
  )];
}

function parseRAGIntoChunks(markdown, topic, area) {
  const lines = markdown.split('\n');
  const chunks = [];
  let currentSection = '';
  let currentSubsection = '';
  let buffer = '';
  let chunkId = 0;

  function flush() {
    const text = buffer.trim();
    if (text.length >= MIN_CHUNK_SIZE) {
      const section = currentSubsection || currentSection;
      chunks.push({
        id: `${topic}-chunk-${String(++chunkId).padStart(3, '0')}`,
        topic,
        area,
        section,
        text: text.slice(0, MAX_CHUNK_SIZE),
        terms: extractTerms(text),
      });
    }
    buffer = '';
  }

  for (const line of lines) {
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    const h4 = line.match(/^#### (.+)$/);

    if (h2) {
      flush();
      currentSection = h2[1].trim();
      currentSubsection = '';
      // Skip metadata sections
      if (currentSection.startsWith('Referências') || currentSection.startsWith('Referencias')) {
        currentSection = '';
      }
    } else if (h3) {
      flush();
      currentSubsection = h3[1].trim();
    } else if (h4) {
      flush();
      currentSubsection = h4[1].trim();
    } else {
      // Skip image references and empty lines from chunk text
      const trimmed = line.trim();
      if (trimmed.startsWith('[Imagem:') || trimmed.startsWith('<!--') || trimmed === '---') continue;
      if (trimmed) buffer += line + '\n';
    }
  }
  flush();

  return chunks;
}

function discoverRAGDocs() {
  const docs = [];
  for (const area of fs.readdirSync(RAG_DIR)) {
    const areaPath = path.join(RAG_DIR, area);
    if (!fs.statSync(areaPath).isDirectory()) continue;
    for (const file of fs.readdirSync(areaPath)) {
      if (!file.endsWith('.md')) continue;
      docs.push({ area, topic: file.replace('.md', ''), path: path.join(areaPath, file) });
    }
  }
  return docs;
}

function main() {
  const docs = discoverRAGDocs();
  console.log(`Encontrados ${docs.length} documentos RAG:\n`);

  const allChunks = [];
  for (const { area, topic, path: docPath } of docs) {
    const markdown = fs.readFileSync(docPath, 'utf8');
    const chunks = parseRAGIntoChunks(markdown, topic, area);
    allChunks.push(...chunks);
    console.log(`  ${area}/${topic}: ${chunks.length} chunks`);
  }

  // Compute IDF for BM25 (stored in index for client use)
  const N = allChunks.length;
  const df = {}; // document frequency per term
  for (const chunk of allChunks) {
    const uniqueTerms = new Set(chunk.terms);
    for (const term of uniqueTerms) {
      df[term] = (df[term] || 0) + 1;
    }
  }

  const index = {
    version: 1,
    generated: new Date().toISOString().split('T')[0],
    totalChunks: allChunks.length,
    totalTerms: Object.keys(df).length,
    idf: {},
    chunks: allChunks,
  };

  // Compute IDF: log((N - df + 0.5) / (df + 0.5) + 1) — BM25 variant
  for (const [term, freq] of Object.entries(df)) {
    index.idf[term] = Math.log((N - freq + 0.5) / (freq + 0.5) + 1);
  }

  // Write output
  const json = JSON.stringify(index);
  fs.writeFileSync(OUTPUT, json, 'utf8');

  const sizeMB = (Buffer.byteLength(json, 'utf8') / 1024 / 1024).toFixed(2);
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Total chunks  : ${allChunks.length}`);
  console.log(`Total termos  : ${Object.keys(df).length}`);
  console.log(`Tamanho       : ${sizeMB} MB`);
  console.log(`Salvo em      : webapp/library/rag-index.json`);
}

main();
