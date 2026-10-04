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
        (r'≤', ' kurang dari atau sama dengan '),
        (r'≥', ' lebih dari atau sama dengan '),
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
    has_math = bool(re.search(r'[√×·≠±≈π^]|\d/\d', text))
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


# ------------------------------------------------------------
# Pembantu grafik SPtLDV (bidang koordinat, garis batas, daerah arsiran)
# ------------------------------------------------------------
_SP_INK = '#0F172A'
_SP_GRID = '#B6BDC9'
_SP_C1, _SP_C2 = '#EA580C', '#2563EB'     # warna garis batas
_SP_FILL, _SP_HATCH = '#BFDBFE', '#2563EB'


def _sp_axes(xlim, ylim, xstep=1, ystep=1, xlabel='x', ylabel='y', ticks=True):
    fig, ax = plt.subplots(figsize=(8.6, 4.4), dpi=250)
    fig.patch.set_facecolor(DIAGRAM_BG)
    ax.set_facecolor(DIAGRAM_BG)
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)

    xt = np.arange(xstep, xlim[1] + 1e-9, xstep)
    yt = np.arange(ystep, ylim[1] + 1e-9, ystep)
    if ticks:
        ax.set_xticks(xt)
        ax.set_yticks(yt)
        ax.set_xticklabels([f"{int(v)}" for v in xt], fontsize=S(17), color=_SP_INK)
        ax.set_yticklabels([f"{int(v)}" for v in yt], fontsize=S(17), color=_SP_INK)
        ax.grid(True, color=_SP_GRID, linewidth=0.9)
    else:
        ax.set_xticks([])
        ax.set_yticks([])
    ax.set_axisbelow(True)
    ax.tick_params(length=0, pad=4)

    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.spines["left"].set_position("zero")
    ax.spines["bottom"].set_position("zero")
    for side in ("left", "bottom"):
        ax.spines[side].set_linewidth(2.4)
        ax.spines[side].set_color(_SP_INK)

    ax.plot(xlim[1], 0, ">", color=_SP_INK, markersize=10, clip_on=False, zorder=6)
    ax.plot(0, ylim[1], "^", color=_SP_INK, markersize=10, clip_on=False, zorder=6)
    xr, yr = xlim[1] - xlim[0], ylim[1] - ylim[0]
    ax.text(xlim[1] - 0.012 * xr, 0.04 * yr, xlabel, ha="right", va="bottom", fontsize=S(21),
            fontweight="bold", color=_SP_INK)
    ax.text(0.015 * xr, ylim[1] - 0.01 * yr, ylabel, ha="left", va="top", fontsize=S(21),
            fontweight="bold", color=_SP_INK)
    if ticks:
        ax.text(-0.012 * xr, -0.025 * yr, "O", ha="right", va="top", fontsize=S(17), color=_SP_INK)
    return fig, ax


def _sp_shade(ax, pts):
    with matplotlib.rc_context({"hatch.linewidth": 1.4}):
        ax.add_patch(patches.Polygon(pts, closed=True, facecolor=_SP_FILL, edgecolor=_SP_HATCH,
                                     hatch="////", linewidth=0, alpha=0.8, zorder=2))


def _sp_line(ax, a, b, c, color, xlim, ylim):
    """Garis a x + b y = c pada jendela grafik."""
    if abs(b) < 1e-12:
        ax.plot([c / a, c / a], list(ylim), color=color, linewidth=3.4, zorder=4)
    else:
        xs = np.array(xlim, dtype=float)
        ax.plot(xs, (c - a * xs) / b, color=color, linewidth=3.4, zorder=4, solid_capstyle="round")


def _sp_dot(ax, x, y, color=_SP_INK, size=8):
    ax.plot(x, y, "o", color=color, markersize=size, zorder=7)


def _sp_tag(ax, x, y, text, color=_SP_INK, ha="left", va="center", size=18):
    ax.text(x, y, text, ha=ha, va=va, fontsize=S(size), fontweight="bold", color=color, zorder=9,
            bbox=dict(boxstyle="round,pad=0.2", facecolor=DIAGRAM_BG, edgecolor="none", alpha=0.92))


def _sp_save(fig, key):
    img_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images", f"soal_sptl_{key}.png")
    os.makedirs(os.path.dirname(img_path), exist_ok=True)
    fig.savefig(img_path, bbox_inches="tight", pad_inches=0.12, facecolor=DIAGRAM_BG)
    plt.close(fig)
    return img_path


