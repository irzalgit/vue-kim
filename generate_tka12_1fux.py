#!/usr/bin/env python3
import os
import sys
import re
import io
import random
import subprocess
import asyncio
from PIL import Image, ImageDraw, ImageFont
import numpy as np

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

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

def ensure_local_font():
    font_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")
    os.makedirs(font_dir, exist_ok=True)
    font_bold = os.path.join(font_dir, "arialbd.ttf")
    font_reg = os.path.join(font_dir, "arial.ttf")
    if not os.path.exists(font_bold) or os.path.getsize(font_bold) < 1000:
        import urllib.request
        urls = [
            ("https://raw.githubusercontent.com/matomo-org/travis-scripts/master/fonts/Arial_Bold.ttf", font_bold),
            ("https://raw.githubusercontent.com/matomo-org/travis-scripts/master/fonts/Arial.ttf", font_reg)
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


# ============================================================
# FONT TULISAN TANGAN (untuk gaya papan tulis / whiteboard)
# ============================================================
HANDWRITING_FONT_REGULAR_PATH = None
HANDWRITING_FONT_BOLD_PATH = None

def ensure_handwriting_font():
    """Unduh font tulisan tangan 'Kalam' dari Google Fonts (sekali saja)."""
    global HANDWRITING_FONT_REGULAR_PATH, HANDWRITING_FONT_BOLD_PATH
    font_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")
    os.makedirs(font_dir, exist_ok=True)

    reg_path = os.path.join(font_dir, "Kalam-Regular.ttf")
    bold_path = os.path.join(font_dir, "Kalam-Bold.ttf")

    import urllib.request
    downloads = [
        ("https://raw.githubusercontent.com/google/fonts/main/ofl/kalam/Kalam-Regular.ttf", reg_path),
        ("https://raw.githubusercontent.com/google/fonts/main/ofl/kalam/Kalam-Bold.ttf", bold_path),
    ]
    for url, dest in downloads:
        if not os.path.exists(dest) or os.path.getsize(dest) < 10000:
            try:
                urllib.request.urlretrieve(url, dest)
                print(f"  [✓ Font handwriting] {os.path.basename(dest)}")
            except Exception as e:
                print(f"  [!] Gagal unduh {os.path.basename(dest)}: {e}")

    if os.path.exists(reg_path) and os.path.getsize(reg_path) > 10000:
        HANDWRITING_FONT_REGULAR_PATH = reg_path
    if os.path.exists(bold_path) and os.path.getsize(bold_path) > 10000:
        HANDWRITING_FONT_BOLD_PATH = bold_path


ensure_handwriting_font()

_hw_font_cache = {}

def get_handwriting_font(size, bold=False):
    """Ambil font tulisan tangan. Fallback ke font biasa bila font gagal diunduh."""
    key = (size, bold)
    if key in _hw_font_cache:
        return _hw_font_cache[key]
    path = HANDWRITING_FONT_BOLD_PATH if bold else HANDWRITING_FONT_REGULAR_PATH
    if path and os.path.exists(path):
        try:
            f = ImageFont.truetype(path, size)
            _hw_font_cache[key] = f
            return f
        except Exception:
            pass
    f = get_font(size, bold=bold)
    _hw_font_cache[key] = f
    return f


def draw_rounded_rect(draw, bbox, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)


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
        print(f"Peringatan: gagal merender mathtext '{text[:40]}...': {e}")
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
    text = re.sub(r'\^\{?([0-9a-zA-Z]+)\}?', r'^\1', text)
    text = text.replace('$', '')
    text = text.replace(r'\_', '_')
    text = text.replace('{', '').replace('}', '')
    text = text.replace(r'\ ', ' ')
    text = text.replace('\\', '')
    return text.strip()


def text_to_spoken(text):
    """
    Mengubah teks matematika menjadi ucapan guru matematika yang natural.
    Aturan:
    - "2x" -> "dua kali x" (bukan "dua x")
    - ":" -> "adalah" (definisi), "banding" (rasio angka:angka)
    - "<" -> "lebih kecil dari", ">" -> "lebih besar dari"
    - "=" -> "sama dengan"
    - Tambah jeda sedikit di awal pengucapan
    """
    if not text:
        return ""
    text = latex_to_clean_text(text)

    # === JEDA AWAL ===
    text = ", " + text

    # === PENANGANAN SIMBOL KHUSUS ===
    text = text.replace('<', ' lebih kecil dari ')
    text = text.replace('>', ' lebih besar dari ')
    text = text.replace('≤', ' kurang dari sama dengan ')
    text = text.replace('≥', ' lebih dari sama dengan ')
    text = text.replace('≠', ' tidak sama dengan ')
    text = text.replace('=', ' sama dengan ')
    text = re.sub(r'(\d+)\s*:\s*(\d+)', r'\1 banding \2', text)
    text = text.replace(':', ' adalah ')
    # "2x" -> "dua kali x"
    text = re.sub(r'(\d+)\s*([a-zA-Z])', r'\1 kali \2', text)
    text = text.replace(' x ', ' kali ')

    # === SIMBOL MATEMATIKA LAINNYA ===
    text = text.replace('×', ' kali ')
    text = text.replace('·', ' kali ')
    text = text.replace('√', 'akar ')
    text = text.replace('±', ' plus minus ')
    text = text.replace('≈', ' mendekati ')
    text = text.replace('π', ' pi ')
    text = text.replace('°', ' derajat ')
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
    text = text.replace('→', ' mendekati ')
    text = text.replace('lim', 'limit ')
    text = text.replace('sin ', 'sinus ')
    text = text.replace('cos ', 'kosinus ')
    text = text.replace('tan ', 'tangen ')
    text = text.replace('/', ' per ')

    # === KONTEKS INDONESIA ===
    text = re.sub(r'Rp\s*([\d\.]+),00', r'\1 rupiah', text)
    text = re.sub(r'Rp\s*([\d\.]+)', r'\1 rupiah', text)
    text = re.sub(r'(\d+)\s*[-–]\s*(\d+)', r'\1 sampai \2', text)
    text = re.sub(r'(\d+),(\d+)', r'\1 koma \2', text)
    text = text.replace('cm³', ' sentimeter kubik ')
    text = text.replace('cm²', ' sentimeter persegi ')
    text = text.replace('cm', ' sentimeter ')
    text = text.replace('m²', ' meter persegi ')
    text = text.replace(' m ', ' meter ')

    # === BERSIHKAN SPASI ===
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\b(\w+)( \1\b)+', r'\1', text, flags=re.IGNORECASE)
    text = text.strip()
    if not text.startswith(' '):
        text = ' ' + text
    return text


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
    opsi = question_data.get('opsi') or question_data.get('options', [])
    if isinstance(opsi, dict):
        return [opsi[k] for k in sorted(opsi.keys())]
    return list(opsi)


def get_correct_set(question_data):
    kj = question_data.get('kunci_jawaban') if 'kunci_jawaban' in question_data else question_data.get('jawaban_benar')
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


IMAGE_SEARCH_DIRS = [
    "/sdcard/download", "/sdcard/Download",
    os.path.expanduser("~/sdcard/download"),
    os.path.expanduser("~/sdcard/Download"),
    os.path.expanduser("~/storage/downloads"),
    os.path.expanduser("~/storage/shared/Download"),
    "/storage/emulated/0/Download", "/storage/emulated/0/download",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "images"),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "public"),
    os.path.dirname(os.path.abspath(__file__)),
    "/root/vue-kim", "/root", os.getcwd(),
]

