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


# Soal Data dan Peluang tidak memakai diagram grafik; kartu gambar hanya memuat timer.
_DIAGRAM_BUILDERS = {}
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


# ------------------------------------------------------------
# Ikon bergaya emoji yang sesuai dengan tiap soal (kotak di bawah teks soal).
# Digambar manual dengan PIL agar tidak bergantung pada font emoji (Termux sering tidak punya).
# Tiap nomor soal punya rangkaian ikon sendiri; nomor lain memakai ikon umum (senang & belajar).
# ------------------------------------------------------------
EMOJI_SS = 3  # supersampling agar tepi halus
EMOJI_W, EMOJI_H = 820, 540
_emoji_base = {}
_emoji_cache = {}


def _star_points(cx, cy, r_out, r_in, n=5, rot=-90):
    pts = []
    for i in range(n * 2):
        r = r_out if i % 2 == 0 else r_in
        a = math.radians(rot + i * 180.0 / n)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def _tf(pts, cx, cy, deg):
    """Putar titik (relatif terhadap pusat) sebesar deg derajat lalu geser ke (cx, cy)."""
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return [(cx + x * c - y * s, cy + x * s + y * c) for x, y in pts]


def _poly(d, k, pts, fill, outline=None, width=1):
    sp = [(x * k, y * k) for x, y in pts]
    d.polygon(sp, fill=fill)
    if outline:
        d.line(sp + [sp[0]], fill=outline, width=max(1, int(width * k)), joint="curve")


def _rrect(d, k, x0, y0, x1, y1, r, fill, outline=None, width=1):
    d.rounded_rectangle([x0 * k, y0 * k, x1 * k, y1 * k], radius=max(1, int(r * k)), fill=fill,
                        outline=outline, width=max(1, int(width * k)))


def _circle(d, k, cx, cy, r, fill, outline=None, width=1):
    d.ellipse([(cx - r) * k, (cy - r) * k, (cx + r) * k, (cy + r) * k], fill=fill,
              outline=outline, width=max(1, int(width * k)))


def _pen(d, k, pts, fill, width):
    """Garis tebal berujung bulat."""
    d.line([(x * k, y * k) for x, y in pts], fill=fill, width=max(1, int(width * k)), joint="curve")
    for x, y in (pts[0], pts[-1]):
        _circle(d, k, x, y, width / 2.0, fill)


def _blend_circle(im, k, cx, cy, r, rgba):
    """Lingkaran semi-transparan yang menyatu dengan latar (untuk diagram Venn)."""
    pad = 2
    size = int(2 * r * k) + 2 * pad
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([pad, pad, pad + 2 * r * k, pad + 2 * r * k], fill=rgba)
    im.alpha_composite(layer, dest=(int(cx * k - r * k) - pad, int(cy * k - r * k) - pad))


# ---------- ikon umum (senang & belajar) ----------
def _icon_smiley(d, k, cx, cy, r):
    _circle(d, k, cx, cy, r, "#FFD43B", "#F08C00", r * 0.05)
    for sx in (-1, 1):  # pipi
        px, py = cx + sx * r * 0.60, cy + r * 0.20
        d.ellipse([(px - r * 0.17) * k, (py - r * 0.11) * k, (px + r * 0.17) * k, (py + r * 0.11) * k], fill="#FFA8A8")
    w = max(3, int(r * 0.08 * k))
    for sx in (-1, 1):  # mata tertawa ^ ^
        ex, ey = cx + sx * r * 0.36, cy - r * 0.14
        d.arc([(ex - r * 0.17) * k, (ey - r * 0.15) * k, (ex + r * 0.17) * k, (ey + r * 0.15) * k],
              200, 340, fill="#5C3A00", width=w)
    d.chord([(cx - r * 0.52) * k, (cy - r * 0.05) * k, (cx + r * 0.52) * k, (cy + r * 0.62) * k],
            0, 180, fill="#7A2E00")
    d.ellipse([(cx - r * 0.22) * k, (cy + r * 0.32) * k, (cx + r * 0.22) * k, (cy + r * 0.58) * k], fill="#FF8787")


def _icon_heart(d, k, cx, cy, s):
    col = "#F03E3E"
    rr = s * 0.30
    for sx in (-1, 1):
        _circle(d, k, cx + sx * s * 0.28, cy - s * 0.12, rr, col)
    _poly(d, k, [(cx - s * 0.57, cy - s * 0.03), (cx + s * 0.57, cy - s * 0.03), (cx, cy + s * 0.60)], fill=col)
    hx, hy = cx - s * 0.30, cy - s * 0.22
    d.ellipse([(hx - s * 0.10) * k, (hy - s * 0.06) * k, (hx + s * 0.10) * k, (hy + s * 0.06) * k], fill="#FFA8A8")


def _icon_star(d, k, cx, cy, r):
    _poly(d, k, _star_points(cx, cy, r, r * 0.45), fill="#FFC107", outline="#F08C00", width=r * 0.07)


def _icon_book(d, k, cx, cy, w):
    h = w * 0.68
    pad = w * 0.05
    _rrect(d, k, cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, w * 0.06, "#1C7ED6")
    _rrect(d, k, cx - w / 2 + pad, cy - h / 2 + pad, cx - w * 0.015, cy + h / 2 - pad, w * 0.03, "#FFFFFF")
    _rrect(d, k, cx + w * 0.015, cy - h / 2 + pad, cx + w / 2 - pad, cy + h / 2 - pad, w * 0.03, "#FFFFFF")
    for i in range(4):
        y = cy - h / 2 + pad + h * 0.17 + i * h * 0.16
        _pen(d, k, [(cx - w / 2 + pad * 2.4, y), (cx - w * 0.09, y)], "#ADB5BD", w * 0.022)
        _pen(d, k, [(cx + w * 0.09, y), (cx + w / 2 - pad * 2.4, y)], "#ADB5BD", w * 0.022)
    _poly(d, k, [(cx + w * 0.22, cy - h / 2 + pad), (cx + w * 0.32, cy - h / 2 + pad),
                 (cx + w * 0.32, cy - h / 2 + pad + h * 0.30), (cx + w * 0.27, cy - h / 2 + pad + h * 0.24),
                 (cx + w * 0.22, cy - h / 2 + pad + h * 0.30)], fill="#F03E3E")


