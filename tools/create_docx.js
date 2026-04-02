/**
 * create_docx.js
 * Motor de renderização .docx para a Biblioteca de Cirurgia Plástica.
 *
 * Lê os arquivos JSON de conteúdo em content/ e gera documentos .docx formatados.
 *
 * Uso:
 *   node tools/create_docx.js --topic rinoplastia
 *   node tools/create_docx.js --topic abdominoplastia
 *   node tools/create_docx.js --topic todos
 *
 * Saída: 01-Documentos-Estudo/<filename definido no JSON>
 *
 * Formato:
 *   - Capa com título, autor, versão e histórico de atualizações
 *   - Seções por sub-tema com citações inline em itálico cinza
 *   - Boxes AZUIS: nova evidência (PRS/ASJ)
 *   - Boxes VERMELHOS: mudança de paradigma
 *   - Boxes VERDES: dica prática
 *   - Tabela AMARELA: flashcards numéricos
 *   - Figuras com legenda
 *   - Referências-Base + Atualizações Incorporadas
 *
 * Dependências: npm install
 */

'use strict';

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, ShadingType,
  WidthType, TableLayoutType, PageBreak, ImageRun,
} = require('docx');

// ─── Caminhos ────────────────────────────────────────────────────────────────
const CONTENT_DIR = path.join(__dirname, '..', 'content');
const ASSETS_DIR  = path.join(__dirname, '..', 'assets', 'images');
const OUTDIR      = path.join(__dirname, '..', '01-Documentos-Estudo');

// ─── Constantes ──────────────────────────────────────────────────────────────
const COLORS = {
  blue:   { bg: 'D9E1F2', border: '2E75B6', title: '2E75B6', label: 'NOVA EVIDÊNCIA' },
  red:    { bg: 'FCE4D6', border: 'C00000', title: 'C00000', label: 'MUDANÇA DE PARADIGMA' },
  green:  { bg: 'E2EFDA', border: '375623', title: '375623', label: 'DICA PRÁTICA' },
  yellow: { bg: 'FFFF99', border: 'BF8F00', title: 'BF8F00', label: 'FLASHCARDS' },
  cover:  { bg: '1F3864' },
};

const AUTHOR  = 'Dr. Arthur Balestra Silveira Ayres';
const PROGRAM = 'Residência em Cirurgia Plástica – UNICAMP (R2, 2025–2028)';
const CM_TO_EMU = 360000;

// ─── Helpers de renderização ─────────────────────────────────────────────────

function txt(text, opts = {}) {
  return new TextRun({ text: String(text), ...opts });
}

function para(children, opts = {}) {
  const kids = typeof children === 'string'
    ? [txt(children)]
    : (Array.isArray(children) ? children : [children]);
  return new Paragraph({ children: kids, spacing: { after: 100 }, ...opts });
}

function heading(level, text) {
  const headingMap = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 };
  const spacingMap = {
    1: { before: 400, after: 120 },
    2: { before: 280, after: 80 },
    3: { before: 200, after: 60 },
  };
  return new Paragraph({
    text,
    heading: headingMap[level] || HeadingLevel.HEADING_1,
    spacing: spacingMap[level] || spacingMap[1],
  });
}

function box(type, title, lines, citationText) {
  const { bg, border, title: titleColor, label } = COLORS[type];
  const children = [];

  children.push(new Paragraph({
    children: [txt(`${label}${title ? ' — ' + title : ''}`, { bold: true, color: titleColor, size: 20 })],
    spacing: { before: 60, after: 60 },
  }));

  (Array.isArray(lines) ? lines : [lines]).forEach(line => {
    children.push(new Paragraph({
      children: [txt(line)],
      spacing: { before: 40, after: 40 },
    }));
  });

  if (citationText) {
    children.push(new Paragraph({
      children: [txt(citationText, { italics: true, color: '808080', size: 18 })],
      spacing: { before: 40, after: 60 },
    }));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({
      children: [new TableCell({
        shading: { fill: bg, type: ShadingType.CLEAR },
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 6,  color: border },
          bottom: { style: BorderStyle.SINGLE, size: 6,  color: border },
          left:   { style: BorderStyle.SINGLE, size: 18, color: border },
          right:  { style: BorderStyle.SINGLE, size: 6,  color: border },
        },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children,
      })],
    })],
  });
}

const spacer = () => new Paragraph({ text: '', spacing: { after: 80 } });

