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


# ============================================================
# LIPOASPIRACAO
# ============================================================

def lipo_pmi():
    """PMI — Point of Maximum Indentation (silhueta feminina e masculina)."""
    fig, (axF, axM) = plt.subplots(1, 2, figsize=(9, 7))
    for ax, title, waist_y, curve_amp, label in [
        (axF, 'Silhueta feminina', 4.5, 0.85, 'PMI (cintura)'),
        (axM, 'Silhueta masculina', 4.3, 0.35, 'Linha paralumbar'),
    ]:
        ax.set_xlim(-2.5, 2.5)
        ax.set_ylim(0, 9)
        ax.set_aspect('equal')
        ax.axis('off')
        ax.set_title(title, fontsize=11, fontweight='bold', color='#333', pad=8)
        ys = np.linspace(1.2, 8, 300)
        xs_r = 1.0 + 0.25*np.sin((ys-1.2)/1.2) - curve_amp*np.exp(-((ys-waist_y)**2)/0.8)
        xs_l = -xs_r
        ax.plot(xs_r, ys, color='#333', lw=2)
        ax.plot(xs_l, ys, color='#333', lw=2)
        ax.plot([xs_l[0], xs_r[0]], [1.2, 1.2], color='#333', lw=2)
        head = plt.Circle((0, 8.5), 0.5, facecolor='#f5deb3', edgecolor='#333', lw=2)
        ax.add_patch(head)
        pmi_x = xs_r[np.argmin(xs_r)]
        pmi_y = ys[np.argmin(xs_r)]
        ax.plot(pmi_x, pmi_y, 'o', color='#e53935', markersize=14, zorder=5)
        ax.plot(-pmi_x, pmi_y, 'o', color='#e53935', markersize=14, zorder=5)
        ax.annotate(label, xy=(pmi_x, pmi_y), xytext=(2.3, pmi_y),
                    fontsize=9, color='#e53935', fontweight='bold',
                    arrowprops=dict(arrowstyle='->', color='#e53935', lw=1.2))
    fig.suptitle('PMI — Point of Maximum Indentation',
                 fontsize=13, fontweight='bold', color='#1e3a5f', y=0.96)
    fig.text(0.5, 0.02,
             'PMI ancora o desenho das marcações em lipoescultura (Hoyos & Millard, HDBS 2014, cap. 2)',
             ha='center', fontsize=7.5, fontstyle='italic', color='#777')
    save(fig, 'lipoaspiracao', 'lipo-anat-pmi.png')


def lipo_zonas_seguranca():
    """Mapa de zonas de segurança e perigo na lipoaspiração."""
    fig, ax = plt.subplots(figsize=(8.5, 10))
    ax.set_xlim(-3, 3)
    ax.set_ylim(0, 12)
    ax.set_aspect('equal')
    ax.axis('off')
    head = plt.Circle((0, 11), 0.55, facecolor='#f5deb3', edgecolor='#333', lw=2)
    ax.add_patch(head)
    body = FancyBboxPatch((-1.8, 2.2), 3.6, 8, boxstyle='round,pad=0.1',
                          facecolor='#f5deb3', edgecolor='#333', lw=2)
    ax.add_patch(body)
    for side in [-1, 1]:
        ax.add_patch(FancyBboxPatch((side*1.9-0.4, 1.0), 0.8, 1.4,
                     boxstyle='round,pad=0.05', facecolor='#f5deb3', edgecolor='#333', lw=2))
        ax.add_patch(FancyBboxPatch((side*2.2-0.35, 6.5), 0.7, 3.0,
                     boxstyle='round,pad=0.05', facecolor='#f5deb3', edgecolor='#333', lw=2))
    zonas = [
        (0, 10.3, 0.55, 0.35, 'Triângulo\nsubmentoniano', '#e53935', 'n. marginal mandíbula'),
        (-1.2, 2.7, 0.6, 0.45, 'Virilha', '#e53935', 'a./v. femoral'),
        (1.2, 2.7, 0.6, 0.45, 'Virilha', '#e53935', 'a./v. femoral'),
        (-1.0, 4.2, 0.7, 0.5, 'Face medial\nda coxa', '#ff9800', 'v. safena magna'),
        (1.0, 4.2, 0.7, 0.5, 'Face medial\nda coxa', '#ff9800', 'v. safena magna'),
        (0, 6.5, 1.2, 0.5, 'Abdome profundo', '#ff9800', 'perfuração visceral'),
    ]
    for x, y, w, h, label, color, _ in zonas:
        ax.add_patch(FancyBboxPatch((x-w/2, y-h/2), w, h,
                     boxstyle='round,pad=0.03', facecolor=color, edgecolor='white', lw=1.5, alpha=0.85))
        ax.text(x, y, label, ha='center', va='center', fontsize=7.5,
                color='white', fontweight='bold')
    legendas = [
        ('#e53935', 'Alto risco — estruturas neurovasculares críticas'),
        ('#ff9800', 'Risco moderado — manter cânula romba e plano correto'),
    ]
    for i, (color, text) in enumerate(legendas):
        y0 = 0.7 - i*0.35
        ax.add_patch(FancyBboxPatch((-2.7, y0-0.12), 0.3, 0.24,
                     boxstyle='square,pad=0', facecolor=color, edgecolor='none'))
        ax.text(-2.3, y0, text, fontsize=8, va='center', color='#333')
    ax.set_title('Zonas de Segurança e Perigo — Lipoaspiração',
                 fontsize=12, fontweight='bold', color='#1e3a5f', pad=10)
    ax.text(0, -0.5,
            'Manter cânula > 2 cm da borda mandibular; palpar pulso femoral; cânula romba em abdome',
            ha='center', fontsize=7.5, fontstyle='italic', color='#666')
    save(fig, 'lipoaspiracao', 'lipo-anat-zonas-seguranca.png')


def lipo_sfs_camadas():
    """Corte sagital do subcutâneo — modelo Lockwood-Markman."""
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 8)
    ax.axis('off')
    camadas = [
        (6.6, 7.0, 'Epiderme', '#8d6e63', '#fff'),
        (6.0, 6.3, 'Derme', '#a1887f', '#fff'),
        (4.5, 5.2, 'SAT — tecido adiposo superficial\n(lóbulos pequenos, septos verticais)', '#ffe082', '#333'),
        (0.25, 4.25, 'Fáscia membranosa\n(Scarpa / Camper / Colles)', '#fb8c00', '#fff'),
        (2.0, 3.1, 'DAT — tecido adiposo profundo\n(lóbulos grandes, septos horizontais)', '#fff59d', '#333'),
        (0.25, 2.1, 'Fáscia muscular (profunda)', '#6d4c41', '#fff'),
        (0.6, 1.55, 'Músculo', '#e57373', '#fff'),
    ]
    for h, y, label, color, txt_color in camadas:
        ax.add_patch(FancyBboxPatch((1.0, y-h/2), 8, h,
                     boxstyle='square,pad=0', facecolor=color, edgecolor='#333', lw=1.2))
        ax.text(5.0, y, label, ha='center', va='center', fontsize=9.5,
                color=txt_color, fontweight='bold')
    for yv, lab in [(5.2, 'retinacula\ncutis'), (3.1, 'septos\nfrouxos')]:
        ax.plot([1.4, 8.6], [yv, yv], color='#555', lw=0.6, linestyle=':', alpha=0.7)
    ax.annotate('alvo primário\nda SAL', xy=(8.5, 3.1), xytext=(9.7, 3.1),
                fontsize=8.5, color='#2e7d32', fontweight='bold', ha='left', va='center',
                arrowprops=dict(arrowstyle='->', color='#2e7d32', lw=1.3))
    ax.annotate('preservar\n(< 1 cm da derme)', xy=(8.5, 5.2), xytext=(9.7, 5.6),
                fontsize=8.5, color='#c62828', fontweight='bold', ha='left', va='center',
                arrowprops=dict(arrowstyle='->', color='#c62828', lw=1.3))
    ax.annotate('preservar\n(↓ seroma, ↓ ptose)', xy=(8.5, 4.25), xytext=(9.7, 4.4),
                fontsize=8.5, color='#1565c0', fontweight='bold', ha='left', va='center',
                arrowprops=dict(arrowstyle='->', color='#1565c0', lw=1.3))
    ax.set_title('Sistema Fascial Superficial — Modelo de Lockwood-Markman',
                 fontsize=12, fontweight='bold', color='#1e3a5f', pad=8)
    ax.text(5.0, 0.5,
            'Scarpa: abdome inferior  ·  Camper: coxa  ·  Colles: períneo',
            ha='center', fontsize=8.5, color='#555', fontstyle='italic')
    ax.text(5.0, 0.1,
            'Neligan vol. 2, cap. 24  ·  Grabb & Smith cap. 75',
            ha='center', fontsize=7, color='#999', fontstyle='italic')
    save(fig, 'lipoaspiracao', 'lipo-anat-sfs-camadas.png')


def lipo_zonas_aderencia():
    """5 zonas de aderência de Rohrich — glúteo e coxa posterior."""
    fig, ax = plt.subplots(figsize=(7, 10))
    ax.set_xlim(-2.5, 2.5)
    ax.set_ylim(0, 12)
    ax.set_aspect('equal')
    ax.axis('off')
    # Silhueta glúteo/coxa posterior (contorno simplificado)
    ax.add_patch(FancyBboxPatch((-1.7, 7.5), 3.4, 3.0, boxstyle='round,pad=0.15',
                 facecolor='#f5deb3', edgecolor='#333', lw=2))
    ax.add_patch(FancyBboxPatch((-1.4, 1.5), 1.2, 6.0, boxstyle='round,pad=0.1',
                 facecolor='#f5deb3', edgecolor='#333', lw=2))
    ax.add_patch(FancyBboxPatch((0.2, 1.5), 1.2, 6.0, boxstyle='round,pad=0.1',
                 facecolor='#f5deb3', edgecolor='#333', lw=2))
    ax.plot([-1.7, 1.7], [7.5, 7.5], color='#333', lw=1.5, linestyle='--', alpha=0.6)
    zonas = [
        (-1.95, 8.2, '1', 'Depressão glútea lateral\n(região trocantérica)'),
        (1.95, 8.2, '1', ''),
        (0, 7.4, '2', 'Sulco glúteo'),
        (-0.8, 2.3, '3', 'Terço distal posterior\nda coxa'),
        (0.8, 2.3, '3', ''),
        (-1.55, 5.0, '4', 'Medial da coxa'),
        (1.55, 5.0, '4', ''),
        (-2.0, 6.0, '5', 'Trato iliotibial\ninferolateral'),
        (2.0, 6.0, '5', ''),
    ]
    for x, y, num, label in zonas:
        circle = plt.Circle((x, y), 0.3, facecolor='#c62828', edgecolor='white', lw=1.5, zorder=5)
        ax.add_patch(circle)
        ax.text(x, y, num, ha='center', va='center', fontsize=11,
                color='white', fontweight='bold', zorder=6)
    # Legenda lateral
    legendas = [
        ('1', 'Depressão glútea lateral (trocantérica)'),
        ('2', 'Sulco glúteo'),
        ('3', 'Terço distal posterior da coxa'),
        ('4', 'Face medial da coxa'),
        ('5', 'Trato iliotibial inferolateral'),
    ]
    for i, (num, label) in enumerate(legendas):
        y0 = 1.2 - i*0.25
        ax.add_patch(plt.Circle((-2.2, y0), 0.12, facecolor='#c62828', edgecolor='white', lw=1))
        ax.text(-2.2, y0, num, ha='center', va='center', fontsize=7, color='white', fontweight='bold')
        ax.text(-1.95, y0, label, fontsize=7.8, va='center', color='#333')
    ax.set_title('Zonas de Aderência de Rohrich (vista posterior)',
                 fontsize=12, fontweight='bold', color='#1e3a5f', pad=10)
    ax.text(0, 11.5, 'Aspiração agressiva → ptose iatrogênica (ex: banana roll)',
            ha='center', fontsize=8.5, color='#c62828', fontstyle='italic', fontweight='bold')
    save(fig, 'lipoaspiracao', 'lipo-anat-zonas-aderencia-rohrich.png')


