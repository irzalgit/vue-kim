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

from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageColor

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


# ===========================================================================
# MESIN RENDER MATEMATIKA (setara KaTeX untuk pipeline Python/PIL)
#
# Alur: teks soal (boleh berisi LaTeX atau notasi ringkas) ->
#   latex_to_clean_text()  : LaTeX  -> notasi ringkas (^, √, /, simbol Unicode)
#   parse_rich()           : notasi ringkas -> potongan [teks biasa | rumus]
#   render_tex()           : rumus -> gambar (matplotlib mathtext)
#   rich_line()            : gambar teks + rumus dalam SATU baris (inline)
# Semua bagian video (soal, opsi, judul langkah, animasi tulisan tangan,
# kesimpulan) memakai jalur yang sama, sehingga tidak ada lagi ^ / √( ) mentah.
# ===========================================================================

# ---------------------------------------------------------------------------
# 1. LaTeX -> notasi ringkas
# ---------------------------------------------------------------------------
_LATEX_SYMBOLS = {
    'times': '×', 'cdot': '·', 'div': '÷', 'pm': '±',
    'leq': '≤', 'le': '≤', 'geq': '≥', 'ge': '≥', 'neq': '≠', 'ne': '≠',
    'approx': '≈', 'circ': '°', 'degree': '°', 'pi': 'π', 'theta': 'θ',
    'infty': '∞', 'to': '→', 'rightarrow': '→', 'Rightarrow': '→',
    'Longrightarrow': '→', 'ldots': '...', 'dots': '...', 'cdots': '...',
    'angle': '∠', 'perp': '⊥', 'quad': ' ', 'qquad': ' ',
}
_LATEX_DROP = {'left', 'right', 'displaystyle', 'textstyle', 'big', 'Big',
               'bigg', 'Bigg', 'limits'}
_LATEX_ARG_CMD = re.compile(
    r'\\(dfrac|tfrac|frac|sqrt|textbf|textit|text|mathrm|mathbf|mathit|operatorname)\s*(?=\{)')


def _brace_arg(s, i):
    """s[i] == '{' -> (isi, indeks setelah '}') dengan kurung kurawal seimbang."""
    if i >= len(s) or s[i] != '{':
        return None
    depth = 0
    for k in range(i, len(s)):
        if s[k] == '{':
            depth += 1
        elif s[k] == '}':
            depth -= 1
            if depth == 0:
                return s[i + 1:k], k + 1
    return None


def _expand_latex_commands(t):
    """\\frac{a}{b} -> (a)/(b) ; \\sqrt{x} -> √(x) ; \\text{..} -> isinya (mendukung bersarang)."""
    for _ in range(80):
        m = _LATEX_ARG_CMD.search(t)
        if not m:
            break
        name = m.group(1)
        a = _brace_arg(t, m.end())
        if a is None:
            t = t[:m.start()] + t[m.end():]
            continue
        first, end = a
        if name in ('frac', 'dfrac', 'tfrac'):
            b = _brace_arg(t, end)
            if b is None:
                repl = first
            else:
                repl, end = f'({first})/({b[0]})', b[1]
        elif name == 'sqrt':
            repl = f'√({first})'
        else:
            repl = first
        t = t[:m.start()] + repl + t[end:]
    return t


def latex_to_clean_text(text):
    if not text:
        return ""
    t = _expand_latex_commands(text)
    # derajat: 60^\circ, 60^{\circ}, 60^o -> 60°
    t = re.sub(r'\^\s*\{?\s*\\circ\}?', '°', t)
    t = re.sub(r'\^\s*\{?\s*°\}?', '°', t)
    t = re.sub(r'\^o(?![A-Za-z])', '°', t)
    # pangkat/indeks berkurung kurawal -> berkurung biasa: x^{10} -> x^(10), x^{2} -> x^2
    t = re.sub(r'([\^_])\{([^{}]*)\}',
               lambda m: m.group(1) + (f'({m.group(2).strip()})' if len(m.group(2).strip()) > 1
                                       else m.group(2).strip()), t)
    t = t.replace(r'\%', '%').replace(r'\_', '_').replace(r'\ ', ' ')
    t = re.sub(r'\\[,;:!]', ' ', t)
    t = re.sub(r'\\([A-Za-z]+)',
               lambda m: _LATEX_SYMBOLS.get(m.group(1), '' if m.group(1) in _LATEX_DROP else m.group(1)), t)
    t = t.replace('$', '')
    t = t.replace('∠', 'sudut ')  # glyph ∠ tidak ada di banyak font
    t = t.replace('★', '»').replace('⟂', '⊥')
    t = re.sub('[\U00010000-\U0010FFFF\u2600-\u27BF\uFE0F]', lambda m: m.group(0) if m.group(0) in '♫♥' else '', t)
    t = t.replace('{', '').replace('}', '')
    t = t.replace('\\', '')
    return t.strip()


