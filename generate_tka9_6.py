#!/usr/bin/env python3
import os
import sys
import re
import io
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
    text = text.replace('²', ' kuadrat ')
    text = text.replace('³', ' pangkat tiga ')
    text = text.replace('⁴', ' pangkat empat ')
    text = text.replace('⁵', ' pangkat lima ')
    text = text.replace('°', ' derajat ')
    text = text.replace('π', ' pi ')
    text = re.sub(r'(\d+)\^(\d+)', r'\1 pangkat \2', text)
    text = re.sub(r'(\d+)√(\d+)', r'\1 akar \2', text)
    text = text.replace('√', 'akar ')
    text = text.replace('×', ' kali ')
    text = text.replace(' x ', ' kali ')
    text = text.replace(':', ' bagi ')
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


def load_and_fit_image(img_input, max_w, max_h):
    if not img_input:
        return None
    try:
        if isinstance(img_input, str):
            if not os.path.exists(img_input):
                return None
            img = Image.open(img_input).convert("RGBA")
        elif isinstance(img_input, Image.Image):
            img = img_input.convert("RGBA")
        else:
            return None
        w, h = img.size
        ratio = min(max_w / w, max_h / h)
        new_w = max(1, int(w * ratio))
        new_h = max(1, int(h * ratio))
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        return img
    except Exception as e:
        print(f"Gagal memuat gambar: {e}")
        return None


def build_steps_if_needed(soal):
    if 'steps' in soal and soal['steps']:
        return soal['steps']

    pembahasan = soal.get('pembahasan', '')
    submateri = soal.get('submateri') or soal.get('subtopic') or soal.get('elemen', 'Matematika SMP')

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
    draw.text((530, 85), "★ Latihan Soal Persiapan TKA SMP", font=get_font(FS_BADGE, bold=True), fill="#FFFFFF")

    img_src = question_data.get('image_path') or question_data.get('image') or question_data.get('gambar')
    chart_img = load_and_fit_image(img_src, max_w=940, max_h=280) if img_src else None

    card_top = 175
    card_bottom = 990 if chart_img else 830
    draw_rounded_rect(draw, (40, card_top, WIDTH - 40, card_bottom), radius=24, fill="#111827", outline="#4F46E5", width=2)

    submateri = question_data.get('submateri') or question_data.get('subtopic') or question_data.get('elemen', 'Bilangan')
    soal_num = question_data.get('nomor') or question_data.get('id', 1)
    tag_text = f"SOAL #{soal_num}  •  {submateri.upper()}"
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
    FS_STEPBADGE = max(24, round(32 * step_scale))
    FS_STEPTITLE = 42  # Judul langkah pembahasan: 42px
    FS_DETAIL = 40     # Isi langkah pembahasan: 40px
    FS_CONCL = max(28, round(36 * step_scale))

    img = Image.new("RGB", (WIDTH, HEIGHT), "#070B19")
    draw = ImageDraw.Draw(img)

    draw_colorful_background(draw, WIDTH, HEIGHT)

    # Top Header
    draw_rounded_rect(draw, (40, 45, 470, 130), radius=22, fill="#121829", outline="#3B82F6", width=2)
    draw.text((65, 68), f"♫ {question_data.get('account', '@pairzal')}", font=get_font(FS_HEADER, bold=True), fill="#FFFFFF")

    draw_rounded_rect(draw, (495, 45, WIDTH - 40, 130), radius=22, fill="#121829", outline="#3B82F6", width=2)
    draw.text((520, 68), "★ Latihan Soal Persiapan TKA SMP", font=get_font(FS_HEADER, bold=True), fill="#FFFFFF")

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
    thumb_img = load_and_fit_image(img_src, max_w=220, max_h=145) if img_src else None

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
    draw.text((65, dlg_top + 24), "Budi: \"Konsep apa yang digunakan, Pak?\"", font=get_font(FS_DIALOG, bold=True), fill="#93C5FD")

    steps = build_steps_if_needed(question_data)
    step_y_coords = [
        (580, 950),     # Step 1
        (970, 1340),    # Step 2
        (1360, 1730)    # Step 3
    ]

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

        draw_rounded_rect(draw, (65, sy_start + 18, 305, sy_start + 66), radius=14, fill="#1F2937")
        draw.text((82, sy_start + 30), f"LANGKAH {idx + 1}", font=get_font(FS_STEPBADGE, bold=True), fill="#93C5FD")

        step_title = step.get('title', '')
        clean_title = latex_to_clean_text(step_title)
        title_font = get_font(FS_STEPTITLE, bold=True)
        title_lines = wrap_text(clean_title, title_font, WIDTH - 325 - 65)
        title_line_h = round(FS_STEPTITLE * 1.15)
        y_title = sy_start + 30
        for t_line in title_lines[:2]:
            draw.text((325, y_title), t_line, font=title_font, fill="#FFFFFF")
            y_title += title_line_h

        cur_detail_y = max(sy_start + 88, y_title + 10)
        line_detail_font = get_font(FS_DETAIL, bold=False)
        line_detail_bold = get_font(FS_DETAIL, bold=True)
        detail_spacing = round(FS_DETAIL * 1.3)

        for line in step.get('details', []):
            clean_line = latex_to_clean_text(line)
            is_highlight = clean_line.startswith("★") or "Hasil =" in clean_line or "BENAR" in clean_line or "Total =" in clean_line or "Kunci =" in clean_line

            line_font = line_detail_bold if is_highlight else line_detail_font
            wrapped_lines = wrap_text(clean_line, line_font, WIDTH - 140)
            for w_line in wrapped_lines:
                if cur_detail_y + detail_spacing <= sy_end - 12:
                    draw_math_line(img, draw, (70, cur_detail_y), w_line, line_font, FS_DETAIL, fill="#FFFFFF", max_width=WIDTH - 150)
                    cur_detail_y += detail_spacing
            cur_detail_y += 6

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
    pitch = "+18Hz" if is_budi else "+0Hz"
    rate = "+8%" if is_budi else "+5%"
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
    except Exception as e2:
        print(f"Fallback gTTS error: {e2}")


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

    temp_dir = "/tmp/video_render_tka9_5"
    os.makedirs(temp_dir, exist_ok=True)

    part_files = []

    print("1. Membuat Intro Video...")
    img_intro = create_intro_frame(judul, len(daftar_soal))
    intro_png = os.path.join(temp_dir, "intro.png")
    img_intro.save(intro_png)

    intro_audio = os.path.join(temp_dir, "intro_audio.mp3")
    intro_text = f"Halo sobat cerdas! Mari kita bahas {len(daftar_soal)} latihan soal persiapan TKA Matematika SMP bersama Pak Irzal."
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
            step_spoken = text_to_spoken(step.get('spoken', ''))

            if step_idx == 0:
                budi_raw = os.path.join(sdir, "budi_raw.mp3")
                budi_text = "Pak, konsep apa yang digunakan?"
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
    print(f"\n🎉 Selesai! Video animasi interaktif {len(daftar_soal)} soal Latihan Soal Persiapan TKA Matematika SMP berhasil dibuat: {output_mp4}")

