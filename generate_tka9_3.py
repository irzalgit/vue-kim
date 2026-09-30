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
    if 'kunci_jawaban' in question_data:
        kj = question_data['kunci_jawaban']
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
    correct_set = sorted(get_correct_set(soal))
    opsi_list = get_options_list(soal)

    if len(correct_set) > 1:
        ans_labels = ", ".join(chr(65 + i) for i in correct_set)
        concl_str = f"Kunci jawaban yang benar: {ans_labels}"
    else:
        ci = correct_set[0] if correct_set else 0
        c_val = clean_option_text(latex_to_clean_text(str(opsi_list[ci]))) if ci < len(opsi_list) else ""
        concl_str = f"Jawaban yang benar: {chr(65 + ci)} ({c_val})"

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
            "title": "Kesimpulan Jawaban",
            "details": [
                f"★ {concl_str}"
            ],
            "spoken": f"Sehingga {text_to_spoken(concl_str)}."
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

    # Top Header: Profile + Topic (Diperbesar & disesuaikan teksnya)
    draw_rounded_rect(draw, (40, 60, 480, 150), radius=24, fill="#121829", outline="#3B82F6", width=2)
    draw.text((65, 85), f"♫ {question_data.get('account', '@pairzal')}", font=get_font(FS_BADGE, bold=True), fill="#FFFFFF")

    draw_rounded_rect(draw, (505, 60, WIDTH - 40, 150), radius=24, fill="#121829", outline="#3B82F6", width=2)
    draw.text((530, 85), f"★ Latihan TKA Matematika Kelas 9", font=get_font(FS_BADGE, bold=True), fill="#FFFFFF")

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

    q_text = question_data.get('soal') or question_data.get('question', '')
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
    FS_ANSWER = 38   # Badge kunci jawaban: 38px
    FS_DIALOG = max(26, round(34 * step_scale))
    FS_STEPBADGE = max(24, round(32 * step_scale))
    FS_STEPTITLE = 42  # Judul langkah pembahasan: 42px
    FS_DETAIL = 40     # Isi langkah pembahasan: 40px
    FS_CONCL = max(28, round(36 * step_scale))

    img = Image.new("RGB", (WIDTH, HEIGHT), "#070B19")
    draw = ImageDraw.Draw(img)

    draw_colorful_background(draw, WIDTH, HEIGHT)

    # Top Header (Diperbesar & disesuaikan teksnya)
    draw_rounded_rect(draw, (40, 45, 470, 130), radius=22, fill="#121829", outline="#3B82F6", width=2)
    draw.text((65, 68), f"♫ {question_data.get('account', '@pairzal')}", font=get_font(FS_HEADER, bold=True), fill="#FFFFFF")

    draw_rounded_rect(draw, (495, 45, WIDTH - 40, 130), radius=22, fill="#121829", outline="#3B82F6", width=2)
    draw.text((520, 68), f"★ Latihan TKA Matematika Kelas 9", font=get_font(FS_HEADER, bold=True), fill="#FFFFFF")

    card_top = 150
    card_bottom = 460
    draw_rounded_rect(draw, (40, card_top, WIDTH - 40, card_bottom), radius=22, fill="#111827", outline="#4F46E5", width=2)

    submateri = question_data.get('submateri') or question_data.get('subtopic') or question_data.get('elemen', 'Bilangan')
    soal_num = question_data.get('nomor') or question_data.get('id', 1)
    tag_soal = f"SOAL #{soal_num} | {submateri.upper()}"
    draw.text((65, card_top + 20), tag_soal, font=get_font(FS_TAG, bold=True), fill="#9CA3AF")

    q_text = question_data.get('soal') or question_data.get('question', '')
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

    correct_set = sorted(get_correct_set(question_data))
    options = get_options_list(question_data)
    if len(correct_set) > 1:
        ans_text = "✓ KUNCI: " + ", ".join(chr(65 + i) for i in correct_set) + " (Semua Benar)"
    else:
        ci = correct_set[0] if correct_set else 0
        c_val = clean_option_text(latex_to_clean_text(str(options[ci]))) if ci < len(options) else ""
        ans_text = f"✓ KUNCI: {chr(65 + ci)} ({c_val})"

    draw_rounded_rect(draw, (65, card_bottom - 78, WIDTH - 65, card_bottom - 12), radius=16, fill="#1F2937", outline="#10B981", width=1)
    draw_math_line(img, draw, (85, card_bottom - 68), ans_text, get_font(FS_ANSWER, bold=True), FS_ANSWER, fill="#34D399", max_width=WIDTH - 190)

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
        draw_rounded_rect(draw, (40, 1750, WIDTH - 40, 1900), radius=18, fill="#111827", outline="#10B981", width=2)
        draw.text((75, 1768), "RANGKUMAN KUNCI:", font=get_font(FS_TAG, bold=True), fill="#34D399")
        concl_font = get_font(FS_CONCL, bold=True)
        concl_text = question_data.get('conclusion') or question_data.get('pembahasan', 'Jawaban tepat dan terbukti!')
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
    sub_text = f"🔥 Pembahasan {jumlah_soal} Soal Terpilih 🔥"
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
    default_bgm = "/root/vue-kim/bgm/dubi_dubi_dam_dam_black_x.mp3"
    bgm_to_use = custom_bgm if (custom_bgm and os.path.exists(custom_bgm)) else (default_bgm if os.path.exists(default_bgm) else None)
    if bgm_to_use and os.path.exists(bgm_to_use):
        print(f"  -> Menggunakan file lagu background: {bgm_to_use}")
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


