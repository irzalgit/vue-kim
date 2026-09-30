#!/usr/bin/env python3
import os
import sys
import re
import io
import random
import subprocess
import asyncio
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

# Font bergaya tulisan tangan, dipakai khusus untuk animasi "sedang ditulis pena"
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


def get_hand_font(size, bold=False):
    """Font bergaya tulisan tangan (Kalam), dipakai saat teks sedang 'ditulis' animasi pena."""
    target = FONT_HAND_BOLD if bold else FONT_HAND
    if target and os.path.exists(target):
        try:
            return ImageFont.truetype(target, size)
        except Exception:
            pass
    return get_font(size, bold=bold)


def draw_pen_tip(draw, x, y, color="#F59E0B"):
    """Menggambar ikon ujung pena kecil di titik (x, y) sebagai penanda posisi 'sedang menulis'."""
    bx1, by1 = x - 2, y + 15
    bx2, by2 = x + 13, y - 15
    draw.line([(bx1, by1), (bx2, by2)], fill="#E5E7EB", width=7)
    draw.line([(bx1, by1), (bx2, by2)], fill=color, width=3)
    draw.ellipse([x - 4, y - 4, x + 4, y + 4], fill=color)


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


def ensure_diagram_images_exist():
    """Menyiapkan gambar ilustrasi diagram matematika jika belum ada di /sdcard/download/"""
    target_dir = "/sdcard/download"
    if not os.path.exists(target_dir):
        try:
            os.makedirs(target_dir, exist_ok=True)
        except Exception:
            target_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images")
            os.makedirs(target_dir, exist_ok=True)

    # 1. Diagram Silo (Geometri Soal 3)
    p_silo = os.path.join(target_dir, "img_geometri_silo.png")
    if not os.path.exists(p_silo):
        try:
            from matplotlib.patches import Rectangle, Polygon, Ellipse
            fig, ax = plt.subplots(figsize=(6, 3.5), dpi=150)
            fig.patch.set_facecolor('#111827')
            ax.set_facecolor('#111827')
            rect = Rectangle((-3.5, 0), 7, 10, linewidth=2, edgecolor='#38BDF8', facecolor='#1E293B')
            ax.add_patch(rect)
            el_bot = Ellipse((0, 0), 7, 1.6, linewidth=2, edgecolor='#38BDF8', facecolor='#1E293B')
            ax.add_patch(el_bot)
            el_mid = Ellipse((0, 10), 7, 1.6, linewidth=2, edgecolor='#38BDF8', facecolor='#334155')
            ax.add_patch(el_mid)
            cone = Polygon([(-3.5, 10), (0, 16), (3.5, 10)], closed=True, linewidth=2, edgecolor='#F59E0B', facecolor='#1E293B')
            ax.add_patch(cone)
            ax.plot([0, 3.5], [10, 10], color='#FBBF24', linestyle='--', linewidth=2)
            ax.text(1.75, 10.4, 'r = 7 m', color='#FBBF24', fontsize=12, fontweight='bold', ha='center')
            ax.annotate('', xy=(4.2, 0), xytext=(4.2, 10), arrowprops=dict(arrowstyle='<->', color='#38BDF8', lw=2))
            ax.text(4.5, 5, 't_tabung = 10 m', color='#38BDF8', fontsize=11, fontweight='bold', va='center')
            ax.annotate('', xy=(4.2, 10), xytext=(4.2, 16), arrowprops=dict(arrowstyle='<->', color='#F59E0B', lw=2))
            ax.text(4.5, 13, 't_kerucut = 6 m', color='#F59E0B', fontsize=11, fontweight='bold', va='center')
            ax.set_xlim(-5.5, 9.5)
            ax.set_ylim(-1.5, 17.5)
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
    chart_img = load_and_fit_image(img_src, max_w=940, max_h=280, soal_id=soal_num)

    card_top = 175
    card_bottom = 990 if chart_img else 830
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