def resolve_image_path(img_name, soal_id=None):
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
                f"soal_{soal_id}{ext}", f"soal{soal_id}{ext}",
                f"soal_{soal_id}_tka12{ext}", f"tka12_soal_{soal_id}{ext}",
                f"tka12_soal{soal_id}{ext}", f"tka12_1_soal_{soal_id}{ext}",
                f"tka12_1_soal{soal_id}{ext}", f"gambar_soal_{soal_id}{ext}",
                f"gambar_soal{soal_id}{ext}", f"gambar_{soal_id}{ext}",
                f"img_soal_{soal_id}{ext}", f"img_soal{soal_id}{ext}",
            ])
    for item in candidates_to_try:
        if item and os.path.exists(item) and os.path.isfile(item):
            return os.path.abspath(item)
    for item in candidates_to_try:
        if not item:
            continue
        base = os.path.basename(item)
        for sdir in IMAGE_SEARCH_DIRS:
            full_p = os.path.join(sdir, base)
            if os.path.exists(full_p) and os.path.isfile(full_p):
                return full_p
    return None


def ensure_diagram_images_exist(force=True):
    """Membuat ilustrasi sesuai soal TKA Kelas 12 – HOTS Tinggi."""
    target_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images")
    os.makedirs(target_dir, exist_ok=True)
    BG = "#111827"

    def save_fig(path, build):
        if os.path.exists(path) and not force:
            return
        try:
            fig, ax = plt.subplots(figsize=(7.8, 4.2), dpi=160)
            fig.patch.set_facecolor(BG)
            ax.set_facecolor(BG)
            build(fig, ax)
            plt.tight_layout()
            plt.savefig(path, dpi=160, bbox_inches="tight",
                        facecolor=fig.get_facecolor(), edgecolor="none")
            plt.close(fig)
            print(f"  [✓ Diagram dibuat] {os.path.basename(path)}")
        except Exception as e:
            print(f"Peringatan generator diagram {os.path.basename(path)}: {e}")

    # =============================================================
    # SOAL 1 – BILANGAN : Bunga Majemuk (logaritma)
    # =============================================================
    def q1(fig, ax):
        ax.axis("off")
        ax.text(0.5, 0.90, r"$M_n = M_0(1+i)^n$",
                ha="center", va="center", fontsize=20, color="#FBBF24")
        ax.text(0.5, 0.66, r"$20.000.000 = 10.000.000(1{,}005)^n$",
                ha="center", va="center", fontsize=15, color="#FFFFFF")
        ax.text(0.5, 0.44, r"$(1{,}005)^n = 2$",
                ha="center", va="center", fontsize=15, color="#FFFFFF")
        ax.text(0.5, 0.22, r"$n = \frac{\log 2}{\log 1{,}005} \approx 139$ bulan",
                ha="center", va="center", fontsize=15, color="#FFFFFF")
        ax.text(0.5, 0.02, r"$\approx 11{,}6$ tahun $\approx 12$ tahun",
                ha="center", va="center", fontsize=17, color="#34D399",
                bbox=dict(boxstyle="round,pad=0.5",
                          facecolor="#064E3B", edgecolor="#10B981"))
    save_fig(os.path.join(target_dir, "tka12_q1_bilangan.png"), q1)

    # =============================================================
    # SOAL 2 – ALJABAR : Program linear
    # =============================================================
    def q2(fig, ax):
        x = np.linspace(0, 30, 300)
        y1 = (60 - 2*x)/3
        y2 = (48 - 3*x)/2
        ax.fill_between(x, 0, np.minimum(y1, y2),
                        where=(y1 >= 0) & (y2 >= 0) & (x >= 0),
                        color="#38BDF8", alpha=0.15, label="Daerah layak")
        ax.plot(x, y1, color="#FBBF24", linewidth=2.5, label=r"$2x+3y=60$")
        ax.plot(x, y2, color="#F43F5E", linewidth=2.5, label=r"$3x+2y=48$")
        ax.scatter([12], [12], s=180, color="#34D399", zorder=5,
                   edgecolors="white", linewidths=2)
        ax.annotate(r"Titik optimum $(12,\;12)$",
                    xy=(12, 12), xytext=(18, 18),
                    arrowprops=dict(arrowstyle="->", color="#34D399", lw=1.8),
                    fontsize=11, color="#34D399", fontweight="bold")
        ax.set_xlabel("Produk A (unit)", color="#E5E7EB", fontsize=11)
        ax.set_ylabel("Produk B (unit)", color="#E5E7EB", fontsize=11)
        ax.set_title("Daerah Layak Program Linear",
                     color="#FFFFFF", fontsize=13, fontweight="bold")
        ax.tick_params(colors="#9CA3AF")
        for s in ax.spines.values():
            s.set_color("#374151")
        ax.grid(True, alpha=0.25, color="#6B7280")
        ax.legend(loc="upper right", facecolor="#1F2937",
                  edgecolor="#374151", labelcolor="#E5E7EB", fontsize=9)
    save_fig(os.path.join(target_dir, "tka12_q2_aljabar.png"), q2)

    # =============================================================
    # SOAL 3 – GEOMETRI : Kerucut dalam bola
    # =============================================================
    def q3(fig, ax):
        from matplotlib.patches import Circle
        R = 10
        ax.add_patch(Circle((0, 0), R, fill=False, edgecolor="#38BDF8",
                            linewidth=2.5, label=f"Bola R={R}"))
        r_cone = 8
        h_cone = 14
        ax.plot([0, 0], [-R, h_cone - R], color="#F43F5E", linewidth=2.5)
        ax.plot([-r_cone, 0], [h_cone - R, h_cone - R],
                color="#F43F5E", linewidth=2.5)
        ax.plot([r_cone, 0], [h_cone - R, h_cone - R],
                color="#F43F5E", linewidth=2.5)
        ax.plot([-r_cone, r_cone], [h_cone - R, h_cone - R],
                color="#F43F5E", linewidth=2.5)
        ax.scatter([0], [0], color="#FBBF24", s=80, zorder=5)
        ax.text(1, 1, "O", fontsize=11, color="#FBBF24")
        ax.text(r_cone/2, -4, "r", fontsize=12, color="#F43F5E",
                ha="center", fontweight="bold")
        ax.annotate("", xy=(r_cone+1, h_cone-R), xytext=(r_cone+1, -R),
                    arrowprops=dict(arrowstyle="<->", color="#E5E7EB", lw=1.5))
        ax.text(r_cone+2, (h_cone-2*R)/2, "h", fontsize=12, color="#E5E7EB",
                va="center", style="italic")
        ax.set_xlim(-14, 16)
        ax.set_ylim(-14, 16)
        ax.set_aspect("equal")
        ax.axis("off")
        ax.set_title(r"Kerucut dalam Bola $V_{max}=\frac{32}{81}\pi R^3$",
                     color="#FFFFFF", fontsize=13, fontweight="bold")
    save_fig(os.path.join(target_dir, "tka12_q3_geometri.png"), q3)

    # =============================================================
    # SOAL 4 – DATA & PELUANG : Teorema Bayes
    # =============================================================
    def q4(fig, ax):
        ax.axis("off")
        ax.set_xlim(0, 1); ax.set_ylim(0, 1)
        ax.text(0.5, 0.95, "Teorema Bayes – Peluang Bersyarat",
                ha="center", fontsize=14, color="#FBBF24", fontweight="bold")
        ax.text(0.5, 0.78,
                r"$P(A|B) = \frac{P(B|A)\cdot P(A)}{P(B)}$",
                ha="center", fontsize=18, color="#FFFFFF")
        ax.text(0.5, 0.56,
                r"$P(\text{Sakit}|+) = \frac{0{,}98\times0{,}01}{0{,}98\times0{,}01+0{,}03\times0{,}99}$",
                ha="center", fontsize=11, color="#FFFFFF")
        ax.text(0.5, 0.34,
                r"$= \frac{0{,}0098}{0{,}0098+0{,}0297} = \frac{0{,}0098}{0{,}0395}$",
                ha="center", fontsize=12, color="#FFFFFF")
        ax.text(0.5, 0.12,
                r"$\approx 0{,}248 \approx 24{,}8\%$",
                ha="center", fontsize=17, color="#34D399",
                bbox=dict(boxstyle="round,pad=0.5",
                          facecolor="#064E3B", edgecolor="#10B981"))
    save_fig(os.path.join(target_dir, "tka12_q4_peluang.png"), q4)

    # =============================================================
    # SOAL 5 – TRIGONOMETRI : Jumlah sudut sin
    # =============================================================
    def q5(fig, ax):
        ax.axis("off")
        ax.text(0.5, 0.90,
                r"$\sin10^\circ+\sin50^\circ+\sin130^\circ+\sin170^\circ$",
                ha="center", va="center", fontsize=14, color="#FBBF24")
        ax.text(0.5, 0.68,
                r"$= (\sin10^\circ+\sin170^\circ)+(\sin50^\circ+\sin130^\circ)$",
                ha="center", va="center", fontsize=12, color="#FFFFFF")
        ax.text(0.5, 0.48,
                r"$= 2\sin90^\circ\cos80^\circ+2\sin90^\circ\cos40^\circ$",
                ha="center", va="center", fontsize=12, color="#FFFFFF")
        ax.text(0.5, 0.28,
                r"$= 2\cos80^\circ+2\cos40^\circ$",
                ha="center", va="center", fontsize=14, color="#FFFFFF")
        ax.text(0.5, 0.08,
                r"$= 2(\cos80^\circ+\cos40^\circ)=2\times2\cos60^\circ\cos20^\circ$",
                ha="center", va="center", fontsize=12, color="#FFFFFF")
        ax.text(0.5, -0.10,
                r"$= 4\times\frac{1}{2}\cos20^\circ = 2\cos20^\circ$",
                ha="center", va="center", fontsize=16, color="#34D399",
                bbox=dict(boxstyle="round,pad=0.5",
                          facecolor="#064E3B", edgecolor="#10B981"))
    save_fig(os.path.join(target_dir, "tka12_q5_trigonometri.png"), q5)

    # =============================================================
    # SOAL 6 – ALJABAR : Matriks (PG Kompleks)
    # =============================================================
    def q6(fig, ax):
        ax.axis("off")
        ax.set_xlim(0, 1); ax.set_ylim(0, 1)
        ax.text(0.5, 0.96,
                r"Diketahui: $A=\begin{pmatrix}2&1\\3&4\end{pmatrix},\;B=\begin{pmatrix}1&0\\2&3\end{pmatrix}$",
                ha="center", va="center", fontsize=15, color="#FBBF24")
        ax.text(0.5, 0.74,
                r"$AB=\begin{pmatrix}2\cdot1+1\cdot2 & 2\cdot0+1\cdot3\\3\cdot1+4\cdot2 & 3\cdot0+4\cdot3\end{pmatrix}=\begin{pmatrix}4&3\\11&12\end{pmatrix}$",
                ha="center", va="center", fontsize=13, color="#FFFFFF")
        ax.text(0.5, 0.50,
                r"$\det A = 2\cdot4-1\cdot3 = 5,\quad \det B = 1\cdot3-0\cdot2 = 3$",
                ha="center", va="center", fontsize=13, color="#FFFFFF")
        ax.text(0.5, 0.30,
                r"$BA=\begin{pmatrix}2&1\\13&14\end{pmatrix}\neq AB$",
                ha="center", va="center", fontsize=13, color="#F87171")
        ax.text(0.5, 0.12,
                r"$A+B=\begin{pmatrix}3&1\\5&7\end{pmatrix}$",
                ha="center", va="center", fontsize=14, color="#34D399",
                bbox=dict(boxstyle="round,pad=0.5",
                          facecolor="#064E3B", edgecolor="#10B981"))
        ax.set_title("Matriks – Pilih SEMUA pernyataan yang benar",
                     color="#FFFFFF", fontsize=13, fontweight="bold")
    save_fig(os.path.join(target_dir, "tka12_q6_matriks.png"), q6)


