#!/usr/bin/env python3
import os
import sys
import re
import io
import math
import random
import shutil
import functools
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

from PIL import Image, ImageDraw, ImageFont, ImageChops

RESAMPLE = getattr(Image, "Resampling", Image).LANCZOS

# Konfigurasi Dimensi Video Portrait TikTok / Reels / Shorts (1080 x 1920)
WIDTH = 1080
HEIGHT = 1920
FPS = 30
SAMPLE_RATE = 44100
TIMER_SECONDS = 10  # lama hitung mundur (detik)
DIAGRAM_BG = "#DCDFE4"  # latar diagram: putih keabuan redup
FONT_SCALE = 1.3  # pengali semua ukuran font (1.0 = ukuran asli)


def S(x):
    return int(round(x * FONT_SCALE))

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


@functools.lru_cache(maxsize=None)
def get_font(size, bold=True):
    target = FONT_PATH if bold else (FONT_REGULAR or FONT_PATH)
    if target and os.path.exists(target):
        try:
            return ImageFont.truetype(target, size)
        except Exception:
            pass
    for name in ["FreeSansBold.ttf" if bold else "FreeSans.ttf", "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf", "Roboto-Bold.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            pass
    try:
        return ImageFont.load_default(size=size)
    except Exception:
        return ImageFont.load_default()


@functools.lru_cache(maxsize=None)
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


LETTER_SAY = {'A': 'a', 'B': 'be', 'C': 'ce', 'D': 'de', 'E': 'e', 'F': 'ef', 'G': 'ge', 'H': 'ha'}


def _spell_letters(m):
    return " ".join(LETTER_SAY[c] for c in m.group(0))


def fix_pronunciation(text):
    if not text:
        return ""
    t = text
    t = re.sub(r'(?i)\bsave\b', 'sef', t)  # "save" dibaca "sef"
    t = re.sub(r'\.{2,}', ' ', t)  # titik-titik isian tidak dibaca
    # Balok ABCD.EFGH -> "a be ce de, e ef ge ha"
    t = re.sub(r'\b([A-H]{4})\.([A-H]{4})\b', r'\1, \2', t)
    # Nama titik/rusuk/bidang (huruf A-H): AB, AG, ADGF, B, C, ... dieja per huruf
    t = re.sub(r'(?<![A-Za-z])[A-H]{1,8}(?![A-Za-z])', _spell_letters, t)
    replacements = [
        (r'(?<=\d)\s*m\b', ' meter'),
        (r'cm²', ' sentimeter persegi'),
        (r'cm³', ' sentimeter kubik'),
        (r'cm\b', ' sentimeter'),
        (r'²', ' kuadrat'),
        (r'³', ' pangkat tiga'),
        (r'=', ' sama dengan '),
        (r'×', ' kali '),
        (r'·', ' kali '),
        (r'−', ' minus '),
        (r'→', ' menjadi '),
        (r'½', ' setengah '),
        (r'(\d+)\s*/\s*(\d+)', r'\1 per \2'),
        (r'/', ' dibagi '),
        (r'°', ' derajat'),
        (r'π', ' pi '),
        (r'≈', ' kira-kira '),
        (r'∠', 'sudut '),
        (r'⟂', ' tegak lurus '),
        (r'≠', ' tidak sama dengan '),
        (r'≤', ' kurang dari sama dengan '),
        (r'≥', ' lebih dari sama dengan '),
        (r'√', ' akar '),
        (r'\s+', ' '),
    ]
    for pattern, repl in replacements:
        t = re.sub(pattern, repl, t)
    return t.strip()


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
    text = text.replace('∠', 'sudut ')  # glyph ∠ tidak ada di banyak font
    text = text.replace('★', '»').replace('⟂', '⊥')
    text = re.sub('[\U00010000-\U0010FFFF\u2600-\u27BF\uFE0F]', lambda m: m.group(0) if m.group(0) in '♫♥' else '', text)
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


def render_mathtext_line(text, font_px=48, color="#FFFFFF", dpi=200, bold=True):
    if not text or not text.strip():
        return None
    cache_key = (text, font_px, color, bold)
    if cache_key in _katex_cache:
        return _katex_cache[cache_key]

    try:
        font_pt = font_px * 72.0 / dpi
        # Bold agar setara dengan teks Arial Bold di sekitarnya
        with plt.rc_context({'mathtext.default': 'bf' if bold else 'regular'}):
            fig = plt.figure()
            fig.patch.set_alpha(0.0)
            fig.text(0, 0, text, fontsize=font_pt, color=color, fontweight='bold' if bold else 'normal')
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
        fname = os.path.basename(getattr(font, 'path', '') or '').lower()
        is_bold = ('bold' in fname) or fname.endswith('bd.ttf')
        rendered = render_mathtext_line(math_line, font_px=font_px, color=fill, bold=is_bold)
        if rendered is not None:
            ratio = 1.0
            if max_width and rendered.width > max_width:
                ratio = max_width / rendered.width
                new_w = max(1, int(rendered.width * ratio))
                new_h = max(1, int(rendered.height * ratio))
                rendered = rendered.resize((new_w, new_h), RESAMPLE)
            # Sejajarkan dengan teks PIL: buang padding kiri gambar & pusatkan secara vertikal
            x_paste = int(x - 12 * ratio)
            y_paste = int(y + 0.56 * font_px - rendered.height / 2)
            img.paste(rendered, (x_paste, y_paste), rendered)
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


def _proj(x, y, z, k=0.85, ang=np.radians(38)):
    """Proyeksi miring (kavaleri): sisi depan ABFE tampil dengan bentuk aslinya."""
    return np.array([x + k * y * np.cos(ang), z + k * y * np.sin(ang)])


# ------------------------------------------------------------
# Pembantu gambar diagram
# ------------------------------------------------------------
def _new_fig(w=8.5, h=5.6):
    fig, ax = plt.subplots(figsize=(w, h), dpi=250)
    fig.patch.set_facecolor(DIAGRAM_BG)
    ax.set_facecolor(DIAGRAM_BG)
    return fig, ax


def _save_fig(fig, ax, key, xlim, ylim):
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    ax.set_aspect('equal')
    ax.axis('off')
    img_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images", f"soal_geo_{key}.png")
    os.makedirs(os.path.dirname(img_path), exist_ok=True)
    fig.savefig(img_path, bbox_inches='tight', pad_inches=0.15, facecolor=DIAGRAM_BG)
    plt.close(fig)
    return img_path


def _seg(ax, p, q, **kw):
    ax.plot([p[0], q[0]], [p[1], q[1]], **kw)


def _right_angle(ax, corner, p, q, size=0.5, color='#1E293B', lw=1.8):
    corner = np.array(corner, dtype=float)
    u = np.array(p, dtype=float) - corner
    v = np.array(q, dtype=float) - corner
    u = u / np.linalg.norm(u) * size
    v = v / np.linalg.norm(v) * size
    ax.add_patch(patches.Polygon([corner, corner + u, corner + u + v, corner + v], closed=True,
                                 fill=None, edgecolor=color, linewidth=lw, zorder=6))


def _dim_arrow(ax, p, q, color='#334155'):
    ax.annotate('', xy=q, xytext=p,
                arrowprops=dict(arrowstyle='<->', color=color, linewidth=1.8, shrinkA=0, shrinkB=0), zorder=6)


def _cube_pts(s, ox=0.0):
    off = np.array([ox, 0.0])
    coords = {'A': (0, 0, 0), 'B': (s, 0, 0), 'C': (s, s, 0), 'D': (0, s, 0),
              'E': (0, 0, s), 'F': (s, 0, s), 'G': (s, s, s), 'H': (0, s, s)}
    return {k: _proj(*v) + off for k, v in coords.items()}


def _draw_cube(ax, P):
    for a, b in [('A', 'B'), ('B', 'F'), ('F', 'E'), ('E', 'A'), ('F', 'G'), ('G', 'H'), ('H', 'E'), ('B', 'C'), ('C', 'G')]:
        _seg(ax, P[a], P[b], color='#1E293B', linewidth=3.2, solid_capstyle='round', zorder=4)
    for a, b in [('A', 'D'), ('D', 'C'), ('D', 'H')]:
        _seg(ax, P[a], P[b], color='#475569', linewidth=2.0, linestyle=(0, (4, 3)), zorder=3)
    for k in P:
        ax.plot(P[k][0], P[k][1], 'o', color='#1E293B', markersize=7, zorder=7)


# ------------------------------------------------------------
# Soal 1: kubus ABCD.EFGH, jarak titik E ke bidang BDG
# ------------------------------------------------------------
def _diag_kubus_bdg():
    fig, ax = _new_fig()
    s = 12.0
    f = s / 6.0
    P = _cube_pts(s)
    A, B, C, D, E, F, G, H = (P[k] for k in 'ABCDEFGH')

    ax.add_patch(patches.Polygon([B, D, G], closed=True, facecolor='#F43F5E', alpha=0.33, edgecolor='none', zorder=1))
    _draw_cube(ax, P)
    for p, q in [(B, D), (D, G), (G, B)]:
        _seg(ax, p, q, color='#BE123C', linewidth=2.8, solid_capstyle='round', zorder=5)
    ax.plot(E[0], E[1], 'o', color='#059669', markersize=13, zorder=8)

    lab = dict(color='#0F172A', fontsize=S(19), fontweight='bold', zorder=8)
    ax.text(A[0] - 0.45 * f, A[1] - 0.35 * f, 'A', ha='right', va='top', **lab)
    ax.text(B[0] + 0.05 * f, B[1] - 0.4 * f, 'B', ha='center', va='top', **lab)
    ax.text(C[0] + 0.55 * f, C[1] + 0.15 * f, 'C', ha='left', va='center', **lab)
    ax.text(D[0] + 0.2 * f, D[1] - 0.25 * f, 'D', ha='left', va='top', **lab)
    ax.text(E[0] - 0.45 * f, E[1] + 0.15 * f, 'E', ha='right', va='bottom', color='#047857',
            fontsize=S(21), fontweight='bold', zorder=8)
    ax.text(F[0] - 0.25 * f, F[1] + 0.3 * f, 'F', ha='right', va='bottom', **lab)
    ax.text(G[0] + 0.35 * f, G[1] + 0.2 * f, 'G', ha='left', va='bottom', **lab)
    ax.text(H[0] - 0.2 * f, H[1] + 0.3 * f, 'H', ha='right', va='bottom', **lab)

    dim = dict(color='#334155', fontsize=S(13), fontweight='bold', zorder=8)
    ax.text(3.0, -2.6, 'rusuk = 12 cm', ha='center', va='top', **dim)

    q = 0.72 * ((B + G) / 2) + 0.28 * D
    ax.annotate('bidang BDG', xy=(q[0], q[1]), xytext=(q[0] + 7.4, q[1] - 6.0),
                ha='center', va='center', color='#BE123C', fontsize=S(14), fontweight='bold',
                arrowprops=dict(arrowstyle='-', color='#BE123C', linewidth=1.6), zorder=8)
    return _save_fig(fig, ax, 1, (-4.5, 29.0), (-6.0, 22.0))


# ------------------------------------------------------------
# Soal 2: dua tiang dan dua tali menyilang (kesebangunan)
# ------------------------------------------------------------
def _diag_tali():
    fig, ax = _new_fig()
    ax.plot([-1.6, 11.6], [0, 0], color='#64748B', linewidth=3.4, zorder=2)
    ax.plot([0, 0], [0, 6], color='#92400E', linewidth=10, solid_capstyle='round', zorder=4)
    ax.plot([10, 10], [0, 4], color='#92400E', linewidth=10, solid_capstyle='round', zorder=4)

    _seg(ax, (0, 6), (10, 0), color='#F97316', linewidth=3.2, solid_capstyle='round', zorder=5)
    _seg(ax, (10, 4), (0, 0), color='#2563EB', linewidth=3.2, solid_capstyle='round', zorder=5)

    px, py = 6.0, 2.4
    _seg(ax, (px, 0), (px, py), color='#059669', linewidth=2.6, linestyle=(0, (4, 3)), zorder=5)
    ax.plot(px, py, 'o', color='#1E293B', markersize=9, zorder=7)
    ax.plot(px, 0, 'o', color='#059669', markersize=7, zorder=7)
    ax.text(px + 0.3, py + 0.35, 'P', ha='left', va='bottom', color='#0F172A', fontsize=S(19), fontweight='bold', zorder=8)
    ax.text(px - 0.3, py / 2, 't = ?', ha='right', va='center', color='#047857', fontsize=S(16), fontweight='bold', zorder=8)

    dim = dict(color='#334155', fontsize=S(15), fontweight='bold', zorder=8)
    ax.text(-0.55, 3.0, '6 m', ha='right', va='center', **dim)
    ax.text(10.55, 2.0, '4 m', ha='left', va='center', **dim)
    _dim_arrow(ax, (0, -0.9), (10, -0.9))
    ax.text(5.0, -1.35, '10 m', ha='center', va='top', **dim)
    return _save_fig(fig, ax, 2, (-2.8, 12.6), (-2.6, 7.2))


# ------------------------------------------------------------
# Soal 3: bidang koordinat, bayangan akhir P'(10, -6)
# ------------------------------------------------------------
def _diag_transformasi():
    fig, ax = _new_fig()
    x0, x1, y0, y1 = -3, 12, -8, 4
    for v in range(x0, x1 + 1):
        ax.plot([v, v], [y0, y1], color='#B6BDC9', linewidth=0.9, zorder=1)
    for h in range(y0, y1 + 1):
        ax.plot([x0, x1], [h, h], color='#B6BDC9', linewidth=0.9, zorder=1)

    ax.plot([x0 - 0.2, x1 + 0.3], [0, 0], color='#1E293B', linewidth=2.4, zorder=3)
    ax.plot(x1 + 0.35, 0, '>', color='#1E293B', markersize=9, zorder=3)
    ax.plot([0, 0], [y0 - 0.2, y1 + 0.3], color='#1E293B', linewidth=2.4, zorder=3)
    ax.plot(0, y1 + 0.35, '^', color='#1E293B', markersize=9, zorder=3)
    ax.text(x1 + 0.6, -0.55, 'X', ha='left', va='top', color='#1E293B', fontsize=S(13), fontweight='bold')
    ax.text(0.3, y1 + 0.7, 'Y', ha='left', va='center', color='#1E293B', fontsize=S(13), fontweight='bold')

    tick = dict(color='#334155', fontsize=S(10), fontweight='bold', zorder=5)
    for v in range(x0, x1 + 1, 2):
        if v != 0:
            ax.text(v, -0.35, str(v).replace('-', '\u2212'), ha='center', va='top', **tick)
    for h in range(y0, y1 + 1, 2):
        if h != 0:
            ax.text(-0.3, h, str(h).replace('-', '\u2212'), ha='right', va='center', **tick)

    _seg(ax, (-3, -3), (4, 4), color='#BE123C', linewidth=2.4, linestyle=(0, (5, 3)), zorder=4)
    ax.text(4.2, 3.9, 'y = x', ha='left', va='center', color='#BE123C', fontsize=S(14), fontweight='bold', zorder=8)

    ax.plot(10, -6, 'o', color='#2563EB', markersize=12, zorder=7)
    ax.text(10.4, -4.9, "P'(10, \u22126)", ha='center', va='bottom', color='#1D4ED8', fontsize=S(14), fontweight='bold', zorder=8)

    ax.text(-2.8, -3.9,
            "P(a, b)\n"
            "1) rotasi 90\u00b0 (lawan jarum jam)\n"
            "2) cermin terhadap y = x\n"
            "3) dilatasi [O, 2]",
            ha='left', va='top', color='#0F172A', fontsize=S(10), fontweight='bold', linespacing=1.5, zorder=9,
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#F8FAFC', edgecolor='#94A3B8', linewidth=1.4))
    return _save_fig(fig, ax, 3, (-3.6, 13.6), (-8.4, 5.4))


# ------------------------------------------------------------
# Soal 4: kerucut terbalik berisi air dan tabung kosong
# ------------------------------------------------------------
def _diag_kerucut_tabung():
    fig, ax = _new_fig()
    R, Hc, hw = 6.0, 12.0, 6.0
    ry = 1.2  # setengah tinggi elips (perspektif)

    # air di dalam kerucut (tinggi 6 dari puncak, jari-jari 3)
    ax.add_patch(patches.Polygon([(0, 0), (-3, hw), (3, hw)], closed=True, facecolor='#60A5FA', alpha=0.55,
                                 edgecolor='none', zorder=1))
    ax.add_patch(patches.Ellipse((0, hw), 6.0, 1.2, facecolor='#3B82F6', alpha=0.65, edgecolor='#1D4ED8',
                                 linewidth=2.0, zorder=2))
    # badan kerucut
    _seg(ax, (0, 0), (-R, Hc), color='#1E293B', linewidth=3.2, solid_capstyle='round', zorder=4)
    _seg(ax, (0, 0), (R, Hc), color='#1E293B', linewidth=3.2, solid_capstyle='round', zorder=4)
    ax.add_patch(patches.Ellipse((0, Hc), 2 * R, 2 * ry, fill=None, edgecolor='#1E293B', linewidth=3.0, zorder=4))
    ax.plot(0, 0, 'o', color='#1E293B', markersize=7, zorder=7)

    _seg(ax, (0, Hc), (R, Hc), color='#F97316', linewidth=3.6, solid_capstyle='round', zorder=6)
    ax.plot(0, Hc, 'o', color='#1E293B', markersize=6, zorder=7)
    ax.text(3.0, Hc + 1.7, 'R = 6 cm', ha='center', va='bottom', color='#C2410C', fontsize=S(14), fontweight='bold', zorder=8)

    dim = dict(color='#334155', fontsize=S(14), fontweight='bold', zorder=8)
    _dim_arrow(ax, (-7.6, 0), (-7.6, Hc))
    ax.text(-8.0, Hc / 2, 't = 12 cm', ha='right', va='center', **dim)
    _dim_arrow(ax, (7.3, 0), (7.3, hw), color='#1D4ED8')
    ax.text(7.7, hw / 2, 'air 6 cm', ha='left', va='center', color='#1D4ED8', fontsize=S(14), fontweight='bold', zorder=8)

    # tanda tuang
    ax.annotate('', xy=(13.2, 10.2), xytext=(8.6, 10.2),
                arrowprops=dict(arrowstyle='->', color='#047857', linewidth=2.6), zorder=6)
    ax.text(10.9, 10.7, 'dituang', ha='center', va='bottom', color='#047857', fontsize=S(14), fontweight='bold', zorder=8)

    # tabung kosong r = 2 cm
    cx, r, th, e = 17.0, 2.0, 8.0, 0.6
    ax.add_patch(patches.Rectangle((cx - r, 0), 2 * r, th, facecolor='#93C5FD', alpha=0.25, edgecolor='none', zorder=1))
    ax.add_patch(patches.Ellipse((cx, th), 2 * r, 2 * e, facecolor='#DBEAFE', edgecolor='#1E293B', linewidth=3.0, zorder=3))
    ax.plot([cx - r, cx - r], [0, th], color='#1E293B', linewidth=3.0, zorder=4)
    ax.plot([cx + r, cx + r], [0, th], color='#1E293B', linewidth=3.0, zorder=4)
    ax.add_patch(patches.Arc((cx, 0), 2 * r, 2 * e, theta1=180, theta2=360, edgecolor='#1E293B', linewidth=3.0, zorder=4))
    ax.add_patch(patches.Arc((cx, 0), 2 * r, 2 * e, theta1=0, theta2=180, edgecolor='#475569', linewidth=1.8,
                             linestyle=(0, (4, 3)), zorder=3))
    _seg(ax, (cx, th), (cx + r, th), color='#F97316', linewidth=3.4, solid_capstyle='round', zorder=6)
    ax.plot(cx, th, 'o', color='#1E293B', markersize=6, zorder=7)
    ax.text(cx + r / 2, th + 1.0, 'r = 2 cm', ha='center', va='bottom', color='#C2410C', fontsize=S(14), fontweight='bold', zorder=8)
    _dim_arrow(ax, (cx + r + 1.0, 0), (cx + r + 1.0, th), color='#047857')
    ax.text(cx + r + 1.5, th / 2, 't = ?', ha='left', va='center', color='#047857', fontsize=S(15), fontweight='bold', zorder=8)
    return _save_fig(fig, ax, 4, (-14.0, 24.5), (-1.6, 15.6))


# ------------------------------------------------------------
# Soal 5: segitiga siku-siku dan lingkaran dalam
# ------------------------------------------------------------
def _diag_segitiga_lingkaran():
    fig, ax = _new_fig()
    A, B, C = (0.0, 0.0), (8.0, 0.0), (0.0, 6.0)
    import matplotlib as _mpl
    with _mpl.rc_context({'hatch.linewidth': 1.6}):
        ax.add_patch(patches.Polygon([A, B, C], closed=True, facecolor='#BFDBFE', edgecolor='#3B82F6',
                                     hatch='////', linewidth=0, zorder=1))
    ax.add_patch(patches.Polygon([A, B, C], closed=True, fill=None, edgecolor='#1E293B', linewidth=3.4, zorder=4))
    ax.add_patch(patches.Circle((2.0, 2.0), 2.0, facecolor=DIAGRAM_BG, edgecolor='#F97316', linewidth=3.4, zorder=3))
    ax.plot(2.0, 2.0, 'o', color='#C2410C', markersize=6, zorder=6)
    _right_angle(ax, A, B, C, size=0.6, lw=1.8)
    for pt in (A, B, C):
        ax.plot(pt[0], pt[1], 'o', color='#1E293B', markersize=7, zorder=7)

    dim = dict(color='#334155', fontsize=S(15), fontweight='bold', zorder=8)
    ax.text(-0.6, 3.0, '6 cm', ha='right', va='center', rotation=90, **dim)
    ax.text(4.0, -0.7, '8 cm', ha='center', va='top', **dim)

    ax.annotate('daerah arsiran', xy=(5.0, 1.0), xytext=(8.3, 4.6), ha='center', va='center',
                color='#1D4ED8', fontsize=S(14), fontweight='bold',
                arrowprops=dict(arrowstyle='-', color='#1D4ED8', linewidth=1.8), zorder=8)
    ax.text(2.0, 2.0, '', zorder=8)
    return _save_fig(fig, ax, 5, (-2.4, 12.4), (-2.2, 7.6))


# ------------------------------------------------------------
# Soal 6: limas segiempat beraturan T.ABCD
# ------------------------------------------------------------
def _diag_limas():
    fig, ax = _new_fig()
    s, h = 8.0, 3.0
    A, B, C, D = _proj(0, 0, 0), _proj(s, 0, 0), _proj(s, s, 0), _proj(0, s, 0)
    T = _proj(s / 2, s / 2, h)
    O = _proj(s / 2, s / 2, 0)

    ax.add_patch(patches.Polygon([A, B, C, D], closed=True, facecolor='#93C5FD', alpha=0.25, edgecolor='none', zorder=1))
    for p, q in [(A, B), (B, C), (T, A), (T, B), (T, C)]:
        _seg(ax, p, q, color='#1E293B', linewidth=3.2, solid_capstyle='round', zorder=4)
    for p, q in [(A, D), (D, C), (T, D)]:
        _seg(ax, p, q, color='#475569', linewidth=2.0, linestyle=(0, (4, 3)), zorder=3)
    _seg(ax, T, O, color='#059669', linewidth=3.0, linestyle=(0, (4, 3)), zorder=5)
    for pt in (A, B, C, D, T):
        ax.plot(pt[0], pt[1], 'o', color='#1E293B', markersize=7, zorder=7)
    ax.plot(O[0], O[1], 'o', color='#059669', markersize=7, zorder=7)

    lab = dict(color='#0F172A', fontsize=S(19), fontweight='bold', zorder=8)
    ax.text(A[0] - 0.4, A[1] - 0.3, 'A', ha='right', va='top', **lab)
    ax.text(B[0] + 0.1, B[1] - 0.35, 'B', ha='center', va='top', **lab)
    ax.text(C[0] + 0.4, C[1] + 0.1, 'C', ha='left', va='center', **lab)
    ax.text(D[0] - 0.35, D[1] + 0.1, 'D', ha='right', va='center', **lab)
    ax.text(T[0] + 0.25, T[1] + 0.3, 'T', ha='left', va='bottom', **lab)

    dim = dict(color='#334155', fontsize=S(14), fontweight='bold', zorder=8)
    ax.text(s / 2, -1.5, 'AB = 8 cm', ha='center', va='top', **dim)
    ax.text(O[0] + 0.7, (O[1] + T[1]) / 2 - 0.35, 't = 3 cm', ha='left', va='top', color='#047857',
            fontsize=S(14), fontweight='bold', zorder=8)
    return _save_fig(fig, ax, 6, (-2.6, 15.8), (-3.0, 7.4))


# ------------------------------------------------------------
# Gambar hiasan untuk intro (kubus, segitiga siku-siku, lingkaran)
# ------------------------------------------------------------
def _diag_intro():
    fig, ax = _new_fig(8.5, 4.4)
    P = _cube_pts(5.0)
    _draw_cube(ax, P)
    _seg(ax, P['A'], P['G'], color='#F97316', linewidth=3.4, solid_capstyle='round', zorder=5)

    T0, T1, T2 = (12.5, 0.0), (18.0, 0.0), (12.5, 5.0)
    ax.add_patch(patches.Polygon([T0, T1, T2], closed=True, facecolor='#60A5FA', alpha=0.25, edgecolor='none', zorder=1))
    ax.add_patch(patches.Polygon([T0, T1, T2], closed=True, fill=None, edgecolor='#1E293B', linewidth=3.2, zorder=4))
    _seg(ax, T1, T2, color='#F97316', linewidth=3.4, solid_capstyle='round', zorder=5)
    _right_angle(ax, T0, T1, T2, size=0.7, lw=1.8)

    ax.add_patch(patches.Circle((23.5, 2.6), 2.6, facecolor=(0.99, 0.90, 0.54, 0.5), edgecolor='#1E293B', linewidth=3.2, zorder=3))
    _seg(ax, (23.5, 2.6), (26.1, 2.6), color='#F97316', linewidth=3.4, solid_capstyle='round', zorder=5)
    ax.plot(23.5, 2.6, 'o', color='#1E293B', markersize=7, zorder=7)
    return _save_fig(fig, ax, 'intro', (-1.0, 27.2), (-1.0, 8.6))


_DIAGRAM_BUILDERS = {
    1: _diag_kubus_bdg,
    2: _diag_tali,
    3: _diag_transformasi,
    4: _diag_kerucut_tabung,
    5: _diag_segitiga_lingkaran,
    6: _diag_limas,
    "intro": _diag_intro,
}
_diagram_base = {}
_diagram_cache = {}


def load_diagram_image(max_w=980, max_h=380, key=None):
    """Diagram tiap soal dibuat SEKALI lalu di-cache (kunci = nomor soal; 'intro' untuk sampul)."""
    if key is not None and str(key).isdigit():
        key = int(key)
    builder = _DIAGRAM_BUILDERS.get(key)
    if builder is None:
        return None
    ck = (key, max_w, max_h)
    if ck in _diagram_cache:
        return _diagram_cache[ck]
    try:
        if key not in _diagram_base:
            img = Image.open(builder()).convert("RGBA")
            # Potong margin kosong agar diagram bisa tampil lebih besar
            bg = Image.new("RGBA", img.size, DIAGRAM_BG)
            box = ImageChops.difference(img, bg).getbbox()
            if box:
                pad = 12
                box = (max(0, box[0] - pad), max(0, box[1] - pad),
                       min(img.width, box[2] + pad), min(img.height, box[3] + pad))
                img = img.crop(box)
            _diagram_base[key] = img
        base = _diagram_base[key]
        w, h = base.size
        ratio = min(max_w / w, max_h / h)
        new_w = max(1, int(w * ratio))
        new_h = max(1, int(h * ratio))
        result = base.resize((new_w, new_h), RESAMPLE)
    except Exception as e:
        print(f"Peringatan: gagal membuat gambar diagram {key}: {e}")
        result = None
    _diagram_cache[ck] = result
    return result


HAND_MISSING = set("√≈≠≤≥±·×π∠θ⊥»→−½")


def draw_hand_text(draw, xy, text, hand_font, fallback_font, fill):
    """Gambar teks tulisan tangan; karakter yang tidak ada di font Kalam memakai font cadangan.
    Mengembalikan lebar total teks (px)."""
    x, y = xy
    run = ""
    run_missing = False
    total = 0.0
    for ch in text + "\0":
        missing = ch in HAND_MISSING
        if ch == "\0" or (run and missing != run_missing):
            if run:
                f = fallback_font if run_missing else hand_font
                draw.text((x + total, y), run, font=f, fill=fill)
                total += draw.textlength(run, font=f)
            run = ""
        if ch != "\0":
            run += ch
            run_missing = missing
    return total


def hand_text_width(draw_probe, text, hand_font, fallback_font):
    total = 0.0
    run = ""
    run_missing = False
    for ch in text + "\0":
        missing = ch in HAND_MISSING
        if ch == "\0" or (run and missing != run_missing):
            if run:
                total += draw_probe.textlength(run, font=fallback_font if run_missing else hand_font)
            run = ""
        if ch != "\0":
            run += ch
            run_missing = missing
    return total


_probe_draw = ImageDraw.Draw(Image.new("RGB", (4, 4)))


def wrap_hand_text(text, hand_font, fallback_font, max_width):
    if not text:
        return []
    lines, cur = [], ""
    for word in text.split(" "):
        test = word if not cur else cur + " " + word
        if hand_text_width(_probe_draw, test, hand_font, fallback_font) <= max_width:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def draw_blue_check(draw, cx, cy, r):
    """Centang biru (badge terverifikasi) - digambar manual agar tidak bergantung pada glyph font."""
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill="#1D9BF0", outline="#FFFFFF", width=max(2, r // 14))
    w = max(5, int(r * 0.26))
    pts = [(cx - 0.42 * r, cy + 0.02 * r), (cx - 0.10 * r, cy + 0.36 * r), (cx + 0.46 * r, cy - 0.34 * r)]
    draw.line(pts, fill="#FFFFFF", width=w, joint="curve")
    for (px, py) in (pts[0], pts[2]):
        draw.ellipse((px - w / 2, py - w / 2, px + w / 2, py + w / 2), fill="#FFFFFF")


def create_question_frame(question_data, timer_val=TIMER_SECONDS, font_size=46, show_answer=False):
    img = Image.new("RGB", (WIDTH, HEIGHT), "#070B19")
    draw = ImageDraw.Draw(img)
    draw_colorful_background(draw, WIDTH, HEIGHT)

    # Header Bar
    draw_rounded_rect(draw, (40, 45, 480, 125), radius=22, fill="#121829", outline="#3B82F6", width=2)
    draw.text((65, 70), f"♫ {question_data.get('account', '@pairzal')}", font=get_font(S(30), bold=True), fill="#FFFFFF")

    draw_rounded_rect(draw, (505, 45, WIDTH - 40, 125), radius=22, fill="#121829", outline="#3B82F6", width=2)
    submateri = question_data.get('elemen', 'Geometri')
    soal_num = question_data.get('nomor', 1)
    tag_text = f"SOAL #{soal_num}  •  {submateri.upper()}"
    draw.text((530, 70), tag_text, font=get_font(S(30), bold=True), fill="#38BDF8")

    # Question Text & Diagram Layout
    q_text = question_data.get('pertanyaan') or question_data.get('soal', '')
    clean_q = latex_to_clean_text(q_text)
    
    # Auto-scale font so full text fits perfectly
    q_font_size = S(46) if len(clean_q) < 160 else S(40)
    q_font = get_font(q_font_size, bold=True)
    q_lines = wrap_text(clean_q, q_font, WIDTH - 140)
    line_spacing = round(q_font_size * 1.35)
    text_total_height = len(q_lines) * line_spacing

    card_top = 145
    card_bottom = card_top + 80 + text_total_height + 20   # kartu soal (tanpa gambar)

    # Kartu gambar terpisah: isi sisa ruang setelah timer & opsi diberi tempat
    n_opts_reserve = max(1, len(get_options_list(question_data)))
    reserve = 25 + n_opts_reserve * 95 + (n_opts_reserve - 1) * 8 + 70
    dcard_top = card_bottom + 15
    dcard_bottom = max(dcard_top + 400, HEIGHT - reserve)
    chart_img = load_diagram_image(max_w=WIDTH - 260, max_h=dcard_bottom - dcard_top - 24, key=question_data.get('nomor'))

    draw_rounded_rect(draw, (40, card_top, WIDTH - 40, card_bottom), radius=24, fill="#111827", outline="#4F46E5", width=2)

    tipe_text = f"Tipe: {question_data.get('tipe', 'PG')} - HOTS: {question_data.get('subtopik', 'Geometri')}"
    tag_font = get_font(S(24), bold=True)
    tb = tag_font.getbbox(tipe_text)
    tw = tb[2] - tb[0]
    draw_rounded_rect(draw, (65, card_top + 16, min(WIDTH - 65, 65 + tw + 35), card_top + 62), radius=14, fill="#1F2937", outline="#6366F1", width=1)
    draw.text((82, card_top + 24), tipe_text, font=tag_font, fill="#E0E7FF")

    y_text = card_top + 80
    for line in q_lines:
        draw_math_line(img, draw, (65, y_text), line, q_font, q_font_size, fill="#FFFFFF", max_width=WIDTH - 130)
        y_text += line_spacing

    draw_rounded_rect(draw, (40, dcard_top, WIDTH - 40, dcard_bottom), radius=24, fill=DIAGRAM_BG, outline="#38BDF8", width=2)
    if chart_img:
        img_x = (WIDTH - chart_img.width) // 2
        img_y = dcard_top + (dcard_bottom - dcard_top - chart_img.height) // 2
        # Hindari tumpang tindih dengan lingkaran timer di pojok kanan atas kartu
        timer_left = WIDTH - 40 - 20 - 2 * 65 - 8
        if img_y < dcard_top + 20 + 2 * 65 + 6 and img_x + chart_img.width > timer_left:
            img_x = max(52, timer_left - chart_img.width)
        img.paste(chart_img, (img_x, img_y), chart_img)

    # Timer circle
    r_timer = 65
    cx = WIDTH - 40 - 20 - r_timer   # pojok kanan atas kartu gambar
    cy = dcard_top + 20 + r_timer
    if show_answer:
        draw_blue_check(draw, cx, cy, r_timer)  # waktu berpikir habis -> centang biru
    else:
        draw.ellipse((cx - r_timer, cy - r_timer, cx + r_timer, cy + r_timer), fill="#1F2937", outline="#EC4899", width=3)
        t_str = str(timer_val)
        t_font = get_font(S(100) if len(t_str) == 1 else S(76), bold=True)
        tb = t_font.getbbox(t_str)
        tw = tb[2] - tb[0]
        th = tb[3] - tb[1]
        draw.text((cx - tw / 2, cy - th / 2 - tb[1]), t_str, font=t_font, fill="#F43F5E")

    # Options List
    options = get_options_list(question_data)
    n_opts = len(options)
    opt_start_y = dcard_bottom + 25
    available_opt_height = (HEIGHT - 70) - opt_start_y
    opt_gap = 12 if n_opts <= 4 else 8
    opt_height = (available_opt_height - (n_opts - 1) * opt_gap) // max(1, n_opts)
    opt_height = min(110, max(75, opt_height))

    FS_OPTION = S(38) if n_opts <= 4 else S(34)
    opt_font = get_font(FS_OPTION, bold=True)
    opt_line_h = round(FS_OPTION * 1.15)

    ans_key = question_data.get('jawaban') or question_data.get('jawaban_benar', '')
    correct = set(str(a).strip() for a in ans_key) if isinstance(ans_key, list) else {str(ans_key).strip()}

    for i, opt in enumerate(options):
        cur_y = opt_start_y + i * (opt_height + opt_gap)
        if cur_y + opt_height > HEIGHT - 45:
            break
        is_right = show_answer and chr(65 + i) in correct
        if is_right:
            draw_rounded_rect(draw, (40, cur_y, WIDTH - 40, cur_y + opt_height), radius=18,
                              fill="#0B2A55", outline="#1D9BF0", width=4)
        else:
            draw_rounded_rect(draw, (40, cur_y, WIDTH - 40, cur_y + opt_height), radius=18,
                              fill="#111827", outline="#374151", width=2)
        opt_fill = "#6B7280" if (show_answer and not is_right) else "#FFFFFF"

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
        opt_lines = wrap_text(clean_opt, opt_font, WIDTH - 310)
        _fs2, opt_font2 = FS_OPTION, opt_font
        if len(opt_lines) > 1:
            _fs2 = max(S(24), FS_OPTION - S(8))
            opt_font2 = get_font(_fs2, bold=True)
            opt_lines = wrap_text(clean_opt, opt_font2, WIDTH - 310)
        n_lines = min(len(opt_lines), 2)
        y_opt_text = cur_y + (opt_height - n_lines * round(_fs2 * 1.2)) // 2
        for o_line in opt_lines[:2]:
            draw_math_line(img, draw, (155, y_opt_text), o_line, opt_font2, _fs2, fill=opt_fill, max_width=WIDTH - 310)
            y_opt_text += round(_fs2 * 1.2)

        if is_right:
            draw_blue_check(draw, WIDTH - 40 - 50, c_cy, 30)

    return img


def create_step_frame(question_data, active_step_idx=0, font_size=58, write_progress=None):
    img = Image.new("RGB", (WIDTH, HEIGHT), "#070B19")
    draw = ImageDraw.Draw(img)
    draw_colorful_background(draw, WIDTH, HEIGHT)

    # Top Bars
    draw_rounded_rect(draw, (40, 45, 470, 125), radius=20, fill="#121829", outline="#3B82F6", width=2)
    draw.text((65, 68), f"♫ {question_data.get('account', '@pairzal')}", font=get_font(S(30), bold=True), fill="#FFFFFF")

    draw_rounded_rect(draw, (495, 45, WIDTH - 40, 125), radius=20, fill="#121829", outline="#3B82F6", width=2)
    draw.text((520, 68), "Pembahasan TKA Geometri HOTS", font=get_font(30, bold=True), fill="#FFFFFF")

    # Enlarged Diagram and Complete Question Card at Top
    thumb_img = load_diagram_image(max_w=340, max_h=240, key=question_data.get('nomor'))
    
    card_top = 140
    card_bottom = 470
    draw_rounded_rect(draw, (40, card_top, WIDTH - 40, card_bottom), radius=22, fill="#111827", outline="#4F46E5", width=2)

    submateri = question_data.get('elemen', 'Geometri')
    soal_num = question_data.get('nomor', 1)
    tag_soal = f"SOAL #{soal_num} | {submateri.upper()}"
    draw.text((65, card_top + 16), tag_soal, font=get_font(S(24), bold=True), fill="#9CA3AF")

    q_text = question_data.get('pertanyaan') or question_data.get('soal', '')
    clean_q = latex_to_clean_text(q_text)

    text_max_w = (WIDTH - 40 - thumb_img.width - 90) if thumb_img else (WIDTH - 140)
    FS_QTEXT = S(28) if len(clean_q) < 180 else S(24)
    q_font = get_font(FS_QTEXT, bold=True)
    q_lines = wrap_text(clean_q, q_font, text_max_w)
    while len(q_lines) > 4 and FS_QTEXT > S(16):
        FS_QTEXT -= 1
        q_font = get_font(FS_QTEXT, bold=True)
        q_lines = wrap_text(clean_q, q_font, text_max_w)
    q_line_h = round(FS_QTEXT * 1.3)
    y_q = card_top + 52
    for line in q_lines[:4]:
        draw_math_line(img, draw, (65, y_q), line, q_font, FS_QTEXT, fill="#FFFFFF", max_width=text_max_w)
        y_q += q_line_h

    if thumb_img:
        diag_x = WIDTH - 40 - thumb_img.width - 15
        diag_y = card_top + 16
        # Draw frame around diagram
        draw_rounded_rect(draw, (diag_x - 4, diag_y - 4, diag_x + thumb_img.width + 4, diag_y + thumb_img.height + 4), radius=12, fill=DIAGRAM_BG, outline="#38BDF8", width=2)
        img.paste(thumb_img, (diag_x, diag_y), thumb_img)

    jawaban_str = question_data.get('jawaban') or question_data.get('jawaban_benar', '')
    if isinstance(jawaban_str, list):
        ans_text = f"Kunci Jawaban: {', '.join(jawaban_str)}"
    else:
        ans_text = f"Kunci Jawaban: {jawaban_str}"
    draw_rounded_rect(draw, (65, card_bottom - 60, WIDTH - 65, card_bottom - 12), radius=14, fill="#1F2937", outline="#F59E0B", width=1)
    draw_math_line(img, draw, (85, card_bottom - 50), ans_text, get_font(30, bold=True), 30, fill="#FBBF24", max_width=WIDTH - 190)

    # Budi dialog
    dlg_top, dlg_bottom = 485, 555
    draw_rounded_rect(draw, (40, dlg_top, WIDTH - 40, dlg_bottom), radius=16, fill="#111827", outline="#374151", width=2)
    draw.text((65, dlg_top + 18), "Budi: \"Bagaimana langkah penyelesaiannya, Pak Irzal?\"", font=get_font(28, bold=True), fill="#93C5FD")

    # Step Cards
    steps = question_data.get('steps', [])
    num_steps = max(1, len(steps))
    gap = 14 if num_steps <= 2 else 10

    if num_steps >= 3:
        FS_STEPTITLE = S(30)
        FS_DETAIL = S(26)
        FS_STEPBADGE = S(22)
    elif num_steps == 2:
        FS_STEPTITLE = S(36)
        FS_DETAIL = S(32)
        FS_STEPBADGE = S(26)
    else:
        FS_STEPTITLE = S(40)
        FS_DETAIL = S(36)
        FS_STEPBADGE = S(28)

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
                       f"Langkah {idx + 1}...", font=get_font(FS_STEPTITLE, bold=True), fill="#4B5563")
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
            FS_HAND = FS_DETAIL + S(12)  # ukuran handwriting
            hand_spacing = round(FS_HAND * 1.25)
            hand_font = get_hand_font(FS_HAND, bold=False)
            fallback_font = get_font(FS_HAND, bold=False)
            wrapped_all = []
            for line in details_list:
                clean_line = latex_to_clean_text(line)
                for sym, alt in {'θ': 'teta', 'π': 'pi', '∠': 'sudut ', '→': '->'}.items():
                    clean_line = clean_line.replace(sym, alt)
                wrapped_all.extend(wrap_hand_text(clean_line, hand_font, fallback_font, WIDTH - 140))

            total_len = sum(len(l) + 1 for l in wrapped_all) or 1
            progress = max(0.0, min(1.0, write_progress))
            target_count = int(round(total_len * progress))

            cum = 0
            pen_xy = None
            for w_line in wrapped_all:
                if cur_detail_y + hand_spacing > sy_end - 8:
                    break
                remaining_target = target_count - cum
                if remaining_target <= 0:
                    break
                if remaining_target >= len(w_line):
                    tw = draw_hand_text(draw, (70, cur_detail_y), w_line, hand_font, fallback_font, "#FDE68A")
                    pen_xy = (70 + tw, cur_detail_y + FS_HAND * 0.55)
                    cum += len(w_line) + 1
                    cur_detail_y += hand_spacing
                else:
                    tw = draw_hand_text(draw, (70, cur_detail_y), w_line[:remaining_target], hand_font, fallback_font, "#FDE68A")
                    pen_xy = (70 + tw, cur_detail_y + FS_HAND * 0.55)
                    cum = target_count
                    break

            if pen_xy and progress < 1.0:
                draw_pen_tip(draw, pen_xy[0], pen_xy[1])
        else:
            for line in details_list:
                clean_line = latex_to_clean_text(line)
                is_highlight = clean_line.startswith("»") or "Hasil =" in clean_line or "BENAR" in clean_line or "SALAH" in clean_line
                line_font = line_detail_bold if is_highlight else line_detail_font
                wrapped_lines = wrap_text(clean_line, line_font, WIDTH - 140)
                for w_line in wrapped_lines:
                    if cur_detail_y + detail_spacing <= sy_end - 8:
                        draw_math_line(img, draw, (70, cur_detail_y), w_line, line_font, FS_DETAIL, fill="#FFFFFF", max_width=WIDTH - 150)
                        cur_detail_y += detail_spacing
                cur_detail_y += 3

    if active_step_idx >= len(steps) - 1:
        draw_rounded_rect(draw, (40, 1750, WIDTH - 40, 1890), radius=18, fill="#111827", outline="#F59E0B", width=2)
        draw.text((75, 1768), "KESIMPULAN PEMBAHASAN:", font=get_font(S(24), bold=True), fill="#FBBF24")
        concl_font = get_font(S(32), bold=True)
        if isinstance(jawaban_str, list):
            concl_text = f"Pernyataan yang tepat adalah {', '.join(jawaban_str)}."
        else:
            concl_text = f"Pilihan jawaban yang benar adalah {jawaban_str}."
        concl_line_h = round(S(32) * 1.25)
        c_lines = wrap_text(concl_text, concl_font, WIDTH - 140)
        y_c = 1804
        for cl in c_lines[:2]:
            draw_math_line(img, draw, (75, y_c), cl, concl_font, S(32), fill="#FFFFFF", max_width=WIDTH - 150)
            y_c += concl_line_h

    return img


def create_intro_frame(judul, jumlah_soal):
    img = Image.new("RGB", (WIDTH, HEIGHT), "#0A2540")
    draw = ImageDraw.Draw(img)
    draw_colorful_background(draw, WIDTH, HEIGHT)

    tag_font = get_font(S(34), bold=True)
    tag_text = "PERSIAPAN UJIAN TKA 2026"
    tb = tag_font.getbbox(tag_text)
    tw = tb[2] - tb[0]
    draw_rounded_rect(draw, ((WIDTH - tw) / 2 - 30, 360, (WIDTH + tw) / 2 + 30, 430), radius=25, fill="#1E293B", outline="#38BDF8", width=2)
    draw.text(((WIDTH - tw) / 2, 377), tag_text, font=tag_font, fill="#38BDF8")

    title_font = get_font(S(56), bold=True)
    lines = wrap_text(judul, title_font, WIDTH - 160)
    
    lh = round(S(56) * 1.25)
    title_h = len(lines) * lh
    box_top = 450
    box_bottom = box_top + title_h + 165
    draw_rounded_rect(draw, (70, box_top, WIDTH - 70, box_bottom), radius=35, fill="#111827", outline="#4F46E5", width=3)

    y = box_top + 40
    for line in lines:
        bbox = title_font.getbbox(line)
        w = bbox[2] - bbox[0]
        draw.text(((WIDTH - w) / 2, y), line, font=title_font, fill="#FFFFFF")
        y += lh

    sub_font = get_font(S(40), bold=True)
    sub_text = f"Pembahasan Lengkap {jumlah_soal} Soal"
    bbox = sub_font.getbbox(sub_text)
    w = bbox[2] - bbox[0]
    draw_rounded_rect(draw, ((WIDTH - w) / 2 - 35, y + 15, (WIDTH + w) / 2 + 35, y + 85), radius=30, fill="#FE2C55")
    draw.text(((WIDTH - w) / 2, y + 30), sub_text, font=sub_font, fill="#FFFFFF")

    diag_img = load_diagram_image(max_w=750, max_h=420, key="intro")
    if diag_img:
        img.paste(diag_img, ((WIDTH - diag_img.width) // 2, box_bottom + 35), diag_img)

    info_font = get_font(34, bold=True)
    draw.text((WIDTH // 2, box_bottom + 480), "Siapkan alat tulismu & mari kita bahas bersama!", font=info_font, fill="#FBBF24", anchor="mm")

    return img


def create_outro_frame():
    img = Image.new("RGB", (WIDTH, HEIGHT), "#0A2540")
    draw = ImageDraw.Draw(img)
    draw_colorful_background(draw, WIDTH, HEIGHT)

    h_font = get_font(S(60), bold=True)
    draw.text((WIDTH // 2, 450), "SELESAI!", font=h_font, fill="#FFFFFF", anchor="mm")

    sub_font = get_font(S(40), bold=True)
    draw.text((WIDTH // 2, 540), "Yuk Uji Pemahamanmu & Cek Soal Lainnya", font=sub_font, fill="#38BDF8", anchor="mm")

    draw_rounded_rect(draw, (120, 680, WIDTH - 120, 820), radius=28, fill="#111827", outline="#4F46E5", width=3)
    info_font = get_font(S(36), bold=True)
    draw.text((WIDTH // 2, 750), "Kunjungi Portal: www.math315.id", font=info_font, fill="#FBBF24", anchor="mm")

    draw_rounded_rect(draw, (120, 880, WIDTH - 120, 1000), radius=28, fill="#FE2C55")
    btn_font = get_font(S(36), bold=True)
    draw.text((WIDTH // 2, 940), "Like, Simpan & Follow @pairzal", font=btn_font, fill="#FFFFFF", anchor="mm")

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


def make_silence(output_file, seconds=3.0):
    run_cmd(["ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SAMPLE_RATE}:cl=mono",
             "-t", str(seconds), "-c:a", "libmp3lame", output_file])


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

    ok = False
    try:
        ok = asyncio.run(generate_voice_edge(clean_spoken, output_file, pitch=pitch, rate=rate))
    except Exception as e:
        print(f"Peringatan edge_tts: {e}, mencoba fallback...")
    if not ok:
        # edge_tts gagal / file kosong -> pakai keheningan agar pipeline video tidak berhenti
        make_silence(output_file, 3.0)


def get_audio_duration(file_path):
    try:
        out = subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", file_path]
        ).decode().strip()
        return float(out)
    except Exception:
        return 3.0


def run_cmd(args):
    """Jalankan perintah tanpa shell (aman untuk path yang mengandung spasi)."""
    subprocess.run([str(a) for a in args], check=True)


def png_bytes(img):
    buf = io.BytesIO()
    img.save(buf, format="PNG", compress_level=1)
    return buf.getvalue()


def pipe_frames_to_video(frame_bytes_iter, audio_path, out_path, duration, apad=False):
    """Kirim frame PNG langsung ke ffmpeg lewat pipe.
    Tidak ada ratusan file frame di disk, jadi aman untuk penyimpanan Termux yang terbatas."""
    cmd = ["ffmpeg", "-y", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "png", "-i", "-",
           "-i", str(audio_path)]
    if apad:
        cmd += ["-af", "apad"]
    cmd += ["-c:v", "libx264", "-preset", "ultrafast", "-t", f"{duration:.3f}", "-r", str(FPS),
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", str(SAMPLE_RATE), str(out_path)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    try:
        for fb in frame_bytes_iter:
            proc.stdin.write(fb)
    except BrokenPipeError:
        pass
    finally:
        try:
            proc.stdin.close()
        except Exception:
            pass
        rc = proc.wait()
    if rc != 0:
        raise RuntimeError(f"ffmpeg gagal (kode {rc}) saat membuat {out_path}")


def render_still_video(image_path, audio_path, out_path, duration):
    run_cmd(["ffmpeg", "-y", "-loop", "1", "-i", image_path, "-i", audio_path,
             "-c:v", "libx264", "-preset", "ultrafast", "-t", f"{duration:.3f}", "-r", FPS,
             "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", SAMPLE_RATE, out_path])


def make_animated_combined_video(data, output_mp4, bgm_path=None, bgm_volume=0.25, font_size=46):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    temp_dir = os.path.join(base_dir, "temp_tka_hots")
    os.makedirs(temp_dir, exist_ok=True)

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
    render_still_video(intro_img, intro_audio, intro_vid, intro_dur)
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

        # Video pembacaan soal: soal dibacakan dulu, lalu hitung mundur TIMER_SECONDS detik
        read_dur = get_audio_duration(q_audio) + 0.5
        q_dur = read_dur + TIMER_SECONDS
        q_vid = os.path.join(temp_dir, f"q_{soal_num}_read.mp4")
        q_frame_count = int(q_dur * FPS)
        timer_seconds = TIMER_SECONDS
        timer_start_frame = int(read_dur * FPS)

        # Render tiap angka timer SEKALI (dalam memori), lalu kirim berulang ke ffmpeg
        timer_bytes = {}
        for t_val in range(1, timer_seconds + 1):
            timer_bytes[t_val] = png_bytes(create_question_frame(q_data, timer_val=t_val, font_size=font_size))

        def q_frame_iter():
            for f in range(q_frame_count):
                if f < timer_start_frame:
                    t_val = timer_seconds
                else:
                    elapsed_in_timer = (f - timer_start_frame) / FPS
                    t_val = max(1, timer_seconds - int(elapsed_in_timer))
                yield timer_bytes[t_val]

        pipe_frames_to_video(q_frame_iter(), q_audio, q_vid, q_dur, apad=True)
        segment_paths.append(q_vid)

        # Waktu berpikir habis -> jawaban benar diberi centang biru
        ans_val = q_data.get('jawaban') or q_data.get('jawaban_benar', '')
        if isinstance(ans_val, list):
            ans_txt = ans_val[0] if len(ans_val) == 1 else ", ".join(ans_val[:-1]) + ", dan " + ans_val[-1]
        else:
            ans_txt = str(ans_val)
        ans_audio = os.path.join(temp_dir, f"q_{soal_num}_ans.mp3")
        generate_voice(f"Waktu berpikir habis. Jawaban yang benar adalah {ans_txt}.", ans_audio)
        ans_dur = get_audio_duration(ans_audio) + 1.2
        ans_img = os.path.join(temp_dir, f"q_{soal_num}_ans.png")
        create_question_frame(q_data, timer_val=1, font_size=font_size, show_answer=True).save(ans_img)
        ans_vid = os.path.join(temp_dir, f"q_{soal_num}_ans.mp4")
        render_still_video(ans_img, ans_audio, ans_vid, ans_dur)
        segment_paths.append(ans_vid)

        # Dialog Budi
        budi_audio = os.path.join(temp_dir, f"budi_{soal_num}.mp3")
        generate_voice("Bagaimana cara menyelesaikannya dengan cepat, Pak Irzal?", budi_audio, is_budi=True)
        budi_dur = get_audio_duration(budi_audio) + 0.4
        budi_img = os.path.join(temp_dir, f"budi_{soal_num}.png")
        create_step_frame(q_data, active_step_idx=0, font_size=font_size, write_progress=0.0).save(budi_img)
        budi_vid = os.path.join(temp_dir, f"budi_{soal_num}.mp4")
        render_still_video(budi_img, budi_audio, budi_vid, budi_dur)
        segment_paths.append(budi_vid)

        # Langkah-langkah penyelesaian
        steps = q_data.get('steps', [])
        for step_idx, step in enumerate(steps):
            print(f"  -> Merender Langkah #{step_idx + 1}")
            st_audio = os.path.join(temp_dir, f"step_{soal_num}_{step_idx}.mp3")
            st_speech = step.get('spoken') or f"Langkah {step_idx+1}. {step.get('judul', '')}."
            generate_voice(st_speech, st_audio)
            st_dur = get_audio_duration(st_audio) + 0.6

            st_frame_count = int(st_dur * FPS)

            # Animasi menulis hanya ~3,5 detik pertama; setelah itu frame identik -> dikirim ulang dari memori
            write_dur_frames = min(st_frame_count, int(3.5 * FPS))
            final_bytes = png_bytes(create_step_frame(q_data, active_step_idx=step_idx, font_size=font_size, write_progress=1.0))

            def st_frame_iter():
                for sf in range(st_frame_count):
                    if sf >= write_dur_frames:
                        yield final_bytes
                    else:
                        prog = min(1.0, sf / max(1, write_dur_frames))
                        yield png_bytes(create_step_frame(q_data, active_step_idx=step_idx, font_size=font_size, write_progress=prog))

            st_vid = os.path.join(temp_dir, f"step_{soal_num}_{step_idx}.mp4")
            pipe_frames_to_video(st_frame_iter(), st_audio, st_vid, st_dur)
            segment_paths.append(st_vid)

    # 3. Outro Segment
    print("\n3. Membuat segmen Outro...")
    outro_audio = os.path.join(temp_dir, "outro.mp3")
    outro_speech = "Nah, itulah pembahasan enam soal geometri level hots, mulai dari jarak titik ke bidang pada kubus, kesebangunan, transformasi majemuk, kerucut dan tabung, lingkaran dalam segitiga, sampai limas. Jangan lupa like, sef, dan follow. Bagikan video ini ke teman-temanmu ya! Semangat belajar!"
    generate_voice(outro_speech, outro_audio)
    outro_dur = get_audio_duration(outro_audio) + 1.0
    outro_img = os.path.join(temp_dir, "outro.png")
    create_outro_frame().save(outro_img)
    outro_vid = os.path.join(temp_dir, "outro.mp4")
    render_still_video(outro_img, outro_audio, outro_vid, outro_dur)
    segment_paths.append(outro_vid)

    # 4. Gabungkan semua segmen
    print("\n4. Menggabungkan seluruh segmen video...")
    concat_list = os.path.join(temp_dir, "concat.txt")
    with open(concat_list, "w") as f:
        for p in segment_paths:
            f.write(f"file '{p}'\n")

    temp_merged = os.path.join(temp_dir, "temp_merged.mp4")
    run_cmd(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_list,
             "-c:v", "libx264", "-preset", "ultrafast", "-r", FPS, "-c:a", "aac", "-ar", SAMPLE_RATE,
             "-ac", "2", "-b:a", "192k", "-pix_fmt", "yuv420p", temp_merged])

    # 5. Background music
    print("\n5. Menambahkan background musik...")
    bgm_file = bgm_path or os.path.join(base_dir, "bgm_canon_in_d.ogg")

    if os.path.exists(bgm_file):
        run_cmd(["ffmpeg", "-y", "-i", temp_merged, "-stream_loop", "-1", "-i", bgm_file,
                 "-filter_complex",
                 f"[0:a]volume=1.0[vocal];[1:a]volume={bgm_volume}[bgm];[vocal][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]",
                 "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-ar", SAMPLE_RATE,
                 "-b:a", "192k", output_mp4])
    else:
        print(f"   (file musik latar tidak ditemukan: {bgm_file} - video dibuat tanpa musik)")
        shutil.copyfile(temp_merged, output_mp4)

    print(f"\nSELESAI! Video berhasil dibuat: {output_mp4}")


# ============================================================
# DATA SOAL LATIHAN TKA KELAS 12 - GEOMETRI DAN PENGUKURAN LEVEL HOTS (5 PG + 1 PG KOMPLEKS)
# ============================================================
data_soal = {
    "kisi_kisi": "TKA Kelas 12 - Matematika - Geometri Level HOTS",
    "konteks_gambar": "Enam soal HOTS: jarak titik ke bidang pada kubus, kesebangunan dua tali, transformasi majemuk, kerucut dan tabung, lingkaran dalam segitiga, serta limas.",
    "soal": [
        {
            "nomor": 1,
            "elemen": "Geometri",
            "subtopik": "Jarak Titik ke Bidang",
            "tipe": "PG",
            "pertanyaan": "Diketahui kubus ABCD.EFGH dengan panjang rusuk 12 cm. Jarak titik E ke bidang BDG adalah ....",
            "opsi": ["A. 4√3 cm", "B. 6√3 cm", "C. 12 cm", "D. 8√3 cm", "E. 6√6 cm"],
            "jawaban_benar": "D",
            "steps": [
                {
                    "judul": "Cari garis yang tegak lurus bidang BDG",
                    "detail": [
                        "• EC adalah diagonal ruang kubus.",
                        "• EC tegak lurus BD dan tegak lurus BG.",
                        "• Jadi EC tegak lurus bidang BDG, memotongnya di titik T."
                    ],
                    "spoken": "Ambil diagonal ruang e ce. Diagonal ini tegak lurus dengan be de, dan juga tegak lurus dengan be ge. Akibatnya e ce tegak lurus bidang be de ge. Misalkan e ce memotong bidang itu di titik te. Maka jarak e ke bidang be de ge adalah panjang e te."
                },
                {
                    "judul": "Hitung panjang CT lewat segitiga BDG",
                    "detail": [
                        "• BDG segitiga sama sisi, sisi = 12√2 cm.",
                        "• BT = 12√2 / √3 = 4√6 cm.",
                        "• CT = √(BC² − BT²) = √(144 − 96) = 4√3 cm."
                    ],
                    "spoken": "Segitiga be de ge sama sisi dengan sisi dua belas akar dua. Jarak dari titik sudut ke pusat segitiga sama sisi adalah sisi dibagi akar tiga, sehingga be te sama dengan empat akar enam. Karena ce be, ce de, dan ce ge sama-sama dua belas, titik te juga kaki tegak lurus dari ce. Jadi ce te sama dengan akar dari seratus empat puluh empat dikurangi sembilan puluh enam, yaitu akar empat puluh delapan, sama dengan empat akar tiga sentimeter."
                },
                {
                    "judul": "Hitung jarak E ke bidang BDG",
                    "detail": [
                        "• EC = 12√3 cm (diagonal ruang).",
                        "• ET = EC − CT = 12√3 − 4√3",
                        "» Hasil = 8√3 cm (Kunci Jawaban D)"
                    ],
                    "spoken": "Diagonal ruang e ce sama dengan dua belas akar tiga. Jarak e ke bidang sama dengan e te, yaitu e ce dikurangi ce te, sama dengan dua belas akar tiga dikurangi empat akar tiga. Hasilnya delapan akar tiga sentimeter. Jawaban D."
                }
            ]
        },
        {
            "nomor": 2,
            "elemen": "Geometri",
            "subtopik": "Kesebangunan",
            "tipe": "PG",
            "pertanyaan": "Dua tiang tegak setinggi 6 m dan 4 m berjarak 10 m. Dua tali dipasang menyilang dari puncak tiang ke kaki tiang lainnya dan berpotongan di titik P. Tinggi titik P dari tanah adalah ....",
            "opsi": ["A. 2 m", "B. 2,4 m", "C. 2,5 m", "D. 3 m", "E. 5 m"],
            "jawaban_benar": "B",
            "steps": [
                {
                    "judul": "Bentuk dua pasang segitiga sebangun",
                    "detail": [
                        "• Misal t = tinggi P, x = jarak kaki tiang 6 m ke titik di bawah P.",
                        "• Tali dari puncak tiang 6 m: t/6 = (10 − x)/10",
                        "• Tali dari puncak tiang 4 m: t/4 = x/10"
                    ],
                    "spoken": "Misalkan tinggi titik P adalah t, dan jarak kaki tiang enam meter ke titik di bawah P adalah x. Dari tali yang berawal di puncak tiang enam meter, terbentuk segitiga sebangun, sehingga t per enam sama dengan sepuluh dikurangi x, per sepuluh. Dari tali yang berawal di puncak tiang empat meter, diperoleh t per empat sama dengan x per sepuluh."
                },
                {
                    "judul": "Jumlahkan kedua persamaan",
                    "detail": [
                        "• t/6 + t/4 = (10 − x)/10 + x/10 = 1",
                        "• t × 5/12 = 1 → t = 12/5",
                        "» Hasil = 2,4 m (Kunci Jawaban B)"
                    ],
                    "spoken": "Jumlahkan kedua persamaan. Ruas kanan menjadi sepuluh dikurangi x ditambah x, dibagi sepuluh, yaitu satu. Ruas kiri menjadi t dikali seperenam ditambah seperempat, yaitu lima per dua belas t. Jadi t sama dengan dua belas per lima, yaitu dua koma empat meter. Perhatikan bahwa jarak sepuluh meter tidak memengaruhi hasil. Jawaban B."
                }
            ]
        },
        {
            "nomor": 3,
            "elemen": "Geometri",
            "subtopik": "Transformasi Majemuk",
            "tipe": "PG",
            "pertanyaan": "Titik P(a, b) dirotasi 90° berlawanan arah jarum jam terhadap O(0, 0), dicerminkan terhadap garis y = x, lalu didilatasi [O, 2] sehingga bayangannya P'(10, −6). Nilai a × b adalah ....",
            "spoken_soal": "Soal nomor 3. Titik P dengan koordinat a, b dirotasi sembilan puluh derajat berlawanan arah jarum jam terhadap titik pusat O, kemudian dicerminkan terhadap garis y sama dengan x, lalu didilatasi dengan pusat O dan faktor skala dua, sehingga bayangannya adalah P aksen dengan koordinat sepuluh, minus enam. Nilai a kali b adalah ...",
            "opsi": ["A. 2", "B. 8", "C. 10", "D. 12", "E. 15"],
            "jawaban_benar": "E",
            "steps": [
                {
                    "judul": "Bekerja mundur: balik dilatasi",
                    "detail": [
                        "• Dilatasi [O, 2]: (x, y) → (2x, 2y)",
                        "• (2x, 2y) = (10, −6) → (x, y) = (5, −3)"
                    ],
                    "spoken": "Kita bekerja mundur dari bayangan akhir. Dilatasi dengan faktor dua mengalikan koordinat dengan dua. Karena hasil akhirnya sepuluh, minus enam, titik sebelum dilatasi adalah lima, minus tiga."
                },
                {
                    "judul": "Balik pencerminan terhadap y = x",
                    "detail": [
                        "• Cermin y = x menukar koordinat: (x, y) → (y, x)",
                        "• Sebelum dicerminkan: (−3, 5)"
                    ],
                    "spoken": "Pencerminan terhadap garis y sama dengan x menukar koordinat. Jadi sebelum dicerminkan, titiknya adalah minus tiga, lima."
                },
                {
                    "judul": "Balik rotasi 90° lalu hitung a × b",
                    "detail": [
                        "• Rotasi 90° lawan jarum jam: (a, b) → (−b, a)",
                        "• (−b, a) = (−3, 5) → b = 3 dan a = 5",
                        "» Hasil a × b = 15 (Kunci Jawaban E)"
                    ],
                    "spoken": "Rotasi sembilan puluh derajat berlawanan arah jarum jam mengubah titik a, b menjadi minus b, a. Samakan dengan minus tiga, lima. Maka b sama dengan tiga dan a sama dengan lima. Jadi a kali b sama dengan lima belas. Jawaban E."
                }
            ]
        },
        {
            "nomor": 4,
            "elemen": "Geometri",
            "subtopik": "Kerucut dan Tabung",
            "tipe": "PG",
            "pertanyaan": "Wadah berbentuk kerucut terbalik berjari-jari 6 cm dan tinggi 12 cm berisi air setinggi 6 cm dari puncak. Seluruh air dituang ke tabung kosong berjari-jari alas 2 cm. Tinggi air dalam tabung adalah ....",
            "opsi": ["A. 4,5 cm", "B. 6 cm", "C. 9 cm", "D. 13,5 cm", "E. 18 cm"],
            "jawaban_benar": "A",
            "steps": [
                {
                    "judul": "Cari jari-jari permukaan air",
                    "detail": [
                        "• Kerucut air sebangun dengan kerucut wadah.",
                        "• r air / 6 = 6 / 12 → r air = 3 cm"
                    ],
                    "spoken": "Kerucut air sebangun dengan kerucut wadah. Perbandingan jari-jari sama dengan perbandingan tinggi, yaitu r air per enam sama dengan enam per dua belas. Jadi jari-jari permukaan air adalah tiga sentimeter."
                },
                {
                    "judul": "Hitung volume air",
                    "detail": [
                        "• V = 1/3 × π × 3² × 6",
                        "• V = 18π cm³"
                    ],
                    "spoken": "Volume air sama dengan sepertiga kali pi kali tiga kuadrat kali enam, yaitu delapan belas pi sentimeter kubik."
                },
                {
                    "judul": "Samakan dengan volume tabung",
                    "detail": [
                        "• π × 2² × t = 18π",
                        "• 4t = 18 → t = 4,5",
                        "» Hasil = 4,5 cm (Kunci Jawaban A)"
                    ],
                    "spoken": "Volume tabung sama dengan pi kali dua kuadrat kali t. Samakan dengan delapan belas pi, sehingga empat t sama dengan delapan belas, dan t sama dengan empat koma lima sentimeter. Jawaban A."
                }
            ]
        },
        {
            "nomor": 5,
            "elemen": "Geometri",
            "subtopik": "Lingkaran Dalam Segitiga",
            "tipe": "PG",
            "pertanyaan": "Sebuah segitiga siku-siku memiliki sisi siku-siku 6 cm dan 8 cm. Di dalamnya dibuat lingkaran dalam yang menyinggung ketiga sisinya. Dengan π = 3,14, luas daerah segitiga di luar lingkaran adalah ....",
            "opsi": ["A. 4,38 cm²", "B. 8,56 cm²", "C. 11,44 cm²", "D. 12,56 cm²", "E. 16,94 cm²"],
            "jawaban_benar": "C",
            "steps": [
                {
                    "judul": "Cari sisi miring dan luas segitiga",
                    "detail": [
                        "• Sisi miring = √(6² + 8²) = √100 = 10 cm",
                        "• Luas segitiga = 1/2 × 6 × 8 = 24 cm²"
                    ],
                    "spoken": "Sisi miring sama dengan akar dari enam kuadrat ditambah delapan kuadrat, yaitu akar seratus, sama dengan sepuluh sentimeter. Luas segitiga sama dengan setengah kali enam kali delapan, yaitu dua puluh empat sentimeter persegi."
                },
                {
                    "judul": "Cari jari-jari lingkaran dalam",
                    "detail": [
                        "• Luas = r × s, dengan s = (6 + 8 + 10)/2 = 12",
                        "• 24 = r × 12 → r = 2 cm"
                    ],
                    "spoken": "Luas segitiga juga sama dengan jari-jari lingkaran dalam dikali setengah keliling. Setengah keliling s sama dengan enam ditambah delapan ditambah sepuluh, dibagi dua, yaitu dua belas. Maka dua puluh empat sama dengan r kali dua belas, sehingga r sama dengan dua sentimeter."
                },
                {
                    "judul": "Kurangkan luas lingkaran dari luas segitiga",
                    "detail": [
                        "• Luas lingkaran = 3,14 × 2² = 12,56 cm²",
                        "• Luas arsiran = 24 − 12,56",
                        "» Hasil = 11,44 cm² (Kunci Jawaban C)"
                    ],
                    "spoken": "Luas lingkaran sama dengan tiga koma satu empat kali dua kuadrat, yaitu dua belas koma lima enam. Luas daerah yang dicari adalah dua puluh empat dikurangi dua belas koma lima enam, sama dengan sebelas koma empat empat sentimeter persegi. Jawaban C."
                }
            ]
        },
        {
            "nomor": 6,
            "elemen": "Geometri",
            "subtopik": "Limas Segiempat Beraturan",
            "tipe": "PG Kompleks",
            "pertanyaan": "Limas segiempat beraturan T.ABCD memiliki alas persegi dengan sisi 8 cm dan tinggi limas 3 cm. Tentukan SEMUA pernyataan yang BENAR:",
            "pernyataan": {
                "A": "Tinggi sisi tegak limas (apotema) adalah 5 cm.",
                "B": "Panjang rusuk tegak TA adalah 5 cm.",
                "C": "Luas permukaan limas adalah 144 cm².",
                "D": "Volume limas adalah 64 cm³.",
                "E": "Jika tinggi limas dijadikan dua kali semula, volumenya menjadi tiga kali semula."
            },
            "jawaban_benar": ["A", "C", "D"],
            "steps": [
                {
                    "judul": "Uji pernyataan A dan B",
                    "detail": [
                        "• A: apotema = √(3² + 4²) = 5 cm → BENAR",
                        "• B: TA = √(3² + (4√2)²) = √41 cm → SALAH"
                    ],
                    "spoken": "Pernyataan A. Jarak mendatar dari pusat alas ke tengah sisi alas adalah empat, dan tinggi limas tiga, sehingga apotema sama dengan akar tiga kuadrat ditambah empat kuadrat, yaitu lima sentimeter. A benar. Pernyataan B. Jarak pusat alas ke titik sudut adalah setengah diagonal, yaitu empat akar dua. Maka rusuk tegak te a sama dengan akar sembilan ditambah tiga puluh dua, yaitu akar empat puluh satu, bukan lima. B salah."
                },
                {
                    "judul": "Uji pernyataan C dan D",
                    "detail": [
                        "• C: L = 8² + 4 × (1/2 × 8 × 5) = 64 + 80 = 144 cm² → BENAR",
                        "• D: V = 1/3 × 64 × 3 = 64 cm³ → BENAR"
                    ],
                    "spoken": "Pernyataan C. Luas permukaan sama dengan luas alas ditambah empat kali luas sisi tegak. Luas alas enam puluh empat, dan tiap sisi tegak luasnya setengah kali delapan kali lima, yaitu dua puluh. Jadi luasnya enam puluh empat ditambah delapan puluh, sama dengan seratus empat puluh empat sentimeter persegi. C benar. Pernyataan D. Volume sama dengan sepertiga kali luas alas kali tinggi, yaitu sepertiga kali enam puluh empat kali tiga, sama dengan enam puluh empat sentimeter kubik. D benar."
                },
                {
                    "judul": "Uji pernyataan E",
                    "detail": [
                        "• Volume limas sebanding dengan tingginya.",
                        "• Tinggi 2× semula → volume 2× semula → SALAH",
                        "» Jawaban Benar = A, C, D"
                    ],
                    "spoken": "Pernyataan E. Volume limas berbanding lurus dengan tingginya. Jika tinggi dijadikan dua kali, volumenya juga menjadi dua kali, bukan tiga kali. E salah. Jadi pernyataan yang benar adalah A, C, dan D."
                }
            ]
        }
    ]
}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate Video Animasi Pembahasan Latihan TKA Matematika (Geometri Level HOTS)")
    parser.add_argument("output", nargs="?",
                        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "video_tka12_hots.mp4"),
                        help="Path output video mp4")
    parser.add_argument("--bgm", default=None, help="Path file musik background")
    parser.add_argument("--vol", type=float, default=0.25, help="Volume musik latar (default: 0.25)")
    parser.add_argument("--font-size", type=int, default=46, help="Ukuran font teks (default: 46)")
    parser.add_argument("--soal", default=None, help="ID/Nomor soal tertentu yang ingin digenerate (misal: 1 atau 1,2)")
    args = parser.parse_args()

    out_dir = os.path.dirname(args.output)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    data_to_use = data_soal
    if args.soal is not None:
        target_ids = [t.strip() for t in str(args.soal).split(",") if t.strip()]
        filtered = [q for q in data_soal.get('soal', []) if str(q.get('nomor', '')) in target_ids]
        if not filtered:
            sys.exit(f"Soal dengan nomor {args.soal} tidak ditemukan. Nomor yang tersedia: "
                     + ", ".join(str(q.get('nomor')) for q in data_soal.get('soal', [])))
        data_to_use = dict(data_soal)
        data_to_use['soal'] = filtered

    make_animated_combined_video(
        data_to_use,
        args.output,
        bgm_path=args.bgm,
        bgm_volume=args.vol,
        font_size=args.font_size
    )

