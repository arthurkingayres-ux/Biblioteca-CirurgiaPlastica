#!/usr/bin/env python3
"""
generate_diagrams.py
Gera diagramas esquemáticos (algoritmos, fluxogramas) para os documentos de estudo.
Usa matplotlib para criar PNGs limpos e profissionais.
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np
import os

ASSETS = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images')
DPI = 200


def save(fig, tema, name):
    path = os.path.join(ASSETS, tema, name)
    fig.savefig(path, dpi=DPI, bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close(fig)
    size_kb = os.path.getsize(path) // 1024
    print(f"  [{tema}] {name} ({size_kb}KB)")


def draw_box(ax, x, y, w, h, text, color='#2196F3', text_color='white', fontsize=9, rounded=True):
    """Draw a rounded box with centered text."""
    box = FancyBboxPatch((x - w/2, y - h/2), w, h,
                         boxstyle="round,pad=0.05" if rounded else "square,pad=0",
                         facecolor=color, edgecolor='#333333', linewidth=1.2)
    ax.add_patch(box)
    ax.text(x, y, text, ha='center', va='center', fontsize=fontsize,
            color=text_color, fontweight='bold', wrap=True,
            fontfamily='sans-serif')


def draw_diamond(ax, x, y, w, h, text, color='#FF9800', fontsize=8):
    """Draw a diamond (decision) shape."""
    diamond = plt.Polygon([(x, y+h/2), (x+w/2, y), (x, y-h/2), (x-w/2, y)],
                          facecolor=color, edgecolor='#333333', linewidth=1.2)
    ax.add_patch(diamond)
    ax.text(x, y, text, ha='center', va='center', fontsize=fontsize,
            color='white', fontweight='bold', fontfamily='sans-serif')


def draw_arrow(ax, x1, y1, x2, y2, label=None, color='#555555'):
    """Draw arrow between points with optional label."""
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=color, lw=1.5))
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx + 0.15, my, label, fontsize=7, color='#333333',
                fontfamily='sans-serif', fontstyle='italic')


# ============================================================
# RINOPLASTIA DIAGRAMS
# ============================================================

def rinoplastia_algoritmo_abordagem():
    """Algoritmo de seleção: abordagem aberta vs fechada."""
    fig, ax = plt.subplots(figsize=(10, 12))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 14)
    ax.axis('off')
    ax.set_title('Algoritmo de Seleção de Abordagem\nRinoplastia Aberta vs. Fechada',
                 fontsize=14, fontweight='bold', pad=20, fontfamily='sans-serif')

    # Start
    draw_box(ax, 5, 13, 4, 0.7, 'AVALIAÇÃO PRÉ-OPERATÓRIA', '#1565C0')

    draw_arrow(ax, 5, 12.65, 5, 12.1)
    draw_diamond(ax, 5, 11.5, 4.5, 1.1, 'Deformidade complexa?\n(assimetria, revisão, ponta)')

    # Left: Sim (aberta)
    draw_arrow(ax, 2.75, 11.5, 1.8, 11.5, 'Sim')
    draw_box(ax, 1.8, 10.3, 3, 0.7, 'ABORDAGEM ABERTA', '#C62828')

    draw_arrow(ax, 1.8, 9.95, 1.8, 9.4)
    draw_box(ax, 1.8, 9, 3.2, 0.6, 'Incisão transcolumelar\n+ marginal bilateral', '#E53935', fontsize=8)

    draw_arrow(ax, 1.8, 8.7, 1.8, 8.1)
    draw_box(ax, 1.8, 7.7, 3.2, 0.6, 'Exposição ampla\ndo arcabouço', '#EF5350', fontsize=8)

    # Indications box
    ind_text = ('Indicações:\n'
                '• Rinoplastia secundária\n'
                '• Deformidade de ponta complexa\n'
                '• Assimetria significativa\n'
                '• Necessidade de enxertos\n'
                '  múltiplos\n'
                '• Curva de aprendizado\n'
                '  (ensino cirúrgico)')
    ax.text(1.8, 6.2, ind_text, ha='center', va='center', fontsize=7.5,
            fontfamily='sans-serif', color='#333333',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#FFCDD2', edgecolor='#C62828', alpha=0.9))

    # Right: Não (pode ser fechada)
    draw_arrow(ax, 7.25, 11.5, 8.2, 11.5, 'Não')
    draw_diamond(ax, 8.2, 10.3, 4.2, 1.1, 'Cirurgião experiente\nem técnica fechada?')

    # Sim -> fechada
    draw_arrow(ax, 8.2, 9.75, 8.2, 9.2, 'Sim')
    draw_box(ax, 8.2, 8.8, 3, 0.7, 'ABORDAGEM FECHADA', '#2E7D32')

    draw_arrow(ax, 8.2, 8.45, 8.2, 7.9)
    draw_box(ax, 8.2, 7.5, 3.2, 0.6, 'Incisões endonasais\n(intercartilaginosa/marginal)', '#43A047', fontsize=8)

    draw_arrow(ax, 8.2, 7.2, 8.2, 6.6)
    draw_box(ax, 8.2, 6.2, 3.2, 0.6, 'Sem cicatriz externa\nMenos edema', '#66BB6A', fontsize=8)

    # Indications box
    ind_text2 = ('Indicações:\n'
                 '• Dorso isolado\n'
                 '• Giba simples\n'
                 '• Osteotomias isoladas\n'
                 '• Ponta com deformidade\n'
                 '  leve/simétrica\n'
                 '• Redução simples')
    ax.text(8.2, 4.7, ind_text2, ha='center', va='center', fontsize=7.5,
            fontfamily='sans-serif', color='#333333',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#C8E6C9', edgecolor='#2E7D32', alpha=0.9))

    # Não -> aberta também
    draw_arrow(ax, 6.1, 10.3, 4, 10.3, 'Não')
    draw_arrow(ax, 4, 10.3, 3.3, 10.3)

    # Bottom note
    ax.text(5, 2.8, 'A tendência moderna favorece a abordagem aberta para a maioria\n'
            'dos casos de rinoplastia primária, pela visualização superior\n'
            'e capacidade diagnóstica intraoperatória.',
            ha='center', va='center', fontsize=8, fontstyle='italic', color='#555555',
            fontfamily='sans-serif',
            bbox=dict(boxstyle='round,pad=0.5', facecolor='#E3F2FD', edgecolor='#90CAF9'))

    ax.text(5, 1.5, 'Adaptado de: Rohrich RJ, Afrooz PN. Neligan\'s Plastic Surgery, 5ª Ed., 2023, Cap. 18-19',
            ha='center', va='center', fontsize=6.5, fontstyle='italic', color='#999999',
            fontfamily='sans-serif')

    save(fig, 'rinoplastia', 'algoritmo-abordagem-aberta-fechada.png')


def rinoplastia_angulos_nasais():
    """Diagrama dos ângulos nasais e valores normais."""
    fig, ax = plt.subplots(figsize=(10, 8))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 8)
    ax.axis('off')
    ax.set_title('Ângulos Nasais — Valores de Referência',
                 fontsize=14, fontweight='bold', pad=15, fontfamily='sans-serif')

    # Create a table-like layout with colored boxes
    angles = [
        ('Ângulo Nasofrontal', '115–130°', 'Junção raiz/glabela', '#1565C0'),
        ('Ângulo Nasolabial', '♀ 95–110°\n♂ 90–95°', 'Columela/lábio superior', '#2E7D32'),
        ('Ângulo de Rotação da Ponta', '♀ 95–110°\n♂ 90–95°', 'Eixo longo nariz/Frankfurt', '#E65100'),
        ('Projeção de Ponta (Goode)', '0.55–0.60', 'Relação ponta:dorso nasal', '#6A1B9A'),
        ('Ângulo Nasomental', '120–132°', 'Dorso nasal/mento', '#00695C'),
        ('Ângulo Nasofacial', '30–40°', 'Dorso nasal/plano facial', '#AD1457'),
    ]

    y_start = 6.8
    for i, (name, value, desc, color) in enumerate(angles):
        y = y_start - i * 1.05
        # Name box
        box = FancyBboxPatch((0.3, y - 0.35), 3.2, 0.7,
                             boxstyle="round,pad=0.05",
                             facecolor=color, edgecolor='#333333', linewidth=1)
        ax.add_patch(box)
        ax.text(1.9, y, name, ha='center', va='center', fontsize=9,
                color='white', fontweight='bold', fontfamily='sans-serif')

        # Value box
        box2 = FancyBboxPatch((3.8, y - 0.35), 1.8, 0.7,
                              boxstyle="round,pad=0.05",
                              facecolor='#FFF9C4', edgecolor=color, linewidth=1.5)
        ax.add_patch(box2)
        ax.text(4.7, y, value, ha='center', va='center', fontsize=10,
                color='#333333', fontweight='bold', fontfamily='sans-serif')

        # Description
        ax.text(6.0, y, desc, ha='left', va='center', fontsize=8,
                color='#555555', fontfamily='sans-serif')

    # Add note
    ax.text(5, 0.5, 'Valores de referência para caucasianos. Variação étnica significativa.\n'
            'Fonte: Rohrich RJ, Afrooz PN. Neligan\'s Plastic Surgery, 5ª Ed., 2023, Cap. 18',
            ha='center', va='center', fontsize=7, fontstyle='italic', color='#999999',
            fontfamily='sans-serif')

    save(fig, 'rinoplastia', 'diagrama-angulos-nasais.png')


def rinoplastia_tipos_enxertos():
    """Diagrama dos tipos de enxertos em rinoplastia."""
    fig, ax = plt.subplots(figsize=(11, 9))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 10)
    ax.axis('off')
    ax.set_title('Tipos de Enxertos em Rinoplastia',
                 fontsize=14, fontweight='bold', pad=15, fontfamily='sans-serif')

    # Title box
    draw_box(ax, 5.5, 9.2, 5, 0.7, 'SÍTIOS DOADORES DE CARTILAGEM', '#1565C0')

    # Three donor sites
    draw_arrow(ax, 3.5, 8.85, 2, 8.3)
    draw_arrow(ax, 5.5, 8.85, 5.5, 8.3)
    draw_arrow(ax, 7.5, 8.85, 9, 8.3)

    draw_box(ax, 2, 8, 2.5, 0.5, 'Septo Nasal\n(1ª escolha)', '#42A5F5', fontsize=8)
    draw_box(ax, 5.5, 8, 2.5, 0.5, 'Cartilagem Auricular\n(concha)', '#42A5F5', fontsize=8)
    draw_box(ax, 9, 8, 2.5, 0.5, 'Cartilagem Costal\n(revisão/asiáticos)', '#42A5F5', fontsize=8)

    # Graft types
    grafts = [
        (1.5, 6.5, 'Spreader Grafts', '#2E7D32',
         ['Alargam válvula nasal interna', 'Corrigem dorso em V invertido',
          'Retilíneos, 2-4mm largura', 'Posição: entre septo e CLS']),
        (5.5, 6.5, 'Shield Graft / Cap Graft', '#E65100',
         ['Definem ponta nasal', 'Shield: triangular, suturado na cúpula',
          'Cap: sobre domos, projeção', 'Coberto por enxerto de fáscia/pericôndrio']),
        (9.5, 6.5, 'Columellar Strut', '#6A1B9A',
         ['Suporte e projeção da ponta', 'Fixo: ancorado no septo (ENS)',
          'Flutuante: entre cruras mediais', 'Estabiliza tripé nasal']),
        (1.5, 3.5, 'Alar Contour Grafts', '#00695C',
         ['Reforçam asa nasal', 'Previnem colapso valvular',
          'Posição: bolso supraperidondrial', 'Espessura: 1-2mm']),
        (5.5, 3.5, 'Alar Batten Grafts', '#AD1457',
         ['Suporte da válvula externa', 'Enxerto lateral à crura lateral',
          'Cartilagem curva (concha ideal)', 'Corrigem retração/colapso alar']),
        (9.5, 3.5, 'Onlay Grafts (Dorso)', '#795548',
         ['Corrigem irregularidades', 'Septal cartilage ou fascia',
          'Diced cartilage in fascia (DCF)', 'Camuflagem de dorso']),
    ]

    for x, y, title, color, lines in grafts:
        # Title
        box = FancyBboxPatch((x - 1.5, y - 0.15), 3, 0.55,
                             boxstyle="round,pad=0.05",
                             facecolor=color, edgecolor='#333333', linewidth=1)
        ax.add_patch(box)
        ax.text(x, y + 0.12, title, ha='center', va='center', fontsize=8.5,
                color='white', fontweight='bold', fontfamily='sans-serif')

        # Details
        for j, line in enumerate(lines):
            ax.text(x - 1.3, y - 0.55 - j * 0.35, f'• {line}',
                    ha='left', va='center', fontsize=7, color='#333333',
                    fontfamily='sans-serif')

    ax.text(5.5, 0.5, 'Fonte: Rohrich RJ, Afrooz PN. Neligan\'s Plastic Surgery, 5ª Ed., 2023, Cap. 19',
            ha='center', va='center', fontsize=7, fontstyle='italic', color='#999999',
            fontfamily='sans-serif')

    save(fig, 'rinoplastia', 'diagrama-tipos-enxertos.png')


def rinoplastia_algoritmo_osteotomias():
    """Algoritmo de osteotomias."""
    fig, ax = plt.subplots(figsize=(10, 10))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 11)
    ax.axis('off')
    ax.set_title('Algoritmo de Osteotomias em Rinoplastia',
                 fontsize=14, fontweight='bold', pad=15, fontfamily='sans-serif')

    # Start
    draw_box(ax, 5, 10.2, 5, 0.65, 'INDICAÇÕES PARA OSTEOTOMIA', '#1565C0')

    draw_arrow(ax, 5, 9.87, 5, 9.3)
    draw_diamond(ax, 5, 8.8, 5, 1, 'Tipo de deformidade?')

    # Left: Base larga
    draw_arrow(ax, 2.5, 8.8, 1.5, 8.8, 'Base\nlarga')
    draw_box(ax, 1.5, 7.7, 2.5, 0.6, 'Osteotomia Lateral', '#C62828')
    ax.text(1.5, 7.0, '• Low-to-low: estreita base\n• Low-to-high: preserva raiz\n• Percut./endonasal',
            ha='center', va='center', fontsize=7, fontfamily='sans-serif', color='#333333',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#FFCDD2', edgecolor='#C62828', alpha=0.8))

    # Center: Dorso assimétrico
    draw_arrow(ax, 5, 8.3, 5, 7.7)
    draw_box(ax, 5, 7.4, 2.8, 0.6, 'Osteotomia Medial\n(+ Lateral)', '#E65100')
    ax.text(5, 6.5, '• Medial oblíqua/transversa\n• Associada a lateral\n• Corrige desvio dorsal',
            ha='center', va='center', fontsize=7, fontfamily='sans-serif', color='#333333',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#FFE0B2', edgecolor='#E65100', alpha=0.8))

    # Right: Desvio/giba
    draw_arrow(ax, 7.5, 8.8, 8.5, 8.8, 'Teto\naberto')
    draw_box(ax, 8.5, 7.7, 2.5, 0.6, 'Osteotomia\nIntermédia/Transversa', '#2E7D32')
    ax.text(8.5, 7.0, '• Fecha teto aberto\n  após ressecção de giba\n• Complementa lateral',
            ha='center', va='center', fontsize=7, fontfamily='sans-serif', color='#333333',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#C8E6C9', edgecolor='#2E7D32', alpha=0.8))

    # Técnicas
    ax.text(5, 5.0, 'Técnicas de Osteotomia', ha='center', va='center',
            fontsize=11, fontweight='bold', color='#1565C0', fontfamily='sans-serif')

    techniques = [
        (2, 4.0, 'Percutânea', '#7B1FA2',
         '2mm osteótomo\nPontos separados\nMenor edema'),
        (5, 4.0, 'Endonasal Contínua', '#00695C',
         'Guarded osteotome\nTraço contínuo\nControle preciso'),
        (8, 4.0, 'Piezoeléctrica', '#AD1457',
         'Ultrassônica\nCorte ósseo seletivo\nPreserva tecidos moles'),
    ]

    for x, y, title, color, desc in techniques:
        box = FancyBboxPatch((x - 1.3, y - 0.3), 2.6, 0.6,
                             boxstyle="round,pad=0.05",
                             facecolor=color, edgecolor='#333333', linewidth=1)
        ax.add_patch(box)
        ax.text(x, y, title, ha='center', va='center', fontsize=8.5,
                color='white', fontweight='bold', fontfamily='sans-serif')
        ax.text(x, y - 0.9, desc, ha='center', va='center', fontsize=7,
                fontfamily='sans-serif', color='#333333',
                bbox=dict(boxstyle='round,pad=0.25', facecolor='#F5F5F5', edgecolor='#BDBDBD'))

    # Precauções
    ax.text(5, 1.5, '⚠ Precauções:\n'
            '• Preservar triângulo de Webster (transição osso-cartilagem)\n'
            '• Osteotomia percutânea com ponta em diamante reduz complicações\n'
            '• Green-stick fracture em jovens pode ser suficiente\n'
            '• Splint nasal externo por 7 dias pós-osteotomia',
            ha='center', va='center', fontsize=7.5, fontfamily='sans-serif', color='#333333',
            bbox=dict(boxstyle='round,pad=0.5', facecolor='#FFF3E0', edgecolor='#FF9800'))

    ax.text(5, 0.3, 'Fonte: Rohrich RJ, Afrooz PN. Neligan\'s Plastic Surgery, 5ª Ed., 2023, Cap. 19; Constantian MB, Cap. 20',
            ha='center', va='center', fontsize=6.5, fontstyle='italic', color='#999999',
            fontfamily='sans-serif')

    save(fig, 'rinoplastia', 'algoritmo-osteotomias.png')


# ============================================================
# BLEFAROPLASTIA DIAGRAMS
# ============================================================

def blefaroplastia_algoritmo_diagnostico():
    """Algoritmo diagnóstico: ptose vs dermatocalase vs pseudoptose."""
    fig, ax = plt.subplots(figsize=(11, 13))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 14)
    ax.axis('off')
    ax.set_title('Algoritmo Diagnóstico\nPálpebra Pesada: Ptose vs. Dermatocalase vs. Pseudoptose',
                 fontsize=13, fontweight='bold', pad=15, fontfamily='sans-serif')

    # Start
    draw_box(ax, 5.5, 13.2, 5.5, 0.65, 'PACIENTE COM QUEIXA DE PÁLPEBRA PESADA', '#1565C0')

    draw_arrow(ax, 5.5, 12.87, 5.5, 12.3)
    draw_box(ax, 5.5, 12, 6, 0.5, 'Avaliação: acuidade visual, campo visual, MRD1, MRD2, Schirmer, snap-back',
             '#42A5F5', fontsize=7.5)

    draw_arrow(ax, 5.5, 11.75, 5.5, 11.2)
    draw_diamond(ax, 5.5, 10.7, 5, 1, 'MRD1 < 2mm?\n(distância margem-reflexo)')

    # SIM = PTOSE
    draw_arrow(ax, 3, 10.7, 1.8, 10.7, 'Sim')
    draw_box(ax, 1.8, 9.7, 2.8, 0.6, 'PTOSE PALPEBRAL', '#C62828')

    draw_arrow(ax, 1.8, 9.4, 1.8, 8.8)
    draw_diamond(ax, 1.8, 8.3, 3, 0.9, 'Função do\nelevador?')

    draw_arrow(ax, 0.3, 8.3, 0.3, 7.5, 'Boa\n(>10mm)')
    ax.annotate('', xy=(0.3, 8.3), xytext=(1.8, 8.75),
                arrowprops=dict(arrowstyle='-', color='#555555', lw=1.2))
    draw_box(ax, 1.0, 7.0, 2, 0.6, 'Avanço/\nplicatura\naponeurose', '#E53935', fontsize=7)

    draw_arrow(ax, 3.3, 8.3, 3.3, 7.5, 'Ruim\n(<4mm)')
    ax.annotate('', xy=(3.3, 8.3), xytext=(1.8, 7.85),
                arrowprops=dict(arrowstyle='-', color='#555555', lw=1.2))
    draw_box(ax, 3.3, 7.0, 2, 0.6, 'Suspensão\nfrontal\n(sling)', '#E53935', fontsize=7)

    # NÃO = sem ptose
    draw_arrow(ax, 8, 10.7, 9.2, 10.7, 'Não')
    draw_diamond(ax, 9.2, 9.7, 3.5, 1, 'Excesso de pele\nultrapassando\nbordo ciliar?')

    # SIM = dermatocalase
    draw_arrow(ax, 9.2, 9.2, 9.2, 8.5, 'Sim')
    draw_box(ax, 9.2, 8.1, 3, 0.6, 'DERMATOCALASE', '#2E7D32')

    draw_arrow(ax, 9.2, 7.8, 9.2, 7.2)
    draw_box(ax, 9.2, 6.8, 3, 0.6, 'Blefaroplastia Superior\n(excisão cutânea)', '#43A047', fontsize=8)

    # NÃO dermatocalase
    draw_arrow(ax, 7.45, 9.7, 6, 9.7, 'Não')
    draw_diamond(ax, 6, 8.7, 3.5, 1, 'Sobrancelha\nabaixo do rebordo\norbitário?')

    # Sim = pseudoptose
    draw_arrow(ax, 6, 8.2, 6, 7.5, 'Sim')
    draw_box(ax, 6, 7.1, 3, 0.6, 'PSEUDOBLEFAROPTOSE\n(ptose de sobrancelha)', '#E65100', fontsize=8)

    draw_arrow(ax, 6, 6.8, 6, 6.2)
    draw_box(ax, 6, 5.8, 3, 0.6, 'Lifting de sobrancelha\n(endoscópico/coronal/direto)', '#F57C00', fontsize=8)

    # Não
    draw_arrow(ax, 4.25, 8.7, 3.2, 8.7, 'Não')
    draw_box(ax, 3.2, 8.1, 2.5, 0.6, 'Avaliar\ncausas mistas\ne combinar', '#795548', fontsize=7.5)

    # Important note
    ax.text(5.5, 4.5, '⚠ Pontos-chave do exame pré-operatório:', ha='center', va='center',
            fontsize=10, fontweight='bold', color='#1565C0', fontfamily='sans-serif')

    points = [
        'MRD1 (margem palpebral → reflexo pupilar): normal ≥ 4mm; ptose se < 2mm',
        'Função do elevador: excursão palpebral (normal > 12mm)',
        'Teste de Schirmer: olho seco se < 5mm em 5 min → risco de sintomas pós-op',
        'Snap-back test: frouxidão palpebral inferior (se lento → considerar cantopexia)',
        'Vetor orbitário: negativo → risco de ectrópio (exige cantopexia obrigatória)',
        'Distância supratarsal: sulco palpebral (normal: ♀ 8-10mm, ♂ 7-8mm)',
        'Campo visual com e sem elevação manual do excesso → documenta indicação funcional',
    ]

    for i, p in enumerate(points):
        ax.text(1, 3.8 - i * 0.45, f'• {p}', ha='left', va='center', fontsize=7,
                fontfamily='sans-serif', color='#333333')

    ax.text(5.5, 0.5, 'Fonte: Nahai F. Neligan\'s Plastic Surgery, 5ª Ed., 2023, Cap. 13-14',
            ha='center', va='center', fontsize=6.5, fontstyle='italic', color='#999999',
            fontfamily='sans-serif')

    save(fig, 'blefaroplastia', 'algoritmo-diagnostico-palpebra-pesada.png')


def blefaroplastia_camadas_palpebrais():
    """Diagrama das camadas palpebrais (corte esquemático)."""
    fig, ax = plt.subplots(figsize=(10, 8))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 9)
    ax.axis('off')
    ax.set_title('Camadas da Pálpebra — Conceito de Lamelas',
                 fontsize=14, fontweight='bold', pad=15, fontfamily='sans-serif')

    # Lamella anterior
    layers = [
        (7.5, 'LAMELA ANTERIOR', '#1565C0', [
            ('Pele', '#90CAF9', 'Pele mais fina do corpo (< 1mm)'),
            ('M. Orbicular', '#42A5F5', 'Protractor; preseptal + pretarsal + orbital'),
        ]),
        (5.0, 'LAMELA POSTERIOR', '#C62828', [
            ('Septo Orbital', '#EF9A9A', 'Barreira anatômica (retém gordura orbital)'),
            ('Gordura Orbital', '#FFCC80', 'Superior: 2 compartimentos (medial, central);\nInferior: 3 (medial, central, lateral)'),
            ('Aponeurose do Elevador', '#CE93D8', 'Insere no tarso; deiscência → ptose'),
            ('M. de Müller', '#BA68C8', 'Simpático; excursão 2mm; teste fenilefrina'),
            ('Tarso', '#EF5350', 'Superior: 10mm; Inferior: 4mm (esqueleto palpebral)'),
            ('Conjuntiva', '#E57373', 'Mucosa; superfície ocular posterior'),
        ]),
    ]

    y = 7.8
    for section_y_offset, section_title, section_color, items in layers:
        # Section header
        box = FancyBboxPatch((0.3, y - 0.3), 9.4, 0.6,
                             boxstyle="round,pad=0.05",
                             facecolor=section_color, edgecolor='#333333', linewidth=1.5)
        ax.add_patch(box)
        ax.text(5, y, section_title, ha='center', va='center', fontsize=11,
                color='white', fontweight='bold', fontfamily='sans-serif')
        y -= 0.7

        for name, color, desc in items:
            # Layer bar
            box = FancyBboxPatch((0.5, y - 0.25), 2.5, 0.5,
                                 boxstyle="round,pad=0.03",
                                 facecolor=color, edgecolor='#555555', linewidth=0.8)
            ax.add_patch(box)
            ax.text(1.75, y, name, ha='center', va='center', fontsize=8.5,
                    color='#333333', fontweight='bold', fontfamily='sans-serif')

            # Description
            ax.text(3.3, y, desc, ha='left', va='center', fontsize=7.5,
                    color='#333333', fontfamily='sans-serif')
            y -= 0.65

    # Important note
    ax.text(5, 1.1, 'A lamela anterior (pele + orbicular) é separada da lamela posterior\n'
            '(tarso + conjuntiva) pelo septo orbital — marco anatômico fundamental.\n'
            'A abordagem anterior (transcutânea) ou posterior (transconjuntival)\n'
            'define o acesso às estruturas profundas.',
            ha='center', va='center', fontsize=8, fontstyle='italic', color='#555555',
            fontfamily='sans-serif',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#F5F5F5', edgecolor='#BDBDBD'))

    ax.text(5, 0.2, 'Fonte: Nahai F. Neligan\'s Plastic Surgery, 5ª Ed., 2023, Cap. 13',
            ha='center', va='center', fontsize=6.5, fontstyle='italic', color='#999999',
            fontfamily='sans-serif')

    save(fig, 'blefaroplastia', 'diagrama-camadas-palpebrais.png')


def blefaroplastia_algoritmo_tecnica():
    """Algoritmo de escolha de técnica para blefaroplastia inferior."""
    fig, ax = plt.subplots(figsize=(11, 11))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 12)
    ax.axis('off')
    ax.set_title('Algoritmo de Técnica — Blefaroplastia Inferior',
                 fontsize=13, fontweight='bold', pad=15, fontfamily='sans-serif')

    # Start
    draw_box(ax, 5.5, 11.3, 5.5, 0.65, 'BLEFAROPLASTIA INFERIOR — ESCOLHA DE TÉCNICA', '#1565C0')

    draw_arrow(ax, 5.5, 10.97, 5.5, 10.4)
    draw_diamond(ax, 5.5, 9.8, 5, 1.1, 'Queixa principal?')

    # Left: bolsas de gordura
    draw_arrow(ax, 3, 9.8, 1.8, 9.8, 'Bolsas\nde gordura')
    draw_box(ax, 1.8, 8.8, 3, 0.7, 'TRANSCONJUNTIVAL\n(via posterior)', '#2E7D32')

    draw_arrow(ax, 1.8, 8.45, 1.8, 7.8)
    draw_diamond(ax, 1.8, 7.3, 3.5, 0.9, 'Sulco nasojugal\nprofundo?')

    draw_arrow(ax, 1.8, 6.85, 1.8, 6.2, 'Sim')
    draw_box(ax, 1.8, 5.8, 3, 0.6, 'Fat repositioning\n(transpor gordura ao sulco)', '#43A047', fontsize=8)

    draw_arrow(ax, 3.55, 7.3, 4.8, 7.3, 'Não')
    draw_box(ax, 4.8, 6.9, 2.2, 0.6, 'Fat removal\n(ressecção conservadora)', '#66BB6A', fontsize=8)

    # Right: excesso de pele
    draw_arrow(ax, 8, 9.8, 9.2, 9.8, 'Excesso\nde pele')
    draw_box(ax, 9.2, 8.8, 3, 0.7, 'TRANSCUTÂNEA\n(via anterior/skin-flap)', '#C62828')

    draw_arrow(ax, 9.2, 8.45, 9.2, 7.8)
    draw_diamond(ax, 9.2, 7.3, 3.5, 0.9, 'Snap-back test\nalterado?')

    draw_arrow(ax, 9.2, 6.85, 9.2, 6.2, 'Sim')
    draw_box(ax, 9.2, 5.8, 3, 0.6, 'ASSOCIAR CANTOPEXIA\n(obrigatória)', '#E53935', fontsize=8)

    draw_arrow(ax, 7.45, 7.3, 6.2, 7.3, 'Não')
    draw_box(ax, 6.2, 6.9, 2.2, 0.6, 'Pinch excision\n(ressecção mínima)', '#EF5350', fontsize=8)

    # Vetor orbitário
    ax.text(5.5, 4.8, 'Vetor Orbitário — Conceito Fundamental', ha='center', va='center',
            fontsize=11, fontweight='bold', color='#1565C0', fontfamily='sans-serif')

    vectors = [
        (2, 3.8, 'POSITIVO', '#2E7D32',
         'Malar proeminente\nrelativo ao globo\n→ Menor risco'),
        (5.5, 3.8, 'NEUTRO', '#E65100',
         'Malar no nível\ndo globo\n→ Risco moderado'),
        (9, 3.8, 'NEGATIVO', '#C62828',
         'Globo proeminente\nrelativo ao malar\n→ ALTO RISCO\nde ectrópio'),
    ]

    for x, y, title, color, desc in vectors:
        box = FancyBboxPatch((x - 1.3, y - 0.25), 2.6, 0.55,
                             boxstyle="round,pad=0.05",
                             facecolor=color, edgecolor='#333333', linewidth=1)
        ax.add_patch(box)
        ax.text(x, y, title, ha='center', va='center', fontsize=9,
                color='white', fontweight='bold', fontfamily='sans-serif')
        ax.text(x, y - 0.95, desc, ha='center', va='center', fontsize=7.5,
                fontfamily='sans-serif', color='#333333',
                bbox=dict(boxstyle='round,pad=0.25', facecolor='#F5F5F5', edgecolor='#BDBDBD'))

    # Warning
    ax.text(5.5, 1.5, '⚠ Vetor negativo = cantopexia obrigatória em QUALQUER técnica inferior\n'
            '⚠ Nunca ressecar pele em excesso — ectrópio é a complicação mais temida\n'
            '⚠ Transconjuntival é mais segura para pacientes com frouxidão palpebral leve',
            ha='center', va='center', fontsize=7.5, fontfamily='sans-serif', color='#333333',
            bbox=dict(boxstyle='round,pad=0.5', facecolor='#FFCDD2', edgecolor='#C62828'))

    ax.text(5.5, 0.4, 'Fonte: Nahai F. Neligan\'s Plastic Surgery, 5ª Ed., 2023, Cap. 13-14',
            ha='center', va='center', fontsize=6.5, fontstyle='italic', color='#999999',
            fontfamily='sans-serif')

    save(fig, 'blefaroplastia', 'algoritmo-tecnica-blefaroplastia-inferior.png')


def blefaroplastia_cantotomia_emergencia():
    """Passos da cantotomia lateral de emergência."""
    fig, ax = plt.subplots(figsize=(10, 10))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 11)
    ax.axis('off')
    ax.set_title('Cantotomia Lateral de Emergência\nSíndrome Compartimental Orbital',
                 fontsize=13, fontweight='bold', pad=15, fontfamily='sans-serif',
                 color='#C62828')

    # Warning box
    ax.text(5, 10.2, '⚠ EMERGÊNCIA CIRÚRGICA — Pressão intraorbital > 40mmHg\n'
            'Isquemia retiniana irreversível se > 90 minutos sem descompressão',
            ha='center', va='center', fontsize=8.5, fontweight='bold',
            fontfamily='sans-serif', color='#C62828',
            bbox=dict(boxstyle='round,pad=0.5', facecolor='#FFCDD2', edgecolor='#C62828', linewidth=2))

    # Steps
    steps = [
        ('1', 'RECONHECER', '#C62828',
         '• Dor intensa, proptose, tensão palpebral\n'
         '• Oftalmoplegia (perda de MOE)\n'
         '• Defeito pupilar aferente relativo (DPAR)\n'
         '• Pressão digital no globo: "duro como pedra"'),
        ('2', 'ANESTESIA LOCAL', '#E65100',
         '• Lidocaína 2% com epinefrina\n'
         '• Infiltrar canto lateral\n'
         '• Não atrasar para anestesia (vida > conforto)'),
        ('3', 'CANTOTOMIA', '#FF9800',
         '• Pinçar canto lateral com hemostática (crush)\n'
         '• Incisão horizontal do canto lateral\n'
         '  com tesoura (full-thickness, ~1-2cm)\n'
         '• Dividir pele + orbicular + cantus'),
        ('4', 'CANTÓLISE INFERIOR', '#2E7D32',
         '• Identificar ramo inferior do tendão cantal\n'
         '• Seccionar com tesoura iris, orientada\n'
         '  inferiormente contra rebordo orbital\n'
         '• Sentir "snap" de liberação\n'
         '• Confirmar: pálpebra inferior solta e móvel'),
        ('5', 'REAVALIAR', '#1565C0',
         '• Se pressão persiste: cantólise SUPERIOR\n'
         '• Monitorar acuidade visual, pupilas, MOE\n'
         '• TC de órbita (pós-estabilização)\n'
         '• Encaminhar oftalmologia'),
    ]

    y = 8.8
    for num, title, color, desc in steps:
        # Number circle
        circle = plt.Circle((0.7, y + 0.1), 0.35, facecolor=color, edgecolor='white', linewidth=2)
        ax.add_patch(circle)
        ax.text(0.7, y + 0.1, num, ha='center', va='center', fontsize=14,
                color='white', fontweight='bold', fontfamily='sans-serif')

        # Title
        ax.text(1.3, y + 0.1, title, ha='left', va='center', fontsize=10,
                color=color, fontweight='bold', fontfamily='sans-serif')

        # Description
        lines = desc.count('\n') + 1
        ax.text(1.3, y - 0.5, desc, ha='left', va='center', fontsize=7.5,
                fontfamily='sans-serif', color='#333333')

        y -= 1.7 + (lines - 3) * 0.15

    ax.text(5, 0.4, 'Fonte: Nahai F. Neligan\'s Plastic Surgery, 5ª Ed., 2023; ATLS guidelines',
            ha='center', va='center', fontsize=6.5, fontstyle='italic', color='#999999',
            fontfamily='sans-serif')

    save(fig, 'blefaroplastia', 'cantotomia-lateral-emergencia.png')


if __name__ == '__main__':
    print("Gerando diagramas esquemáticos...\n")

    print("=== RINOPLASTIA ===")
    rinoplastia_algoritmo_abordagem()
    rinoplastia_angulos_nasais()
    rinoplastia_tipos_enxertos()
    rinoplastia_algoritmo_osteotomias()

    print("\n=== BLEFAROPLASTIA ===")
    blefaroplastia_algoritmo_diagnostico()
    blefaroplastia_camadas_palpebrais()
    blefaroplastia_algoritmo_tecnica()
    blefaroplastia_cantotomia_emergencia()

    print("\nDiagramas gerados com sucesso!")