# ------------------------------------------------------------
# Soal 1: sistem pertidaksamaan dari grafik
#   x >= 0 ; y >= 0 ; 2x + y <= 8 ; x + 2y <= 10
# ------------------------------------------------------------
def _diag_sistem_dari_grafik():
    xl, yl = (-1, 12), (-1, 9.4)
    fig, ax = _sp_axes(xl, yl)
    _sp_shade(ax, [(0, 0), (4, 0), (2, 4), (0, 5)])
    _sp_line(ax, 2, 1, 8, _SP_C1, xl, yl)
    _sp_line(ax, 1, 2, 10, _SP_C2, xl, yl)
    for p in [(4, 0), (10, 0), (0, 8), (0, 5), (2, 4)]:
        _sp_dot(ax, *p)
    _sp_tag(ax, 4.25, 0.65, "(4, 0)")
    _sp_tag(ax, 10, 0.65, "(10, 0)", ha="center")
    _sp_tag(ax, 0.3, 8.0, "(0, 8)")
    _sp_tag(ax, 0.3, 5.5, "(0, 5)")
    _sp_tag(ax, 2.3, 4.6, "(2, 4)")
    return _sp_save(fig, 1)


# ------------------------------------------------------------
# Soal 2: luas daerah penyelesaian
#   x >= 0 ; y >= 0 ; x + y <= 8 ; x + 3y <= 12
# ------------------------------------------------------------
def _diag_luas_daerah():
    xl, yl = (-1, 13), (-1, 9.4)
    fig, ax = _sp_axes(xl, yl)
    _sp_shade(ax, [(0, 0), (8, 0), (6, 2), (0, 4)])
    _sp_line(ax, 1, 1, 8, _SP_C1, xl, yl)
    _sp_line(ax, 1, 3, 12, _SP_C2, xl, yl)
    _sp_tag(ax, 1.7, 6.9, "x + y = 8", color=_SP_C1, size=19)
    _sp_tag(ax, 8.8, 1.9, "x + 3y = 12", color=_SP_C2, size=19)
    return _sp_save(fig, 2)


# ------------------------------------------------------------
# Soal 3: toko roti
#   2x + y <= 100 ; x + 2y <= 80 ; x >= 0 ; y >= 0
# ------------------------------------------------------------
def _diag_toko_roti():
    xl, yl = (-3, 64), (-3, 53)
    fig, ax = _sp_axes(xl, yl, xstep=10, ystep=10, xlabel="x (roti A)", ylabel="y (roti B)")
    _sp_shade(ax, [(0, 0), (50, 0), (40, 20), (0, 40)])
    _sp_line(ax, 2, 1, 100, _SP_C1, xl, yl)
    _sp_line(ax, 1, 2, 80, _SP_C2, xl, yl)
    _sp_tag(ax, 30.5, 44, "2x + y = 100", color=_SP_C1, size=18)
    _sp_tag(ax, 46, 24, "x + 2y = 80", color=_SP_C2, size=18)
    return _sp_save(fig, 3)


# ------------------------------------------------------------
# Soal 4: nilai minimum pada daerah tak terbatas
#   x >= 0 ; y >= 0 ; x + y >= 5 ; x + 3y >= 9
# ------------------------------------------------------------
def _diag_daerah_tak_terbatas():
    xl, yl = (-1, 12), (-1, 8.6)
    fig, ax = _sp_axes(xl, yl)
    _sp_shade(ax, [(0, yl[1]), (0, 5), (3, 2), (9, 0), (xl[1], 0), (xl[1], yl[1])])
    _sp_line(ax, 1, 1, 5, _SP_C1, xl, yl)
    _sp_line(ax, 1, 3, 9, _SP_C2, xl, yl)
    _sp_tag(ax, 0.5, 3.9, "x + y = 5", color=_SP_C1, size=16, va="top")
    _sp_tag(ax, 9.3, 1.6, "x + 3y = 9", color=_SP_C2, size=19)
    ax.annotate("", xy=(11.4, 7.7), xytext=(9.6, 5.9),
                arrowprops=dict(arrowstyle="-|>", color=_SP_HATCH, linewidth=2.6), zorder=8)
    _sp_tag(ax, 6.9, 5.3, "daerah tak terbatas", color="#1D4ED8", size=17)
    return _sp_save(fig, 4)