# ---------------------------------------------------------------------------
# 2. Notasi ringkas -> TeX (parser kecil dengan kurung seimbang)
#    Mengenali: pangkat a^b, a^(…), a², akar √x / √(…), pecahan 12/99, (…)/(…),
#    indeks x_1, perkalian tersirat 2√15, (a)(b). Hasil digabung dengan
#    angka/operator di sekitarnya agar satu persamaan = satu gambar.
# ---------------------------------------------------------------------------
_NUM_RE = re.compile(r'\d+(?:[.,]\d+)?')
_SLASH_RE = re.compile(r'\s*/\s*')
_EXP_RE = re.compile(r'[-−]?(?:\d+(?:[.,]\d+)?|[A-Za-z])')
_SUP_DIGITS = {'²': '2', '³': '3', '¹': '1'}
_TEX_CHAR = {
    '×': r'\times ', '÷': r'\div ', '·': r'\cdot ', '−': '-', '–': '-',
    '≤': r'\leq ', '≥': r'\geq ', '≠': r'\neq ', '±': r'\pm ', '≈': r'\approx ',
    'π': r'\pi ', 'θ': r'\theta ', '°': r'^{\circ}', '→': r'\rightarrow ',
    '%': r'\%', '#': r'\#', '&': r'\&', '_': r'\_', '$': r'\$',
    '{': r'\{', '}': r'\}',
}
_OP = r'[=+\-−×÷·≈≤≥≠±<>]'
_OPERAND = r'(?:\d[\d.,]*\d%?|\d%?|[A-Za-z](?![A-Za-z])|\([^()]*\))'
_GAP_RE = re.compile(r'^\s*' + _OP + r'\s*(?:' + _OPERAND + r'\s*' + _OP + r'\s*)*$')
_LEFT_RE = re.compile(r'(?<![A-Za-z0-9.,])(?:' + _OPERAND + r'\s*' + _OP + r'\s*)+$')
_RIGHT_RE = re.compile(r'^(?:\s*' + _OP + r'\s*' + _OPERAND + r')+(?![A-Za-z0-9])')


def _match_group(s, i):
    """s[i] == '(' -> indeks setelah ')' yang seimbang, atau -1."""
    depth = 0
    for k in range(i, len(s)):
        if s[k] == '(':
            depth += 1
        elif s[k] == ')':
            depth -= 1
            if depth == 0:
                return k + 1
    return -1


def _tex_num(s):
    return s.replace(',', '{,}')


def _parse_atom(s, i):
    """-> (j, tex, special, inner_tex, kind) atau None. kind: num|var|group|other"""
    n = len(s)
    if i >= n:
        return None
    c = s[i]
    if c == '(':
        j = _match_group(s, i)
        if j < 0:
            return None
        inner, sp = _expr_to_tex(s[i + 1:j - 1])
        return j, r'\left(' + inner + r'\right)', sp, inner, 'group'
    if c == '√':
        k = i + 1
        if k < n and s[k] == '(':
            j = _match_group(s, k)
            if j < 0:
                return None
            return j, r'\sqrt{' + _expr_to_tex(s[k + 1:j - 1])[0] + '}', True, None, 'other'
        m = _NUM_RE.match(s, k)
        if m:
            return m.end(), r'\sqrt{' + _tex_num(m.group()) + '}', True, None, 'other'
        if k < n and s[k].isalpha() and not (k + 1 < n and s[k + 1].isalpha()):
            return k + 1, r'\sqrt{' + s[k] + '}', True, None, 'other'
        return None
    m = _NUM_RE.match(s, i)
    if m:
        if i > 0 and (s[i - 1].isalnum() or (s[i - 1] in ',.' and i > 1 and s[i - 2].isdigit())):
            return None
        return m.end(), _tex_num(m.group()), False, None, 'num'
    if c.isalpha() and (i == 0 or not s[i - 1].isalpha()) and not (i + 1 < n and s[i + 1].isalpha()):
        return i + 1, c, False, None, 'var'
    return None


def _parse_script(s, i):
    """Argumen pangkat/indeks setelah ^ atau _ -> (tex, j) atau None."""
    n = len(s)
    if i >= n:
        return None
    if s[i] == '(':
        j = _match_group(s, i)
        if j < 0:
            return None
        return _expr_to_tex(s[i + 1:j - 1])[0], j
    m = _EXP_RE.match(s, i)
    if m:
        return _tex_num(m.group().replace('−', '-')), m.end()
    return None


def _parse_power_atom(s, i):
    a = _parse_atom(s, i)
    if a is None:
        return None
    j, tex, sp, inner, kind = a
    n = len(s)
    if j < n and s[j] in _SUP_DIGITS:
        return j + 1, tex + '^{' + _SUP_DIGITS[s[j]] + '}', True, None, 'other'
    if j < n and s[j] in '^_':
        e = _parse_script(s, j + 1)
        if e is not None:
            return e[1], tex + s[j] + '{' + e[0] + '}', True, None, 'other'
    return a


def _parse_term(s, i):
    a = _parse_power_atom(s, i)
    if a is None:
        return None
    j, tex, sp, inner, kind = a
    while j < len(s) and s[j] in '(√':       # perkalian tersirat tanpa spasi
        b = _parse_power_atom(s, j)
        if b is None:
            break
        j, tex, sp, inner, kind = b[0], tex + b[1], sp or b[2], None, 'other'
    return j, tex, sp, inner, kind


def _parse_frac_or_term(s, i):
    """-> (j, tex, special) atau None."""
    a = _parse_term(s, i)
    if a is None:
        return None
    j, tex, sp, inner, kind = a
    m = _SLASH_RE.match(s, j)
    if m and not (i > 0 and s[i - 1] == '/'):
        b = _parse_term(s, m.end())
        if b is not None and not (kind == 'var' and b[4] == 'var') \
                and not (b[0] < len(s) and s[b[0]] == '/'):
            num = inner if kind == 'group' else tex
            den = b[3] if b[4] == 'group' else b[1]
            return b[0], r'\dfrac{' + num + '}{' + den + '}', True
    return j, tex, sp


def _expr_to_tex(s):
    """Ubah potongan notasi ringkas menjadi TeX. -> (tex, special)."""
    out, special, i, n = [], False, 0, len(s)
    while i < n:
        t = _parse_frac_or_term(s, i)
        if t is not None:
            out.append(t[1])
            special = special or t[2]
            i = t[0]
            continue
        c = s[i]
        out.append(_TEX_CHAR.get(c, c))
        i += 1
    return ''.join(out), special