def load_and_fit_image(img_input, max_w, max_h, soal_id=None):
    if not img_input and soal_id is None:
        return None
    try:
        if isinstance(img_input, Image.Image):
            img = img_input.convert("RGBA")
        else:
            resolved_path = resolve_image_path(img_input, soal_id=soal_id)
            if not resolved_path:
                return None
            print(f"  [✓ Gambar Ditemukan] Memuat gambar soal: {resolved_path}")
            img = Image.open(resolved_path).convert("RGBA")
        w, h = img.size
        if w == 0 or h == 0:
            return None
        ratio = min(max_w / w, max_h / h)
        new_w = max(1, int(w * ratio))
        new_h = max(1, int(h * ratio))
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        return img
    except Exception as e:
        print(f"Peringatan: Gagal memuat gambar ({img_input}): {e}")
        return None


def build_steps_if_needed(soal):
    if 'steps' in soal and soal['steps']:
        norm_steps = []
        for i, st in enumerate(soal['steps']):
            title = st.get('title') or st.get('judul') or f"Langkah {i+1}"
            raw_details = st.get('details') if 'details' in st else st.get('detail', [])
            if isinstance(raw_details, str):
                details = [raw_details]
            elif isinstance(raw_details, list):
                details = raw_details
            else:
                details = [str(raw_details)]
            spoken = st.get('spoken')
            if not spoken:
                det_str = ". ".join(details)
                spoken = f"{title}. {det_str}"
            norm_steps.append({
                "title": title,
                "details": details,
                "spoken": spoken
            })
        return norm_steps

    pembahasan = soal.get('pembahasan', '')
    submateri = soal.get('submateri') or soal.get('subtopic') or soal.get('elemen', 'Matematika SMA')
    return [
        {"title": f"Identifikasi Konsep {submateri}",
         "details": [f"• Materi Pokok: {soal.get('elemen', 'Matematika')} - {submateri}",
                     "• Pahami informasi dan kondisi yang diberikan pada soal secara cermat."],
         "spoken": f"Konsep yang digunakan adalah {submateri}. Mari kita analisis informasi yang diketahui pada soal."},
        {"title": "Langkah Perhitungan & Analisis",
         "details": [f"• {pembahasan}"],
         "spoken": f"Langkah penyelesaiannya: {text_to_spoken(pembahasan)}"},
        {"title": "Tantangan Untuk Kamu",
         "details": ["★ Berdasarkan langkah perhitungan di atas, apa pilihan jawabanmu?",
                     "★ Tuliskan jawaban yang paling tepat di kolom komentar sekarang!"],
         "spoken": "Nah, dari langkah perhitungan tersebut, manakah pilihan jawaban yang paling tepat? Yuk, tuliskan jawabanmu di kolom komentar ya!"}
    ]


def draw_colorful_background(draw, width=WIDTH, height=HEIGHT):
    draw.rectangle([(0, 0), (width, height)], fill="#070B19")
    draw.ellipse((-150, -100, 650, 700), fill="#1E1B4B")
    draw.ellipse((400, 700, 1250, 1600), fill="#3B0764")
    draw.ellipse((-100, 1300, 700, 2050), fill="#0E4966")
    draw.ellipse((600, -50, 1180, 500), fill="#172554")