def create_step_frame(question_data, active_step_idx=0, font_size=64, write_progress=None):
    """write_progress: None = tampilan normal (statis) seperti biasa.
    Jika berupa angka 0.0-1.0, detail pada langkah aktif digambar bertahap
    (efek 'sedang ditulis pena') memakai font tulisan tangan, dengan
    indikator ujung pena di posisi terakhir yang sudah ditulis."""
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

        if is_active and write_progress is not None:
            # --- Mode animasi: teks langkah ini "ditulis" bertahap pakai font tulisan tangan ---
            hand_font = get_hand_font(FS_DETAIL + 2, bold=False)
            wrapped_all = []
            for line in step.get('details', []):
                clean_line = latex_to_clean_text(line)
                wrapped_all.extend(wrap_text(clean_line, hand_font, WIDTH - 140))

            total_len = sum(len(l) + 1 for l in wrapped_all) or 1
            progress = max(0.0, min(1.0, write_progress))
            target_count = int(round(total_len * progress))

            cum = 0
            pen_xy = None
            for w_line in wrapped_all:
                if cur_detail_y + detail_spacing > sy_end - 10:
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
        "/root/vue-kim/bgm_canon_in_d.mp3",
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
        judul = data_soal_obj.get('judul', "Latihan Soal Persiapan TKA Matematika SMP (Versi Duplikat B)")
        daftar_soal = data_soal_obj.get('soal', [])
    else:
        judul = "Latihan Soal Persiapan TKA Matematika SMP (Versi Duplikat B)"
        daftar_soal = data_soal_obj

    temp_dir = "/tmp/video_render_tka12_1"
    os.makedirs(temp_dir, exist_ok=True)

    # Pastikan gambar ilustrasi diagram telah siap di /sdcard/download/
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
        # Langkah dengan indeks < HANDWRITING_STEP_LIMIT dianimasikan seolah ditulis pena;
        # sisanya (Langkah 4 dst.) tetap tampil statis seperti semula.
        HANDWRITING_STEP_LIMIT = 3
        for step_idx, step in enumerate(steps):
            is_handwriting_step = step_idx < HANDWRITING_STEP_LIMIT
            print(f"  -> Animasi Langkah {step_idx + 1}/{len(steps)}"
                  f"{' (mode tulisan tangan)' if is_handwriting_step else ''}...")

            # Frame final (versi bersih/selesai) - selalu dibuat, dipakai sbg referensi & thumbnail akhir
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

            if not is_handwriting_step:
                # --- Perilaku asli: satu gambar statis dipegang selama audio berlangsung ---
                subprocess.run(
                    f"ffmpeg -y -loop 1 -i {step_img_path} -i {step_audio_path} "
                    f"-c:v libx264 -preset ultrafast -r {FPS} -c:a aac -ar {SAMPLE_RATE} -ac 2 -b:a 192k -pix_fmt yuv420p -t {dur_step + 0.4} {vid_step}",
                    shell=True, check=True
                )
            else:
                # --- Mode animasi tulisan tangan: render beberapa frame reveal bertahap ---
                total_chars = sum(len(latex_to_clean_text(d)) for d in step.get('details', [])) or 1
                n_write_frames = min(28, max(8, total_chars // 3))

                write_frame_paths = []
                for wf in range(n_write_frames):
                    progress = (wf + 1) / n_write_frames  # dari sedikit terisi s.d. hampir penuh
                    wf_img = create_step_frame(soal, active_step_idx=step_idx, font_size=font_size,
                                                write_progress=progress)
                    wf_path = os.path.join(sdir, f"frame_step_{step_idx + 1}_write_{wf:03d}.png")
                    wf_img.save(wf_path)
                    write_frame_paths.append(wf_path)

                # Alokasi waktu: menulis dulu, lalu diam (hold) di frame bersih hingga narasi selesai
                writing_time = min(dur_step - 0.3, max(0.8, total_chars * 0.045))
                writing_time = max(0.5, writing_time)
                hold_time = max(0.3, (dur_step + 0.4) - writing_time)
                frame_dur = writing_time / n_write_frames

                write_list = os.path.join(sdir, f"write_list_{step_idx + 1}.txt")
                with open(write_list, "w") as wl:
                    for wp in write_frame_paths:
                        wl.write(f"file '{wp}'\nduration {frame_dur:.3f}\n")
                    wl.write(f"file '{step_img_path}'\nduration {hold_time:.3f}\n")
                    wl.write(f"file '{step_img_path}'\n")

                vid_step_visual = os.path.join(sdir, f"part_step_{step_idx + 1}_visual.mp4")
                subprocess.run(
                    f"ffmpeg -y -f concat -safe 0 -i {write_list} "
                    f"-c:v libx264 -preset ultrafast -r {FPS} -pix_fmt yuv420p -an {vid_step_visual}",
                    shell=True, check=True
                )
                subprocess.run(
                    f"ffmpeg -y -i {vid_step_visual} -i {step_audio_path} "
                    f"-map 0:v -map 1:a -c:v copy -c:a aac -ar {SAMPLE_RATE} -ac 2 -b:a 192k -shortest {vid_step}",
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
    print(f"\n🎉 Selesai! Video animasi interaktif {len(daftar_soal)} soal Latihan Soal Persiapan TKA Matematika SMP berhasil dibuat: {output_mp4}")

# ============================================================
# DATA SOAL LATIHAN TKA MATEMATIKA SMP KELAS 9 (VERSI 6 - TINGKAT LANJUT)
# ============================================================
data_soal = {
    "judul": "Latihan Soal TKA Matematika Kelas 12 - Geometri dan Pengukuran (HOTS)",
    "topik": "TKA Matematika SMA Kelas 12 - Geometri dan Pengukuran",
    "jenjang": "Kelas 12 SMA/MA/SMK/MAK",
    "level": "HOTS",
    "acuan": (
        "Kerangka Asesmen TKA Matematika SMA/MA/Sederajat dan SMK/MAK "
        "(Peraturan Kepala BSKAP No. 045/H/AN/2025) - elemen Geometri dan "
        "Pengukuran: objek geometri, transformasi geometri, dan pengukuran"
    ),
    "jumlah_soal": 6,
    "komposisi": {
        "pilihan_ganda": 5,
        "pilihan_ganda_kompleks": 1
    },

    "soal": [

        # =========================================================
        # SOAL 1 - GEOMETRI DAN PENGUKURAN (Sudut elevasi & depresi)
        # =========================================================
        {
            "nomor": 1,
            "elemen": "Geometri dan Pengukuran",
            "submateri": "Sudut elevasi dan depresi",
            "tipe": "PG",
            "level": "HOTS",

            "pertanyaan": (
                "Dari puncak sebuah mercusuar setinggi h meter, seorang penjaga "
                "mengamati dua kapal, P dan Q, yang berada segaris dengan kaki "
                "mercusuar. Sudut depresi ke kapal P (lebih dekat) adalah 60°, "
                "sedangkan sudut depresi ke kapal Q (lebih jauh) adalah 30°. "
                "Jika jarak antara kapal P dan kapal Q adalah 40√3 meter, "
                "tinggi mercusuar tersebut adalah ..."
            ),

            "opsi": [
                "A. 30 meter",
                "B. 40 meter",
                "C. 50 meter",
                "D. 60 meter",
                "E. 80 meter"
            ],

            "jawaban_benar": "D",

            "pembahasan": (
                "Karena sudut depresi sama besar dengan sudut elevasi dari kapal "
                "ke puncak mercusuar, gunakan tan sudut = tinggi/jarak. "
                "Jarak kapal P ke kaki mercusuar adalah x₁ = h/tan 60° = h/√3. "
                "Jarak kapal Q ke kaki mercusuar adalah x₂ = h/tan 30° = h√3. "
                "Jarak PQ = x₂ − x₁ = h√3 − h/√3 = 2h√3/3. "
                "Diketahui jarak PQ = 40√3, sehingga 2h√3/3 = 40√3. "
                "Kedua ruas dibagi √3, diperoleh 2h/3 = 40, sehingga h = 60. "
                "Jadi tinggi mercusuar tersebut adalah 60 meter."
            ),

            "steps": [
                {
                    "judul": "Jarak kapal P ke kaki mercusuar",
                    "detail": "x₁ = h/tan 60° = h/√3"
                },
                {
                    "judul": "Jarak kapal Q ke kaki mercusuar",
                    "detail": "x₂ = h/tan 30° = h√3"
                },
                {
                    "judul": "Bentuk persamaan jarak PQ",
                    "detail": "x₂ − x₁ = h√3 − h/√3 = 2h√3/3 = 40√3"
                },
                {
                    "judul": "Selesaikan untuk h",
                    "detail": "2h/3 = 40 → h = 60 meter"
                }
            ],

            "spoken": (
                "Jarak kapal P ke kaki mercusuar adalah h dibagi tangen enam puluh derajat, sama dengan h dibagi akar tiga. "
                "Jarak kapal Q ke kaki mercusuar adalah h dibagi tangen tiga puluh derajat, sama dengan h dikali akar tiga. "
                "Selisih kedua jarak ini sama dengan dua per tiga h akar tiga, dan diketahui sama dengan empat puluh akar tiga. "
                "Setelah kedua ruas dibagi akar tiga, diperoleh dua per tiga h sama dengan empat puluh, sehingga h sama dengan enam puluh. "
                "Jadi tinggi mercusuar adalah enam puluh meter. Jawaban D."
            )
        },


        # =========================================================
        # SOAL 2 - GEOMETRI DAN PENGUKURAN (Transformasi geometri)
        # =========================================================
        {
            "nomor": 2,
            "elemen": "Geometri dan Pengukuran",
            "submateri": "Transformasi geometri",
            "tipe": "PG",
            "level": "HOTS",

            "pertanyaan": (
                "Titik A(4, −2) dicerminkan terhadap garis y = x, kemudian "
                "hasil pencerminan tersebut dirotasikan sejauh 90° berlawanan "
                "arah jarum jam dengan pusat O(0, 0). Koordinat bayangan akhir "
                "titik A adalah ..."
            ),

            "opsi": [
                "A. (−4, −2)",
                "B. (4, 2)",
                "C. (−2, 4)",
                "D. (2, 4)",
                "E. (4, −2)"
            ],

            "jawaban_benar": "A",

            "pembahasan": (
                "Pencerminan terhadap garis y = x mengubah titik (x, y) menjadi "
                "(y, x). Titik A(4, −2) menjadi A'(−2, 4). "
                "Selanjutnya rotasi 90° berlawanan arah jarum jam terhadap pusat "
                "O(0, 0) mengubah titik (x, y) menjadi (−y, x). "
                "Titik A'(−2, 4) menjadi A''(−4, −2). "
                "Jadi koordinat bayangan akhir titik A adalah (−4, −2)."
            ),

            "steps": [
                {
                    "judul": "Refleksi terhadap garis y = x",
                    "detail": "(x, y) → (y, x), sehingga A(4, −2) → A'(−2, 4)"
                },
                {
                    "judul": "Rotasi 90° berlawanan arah jarum jam pusat O",
                    "detail": "(x, y) → (−y, x), sehingga A'(−2, 4) → A''(−4, −2)"
                },
                {
                    "judul": "Tentukan koordinat akhir",
                    "detail": "Bayangan akhir titik A adalah (−4, −2)"
                }
            ],

            "spoken": (
                "Pencerminan terhadap garis y sama dengan x mengubah x koma y menjadi y koma x. "
                "Titik A empat koma negatif dua menjadi negatif dua koma empat. "
                "Rotasi sembilan puluh derajat berlawanan arah jarum jam mengubah x koma y menjadi negatif y koma x. "
                "Sehingga negatif dua koma empat menjadi negatif empat koma negatif dua. "
                "Jadi bayangan akhir titik A adalah negatif empat koma negatif dua. Jawaban A."
            )
        },


        # =========================================================
        # SOAL 3 - GEOMETRI DAN PENGUKURAN (Kesebangunan)
        # =========================================================
        {
            "nomor": 3,
            "elemen": "Geometri dan Pengukuran",
            "submateri": "Kesebangunan segitiga",
            "tipe": "PG",
            "level": "HOTS",

            "pertanyaan": (
                "Sebuah tiang lampu jalan setinggi 6 meter berdiri tegak lurus "
                "di atas tanah datar. Seorang anak dengan tinggi 1,5 meter "
                "berjalan menjauhi tiang lampu tersebut. Saat anak berada pada "
                "jarak 6 meter dari tiang lampu, panjang bayangan anak yang "
                "terbentuk oleh cahaya lampu adalah ..."
            ),

            "opsi": [
                "A. 1 meter",
                "B. 1,5 meter",
                "C. 2 meter",
                "D. 2,5 meter",
                "E. 3 meter"
            ],

            "jawaban_benar": "C",

            "pembahasan": (
                "Misalkan panjang bayangan anak adalah s meter. "
                "Segitiga yang dibentuk oleh tiang lampu sebangun dengan "
                "segitiga yang dibentuk oleh anak dan bayangannya, sehingga "
                "berlaku tinggi tiang/(jarak + s) = tinggi anak/s. "
                "Diperoleh 6/(6 + s) = 1,5/s. "
                "Kalikan silang: 6s = 1,5(6 + s) = 9 + 1,5s. "
                "Sehingga 4,5s = 9, diperoleh s = 2. "
                "Jadi panjang bayangan anak tersebut adalah 2 meter."
            ),

            "steps": [
                {
                    "judul": "Bentuk perbandingan segitiga sebangun",
                    "detail": "6/(6 + s) = 1,5/s"
                },
                {
                    "judul": "Kalikan silang",
                    "detail": "6s = 1,5(6 + s) = 9 + 1,5s"
                },
                {
                    "judul": "Sederhanakan persamaan",
                    "detail": "6s − 1,5s = 9 → 4,5s = 9"
                },
                {
                    "judul": "Selesaikan untuk s",
                    "detail": "s = 9/4,5 = 2 meter"
                }
            ],

            "spoken": (
                "Karena segitiga tiang lampu sebangun dengan segitiga anak dan bayangannya, "
                "enam dibagi enam tambah s sama dengan satu koma lima dibagi s. "
                "Dengan perkalian silang diperoleh enam s sama dengan satu koma lima dikali enam tambah s, yaitu sembilan tambah satu koma lima s. "
                "Sehingga empat koma lima s sama dengan sembilan, dan s sama dengan dua. "
                "Jadi panjang bayangan anak tersebut adalah dua meter. Jawaban C."
            )
        },


        # =========================================================
        # SOAL 4 - GEOMETRI DAN PENGUKURAN (Luas dan volume gabungan)
        # =========================================================
        {
            "nomor": 4,
            "elemen": "Geometri dan Pengukuran",
            "submateri": "Luas dan volume bangun ruang",
            "tipe": "PG",
            "level": "HOTS",

            "pertanyaan": (
                "Sebuah silo penyimpanan gabah berbentuk gabungan tabung dan "
                "setengah bola pada bagian atasnya. Jari-jari silo adalah 3 "
                "meter dan tinggi bagian tabung adalah 10 meter. Volume total "
                "silo tersebut adalah ..."
            ),

            "opsi": [
                "A. 90π m³",
                "B. 96π m³",
                "C. 102π m³",
                "D. 108π m³",
                "E. 114π m³"
            ],

            "jawaban_benar": "D",

            "pembahasan": (
                "Volume tabung dihitung dengan V = πr²t. "
                "Dengan r = 3 dan t = 10, diperoleh V = π(3)²(10) = 90π m³. "
                "Volume setengah bola dihitung dengan V = (2/3)πr³. "
                "Dengan r = 3, diperoleh V = (2/3)π(27) = 18π m³. "
                "Volume total silo = volume tabung + volume setengah bola "
                "= 90π + 18π = 108π m³."
            ),

            "steps": [
                {
                    "judul": "Hitung volume tabung",
                    "detail": "V = πr²t = π(3)²(10) = 90π m³"
                },
                {
                    "judul": "Hitung volume setengah bola",
                    "detail": "V = (2/3)πr³ = (2/3)π(27) = 18π m³"
                },
                {
                    "judul": "Jumlahkan kedua volume",
                    "detail": "V total = 90π + 18π = 108π m³"
                }
            ],

            "spoken": (
                "Volume tabung sama dengan pi kali jari-jari kuadrat kali tinggi, yaitu pi kali tiga kuadrat kali sepuluh, sama dengan sembilan puluh pi. "
                "Volume setengah bola sama dengan dua per tiga pi jari-jari pangkat tiga, yaitu dua per tiga pi kali dua puluh tujuh, sama dengan delapan belas pi. "
                "Volume total silo adalah sembilan puluh pi ditambah delapan belas pi, sama dengan seratus delapan pi meter kubik. "
                "Jawaban D."
            )
        },


        # =========================================================
        # SOAL 5 - GEOMETRI DAN PENGUKURAN (Jarak titik ke bidang)
        # =========================================================
        {
            "nomor": 5,
            "elemen": "Geometri dan Pengukuran",
            "submateri": "Jarak titik ke bidang",
            "tipe": "PG",
            "level": "HOTS",

            "pertanyaan": (
                "Kubus ABCD.EFGH memiliki panjang rusuk 12 cm. "
                "Jarak titik A ke bidang BDG adalah ..."
            ),

            "opsi": [
                "A. 2√3 cm",
                "B. 3√3 cm",
                "C. 4√3 cm",
                "D. 6√3 cm",
                "E. 8√3 cm"
            ],

            "jawaban_benar": "C",

            "pembahasan": (
                "Tinjau limas A.BDG. Sebagai alas, gunakan segitiga siku-siku "
                "ABD yang terletak pada bidang alas kubus dengan luas "
                "½ × 12 × 12 = 72 cm². Karena titik G berada tepat di atas "
                "titik C setinggi rusuk kubus, tinggi limas terhadap alas ABD "
                "adalah 12 cm, sehingga volume limas A.BDG = "
                "(1/3) × 72 × 12 = 288 cm³. "
                "Selanjutnya segitiga BDG merupakan segitiga sama sisi dengan "
                "panjang sisi 12√2 cm (diagonal bidang kubus), sehingga luas "
                "BDG = (√3/4)(12√2)² = 72√3 cm². "
                "Jarak titik A ke bidang BDG = (3 × volume)/luas BDG "
                "= (3 × 288)/(72√3) = 12/√3 = 4√3 cm."
            ),

            "steps": [
                {
                    "judul": "Luas alas segitiga ABD",
                    "detail": "Luas ABD = ½ × 12 × 12 = 72 cm²"
                },
                {
                    "judul": "Volume limas A.BDG",
                    "detail": "V = (1/3) × 72 × 12 = 288 cm³"
                },
                {
                    "judul": "Luas segitiga BDG",
                    "detail": "BDG sama sisi sisi 12√2, luas = (√3/4)(12√2)² = 72√3 cm²"
                },
                {
                    "judul": "Hitung jarak A ke bidang BDG",
                    "detail": "Jarak = (3 × 288)/(72√3) = 12/√3 = 4√3 cm"
                }
            ],

            "spoken": (
                "Luas alas segitiga ABD adalah setengah kali dua belas kali dua belas, sama dengan tujuh puluh dua sentimeter persegi. "
                "Karena G tepat di atas C setinggi rusuk kubus, volume limas A titik BDG adalah sepertiga kali tujuh puluh dua kali dua belas, sama dengan dua ratus delapan puluh delapan. "
                "Segitiga BDG sama sisi dengan sisi dua belas akar dua, sehingga luasnya tujuh puluh dua akar tiga. "
                "Jarak titik A ke bidang BDG sama dengan tiga kali volume dibagi luas BDG, hasilnya empat akar tiga sentimeter. "
                "Jawaban C."
            )
        },


        # =========================================================
        # SOAL 6 - GEOMETRI DAN PENGUKURAN (PG Kompleks)
        # =========================================================
        {
            "nomor": 6,
            "elemen": "Geometri dan Pengukuran",
            "submateri": "Bangun ruang: balok",
            "tipe": "PG Kompleks",
            "level": "HOTS",

            "pertanyaan": (
                "Diketahui balok ABCD.EFGH dengan panjang AB = 8 cm, "
                "BC = 6 cm, dan CG = 10 cm. Pilih SEMUA pernyataan yang benar "
                "berikut ini."
            ),

            "opsi": [
                "A. Diagonal ruang = 10√2 cm",
                "B. Diagonal alas AC = 8 cm",
                "C. Luas permukaan = 376 cm²",
                "D. Volume balok = 480 cm³",
                "E. ACGE berbentuk persegi"
            ],

            "jawaban_benar": [
                "A",
                "C",
                "D",
                "E"
            ],

            "pembahasan": (
                "Diagonal ruang balok = √(AB² + BC² + CG²) "
                "= √(64 + 36 + 100) = √200 = 10√2 cm. Jadi A benar. "
                "Diagonal alas AC = √(AB² + BC²) = √(64 + 36) = √100 = 10 cm, "
                "bukan 8 cm. Jadi B salah. "
                "Luas permukaan = 2(AB·BC + AB·CG + BC·CG) "
                "= 2(48 + 80 + 60) = 2(188) = 376 cm². Jadi C benar. "
                "Volume = AB × BC × CG = 8 × 6 × 10 = 480 cm³. Jadi D benar. "
                "Karena AC = 10 cm sama dengan CG = 10 cm, dan AC tegak lurus "
                "CG (AC berada pada bidang alas, CG tegak lurus alas), "
                "bidang ACGE berbentuk jajar genjang dengan dua sisi yang sama "
                "panjang dan saling tegak lurus, sehingga berbentuk persegi. "
                "Jadi E benar."
            ),

            "steps": [
                {
                    "judul": "Hitung diagonal ruang",
                    "detail": "√(8² + 6² + 10²) = √200 = 10√2 cm → A benar"
                },
                {
                    "judul": "Hitung diagonal alas AC",
                    "detail": "√(8² + 6²) = √100 = 10 cm (bukan 8 cm) → B salah"
                },
                {
                    "judul": "Hitung luas permukaan",
                    "detail": "2(8·6 + 8·10 + 6·10) = 2(188) = 376 cm² → C benar"
                },
                {
                    "judul": "Hitung volume",
                    "detail": "8 × 6 × 10 = 480 cm³ → D benar"
                },
                {
                    "judul": "Uji bentuk irisan ACGE",
                    "detail": "AC = CG = 10 cm dan saling tegak lurus → ACGE persegi → E benar"
                }
            ],

            "spoken": (
                "Perhatikan bahwa soal ini memiliki lebih dari satu jawaban benar. "
                "Diagonal ruang balok adalah akar dari delapan kuadrat tambah enam kuadrat tambah sepuluh kuadrat, sama dengan akar dua ratus, yaitu sepuluh akar dua. Pernyataan A benar. "
                "Diagonal alas AC adalah akar dari delapan kuadrat tambah enam kuadrat, sama dengan sepuluh, bukan delapan. Pernyataan B salah. "
                "Luas permukaan balok adalah dua kali seratus delapan puluh delapan, sama dengan tiga ratus tujuh puluh enam sentimeter persegi. Pernyataan C benar. "
                "Volume balok adalah delapan kali enam kali sepuluh, sama dengan empat ratus delapan puluh sentimeter kubik. Pernyataan D benar. "
                "Karena AC sama dengan CG, yaitu sepuluh, dan keduanya saling tegak lurus, irisan bidang ACGE berbentuk persegi. Pernyataan E benar. "
                "Jadi jawaban yang benar adalah A, C, D, dan E."
            )
        }
    ]
}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate Video Animasi Pembahasan Latihan TKA Matematika SMP (Versi 6 - Tingkat Lanjutan)")
    parser.add_argument("output", nargs="?", default="/sdcard/download/video_latihan_tka9_6.mp4", help="Path file video output mp4")
    parser.add_argument("--bgm", default=None, help="Path ke file musik/lagu background mp3 (opsional)")
    parser.add_argument("--vol", type=float, default=0.25, help="Volume musik latar (default: 0.25)")
    parser.add_argument("--font-size", type=int, default=64, help="Ukuran font utama teks soal dalam px (default: 64)")
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