@functools.lru_cache(maxsize=4096)
def _scan_math(text):
    """Cari rentang rumus pada teks -> tuple (awal, akhir, tex)."""
    spans, i, n = [], 0, len(text)
    while i < n:
        c = text[i]
        if c.isdigit() or c.isalpha() or c in '(√':
            t = _parse_frac_or_term(text, i)
            if t is not None and t[2]:
                spans.append([i, t[0]])
                i = t[0]
                continue
        i += 1
    if not spans:
        return ()
    merged = [spans[0]]
    for a, b in spans[1:]:                    # gabung rumus yang hanya dipisah "= 6,4 ×" dsb.
        if _GAP_RE.match(text[merged[-1][1]:a]):
            merged[-1][1] = b
        else:
            merged.append([a, b])
    out, prev_end = [], 0
    for idx, (a, b) in enumerate(merged):
        nxt = merged[idx + 1][0] if idx + 1 < len(merged) else len(text)
        m = _LEFT_RE.search(text[prev_end:a])  # serap "80% × 8 ×" di kiri
        if m:
            a = prev_end + m.start()
        m = _RIGHT_RE.match(text[b:nxt])       # serap "= 19" di kanan
        if m:
            b = b + m.end()
        out.append((a, b, _expr_to_tex(text[a:b])[0]))
        prev_end = b
    return tuple(out)


@functools.lru_cache(maxsize=4096)
def parse_rich(text):
    """Teks -> tuple potongan: ('t', teks) atau ('m', tex, sumber)."""
    text = text.replace('\u00a0', ' ')
    toks, pos = [], 0
    for a, b, tex in _scan_math(text):
        if a > pos:
            toks.append(('t', text[pos:a]))
        toks.append(('m', tex, text[a:b]))
        pos = b
    if pos < len(text):
        toks.append(('t', text[pos:]))
    return tuple(toks)


def protect_math_spaces(text):
    """Ganti spasi di dalam rumus dengan NBSP agar rumus tidak terpotong saat pindah baris."""
    spans = _scan_math(text.replace('\u00a0', ' '))
    if not spans:
        return text
    out, pos = [], 0
    for a, b, _ in spans:
        out.append(text[pos:a])
        out.append(text[a:b].replace(' ', '\u00a0'))
        pos = b
    out.append(text[pos:])
    return ''.join(out)


# ---------------------------------------------------------------------------
# 3. TeX -> gambar (matplotlib mathtext), di-cache
# ---------------------------------------------------------------------------
_MATH_DPI = 200
_MATH_GAP = 2


@functools.lru_cache(maxsize=512)
def render_tex(tex, font_px, bold):
    """Rumus -> (gambar RGBA putih transparan, posisi baseline dari atas gambar). None bila gagal."""
    try:
        dpi = _MATH_DPI
        pt = font_px * 72.0 / dpi
        w_px = int(len(tex) * font_px * 0.7 + font_px * 3) + 200
        h_px = int(font_px * 6)
        base_frac = 0.45  # baseline berada 45% dari bawah kanvas
        with plt.rc_context({'mathtext.default': 'bf' if bold else 'regular'}):
            fig = plt.figure(figsize=(w_px / dpi, h_px / dpi), dpi=dpi)
            fig.patch.set_alpha(0.0)
            fig.text(20.0 / w_px, base_frac, f"${tex}$", fontsize=pt, color="white",
                     va='baseline', ha='left')
            buf = io.BytesIO()
            fig.savefig(buf, format="png", dpi=dpi, transparent=True)
            plt.close(fig)
        buf.seek(0)
        im = Image.open(buf).convert("RGBA")
        box = im.getchannel("A").getbbox()
        if not box:
            return None
        pad = 2
        l, t = max(0, box[0] - pad), max(0, box[1] - pad)
        r, b = min(im.width, box[2] + pad), min(im.height, box[3] + pad)
        baseline = int(round(im.height * (1.0 - base_frac))) - t
        return im.crop((l, t, r, b)), baseline
    except Exception:
        return None


# ---------------------------------------------------------------------------
# 4. Gambar baris campuran teks + rumus
# ---------------------------------------------------------------------------
def _font_px(font):
    return int(getattr(font, 'size', 40) or 40)


def _font_is_bold(font):
    fname = os.path.basename(getattr(font, 'path', '') or '').lower()
    return ('bold' in fname) or fname.endswith('bd.ttf')


def _font_ascent(font, px):
    try:
        return font.getmetrics()[0]
    except Exception:
        return int(px * 0.9)


def _text_len(s, font, hand_fonts=None):
    if not s:
        return 0.0
    if hand_fonts:
        return hand_text_width(_probe_draw, s, hand_fonts[0], hand_fonts[1])
    return _probe_draw.textlength(s, font=font)


def measure_line(text, font, hand_fonts=None, bold=None, font_px=None):
    """Lebar (px) satu baris teks bercampur rumus."""
    toks = parse_rich(text)
    if not any(t[0] == 'm' for t in toks) and not hand_fonts:
        bb = font.getbbox(text.replace('\u00a0', ' '))
        return bb[2] - bb[0]
    fpx = font_px or _font_px(font)
    if bold is None:
        bold = False if hand_fonts else _font_is_bold(font)
    total = 0.0
    for tok in toks:
        if tok[0] == 't':
            total += _text_len(tok[1], font, hand_fonts)
        else:
            r = render_tex(tok[1], fpx, bold)
            total += (_text_len(tok[2], font, hand_fonts) if r is None
                      else r[0].width + 2 * _MATH_GAP)
    return total