def _icon_bulb(d, k, cx, cy, s):
    for deg in (-165, -128, -90, -52, -15):  # sinar
        a = math.radians(deg)
        x1, y1 = cx + math.cos(a) * s * 0.58, cy - s * 0.10 + math.sin(a) * s * 0.58
        x2, y2 = cx + math.cos(a) * s * 0.78, cy - s * 0.10 + math.sin(a) * s * 0.78
        _pen(d, k, [(x1, y1), (x2, y2)], "#FAB005", s * 0.04)
    r = s * 0.40
    by = cy - s * 0.10
    _circle(d, k, cx, by, r, "#FFE066", "#F59F00", s * 0.03)
    _poly(d, k, [(cx - s * 0.20, cy + s * 0.16), (cx + s * 0.20, cy + s * 0.16),
                 (cx + s * 0.15, cy + s * 0.34), (cx - s * 0.15, cy + s * 0.34)], fill="#FFE066")
    _rrect(d, k, cx - s * 0.17, cy + s * 0.33, cx + s * 0.17, cy + s * 0.44, s * 0.03, "#868E96")
    _rrect(d, k, cx - s * 0.10, cy + s * 0.44, cx + s * 0.10, cy + s * 0.51, s * 0.03, "#495057")
    d.ellipse([(cx - r * 0.55) * k, (by - r * 0.62) * k, (cx - r * 0.20) * k, (by - r * 0.28) * k], fill="#FFF3BF")


def _icon_pencil(d, k, cx, cy, L, deg=-25):
    w = L * 0.17
    parts = [
        ([(-L / 2 - L * 0.11, -w / 2), (-L / 2, -w / 2), (-L / 2, w / 2), (-L / 2 - L * 0.11, w / 2)], "#FF8787"),
        ([(-L / 2, -w / 2), (L * 0.28, -w / 2), (L * 0.28, w / 2), (-L / 2, w / 2)], "#FFD43B"),
        ([(-L / 2, -w * 0.12), (L * 0.28, -w * 0.12), (L * 0.28, w * 0.12), (-L / 2, w * 0.12)], "#F59F00"),
        ([(L * 0.28, -w / 2), (L / 2, 0), (L * 0.28, w / 2)], "#F1C27D"),
        ([(L * 0.41, -w * 0.16), (L / 2, 0), (L * 0.41, w * 0.16)], "#343A40"),
    ]
    for pts, col in parts:
        _poly(d, k, _tf(pts, cx, cy, deg), fill=col)


def _sparkle(d, k, cx, cy, r, fill):
    _poly(d, k, _star_points(cx, cy, r, r * 0.28, n=4, rot=-90), fill=fill)


# ---------- ikon soal 1: nilai ulangan, median data berkelompok ----------
def _icon_sheet(d, k, cx, cy, w):
    """Lembar ulangan dengan centang merah."""
    h = w * 1.25
    x0, y0 = cx - w / 2, cy - h / 2
    _rrect(d, k, x0, y0, x0 + w, y0 + h, w * 0.07, "#FFFFFF", "#ADB5BD", w * 0.015)
    _rrect(d, k, x0 + w * 0.10, y0 + h * 0.07, x0 + w * 0.90, y0 + h * 0.15, w * 0.03, "#4DABF7")
    for i in range(5):
        y = y0 + h * 0.26 + i * h * 0.105
        x1 = x0 + w * (0.86 if i % 2 == 0 else 0.64)
        _pen(d, k, [(x0 + w * 0.14, y), (x1, y)], "#CED4DA", w * 0.025)
    _pen(d, k, [(x0 + w * 0.52, y0 + h * 0.80), (x0 + w * 0.64, y0 + h * 0.91), (x0 + w * 0.88, y0 + h * 0.66)],
         "#F03E3E", w * 0.07)


def _icon_barchart(d, k, cx, cy, w):
    """Histogram / diagram batang."""
    h = w * 0.78
    x0, y0 = cx - w / 2, cy - h / 2
    _rrect(d, k, x0, y0, x0 + w, y0 + h, w * 0.06, "#FFFFFF", "#ADB5BD", w * 0.015)
    cols = ["#339AF0", "#51CF66", "#FFD43B", "#FF922B", "#F06595"]
    fr = [0.38, 0.58, 0.78, 0.98, 0.50]
    bw, gap = w * 0.14, w * 0.025
    bx = cx - (5 * bw + 4 * gap) / 2
    base = y0 + h * 0.88
    for i, (c, f) in enumerate(zip(cols, fr)):
        x = bx + i * (bw + gap)
        _rrect(d, k, x, base - h * 0.68 * f, x + bw, base, w * 0.015, c)
    _pen(d, k, [(x0 + w * 0.07, base), (x0 + w * 0.93, base)], "#868E96", w * 0.015)


def _icon_gradcap(d, k, cx, cy, w):
    _poly(d, k, [(cx - 0.28 * w, cy), (cx + 0.28 * w, cy), (cx + 0.24 * w, cy + 0.22 * w), (cx - 0.24 * w, cy + 0.22 * w)],
          fill="#364FC7")
    _poly(d, k, [(cx, cy - 0.30 * w), (cx + 0.5 * w, cy - 0.06 * w), (cx, cy + 0.18 * w), (cx - 0.5 * w, cy - 0.06 * w)],
          fill="#4C6EF5", outline="#364FC7", width=w * 0.012)
    _pen(d, k, [(cx, cy - 0.06 * w), (cx + 0.40 * w, cy + 0.01 * w), (cx + 0.40 * w, cy + 0.26 * w)], "#FAB005", w * 0.02)
    _circle(d, k, cx + 0.40 * w, cy + 0.29 * w, w * 0.045, "#FAB005")


# ---------- ikon soal 2: rata-rata dan simpangan baku ----------
def _icon_calc(d, k, cx, cy, h):
    w = h * 0.74
    x0, y0 = cx - w / 2, cy - h / 2
    _rrect(d, k, x0, y0, x0 + w, y0 + h, w * 0.10, "#495057", "#212529", w * 0.02)
    _rrect(d, k, x0 + w * 0.10, y0 + h * 0.07, x0 + w * 0.90, y0 + h * 0.25, w * 0.04, "#B2F2BB")
    _pen(d, k, [(x0 + w * 0.50, y0 + h * 0.16), (x0 + w * 0.84, y0 + h * 0.16)], "#2B8A3E", h * 0.03)
    cw, ch = w * 0.80 / 4, h * 0.63 / 4
    for r in range(4):
        for c in range(4):
            bx, by = x0 + w * 0.10 + c * cw, y0 + h * 0.32 + r * ch
            _rrect(d, k, bx + w * 0.02, by + h * 0.015, bx + cw - w * 0.02, by + ch - h * 0.015, w * 0.03,
                   "#FF922B" if c == 3 else "#E9ECEF")