def create_question_frame(question_data, timer_val=5, font_size=64):
    scale = font_size / 64.0
    FS_BADGE = max(26, round(36 * scale))
    FS_BODY = font_size
    FS_OPTION = max(34, round(52 * scale))
    FS_TIMER = max(100, round(160 * scale))

    img = Image.new("RGB", (WIDTH, HEIGHT), "#070B19")
    draw = ImageDraw.Draw(img)
    draw_colorful_background(draw, WIDTH, HEIGHT)

    draw_rounded_rect(draw, (40, 60, 480, 150), radius=24, fill="#121829", outline="#3B82F6", width=2)
    draw.text((65, 85), f"♫ {question_data.get('account', '@pairzal')}", font=get_font(FS_BADGE, bold=True), fill="#FFFFFF")

    draw_rounded_rect(draw, (505, 60, WIDTH - 40, 150), radius=24, fill="#121829", outline="#3B82F6", width=2)
    submateri = question_data.get('submateri') or question_data.get('subtopic') or question_data.get('elemen', 'Bilangan')
    soal_num = question_data.get('nomor') or question_data.get('id', 1)
    tipe = question_data.get('tipe', 'PG')
    tag_text = f"SOAL #{soal_num}  •  {submateri.upper()}"
    if "Kompleks" in tipe or "kompleks" in tipe:
        tag_text = f"SOAL #{soal_num}  •  PG KOMPLEKS (MULTI JAWAB)"

    img_src = question_data.get('image_path') or question_data.get('image') or question_data.get('gambar')
    chart_img = load_and_fit_image(img_src, max_w=940, max_h=340, soal_id=soal_num)

    card_top = 175
    card_bottom = 1050 if chart_img else 830
    draw_rounded_rect(draw, (40, card_top, WIDTH - 40, card_bottom), radius=24, fill="#111827", outline="#4F46E5", width=2)
    tag_font = get_font(FS_BADGE, bold=True)
    tb = tag_font.getbbox(tag_text)
    tw = tb[2] - tb[0]
    draw_rounded_rect(draw, (65, card_top + 20, min(WIDTH - 65, 65 + tw + 40), card_top + 88), radius=16, fill="#1F2937", outline="#6366F1", width=1)
    draw.text((85, card_top + 34), tag_text, font=tag_font, fill="#F3F4F6")

    q_text = question_data.get('soal') or question_data.get('pertanyaan') or question_data.get('question', '')
    clean_q = latex_to_clean_text(q_text)
    q_font = get_font(FS_BODY, bold=True)
    q_lines = wrap_text(clean_q, q_font, WIDTH - 140)
    y_text = card_top + 115
    line_spacing = round(FS_BODY * 1.5)
    max_text_lines = 4 if chart_img else 8
    for line in q_lines[:max_text_lines]:
        draw_math_line(img, draw, (65, y_text), line, q_font, FS_BODY, fill="#FFFFFF", max_width=WIDTH - 130)
        y_text += line_spacing

    if chart_img:
        img_x = (WIDTH - chart_img.width) // 2
        img_y = y_text + 10
        if img_y + chart_img.height > card_bottom - 15:
            img_y = card_bottom - chart_img.height - 15
        img.paste(chart_img, (img_x, img_y), chart_img)

    cx = WIDTH // 2
    cy = card_bottom + 130
    r = max(75, round(100 * scale))
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill="#1F2937", outline="#EC4899", width=3)
    t_font = get_font(FS_TIMER, bold=True)
    t_str = str(timer_val)
    tb = t_font.getbbox(t_str)
    tw = tb[2] - tb[0]
    th = tb[3] - tb[1]
    draw.text((cx - tw / 2, cy - th / 2 - tb[1]), t_str, font=t_font, fill="#F43F5E")

    options = get_options_list(question_data)
    n_opts = len(options)
    opt_start_y = cy + r + 55
    opt_height = max(95, round(140 * scale)) if n_opts <= 4 else max(80, round(115 * scale))
    opt_gap = 18 if n_opts <= 4 else 12
    opt_font = get_font(FS_OPTION, bold=True)
    opt_line_h = round(FS_OPTION * 1.18)

    for i, opt in enumerate(options):
        cur_y = opt_start_y + i * (opt_height + opt_gap)
        if cur_y + opt_height > HEIGHT - 40:
            break
        draw_rounded_rect(draw, (40, cur_y, WIDTH - 40, cur_y + opt_height), radius=20,
                          fill="#111827", outline="#374151", width=2)
        circle_letter = chr(65 + i)
        c_r = max(30, round(40 * scale))
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


