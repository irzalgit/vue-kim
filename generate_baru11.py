#!/usr/bin/env python3
import os
import sys
import re
import io
import math
import subprocess
import asyncio
import edge_tts
from PIL import Image, ImageDraw, ImageFont

# --- Mesin render matematika (setara KaTeX untuk pipeline Python/PIL) ---
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

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

POSSIBLE_FONTS_HANDWRITING = [
    os.path.join(os.path.dirname(__file__), "fonts", "Kalam-Bold.ttf"),
    os.path.join(os.path.dirname(__file__), "fonts", "Caveat-Bold.ttf"),
    os.path.join(os.path.dirname(__file__), "fonts", "PatrickHand-Regular.ttf"),
    os.path.join(os.path.dirname(__file__), "fonts", "ComicNeue-Bold.ttf"),
]

POSSIBLE_FONTS_HANDWRITING_REGULAR = [
    os.path.join(os.path.dirname(__file__), "fonts", "Kalam-Regular.ttf"),
    os.path.join(os.path.dirname(__file__), "fonts", "Caveat-Regular.ttf"),
    os.path.join(os.path.dirname(__file__), "fonts", "PatrickHand-Regular.ttf"),
    os.path.join(os.path.dirname(__file__), "fonts", "ComicNeue-Regular.ttf"),
]

def ensure_local_font():
    font_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")
    os.makedirs(font_dir, exist_ok=True)
    font_bold = os.path.join(font_dir, "arialbd.ttf")
    font_reg = os.path.join(font_dir, "arial.ttf")
    font_hw_bold = os.path.join(font_dir, "Kalam-Bold.ttf")
    font_hw_reg = os.path.join(font_dir, "Kalam-Regular.ttf")
    
    urls = [
        ("https://raw.githubusercontent.com/matomo-org/travis-scripts/master/fonts/Arial_Bold.ttf", font_bold),
        ("https://raw.githubusercontent.com/matomo-org/travis-scripts/master/fonts/Arial.ttf", font_reg),
        ("https://raw.githubusercontent.com/google/fonts/main/ofl/kalam/Kalam-Bold.ttf", font_hw_bold),
        ("https://raw.githubusercontent.com/google/fonts/main/ofl/kalam/Kalam-Regular.ttf", font_hw_reg),
    ]
    for url, dest in urls:
        if not os.path.exists(dest) or os.path.getsize(dest) < 1000:
            try:
                import urllib.request
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
FONT_HANDWRITING = find_first_existing_font(POSSIBLE_FONTS_HANDWRITING)
FONT_HANDWRITING_REGULAR = find_first_existing_font(POSSIBLE_FONTS_HANDWRITING_REGULAR)