def _icon_bell(d, k, cx, cy, w):
    """Kurva distribusi normal: rata-rata (tengah) dan simpangan baku (penanda kiri-kanan)."""
    h = w * 0.62
    x0, y0 = cx - w / 2, cy - h / 2
    _rrect(d, k, x0, y0, x0 + w, y0 + h, w * 0.06, "#FFFFFF", "#ADB5BD", w * 0.015)
    left, right = cx - w * 0.42, cx + w * 0.42
    base = cy + h * 0.32
    pts = []
    for i in range(61):
        t = -3 + 6 * i / 60.0
        pts.append((left + (t + 3) / 6.0 * (right - left), base - math.exp(-t * t / 2.0) * h * 0.58))
    _poly(d, k, pts + [(right, base), (left, base)], fill="#A5D8FF")
    _pen(d, k, pts, "#1C7ED6", w * 0.014)
    _pen(d, k, [(left, base), (right, base)], "#868E96", w * 0.012)
    for t, col in ((0, "#F03E3E"), (-1, "#F59F00"), (1, "#F59F00")):
        x = left + (t + 3) / 6.0 * (right - left)
        top = base - math.exp(-t * t / 2.0) * h * 0.58
        _pen(d, k, [(x, top), (x, base)], col, w * 0.012)


def _icon_ruler(d, k, cx, cy, L, deg=-18):
    w = L * 0.20
    body = [(-L / 2, -w / 2), (L / 2, -w / 2), (L / 2, w / 2), (-L / 2, w / 2)]
    _poly(d, k, _tf(body, cx, cy, deg), fill="#FFD43B", outline="#F08C00", width=L * 0.012)
    n = 10
    for i in range(n + 1):
        x = -L / 2 + L * 0.04 + i * (L * 0.92 / n)
        ln = w * (0.55 if i % 5 == 0 else 0.32)
        _pen(d, k, _tf([(x, -w / 2), (x, -w / 2 + ln)], cx, cy, deg), "#5C3A00", L * 0.008)