function dataTable(headers, rows) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      shading: { fill: '2E75B6', type: ShadingType.CLEAR },
      children: [new Paragraph({
        children: [txt(h, { bold: true, color: 'FFFFFF' })],
        alignment: AlignmentType.CENTER,
      })],
    })),
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map(cell => new TableCell({
      shading: { fill: ri % 2 === 0 ? 'FFFFFF' : 'EBF3FB', type: ShadingType.CLEAR },
      children: [new Paragraph({
        children: [txt(cell)],
        spacing: { before: 40, after: 40 },
      })],
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

function flashcardTable(rows) {
  const header = new TableRow({
    tableHeader: true,
    children: ['Parâmetro', 'Valor de Referência'].map(h => new TableCell({
      shading: { fill: COLORS.yellow.border, type: ShadingType.CLEAR },
      children: [new Paragraph({
        children: [txt(h, { bold: true, color: 'FFFFFF' })],
        alignment: AlignmentType.CENTER,
      })],
    })),
  });

  const dataRows = rows.map(([param, valor]) => new TableRow({
    children: [
      new TableCell({
        shading: { fill: COLORS.yellow.bg, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [txt(param, { bold: true })] })],
      }),
      new TableCell({
        shading: { fill: 'FFFACD', type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [txt(valor)] })],
      }),
    ],
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...dataRows],
  });
}

