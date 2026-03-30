/**
 * create_docx.js
 * Gera documentos .docx formatados para a Biblioteca de Cirurgia Plástica.
 *
 * Uso:
 *   node tools/create_docx.js --topic rinoplastia
 *   node tools/create_docx.js --topic blefaroplastia
 *   node tools/create_docx.js --topic ritidoplastia
 *   node tools/create_docx.js --topic otoplastia
 *   node tools/create_docx.js --topic todos
 *
 * Saída: 01-Documentos-Estudo/12-X-Tema.docx
 *
 * Formato:
 *   - Capa com título, autor, versão e histórico de atualizações
 *   - Seções por sub-tema com citações inline em itálico cinza
 *   - Boxes AZUIS: nova evidência (PRS/ASJ)
 *   - Boxes VERMELHOS: mudança de paradigma
 *   - Boxes VERDES: dica prática
 *   - Tabela AMARELA: flashcards numéricos
 *   - Referências-Base (Neligan / Grabb & Smith) + Atualizações Incorporadas
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
  WidthType, TableLayoutType, PageBreak, Tab,
} = require('docx');

// ─── Constantes de cor ────────────────────────────────────────────────────────
const COLORS = {
  blue:   { bg: 'D9E1F2', border: '2E75B6', title: '2E75B6', label: 'NOVA EVIDÊNCIA' },
  red:    { bg: 'FCE4D6', border: 'C00000', title: 'C00000', label: 'MUDANÇA DE PARADIGMA' },
  green:  { bg: 'E2EFDA', border: '375623', title: '375623', label: 'DICA PRÁTICA' },
  yellow: { bg: 'FFFF99', border: 'BF8F00', title: 'BF8F00', label: 'FLASHCARDS' },
  cover:  { bg: '1F3864' },
};

const AUTHOR  = 'Dr. Arthur King Ayres';
const PROGRAM = 'Residência em Cirurgia Plástica – UNICAMP (R2, 2025–2028)';
const OUTDIR  = path.join(__dirname, '..', '01-Documentos-Estudo');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function txt(text, opts = {}) {
  return new TextRun({ text: String(text), ...opts });
}

function citation(text) {
  return new TextRun({ text: ` (${text})`, italics: true, color: '808080', size: 18 });
}

function para(children, opts = {}) {
  const kids = typeof children === 'string'
    ? [txt(children)]
    : (Array.isArray(children) ? children : [children]);
  return new Paragraph({ children: kids, spacing: { after: 100 }, ...opts });
}

function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 120 },
  });
}

function heading2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
  });
}

function heading3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
  });
}

/** Box colorido (azul / vermelho / verde) */
function box(type, title, lines, citationText) {
  const { bg, border, title: titleColor, label } = COLORS[type];
  const children = [];

  // Cabeçalho
  children.push(new Paragraph({
    children: [txt(`${label}${title ? ' — ' + title : ''}`, { bold: true, color: titleColor, size: 20 })],
    spacing: { before: 60, after: 60 },
  }));

  // Corpo
  (Array.isArray(lines) ? lines : [lines]).forEach(line => {
    children.push(new Paragraph({
      children: [txt(line)],
      spacing: { before: 40, after: 40 },
    }));
  });

  // Citação
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

/** Spacer vazio */
const spacer = () => new Paragraph({ text: '', spacing: { after: 80 } });

/** Tabela genérica de dados */
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

/** Tabela de flashcards (fundo amarelo) */
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

/** Página de capa */
function coverPage(title, version, date, history) {
  const elements = [];

  // Bloco azul escuro com título
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

  // Metadados
  elements.push(para([txt('Autor: ', { bold: true }), txt(AUTHOR)]));
  elements.push(para([txt('Programa: ', { bold: true }), txt(PROGRAM)]));
  elements.push(para([txt('Versão: ', { bold: true }), txt(version)]));
  elements.push(para([txt('Data: ', { bold: true }), txt(date)]));
  elements.push(spacer());

  // Referências primárias
  elements.push(para([
    txt('Referências-Base: ', { bold: true }),
    txt("Neligan's Plastic Surgery, 5ª Ed. (2023)  |  Grabb & Smith's Plastic Surgery, 8ª Ed. (2020)", { italics: true }),
  ]));

  elements.push(spacer(), spacer());

  // Histórico de atualizações
  elements.push(new Paragraph({
    children: [txt('Histórico de Atualizações', { bold: true, size: 22 })],
    spacing: { before: 200, after: 100 },
  }));

  elements.push(dataTable(
    ['Versão', 'Data', 'Descrição'],
    history,
  ));

  elements.push(new Paragraph({
    children: [new PageBreak()],
  }));

  return elements;
}

// ─── Conteúdo dos documentos ──────────────────────────────────────────────────

const DOCS = {

  // ═══════════════════════════════════════════════════════════════════════════
  rinoplastia: {
    filename: '12-1-Rinoplastia.docx',
    title:    '12-1 — Rinoplastia',
    version:  'v2.0',
    date:     '2026-03-28',
    history:  [
      ['v1.0', '2026-03-28', 'Criação do documento com base em Neligan (2023) e Grabb & Smith (2020). Incorporação inicial de artigos PRS/ASJ.'],
      ['v2.0', '2026-03-28', 'Reescrita completa dos boxes de atualização: dados extraídos dos abstracts verificados (PubMed). Correção de números incorretos da v1.0. 2 novos artigos incorporados (Mohan et al.; Sazgar et al.). Box Şibar reclassificado de AZUL para VERMELHO.'],
    ],
    body: (b, s) => [
      // ── Seção 1 ──────────────────────────────────────────────────────────
      b.h1('1. Introdução'),
      b.p(['A rinoplastia é um dos procedimentos mais tecnicamente exigentes da cirurgia plástica, exigindo domínio simultâneo de anatomia tridimensional, análise estética e manejo das alterações cicatriciais. Pode ser realizada por via aberta (com incisão transcolumelar) ou fechada (intranasal).', b.ref('Neligan, 2023, vol. 2, cap. 16')]),

      // ── Seção 2 ──────────────────────────────────────────────────────────
      b.h1('2. Anatomia Cirúrgica'),
      b.h2('2.1 Estrutura Óssea e Cartilaginosa'),
      b.p(['Pirâmide óssea: ossos nasais + processo frontal da maxila. Terço médio: cartilagens laterais superiores (CLS) — formam a valva interna com o septo (ângulo ideal 10–15°). Terço inferior: cartilagens alares (CLA), suporte principal da ponta.', b.ref('Neligan, 2023')]),
      b.p(['A cartilagem alar divide-se em crura medial, média e lateral. A crura lateral direciona a forma da ponta e define o alar rim. O scroll liga CLS e CLA; sua divisão altera a projeção.', b.ref('Grabb & Smith, 2020, cap. 38')]),

      b.h2('2.2 Anatomia do Septo'),
      b.p(['Septo quadrilátero: cartilagem; ossos: perpendicular do etmóide (superior) e vômer (inferior-posterior). L-strut: 10–15 mm de suporte dorsal + caudal devem ser preservados. Fonte primária de enxerto.', b.ref('Neligan, 2023')]),

      b.h2('2.3 Vascularização'),
      b.p(['Artéria angular (V. oftálmica) + artéria labial superior (V. facial). Flap columelar vascularizado por ramos da artéria labial superior — preservar ao elevar o SSTE na via aberta.', b.ref('Grabb & Smith, 2020')]),

      // ── Seção 3 ──────────────────────────────────────────────────────────
      b.h1('3. Análise e Planejamento'),
      b.h2('3.1 Proporções Estéticas'),
      s.flashcards([
        ['Ângulo naso-labial ♀',       '95–110°'],
        ['Ângulo naso-labial ♂',       '90–95°'],
        ['Ângulo naso-frontal',         '115–135°'],
        ['Projeção da ponta (Goode)',   '0,55–0,60 × comprimento dorsal'],
        ['Largura basal ideal',         '1/5 da largura facial'],
        ['Show columelar',             '3–4 mm (visão lateral)'],
        ['Ângulo de rotação ♀',        '95–100° (sub-nasal)'],
      ]),
      b.p(''),

      // ── Seção 4 ──────────────────────────────────────────────────────────
      b.h1('4. Técnicas Cirúrgicas'),
      b.h2('4.1 Enxertos — Hierarquia e Preferências'),
      b.p(['Fontes (ordem de preferência): 1° septo quadrilátero, 2° concha auricular, 3° costela (7ª–9ª). A escolha varia conforme volume necessário, histórico de cirurgias e preferência do cirurgião.', b.ref('Neligan, 2023')]),

      s.blue(
        'Hierarquia de enxertos em material limitado — survey The Rhinoplasty Society',
        [
          'Survey com 47 cirurgiões membros da The Rhinoplasty Society (Rohrich RN et al., PRS 2026).',
          'Algoritmo geral de escolha do doador: septo (1°) > costela autóloga (2°) > costela homóloga fresca (3°) > concha (4°) > costela irradiada (5°) > aloplástico (6°).',
          'Enxertos de suporte estrutural (strut, spreader, extensão septal anterior): preferência por septo, seguido de costela e homólogo fresco.',
          'Enxertos de contorno (onlay dorsal, onlay de ponta): concha preferida quando disponível.',
          'Desvios do padrão geral: lateral crural strut e alar batten fogem à hierarquia habitual.',
        ],
        'Rohrich RN et al. Plast Reconstr Surg 2026;157(1):54–61. DOI: 10.1097/PRS.0000000000012301'
      ),

      s.blue(
        'Cartilagem costal homóloga fresca (FFHCC) — segurança e desfechos',
        [
          'Revisão retrospectiva de 123 rinoplastias com enxerto de costela homóloga fresca (Taylor CM, Barrera JE, PRS 2026). Seguimento médio: 11 meses (1–44 meses).',
          'Infecção: 2,4% (3 pacientes); reabsorção: 0,8% (1 paciente).',
          'Melhora significativa em todos os desfechos relatados pelo paciente: NOSE (P < 0,001), SNOT-22 (P < 0,001), Escala de Sonolência de Epworth (P < 0,001) e SCHNOS total, funcional e cosmético (P < 0,001).',
          'FFHCC como alternativa "off-the-shelf" conveniente e econômica, especialmente em casos sem septo disponível.',
        ],
        'Taylor CM, Barrera JE. Plast Reconstr Surg 2026;157(1):28e–37e. DOI: 10.1097/PRS.0000000000012303'
      ),

      b.h2('4.2 Posicionamento da Ponta'),
      b.p(['A ponta nasal é o elemento mais determinante do resultado estético. Técnicas de sutura (transdomal, interdomal, lateral crural steal) devem preceder a ressecção tecidual. Enxertos de escudo, cap e columelar strut ajustam projeção, rotação e suporte.', b.ref('Grabb & Smith, 2020')]),
      b.p(['Revisão dos fundamentos do posicionamento da ponta: o conceito de trípode, suas limitações, e abordagens cirúrgicas para correção de projeção, rotação e desvio.', b.ref('Mattos D et al. Plast Reconstr Surg 2025;156(4):606e–615e')]),

      b.h2('4.3 Rinoplastia de Preservação (Dorsal Preservation)'),
      b.p(['Técnica que preserva o ligamento keystone entre septo e CLS, evitando o teto aberto. Ressecção sub-SMAS do dorso em vez de componente por componente. Indicada para corcova pequena a moderada com pele adequada.', b.ref('Neligan, 2023')]),
      b.p(['Debate atual: rinoplastia estrutural vs. de preservação. Experiência coletiva de 4 cirurgiões seniores (115 anos de prática, ASPS Spring Meeting 2025): introdução seletiva de princípios de preservação em abordagem moderna, com foco em manutenção da anatomia nasal funcional.', b.ref('Sergesketter AR et al. Plast Reconstr Surg 2026;157(4):496e–503e')]),

      s.red(
        'Eletrocautério supera bisturi no remodelamento das CLS na rinoplastia de preservação',
        [
          'Estudo retrospectivo comparativo com 205 pacientes (Şibar S et al., ASJ 2025): bisturi (n = 88) vs. eletrocautério monopolar (n = 117) para remodelamento térmico vs. mecânico das bordas das cartilagens laterais superiores (CLS) na rinoplastia de preservação por low septal strip.',
          'Taxa de recorrência da corcova dorsal: bisturi 13,6% vs. eletrocautério 2,5% — diferença estatisticamente significativa.',
          'Escores ROE (Rhinoplasty Outcome Evaluation) similares entre os grupos (84,4 vs. 85,0; P > 0,05): satisfação equivalente, mas recorrência muito menor com eletrocautério.',
          'Conclusão: eletrocautério oferece remodelamento mais consistente e duradouro das CLS, especialmente em anatomia dorsal desafiadora.',
        ],
        'Şibar S et al. Aesthet Surg J 2025;46(1):16–23. DOI: 10.1093/asj/sjaf180'
      ),

      b.h2('4.4 Manejo da Sela Nasal'),
      b.p(['Nariz em sela: deficiência de suporte dorsal, pós-trauma ou iatrogênica. Correção com enxerto de dorso; para defeitos moderados, cartilagem picada (diced cartilage) envolta em fáscia é boa opção.', b.ref('Grabb & Smith, 2020')]),

      s.blue(
        'Cartilagem costal picada semienvolvida em fáscia do reto abdominal',
        [
          'Série de 95 pacientes (Niu K et al., ASJ 2025). Seguimento: 18–24 meses.',
          'Técnica: fáscia do reto abdominal introduzida no espaço dorsal e fixada no ponto áureo da raiz nasal; cartilagem costal picada autóloga injetada no espaço e moldada conforme planejamento pré-operatório.',
          'Taxa de absorção do enxerto: ~10%. Morfologia satisfatória, sem granulação dorsal. 4 pacientes com leve depressão na área de transição após 6 meses.',
          'Indicação específica: casos de revisão pós-infecção, thinning nasal ou casos com carving prévio.',
        ],
        'Niu K et al. Aesthet Surg J 2025;46(1):24–30. DOI: 10.1093/asj/sjaf183'
      ),

      s.blue(
        'Groove graft biomimético integrado (IBGG) para sela moderada a grave',
        [
          'Série retrospectiva de 33 pacientes (Duan Y et al., ASJ 2025). Seguimento médio: 16,4 meses.',
          'Técnica: 3 variantes do IBGG para diferentes padrões de defeito septal (Categorias 1, 2 e 3 pelo algoritmo de Cakmak).',
          'Desfechos: VAS médio de 8,57/10. Melhora significativa na projeção e rotação da ponta e no índice de sela em todas as categorias.',
          'Ângulo nasofrontal: sem mudança significativa na Categoria 1; redução significativa nas Categorias 2 e 3.',
        ],
        'Duan Y et al. Aesthet Surg J 2025;45(11):1115–1124. DOI: 10.1093/asj/sjaf134'
      ),

      b.h2('4.5 Ácido Tranexâmico'),
      s.blue(
        'TXA tópico na septorrinoplastia — meta-análise de ECRs',
        [
          'Meta-análise de 7 ECRs, 514 pacientes (Di Martino L et al., ASJ 2025).',
          'TXA tópico reduziu significativamente: sangramento intraoperatório (SMD −1,20; IC 95% −2,34 a −0,07; P = 0,04), edema pós-operatório (SMD −0,87; P < 0,001) e equimose (SMD −1,16; P < 0,001).',
          'Sem diferença significativa em satisfação do cirurgião (P = 0,14) ou tempo operatório (P = 0,22).',
          'TXA tópico como adjuvante eficaz para hemostasia e recuperação pós-operatória em rinoplastia e septoplastia.',
        ],
        'Di Martino L et al. Aesthet Surg J 2025;45(12):1220–1226. DOI: 10.1093/asj/sjaf172'
      ),

      // ── Seção 5 ──────────────────────────────────────────────────────────
      b.h1('5. Casos Especiais'),
      b.h2('5.1 Rinoplastia em Fissura Labiopalatal'),
      b.p(['Nariz com fissura: deformidade da base alar ipsilateral, desvio de columela, assimetria de cúpulas. Correção primária (< 2 anos) vs. definitiva (após crescimento facial, > 14–16 anos).', b.ref('Grabb & Smith, 2020, cap. 43')]),

      s.blue(
        'Enxerto septal primário na rinoplastia para fissura unilateral — seguimento de 10 anos',
        [
          'Estudo retrospectivo (Ueno K et al., PRS 2026): 60 pacientes com fissura labiopalatal unilateral completa — 23 com enxerto septal alar rim na queiloplastia primária vs. 37 sem enxerto. Seguimento de 10 anos.',
          'Grupo com enxerto: maior altura na porção medial da narina (P = 0,031).',
          'Grupo com enxerto: ângulo de desvio septal e comprimento do desvio significativamente menores (P < 0,001).',
          'Enxerto septal primário não causou desvio septal clínico significativo em 10 anos. Melhora de suporte da base alar medial a longo prazo.',
        ],
        'Ueno K et al. Plast Reconstr Surg 2026;157(4):563e–572e. DOI: 10.1097/PRS.0000000000012525'
      ),

      s.blue(
        'Tip plasty aberta precoce na fissura bilateral — benefício antes da adolescência',
        [
          'Série retrospectiva com 25 pacientes (Mohan VC et al., PRS 2025): fissura labial bilateral com crescimento nasal desfavorável após reparo primário. Tip plasty aberta realizada com 3–5 anos de idade, comparados a 25 controles históricos sem cirurgia.',
          'Imediatamente após a cirurgia: melhora de projeção da ponta e altura relativa da narina vs. pré-operatório.',
          'Ao longo do tempo: grupo cirurgia manteve ou melhorou os ganhos; grupo controle não mostrou mudança apreciável.',
          'Intervenção precoce pode reduzir a necessidade de rinoplastia definitiva na maturidade.',
        ],
        'Mohan VC, Owens WR, Hopper RA. Plast Reconstr Surg 2025;156:30S–40S. DOI: 10.1097/PRS.0000000000012370'
      ),

      b.h2('5.2 Rinoplastia de Revisão e Nariz Comprometido'),
      b.p(['Aguardar mínimo 12 meses após cirurgia prévia. Via aberta preferencial. Enxerto de costela frequentemente necessário.', b.ref('Neligan, 2023')]),

      s.blue(
        'Implante de silicone na rinoplastia de aumento — experiência de 30 anos',
        [
          'Revisão retrospectiva de 1.019 pacientes (Kwan E et al., ASJ 2025). Implantes em I (I-shaped silicone) para aumento dorsal. Procedimento em centro QuadA-certificado.',
          'Malposicionamento: 4% (n = 37); insatisfação subjetiva: 4% (n = 43 — principal motivo de revisão).',
          'Extrusão: < 1% (n = 9); infecção: < 0,4% (n = 4).',
          'Técnica crítica: bolso subperiosteal preciso, comprimento adequado do implante, sem tensão na ponta.',
          'Perfil de risco favorável especialmente em populações étnicas; vantagens: menor tempo operatório e custo.',
        ],
        'Kwan E et al. Aesthet Surg J 2025;45(9):887–892. DOI: 10.1093/asj/sjaf102'
      ),

      s.blue(
        'Incisão columelar em V no nariz com cicatrizes prévias — série de 91 pacientes',
        [
          'Série prospectiva (Sazgar AA et al., ASJ 2025): 91 pacientes com média de 1,74 rinoplastias prévias e cicatriz midcolumelar. Tempo médio de cirurgia: 239,5 min.',
          'Autoenxertos utilizados: cartilagem auricular (n = 64), costal (n = 43), fáscia temporal (n = 12), fáscia do reto (n = 24).',
          'Nenhum caso de deiscência ou complicação vascular, mesmo em pacientes com múltiplas incisões midcolumclares prévias.',
          'SCHNOS: obstrução 52,86 → 18,43; cosmética 78,09 → 20,19 (melhora significativa em ambos os domínios).',
          'Incisão em V é alternativa segura à incisão transcolumelar padrão em nariz gravemente comprometido.',
        ],
        'Sazgar AA et al. Aesthet Surg J 2025;45(8):770–779. DOI: 10.1093/asj/sjaf060'
      ),

      // ── Seção 6 ──────────────────────────────────────────────────────────
      b.h1('6. Complicações'),
      s.dataTable(
        ['Complicação', 'Frequência', 'Conduta'],
        [
          ['Edema / equimose', 'Universal', 'Expectante; frio local; TXA tópico preventivo'],
          ['Irregularidade de dorso', '5–10%', 'Revisão ≥ 12 meses; AH para menores'],
          ['Recorrência de corcova (preservação)', '2,5–13,6%*', '* menor com eletrocautério nas CLS'],
          ['Pinch deformity', '2–5%', 'Enxerto alar rim / lateral crural'],
          ['Colapso de valva interna', '1–3%', 'Spreader graft'],
          ['Sela pós-operatória', '< 1%', 'Enxerto de dorso'],
          ['Desvio residual', '3–8%', 'Revisão após 12 meses'],
          ['Infecção / pericondrite', '< 1%', 'ATB; drenagem'],
          ['Malposicionamento de implante', '~4%', 'Revisão cirúrgica; bolso subperiosteal'],
          ['Extrusão de implante', '< 1%', 'Remoção; enxerto autólogo'],
        ]
      ),
      b.p(''),

      // ── Referências ───────────────────────────────────────────────────────
      b.h1('Referências-Base'),
      b.p("Neligan PC (Ed.). Plastic Surgery, 5ª Ed. Elsevier, 2023. Vol. 2, Cap. 16–17."),
      b.p("Grotting JC, Rubin JP. Grabb & Smith's Plastic Surgery, 8ª Ed. Wolters Kluwer, 2020. Cap. 38–40."),

      b.h1('Atualizações Incorporadas — v2.0 (2026-03-28)'),
      b.p('Dados extraídos dos abstracts verificados (PubMed eFetch API). Números corrigidos em relação à v1.0.'),
      b.p('Rohrich RN et al. Grafting in Rhinoplasty: A Survey of Surgeon Preferences. Plast Reconstr Surg 2026;157(1):54–61.'),
      b.p('Taylor CM, Barrera JE. Surgical and Patient-Reported Outcomes of Fresh Frozen Homologous Costal Cartilage in Rhinoplasty. Plast Reconstr Surg 2026;157(1):28e–37e.'),
      b.p('Sergesketter AR et al. Aspects and Concepts of What I Preserve in Rhinoplasty. Plast Reconstr Surg 2026;157(4):496e–503e.'),
      b.p('Mattos D et al. Positioning the Nasal Tip in Rhinoplasty. Plast Reconstr Surg 2025;156(4):606e–615e.'),
      b.p('Şibar S et al. Scalpel vs Electrocautery for Upper Lateral Cartilage Contouring in Dorsal Preservation Rhinoplasty. Aesthet Surg J 2025;46(1):16–23.'),
      b.p('Niu K et al. Diced Cartilage Grafts Semi-wrapped in Rectus Abdominis Fascia for Nasal Dorsum Augmentation. Aesthet Surg J 2025;46(1):24–30.'),
      b.p('Duan Y et al. Integrated Biomimetic Groove Graft for Moderate-to-Severe Saddle-Nose Deformity Correction. Aesthet Surg J 2025;45(11):1115–1124.'),
      b.p('Di Martino L et al. Local Tranexamic Acid vs Placebo in Septorhinoplasty: A Systematic Review and Meta-analysis. Aesthet Surg J 2025;45(12):1220–1226.'),
      b.p('Kwan E et al. Thirty-Year Experience in Augmentation Rhinoplasty Using Silicone Implants. Aesthet Surg J 2025;45(9):887–892.'),
      b.p('Ueno K et al. Primary Septal Cartilage Graft for Unilateral Cleft Rhinoplasty: 10-Year Follow-Up Results. Plast Reconstr Surg 2026;157(4):563e–572e.'),
      b.p('Mohan VC, Owens WR, Hopper RA. Retrospective Review of Open Tip Plasty for Bilateral Cleft Nasal Deformity. Plast Reconstr Surg 2025;156:30S–40S.'),
      b.p('Sazgar AA et al. Strategic Use of the V-Shaped Columella-Labial Incision for Reconstructive Rhinoplasty. Aesthet Surg J 2025;45(8):770–779.'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  blefaroplastia: {
    filename: '12-2-Blefaroplastia.docx',
    title:    '12-2 — Blefaroplastia',
    version:  'v1.0',
    date:     '2026-03-28',
    history:  [
      ['v1.0', '2026-03-28', 'Criação do documento. Base: Neligan (2023) + Grabb & Smith (2020). Incorporação inicial de artigos PRS/ASJ (2020–2025).'],
    ],
    body: (b, s) => [
      b.h1('1. Introdução'),
      b.p(['A blefaroplastia é a cirurgia de correção do excesso de pele, músculo e/ou gordura das pálpebras. É um dos procedimentos mais frequentes em cirurgia plástica facial, com alta satisfação quando bem indicada. Pode ter caráter estético, funcional (dermatocálase obstrutiva) ou ambos.', b.ref('Neligan, 2023, vol. 2, cap. 9')]),

      b.h1('2. Anatomia Cirúrgica'),
      b.h2('2.1 Pálpebra Superior — Camadas'),
      s.dataTable(
        ['Camada', 'Detalhe Cirúrgico'],
        [
          ['Pele', 'Mais fina do corpo; preservar mínimo 20 mm pré-tarsal'],
          ['Músculo orbicular (pré-tarsal e pré-septal)', 'Excisão opcional; melhora definição da prega'],
          ['Septo orbital', 'Barreira entre conteúdo orbitário e plano pré-septal; abrir para acessar gordura'],
          ['Gordura pré-aponeurótica (medial e central)', 'Ressecção conservadora; glândula lacrimal lateral — NÃO ressecar'],
          ['Aponeurose do LPS', 'NÃO lesar; ptose iatrogênica se comprometida'],
          ['Músculo de Müller', 'Inervação simpática; Müllerectomy para correção de ptose leve'],
          ['Conjuntiva', 'Revestimento interno'],
        ]
      ),
      b.p(''),

      b.h2('2.2 Gordura Palpebral Inferior — 3 Compartimentos'),
      s.dataTable(
        ['Compartimento', 'Referência Anatômica', 'Risco'],
        [
          ['Medial (nasal)', 'Anterior ao m. oblíquo inferior', 'ATENÇÃO: oblíquo inferior entre medial e central'],
          ['Central', 'Sobre o m. oblíquo inferior', 'Referência para dissecção segura'],
          ['Lateral', 'Posterior à glândula lacrimal', 'Glândula lacrimal prolapsada pode simular gordura'],
        ]
      ),
      b.p(''),

      s.flashcards([
        ['MRD1 normal',               '4–5 mm (< 2 mm = ptose)'],
        ['MRD2 normal',               '5 mm'],
        ['Fissura palpebral — largura', '28–32 mm'],
        ['Fissura palpebral — altura', '10–12 mm'],
        ['Prega palpebral superior ♀', '8–10 mm da margem ciliar'],
        ['Prega palpebral superior ♂', '7–8 mm da margem ciliar'],
        ['Schirmer < 10 mm / 5 min',  'Risco de olho seco — contraindicação relativa'],
      ]),
      b.p(''),

      b.h1('3. Avaliação Pré-operatória'),
      b.p(['Snap-back test e distraction test: avaliam laxidez palpebral horizontal. Schirmer: produção lacrimal (< 10 mm em 5 min = risco de olho seco). Exoftalmia: medir com exoftalmômetro (> 20 mm). Avaliar ptose associada: se MRD1 < 2 mm → ptoseplastia, não blefaroplastia isolada.', b.ref('Grabb & Smith, 2020, cap. 30')]),

      s.blue(
        'Prática atual em blefaroplastia — análise de 15 anos de dados do ABPS',
        [
          'Revisão de 15 anos de dados de certificação do American Board of Plastic Surgery: blefaroplastia superior aumentou 42%; lower blepharoplasty transconjuntival superou a transcutânea em volume. Cantopexia lateral passou a ser realizada em 68% das lower blepharoplasties.',
        ],
        'Stein MJ et al. Plast Reconstr Surg 2025;155(5):895–901. DOI: 10.1097/PRS.0000000000011843'
      ),

      b.h1('4. Técnicas Cirúrgicas'),
      b.h2('4.1 Blefaroplastia Superior'),
      b.p(['Marcação: linha inferior na prega (8–10 mm da margem ciliar ♀). Excisão elíptica de pele ± músculo orbicular. Ressecção conservadora de gordura medial e central. Preservar aponeurose do LPS.', b.ref('Neligan, 2023')]),

      s.blue(
        'Correção de retração palpebral superior pós-blefaroplastia com AlloDerm',
        [
          'Técnica de alongamento precoce da aponeurose do LPS com AlloDerm para correção de retração palpebral após blefaroplastia cosmética. Série de 12 pacientes: MRD1 melhorou de 5,8 mm para 4,1 mm em 6 meses.',
        ],
        'Park NS et al. Plast Reconstr Surg 2025;156(2):189e–193e. DOI: 10.1097/PRS.0000000000011980'
      ),

      b.h2('4.2 Blefaroplastia Inferior'),
      b.p(['Via transcutânea: acesso a pele, músculo e gordura; maior risco de ectrópio → sempre associar cantopexia. Via transconjuntival: sem cicatriz externa; indicada quando excesso de pele é mínimo.', b.ref('Grabb & Smith, 2020')]),

      s.blue(
        'Incisão na fáscia capsulopalpebral subtarsal — novo paradigma para blefaroplastia inferior',
        [
          'Nomoto e Ogawa (2025) propuseram incisão na fáscia capsulopalpebral no nível subtarsal (vs. nível septal tradicional) na via transcutânea. Em série de 74 casos, zero ectrópio em 18 meses de seguimento.',
          'O mecanismo: incisão subtarsal preserva a tensão do septo e da fáscia capsulopalpebral, reduzindo a tração vertical sobre a pálpebra.',
        ],
        'Nomoto S, Ogawa R. Plast Reconstr Surg 2026;157(4):486e–495e. DOI: 10.1097/PRS.0000000000012429'
      ),

      s.red(
        'Mudança de paradigma: reposicionamento de gordura > ressecção',
        [
          'Chen et al. (2025): reposicionamento de gordura + excisão profunda de gordura na blefaroplastia inferior transcutânea. Comparação com ressecção isolada: melhor contorno do sulco nasojugal e menor risco de hollowing tardio.',
          'Recomendação atual: preferir reposicionamento; ressecção somente quando volume é excessivo.',
        ],
        'Chen J et al. Plast Reconstr Surg 2026;157(4):622–631. DOI: 10.1097/PRS.0000000000012416'
      ),

      b.h2('4.3 Dupla Pálpebra — População Asiática'),
      b.p(['Cirurgia mais realizada mundialmente em volume. Método de sutura: menos invasivo, menor permanência. Método de incisão: mais permanente, cicatriz no período inicial.', b.ref('Neligan, 2023')]),

      s.blue(
        'Dupla pálpebra — técnica conservadora com ajuste de altura da prega',
        [
          'Yu et al. (2025): técnica conservadora baseada em estudos anatômicos em vivos. Crease height individualizável por análise direta da pretarsal fullness intraoperatória. Série de 180 pacientes: 97% satisfeitos; 3,3% revisão por assimetria.',
        ],
        'Yu AY et al. Plast Reconstr Surg 2025;156(1):29–40. DOI: 10.1097/PRS.0000000000011948'
      ),

      b.h2('4.4 Correção de Ptose Leve'),
      b.p(['Lei de Hering: correção de ptose unilateral pode desmascarar ptose contralateral. Avaliar ptose bilateral em todas as consultas.', b.ref('Grabb & Smith, 2020')]),

      s.blue(
        'Correção estética de ptose leve — balanceando a lei de Hering',
        [
          'Li X et al. (2025): análise de 68 pacientes com ptose leve unilateral. Estratégia de correção graduada com avaliação pré-operatória da lei de Hering reduz a incidência de ptose contralateral desmascarada de 22% para 7%.',
        ],
        'Li X et al. Plast Reconstr Surg 2026;157(1):38e–48e. DOI: 10.1097/PRS.0000000000012230'
      ),

      b.h1('5. Resultados Funcionais'),
      s.blue(
        'Meta-análise: resultados funcionais e estéticos após blefaroplastia superior',
        [
          'Revisão sistemática e meta-análise de 12 ECRs (n = 1.847): blefaroplastia superior melhora campo visual em 84% dos casos com dermatocálase funcional; satisfação estética de 91%. Complicação mais frequente: olho seco transitório (18%).',
        ],
        'Todorov D et al. Aesthet Surg J 2025;45(6):554–562. DOI: 10.1093/asj/sjaf022'
      ),

      b.h1('6. Complicações'),
      s.dataTable(
        ['Complicação', 'Mecanismo', 'Conduta'],
        [
          ['Lagoftalmo', 'Remoção excessiva de pele superior', 'Lubrificante; revisão se grave'],
          ['Ectrópio', 'Laxidez + retração (via subciliar)', 'Cantoplastia / revisão'],
          ['Ptose iatrogênica', 'Lesão do LPS', 'Ptoseplastia de revisão'],
          ['Diplopia', 'Lesão do m. oblíquo inferior', 'Exploração cirúrgica'],
          ['Hollowing tardio', 'Ressecção excessiva de gordura', 'Preenchimento com AH ou lipoenxertia'],
          ['Olho seco', 'Lagoftalmo; lacrimal pré-existente', 'Colírio lubrificante; plug lacrimal'],
          ['Hematoma retrorbitário', 'Raro (0,04%); emergência', 'Cantotomia + cantólise lateral IMEDIATA'],
        ]
      ),
      b.p(''),

      b.h1('Referências-Base'),
      b.p("Neligan PC (Ed.). Plastic Surgery, 5ª Ed. Elsevier, 2023. Vol. 2, Cap. 9."),
      b.p("Grotting JC, Rubin JP. Grabb & Smith's Plastic Surgery, 8ª Ed. Wolters Kluwer, 2020. Cap. 30."),

      b.h1('Atualizações Incorporadas — v1.0 (2026-03-28)'),
      b.p('Stein MJ et al. Practice Patterns in Blepharoplasty: 15-Year Review of ABPS Data. Plast Reconstr Surg 2025;155(5):895–901.'),
      b.p('Park NS et al. Early Grafting Using AlloDerm to Correct Upper Eyelid Retraction. Plast Reconstr Surg 2025;156(2):189e–193e.'),
      b.p('Nomoto S, Ogawa R. Subtarsal Capsulopalpebral Fascia Incision: New Paradigm for Ectropion-Free Lower Blepharoplasty. Plast Reconstr Surg 2026;157(4):486e–495e.'),
      b.p('Chen J et al. Fat Repositioning with Deep Fat Excision in Transcutaneous Lower Blepharoplasty. Plast Reconstr Surg 2026;157(4):622–631.'),
      b.p('Yu AY et al. Conservative Crease-Height-Adjustable Asian Double-Eyelid Surgery. Plast Reconstr Surg 2025;156(1):29–40.'),
      b.p('Li X et al. Aesthetic Correction of Mild Blepharoptosis: Balancing Hering\'s Law. Plast Reconstr Surg 2026;157(1):38e–48e.'),
      b.p('Todorov D et al. Functional and Aesthetic Outcomes After Upper Blepharoplasty: Meta-analysis. Aesthet Surg J 2025;45(6):554–562.'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  ritidoplastia: {
    filename: '12-3-Ritidoplastia.docx',
    title:    '12-3 — Ritidoplastia (Facelift)',
    version:  'v1.0',
    date:     '2026-03-28',
    history:  [
      ['v1.0', '2026-03-28', 'Criação do documento. Base: Neligan (2023) + Grabb & Smith (2020). Incorporação inicial de artigos PRS/ASJ (2020–2025).'],
    ],
    body: (b, s) => [
      b.h1('1. Introdução'),
      b.p(['A ritidoplastia é o conjunto de técnicas cirúrgicas para rejuvenescimento do terço médio e inferior da face e pescoço. Trata o envelhecimento gravitacional por redistribuição de tecidos e manejo variável do SMAS. É o padrão-ouro para rejuvenescimento facial cirúrgico de longa duração.', b.ref('Neligan, 2023, vol. 2, cap. 11')]),

      b.h1('2. Anatomia e Envelhecimento'),
      b.h2('2.1 Mecanismos do Envelhecimento Facial'),
      b.p(['Quatro componentes: (1) ptose gravitacional, (2) deflação volumétrica (gordura + reabsorção óssea), (3) alteração da qualidade cutânea, (4) hipertrofia/ptose muscular (platisma, mentoniano).', b.ref('Neligan, 2023')]),

      b.h2('2.2 SMAS — Sistema Músculo-Aponeurótico Superficial'),
      b.p(['O SMAS conecta o platisma (pescoço) ao zigomático menor e orbicular. É a estrutura-chave para resultados duradouros. Zona de adesão firme: sobre o masseter ("zona de segurança" — risco neural mínimo nessa região).', b.ref('Grabb & Smith, 2020, cap. 32')]),

      b.h2('2.3 Ligamentos de Retenção (Furnas)'),
      s.dataTable(
        ['Ligamento', 'Localização', 'Divisão libera'],
        [
          ['Zigomático-cutâneo', 'Arco zigomático → pele', 'Ptose malar; sulco nasojugal'],
          ['Massetérico-cutâneo', 'Masséter → pele', 'Jowl; linha mandibular'],
          ['Mandibular', 'Mandíbula → pele', 'Sulco labiomandibular; jowl'],
        ]
      ),
      b.p(''),

      b.h2('2.4 Nervo Facial — Ramos Vulneráveis'),
      s.dataTable(
        ['Ramo', 'Vulnerabilidade', 'Prevenção'],
        [
          ['Temporal (frontal)', 'Cruzamento do arco zigomático superficialmente', 'Dissecção profunda ao SMAS na região temporal'],
          ['Zigomático', 'Dissecção pré-zigomática profunda', 'Identificar ramo antes de dividir ligamentos'],
          ['Marginal mandibular', 'Abaixo da mandíbula; lipoaspiração cervical', 'Dissecar superficialmente na borda inferior'],
        ]
      ),
      b.p(''),

      b.h1('3. Técnicas Cirúrgicas'),
      b.h2('3.1 Revisão Sistemática das Técnicas de SMAS'),
      s.blue(
        'Desmistificando as técnicas de face lift — revisão sistemática',
        [
          'Schultz et al. (2025): revisão sistemática de 89 estudos comparando técnicas de SMAS. Deep plane e composite flap demonstraram maior durabilidade (8–12 anos) e melhor melhora do sulco nasolabial vs. plication (5–7 anos).',
          'Plication e imbrication têm perfil de segurança superior; deep plane exige maior experiência mas produz resultado mais natural.',
        ],
        'Schultz KP et al. Plast Reconstr Surg 2026;157(4):615–620. DOI: 10.1097/PRS.0000000000012526'
      ),

      b.h2('3.2 Deep Plane — Técnica'),
      b.p(['Elevação subcutânea até o rebordo anterior do masseter. Incisão do SMAS abaixo do zigomático menor. Elevação de retalho composto SMAS + gordura malar. Divisão dos ligamentos zigomático e massetérico. Suspensão posterior-superior.', b.ref('Neligan, 2023')]),

      s.blue(
        'Deep plane em pacientes asiáticos',
        [
          'Wong, Hsieh & Mendelson (2025): adaptações técnicas para a face asiática incluem dissecção mais extensa na área malar (maior aderência periosteal), menor tensão do retalho e preservação de gordura malar para evitar esqueletização.',
        ],
        'Wong CH et al. Plast Reconstr Surg 2025;156(4):485e–496e. DOI: 10.1097/PRS.0000000000012102'
      ),

      b.h2('3.3 Manejo do Pescoço'),
      b.p(['Componentes: lipoaspiração submentoniana, platismaplastia (plicatura anterior), suspensão do SMAS/platisma durante o facelift, lipectomia subplatismal quando necessário.', b.ref('Grabb & Smith, 2020')]),

      s.blue(
        'Suturas cervicais seletivas no facelift',
        [
          'Ganesh Kumar et al. (2025): protocolo de suturas cervicais seletivas (ao invés de platismaplastia completa em todos os casos). Indicações individualizadas por grau de ptose do platisma. Redução de 40% no tempo cirúrgico sem diferença em resultado a 1 ano.',
        ],
        'Ganesh Kumar N et al. Plast Reconstr Surg 2025;156(2):194e–197e. DOI: 10.1097/PRS.0000000000011968'
      ),

      s.blue(
        'Transecção completa do platisma para reconturno cervical',
        [
          'Bartow & Core (2025): série de 87 casos de transecção completa do platisma via acesso submentoniano. Melhora significativa do ângulo cervicomental (143° → 116°). Menor recidiva de bandas vs. plicatura isolada.',
        ],
        'Bartow MJ, Core G. Aesthet Surg J 2025;45(5):448–453. DOI: 10.1093/asj/sjaf023'
      ),

      s.blue(
        'Suspensão completa do músculo platisma no deep plane',
        [
          'Timberlake et al. (2025): suspensão completa do platisma como extensão do deep plane face lift em 234 pacientes. Resultado cervical superior vs. técnicas parciais; sem aumento de complicações neurais.',
        ],
        'Timberlake AT et al. Plast Reconstr Surg 2025;155(4):699e–703e. DOI: 10.1097/PRS.0000000000011705'
      ),

      b.h2('3.4 Browlift'),
      s.blue(
        'Estabilidade a longo prazo do endoscopic brow lift — meta-análise',
        [
          'Şibar et al. (2025): meta-análise de 14 estudos (n = 1.124): browlift endoscópico mantém elevação de 6,8 mm em 5 anos; recidiva gradual de ~0,4 mm/ano. Resultado mais estável quando fixado com parafuso/implante vs. apenas sutura.',
        ],
        'Şibar S et al. Aesthet Surg J 2025;45(3):232–240. DOI: 10.1093/asj/sjae225'
      ),

      b.h2('3.5 Técnica U-SMAS'),
      s.blue(
        'U-SMAS Lift — nova variante técnica',
        [
          'Movassaghi et al. (2025): U-SMAS lift combina dissecção subcutânea anterior com suspensão do SMAS em forma de "U" invertido. Adequado para pacientes com ptose moderada; menor dissecção que o deep plane; bons resultados em 6–12 meses.',
        ],
        'Movassaghi K et al. Plast Reconstr Surg 2025;155(4):632–636. DOI: 10.1097/PRS.0000000000011673'
      ),

      b.h1('4. Técnicas Adjuvantes e Minimamente Invasivas'),
      s.blue(
        'Ultrassom microfocado (MFU-V / Ultherapy) — meta-análise',
        [
          'Amiri et al. (2025): meta-análise de 18 estudos (n = 1.932): MFU-V melhora o malar e o contorno mandibular em casos selecionados de envelhecimento leve a moderado. Complemento ao facelift, não substituto.',
        ],
        'Amiri M et al. Aesthet Surg J 2025;45(3):NP86–NP94. DOI: 10.1093/asj/sjae228'
      ),

      b.h1('5. Ácido Tranexâmico no Facelift'),
      s.blue(
        'Ácido tranexâmico local no facelift — coorte pareada',
        [
          'Darras et al. (2025): TXA local aplicado aos retalhos durante facelift (n = 204 pareados): sem aumento de complicações de cicatrização ou infecção. Tendência a menor taxa de hematoma (2,1% vs. 3,9%), sem significância estatística neste estudo. Segurança confirmada.',
        ],
        'Darras O et al. Aesthet Surg J 2025;45(12):1213–1219. DOI: 10.1093/asj/sjaf130'
      ),

      b.h1('6. Complicações'),
      s.flashcards([
        ['Hematoma — frequência',          '1–8% (homens > mulheres)'],
        ['Principal fator de risco hematoma', 'Hipertensão arterial sistêmica'],
        ['Necrose cutânea — FR principal',  'Tabagismo (RR 12×); tensão excessiva'],
        ['Lesão permanente do n. facial',   '< 1%'],
        ['Deformidade do lóbulo ("pixie")', 'Tensão inferior; incisão incorreta'],
        ['Durabilidade (deep plane)',       '8–12 anos'],
        ['Durabilidade (plication)',        '5–7 anos'],
      ]),
      b.p(''),

      b.h1('Referências-Base'),
      b.p("Neligan PC (Ed.). Plastic Surgery, 5ª Ed. Elsevier, 2023. Vol. 2, Cap. 11."),
      b.p("Grotting JC, Rubin JP. Grabb & Smith's Plastic Surgery, 8ª Ed. Wolters Kluwer, 2020. Cap. 32."),

      b.h1('Atualizações Incorporadas — v1.0 (2026-03-28)'),
      b.p('Schultz KP et al. Demystifying Deep Layer Face-Lift Techniques: Systematic Review. Plast Reconstr Surg 2026;157(4):615–620.'),
      b.p('Ganesh Kumar N et al. Role of Selective Neck Sutures in Face Lifts. Plast Reconstr Surg 2025;156(2):194e–197e.'),
      b.p('Wong CH et al. Deep Plane Face Lift in Asian Patients. Plast Reconstr Surg 2025;156(4):485e–496e.'),
      b.p('Timberlake AT et al. Complete Platysma Muscle Suspension in Deep-Plane Face-Lift Surgery. Plast Reconstr Surg 2025;155(4):699e–703e.'),
      b.p('Movassaghi K et al. The U-SMAS Lift. Plast Reconstr Surg 2025;155(4):632–636.'),
      b.p('Darras O et al. Local Tranexamic Acid in Facelift Surgery. Aesthet Surg J 2025;45(12):1213–1219.'),
      b.p('Bartow MJ, Core G. Effective Recontouring of the Neck by Complete Platysmal Transection. Aesthet Surg J 2025;45(5):448–453.'),
      b.p('Şibar S et al. Long-term Stability in Endoscopic Brow Lift: Systematic Review and Meta-Analysis. Aesthet Surg J 2025;45(3):232–240.'),
      b.p('Amiri M et al. Microfocused Ultrasound With Visualization (MFU-V): Systematic Review and Meta-Analysis. Aesthet Surg J 2025;45(3):NP86–NP94.'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  otoplastia: {
    filename: '12-4-Otoplastia.docx',
    title:    '12-4 — Otoplastia',
    version:  'v1.0',
    date:     '2026-03-28',
    history:  [
      ['v1.0', '2026-03-28', 'Criação do documento. Base: Neligan (2023) + Grabb & Smith (2020). Incorporação inicial de artigos PRS/ASJ (2020–2025).'],
    ],
    body: (b, s) => [
      b.h1('1. Introdução'),
      b.p(['A otoplastia corrige deformidades auriculares congênitas, com destaque para a orelha em abano (prominent ear). É indicada a partir dos 5–6 anos (quando o pavilhão atinge ~85% do tamanho adulto), com impacto significativo na autoestima.', b.ref('Neligan, 2023, vol. 3, cap. 28')]),

      b.h1('2. Anatomia e Angulações Normais'),
      s.flashcards([
        ['Ângulo cefaloauricular normal',   '25–35°'],
        ['Projeção hélice-mastóide (superior)', '10–12 mm'],
        ['Projeção hélice-mastóide (médio)',   '16–18 mm'],
        ['Projeção hélice-mastóide (inferior)', '20–22 mm'],
        ['Altura do pavilhão',              '~6 cm (adulto)'],
        ['Largura do pavilhão',             '~3,5 cm (adulto)'],
        ['Desenvolvimento completo',        '85% aos 5–6 anos'],
      ]),
      b.p(''),

      b.h2('2.1 Cartilagem Auricular'),
      b.p(['Cartilagem elástica (não hialina). Nutrição por difusão via pericôndrio. Hematoma subpericondral não drenado → orelha em couve-flor (pericondrite + fibrose). Princípio de Gibson: escarificação do lado convexo → curvatura para o lado escarificado.', b.ref('Neligan, 2023')]),

      b.h1('3. Classificação das Deformidades'),
      b.h2('3.1 Orelha em Abano — Causas'),
      s.dataTable(
        ['Causa', 'Frequência', 'Componente'],
        [
          ['Anti-hélice hipoplásica / ausente', '~60%', 'Dobra da anti-hélice não se forma'],
          ['Concha hiperdesenvolvida', '~20%', 'Concha profunda aumenta projeção'],
          ['Combinação', '~20%', 'Anti-hélice + concha'],
        ]
      ),
      b.p(''),

      b.h1('4. Técnicas Cirúrgicas'),
      b.h2('4.1 Técnica de Mustardé (Suturas)'),
      b.p(['Suturas permanentes de Prolene/Nylon na cartilagem auricular posterior para criar a anti-hélice. Sem escarificação obrigatória. Indicada em crianças com cartilagem maleável.', b.ref('Grabb & Smith, 2020, cap. 36')]),

      b.h2('4.2 Técnica de Furnas (Concha-Mastóide)'),
      b.p(['Sutura permanente da concha ao periósteo mastoideo para reduzir projeção por concha hipertrófica. Cuidado: evitar excesso de tensão (distorção do MAE).', b.ref('Grabb & Smith, 2020')]),

      s.blue(
        'Prevenção de extrusão de suturas — enxerto de tecido mole livre',
        [
          'Alzayadneh et al. (2022): interposição de enxerto livre de tecido mole entre sutura e pericôndrio. Série de 58 orelhas: zero extrusão em 24 meses vs. 8,6% no grupo controle histórico.',
        ],
        'Alzayadneh I et al. Aesthet Surg J 2022;42(9):NP571–NP575. DOI: 10.1093/asj/sjac079'
      ),

      b.h2('4.3 Otoplastia Poupando Cartilagem'),
      s.blue(
        'Abordagem poupadora de cartilagem — nova técnica',
        [
          'Benkler et al. (2023): otoplastia sem incisão ou escarificação de cartilagem. Apenas suturas percutâneas de Prolene combinadas com sutura concha-mastóide. Série piloto de 24 orelhas (18 meses): 91% satisfação; 4% recidiva.',
        ],
        'Benkler M et al. Plast Reconstr Surg 2023;152(4):689e–692e. DOI: 10.1097/PRS.0000000000010401'
      ),

      b.h2('4.4 Prevenção de Extrusão com Retalho Dermofascial'),
      s.blue(
        'Retalho dermofascial pós-auricular para cobrir suturas — refinamento técnico',
        [
          'Bulstrode et al. (2024): retalho dermofascial pós-auricular usado para cobrir as suturas de cartilagem, criando "bolso" de proteção. Série de 340 orelhas: extrusão de 0% vs. 5,8% histórico do mesmo cirurgião.',
        ],
        'Bulstrode NW et al. Plast Reconstr Surg 2024;154(6):1191e–1199e. DOI: 10.1097/PRS.0000000000011342'
      ),

      b.h2('4.5 Experiência de Grande Volume'),
      s.blue(
        'Otoplastia — experiência de Belfast: 2333 orelhas em 10 anos',
        [
          'McGarry et al. (2023): revisão retrospectiva de 2333 orelhas. Técnica combinada (Mustardé + Furnas) em 78%. Taxa de revisão: 5,1%. Principais causas: assimetria (2,3%), recidiva (1,8%), extrusão (1%). Satisfação geral: 94,2%.',
        ],
        'McGarry KM et al. Plast Reconstr Surg 2023;151(3):388e–397e. DOI: 10.1097/PRS.0000000000009908'
      ),

      b.h1('5. Técnicas Não Cirúrgicas — Moldagem Neonatal'),
      b.p(['Eficaz nas primeiras 6 semanas de vida (cartilagem moldável pela influência do estrogênio materno). Taxa de sucesso > 90% quando iniciada antes de 6 semanas. Dispositivos: EarWell, Auri. Evita cirurgia em casos de orelha em abano leve-moderada.', b.ref('Neligan, 2023')]),

      b.h1('6. Complicações'),
      s.dataTable(
        ['Complicação', 'Frequência', 'Conduta'],
        [
          ['Hematoma subpericondral', '1–3%', 'Drenagem imediata — risco de couve-flor'],
          ['Pericondrite', '< 1%', 'ATB IV (ciprofloxacino); drenagem'],
          ['Extrusão de sutura', '1–6%', 'Retirada da sutura; curativo'],
          ['Recidiva', '3–5%', 'Revisão após 6 meses'],
          ['Hipercorreção', 'Variável', 'Revisão após 6 meses'],
          ['Assimetria', 'Variável', 'Revisão após 6 meses'],
        ]
      ),
      b.p(''),

      b.h1('Referências-Base'),
      b.p("Neligan PC (Ed.). Plastic Surgery, 5ª Ed. Elsevier, 2023. Vol. 3, Cap. 28."),
      b.p("Grotting JC, Rubin JP. Grabb & Smith's Plastic Surgery, 8ª Ed. Wolters Kluwer, 2020. Cap. 36."),

      b.h1('Atualizações Incorporadas — v1.0 (2026-03-28)'),
      b.p('Bulstrode NW et al. Modified Approach to Prevent Suture Extrusion in Otoplasty Using a Postauricular Dermofascial Flap. Plast Reconstr Surg 2024;154(6):1191e–1199e.'),
      b.p('Benkler M et al. Cartilage-Sparing Otoplasty: A New Approach. Plast Reconstr Surg 2023;152(4):689e–692e.'),
      b.p('McGarry KM et al. Otoplasty: The Belfast Experience. 10-Year Review of 2333 Ear Outcomes. Plast Reconstr Surg 2023;151(3):388e–397e.'),
      b.p('Savetsky IL et al. Revisiting Primary Otoplasty: Surgical Approach to the Prominent Ear. Plast Reconstr Surg 2021;148(1):28e–31e.'),
      b.p('Alzayadneh I et al. Free Soft Tissue Grafts in Otoplasty to Avoid Suture Extrusion. Aesthet Surg J 2022;42(9):NP571–NP575.'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  abdominoplastia: {
    filename: '11-1-Abdominoplastia.docx',
    title:    '11-1 — Abdominoplastia',
    version:  'v1.0',
    date:     '2026-03-29',
    history:  [
      ['v1.0', '2026-03-29', 'Criação do documento com base integral em Neligan 5ª Ed. (2023), vol. 2, cap. 27 (Alan Matarasso) e Grabb & Smith 9ª Ed. (2024), cap. 75 (Amy Colwell). Cobertura completa: anatomia, classificação, técnica cirúrgica, variações, complicações. Artigos PRS/ASJ a serem incorporados em versão futura.'],
    ],
    body: (b, s) => [

      // ── Seção 1 ──────────────────────────────────────────────────────────
      b.h1('1. Introdução'),
      b.p(['A abdominoplastia evoluiu de um único procedimento padronizado para um sistema de operações baseado na anatomia individual, princípios cirúrgicos sólidos e objetivos do paciente. A introdução da lipoaspiração nas décadas de 1980–1990 revolucionou a cirurgia de contorno abdominal, ampliando o espectro de candidatos e permitindo abordagens menos invasivas para casos selecionados. Atualmente, as opções vão da lipoaspiração isolada até a abdominoplastia completa com ou sem lipoaspiração, a abdominoplastia 270° e a circunferencial, todas com fundamento anatômico no suprimento vascular do retalho.', b.ref('Neligan, 2023, vol. 2, cap. 27 — Matarasso')]),
      b.p(['O sistema abdominolipoplastia (Matarasso) é um modelo de classificação e tratamento que reconcilia as camadas de tecidos moles tratáveis da parede abdominal — pele, gordura e músculo — com a técnica cirúrgica apropriada para cada paciente. A cirurgia de contorno abdominal é o procedimento cirúrgico mais comum em mulheres (> 50% das abordagens abertas), respondendo por 11–16% dos procedimentos em homens. Em mulheres, a abdominoplastia trata efetivamente a maior parte das sequelas da gestação.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      // ── Seção 2 ──────────────────────────────────────────────────────────
      b.h1('2. Anatomia Cirúrgica'),
      b.h2('2.1 Camadas da Parede Abdominal'),
      b.p(['A parede abdominal é composta por sete camadas: pele, gordura subcutânea superficial, fáscia de Scarpa, gordura subscarpal, bainha anterior do reto, músculo reto abdominal e bainha posterior do reto. A fáscia de Scarpa é uma estrutura fascial de importância cirúrgica na região infra-umbilical: sua preservação durante a dissecção reduz a incidência de seroma ao manter os linfáticos subdérmicos e interromper menos a drenagem linfática em direção às virilhas.', b.ref('Grabb & Smith, 2024, cap. 75 — Colwell')]),
      b.p(['Na cirurgia de contorno, distinguem-se duas camadas de gordura subcutânea: superficial (abaixo da derme) e profunda (abaixo da fáscia superficial). A lipoaspiração é realizada livremente na camada profunda, com maior cautela na superficial para evitar irregularidades de contorno.', b.ref('Grabb & Smith, 2024, cap. 75')]),

      b.h2('2.2 Suprimento Vascular — Zonas de Huger'),
      b.p(['Huger (1979) descreveu três zonas de perfusão da parede abdominal anterior, com impacto direto no planejamento da abdominoplastia:', b.ref('Neligan, 2023, vol. 2, cap. 27')]),
      b.p('• Zona I (central): artérias epigástrica profunda inferior (DIEA) e superficial inferior (SIEA) — perfusão dominante do retalho no abdome não operado; ligada durante a dissecção da abdominoplastia.'),
      b.p('• Zona II (inguinal): artérias circunflexa ilíaca superficial (SCIA) e epigástrica superficial (SIEA) — contribuem com fluxo lateral; também comprometidas na abdominoplastia padrão.'),
      b.p('• Zona III (lateral/intercostal): artérias intercostais, subcostais e lombares — tornam-se o suprimento dominante do retalho abdominoplástico após a dissecção; preservadas ao se limitar a descolagem ao padrão em V invertido.'),
      b.p(['Após a elevação do retalho, a perfusão é sustentada primariamente pelos perfuradores laterais da zona III (intercostais). Por isso, a descolagem em V invertido — que preserva uma faixa intacta de tecido lateral — é a manobra-chave para garantir viabilidade do retalho, especialmente no vértice central (o "triângulo terrível" do abdome).', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      b.h2('2.3 Fáscia de Scarpa e Sistema Linfático'),
      b.p(['Os vasos linfáticos do abdome seguem dois padrões distintos abaixo do umbigo: drenagem oblíqua em direção aos linfonodos inguinais ipsilaterais. A preservação da fáscia de Scarpa na dissecção abdominal mantém esses vasos, reduzindo seromas. Este benefício foi demonstrado em estudos anatômicos com injeção de látex corado: a fáscia de Scarpa funciona como substrato para o plexo linfático subdérmico inferior.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      b.h2('2.4 Anatomia do Umbigo'),
      b.p(['O suprimento sanguíneo do umbigo deriva de três fontes: plexo subdermal superficial, remanescente do ligamento redondo (ligamentum teres hepatis) e perfuradores das artérias epigástricas profundas inferiores. Essa tríplice vascularização é fundamental no planejamento do tipo de abdominoplastia — quanto maior o comprometimento do pedículo profundo (ligação das perfurantes na dissecção), mais importante torna-se a preservação do pedículo dermal superficial. Hernias umbilicais são identificadas durante a abdominoplastia e corrigidas simultaneamente, preferencialmente com acesso lateral ao umbigo (Ventralex patch) para preservar o pedículo vascular do umbigo.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      b.h2('2.5 Unidades Estéticas do Abdome'),
      b.p(['Mulheres possuem sete unidades estéticas quando se considera lipoaspiração: abdome superior, umbigo, abdome inferior, monte pubiano, flancos bilaterais e rolos dorsais. Homens têm seis unidades (rolos dorsais raramente são considerados). O paciente frequentemente percebe todos esses segmentos como parte do "abdome" ao planejar a cirurgia, o que deve ser abordado no planejamento pré-operatório.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      b.h2('2.6 Gordura Visceral (Intraabdominal)'),
      b.p(['A gordura visceral (omental/intraabdominal) é clinicamente distinta da gordura subcutânea: é densa, firme à palpação, não tratável por lipoaspiração e não se beneficia de plicatura muscular. Sua presença deve ser identificada no pré-operatório: abdome que permanece convexo (não côncavo) na posição supina indica predominância visceral. Nesses pacientes, a plicatura do reto está contraindicada (não oferece benefício e pode alargará o contorno da cintura em sentido anteroposterior). A gordura visceral está associada a risco cardiometabólico, câncer e demência; accumula-se em homens a partir dos 30 anos e em mulheres no período perimenopáusico.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      // ── Seção 3 ──────────────────────────────────────────────────────────
      b.h1('3. Avaliação, Classificação e Seleção de Pacientes'),
      b.h2('3.1 Sistema Abdominolipoplastia — Classificação de Matarasso'),
      b.p(['O sistema de Matarasso (1989) classifica o candidato em quatro tipos conforme as camadas de tecido tratável e a técnica indicada:', b.ref('Neligan, 2023, vol. 2, cap. 27')]),
      s.dataTable(
        ['Tipo', 'Achados', 'Procedimento Indicado'],
        [
          ['Tipo I',  'Excesso isolado de gordura; tônus cutâneo bom; sem diástase significativa', 'Lipoaspiração isolada (SAL)'],
          ['Tipo II (Mini)', 'Excesso de pele infra-umbilical leve a moderado; diástase infra-umbilical; tônus cutâneo razoável', 'Mini-abdominoplastia: excisão limitada infra-umbilical ± plicatura infra-umbilical'],
          ['Tipo III (Modificada)', 'Excesso de pele moderado supra e infra-umbilical; diástase ao longo de todo o reto; lipodistrofia', 'Abdominoplastia modificada: transposição umbilical + plicatura completa ± lipo'],
          ['Tipo IV (Clássica)', 'Excesso franco de pele; lipodistrofia generalizada; diástase grave; ptose do umbigo', 'Abdominoplastia clássica completa ± lipoabdominoplastia'],
        ]
      ),
      b.p(''),

      b.h2('3.2 Contraindicações'),
      b.p(['Contraindicações absolutas: tabagismo ativo (necrose de retalho; suspender ≥ 4 semanas antes e após), transtorno dismórfico corporal (TDC), IMC > 35 kg/m² (risco elevado de complicações; cirurgia de redução de peso indicada primeiro), instabilidade de peso (aguardar estabilização 3–6 meses), gravidez futura planejada (desfaz a plicatura), coagulopatia não corrigida. Contraindicações relativas: cicatrizes abdominais desfavoráveis (podem comprometer suprimento do retalho), doenças cardiopulmonares (risco de compressão diafragmática pela plicatura), uso de anticoagulantes ou imunossupressores, obesidade moderada (IMC 30–35), expectativas irrealistas.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      b.h2('3.3 Exame Físico e Planejamento'),
      b.p(['O exame físico avalia: excesso de pele supra e infra-umbilical (pinch test), quantidade e distribuição da gordura subcutânea vs. visceral (abdome convexo em supino = visceral), tônus cutâneo (elasticidade), grau e extensão da diástase do reto (palpação com elevação ativa de MMII), hérnias umbilicais, cicatrizes prévias (Pfannenstiel, minilaparotomia, laparoscopia) e assimetrias (umbilical, quadril). A "manobra de Matarasso" — pré-excisão pela apreensão bimanual do pannus da cicatriz umbilical ao monte pubiano — confirma que a área a ser removida pode ser excisada com fechamento sem tensão excessiva.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),
      b.p(['Investigar trombofilia hereditária em pacientes com história pessoal ou familiar de trombose venosa. Rastrear distúrbio dismórfico corporal. Para cirurgias combinadas, limitar tempo operatório a < 4 horas (operações combinadas) para minimizar risco de TEV. Documentação fotográfica padronizada (anteroposterior, oblíqua bilateral, lateral) é parte do protocolo padrão.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      // ── Seção 4 ──────────────────────────────────────────────────────────
      b.h1('4. Preparo Pré-Operatório'),
      b.h2('4.1 Protocolo Pré-Operatório'),
      b.p(['Suspensão de tabaco: mínimo 4 semanas antes e após a cirurgia. Suspensão de anticoagulantes: aguardar até retirada dos drenos para reintroduzir anticoagulação plena. Medicamentos que alteram cicatrização (imunossupressores, antimetabólitos): suspender ≥ 3 semanas antes e após. Avaliação laboratorial básica: hemograma, coagulograma. Em grandes volumes (> 5 L de lipoaspirado): eletrólitos e creatinina pré-op. Em pós-bariátrico: albumina, pré-albumina, ferro (a deficiência de ferro é a carência nutricional mais comum; corrigir antes da cirurgia).', b.ref('Grabb & Smith, 2024, cap. 75')]),

      b.h2('4.2 Profilaxia de TEV — Escore de Davison-Caprini'),
      b.p(['A abdominoplastia é considerada cirurgia de alto risco para TEV. O escore de Davison-Caprini é a ferramenta de estratificação de risco padrão em cirurgia plástica estética. Uma abdominoplastia típica pontua 4 (alto risco) pelos seguintes fatores: cirurgia eletiva (1 pt), procedimento > 45 min (2 pts), idade 41–60 anos (1 pt). A enoxaparina 40 mg SC uma vez ao dia iniciada 8 horas após o procedimento é o esquema padrão; manter por 7–10 dias. Dispositivos de compressão pneumática intermitente são utilizados intraoperatoriamente e mantidos no pós-op imediato. Deambulação precoce no dia da cirurgia — paciente caminha inclinado (como usando andador), progressivamente erguendo o tronco nos dias seguintes.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      b.h2('4.3 Marcações Cirúrgicas — Técnica de Matarasso'),
      b.p(['As marcações são feitas com o paciente em pé, vestindo a roupa íntima de preferência. Etapas:', b.ref('Neligan, 2023, vol. 2, cap. 27')]),
      b.p('1. Marcar borda superior e inferior da roupa íntima preferida (limites da cicatriz).'),
      b.p('2. Com o paciente sentado e levemente inclinado para frente, marcar as extremidades laterais da excisão no ponto mais externo da prega cutânea natural.'),
      b.p('3. Marcar a incisão inferior (pubiana) aproximadamente 5–9 cm acima da fenda vulvar, conectando os três pontos (extremidades laterais + ponto central).'),
      b.p('4. Com o paciente elevando suavemente o pannus (simulando a contração final do retalho), desenhar a incisão superior conectando e completando a elipse.'),
      b.p('5. O ápice da incisão superior situa-se ligeiramente acima do umbigo (ajustar conforme laxidão: mais alto para pele mais frouxa, mais baixo para pele firme).'),
      b.p('6. No centro cirúrgico, retestar as marcações com sutura de seda longa (midline xifóide-pubis), sobrepondo os pontos superior e inferior para confirmar simetria antes de incisão.'),
      b.p(['A incisão inferior é marcada 5–7 cm da comissura vulvar (Grabb & Smith) ou 5–9 cm acima da fenda vulvar (Matarasso). A incisão lateral sobe suavemente para acomodar o contorno do quadril. Intraoperatoriamente, a incisão superior é feita primeiro (técnica de pré-excisão de Jaime Planas/Matarasso), o que reduz sangramento e cria plano natural de dissecção.', b.ref('Neligan, 2023, vol. 2, cap. 27; Grabb & Smith, 2024, cap. 75')]),

      s.flashcards([
        ['Incisão inferior — distância da vulva',      '5–9 cm acima da fenda vulvar (Matarasso) / 5–7 cm da comissura (Colwell)'],
        ['Encurtamento pós-op xifóide–umbigo',         '2,8 cm em média (seguimento 6 meses)'],
        ['Encurtamento pós-op umbigo–vulva',           '5,09 cm em média (seguimento 6 meses)'],
        ['Redução de cintura',                         '7,9 cm em média (seguimento 6 meses)'],
        ['Plicatura do reto: sutura supraumbilical',   'Loop nylon 0 ou Quill 1-0 polipropileno (CT-1, 45 cm), unidirecional, corrida'],
        ['Plicatura do reto: sutura infraumbilical',   'Segunda sutura similar; estender abaixo do retalho até o osso pubiano'],
        ['Reforço: sutura de waistline (pacientes magros)', '1–2 pontos Nurolon 2-0 horizontal ao umbigo, 5–8 cm, estreitando a cintura'],
        ['Fechamento profundo',                        'Quill Monoderm 2-0 (30×30 cm, PS-1) — incorpora fáscia de Scarpa'],
        ['Fechamento subdérmico',                      'Quill Monoderm 3-0 (30×30 cm, PS-2) — subcuticular'],
        ['Drenos',                                     'Dois JP No. 10 pré-embebidos em Betadine; saída lateral na ferida; retirar quando ≤ 30 mL/dia'],
        ['Umbilicoplastia: incisão cutânea',           'Incisão em V invertido 2,5 cm na linha média'],
        ['Umbilicoplastia: sutura umbilical',          'Pontos profundos absorvíveis + interrompidos Nylon 3-0 e 4-0; NÃO ancorar ao plano fascial'],
        ['Dose epinefrina superwet (tóxica)',          '0,07 mg/kg de adrenalina 1:1.000 — limite máximo'],
        ['Solução superwet Matarasso',                 '1 L Ringer lactato + 20 mL lidocaína 1% + 1 mL epinefrina 1:1.000'],
        ['Analgésico pré-plicatura (Exparel)',         '20 mL Exparel 1,3% + 80 mL SF 0,9% + 30 mL bupivacaína 0,25% c/ epinefrina 1:200.000'],
        ['Índice de seroma (CosmetAssure)',            'Complicação local mais comum; reduzida com fáscia de Scarpa preservada + quilting/drenos'],
        ['VTE em abdominoplastia isolada',             '0,5–1,1%'],
        ['Hematoma',                                   '~2%'],
        ['Infecção',                                   '1–3,8%'],
        ['Lesão nervosa (entrapment)',                 '1,9%'],
        ['Complicação geral (CosmetAssure)',           '~4% total'],
        ['Redo/revisão de abdominoplastia',            '13–15% de todos os pacientes'],
        ['IMC máximo recomendado para cirurgia',       '35 kg/m² (contraindicação absoluta acima desse limite)'],
        ['Tempo operatório máximo recomendado',        '< 4 horas em procedimentos combinados'],
        ['Tabagismo: suspensão pré-op',               'Mínimo 4 semanas antes E após a cirurgia'],
        ['Escore Caprini em abdominoplastia padrão',  '≥ 4 pontos (alto risco de TEV)'],
        ['Enoxaparina profilática',                   '40 mg SC 1×/dia, iniciada 8h após o procedimento'],
        ['Distância mínima umbigo–incisão',           '≥ 8 cm (para float umbilical)'],
      ]),
      b.p(''),

      // ── Seção 5 ──────────────────────────────────────────────────────────
      b.h1('5. Técnica Cirúrgica — Abdominoplastia Completa (Matarasso)'),
      b.h2('5.1 Posicionamento e Anestesia'),
      b.p(['O procedimento é realizado sob anestesia geral ou raquidiana/peridural. A mesa cirúrgica é posicionada em "cadeira de praia" (beach chair) — decúbito dorsal com flexão da mesa ao nível dos quadris — para permitir o fechamento sem tensão. Infiltração superwet na área operatória: 1 L de Ringer lactato + 20 mL de lidocaína 1% + 1 mL de epinefrina 1:1.000. Benefícios da lidocaína: reduz anestesia sistêmica necessária, é bacteriostática, reduz dor pós-op e promove retorno sensorial mais precoce. Limitar o volume ao abdome preserva margem de segurança para infiltrar outras áreas (coxas, flancos) sem atingir dose tóxica de epinefrina (0,07 mg/kg de 1:1.000). Infiltração excessiva compromete a eletrocauterização.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      b.h2('5.2 Sequência Operatória'),
      b.p(['A operação inicia com lipoaspiração enquanto os vasos ainda estão fechados — teoricamente reduzindo o risco de embolia gordurosa pulmonar. Áreas: flancos, monte pubiano (se indicado), zona de descolagem seletiva. Trocar luvas após lipoaspiração. Reverificar marcações com sutura de seda cruzada. O umbigo é limpo com Betadine.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),
      b.p('Sequência resumida:'),
      b.p('1. Lipoaspiração das áreas indicadas.'),
      b.p('2. Troca de luvas; reverificação das marcações com sutura de seda.'),
      b.p('3. Dissecção e liberação do umbigo com tesoura de Metzenbaum; fixação de botão ocular de plástico ao umbigo para identificação posterior.'),
      b.p('4. Incisão e pre-excisão: incisão superior da elipse com bisel de 45° em direção à fáscia do reto; tecido excisado em "vest-over-pants" (colete sobre calça).'),
      b.p('5. Descolagem do retalho superior em V invertido (zona de descolagem completa central + zona seletiva lateral).'),
      b.p('6. Hemostasia contínua com eletrocautério antes de perfuradores recuarem para sob a fáscia.'),
      b.p('7. Injeção analgésica ao longo da fáscia do reto (Exparel + bupivacaína).'),
      b.p('8. Marcação e plicatura da diástase do reto.'),
      b.p('9. Descolagem seletiva adicional para reduzir abaulamentos residuais pós-plicatura.'),
      b.p('10. Irrigação com soro fisiológico + H₂O₂ 3%; hemostasia final.'),
      b.p('11. Flexão máxima da mesa; fechamento por camadas; colocação de drenos; umbilicoplastia.'),

      b.h2('5.3 Elevação do Retalho — Padrão em V Invertido'),
      b.p(['A incisão superior é feita com bisel de 45° em direção à fáscia do reto, criando um plano natural de dissecção ascendente. O retalho é descolado em V invertido (zona de descolagem completa): túnel estreito central suficiente para a plicatura do reto, preservando os perfuradores laterais intercostais (Zona III de Huger). Isso permite lipoaspiração simultânea do retalho (lipoabdominoplastia) sem comprometer a viabilidade, pois a descolagem descontínua por cânula libera o retalho e mantém o suprimento axial.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),
      b.p(['Zona de descolagem seletiva: imediatamente além do V, descolagem adicional conforme necessário para eliminar abaulamentos cutâneos após plicatura. Deve ser conservadora: algum abaulamento cutâneo leve é tolerado (pois manutenção de pele aderida preserva suprimento) e resolve no pós-op precoce. O triângulo terrível do abdome — ponto de máxima tensão na linha média ao nível do fechamento — é o local mais suscetível a isquemia; manobras que aumentam tensão nessa região devem ser evitadas.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      b.h2('5.4 Plicatura do Reto Abdominal'),
      b.p(['A diástase do reto inicia-se já no segundo trimestre da gestação. Antes da plicatura, injeta-se Exparel (20 mL a 1,3% + 80 mL SF) + bupivacaína 0,25% com epinefrina 1:200.000 (30 mL) ao longo da fáscia do reto por técnica de threading, proporcionando analgesia pós-operatória prolongada.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),
      b.p(['A diástase é marcada com elipse vertical de tinta do xifóide ao pubis. Plicatura supraumbilical: sutura corrida de loop nylon 0 ou Quill 1-0 polipropileno 45 cm (CT-1) unidirecional. Plicatura infraumbilical: segunda sutura similar, estendendo abaixo do retalho cutâneo até o osso pubiano (previne fullness pubiana pós-op). Reforço adicional: pontos interrompidos enterrados Nurolon 2-0 imbrincando a primeira camada. Em pacientes magros: 1–2 sutures Nurolon 2-0 horizontais ao umbigo (Ian Jackson) para estreitar a cintura 5–8 cm.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),
      b.p(['Cinco áreas de atenção na plicatura (Fig. 27.36 de Matarasso): (1) xifóide — descolagem deve atingir este nível; fáscia atenuada, sutura pode não fechar completamente; (2) supraumbilical — área que mais frequentemente necessita reforço para prevenir fullness pós-op; (3) linha arqueada de Douglas — abaixo dela não há fáscia posterior do reto; fáscia mais firme, mas frequentemente enrijecida por cicatrizes de cesáreas; (4) região pubiana — plicatura deve se estender abaixo da margem cutânea inferior para prevenir fullness suprapubiana; (5) suturas de cintura — utilizadas seletivamente em pacientes delgados.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      b.h2('5.5 Fechamento, Drenos e Umbilicoplastia'),
      b.p(['Com a mesa em máxima flexão (beach chair), inicia-se o fechamento colocando ponto profundo de Vicryl 2-0 na linha média. As bordas são aproximadas lateralmente com grampos (staples) para minimizar dog-ears. Fechamento profundo por camadas incorporando a fáscia de Scarpa: Quill Monoderm 2-0 (30×30 cm, agulha PS-1) em sutura corrida bilateral. Fechamento subdérmico: Quill Monoderm 3-0 (agulha PS-2) intradérmico.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),
      b.p(['Drenos: dois Jackson-Pratt No. 10 pré-embebidos em Betadine, saindo na face médio-lateral da ferida. Fixados com nylon 3-0. Alternativamente, dreno Intéri Vac com saída pelo monte pubiano. Retirar quando débito < 30 mL/dia e coloração não hemática. A drenagem inicial é mais volumosa em pacientes com infiltração tumescente em áreas adjacentes de lipoaspiração.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),
      b.p(['Umbilicoplastia: palpação do botão ocular cutâneo (marcador umbilical) através da pele com a ferida parcialmente fechada; determinação da posição com referência na sutura de seda da linha média (linha da comissura vulvar). A nova posição umbilical é marcada ligeiramente superior à posição natural (a cicatriz contrai ligeiramente). Incisão em V invertido de 2,5 cm na linha média. As bordas superior e inferior da incisão cutânea podem ser desgorduradas. O umbigo NÃO é ancorado à fáscia (ancoragem pode causar distorção unilateral se um lado se soltar). Fechamento com pontos profundos absorvíveis + pontos interrompidos de nylon 3-0 e 4-0. Curativo com gaze Xeroform 2×6 cm.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),
      b.p(['Curativo final: ungüento antibiótico + cobertura Telfa ou Prineo (Dermabond). Rash cutâneo por adesivo tissular é tratado com leite, creme anti-prurido Aveeno, esteroide tópico ou Benadryl/Zyrtec oral. Transferência para maca especial que reproduz posição de cadeira de praia.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      // ── Seção 6 ──────────────────────────────────────────────────────────
      b.h1('6. Variações Técnicas'),
      b.h2('6.1 Mini-Abdominoplastia (Tipo II — Matarasso)'),
      b.p(['Indicada para excesso de pele restrito ao abdome inferior, diástase infra-umbilical e tônus cutâneo razoável supra-umbilicalmente. Frequentemente corrige cicatriz de cesárea deprimida e suas irregularidades de contorno. Inclui lipoaspiração quando indicada. Cautela: correção isolada do abdome inferior pode piorar comparativamente a flacidez supraumbilical preexistente. Nesse tipo, o umbigo não é transposicionado; mantém-se sua inserção original.', b.ref('Grabb & Smith, 2024, cap. 75; Neligan, 2023, vol. 2, cap. 27')]),

      b.h2('6.2 Float Umbilical (Tipo III Modificada)'),
      b.p(['Adequada para excesso de pele de grau leve a moderado com diástase completa do reto. Permite correção completa da parede abdominal sem transposição formal do umbigo. O pedículo umbilical é preservado por suas conexões dermais; o pedículo profundo é seccionado para liberar acesso à plicatura. Após a correção, o pedículo é re-inserido na parede abdominal em sua posição original ou 1–3 cm abaixo (auxilia na correção de excesso supraumbilical leve). Não descer mais de 3 cm: aparência antinatural. Deixar ≥ 8 cm entre a base do umbigo e a incisão inferior.', b.ref('Grabb & Smith, 2024, cap. 75')]),

      b.h2('6.3 Lipoabdominoplastia (Saldanha)'),
      b.p(['Variação que incorpora lipoaspiração ampla de todo o abdome superior — incluindo a área de descolagem — ao preservar o suprimento do retalho pela técnica de descolagem em V invertido. A descolagem é limitada ao espaço central estreito para a plicatura, enquanto o restante do retalho é desbridado por lipoaspiração (descolagem descontínua). Candidatos ideais: excesso de gordura subcutânea supraumbilical com tônus de pele relativamente bom.', b.ref('Grabb & Smith, 2024, cap. 75; Neligan, 2023, vol. 2, cap. 27')]),

      b.h2('6.4 Abdominoplastia Fleur-de-Lis (FDL)'),
      b.p(['Indicada para o paciente com excesso de pele duplo: pannus superior E inferior. Combina abdominoplastia tradicional com excisão vertical adicional de elipse. Resulta em cicatriz transversal baixa + cicatriz vertical completa. O umbigo emerge pela cicatriz vertical. Relatos iniciais de altas taxas de deiscência e problemas de cicatrização na junção T; descolagem limitada como na lipoabdominoplastia reduziu significativamente as complicações.', b.ref('Grabb & Smith, 2024, cap. 75')]),

      b.h2('6.5 Abdominoplastia Circunferencial (Belt Lipectomy / Lower Body Lift)'),
      b.p(['Indicada para excesso de pele circunferencial do tronco — frequentemente em pós-bariátrico. Combina abdominoplastia anterior + levantamento de coxa lateral + levantamento de glúteo. Distinção importante: belt lipectomy remove excesso acima da linha de ancoragem (extensão de abdominoplastia para os flancos/costas), enquanto lower body lift remove tecido ABAIXO da linha de ancoragem (efeito de levantamento maior sobre glúteos e coxas). IMC deve ser < 37–38 kg/m² e estabilizado por 3–6 meses.', b.ref('Grabb & Smith, 2024, cap. 75')]),
      b.p(['Técnica: inicia com posicionamento prono (lipoaspiração lombar e coxas laterais; levantamento glúteo posterior). Mesa secundária para virar o paciente ao supino. A parte anterior segue técnica de abdominoplastia padrão (clássica ou FDL). Fechamento com Scarpa PDS 2-0 e Monocryl 3-0 dérmico e corrida. Drenos JP em ambas as posições (4 drenos no total). Preservação de tecido central para autoaumentação glútea quando desejado (flap desepitelizado deslocado inferiormente ~6 cm com PDS).', b.ref('Grabb & Smith, 2024, cap. 75')]),

      b.h2('6.6 Contextos Especiais'),
      b.p(['Pós-bariátrico: maior risco de deficiências nutricionais (ferro é a mais comum — rastrear e corrigir pré-op). Risco aumentado de TEV e complicações de cicatrização. Avaliação laboratorial obrigatória (albumina, pré-albumina, ferro, hemograma). Pannus volumoso pode deslocar anatomicamente o cordão espermático para o campo operatório — cuidado ao aprofundar a incisão.', b.ref('Grabb & Smith, 2024, cap. 75')]),
      b.p(['Abdominoplastia masculina: homens procuram predominantemente lipoaspiração abdominal isolada (80–89% dos casos). Na abdominoplastia masculina formal, o excesso de pele raramente é o fator principal; gordura visceral e subcutânea são as queixas dominantes. Incisão: linha reta em vez de curva suave ascendente lateral (anatômico para o contorno masculino). Cuidado redobrado com gordura visceral.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),
      b.p(['Abdominoplastia secundária (redo): ocorre em 13–15% dos casos. Via aberta preferida. Descolagem pode ser dificultada por aderências. Revisão completa (não revisão menor) é possível e tem alta satisfação quando bem indicada.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),
      b.p(['Abdomen cicatricial (cesárea, laparotomia): a cicatriz de Pfannenstiel frequentemente é incorporada na área de excisão da abdominoplastia. Cicatrizes medianas (laparotomias) alteram o suprimento vascular do retalho e exigem cautela maior na descolagem lateral.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),
      b.p(['Abdominoplastia reversa: raramente indicada; excisão do excesso de pele pela borda inferior das mamas, para casos com excesso supraumbilical isolado e cicatriz existente no sulco inframamário.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      // ── Seção 7 ──────────────────────────────────────────────────────────
      b.h1('7. Complicações'),
      s.dataTable(
        ['Complicação', 'Incidência', 'Conduta'],
        [
          ['Seroma', 'Complicação local mais comum', 'Drenos; quilting sutures; preservação fáscia de Scarpa; cola de fibrina; punção seriada'],
          ['Hematoma', '~2%', 'Retorno ao SO para drenagem; atentar ao hematoma expansivo nas primeiras 24h'],
          ['Infecção superficial', '1–3,8%', 'ATB; curativo; vigilância para fasciíte necrosante'],
          ['Fasciíte necrosante', 'Rara, mas grave', 'Diagnóstico: escore LRINEC ≥ 6; desbridamento cirúrgico de urgência + ATB IV'],
          ['TEV/EP', '0,5–1,1%', 'Prevenção: Caprini + enoxaparina; diagnóstico: duplex + angiotomografia; tratamento anticoagulação'],
          ['Necrose/isquemia do retalho', 'Variável; triângulo terrível', 'Desbridamento; cicatrização por 2ª intenção ou enxerto; prevenção pela técnica de V invertido'],
          ['Dog-ear', 'Frequente sem cuidado', 'Correção com incisão em 90° (técnica de Grassetti); planejamento adequado das extremidades laterais'],
          ['Lesão do nervo cutâneo femoral lateral', 'Mais comum das lesões neurais', 'Passa 1 cm medial à EIAS; entorpecimento/dor na face anterolateral da coxa'],
          ['Lesão dos nervos ilioinguinal/iliohipogástrico', '1,9% nervo entrapment', 'Incisão lateral baixa próxima ao ligamento inguinal; entorpecimento inguinal/labia/escroto'],
          ['Cicatriz alargada / hipertrófica', 'Relacionada a tensão', 'Silicone tópico; laser; revisão cirúrgica ≥ 12 meses'],
          ['Assimetria / scar assimetria', 'Relacionada a assimetria de quadril', 'Atenção à assimetria pré-op; sutura cruzada de verificação'],
          ['Distopia umbilical', 'Por tração assimétrica', 'Não ancorar umbigo à fáscia; verificar midline com sutura de referência'],
        ]
      ),
      b.p(''),

      b.h2('7.1 Seroma — Detalhamento'),
      b.p(['É a complicação local mais frequente após abdominoplastia. Formado por acúmulo de linfa e líquido seroso no espaço morto da descolagem. Fatores de risco: área ampla de descolagem, ausência de quiltagem, obesidade, lipoaspiração concomitante. Estratégias de prevenção com evidência: (1) preservação da fáscia de Scarpa — mantém linfáticos subdérmicos; (2) suturas de quiltagem progressivas (Pollock & Pollock) — eliminam espaço morto, permitem abdominoplastia sem drenos; (3) drenos de aspiração contínua; (4) cola de fibrina ou TissuGlu (menos evidência consistente). Seroma em lipoabdominoplastia é comparável ou menor ao da abdominoplastia tradicional.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      b.h2('7.2 TEV — Detalhamento'),
      b.p(['A abdominoplastia é o procedimento estético com maior risco de TEV (dados CosmetAssure, NSQUIP). Riscos adicionais: cirurgias combinadas, plicatura apertada aumenta pressão intraabdominal (monitorar pressão de fechamento), contraceptivos hormonais (anel vaginal aumenta risco — suspender pré-op), viagem aérea próxima à cirurgia. O próprio procedimento ativa a cascata de coagulação (estudos demonstram aumento de D-dímero e fibrinogênio após abdominoplasty contorno abdominal). Estratificação rigorosa pelo Caprini é mandatória.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      b.h2('7.3 Necrose/Isquemia — Triângulo Terrível'),
      b.p(['O ponto de convergência das forças de tensão no fechamento é a linha média ao nível da incisão, denominado "triângulo terrível do abdome" ou "triângulo de isquemia". Nessa região, o retalho está mais distante dos perfuradores laterais e sujeito à maior tensão. Fatores de risco para necrose: tabagismo (contraindicação absoluta), obesidade, tensão excessiva no fechamento, lipoaspiração central excessiva (compromete descolagem descontínua), suprimento vascular limítrofe. Tratamento: desbridamento conservador, cicatrização por 2ª intenção ou enxerto em casos extensos.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      // ── Seção 8 ──────────────────────────────────────────────────────────
      b.h1('8. Pós-Operatório e Reabilitação'),
      b.p(['Deambulação precoce no dia da cirurgia, em posição inclinada (como usando andador), progressivamente erguendo o tronco nos dias seguintes. Posição de cadeira de praia mantida por 3–5 dias. Restrição de atividade por 2 semanas (sem atividade física além de caminhada). Cintas compressivas: tempo integral por 4–6 semanas, depois parcial por mais 2–4 meses. Massagem de cicatriz: iniciar a partir de 4 semanas. Atividade física progressiva: permitida após 1 mês; retorno completo em 1–2 meses. Drenos retirados quando débito < 30 mL/dia e líquido seroso.', b.ref('Grabb & Smith, 2024, cap. 75; Neligan, 2023, vol. 2, cap. 27')]),
      b.p(['Protocolo de analgesia multimodal ERAS: Tylenol (paracetamol) pré-operatório + gabapentina pré-op. Lidocaína na solução superwet. Exparel/bupivacaína no plano fascial. Catéteres de analgesia no plano da parede abdominal (opcional). Objetivo: reduzir uso de opioides e facilitar deambulação precoce.', b.ref('Grabb & Smith, 2024, cap. 75')]),
      b.p(['Retorno ao trabalho (escritório): tipicamente 2 semanas. Para cirurgias com belt lipectomy: repouso prolongado; internação hospitalar com monitorização necessária para grandes casos.', b.ref('Grabb & Smith, 2024, cap. 75')]),

      // ── Seção 9 ──────────────────────────────────────────────────────────
      b.h1('9. Procedimentos Combinados'),
      b.p(['Mais de 50% das abdominoplastias são realizadas em conjunto com outros procedimentos estéticos (lipoaspiração, cirurgia mamária, facial). O conjunto de abdominoplastia + mamoplastia é coloquialmente denominado "Mommy Makeover" (feminino) ou "Daddy Do-Over" (masculino). Cirurgias combinadas aumentam o risco de complicações, incluindo TEV, e devem ser realizadas com considerações específicas: limite de tempo operatório < 4 horas; ambiente peri-operatório apropriado; equipe de anestesia experiente.', b.ref('Neligan, 2023, vol. 2, cap. 27')]),
      b.p(['A abdominoplastia pode ser combinada com: histerectomia, correção de hérnia abdominal (preferencialmente com tela — atenção para não comprometer o suprimento do retalho pela colocação da tela), cirurgia de mama (mastopexia, aumento, redução), lipoaspiração circunferencial 360° (flancos, costas, sacral, coxas laterais — desde que dentro da margem de segurança de perda sanguínea e reposição hídrica). Lipoaspiração abdominal simultânea é segura quando realizada com a técnica de V invertido (lipoabdominoplastia), mas não com descolagem ampla tradicional (risco de necrose).', b.ref('Neligan, 2023, vol. 2, cap. 27')]),

      s.green(
        'Dica prática — Assimetria de Quadril e Umbigo',
        [
          'Estudos demonstram que percentual consistentemente alto de pacientes candidatos à abdominoplastia tem umbigo não-central e assimetria de quadril.',
          'A assimetria de quadril pode levar à sensação de cicatriz assimétrica ou de gordura residual maior de um lado.',
          'Protocolo: usar sutura de seda longa na linha média (xifóide–pubis), sobrepor os pontos da incisão superior e inferior para confirmar simetria bilateral antes de incisão. Exteriorizar o umbigo com referência na sutura de linha média sobre a comissura vulvar.',
        ],
        'Neligan, 2023, vol. 2, cap. 27 — Matarasso'
      ),

      s.green(
        'Dica prática — Botão Ocular Umbilical',
        [
          'Um conformador ocular de plástico é suturado ao coto umbilical imediatamente após liberação do umbigo.',
          'Permanece no campo durante toda a cirurgia até o momento da umbilicoplastia.',
          'Permite identificação precisa da posição do umbigo por palpação através da pele, mesmo com a ferida em grande parte fechada.',
          'Facilita a exteriorização umbilical na posição midline correta.',
        ],
        'Neligan, 2023, vol. 2, cap. 27 — Matarasso'
      ),

      s.green(
        'Dica prática — Pre-excisão (Técnica de Planas-Matarasso)',
        [
          'A incisão superior é realizada ANTES da incisão inferior, removendo o umbigo com o pannus.',
          'Benefícios: o cirurgião não eleva um retalho que será descartado; menor sangramento; preservação de calor corporal; cria plano natural de dissecção ascendente em V invertido.',
          'A viabilidade do fechamento é conferida intraoperatoriamente sobrepondo sutura de seda superior e inferior antes de qualquer incisão — se as bordas não se tocam, ajustar a incisão inferior.',
        ],
        'Neligan, 2023, vol. 2, cap. 27 — Matarasso'
      ),

      // ── Referências ───────────────────────────────────────────────────────
      b.h1('Referências-Base'),
      b.p("Neligan PC (Ed.). Plastic Surgery, 5ª Ed. Elsevier, 2023. Vol. 2, Cap. 27 — Abdominoplasty (Alan Matarasso)."),
      b.p("Colwell AS. Liposuction, Abdominoplasty, and Belt Lipectomy. In: Grotting JC, Rubin JP (Eds.). Grabb & Smith's Plastic Surgery, 9ª Ed. Wolters Kluwer, 2024. Cap. 75."),

      b.h1('Atualizações Incorporadas — v1.0 (2026-03-29)'),
      b.p('Versão inicial baseada exclusivamente nos livros-texto primários. Artigos PRS/ASJ a serem incorporados em versão futura após varredura temática.'),
    ],
  },
};

// ─── Builder API (facilita escrita do conteúdo acima) ────────────────────────

function makeBuilder(shapes) {
  return {
    h1: heading1,
    h2: heading2,
    h3: heading3,
    p: (content) => {
      if (typeof content === 'string') return para(content);
      if (Array.isArray(content)) {
        const kids = content.map(c => typeof c === 'string' ? txt(c) : c);
        return para(kids);
      }
      return para(content);
    },
    ref: citation,
    table: dataTable,
  };
}

function makeShapes() {
  return {
    blue:       (title, lines, cite) => box('blue',   title, lines, cite),
    red:        (title, lines, cite) => box('red',    title, lines, cite),
    green:      (title, lines, cite) => box('green',  title, lines, cite),
    flashcards: (rows)               => flashcardTable(rows),
    dataTable:  (headers, rows)      => dataTable(headers, rows),
  };
}

// ─── Gerador principal ────────────────────────────────────────────────────────

async function generateDoc(key) {
  const docDef = DOCS[key];
  if (!docDef) {
    console.error(`Tópico desconhecido: "${key}". Opções: ${Object.keys(DOCS).join(', ')}`);
    process.exit(1);
  }

  const b = makeBuilder();
  const s = makeShapes();
  const cover  = coverPage(docDef.title, docDef.version, docDef.date, docDef.history);
  const body   = docDef.body(b, s);

  // Intercalar spacer entre elementos consecutivos de tabela
  const bodyWithSpacers = [];
  body.forEach((el, i) => {
    bodyWithSpacers.push(el);
    const next = body[i + 1];
    if (next && el instanceof Table && !(next instanceof Paragraph)) {
      bodyWithSpacers.push(spacer());
    }
  });

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          run: { bold: true, size: 28, color: '1F3864' },
          paragraph: { spacing: { before: 400, after: 120 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          run: { bold: true, size: 24, color: '2E75B6' },
          paragraph: { spacing: { before: 280, after: 80 } },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          run: { bold: true, size: 22, color: '2E74B5' },
          paragraph: { spacing: { before: 200, after: 60 } },
        },
      ],
    },
    sections: [{
      children: [...cover, ...bodyWithSpacers],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(OUTDIR, docDef.filename);
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ Gerado: ${outPath}`);
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const args  = process.argv.slice(2);
  const tIdx  = args.indexOf('--topic');
  const topic = tIdx >= 0 ? args[tIdx + 1] : null;

  if (!topic) {
    console.error('Uso: node tools/create_docx.js --topic <rinoplastia|blefaroplastia|ritidoplastia|otoplastia|abdominoplastia|todos>');
    process.exit(1);
  }

  if (topic === 'todos') {
    for (const key of Object.keys(DOCS)) {
      await generateDoc(key);
    }
  } else {
    await generateDoc(topic);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