def lipo_comparativo_tecnologias():
    """Árvore de decisão — qual tecnologia de lipoaspiração escolher."""
    fig, ax = plt.subplots(figsize=(13, 9.5))
    ax.set_xlim(0, 13)
    ax.set_ylim(0, 10)
    ax.axis('off')
    draw_box(ax, 6.5, 9.3, 4.2, 0.7,
             'Seleção de tecnologia — Lipoaspiração',
             color='#1e3a5f', fontsize=11)
    draw_diamond(ax, 6.5, 7.9, 3.2, 0.9, 'Tecido fibroso\n(dorso, flanco, ginecomastia)?', fontsize=8.5)
    draw_arrow(ax, 6.5, 7.45, 3.0, 6.6)
    ax.text(4.6, 7.05, 'sim', fontsize=8, color='#2e7d32', fontweight='bold')
    draw_arrow(ax, 6.5, 7.45, 10.0, 6.6)
    ax.text(8.2, 7.05, 'não', fontsize=8, color='#c62828', fontweight='bold')
    draw_box(ax, 3.0, 6.2, 2.6, 0.7, 'UAL / VASER', color='#5e35b1', fontsize=10)
    ax.text(3.0, 5.55,
            'Fibroso, lipo HD,\n+20-30% retração,\n60-90s por 100 mL',
            ha='center', fontsize=7.5, color='#333')
    draw_diamond(ax, 10.0, 6.2, 3.2, 0.9, 'Flacidez cutânea\nmoderada?', fontsize=8.5)
    draw_arrow(ax, 10.0, 5.75, 11.8, 4.7)
    ax.text(11.2, 5.2, 'sim', fontsize=8, color='#2e7d32', fontweight='bold')
    draw_arrow(ax, 10.0, 5.75, 7.3, 4.7)
    ax.text(8.3, 5.2, 'não', fontsize=8, color='#c62828', fontweight='bold')
    draw_box(ax, 11.8, 4.3, 2.2, 0.7, 'RFAL (BodyTite)', color='#00838f', fontsize=9)
    ax.text(11.8, 3.65,
            'RF bipolar, 38-42°C\npele / 70°C interno,\nneocolagênese',
            ha='center', fontsize=7.2, color='#333')
    draw_diamond(ax, 7.3, 4.3, 3.2, 0.9, 'Área pequena\n(submento, braços)?', fontsize=8.2)
    draw_arrow(ax, 7.3, 3.85, 5.0, 2.8)
    ax.text(5.9, 3.3, 'sim', fontsize=8, color='#2e7d32', fontweight='bold')
    draw_arrow(ax, 7.3, 3.85, 9.5, 2.8)
    ax.text(8.6, 3.3, 'não', fontsize=8, color='#c62828', fontweight='bold')
    draw_box(ax, 5.0, 2.4, 2.2, 0.7, 'LAL', color='#d84315', fontsize=10)
    ax.text(5.0, 1.75,
            'Nd:YAG 1064/diodo,\nretração controversa,\nrisco queimadura',
            ha='center', fontsize=7.2, color='#333')
    draw_diamond(ax, 9.5, 2.4, 3.0, 0.9, 'Grande volume?', fontsize=9)
    draw_arrow(ax, 9.5, 1.95, 7.8, 1.0)
    ax.text(8.5, 1.5, 'sim', fontsize=8, color='#2e7d32', fontweight='bold')
    draw_arrow(ax, 9.5, 1.95, 11.5, 1.0)
    ax.text(10.5, 1.5, 'não', fontsize=8, color='#c62828', fontweight='bold')
    draw_box(ax, 7.8, 0.6, 2.2, 0.7, 'PAL (MicroAire)', color='#00695c', fontsize=9.5)
    draw_box(ax, 11.5, 0.6, 2.0, 0.7, 'SAL (padrão)', color='#455a64', fontsize=10)
    ax.text(1.0, 2.3, 'Legenda:', fontsize=8, fontweight='bold', color='#555')
    for i, (tec, desc) in enumerate([
        ('SAL', 'aspiração convencional, versátil, baixo custo'),
        ('PAL', 'oscilação 2-4 mil ciclos/min, grandes volumes'),
        ('UAL', 'cavitação ultrassônica, áreas fibrosas, HD'),
        ('LAL', 'lipólise térmica por laser'),
        ('RFAL', 'radiofrequência bipolar + retração cutânea'),
    ]):
        ax.text(1.0, 1.9 - i*0.3, f'• {tec} — {desc}',
                fontsize=7.5, color='#333')
    ax.set_title('Comparativo de Tecnologias — Árvore de decisão clínica',
                 fontsize=12, fontweight='bold', color='#1e3a5f', y=1.0)
    save(fig, 'lipoaspiracao', 'lipo-tec-comparativo-tecnologias.png')


def lipo_hdbs_marcacao():
    """HDBS — marcação dinâmica com zonas positivas/negativas/transição."""
    fig, ax = plt.subplots(figsize=(7, 10))
    ax.set_xlim(-3, 3)
    ax.set_ylim(0, 12)
    ax.set_aspect('equal')
    ax.axis('off')
    # Silhueta masculina (torso frontal)
    ax.add_patch(FancyBboxPatch((-1.8, 2.5), 3.6, 7.0, boxstyle='round,pad=0.2',
                 facecolor='#f5deb3', edgecolor='#333', lw=2))
    head = plt.Circle((0, 10.5), 0.55, facecolor='#f5deb3', edgecolor='#333', lw=2)
    ax.add_patch(head)
    # Zonas negativas (aprofundar — azul)
    neg = [
        (0, 8.3, 0.25, 1.5, 'linha alba'),
        (-1.3, 6.0, 0.55, 1.8, 'linha\nsemilunar'),
        (1.3, 6.0, 0.55, 1.8, 'linha\nsemilunar'),
        (0, 5.2, 1.3, 0.2, 'tendíneas'),
        (0, 6.3, 1.3, 0.2, ''),
        (0, 7.4, 1.3, 0.2, ''),
    ]
    for x, y, w, h, label in neg:
        ax.add_patch(FancyBboxPatch((x-w/2, y-h/2), w, h,
                     boxstyle='square,pad=0', facecolor='#1565c0', edgecolor='none', alpha=0.7))
        if label:
            ax.text(x, y, label, ha='center', va='center', fontsize=6.5,
                    color='white', fontweight='bold')
    # Zonas positivas (preservar/projetar — vermelho)
    pos = [
        (-0.7, 8.2, 0.9, 1.0, 'reto\n(bloco 1)'),
        (0.7, 8.2, 0.9, 1.0, 'reto\n(bloco 1)'),
        (-0.7, 6.85, 0.9, 0.8, 'bloco 2'),
        (0.7, 6.85, 0.9, 0.8, 'bloco 2'),
        (-0.7, 5.75, 0.9, 0.8, 'bloco 3'),
        (0.7, 5.75, 0.9, 0.8, 'bloco 3'),
    ]
    for x, y, w, h, label in pos:
        ax.add_patch(FancyBboxPatch((x-w/2, y-h/2), w, h,
                     boxstyle='round,pad=0.02', facecolor='#c62828', edgecolor='none', alpha=0.55))
        ax.text(x, y, label, ha='center', va='center', fontsize=6.5,
                color='white', fontweight='bold')
    # Transição (flancos/oblíquos — laranja)
    trans = [
        (-1.55, 5.5, 0.5, 2.5, 'oblíquo\n(transição)'),
        (1.55, 5.5, 0.5, 2.5, 'oblíquo\n(transição)'),
    ]
    for x, y, w, h, label in trans:
        ax.add_patch(FancyBboxPatch((x-w/2, y-h/2), w, h,
                     boxstyle='round,pad=0.02', facecolor='#ef6c00', edgecolor='none', alpha=0.6))
        ax.text(x, y, label, ha='center', va='center', fontsize=6.5,
                color='white', fontweight='bold')
    # Peitoral e deltoide
    ax.add_patch(FancyBboxPatch((-1.4, 9.1), 2.8, 0.6, boxstyle='round,pad=0.02',
                 facecolor='#c62828', edgecolor='none', alpha=0.5))
    ax.text(0, 9.4, 'peitoral (enxerto)', ha='center', fontsize=7, color='white', fontweight='bold')
    # Legenda
    legs = [
        ('#c62828', 'Zona positiva — preservar/projetar (enxerto)'),
        ('#1565c0', 'Zona negativa — aprofundar (aspirar)'),
        ('#ef6c00', 'Zona de transição — suavizar'),
    ]
    for i, (color, text) in enumerate(legs):
        y0 = 1.8 - i*0.35
        ax.add_patch(FancyBboxPatch((-2.7, y0-0.12), 0.4, 0.24,
                     boxstyle='square,pad=0', facecolor=color, edgecolor='none', alpha=0.75))
        ax.text(-2.2, y0, text, fontsize=7.5, va='center', color='#333')
    ax.set_title('HDBS — Marcação dinâmica (contração isométrica)',
                 fontsize=11.5, fontweight='bold', color='#1e3a5f', pad=8)
    ax.text(0, 0.6, 'IMC < 30 · % gordura < 25♀/20♂ · boa elasticidade cutânea',
            ha='center', fontsize=7.8, color='#555', fontstyle='italic')
    ax.text(0, 0.25, 'Hoyos & Millard, HDBS 2014, caps. 4, 6 e 8',
            ha='center', fontsize=6.8, color='#999', fontstyle='italic')
    save(fig, 'lipoaspiracao', 'lipo-tec-hdbs-marcacao.png')


def lipo_safe_tempos():
    """Técnica SAFE — Separation, Aspiration, Fat Equalization."""
    fig, axes = plt.subplots(1, 3, figsize=(13, 6))
    tempos = [
        ('1. SEPARATION',
         'Emulsificação mecânica',
         'cânula basket,\nSEM aspiração',
         '#1565c0'),
        ('2. ASPIRATION',
         'Remoção do emulsificado',
         'cânula PAL\nconvencional,\nCOM aspiração',
         '#2e7d32'),
        ('3. FAT EQUALIZATION',
         'Redistribuição uniforme',
         'cânula basket superficial,\nSEM aspiração\n(prevenir irregularidades)',
         '#ef6c00'),
    ]
    for ax, (titulo, subt, desc, cor) in zip(axes, tempos):
        ax.set_xlim(0, 10)
        ax.set_ylim(0, 10)
        ax.axis('off')
        # Corte sagital esquemático: pele + subcutâneo + músculo
        ax.add_patch(FancyBboxPatch((0.5, 8.0), 9, 0.6, boxstyle='square,pad=0',
                     facecolor='#a1887f', edgecolor='#333', lw=1))
        ax.text(0.8, 8.3, 'pele', fontsize=7, color='white')
        ax.add_patch(FancyBboxPatch((0.5, 5.5), 9, 2.5, boxstyle='square,pad=0',
                     facecolor='#fff59d', edgecolor='#333', lw=1))
        ax.text(0.8, 6.7, 'subcutâneo', fontsize=7, color='#555')
        ax.add_patch(FancyBboxPatch((0.5, 4.5), 9, 1.0, boxstyle='square,pad=0',
                     facecolor='#e57373', edgecolor='#333', lw=1))
        ax.text(0.8, 5.0, 'músculo', fontsize=7, color='white')
        # Cânula com trajetória
        ax.annotate('', xy=(8.5, 6.8), xytext=(1.2, 6.8),
                    arrowprops=dict(arrowstyle='-|>', color=cor, lw=3))
        for x in [2.5, 4.0, 5.5, 7.0]:
            if 'basket' in desc and 'SEM' in desc:
                ax.plot(x, 6.8, marker='o', color=cor, markersize=5, markerfacecolor='white')
            elif 'PAL' in desc:
                ax.plot(x, 6.8, marker='v', color=cor, markersize=8)
        # Título do painel
        ax.add_patch(FancyBboxPatch((0.5, 9.1), 9, 0.7, boxstyle='round,pad=0.03',
                     facecolor=cor, edgecolor='none'))
        ax.text(5.0, 9.45, titulo, ha='center', va='center',
                fontsize=10.5, fontweight='bold', color='white')
        ax.text(5.0, 3.5, subt, ha='center', fontsize=9, color=cor, fontweight='bold')
        ax.text(5.0, 2.3, desc, ha='center', fontsize=8, color='#333')
        # Seta entre painéis
    fig.suptitle('Técnica SAFE (Wall & Lee) — 3 tempos',
                 fontsize=12, fontweight='bold', color='#1e3a5f', y=0.98)
    fig.text(0.5, 0.02,
             'Aspirado mais limpo · menor dependência de vácuo · menos irregularidades de superfície',
             ha='center', fontsize=8, color='#555', fontstyle='italic')
    save(fig, 'lipoaspiracao', 'lipo-tec-safe-tempos.png')