function figure(imageName, widthCm, heightCm, caption, tema) {
  const imgPath = tema
    ? path.join(ASSETS_DIR, tema, imageName)
    : path.join(ASSETS_DIR, imageName);

  if (!fs.existsSync(imgPath)) {
    return [
      new Paragraph({
        children: [txt(`[IMAGEM PENDENTE: ${imageName}]`, { bold: true, color: 'FF0000', size: 20 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 60 },
      }),
      new Paragraph({
        children: [txt(caption || '', { italics: true, color: '808080', size: 18 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
    ];
  }

  const imageBuffer = fs.readFileSync(imgPath);
  const elements = [];

  elements.push(new Paragraph({
    children: [
      new ImageRun({
        data: imageBuffer,
        transformation: {
          width: Math.round(widthCm * CM_TO_EMU),
          height: Math.round(heightCm * CM_TO_EMU),
        },
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 60 },
  }));

  if (caption) {
    elements.push(new Paragraph({
      children: [txt(caption, { italics: true, color: '555555', size: 18 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }));
  }

  return elements;
}

// ─── Página de capa ──────────────────────────────────────────────────────────

function coverPage(title, version, date, history) {
  const elements = [];

  elements.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [new TableCell({
        shading: { fill: COLORS.cover.bg, type: ShadingType.CLEAR },
        margins: { top: 400, bottom: 400, left: 300, right: 300 },
        children: [
          new Paragraph({
            children: [txt(title, { bold: true, color: 'FFFFFF', size: 52 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
          }),
          new Paragraph({
            children: [txt('Biblioteca Inteligente de Cirurgia Plástica', { color: 'BDD7EE', size: 22 })],
            alignment: AlignmentType.CENTER,
          }),
        ],
      })],
    })],
  }));

  elements.push(spacer(), spacer());

  elements.push(para([txt('Autor: ', { bold: true }), txt(AUTHOR)]));
  elements.push(para([txt('Programa: ', { bold: true }), txt(PROGRAM)]));
  elements.push(para([txt('Versão: ', { bold: true }), txt(version)]));
  elements.push(para([txt('Data: ', { bold: true }), txt(date)]));
  elements.push(spacer());

  elements.push(para([
    txt('Referências-Base: ', { bold: true }),
    txt("Neligan's Plastic Surgery, 5ª Ed. (2023)  |  Grabb & Smith's Plastic Surgery, 8ª Ed. (2020)", { italics: true }),
  ]));

  elements.push(spacer(), spacer());

  elements.push(new Paragraph({
    children: [txt('Histórico de Atualizações', { bold: true, size: 22 })],
    spacing: { before: 200, after: 100 },
  }));

  elements.push(dataTable(
    ['Versão', 'Data', 'Descrição'],
    history,
  ));

  elements.push(new Paragraph({ children: [new PageBreak()] }));

  return elements;
}

// ─── Renderização de elementos JSON → docx ───────────────────────────────────

function renderElement(el, tema) {
  switch (el.type) {
    case 'heading':
      return [heading(el.level, el.text)];

    case 'paragraph': {
      const kids = [txt(el.text)];
      if (el.citation) {
        kids.push(new TextRun({ text: ` (${el.citation})`, italics: true, color: '808080', size: 18 }));
      }
      return [para(kids)];
    }

    case 'box':
      return [box(el.color, el.title, el.lines, el.citation)];

    case 'flashcards':
      return [flashcardTable(el.rows)];

    case 'dataTable':
      return [dataTable(el.headers, el.rows)];

    case 'figure':
      return figure(el.image, el.widthCm, el.heightCm, el.caption, tema);

    default:
      console.warn(`  Tipo de elemento desconhecido: ${el.type}`);
      return [];
  }
}

// ─── Gerador principal ──────────────────────────────────────────────────────

async function generateDoc(topicName) {
  const topicInfo = findTopic(topicName);
  const doc = JSON.parse(fs.readFileSync(topicInfo.jsonPath, 'utf8'));

  // Renderizar capa
  const cover = coverPage(doc.title, doc.version, doc.date, doc.history);

  // Renderizar corpo
  const bodyElements = [];
  for (const el of doc.body) {
    bodyElements.push(...renderElement(el, topicName));
  }

  // Referências-Base
  bodyElements.push(heading(1, 'Referências-Base'));
  for (const ref of doc.references) {
    bodyElements.push(para(ref));
  }

  // Atualizações Incorporadas
  bodyElements.push(heading(1, `Atualizações Incorporadas — ${doc.updates.label}`));
  for (const entry of doc.updates.entries) {
    bodyElements.push(para(entry));
  }

  // Intercalar spacers após tabelas
  const flat = bodyElements;
  const bodyWithSpacers = [];
  flat.forEach((el, i) => {
    bodyWithSpacers.push(el);
    const next = flat[i + 1];
    if (next && el instanceof Table && !(next instanceof Paragraph)) {
      bodyWithSpacers.push(spacer());
    }
  });

  // Montar documento
  const docx = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal',
          run: { bold: true, size: 28, color: '1F3864' },
          paragraph: { spacing: { before: 400, after: 120 } },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal',
          run: { bold: true, size: 24, color: '2E75B6' },
          paragraph: { spacing: { before: 280, after: 80 } },
        },
        {
          id: 'Heading3', name: 'Heading 3', basedOn: 'Normal',
          run: { bold: true, size: 22, color: '2E74B5' },
          paragraph: { spacing: { before: 200, after: 60 } },
        },
      ],
    },
    sections: [{
      children: [...cover, ...bodyWithSpacers],
    }],
  });

  const buffer = await Packer.toBuffer(docx);
  // Mapear area slug para nome de pasta em 01-Documentos-Estudo/
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
  const areaFolder = topicInfo.area ? AREA_FOLDER_MAP[topicInfo.area] || topicInfo.area : '';
  const outDir = areaFolder ? path.join(OUTDIR, areaFolder) : OUTDIR;
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, doc.filename);
  fs.writeFileSync(outPath, buffer);
  console.log(`Gerado: ${outPath}`);
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

/**
 * Descobre todos os tópicos disponíveis, varrendo subpastas de content/.
 * Retorna array de { topic, area, jsonPath }.
 *   area = nome da subpasta (ex: 'estetica-facial')
 *   topic = nome do arquivo sem .json (ex: 'rinoplastia')
 */
function listTopics() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const topics = [];
  for (const entry of fs.readdirSync(CONTENT_DIR, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const areaDir = path.join(CONTENT_DIR, entry.name);
      for (const f of fs.readdirSync(areaDir)) {
        if (f.endsWith('.json') && f !== 'schema.json') {
          topics.push({
            topic: f.replace('.json', ''),
            area: entry.name,
            jsonPath: path.join(areaDir, f),
          });
        }
      }
    } else if (entry.name.endsWith('.json') && entry.name !== 'schema.json') {
      // Retrocompatibilidade: JSONs soltos na raiz de content/
      topics.push({
        topic: entry.name.replace('.json', ''),
        area: null,
        jsonPath: path.join(CONTENT_DIR, entry.name),
      });
    }
  }
  return topics;
}

function findTopic(topicName) {
  const all = listTopics();
  const found = all.find(t => t.topic === topicName);
  if (!found) {
    console.error(`Tópico "${topicName}" não encontrado.`);
    console.error(`Disponíveis: ${all.map(t => t.topic).join(', ')}`);
    process.exit(1);
  }
  return found;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const args  = process.argv.slice(2);
  const tIdx  = args.indexOf('--topic');
  const topic = tIdx >= 0 ? args[tIdx + 1] : null;

  if (!topic) {
    const topics = listTopics();
    console.error(`Uso: node tools/create_docx.js --topic <${topics.map(t => t.topic).join('|')}|todos>`);
    process.exit(1);
  }

  if (topic === 'todos') {
    for (const t of listTopics()) {
      await generateDoc(t.topic);
    }
  } else {
    await generateDoc(topic);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