def make_animated_combined_video(data_soal_obj, output_mp4, bgm_path=None, bgm_volume=0.25, font_size=64):
    if isinstance(data_soal_obj, dict):
        judul = data_soal_obj.get('judul', "Latihan TKA Matematika Kelas 9")
        daftar_soal = data_soal_obj.get('soal', [])
    else:
        judul = "Latihan TKA Matematika Kelas 9"
        daftar_soal = data_soal_obj

    temp_dir = "/tmp/video_render_tka9"
    os.makedirs(temp_dir, exist_ok=True)

    part_files = []

    print("1. Membuat Intro Video...")
    img_intro = create_intro_frame(judul, len(daftar_soal))
    intro_png = os.path.join(temp_dir, "intro.png")
    img_intro.save(intro_png)

    intro_audio = os.path.join(temp_dir, "intro_audio.mp3")
    intro_text = f"Halo sobat cerdas! Mari kita bahas {len(daftar_soal)} latihan TKA Matematika Kelas 9 bersama Pak Irzal."
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

        q_raw = soal.get('soal') or soal.get('question', '')
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
    outro_text = "Selesai! Scan barcode untuk latihan soal lebih banyak, dan jangan lupa like serta follow @pairzal ya!"
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
    print(f"\n🎉 Selesai! Video animasi lengkap {len(daftar_soal)} soal Latihan TKA Matematika Kelas 9 berhasil dibuat: {output_mp4}")

