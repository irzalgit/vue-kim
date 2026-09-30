#!/usr/bin/env python3
import os
import sys
import re
import io
import math
import random
import subprocess
import asyncio

# --- Mesin render matematika (setara KaTeX untuk pipeline Python/PIL) ---
# PENTING: matplotlib harus di-import SEBELUM PIL. Di Termux, mengimpor PIL
# duluan lalu matplotlib menyebabkan segmentation fault karena bentrok
# shared library native (freetype/libjpeg) antara kedua paket.
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

from PIL import Image, ImageDraw, ImageFont

# Konfigurasi Dimensi Video Portrait TikTok / Reels / Shorts (1080 x 1920)
WIDTH = 1080
HEIGHT = 1920
FPS = 30
SAMPLE_RATE = 44100

POSSIBLE_FONTS_BOLD = [
    os.path.join(os.path.dirname(__file__), "fonts", "arialbd.ttf"),
    os.path.join(os.path.dirname(__file__), "fonts", "Arial-Bold.ttf"),
    os.path.join(os.path.dirname(__file__), "fonts", "DejaVuSans-Bold.ttf"),
    "/usr/share/fonts/truetype/msttcorefonts/arialbd.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/system/fonts/Roboto-Bold.ttf",
]

POSSIBLE_FONTS_REGULAR = [
    os.path.join(os.path.dirname(__file__), "fonts", "arial.ttf"),
    os.path.join(os.path.dirname(__file__), "fonts", "Arial.ttf"),
    os.path.join(os.path.dirname(__file__), "fonts", "DejaVuSans.ttf"),
    "/usr/share/fonts/truetype/msttcorefonts/arial.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Arial.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/system/fonts/Roboto-Regular.ttf",
]

POSSIBLE_FONTS_HAND = [
    os.path.join(os.path.dirname(__file__), "fonts", "Kalam-Regular.ttf"),
    "/usr/share/fonts/truetype/kalam/Kalam-Regular.ttf",
]

POSSIBLE_FONTS_HAND_BOLD = [
    os.path.join(os.path.dirname(__file__), "fonts", "Kalam-Bold.ttf"),
    "/usr/share/fonts/truetype/kalam/Kalam-Bold.ttf",
]


def ensure_local_font():
    font_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")
    os.makedirs(font_dir, exist_ok=True)
    font_bold = os.path.join(font_dir, "arialbd.ttf")
    font_reg = os.path.join(font_dir, "arial.ttf")
    font_hand = os.path.join(font_dir, "Kalam-Regular.ttf")
    font_hand_bold = os.path.join(font_dir, "Kalam-Bold.ttf")

    need_arial = not os.path.exists(font_bold) or os.path.getsize(font_bold) < 1000
    need_hand = not os.path.exists(font_hand) or os.path.getsize(font_hand) < 1000

    if need_arial or need_hand:
        import urllib.request
        urls = []
        if need_arial:
            urls += [
                ("https://raw.githubusercontent.com/matomo-org/travis-scripts/master/fonts/Arial_Bold.ttf", font_bold),
                ("https://raw.githubusercontent.com/matomo-org/travis-scripts/master/fonts/Arial.ttf", font_reg),
            ]
        if need_hand:
            urls += [
                ("https://raw.githubusercontent.com/google/fonts/main/ofl/kalam/Kalam-Regular.ttf", font_hand),
                ("https://raw.githubusercontent.com/google/fonts/main/ofl/kalam/Kalam-Bold.ttf", font_hand_bold),
            ]
        for url, dest in urls:
            try:
                urllib.request.urlretrieve(url, dest)
            except Exception:
                pass


ensure_local_font()


def find_first_existing_font(font_list):
    for f in font_list:
        if os.path.exists(f) and os.path.getsize(f) > 1000:
            return f
    return None


FONT_PATH = find_first_existing_font(POSSIBLE_FONTS_BOLD)
FONT_REGULAR = find_first_existing_font(POSSIBLE_FONTS_REGULAR)
FONT_HAND = find_first_existing_font(POSSIBLE_FONTS_HAND)
FONT_HAND_BOLD = find_first_existing_font(POSSIBLE_FONTS_HAND_BOLD) or FONT_HAND


def get_font(size, bold=True):
    target = FONT_PATH if bold else (FONT_REGULAR or FONT_PATH)
    if target and os.path.exists(target):
        try:
            return ImageFont.truetype(target, size)
        except Exception:
            pass
    for name in ["FreeSansBold.ttf" if bold else "FreeSans.ttf", "DejaVuSans-Bold.ttf" if bold else "DejaVuSans-Bold.ttf", "Roboto-Bold.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            pass
    try:
        return ImageFont.load_default(size=size)
    except Exception:
        return ImageFont.load_default()


def get_hand_font(size, bold=False):
    target = FONT_HAND_BOLD if bold else FONT_HAND
    if target and os.path.exists(target):
        try:
            return ImageFont.truetype(target, size)
        except Exception:
            pass
    return get_font(size, bold=bold)


def draw_rounded_rect(draw, bbox, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)


def draw_pen_tip(draw, x, y, color="#F59E0B"):
    bx1, by1 = x - 2, y + 15
    bx2, by2 = x + 13, y - 15
    draw.line([(bx1, by1), (bx2, by2)], fill="#E5E7EB", width=7)
    draw.line([(bx1, by1), (bx2, by2)], fill=color, width=3)
    draw.ellipse([x - 4, y - 4, x + 4, y + 4], fill=color)


def fix_pronunciation(text):
    if not text:
        return ""
    t = text
    # Pengucapan segmen garis & huruf geometri Bahasa Indonesia
    replacements = [
        (r'\bAB\b', 'a be'),
        (r'\bBC\b', 'be ce'),
        (r'\bAC\b', 'a ce'),
        (r'\bCA\b', 'ce a'),
        (r'\bCB\b', 'ce be'),
        (r'\bCR\b', 'ce er'),
        (r'\bCQ\b', 'ce ki'),
        (r'\bBP\b', 'be pe'),
        (r'\bBQ\b', 'be ki'),
        (r'\bAP\b', 'a pe'),
        (r'\bAR\b', 'a er'),
        (r'\bPQ\b', 'pe ki'),
        (r'\bQR\b', 'ki er'),
        (r'\bPR\b', 'pe er'),
        (r'\bABC\b', 'a be ce'),
        (r'\bCQIR\b', 'ce ki i er'),
        (r'\bBPIQ\b', 'be pe i ki'),
        (r'\bQIR\b', 'ki i er'),
        (r'L_A\b', 'daerah L A'),
        (r'L_B\b', 'daerah L B'),
        (r'L_C\b', 'daerah L C'),
        (r'cm²', ' sentimeter persegi'),
        (r'cm\b', ' sentimeter'),
        (r'π', ' pi '),
        (r'≈', ' kira-kira '),
        (r'∠', 'sudut '),
        (r'≠', ' tidak sama dengan '),
        (r'≤', ' kurang dari sama dengan '),
        (r'≥', ' lebih dari sama dengan '),
        (r'√', 'akar '),
    ]
    for pattern, repl in replacements:
        t = re.sub(pattern, repl, t)
    return t


def latex_to_clean_text(text):
    if not text:
        return ""
    text = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1)/(\2)', text)
    text = re.sub(r'\\sqrt\{([^}]+)\}', r'√(\1)', text)
    text = re.sub(r'\\times', r'×', text)
    text = re.sub(r'\\cdot', r'·', text)
    text = re.sub(r'\\le|\\leq', r'≤', text)
    text = re.sub(r'\\ge|\\geq', r'≥', text)
    text = re.sub(r'\\neq', r'≠', text)
    text = re.sub(r'\\pm', r'±', text)
    text = re.sub(r'\\approx', r'≈', text)
    text = re.sub(r'\\circ', r'°', text)
    text = text.replace('^\\circ', '°')
    text = text.replace('^o', '°')
    text = text.replace('\\pi', 'π')
    text = text.replace('$', '')
    text = text.replace(r'\_', '_')
    text = text.replace('{', '').replace('}', '')
    text = text.replace(r'\ ', ' ')
    text = text.replace('\\', '')
    return text.strip()