def rich_line(img, draw, xy, text, font, font_px=None, fill="#FFFFFF", max_width=None,
              hand_fonts=None, reveal=None, bold=None):
    """Gambar satu baris teks + rumus (inline, sejajar baseline). Mengembalikan x akhir (px).

    hand_fonts=(font_tulisan_tangan, font_cadangan) -> teks biasa memakai tulisan tangan.
    reveal=N -> hanya N karakter sumber pertama yang tampil (animasi menulis); rumus muncul
    utuh begitu pena sampai di ujung rumus."""
    x0, y = xy
    fpx = font_px or _font_px(font)
    if bold is None:
        bold = False if hand_fonts else _font_is_bold(font)
    toks = parse_rich(text)
    has_math = any(t[0] == 'm' for t in toks)

    if not has_math and reveal is None:       # jalur cepat: teks biasa
        plain = text.replace('\u00a0', ' ')
        if hand_fonts:
            return x0 + draw_hand_text(draw, (x0, y), plain, hand_fonts[0], hand_fonts[1], fill)
        draw.text((x0, y), plain, font=font, fill=fill)
        return x0 + _text_len(plain, font)

    base_font = hand_fonts[0] if hand_fonts else font
    baseline = y + _font_ascent(base_font, fpx)

    if max_width and not hand_fonts:          # kecilkan font bila terlalu lebar
        for _ in range(4):
            if measure_line(text, font, None, bold, fpx) <= max_width or fpx <= 12:
                break
            new_px = max(12, int(fpx * max_width / measure_line(text, font, None, bold, fpx) * 0.99))
            try:
                font = font.font_variant(size=new_px)
            except Exception:
                font = get_font(new_px, bold=bold)
            fpx = new_px

    rgb = ImageColor.getrgb(fill)
    x = float(x0)
    left = reveal
    for tok in toks:
        if left is not None and left <= 0:
            break
        if tok[0] == 't':
            s = tok[1]
            part = s if left is None else s[:left]
            if left is not None:
                left -= len(s)
            if part:
                if hand_fonts:
                    x += draw_hand_text(draw, (x, y), part, hand_fonts[0], hand_fonts[1], fill)
                else:
                    top = baseline - _font_ascent(font, fpx)
                    draw.text((x, top), part, font=font, fill=fill)
                    x += _text_len(part, font)
            if left is not None and left < 0:
                break
        else:
            src = tok[2]
            if left is not None:
                if left < len(src):           # rumus belum selesai "ditulis"
                    break
                left -= len(src)
            r = render_tex(tok[1], fpx, bold)
            if r is None:                     # mathtext gagal: tampilkan sumber apa adanya
                if hand_fonts:
                    x += draw_hand_text(draw, (x, y), src, hand_fonts[0], hand_fonts[1], fill)
                else:
                    draw.text((x, baseline - _font_ascent(font, fpx)), src, font=font, fill=fill)
                    x += _text_len(src, font)
                continue
            m_img, m_base = r
            x += _MATH_GAP
            px, py = int(round(x)), int(round(baseline - m_base))
            img.paste(rgb, (px, py, px + m_img.width, py + m_img.height), m_img.getchannel("A"))
            x += m_img.width + _MATH_GAP
    return x


def rich_extent(text, font, font_px, spacing, hand_fonts=None, bold=None):
    """Tata letak vertikal satu baris: -> (geser_turun, maju).

    Baris dengan rumus tinggi (pecahan, akar) digeser turun sebesar `geser_turun` agar tidak
    menabrak elemen di atasnya, lalu `maju` = jarak ke baris berikutnya (>= spacing)."""
    ms = [t for t in parse_rich(text) if t[0] == 'm']
    if not ms:
        return 0, spacing
    fpx = font_px or _font_px(font)
    if bold is None:
        bold = False if hand_fonts else _font_is_bold(font)
    asc = _font_ascent(hand_fonts[0] if hand_fonts else font, fpx)
    up = below = 0
    for t in ms:
        r = render_tex(t[1], fpx, bold)
        if r is None:
            continue
        im, base = r
        up = max(up, base - asc)
        below = max(below, im.height - base)
    up = max(0, up)
    pad = int(fpx * 0.15)
    return up, up + max(spacing, asc + below + pad)


def draw_math_line(img, draw, xy, text, font, font_px, fill="#FFFFFF", max_width=None):
    """Gambar satu baris (teks + rumus). Nama & parameter dipertahankan untuk pemanggil lama."""
    rich_line(img, draw, xy, text, font, font_px=font_px, fill=fill, max_width=max_width)


def wrap_text(text, font, max_width):
    if not text:
        return []
    paragraphs = text.split("\n")
    all_lines = []
    for para in paragraphs:
        if not para.strip():
            all_lines.append("")
            continue
        words = protect_math_spaces(para).split(" ")
        cur_line = ""
        for word in words:
            test_line = word if not cur_line else cur_line + " " + word
            if measure_line(test_line, font) <= max_width:
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