# ============================================================
# DATA SOAL LATIHAN TKA MATEMATIKA KELAS 9
# ============================================================
data_soal = {
  "judul": "Latihan TKA Matematika Kelas 9",
  "keterangan": "Disusun berdasarkan kisi-kisi resmi TKA Matematika SMP/MTs",
  "jumlah_soal": 25,
  "soal": [
    {
      "nomor": 1,
      "elemen": "Bilangan",
      "submateri": "Bilangan bulat dan operasi hitung",
      "tipe": "pilihan_ganda",
      "soal": "Suhu di puncak gunung pada malam hari -8°C. Pada siang hari suhu naik 15°C, kemudian pada sore hari turun 6°C. Suhu di puncak gunung pada sore hari adalah ....",
      "opsi": { "A": "1°C", "B": "-1°C", "C": "7°C", "D": "13°C" },
      "kunci_jawaban": "A",
      "pembahasan": "-8 + 15 - 6 = 1°C."
    },
    {
      "nomor": 2,
      "elemen": "Bilangan",
      "submateri": "Bilangan rasional dan irasional",
      "tipe": "pilihan_ganda_kompleks",
      "soal": "Perhatikan bilangan berikut: 0,25; √9; π; dan 2/7. Pilihlah bilangan yang termasuk bilangan rasional! Jawaban benar lebih dari satu.",
      "opsi": { "A": "0,25", "B": "√9", "C": "π", "D": "2/7" },
      "kunci_jawaban": ["A", "B", "D"],
      "pembahasan": "0,25 = 1/4, √9 = 3, dan 2/7 dapat dinyatakan sebagai pecahan a/b sehingga termasuk rasional. π adalah bilangan irasional."
    },
    {
      "nomor": 3,
      "elemen": "Bilangan",
      "submateri": "Bilangan berpangkat bulat",
      "tipe": "pilihan_ganda",
      "soal": "Hasil dari 2^3 x 2^(-5) adalah ....",
      "opsi": { "A": "1/4", "B": "1/8", "C": "4", "D": "8" },
      "kunci_jawaban": "A",
      "pembahasan": "2^3 x 2^(-5) = 2^(3-5) = 2^(-2) = 1/4."
    },
    {
      "nomor": 4,
      "elemen": "Bilangan",
      "submateri": "Bilangan akar (bentuk akar)",
      "tipe": "pilihan_ganda",
      "soal": "Bentuk sederhana dari √50 + √18 adalah ....",
      "opsi": { "A": "6√2", "B": "8√2", "C": "10√2", "D": "68√2" },
      "kunci_jawaban": "B",
      "pembahasan": "√50 = 5√2 dan √18 = 3√2, sehingga 5√2 + 3√2 = 8√2."
    },
    {
      "nomor": 5,
      "elemen": "Bilangan",
      "submateri": "Notasi ilmiah",
      "tipe": "pilihan_ganda",
      "soal": "Jarak dua kota adalah 45.000.000 meter. Jarak tersebut jika dinyatakan dalam notasi ilmiah adalah ....",
      "opsi": { "A": "4,5 x 10^5 m", "B": "4,5 x 10^6 m", "C": "4,5 x 10^7 m", "D": "45 x 10^6 m" },
      "kunci_jawaban": "C",
      "pembahasan": "45.000.000 = 4,5 x 10^7."
    },
    {
      "nomor": 6,
      "elemen": "Bilangan",
      "submateri": "Rasio dan perbandingan",
      "tipe": "pilihan_ganda",
      "soal": "Perbandingan uang Andi dan Budi adalah 3:5. Jika jumlah uang mereka Rp160.000,00, uang Budi adalah ....",
      "opsi": { "A": "Rp60.000,00", "B": "Rp80.000,00", "C": "Rp100.000,00", "D": "Rp120.000,00" },
      "kunci_jawaban": "C",
      "pembahasan": "Uang Budi = 5/8 x 160.000 = Rp100.000,00."
    },
    {
      "nomor": 7,
      "elemen": "Bilangan",
      "submateri": "Bilangan real dalam konteks keseharian",
      "tipe": "pilihan_ganda",
      "soal": "Sebuah toko elektronik memberikan diskon 20% untuk sebuah kulkas seharga Rp3.500.000,00. Jika masih dikenakan pajak 10% dari harga setelah diskon, harga akhir yang harus dibayar adalah ....",
      "opsi": { "A": "Rp2.800.000,00", "B": "Rp3.080.000,00", "C": "Rp3.150.000,00", "D": "Rp3.850.000,00" },
      "kunci_jawaban": "B",
      "pembahasan": "Harga setelah diskon = 80% x 3.500.000 = 2.800.000. Harga akhir = 2.800.000 + 10% x 2.800.000 = 3.080.000."
    },
    {
      "nomor": 8,
      "elemen": "Aljabar",
      "submateri": "Persamaan dan pertidaksamaan linear satu variabel",
      "tipe": "pilihan_ganda",
      "soal": "Himpunan penyelesaian dari pertidaksamaan 3x - 5 ≤ 2x + 4, untuk x bilangan bulat, adalah ....",
      "opsi": { "A": "x ≤ 9", "B": "x ≥ 9", "C": "x ≤ -9", "D": "x ≥ -9" },
      "kunci_jawaban": "A",
      "pembahasan": "3x - 2x ≤ 4 + 5, sehingga x ≤ 9."
    },
    {
      "nomor": 9,
      "elemen": "Aljabar",
      "submateri": "Sistem persamaan linear dua variabel",
      "tipe": "pilihan_ganda",
      "soal": "Harga 2 buku dan 3 pensil adalah Rp17.000,00, sedangkan harga 4 buku dan 1 pensil adalah Rp19.000,00. Harga 1 buku adalah ....",
      "opsi": { "A": "Rp3.500,00", "B": "Rp4.000,00", "C": "Rp4.500,00", "D": "Rp5.000,00" },
      "kunci_jawaban": "B",
      "pembahasan": "Dari sistem persamaan, eliminasi diperoleh 10b=40.000, sehingga b=4.000."
    },
    {
      "nomor": 10,
      "elemen": "Aljabar",
      "submateri": "Bentuk aljabar dan sifat-sifat operasinya",
      "tipe": "pilihan_ganda",
      "soal": "Bentuk sederhana dari 3(2x - 4) + 2(x + 5) adalah ....",
      "opsi": { "A": "8x - 2", "B": "8x + 2", "C": "6x - 2", "D": "6x + 2" },
      "kunci_jawaban": "A",
      "pembahasan": "3(2x-4) + 2(x+5) = 6x - 12 + 2x + 10 = 8x - 2."
    },
    {
      "nomor": 11,
      "elemen": "Aljabar",
      "submateri": "Relasi dan fungsi (domain, kodomain, range)",
      "tipe": "pilihan_ganda_kompleks",
      "soal": "Diketahui fungsi f(x) = 2x - 3 dengan domain {0, 1, 2, 3}. Pilihlah pernyataan yang benar! Jawaban benar lebih dari satu.",
      "opsi": { "A": "f(0) = -3", "B": "f(2) = 1", "C": "Range fungsi adalah {-3, -1, 1, 3}", "D": "f(3) = 6" },
      "kunci_jawaban": ["A", "B", "C"],
      "pembahasan": "f(0)=-3, f(1)=-1, f(2)=1, f(3)=3. Jadi range = {-3,-1,1,3}."
    },
    {
      "nomor": 12,
      "elemen": "Aljabar",
      "submateri": "Barisan dan deret",
      "tipe": "pilihan_ganda",
      "soal": "Diketahui barisan aritmetika 5, 9, 13, 17, .... Suku ke-15 dari barisan tersebut adalah ....",
      "opsi": { "A": "57", "B": "61", "C": "65", "D": "69" },
      "kunci_jawaban": "B",
      "pembahasan": "Un = a + (n-1)b = 5 + 14(4) = 61."
    },
    {
      "nomor": 13,
      "elemen": "Aljabar",
      "submateri": "Bentuk aljabar dalam konteks keseharian",
      "tipe": "pilihan_ganda",
      "soal": "Sebuah toko fotokopi mengenakan biaya Rp500,00 per lembar ditambah biaya jilid Rp3.000,00 sekali jilid. Jika Rina menjilid dokumen sebanyak x lembar, model matematika untuk total biaya adalah ....",
      "opsi": { "A": "500x + 3000", "B": "500 + 3000x", "C": "3500x", "D": "(500+3000)x" },
      "kunci_jawaban": "A",
      "pembahasan": "Biaya total = 500x + 3000."
    },
    {
      "nomor": 14,
      "elemen": "Geometri dan Pengukuran",
      "submateri": "Objek geometri (kekongruenan dan kesebangunan)",
      "tipe": "pilihan_ganda",
      "soal": "Sebuah foto berukuran 12 cm x 18 cm akan dicetak sebangun dengan lebar 8 cm. Panjang hasil cetakan yang sebangun adalah ....",
      "opsi": { "A": "10 cm", "B": "12 cm", "C": "14 cm", "D": "16 cm" },
      "kunci_jawaban": "B",
      "pembahasan": "12/18 = 8/p, sehingga p = 12 cm."
    },
    {
      "nomor": 15,
      "elemen": "Geometri dan Pengukuran",
      "submateri": "Transformasi geometri",
      "tipe": "pilihan_ganda",
      "soal": "Titik A(3, -2) ditranslasikan oleh (x, y) → (x-4, y+5). Bayangan titik A adalah ....",
      "opsi": { "A": "(-1, 3)", "B": "(7, -7)", "C": "(-1, -7)", "D": "(7, 3)" },
      "kunci_jawaban": "A",
      "pembahasan": "Bayangan = (3-4, -2+5) = (-1, 3)."
    },
    {
      "nomor": 16,
      "elemen": "Geometri dan Pengukuran",
      "submateri": "Keliling dan luas bangun datar",
      "tipe": "pilihan_ganda",
      "soal": "Sebuah taman berbentuk lingkaran memiliki diameter 28 m. Luas taman tersebut adalah .... (π = 22/7)",
      "opsi": { "A": "154 m²", "B": "308 m²", "C": "616 m²", "D": "2.464 m²" },
      "kunci_jawaban": "C",
      "pembahasan": "Luas = 22/7 x 14 x 14 = 616 m²."
    },
    {
      "nomor": 17,
      "elemen": "Geometri dan Pengukuran",
      "submateri": "Volume bangun ruang sisi lengkung",
      "tipe": "pilihan_ganda",
      "soal": "Sebuah tabung memiliki jari-jari alas 7 cm dan tinggi 20 cm. Volume tabung tersebut adalah .... (π = 22/7)",
      "opsi": { "A": "1.540 cm³", "B": "3.080 cm³", "C": "4.400 cm³", "D": "6.160 cm³" },
      "kunci_jawaban": "B",
      "pembahasan": "Volume = 22/7 x 7 x 7 x 20 = 3.080 cm³."
    },
    {
      "nomor": 18,
      "elemen": "Geometri dan Pengukuran",
      "submateri": "Kesebangunan pada segitiga",
      "tipe": "pilihan_ganda_kompleks",
      "soal": "Sebatang tongkat setinggi 2 m menghasilkan bayangan 3 m. Pada saat yang sama, sebuah pohon menghasilkan bayangan 12 m. Pilihlah pernyataan yang benar! Jawaban benar lebih dari satu.",
      "opsi": { "A": "Tinggi pohon adalah 8 m", "B": "Perbandingan tinggi dan bayangan tongkat adalah 2:3", "C": "Tinggi pohon sama dengan 4 kali tinggi tongkat", "D": "Tinggi pohon adalah 18 m" },
      "kunci_jawaban": ["A", "B", "C"],
      "pembahasan": "Tinggi pohon = (2/3) x 12 = 8 m. Perbandingan tongkat 2:3. Tinggi pohon (8m) sama dengan 4 kali tinggi tongkat (2m)."
    },
    {
      "nomor": 19,
      "elemen": "Geometri dan Pengukuran",
      "submateri": "Pengukuran (sudut dan bangun ruang gabungan)",
      "tipe": "pilihan_ganda",
      "soal": "Sebuah bangun ruang gabungan terdiri atas kubus dengan rusuk 10 cm dan limas dengan alas sama dengan sisi atas kubus serta tinggi limas 6 cm. Jika volume kubus adalah 1.000 cm³, volume limas tersebut adalah ....",
      "opsi": { "A": "100 cm³", "B": "200 cm³", "C": "300 cm³", "D": "600 cm³" },
      "kunci_jawaban": "B",
      "pembahasan": "Volume limas = 1/3 x (10x10) x 6 = 200 cm³."
    },
    {
      "nomor": 20,
      "elemen": "Data dan Peluang",
      "submateri": "Ukuran pemusatan data (mean)",
      "tipe": "pilihan_ganda",
      "soal": "Nilai ulangan matematika 6 siswa adalah 75, 80, 90, 85, 70, dan 80. Rata-rata nilai keenam siswa tersebut adalah ....",
      "opsi": { "A": "78", "B": "80", "C": "82", "D": "85" },
      "kunci_jawaban": "B",
      "pembahasan": "Rata-rata = 480/6 = 80."
    },
    {
      "nomor": 21,
      "elemen": "Data dan Peluang",
      "submateri": "Ukuran pemusatan data (median dan modus)",
      "tipe": "pilihan_ganda_kompleks",
      "soal": "Data berat badan (kg) 9 siswa: 40, 42, 45, 42, 47, 50, 42, 45, 48. Pilihlah pernyataan yang benar! Jawaban benar lebih dari satu.",
      "opsi": { "A": "Median data tersebut adalah 45", "B": "Modus data tersebut adalah 42", "C": "Rata-rata data tersebut adalah 44,6", "D": "Data terbesar adalah 50" },
      "kunci_jawaban": ["A", "B", "C", "D"],
      "pembahasan": "Median = 45, Modus = 42, Rata-rata = 401/9 ≈ 44,6, Data terbesar = 50."
    },
    {
      "nomor": 22,
      "elemen": "Data dan Peluang",
      "submateri": "Penyajian dan interpretasi data",
      "tipe": "pilihan_ganda",
      "soal": "Diagram lingkaran menunjukkan pilihan ekstrakurikuler 200 siswa: Olahraga 40%, Seni 25%, Sains 20%, dan lainnya 15%. Banyak siswa yang memilih ekstrakurikuler Sains adalah ....",
      "opsi": { "A": "30 siswa", "B": "40 siswa", "C": "50 siswa", "D": "80 siswa" },
      "kunci_jawaban": "B",
      "pembahasan": "20% x 200 = 40 siswa."
    },
    {
      "nomor": 23,
      "elemen": "Data dan Peluang",
      "submateri": "Konsep peluang",
      "tipe": "pilihan_ganda",
      "soal": "Sebuah kotak berisi 5 bola merah, 3 bola biru, dan 2 bola kuning. Jika diambil satu bola secara acak, peluang terambil bola biru adalah ....",
      "opsi": { "A": "1/10", "B": "1/5", "C": "3/10", "D": "1/2" },
      "kunci_jawaban": "C",
      "pembahasan": "Peluang = 3/10."
    },
    {
      "nomor": 24,
      "elemen": "Data dan Peluang",
      "submateri": "Peluang kejadian majemuk",
      "tipe": "pilihan_ganda",
      "soal": "Dua buah dadu dilempar bersamaan. Peluang munculnya jumlah mata dadu sama dengan 8 adalah ....",
      "opsi": { "A": "3/36", "B": "4/36", "C": "5/36", "D": "6/36" },
      "kunci_jawaban": "C",
      "pembahasan": "Ada 5 pasangan angka berjumlah 8 dari 36 kemungkinan, peluangnya 5/36."
    },
    {
      "nomor": 25,
      "elemen": "Data dan Peluang",
      "submateri": "Interpretasi data dalam konteks keseharian",
      "tipe": "pilihan_ganda",
      "soal": "Sebuah perusahaan mencatat penjualan produk selama 5 bulan (dalam juta rupiah): 120, 150, 135, 160, 145. Jika target rata-rata penjualan per bulan adalah 140 juta, pernyataan yang tepat adalah ....",
      "opsi": { "A": "Rata-rata penjualan di bawah target", "B": "Rata-rata penjualan tepat sama dengan target", "C": "Rata-rata penjualan di atas target", "D": "Data tidak cukup untuk menentukan rata-rata" },
      "kunci_jawaban": "C",
      "pembahasan": "Rata-rata = 710/5 = 142 juta (di atas target 140 juta)."
    }
  ]
}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate Video Animasi Pembahasan Latihan TKA Matematika Kelas 9")
    parser.add_argument("output", nargs="?", default="/sdcard/download/video_latihan_tka9_matematika.mp4", help="Path file video output mp4")
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