def to_mathtext_line(text):
    if not text:
        return ""
    t = text
    t = re.sub(r'√\(([^)]+)\)', lambda m: f"$\\sqrt{{{m.group(1)}}}$", t)
    t = re.sub(r'√(\d+(?:[.,]\d+)?)', lambda m: f"$\\sqrt{{{m.group(1)}}}$", t)
    t = re.sub(r'(?<![A-Za-z.])(\d+)\s*/\s*(\d+)(?![A-Za-z.])', lambda m: f"$\\frac{{{m.group(1)}}}{{{m.group(2)}}}$", t)
    t = re.sub(r'([A-Za-z0-9\)])\^\(([^)]+)\)', lambda m: f"{m.group(1)}$^{{{m.group(2)}}}$", t)
    t = re.sub(r'([A-Za-z0-9\)])\^(-?[A-Za-z0-9]+)', lambda m: f"{m.group(1)}$^{{{m.group(2)}}}$", t)
    symbol_map = {
        '×': r'$\times$', '·': r'$\cdot$',
        '≤': r'$\leq$', '≥': r'$\geq$', '≠': r'$\neq$',
        '±': r'$\pm$', '≈': r'$\approx$', 'π': r'$\pi$',
    }
    for sym, repl in symbol_map.items():
        t = t.replace(sym, repl)
    return t


_katex_cache = {}


def render_mathtext_line(text, font_px=48, color="#FFFFFF", dpi=200):
    if not text or not text.strip():
        return None
    cache_key = (text, font_px, color)
    if cache_key in _katex_cache:
        return _katex_cache[cache_key]

    try:
        font_pt = font_px * 72.0 / dpi
        fig = plt.figure()
        fig.patch.set_alpha(0.0)
        fig.text(0, 0, text, fontsize=font_pt, color=color)
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=dpi, transparent=True, bbox_inches="tight", pad_inches=0.06)
        plt.close(fig)
        buf.seek(0)
        img = Image.open(buf).convert("RGBA")
    except Exception as e:
        return None

    _katex_cache[cache_key] = img
    return img


def draw_math_line(img, draw, xy, text, font, font_px, fill="#FFFFFF", max_width=None):
    x, y = xy
    has_math = bool(re.search(r'[√×·≤≥≠±≈π^]|\d/\d', text))
    if has_math:
        math_line = to_mathtext_line(text)
        rendered = render_mathtext_line(math_line, font_px=font_px, color=fill)
        if rendered is not None:
            if max_width and rendered.width > max_width:
                ratio = max_width / rendered.width
                new_w = max(1, int(rendered.width * ratio))
                new_h = max(1, int(rendered.height * ratio))
                rendered = rendered.resize((new_w, new_h), Image.Resampling.LANCZOS)
            img.paste(rendered, (int(x), int(y)), rendered)
            return
    draw.text((x, y), text, font=font, fill=fill)


def wrap_text(text, font, max_width):
    if not text:
        return []
    paragraphs = text.split("\n")
    all_lines = []
    for para in paragraphs:
        if not para.strip():
            all_lines.append("")
            continue
        words = para.split(" ")
        cur_line = ""
        for word in words:
            test_line = word if not cur_line else cur_line + " " + word
            bbox = font.getbbox(test_line)
            w = bbox[2] - bbox[0]
            if w <= max_width:
                cur_line = test_line
            else:
                if cur_line:
                    all_lines.append(cur_line)
                cur_line = word
        if cur_line:
            all_lines.append(cur_line)
    return all_lines


def get_options_list(question_data):
    if "pilihan" in question_data:
        p = question_data["pilihan"]
        if isinstance(p, dict):
            return [f"{k}. {v}" for k, v in sorted(p.items())]
        elif isinstance(p, list):
            return [f"{chr(65+i)}. {v}" for i, v in enumerate(p)]
    elif "pernyataan" in question_data:
        p = question_data["pernyataan"]
        if isinstance(p, dict):
            return [f"{k}. {v}" for k, v in sorted(p.items())]
        elif isinstance(p, list):
            return [f"{chr(65+i)}. {v}" for i, v in enumerate(p)]
    elif "opsi" in question_data:
        ops = question_data["opsi"]
        res = []
        for i, o in enumerate(ops):
            o_str = str(o).strip()
            if not re.match(r'^[A-E]\.', o_str):
                o_str = f"{chr(65+i)}. {o_str}"
            res.append(o_str)
        return res
    return []


def clean_option_text(text):
    return re.sub(r'^[A-E]\.\s*', '', text)


def draw_colorful_background(draw, width=WIDTH, height=HEIGHT):
    draw.rectangle([(0, 0), (width, height)], fill="#070B19")
    draw.ellipse((-150, -100, 650, 700), fill="#1E1B4B")
    draw.ellipse((400, 700, 1250, 1600), fill="#3B0764")
    draw.ellipse((-100, 1300, 700, 2050), fill="#0E4966")
    draw.ellipse((600, -50, 1180, 500), fill="#172554")