# Soal Bilangan tidak memakai diagram grafik; kartu gambar hanya memuat timer.
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
    hf = (hand_font, fallback_font)
    for word in protect_math_spaces(text).split(" "):
        test = word if not cur else cur + " " + word
        if measure_line(test, hand_font, hand_fonts=hf, bold=False, font_px=_font_px(hand_font)) <= max_width:
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
    submateri = question_data.get('elemen', 'Bilangan')
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
    q_geom = [rich_extent(_ln, q_font, q_font_size, line_spacing) for _ln in q_lines]
    text_total_height = sum(g[1] for g in q_geom)

    card_top = 145
    card_bottom = card_top + 80 + text_total_height + 20   # kartu soal (tanpa gambar)

    # Kartu gambar terpisah: isi sisa ruang setelah timer & opsi diberi tempat
    n_opts_reserve = max(1, len(get_options_list(question_data)))
    reserve = 25 + n_opts_reserve * 95 + (n_opts_reserve - 1) * 8 + 70
    dcard_top = card_bottom + 15
    dcard_bottom = max(dcard_top + 400, HEIGHT - reserve)
    chart_img = load_diagram_image(max_w=WIDTH - 260, max_h=dcard_bottom - dcard_top - 24, key=question_data.get('nomor'))

    draw_rounded_rect(draw, (40, card_top, WIDTH - 40, card_bottom), radius=24, fill="#111827", outline="#4F46E5", width=2)

    tipe_text = f"Tipe: {question_data.get('tipe', 'PG')} - {question_data.get('subtopik', 'Bilangan')}"
    tag_font = get_font(S(24), bold=True)
    tb = tag_font.getbbox(tipe_text)
    tw = tb[2] - tb[0]
    draw_rounded_rect(draw, (65, card_top + 16, min(WIDTH - 65, 65 + tw + 35), card_top + 62), radius=14, fill="#1F2937", outline="#6366F1", width=1)
    draw.text((82, card_top + 24), tipe_text, font=tag_font, fill="#E0E7FF")

    y_text = card_top + 80
    for line, (_up, _adv) in zip(q_lines, q_geom):
        draw_math_line(img, draw, (65, y_text + _up), line, q_font, q_font_size, fill="#FFFFFF", max_width=WIDTH - 130)
        y_text += _adv

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
    draw.text((520, 68), "Pembahasan TKA Bilangan HOTS", font=get_font(30, bold=True), fill="#FFFFFF")

    # Enlarged Diagram and Complete Question Card at Top
    thumb_img = load_diagram_image(max_w=340, max_h=240, key=question_data.get('nomor'))
    
    card_top = 140
    card_bottom = 470
    draw_rounded_rect(draw, (40, card_top, WIDTH - 40, card_bottom), radius=22, fill="#111827", outline="#4F46E5", width=2)

    submateri = question_data.get('elemen', 'Bilangan')
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
        _up, _adv = rich_extent(line, q_font, FS_QTEXT, q_line_h)
        draw_math_line(img, draw, (65, y_q + _up), line, q_font, FS_QTEXT, fill="#FFFFFF", max_width=text_max_w)
        y_q += _adv

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
            draw_math_line(img, draw, (305, y_title), t_line, title_font, FS_STEPTITLE, fill="#FFFFFF", max_width=WIDTH - 310 - 65)
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
            while True:
                hand_spacing = round(FS_HAND * 1.25)
                hand_font = get_hand_font(FS_HAND, bold=False)
                fallback_font = get_font(FS_HAND, bold=False)
                _hf = (hand_font, fallback_font)
                wrapped_all = []
                for line in details_list:
                    clean_line = latex_to_clean_text(line)
                    for sym, alt in {'θ': 'teta', 'π': 'pi', '∠': 'sudut ', '→': '->'}.items():
                        clean_line = clean_line.replace(sym, alt)
                    wrapped_all.extend(wrap_hand_text(clean_line, hand_font, fallback_font, WIDTH - 140))
                _need = sum(rich_extent(l, hand_font, FS_HAND, hand_spacing, hand_fonts=_hf)[1] for l in wrapped_all)
                if cur_detail_y + _need <= sy_end - 8 or FS_HAND <= S(18):
                    break
                FS_HAND -= 2  # rumus/pecahan butuh ruang: kecilkan sedikit agar semua baris muat

            total_len = sum(len(l) + 1 for l in wrapped_all) or 1
            progress = max(0.0, min(1.0, write_progress))
            target_count = int(round(total_len * progress))

            cum = 0
            pen_xy = None
            hand_fonts = (hand_font, fallback_font)
            for w_line in wrapped_all:
                _up, _adv = rich_extent(w_line, hand_font, FS_HAND, hand_spacing, hand_fonts=hand_fonts)
                if cur_detail_y + _adv > sy_end - 8:
                    break
                remaining_target = target_count - cum
                if remaining_target <= 0:
                    break
                if remaining_target >= len(w_line):
                    end_x = rich_line(img, draw, (70, cur_detail_y + _up), w_line, hand_font, font_px=FS_HAND,
                                      fill="#FDE68A", hand_fonts=hand_fonts)
                    pen_xy = (end_x, cur_detail_y + _up + FS_HAND * 0.55)
                    cum += len(w_line) + 1
                    cur_detail_y += _adv
                else:
                    end_x = rich_line(img, draw, (70, cur_detail_y + _up), w_line, hand_font, font_px=FS_HAND,
                                      fill="#FDE68A", hand_fonts=hand_fonts, reveal=remaining_target)
                    pen_xy = (end_x, cur_detail_y + _up + FS_HAND * 0.55)
                    cum = target_count
                    break

            if pen_xy and progress < 1.0:
                draw_pen_tip(draw, pen_xy[0], pen_xy[1])
        else:
            fs_d = FS_DETAIL
            while True:
                f_reg, f_bold = get_font(fs_d, bold=False), get_font(fs_d, bold=True)
                sp_d = round(fs_d * 1.25)
                rows = []
                for line in details_list:
                    clean_line = latex_to_clean_text(line)
                    is_highlight = clean_line.startswith("»") or "Hasil =" in clean_line or "BENAR" in clean_line or "SALAH" in clean_line
                    line_font = f_bold if is_highlight else f_reg
                    for w_line in wrap_text(clean_line, line_font, WIDTH - 140):
                        rows.append((w_line, line_font) + rich_extent(w_line, line_font, fs_d, sp_d))
                    rows.append(None)  # jeda kecil antar butir
                _need = sum(r[3] if r else 3 for r in rows)
                if cur_detail_y + _need <= sy_end - 8 or fs_d <= S(16):
                    break
                fs_d -= 2  # rumus/pecahan butuh ruang: kecilkan sedikit agar semua baris muat
            for r in rows:
                if r is None:
                    cur_detail_y += 3
                    continue
                w_line, line_font, _up, _adv = r
                if cur_detail_y + _adv <= sy_end - 8:
                    draw_math_line(img, draw, (70, cur_detail_y + _up), w_line, line_font, fs_d, fill="#FFFFFF", max_width=WIDTH - 150)
                    cur_detail_y += _adv

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
    temp_dir = os.path.join(base_dir, "temp_tka_bilangan")
    os.makedirs(temp_dir, exist_ok=True)

    daftar_soal = data.get('soal', []) if isinstance(data, dict) else data
    kisi_kisi = data.get('kisi_kisi', 'TKA Matematika Bilangan SMA') if isinstance(data, dict) else 'TKA Matematika Bilangan SMA'
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
    outro_speech = "Nah, itulah pembahasan enam soal bilangan real level HOTS, mulai dari notasi ilmiah, bentuk akar, persentase, proporsi berbalik nilai, pangkat, sampai menguji pernyataan bilangan rasional dan irasional. Jangan lupa like, sef, dan follow. Bagikan video ini ke teman-temanmu ya! Semangat belajar!"
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
# DATA SOAL LATIHAN TKA KELAS 12 - BILANGAN: BILANGAN REAL, LEVEL HOTS (L3) (5 PG + 1 PG KOMPLEKS)
# ============================================================
data_soal = {
    "kisi_kisi": "TKA Kelas 12 - Matematika - Bilangan: Bilangan Real (HOTS)",
    "konteks_gambar": "Enam soal Bilangan Real level HOTS: notasi ilmiah, bentuk akar, persentase, proporsi berbalik nilai, pangkat, dan pernyataan majemuk tentang bilangan rasional dan irasional.",
    "soal": [
        {
            "nomor": 1,
            "elemen": "Bilangan",
            "subtopik": "Notasi Ilmiah",
            "tipe": "PG",
            "pertanyaan": "Sebuah memori berkapasitas 8 × 10^9 byte. Sebanyak 20% kapasitasnya dipakai oleh sistem, dan sisanya diisi berkas yang masing-masing berukuran 2,5 × 10^5 byte. Banyak berkas maksimum yang dapat disimpan adalah ....",
            "opsi": [
                "A. 1,6 × 10^4",
                "B. 2,56 × 10^4",
                "C. 3,2 × 10^4",
                "D. 2,56 × 10^5",
                "E. 3,2 × 10^5"
            ],
            "jawaban_benar": "B",
            "steps": [
                {
                    "judul": "Hitung kapasitas yang tersedia",
                    "detail": [
                        "• Dipakai sistem 20%, sisa 100% − 20% = 80%",
                        "• Kapasitas tersedia = 80% × 8 × 10^9 = 6,4 × 10^9 byte"
                    ],
                    "spoken": "Sebanyak dua puluh persen kapasitas dipakai sistem, sehingga yang tersedia delapan puluh persen. Delapan puluh persen dari delapan kali sepuluh pangkat sembilan adalah enam koma empat kali sepuluh pangkat sembilan byte."
                },
                {
                    "judul": "Bagi dengan ukuran satu berkas",
                    "detail": [
                        "• Banyak berkas = (6,4 × 10^9) ÷ (2,5 × 10^5)",
                        "• = (6,4 ÷ 2,5) × 10^(9 − 5) = 2,56 × 10^4",
                        "» Banyak berkas maksimum = 2,56 × 10^4 (Kunci Jawaban B)"
                    ],
                    "spoken": "Banyak berkas adalah enam koma empat kali sepuluh pangkat sembilan dibagi dua koma lima kali sepuluh pangkat lima. Enam koma empat dibagi dua koma lima sama dengan dua koma lima enam, dan sepuluh pangkat sembilan dibagi sepuluh pangkat lima sama dengan sepuluh pangkat empat. Jadi hasilnya dua koma lima enam kali sepuluh pangkat empat. Jawaban B."
                }
            ],
            "spoken_soal": "Soal nomor 1. Sebuah memori berkapasitas delapan kali sepuluh pangkat sembilan byte. Sebanyak dua puluh persen kapasitasnya dipakai oleh sistem, dan sisanya diisi berkas yang masing-masing berukuran dua koma lima kali sepuluh pangkat lima byte. Banyak berkas maksimum yang dapat disimpan adalah ..."
        },
        {
            "nomor": 2,
            "elemen": "Bilangan",
            "subtopik": "Bentuk Akar dan Merasionalkan Penyebut",
            "tipe": "PG",
            "pertanyaan": "Diketahui x = (√5 + √3) / (√5 − √3). Nilai x + 1/x adalah ....",
            "opsi": [
                "A. 4",
                "B. 6",
                "C. 8",
                "D. 10",
                "E. 16"
            ],
            "jawaban_benar": "C",
            "steps": [
                {
                    "judul": "Rasionalkan penyebut x",
                    "detail": [
                        "• x = (√5 + √3)² / ((√5 − √3)(√5 + √3))",
                        "• = (5 + 2√15 + 3) / (5 − 3) = (8 + 2√15) / 2",
                        "• x = 4 + √15"
                    ],
                    "spoken": "Kalikan pembilang dan penyebut dengan sekawan penyebut, yaitu akar lima ditambah akar tiga. Pembilangnya menjadi kuadrat dari akar lima ditambah akar tiga, yaitu delapan ditambah dua akar lima belas. Penyebutnya lima dikurangi tiga sama dengan dua. Jadi x sama dengan empat ditambah akar lima belas."
                },
                {
                    "judul": "Cari 1/x lalu jumlahkan",
                    "detail": [
                        "• (4 + √15)(4 − √15) = 16 − 15 = 1",
                        "• Maka 1/x = 4 − √15",
                        "• x + 1/x = (4 + √15) + (4 − √15) = 8",
                        "» Nilai x + 1/x = 8 (Kunci Jawaban C)"
                    ],
                    "spoken": "Perhatikan bahwa empat ditambah akar lima belas dikali empat dikurangi akar lima belas sama dengan enam belas dikurangi lima belas, yaitu satu. Artinya satu per x sama dengan empat dikurangi akar lima belas. Jumlahnya, akar lima belas saling menghilangkan, tersisa empat ditambah empat sama dengan delapan. Jawaban C."
                }
            ],
            "spoken_soal": "Soal nomor 2. Diketahui x sama dengan akar lima ditambah akar tiga, dibagi akar lima dikurangi akar tiga. Nilai x ditambah satu per x adalah ..."
        },
        {
            "nomor": 3,
            "elemen": "Bilangan",
            "subtopik": "Persentase",
            "tipe": "PG",
            "pertanyaan": "Sebuah larutan alkohol 20% sebanyak 40 liter akan dicampur dengan larutan alkohol 50% agar diperoleh larutan alkohol 30%. Banyak larutan alkohol 50% yang harus ditambahkan adalah ... liter.",
            "opsi": [
                "A. 10",
                "B. 15",
                "C. 20",
                "D. 25",
                "E. 30"
            ],
            "jawaban_benar": "C",
            "steps": [
                {
                    "judul": "Susun persamaan alkohol murni",
                    "detail": [
                        "• Misal larutan 50% yang ditambahkan = x liter",
                        "• Alkohol murni sebelum dan sesudah dicampur sama:",
                        "• 0,2(40) + 0,5x = 0,3(40 + x)"
                    ],
                    "spoken": "Misalkan larutan lima puluh persen yang ditambahkan adalah x liter. Banyak alkohol murni sebelum dicampur sama dengan sesudah dicampur. Jadi nol koma dua kali empat puluh ditambah nol koma lima x sama dengan nol koma tiga kali empat puluh ditambah x."
                },
                {
                    "judul": "Selesaikan persamaan",
                    "detail": [
                        "• 8 + 0,5x = 12 + 0,3x",
                        "• 0,2x = 4 → x = 20",
                        "» Larutan 50% yang ditambahkan = 20 liter (Kunci Jawaban C)"
                    ],
                    "spoken": "Ruas kiri menjadi delapan ditambah nol koma lima x, ruas kanan dua belas ditambah nol koma tiga x. Pindahkan suku sejenis, diperoleh nol koma dua x sama dengan empat, sehingga x sama dengan dua puluh liter. Jawaban C."
                }
            ],
            "spoken_soal": "Soal nomor 3. Sebuah larutan alkohol dua puluh persen sebanyak empat puluh liter akan dicampur dengan larutan alkohol lima puluh persen agar diperoleh larutan alkohol tiga puluh persen. Banyak larutan alkohol lima puluh persen yang harus ditambahkan adalah ... liter."
        },
        {
            "nomor": 4,
            "elemen": "Bilangan",
            "subtopik": "Proporsi Berbalik Nilai",
            "tipe": "PG",
            "pertanyaan": "Sebuah proyek direncanakan selesai dalam 30 hari oleh 12 pekerja. Setelah berjalan 10 hari, 4 pekerja berhenti dan tidak ada pengganti. Proyek akan selesai ... hari lebih lambat dari rencana.",
            "opsi": [
                "A. 5",
                "B. 8",
                "C. 10",
                "D. 12",
                "E. 15"
            ],
            "jawaban_benar": "C",
            "steps": [
                {
                    "judul": "Hitung sisa pekerjaan",
                    "detail": [
                        "• Sisa waktu rencana = 30 − 10 = 20 hari",
                        "• Sisa pekerjaan = 20 × 12 = 240 pekerja-hari"
                    ],
                    "spoken": "Setelah berjalan sepuluh hari, sisa waktu menurut rencana adalah dua puluh hari. Sisa pekerjaan sama dengan dua puluh kali dua belas pekerja, yaitu dua ratus empat puluh pekerja-hari."
                },
                {
                    "judul": "Hitung waktu dengan 8 pekerja",
                    "detail": [
                        "• Pekerja tersisa = 12 − 4 = 8 orang",
                        "• Waktu sisa = 240 / 8 = 30 hari",
                        "• Total = 10 + 30 = 40 hari, rencana 30 hari",
                        "» Terlambat 40 − 30 = 10 hari (Kunci Jawaban C)"
                    ],
                    "spoken": "Pekerja tersisa delapan orang. Waktu untuk menyelesaikan sisa pekerjaan adalah dua ratus empat puluh dibagi delapan, yaitu tiga puluh hari. Total waktu empat puluh hari, sedangkan rencana tiga puluh hari. Jadi terlambat sepuluh hari. Jawaban C."
                }
            ],
            "spoken_soal": "Soal nomor 4. Sebuah proyek direncanakan selesai dalam tiga puluh hari oleh dua belas pekerja. Setelah berjalan sepuluh hari, empat pekerja berhenti dan tidak ada pengganti. Proyek akan selesai ... hari lebih lambat dari rencana."
        },
        {
            "nomor": 5,
            "elemen": "Bilangan",
            "subtopik": "Pangkat",
            "tipe": "PG",
            "pertanyaan": "Banyak digit pada bilangan 2^20 × 5^18 adalah ....",
            "opsi": [
                "A. 18",
                "B. 19",
                "C. 20",
                "D. 21",
                "E. 22"
            ],
            "jawaban_benar": "B",
            "steps": [
                {
                    "judul": "Sederhanakan dengan sifat pangkat",
                    "detail": [
                        "• 2^20 = 2^2 × 2^18",
                        "• 2^20 × 5^18 = 2^2 × (2^18 × 5^18)",
                        "• = 4 × (2 × 5)^18 = 4 × 10^18"
                    ],
                    "spoken": "Pisahkan dua pangkat dua puluh menjadi dua pangkat dua dikali dua pangkat delapan belas. Karena pangkatnya sama, dua pangkat delapan belas dikali lima pangkat delapan belas sama dengan dua kali lima pangkat delapan belas, yaitu sepuluh pangkat delapan belas. Jadi bilangannya empat kali sepuluh pangkat delapan belas."
                },
                {
                    "judul": "Hitung banyak digit",
                    "detail": [
                        "• 4 × 10^18 = angka 4 diikuti 18 buah nol",
                        "• Banyak digit = 1 + 18 = 19",
                        "» Banyak digit = 19 (Kunci Jawaban B)"
                    ],
                    "spoken": "Empat kali sepuluh pangkat delapan belas adalah angka empat diikuti delapan belas angka nol. Jadi banyak digitnya satu ditambah delapan belas sama dengan sembilan belas. Jawaban B."
                }
            ],
            "spoken_soal": "Soal nomor 5. Banyak digit pada bilangan dua pangkat dua puluh dikali lima pangkat delapan belas adalah ..."
        },
        {
            "nomor": 6,
            "elemen": "Bilangan",
            "subtopik": "Rasional, Irasional, Pangkat, dan Persentase",
            "tipe": "PG Kompleks",
            "pertanyaan": "Perhatikan pernyataan-pernyataan berikut. Tentukan SEMUA pernyataan yang BENAR:",
            "pernyataan": {
                "A": "√2 × √8 adalah bilangan rasional.",
                "B": "Jumlah dua bilangan irasional selalu bilangan irasional.",
                "C": "Bilangan 0,121212... (angka 12 berulang terus) adalah bilangan rasional.",
                "D": "Bilangan 2^10 × 5^10 terdiri dari 11 digit.",
                "E": "Harga turun 20% lalu naik 20% membuat harga kembali seperti semula."
            },
            "jawaban_benar": ["A", "C", "D"],
            "steps": [
                {
                    "judul": "Uji pernyataan A dan B",
                    "detail": [
                        "• A: √2 × √8 = √16 = 4 → rasional → BENAR",
                        "• B: √2 + (−√2) = 0 → rasional → SALAH"
                    ],
                    "spoken": "Pernyataan A. Akar dua dikali akar delapan sama dengan akar enam belas, yaitu empat, bilangan rasional. A benar. Pernyataan B. Akar dua ditambah negatif akar dua sama dengan nol, yang rasional. Jadi jumlah dua bilangan irasional bisa rasional. B salah."
                },
                {
                    "judul": "Uji pernyataan C",
                    "detail": [
                        "• Misal x = 0,1212... maka 100x = 12,1212...",
                        "• 100x − x = 12 → x = 12/99 = 4/33",
                        "• Dapat ditulis sebagai pecahan → rasional → BENAR"
                    ],
                    "spoken": "Pernyataan C. Misalkan x sama dengan nol koma satu dua satu dua dan seterusnya. Maka seratus x sama dengan dua belas koma satu dua satu dua. Kurangkan, diperoleh sembilan puluh sembilan x sama dengan dua belas, sehingga x sama dengan dua belas per sembilan puluh sembilan, atau empat per tiga puluh tiga. Desimal berulang dapat ditulis sebagai pecahan, jadi rasional. C benar."
                },
                {
                    "judul": "Uji pernyataan D dan E",
                    "detail": [
                        "• D: 2^10 × 5^10 = 10^10 → 1 diikuti 10 nol → 11 digit → BENAR",
                        "• E: 0,8 × 1,2 = 0,96 → harga akhir turun 4% → SALAH",
                        "» Jawaban Benar = A, C, D"
                    ],
                    "spoken": "Pernyataan D. Dua pangkat sepuluh dikali lima pangkat sepuluh sama dengan sepuluh pangkat sepuluh, yaitu angka satu diikuti sepuluh nol, sebelas digit. D benar. Pernyataan E. Turun dua puluh persen berarti dikali nol koma delapan, naik dua puluh persen berarti dikali satu koma dua. Hasilnya nol koma sembilan enam, jadi harga akhir turun empat persen dari semula. E salah. Jadi pernyataan yang benar adalah A, C, dan D."
                }
            ],
            "spoken_soal": "Soal nomor 6. Perhatikan pernyataan-pernyataan berikut. A, akar dua dikali akar delapan adalah bilangan rasional. B, jumlah dua bilangan irasional selalu bilangan irasional. C, bilangan nol koma satu dua satu dua berulang terus adalah bilangan rasional. D, bilangan dua pangkat sepuluh dikali lima pangkat sepuluh terdiri dari sebelas digit. E, harga turun dua puluh persen lalu naik dua puluh persen membuat harga kembali seperti semula. Tentukan semua pernyataan yang benar."
        }
    ]
}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate Video Animasi Pembahasan Latihan TKA Matematika (Bilangan: Bilangan Real, HOTS)")
    parser.add_argument("output", nargs="?",
                        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "video_tka12_bilangan_hots.mp4"),
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