def lipo_canulas_por_regiao():
    """Tabela visual: diâmetro de cânula (profundo/superficial) por região."""
    regions = [
        ('Pescoço/submento', 2.4, 2.4),
        ('Braços', 3.7, 3.0),
        ('Dorso', 3.7, 3.0),
        ('Flancos/quadris', 4.6, 3.7),
        ('Abdome', 3.7, 3.0),
        ('Coxas (lat/post)', 3.7, 3.0),
        ('Joelhos', 3.0, 2.4),
    ]
    fig, ax = plt.subplots(figsize=(10, 8))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')
    ax.set_title('Seleção de Cânulas por Região\n(diâmetro em mm — trabalho profundo / refinamento superficial)',
                 fontsize=13, fontweight='bold', pad=15)

    # Header
    draw_box(ax, 2.2, 9, 3.6, 0.6, 'REGIÃO', '#37474F')
    draw_box(ax, 5.6, 9, 2.2, 0.6, 'PROFUNDO (mm)', '#C62828')
    draw_box(ax, 8.0, 9, 2.0, 0.6, 'SUPERFICIAL (mm)', '#1565C0')

    # Rows
    y = 8.2
    for i, (region, deep, sup) in enumerate(regions):
        bg = '#ECEFF1' if i % 2 == 0 else '#FFFFFF'
        ax.add_patch(FancyBboxPatch((0.3, y - 0.35), 9.4, 0.7,
                                     boxstyle="round,pad=0.02",
                                     facecolor=bg, edgecolor='#CFD8DC', linewidth=0.8))
        ax.text(2.2, y, region, ha='center', va='center', fontsize=10,
                color='#263238', fontfamily='sans-serif')
        ax.text(5.6, y, f'{deep:.1f}', ha='center', va='center', fontsize=11,
                color='#C62828', fontweight='bold', fontfamily='sans-serif')
        ax.text(8.0, y, f'{sup:.1f}', ha='center', va='center', fontsize=11,
                color='#1565C0', fontweight='bold', fontfamily='sans-serif')
        y -= 0.85

    # Note
    note = ('Ponta romba 3 orifícios laterais (Mercedes) = padrão versátil.\n'
            'VentX / basket (multi-orifício fino) = refinamento superficial e coleta para lipoenxertia.')
    ax.text(5, 1.2, note, ha='center', va='center', fontsize=8.5,
            fontfamily='sans-serif', color='#37474F', fontstyle='italic',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#FFF3E0', edgecolor='#FB8C00'))

    save(fig, 'lipoaspiracao', 'lipo-tec-canulas-por-regiao.png')


def lipo_ual_vaser():
    """Cavitação ultrassônica: sonda VASER emulsificando adipócitos."""
    fig, ax = plt.subplots(figsize=(11, 6.5))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 6.5)
    ax.axis('off')
    ax.set_title('UAL/VASER — Emulsificação por Cavitação Acústica',
                 fontsize=13, fontweight='bold', pad=12)

    # Skin layers
    ax.add_patch(mpatches.Rectangle((0.5, 5.3), 10, 0.35, facecolor='#FFE0B2', edgecolor='#333'))
    ax.text(0.55, 5.47, 'pele', fontsize=8, color='#5D4037', fontfamily='sans-serif')
    ax.add_patch(mpatches.Rectangle((0.5, 1.5), 10, 3.8, facecolor='#FFF8E1', edgecolor='#333'))
    ax.text(0.6, 4.9, 'subcutâneo (adipócitos)', fontsize=8, color='#8D6E63', fontfamily='sans-serif')
    ax.add_patch(mpatches.Rectangle((0.5, 1.1), 10, 0.4, facecolor='#EF9A9A', edgecolor='#333'))
    ax.text(0.55, 1.3, 'músculo', fontsize=8, color='#4E342E', fontfamily='sans-serif')

    # Probe entry
    ax.plot([1.8, 5.5], [5.3, 3.5], color='#37474F', lw=3)
    ax.add_patch(mpatches.Circle((5.5, 3.5), 0.12, color='#37474F'))
    ax.text(1.5, 5.8, 'sonda VASER', fontsize=9, color='#263238', fontweight='bold')

    # Cavitation waves (concentric)
    for r, alpha in [(0.5, 0.6), (0.9, 0.4), (1.3, 0.25), (1.7, 0.15)]:
        ax.add_patch(mpatches.Circle((5.5, 3.5), r, fill=False,
                                      edgecolor='#1976D2', lw=1.5, alpha=alpha))

    # Adipocytes left (intact)
    for x, y in [(3.0, 4.3), (3.5, 3.8), (3.2, 3.2), (2.8, 2.6), (3.6, 2.3)]:
        ax.add_patch(mpatches.Circle((x, y), 0.2, facecolor='#FFEB3B', edgecolor='#F9A825', lw=1.2))

    # Adipocytes right (emulsified — broken)
    import random
    random.seed(42)
    for _ in range(25):
        x = 7 + random.random() * 2.8
        y = 2 + random.random() * 2.8
        ax.add_patch(mpatches.Circle((x, y), 0.07,
                                      facecolor='#FFCA28', edgecolor='#FF8F00', lw=0.5, alpha=0.7))

    ax.text(3.2, 1.75, 'INTACTO', ha='center', fontsize=10, fontweight='bold', color='#F57F17')
    ax.text(8.4, 1.75, 'EMULSIFICADO', ha='center', fontsize=10, fontweight='bold', color='#E65100')
    draw_arrow(ax, 5.8, 3.5, 7.0, 3.5, label='cavitação')

    # Parameters
    params = ('Sondas 2,2 / 2,9 / 3,7 / 4,5 mm (1 ranhura = fibroso · 3 ranhuras = macio)\n'
              'Contínuo (fibroso) · Pulsátil 10 bursts/s (macio)\n'
              'Endpoint: 60–90 s por 100 mL tumescente (VASER seconds)\n'
              'Proteger entrada com toalha úmida (risco de queimadura se sonda parada)')
    ax.text(5.5, 0.45, params, ha='center', va='center', fontsize=8,
            fontfamily='sans-serif', color='#263238',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#E3F2FD', edgecolor='#1976D2'))

    save(fig, 'lipoaspiracao', 'lipo-tec-ual-vaser.png')


def lipo_pal_oscilacao():
    """PAL: cânula com movimento oscilatório recíproco."""
    fig, ax = plt.subplots(figsize=(11, 5.5))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 5.5)
    ax.axis('off')
    ax.set_title('PAL (Power-Assisted Liposuction) — Oscilação Recíproca',
                 fontsize=13, fontweight='bold', pad=12)

    # Handpiece
    ax.add_patch(FancyBboxPatch((0.5, 2.8), 2.2, 0.8, boxstyle="round,pad=0.05",
                                facecolor='#546E7A', edgecolor='#263238', lw=1.5))
    ax.text(1.6, 3.2, 'MicroAire\nhandpiece', ha='center', va='center',
            fontsize=9, color='white', fontweight='bold')

    # Cannula
    ax.plot([2.7, 8.0], [3.2, 3.2], color='#90A4AE', lw=7, solid_capstyle='round')
    ax.add_patch(mpatches.Circle((8.05, 3.2), 0.1, color='#263238'))

    # Oscillation arrows
    ax.annotate('', xy=(8.4, 3.2), xytext=(7.6, 3.2),
                arrowprops=dict(arrowstyle='<->', color='#D32F2F', lw=2.5))
    ax.text(8.0, 3.7, '2–3 mm\n2.000–4.000 cpm', ha='center', fontsize=9,
            color='#C62828', fontweight='bold')

    # Tissue context
    ax.add_patch(mpatches.Rectangle((6.5, 1.5), 4, 1.2, facecolor='#FFF8E1', edgecolor='#F9A825'))
    ax.text(8.5, 2.1, 'tecido fibroso\n(dorso/flancos)', ha='center', va='center',
            fontsize=9, color='#5D4037', fontstyle='italic')

    # Benefits box
    benefits = ('Vantagens clínicas:\n'
                '• Penetra tecido fibroso com menos esforço\n'
                '• Reduz fadiga muscular do cirurgião em grandes volumes\n'
                '• Aspirado de melhor qualidade para lipoenxertia\n'
                '  (menor lesão adipocitária vs UAL e SAL calibrosa)\n'
                '• Não gera calor — perfil de segurança excelente')
    ax.text(3.0, 1.4, benefits, ha='left', va='center', fontsize=8.5,
            fontfamily='sans-serif', color='#263238',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#E8F5E9', edgecolor='#388E3C'))

    save(fig, 'lipoaspiracao', 'lipo-tec-pal-oscilacao.png')


def lipo_lal_laser():
    """LAL: fibra óptica com laser Nd:YAG/diodo gerando lipólise térmica."""
    fig, ax = plt.subplots(figsize=(11, 6), facecolor='white')
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 6)
    ax.axis('off')
    ax.set_title('LAL (Laser-Assisted Lipolysis) — Lipólise Térmica',
                 fontsize=13, fontweight='bold', pad=12)

    # Skin
    ax.add_patch(mpatches.Rectangle((0.5, 4.8), 10, 0.35, facecolor='#FFE0B2', edgecolor='#333'))
    ax.add_patch(mpatches.Rectangle((0.5, 1.3), 10, 3.5, facecolor='#FFF8E1', edgecolor='#333'))
    ax.text(0.6, 4.4, 'subcutâneo', fontsize=8, color='#8D6E63')

    # Cannula with fiber
    ax.plot([1.5, 6.0], [4.8, 3.2], color='#37474F', lw=4)
    ax.plot([1.5, 6.0], [4.8, 3.2], color='#EF5350', lw=1.5)  # fiber inside

    # Laser beam + thermal halo
    for r, color, alpha in [(0.3, '#FF1744', 0.9), (0.7, '#FF5722', 0.55),
                            (1.1, '#FFA726', 0.35), (1.5, '#FFE082', 0.2)]:
        ax.add_patch(mpatches.Circle((6.0, 3.2), r, facecolor=color,
                                      edgecolor='none', alpha=alpha))

    ax.text(6.0, 1.6, 'zona térmica\n(Nd:YAG 1064 nm / diodo 980 nm)',
            ha='center', fontsize=9, color='#BF360C', fontweight='bold')
    ax.text(1.0, 5.3, 'fibra óptica\nno interior da cânula', fontsize=9,
            color='#263238', fontweight='bold')

    # Evidence box
    ev = ('Evidência (revisão sistemática Wollina 2020):\n'
          'NÃO demonstrou superioridade consistente sobre SAL\n'
          'em retração cutânea. Marketing > evidência.\n\n'
          'Risco: queimadura cutânea (exposição prolongada);\n'
          'perfuração visceral (fibra rígida).')
    ax.text(9.2, 3.0, ev, ha='center', va='center', fontsize=8,
            fontfamily='sans-serif', color='#263238',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#FFEBEE', edgecolor='#C62828'))

    save(fig, 'lipoaspiracao', 'lipo-tec-lal-laser.png')


def lipo_rfal_bodytite():
    """RFAL bipolar: eletrodo interno + externo + zonas térmicas-alvo."""
    fig, ax = plt.subplots(figsize=(11, 6.5))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 6.5)
    ax.axis('off')
    ax.set_title('RFAL (BodyTite) — Radiofrequência Bipolar Assistida',
                 fontsize=13, fontweight='bold', pad=12)

    # Skin layers
    ax.add_patch(mpatches.Rectangle((0.5, 5.1), 10, 0.35, facecolor='#FFCCBC', edgecolor='#333'))
    ax.text(0.6, 5.28, 'epiderme + derme', fontsize=8, color='#4E342E')
    ax.add_patch(mpatches.Rectangle((0.5, 1.5), 10, 3.6, facecolor='#FFF8E1', edgecolor='#333'))
    ax.text(0.6, 4.7, 'subcutâneo', fontsize=8, color='#8D6E63')

    # External electrode (above skin)
    ax.add_patch(FancyBboxPatch((4.5, 5.6), 2, 0.55, boxstyle="round,pad=0.05",
                                facecolor='#1565C0', edgecolor='#0D47A1', lw=1.5))
    ax.text(5.5, 5.87, 'eletrodo EXTERNO', ha='center', fontsize=9,
            color='white', fontweight='bold')

    # Internal electrode (cannula tip inside subcutis)
    ax.plot([2.0, 5.5], [5.1, 3.3], color='#37474F', lw=4)
    ax.add_patch(mpatches.Circle((5.5, 3.3), 0.15, color='#E65100'))
    ax.text(2.5, 5.55, 'eletrodo INTERNO\n(na cânula)', fontsize=9,
            color='#263238', fontweight='bold')

    # RF field between electrodes
    for y in np.linspace(3.4, 5.55, 8):
        ax.plot([5.0, 6.0], [y, y], color='#FFA726', lw=0.6, alpha=0.7, linestyle='--')

    # Temperature annotations
    ax.annotate('38–42 °C\n(pele)', xy=(6.6, 5.35), xytext=(8.3, 5.8),
                fontsize=9, color='#1565C0', fontweight='bold',
                arrowprops=dict(arrowstyle='->', color='#1565C0', lw=1.2),
                bbox=dict(boxstyle='round,pad=0.3', facecolor='#E3F2FD', edgecolor='#1565C0'))
    ax.annotate('70 °C\n(subcutâneo)', xy=(5.7, 3.3), xytext=(8.3, 2.8),
                fontsize=9, color='#E65100', fontweight='bold',
                arrowprops=dict(arrowstyle='->', color='#E65100', lw=1.2),
                bbox=dict(boxstyle='round,pad=0.3', facecolor='#FFF3E0', edgecolor='#E65100'))

    # Mechanism note
    mech = ('Monitorização térmica em tempo real é essencial.\n'
            'Aquecimento dérmico → contração de colágeno + neocolagênese\n'
            '→ retração cutânea sem excisão.\n'
            'CI relativa: marca-passo, implantes metálicos na área-alvo.')
    ax.text(3.3, 0.9, mech, ha='center', va='center', fontsize=8,
            fontfamily='sans-serif', color='#263238',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#E8F5E9', edgecolor='#388E3C'))

    save(fig, 'lipoaspiracao', 'lipo-tec-rfal-bodytite.png')


def lipo_lipoenxertia_coleman():
    """Lipoenxertia: fluxo coleta → centrifugação 3 camadas → injeção."""
    fig, ax = plt.subplots(figsize=(12, 7))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 7)
    ax.axis('off')
    ax.set_title('Lipoenxertia — Técnica de Coleman\n(Coleta → Centrifugação → Injeção)',
                 fontsize=13, fontweight='bold', pad=12)

    # === PANEL 1: HARVEST ===
    ax.text(1.8, 6.3, '1. COLETA', ha='center', fontsize=11, fontweight='bold', color='#C62828')
    # Syringe
    ax.add_patch(mpatches.Rectangle((0.8, 3.5), 1.8, 2.3, facecolor='#E3F2FD',
                                     edgecolor='#1565C0', lw=1.5))
    ax.add_patch(mpatches.Rectangle((1.3, 5.0), 0.8, 0.9, facecolor='#90CAF9',
                                     edgecolor='#1565C0', lw=1))  # plunger
    # Cannula
    ax.plot([1.7, 1.7], [3.5, 2.6], color='#37474F', lw=3)
    ax.add_patch(mpatches.Circle((1.7, 2.55), 0.1, color='#37474F'))
    ax.text(1.8, 3.0, 'cânula Coleman\n3 mm', ha='left', fontsize=8, color='#263238')
    note1 = ('Seringa 10 mL\nVácuo manual 1–2 mL\n(baixa pressão)\n\n'
             'Doadores:\n• abdome inferior\n• flanco\n• face medial coxa')
    ax.text(1.8, 1.2, note1, ha='center', va='center', fontsize=8,
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#FFEBEE', edgecolor='#C62828'))

    # Arrow to panel 2
    draw_arrow(ax, 3.3, 4.5, 4.2, 4.5)

    # === PANEL 2: CENTRIFUGATION ===
    ax.text(6.0, 6.3, '2. CENTRIFUGAÇÃO', ha='center', fontsize=11, fontweight='bold', color='#F57C00')
    ax.text(6.0, 5.9, '3.000 rpm × 3 min (~1.200 G)', ha='center', fontsize=9,
            fontstyle='italic', color='#555')

    # Syringe after centrifugation (3 layers)
    ax.add_patch(mpatches.Rectangle((5.3, 3.5), 1.4, 2.1, facecolor='none',
                                     edgecolor='#263238', lw=2))
    # Layer 1 (top) — oil (descartar)
    ax.add_patch(mpatches.Rectangle((5.32, 4.9), 1.36, 0.68, facecolor='#FDD835', edgecolor='none'))
    ax.text(7.0, 5.24, 'óleo + adipócitos lisados', fontsize=8.5, color='#F57F17',
            fontweight='bold', va='center')
    ax.text(7.0, 4.95, '→ descartar', fontsize=8, color='#C62828',
            fontstyle='italic', va='center')
    # Layer 2 (middle) — viable fat (USE)
    ax.add_patch(mpatches.Rectangle((5.32, 4.1), 1.36, 0.78, facecolor='#FFB74D', edgecolor='none'))
    ax.text(7.0, 4.55, 'gordura VIÁVEL / purificada', fontsize=9, color='#E65100',
            fontweight='bold', va='center')
    ax.text(7.0, 4.22, '→ UTILIZAR', fontsize=9, color='#2E7D32',
            fontweight='bold', va='center')
    # Layer 3 (bottom) — blood + tumescent
    ax.add_patch(mpatches.Rectangle((5.32, 3.52), 1.36, 0.56, facecolor='#EF5350', edgecolor='none'))
    ax.text(7.0, 3.85, 'fração aquosa/sanguínea', fontsize=8.5, color='#B71C1C',
            fontweight='bold', va='center')
    ax.text(7.0, 3.62, '→ descartar', fontsize=8, color='#C62828',
            fontstyle='italic', va='center')

    # Arrow to panel 3
    draw_arrow(ax, 9.0, 4.5, 9.8, 4.5)

    # === PANEL 3: INJECTION ===
    ax.text(10.8, 6.3, '3. INJEÇÃO', ha='center', fontsize=11, fontweight='bold', color='#2E7D32')
    ax.add_patch(mpatches.Rectangle((10.2, 4.5), 1.2, 1.3, facecolor='#FFF3E0',
                                     edgecolor='#E65100', lw=1.5))
    ax.plot([10.8, 10.8], [4.5, 3.5], color='#37474F', lw=2.5)
    # Multiple tunnels radiating
    for ang in [-60, -30, 0, 30, 60]:
        import math
        x_end = 10.8 + 0.8 * math.sin(math.radians(ang))
        y_end = 3.5 - 0.8 * math.cos(math.radians(ang))
        ax.plot([10.8, x_end], [3.5, y_end], color='#FFB74D', lw=1.2, alpha=0.7)

    note3 = ('Microcânulas Coleman\n1,5–2,0 mm\n\n'
             'Alíquotas 0,1 mL/passagem\nmúltiplos túneis 3D\n\n'
             'Sobrecorreção 20–30%\n(reabsorção 30–70%)')
    ax.text(10.8, 1.5, note3, ha='center', va='center', fontsize=8,
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#E8F5E9', edgecolor='#2E7D32'))

    # Footer — variants
    footer = ('Variantes: nanofat (emulsão SVF intradérmico) · microfat (subdérmico fino) · '
              'sistemas comerciais fechados (Revolve, Puregraft)')
    ax.text(6.0, 0.25, footer, ha='center', va='center', fontsize=8,
            fontstyle='italic', color='#455A64')

    save(fig, 'lipoaspiracao', 'lipo-tec-lipoenxertia-coleman.png')


# ============================================================
# GLUTEOPLASTIA DIAGRAMS
# ============================================================


def glut_anat_neurovascular():
    """Neurovascular glútea: a. glúteas sup/inf, n. ciático, nn. glúteos sup/inf, piriforme."""
    fig, ax = plt.subplots(figsize=(11, 8))
    ax.set_xlim(0, 11); ax.set_ylim(0, 8); ax.axis('off')

    ax.set_title('Anatomia neurovascular glútea — landmarks para BBL seguro',
                 fontsize=12, fontweight='bold', pad=10)

    # Contorno glúteo posterior (simplificado)
    ax.add_patch(mpatches.FancyBboxPatch((1.5, 1.0), 8.0, 6.0, boxstyle="round,pad=0.1",
                                          facecolor='#FFF3E0', edgecolor='#8D6E63', linewidth=1.5))

    # Sacro
    ax.add_patch(plt.Polygon([(5.5, 6.5), (5.0, 5.2), (6.0, 5.2)],
                              facecolor='#BCAAA4', edgecolor='#5D4037', linewidth=1.2))
    ax.text(5.5, 5.9, 'Sacro', ha='center', fontsize=8, fontweight='bold')

    # Piriforme (músculo de referência — todos os vasos/nervos passam ao redor)
    ax.add_patch(mpatches.Ellipse((5.5, 4.3), 3.8, 0.9, facecolor='#A1887F',
                                   edgecolor='#3E2723', linewidth=1.5, alpha=0.85))
    ax.text(5.5, 4.3, 'Músculo piriforme', ha='center', va='center',
            fontsize=9, color='white', fontweight='bold')

    # Forame suprapiriforme — a./n. glúteos superiores
    ax.plot(4.0, 4.7, 'o', markersize=12, color='#D32F2F')
    ax.text(3.6, 4.95, 'Forame\nsuprapiriforme', fontsize=7, ha='right',
            fontstyle='italic', color='#D32F2F')
    ax.annotate('', xy=(2.5, 5.8), xytext=(4.0, 4.7),
                arrowprops=dict(arrowstyle='->', color='#C62828', lw=1.8))
    ax.text(2.3, 5.9, 'A. glútea SUPERIOR\n+ N. glúteo superior', fontsize=8,
            color='#B71C1C', fontweight='bold', ha='right')

    # Forame infrapiriforme — a./n. glúteos inferiores + n. ciático
    ax.plot(4.0, 3.9, 'o', markersize=12, color='#1976D2')
    ax.text(3.6, 3.6, 'Forame\ninfrapiriforme', fontsize=7, ha='right',
            fontstyle='italic', color='#1976D2')
    ax.annotate('', xy=(2.5, 2.8), xytext=(4.0, 3.9),
                arrowprops=dict(arrowstyle='->', color='#0D47A1', lw=1.8))
    ax.text(2.3, 2.7, 'A. glútea INFERIOR\n+ N. glúteo inferior\n+ N. cutâneo femoral post.',
            fontsize=8, color='#0D47A1', fontweight='bold', ha='right')

    # Nervo ciático — trajeto descendente
    ax.plot([4.5, 5.0, 5.3, 5.5], [3.7, 2.8, 2.0, 1.3], color='#F57F17',
            linewidth=3.5, solid_capstyle='round')
    ax.text(5.9, 2.2, 'NERVO\nCIÁTICO', fontsize=9, color='#E65100',
            fontweight='bold')
    ax.text(5.9, 1.7, '(emerge inferior ao piriforme\nem 85% — pode ser intrapiriforme)',
            fontsize=7, color='#E65100', fontstyle='italic')

    # Zona de perigo BBL — submuscular
    ax.add_patch(mpatches.Rectangle((6.5, 3.0), 2.8, 1.8, facecolor='#FFCDD2',
                                     edgecolor='#C62828', linewidth=2, linestyle='--', alpha=0.6))
    ax.text(7.9, 3.9, 'ZONA DE\nPERIGO BBL\n(submuscular)',
            fontsize=9, color='#B71C1C', fontweight='bold', ha='center', va='center')

    # Safe zone BBL — subcutâneo superficial
    ax.add_patch(mpatches.Rectangle((6.5, 5.2), 2.8, 1.3, facecolor='#C8E6C9',
                                     edgecolor='#2E7D32', linewidth=2, alpha=0.6))
    ax.text(7.9, 5.85, 'ZONA SEGURA\n(subcutâneo superficial)',
            fontsize=9, color='#1B5E20', fontweight='bold', ha='center', va='center')

    # Footer
    footer = ('Regra de ouro BBL (Multi-Society Task Force 2018): cânulas ≥4 mm, '
              'angulação superficial, nunca transmuscular — embolia gordurosa letal via v. glútea inf.')
    ax.text(5.5, 0.3, footer, ha='center', va='center', fontsize=8,
            fontstyle='italic', color='#B71C1C',
            bbox=dict(facecolor='#FFEBEE', edgecolor='#B71C1C', boxstyle='round,pad=0.4'))

    save(fig, 'gluteoplastia', 'glut-anat-neurovascular.png')


def glut_anat_musculos_camadas():
    """Camadas musculares glúteas: máximo, médio, mínimo."""
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.set_xlim(0, 10); ax.set_ylim(0, 7); ax.axis('off')

    ax.set_title('Camadas musculares glúteas — superficial à profunda',
                 fontsize=12, fontweight='bold', pad=10)

    # Máximo (superficial)
    ax.add_patch(mpatches.FancyBboxPatch((1.0, 4.8), 8.0, 1.2, boxstyle="round,pad=0.08",
                                          facecolor='#D32F2F', edgecolor='#B71C1C', linewidth=1.5, alpha=0.85))
    ax.text(5.0, 5.4, 'M. GLÚTEO MÁXIMO (superficial)', ha='center', va='center',
            fontsize=11, color='white', fontweight='bold')
    ax.text(5.0, 4.95, 'Origem: sacro/íleo · Inserção: trato iliotibial + tuberosidade glútea · Inervação: n. glúteo inferior (S1–S2)',
            ha='center', va='center', fontsize=7.5, color='white', fontstyle='italic')

    # Médio (intermediário)
    ax.add_patch(mpatches.FancyBboxPatch((1.5, 3.3), 7.0, 1.1, boxstyle="round,pad=0.08",
                                          facecolor='#F57C00', edgecolor='#E65100', linewidth=1.5, alpha=0.85))
    ax.text(5.0, 3.85, 'M. GLÚTEO MÉDIO (intermediário)', ha='center', va='center',
            fontsize=11, color='white', fontweight='bold')
    ax.text(5.0, 3.45, 'Abdutor principal · Inervação: n. glúteo superior (L4–S1)',
            ha='center', va='center', fontsize=7.5, color='white', fontstyle='italic')

    # Mínimo (profundo)
    ax.add_patch(mpatches.FancyBboxPatch((2.0, 1.8), 6.0, 1.1, boxstyle="round,pad=0.08",
                                          facecolor='#FFA726', edgecolor='#EF6C00', linewidth=1.5, alpha=0.85))
    ax.text(5.0, 2.35, 'M. GLÚTEO MÍNIMO (profundo)', ha='center', va='center',
            fontsize=11, color='white', fontweight='bold')
    ax.text(5.0, 1.95, 'Abdutor + rotação interna · Inervação: n. glúteo superior',
            ha='center', va='center', fontsize=7.5, color='white', fontstyle='italic')

    # Plano ósseo (íleo)
    ax.add_patch(mpatches.FancyBboxPatch((2.5, 0.6), 5.0, 0.8, boxstyle="round,pad=0.05",
                                          facecolor='#BCAAA4', edgecolor='#5D4037', linewidth=1.5))
    ax.text(5.0, 1.0, 'Asa do íleo (plano ósseo)', ha='center', va='center',
            fontsize=10, color='#3E2723', fontweight='bold')

    # Legenda de planos cirúrgicos
    ax.text(9.5, 5.4, 'subcutâneo', fontsize=8, ha='left', color='#1B5E20', fontweight='bold')
    ax.text(9.5, 3.85, 'subfascial', fontsize=8, ha='left', color='#1B5E20', fontweight='bold')
    ax.text(9.5, 2.35, 'intramuscular\n(entre máximo e médio)', fontsize=8, ha='left', color='#1B5E20', fontweight='bold')

    # Footer
    ax.text(5.0, 0.15, 'Planos para implante: subcutâneo (alto risco), subfascial (preferido), intramuscular (clássico Gonzalez).',
            ha='center', fontsize=8, fontstyle='italic', color='#455A64')

    save(fig, 'gluteoplastia', 'glut-anat-musculos-camadas.png')


def glut_tec_bbl_safety():
    """BBL — zona segura subcutânea vs zona letal submuscular."""
    fig, ax = plt.subplots(figsize=(11, 7))
    ax.set_xlim(0, 11); ax.set_ylim(0, 7); ax.axis('off')

    ax.set_title('BBL (Brazilian Butt Lift) — regra de segurança subcutânea',
                 fontsize=12, fontweight='bold', pad=10)

    # Corte sagital simplificado
    # Pele
    ax.add_patch(mpatches.Rectangle((1.0, 5.5), 9.0, 0.4, facecolor='#FFE0B2', edgecolor='#8D6E63'))
    ax.text(0.7, 5.7, 'Pele', ha='right', fontsize=8, fontweight='bold')

    # Subcutâneo — ZONA SEGURA (verde)
    ax.add_patch(mpatches.Rectangle((1.0, 4.5), 9.0, 1.0, facecolor='#C8E6C9',
                                     edgecolor='#2E7D32', linewidth=1.5))
    ax.text(0.7, 5.0, 'Subcutâneo\n(SEGURO)', ha='right', fontsize=8, fontweight='bold', color='#1B5E20')

    # Fáscia glútea
    ax.plot([1.0, 10.0], [4.5, 4.5], color='#5D4037', linewidth=2.5)
    ax.text(10.3, 4.5, 'fáscia', fontsize=7, va='center', color='#5D4037')

    # Músculo glúteo — ZONA PROIBIDA (vermelho)
    ax.add_patch(mpatches.Rectangle((1.0, 2.8), 9.0, 1.7, facecolor='#FFCDD2',
                                     edgecolor='#C62828', linewidth=1.5))
    ax.text(0.7, 3.65, 'Músculo\n(PROIBIDO)', ha='right', fontsize=8, fontweight='bold', color='#B71C1C')
    # Veias glúteas inferiores dentro do músculo
    for y in [3.2, 3.6, 4.0]:
        ax.plot([2.0, 9.0], [y, y], color='#1976D2', linewidth=1.2, linestyle=':', alpha=0.7)
    ax.text(5.5, 3.65, 'Veias glúteas inferiores\n(ligação direta → coração/pulmão)',
            ha='center', va='center', fontsize=8, color='#0D47A1', fontstyle='italic')

    # Cânulas em posição correta (subcutânea, paralela à pele)
    ax.annotate('', xy=(8.5, 5.0), xytext=(1.5, 5.0),
                arrowprops=dict(arrowstyle='->', color='#2E7D32', lw=3))
    ax.text(5.0, 5.25, 'Cânula ≥ 4 mm · ângulo paralelo à pele · apenas subcutâneo',
            ha='center', fontsize=8, color='#1B5E20', fontweight='bold')

    # Cânula errada (transmuscular) — X
    ax.annotate('', xy=(5.5, 3.0), xytext=(3.0, 5.5),
                arrowprops=dict(arrowstyle='->', color='#C62828', lw=2, linestyle='--'))
    ax.text(5.8, 3.0, '✗ EMBOLIA GORDUROSA\n(letalidade ~1:1.000)',
            fontsize=9, color='#B71C1C', fontweight='bold')

    # Parâmetros BBL
    params = ('Parâmetros seguros: volume/região ≤ 300 mL · pressão aspiração < 15 mmHg · '
              'enxerto livre de sangue/óleo · 20–30% sobrecorreção · descompressão intraoperatória')
    ax.text(5.5, 1.8, params, ha='center', va='center', fontsize=8,
            bbox=dict(facecolor='#E8F5E9', edgecolor='#2E7D32', boxstyle='round,pad=0.4'))

    # Mortalidade histórica
    ax.text(5.5, 0.7, 'Multi-Society Task Force 2018/2022: mortalidade caiu de 1:3.000 para <1:15.000 com regra subcutânea estrita.',
            ha='center', fontsize=8, color='#B71C1C', fontweight='bold', fontstyle='italic')

    save(fig, 'gluteoplastia', 'glut-tec-bbl-safety.png')


def glut_tec_lifting_gluteo():
    """Lifting glúteo — incisões, ancoragem, vetor de suspensão."""
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.set_xlim(0, 10); ax.set_ylim(0, 7); ax.axis('off')

    ax.set_title('Lifting glúteo (gluteoplastia de suspensão)',
                 fontsize=12, fontweight='bold', pad=10)

    # Silhueta posterior (par de glúteos simplificados)
    for cx in [3.5, 6.5]:
        ax.add_patch(mpatches.Ellipse((cx, 3.5), 2.0, 3.0, facecolor='#FFE0B2',
                                       edgecolor='#8D6E63', linewidth=1.5))

    # Incisão em V — em cinto (belt lipectomy) / bikini upper
    ax.plot([1.5, 3.5, 5.0, 6.5, 8.5], [5.5, 5.0, 5.4, 5.0, 5.5], color='#C62828',
            linewidth=3, solid_capstyle='round')
    ax.text(5.0, 5.9, 'Incisão em cinto (upper buttock)\nlinha do biquíni',
            ha='center', fontsize=8.5, color='#B71C1C', fontweight='bold')

    # Vetores de suspensão (setas verticais ascendentes)
    for cx in [2.8, 3.5, 4.2, 5.8, 6.5, 7.2]:
        ax.annotate('', xy=(cx, 5.0), xytext=(cx, 3.5),
                    arrowprops=dict(arrowstyle='->', color='#1B5E20', lw=2))
    ax.text(0.3, 4.2, 'Vetor de\nsuspensão\nvertical',
            fontsize=8, color='#1B5E20', fontweight='bold')

    # Pontos de ancoragem (fáscia de Lockwood / periósteo sacral)
    for cx, cy in [(3.5, 4.8), (5.0, 4.9), (6.5, 4.8)]:
        ax.plot(cx, cy, '*', markersize=15, color='#F57F17',
                markeredgecolor='#E65100', markeredgewidth=1.5)
    ax.text(9.7, 4.8, 'Ancoragem:\nfáscia profunda\nde Lockwood',
            fontsize=8, color='#E65100', fontweight='bold', ha='right')

    # Tecido excedente (crescente infraincisional ressecado)
    ax.add_patch(mpatches.FancyBboxPatch((1.5, 5.0), 7.0, 0.6,
                                          boxstyle="round,pad=0.05",
                                          facecolor='none', edgecolor='#C62828',
                                          linewidth=2, linestyle='--'))
    ax.text(5.0, 5.25, '← ressecção de pele/tecido redundante (pós-bariátrico) →',
            ha='center', fontsize=7.5, color='#B71C1C', fontstyle='italic')

    # Principais indicações
    ax.text(5.0, 1.8, 'Indicação principal: ptose cutânea pós-bariátrica · '
                      'Frequentemente combinada com autoaugmentation (aponeurose) para restaurar projeção.',
            ha='center', fontsize=8.5, color='#455A64',
            bbox=dict(facecolor='#ECEFF1', edgecolor='#607D8B', boxstyle='round,pad=0.4'))

    # Risco
    ax.text(5.0, 0.7, 'Risco principal: deiscência na linha do biquíni por tensão — preservar sistema fascial profundo e evitar subminação agressiva.',
            ha='center', fontsize=8, color='#B71C1C', fontstyle='italic')

    save(fig, 'gluteoplastia', 'glut-tec-lifting-gluteo.png')


def glut_tec_retalho_flap():
    """Retalho glúteo em flap rotacional — preservação de projeção pós-bariátrica."""
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.set_xlim(0, 10); ax.set_ylim(0, 7); ax.axis('off')

    ax.set_title('Retalho glúteo em flap — autoaugmentation avançada',
                 fontsize=12, fontweight='bold', pad=10)

    # Glúteo
    ax.add_patch(mpatches.Ellipse((5.0, 3.5), 6.0, 4.0, facecolor='#FFE0B2',
                                   edgecolor='#8D6E63', linewidth=1.5))

    # Incisão superior + desenho do retalho (de base superolateral)
    ax.plot([2.5, 5.0, 7.5], [5.4, 5.1, 5.4], color='#C62828', linewidth=2.5)

    # Retalho delineado (desepitelizado + elevado em bloco)
    retalho = plt.Polygon([(3.5, 2.5), (6.5, 2.5), (6.8, 4.2), (3.2, 4.2)],
                           facecolor='#FFA726', edgecolor='#E65100',
                           linewidth=2, alpha=0.75, hatch='//')
    ax.add_patch(retalho)
    ax.text(5.0, 3.35, 'RETALHO\ndermogorduroso\ndesepitelizado',
            ha='center', va='center', fontsize=8.5, color='#BF360C', fontweight='bold')

    # Arco de rotação
    ax.annotate('', xy=(5.0, 4.8), xytext=(5.0, 3.3),
                arrowprops=dict(arrowstyle='->', color='#1B5E20', lw=2.5,
                                connectionstyle="arc3,rad=0.3"))
    ax.text(5.5, 4.0, 'Rotação\nsuperior\n(enrolamento)',
            fontsize=8, color='#1B5E20', fontweight='bold')

    # Pedículo (base de origem vascular)
    ax.plot([3.2, 6.8], [4.2, 4.2], color='#E91E63', linewidth=4, solid_capstyle='round')
    ax.text(5.0, 4.5, 'Base vascular preservada (perfurantes da a. glútea superior)',
            ha='center', fontsize=8, color='#880E4F', fontweight='bold')

    # Variantes (labels)
    ax.text(1.0, 2.3, 'VARIANTES:', fontsize=9, fontweight='bold', color='#455A64')
    ax.text(1.0, 1.8, '• Centurion (De la Peña): crescente central', fontsize=8, color='#455A64')
    ax.text(1.0, 1.4, '• Colwell: retalho elíptico transverso', fontsize=8, color='#455A64')
    ax.text(1.0, 1.0, '• Raposo-do-Amaral: dobra + ancoragem', fontsize=8, color='#455A64')

    ax.text(5.0, 0.3, 'Diferencial vs. autoaugmentation simples: retalho em flap é desepitelizado, mantém vascularização e gera projeção mais durável.',
            ha='center', fontsize=8, fontstyle='italic', color='#455A64')

    save(fig, 'gluteoplastia', 'glut-tec-retalho-flap.png')


def glut_tec_combinada_matrix():
    """Matriz de combinações em gluteoplastia."""
    fig, ax = plt.subplots(figsize=(11, 6.5))
    ax.set_xlim(0, 11); ax.set_ylim(0, 6.5); ax.axis('off')

    ax.set_title('Gluteoplastia combinada — matriz decisória',
                 fontsize=12, fontweight='bold', pad=10)

    # Cabeçalhos (objetivos)
    headers = ['Projeção central', 'Contorno lateral', 'Ptose/pele excedente']
    for i, h in enumerate(headers):
        draw_box(ax, 2.8 + i*2.8, 5.7, 2.5, 0.7, h, color='#37474F', fontsize=10)

    # Linhas (técnicas)
    techs = [
        ('Implante\n(subfascial/intramuscular)', '★★★', '★', '—'),
        ('Lipoenxertia (BBL)', '★★', '★★★', '★'),
        ('Lifting (suspensão)', '—', '★', '★★★'),
        ('Autoaugmentation (retalho)', '★★', '★', '★★'),
    ]

    y_start = 4.7
    for i, (name, c1, c2, c3) in enumerate(techs):
        y = y_start - i*0.95
        draw_box(ax, 1.0, y, 1.8, 0.7, name, color='#1976D2', fontsize=8.5)
        for j, score in enumerate([c1, c2, c3]):
            color = '#E8F5E9' if '★' in score else '#ECEFF1'
            text_color = '#1B5E20' if '★' in score else '#455A64'
            ax.add_patch(mpatches.Rectangle((1.55 + (j+1)*2.8 - 1.25, y-0.35), 2.5, 0.7,
                                             facecolor=color, edgecolor='#607D8B', linewidth=0.8))
            ax.text(1.55 + (j+1)*2.8, y, score, ha='center', va='center',
                    fontsize=12, color=text_color, fontweight='bold')

    # Combinações clássicas (footer)
    combos = ('Combinações clássicas: Implante + BBL (projeção + contorno lateral) · '
              'Implante + Retalho (pós-bariátrico com volume insuficiente) · '
              'BBL + Lifting (ptose + hipotrofia)')
    ax.text(5.5, 0.5, combos, ha='center', va='center', fontsize=8.5,
            bbox=dict(facecolor='#FFF3E0', edgecolor='#F57C00', boxstyle='round,pad=0.4'))

    save(fig, 'gluteoplastia', 'glut-tec-combinada-matrix.png')


def glut_tec_etching_hdbs():
    """Gluteal etching / HDBS — áreas de marcação em vista posterior."""
    fig, ax = plt.subplots(figsize=(9, 8))
    ax.set_xlim(0, 9); ax.set_ylim(0, 8); ax.axis('off')

    ax.set_title('Gluteal etching — contorno glúteo de alta definição (HDBS)',
                 fontsize=12, fontweight='bold', pad=10)

    # Silhueta posterior
    # Dorso
    ax.add_patch(mpatches.FancyBboxPatch((2.0, 5.5), 5.0, 1.5,
                                          boxstyle="round,pad=0.1",
                                          facecolor='#FFE0B2', edgecolor='#8D6E63', linewidth=1.5))
    # Cintura (cintura estreita via PMI)
    ax.add_patch(mpatches.FancyBboxPatch((2.8, 4.8), 3.4, 0.8,
                                          boxstyle="round,pad=0.1",
                                          facecolor='#FFE0B2', edgecolor='#8D6E63', linewidth=1.5))
    # Glúteos
    for cx in [3.2, 5.8]:
        ax.add_patch(mpatches.Ellipse((cx, 3.3), 2.2, 2.5, facecolor='#FFE0B2',
                                       edgecolor='#8D6E63', linewidth=1.5))
    # Coxas
    ax.add_patch(mpatches.FancyBboxPatch((2.2, 0.5), 2.0, 1.8,
                                          boxstyle="round,pad=0.1",
                                          facecolor='#FFE0B2', edgecolor='#8D6E63', linewidth=1.5))
    ax.add_patch(mpatches.FancyBboxPatch((4.8, 0.5), 2.0, 1.8,
                                          boxstyle="round,pad=0.1",
                                          facecolor='#FFE0B2', edgecolor='#8D6E63', linewidth=1.5))

    # Triângulo sacral (V-shape, aspirar para definição)
    sacral = plt.Polygon([(3.8, 5.1), (5.2, 5.1), (4.5, 3.8)],
                          facecolor='#FF7043', edgecolor='#BF360C', linewidth=2, alpha=0.75)
    ax.add_patch(sacral)
    ax.text(4.5, 4.5, 'V\nsacral', ha='center', va='center', fontsize=9,
            color='white', fontweight='bold')

    # Fossetas de Vênus (Dimples of Venus)
    ax.plot(3.8, 5.15, 'o', markersize=10, color='#4A148C', markeredgecolor='white', markeredgewidth=1.5)
    ax.plot(5.2, 5.15, 'o', markersize=10, color='#4A148C', markeredgecolor='white', markeredgewidth=1.5)
    ax.text(2.2, 5.15, 'Fossetas\nde Vênus', fontsize=7.5, ha='right',
            color='#4A148C', fontweight='bold')

    # Dobras paralumbares (linhas que levam ao V)
    ax.plot([2.5, 3.8], [6.5, 5.1], color='#BF360C', linewidth=1.5, linestyle='--')
    ax.plot([6.5, 5.2], [6.5, 5.1], color='#BF360C', linewidth=1.5, linestyle='--')
    ax.text(1.8, 6.5, 'Linhas\nparalumbares', fontsize=7.5, ha='right', color='#BF360C')

    # Áreas de deep etching (vermelho) e blending (laranja)
    # Lateral ao glúteo (flanco)
    ax.add_patch(mpatches.Ellipse((1.5, 3.5), 0.8, 1.8, facecolor='#E53935', alpha=0.5))
    ax.add_patch(mpatches.Ellipse((7.5, 3.5), 0.8, 1.8, facecolor='#E53935', alpha=0.5))

    # Legenda
    ax.add_patch(mpatches.Rectangle((0.3, 0.6), 0.3, 0.3, facecolor='#FF7043', alpha=0.75))
    ax.text(0.7, 0.75, 'Deep etching (aspiração agressiva)', fontsize=7.5, va='center')
    ax.add_patch(mpatches.Rectangle((0.3, 0.2), 0.3, 0.3, facecolor='#E53935', alpha=0.5))
    ax.text(0.7, 0.35, 'Blending (transição suave)', fontsize=7.5, va='center')

    # Footer
    ax.text(4.5, 7.5, 'Hoyos & Millard (HDBS, 2014): marcação em 4 zonas — '
                      'V sacral, fossetas de Vênus, paralumbares, lateral glútea.',
            ha='center', fontsize=8, fontstyle='italic', color='#455A64')

    save(fig, 'gluteoplastia', 'glut-tec-etching-hdbs.png')


# ============================================================
# CONTORNO POS-BARIATRICO DIAGRAMS
# ============================================================

def _cpb_torso_outline(ax, cx=5, top=8, bottom=0.5, scale=1.0):
    """Silhueta frontal simplificada de tronco pos-bariatrico (pele redundante)."""
    # Tronco
    ax.plot([cx-1.8, cx-2.2, cx-2.5, cx-2.3, cx-1.8], [top, top-1.5, top-3, top-5, bottom+1], color='#455A64', linewidth=1.8)
    ax.plot([cx+1.8, cx+2.2, cx+2.5, cx+2.3, cx+1.8], [top, top-1.5, top-3, top-5, bottom+1], color='#455A64', linewidth=1.8)

def cpb_anat_mama_ptose():
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.set_xlim(0, 10); ax.set_ylim(0, 8); ax.set_aspect('equal'); ax.axis('off')
    ax.text(5, 7.6, 'Mama Pós-Bariátrica — Ptose Grau III e Pseudoptose', ha='center', fontsize=13, fontweight='bold', color='#1A237E')
    # Perfil lateral esquerdo (pre) e direito (bari)
    # Normal (esquerda)
    ax.text(2.5, 6.8, 'Pré (normal)', ha='center', fontsize=10, fontweight='bold', color='#2E7D32')
    ax.plot([2, 3.5, 3.8, 3.5, 2], [6, 5.8, 5, 4.2, 4], color='#2E7D32', linewidth=2)
    ax.plot([2, 2], [4, 6], color='#2E7D32', linewidth=2)
    ax.plot(3.5, 5, 'o', markersize=8, color='#D84315')  # CAM
    ax.axhline(y=4, xmin=0.15, xmax=0.4, color='#2E7D32', linestyle='--', linewidth=1)
    ax.text(3.9, 4, 'IMF', fontsize=8, color='#2E7D32', va='center')
    # Pos-bariatrico (direita)
    ax.text(7.5, 6.8, 'Pós-bariátrico', ha='center', fontsize=10, fontweight='bold', color='#C62828')
    ax.plot([7, 8.3, 8.8, 8.5, 8, 7], [6, 5.9, 5.2, 3.5, 2.8, 3], color='#C62828', linewidth=2)
    ax.plot([7, 7], [3, 6], color='#C62828', linewidth=2)
    ax.plot(8.4, 3.2, 'o', markersize=8, color='#D84315')  # CAM abaixo do IMF
    ax.axhline(y=3.8, xmin=0.7, xmax=0.9, color='#C62828', linestyle='--', linewidth=1)
    ax.text(8.95, 3.8, 'IMF', fontsize=8, color='#C62828', va='center')
    ax.annotate('CAM abaixo\ndo sulco', xy=(8.4, 3.2), xytext=(9.3, 2.2), fontsize=8, color='#C62828',
                arrowprops=dict(arrowstyle='->', color='#C62828'))
    ax.annotate('Pele redundante\n+ esvaziamento\ndo polo superior', xy=(7.5, 4.5), xytext=(5.1, 5.5), fontsize=8, color='#455A64',
                arrowprops=dict(arrowstyle='->', color='#455A64'))
    # Footer
    ax.text(5, 0.8, 'Regnault III: CAM abaixo do IMF e voltado para baixo. Pseudoptose (CAM acima do IMF mas\npolo inferior pendular) comum em pós-bariátrico por perda de volume + elasticidade cutânea.',
            ha='center', fontsize=8, style='italic', color='#455A64')
    save(fig, 'contorno-pos-bariatrico', 'cpb-anat-mama-ptose-bariatrica.png')


def cpb_anat_face_pescoco():
    fig, ax = plt.subplots(figsize=(9, 8))
    ax.set_xlim(0, 9); ax.set_ylim(0, 8); ax.set_aspect('equal'); ax.axis('off')
    ax.text(4.5, 7.6, 'Face e Pescoço Pós-Bariátricos — Deflação e Flacidez', ha='center', fontsize=12, fontweight='bold', color='#1A237E')
    # Perfil facial esquematico
    ax.plot([3, 3.2, 3.5, 3.8, 4, 4.2, 4.3, 4.2, 4, 3.7, 3.5, 3, 2.5, 2.3, 2.5, 3, 3.5],
            [6.5, 6.2, 6.0, 5.7, 5.3, 5.0, 4.6, 4.3, 4.1, 4.0, 3.8, 3.5, 3.3, 3.0, 2.5, 2.2, 2.0],
            color='#37474F', linewidth=2)
    # Jowl (mandibula pendente)
    ax.plot([3.7, 3.9, 4.0, 3.9, 3.6], [3.8, 3.5, 3.2, 2.9, 2.8], color='#C62828', linewidth=2)
    ax.annotate('Jowls\n(flacidez\nmandibular)', xy=(3.9, 3.3), xytext=(5.5, 3.3), fontsize=9, color='#C62828',
                arrowprops=dict(arrowstyle='->', color='#C62828'))
    # Sulco nasolabial e marioneta
    ax.plot([4.0, 3.8], [4.7, 4.1], color='#F57C00', linewidth=1.5)
    ax.plot([3.7, 3.5], [4.2, 3.5], color='#F57C00', linewidth=1.5)
    ax.annotate('Sulco\nnasolabial\nprofundo', xy=(3.9, 4.4), xytext=(5.5, 4.8), fontsize=9, color='#F57C00',
                arrowprops=dict(arrowstyle='->', color='#F57C00'))
    # Submento flacido
    ax.plot([3.5, 3.2, 3.0, 2.7], [3.3, 2.9, 2.7, 2.5], color='#C62828', linewidth=2)
    ax.annotate('Submento\nptótico\n(platisma banda)', xy=(3.1, 2.7), xytext=(5.5, 2.2), fontsize=9, color='#C62828',
                arrowprops=dict(arrowstyle='->', color='#C62828'))
    # Angulo cervicomental obtuso
    ax.plot([2.8, 2.5], [2.6, 2.0], color='#7B1FA2', linewidth=1.5, linestyle='--')
    ax.text(1.5, 1.8, 'Ângulo\ncervicomental\n> 120° (obtuso)', fontsize=9, color='#7B1FA2')
    # Deflação malar
    ax.add_patch(mpatches.Ellipse((3.7, 5.0), 0.5, 0.4, facecolor='#FFEE58', alpha=0.5))
    ax.annotate('Deflação\nmalar', xy=(3.7, 5.0), xytext=(5.5, 6.0), fontsize=9, color='#795548',
                arrowprops=dict(arrowstyle='->', color='#795548'))
    ax.text(4.5, 0.7, 'Perda ponderal massiva → deflação de compartimentos graxos (malar, buccal, temporal)\n+ flacidez SMAS/platisma → envelhecimento facial 10–15 anos precoce.',
            ha='center', fontsize=8.5, style='italic', color='#455A64')
    save(fig, 'contorno-pos-bariatrico', 'cpb-anat-face-pescoco-ptose.png')


def _incisao_coxa(ax, title, color, path, caption):
    """Helper: silhueta de coxa frontal com linha de incisao."""
    ax.set_xlim(0, 10); ax.set_ylim(0, 9); ax.set_aspect('equal'); ax.axis('off')
    ax.text(5, 8.6, title, ha='center', fontsize=12, fontweight='bold', color='#1A237E')
    # Coxa (cone invertido suave)
    ax.plot([3.5, 3.0, 2.5, 2.7, 3.0], [7.5, 5.5, 3.0, 1.0, 0.5], color='#455A64', linewidth=2)
    ax.plot([6.5, 7.0, 7.5, 7.3, 7.0], [7.5, 5.5, 3.0, 1.0, 0.5], color='#455A64', linewidth=2)
    # Linha da virilha
    ax.plot([3.5, 6.5], [7.5, 7.5], color='#455A64', linewidth=1.5)
    # Incisao
    for seg in path:
        ax.plot(seg[0], seg[1], color=color, linewidth=3)
    ax.text(5, 0.3, caption, ha='center', fontsize=8.5, style='italic', color='#455A64')


def cpb_tec_cruroplastia_medial():
    fig, ax = plt.subplots(figsize=(10, 9))
    _incisao_coxa(ax, 'Cruroplastia Medial — Incisão Horizontal Inguinal', '#E53935',
                  [([3.8, 6.2], [7.3, 7.3])],
                  'Incisão no sulco inguinal; ressecção de elipse medial; ancoragem em fáscia de Colles.')
    # Elipse de ressecao
    ax.add_patch(mpatches.Ellipse((5, 7.0), 2.6, 0.6, facecolor='#EF9A9A', alpha=0.4, edgecolor='#E53935', linewidth=1.5, linestyle='--'))
    ax.annotate('Elipse de\nressecção', xy=(5, 6.7), xytext=(7.5, 6.2), fontsize=9, color='#E53935',
                arrowprops=dict(arrowstyle='->', color='#E53935'))
    save(fig, 'contorno-pos-bariatrico', 'cpb-tec-cruroplastia-medial.png')


def cpb_tec_cruroplastia_vertical():
    fig, ax = plt.subplots(figsize=(10, 9))
    _incisao_coxa(ax, 'Cruroplastia Vertical — Incisão Longitudinal Medial', '#E53935',
                  [([4.7, 4.7], [7.3, 2.0]), ([3.8, 6.2], [7.3, 7.3])],
                  'Incisão em "L": horizontal inguinal + longitudinal medial até joelho; indicado para excesso vertical.')
    # Area de ressecao (fusiforme vertical)
    ax.add_patch(mpatches.Polygon([[4.2, 7.3],[5.2, 7.3],[5.0, 2.0],[4.4, 2.0]], facecolor='#EF9A9A', alpha=0.4, edgecolor='#E53935', linewidth=1.5, linestyle='--'))
    ax.annotate('Cicatriz visível\nna face medial', xy=(5.0, 4.5), xytext=(7.0, 4.5), fontsize=9, color='#E53935',
                arrowprops=dict(arrowstyle='->', color='#E53935'))
    save(fig, 'contorno-pos-bariatrico', 'cpb-tec-cruroplastia-vertical.png')


def cpb_tec_cruroplastia_360():
    fig, ax = plt.subplots(figsize=(10, 9))
    _incisao_coxa(ax, 'Cruroplastia Circunferencial (Thighplasty 360°)', '#E53935',
                  [([3.8, 6.2], [7.3, 7.3]), ([3.0, 3.5], [4.0, 3.0]), ([6.5, 7.0], [4.0, 3.0])],
                  'Combina incisão inguinal medial + lateral (com lower body lift). Risco maior de linfedema.')
    # Circunferencial implicado
    ax.add_patch(mpatches.Ellipse((5, 4.0), 4.5, 1.5, facecolor='none', edgecolor='#E53935', linewidth=2, linestyle='--'))
    ax.text(5, 4.0, 'Ressecção 360°', ha='center', fontsize=9, color='#E53935', fontweight='bold')
    save(fig, 'contorno-pos-bariatrico', 'cpb-tec-cruroplastia-360.png')


def cpb_tec_scarpa_aly():
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.set_xlim(0, 10); ax.set_ylim(0, 7); ax.set_aspect('equal'); ax.axis('off')
    ax.text(5, 6.6, 'Fixação de Scarpa ao Periósteo — Técnica de Aly', ha='center', fontsize=13, fontweight='bold', color='#1A237E')
    # Corte sagital
    # Pele
    ax.add_patch(mpatches.Rectangle((1, 5.0), 8, 0.4, facecolor='#FFE0B2', edgecolor='#8D6E63'))
    ax.text(0.6, 5.2, 'Pele', fontsize=9, ha='right', color='#8D6E63')
    # TCSC superficial + Scarpa + TCSC profundo
    ax.add_patch(mpatches.Rectangle((1, 4.0), 8, 1.0, facecolor='#FFF59D', edgecolor='#F9A825'))
    ax.text(0.6, 4.5, 'Subcutâneo\nsuperficial', fontsize=8, ha='right', color='#F9A825')
    ax.plot([1, 9], [4.0, 4.0], color='#1A237E', linewidth=2.5)
    ax.text(0.6, 4.0, 'Fáscia de\nScarpa', fontsize=9, ha='right', color='#1A237E', fontweight='bold')
    ax.add_patch(mpatches.Rectangle((1, 3.2), 8, 0.8, facecolor='#FFF59D', edgecolor='#F9A825', alpha=0.6))
    # Aponeurose + periosteo do pubis
    ax.add_patch(mpatches.Rectangle((1, 2.8), 8, 0.4, facecolor='#90A4AE', edgecolor='#455A64'))
    ax.text(0.6, 3.0, 'Aponeurose\nreto abdominal', fontsize=8, ha='right', color='#455A64')
    # Pubis (periosteo)
    ax.add_patch(mpatches.Rectangle((3.5, 2.3), 3, 0.5, facecolor='#F5F5DC', edgecolor='#5D4037', linewidth=2))
    ax.text(5, 2.55, 'Púbis (periósteo)', ha='center', fontsize=8, color='#5D4037')
    # Suturas de ancoragem (3)
    for x in [4.0, 5.0, 6.0]:
        ax.plot([x, x], [4.0, 2.8], color='#C62828', linewidth=2.5)
        ax.plot(x, 4.0, 'o', markersize=5, color='#C62828')
        ax.plot(x, 2.8, 'o', markersize=5, color='#C62828')
    ax.annotate('Scarpa ancorada no\nperiósteo do púbis\n(3–5 pontos não-absorvíveis)', xy=(5, 3.4), xytext=(7.5, 1.8), fontsize=9, color='#C62828',
                arrowprops=dict(arrowstyle='->', color='#C62828'))
    ax.text(5, 0.9, 'Aly (PRS 2003): ancoragem previne migração cicatricial cranial + reduz seroma\n(converte espaço morto em cavidade fechada).', ha='center', fontsize=8.5, style='italic', color='#455A64')
    save(fig, 'contorno-pos-bariatrico', 'cpb-tec-fixacao-scarpa-aly.png')


def cpb_tec_l_braquioplastia():
    fig, ax = plt.subplots(figsize=(10, 8))
    ax.set_xlim(0, 10); ax.set_ylim(0, 8); ax.set_aspect('equal'); ax.axis('off')
    ax.text(5, 7.6, 'L-Braquioplastia — Extensão ao Tórax Lateral', ha='center', fontsize=13, fontweight='bold', color='#1A237E')
    # Torso + brazo em abducao
    # Torso
    ax.add_patch(mpatches.Rectangle((3.5, 1.5), 3, 4.5, facecolor='#ECEFF1', edgecolor='#455A64', linewidth=1.5))
    # Braço estendido lateralmente
    ax.add_patch(mpatches.Polygon([[6.5, 5.8], [9.5, 5.5], [9.5, 4.7], [6.5, 4.3]], facecolor='#ECEFF1', edgecolor='#455A64', linewidth=1.5))
    # Axila
    ax.plot(6.5, 5.0, 'o', markersize=6, color='#455A64')
    # Incisao em L
    # Braço (medial, do epicôndilo à axila)
    ax.plot([9.3, 6.7], [5.0, 5.0], color='#E53935', linewidth=3)
    # Tórax lateral (continuação vertical descendente)
    ax.plot([6.5, 6.5], [5.0, 2.5], color='#E53935', linewidth=3)
    ax.annotate('Segmento\nbraquial', xy=(8.0, 5.0), xytext=(8.0, 6.5), fontsize=9, color='#E53935',
                arrowprops=dict(arrowstyle='->', color='#E53935'))
    ax.annotate('Extensão\ntorácica lateral\n(correção dog-ear\n+ dobra axilar)', xy=(6.5, 3.5), xytext=(2.0, 3.5), fontsize=9, color='#E53935',
                arrowprops=dict(arrowstyle='->', color='#E53935'))
    ax.text(5, 0.8, 'Indicada quando dog-ear axilar ou dobra torácica lateral não resolvem com braquioplastia\nclássica. Cicatriz em "L" — axila é o ponto de articulação.', ha='center', fontsize=8.5, style='italic', color='#455A64')
    save(fig, 'contorno-pos-bariatrico', 'cpb-tec-l-braquioplastia.png')


def _mama_frontal(ax, cx=5, cy=4.2, r=1.4, skin_color='#FFCCBC', nipple_color='#6D4C41'):
    ax.add_patch(mpatches.Circle((cx, cy), r, facecolor=skin_color, edgecolor='#8D6E63', linewidth=1.5))
    ax.plot(cx, cy, 'o', markersize=10, color=nipple_color)


def cpb_tec_mastopexia_wise():
    fig, ax = plt.subplots(figsize=(9, 8))
    ax.set_xlim(0, 9); ax.set_ylim(0, 8); ax.set_aspect('equal'); ax.axis('off')
    ax.text(4.5, 7.6, 'Mastopexia em Wise (Âncora) — Pedículo Superior', ha='center', fontsize=12, fontweight='bold', color='#1A237E')
    _mama_frontal(ax, cx=4.5, cy=4.0, r=1.8)
    # Padrão Wise (keyhole + T invertido)
    # Keyhole (circulo novo CAM)
    ax.add_patch(mpatches.Circle((4.5, 4.8), 0.35, facecolor='none', edgecolor='#E53935', linewidth=2))
    # Pilares verticais
    ax.plot([4.15, 3.8], [4.45, 2.7], color='#E53935', linewidth=2)
    ax.plot([4.85, 5.2], [4.45, 2.7], color='#E53935', linewidth=2)
    # IMF (horizontal)
    ax.plot([3.0, 6.0], [2.7, 2.7], color='#E53935', linewidth=2)
    ax.annotate('Keyhole\n(novo CAM)', xy=(4.5, 5.0), xytext=(6.5, 6.0), fontsize=9, color='#E53935',
                arrowprops=dict(arrowstyle='->', color='#E53935'))
    ax.annotate('Pilares verticais\n+ T invertido no IMF', xy=(4.5, 2.7), xytext=(6.5, 1.5), fontsize=9, color='#E53935',
                arrowprops=dict(arrowstyle='->', color='#E53935'))
    # Setas do pediculo superior
    ax.annotate('', xy=(4.5, 4.8), xytext=(4.5, 6.5), arrowprops=dict(arrowstyle='->', color='#2E7D32', lw=2))
    ax.text(3.5, 6.7, 'Pedículo superior\n(CAM vascularizado\npor perfurantes sup.)', fontsize=8, color='#2E7D32', ha='center')
    ax.text(4.5, 0.9, 'Padrão Wise: maior ressecção cutânea; ideal para gigantomastia e ptose grau III.\nCicatriz em âncora (vertical + horizontal IMF).', ha='center', fontsize=8.5, style='italic', color='#455A64')
    save(fig, 'contorno-pos-bariatrico', 'cpb-tec-mastopexia-wise.png')


def cpb_tec_mastopexia_palusa():
    fig, ax = plt.subplots(figsize=(9, 8))
    ax.set_xlim(0, 9); ax.set_ylim(0, 8); ax.set_aspect('equal'); ax.axis('off')
    ax.text(4.5, 7.6, 'Mastopexia Vertical — Pedículo Inferior (Palusa/Lejour)', ha='center', fontsize=12, fontweight='bold', color='#1A237E')
    _mama_frontal(ax, cx=4.5, cy=4.0, r=1.8)
    # Padrão vertical (sem horizontal IMF)
    ax.add_patch(mpatches.Circle((4.5, 4.8), 0.35, facecolor='none', edgecolor='#E53935', linewidth=2))
    ax.plot([4.15, 4.15], [4.45, 2.5], color='#E53935', linewidth=2)
    ax.plot([4.85, 4.85], [4.45, 2.5], color='#E53935', linewidth=2)
    ax.plot([4.15, 4.85], [2.5, 2.5], color='#E53935', linewidth=2)
    # Pediculo inferior (seta ascendente)
    ax.annotate('', xy=(4.5, 4.5), xytext=(4.5, 2.5), arrowprops=dict(arrowstyle='->', color='#2E7D32', lw=2.5))
    ax.text(3.0, 3.5, 'Pedículo\ninferior\n(perfurantes\nda IMF)', fontsize=8.5, color='#2E7D32', ha='center')
    ax.annotate('Cicatriz\nvertical apenas\n(sem sulco)', xy=(4.5, 3.5), xytext=(6.8, 3.8), fontsize=9, color='#E53935',
                arrowprops=dict(arrowstyle='->', color='#E53935'))
    ax.text(4.5, 0.9, 'Palusa/Lejour: pedículo inferior preserva sensibilidade e volume.\nCicatriz apenas vertical — bom para ptose leve a moderada.', ha='center', fontsize=8.5, style='italic', color='#455A64')
    save(fig, 'contorno-pos-bariatrico', 'cpb-tec-mastopexia-palusa.png')


def cpb_tec_mastopexia_implante():
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.set_xlim(0, 10); ax.set_ylim(0, 7); ax.set_aspect('equal'); ax.axis('off')
    ax.text(5, 6.6, 'Mastopexia com Implante — Composite Reverse (planos)', ha='center', fontsize=12, fontweight='bold', color='#1A237E')
    # Corte sagital
    ax.add_patch(mpatches.Rectangle((1, 5.2), 8, 0.3, facecolor='#FFE0B2', edgecolor='#8D6E63'))
    ax.text(0.6, 5.35, 'Pele', fontsize=9, ha='right', color='#8D6E63')
    ax.add_patch(mpatches.Rectangle((1, 4.2), 8, 1.0, facecolor='#FFF59D', edgecolor='#F9A825', alpha=0.7))
    ax.text(0.6, 4.7, 'Parênquima\nmamário', fontsize=8.5, ha='right', color='#F57C00')
    # Fascia peitoral
    ax.plot([1, 9], [4.2, 4.2], color='#1A237E', linewidth=2)
    # Musculo peitoral maior
    ax.add_patch(mpatches.Rectangle((1, 3.2), 8, 1.0, facecolor='#C62828', edgecolor='#7F0000', alpha=0.5))
    ax.text(0.6, 3.7, 'M. peitoral\nmaior', fontsize=8.5, ha='right', color='#7F0000')
    # Implante dual plane
    ax.add_patch(mpatches.Ellipse((5, 3.9), 3.5, 1.2, facecolor='#ECEFF1', edgecolor='#263238', linewidth=1.5))
    ax.text(5, 3.9, 'Implante (dual-plane)', ha='center', fontsize=9, color='#263238', fontweight='bold')
    ax.annotate('Bolso subpeitoral\nparcial (dual-plane I–III\nde Tebbetts)', xy=(5, 3.9), xytext=(8.3, 2.0), fontsize=8.5, color='#455A64',
                arrowprops=dict(arrowstyle='->', color='#455A64'))
    ax.text(5, 1.0, 'Indicação: ptose + deflação severa do polo superior. Risco de bottoming-out se pele\nfrágil — preferir implante pequeno (< 300 mL) e mastopexia generosa.', ha='center', fontsize=8.5, style='italic', color='#455A64')
    save(fig, 'contorno-pos-bariatrico', 'cpb-tec-mastopexia-implante.png')


def cpb_tec_autoaumento_dermoglandular():
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.set_xlim(0, 10); ax.set_ylim(0, 7); ax.set_aspect('equal'); ax.axis('off')
    ax.text(5, 6.6, 'Autoaumento com Retalho Dermoglandular (Polo Superior)', ha='center', fontsize=12, fontweight='bold', color='#1A237E')
    _mama_frontal(ax, cx=5, cy=3.5, r=2.0)
    # Retalho inferior sendo rotacionado para polo superior
    ax.add_patch(mpatches.Polygon([[4.3, 2.5], [5.7, 2.5], [5.4, 1.6], [4.6, 1.6]], facecolor='#F57C00', alpha=0.6, edgecolor='#E65100', linewidth=1.5, hatch='////'))
    ax.text(5, 2.0, 'Retalho\ndesepitelizado', ha='center', fontsize=8, color='white', fontweight='bold')
    # Seta de rotacao
    ax.annotate('', xy=(5, 4.8), xytext=(5, 2.3), arrowprops=dict(arrowstyle='->', color='#2E7D32', lw=3, connectionstyle="arc3,rad=-0.3"))
    ax.text(6.8, 3.8, 'Rotação cefálica\ndo retalho inferior\n→ preenche polo\nsuperior deflado', fontsize=9, color='#2E7D32')
    ax.text(5, 0.9, 'Técnicas de Graf/Ribeiro: retalho dermoglandular do polo inferior é desepitelizado\ne fixado ao m. peitoral no polo superior; evita implante.', ha='center', fontsize=8.5, style='italic', color='#455A64')
    save(fig, 'contorno-pos-bariatrico', 'cpb-tec-autoaumento-dermoglandular.png')


def cpb_tec_lifting_cervical():
    fig, ax = plt.subplots(figsize=(9, 8))
    ax.set_xlim(0, 9); ax.set_ylim(0, 8); ax.set_aspect('equal'); ax.axis('off')
    ax.text(4.5, 7.6, 'Submentoplastia + Lifting Cervical — Plicatura do Platisma', ha='center', fontsize=12, fontweight='bold', color='#1A237E')
    # Perfil de pescoco
    ax.plot([3.5, 3.3, 3.0, 2.5, 2.3, 2.5, 3.0, 3.5], [6.5, 6.0, 5.2, 4.5, 3.5, 2.5, 2.0, 1.5], color='#37474F', linewidth=2)
    ax.plot([5.5, 5.5, 5.5, 5.5, 5.5, 5.5, 5.5, 5.5], [6.5, 6.0, 5.2, 4.5, 3.5, 2.5, 2.0, 1.5], color='#37474F', linewidth=2)
    # Plicatura na linha media (corset platysmaplasty)
    for y in [5.0, 4.5, 4.0, 3.5, 3.0]:
        ax.plot([3.9, 5.1], [y, y], color='#C62828', linewidth=1.2)
    ax.annotate('Corset\nplatysmaplasty\n(plicatura medial\nem "X")', xy=(4.5, 4.0), xytext=(6.5, 4.5), fontsize=9, color='#C62828',
                arrowprops=dict(arrowstyle='->', color='#C62828'))
    # Incisao submentoniana
    ax.plot([3.5, 4.5], [6.3, 6.3], color='#E53935', linewidth=3)
    ax.annotate('Incisão\nsubmentoniana\n(2–3 cm)', xy=(4.0, 6.3), xytext=(1.5, 7.0), fontsize=9, color='#E53935',
                arrowprops=dict(arrowstyle='->', color='#E53935'))
    # Lipoaspiracao adjuvante
    ax.add_patch(mpatches.Ellipse((4.5, 5.5), 1.3, 0.8, facecolor='#FFF59D', alpha=0.4, edgecolor='#F57F17', linestyle='--'))
    ax.text(4.5, 5.5, 'Lipo adjuvante', ha='center', fontsize=8, color='#F57F17')
    ax.text(4.5, 0.7, 'Combinação: lipo submentoniana + plicatura medial do platisma + ressecção de\npele (se excesso). Ângulo cervicomental alvo: 90–105°.', ha='center', fontsize=8.5, style='italic', color='#455A64')
    save(fig, 'contorno-pos-bariatrico', 'cpb-tec-lifting-cervical.png')


def cpb_tec_facelift_smas():
    fig, ax = plt.subplots(figsize=(10, 8))
    ax.set_xlim(0, 10); ax.set_ylim(0, 8); ax.set_aspect('equal'); ax.axis('off')
    ax.text(5, 7.6, 'Facelift Pós-Bariátrico — SMAS / Composite', ha='center', fontsize=13, fontweight='bold', color='#1A237E')
    # Perfil facial
    ax.plot([4.5, 4.8, 5.3, 5.8, 6.0, 6.2, 6.3, 6.2, 6.0, 5.7, 5.5, 5.0, 4.5, 4.3, 4.5, 5.0, 5.5],
            [6.5, 6.2, 6.0, 5.7, 5.3, 5.0, 4.6, 4.3, 4.1, 4.0, 3.8, 3.5, 3.3, 3.0, 2.5, 2.2, 2.0],
            color='#37474F', linewidth=2)
    # Incisao pre/retro auricular
    ax.plot([6.0, 6.15, 6.25, 6.15, 6.0], [5.8, 5.3, 4.8, 4.3, 3.8], color='#E53935', linewidth=3)
    # Retro-auricular + couro cabeludo
    ax.plot([6.25, 6.5, 6.8], [4.8, 5.3, 5.8], color='#E53935', linewidth=3)
    ax.annotate('Incisão pré + retro-\nauricular + temporal', xy=(6.4, 5.3), xytext=(8.0, 6.0), fontsize=9, color='#E53935',
                arrowprops=dict(arrowstyle='->', color='#E53935'))
    # Vetor SMAS (alto-lateral)
    ax.annotate('', xy=(4.8, 6.0), xytext=(6.0, 4.2), arrowprops=dict(arrowstyle='->', color='#2E7D32', lw=3))
    ax.text(3.0, 5.2, 'Vetor SMAS\nalto-lateral\n(~ 30–45°\npara zigoma)', fontsize=9, color='#2E7D32', fontweight='bold')
    # Plano SMAS
    ax.plot([4.5, 6.0], [5.0, 5.0], color='#1A237E', linewidth=1.5, linestyle='--')
    ax.text(3.5, 4.8, 'Plano SMAS', fontsize=8, color='#1A237E')
    ax.text(5, 0.8, 'Pós-bariátrico exige ressecção cutânea ampla + SMAS robusto (ou composite Hamra)\npara compensar flacidez severa. Maior risco de lesão do n. facial se plano profundo.',
            ha='center', fontsize=8.5, style='italic', color='#455A64')
    save(fig, 'contorno-pos-bariatrico', 'cpb-tec-facelift-smas.png')


def cpb_tec_volume_facial_adjuvantes():
    fig, ax = plt.subplots(figsize=(9, 8))
    ax.set_xlim(0, 9); ax.set_ylim(0, 8); ax.set_aspect('equal'); ax.axis('off')
    ax.text(4.5, 7.6, 'Reabilitação de Volume Facial — Zonas de Reposição', ha='center', fontsize=12, fontweight='bold', color='#1A237E')
    # Face frontal simplificada
    ax.add_patch(mpatches.Ellipse((4.5, 4.5), 3.5, 4.5, facecolor='#FFE0B2', edgecolor='#8D6E63', linewidth=2))
    # Olhos
    ax.plot(3.7, 5.3, 'o', markersize=8, color='#37474F')
    ax.plot(5.3, 5.3, 'o', markersize=8, color='#37474F')
    # Nariz
    ax.plot([4.5, 4.5], [5.0, 4.2], color='#37474F', linewidth=1.5)
    # Boca
    ax.plot([4.0, 5.0], [3.5, 3.5], color='#37474F', linewidth=1.5)
    # Zonas de reposicao
    # Temporal
    ax.add_patch(mpatches.Circle((2.8, 6.2), 0.4, facecolor='#FFEE58', alpha=0.6, edgecolor='#F9A825'))
    ax.add_patch(mpatches.Circle((6.2, 6.2), 0.4, facecolor='#FFEE58', alpha=0.6, edgecolor='#F9A825'))
    ax.text(1.8, 6.7, 'Temporal', fontsize=8.5, color='#F57F17', ha='right')
    # Malar
    ax.add_patch(mpatches.Ellipse((3.5, 4.6), 0.5, 0.4, facecolor='#FFEE58', alpha=0.6, edgecolor='#F9A825'))
    ax.add_patch(mpatches.Ellipse((5.5, 4.6), 0.5, 0.4, facecolor='#FFEE58', alpha=0.6, edgecolor='#F9A825'))
    ax.text(2.5, 4.3, 'Malar', fontsize=8.5, color='#F57F17', ha='right')
    # Lagrima (tear trough)
    ax.add_patch(mpatches.Ellipse((3.7, 4.9), 0.35, 0.15, facecolor='#FFEE58', alpha=0.6, edgecolor='#F9A825'))
    ax.add_patch(mpatches.Ellipse((5.3, 4.9), 0.35, 0.15, facecolor='#FFEE58', alpha=0.6, edgecolor='#F9A825'))
    ax.text(6.5, 5.0, 'Tear trough', fontsize=8.5, color='#F57F17')
    # Submalar
    ax.add_patch(mpatches.Ellipse((3.6, 3.8), 0.4, 0.35, facecolor='#FFEE58', alpha=0.6, edgecolor='#F9A825'))
    ax.add_patch(mpatches.Ellipse((5.4, 3.8), 0.4, 0.35, facecolor='#FFEE58', alpha=0.6, edgecolor='#F9A825'))
    ax.text(6.5, 3.8, 'Submalar', fontsize=8.5, color='#F57F17')
    # Mandibula/pre-jowl
    ax.add_patch(mpatches.Ellipse((3.5, 2.8), 0.45, 0.25, facecolor='#FFEE58', alpha=0.6, edgecolor='#F9A825'))
    ax.add_patch(mpatches.Ellipse((5.5, 2.8), 0.45, 0.25, facecolor='#FFEE58', alpha=0.6, edgecolor='#F9A825'))
    ax.text(6.5, 2.8, 'Pré-jowl /\nmandíbula', fontsize=8.5, color='#F57F17')
    # Legenda
    ax.text(4.5, 0.9, 'Lipoenxertia (Coleman) ou preenchedor HA em 5 zonas: temporal, malar, tear trough,\nsubmalar, pré-jowl. Volumes: 2–5 mL/zona (gordura) ou 1–2 mL (HA).',
            ha='center', fontsize=8.5, style='italic', color='#455A64')
    save(fig, 'contorno-pos-bariatrico', 'cpb-tec-volume-facial-adjuvantes.png')


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

    print("\n=== LIPOASPIRACAO ===")
    lipo_pmi()
    lipo_zonas_seguranca()
    lipo_sfs_camadas()
    lipo_zonas_aderencia()
    lipo_comparativo_tecnologias()
    lipo_hdbs_marcacao()
    lipo_safe_tempos()
    lipo_canulas_por_regiao()
    lipo_ual_vaser()
    lipo_pal_oscilacao()
    lipo_lal_laser()
    lipo_rfal_bodytite()
    lipo_lipoenxertia_coleman()

    print("\n=== GLUTEOPLASTIA ===")
    glut_anat_neurovascular()
    glut_anat_musculos_camadas()
    glut_tec_bbl_safety()
    glut_tec_lifting_gluteo()
    glut_tec_retalho_flap()
    glut_tec_combinada_matrix()
    glut_tec_etching_hdbs()

    print("\n=== CONTORNO POS-BARIATRICO ===")
    cpb_anat_mama_ptose()
    cpb_anat_face_pescoco()
    cpb_tec_cruroplastia_medial()
    cpb_tec_cruroplastia_vertical()
    cpb_tec_cruroplastia_360()
    cpb_tec_scarpa_aly()
    cpb_tec_l_braquioplastia()
    cpb_tec_mastopexia_wise()
    cpb_tec_mastopexia_palusa()
    cpb_tec_mastopexia_implante()
    cpb_tec_autoaumento_dermoglandular()
    cpb_tec_lifting_cervical()
    cpb_tec_facelift_smas()
    cpb_tec_volume_facial_adjuvantes()

    print("\nDiagramas gerados com sucesso!")