def draw_footer_watermark(draw, y_pos=1860):
    watermark_font = get_font(26, bold=True)
    text = "TikTok: @pairzal • Portal Matematika SMA"
    tb = watermark_font.getbbox(text)
    tw = tb[2] - tb[0]
    draw.text(((WIDTH - tw) // 2, y_pos), text, font=watermark_font, fill="#64748B")


def generate_diagram_image():
    img_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images", "soal_lingkaran_dalam.png")
    
    fig, ax = plt.subplots(figsize=(7.5, 6.2), dpi=250)
    fig.patch.set_facecolor('#0B1120')
    ax.set_facecolor('#0B1120')

    C = np.array([0, 0])
    B = np.array([15, 0])
    A = np.array([0, 20])
    I = np.array([5, 5])
    r = 5

    Q = np.array([5, 0])
    R = np.array([0, 5])
    P = np.array([9, 8])

    theta_C = np.linspace(np.pi, 1.5*np.pi, 60)
    arc_C = np.vstack([5 + 5*np.cos(theta_C), 5 + 5*np.sin(theta_C)]).T
    poly_C = np.vstack([[0,0], [5,0], arc_C[::-1], [0,5]])
    ax.add_patch(patches.Polygon(poly_C, closed=True, facecolor='#10B981', alpha=0.45, edgecolor='none'))

    theta_B = np.linspace(-np.pi/2, np.arctan2(3, 4), 60)
    arc_B = np.vstack([5 + 5*np.cos(theta_B), 5 + 5*np.sin(theta_B)]).T
    poly_B = np.vstack([[15,0], [5,0], arc_B, [9,8]])
    ax.add_patch(patches.Polygon(poly_B, closed=True, facecolor='#38BDF8', alpha=0.45, edgecolor='none'))

    theta_A = np.linspace(np.arctan2(3, 4), np.pi, 60)
    arc_A = np.vstack([5 + 5*np.cos(theta_A), 5 + 5*np.sin(theta_A)]).T
    poly_A = np.vstack([[0,20], [0,5], arc_A, [9,8]])
    ax.add_patch(patches.Polygon(poly_A, closed=True, facecolor='#F43F5E', alpha=0.45, edgecolor='none'))

    triangle = patches.Polygon([C, B, A], closed=True, fill=None, edgecolor='#F8FAFC', linewidth=3.5)
    ax.add_patch(triangle)

    circle = patches.Circle(I, r, fill=None, edgecolor='#FDE047', linewidth=3.0, linestyle='--')
    ax.add_patch(circle)

    ax.plot(5, 5, 'o', color='#FDE047', markersize=7)
    ax.text(5.5, 4.8, 'I (pusat)', color='#FEF08A', fontsize=12, fontweight='bold')

    ax.add_patch(patches.Rectangle((0, 0), 1.8, 1.8, fill=None, edgecolor='#F8FAFC', linewidth=2.0))

    for pt, col in [(P, '#38BDF8'), (Q, '#10B981'), (R, '#F43F5E')]:
        ax.plot(pt[0], pt[1], 'o', color='#FFFFFF', markersize=9, zorder=5)
        ax.plot(pt[0], pt[1], 'o', color=col, markersize=6, zorder=6)

    ax.text(-1.0, -1.0, 'C', color='#FFFFFF', fontsize=20, fontweight='bold', ha='right', va='top')
    ax.text(16.5, -0.6, 'B', color='#FFFFFF', fontsize=20, fontweight='bold', ha='left', va='top')
    ax.text(-1.0, 21.0, 'A', color='#FFFFFF', fontsize=20, fontweight='bold', ha='right', va='bottom')

    ax.text(10.2, 8.8, 'P', color='#38BDF8', fontsize=18, fontweight='bold')
    ax.text(5.0, -1.8, 'Q', color='#10B981', fontsize=18, fontweight='bold', ha='center', va='top')
    ax.text(-1.8, 5.0, 'R', color='#F43F5E', fontsize=18, fontweight='bold', ha='right', va='center')

    ax.text(-2.5, 10.0, 'CA = 20 cm', color='#CBD5E1', fontsize=14, fontweight='bold', ha='right', va='center', rotation=90)
    ax.text(7.5, -3.2, 'CB = 15 cm', color='#CBD5E1', fontsize=14, fontweight='bold', ha='center', va='top')
    ax.text(9.2, 12.0, 'AB = 25 cm', color='#CBD5E1', fontsize=14, fontweight='bold', ha='left', va='bottom', rotation=-53)

    ax.text(2.6, 11.5, 'L_A', color='#FDA4AF', fontsize=18, fontweight='bold', bbox=dict(boxstyle='round,pad=0.2', facecolor='#881337', edgecolor='#F43F5E', alpha=0.8))
    ax.text(10.5, 2.5, 'L_B', color='#BAE6FD', fontsize=18, fontweight='bold', bbox=dict(boxstyle='round,pad=0.2', facecolor='#0C4A6E', edgecolor='#38BDF8', alpha=0.8))
    ax.text(1.8, 1.8, 'L_C', color='#A7F3D0', fontsize=18, fontweight='bold', bbox=dict(boxstyle='round,pad=0.2', facecolor='#064E3B', edgecolor='#10B981', alpha=0.8))

    ax.set_xlim(-6, 21)
    ax.set_ylim(-6, 25)
    ax.set_aspect('equal')
    ax.axis('off')

    os.makedirs(os.path.dirname(img_path), exist_ok=True)
    plt.savefig(img_path, bbox_inches='tight', pad_inches=0.15, facecolor='#0B1120')
    plt.close()
    return img_path


def load_diagram_image(max_w=980, max_h=380):
    img_path = generate_diagram_image()
    try:
        img = Image.open(img_path).convert("RGBA")
        w, h = img.size
        ratio = min(max_w / w, max_h / h)
        new_w = max(1, int(w * ratio))
        new_h = max(1, int(h * ratio))
        return img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    except Exception:
        return None


def create_question_frame(question_data, timer_val=5, font_size=46):
    img = Image.new("RGB", (WIDTH, HEIGHT), "#070B19")
    draw = ImageDraw.Draw(img)
    draw_colorful_background(draw, WIDTH, HEIGHT)

    # Header Bar
    draw_rounded_rect(draw, (40, 45, 480, 125), radius=22, fill="#121829", outline="#3B82F6", width=2)
    draw.text((65, 70), f"♫ {question_data.get('account', '@pairzal')}", font=get_font(30, bold=True), fill="#FFFFFF")

    draw_rounded_rect(draw, (505, 45, WIDTH - 40, 125), radius=22, fill="#121829", outline="#3B82F6", width=2)
    submateri = question_data.get('elemen', 'Geometri')
    soal_num = question_data.get('nomor', 1)
    tag_text = f"SOAL #{soal_num}  •  {submateri.upper()}"
    draw.text((530, 70), tag_text, font=get_font(30, bold=True), fill="#38BDF8")

    # Question Text & Diagram Layout
    q_text = question_data.get('pertanyaan') or question_data.get('soal', '')
    clean_q = latex_to_clean_text(q_text)
    
    # Auto-scale font so full text fits perfectly
    q_font_size = 46 if len(clean_q) < 160 else 40
    q_font = get_font(q_font_size, bold=True)
    q_lines = wrap_text(clean_q, q_font, WIDTH - 140)
    line_spacing = round(q_font_size * 1.35)
    text_total_height = len(q_lines) * line_spacing

    chart_img = load_diagram_image(max_w=980, max_h=370)

    card_top = 145
    card_padding = 24
    card_bottom = card_top + card_padding + 50 + text_total_height + 15 + (chart_img.height if chart_img else 0) + 20
    # Keep card within safe bounds
    card_bottom = min(1040, max(card_bottom, 820))

    draw_rounded_rect(draw, (40, card_top, WIDTH - 40, card_bottom), radius=24, fill="#111827", outline="#4F46E5", width=2)

    tipe_text = f"Tipe: {question_data.get('tipe', 'PG')} - Lingkaran Dalam Segitiga"
    tag_font = get_font(24, bold=True)
    tb = tag_font.getbbox(tipe_text)
    tw = tb[2] - tb[0]
    draw_rounded_rect(draw, (65, card_top + 16, min(WIDTH - 65, 65 + tw + 35), card_top + 62), radius=14, fill="#1F2937", outline="#6366F1", width=1)
    draw.text((82, card_top + 24), tipe_text, font=tag_font, fill="#E0E7FF")

    y_text = card_top + 80
    for line in q_lines:
        draw_math_line(img, draw, (65, y_text), line, q_font, q_font_size, fill="#FFFFFF", max_width=WIDTH - 130)
        y_text += line_spacing

    if chart_img:
        img_x = (WIDTH - chart_img.width) // 2
        img_y = y_text + 10
        if img_y + chart_img.height > card_bottom - 10:
            img_y = card_bottom - chart_img.height - 10
        img.paste(chart_img, (img_x, img_y), chart_img)

    # Timer circle
    cx = WIDTH // 2
    cy = card_bottom + 95
    r_timer = 65
    draw.ellipse((cx - r_timer, cy - r_timer, cx + r_timer, cy + r_timer), fill="#1F2937", outline="#EC4899", width=3)
    t_font = get_font(100, bold=True)
    t_str = str(timer_val)
    tb = t_font.getbbox(t_str)
    tw = tb[2] - tb[0]
    th = tb[3] - tb[1]
    draw.text((cx - tw / 2, cy - th / 2 - tb[1]), t_str, font=t_font, fill="#F43F5E")

    # Options List
    options = get_options_list(question_data)
    n_opts = len(options)
    opt_start_y = cy + r_timer + 25
    available_opt_height = (HEIGHT - 70) - opt_start_y
    opt_gap = 12 if n_opts <= 4 else 8
    opt_height = (available_opt_height - (n_opts - 1) * opt_gap) // max(1, n_opts)
    opt_height = min(110, max(75, opt_height))

    FS_OPTION = 38 if n_opts <= 4 else 34
    opt_font = get_font(FS_OPTION, bold=True)
    opt_line_h = round(FS_OPTION * 1.15)

    for i, opt in enumerate(options):
        cur_y = opt_start_y + i * (opt_height + opt_gap)
        if cur_y + opt_height > HEIGHT - 45:
            break
        draw_rounded_rect(draw, (40, cur_y, WIDTH - 40, cur_y + opt_height), radius=18,
                          fill="#111827", outline="#374151", width=2)

        circle_letter = chr(65 + i)
        c_r = 26
        c_cy = cur_y + opt_height // 2
        draw.ellipse((65, c_cy - c_r, 65 + 2 * c_r, c_cy + c_r), fill="#1F2937", outline="#60A5FA", width=2)
        let_font = get_font(FS_OPTION, bold=True)
        ltb = let_font.getbbox(circle_letter)
        ltw = ltb[2] - ltb[0]
        lth = ltb[3] - ltb[1]
        draw.text((65 + c_r - ltw / 2, c_cy - lth / 2 - ltb[1]), circle_letter, font=let_font, fill="#60A5FA")

        clean_opt = clean_option_text(latex_to_clean_text(str(opt)))
        opt_lines = wrap_text(clean_opt, opt_font, WIDTH - 2 * c_r - 260)
        n_lines = min(len(opt_lines), 2)
        y_opt_text = cur_y + (opt_height - n_lines * opt_line_h) // 2
        for o_line in opt_lines[:2]:
            draw_math_line(img, draw, (155, y_opt_text), o_line, opt_font, FS_OPTION, fill="#FFFFFF", max_width=WIDTH - 230)
            y_opt_text += opt_line_h

    draw_footer_watermark(draw, y_pos=1870)
    return img


def create_step_frame(question_data, active_step_idx=0, font_size=58, write_progress=None):
    img = Image.new("RGB", (WIDTH, HEIGHT), "#070B19")
    draw = ImageDraw.Draw(img)
    draw_colorful_background(draw, WIDTH, HEIGHT)

    # Top Bars
    draw_rounded_rect(draw, (40, 45, 470, 125), radius=20, fill="#121829", outline="#3B82F6", width=2)
    draw.text((65, 68), f"♫ {question_data.get('account', '@pairzal')}", font=get_font(30, bold=True), fill="#FFFFFF")

    draw_rounded_rect(draw, (495, 45, WIDTH - 40, 125), radius=20, fill="#121829", outline="#3B82F6", width=2)
    draw.text((520, 68), "★ Pembahasan TKA Geometri", font=get_font(30, bold=True), fill="#FFFFFF")

    # Enlarged Diagram and Complete Question Card at Top
    thumb_img = load_diagram_image(max_w=340, max_h=240)
    
    card_top = 140
    card_bottom = 470
    draw_rounded_rect(draw, (40, card_top, WIDTH - 40, card_bottom), radius=22, fill="#111827", outline="#4F46E5", width=2)

    submateri = question_data.get('elemen', 'Geometri')
    soal_num = question_data.get('nomor', 1)
    tag_soal = f"SOAL #{soal_num} | {submateri.upper()}"
    draw.text((65, card_top + 16), tag_soal, font=get_font(24, bold=True), fill="#9CA3AF")

    q_text = question_data.get('pertanyaan') or question_data.get('soal', '')
    clean_q = latex_to_clean_text(q_text)

    text_max_w = (WIDTH - 40 - thumb_img.width - 90) if thumb_img else (WIDTH - 140)
    FS_QTEXT = 28 if len(clean_q) < 180 else 24
    q_font = get_font(FS_QTEXT, bold=True)
    q_lines = wrap_text(clean_q, q_font, text_max_w)
    q_line_h = round(FS_QTEXT * 1.3)
    y_q = card_top + 52
    for line in q_lines[:5]:
        draw_math_line(img, draw, (65, y_q), line, q_font, FS_QTEXT, fill="#FFFFFF", max_width=text_max_w)
        y_q += q_line_h

    if thumb_img:
        diag_x = WIDTH - 40 - thumb_img.width - 15
        diag_y = card_top + 16
        # Draw frame around diagram
        draw_rounded_rect(draw, (diag_x - 4, diag_y - 4, diag_x + thumb_img.width + 4, diag_y + thumb_img.height + 4), radius=12, fill="#0F172A", outline="#38BDF8", width=2)
        img.paste(thumb_img, (diag_x, diag_y), thumb_img)

    jawaban_str = question_data.get('jawaban') or question_data.get('jawaban_benar', '')
    if isinstance(jawaban_str, list):
        ans_text = f"🔑 Kunci Jawaban: {', '.join(jawaban_str)}"
    else:
        ans_text = f"🔑 Kunci Jawaban: {jawaban_str}"
    draw_rounded_rect(draw, (65, card_bottom - 60, WIDTH - 65, card_bottom - 12), radius=14, fill="#1F2937", outline="#F59E0B", width=1)
    draw_math_line(img, draw, (85, card_bottom - 50), ans_text, get_font(32, bold=True), 32, fill="#FBBF24", max_width=WIDTH - 190)

    # Budi dialog
    dlg_top, dlg_bottom = 485, 555
    draw_rounded_rect(draw, (40, dlg_top, WIDTH - 40, dlg_bottom), radius=16, fill="#111827", outline="#374151", width=2)
    draw.text((65, dlg_top + 18), "Budi: \"Bagaimana langkah penyelesaiannya, Pak Irzal?\"", font=get_font(30, bold=True), fill="#93C5FD")

    # Step Cards
    steps = question_data.get('steps', [])
    num_steps = max(1, len(steps))
    gap = 14 if num_steps <= 2 else 10

    if num_steps >= 3:
        FS_STEPTITLE = 30
        FS_DETAIL = 26
        FS_STEPBADGE = 22
    elif num_steps == 2:
        FS_STEPTITLE = 36
        FS_DETAIL = 32
        FS_STEPBADGE = 26
    else:
        FS_STEPTITLE = 40
        FS_DETAIL = 36
        FS_STEPBADGE = 28

    s_top = 575
    s_bottom = 1735
    total_avail = s_bottom - s_top
    step_h = (total_avail - (num_steps - 1) * gap) // num_steps

    step_y_coords = []
    for i in range(num_steps):
        sy_s = s_top + i * (step_h + gap)
        sy_e = sy_s + step_h
        step_y_coords.append((sy_s, sy_e))

    for idx, step in enumerate(steps):
        if idx >= len(step_y_coords):
            break
        sy_start, sy_end = step_y_coords[idx]
        if idx > active_step_idx:
            draw_rounded_rect(draw, (40, sy_start, WIDTH - 40, sy_end), radius=18,
                              fill="#0B0F19", outline="#1F2937", width=1)
            draw.text((75, sy_start + (sy_end - sy_start) // 2 - 14),
                       f"⏳ Langkah {idx + 1}...", font=get_font(FS_STEPTITLE, bold=True), fill="#4B5563")
            continue

        is_active = (idx == active_step_idx)
        bg_fill = "#111827" if is_active else "#0D111A"
        border_col = "#6366F1" if is_active else "#374151"
        border_w = 2 if is_active else 1

        draw_rounded_rect(draw, (40, sy_start, WIDTH - 40, sy_end), radius=18,
                          fill=bg_fill, outline=border_col, width=border_w)

        badge_h = min(44, max(32, step_h // 5))
        draw_rounded_rect(draw, (65, sy_start + 12, 290, sy_start + 12 + badge_h), radius=12, fill="#1F2937")
        draw.text((80, sy_start + 12 + (badge_h - FS_STEPBADGE) // 2), f"LANGKAH {idx + 1}", font=get_font(FS_STEPBADGE, bold=True), fill="#93C5FD")

        step_title = step.get('judul', '')
        clean_title = latex_to_clean_text(step_title)
        title_font = get_font(FS_STEPTITLE, bold=True)
        title_lines = wrap_text(clean_title, title_font, WIDTH - 310 - 65)
        title_line_h = round(FS_STEPTITLE * 1.15)
        y_title = sy_start + 14
        for t_line in title_lines[:2]:
            draw.text((305, y_title), t_line, font=title_font, fill="#FFFFFF")
            y_title += title_line_h

        cur_detail_y = max(sy_start + 14 + badge_h + 8, y_title + 8)
        line_detail_font = get_font(FS_DETAIL, bold=False)
        line_detail_bold = get_font(FS_DETAIL, bold=True)
        detail_spacing = round(FS_DETAIL * 1.25)

        raw_details = step.get('detail', [])
        if isinstance(raw_details, str):
            details_list = [raw_details]
        elif isinstance(raw_details, list):
            details_list = raw_details
        else:
            details_list = [str(raw_details)]

        if is_active and write_progress is not None:
            hand_font = get_hand_font(FS_DETAIL + 2, bold=False)
            wrapped_all = []
            for line in details_list:
                clean_line = latex_to_clean_text(line)
                wrapped_all.extend(wrap_text(clean_line, hand_font, WIDTH - 140))

            total_len = sum(len(l) + 1 for l in wrapped_all) or 1
            progress = max(0.0, min(1.0, write_progress))
            target_count = int(round(total_len * progress))

            cum = 0
            pen_xy = None
            for w_line in wrapped_all:
                if cur_detail_y + detail_spacing > sy_end - 8:
                    break
                remaining_target = target_count - cum
                if remaining_target <= 0:
                    break
                if remaining_target >= len(w_line):
                    draw.text((70, cur_detail_y), w_line, font=hand_font, fill="#FDE68A")
                    tw = draw.textlength(w_line, font=hand_font)
                    pen_xy = (70 + tw, cur_detail_y + FS_DETAIL * 0.55)
                    cum += len(w_line) + 1
                    cur_detail_y += detail_spacing
                else:
                    partial_txt = w_line[:remaining_target]
                    draw.text((70, cur_detail_y), partial_txt, font=hand_font, fill="#FDE68A")
                    tw = draw.textlength(partial_txt, font=hand_font)
                    pen_xy = (70 + tw, cur_detail_y + FS_DETAIL * 0.55)
                    cum = target_count
                    break

            if pen_xy and progress < 1.0:
                draw_pen_tip(draw, pen_xy[0], pen_xy[1])
        else:
            for line in details_list:
                clean_line = latex_to_clean_text(line)
                is_highlight = clean_line.startswith("★") or "Hasil =" in clean_line or "BENAR" in clean_line or "SALAH" in clean_line or "r =" in clean_line or "CR =" in clean_line or "L_B =" in clean_line or "PQ =" in clean_line
                line_font = line_detail_bold if is_highlight else line_detail_font
                wrapped_lines = wrap_text(clean_line, line_font, WIDTH - 140)
                for w_line in wrapped_lines:
                    if cur_detail_y + detail_spacing <= sy_end - 8:
                        draw_math_line(img, draw, (70, cur_detail_y), w_line, line_font, FS_DETAIL, fill="#FFFFFF", max_width=WIDTH - 150)
                        cur_detail_y += detail_spacing
                cur_detail_y += 3

    if active_step_idx >= len(steps) - 1:
        draw_rounded_rect(draw, (40, 1750, WIDTH - 40, 1890), radius=18, fill="#111827", outline="#F59E0B", width=2)
        draw.text((75, 1768), "KESIMPULAN PEMBAHASAN:", font=get_font(24, bold=True), fill="#FBBF24")
        concl_font = get_font(32, bold=True)
        if isinstance(jawaban_str, list):
            concl_text = f"Pernyataan yang tepat adalah {', '.join(jawaban_str)}."
        else:
            concl_text = f"Pilihan jawaban yang benar adalah {jawaban_str}."
        concl_line_h = round(32 * 1.25)
        c_lines = wrap_text(concl_text, concl_font, WIDTH - 140)
        y_c = 1804
        for cl in c_lines[:2]:
            draw_math_line(img, draw, (75, y_c), cl, concl_font, 32, fill="#FFFFFF", max_width=WIDTH - 150)
            y_c += concl_line_h

    draw_footer_watermark(draw, y_pos=1905)
    return img


def create_intro_frame(judul, jumlah_soal):
    img = Image.new("RGB", (WIDTH, HEIGHT), "#0A2540")
    draw = ImageDraw.Draw(img)
    draw_colorful_background(draw, WIDTH, HEIGHT)

    tag_font = get_font(34, bold=True)
    tag_text = "✨ PERSIAPAN UJIAN TKA 2026 ✨"
    tb = tag_font.getbbox(tag_text)
    tw = tb[2] - tb[0]
    draw_rounded_rect(draw, ((WIDTH - tw) / 2 - 30, 360, (WIDTH + tw) / 2 + 30, 430), radius=25, fill="#1E293B", outline="#38BDF8", width=2)
    draw.text(((WIDTH - tw) / 2, 377), tag_text, font=tag_font, fill="#38BDF8")

    title_font = get_font(56, bold=True)
    lines = wrap_text(judul, title_font, WIDTH - 160)
    
    title_h = len(lines) * 75
    box_top = 450
    box_bottom = box_top + title_h + 150
    draw_rounded_rect(draw, (70, box_top, WIDTH - 70, box_bottom), radius=35, fill="#111827", outline="#4F46E5", width=3)

    y = box_top + 40
    for line in lines:
        bbox = title_font.getbbox(line)
        w = bbox[2] - bbox[0]
        draw.text(((WIDTH - w) / 2, y), line, font=title_font, fill="#FFFFFF")
        y += 75

    sub_font = get_font(40, bold=True)
    sub_text = f"🔥 Pembahasan Lengkap {jumlah_soal} Soal 🔥"
    bbox = sub_font.getbbox(sub_text)
    w = bbox[2] - bbox[0]
    draw_rounded_rect(draw, ((WIDTH - w) / 2 - 35, y + 15, (WIDTH + w) / 2 + 35, y + 85), radius=30, fill="#FE2C55")
    draw.text(((WIDTH - w) / 2, y + 30), sub_text, font=sub_font, fill="#FFFFFF")

    diag_img = load_diagram_image(max_w=750, max_h=420)
    if diag_img:
        img.paste(diag_img, ((WIDTH - diag_img.width) // 2, box_bottom + 35), diag_img)

    info_font = get_font(34, bold=True)
    draw.text((WIDTH // 2, box_bottom + 480), "Siapkan alat tulismu & mari kita bahas bersama!", font=info_font, fill="#FBBF24", anchor="mm")

    draw_footer_watermark(draw, y_pos=1835)
    return img


def create_outro_frame():
    img = Image.new("RGB", (WIDTH, HEIGHT), "#0A2540")
    draw = ImageDraw.Draw(img)
    draw_colorful_background(draw, WIDTH, HEIGHT)

    h_font = get_font(60, bold=True)
    draw.text((WIDTH // 2, 450), "🎉 SELESAI!", font=h_font, fill="#FFFFFF", anchor="mm")

    sub_font = get_font(40, bold=True)
    draw.text((WIDTH // 2, 540), "Yuk Uji Pemahamanmu & Cek Soal Lainnya", font=sub_font, fill="#38BDF8", anchor="mm")

    draw_rounded_rect(draw, (120, 680, WIDTH - 120, 820), radius=28, fill="#111827", outline="#4F46E5", width=3)
    info_font = get_font(36, bold=True)
    draw.text((WIDTH // 2, 750), "🌐 Kunjungi Portal: www.math315.id", font=info_font, fill="#FBBF24", anchor="mm")

    draw_rounded_rect(draw, (120, 880, WIDTH - 120, 1000), radius=28, fill="#FE2C55")
    btn_font = get_font(36, bold=True)
    draw.text((WIDTH // 2, 940), "❤️ Like, Simpan & Follow @pairzal", font=btn_font, fill="#FFFFFF", anchor="mm")

    draw_footer_watermark(draw, y_pos=1835)
    return img


async def generate_voice_edge(text, output_file, pitch="+0Hz", rate="+5%"):
    import edge_tts
    voice = "id-ID-ArdiNeural"
    max_retries = 4
    for attempt in range(max_retries):
        try:
            communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
            await communicate.save(output_file)
            if os.path.exists(output_file) and os.path.getsize(output_file) > 500:
                return True
        except Exception as err:
            if attempt < max_retries - 1:
                await asyncio.sleep(1.5 * (attempt + 1))
            else:
                raise err
    return False


def generate_voice(text, output_file, is_budi=False):
    if not text or not str(text).strip():
        text = "Mari kita perhatikan langkah penyelesaian berikut ini."
    else:
        text = str(text).strip()

    clean_spoken = fix_pronunciation(text)

    if is_budi:
        pitch_hz = 18 + random.uniform(-1, 2)
        rate_pct = 12 + random.uniform(-1, 2)
    else:
        pitch_hz = random.uniform(-2, 2)
        rate_pct = random.uniform(-2, 2)

    pitch = f"{pitch_hz:+.0f}Hz"
    rate = f"{rate_pct:+.0f}%"

    try:
        asyncio.run(generate_voice_edge(clean_spoken, output_file, pitch=pitch, rate=rate))
    except Exception as e:
        print(f"Peringatan edge_tts: {e}, mencoba fallback...")
        subprocess.run(
            f"ffmpeg -y -f lavfi -i anullsrc=r={SAMPLE_RATE}:cl=mono -t 3.0 -c:a libmp3lame {output_file}",
            shell=True, check=True
        )


def get_audio_duration(file_path):
    try:
        cmd = f"ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 \"{file_path}\""
        out = subprocess.check_output(cmd, shell=True).decode().strip()
        return float(out)
    except Exception:
        return 3.0


def make_animated_combined_video(data, output_mp4, bgm_path=None, bgm_volume=0.25, font_size=46):
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_tka_geo")
    os.makedirs(temp_dir, exist_ok=True)
    images_dir = os.path.join(temp_dir, "frames")
    os.makedirs(images_dir, exist_ok=True)

    daftar_soal = data.get('soal', []) if isinstance(data, dict) else data
    kisi_kisi = data.get('kisi_kisi', 'TKA Matematika Geometri SMA') if isinstance(data, dict) else 'TKA Matematika Geometri SMA'
    print(f"=== MEMULAI GENERASI VIDEO: {len(daftar_soal)} SOAL ===")

    segment_paths = []

    # 1. Intro Segment
    print("\n1. Membuat segmen Intro...")
    intro_audio = os.path.join(temp_dir, "intro.mp3")
    intro_speech = f"Halo teman-teman pejuang TKA Matematika! Mari kita bahas kumpulan soal materi {kisi_kisi}. Siapkan alat tulismu dan ayo kita mulai!"
    generate_voice(intro_speech, intro_audio)
    intro_dur = get_audio_duration(intro_audio) + 0.8
    intro_img = os.path.join(temp_dir, "intro.png")
    create_intro_frame(kisi_kisi, len(daftar_soal)).save(intro_img)
    intro_vid = os.path.join(temp_dir, "intro.mp4")
    subprocess.run(
        f"ffmpeg -y -loop 1 -i {intro_img} -i {intro_audio} -c:v libx264 -preset ultrafast -t {intro_dur} -r {FPS} -pix_fmt yuv420p -c:a aac -ar {SAMPLE_RATE} {intro_vid}",
        shell=True, check=True
    )
    segment_paths.append(intro_vid)

    # 2. Soal-soal
    for s_idx, q_data in enumerate(daftar_soal):
        soal_num = q_data.get('nomor', s_idx + 1)
        print(f"\n--- Memproses Soal #{soal_num} ---")

        # Audio pembacaan soal
        soal_text = q_data.get('pertanyaan') or q_data.get('soal', '')
        q_spoken = q_data.get('spoken_soal') or f"Soal nomor {soal_num}. {latex_to_clean_text(soal_text)}"
        q_audio = os.path.join(temp_dir, f"q_{soal_num}_read.mp3")
        generate_voice(q_spoken, q_audio)
        q_dur = get_audio_duration(q_audio) + 0.5

        # Video pembacaan soal (Countdown 5 detik di akhir)
        q_vid = os.path.join(temp_dir, f"q_{soal_num}_read.mp4")
        q_frame_count = int(q_dur * FPS)
        timer_seconds = 5
        timer_start_frame = max(0, q_frame_count - timer_seconds * FPS)

        q_frames_dir = os.path.join(temp_dir, f"q_frames_{soal_num}")
        os.makedirs(q_frames_dir, exist_ok=True)

        # Pre-render 5 timer states freshly
        timer_frames = {}
        for t_val in range(1, 6):
            timer_frames[t_val] = create_question_frame(q_data, timer_val=t_val, font_size=font_size)

        for f in range(q_frame_count):
            if f < timer_start_frame:
                t_val = 5
            else:
                elapsed_in_timer = (f - timer_start_frame) / FPS
                t_val = max(1, 5 - int(elapsed_in_timer))
            
            f_path = os.path.join(q_frames_dir, f"frame_{f:05d}.png")
            if not os.path.isdir(q_frames_dir):
                # Folder bisa saja terhapus di tengah proses (mis. oleh
                # aplikasi pembersih memori/cache Android). Buat ulang.
                os.makedirs(q_frames_dir, exist_ok=True)
            try:
                timer_frames[t_val].save(f_path)
            except FileNotFoundError:
                os.makedirs(q_frames_dir, exist_ok=True)
                timer_frames[t_val].save(f_path)

        subprocess.run(
            f"ffmpeg -y -framerate {FPS} -i {q_frames_dir}/frame_%05d.png -i {q_audio} -c:v libx264 -preset ultrafast -t {q_dur} -r {FPS} -pix_fmt yuv420p -c:a aac -ar {SAMPLE_RATE} {q_vid}",
            shell=True, check=True
        )
        segment_paths.append(q_vid)

        # Dialog Budi
        budi_audio = os.path.join(temp_dir, f"budi_{soal_num}.mp3")
        budi_speech = "Bagaimana cara menyelesaikannya dengan cepat, Pak Irzal?"
        generate_voice(budi_speech, budi_audio, is_budi=True)
        budi_dur = get_audio_duration(budi_audio) + 0.4
        budi_img = os.path.join(temp_dir, f"budi_{soal_num}.png")
        create_step_frame(q_data, active_step_idx=0, font_size=font_size, write_progress=0.0).save(budi_img)
        budi_vid = os.path.join(temp_dir, f"budi_{soal_num}.mp4")
        subprocess.run(
            f"ffmpeg -y -loop 1 -i {budi_img} -i {budi_audio} -c:v libx264 -preset ultrafast -t {budi_dur} -r {FPS} -pix_fmt yuv420p -c:a aac -ar {SAMPLE_RATE} {budi_vid}",
            shell=True, check=True
        )
        segment_paths.append(budi_vid)

        # Langkah-langkah penyelesaian
        steps = q_data.get('steps', [])
        for step_idx, step in enumerate(steps):
            print(f"  -> Merender Langkah #{step_idx + 1}")
            st_audio = os.path.join(temp_dir, f"step_{soal_num}_{step_idx}.mp3")
            st_speech = step.get('spoken') or f"Langkah {step_idx+1}. {step.get('judul', '')}."
            generate_voice(st_speech, st_audio)
            st_dur = get_audio_duration(st_audio) + 0.6

            step_frames_dir = os.path.join(temp_dir, f"step_frames_{soal_num}_{step_idx}")
            os.makedirs(step_frames_dir, exist_ok=True)
            st_frame_count = int(st_dur * FPS)

            write_dur_frames = min(st_frame_count, int(3.5 * FPS))
            for sf in range(st_frame_count):
                prog = min(1.0, sf / max(1, write_dur_frames))
                sf_path = os.path.join(step_frames_dir, f"frame_{sf:05d}.png")
                if not os.path.isdir(step_frames_dir):
                    os.makedirs(step_frames_dir, exist_ok=True)
                frame_img = create_step_frame(q_data, active_step_idx=step_idx, font_size=font_size, write_progress=prog)
                try:
                    frame_img.save(sf_path)
                except FileNotFoundError:
                    os.makedirs(step_frames_dir, exist_ok=True)
                    frame_img.save(sf_path)

            st_vid = os.path.join(temp_dir, f"step_{soal_num}_{step_idx}.mp4")
            subprocess.run(
                f"ffmpeg -y -framerate {FPS} -i {step_frames_dir}/frame_%05d.png -i {st_audio} -c:v libx264 -preset ultrafast -t {st_dur} -r {FPS} -pix_fmt yuv420p -c:a aac -ar {SAMPLE_RATE} {st_vid}",
                shell=True, check=True
            )
            segment_paths.append(st_vid)

    # 3. Outro Segment
    print("\n3. Membuat segmen Outro...")
    outro_audio = os.path.join(temp_dir, "outro.mp3")
    outro_speech = "Nah, itulah pembahasan lengkap soal geometri lingkaran dalam segitiga. Jangan lupa like, save, follow, dan bagikan video ini ke teman-temanmu ya! Semangat belajar!"
    generate_voice(outro_speech, outro_audio)
    outro_dur = get_audio_duration(outro_audio) + 1.0
    outro_img = os.path.join(temp_dir, "outro.png")
    create_outro_frame().save(outro_img)
    outro_vid = os.path.join(temp_dir, "outro.mp4")
    subprocess.run(
        f"ffmpeg -y -loop 1 -i {outro_img} -i {outro_audio} -c:v libx264 -preset ultrafast -t {outro_dur} -r {FPS} -pix_fmt yuv420p -c:a aac -ar {SAMPLE_RATE} {outro_vid}",
        shell=True, check=True
    )
    segment_paths.append(outro_vid)

    # 4. Gabungkan semua segmen
    print("\n4. Menggabungkan seluruh segmen video...")
    concat_list = os.path.join(temp_dir, "concat.txt")
    with open(concat_list, "w") as f:
        for p in segment_paths:
            f.write(f"file '{p}'\n")

    temp_merged = os.path.join(temp_dir, "temp_merged.mp4")
    subprocess.run(
        f"ffmpeg -y -f concat -safe 0 -i {concat_list} -c:v libx264 -preset ultrafast -r {FPS} -c:a aac -ar {SAMPLE_RATE} -ac 2 -b:a 192k -pix_fmt yuv420p {temp_merged}",
        shell=True, check=True
    )

    # 5. Background music
    print("\n5. Menambahkan background musik...")
    total_dur = get_audio_duration(temp_merged)
    bgm_file = bgm_path or os.path.join(os.path.dirname(os.path.abspath(__file__)), "bgm_canon_in_d.ogg")
    
    if os.path.exists(bgm_file):
        subprocess.run(
            f"ffmpeg -y -i {temp_merged} -stream_loop -1 -i \"{bgm_file}\" -filter_complex "
            f"\"[0:a]volume=1.0[vocal];[1:a]volume={bgm_volume}[bgm];[vocal][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]\" "
            f"-map 0:v -map \"[aout]\" -c:v copy -c:a aac -ar {SAMPLE_RATE} -b:a 192k {output_mp4}",
            shell=True, check=True
        )
    else:
        subprocess.run(f"cp {temp_merged} {output_mp4}", shell=True, check=True)

    print(f"\n🎉 SELESAI! Video berhasil dibuat: {output_mp4}")


# ============================================================
# DATA SOAL LATIHAN TKA KELAS 12 - LINGKARAN DALAM SEGITIGA
# ============================================================
data_soal = {
    "kisi_kisi": "TKA Kelas 12 - Matematika - Geometri: Lingkaran Dalam Segitiga",
    "konteks_gambar": "Segitiga siku-siku ABC, siku-siku di C, dengan CA = 20 cm, CB = 15 cm, AB = 25 cm. Lingkaran dalam (incircle) menyinggung sisi AB di titik P, sisi CB di titik Q, dan sisi CA di titik R. Daerah L_A, L_B, L_C adalah daerah di dalam segitiga tetapi di luar lingkaran, masing-masing terletak dekat sudut A, B, dan C.",
    "soal": [
        {
            "nomor": 1,
            "elemen": "Geometri",
            "tipe": "PG",
            "pertanyaan": "Perhatikan segitiga siku-siku ABC (siku-siku di C) dengan CA = 20 cm, CB = 15 cm, dan AB = 25 cm. Lingkaran dalam menyinggung ketiga sisinya di titik P, Q, dan R. Jari-jari lingkaran dalam segitiga ABC adalah ....",
            "opsi": ["A. 3 cm", "B. 4 cm", "C. 5 cm", "D. 6 cm", "E. 7 cm"],
            "jawaban_benar": "C",
            "steps": [
                {
                    "judul": "Rumus jari-jari lingkaran dalam segitiga siku-siku",
                    "detail": [
                        "• Untuk segitiga siku-siku dengan sisi siku-siku a, b dan hipotenusa c:",
                        "• r = (a + b - c) / 2 = (CA + CB - AB) / 2"
                    ],
                    "spoken": "Untuk segitiga siku-siku, jari-jari lingkaran dalam dapat dihitung dengan rumus r sama dengan sisi tegak CA ditambah CB dikurang hipotenusa AB, lalu dibagi dua."
                },
                {
                    "judul": "Substitusi nilai panjang sisi",
                    "detail": [
                        "• CA = 20 cm, CB = 15 cm, AB = 25 cm",
                        "• r = (20 + 15 - 25) / 2 = (35 - 25) / 2 = 10 / 2",
                        "★ Hasil = 5 cm (Kunci Jawaban C)"
                    ],
                    "spoken": "Dengan memasukkan nilai dua puluh ditambah lima belas dikurang dua puluh lima dibagi dua, diperoleh sepuluh dibagi dua, yaitu lima sentimeter. Jawaban C."
                }
            ]
        },
        {
            "nomor": 2,
            "elemen": "Geometri",
            "tipe": "PG",
            "pertanyaan": "Titik R adalah titik singgung lingkaran dalam pada sisi CA. Panjang garis CR adalah ....",
            "opsi": ["A. 3 cm", "B. 4 cm", "C. 5 cm", "D. 10 cm", "E. 15 cm"],
            "jawaban_benar": "C",
            "steps": [
                {
                    "judul": "Analisis segiempat di sudut siku-siku C",
                    "detail": [
                        "• Titik I adalah pusat lingkaran dalam.",
                        "• Jari-jari tegak lurus garis singgung: IR ⊥ CA dan IQ ⊥ CB.",
                        "• Karena ∠C = 90°, maka segiempat CQIR memiliki 4 sudut siku-siku."
                    ],
                    "spoken": "Karena jari-jari lingkaran tegak lurus terhadap garis singgung di titik singgungnya dan sudut C bernilai sembilan puluh derajat, maka segiempat CQIR membentuk bangun persegi."
                },
                {
                    "judul": "Hitung panjang CR",
                    "detail": [
                        "• Pada persegi CQIR, semua sisi sama panjang dengan jari-jari r.",
                        "• CR = CQ = r = 5 cm",
                        "★ Hasil = 5 cm (Kunci Jawaban C)"
                    ],
                    "spoken": "Pada persegi CQIR, panjang sisi CR sama dengan panjang CQ yaitu sama dengan jari-jari r, yaitu lima sentimeter. Jawaban C."
                }
            ]
        },
        {
            "nomor": 3,
            "elemen": "Geometri",
            "tipe": "PG",
            "pertanyaan": "Luas daerah L_B, yaitu daerah di dalam segitiga ABC yang dibatasi sisi AB, sisi CB, dan busur PQ di dekat titik B, adalah ....",
            "opsi": ["A. 5,37 cm²", "B. 22,32 cm²", "C. 43,77 cm²", "D. 71,46 cm²", "E. 78,54 cm²"],
            "jawaban_benar": "B",
            "steps": [
                {
                    "judul": "Hitung garis singgung BP dan luas layang-layang BPIQ",
                    "detail": [
                        "• Setengah keliling s = (20 + 15 + 25) / 2 = 30 cm",
                        "• BP = BQ = s - CA = 30 - 20 = 10 cm",
                        "• Luas layang-layang BPIQ = r × BP = 5 × 10 = 50 cm²"
                    ],
                    "spoken": "Panjang garis singgung BP dan BQ adalah tiga puluh dikurang dua puluh sama dengan sepuluh sentimeter. Luas layang-layang BPIQ adalah lima dikali sepuluh sama dengan lima puluh sentimeter persegi."
                },
                {
                    "judul": "Hitung luas juring lingkaran PIQ",
                    "detail": [
                        "• Sudut B = arctan(20/15) ≈ 53,13°",
                        "• Sudut pusat ∠PIQ = 180° - 53,13° = 126,87° ≈ 2,2143 rad",
                        "• Luas juring PIQ = ½ × r² × θ = ½ × 25 × 2,2143 ≈ 27,68 cm²"
                    ],
                    "spoken": "Sudut pusat juring PIQ adalah seratus dua puluh enam koma delapan puluh tujuh derajat atau dua koma dua satu empat tiga radian, sehingga luas juringnya adalah dua puluh tujuh koma enam puluh delapan sentimeter persegi."
                },
                {
                    "judul": "Hitung Luas Daerah L_B",
                    "detail": [
                        "• Luas L_B = Luas Layang-layang BPIQ - Luas Juring PIQ",
                        "• L_B = 50 - 27,68 = 22,32 cm²",
                        "★ Hasil = 22,32 cm² (Kunci Jawaban B)"
                    ],
                    "spoken": "Luas daerah L B diperoleh dari luas layang-layang dikurangi luas juring, yaitu lima puluh dikurang dua puluh tujuh koma enam puluh delapan, menghasilkan dua puluh dua koma tiga puluh dua sentimeter persegi. Jawaban B."
                }
            ]
        },
        {
            "nomor": 4,
            "elemen": "Geometri",
            "tipe": "PG",
            "pertanyaan": "Jika C diletakkan sebagai titik pusat (0,0), CA pada sumbu-y, dan CB pada sumbu-x, maka jarak titik singgung P ke Q adalah ....",
            "opsi": ["A. 5√2 cm", "B. 3√10 cm", "C. 4√5 cm", "D. 2√13 cm", "E. 5√3 cm"],
            "jawaban_benar": "C",
            "steps": [
                {
                    "judul": "Tentukan koordinat titik Q dan titik P",
                    "detail": [
                        "• Titik C(0,0), A(0,20), B(15,0), Pusat I(5,5)",
                        "• Titik singgung Q pada sumbu-x (CB): Q(5, 0)",
                        "• Titik singgung P pada sisi AB: P(9, 8)"
                    ],
                    "spoken": "Dengan titik C pada koordinat nol koma nol, titik singgung Q berada di lima koma nol dan titik singgung P pada garis AB berada di sembilan koma delapan."
                },
                {
                    "judul": "Hitung jarak PQ dengan rumus Euclidean",
                    "detail": [
                        "• PQ = √[(xP - xQ)² + (yP - yQ)²]",
                        "• PQ = √[(9 - 5)² + (8 - 0)²] = √[4² + 8²] = √[16 + 64]",
                        "• PQ = √80 = 4√5 cm",
                        "★ Hasil = 4√5 cm (Kunci Jawaban C)"
                    ],
                    "spoken": "Jarak titik P ke Q adalah akar dari empat kuadrat ditambah delapan kuadrat, yaitu akar delapan puluh, yang disederhanakan menjadi empat akar lima sentimeter. Jawaban C."
                }
            ]
        },
        {
            "nomor": 5,
            "elemen": "Geometri",
            "tipe": "PG",
            "pertanyaan": "Busur QR (busur lingkaran dalam di dekat titik C, antara titik singgung Q dan R) memiliki panjang ....",
            "opsi": ["A. 5π/6 cm", "B. 5π/4 cm", "C. 5π/3 cm", "D. 5π/2 cm", "E. 5π cm"],
            "jawaban_benar": "D",
            "steps": [
                {
                    "judul": "Tentukan besar sudut pusat busur QR",
                    "detail": [
                        "• Pada segiempat CQIR, ∠C = 90°",
                        "• Sudut pusat ∠QIR = 180° - ∠C = 180° - 90° = 90° = π/2 radian"
                    ],
                    "spoken": "Karena sudut C siku-siku sembilan puluh derajat, sudut pusat lingkaran yang menghadap busur QR adalah sembilan puluh derajat atau pi per dua radian."
                },
                {
                    "judul": "Hitung panjang busur QR",
                    "detail": [
                        "• Panjang busur = r × θ = 5 × (π/2) = 5π/2 cm",
                        "★ Hasil = 5π/2 cm (Kunci Jawaban D)"
                    ],
                    "spoken": "Panjang busur adalah jari-jari dikalikan sudut pusat dalam radian, yaitu lima dikali pi per dua sama dengan lima pi per dua sentimeter. Jawaban D."
                }
            ]
        },
        {
            "nomor": 6,
            "elemen": "Geometri",
            "tipe": "PG Kompleks",
            "pertanyaan": "Berdasarkan segitiga siku-siku ABC (siku-siku di C) dengan CA = 20 cm, CB = 15 cm, AB = 25 cm, tentukan SEMUA pernyataan yang BENAR:",
            "pernyataan": {
                "A": "Jari-jari lingkaran dalam segitiga ABC adalah 5 cm.",
                "B": "Panjang AP = AR = 15 cm.",
                "C": "Luas segitiga ABC adalah 150 cm².",
                "D": "Luas L_A > Luas L_B > Luas L_C.",
                "E": "Panjang BP = BQ = 8 cm."
            },
            "jawaban_benar": ["A", "B", "C", "D"],
            "steps": [
                {
                    "judul": "Uji Pernyataan A, B, dan C",
                    "detail": [
                        "• A: r = (20+15-25)/2 = 5 cm → A BENAR",
                        "• B: AP = AR = s - CB = 30 - 15 = 15 cm → B BENAR",
                        "• C: Luas ABC = ½ × 15 × 20 = 150 cm² → C BENAR"
                    ],
                    "spoken": "Pernyataan A benar dengan jari-jari lima sentimeter. Pernyataan B benar karena panjang garis singgung AP dan AR adalah lima belas sentimeter. Pernyataan C benar karena luas segitiga adalah seratus lima puluh sentimeter persegi."
                },
                {
                    "judul": "Uji Pernyataan D dan E",
                    "detail": [
                        "• D: L_A ≈ 43,77 cm², L_B ≈ 22,32 cm², L_C ≈ 5,37 cm² (L_A > L_B > L_C) → D BENAR",
                        "• E: BP = BQ = s - CA = 30 - 20 = 10 cm (bukan 8 cm) → E SALAH",
                        "★ Jawaban Benar = A, B, C, D"
                    ],
                    "spoken": "Pernyataan D benar karena luas daerah L A paling besar diikuti L B lalu L C. Pernyataan E salah karena panjang BP adalah sepuluh sentimeter. Jadi pilihan yang benar adalah A, B, C, dan D."
                }
            ]
        }
    ]
}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate Video Animasi Pembahasan Latihan TKA Matematika (Lingkaran Dalam Segitiga)")
    parser.add_argument("output", nargs="?", default="/root/vue-kim/video_tka12_lingkaran_dalam.mp4", help="Path output video mp4")
    parser.add_argument("--bgm", default=None, help="Path file musik background")
    parser.add_argument("--vol", type=float, default=0.25, help="Volume musik latar (default: 0.25)")
    parser.add_argument("--font-size", type=int, default=46, help="Ukuran font teks (default: 46)")
    parser.add_argument("--soal", default=None, help="ID/Nomor soal tertentu yang ingin digenerate (misal: 1 atau 1,2)")
    args = parser.parse_args()

    out_dir = os.path.dirname(args.output)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    if args.soal is not None:
        target_ids = [s.strip() for s in str(args.soal).split(",") if s.strip()]
        soal_list = data_soal.get('soal', [])
        filtered = [s for s in soal_list if str(s.get('nomor', '')) in target_ids]
        if filtered:
            data_to_use = dict(data_soal)
            data_to_use['soal'] = filtered
        else:
            data_to_use = data_soal
    else:
        data_to_use = data_soal

    make_animated_combined_video(
        data_to_use,
        args.output,
        bgm_path=args.bgm,
        bgm_volume=args.vol,
        font_size=args.font_size
    )