def get_font(size, bold=True):
    target = FONT_PATH if bold else (FONT_REGULAR or FONT_PATH)
    if target and os.path.exists(target):
        try:
            return ImageFont.truetype(target, size)
        except Exception:
            pass
    for name in ["FreeSansBold.ttf" if bold else "FreeSans.ttf", "DejaVuSans-Bold.ttf" if bold else "DejaVuSans-Bold.ttf", "Roboto-Bold.ttf", "Ubuntu-B.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            pass
    try:
        return ImageFont.load_default(size=size)
    except Exception:
        return ImageFont.load_default()


def get_handwriting_font(size, bold=True):
    target = FONT_HANDWRITING if bold else (FONT_HANDWRITING_REGULAR or FONT_HANDWRITING)
    if target and os.path.exists(target):
        try:
            return ImageFont.truetype(target, size)
        except Exception:
            pass
    return get_font(size, bold=bold)


def draw_rounded_rect(draw, bbox, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)


def draw_falling_rotating_box(img, t, center_x, target_y, start_y=None, size=80,
                               spins=2.5, color_top="#93C5FD", color_left="#1E40AF",
                               color_right="#3B82F6", outline="#1E3A8A"):
    """
    Menggambar animasi kotak/kubus pseudo-3D yang berputar sambil jatuh ke posisi target,
    lalu memantul kecil saat mendarat. Ditempel (paste dengan alpha) di atas `img` (RGB).

    t          : progres animasi, 0.0 (mulai jatuh dari atas) -> 1.0 (sudah mendarat & diam)
    center_x   : posisi x pusat kotak saat mendarat
    target_y   : posisi y pusat kotak saat mendarat
    start_y    : posisi y awal (default: 260px di atas target_y)
    size       : ukuran dasar kotak dalam px
    spins      : jumlah putaran penuh selama animasi jatuh
    """
    t = max(0.0, min(1.0, t))
    if start_y is None:
        start_y = target_y - 260

    # --- Fase jatuh (ease-in, meniru percepatan gravitasi) hingga t=0.82 ---
    land_t = 0.82
    fall_t = min(1.0, t / land_t)
    eased = fall_t * fall_t
    y = start_y + (target_y - start_y) * eased

    # --- Fase mendarat: efek memantul & "gepeng" (squash) sesaat ---
    squash_y = 1.0
    squash_x = 1.0
    if t > land_t:
        bt = (t - land_t) / (1.0 - land_t)
        bounce = math.sin(bt * math.pi) * (1.0 - bt)
        y = target_y - 14 * bounce
        squash_y = 1.0 - 0.28 * bounce
        squash_x = 1.0 + 0.22 * bounce

    # Kotak berhenti berputar begitu sudah mendarat
    angle = (t * 360 * spins) % 360 if t < land_t else 0

    # --- Bangun sprite kotak/kubus isometrik sederhana (3 sisi terlihat) ---
    s = max(20, int(size))
    canvas = int(s * 1.9)
    cube_img = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cube_img)
    cx, cy = canvas // 2, canvas // 2
    half = s // 2
    depth = int(s * 0.36)

    top_face = [(cx - half, cy - depth // 2), (cx, cy - depth),
                (cx + half, cy - depth // 2), (cx, cy)]
    left_face = [(cx - half, cy - depth // 2), (cx, cy),
                 (cx, cy + s - depth // 2), (cx - half, cy + s - depth)]
    right_face = [(cx + half, cy - depth // 2), (cx, cy),
                  (cx, cy + s - depth // 2), (cx + half, cy + s - depth)]

    cd.polygon(top_face, fill=color_top, outline=outline)
    cd.polygon(left_face, fill=color_left, outline=outline)
    cd.polygon(right_face, fill=color_right, outline=outline)

    # --- Putar kotak (efek berputar di udara) ---
    rotated = cube_img.rotate(angle, resample=Image.BICUBIC, expand=True)

    # --- Terapkan efek squash/stretch saat mendarat ---
    if squash_x != 1.0 or squash_y != 1.0:
        new_w = max(1, int(rotated.width * squash_x))
        new_h = max(1, int(rotated.height * squash_y))
        rotated = rotated.resize((new_w, new_h), Image.LANCZOS)

    px = int(center_x - rotated.width / 2)
    py = int(y - rotated.height / 2)
    img.paste(rotated, (px, py), rotated)


def to_mathtext_line(text):
    if not text:
        return ""
    t = text
    t = re.sub(r'√\(([^)]+)\)', lambda m: f"$\\sqrt{{{m.group(1)}}}$", t)
    t = re.sub(r'√(\d+(?:[.,]\d+)?)', lambda m: f"$\\sqrt{{{m.group(1)}}}$", t)
    t = re.sub(r'(?<![A-Za-z.])(\d+)\s*/\s*(\d+)(?![A-Za-z.])', lambda m: f"$\\frac{{{m.group(1)}}}{{{m.group(2)}}}$", t)
    t = re.sub(r'([A-Za-z0-9\)])\^\(([^)]+)\)', lambda m: f"{m.group(1)}$^{{{m.group(2)}}}$", t)
    t = re.sub(r'([A-Za-z0-9\)])\^(-?[A-Za-z0-9]+)', lambda m: f"{m.group(1)}$^{{{m.group(2)}}}$", t)
    t = re.sub(r'([A-Za-z0-9])_([0-9a-zA-Z]+)', lambda m: f"{m.group(1)}$_{{{m.group(2)}}}$", t)
    subscript_map = {'₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9'}
    t = re.sub(r'([A-Za-z0-9])([₀-₉]+)', lambda m: f"{m.group(1)}$_{{{''.join(subscript_map.get(c, c) for c in m.group(2))}}}$", t)
    symbol_map = {
        '×': r'$\times$', '·': r'$\cdot$',
        '≤': r'$\leq$', '≥': r'$\geq$', '≠': r'$\neq$',
        '±': r'$\pm$', '≈': r'$\approx$', 'π': r'$\pi$', 'θ': r'$\theta$',
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
        print(f"Peringatan: gagal merender mathtext '{text[:40]}...': {e}")
        return None

    _katex_cache[cache_key] = img
    return img


def draw_math_line(img, draw, xy, text, font, font_px, fill="#FFFFFF", max_width=None):
    x, y = xy
    has_math = bool(re.search(r'[√×·≤≥≠±≈πθ^₀₁₂₃₄₅₆₇₈₉]|\d/\d|\b[A-Za-z]_[0-9A-Za-z]', text))
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


def latex_to_clean_text(text):
    """Mengubah format LaTeX / simbol kaku menjadi teks matematika bersih & simbol Unicode yang nyaman dibaca."""
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
    text = re.sub(r'\\theta', r'θ', text)
    text = re.sub(r'\\circ', r'°', text)
    text = text.replace('^\\circ', '°')
    text = text.replace('^o', '°')
    text = text.replace('\\pi', 'π')
    text = re.sub(r'\^\{?0\}?', '⁰', text)
    text = re.sub(r'\^\{?1\}?', '¹', text)
    text = re.sub(r'\^\{?2\}?', '²', text)
    text = re.sub(r'\^\{?3\}?', '³', text)
    text = re.sub(r'\^\{?4\}?', '⁴', text)
    text = re.sub(r'\^\{?5\}?', '⁵', text)
    text = re.sub(r'\^\{?6\}?', '⁶', text)
    text = re.sub(r'\^\{?7\}?', '⁷', text)
    text = re.sub(r'\^\{?8\}?', '⁸', text)
    text = re.sub(r'\^\{?9\}?', '⁹', text)
    text = re.sub(r'\^\{?([0-9a-zA-Z\+\-]+)\}?', r'^\1', text)
    text = text.replace('$', '')
    text = text.replace(r'\_', '_')
    text = text.replace('{', '').replace('}', '')
    text = text.replace(r'\ ', ' ')
    text = text.replace('\\', '')
    return text.strip()


def text_to_spoken(text):
    if not text:
        return ""
    text = latex_to_clean_text(text)

    # Perkalian angka x angka (contoh: 3 x 4 -> 3 kali 4)
    text = re.sub(r'(\d+)\s*[xX]\s*(\d+)', r'\1 kali \2', text)

    # Simbol Pertidaksamaan & Pembanding
    text = text.replace('≤', ' lebih kecil sama dengan ')
    text = text.replace('≥', ' lebih besar sama dengan ')
    text = text.replace('<=', ' lebih kecil sama dengan ')
    text = text.replace('>=', ' lebih besar sama dengan ')
    text = text.replace('<', ' lebih kecil ')
    text = text.replace('>', ' lebih besar ')
    text = text.replace('≠', ' tidak sama dengan ')
    text = text.replace('±', ' plus minus ')

    # Logaritma & Trigonometri
    text = text.replace('²log', ' 2 log ')
    text = text.replace('³log', ' 3 log ')
    text = text.replace('⁴log', ' 4 log ')
    text = text.replace('⁵log', ' 5 log ')
    text = text.replace('log ', ' logaritma ')
    text = text.replace('ln(', ' lon ')
    text = text.replace('ln ', ' lon ')
    text = text.replace('θ', ' teta ')
    text = text.replace('∘', ' bundaran ')
    text = text.replace('→', ' menghasilkan ')
    text = text.replace('lim(x mendekati', 'limit eks mendekati ')
    text = text.replace('lim', 'limit ')
    text = text.replace('sin ', 'sinus ')
    text = text.replace('cos ', 'kosinus ')
    text = text.replace('tan ', 'tangen ')
    text = text.replace('sin²', 'sinus kuadrat ')
    text = text.replace('cos²', 'kosinus kuadrat ')
    text = text.replace('tan²', 'tangen kuadrat ')

    # Pangkat berpola eksponen x^(x-1), 0^(-1), dll
    def repl_pow(m):
        base = m.group(1)
        exp = m.group(2).strip("()")
        return f"{base} pangkat {exp}"

    for _ in range(2):
        text = re.sub(r'(\b[a-zA-Z0-9\(\)\[\]]+)\^\(([^)]+)\)', repl_pow, text)
        text = re.sub(r'(\b[a-zA-Z0-9]+)\^([a-zA-Z0-9\+\-]+)', repl_pow, text)

    # Variabel x menjadi eks
    text = re.sub(r'\bx\b', 'eks', text)
    text = re.sub(r'\bX\b', 'eks', text)

    # Mata uang & Rentang
    text = re.sub(r'Rp\s*([\d\.]+),00', r'\1 rupiah', text)
    text = re.sub(r'Rp\s*([\d\.]+)', r'\1 rupiah', text)
    text = re.sub(r'(\d+)\s*[-–]\s*(\d+)', r'\1 sampai \2', text)
    text = re.sub(r'(\d+),(\d+)', r'\1 koma \2', text)

    # Pangkat Unicode
    text = text.replace('⁰', ' pangkat nol ')
    text = text.replace('¹', ' pangkat satu ')
    text = text.replace('²', ' kuadrat ')
    text = text.replace('³', ' pangkat tiga ')
    text = text.replace('⁴', ' pangkat empat ')
    text = text.replace('⁵', ' pangkat lima ')
    text = text.replace('⁶', ' pangkat enam ')
    text = text.replace('⁷', ' pangkat tujuh ')
    text = text.replace('⁸', ' pangkat delapan ')
    text = text.replace('⁹', ' pangkat sembilan ')
    text = text.replace('⁻²', ' pangkat minus dua ')
    text = text.replace('⁻¹', ' pangkat minus satu ')
    text = text.replace('°', ' derajat ')
    text = text.replace('π', ' pi ')

    text = re.sub(r'(\d+)√(\d+)', r'\1 akar \2', text)
    text = text.replace('√', 'akar ')
    text = text.replace('×', ' kali ')
    text = text.replace('·', ' kali ')
    text = text.replace(':', ' bagi ')
    text = text.replace(' + ', ' ditambah ')
    text = text.replace('+', ' ditambah ')
    text = text.replace(' - ', ' minus ')
    text = text.replace(' -', ' minus ')
    text = text.replace('- ', ' minus ')
    text = text.replace('−', ' minus ')
    text = text.replace('-', ' minus ')
    text = text.replace(' = ', ' sama dengan ')
    text = text.replace('=', ' sama dengan ')
    text = text.replace('≈', ' mendekati ')
    text = text.replace('/', ' per ')

    # Unit pengukuran
    text = text.replace('cm³', ' sentimeter kubik ')
    text = text.replace('cm²', ' sentimeter persegi ')
    text = text.replace('cm', ' sentimeter ')
    text = text.replace('m²', ' meter persegi ')
    text = text.replace(' m ', ' meter ')

    text = text.replace('(', ' ').replace(')', ' ')
    text = text.replace('[', ' ').replace(']', ' ')
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def wrap_text(text, font, max_width):
    words = text.split()
    lines = []
    current_line = []
    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = font.getbbox(test_line)
        w = bbox[2] - bbox[0]
        if w <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
                current_line = [word]
            else:
                lines.append(word)
                current_line = []
    if current_line:
        lines.append(' '.join(current_line))
    return lines


def get_options_list(question_data):
    opsi = question_data.get('opsi') or question_data.get('pilihan') or question_data.get('options', [])
    if isinstance(opsi, dict):
        return [opsi[k] for k in sorted(opsi.keys())]
    return list(opsi)


def get_correct_set(question_data):
    kj = question_data.get('kunci_jawaban') if 'kunci_jawaban' in question_data else (question_data.get('jawaban_benar') if 'jawaban_benar' in question_data else question_data.get('jawabanBenar'))
    if kj is not None:
        if isinstance(kj, (list, tuple, set)):
            return set(ord(k.strip().upper()) - 65 for k in kj if k.strip().upper() in "ABCDE")
        elif isinstance(kj, str):
            return {ord(kj.strip().upper()) - 65} if kj.strip().upper() in "ABCDE" else {0}
        elif isinstance(kj, int):
            return {kj}
    ci = question_data.get('correct_idx', 0)
    if isinstance(ci, (list, tuple, set)):
        return set(ci)
    return {ci}


def draw_footer_watermark(draw, y_pos=1840):
    pass


def clean_option_text(opt):
    opt_str = str(opt).strip()
    return re.sub(r'^[A-E]\.\s*', '', opt_str)


# Direktori pencarian gambar soal (Prioritas: /sdcard/download/)
IMAGE_SEARCH_DIRS = [
    "/sdcard/download",
    "/sdcard/Download",
    os.path.expanduser("~/sdcard/download"),
    os.path.expanduser("~/sdcard/Download"),
    os.path.expanduser("~/storage/downloads"),
    os.path.expanduser("~/storage/shared/Download"),
    "/storage/emulated/0/Download",
    "/storage/emulated/0/download",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "images"),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "public"),
    os.path.dirname(os.path.abspath(__file__)),
    "/root/vue-kim",
    "/root",
    os.getcwd(),
]

def resolve_image_path(img_name, soal_id=None):
    """Mencari lokasi file gambar soal langsung atau di direktori /sdcard/download/ dan kandidat lainnya."""
    candidates_to_try = []

    if img_name:
        if isinstance(img_name, str) and img_name.strip():
            raw = img_name.strip()
            candidates_to_try.append(raw)
            if raw.startswith("~"):
                candidates_to_try.append(os.path.expanduser(raw))
            candidates_to_try.append(os.path.basename(raw))

    if soal_id is not None:
        for ext in [".png", ".jpg", ".jpeg", ".webp", ".svg"]:
            candidates_to_try.extend([
                f"soal_{soal_id}{ext}",
                f"soal{soal_id}{ext}",
                f"soal_{soal_id}_tka12{ext}",
                f"tka12_soal_{soal_id}{ext}",
                f"tka12_soal{soal_id}{ext}",
                f"tka12_1_soal_{soal_id}{ext}",
                f"tka12_1_soal{soal_id}{ext}",
                f"gambar_soal_{soal_id}{ext}",
                f"gambar_soal{soal_id}{ext}",
                f"gambar_{soal_id}{ext}",
                f"img_soal_{soal_id}{ext}",
                f"img_soal{soal_id}{ext}",
            ])

    # 1. Cek jika path langsung valid
    for item in candidates_to_try:
        if item and os.path.exists(item) and os.path.isfile(item) and os.path.getsize(item) > 100:
            return os.path.abspath(item)

    # 2. Cari di daftar folder direktori gambar (/sdcard/download dsb)
    for item in candidates_to_try:
        if not item:
            continue
        base = os.path.basename(item)
        for sdir in IMAGE_SEARCH_DIRS:
            full_p = os.path.join(sdir, base)
            if os.path.exists(full_p) and os.path.isfile(full_p) and os.path.getsize(full_p) > 100:
                return full_p

    return None


_loaded_img_cache = {}

def load_and_fit_image(img_input, max_w, max_h, soal_id=None):
    if not img_input and soal_id is None:
        return None
    cache_key = (img_input if isinstance(img_input, str) else None, max_w, max_h, soal_id)
    if cache_key in _loaded_img_cache:
        return _loaded_img_cache[cache_key]

    try:
        if isinstance(img_input, Image.Image):
            img = img_input.convert("RGBA")
        else:
            resolved_path = resolve_image_path(img_input, soal_id=soal_id)
            if not resolved_path:
                _loaded_img_cache[cache_key] = None
                return None
            print(f"  [✓ Gambar Ditemukan] Memuat gambar soal: {resolved_path}")
            img = Image.open(resolved_path).convert("RGBA")

        w, h = img.size
        if w == 0 or h == 0:
            _loaded_img_cache[cache_key] = None
            return None
        ratio = min(max_w / w, max_h / h)
        new_w = max(1, int(w * ratio))
        new_h = max(1, int(h * ratio))
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        _loaded_img_cache[cache_key] = img
        return img
    except Exception as e:
        print(f"Peringatan: Gagal memuat gambar ({img_input}): {e}")
        _loaded_img_cache[cache_key] = None
        return None


def ensure_diagram_images_exist():
    """Menyiapkan gambar ilustrasi diagram matematika jika belum ada di /sdcard/download/"""
    target_dir = "/sdcard/download"
    if not os.path.exists(target_dir):
        try:
            os.makedirs(target_dir, exist_ok=True)
        except Exception:
            target_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images")
            os.makedirs(target_dir, exist_ok=True)

    # 1. Diagram Silo (Geometri Soal 3: Gabungan Tabung dan Setengah Bola)
    p_silo = os.path.join(target_dir, "img_geometri_silo.png")
    try:
        from matplotlib.patches import Rectangle, Ellipse
        import numpy as np
        fig, ax = plt.subplots(figsize=(6, 3.5), dpi=150)
        fig.patch.set_facecolor('#111827')
        ax.set_facecolor('#111827')
        rect = Rectangle((-3.5, 0), 7, 8, linewidth=2, edgecolor='#38BDF8', facecolor='#1E293B')
        ax.add_patch(rect)
        el_bot = Ellipse((0, 0), 7, 1.6, linewidth=2, edgecolor='#38BDF8', facecolor='#1E293B')
        ax.add_patch(el_bot)
        el_mid = Ellipse((0, 8), 7, 1.6, linewidth=2, edgecolor='#38BDF8', facecolor='#334155')
        ax.add_patch(el_mid)
        
        # Kubah Setengah Bola
        theta = np.linspace(0, np.pi, 200)
        x_dome = 3.5 * np.cos(theta)
        y_dome = 8 + 3.5 * np.sin(theta)
        ax.fill_between(x_dome, 8, y_dome, color='#1E293B')
        ax.plot(x_dome, y_dome, color='#F59E0B', linewidth=2.5)

        ax.plot([0, 3.5], [8, 8], color='#FBBF24', linestyle='--', linewidth=2)
        ax.text(1.75, 8.4, 'r = 7 m', color='#FBBF24', fontsize=12, fontweight='bold', ha='center')
        ax.annotate('', xy=(4.3, 0), xytext=(4.3, 8), arrowprops=dict(arrowstyle='<->', color='#38BDF8', lw=2))
        ax.text(4.6, 4, 't_tabung = 10 m', color='#38BDF8', fontsize=11, fontweight='bold', va='center')
        ax.annotate('', xy=(-4.2, 8), xytext=(-4.2, 11.5), arrowprops=dict(arrowstyle='<->', color='#F59E0B', lw=2))
        ax.text(-4.5, 9.75, 'Kubah\n½ Bola', color='#F59E0B', fontsize=10, fontweight='bold', ha='right', va='center')
        ax.set_xlim(-6.5, 9.5)
        ax.set_ylim(-1.5, 13.5)
        ax.axis('off')
        plt.tight_layout()
        plt.savefig(p_silo, dpi=150, bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none')
        plt.close(fig)
    except Exception as e:
        print(f"Peringatan generator diagram silo: {e}")

    # 2. Diagram Statistika (Batang Buku Soal 4)
    p_stat = os.path.join(target_dir, "img_statistika_diagram.png")
    if not os.path.exists(p_stat):
        try:
            fig, ax = plt.subplots(figsize=(6, 3.2), dpi=150)
            fig.patch.set_facecolor('#111827')
            ax.set_facecolor('#1F2937')
            buku = ['1 buku', '2 buku', '3 buku', '4 buku', '5 buku']
            siswa = [3, 7, 10, 6, 4]
            colors = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA']
            bars = ax.bar(buku, siswa, color=colors, width=0.55, edgecolor='#E5E7EB', linewidth=1)
            for bar in bars:
                h = bar.get_height()
                ax.text(bar.get_x() + bar.get_width()/2., h + 0.3, f'{h}', ha='center', va='bottom', color='#FFFFFF', fontsize=12, fontweight='bold')
            ax.set_ylabel('Banyak Siswa', color='#F3F4F6', fontsize=11, fontweight='bold')
            ax.set_title('Banyak Buku yang Dibaca Siswa', color='#60A5FA', fontsize=13, fontweight='bold', pad=10)
            ax.tick_params(colors='#E5E7EB', labelsize=10)
            ax.grid(axis='y', linestyle='--', alpha=0.3, color='#9CA3AF')
            ax.set_ylim(0, 12)
            plt.tight_layout()
            plt.savefig(p_stat, dpi=150, bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none')
            plt.close(fig)
        except Exception as e:
            print(f"Peringatan generator diagram statistika: {e}")

    # 3. Diagram Pengukuran Bak (Soal 5)
    p_bak = os.path.join(target_dir, "img_pengukuran_bak.png")
    if not os.path.exists(p_bak):
        try:
            from matplotlib.patches import Polygon
            fig, ax = plt.subplots(figsize=(6, 3.2), dpi=150)
            fig.patch.set_facecolor('#111827')
            ax.set_facecolor('#111827')
            front = Polygon([[1, 1], [6, 1], [6, 4], [1, 4]], closed=True, facecolor='#1E293B', edgecolor='#38BDF8', linewidth=2)
            top = Polygon([[1, 4], [6, 4], [8, 6], [3, 6]], closed=True, facecolor='#0E7490', edgecolor='#38BDF8', linewidth=2, alpha=0.8)
            side = Polygon([[6, 1], [8, 3], [8, 6], [6, 4]], closed=True, facecolor='#0F172A', edgecolor='#38BDF8', linewidth=2)
            ax.add_patch(front)
            ax.add_patch(top)
            ax.add_patch(side)
            ax.text(3.5, 0.4, 'Panjang = 1,5 m', color='#FBBF24', fontsize=11, fontweight='bold', ha='center')
            ax.text(7.4, 1.8, 'Lebar = 1 m', color='#FBBF24', fontsize=11, fontweight='bold', rotation=35)
            ax.text(0.4, 2.5, 'Tinggi\n0,8 m', color='#FBBF24', fontsize=11, fontweight='bold', ha='center')
            ax.text(2.5, 6.3, '🚰 Debit = 2 L/detik', color='#34D399', fontsize=12, fontweight='bold')
            ax.set_xlim(-0.5, 9.5)
            ax.set_ylim(-0.2, 7.5)
            ax.axis('off')
            plt.tight_layout()
            plt.savefig(p_bak, dpi=150, bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none')
            plt.close(fig)
        except Exception as e:
            print(f"Peringatan generator diagram bak: {e}")

    # 4. Diagram Trigonometri (Soal 6)
    p_trig = os.path.join(target_dir, "img_trigonometri_grafik.png")
    if not os.path.exists(p_trig):
        try:
            import numpy as np
            fig, ax = plt.subplots(figsize=(6, 3.2), dpi=150)
            fig.patch.set_facecolor('#111827')
            ax.set_facecolor('#1F2937')
            x = np.linspace(0, 360, 400)
            y = 2 * np.sin(np.radians(x))
            ax.plot(x, y, color='#38BDF8', linewidth=3, label='f(x) = 2 sin(x)')
            ax.axhline(0, color='#9CA3AF', linestyle='-', linewidth=1)
            ax.axvline(0, color='#9CA3AF', linestyle='-', linewidth=1)
            pts_x = [0, 90, 180, 270, 360]
            pts_y = [0, 2, 0, -2, 0]
            ax.scatter(pts_x, pts_y, color='#F43F5E', s=45, zorder=5)
            ax.set_xticks(pts_x)
            ax.set_xticklabels(['0°', '90°', '180°', '270°', '360°'], color='#E5E7EB', fontsize=10, fontweight='bold')
            ax.set_yticks([-2, -1, 0, 1, 2])
            ax.tick_params(colors='#E5E7EB', labelsize=10)
            ax.set_title('Grafik f(x) = 2 sin(x)', color='#38BDF8', fontsize=12, fontweight='bold')
            ax.grid(True, linestyle='--', alpha=0.3, color='#9CA3AF')
            ax.set_ylim(-2.6, 2.6)
            plt.tight_layout()
            plt.savefig(p_trig, dpi=150, bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none')
            plt.close(fig)
        except Exception as e:
            print(f"Peringatan generator diagram trigonometri: {e}")




def build_steps_if_needed(soal):
    if 'steps' in soal and soal['steps']:
        return soal['steps']

    pembahasan = soal.get('pembahasan') or soal.get('kunci_jawaban', '')
    submateri = soal.get('submateri') or soal.get('subtopic') or soal.get('elemen', 'Matematika SMA')

    return [
        {
            "title": f"Identifikasi Konsep {submateri}",
            "details": [
                f"• Materi Pokok: {soal.get('elemen', 'Matematika')} - {submateri}",
                "• Pahami informasi dan kondisi yang diberikan pada soal secara cermat."
            ],
            "spoken": f"Konsep yang digunakan adalah {submateri}. Mari kita analisis informasi yang diketahui pada soal."
        },
        {
            "title": "Langkah & Petunjuk Rumus",
            "details": [
                f"• Rumus & Petunjuk: {pembahasan}"
            ],
            "spoken": f"Gunakan rumus dan petunjuk penyelesaian berikut: {text_to_spoken(pembahasan)}. Nah, coba hitung dan tuliskan pilihan jawabanmu di kolom komentar ya!"
        },
        {
            "title": "Tantangan Untuk Kamu",
            "details": [
                "★ Berdasarkan langkah dan rumus di atas, apa pilihan jawabanmu?",
                "★ Tuliskan pilihan jawaban yang paling tepat di kolom komentar sekarang!"
            ],
            "spoken": ""
        }
    ]


def draw_colorful_background(draw, width=WIDTH, height=HEIGHT):
    """Membuat latar belakang multi-warna dinamis (gradasi estetik dan lingkaran cahaya neon)."""
    draw.rectangle([(0, 0), (width, height)], fill="#070B19")
    draw.ellipse((-150, -100, 650, 700), fill="#1E1B4B")
    draw.ellipse((400, 700, 1250, 1600), fill="#3B0764")
    draw.ellipse((-100, 1300, 700, 2050), fill="#0E4966")
    draw.ellipse((600, -50, 1180, 500), fill="#172554")


def create_question_frame(question_data, timer_val=5, font_size=60):
    scale = font_size / 60.0
    FS_BADGE = max(28, round(36 * scale))
    FS_BODY = font_size
    FS_OPTION = max(38, round(56 * scale))
    FS_TIMER = max(100, round(120 * scale))

    img = Image.new("RGB", (WIDTH, HEIGHT), "#070B19")
    draw = ImageDraw.Draw(img)

    draw_colorful_background(draw, WIDTH, HEIGHT)

    # Top Header: Profile + Topic
    draw_rounded_rect(draw, (40, 55, 480, 145), radius=24, fill="#121829", outline="#3B82F6", width=2)
    draw.text((65, 80), f"♫ {question_data.get('account', '@pairzal')}", font=get_font(FS_BADGE, bold=True), fill="#FFFFFF")

    draw_rounded_rect(draw, (505, 55, WIDTH - 40, 145), radius=24, fill="#121829", outline="#3B82F6", width=2)
    draw.text((530, 80), "★ Latihan Soal Persiapan TKA SMA", font=get_font(FS_BADGE, bold=True), fill="#FFFFFF")

    submateri = question_data.get('submateri') or question_data.get('subtopic') or question_data.get('elemen', 'Bilangan')
    soal_num = question_data.get('nomor') or question_data.get('id', 1)
    tag_text = f"SOAL #{soal_num}  •  {submateri.upper()}"

    img_src = question_data.get('image_path') or question_data.get('image') or question_data.get('gambar')
    chart_img = load_and_fit_image(img_src, max_w=920, max_h=220, soal_id=soal_num)

    card_top = 170
    card_bottom = 860 if chart_img else 760
    draw_rounded_rect(draw, (40, card_top, WIDTH - 40, card_bottom), radius=24, fill="#111827", outline="#4F46E5", width=2)
    tag_font = get_font(FS_BADGE, bold=True)
    tb = tag_font.getbbox(tag_text)
    tw = tb[2] - tb[0]
    draw_rounded_rect(draw, (65, card_top + 18, min(WIDTH - 65, 65 + tw + 40), card_top + 84), radius=16, fill="#1F2937", outline="#6366F1", width=1)
    draw.text((85, card_top + 32), tag_text, font=tag_font, fill="#F3F4F6")

    q_text = question_data.get('soal') or question_data.get('pertanyaan') or question_data.get('question', '')
    clean_q = latex_to_clean_text(q_text)
    
    # Skala font dinamis agar soal tampil 100% lengkap tanpa terpotong
    curr_body_fs = FS_BODY
    q_font = get_font(curr_body_fs, bold=True)
    q_lines = wrap_text(clean_q, q_font, WIDTH - 140)
    max_allowed_lines = 4 if chart_img else 6
    while len(q_lines) > max_allowed_lines and curr_body_fs > 38:
        curr_body_fs -= 3
        q_font = get_font(curr_body_fs, bold=True)
        q_lines = wrap_text(clean_q, q_font, WIDTH - 140)

    line_spacing = round(curr_body_fs * 1.32)
    y_text = card_top + 100
    for line in q_lines:
        draw_math_line(img, draw, (65, y_text), line, q_font, curr_body_fs, fill="#FFFFFF", max_width=WIDTH - 130)
        y_text += line_spacing

    if chart_img:
        img_x = (WIDTH - chart_img.width) // 2
        img_y = y_text + 8
        if img_y + chart_img.height > card_bottom - 12:
            img_y = card_bottom - chart_img.height - 12
        img.paste(chart_img, (img_x, img_y), chart_img)

    cx = WIDTH // 2
    cy = card_bottom + 85
    r = max(50, round(65 * scale))
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill="#1F2937", outline="#EC4899", width=3)
    t_font = get_font(FS_TIMER, bold=True)
    t_str = str(timer_val)
    tb = t_font.getbbox(t_str)
    tw = tb[2] - tb[0]
    th = tb[3] - tb[1]
    draw.text((cx - tw / 2, cy - th / 2 - tb[1]), t_str, font=t_font, fill="#F43F5E")

    options = get_options_list(question_data)
    n_opts = len(options)
    opt_start_y = cy + r + 30
    opt_height = max(88, round(120 * scale)) if n_opts <= 4 else max(78, round(100 * scale))
    opt_gap = 14 if n_opts <= 4 else 10
    opt_font = get_font(FS_OPTION, bold=True)
    opt_line_h = round(FS_OPTION * 1.15)

    for i, opt in enumerate(options):
        cur_y = opt_start_y + i * (opt_height + opt_gap)
        if cur_y + opt_height > HEIGHT - 35:
            break
        draw_rounded_rect(draw, (40, cur_y, WIDTH - 40, cur_y + opt_height), radius=18,
                          fill="#111827", outline="#374151", width=2)

        circle_letter = chr(65 + i)
        c_r = max(28, round(36 * scale))
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

    draw_footer_watermark(draw, y_pos=1860)
    return img


def get_marker_icon(color="#2563EB", scale=0.7):
    w, h = int(140 * scale), int(140 * scale)
    marker = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(marker)
    d.polygon([(0, 0), (int(16 * scale), int(6 * scale)), (int(6 * scale), int(16 * scale))], fill="#1E293B")
    d.polygon([(0, 0), (int(8 * scale), int(3 * scale)), (int(3 * scale), int(8 * scale))], fill=color)
    d.polygon([(int(16 * scale), int(6 * scale)), (int(6 * scale), int(16 * scale)), (int(28 * scale), int(38 * scale)), (int(38 * scale), int(28 * scale))], fill="#475569")
    d.polygon([(int(38 * scale), int(28 * scale)), (int(28 * scale), int(38 * scale)), (int(115 * scale), int(125 * scale)), (int(125 * scale), int(115 * scale))], fill="#F8FAFC", outline="#CBD5E1", width=1)
    d.polygon([(int(95 * scale), int(105 * scale)), (int(105 * scale), int(95 * scale)), (int(125 * scale), int(115 * scale)), (int(115 * scale), int(125 * scale))], fill=color)
    return marker


def create_step_frame(question_data, active_step_idx=0, font_size=60, progress=1.0, cube_intro_t=None):
    step_scale = font_size / 60.0
    FS_HEADER = max(26, round(34 * step_scale))
    FS_TAG = max(24, round(30 * step_scale))
    FS_QTEXT = max(30, round(40 * step_scale))
    FS_ANSWER = 36   # Badge tantangan interaktif
    FS_DIALOG = max(28, round(34 * step_scale))
    FS_STEPBADGE = 30
    FS_STEPTITLE = 60  # Judul langkah pembahasan handwriting diperbesar: 60px
    FS_DETAIL = 60     # Isi teks pembahasan handwriting diperbesar: 60px
    FS_CONCL = max(28, round(36 * step_scale))

    img = Image.new("RGB", (WIDTH, HEIGHT), "#070B19")
    draw = ImageDraw.Draw(img)

    draw_colorful_background(draw, WIDTH, HEIGHT)

    # Top Header
    draw_rounded_rect(draw, (40, 45, 470, 130), radius=22, fill="#121829", outline="#3B82F6", width=2)
    draw.text((65, 68), f"♫ {question_data.get('account', '@pairzal')}", font=get_font(FS_HEADER, bold=True), fill="#FFFFFF")

    draw_rounded_rect(draw, (495, 45, WIDTH - 40, 130), radius=22, fill="#121829", outline="#3B82F6", width=2)
    draw.text((520, 68), "★ Latihan Soal Persiapan TKA SMA", font=get_font(FS_HEADER, bold=True), fill="#FFFFFF")

    # Card Ringkasan Soal Lengkap
    card_top = 145
    card_bottom = 450
    draw_rounded_rect(draw, (40, card_top, WIDTH - 40, card_bottom), radius=22, fill="#111827", outline="#4F46E5", width=2)

    submateri = question_data.get('submateri') or question_data.get('subtopic') or question_data.get('elemen', 'Bilangan')
    soal_num = question_data.get('nomor') or question_data.get('id', 1)
    tag_soal = f"SOAL #{soal_num} | {submateri.upper()}"
    draw.text((65, card_top + 16), tag_soal, font=get_font(FS_TAG, bold=True), fill="#9CA3AF")

    q_text = question_data.get('soal') or question_data.get('pertanyaan') or question_data.get('question', '')
    clean_q = latex_to_clean_text(q_text)

    img_src = question_data.get('image_path') or question_data.get('image') or question_data.get('gambar')
    thumb_img = load_and_fit_image(img_src, max_w=200, max_h=130, soal_id=soal_num) if (img_src or soal_num) else None

    text_max_w = (WIDTH - 360) if thumb_img else (WIDTH - 150)
    
    # Skala font otomatis agar teks soal lengkap tanpa terpotong
    q_fs = FS_QTEXT
    q_font = get_font(q_fs, bold=True)
    q_lines = wrap_text(clean_q, q_font, text_max_w)
    max_q_lines = 4 if thumb_img else 5
    while len(q_lines) > max_q_lines and q_fs > 26:
        q_fs -= 2
        q_font = get_font(q_fs, bold=True)
        q_lines = wrap_text(clean_q, q_font, text_max_w)

    q_line_h = round(q_fs * 1.25)
    y_q = card_top + 52
    for line in q_lines:
        draw_math_line(img, draw, (65, y_q), line, q_font, q_fs, fill="#FFFFFF", max_width=text_max_w)
        y_q += q_line_h

    if thumb_img:
        img.paste(thumb_img, (WIDTH - 40 - thumb_img.width - 20, card_top + 18), thumb_img)

    ans_text = "★ TANTANGAN: Tulis Pilihan Jawabanmu di Komentar!"
    draw_rounded_rect(draw, (65, card_bottom - 72, WIDTH - 65, card_bottom - 12), radius=16, fill="#1F2937", outline="#F59E0B", width=1)
    draw_math_line(img, draw, (85, card_bottom - 62), ans_text, get_font(FS_ANSWER, bold=True), FS_ANSWER, fill="#FBBF24", max_width=WIDTH - 190)

    # Dialogue / Interaktif Guru
    dlg_top, dlg_bottom = 465, 540
    draw_rounded_rect(draw, (40, dlg_top, WIDTH - 40, dlg_bottom), radius=18, fill="#111827", outline="#374151", width=2)
    draw.text((65, dlg_top + 20), "PANDUAN GURU: Mari kita bedah pembahasannya di papan tulis:", font=get_font(FS_DIALOG, bold=True), fill="#93C5FD")

    # ==========================================================
    # KANVAS PAPAN TULIS PUTIH (WHITEBOARD & HANDWRITING AREA)
    # ==========================================================
    wb_top = 550
    wb_bottom = 1740
    
    # 1. Bingkai Papan Tulis Aluminium / Kayu
    draw_rounded_rect(draw, (35, wb_top, WIDTH - 35, wb_bottom), radius=28, fill="#E2E8F0", outline="#94A3B8", width=4)
    # 2. Permukaan Whiteboard Putih Bersih
    draw_rounded_rect(draw, (45, wb_top + 10, WIDTH - 45, wb_bottom - 10), radius=22, fill="#FFFFFF", outline="#CBD5E1", width=1)

    # 3. Magnet Pin Dekoratif di Sudut Papan Tulis
    # Magnet Kiri (Merah 3D)
    draw.ellipse((68, wb_top + 16, 96, wb_top + 44), fill="#DC2626", outline="#991B1B", width=2)
    draw.ellipse((74, wb_top + 20, 84, wb_top + 30), fill="#FCA5A5")
    # Magnet Kanan (Biru 3D)
    draw.ellipse((WIDTH - 96, wb_top + 16, WIDTH - 68, wb_top + 44), fill="#2563EB", outline="#1E40AF", width=2)
    draw.ellipse((WIDTH - 90, wb_top + 20, WIDTH - 80, wb_top + 30), fill="#93C5FD")

    # 4. Header Label Whiteboard
    hdr_label = "PAPAN PEMBAHASAN & CORAT-CORET"
    hdr_font = get_handwriting_font(30, bold=True)
    draw_rounded_rect(draw, ((WIDTH - 540) // 2, wb_top + 14, (WIDTH + 540) // 2, wb_top + 60), radius=14, fill="#F1F5F9", outline="#CBD5E1", width=1)
    draw.text(((WIDTH - 500) // 2, wb_top + 20), hdr_label, font=hdr_font, fill="#1E3A8A")

    steps = build_steps_if_needed(question_data)
    step_y_coords = [
        (wb_top + 68, wb_top + 435),      # Step 1: 618 to 985 (height 367px)
        (wb_top + 448, wb_top + 815),     # Step 2: 998 to 1365 (height 367px)
        (wb_top + 828, wb_top + 1175)     # Step 3: 1378 to 1725 (height 347px)
    ]

    accent_colors = ["#2563EB", "#7C3AED", "#EA580C"]
    active_marker_pos = None
    active_marker_color = "#2563EB"

    for idx, step in enumerate(steps):
        if idx >= len(step_y_coords):
            break
        sy_start, sy_end = step_y_coords[idx]
        if idx > active_step_idx:
            # Langkah yang belum aktif: Tampilan samar abu-abu di whiteboard
            draw_rounded_rect(draw, (60, sy_start, WIDTH - 60, sy_end), radius=16,
                              fill="#F8FAFC", outline="#E2E8F0", width=1)
            draw.text((90, sy_start + (sy_end - sy_start) // 2 - 16),
                       f"Langkah {idx + 1} sedang dipersiapkan...", font=get_handwriting_font(FS_STEPTITLE, bold=True), fill="#94A3B8")
            continue

        is_active = (idx == active_step_idx)
        card_fill = "#FFFFFF" if is_active else "#F8FAFC"
        border_col = "#3B82F6" if is_active else "#E2E8F0"
        border_w = 2 if is_active else 1

        # Kotak catatan langkah di whiteboard
        draw_rounded_rect(draw, (60, sy_start, WIDTH - 60, sy_end), radius=16,
                          fill=card_fill, outline=border_col, width=border_w)

        # Garis aksen spidol vertikal di sisi kiri
        accent_col = accent_colors[idx % len(accent_colors)]
        draw.rounded_rectangle((60, sy_start, 70, sy_end), radius=4, fill=accent_col)

        # Badge Langkah (Spidol Marker Badge)
        draw_rounded_rect(draw, (75, sy_start + 14, 240, sy_start + 56), radius=12, fill="#EFF6FF", outline="#93C5FD", width=1)
        draw.text((88, sy_start + 19), f"LANGKAH {idx + 1}", font=get_handwriting_font(FS_STEPBADGE, bold=True), fill="#1E40AF")

        # Animasi kotak/kubus berputar sambil jatuh, khusus intro Langkah 1
        # (sebelum guru mulai menulis di papan tulis)
        if idx == 0 and is_active and cube_intro_t is not None and cube_intro_t < 1.0:
            draw_falling_rotating_box(
                img, cube_intro_t,
                center_x=157, target_y=sy_start + 35,
                size=64, spins=2.5
            )

        step_title = step.get('title', '')
        clean_title = latex_to_clean_text(step_title)
        title_font = get_handwriting_font(FS_STEPTITLE, bold=True)
        title_lines = wrap_text(clean_title, title_font, WIDTH - 255 - 65)
        title_line_h = round(FS_STEPTITLE * 1.15)
        y_title = sy_start + 15
        for t_line in title_lines[:2]:
            draw.text((255, y_title), t_line, font=title_font, fill="#1E3A8A")
            y_title += title_line_h

        cur_detail_y = y_title + 6
        avail_step_h = sy_end - cur_detail_y - 6
        
        # Hitung seluruh baris detail terlebih dahulu
        raw_detail_lines = []
        for line in step.get('details', []):
            cl = latex_to_clean_text(line)
            is_hl = cl.startswith("★") or "Hasil =" in cl or "BENAR" in cl or "SALAH" in cl or "Total =" in cl or "Kunci =" in cl
            cl = cl.replace('★', '').replace('•', '• ').strip()
            cl = re.sub(r'^[■□▪▫▶►*]\s*', '', cl)
            raw_detail_lines.append((cl, is_hl))

        # Skala font detail otomatis jika isi langkah banyak/panjang (dimulai dari 60px)
        curr_detail_fs = FS_DETAIL
        line_detail_font = get_handwriting_font(curr_detail_fs, bold=False)
        line_detail_bold = get_handwriting_font(curr_detail_fs, bold=True)
        
        total_wrapped_count = sum(len(wrap_text(cl, line_detail_bold if is_hl else line_detail_font, WIDTH - 150)) for cl, is_hl in raw_detail_lines)
        while total_wrapped_count * round(curr_detail_fs * 1.18) > avail_step_h and curr_detail_fs > 36:
            curr_detail_fs -= 2
            line_detail_font = get_handwriting_font(curr_detail_fs, bold=False)
            line_detail_bold = get_handwriting_font(curr_detail_fs, bold=True)
            total_wrapped_count = sum(len(wrap_text(cl, line_detail_bold if is_hl else line_detail_font, WIDTH - 150)) for cl, is_hl in raw_detail_lines)

        detail_spacing = round(curr_detail_fs * 1.18)

        # Siapkan daftar elemen yang akan ditulis
        all_wrapped_items = []
        for cl, is_hl in raw_detail_lines:
            f_to_use = line_detail_bold if is_hl else line_detail_font
            ink_color = "#DC2626" if is_hl else "#0F172A"
            w_lines = wrap_text(cl, f_to_use, WIDTH - 150)
            for wl in w_lines:
                all_wrapped_items.append((wl, f_to_use, curr_detail_fs, ink_color))

        total_chars_step = sum(len(wl) for wl, _, _, _ in all_wrapped_items)
        if total_chars_step == 0:
            total_chars_step = 1

        # Tentukan batas karakter berdasarkan nilai progress
        if not is_active:
            chars_to_draw = total_chars_step
        else:
            p = max(0.0, min(1.0, progress))
            chars_to_draw = int(p * total_chars_step)

        chars_drawn_so_far = 0
        for wl, f_to_use, fs_val, ink_color in all_wrapped_items:
            if cur_detail_y + detail_spacing > sy_end - 4:
                break
            line_len = len(wl)
            if not is_active:
                draw_math_line(img, draw, (80, cur_detail_y), wl, f_to_use, fs_val, fill=ink_color, max_width=WIDTH - 160)
            else:
                if chars_drawn_so_far + line_len <= chars_to_draw:
                    # Baris selesai ditulis utuh
                    draw_math_line(img, draw, (80, cur_detail_y), wl, f_to_use, fs_val, fill=ink_color, max_width=WIDTH - 160)
                    chars_drawn_so_far += line_len
                    # Posisi spidol di ujung baris
                    try:
                        bb = f_to_use.getbbox(wl)
                        line_w = bb[2] - bb[0]
                    except Exception:
                        line_w = len(wl) * (fs_val * 0.5)
                    active_marker_pos = (80 + min(line_w, WIDTH - 170), cur_detail_y + int(fs_val * 0.7))
                    active_marker_color = ink_color
                elif chars_drawn_so_far < chars_to_draw:
                    # Baris sedang ditulis sebagian
                    num_sub = chars_to_draw - chars_drawn_so_far
                    sub_text = wl[:num_sub]
                    draw_math_line(img, draw, (80, cur_detail_y), sub_text, f_to_use, fs_val, fill=ink_color, max_width=WIDTH - 160)
                    try:
                        bb = f_to_use.getbbox(sub_text)
                        sub_w = bb[2] - bb[0]
                    except Exception:
                        sub_w = len(sub_text) * (fs_val * 0.5)
                    active_marker_pos = (80 + min(sub_w, WIDTH - 170), cur_detail_y + int(fs_val * 0.7))
                    active_marker_color = ink_color
                    chars_drawn_so_far = chars_to_draw
                    break
                else:
                    # Baris belum ditulis
                    if active_marker_pos is None and is_active:
                        active_marker_pos = (80, cur_detail_y + int(fs_val * 0.7))
                        active_marker_color = ink_color
                    break
            cur_detail_y += detail_spacing + 2

    # Gambar spidol whiteboard jika sedang dalam mode animasi bergerak (progress < 1.0)
    if progress < 1.0 and active_marker_pos is not None:
        marker_icon = get_marker_icon(active_marker_color, scale=0.7)
        mx, my = active_marker_pos
        # Pastikan tidak melewati batas layar
        mx = min(WIDTH - 120, max(60, int(mx)))
        my = min(wb_bottom - 120, max(wb_top + 50, int(my)))
        img.paste(marker_icon, (mx, my), marker_icon)

    # Bagian bawah: Ajakan interaksi / komentar
    if active_step_idx >= len(steps) - 1:
        draw_rounded_rect(draw, (40, 1750, WIDTH - 40, 1890), radius=18, fill="#111827", outline="#F59E0B", width=2)
        draw.text((75, 1766), "💬 TANTANGAN MENJAWAB:", font=get_font(FS_TAG, bold=True), fill="#FBBF24")
        concl_font = get_font(FS_CONCL, bold=True)
        concl_text = "Yuk, tuliskan pilihan jawaban yang tepat di kolom komentar!"
        concl_line_h = round(FS_CONCL * 1.25)
        c_lines = wrap_text(concl_text, concl_font, WIDTH - 140)
        y_c = 1802
        for cl in c_lines[:2]:
            draw_math_line(img, draw, (75, y_c), cl, concl_font, FS_CONCL, fill="#FFFFFF", max_width=WIDTH - 150)
            y_c += concl_line_h

    draw_footer_watermark(draw, y_pos=1905)
    return img


def generate_qr_card(url="https://www.math315.id", card_w=380, card_h=380):
    import qrcode
    qr = qrcode.QRCode(box_size=7, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0F172A", back_color="#FFFFFF").convert("RGBA")
    qr_img = qr_img.resize((card_w - 40, card_w - 40), Image.Resampling.LANCZOS)

    card = Image.new("RGBA", (card_w, card_h), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(card)
    cdraw.rounded_rectangle((0, 0, card_w, card_h), radius=28, fill="#FFFFFF", outline="#38BDF8", width=4)

    qr_x = (card_w - (card_w - 40)) // 2
    qr_y = (card_h - (card_w - 40)) // 2
    card.paste(qr_img, (qr_x, qr_y), qr_img)
    return card


def create_intro_frame(judul, jumlah_soal):
    img = Image.new("RGB", (WIDTH, HEIGHT), "#0A2540")
    draw = ImageDraw.Draw(img)
    draw_colorful_background(draw, WIDTH, HEIGHT)

    # Decorative header tag
    tag_font = get_font(34, bold=True)
    tag_text = "✨ PERSIAPAN UJIAN TKA 2026 ✨"
    tb = tag_font.getbbox(tag_text)
    tw = tb[2] - tb[0]
    draw_rounded_rect(draw, ((WIDTH - tw) / 2 - 30, 420, (WIDTH + tw) / 2 + 30, 490), radius=25, fill="#1E293B", outline="#38BDF8", width=2)
    draw.text(((WIDTH - tw) / 2, 437), tag_text, font=tag_font, fill="#38BDF8")

    # Main Title (Center aligned card)
    title_font = get_font(58, bold=True)
    lines = wrap_text(judul, title_font, WIDTH - 160)
    
    # Calculate title height
    title_h = len(lines) * 80
    box_top = 530
    box_bottom = box_top + title_h + 180
    draw_rounded_rect(draw, (70, box_top, WIDTH - 70, box_bottom), radius=35, fill="#111827", outline="#4F46E5", width=3)

    y = box_top + 45
    for line in lines:
        bbox = title_font.getbbox(line)
        w = bbox[2] - bbox[0]
        draw.text(((WIDTH - w) / 2, y), line, font=title_font, fill="#FFFFFF")
        y += 80

    # Badge Jumlah Soal
    draw_rounded_rect(draw, ((WIDTH - 380) / 2, box_bottom - 95, (WIDTH + 380) / 2, box_bottom - 25), radius=20, fill="#2563EB", outline="#60A5FA", width=2)
    draw.text(((WIDTH - 340) / 2, box_bottom - 80), f"⚡ MEMBAHAS {jumlah_soal} SOAL LATIHAN", font=get_font(28, bold=True), fill="#FFFFFF")

    # Bottom Call To Action Card
    draw_rounded_rect(draw, (70, 1420, WIDTH - 70, 1780), radius=30, fill="#1E293B", outline="#F59E0B", width=2)
    cta_badge_font = get_font(32, bold=True)
    draw.text((105, 1450), "📌 TIPS BELAJAR EFEKTIF:", font=cta_badge_font, fill="#FBBF24")
    
    tips = [
        "1. Pause video untuk mencoba mengerjakan sendiri.",
        "2. Perhatikan langkah eliminasi & konsep inti.",
        "3. Tulis jawaban dan diskusikan di kolom komentar!"
    ]
    tips_font = get_font(30, bold=False)
    y_tip = 1515
    for tip in tips:
        draw.text((105, y_tip), tip, font=tips_font, fill="#E2E8F0")
        y_tip += 65

    draw_footer_watermark(draw, y_pos=1860)
    return img


def create_outro_frame():
    img = Image.new("RGB", (WIDTH, HEIGHT), "#0A2540")
    draw = ImageDraw.Draw(img)
    draw_colorful_background(draw, WIDTH, HEIGHT)

    # Decorative header tag
    tag_font = get_font(34, bold=True)
    tag_text = "✨ PEMBAHASAN SELESAI ✨"
    tb = tag_font.getbbox(tag_text)
    tw = tb[2] - tb[0]
    draw_rounded_rect(draw, ((WIDTH - tw) / 2 - 30, 260, (WIDTH + tw) / 2 + 30, 330), radius=25, fill="#1E293B", outline="#38BDF8", width=2)
    draw.text(((WIDTH - tw) / 2, 277), tag_text, font=tag_font, fill="#38BDF8")

    # Main Card
    draw_rounded_rect(draw, (70, 370, WIDTH - 70, 880), radius=35, fill="#111827", outline="#10B981", width=3)
    
    t1 = "Terima Kasih Telah Belajar!"
    f1 = get_font(52, bold=True)
    b1 = f1.getbbox(t1)
    draw.text(((WIDTH - (b1[2]-b1[0])) / 2, 430), t1, font=f1, fill="#FFFFFF")

    t2 = "Semoga Sukses Ujian TKA 2026 🎓"
    f2 = get_font(38, bold=True)
    b2 = f2.getbbox(t2)
    draw.text(((WIDTH - (b2[2]-b2[0])) / 2, 510), t2, font=f2, fill="#34D399")

    # Interactive Checklist Card
    draw_rounded_rect(draw, (110, 590, WIDTH - 110, 830), radius=20, fill="#1E293B", outline="#374151", width=1)
    actions = [
        "❤️  Like & Simpan video ini untuk belajar lagi",
        "💬  Berapa soal yang berhasil kamu tebak benar?",
        "🚀  Follow @pairzal untuk update video berikutnya"
    ]
    f_act = get_font(30, bold=True)
    y_act = 620
    for act in actions:
        draw.text((140, y_act), act, font=f_act, fill="#F3F4F6")
        y_act += 70

    # QR Code Section
    qr_card = generate_qr_card("https://www.math315.id", card_w=380, card_h=380)
    img.paste(qr_card, ((WIDTH - 380) // 2, 930), qr_card)

    draw_rounded_rect(draw, ((WIDTH - 460) // 2, 1340, (WIDTH + 460) // 2, 1410), radius=20, fill="#1E293B", outline="#38BDF8", width=2)
    draw.text(((WIDTH - 420) // 2, 1358), "🌐 Kunjungi: www.math315.id", font=get_font(32, bold=True), fill="#38BDF8")

    draw_rounded_rect(draw, (70, 1440, WIDTH - 70, 1820), radius=30, fill="#111827", outline="#4F46E5", width=2)
    draw.text((110, 1470), "✨ MEDIA SOSIAL & KOMUNITAS:", font=get_font(32, bold=True), fill="#FBBF24")
    
    socials = [
        "📸 Instagram : @pairzal",
        "🎵 TikTok    : @pairzal",
        "▶️ YouTube   : Math315 Edukasi",
        "🌐 Web       : https://www.math315.id"
    ]
    f_soc = get_font(30, bold=False)
    y_soc = 1530
    for soc in socials:
        draw.text((110, y_soc), soc, font=f_soc, fill="#E2E8F0")
        y_soc += 65

    draw_footer_watermark(draw, y_pos=1860)
    return img


VOICE_PA_IRZAL = "id-ID-ArdiNeural"       # Suara Laki-Laki Dewasa / Guru (Pak Irzal)
VOICE_MURID_ANI = "id-ID-GadisNeural"     # Suara Perempuan Remaja (Murid Ani)


import time

async def generate_voice_edge(text, output_file, speaker="guru"):
    is_female = speaker in ["ani", "murid", "budi", "perempuan", "remaja", True]
    voice = VOICE_MURID_ANI if is_female else VOICE_PA_IRZAL
    pitch = "+6Hz" if is_female else "+0Hz"
    rate = "+8%" if is_female else "+4%"
    communicate = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate)
    await communicate.save(output_file)


def generate_voice(text, output_file, speaker="guru", is_budi=None):
    if not text or not text.strip():
        # Buat 0.5 detik audio hening
        subprocess.run(f"ffmpeg -y -f lavfi -i anullsrc=r={SAMPLE_RATE}:cl=stereo -t 0.5 -q:a 9 -acodec libmp3lame {output_file}", shell=True, check=True)
        return

    if is_budi is not None:
        speaker = "ani" if is_budi else "guru"

    # Coba Edge TTS via Python API dengan retry hingga 5 kali
    for attempt in range(1, 6):
        try:
            asyncio.run(generate_voice_edge(text, output_file, speaker=speaker))
            if os.path.exists(output_file) and os.path.getsize(output_file) > 100:
                return
        except Exception as e:
            print(f"  [TTS Retry {attempt}/5] Edge TTS error: {e}")
            time.sleep(1.5 * attempt)

    # Coba fallback ke CLI Edge-TTS
    is_female = speaker in ["ani", "murid", "budi", "perempuan", "remaja", True]
    voice = VOICE_MURID_ANI if is_female else VOICE_PA_IRZAL
    pitch = "+6Hz" if is_female else "+0Hz"
    rate = "+8%" if is_female else "+4%"
    for attempt in range(1, 4):
        try:
            cmd = ["edge-tts", "--voice", voice, "--text", text, "--write-media", output_file, f"--pitch={pitch}", f"--rate={rate}"]
            subprocess.run(cmd, check=True)
            if os.path.exists(output_file) and os.path.getsize(output_file) > 100:
                return
        except Exception as e:
            print(f"  [TTS CLI Retry {attempt}/3] Edge-TTS CLI error: {e}")
            time.sleep(2 * attempt)

    # Fallback terakhir jika semua koneksi luar gagal: gTTS atau audio hening
    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang="id", slow=False)
        tts.save(output_file)
        if os.path.exists(output_file) and os.path.getsize(output_file) > 100:
            return
    except Exception as e:
        print(f"  [TTS Final Fallback] gTTS error: {e}, generating silent placeholder audio.")
        subprocess.run(f"ffmpeg -y -f lavfi -i anullsrc=r={SAMPLE_RATE}:cl=stereo -t 2.0 -q:a 9 -acodec libmp3lame {output_file}", shell=True, check=True)


def get_audio_duration(path):
    cmd = f"ffprobe -i {path} -show_entries format=duration -v quiet -of csv=\"p=0\""
    out = subprocess.check_output(cmd, shell=True).decode().strip()
    return float(out)


def create_ambient_bgm(duration_sec, output_file, custom_bgm=None):
    # Menggunakan musik latar bebas hak cipta (Royalty-free / Public Domain Canon in D)
    default_bgm = "/root/bgm_canon_in_d.mp3"
    bgm_to_use = custom_bgm if (custom_bgm and os.path.exists(custom_bgm)) else (default_bgm if os.path.exists(default_bgm) else None)
    if bgm_to_use and os.path.exists(bgm_to_use):
        print(f"  -> Menggunakan file lagu background bebas hak cipta: {bgm_to_use}")
        cmd = f"""ffmpeg -y -stream_loop -1 -i "{bgm_to_use}" -t {duration_sec} \
        -af "afade=t=in:st=0:d=1.5,afade=t=out:st={max(0, duration_sec-3)}:d=3" \
        -c:a libmp3lame -ar {SAMPLE_RATE} -b:a 192k {output_file}"""
        subprocess.run(cmd, shell=True, check=True)
        return

    cmd = f"""ffmpeg -y \
    -f lavfi -i "sine=frequency=261.63:duration={duration_sec}" \
    -f lavfi -i "sine=frequency=329.63:duration={duration_sec}" \
    -f lavfi -i "sine=frequency=392.00:duration={duration_sec}" \
    -f lavfi -i "sine=frequency=493.88:duration={duration_sec}" \
    -f lavfi -i "sine=frequency=130.81:duration={duration_sec}" \
    -f lavfi -i "anoisesrc=d={duration_sec}:c=pink:r=44100:a=0.005" \
    -filter_complex "[0:a]volume=0.03[a0];[1:a]volume=0.025[a1];[2:a]volume=0.02[a2];[3:a]volume=0.015[a3];[4:a]volume=0.04[a4];[5:a]volume=0.012[a5];[a0][a1][a2][a3][a4][a5]amix=inputs=6:dropout_transition=0,afade=t=in:st=0:d=2,afade=t=out:st={max(0, duration_sec-3)}:d=3[out]" \
    -map "[out]" -c:a libmp3lame -ar {SAMPLE_RATE} -t {duration_sec} {output_file}"""
    subprocess.run(cmd, shell=True, check=True)


def render_step_handwriting_video(question_data, step_idx, audio_path, output_mp4, font_size=60, budi_duration=0.0):
    """Merender video langkah pembahasan dengan animasi coretan tulisan tangan (handwriting) spidol bergerak."""
    dur = get_audio_duration(audio_path)
    total_frames = max(1, int(round((dur + 0.3) * FPS)))
    write_start_time = budi_duration
    write_duration = max(1.0, dur - write_start_time)

    ffmpeg_proc = subprocess.Popen([
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-",
        "-i", audio_path,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-r", str(FPS),
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-ar", str(SAMPLE_RATE),
        "-ac", "2",
        "-b:a", "192k",
        "-t", f"{dur + 0.3:.2f}",
        output_mp4
    ], stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    for f_idx in range(total_frames):
        current_time = f_idx / FPS
        if current_time < write_start_time:
            p = 0.0
        else:
            p = (current_time - write_start_time) / write_duration
            p = max(0.0, min(1.0, p))

        # Khusus Langkah 1: animasikan kotak/kubus berputar & jatuh selama
        # fase dialog "Ani" bertanya, tepat sebelum guru mulai menulis.
        cube_t = None
        if step_idx == 0 and write_start_time > 0:
            cube_t = max(0.0, min(1.0, current_time / write_start_time))

        frame_img = create_step_frame(question_data, active_step_idx=step_idx, font_size=font_size,
                                       progress=p, cube_intro_t=cube_t)
        ffmpeg_proc.stdin.write(frame_img.tobytes())

    ffmpeg_proc.stdin.close()
    ffmpeg_proc.wait()


def make_animated_combined_video(data_soal_obj, output_mp4, bgm_path=None, bgm_volume=0.25, font_size=60):
    if isinstance(data_soal_obj, dict):
        judul = data_soal_obj.get('judul') or f"Latihan Soal {data_soal_obj.get('mataPelajaran', 'Matematika')} {data_soal_obj.get('tingkat', 'SMA')}"
        daftar_soal = data_soal_obj.get('soal', [])
    else:
        judul = "Latihan Soal Persiapan TKA Matematika SMA"
        daftar_soal = data_soal_obj

    import tempfile
    temp_dir = tempfile.mkdtemp(prefix="video_render_tka_")

    # Pastikan gambar ilustrasi diagram telah siap di /sdcard/download/
    ensure_diagram_images_exist()

    part_files = []

    print("1. Membuat Intro Video...")
    img_intro = create_intro_frame(judul, len(daftar_soal))
    intro_png = os.path.join(temp_dir, "intro.png")
    img_intro.save(intro_png)

    intro_audio = os.path.join(temp_dir, "intro_audio.mp3")
    intro_text = f"Halo sobat cerdas! Mari kita bahas {len(daftar_soal)} latihan soal persiapan TKA Matematika SMA bersama Pak Irzal."
    generate_voice(intro_text, intro_audio, speaker="guru")
    dur_intro = max(get_audio_duration(intro_audio), 2.5)

    intro_mp4 = os.path.join(temp_dir, "part_intro.mp4")
    subprocess.run(
        f"ffmpeg -y -loop 1 -i {intro_png} -i {intro_audio} "
        f"-c:v libx264 -preset ultrafast -r {FPS} -pix_fmt yuv420p -c:a aac -ar {SAMPLE_RATE} -ac 2 -b:a 192k -t {dur_intro + 0.5} {intro_mp4}",
        shell=True, check=True
    )
    part_files.append(intro_mp4)

    for idx, soal in enumerate(daftar_soal, start=1):
        print(f"\n[Soal {idx}/{len(daftar_soal)}] Memproses video interaktif & dialog pembahasan...")
        sdir = os.path.join(temp_dir, f"soal_{idx}")
        os.makedirs(sdir, exist_ok=True)

        q_raw = soal.get('soal') or soal.get('pertanyaan') or soal.get('question', '')
        spoken_q = text_to_spoken(q_raw)
        audio_q = os.path.join(sdir, "audio_q.mp3")
        narration_question = f"Soal nomor {idx}. {spoken_q}. Waktu kamu lima detik untuk menjawab!"
        generate_voice(narration_question, audio_q, speaker="guru")
        dur_q = get_audio_duration(audio_q)

        img_q = create_question_frame(soal, timer_val=5, font_size=font_size)
        img_q.save(os.path.join(sdir, "frame_q.png"))

        vid_q = os.path.join(sdir, "part_q.mp4")
        subprocess.run(
            f"ffmpeg -y -loop 1 -i {sdir}/frame_q.png -i {audio_q} "
            f"-c:v libx264 -preset ultrafast -r {FPS} -c:a aac -ar {SAMPLE_RATE} -ac 2 -b:a 192k -pix_fmt yuv420p -t {dur_q + 0.3} {vid_q}",
            shell=True, check=True
        )
        part_files.append(vid_q)

        for t in range(5, 0, -1):
            f = create_question_frame(soal, timer_val=t, font_size=font_size)
            f.save(os.path.join(sdir, f"timer_{t}.png"))

        countdown_concat = os.path.join(sdir, "countdown_list.txt")
        with open(countdown_concat, "w") as f:
            for t in range(5, 0, -1):
                f.write(f"file '{sdir}/timer_{t}.png'\nduration 1.0\n")
            f.write(f"file '{sdir}/timer_1.png'\n")
        vid_timer = os.path.join(sdir, "part_timer.mp4")
        subprocess.run(
            f"ffmpeg -y -f concat -safe 0 -i {countdown_concat} -f lavfi -i anullsrc=r={SAMPLE_RATE}:cl=stereo "
            f"-c:v libx264 -preset ultrafast -r {FPS} -pix_fmt yuv420p -c:a aac -ar {SAMPLE_RATE} -ac 2 -b:a 192k -t 5 {vid_timer}",
            shell=True, check=True
        )
        part_files.append(vid_timer)

        steps = build_steps_if_needed(soal)
        for step_idx, step in enumerate(steps):
            print(f"  -> Animasi Handwriting Bergerak Langkah {step_idx + 1}/{len(steps)}...")
            step_audio_path = os.path.join(sdir, f"audio_step_{step_idx + 1}.mp3")
            step_spoken = text_to_spoken(step.get('spoken', ''))
            vid_step = os.path.join(sdir, f"part_step_{step_idx + 1}.mp4")

            if step_idx == 0:
                ani_raw = os.path.join(sdir, "ani_raw.mp3")
                ani_text = "Pak Irzal, konsep apa yang digunakan untuk menyelesaikan soal ini?"
                generate_voice(ani_text, ani_raw, speaker="ani")
                dur_ani = get_audio_duration(ani_raw)

                guru_raw = os.path.join(sdir, "guru_step1.mp3")
                generate_voice(step_spoken, guru_raw, speaker="guru")

                cmd_dialog = (
                    f"ffmpeg -y -i {ani_raw} -i {guru_raw} -filter_complex "
                    f"\"[0:a]volume=0.90[a0];[1:a]volume=1.0[a1];[a0][a1]concat=n=2:v=0:a=1[out]\" "
                    f"-map \"[out]\" -c:a libmp3lame -ar {SAMPLE_RATE} -b:a 192k {step_audio_path}"
                )
                subprocess.run(cmd_dialog, shell=True, check=True)
                render_step_handwriting_video(soal, step_idx, step_audio_path, vid_step, font_size=font_size, budi_duration=dur_ani)
                part_files.append(vid_step)
            elif step_spoken:
                generate_voice(step_spoken, step_audio_path, speaker="guru")
                render_step_handwriting_video(soal, step_idx, step_audio_path, vid_step, font_size=font_size, budi_duration=0.0)
                part_files.append(vid_step)
            else:
                dur_step = 3.5
                step_img = create_step_frame(soal, active_step_idx=step_idx, font_size=font_size, progress=1.0)
                step_img_path = os.path.join(sdir, f"frame_step_{step_idx + 1}.png")
                step_img.save(step_img_path)
                subprocess.run(
                    f"ffmpeg -y -loop 1 -i {step_img_path} -f lavfi -i anullsrc=r={SAMPLE_RATE}:cl=stereo "
                    f"-c:v libx264 -preset ultrafast -r {FPS} -pix_fmt yuv420p -c:a aac -ar {SAMPLE_RATE} -ac 2 -b:a 192k -t {dur_step} {vid_step}",
                    shell=True, check=True
                )
                part_files.append(vid_step)

        buffer_vid = os.path.join(sdir, "part_buffer.mp4")
        last_frame_img = create_step_frame(soal, active_step_idx=len(steps) - 1, font_size=font_size, progress=1.0)
        last_frame = os.path.join(sdir, f"frame_step_{len(steps)}.png")
        last_frame_img.save(last_frame)
        subprocess.run(
            f"ffmpeg -y -loop 1 -i {last_frame} -f lavfi -i anullsrc=r={SAMPLE_RATE}:cl=stereo "
            f"-c:v libx264 -preset ultrafast -r {FPS} -pix_fmt yuv420p -c:a aac -ar {SAMPLE_RATE} -ac 2 -b:a 192k -t 0.6 {buffer_vid}",
            shell=True, check=True
        )
        part_files.append(buffer_vid)

    print("\n3. Membuat Outro Video...")
    img_outro = create_outro_frame()
    outro_png = os.path.join(temp_dir, "outro.png")
    img_outro.save(outro_png)

    outro_audio = os.path.join(temp_dir, "outro_audio.mp3")
    outro_text = "Selesai! Berapa soal yang berhasil kamu jawab dengan benar? Jangan lupa like, simpan, dan follow @pairzal ya!"
    generate_voice(outro_text, outro_audio, speaker="guru")
    dur_outro = max(get_audio_duration(outro_audio), 3.0)

    outro_mp4 = os.path.join(temp_dir, "part_outro.mp4")
    subprocess.run(
        f"ffmpeg -y -loop 1 -i {outro_png} -i {outro_audio} "
        f"-c:v libx264 -preset ultrafast -r {FPS} -pix_fmt yuv420p -c:a aac -ar {SAMPLE_RATE} -ac 2 -b:a 192k -t {dur_outro + 0.5} {outro_mp4}",
        shell=True, check=True
    )
    part_files.append(outro_mp4)

    print("\n4. Menggabungkan seluruh potongan video...")
    final_list = os.path.join(temp_dir, "final_list.txt")
    with open(final_list, "w") as f:
        for p in part_files:
            f.write(f"file '{p}'\n")

    temp_merged = os.path.join(temp_dir, "temp_merged_novg.mp4")
    subprocess.run(
        f"ffmpeg -y -f concat -safe 0 -i {final_list} -c:v libx264 -preset ultrafast -r {FPS} -c:a aac -ar {SAMPLE_RATE} -ac 2 -b:a 192k -pix_fmt yuv420p {temp_merged}",
        shell=True, check=True
    )

    print(f"\n5. Menambahkan background musik pembelajaran sepanjang video (volume {bgm_volume})...")
    total_dur = get_audio_duration(temp_merged)
    bgm_file = os.path.join(temp_dir, "ambient_bgm.mp3")
    create_ambient_bgm(int(total_dur) + 5, bgm_file, custom_bgm=bgm_path)

    subprocess.run(
        f"ffmpeg -y -i {temp_merged} -i {bgm_file} -filter_complex "
        f"\"[0:a]volume=1.0[vocal];[1:a]volume={bgm_volume}[bgm];[vocal][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]\" "
        f"-map 0:v -map \"[aout]\" -c:v copy -c:a aac -ar {SAMPLE_RATE} -b:a 192k {output_mp4}",
        shell=True, check=True
    )
    print(f"\n🎉 Selesai! Video animasi interaktif {len(daftar_soal)} soal Latihan Soal Persiapan TKA Matematika SMA berhasil dibuat: {output_mp4}")

# ============================================================
# DATA SOAL LATIHAN TKA MATEMATIKA SMA KELAS 12 (PAKET 1)
# ============================================================
data_soal = [
  {
    "id": 1,
    "level": "SMA - Standar",
    "tipe": "pilihan_ganda",
    "elemen": "Aljabar",
    "soal": "Tentukan himpunan penyelesaian dari persamaan x^(x-1) = x^(1-x), untuk x real dan x > 0",
    "pilihan": {
      "A": "x = 0",
      "B": "x = 1",
      "C": "x = -1",
      "D": "x = 1 dan x = -1",
      "E": "Tidak ada solusi"
    },
    "jawaban_benar": "B",
    "pembahasan": "Karena (1-x) = -(x-1), maka x^(1-x) = 1/x^(x-1). Persamaan menjadi [x^(x-1)]^2 = 1, sehingga x^(x-1) = 1. Ambil ln kedua ruas: (x-1) ln(x) = 0, sehingga x = 1. Untuk domain x > 0, x = 0 tidak valid karena menghasilkan pembagian dengan nol."
  },
  {
    "id": 2,
    "level": "SMA - Perluasan Domain",
    "tipe": "pilihan_ganda",
    "elemen": "Aljabar",
    "soal": "Tentukan himpunan penyelesaian dari persamaan x^(x-1) = x^(1-x), jika domain diperluas mencakup bilangan bulat negatif (pangkat harus bulat)",
    "pilihan": {
      "A": "x = 1 saja",
      "B": "x = -1 saja",
      "C": "x = 1 atau x = -1",
      "D": "x = 1, x = -1, atau x = -2",
      "E": "Tidak ada solusi tambahan"
    },
    "jawaban_benar": "C",
    "pembahasan": "Untuk x > 0, solusi x = 1 berlaku seperti biasa. Untuk x negatif, pangkat (x-1) dan (1-x) harus bulat agar terdefinisi. Cek x = -1: pangkatnya -2 dan 2, sehingga (-1)^(-2) = 1 dan (-1)^2 = 1 → sama, jadi valid. Cek x = -2: (-2)^(-3) = -1/8 sedangkan (-2)^3 = -8 → tidak sama, jadi tidak valid. Jadi solusi tambahan hanya x = -1."
  },
  {
    "id": 3,
    "level": "SMA - Konseptual",
    "tipe": "pilihan_ganda",
    "elemen": "Bilangan",
    "soal": "Apa yang menyebabkan x = 0 TIDAK menjadi solusi dari x^(x-1) = x^(1-x)?",
    "pilihan": {
      "A": "0 pangkat positif tidak terdefinisi",
      "B": "0^(-1) berarti pembagian dengan nol, sehingga tidak terdefinisi",
      "C": "0 bukan bilangan real",
      "D": "Persamaan tidak berlaku untuk bilangan genap",
      "E": "0 selalu menghasilkan hasil negatif"
    },
    "jawaban_benar": "B",
    "pembahasan": "Substitusi x = 0 membuat pangkat pada ruas kiri menjadi (0-1) = -1, sehingga 0^(-1) = 1/0, yang tidak terdefinisi karena pembagian dengan nol. Oleh karena itu x = 0 harus dikeluarkan dari domain, bukan dianggap solusi."
  },
  {
    "id": 4,
    "level": "SMA - Konseptual",
    "tipe": "pilihan_ganda",
    "elemen": "Bilangan",
    "soal": "Berapa nilai dari 0^0 menurut konvensi matematika yang paling umum digunakan dalam aljabar dasar?",
    "pilihan": {
      "A": "0",
      "B": "1, tanpa pengecualian",
      "C": "Tidak terdefinisi / bentuk indeterminate",
      "D": "Tak hingga",
      "E": "-1"
    },
    "jawaban_benar": "C",
    "pembahasan": "0^0 adalah bentuk indeterminate dalam kalkulus dan aljabar umum karena limitnya bisa berbeda-beda tergantung pendekatan fungsinya. Namun dalam beberapa konteks seperti kombinatorik atau teori himpunan, 0^0 sering didefinisikan sebagai 1 demi kepraktisan (misalnya dalam rumus binomial)."
  },
  {
    "id": 5,
    "level": "SMA - Dasar",
    "tipe": "pilihan_ganda",
    "elemen": "Aljabar",
    "soal": "Jika x^(x-1) = x^(1-x) dengan x bilangan real positif, maka nilai x yang memenuhi adalah...",
    "pilihan": {
      "A": "x = 2",
      "B": "x = 1",
      "C": "x = 1/2",
      "D": "x = 0",
      "E": "x = 10"
    },
    "jawaban_benar": "B",
    "pembahasan": "Substitusi x = 1: ruas kiri = 1^0 = 1, ruas kanan = 1^0 = 1. Sama, jadi x = 1 memenuhi. Untuk nilai lain seperti x = 2: ruas kiri = 2^1 = 2, ruas kanan = 2^(-1) = 1/2, tidak sama."
  },
  {
    "id": 6,
    "level": "Kompetisi/Olimpiade",
    "tipe": "pilihan_ganda",
    "elemen": "Aljabar",
    "soal": "Banyaknya bilangan real x yang memenuhi persamaan x^(x-1) = x^(1-x), dengan mempertimbangkan seluruh domain yang mungkin (x > 0 dan x bilangan bulat negatif), adalah...",
    "pilihan": {
      "A": "0",
      "B": "1",
      "C": "2",
      "D": "3",
      "E": "Tak hingga"
    },
    "jawaban_benar": "C",
    "pembahasan": "Untuk x > 0: hanya x = 1 yang memenuhi (dari (x-1)ln x = 0). Untuk x bilangan bulat negatif: hanya x = -1 yang memenuhi karena pangkatnya genap-simetris [(-1)^(-2) = (-1)^2 = 1]. x = -2, -3, dst tidak memenuhi. Total: 2 solusi, yaitu x = 1 dan x = -1."
  },
  {
    "id": 7,
    "level": "SMA - Uraian/Essay",
    "tipe": "essay",
    "elemen": "Aljabar",
    "soal": "Tentukan semua nilai x real positif yang memenuhi persamaan x^(x-1) = x^(1-x). Tunjukkan langkah-langkah penyelesaiannya, dan jelaskan mengapa x = 0 tidak termasuk dalam domain persamaan ini.",
    "kunci_jawaban": "Langkah 1: Karena (1-x) = -(x-1), tulis ulang ruas kanan: x^(1-x) = x^(-(x-1)) = 1/x^(x-1).\n\nLangkah 2: Persamaan menjadi x^(x-1) = 1/x^(x-1), atau [x^(x-1)]^2 = 1.\n\nLangkah 3: Karena x > 0, maka x^(x-1) > 0, sehingga x^(x-1) = 1 (akar positif saja yang relevan).\n\nLangkah 4: Ambil ln kedua ruas: (x-1) ln(x) = 0. Ini terpenuhi jika x - 1 = 0 (yaitu x = 1) atau ln(x) = 0 (yaitu x = 1, hasil sama).\n\nJadi x = 1 adalah satu-satunya solusi untuk x > 0.\n\nAlasan x = 0 dikeluarkan: jika x = 0 disubstitusikan, pangkat pada ruas kiri menjadi (0-1) = -1, sehingga 0^(-1) = 1/0, yang tidak terdefinisi (pembagian dengan nol). Karena itu x = 0 bukan bagian dari domain persamaan, sehingga tidak bisa dianggap solusi."
  },
  {
    "id": 8,
    "level": "Kompetisi - Uraian",
    "tipe": "essay",
    "elemen": "Aljabar",
    "soal": "Diberikan persamaan x^(x-1) = x^(1-x). Selidiki apakah terdapat solusi selain x = 1 jika domain diperluas ke bilangan real negatif (dengan syarat pangkat harus bilangan bulat agar terdefinisi). Buktikan jawabanmu.",
    "kunci_jawaban": "Untuk x negatif, x^(x-1) hanya terdefinisi real jika (x-1) adalah bilangan bulat, yang berarti x sendiri harus bilangan bulat (karena x-1 bulat ⟺ x bulat).\n\nMisalkan x = -n dengan n bilangan asli. Maka:\n- Ruas kiri: (-n)^(-n-1)\n- Ruas kanan: (-n)^(n+1)\n\nUntuk n = 1 (x = -1): ruas kiri = (-1)^(-2) = 1/((-1)^2) = 1/1 = 1. Ruas kanan = (-1)^(2) = 1. Sama, jadi x = -1 memenuhi.\n\nUntuk n = 2 (x = -2): ruas kiri = (-2)^(-3) = 1/(-8) = -1/8. Ruas kanan = (-2)^(3) = -8. Tidak sama.\n\nUntuk n ≥ 2 secara umum, |(-n)^(-n-1)| = 1/n^(n+1) yang sangat kecil, sedangkan |(-n)^(n+1)| = n^(n+1) yang besar. Keduanya tidak akan pernah sama untuk n ≥ 2.\n\nKesimpulan: satu-satunya solusi tambahan di luar x = 1 adalah x = -1."
  }
]


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate Video Animasi Pembahasan Latihan TKA Matematika SMA")
    parser.add_argument("output", nargs="?", default="/sdcard/download/video_latihan_tka12_1.mp4", help="Path file video output mp4")
    parser.add_argument("--soal", default=None, help="Nomor/ID soal tertentu yang ingin digenerate (misal: 3 atau 1,2,3)")
    parser.add_argument("--bgm", default=None, help="Path ke file musik/lagu background mp3 (opsional)")
    parser.add_argument("--vol", type=float, default=0.25, help="Volume musik latar (default: 0.25)")
    parser.add_argument("--font-size", type=int, default=60, help="Ukuran font utama teks soal dalam px (default: 60)")
    args = parser.parse_args()

    out_dir = os.path.dirname(args.output)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    if args.soal is not None:
        target_ids = [s.strip() for s in str(args.soal).split(",") if s.strip()]
        soal_list = data_soal.get('soal', []) if isinstance(data_soal, dict) else data_soal
        filtered_soal = [s for s in soal_list if str(s.get('id', '')) in target_ids or str(s.get('nomor', '')) in target_ids]
        if filtered_soal:
            if isinstance(data_soal, dict):
                data_soal_to_use = dict(data_soal)
                data_soal_to_use['soal'] = filtered_soal
                data_soal_to_use['jumlahSoal'] = len(filtered_soal)
            else:
                data_soal_to_use = filtered_soal
            print(f"-> Memfilter {len(filtered_soal)} soal untuk ID: {', '.join(target_ids)}")
        else:
            print(f"Peringatan: Soal dengan ID '{args.soal}' tidak ditemukan, memproses seluruh soal.")
            data_soal_to_use = data_soal
    else:
        data_soal_to_use = data_soal

    make_animated_combined_video(
        data_soal_to_use,
        args.output,
        bgm_path=args.bgm,
        bgm_volume=args.vol,
        font_size=args.font_size
    )