# ------------------------------------------------------------
# Soal 5: titik koordinat bulat
#   x >= 0 ; y >= 0 ; x + y <= 6 ; 2x + y <= 8
# ------------------------------------------------------------
def _diag_titik_bulat():
    xl, yl = (-1, 9.5), (-1, 8.8)
    fig, ax = _sp_axes(xl, yl)
    _sp_shade(ax, [(0, 0), (4, 0), (2, 4), (0, 6)])
    _sp_line(ax, 1, 1, 6, _SP_C1, xl, yl)
    _sp_line(ax, 2, 1, 8, _SP_C2, xl, yl)
    _sp_tag(ax, 5.3, 1.8, "x + y = 6", color=_SP_C1, size=19)
    _sp_tag(ax, 1.0, 7.4, "2x + y = 8", color=_SP_C2, size=19)
    return _sp_save(fig, 5)


# ------------------------------------------------------------
# Soal 6 (PGK): pernyataan tentang daerah penyelesaian
#   x >= 0 ; y >= 0 ; 3x + 2y <= 18 ; x + 2y <= 10
# ------------------------------------------------------------
def _diag_uji_pernyataan():
    xl, yl = (-1, 11.5), (-1, 10)
    fig, ax = _sp_axes(xl, yl)
    _sp_shade(ax, [(0, 0), (6, 0), (4, 3), (0, 5)])
    _sp_line(ax, 3, 2, 18, _SP_C1, xl, yl)
    _sp_line(ax, 1, 2, 10, _SP_C2, xl, yl)
    _sp_tag(ax, 0.9, 9.0, "3x + 2y = 18", color=_SP_C1, size=19)
    _sp_tag(ax, 7.6, 2.6, "x + 2y = 10", color=_SP_C2, size=19)
    _sp_dot(ax, 5, 2, color="#DC2626", size=10)
    _sp_tag(ax, 5.25, 1.35, "(5, 2)", color="#DC2626")
    _sp_dot(ax, 2, 4, color="#059669", size=10)
    _sp_tag(ax, 2.25, 4.65, "(2, 4)", color="#047857")
    return _sp_save(fig, 6)


# ------------------------------------------------------------
# Gambar hiasan untuk intro (daerah penyelesaian SPtLDV)
# ------------------------------------------------------------
def _diag_intro():
    fig, ax = plt.subplots(figsize=(8.6, 4.2), dpi=250)
    fig.patch.set_facecolor(DIAGRAM_BG)
    ax.set_facecolor(DIAGRAM_BG)
    xl, yl = (-0.6, 8.6), (-0.6, 5.4)
    ax.set_xlim(*xl)
    ax.set_ylim(*yl)
    ax.axis("off")
    ax.annotate("", xy=(xl[1], 0), xytext=(xl[0], 0), arrowprops=dict(arrowstyle="-|>", color=_SP_INK, linewidth=2.6))
    ax.annotate("", xy=(0, yl[1]), xytext=(0, yl[0]), arrowprops=dict(arrowstyle="-|>", color=_SP_INK, linewidth=2.6))
    _sp_shade(ax, [(0, 0), (6, 0), (4, 2), (0, 4)])
    ax.plot([-0.6, 7.2], [6.6, -0.6], color=_SP_C1, linewidth=3.6, zorder=4)
    ax.plot([-0.6, 8.4], [4.3, -0.2], color=_SP_C2, linewidth=3.6, zorder=4)
    ax.plot(4, 2, "o", color=_SP_INK, markersize=9, zorder=7)
    ax.text(5.3, 4.2, r"$ax + by \leq c$", ha="left", va="center", fontsize=S(22), fontweight="bold",
            color=_SP_INK, zorder=9)
    return _sp_save(fig, "intro")