def create_step_frame(question_data, active_step_idx=0, font_size=64):
    """Frame pembahasan bergaya PAPAN TULIS PUTIH + tulisan tangan."""
    steps = build_steps_if_needed(question_data)
    num_steps = max(1, len(steps))

    img = Image.new("RGB", (WIDTH, HEIGHT), "#3D2817")
    draw = ImageDraw.Draw(img)

    # ================================================================
    # LATAR BELAKANG: DINDING KAYU DI LUAR PAPAN
    # ================================================================
    draw.rectangle([(0, 0), (WIDTH, HEIGHT)], fill="#3D2817")
    for y in range(0, HEIGHT, 3):
        shade = "#3D2817" if (y // 3) % 2 == 0 else "#36210E"
        draw.line([(0, y), (WIDTH, y)], fill=shade, width=1)

    # Bayangan bingkai
    draw.rounded_rectangle((46, 46, WIDTH - 26, HEIGHT - 26),
                           radius=32, fill="#0D0806")

    # Bingkai kayu (dua lapis)
    draw.rounded_rectangle((30, 30, WIDTH - 30, HEIGHT - 30),
                           radius=32, fill="#6B4423")
    draw.rounded_rectangle((38, 38, WIDTH - 38, HEIGHT - 38),
                           radius=28, fill="#8B5E34")

    # Strip logam gelap tipis
    draw.rounded_rectangle((58, 58, WIDTH - 58, HEIGHT - 58),
                           radius=18, fill="#2A1A0E")

    # ================================================================
    # PAPAN PUTIH
    # ================================================================
    board = (74, 74, WIDTH - 74, HEIGHT - 190)
    draw.rounded_rectangle(board, radius=10, fill="#FAFAF3")
    draw.rounded_rectangle(board, radius=10, outline="#D4D4C8", width=2)
    bl, bt, br, bb = board

    # Efek "chalk smudge" halus di bagian bawah papan (kesan sisa hapusan)
    for i in range(0, 40):
        sx = random.randint(bl + 40, br - 200)
        sy = random.randint(bb - 200, bb - 40)
        sw = random.randint(40, 180)
        sh = random.randint(2, 5)
        c = random.choice(["#F0F0E5", "#F5F5EA", "#EBEBE0"])
        draw.rectangle((sx, sy, sx + sw, sy + sh), fill=c)

    # ================================================================
    # FONTS
    # ================================================================
    f_h1     = get_handwriting_font(56, bold=True)
    f_h2     = get_handwriting_font(40, bold=True)
    f_step   = get_handwriting_font(44, bold=True)
    f_body   = get_handwriting_font(36, bold=False)
    f_small  = get_handwriting_font(30, bold=False)
    f_note_t = get_handwriting_font(34, bold=True)
    f_note_b = get_handwriting_font(28, bold=False)

    # ================================================================
    # HEADER DI PAPAN
    # ================================================================
    account = question_data.get('account', '@pairzal')
    submateri = (question_data.get('submateri')
                 or question_data.get('elemen', 'Matematika')).upper()
    soal_num = question_data.get('nomor') or question_data.get('id', 1)

    h_y = bt + 32
    draw.text((bl + 55, h_y),
              f"✎  Pembahasan Soal #{soal_num}",
              font=f_h1, fill="#1E40AF")
    draw.text((bl + 55, h_y + 70),
              f"Topik: {submateri}",
              font=f_h2, fill="#DC2626")

    tw_acc = f_small.getbbox(account)[2]
    draw.text((br - tw_acc - 55, h_y + 18), account,
              font=f_small, fill="#9CA3AF")

    # Garis merah tebal
    draw.line([(bl + 55, h_y + 132), (br - 55, h_y + 132)],
              fill="#DC2626", width=4)

    # ================================================================
    # KONTEN: LANGKAH-LANGKAH
    # ================================================================
    content_top = h_y + 175
    content_bottom = bb - 40
    step_gap = 20

    # Ukuran adaptif berdasarkan jumlah langkah
    if num_steps >= 6:
        f_step = get_handwriting_font(34, bold=True)
        f_body = get_handwriting_font(28, bold=False)
        line_h = 36
    elif num_steps == 5:
        f_step = get_handwriting_font(38, bold=True)
        f_body = get_handwriting_font(30, bold=False)
        line_h = 40
    else:
        line_h = 46

    step_h = (content_bottom - content_top - (num_steps - 1) * step_gap) // num_steps

    for idx, step in enumerate(steps):
        sy = content_top + idx * (step_h + step_gap)
        sy_end = sy + step_h

        is_active = (idx == active_step_idx)
        is_future = (idx > active_step_idx)

        if is_active:
            # Efek "highlighter marker kuning" di belakang judul
            draw.rectangle((bl + 40, sy + 6, br - 40, sy + 62),
                           fill="#FEF08A")
            title_col = "#1E3A8A"
            text_col  = "#1F2937"
        elif is_future:
            title_col = "#D1D5DB"
            text_col  = "#D1D5DB"
        else:
            title_col = "#1E40AF"
            text_col  = "#374151"

        # Judul langkah
        title = step.get('title', f'Langkah {idx + 1}')
        draw.text((bl + 60, sy + 8),
                  f"Langkah {idx + 1}: {title}",
                  font=f_step, fill=title_col)

        # Detail (bullet)
        detail_y = sy + 70
        for detail in step.get('details', []):
            clean = latex_to_clean_text(detail)
            max_w = br - bl - 170
            lines = wrap_text(clean, f_body, max_w)
            first = True
            for line in lines:
                if detail_y + line_h > sy_end - 5:
                    break
                bullet = "→" if first else "  "
                draw.text((bl + 85, detail_y),
                          f"{bullet}  {line}",
                          font=f_body, fill=text_col)
                detail_y += line_h
                first = False

    # ================================================================
    # STICKY NOTE: TANTANGAN (tampil di langkah terakhir)
    # ================================================================
    if active_step_idx >= len(steps) - 1:
        note_w = 460
        note_h = 118
        nx = br - note_w - 30
        ny = bb - note_h - 25

        # Bayangan
        draw.rectangle((nx + 8, ny + 8, nx + note_w + 8, ny + note_h + 8),
                       fill="#92400E")
        # Kertas sticky
        draw.rectangle((nx, ny, nx + note_w, ny + note_h),
                       fill="#FEF3C7", outline="#F59E0B", width=3)
        draw.text((nx + 20, ny + 14),
                  "📌 TANTANGAN MENJAWAB",
                  font=f_note_t, fill="#B45309")
        draw.text((nx + 20, ny + 58),
                  "Yuk tulis jawabanmu di kolom komentar!",
                  font=f_note_b, fill="#78350F")

    # ================================================================
    # BAKI SPIDOL (MARKER TRAY) DI BAWAH PAPAN
    # ================================================================
    tray_y = bb + 15
    tray_h = 60
    tray_w = 540
    tray_x = (WIDTH - tray_w) // 2

    # Bayangan tray
    draw.rounded_rectangle((tray_x + 4, tray_y + 4, tray_x + tray_w + 4, tray_y + tray_h + 4),
                           radius=12, fill="#0D0806")
    # Badan tray
    draw.rounded_rectangle((tray_x, tray_y, tray_x + tray_w, tray_y + tray_h),
                           radius=12, fill="#4A2F1A", outline="#2A1A0E", width=3)

    marker_colors = ["#1E40AF", "#DC2626", "#059669", "#111827"]
    m_w, m_h, gap = 80, 32, 35
    total = len(marker_colors) * m_w + (len(marker_colors) - 1) * gap
    start_x = (WIDTH - total) // 2
    for i, c in enumerate(marker_colors):
        mx = start_x + i * (m_w + gap)
        my = tray_y + 14
        draw.rounded_rectangle((mx, my, mx + m_w, my + m_h),
                               radius=5, fill=c)
        # Ujung spidol
        draw.rectangle((mx + m_w, my + 6, mx + m_w + 12, my + m_h - 6),
                       fill="#222")

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

    tag_font = get_font(34, bold=True)
    tag_text = "✨ PERSIAPAN UJIAN TKA 2026 ✨"
    tb = tag_font.getbbox(tag_text)
    tw = tb[2] - tb[0]
    draw_rounded_rect(draw, ((WIDTH - tw) / 2 - 30, 420, (WIDTH + tw) / 2 + 30, 490), radius=25, fill="#1E293B", outline="#38BDF8", width=2)
    draw.text(((WIDTH - tw) / 2, 437), tag_text, font=tag_font, fill="#38BDF8")

    title_font = get_font(58, bold=True)
    lines = wrap_text(judul, title_font, WIDTH - 160)
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

    sub_font = get_font(40, bold=True)
    sub_text = f"🔥 Pembahasan & Kuis {jumlah_soal} Soal 🔥"
    bbox = sub_font.getbbox(sub_text)
    w = bbox[2] - bbox[0]
    draw_rounded_rect(draw, ((WIDTH - w) / 2 - 35, y + 15, (WIDTH + w) / 2 + 35, y + 85), radius=30, fill="#FE2C55")
    draw.text(((WIDTH - w) / 2, y + 30), sub_text, font=sub_font, fill="#FFFFFF")

    info_font = get_font(36, bold=True)
    draw.text((WIDTH // 2, box_bottom + 120), "Siapkan alat tulismu & mari kita bahas!", font=info_font, fill="#FBBF24", anchor="mm")
    draw_footer_watermark(draw, y_pos=1835)
    return img


def create_outro_frame():
    img = Image.new("RGB", (WIDTH, HEIGHT), "#0A2540")
    draw = ImageDraw.Draw(img)
    draw_colorful_background(draw, WIDTH, HEIGHT)

    h_font = get_font(60, bold=True)
    draw.text((WIDTH // 2, 360), "🎉 SELESAI!", font=h_font, fill="#FFFFFF", anchor="mm")
    sub_font = get_font(40, bold=True)
    draw.text((WIDTH // 2, 445), "Mau Latihan Soal Lebih Banyak?", font=sub_font, fill="#38BDF8", anchor="mm")

    qr_card = generate_qr_card("https://www.math315.id", card_w=460, card_h=460)
    img.paste(qr_card, ((WIDTH - 460) // 2, 530), qr_card)

    info_font = get_font(36, bold=True)
    draw.text((WIDTH // 2, 1060), "📱 Scan QR Code di atas untuk latihan!", font=info_font, fill="#FBBF24", anchor="mm")

    draw_rounded_rect(draw, (100, 1180, WIDTH - 100, 1295), radius=30, fill="#FE2C55")
    btn_font = get_font(36, bold=True)
    draw.text((WIDTH // 2, 1238), "❤️ Like, Simpan & Follow @pairzal", font=btn_font, fill="#FFFFFF", anchor="mm")
    draw_footer_watermark(draw, y_pos=1835)
    return img


async def generate_voice_edge(text, output_file, pitch="+0Hz", rate="+5%"):
    import edge_tts
    voice = "id-ID-ArdiNeural"
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await communicate.save(output_file)


def generate_voice(text, output_file, is_budi=False):
    if not text or not str(text).strip():
        text = "Mari kita perhatikan langkah penyelesaian berikut ini."
    else:
        text = str(text).strip()

    if is_budi:
        pitch_hz = 12 + random.uniform(-2, 3)
        rate_pct = 3 + random.uniform(-2, 3)
    else:
        pitch_hz = random.uniform(-2, 4)
        rate_pct = random.uniform(-4, 1)
    pitch = f"{pitch_hz:+.0f}Hz"
    rate = f"{rate_pct:+.0f}%"
    try:
        asyncio.run(generate_voice_edge(text, output_file, pitch=pitch, rate=rate))
        if os.path.exists(output_file) and os.path.getsize(output_file) > 100:
            return
    except Exception as e:
        print(f"Warning: Edge TTS error ({e}), using fallback...")
    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang="id", slow=False)
        tts.save(output_file)
        if os.path.exists(output_file) and os.path.getsize(output_file) > 100:
            return
    except Exception as e2:
        print(f"Fallback gTTS error: {e2}")
    if not os.path.exists(output_file) or os.path.getsize(output_file) < 50:
        subprocess.run(
            f"ffmpeg -y -f lavfi -i anullsrc=r={SAMPLE_RATE}:cl=mono -t 1.5 -c:a libmp3lame -b:a 128k {output_file}",
            shell=True, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )


def get_audio_duration(path):
    cmd = f"ffprobe -i {path} -show_entries format=duration -v quiet -of csv=\"p=0\""
    out = subprocess.check_output(cmd, shell=True).decode().strip()
    return float(out)


def create_ambient_bgm(duration_sec, output_file, custom_bgm=None):
    free_bgm_candidates = [
        custom_bgm,
        "/root/vue-kim/bgm/lofi_study.mp3",
        "/root/bgm_canon_in_d.mp3",
        "/root/vue-kim/bgm/canon_in_d.mp3",
        "/root/bgm_dream_catcher.mp3",
        "/root/vue-kim/bgm/dream_catcher.mp3",
        "/root/study_bgm.wav"
    ]
    bgm_to_use = None
    for candidate in free_bgm_candidates:
        if candidate and os.path.exists(candidate):
            bgm_to_use = candidate
            break

    if bgm_to_use and os.path.exists(bgm_to_use):
        print(f"  -> Menggunakan file lagu background gratis (Royalty-Free): {bgm_to_use}")
        cmd = f"""ffmpeg -y -stream_loop -1 -i "{bgm_to_use}" -t {duration_sec} \
        -af "afade=t=in:st=0:d=1.5,afade=t=out:st={max(0, duration_sec-3)}:d=3" \
        -c:a libmp3lame -ar {SAMPLE_RATE} -b:a 192k {output_file}"""
        subprocess.run(cmd, shell=True, check=True)
        return

    print("  -> Menghasilkan musik ambient lofi bebas hak cipta melalui audio synthesizer...")
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


def make_animated_combined_video(data_soal_obj, output_mp4, bgm_path=None, bgm_volume=0.25, font_size=64):
    if isinstance(data_soal_obj, dict):
        judul = data_soal_obj.get('judul', "Latihan Soal TKA Matematika Kelas 12 - HOTS")
        daftar_soal = data_soal_obj.get('soal', [])
    else:
        judul = "Latihan Soal TKA Matematika Kelas 12 - HOTS"
        daftar_soal = data_soal_obj

    temp_dir = "/tmp/video_render_tka12_1"
    os.makedirs(temp_dir, exist_ok=True)
    ensure_diagram_images_exist()
    part_files = []

    print("1. Membuat Intro Video...")
    img_intro = create_intro_frame(judul, len(daftar_soal))
    intro_png = os.path.join(temp_dir, "intro.png")
    img_intro.save(intro_png)
    intro_audio = os.path.join(temp_dir, "intro_audio.mp3")
    intro_text = f"Halo sobat cerdas! Mari kita bahas {len(daftar_soal)} soal {judul} bersama Pak Irzal."
    generate_voice(intro_text, intro_audio, is_budi=False)
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
        tipe = soal.get('tipe', 'PG')
        if "Kompleks" in tipe or "kompleks" in tipe:
            narration_question = f"Soal nomor {idx}, pilihan ganda kompleks. {spoken_q} Pilih semua jawaban yang benar. Waktu kamu lima detik untuk menjawab!"
        else:
            narration_question = f"Soal nomor {idx}. {spoken_q}. Waktu kamu lima detik untuk menjawab!"
        generate_voice(narration_question, audio_q, is_budi=False)
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
            print(f"  -> Animasi Langkah {step_idx + 1}/{len(steps)}...")
            step_img = create_step_frame(soal, active_step_idx=step_idx, font_size=font_size)
            step_img_path = os.path.join(sdir, f"frame_step_{step_idx + 1}.png")
            step_img.save(step_img_path)
            step_audio_path = os.path.join(sdir, f"audio_step_{step_idx + 1}.mp3")
            raw_spk = step.get('spoken', '')
            if not raw_spk:
                raw_spk = f"{step.get('title', '')}. {'. '.join(step.get('details', []))}"
            step_spoken = text_to_spoken(raw_spk)

            if step_idx == 0:
                budi_raw = os.path.join(sdir, "budi_raw.mp3")
                budi_text = "Pak Irzal, konsep apa yang digunakan?"
                generate_voice(budi_text, budi_raw, is_budi=True)
                guru_raw = os.path.join(sdir, "guru_step1.mp3")
                generate_voice(step_spoken, guru_raw, is_budi=False)
                cmd_dialog = (
                    f"ffmpeg -y -i {budi_raw} -i {guru_raw} -filter_complex "
                    f"\"[0:a]volume=0.85[a0];[1:a]volume=1.0[a1];[a0][a1]concat=n=2:v=0:a=1[out]\" "
                    f"-map \"[out]\" -c:a libmp3lame -ar {SAMPLE_RATE} -b:a 192k {step_audio_path}"
                )
                subprocess.run(cmd_dialog, shell=True, check=True)
            else:
                generate_voice(step_spoken, step_audio_path, is_budi=False)

            dur_step = get_audio_duration(step_audio_path)
            vid_step = os.path.join(sdir, f"part_step_{step_idx + 1}.mp4")
            subprocess.run(
                f"ffmpeg -y -loop 1 -i {step_img_path} -i {step_audio_path} "
                f"-c:v libx264 -preset ultrafast -r {FPS} -c:a aac -ar {SAMPLE_RATE} -ac 2 -b:a 192k -pix_fmt yuv420p -t {dur_step + 0.4} {vid_step}",
                shell=True, check=True
            )
            part_files.append(vid_step)

        buffer_vid = os.path.join(sdir, "part_buffer.mp4")
        last_frame = os.path.join(sdir, f"frame_step_{len(steps)}.png")
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
    generate_voice(outro_text, outro_audio, is_budi=False)
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
    print(f"\n🎉 Selesai! Video {len(daftar_soal)} soal TKA Matematika Kelas 12 berhasil dibuat: {output_mp4}")


# ============================================================
# DATA SOAL TKA MATEMATIKA KELAS 12 - HOTS TINGGI
# 5 PG (satu per elemen) + 1 PG Kompleks (Matriks – Multi Jawab)
# ============================================================
data_soal = {
    "judul": "Latihan Soal TKA Matematika Kelas 12 - HOTS Tinggi",
    "topik": "TKA Matematika SMA Kelas 12",
    "jenjang": "Kelas 12 SMA/MA/SMK/MAK",
    "level": "HOTS",
    "acuan": (
        "Kerangka Asesmen TKA Matematika SMA/MA/Sederajat dan SMK/MAK "
        "2025/2026 - Bilangan, Aljabar, Geometri dan Pengukuran, "
        "Data dan Peluang, serta Trigonometri"
    ),
    "jumlah_soal": 6,
    "komposisi": {"pilihan_ganda": 5, "pilihan_ganda_kompleks": 1},
    "soal": [
        {
            "nomor": 1,
            "elemen": "Bilangan",
            "submateri": "Bilangan real dan eksponen",
            "tipe": "PG",
            "level": "HOTS",
            "image_path": "images/tka12_q1_bilangan.png",
            "pertanyaan": (
                "Seorang investor menempatkan uang sebesar Rp10.000.000,00 "
                "di sebuah bank yang memberikan bunga majemuk 0,5% per bulan. "
                "Berapa lama waktu minimum (dalam bulan) agar saldo investasi "
                "menjadi dua kali lipat? (Gunakan log 2 ≈ 0,301 dan "
                "log 1,005 ≈ 0,00217.)"
            ),
            "opsi": ["A. 120 bulan", "B. 130 bulan", "C. 139 bulan",
                     "D. 145 bulan", "E. 150 bulan"],
            "jawaban_benar": "C",
            "pembahasan": (
                "M_n = M_0(1+i)^n → 20.000.000 = 10.000.000(1,005)^n. "
                "Maka (1,005)^n = 2. Ambil logaritma kedua ruas: "
                "n·log(1,005) = log 2. "
                "n = log 2 / log 1,005 = 0,301/0,00217 ≈ 138,7. "
                "Jadi waktu minimum adalah 139 bulan."
            ),
            "steps": [
                {"title": "Rumus bunga majemuk",
                 "details": ["M_n = M_0(1+i)^n"]},
                {"title": "Substitusi nilai yang diketahui",
                 "details": ["20.000.000 = 10.000.000(1,005)^n → (1,005)^n = 2"]},
                {"title": "Ambil logaritma kedua ruas",
                 "details": ["n·log(1,005) = log 2"]},
                {"title": "Hitung nilai n",
                 "details": ["n = 0,301/0,00217 ≈ 138,7 → 139 bulan"]},
            ],
            "spoken": (
                "Gunakan rumus bunga majemuk. M n sama dengan M nol dikali satu ditambah i pangkat n. "
                "Dua puluh juta sama dengan sepuluh juta dikali satu koma nol nol lima pangkat n. "
                "Maka satu koma nol nol lima pangkat n sama dengan dua. "
                "Ambil logaritma. n sama dengan log dua dibagi log satu koma nol nol lima, "
                "kira-kira seratus tiga puluh delapan koma tujuh. Jadi jawabannya seratus tiga puluh sembilan bulan. Jawaban C."
            ),
        },
        {
            "nomor": 2,
            "elemen": "Aljabar",
            "submateri": "Program linear dan optimasi",
            "tipe": "PG",
            "level": "HOTS",
            "image_path": "images/tka12_q2_aljabar.png",
            "pertanyaan": (
                "Sebuah perusahaan memproduksi dua jenis produk, A dan B. "
                "Setiap unit A memerlukan 2 jam kerja mesin dan 3 kg bahan baku. "
                "Setiap unit B memerlukan 3 jam kerja mesin dan 2 kg bahan baku. "
                "Mesin tersedia 60 jam per hari dan bahan baku tersedia 48 kg per hari. "
                "Jika keuntungan unit A adalah Rp40.000 dan unit B Rp30.000, "
                "keuntungan maksimum harian yang dapat diperoleh adalah ..."
            ),
            "opsi": ["A. Rp720.000", "B. Rp780.000", "C. Rp840.000",
                     "D. Rp900.000", "E. Rp960.000"],
            "jawaban_benar": "C",
            "pembahasan": (
                "Kendala: 2x + 3y ≤ 60 dan 3x + 2y ≤ 48, x ≥ 0, y ≥ 0. "
                "Fungsi tujuan: Z = 40.000x + 30.000y. "
                "Titik potong: 2x + 3y = 60 dan 3x + 2y = 48. "
                "Selesaikan: x = 12 dan y = 12. "
                "Uji titik sudut: (0,20) → 600.000; (16,0) → 640.000; "
                "(12,12) → 480.000 + 360.000 = 840.000. "
                "Jadi keuntungan maksimum Rp840.000."
            ),
            "steps": [
                {"title": "Tentukan kendala",
                 "details": ["2x + 3y ≤ 60 dan 3x + 2y ≤ 48"]},
                {"title": "Tentukan fungsi tujuan",
                 "details": ["Z = 40.000x + 30.000y"]},
                {"title": "Cari titik potong",
                 "details": ["2x + 3y = 60 dan 3x + 2y = 48 → x = 12, y = 12"]},
                {"title": "Uji titik sudut",
                 "details": ["(0,20) → 600.000; (16,0) → 640.000; (12,12) → 840.000"]},
            ],
            "spoken": (
                "Kendalanya dua x ditambah tiga y lebih kecil dari sama dengan enam puluh, "
                "dan tiga x ditambah dua y lebih kecil dari sama dengan empat puluh delapan. "
                "Fungsi tujuannya z sama dengan empat puluh ribu x ditambah tiga puluh ribu y. "
                "Titik potongnya x sama dengan dua belas dan y sama dengan dua belas. "
                "Uji titik sudut. Di titik nol dua puluh hasilnya enam ratus ribu. "
                "Di titik enam belas nol hasilnya enam ratus empat puluh ribu. "
                "Di titik dua belas dua belas hasilnya delapan ratus empat puluh ribu. "
                "Jadi keuntungan maksimumnya delapan ratus empat puluh ribu rupiah. Jawaban C."
            ),
        },
        {
            "nomor": 3,
            "elemen": "Geometri dan Pengukuran",
            "submateri": "Geometri ruang",
            "tipe": "PG",
            "level": "HOTS",
            "image_path": "images/tka12_q3_geometri.png",
            "pertanyaan": (
                "Sebuah kerucut berada di dalam bola berjari-jari R. "
                "Agar volume kerucut maksimum, tinggi kerucut haruslah ..."
            ),
            "opsi": ["A. 4R/3", "B. 3R/2", "C. 5R/3",
                     "D. 2R", "E. 7R/3"],
            "jawaban_benar": "A",
            "pembahasan": (
                "Misalkan tinggi kerucut h dan jari-jari kerucut r. "
                "Karena kerucut dalam bola: r² + (h − R)² = R² → r² = 2Rh − h². "
                "Volume kerucut V = (1/3)πr²h = (1/3)π(2Rh − h²)h = (1/3)π(2Rh² − h³). "
                "dV/dh = (1/3)π(4Rh − 3h²) = 0 → h(4R − 3h) = 0 → h = 4R/3. "
                "Jadi tinggi maksimum adalah 4R/3."
            ),
            "steps": [
                {"title": "Hubungan jari-jari dan tinggi",
                 "details": ["r² + (h − R)² = R² → r² = 2Rh − h²"]},
                {"title": "Rumus volume kerucut",
                 "details": ["V = (1/3)πr²h = (1/3)π(2Rh² − h³)"]},
                {"title": "Turunkan terhadap h dan cari maksimum",
                 "details": ["dV/dh = 0 → 4R − 3h = 0 → h = 4R/3"]},
            ],
            "spoken": (
                "Misalkan tinggi kerucut h dan jari-jari kerucut r. "
                "Karena kerucut dalam bola, r kuadrat ditambah h kurang r kuadrat sama dengan r kuadrat, "
                "sehingga r kuadrat sama dengan dua r h kurang h kuadrat. "
                "Volume kerucut v sama dengan sepertiga pi r kuadrat h. "
                "Turunkan terhadap h dan cari maksimum. "
                "Diperoleh h sama dengan empat r per tiga. Jawaban A."
            ),
        },
        {
            "nomor": 4,
            "elemen": "Data dan Peluang",
            "submateri": "Peluang bersyarat dan teorema Bayes",
            "tipe": "PG",
            "level": "HOTS",
            "image_path": "images/tka12_q4_peluang.png",
            "pertanyaan": (
                "Sebuah tes medis memiliki sensitivitas 98% (benar positif) "
                "dan spesifisitas 97% (benar negatif). Jika prevalensi penyakit "
                "di populasi adalah 1%, berapa peluang seseorang yang dinyatakan "
                "positif benar-benar menderita penyakit tersebut?"
            ),
            "opsi": ["A. 0,98", "B. 0,75", "C. 0,50",
                     "D. 0,248", "E. 0,01"],
            "jawaban_benar": "D",
            "pembahasan": (
                "Gunakan teorema Bayes. "
                "P(S|+) = [P(+|S)·P(S)] / [P(+|S)·P(S) + P(+|¬S)·P(¬S)]. "
                "P(+|S) = 0,98; P(S) = 0,01; P(+|¬S) = 0,03; P(¬S) = 0,99. "
                "P(S|+) = (0,98 × 0,01) / (0,98 × 0,01 + 0,03 × 0,99) "
                "= 0,0098 / (0,0098 + 0,0297) = 0,0098 / 0,0395 ≈ 0,248."
            ),
            "steps": [
                {"title": "Identifikasi probabilitas",
                 "details": ["P(+|S) = 0,98; P(S) = 0,01; P(+|¬S) = 0,03; P(¬S) = 0,99"]},
                {"title": "Rumus Bayes",
                 "details": ["P(S|+) = P(+|S)·P(S) / [P(+|S)·P(S) + P(+|¬S)·P(¬S)]"]},
                {"title": "Substitusi dan hitung",
                 "details": ["P(S|+) = (0,98×0,01) / (0,98×0,01 + 0,03×0,99) = 0,0098/0,0395 ≈ 0,248"]},
            ],
            "spoken": (
                "Gunakan teorema Bayes. "
                "Probabilitas positif jika sakit adalah nol koma sembilan delapan. "
                "Probabilitas sakit adalah nol koma nol satu. "
                "Probabilitas positif jika tidak sakit adalah nol koma nol tiga. "
                "Probabilitas tidak sakit adalah nol koma sembilan sembilan. "
                "Maka peluang sakit jika positif sama dengan nol koma nol sembilan delapan "
                "dibagi nol koma nol sembilan delapan ditambah nol koma nol dua sembilan tujuh, "
                "sama dengan nol koma nol sembilan delapan dibagi nol koma nol tiga sembilan lima, "
                "kira-kira nol koma dua empat delapan. Jawaban D."
            ),
        },
        {
            "nomor": 5,
            "elemen": "Trigonometri",
            "submateri": "Identitas dan jumlah sudut",
            "tipe": "PG",
            "level": "HOTS",
            "image_path": "images/tka12_q5_trigonometri.png",
            "pertanyaan": (
                "Nilai dari sin 10° + sin 50° + sin 130° + sin 170° adalah ..."
            ),
            "opsi": ["A. 2 cos 20°", "B. 2 sin 20°", "C. cos 20°",
                     "D. 2 cos 40°", "E. 0"],
            "jawaban_benar": "A",
            "pembahasan": (
                "Gunakan rumus jumlah sinus. "
                "(sin 10° + sin 170°) = 2 sin 90° cos 80° = 2 cos 80°. "
                "(sin 50° + sin 130°) = 2 sin 90° cos 40° = 2 cos 40°. "
                "Maka total = 2 cos 80° + 2 cos 40° = 2(cos 80° + cos 40°). "
                "Gunakan rumus cos A + cos B: "
                "cos 80° + cos 40° = 2 cos 60° cos 20° = 2 × 1/2 × cos 20° = cos 20°. "
                "Jadi total = 2 cos 20°."
            ),
            "steps": [
                {"title": "Kelompokkan dua-dua",
                 "details": ["(sin10°+sin170°) + (sin50°+sin130°)"]},
                {"title": "Gunakan rumus jumlah sinus",
                 "details": ["= 2sin90°cos80° + 2sin90°cos40° = 2cos80° + 2cos40°"]},
                {"title": "Gunakan rumus cos A + cos B",
                 "details": ["cos80° + cos40° = 2cos60°cos20° = cos20°"]},
                {"title": "Hasil akhir",
                 "details": ["Total = 2cos20°"]},
            ],
            "spoken": (
                "Kelompokkan dua-dua. Sinus sepuluh derajat ditambah sinus seratus tujuh puluh derajat "
                "sama dengan dua sinus sembilan puluh derajat kosinus delapan puluh derajat, "
                "sama dengan dua kosinus delapan puluh derajat. "
                "Sinus lima puluh derajat ditambah sinus seratus tiga puluh derajat "
                "sama dengan dua kosinus empat puluh derajat. "
                "Maka totalnya dua kosinus delapan puluh derajat ditambah dua kosinus empat puluh derajat. "
                "Gunakan rumus kosinus a ditambah kosinus b. "
                "Kosinus delapan puluh derajat ditambah kosinus empat puluh derajat "
                "sama dengan dua kosinus enam puluh derajat kosinus dua puluh derajat, "
                "sama dengan kosinus dua puluh derajat. "
                "Jadi totalnya dua kosinus dua puluh derajat. Jawaban A."
            ),
        },
        {
            "nomor": 6,
            "elemen": "Aljabar",
            "submateri": "Matriks dan operasinya",
            "tipe": "PG Kompleks",
            "level": "HOTS",
            "image_path": "images/tka12_q6_matriks.png",
            "pertanyaan": (
                "Diketahui matriks A = [[2, 1], [3, 4]] dan B = [[1, 0], [2, 3]]. "
                "Pilih SEMUA pernyataan yang benar."
            ),
            "opsi": [
                "A. Hasil perkalian AB = [[4, 3], [11, 12]].",
                "B. Determinan matriks A adalah 5.",
                "C. Determinan matriks B adalah 3.",
                "D. Berlaku AB = BA (perkalian matriks komutatif).",
                "E. Hasil penjumlahan A + B = [[3, 1], [5, 7]]."
            ],
            "jawaban_benar": ["A", "B", "C", "E"],
            "pembahasan": (
                "Hitung AB = [[2·1+1·2, 2·0+1·3], [3·1+4·2, 3·0+4·3]] = [[4, 3], [11, 12]] → A benar. "
                "det(A) = 2·4 − 1·3 = 5 → B benar. "
                "det(B) = 1·3 − 0·2 = 3 → C benar. "
                "BA = [[1·2+0·3, 1·1+0·4], [2·2+3·3, 2·1+3·4]] = [[2, 1], [13, 14]] ≠ AB → D salah. "
                "A + B = [[3, 1], [5, 7]] → E benar. "
                "Jadi jawaban benar: A, B, C, E."
            ),
            "steps": [
                {"title": "Hitung perkalian AB",
                 "details": ["AB = [[2·1+1·2, 2·0+1·3], [3·1+4·2, 3·0+4·3]] = [[4, 3], [11, 12]] → A benar"]},
                {"title": "Hitung determinan A dan B",
                 "details": ["det A = 2·4 − 1·3 = 5 (B benar); det B = 1·3 − 0·2 = 3 (C benar)"]},
                {"title": "Periksa apakah AB = BA",
                 "details": ["BA = [[2, 1], [13, 14]] ≠ AB → pernyataan D salah"]},
                {"title": "Hitung penjumlahan A + B",
                 "details": ["A + B = [[2+1, 1+0], [3+2, 4+3]] = [[3, 1], [5, 7]] → E benar"]},
                {"title": "Simpulkan jawaban akhir",
                 "details": ["Pernyataan BENAR: A, B, C, dan E"]},
            ],
            "spoken": (
                "Soal ini pilihan ganda kompleks, pilih semua jawaban yang benar. "
                "Hitung perkalian A B. Diperoleh matriks dua kali dua dengan entri empat, tiga, sebelas, dan dua belas. Jadi pernyataan A benar. "
                "Determinan A sama dengan dua kali empat dikurang satu kali tiga, hasilnya lima. Jadi pernyataan B benar. "
                "Determinan B sama dengan satu kali tiga dikurang nol kali dua, hasilnya tiga. Jadi pernyataan C benar. "
                "Periksa perkalian B A. Diperoleh matriks yang berbeda dari A B, sehingga perkalian matriks tidak komutatif. Jadi pernyataan D salah. "
                "Penjumlahan A ditambah B menghasilkan matriks tiga, satu, lima, tujuh. Jadi pernyataan E benar. "
                "Kesimpulannya, jawaban yang benar adalah A, B, C, dan E."
            ),
        },
    ],
}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(
        description="Generate Video Animasi Pembahasan TKA Matematika Kelas 12 - HOTS Tinggi"
    )
    parser.add_argument(
        "output", nargs="?",
        default=os.path.expanduser("~/vue-kim/public/videos/video_tka12_hots_6soal.mp4"),
        help="Path file video output mp4"
    )
    parser.add_argument("--bgm", default=None,
                        help="Path file musik/lagu background mp3 (opsional)")
    parser.add_argument("--vol", type=float, default=0.25,
                        help="Volume musik latar (default: 0.25)")
    parser.add_argument("--font-size", type=int, default=64,
                        help="Ukuran font utama teks soal dalam px")
    args = parser.parse_args()

    out_dir = os.path.dirname(args.output)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    make_animated_combined_video(
        data_soal,
        args.output,
        bgm_path=args.bgm,
        bgm_volume=args.vol,
        font_size=args.font_size
    )