# ============================================================
# DATA SOAL LATIHAN TKA MATEMATIKA SMP KELAS 9 (VERSI 6 - TINGKAT LANJUT)
# ============================================================
data_soal = {
  "judul": "Latihan Soal Persiapan TKA Matematika SMP (Level Lanjutan)",
  "topik": "Campuran - 1 Soal per Elemen + 1 Soal Pilihan Ganda Kompleks (Tingkat Kesulitan Lebih Tinggi)",
  "jenjang": "Kelas 9 SMP",
  "acuan": "Kisi-kisi TKA 2026 (4 elemen: Bilangan, Aljabar, Geometri dan Pengukuran, Data dan Peluang)",
  "keterangan": "Paket lanjutan dengan konteks soal bertahap dua/multi-langkah, angka tidak bulat sederhana, dan konsep tambahan (pertumbuhan eksponensial, sistem persamaan, bangun gabungan, peluang gabungan, serta kuartil) untuk melatih penalaran tingkat tinggi (HOTS)",
  "jumlah_soal": 5,
  "soal": [
    {
      "nomor": 1,
      "elemen": "Bilangan",
      "tipe": "pilihan_ganda",
      "pertanyaan": "Sejenis bakteri membelah diri menjadi 2 kali lipat setiap 20 menit. Jika mula-mula terdapat 5 bakteri, banyak bakteri setelah 2 jam adalah...",
      "opsi": {
        "A": "160",
        "B": "240",
        "C": "320",
        "D": "400",
        "E": "480"
      },
      "jawaban_benar": ["C"],
      "pembahasan": "2 jam = 120 menit = 6 periode pembelahan (120 : 20 = 6). Banyak bakteri = 5 × 2^6 = 5 × 64 = 320"
    },
    {
      "nomor": 2,
      "elemen": "Aljabar",
      "tipe": "pilihan_ganda",
      "pertanyaan": "Harga 3 buku dan 2 pensil adalah Rp26.000,00. Harga 5 buku dan 4 pensil adalah Rp46.000,00. Harga 2 buku dan 3 pensil adalah...",
      "opsi": {
        "A": "Rp20.000,00",
        "B": "Rp22.000,00",
        "C": "Rp24.000,00",
        "D": "Rp26.000,00",
        "E": "Rp28.000,00"
      },
      "jawaban_benar": ["C"],
      "pembahasan": "Misalkan buku = b, pensil = p. 3b+2p=26.000 dan 5b+4p=46.000. Kalikan persamaan pertama dengan 2: 6b+4p=52.000. Kurangkan dengan persamaan kedua: b=6.000. Substitusi: 3(6.000)+2p=26.000 → p=4.000. Maka 2b+3p = 12.000+12.000 = Rp24.000,00"
    },
    {
      "nomor": 3,
      "elemen": "Geometri dan Pengukuran",
      "tipe": "pilihan_ganda",
      "pertanyaan": "Sebuah silo gabah berbentuk gabungan tabung dan kerucut. Jari-jari alas 7 m, tinggi bagian tabung 10 m, dan tinggi bagian kerucut (atap) 6 m. Volume silo tersebut adalah... (π = 22/7)",
      "opsi": {
        "A": "1.680 m³",
        "B": "1.748 m³",
        "C": "1.848 m³",
        "D": "1.928 m³",
        "E": "2.002 m³"
      },
      "jawaban_benar": ["C"],
      "pembahasan": "Volume tabung = π×r²×t = 22/7×7²×10 = 1.540 m³. Volume kerucut = 1/3×π×r²×t = 1/3×22/7×49×6 = 308 m³. Volume total = 1.540 + 308 = 1.848 m³"
    },
    {
      "nomor": 4,
      "elemen": "Data dan Peluang",
      "tipe": "pilihan_ganda",
      "pertanyaan": "Dua buah dadu dilempar bersamaan sekali. Peluang muncul jumlah mata dadu sama dengan 9 atau kedua mata dadu bernilai sama adalah...",
      "opsi": {
        "A": "1/6",
        "B": "5/18",
        "C": "7/36",
        "D": "1/4",
        "E": "11/36"
      },
      "jawaban_benar": ["B"],
      "pembahasan": "Ruang sampel = 36. Jumlah 9: (3,6),(4,5),(5,4),(6,3) = 4 kejadian. Mata dadu sama: (1,1),(2,2),(3,3),(4,4),(5,5),(6,6) = 6 kejadian. Kedua kejadian tidak beririsan, sehingga total = 4+6 = 10 kejadian. Peluang = 10/36 = 5/18"
    },
    {
      "nomor": 5,
      "elemen": "Data dan Peluang",
      "tipe": "pilihan_ganda_kompleks",
      "pertanyaan": "Data nilai ulangan Matematika 8 siswa (sudah terurut) adalah: 50, 55, 60, 65, 70, 75, 80, 85. Manakah pernyataan berikut yang benar mengenai data tersebut? (Pilih semua jawaban yang benar)",
      "opsi": {
        "A": "Mean (rata-rata) data adalah 67,5",
        "B": "Median data adalah 67,5",
        "C": "Kuartil atas (Q3) data adalah 77,5",
        "D": "Jangkauan interkuartil (Q3 − Q1) data adalah 20",
        "E": "Data tersebut memiliki modus 65"
      },
      "jawaban_benar": ["A", "B", "C", "D"],
      "pembahasan": "Mean = (50+55+60+65+70+75+80+85)/8 = 540/8 = 67,5 (A benar). Median = rata-rata dua data tengah = (65+70)/2 = 67,5 (B benar). Kuartil bawah Q1 = median dari {50,55,60,65} = (55+60)/2 = 57,5. Kuartil atas Q3 = median dari {70,75,80,85} = (75+80)/2 = 77,5 (C benar). Jangkauan interkuartil = Q3−Q1 = 77,5−57,5 = 20 (D benar). Semua nilai pada data muncul tepat satu kali sehingga data tidak memiliki modus (E salah)."
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