_DIAGRAM_BUILDERS = {
    1: _diag_sistem_dari_grafik,
    2: _diag_luas_daerah,
    3: _diag_toko_roti,
    4: _diag_daerah_tak_terbatas,
    5: _diag_titik_bulat,
    6: _diag_uji_pernyataan,
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
    submateri = question_data.get('elemen', 'Aljabar')
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

    tipe_text = f"Tipe: {question_data.get('tipe', 'PG')} - {question_data.get('subtopik', 'Aljabar')}"
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
    draw.text((520, 68), "Pembahasan TKA Aljabar SPtLDV", font=get_font(30, bold=True), fill="#FFFFFF")

    # Enlarged Diagram and Complete Question Card at Top
    thumb_img = load_diagram_image(max_w=340, max_h=240, key=question_data.get('nomor'))
    
    card_top = 140
    card_bottom = 470
    draw_rounded_rect(draw, (40, card_top, WIDTH - 40, card_bottom), radius=22, fill="#111827", outline="#4F46E5", width=2)

    submateri = question_data.get('elemen', 'Aljabar')
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
    temp_dir = os.path.join(base_dir, "temp_tka_sptl")
    os.makedirs(temp_dir, exist_ok=True)

    daftar_soal = data.get('soal', []) if isinstance(data, dict) else data
    kisi_kisi = data.get('kisi_kisi', 'TKA Matematika Aljabar SMA') if isinstance(data, dict) else 'TKA Matematika Aljabar SMA'
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
    outro_speech = "Nah, itulah pembahasan enam soal sistem pertidaksamaan linear dua variabel, mulai dari menentukan sistem dari grafik, luas daerah penyelesaian, model matematika dan keuntungan maksimum, nilai minimum pada daerah tak terbatas, menghitung titik koordinat bulat, sampai menguji pernyataan. Jangan lupa like, sef, dan follow. Bagikan video ini ke teman-temanmu ya! Semangat belajar!"
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
# DATA SOAL LATIHAN TKA KELAS 12 - ALJABAR: SISTEM PERTIDAKSAMAAN LINEAR DUA VARIABEL (5 PG + 1 PG KOMPLEKS)
# ============================================================
data_soal = {
    "kisi_kisi": "TKA Kelas 12 - Matematika - Aljabar: Sistem Pertidaksamaan Linear Dua Variabel",
    "konteks_gambar": "Enam soal SPtLDV dengan grafik: mengenali sistem dari grafik, luas daerah penyelesaian, model matematika dan keuntungan maksimum, nilai minimum pada daerah tak terbatas, titik koordinat bulat, dan pernyataan majemuk.",
    "soal": [
        {
            "nomor": 1,
            "elemen": "Aljabar",
            "subtopik": "SPtLDV: Sistem dari Grafik",
            "tipe": "PG",
            "pertanyaan": "Perhatikan grafik berikut! Daerah yang diarsir merupakan daerah penyelesaian suatu sistem pertidaksamaan linear dua variabel. Sistem pertidaksamaan yang sesuai adalah ....",
            "opsi": [
                "A. x ≥ 0, y ≥ 0, 2x + y ≥ 8, x + 2y ≥ 10",
                "B. x ≥ 0, y ≥ 0, 2x + y ≤ 8, x + 2y ≤ 10",
                "C. x ≥ 0, y ≥ 0, x + 2y ≤ 8, 2x + y ≤ 10",
                "D. x ≥ 0, y ≥ 0, 2x + y ≤ 8, x + 2y ≥ 10",
                "E. x ≤ 0, y ≥ 0, 2x + y ≤ 8, x + 2y ≤ 10"
            ],
            "jawaban_benar": "B",
            "steps": [
                {
                    "judul": "Tentukan persamaan garis batas",
                    "detail": [
                        "• Garis 1 melalui (4, 0) dan (0, 8) → 2x + y = 8",
                        "• Garis 2 melalui (10, 0) dan (0, 5) → x + 2y = 10"
                    ],
                    "spoken": "Garis pertama memotong sumbu x di empat dan sumbu y di delapan, sehingga persamaannya dua x ditambah y sama dengan delapan. Garis kedua memotong sumbu x di sepuluh dan sumbu y di lima, sehingga persamaannya x ditambah dua y sama dengan sepuluh."
                },
                {
                    "judul": "Tentukan tanda dengan titik uji",
                    "detail": [
                        "• Titik O(0, 0) berada di dalam daerah arsiran.",
                        "• 2(0) + 0 = 0 ≤ 8 dan 0 + 2(0) = 0 ≤ 10 → tanda ≤",
                        "• Daerah di kuadran I → x ≥ 0 dan y ≥ 0",
                        "» Sistem: x ≥ 0, y ≥ 0, 2x + y ≤ 8, x + 2y ≤ 10 (Kunci Jawaban B)"
                    ],
                    "spoken": "Titik uji nol, nol berada di dalam daerah arsiran. Di titik itu, dua x ditambah y sama dengan nol, kurang dari delapan, dan x ditambah dua y juga nol, kurang dari sepuluh. Jadi kedua tanda adalah kurang dari atau sama dengan. Daerah berada di kuadran satu, sehingga x dan y lebih dari atau sama dengan nol. Jawaban B."
                }
            ],
            "spoken_soal": "Soal nomor 1. Perhatikan grafik berikut. Daerah yang diarsir merupakan daerah penyelesaian suatu sistem pertidaksamaan linear dua variabel. Sistem pertidaksamaan yang sesuai adalah ..."
        },
        {
            "nomor": 2,
            "elemen": "Aljabar",
            "subtopik": "SPtLDV: Luas Daerah Penyelesaian",
            "tipe": "PG",
            "pertanyaan": "Daerah penyelesaian sistem pertidaksamaan x ≥ 0, y ≥ 0, x + y ≤ 8, dan x + 3y ≤ 12 digambarkan pada grafik berikut. Luas daerah yang diarsir adalah ... satuan luas.",
            "opsi": [
                "A. 16",
                "B. 18",
                "C. 20",
                "D. 24",
                "E. 32"
            ],
            "jawaban_benar": "C",
            "steps": [
                {
                    "judul": "Cari titik-titik sudut daerah",
                    "detail": [
                        "• x + y = 8 memotong sumbu x di (8, 0); x + 3y = 12 memotong sumbu y di (0, 4).",
                        "• Perpotongan kedua garis: 2y = 4 → y = 2, x = 6 → (6, 2)",
                        "• Titik sudut: (0, 0), (8, 0), (6, 2), (0, 4)"
                    ],
                    "spoken": "Garis x ditambah y sama dengan delapan memotong sumbu x di delapan, dan garis x ditambah tiga y sama dengan dua belas memotong sumbu y di empat. Titik potong kedua garis diperoleh dengan mengurangkan persamaan, sehingga dua y sama dengan empat, jadi y sama dengan dua dan x sama dengan enam. Titik sudutnya adalah nol nol, delapan nol, enam dua, dan nol empat."
                },
                {
                    "judul": "Hitung luas dengan membagi bangun",
                    "detail": [
                        "• Segitiga (0,0), (8,0), (6,2): 1/2 × 8 × 2 = 8",
                        "• Segitiga (0,0), (6,2), (0,4): 1/2 × 4 × 6 = 12",
                        "» Luas = 8 + 12 = 20 satuan luas (Kunci Jawaban C)"
                    ],
                    "spoken": "Bagi daerah menjadi dua segitiga dari titik asal. Segitiga pertama beralas delapan pada sumbu x dengan tinggi dua, luasnya setengah kali delapan kali dua, yaitu delapan. Segitiga kedua beralas empat pada sumbu y dengan tinggi enam, luasnya setengah kali empat kali enam, yaitu dua belas. Jumlahnya dua puluh satuan luas. Jawaban C."
                }
            ],
            "spoken_soal": "Soal nomor 2. Daerah penyelesaian sistem pertidaksamaan x lebih dari atau sama dengan nol, y lebih dari atau sama dengan nol, x ditambah y kurang dari atau sama dengan delapan, dan x ditambah tiga y kurang dari atau sama dengan dua belas, digambarkan pada grafik berikut. Luas daerah yang diarsir adalah ... satuan luas."
        },
        {
            "nomor": 3,
            "elemen": "Aljabar",
            "subtopik": "SPtLDV: Model dan Nilai Optimum",
            "tipe": "PG",
            "pertanyaan": "Sebuah toko roti memiliki persediaan 10 kg tepung dan 8 kg gula. Satu roti jenis A memerlukan 200 g tepung dan 100 g gula, sedangkan satu roti jenis B memerlukan 100 g tepung dan 200 g gula. Keuntungan tiap roti A Rp3.000 dan tiap roti B Rp4.000. Keuntungan maksimum yang dapat diperoleh adalah ....",
            "spoken_soal": "Soal nomor 3. Sebuah toko roti memiliki persediaan sepuluh kilogram tepung dan delapan kilogram gula. Satu roti jenis A memerlukan dua ratus gram tepung dan seratus gram gula, sedangkan satu roti jenis B memerlukan seratus gram tepung dan dua ratus gram gula. Keuntungan tiap roti A tiga ribu rupiah dan tiap roti B empat ribu rupiah. Keuntungan maksimum yang dapat diperoleh adalah ...",
            "opsi": [
                "A. Rp150.000",
                "B. Rp160.000",
                "C. Rp180.000",
                "D. Rp200.000",
                "E. Rp220.000"
            ],
            "jawaban_benar": "D",
            "steps": [
                {
                    "judul": "Susun model matematika",
                    "detail": [
                        "• x = banyak roti A, y = banyak roti B",
                        "• Tepung: 200x + 100y ≤ 10.000 → 2x + y ≤ 100",
                        "• Gula: 100x + 200y ≤ 8.000 → x + 2y ≤ 80",
                        "• x ≥ 0, y ≥ 0; maksimumkan z = 3.000x + 4.000y"
                    ],
                    "spoken": "Misalkan x banyak roti A dan y banyak roti B. Kendala tepung: dua ratus x ditambah seratus y kurang dari atau sama dengan sepuluh ribu gram, disederhanakan menjadi dua x ditambah y kurang dari atau sama dengan seratus. Kendala gula: seratus x ditambah dua ratus y kurang dari atau sama dengan delapan ribu, menjadi x ditambah dua y kurang dari atau sama dengan delapan puluh. Tentu x dan y tidak negatif. Fungsi tujuannya z sama dengan tiga ribu x ditambah empat ribu y."
                },
                {
                    "judul": "Tentukan titik sudut daerah layak",
                    "detail": [
                        "• Sumbu: (0, 0), (50, 0), (0, 40)",
                        "• 2x + y = 100 dan x + 2y = 80 → x = 40, y = 20",
                        "• Titik sudut: (0, 0), (50, 0), (40, 20), (0, 40)"
                    ],
                    "spoken": "Titik sudut daerah layak adalah nol nol; lima puluh nol, dari dua x sama dengan seratus; nol empat puluh, dari dua y sama dengan delapan puluh; dan titik potong kedua garis. Dari dua x ditambah y sama dengan seratus, y sama dengan seratus dikurangi dua x. Substitusi ke persamaan kedua: x ditambah dua ratus dikurangi empat x sama dengan delapan puluh, sehingga x sama dengan empat puluh dan y sama dengan dua puluh."
                },
                {
                    "judul": "Uji fungsi tujuan di tiap titik sudut",
                    "detail": [
                        "• (50, 0) → 150.000",
                        "• (40, 20) → 120.000 + 80.000 = 200.000",
                        "• (0, 40) → 160.000",
                        "» Maksimum = Rp200.000 (Kunci Jawaban D)"
                    ],
                    "spoken": "Di lima puluh nol, keuntungannya seratus lima puluh ribu. Di empat puluh dua puluh, seratus dua puluh ribu ditambah delapan puluh ribu, yaitu dua ratus ribu. Di nol empat puluh, seratus enam puluh ribu. Keuntungan maksimum adalah dua ratus ribu rupiah. Jawaban D."
                }
            ]
        },
        {
            "nomor": 4,
            "elemen": "Aljabar",
            "subtopik": "SPtLDV: Nilai Minimum",
            "tipe": "PG",
            "pertanyaan": "Nilai minimum fungsi z = 2x + 3y pada daerah penyelesaian sistem pertidaksamaan x ≥ 0, y ≥ 0, x + y ≥ 5, dan x + 3y ≥ 9 adalah ....",
            "opsi": [
                "A. 12",
                "B. 13",
                "C. 15",
                "D. 18",
                "E. 21"
            ],
            "jawaban_benar": "A",
            "steps": [
                {
                    "judul": "Tentukan titik sudut daerah",
                    "detail": [
                        "• x + y = 5 memotong sumbu y di (0, 5).",
                        "• x + 3y = 9 memotong sumbu x di (9, 0).",
                        "• Perpotongan: 2y = 4 → y = 2, x = 3 → (3, 2)"
                    ],
                    "spoken": "Daerah penyelesaian berada di atas kedua garis dan tidak terbatas. Titik sudutnya adalah titik potong garis x ditambah y sama dengan lima dengan sumbu y, yaitu nol lima; titik potong garis x ditambah tiga y sama dengan sembilan dengan sumbu x, yaitu sembilan nol; dan titik potong kedua garis. Kurangkan kedua persamaan, diperoleh dua y sama dengan empat, jadi y sama dengan dua dan x sama dengan tiga."
                },
                {
                    "judul": "Uji fungsi tujuan",
                    "detail": [
                        "• (0, 5) → 2(0) + 3(5) = 15",
                        "• (3, 2) → 6 + 6 = 12",
                        "• (9, 0) → 18",
                        "» Minimum = 12 (Kunci Jawaban A)"
                    ],
                    "spoken": "Di nol lima, nilai z adalah lima belas. Di tiga dua, dua kali tiga ditambah tiga kali dua, yaitu dua belas. Di sembilan nol, delapan belas. Karena daerahnya tidak terbatas dan koefisien z positif, z tidak punya nilai maksimum, tetapi nilai minimumnya adalah dua belas. Jawaban A."
                }
            ],
            "spoken_soal": "Soal nomor 4. Nilai minimum fungsi z sama dengan dua x ditambah tiga y, pada daerah penyelesaian sistem pertidaksamaan x lebih dari atau sama dengan nol, y lebih dari atau sama dengan nol, x ditambah y lebih dari atau sama dengan lima, dan x ditambah tiga y lebih dari atau sama dengan sembilan, adalah ..."
        },
        {
            "nomor": 5,
            "elemen": "Aljabar",
            "subtopik": "SPtLDV: Titik Koordinat Bulat",
            "tipe": "PG",
            "pertanyaan": "Daerah penyelesaian sistem pertidaksamaan x ≥ 0, y ≥ 0, x + y ≤ 6, dan 2x + y ≤ 8 diarsir pada grafik. Banyak titik (x, y) dengan x dan y bilangan bulat yang berada pada daerah arsiran, termasuk pada batasnya, adalah ....",
            "opsi": [
                "A. 16",
                "B. 18",
                "C. 20",
                "D. 21",
                "E. 22"
            ],
            "jawaban_benar": "E",
            "steps": [
                {
                    "judul": "Tentukan batas y untuk setiap nilai x",
                    "detail": [
                        "• 0 ≤ y ≤ 6 − x dan y ≤ 8 − 2x",
                        "• Kedua garis berpotongan di (2, 4).",
                        "• Untuk x ≤ 2 batas atasnya 6 − x; untuk x ≥ 2 batas atasnya 8 − 2x."
                    ],
                    "spoken": "Untuk setiap nilai x bulat, nilai y bulat harus memenuhi y lebih dari atau sama dengan nol, y kurang dari atau sama dengan enam dikurangi x, dan y kurang dari atau sama dengan delapan dikurangi dua x. Kedua garis berpotongan di dua, empat. Untuk x sampai dua, batas atasnya enam dikurangi x. Untuk x lebih dari dua, batas atasnya delapan dikurangi dua x."
                },
                {
                    "judul": "Hitung banyak titik pada tiap nilai x",
                    "detail": [
                        "• x = 0 → 7 titik, x = 1 → 6 titik, x = 2 → 5 titik",
                        "• x = 3 → y = 0..2 → 3 titik, x = 4 → y = 0 → 1 titik",
                        "» Jumlah = 7 + 6 + 5 + 3 + 1 = 22 titik (Kunci Jawaban E)"
                    ],
                    "spoken": "Untuk x sama dengan nol, y dari nol sampai enam, ada tujuh titik. Untuk x sama dengan satu, y dari nol sampai lima, ada enam titik. Untuk x sama dengan dua, y dari nol sampai empat, ada lima titik. Untuk x sama dengan tiga, batas atasnya delapan dikurangi enam, yaitu dua, jadi y dari nol sampai dua, ada tiga titik. Untuk x sama dengan empat, batas atasnya nol, ada satu titik. Jumlahnya tujuh ditambah enam ditambah lima ditambah tiga ditambah satu, yaitu dua puluh dua titik. Jawaban E."
                }
            ],
            "spoken_soal": "Soal nomor 5. Daerah penyelesaian sistem pertidaksamaan x lebih dari atau sama dengan nol, y lebih dari atau sama dengan nol, x ditambah y kurang dari atau sama dengan enam, dan dua x ditambah y kurang dari atau sama dengan delapan, diarsir pada grafik. Banyak titik x koma y dengan x dan y bilangan bulat yang berada pada daerah arsiran, termasuk pada batasnya, adalah ..."
        },
        {
            "nomor": 6,
            "elemen": "Aljabar",
            "subtopik": "SPtLDV: Uji Pernyataan",
            "tipe": "PG Kompleks",
            "pertanyaan": "Perhatikan grafik daerah penyelesaian sistem pertidaksamaan x ≥ 0, y ≥ 0, 3x + 2y ≤ 18, dan x + 2y ≤ 10. Tentukan SEMUA pernyataan yang BENAR:",
            "pernyataan": {
                "A": "Titik potong kedua garis batas adalah (4, 3).",
                "B": "Titik (5, 2) termasuk dalam daerah penyelesaian.",
                "C": "Nilai maksimum z = 2x + 3y pada daerah tersebut adalah 17.",
                "D": "Luas daerah penyelesaian adalah 21 satuan luas.",
                "E": "Titik (2, 4) termasuk dalam daerah penyelesaian."
            },
            "jawaban_benar": [
                "A",
                "C",
                "E"
            ],
            "steps": [
                {
                    "judul": "Uji pernyataan A dan B",
                    "detail": [
                        "• A: 3x + 2y = 18 dan x + 2y = 10 → 2x = 8 → x = 4, y = 3 → BENAR",
                        "• B: (5, 2) → 3(5) + 2(2) = 19 > 18 → SALAH"
                    ],
                    "spoken": "Pernyataan A. Kurangkan x ditambah dua y sama dengan sepuluh dari tiga x ditambah dua y sama dengan delapan belas, diperoleh dua x sama dengan delapan, jadi x sama dengan empat dan y sama dengan tiga. A benar. Pernyataan B. Untuk titik lima, dua, tiga kali lima ditambah dua kali dua sama dengan sembilan belas, lebih dari delapan belas, sehingga titik itu di luar daerah. B salah."
                },
                {
                    "judul": "Uji pernyataan C dan D",
                    "detail": [
                        "• Titik sudut: (0, 0), (6, 0), (4, 3), (0, 5)",
                        "• C: z = 12, 17, 15 di tiga titik sudut → maksimum 17 → BENAR",
                        "• D: luas = 1/2 × 6 × 3 + 1/2 × 5 × 4 = 9 + 10 = 19, bukan 21 → SALAH"
                    ],
                    "spoken": "Titik sudut daerahnya adalah nol nol, enam nol, empat tiga, dan nol lima. Pernyataan C. Nilai z di enam nol adalah dua belas, di empat tiga adalah dua kali empat ditambah tiga kali tiga, yaitu tujuh belas, dan di nol lima adalah lima belas. Maksimumnya tujuh belas, jadi C benar. Pernyataan D. Bagi daerah menjadi dua segitiga dari titik asal. Segitiga pertama setengah kali enam kali tiga, yaitu sembilan. Segitiga kedua setengah kali lima kali empat, yaitu sepuluh. Luasnya sembilan belas, bukan dua puluh satu, jadi D salah."
                },
                {
                    "judul": "Uji pernyataan E",
                    "detail": [
                        "• E: (2, 4) → 3(2) + 2(4) = 14 ≤ 18 dan 2 + 2(4) = 10 ≤ 10 → BENAR (di batas)",
                        "» Jawaban Benar = A, C, E"
                    ],
                    "spoken": "Pernyataan E. Untuk titik dua, empat, tiga kali dua ditambah dua kali empat sama dengan empat belas, kurang dari delapan belas, dan dua ditambah dua kali empat sama dengan sepuluh, tepat pada batas. Karena pertidaksamaannya memuat tanda sama dengan, titik di batas termasuk daerah penyelesaian. E benar. Jadi pernyataan yang benar adalah A, C, dan E."
                }
            ],
            "spoken_soal": "Soal nomor 6. Perhatikan grafik daerah penyelesaian sistem pertidaksamaan x lebih dari atau sama dengan nol, y lebih dari atau sama dengan nol, tiga x ditambah dua y kurang dari atau sama dengan delapan belas, dan x ditambah dua y kurang dari atau sama dengan sepuluh. Tentukan semua pernyataan yang benar."
        }
    ]
}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate Video Animasi Pembahasan Latihan TKA Matematika (Aljabar: SPtLDV)")
    parser.add_argument("output", nargs="?",
                        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "video_tka12_sptl.mp4"),
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

