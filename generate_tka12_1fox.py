#!/usr/bin/env python3
import os
import sys
import re
import io
import random
import subprocess
import asyncio
from PIL import Image, ImageDraw, ImageFont
import numpy as np  # <-- TAMBAHAN: dibutuhkan oleh ensure_diagram_images_exist (q2 & q6)

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
    if not text:
        return ""
    text = latex_to_clean_text(text)
    text = text.replace('∘', ' bundaran ')
    text = text.replace('→', ' mendekati ')
    text = text.replace('lim(x mendekati', 'limit x mendekati ')
    text = text.replace('lim', 'limit ')
    text = text.replace('sin ', 'sinus ')
    text = text.replace('cos ', 'kosinus ')
    text = text.replace('tan ', 'tangen ')
    text = text.replace('≤', ' kurang dari sama dengan ')
    text = text.replace('≥', ' lebih dari sama dengan ')
    text = text.replace('≠', ' tidak sama dengan ')
    text = text.replace('±', ' plus minus ')
    text = re.sub(r'Rp\s*([\d\.]+),00', r'\1 rupiah', text)
    text = re.sub(r'Rp\s*([\d\.]+)', r'\1 rupiah', text)
    text = re.sub(r'(\d+)\s*[-–]\s*(\d+)', r'\1 sampai \2', text)
    text = re.sub(r'(\d+),(\d+)', r'\1 koma \2', text)
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
    text = text.replace('°', ' derajat ')
    text = text.replace('π', ' pi ')
    text = re.sub(r'(\d+)\^(\d+)', r'\1 pangkat \2', text)
    text = re.sub(r'(\d+)√(\d+)', r'\1 akar \2', text)
    text = text.replace('√', 'akar ')
    text = text.replace('×', ' kali ')
    text = text.replace('·', ' kali ')
    text = text.replace(' x ', ' kali ')
    text = re.sub(r'\s+:\s*', ' dibagi ', text)  # ':' operator (mis. "a : b", "120 : 20") -> dibagi
    text = text.replace(':', ' adalah ')  # ':' berdiri sendiri (mis. "Diketahui:") -> adalah
    text = text.replace(' + ', ' ditambah ')
    text = text.replace(' - ', ' dikurang ')
    text = text.replace(' − ', ' dikurang ')
    text = text.replace(' = ', ' sama dengan ')
    text = text.replace('=', ' sama dengan ')
    text = text.replace('≈', ' mendekati ')
    text = text.replace('/', ' per ')
    text = text.replace('cm³', ' sentimeter kubik ')
    text = text.replace('cm²', ' sentimeter persegi ')
    text = text.replace('cm', ' sentimeter ')
    text = text.replace('m²', ' meter persegi ')
    text = text.replace(' m ', ' meter ')
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\b(\w+)( \1\b)+', r'\1', text, flags=re.IGNORECASE)
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
        if item and os.path.exists(item) and os.path.isfile(item):
            return os.path.abspath(item)

    # 2. Cari di daftar folder direktori gambar (/sdcard/download dsb)
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
    """Membuat ilustrasi yang benar-benar sesuai dengan soal TKA Kelas 12.
    force=True  -> paksa regenerate agar gambar selalu up-to-date."""
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
    # SOAL 1 — Bilangan real & bentuk akar
    # =============================================================
    def q1(fig, ax):
        ax.axis("off")
        ax.text(0.5, 0.92,
                r"$a=\sqrt{7+4\sqrt{3}}\quad,\quad b=\sqrt{7-4\sqrt{3}}$",
                ha="center", va="center", fontsize=18, color="#FBBF24")
        ax.text(0.5, 0.66,
                r"$a^2+b^2=(7+4\sqrt{3})+(7-4\sqrt{3})=14$",
                ha="center", va="center", fontsize=15, color="#FFFFFF")
        ax.text(0.5, 0.46,
                r"$ab=\sqrt{(7+4\sqrt{3})(7-4\sqrt{3})}=\sqrt{49-48}=1$",
                ha="center", va="center", fontsize=15, color="#FFFFFF")
        ax.text(0.5, 0.20,
                r"$(a+b)^2=a^2+b^2+2ab=14+2=16$",
                ha="center", va="center", fontsize=17, color="#34D399",
                bbox=dict(boxstyle="round,pad=0.5",
                          facecolor="#064E3B", edgecolor="#10B981"))
    save_fig(os.path.join(target_dir, "tka12_q1_akar.png"), q1)

    # =============================================================
    # SOAL 2 — Fungsi kuadrat & optimasi pendapatan
    # =============================================================
    def q2(fig, ax):
        x = np.linspace(0, 60, 500)
        y = x * (120 - 2 * x)
        # daerah domain 20 <= x <= 50
        xr = np.linspace(20, 50, 300)
        yr = xr * (120 - 2 * xr)
        ax.fill_between(xr, 0, yr, color="#38BDF8", alpha=0.15,
                        label="Domain 20 ≤ x ≤ 50")
        ax.plot(x, y, color="#38BDF8", linewidth=3,
                label=r"$R(x)=x(120-2x)$")
        # titik puncak
        ax.axvline(30, color="#FBBF24", linestyle="--", linewidth=1.8)
        ax.scatter([30], [1800], s=180, color="#F43F5E", zorder=5,
                   edgecolors="white", linewidths=2)
        ax.annotate(r"Maksimum $(30,\;1800)$",
                    xy=(30, 1800), xytext=(40, 1450),
                    arrowprops=dict(arrowstyle="->", color="#F43F5E", lw=1.8),
                    fontsize=12, color="#FBBF24", fontweight="bold")
        ax.text(35, 350, "Harga optimal = Rp30.000",
                ha="center", fontsize=11, color="#FBBF24", style="italic")
        ax.set_xlabel("Harga paket x (ribu rupiah)", color="#E5E7EB", fontsize=12)
        ax.set_ylabel("Pendapatan R(x)", color="#E5E7EB", fontsize=12)
        ax.set_title("Model Pendapatan Harian Toko",
                     color="#FFFFFF", fontsize=14, fontweight="bold")
        ax.tick_params(colors="#9CA3AF")
        for s in ax.spines.values():
            s.set_color("#374151")
        ax.grid(True, alpha=0.25, color="#6B7280")
        ax.legend(loc="lower center", facecolor="#1F2937",
                  edgecolor="#374151", labelcolor="#E5E7EB", fontsize=10)
    save_fig(os.path.join(target_dir, "tka12_q2_fungsi.png"), q2)

    # =============================================================
    # SOAL 3 — Sudut elevasi menara (P dan Q)
    # =============================================================
    def q3(fig, ax):
        from matplotlib.patches import Arc
        H = 20 * np.sqrt(3)  # = 34.64 (tinggi menara)
        # tanah
        ax.plot([-8, 95], [0, 0], color="#9CA3AF", linewidth=2.5)
        # menara
        ax.plot([60, 60], [0, H], color="#F43F5E", linewidth=4.5)
        # titik P dan Q
        ax.scatter([0], [0], color="#FBBF24", s=110, zorder=5)
        ax.scatter([20], [0], color="#38BDF8", s=110, zorder=5)
        # garis pandang
        ax.plot([0, 60], [0, H], color="#FBBF24",
                linestyle="--", linewidth=2)
        ax.plot([20, 60], [0, H], color="#38BDF8",
                linestyle="--", linewidth=2)
        # busur sudut
        ax.add_patch(Arc((0, 0), 32, 32, theta1=0, theta2=30,
                         color="#FBBF24", linewidth=2))
        ax.add_patch(Arc((20, 0), 26, 26, theta1=0, theta2=60,
                         color="#38BDF8", linewidth=2))
        # label titik
        ax.text(-3, -6.5, "P", fontsize=15, color="#FBBF24",
                ha="center", fontweight="bold")
        ax.text(20, -6.5, "Q", fontsize=15, color="#38BDF8",
                ha="center", fontweight="bold")
        ax.text(60, H + 2.5, "Menara", fontsize=13, color="#F43F5E",
                ha="center", fontweight="bold")
        ax.text(9, 3.5, "30°", fontsize=13, color="#FBBF24", fontweight="bold")
        ax.text(27, 6, "60°", fontsize=13, color="#38BDF8", fontweight="bold")
        # tinggi h
        ax.annotate("", xy=(60, H), xytext=(60, 0),
                    arrowprops=dict(arrowstyle="<->", color="#E5E7EB", lw=1.5))
        ax.text(64, H / 2, "h", fontsize=14, color="#E5E7EB",
                va="center", style="italic")
        # jarak 40 m
        ax.annotate("", xy=(20, -3), xytext=(0, -3),
                    arrowprops=dict(arrowstyle="<->", color="#9CA3AF", lw=1.4))
        ax.text(10, -8, "40 m", fontsize=11, color="#9CA3AF", ha="center")
        ax.set_xlim(-12, 98)
        ax.set_ylim(-14, H + 12)
        ax.axis("off")
        ax.set_title("Sketsa Sudut Elevasi Menara\n"
                     r"(hasil: $h=20\sqrt{3}$ meter)",
                     color="#FFFFFF", fontsize=13, fontweight="bold")
    save_fig(os.path.join(target_dir, "tka12_q3_elevasi.png"), q3)

    # =============================================================
    # SOAL 4 — Diagram pohon peluang bersyarat
    # =============================================================
    def q4(fig, ax):
        ax.axis("off")
        ax.set_xlim(0, 1); ax.set_ylim(0, 1)
        # root
        ax.text(0.05, 0.5, "Siswa", fontsize=14, fontweight="bold",
                color="#FBBF24", ha="center", va="center",
                bbox=dict(boxstyle="round,pad=0.4",
                          facecolor="#1F2937", edgecolor="#FBBF24"))
        # cabang level 1
        ax.text(0.36, 0.80, "Olahraga", fontsize=12, color="#38BDF8",
                ha="center", fontweight="bold")
        ax.text(0.36, 0.20, "Tidak Olahraga", fontsize=12, color="#F87171",
                ha="center", fontweight="bold")
        ax.annotate("", xy=(0.28, 0.76), xytext=(0.13, 0.55),
                    arrowprops=dict(arrowstyle="->", color="#38BDF8", lw=1.8))
        ax.annotate("", xy=(0.28, 0.24), xytext=(0.13, 0.45),
                    arrowprops=dict(arrowstyle="->", color="#F87171", lw=1.8))
        ax.text(0.18, 0.72, "0,60", fontsize=10, color="#9CA3AF")
        ax.text(0.18, 0.28, "0,40", fontsize=10, color="#9CA3AF")
        # cabang level 2
        ax.text(0.74, 0.90, "Sains", fontsize=11, color="#34D399", ha="center")
        ax.text(0.74, 0.68, "Bukan Sains", fontsize=11, color="#9CA3AF", ha="center")
        ax.text(0.74, 0.32, "Sains", fontsize=11, color="#34D399", ha="center")
        ax.text(0.74, 0.10, "Bukan Sains", fontsize=11, color="#9CA3AF", ha="center")
        ax.annotate("", xy=(0.62, 0.87), xytext=(0.45, 0.78),
                    arrowprops=dict(arrowstyle="->", color="#34D399", lw=1.5))
        ax.annotate("", xy=(0.62, 0.67), xytext=(0.45, 0.76),
                    arrowprops=dict(arrowstyle="->", color="#9CA3AF", lw=1.5))
        ax.annotate("", xy=(0.62, 0.35), xytext=(0.45, 0.22),
                    arrowprops=dict(arrowstyle="->", color="#34D399", lw=1.5))
        ax.annotate("", xy=(0.62, 0.14), xytext=(0.45, 0.24),
                    arrowprops=dict(arrowstyle="->", color="#9CA3AF", lw=1.5))
        ax.text(0.53, 0.85, "0,40", fontsize=10, color="#9CA3AF")
        ax.text(0.53, 0.70, "0,60", fontsize=10, color="#9CA3AF")
        ax.text(0.53, 0.31, "0,25", fontsize=10, color="#9CA3AF")
        ax.text(0.53, 0.17, "0,75", fontsize=10, color="#9CA3AF")
        # highlight joint
        ax.text(0.99, 0.92, "P(O∩S) = 0,24", fontsize=10,
                color="#34D399", ha="right", fontweight="bold")
        ax.text(0.99, 0.34, "P(Oᶜ∩S) = 0,10", fontsize=10,
                color="#34D399", ha="right", fontweight="bold")
        ax.set_title("Diagram Pohon Peluang Bersyarat\n"
                     r"$P(O|S)=\frac{0{,}24}{0{,}34}=\frac{12}{17}$",
                     color="#FFFFFF", fontsize=13, fontweight="bold", pad=8)
    save_fig(os.path.join(target_dir, "tka12_q4_peluang.png"), q4)

    # =============================================================
    # SOAL 5 — Identitas trigonometri sudut ganda
    # =============================================================
    def q5(fig, ax):
        ax.axis("off")
        ax.text(0.5, 0.92,
                r"Diketahui: $\;\sin\theta+\cos\theta=\sqrt{\frac{3}{2}}$",
                ha="center", va="center", fontsize=16, color="#FBBF24")
        ax.text(0.5, 0.72,
                r"Kuadratkan:$\;(\sin\theta+\cos\theta)^2=\frac{3}{2}$",
                ha="center", va="center", fontsize=14, color="#FFFFFF")
        ax.text(0.5, 0.52,
                r"$\sin^2\theta+\cos^2\theta+2\sin\theta\cos\theta=\frac{3}{2}$",
                ha="center", va="center", fontsize=13, color="#FFFFFF")
        ax.text(0.5, 0.33,
                r"$1+2\sin\theta\cos\theta=\frac{3}{2}$",
                ha="center", va="center", fontsize=14, color="#FFFFFF")
        ax.text(0.5, 0.10,
                r"$\sin 2\theta=2\sin\theta\cos\theta=\frac{1}{2}$",
                ha="center", va="center", fontsize=16, color="#34D399",
                bbox=dict(boxstyle="round,pad=0.5",
                          facecolor="#064E3B", edgecolor="#10B981"))
    save_fig(os.path.join(target_dir, "tka12_q5_trigonometri.png"), q5)

    # =============================================================
    # SOAL 6 — Statistika: dot plot + boxplot + mean/median/modus
    # =============================================================
    def q6(fig, ax):
        data = np.array([40, 45, 50, 50, 55, 60, 65, 75], dtype=float)
        mean = data.mean()
        median = np.median(data)
        mode = 50.0
        rng = data.max() - data.min()

        # dot plot (di atas)
        for i, v in enumerate(data):
            jitter = ((i % 3) - 1) * 0.15
            ax.scatter(v, 1.10 + jitter, s=180, color="#38BDF8",
                       edgecolors="white", linewidths=1.5, zorder=4)
        # boxplot (di bawah)
        ax.boxplot(data, vert=False, positions=[0.45], widths=0.28,
                   patch_artist=True,
                   boxprops=dict(facecolor="#1F2937",
                                 edgecolor="#FBBF24", linewidth=1.6),
                   medianprops=dict(color="#F43F5E", linewidth=2.5),
                   whiskerprops=dict(color="#FBBF24", linewidth=1.6),
                   capprops=dict(color="#FBBF24", linewidth=1.6),
                   flierprops=dict(marker="o", markerfacecolor="#F87171"))
        # garis statistik
        ax.axvline(mean, color="#34D399", linestyle="--", linewidth=2,
                   label=f"Rata-rata = {mean:.0f}")
        ax.axvline(median, color="#F43F5E", linestyle="--", linewidth=2,
                   label=f"Median = {median:.1f}")
        ax.axvline(mode, color="#FBBF24", linestyle=":", linewidth=2,
                   label=f"Modus = {mode:.0f}")
        # anotasi jangkauan
        ax.annotate("", xy=(40, 1.55), xytext=(75, 1.55),
                    arrowprops=dict(arrowstyle="<->",
                                    color="#A78BFA", lw=1.8))
        ax.text(57.5, 1.60, f"Jangkauan = {rng:.0f}",
                ha="center", fontsize=11, color="#A78BFA", fontweight="bold")
        ax.set_xlim(35, 80)
        ax.set_ylim(-0.15, 1.80)
        ax.set_yticks([])
        ax.set_xlabel("Waktu penyelesaian (menit)",
                      color="#E5E7EB", fontsize=12)
        ax.set_title("Sebaran Data Waktu Penyelesaian 8 Peserta",
                     color="#FFFFFF", fontsize=14, fontweight="bold")
        ax.tick_params(colors="#9CA3AF")
        for s in ax.spines.values():
            s.set_color("#374151")
        ax.grid(True, axis="x", alpha=0.25, color="#6B7280")
        ax.legend(loc="lower right", facecolor="#1F2937",
                  edgecolor="#374151", labelcolor="#E5E7EB", fontsize=10)
    save_fig(os.path.join(target_dir, "tka12_q6_data.png"), q6)


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
        {
            "title": f"Identifikasi Konsep {submateri}",
            "details": [
                f"• Materi Pokok: {soal.get('elemen', 'Matematika')} - {submateri}",
                "• Pahami informasi dan kondisi yang diberikan pada soal secara cermat."
            ],
            "spoken": f"Konsep yang digunakan adalah {submateri}. Mari kita analisis informasi yang diketahui pada soal."
        },
        {
            "title": "Langkah Perhitungan & Analisis",
            "details": [
                f"• {pembahasan}"
            ],
            "spoken": f"Langkah penyelesaiannya: {text_to_spoken(pembahasan)}"
        },
        {
            "title": "Tantangan Untuk Kamu",
            "details": [
                "★ Berdasarkan langkah perhitungan di atas, apa pilihan jawabanmu?",
                "★ Tuliskan jawaban yang paling tepat di kolom komentar sekarang!"
            ],
            "spoken": "Nah, dari langkah perhitungan tersebut, manakah pilihan jawaban yang paling tepat? Yuk, tuliskan jawabanmu di kolom komentar ya!"
        }
    ]