def _data_dots(d, k, x, y, r, n=10):
    """Kelompok titik data berwarna (10 data)."""
    cols = ["#339AF0", "#51CF66", "#FFD43B", "#FF922B", "#F06595"]
    for i in range(n):
        _circle(d, k, x + (i % 5) * r * 2.6, y + (i // 5) * r * 2.6, r, cols[i % 5], "#FFFFFF", r * 0.18)


# ---------- ikon soal 3: kode 4 angka ----------
def _icon_lock(d, k, cx, cy, s):
    _pen(d, k, [(cx - 0.26 * s, cy - 0.08 * s), (cx - 0.26 * s, cy - 0.36 * s)], "#868E96", s * 0.09)
    _pen(d, k, [(cx + 0.26 * s, cy - 0.08 * s), (cx + 0.26 * s, cy - 0.36 * s)], "#868E96", s * 0.09)
    d.arc([(cx - 0.26 * s - s * 0.045) * k, (cy - 0.62 * s) * k, (cx + 0.26 * s + s * 0.045) * k, (cy - 0.10 * s) * k],
          180, 360, fill="#868E96", width=max(1, int(s * 0.09 * k)))
    _rrect(d, k, cx - 0.42 * s, cy - 0.10 * s, cx + 0.42 * s, cy + 0.50 * s, s * 0.08, "#FFC107", "#F08C00", s * 0.025)
    _circle(d, k, cx, cy + 0.19 * s, s * 0.08, "#5C3A00")
    _poly(d, k, [(cx - 0.035 * s, cy + 0.20 * s), (cx + 0.035 * s, cy + 0.20 * s),
                 (cx + 0.05 * s, cy + 0.36 * s), (cx - 0.05 * s, cy + 0.36 * s)], fill="#5C3A00")


def _icon_tiles(d, k, cx, cy, sz, digits, cols):
    n = len(digits)
    gap = sz * 0.18
    x = cx - (n * sz + (n - 1) * gap) / 2
    f = get_font(max(8, int(sz * 0.62 * k)), bold=True)
    for i, (dg, c) in enumerate(zip(digits, cols)):
        x0 = x + i * (sz + gap)
        _rrect(d, k, x0, cy - sz / 2, x0 + sz, cy + sz / 2, sz * 0.18, c, "#FFFFFF", sz * 0.04)
        d.text(((x0 + sz / 2) * k, cy * k), str(dg), font=f, fill="#FFFFFF", anchor="mm")


def _icon_key(d, k, cx, cy, L, deg=-35):
    col = "#F59F00"
    rc = _tf([(-L / 2 + 0.17 * L, 0)], cx, cy, deg)[0]
    _circle(d, k, rc[0], rc[1], L * 0.17, None, col, L * 0.07)
    t = L * 0.035
    _poly(d, k, _tf([(-L / 2 + 0.30 * L, -t), (L / 2, -t), (L / 2, t), (-L / 2 + 0.30 * L, t)], cx, cy, deg), fill=col)
    _poly(d, k, _tf([(L / 2 - 0.14 * L, t), (L / 2 - 0.08 * L, t), (L / 2 - 0.08 * L, L * 0.13), (L / 2 - 0.14 * L, L * 0.13)], cx, cy, deg), fill=col)
    _poly(d, k, _tf([(L / 2 - 0.27 * L, t), (L / 2 - 0.21 * L, t), (L / 2 - 0.21 * L, L * 0.10), (L / 2 - 0.27 * L, L * 0.10)], cx, cy, deg), fill=col)


# ---------- ikon soal 4: mesin pabrik dan produk cacat ----------
def _icon_gear(d, k, cx, cy, ro, n=10):
    ri = ro * 0.80
    step = 2 * math.pi / n
    pts = []
    for i in range(n):
        for da, r in ((-0.30, ri), (-0.18, ro), (0.18, ro), (0.30, ri)):
            a = i * step + da * step
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    _poly(d, k, pts, fill="#868E96", outline="#495057", width=ro * 0.04)
    _circle(d, k, cx, cy, ro * 0.55, "#ADB5BD", "#495057", ro * 0.03)
    _circle(d, k, cx, cy, ro * 0.27, (0, 0, 0, 0))  # lubang tengah transparan


def _icon_box(d, k, cx, cy, s):
    """Kotak produk dengan tanda silang merah (cacat)."""
    _rrect(d, k, cx - 0.50 * s, cy - 0.36 * s, cx + 0.50 * s, cy - 0.08 * s, s * 0.04, "#C98B4B", "#A9713A", s * 0.02)
    _rrect(d, k, cx - 0.45 * s, cy - 0.08 * s, cx + 0.45 * s, cy + 0.46 * s, s * 0.04, "#D9A066", "#A9713A", s * 0.02)
    _rrect(d, k, cx - 0.07 * s, cy - 0.36 * s, cx + 0.07 * s, cy + 0.46 * s, 0, "#F1D9B0")
    _rrect(d, k, cx + 0.14 * s, cy + 0.12 * s, cx + 0.38 * s, cy + 0.28 * s, s * 0.02, "#FFFFFF")
    bx, by, br = cx + 0.40 * s, cy + 0.38 * s, 0.19 * s
    _circle(d, k, bx, by, br, "#F03E3E", "#FFFFFF", s * 0.025)
    _pen(d, k, [(bx - br * 0.45, by - br * 0.45), (bx + br * 0.45, by + br * 0.45)], "#FFFFFF", s * 0.05)
    _pen(d, k, [(bx - br * 0.45, by + br * 0.45), (bx + br * 0.45, by - br * 0.45)], "#FFFFFF", s * 0.05)


def _icon_magnifier(d, k, cx, cy, s):
    gx, gy, gr = cx - 0.10 * s, cy - 0.10 * s, 0.33 * s
    _pen(d, k, [(gx + gr * 0.72, gy + gr * 0.72), (cx + 0.42 * s, cy + 0.42 * s)], "#495057", s * 0.12)
    _circle(d, k, gx, gy, gr, "#D0EBFF", "#339AF0", s * 0.07)
    d.arc([(gx - gr * 0.62) * k, (gy - gr * 0.62) * k, (gx + gr * 0.62) * k, (gy + gr * 0.62) * k],
          200, 260, fill="#FFFFFF", width=max(1, int(s * 0.04 * k)))


# ---------- ikon soal 5: kejadian saling bebas / saling lepas ----------
def _icon_die(d, k, cx, cy, s, face, body="#FFFFFF", pip="#343A40", edge="#868E96"):
    _rrect(d, k, cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2, s * 0.18, body, edge, s * 0.03)
    o = s * 0.24
    pos = {1: [(0, 0)], 2: [(-o, -o), (o, o)], 3: [(-o, -o), (0, 0), (o, o)],
           4: [(-o, -o), (o, -o), (-o, o), (o, o)],
           5: [(-o, -o), (o, -o), (0, 0), (-o, o), (o, o)],
           6: [(-o, -o), (o, -o), (-o, 0), (o, 0), (-o, o), (o, o)]}
    for dx, dy in pos[face]:
        _circle(d, k, cx + dx, cy + dy, s * 0.075, pip)


def _icon_venn(im, d, k, cx, cy, r, off):
    _blend_circle(im, k, cx - off, cy, r, (77, 171, 247, 150))
    _blend_circle(im, k, cx + off, cy, r, (255, 107, 107, 150))
    _circle(d, k, cx - off, cy, r, None, "#1C7ED6", r * 0.03)
    _circle(d, k, cx + off, cy, r, None, "#E03131", r * 0.03)


def _icon_coin(d, k, cx, cy, r):
    _circle(d, k, cx, cy, r, "#FFC107", "#F08C00", r * 0.06)
    _circle(d, k, cx, cy, r * 0.78, None, "#FFE066", r * 0.05)
    _poly(d, k, _star_points(cx, cy, r * 0.46, r * 0.20), fill="#FFE066")


# ---------- ikon soal 6: kantong berisi bola merah dan biru ----------
def _icon_ball(d, k, cx, cy, r, col, edge, shine="#FFFFFF"):
    _circle(d, k, cx, cy, r, col, edge, r * 0.05)
    d.ellipse([(cx - r * 0.55) * k, (cy - r * 0.62) * k, (cx - r * 0.12) * k, (cy - r * 0.30) * k], fill=shine)


def _icon_bag(d, k, cx, cy, s):
    brown, edge = "#C58B4A", "#8A5A2B"
    d.ellipse([(cx - 0.23 * s) * k, (cy - 0.40 * s) * k, (cx + 0.23 * s) * k, (cy - 0.22 * s) * k], fill="#6B4423")  # mulut kantong
    _icon_ball(d, k, cx - 0.10 * s, cy - 0.40 * s, 0.13 * s, "#FA5252", "#C92A2A")
    _icon_ball(d, k, cx + 0.11 * s, cy - 0.42 * s, 0.13 * s, "#339AF0", "#1864AB")
    _poly(d, k, [(cx - 0.23 * s, cy - 0.31 * s), (cx + 0.23 * s, cy - 0.31 * s), (cx + 0.28 * s, cy - 0.04 * s), (cx - 0.28 * s, cy - 0.04 * s)],
          fill=brown, outline=edge, width=s * 0.012)
    d.ellipse([(cx - 0.44 * s) * k, (cy - 0.20 * s) * k, (cx + 0.44 * s) * k, (cy + 0.50 * s) * k], fill=brown, outline=edge, width=max(1, int(s * 0.012 * k)))
    _rrect(d, k, cx - 0.25 * s, cy - 0.14 * s, cx + 0.25 * s, cy - 0.05 * s, s * 0.04, "#E03131")
    _circle(d, k, cx + 0.02 * s, cy - 0.095 * s, s * 0.045, "#FA5252")  # simpul tali


# ---------- komposisi per soal (kanvas 820 x 540) ----------
def _scene_generic(im, d, k):
    _sparkle(d, k, 255, 85, 24, "#74C0FC")
    _sparkle(d, k, 585, 60, 20, "#B197FC")
    _sparkle(d, k, 300, 505, 18, "#FF8787")
    _sparkle(d, k, 545, 495, 24, "#74C0FC")
    _icon_pencil(d, k, 410, 52, 190, deg=-12)
    _icon_heart(d, k, 105, 150, 135)
    _icon_star(d, k, 715, 150, 74)
    _icon_book(d, k, 118, 405, 195)
    _icon_bulb(d, k, 705, 405, 160)
    _icon_smiley(d, k, 410, 290, 165)


def _scene_1(im, d, k):  # median data berkelompok, nilai ulangan siswa
    _sparkle(d, k, 330, 70, 22, "#74C0FC")
    _sparkle(d, k, 520, 60, 18, "#FF8787")
    _sparkle(d, k, 40, 330, 16, "#FFC107")
    _sparkle(d, k, 790, 380, 20, "#B197FC")
    _icon_sheet(d, k, 135, 185, 175)
    _icon_gradcap(d, k, 690, 150, 240)
    _icon_barchart(d, k, 420, 310, 340)
    _icon_pencil(d, k, 150, 450, 210, deg=-30)
    _icon_star(d, k, 700, 420, 62)


def _scene_2(im, d, k):  # rata-rata dan simpangan baku
    _sparkle(d, k, 300, 60, 20, "#74C0FC")
    _sparkle(d, k, 330, 500, 22, "#FF8787")
    _sparkle(d, k, 40, 480, 16, "#FFC107")
    _sparkle(d, k, 790, 300, 18, "#B197FC")
    _icon_calc(d, k, 130, 270, 270)
    _icon_bell(d, k, 440, 280, 400)
    _data_dots(d, k, 585, 70, 20)
    _icon_ruler(d, k, 640, 465, 300, deg=-12)


def _scene_3(im, d, k):  # kode 4 angka berbeda
    _sparkle(d, k, 200, 90, 22, "#74C0FC")
    _sparkle(d, k, 620, 70, 18, "#FF8787")
    _sparkle(d, k, 40, 330, 16, "#FFC107")
    _sparkle(d, k, 790, 400, 20, "#B197FC")
    _icon_lock(d, k, 410, 240, 300)
    _icon_key(d, k, 690, 150, 250, deg=-35)
    _icon_key(d, k, 140, 190, 200, deg=35)
    _icon_tiles(d, k, 410, 470, 78, [1, 2, 3, 4, 5, 6], ["#339AF0", "#51CF66", "#FF922B", "#F06595", "#7950F2", "#20C997"])


def _scene_4(im, d, k):  # mesin pabrik dan produk cacat
    _sparkle(d, k, 330, 60, 20, "#74C0FC")
    _sparkle(d, k, 520, 505, 20, "#FF8787")
    _sparkle(d, k, 40, 480, 16, "#FFC107")
    _sparkle(d, k, 790, 420, 18, "#B197FC")
    _icon_gear(d, k, 135, 185, 105)
    _icon_gear(d, k, 222, 372, 60, n=8)
    _icon_box(d, k, 430, 300, 290)
    _icon_magnifier(d, k, 690, 240, 250)


def _scene_5(im, d, k):  # kejadian saling bebas dan saling lepas
    _sparkle(d, k, 300, 60, 20, "#74C0FC")
    _sparkle(d, k, 540, 500, 22, "#FF8787")
    _sparkle(d, k, 40, 470, 16, "#FFC107")
    _sparkle(d, k, 790, 450, 18, "#B197FC")
    _icon_venn(im, d, k, 415, 275, 140, 85)
    _icon_die(d, k, 105, 190, 125, 5)
    _icon_die(d, k, 115, 372, 112, 3, body="#FA5252", pip="#FFFFFF", edge="#C92A2A")
    _icon_coin(d, k, 722, 195, 92)
    _icon_coin(d, k, 650, 400, 62)


def _scene_6(im, d, k):  # kantong berisi bola merah dan biru
    _sparkle(d, k, 300, 70, 20, "#FFC107")
    _sparkle(d, k, 560, 70, 18, "#74C0FC")
    _sparkle(d, k, 40, 420, 16, "#FF8787")
    _sparkle(d, k, 790, 470, 20, "#B197FC")
    _icon_bag(d, k, 410, 310, 300)
    _icon_ball(d, k, 120, 215, 95, "#FA5252", "#C92A2A")
    _icon_ball(d, k, 705, 215, 95, "#339AF0", "#1864AB")
    _icon_ball(d, k, 170, 440, 52, "#FA5252", "#C92A2A")
    _icon_ball(d, k, 650, 450, 56, "#339AF0", "#1864AB")


_EMOJI_SCENES = {1: _scene_1, 2: _scene_2, 3: _scene_3, 4: _scene_4, 5: _scene_5, 6: _scene_6}


def _scene_key(nomor):
    try:
        return int(nomor)
    except (TypeError, ValueError):
        return None


def build_emoji_banner(nomor=None):
    """Banner ikon (RGBA transparan) untuk satu nomor soal; di-cache."""
    key = _scene_key(nomor)
    if key in _emoji_base:
        return _emoji_base[key]
    k = EMOJI_SS
    im = Image.new("RGBA", (EMOJI_W * k, EMOJI_H * k), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    _EMOJI_SCENES.get(key, _scene_generic)(im, d, k)
    _emoji_base[key] = im.resize((EMOJI_W, EMOJI_H), RESAMPLE)
    return _emoji_base[key]


def get_emoji_banner(nomor, max_w, max_h):
    """Banner ikon yang sudah diskalakan agar muat di kotak (di-cache per soal & ukuran)."""
    ck = (_scene_key(nomor), max_w, max_h)
    if ck in _emoji_cache:
        return _emoji_cache[ck]
    try:
        base = build_emoji_banner(nomor)
        w, h = base.size
        ratio = min(max_w / w, max_h / h, 1.0)
        result = base.resize((max(1, int(w * ratio)), max(1, int(h * ratio))), RESAMPLE)
    except Exception as e:
        print(f"Peringatan: gagal membuat ikon emoji: {e}")
        result = None
    _emoji_cache[ck] = result
    return result


HAND_MISSING = set("√≈≠≤≥±·×÷π∠θ⊥»→−½²")


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
    submateri = question_data.get('elemen', 'Data')
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
    # Kotak di bawah soal diisi ikon emoji yang sesuai dengan soal bila soal tidak punya diagram
    box_w, box_h = WIDTH - 260, dcard_bottom - dcard_top - 24
    chart_img = load_diagram_image(max_w=box_w, max_h=box_h, key=question_data.get('nomor')) or get_emoji_banner(question_data.get('nomor'), box_w, box_h)

    draw_rounded_rect(draw, (40, card_top, WIDTH - 40, card_bottom), radius=24, fill="#111827", outline="#4F46E5", width=2)

    tipe_text = f"Tipe: {question_data.get('tipe', 'PG')} - {question_data.get('subtopik', 'Data dan Peluang')}"
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
    draw.text((520, 68), "Pembahasan Data & Peluang", font=get_font(30, bold=True), fill="#FFFFFF")

    # Enlarged Diagram and Complete Question Card at Top
    thumb_img = load_diagram_image(max_w=340, max_h=240, key=question_data.get('nomor'))
    
    card_top = 140
    card_bottom = 470
    draw_rounded_rect(draw, (40, card_top, WIDTH - 40, card_bottom), radius=22, fill="#111827", outline="#4F46E5", width=2)

    submateri = question_data.get('elemen', 'Data')
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
    temp_dir = os.path.join(base_dir, "temp_tka_data")
    os.makedirs(temp_dir, exist_ok=True)

    daftar_soal = data.get('soal', []) if isinstance(data, dict) else data
    kisi_kisi = data.get('kisi_kisi', 'TKA Matematika Data dan Peluang SMA') if isinstance(data, dict) else 'TKA Matematika Data dan Peluang SMA'
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
    outro_speech = (
        f"Selesai! Itulah pembahasan {len(daftar_soal)} soal data dan peluang level HOTS untuk persiapan te ka a matematika. "
        "Kalau masih ada langkah yang belum jelas, tonton ulang pelan-pelan sambil mencoba mengerjakannya sendiri. "
        "Video ini sudah dimasukkan ke galeri video di situs we we we titik math tiga satu lima titik ai di, jadi kamu bisa menontonnya kapan saja. "
        "Jangan lupa like, sef, dan follow pairzal, lalu bagikan video ini ke teman-temanmu. "
        "Semangat belajar, sampai jumpa di video berikutnya!"
    )
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
# DATA SOAL LATIHAN TKA KELAS 12 - DATA DAN PELUANG, LEVEL HOTS (L3) (5 PG + 1 PG KOMPLEKS)
# ============================================================
data_soal = {
    "kisi_kisi": "TKA Kelas 12 - Matematika - Data dan Peluang (HOTS)",
    "konteks_gambar": "Enam soal Data dan Peluang level HOTS: median data berkelompok, rata-rata dan simpangan baku, kaidah pencacahan, peluang bersyarat, kejadian saling bebas dan saling lepas, serta pernyataan majemuk tentang pengambilan bola.",
    "soal": [
        {
            "nomor": 1,
            "elemen": "Statistika",
            "subtopik": "Median Data Berkelompok",
            "tipe": "PG",
            "pertanyaan": "Nilai ulangan sekelompok siswa: 40-49 ada 4 siswa, 50-59 ada 6 siswa, 60-69 ada x siswa, 70-79 ada 10 siswa, dan 80-89 ada 5 siswa. Jika median data tersebut 67, banyak siswa bernilai kurang dari 70 adalah ....",
            "opsi": [
                "A. 16",
                "B. 18",
                "C. 20",
                "D. 22",
                "E. 24"
            ],
            "jawaban_benar": "C",
            "steps": [
                {
                    "judul": "Tentukan kelas median",
                    "detail": [
                        "• n = 4 + 6 + x + 10 + 5 = 25 + x",
                        "• Kelas median 60-69, tb = 59,5",
                        "• p = 10, F = 10, f = x",
                        "• 59,5 + 10 × ((n/2 − 10)/x) = 67"
                    ],
                    "spoken": "Banyak data n sama dengan empat ditambah enam ditambah x ditambah sepuluh ditambah lima, yaitu dua puluh lima ditambah x. Kelas median adalah enam puluh sampai enam puluh sembilan, dengan tepi bawah lima puluh sembilan koma lima, panjang kelas sepuluh, frekuensi kumulatif sebelumnya sepuluh, dan frekuensi kelas x. Median sama dengan tepi bawah ditambah panjang kelas kali, n per dua dikurangi frekuensi kumulatif, dibagi frekuensi kelas, dan nilainya enam puluh tujuh."
                },
                {
                    "judul": "Selesaikan untuk x",
                    "detail": [
                        "• n/2 − 10 = (x + 5)/2",
                        "• 10 × (x + 5)/(2x) = 7,5",
                        "• 5(x + 5) = 7,5x",
                        "• 2,5x = 25 → x = 10"
                    ],
                    "spoken": "Masukkan ke rumus, lalu pindahkan lima puluh sembilan koma lima ke ruas kanan, sehingga sepuluh kali, n per dua dikurangi sepuluh, dibagi x sama dengan tujuh koma lima. Bagian dalam kurung menjadi x ditambah lima per dua, jadi lima kali x ditambah lima sama dengan tujuh koma lima x. Diperoleh dua koma lima x sama dengan dua puluh lima, sehingga x sama dengan sepuluh."
                },
                {
                    "judul": "Hitung siswa bernilai kurang dari 70",
                    "detail": [
                        "• Kurang dari 70 = 4 + 6 + 10 = 20 siswa",
                        "» Banyak siswa = 20 (Kunci Jawaban C)"
                    ],
                    "spoken": "Siswa yang nilainya kurang dari tujuh puluh adalah kelas pertama sampai ketiga, yaitu empat ditambah enam ditambah sepuluh sama dengan dua puluh siswa. Jawaban C."
                }
            ],
            "spoken_soal": "Soal nomor 1. Nilai ulangan sekelompok siswa. Empat puluh sampai empat puluh sembilan ada empat siswa. Lima puluh sampai lima puluh sembilan ada enam siswa. Enam puluh sampai enam puluh sembilan ada x siswa. Tujuh puluh sampai tujuh puluh sembilan ada sepuluh siswa. Delapan puluh sampai delapan puluh sembilan ada lima siswa. Jika median data tersebut enam puluh tujuh, banyak siswa bernilai kurang dari tujuh puluh adalah ..."
        },
        {
            "nomor": 2,
            "elemen": "Statistika",
            "subtopik": "Rata-rata dan Simpangan Baku",
            "tipe": "PG",
            "pertanyaan": "Sepuluh data mempunyai rata-rata 20 dan simpangan baku 4. Setiap data x diubah menjadi y = 3x − 5. Jumlah kuadrat kesepuluh data baru adalah ....",
            "opsi": [
                "A. 30.250",
                "B. 30.730",
                "C. 31.690",
                "D. 31.900",
                "E. 32.500"
            ],
            "jawaban_benar": "C",
            "steps": [
                {
                    "judul": "Rata-rata dan ragam data baru",
                    "detail": [
                        "• Rata-rata y = 3(20) − 5 = 55",
                        "• Simpangan baku y = 3 × 4 = 12",
                        "• Ragam y = 12² = 144"
                    ],
                    "spoken": "Rata-rata data baru adalah tiga kali dua puluh dikurangi lima, yaitu lima puluh lima. Simpangan baku hanya dipengaruhi pengali, jadi tiga kali empat sama dengan dua belas. Ragamnya adalah dua belas kuadrat, yaitu seratus empat puluh empat."
                },
                {
                    "judul": "Gunakan rumus ragam",
                    "detail": [
                        "• Ragam = (jumlah y²)/n − (rata-rata)²",
                        "• 144 = (jumlah y²)/10 − 55²",
                        "• (jumlah y²)/10 = 144 + 3.025 = 3.169"
                    ],
                    "spoken": "Ragam sama dengan jumlah kuadrat dibagi n, dikurangi rata-rata kuadrat. Jadi seratus empat puluh empat sama dengan jumlah kuadrat dibagi sepuluh, dikurangi lima puluh lima kuadrat. Lima puluh lima kuadrat adalah tiga ribu dua puluh lima, sehingga jumlah kuadrat dibagi sepuluh sama dengan tiga ribu seratus enam puluh sembilan."
                },
                {
                    "judul": "Hitung jumlah kuadrat",
                    "detail": [
                        "• Jumlah y² = 10 × 3.169 = 31.690",
                        "» Jumlah kuadrat = 31.690 (Kunci Jawaban C)"
                    ],
                    "spoken": "Kalikan dengan sepuluh, diperoleh tiga puluh satu ribu enam ratus sembilan puluh. Jawaban C."
                }
            ],
            "spoken_soal": "Soal nomor 2. Sepuluh data mempunyai rata-rata dua puluh dan simpangan baku empat. Setiap data x diubah menjadi y sama dengan tiga x dikurangi lima. Jumlah kuadrat kesepuluh data baru adalah ..."
        },
        {
            "nomor": 3,
            "elemen": "Pencacahan",
            "subtopik": "Kaidah Pencacahan",
            "tipe": "PG",
            "pertanyaan": "Sebuah kode terdiri dari 4 angka berbeda yang disusun dari angka 1, 2, 3, 4, 5, dan 6. Satu kode dipilih secara acak. Peluang terpilihnya kode yang genap dan lebih dari 3.000 adalah ....",
            "opsi": [
                "A. 1/4",
                "B. 1/3",
                "C. 2/5",
                "D. 5/12",
                "E. 1/2"
            ],
            "jawaban_benar": "B",
            "steps": [
                {
                    "judul": "Hitung banyak seluruh kode",
                    "detail": [
                        "• Semua kode = 6 × 5 × 4 × 3 = 360"
                    ],
                    "spoken": "Banyak seluruh kode dengan empat angka berbeda dari enam angka adalah enam kali lima kali empat kali tiga, yaitu tiga ratus enam puluh."
                },
                {
                    "judul": "Hitung kode genap lebih dari 3.000",
                    "detail": [
                        "• Angka pertama ≥ 3, terakhir genap",
                        "• Terakhir 2: 4 × 4 × 3 = 48",
                        "• Terakhir 4 atau 6: 2 × 3 × 4 × 3 = 72",
                        "• Total = 48 + 72 = 120"
                    ],
                    "spoken": "Angka pertama harus tiga atau lebih, dan angka terakhir harus genap. Jika angka terakhir dua, angka pertama punya empat pilihan, yaitu tiga, empat, lima, atau enam, lalu dua angka tengah empat kali tiga, hasilnya empat puluh delapan. Jika angka terakhir empat atau enam, angka pertama hanya tiga pilihan, sehingga masing-masing tiga puluh enam. Totalnya empat puluh delapan ditambah tiga puluh enam ditambah tiga puluh enam sama dengan seratus dua puluh."
                },
                {
                    "judul": "Hitung peluangnya",
                    "detail": [
                        "• Peluang = 120/360 = 1/3",
                        "» Peluang = 1/3 (Kunci Jawaban B)"
                    ],
                    "spoken": "Peluangnya seratus dua puluh per tiga ratus enam puluh, yaitu satu per tiga. Jawaban B."
                }
            ],
            "spoken_soal": "Soal nomor 3. Sebuah kode terdiri dari empat angka berbeda yang disusun dari angka satu, dua, tiga, empat, lima, dan enam. Satu kode dipilih secara acak. Peluang terpilihnya kode yang genap dan lebih dari tiga ribu adalah ..."
        },
        {
            "nomor": 4,
            "elemen": "Peluang",
            "subtopik": "Peluang Bersyarat",
            "tipe": "PG",
            "pertanyaan": "Mesin A menghasilkan 60% produksi dan mesin B menghasilkan 40% produksi. Sebanyak 3% produk mesin A cacat dan 5% produk mesin B cacat. Satu produk diambil secara acak dan ternyata cacat. Peluang produk itu berasal dari mesin B adalah ....",
            "opsi": [
                "A. 3/10",
                "B. 9/19",
                "C. 10/19",
                "D. 5/8",
                "E. 2/5"
            ],
            "jawaban_benar": "C",
            "steps": [
                {
                    "judul": "Hitung peluang produk cacat",
                    "detail": [
                        "• Cacat dari A = 0,6 × 0,03 = 0,018",
                        "• Cacat dari B = 0,4 × 0,05 = 0,020",
                        "• Total cacat = 0,018 + 0,020 = 0,038"
                    ],
                    "spoken": "Peluang produk cacat dari mesin A adalah nol koma enam kali nol koma nol tiga, yaitu nol koma nol satu delapan. Dari mesin B adalah nol koma empat kali nol koma nol lima, yaitu nol koma nol dua nol. Total peluang cacat adalah nol koma nol tiga delapan."
                },
                {
                    "judul": "Gunakan peluang bersyarat",
                    "detail": [
                        "• P(B | cacat) = 0,020 ÷ 0,038",
                        "• = 20/38 = 10/19",
                        "» Peluang berasal dari B = 10/19 (Kunci Jawaban C)"
                    ],
                    "spoken": "Peluang berasal dari mesin B jika diketahui cacat sama dengan peluang cacat dari B dibagi peluang cacat seluruhnya, yaitu nol koma nol dua nol dibagi nol koma nol tiga delapan. Itu sama dengan dua puluh per tiga puluh delapan, atau sepuluh per sembilan belas. Jawaban C."
                }
            ],
            "spoken_soal": "Soal nomor 4. Mesin A menghasilkan enam puluh persen produksi dan mesin B menghasilkan empat puluh persen produksi. Sebanyak tiga persen produk mesin A cacat dan lima persen produk mesin B cacat. Satu produk diambil secara acak dan ternyata cacat. Peluang produk itu berasal dari mesin B adalah ..."
        },
        {
            "nomor": 5,
            "elemen": "Peluang",
            "subtopik": "Kejadian Saling Bebas dan Lepas",
            "tipe": "PG",
            "pertanyaan": "Kejadian A dan B memenuhi P(A) = 0,4 dan P(A atau B) = 0,7. Jika A dan B saling bebas maka P(B) = p, sedangkan jika A dan B saling lepas maka P(B) = q. Nilai p − q adalah ....",
            "opsi": [
                "A. 0,1",
                "B. 0,2",
                "C. 0,3",
                "D. 0,4",
                "E. 0,5"
            ],
            "jawaban_benar": "B",
            "steps": [
                {
                    "judul": "Kejadian saling bebas",
                    "detail": [
                        "• P(A atau B) = P(A) + P(B) − P(A)·P(B)",
                        "• 0,7 = 0,4 + p − 0,4p → 0,3 = 0,6p",
                        "• p = 0,5"
                    ],
                    "spoken": "Untuk kejadian saling bebas, peluang A atau B sama dengan peluang A ditambah peluang B dikurangi peluang A kali peluang B. Maka nol koma tujuh sama dengan nol koma empat ditambah p dikurangi nol koma empat p. Diperoleh nol koma tiga sama dengan nol koma enam p, sehingga p sama dengan nol koma lima."
                },
                {
                    "judul": "Kejadian saling lepas",
                    "detail": [
                        "• P(A atau B) = P(A) + P(B)",
                        "• 0,7 = 0,4 + q → q = 0,3"
                    ],
                    "spoken": "Untuk kejadian saling lepas, peluang A atau B sama dengan peluang A ditambah peluang B. Maka nol koma tujuh sama dengan nol koma empat ditambah q, sehingga q sama dengan nol koma tiga."
                },
                {
                    "judul": "Hitung selisihnya",
                    "detail": [
                        "• p − q = 0,5 − 0,3 = 0,2",
                        "» Nilai p − q = 0,2 (Kunci Jawaban B)"
                    ],
                    "spoken": "Selisihnya p dikurangi q sama dengan nol koma lima dikurangi nol koma tiga, yaitu nol koma dua. Jawaban B."
                }
            ],
            "spoken_soal": "Soal nomor 5. Kejadian A dan B memenuhi peluang A sama dengan nol koma empat dan peluang A atau B sama dengan nol koma tujuh. Jika A dan B saling bebas maka peluang B sama dengan p, sedangkan jika A dan B saling lepas maka peluang B sama dengan q. Nilai p dikurangi q adalah ..."
        },
        {
            "nomor": 6,
            "elemen": "Peluang",
            "subtopik": "Peluang dan Kombinasi",
            "tipe": "PG Kompleks",
            "pertanyaan": "Sebuah kantong berisi 5 bola merah dan 3 bola biru. Dua bola diambil sekaligus secara acak. Tentukan SEMUA pernyataan yang BENAR:",
            "pernyataan": {
                "A": "Peluang kedua bola merah adalah 5/14",
                "B": "Peluang paling sedikit satu bola biru adalah 9/14",
                "C": "Peluang kedua bola berwarna sama adalah 1/2",
                "D": "Peluang kedua bola biru adalah 3/8",
                "E": "Jika paling sedikit satu bola merah, peluang keduanya merah adalah 2/5"
            },
            "jawaban_benar": ["A", "B", "E"],
            "steps": [
                {
                    "judul": "Hitung dasar peluang",
                    "detail": [
                        "• Semua pasangan: C(8,2) = 28",
                        "• Kedua merah: C(5,2) = 10",
                        "• Kedua biru: C(3,2) = 3"
                    ],
                    "spoken": "Banyak cara mengambil dua bola dari delapan bola adalah kombinasi delapan dua, yaitu dua puluh delapan. Kedua bola merah ada kombinasi lima dua, yaitu sepuluh cara. Kedua bola biru ada kombinasi tiga dua, yaitu tiga cara."
                },
                {
                    "judul": "Uji pernyataan A, B, C, dan D",
                    "detail": [
                        "• A: 10/28 = 5/14 → BENAR",
                        "• B: 1 − 10/28 = 9/14 → BENAR",
                        "• C: 13/28, bukan 1/2 → SALAH",
                        "• D: 3/28, bukan 3/8 → SALAH"
                    ],
                    "spoken": "Pernyataan A. Peluang kedua merah sepuluh per dua puluh delapan, atau lima per empat belas. A benar. Pernyataan B. Paling sedikit satu biru sama dengan satu dikurangi peluang kedua merah, yaitu delapan belas per dua puluh delapan, atau sembilan per empat belas. B benar. Pernyataan C. Peluang warna sama adalah sepuluh ditambah tiga per dua puluh delapan, yaitu tiga belas per dua puluh delapan, bukan setengah. C salah. Pernyataan D. Peluang kedua biru adalah tiga per dua puluh delapan, bukan tiga per delapan. D salah."
                },
                {
                    "judul": "Uji pernyataan E",
                    "detail": [
                        "• Satu merah atau lebih = 25/28",
                        "• Kedua merah = 10/28",
                        "• (10/28) ÷ (25/28) = 2/5 → BENAR",
                        "» Pernyataan benar = A, B, E"
                    ],
                    "spoken": "Pernyataan E. Peluang paling sedikit satu merah adalah satu dikurangi tiga per dua puluh delapan, yaitu dua puluh lima per dua puluh delapan. Peluang kedua merah di antaranya adalah sepuluh per dua puluh delapan dibagi dua puluh lima per dua puluh delapan, yaitu sepuluh per dua puluh lima, atau dua per lima. E benar. Jadi pernyataan yang benar adalah A, B, dan E."
                }
            ],
            "spoken_soal": "Soal nomor 6. Sebuah kantong berisi lima bola merah dan tiga bola biru. Dua bola diambil sekaligus secara acak. Perhatikan pernyataan-pernyataan berikut. A, peluang kedua bola merah adalah lima per empat belas. B, peluang paling sedikit satu bola biru adalah sembilan per empat belas. C, peluang kedua bola berwarna sama adalah setengah. D, peluang kedua bola biru adalah tiga per delapan. E, jika paling sedikit satu bola merah, peluang keduanya merah adalah dua per lima. Tentukan semua pernyataan yang benar."
        }
    ]
}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate Video Animasi Pembahasan Latihan TKA Matematika (Data dan Peluang, HOTS)")
    parser.add_argument("output", nargs="?",
                        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "video_tka12_data_hots.mp4"),
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