def draw_colorful_background(draw, width=WIDTH, height=HEIGHT):
    """Membuat latar belakang multi-warna dinamis (gradasi estetik dan lingkaran cahaya neon)."""
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

    # Top Header: Profile + Topic
    draw_rounded_rect(draw, (40, 60, 480, 150), radius=24, fill="#121829", outline="#3B82F6", width=2)
    draw.text((65, 85), f"♫ {question_data.get('account', '@pairzal')}", font=get_font(FS_BADGE, bold=True), fill="#FFFFFF")

    draw_rounded_rect(draw, (505, 60, WIDTH - 40, 150), radius=24, fill="#121829", outline="#3B82F6", width=2)
    submateri = question_data.get('submateri') or question_data.get('subtopic') or question_data.get('elemen', 'Bilangan')
    soal_num = question_data.get('nomor') or question_data.get('id', 1)
    tag_text = f"SOAL #{soal_num}  •  {submateri.upper()}"

    img_src = question_data.get('image_path') or question_data.get('image') or question_data.get('gambar')
    # [DIUBAH] max_h diperbesar 280 -> 340 agar grafik lebih terbaca
    chart_img = load_and_fit_image(img_src, max_w=940, max_h=340, soal_id=soal_num)

    card_top = 175
    # [DIUBAH] card_bottom 990 -> 1050 agar ruang grafik lebih lega
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
    step_scale = font_size / 64.0
    FS_HEADER = max(24, round(32 * step_scale))
    FS_TAG = max(22, round(28 * step_scale))
    FS_QTEXT = max(28, round(40 * step_scale))
    FS_ANSWER = 36   # Badge tantangan interaktif
    FS_DIALOG = max(26, round(34 * step_scale))
    FS_CONCL = max(28, round(36 * step_scale))

    steps = build_steps_if_needed(question_data)
    num_steps = max(1, len(steps))

    if num_steps >= 5:
        FS_STEPTITLE = 28
        FS_DETAIL = 24
        FS_STEPBADGE = 22
        gap = 10
    elif num_steps == 4:
        FS_STEPTITLE = 32
        FS_DETAIL = 28
        FS_STEPBADGE = 24
        gap = 12
    else:
        FS_STEPTITLE = 40
        FS_DETAIL = 36
        FS_STEPBADGE = 26
        gap = 16

    img = Image.new("RGB", (WIDTH, HEIGHT), "#070B19")
    draw = ImageDraw.Draw(img)

    draw_colorful_background(draw, WIDTH, HEIGHT)

    # Top Header
    draw_rounded_rect(draw, (40, 45, 470, 130), radius=22, fill="#121829", outline="#3B82F6", width=2)
    draw.text((65, 68), f"♫ {question_data.get('account', '@pairzal')}", font=get_font(FS_HEADER, bold=True), fill="#FFFFFF")

    draw_rounded_rect(draw, (495, 45, WIDTH - 40, 130), radius=22, fill="#121829", outline="#3B82F6", width=2)
    draw.text((520, 68), "★ Pembahasan TKA Matematika", font=get_font(FS_HEADER, bold=True), fill="#FFFFFF")

    card_top = 150
    card_bottom = 460
    draw_rounded_rect(draw, (40, card_top, WIDTH - 40, card_bottom), radius=22, fill="#111827", outline="#4F46E5", width=2)

    submateri = question_data.get('submateri') or question_data.get('subtopic') or question_data.get('elemen', 'Bilangan')
    soal_num = question_data.get('nomor') or question_data.get('id', 1)
    tag_soal = f"SOAL #{soal_num} | {submateri.upper()}"
    draw.text((65, card_top + 20), tag_soal, font=get_font(FS_TAG, bold=True), fill="#9CA3AF")

    q_text = question_data.get('soal') or question_data.get('pertanyaan') or question_data.get('question', '')
    clean_q = latex_to_clean_text(q_text)

    img_src = question_data.get('image_path') or question_data.get('image') or question_data.get('gambar')
    thumb_img = load_and_fit_image(img_src, max_w=220, max_h=145, soal_id=soal_num) if img_src else None

    text_max_w = (WIDTH - 380) if thumb_img else (WIDTH - 150)
    q_font = get_font(FS_QTEXT, bold=True)
    q_lines = wrap_text(clean_q, q_font, text_max_w)
    q_line_h = round(FS_QTEXT * 1.28)
    y_q = card_top + 65
    for line in q_lines[:3]:
        draw_math_line(img, draw, (65, y_q), line, q_font, FS_QTEXT, fill="#FFFFFF", max_width=text_max_w)
        y_q += q_line_h

    if thumb_img:
        img.paste(thumb_img, (WIDTH - 40 - thumb_img.width - 20, card_top + 20), thumb_img)

    ans_text = "💬 TANTANGAN: Tulis Jawabanmu di Komentar!"
    draw_rounded_rect(draw, (65, card_bottom - 78, WIDTH - 65, card_bottom - 12), radius=16, fill="#1F2937", outline="#F59E0B", width=1)
    draw_math_line(img, draw, (85, card_bottom - 68), ans_text, get_font(FS_ANSWER, bold=True), FS_ANSWER, fill="#FBBF24", max_width=WIDTH - 190)

    dlg_top, dlg_bottom = 480, 560
    draw_rounded_rect(draw, (40, dlg_top, WIDTH - 40, dlg_bottom), radius=18, fill="#111827", outline="#374151", width=2)
    draw.text((65, dlg_top + 24), "Budi: \"Konsep apa yang digunakan, Pak Irzal?\"", font=get_font(FS_DIALOG, bold=True), fill="#93C5FD")

    s_top = 580
    s_bottom = 1730
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

        badge_h = min(48, max(36, step_h // 5))
        draw_rounded_rect(draw, (65, sy_start + 14, 290, sy_start + 14 + badge_h), radius=12, fill="#1F2937")
        draw.text((80, sy_start + 14 + (badge_h - FS_STEPBADGE) // 2), f"LANGKAH {idx + 1}", font=get_font(FS_STEPBADGE, bold=True), fill="#93C5FD")

        step_title = step.get('title', '')
        clean_title = latex_to_clean_text(step_title)
        title_font = get_font(FS_STEPTITLE, bold=True)
        title_lines = wrap_text(clean_title, title_font, WIDTH - 310 - 65)
        title_line_h = round(FS_STEPTITLE * 1.15)
        y_title = sy_start + 16
        for t_line in title_lines[:2]:
            draw.text((305, y_title), t_line, font=title_font, fill="#FFFFFF")
            y_title += title_line_h

        cur_detail_y = max(sy_start + 18 + badge_h + 8, y_title + 8)
        line_detail_font = get_font(FS_DETAIL, bold=False)
        line_detail_bold = get_font(FS_DETAIL, bold=True)
        detail_spacing = round(FS_DETAIL * 1.25)

        for line in step.get('details', []):
            clean_line = latex_to_clean_text(line)
            is_highlight = clean_line.startswith("★") or "Hasil =" in clean_line or "BENAR" in clean_line or "Total =" in clean_line or "Kunci =" in clean_line

            line_font = line_detail_bold if is_highlight else line_detail_font
            wrapped_lines = wrap_text(clean_line, line_font, WIDTH - 140)
            for w_line in wrapped_lines:
                if cur_detail_y + detail_spacing <= sy_end - 10:
                    draw_math_line(img, draw, (70, cur_detail_y), w_line, line_font, FS_DETAIL, fill="#FFFFFF", max_width=WIDTH - 150)
                    cur_detail_y += detail_spacing
            cur_detail_y += 4

    if active_step_idx >= len(steps) - 1:
        draw_rounded_rect(draw, (40, 1750, WIDTH - 40, 1900), radius=18, fill="#111827", outline="#F59E0B", width=2)
        draw.text((75, 1768), "TANTANGAN MENJAWAB:", font=get_font(FS_TAG, bold=True), fill="#FBBF24")
        concl_font = get_font(FS_CONCL, bold=True)
        concl_text = "Yuk, tuliskan pilihan jawaban yang tepat di kolom komentar!"
        concl_line_h = round(FS_CONCL * 1.25)
        c_lines = wrap_text(concl_text, concl_font, WIDTH - 140)
        y_c = 1806
        for cl in c_lines[:2]:
            draw_math_line(img, draw, (75, y_c), cl, concl_font, FS_CONCL, fill="#FFFFFF", max_width=WIDTH - 150)
            y_c += concl_line_h

    draw_footer_watermark(draw, y_pos=1910)
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

    sub_font = get_font(40, bold=True)
    sub_text = f"🔥 Pembahasan & Kuis {jumlah_soal} Soal 🔥"
    bbox = sub_font.getbbox(sub_text)
    w = bbox[2] - bbox[0]
    draw_rounded_rect(draw, ((WIDTH - w) / 2 - 35, y + 15, (WIDTH + w) / 2 + 35, y + 85), radius=30, fill="#FE2C55")
    draw.text(((WIDTH - w) / 2, y + 30), sub_text, font=sub_font, fill="#FFFFFF")

    # Info banner below
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

    # Variasi kecil & acak pada pitch/rate tiap kalimat supaya intonasi
    # tidak terdengar datar/berulang seperti robot, tapi tetap wajar.
    if is_budi:
        pitch_hz = 12 + random.uniform(-2, 3)   # suara Budi (murid): lebih ceria, sedikit lebih tinggi
        rate_pct = 3 + random.uniform(-2, 3)
    else:
        pitch_hz = random.uniform(-2, 4)        # suara Pak Irzal (guru): natural, tempo tenang seperti menjelaskan
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

    # Fallback jika offline/tidak ada koneksi TTS: buat audio hening 1 detik
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
    # Daftar prioritas lagu gratis / bebas royalti (Royalty-Free & Public Domain)
    free_bgm_candidates = [
        custom_bgm,
        "/root/vue-kim/bgm/lofi_study.mp3",
        "/root/bgm_canon_in_d.mp3",
        "/root/vue-kim/bgm/canon_in_d.mp3",
        "/root/bgm_dream_catcher.mp3",
        "/root/vue-kim/bgm_dream_catcher.mp3",
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

    # Fallback synthesizer ambient otomatis bebas hak cipta 100%
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

    # Pastikan gambar ilustrasi sesuai soal telah tersedia.
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
# ============================================================
# DATA SOAL TKA MATEMATIKA KELAS 12 - HOTS
# 5 Pilihan Ganda + 1 Pilihan Ganda Kompleks
# ============================================================
data_soal = {
    "judul": "Latihan Soal TKA Matematika Kelas 12 - HOTS",
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
            "submateri": "Bilangan real dan bentuk akar",
            "tipe": "PG",
            "level": "HOTS",
            "image_path": "images/tka12_q1_akar.png",
            "pertanyaan": (
                "Dalam suatu perhitungan teknik diperoleh "
                "a = √(7 + 4√3) dan b = √(7 − 4√3). "
                "Tanpa menghitung nilai a dan b secara desimal, "
                "tentukan nilai dari (a + b)²."
            ),
            "opsi": ["A. 8", "B. 10", "C. 12", "D. 14", "E. 16"],
            "jawaban_benar": "E",
            "pembahasan": (
                "Gunakan identitas (a + b)² = a² + b² + 2ab. "
                "Diperoleh a² + b² = 14. "
                "Selanjutnya ab = √[(7 + 4√3)(7 − 4√3)] = √(49 − 48) = 1. "
                "Maka (a + b)² = 14 + 2(1) = 16. Jadi jawaban E."
            ),
            "steps": [
                {"title": "Gunakan identitas kuadrat jumlah",
                 "details": ["(a + b)² = a² + b² + 2ab"]},
                {"title": "Hitung a² + b²",
                 "details": ["(7 + 4√3) + (7 − 4√3) = 14"]},
                {"title": "Hitung hasil kali ab",
                 "details": ["ab = √(49 − 48) = 1"]},
                {"title": "Tentukan hasil akhir",
                 "details": ["(a + b)² = 14 + 2 = 16"]},
            ],
            "spoken": (
                "Gunakan identitas kuadrat jumlah. A kuadrat ditambah B kuadrat sama dengan empat belas. "
                "A kali B sama dengan satu. Jadi A tambah B kuadrat sama dengan enam belas. Jawaban E."
            ),
        },
        {
            "nomor": 2,
            "elemen": "Aljabar",
            "submateri": "Fungsi kuadrat dan optimasi",
            "tipe": "PG",
            "level": "HOTS",
            "image_path": "images/tka12_q2_fungsi.png",
            "pertanyaan": (
                "Sebuah toko menjual paket alat tulis. Jika harga sebuah paket "
                "ditetapkan x ribu rupiah, banyak paket yang terjual diperkirakan "
                "120 − 2x paket per hari, dengan 20 ≤ x ≤ 50. "
                "Pendapatan harian R(x) = x(120 − 2x). "
                "Agar pendapatan maksimum, harga paket harus ditetapkan sebesar ..."
            ),
            "opsi": ["A. Rp20.000", "B. Rp25.000", "C. Rp30.000", "D. Rp35.000", "E. Rp40.000"],
            "jawaban_benar": "C",
            "pembahasan": (
                "R(x) = −2x² + 120x. Karena koefisien x² negatif, "
                "nilai maksimum terjadi di titik puncak. "
                "x = −b/(2a) = −120/[2(−2)] = 30. "
                "Jadi harga yang menghasilkan pendapatan maksimum adalah Rp30.000."
            ),
            "steps": [
                {"title": "Bentuk fungsi pendapatan",
                 "details": ["R(x) = x(120 − 2x) = −2x² + 120x"]},
                {"title": "Identifikasi titik maksimum",
                 "details": ["Parabola membuka ke bawah karena a = −2"]},
                {"title": "Hitung absis titik puncak",
                 "details": ["x = −b/(2a) = 30"]},
                {"title": "Tentukan harga",
                 "details": ["x = 30 berarti Rp30.000"]},
            ],
            "spoken": (
                "Fungsi pendapatan berbentuk kuadrat dengan koefisien utama negatif. "
                "Maksimum terjadi di titik puncak. Nilai x adalah tiga puluh. "
                "Jadi harga paket yang optimal adalah tiga puluh ribu rupiah. Jawaban C."
            ),
        },
        {
            "nomor": 3,
            "elemen": "Geometri dan Pengukuran",
            "submateri": "Trigonometri dalam geometri",
            "tipe": "PG",
            "level": "HOTS",
            "image_path": "images/tka12_q3_elevasi.png",
            "pertanyaan": (
                "Sebuah menara vertikal berdiri tegak di atas tanah datar. "
                "Dari titik P, sudut elevasi ke puncak menara adalah 30°. "
                "Ketika pengamat bergerak 40 meter mendekati menara ke titik Q, "
                "sudut elevasi berubah menjadi 60°. Jika tinggi mata diabaikan, "
                "tinggi menara tersebut adalah ..."
            ),
            "opsi": ["A. 10√3 meter", "B. 20√3 meter", "C. 30√3 meter",
                     "D. 40√3 meter", "E. 60√3 meter"],
            "jawaban_benar": "B",
            "pembahasan": (
                "Misalkan jarak Q ke kaki menara adalah x. Dari Q, "
                "tan 60° = h/x sehingga h = x√3. Dari P, "
                "tan 30° = h/(x + 40), sehingga h = (x + 40)/√3. "
                "Samakan: x√3 = (x + 40)/√3. Diperoleh 3x = x + 40, "
                "sehingga x = 20. Maka h = 20√3 meter. Jawaban B."
            ),
            "steps": [
                {"title": "Modelkan dari titik Q",
                 "details": ["tan 60° = h/x → h = x√3"]},
                {"title": "Modelkan dari titik P",
                 "details": ["tan 30° = h/(x + 40)"]},
                {"title": "Samakan kedua bentuk tinggi",
                 "details": ["x√3 = (x + 40)/√3 → 3x = x + 40"]},
                {"title": "Tentukan tinggi menara",
                 "details": ["x = 20 dan h = 20√3 meter"]},
            ],
            "spoken": (
                "Dari titik Q, tangen enam puluh derajat menghasilkan h sama dengan x akar tiga. "
                "Dari titik P, tangen tiga puluh derajat menghasilkan h sama dengan x ditambah empat puluh, "
                "dibagi akar tiga. Setelah disamakan, x sama dengan dua puluh. "
                "Jadi tinggi menara dua puluh akar tiga meter. Jawaban B."
            ),
        },
        {
            "nomor": 4,
            "elemen": "Data dan Peluang",
            "submateri": "Peluang bersyarat",
            "tipe": "PG",
            "level": "HOTS",
            "image_path": "images/tka12_q4_peluang.png",
            "pertanyaan": (
                "Dalam sebuah sekolah, 60% siswa mengikuti klub olahraga. "
                "Dari siswa yang mengikuti klub olahraga, 40% juga mengikuti klub sains. "
                "Dari siswa yang tidak mengikuti klub olahraga, 25% mengikuti klub sains. "
                "Jika seorang siswa diketahui mengikuti klub sains, peluang ia juga "
                "mengikuti klub olahraga adalah ..."
            ),
            "opsi": ["A. 24/31", "B. 12/17", "C. 8/13", "D. 3/5", "E. 2/3"],
            "jawaban_benar": "B",
            "pembahasan": (
                "P(O ∩ S) = 0,60 × 0,40 = 0,24. "
                "P(Oᶜ ∩ S) = 0,40 × 0,25 = 0,10. "
                "Jadi P(S) = 0,34. Maka P(O|S) = 0,24/0,34 = 12/17. Jawaban B."
            ),
            "steps": [
                {"title": "Peluang olahraga dan sains",
                 "details": ["P(O ∩ S) = 0,60 × 0,40 = 0,24"]},
                {"title": "Peluang nonolahraga dan sains",
                 "details": ["P(Oᶜ ∩ S) = 0,40 × 0,25 = 0,10"]},
                {"title": "Peluang mengikuti sains",
                 "details": ["P(S) = 0,24 + 0,10 = 0,34"]},
                {"title": "Peluang bersyarat",
                 "details": ["P(O|S) = 0,24/0,34 = 12/17"]},
            ],
            "spoken": (
                "Peluang olahraga dan sains adalah nol koma dua empat. "
                "Peluang nonolahraga dan sains adalah nol koma satu. "
                "Jadi peluang sains nol koma tiga empat. "
                "Maka peluang olahraga jika diketahui sains adalah dua belas per tujuh belas. Jawaban B."
            ),
        },
        {
            "nomor": 5,
            "elemen": "Trigonometri",
            "submateri": "Identitas trigonometri sudut ganda",
            "tipe": "PG",
            "level": "HOTS",
            "image_path": "images/tka12_q5_trigonometri.png",
            "pertanyaan": (
                "Untuk suatu sudut θ dengan 0° < θ < 90° diketahui "
                "sin θ + cos θ = √(3/2). Nilai sin 2θ adalah ..."
            ),
            "opsi": ["A. −1/2", "B. 0", "C. 1/2", "D. √3/2", "E. 1"],
            "jawaban_benar": "C",
            "pembahasan": (
                "Kuadratkan kedua ruas. Diperoleh "
                "(sin θ + cos θ)² = 3/2. "
                "Karena sin²θ + cos²θ = 1, maka "
                "1 + 2sinθ cosθ = 3/2. "
                "Jadi 2sinθ cosθ = 1/2. "
                "Dengan identitas sin 2θ = 2sinθ cosθ, diperoleh sin 2θ = 1/2. Jawaban C."
            ),
            "steps": [
                {"title": "Kuadratkan persamaan",
                 "details": ["(sin θ + cos θ)² = 3/2"]},
                {"title": "Gunakan identitas dasar",
                 "details": ["sin²θ + cos²θ = 1"]},
                {"title": "Sederhanakan",
                 "details": ["1 + 2sinθ cosθ = 3/2"]},
                {"title": "Gunakan identitas sudut ganda",
                 "details": ["sin 2θ = 2sinθ cosθ = 1/2"]},
            ],
            "spoken": (
                "Kuadratkan kedua ruas. Diperoleh satu ditambah dua sinus teta kosinus teta "
                "sama dengan tiga per dua. Jadi dua sinus teta kosinus teta sama dengan satu per dua. "
                "Karena sinus dua teta sama dengan dua sinus teta kosinus teta, jawabannya satu per dua. Jawaban C."
            ),
        },
        {
            "nomor": 6,
            "elemen": "Data dan Peluang",
            "submateri": "Statistika dan penalaran data",
            "tipe": "PG Kompleks",
            "level": "HOTS",
            "image_path": "images/tka12_q6_data.png",
            "pertanyaan": (
                "Sebuah perusahaan mencatat waktu dalam menit yang diperlukan "
                "oleh delapan peserta untuk menyelesaikan suatu tugas: "
                "40, 45, 50, 50, 55, 60, 65, dan 75. "
                "Pilih SEMUA pernyataan yang benar."
            ),
            "opsi": [
                "A. Rata-rata waktu penyelesaian adalah 55 menit.",
                "B. Median waktu penyelesaian adalah 52,5 menit.",
                "C. Modus data adalah 50 menit.",
                "D. Jangkauan data adalah 35 menit.",
                "E. Jika waktu peserta tercepat dihapus, rata-rata data baru lebih dari 57 menit."
            ],
            "jawaban_benar": ["A", "B", "C", "D", "E"],
            "pembahasan": (
                "Jumlah data = 440 sehingga rata-rata = 440/8 = 55. "
                "Median = (50 + 55)/2 = 52,5. Modus = 50. "
                "Jangkauan = 75 − 40 = 35. "
                "Jika 40 dihapus, jumlah data menjadi 400 untuk tujuh data, "
                "sehingga rata-rata baru = 400/7 ≈ 57,14, lebih dari 57. "
                "Jadi A, B, C, D, dan E semuanya benar."
            ),
            "steps": [
                {"title": "Hitung jumlah dan rata-rata",
                 "details": ["Jumlah = 440 dan rata-rata = 440/8 = 55"]},
                {"title": "Tentukan median",
                 "details": ["Median = (50 + 55)/2 = 52,5"]},
                {"title": "Tentukan modus dan jangkauan",
                 "details": ["Modus = 50 dan jangkauan = 75 − 40 = 35"]},
                {"title": "Uji pernyataan E",
                 "details": ["Setelah 40 dihapus, rata-rata = 400/7 ≈ 57,14 > 57"]},
            ],
            "spoken": (
                "Soal ini memiliki lebih dari satu jawaban benar. "
                "Rata-rata lima puluh lima, median lima puluh dua koma lima, "
                "modus lima puluh, dan jangkauan tiga puluh lima. "
                "Setelah empat puluh dihapus, rata-rata menjadi sekitar lima puluh tujuh koma empat belas. "
                "Jadi A, B, C, D, dan E benar."
            ),
        },
    ],
}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(
        description="Generate Video Animasi Pembahasan TKA Matematika Kelas 12 - HOTS"
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
