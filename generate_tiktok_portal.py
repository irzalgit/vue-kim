#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
===========================================================
PORTAL MATEMATIKA - TIKTOK VIDEO GENERATOR
===========================================================

Mode:
    EDUKASI
    SOFT_PROMO
    PROMO

Output:
    ~/vue-kim/public/videos/

Format:
    1080 x 1920
    30 FPS
    MP4
    TikTok / Reels / Shorts

Akun:
    @pairzal

Website:
    https://math315.id

===========================================================
"""

import os
import re
import math
import textwrap
import random
from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt

from PIL import Image, ImageDraw, ImageFont

# MoviePy
from moviepy import (
    ImageClip,
    AudioFileClip,
    concatenate_videoclips
)

try:
    from moviepy.audio.io.AudioFileClip import AudioFileClip
except Exception:
    pass


# =========================================================
# KONFIGURASI
# =========================================================

VIDEO_MODE = "EDUKASI"

# Pilihan:
# "EDUKASI"
# "SOFT_PROMO"
# "PROMO"

ACCOUNT = "@pairzal"
BRAND = "Portal Matematika"
WEBSITE = "math315.id"

WIDTH = 1080
HEIGHT = 1920
FPS = 30

DURATION_PER_SLIDE = 5

BASE_DIR = Path.home() / "vue-kim"
OUTPUT_DIR = BASE_DIR / "public" / "videos"

EDUKASI_DIR = OUTPUT_DIR / "edukasi"
SOFT_PROMO_DIR = OUTPUT_DIR / "soft_promo"
PROMO_DIR = OUTPUT_DIR / "promo"

TEMP_DIR = BASE_DIR / "tmp_tiktok"

for directory in [
    OUTPUT_DIR,
    EDUKASI_DIR,
    SOFT_PROMO_DIR,
    PROMO_DIR,
    TEMP_DIR,
]:
    directory.mkdir(parents=True, exist_ok=True)


# =========================================================
# FONT
# =========================================================

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/msttcorefonts/Arial.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]

FONT_BOLD_CANDIDATES = [
    "/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def find_font(candidates):
    for path in candidates:
        if os.path.exists(path):
            return path
    return None


FONT_NORMAL = find_font(FONT_CANDIDATES)
FONT_BOLD = find_font(FONT_BOLD_CANDIDATES)


def get_font(size, bold=False):
    path = FONT_BOLD if bold else FONT_NORMAL

    if path:
        return ImageFont.truetype(path, size)

    return ImageFont.load_default()


# =========================================================
# UTILITAS TEXT
# =========================================================

def wrap_text(text, width=34):
    return "\n".join(
        textwrap.wrap(
            text,
            width=width,
            break_long_words=False
        )
    )


def draw_centered_text(
    draw,
    text,
    y,
    font,
    fill="white",
    max_width=900,
    spacing=12
):
    """
    Menempatkan teks di tengah secara horizontal.
    """

    lines = text.split("\n")

    total_height = 0

    boxes = []

    for line in lines:
        box = draw.textbbox((0, 0), line, font=font)
        w = box[2] - box[0]
        h = box[3] - box[1]

        boxes.append((line, w, h))
        total_height += h + spacing

    total_height -= spacing

    current_y = y - total_height / 2

    for line, w, h in boxes:

        x = (WIDTH - w) / 2

        draw.text(
            (x + 3, current_y + 3),
            line,
            font=font,
            fill="black"
        )

        draw.text(
            (x, current_y),
            line,
            font=font,
            fill=fill
        )

        current_y += h + spacing


# =========================================================
# BACKGROUND
# =========================================================

def create_background(seed=1):

    random.seed(seed)

    img = Image.new(
        "RGB",
        (WIDTH, HEIGHT),
        (18, 22, 40)
    )

    draw = ImageDraw.Draw(img)

    # Gradient sederhana
    for y in range(HEIGHT):

        ratio = y / HEIGHT

        r = int(15 + 25 * ratio)
        g = int(20 + 15 * ratio)
        b = int(45 + 40 * ratio)

        draw.line(
            [(0, y), (WIDTH, y)],
            fill=(r, g, b)
        )

    # Lingkaran dekoratif
    for _ in range(18):

        x = random.randint(-200, WIDTH + 200)
        y = random.randint(-200, HEIGHT + 200)

        radius = random.randint(40, 180)

        draw.ellipse(
            (
                x - radius,
                y - radius,
                x + radius,
                y + radius
            ),
            outline=(60, 100, 180),
            width=3
        )

    return img


# =========================================================
# HEADER
# =========================================================

def draw_header(draw, title):

    font_account = get_font(38, True)
    font_title = get_font(48, True)

    draw.text(
        (55, 55),
        ACCOUNT,
        font=font_account,
        fill="white"
    )

    draw.text(
        (55, 115),
        title,
        font=font_title,
        fill="white"
    )


# =========================================================
# FOOTER
# =========================================================

def draw_footer(draw, text=None):

    if text is None:
        text = BRAND

    font = get_font(32, True)

    box = draw.textbbox(
        (0, 0),
        text,
        font=font
    )

    w = box[2] - box[0]

    draw.text(
        (
            (WIDTH - w) / 2,
            HEIGHT - 100
        ),
        text,
        font=font,
        fill="white"
    )


# =========================================================
# NARASI MATEMATIKA
# =========================================================

def math_to_speech(text):

    if not text:
        return ""

    s = str(text)

    # Pangkat
    s = re.sub(
        r"x²",
        "eks kuadrat",
        s
    )

    s = re.sub(
        r"x³",
        "eks pangkat tiga",
        s
    )

    # Perkalian angka dengan x
    s = re.sub(
        r"(\d+)\s*x",
        r"\1 eks",
        s,
        flags=re.IGNORECASE
    )

    # 2x
    s = re.sub(
        r"\b2x\b",
        "dua eks",
        s,
        flags=re.IGNORECASE
    )

    s = re.sub(
        r"\b3x\b",
        "tiga eks",
        s,
        flags=re.IGNORECASE
    )

    s = re.sub(
        r"\b4x\b",
        "empat eks",
        s,
        flags=re.IGNORECASE
    )

    # fungsi trigonometri
    s = re.sub(
        r"\bsin\s*x\b",
        "sinus eks",
        s,
        flags=re.IGNORECASE
    )

    s = re.sub(
        r"\bcos\s*x\b",
        "kosinus eks",
        s,
        flags=re.IGNORECASE
    )

    s = re.sub(
        r"\btan\s*x\b",
        "tangen eks",
        s,
        flags=re.IGNORECASE
    )

    # simbol
    replacements = {
        "√": "akar ",
        "≤": " kurang dari atau sama dengan ",
        "≥": " lebih dari atau sama dengan ",
        "=": " sama dengan ",
        "+": " ditambah ",
        "−": " dikurangi ",
        "-": " dikurangi ",
        "×": " dikali ",
        "÷": " dibagi ",
        "^": " pangkat ",
        "%": " persen ",
    }

    for symbol, spoken in replacements.items():
        s = s.replace(symbol, spoken)

    # tanda kurung
    s = s.replace("(", " kurung buka ")
    s = s.replace(")", " kurung tutup ")

    # rapikan spasi
    s = re.sub(
        r"\s+",
        " ",
        s
    ).strip()

    return s


# =========================================================
# SOAL TKA
# =========================================================

QUESTIONS = [

    {
        "id": 1,
        "element": "Aljabar",
        "type": "PG",
        "level": "HOTS",

        "question":
        "Diberikan fungsi f(x) = x² − 6x + 5. "
        "Jika grafik fungsi digeser 2 satuan ke kanan, "
        "koordinat titik puncak grafik baru adalah ...",

        "options": [
            "A. (1, −4)",
            "B. (3, −4)",
            "C. (5, −4)",
            "D. (3, 4)",
            "E. (5, 4)"
        ],

        "answer": "B",

        "explanation": [
            "Bentuk puncak fungsi awal adalah "
            "f(x) = (x − 3)² − 4.",
            "Titik puncak awal adalah (3, −4).",
            "Geser 2 satuan ke kanan berarti koordinat x "
            "bertambah 2.",
            "Maka titik puncak baru adalah (5, −4)."
        ]
    },


    {
        "id": 2,
        "element": "Bilangan",
        "type": "PG",
        "level": "HOTS",

        "question":
        "Sebuah bilangan positif x memenuhi "
        "log₂(x) + log₂(x − 2) = 3. "
        "Nilai x adalah ...",

        "options": [
            "A. 2",
            "B. 3",
            "C. 4",
            "D. 6",
            "E. 8"
        ],

        "answer": "D",

        "explanation": [
            "Gabungkan kedua logaritma.",
            "log₂[x(x − 2)] = 3.",
            "Berarti x(x − 2) = 8.",
            "Diperoleh x² − 2x − 8 = 0.",
            "Faktornya adalah (x − 4)(x + 2) = 0.",
            "Karena x harus lebih besar dari 2, "
            "maka x = 4."
        ]
    },


    {
        "id": 3,
        "element": "Geometri",
        "type": "PG",
        "level": "HOTS",

        "question":
        "Sebuah titik P bergerak pada lingkaran "
        "x² + y² = 25. "
        "Jika jarak titik P ke garis y = 7/3 "
        "maksimum, berapakah jarak maksimum tersebut?",

        "options": [
            "A. 5/3",
            "B. 8/3",
            "C. 10/3",
            "D. 17/3",
            "E. 22/3"
        ],

        "answer": "D",

        "explanation": [
            "Lingkaran memiliki pusat O(0,0) "
            "dan jari-jari 5.",
            "Jarak maksimum titik pada lingkaran "
            "ke garis horizontal terjadi pada titik "
            "paling jauh dari garis.",
            "Jarak pusat ke garis adalah 7/3.",
            "Maka jarak maksimum adalah "
            "5 + 7/3.",
            "Hasilnya adalah 22/3."
        ]
    },


    {
        "id": 4,
        "element": "Trigonometri",
        "type": "PG",
        "level": "HOTS",

        "question":
        "Jika sin θ = 3/5 dan θ berada di kuadran II, "
        "maka nilai cos 2θ adalah ...",

        "options": [
            "A. −7/25",
            "B. −1/25",
            "C. 7/25",
            "D. 16/25",
            "E. 24/25"
        ],

        "answer": "A",

        "explanation": [
            "Gunakan identitas cos 2θ = 1 − 2 sin² θ.",
            "Karena sin θ = 3/5, maka sin² θ = 9/25.",
            "Jadi cos 2θ = 1 − 18/25.",
            "Hasilnya adalah 7/25."
        ]
    },


    {
        "id": 5,
        "element": "Data dan Peluang",
        "type": "PG",
        "level": "HOTS",

        "question":
        "Sebuah kelas memiliki 5 siswa dengan "
        "nilai rata-rata 76. Setelah satu siswa "
        "mengikuti ujian susulan, rata-rata keenam "
        "siswa menjadi 78. Nilai siswa tersebut adalah ...",

        "options": [
            "A. 82",
            "B. 84",
            "C. 86",
            "D. 88",
            "E. 90"
        ],

        "answer": "D",

        "explanation": [
            "Jumlah nilai lima siswa adalah "
            "5 × 76 = 380.",
            "Jumlah nilai enam siswa adalah "
            "6 × 78 = 468.",
            "Nilai siswa yang mengikuti ujian susulan "
            "adalah 468 − 380.",
            "Jadi nilainya adalah 88."
        ]
    },


    {
        "id": 6,
        "element": "Aljabar",
        "type": "MULTI",
        "level": "HOTS",

        "question":
        "Diberikan fungsi f(x) = x² − 4x + 3. "
        "Pilih semua pernyataan yang benar.",

        "options": [
            "A. Grafik membuka ke atas.",
            "B. Titik puncaknya adalah (2, −1).",
            "C. Sumbu simetrinya x = 2.",
            "D. Nilai minimum fungsi adalah 1.",
            "E. Grafik memotong sumbu-x di x = 1 dan x = 3."
        ],

        "answers": [
            "A",
            "B",
            "C",
            "E"
        ],

        "explanation": [
            "Koefisien x² positif sehingga grafik membuka ke atas.",
            "f(x) = (x − 2)² − 1.",
            "Titik puncaknya adalah (2, −1).",
            "Sumbu simetrinya x = 2.",
            "Akar fungsi adalah x = 1 dan x = 3.",
            "Jadi pernyataan A, B, C, dan E benar."
        ]
    }
]


# =========================================================
# GRAFIK
# =========================================================

def create_parabola_graph():

    path = TEMP_DIR / "grafik_parabola.png"

    x = np.linspace(-2, 8, 400)
    y = x**2 - 6*x + 5

    fig = plt.figure(
        figsize=(9, 5),
        dpi=120
    )

    plt.plot(x, y)

    plt.axhline(
        0,
        linewidth=1
    )

    plt.axvline(
        0,
        linewidth=1
    )

    plt.scatter(
        [3],
        [-4],
        s=100
    )

    plt.text(
        3.1,
        -4,
        "(3, −4)"
    )

    plt.grid(
        True,
        alpha=0.3
    )

    plt.xlabel("x")
    plt.ylabel("f(x)")

    plt.tight_layout()

    plt.savefig(
        path,
        transparent=False
    )

    plt.close()

    return path


# =========================================================
# SLIDE
# =========================================================

def create_slide(
    title,
    main_text,
    footer=None,
    image_path=None,
    seed=1
):

    img = create_background(seed)

    draw = ImageDraw.Draw(img)

    draw_header(
        draw,
        title
    )

    # kotak konten
    box_left = 55
    box_right = WIDTH - 55
    box_top = 260
    box_bottom = 1540

    draw.rounded_rectangle(
        (
            box_left,
            box_top,
            box_right,
            box_bottom
        ),
        radius=40,
        outline=(120, 150, 210),
        width=3
    )

    # gambar
    if image_path and Path(image_path).exists():

        graph = Image.open(
            image_path
        ).convert("RGB")

        graph.thumbnail(
            (900, 650)
        )

        gx = (WIDTH - graph.width) // 2
        gy = 350

        img.paste(
            graph,
            (gx, gy)
        )

        text_y = 1100

    else:

        text_y = 900

    font = get_font(
        50,
        True
    )

    wrapped = wrap_text(
        main_text,
        31
    )

    draw_centered_text(
        draw,
        wrapped,
        text_y,
        font,
        fill="white"
    )

    draw_footer(
        draw,
        footer
    )

    return img


# =========================================================
# SLIDE PROMOSI
# =========================================================

def create_promo_slide(
    title,
    text,
    seed=1
):

    img = create_background(
        seed
    )

    draw = ImageDraw.Draw(img)

    font_title = get_font(
        65,
        True
    )

    font_text = get_font(
        52,
        True
    )

    draw_centered_text(
        draw,
        title,
        480,
        font_title
    )

    draw_centered_text(
        draw,
        wrap_text(text, 28),
        900,
        font_text
    )

    draw_footer(
        draw,
        WEBSITE
    )

    return img


# =========================================================
# BUAT NAMA FILE
# =========================================================

def output_directory():

    mode = VIDEO_MODE.upper()

    if mode == "EDUKASI":
        return EDUKASI_DIR

    if mode == "SOFT_PROMO":
        return SOFT_PROMO_DIR

    if mode == "PROMO":
        return PROMO_DIR

    raise ValueError(
        f"Mode tidak dikenal: {VIDEO_MODE}"
    )


# =========================================================
# NARASI PER MODE
# =========================================================

def get_intro(question):

    if VIDEO_MODE == "EDUKASI":

        return (
            "Coba jawab soal TKA berikut. "
            "Jangan langsung melihat pembahasannya."
        )

    if VIDEO_MODE == "SOFT_PROMO":

        return (
            "Coba jawab soal TKA berikut. "
            "Soal seperti ini bisa kamu gunakan "
            "untuk melatih kemampuan matematika."
        )

    if VIDEO_MODE == "PROMO":

        return (
            "Masih kesulitan latihan TKA Matematika? "
            "Mari coba satu soal berikut."
        )

    return ""


def get_cta():

    if VIDEO_MODE == "EDUKASI":

        return (
            "Ikuti Portal Matematika "
            "untuk soal berikutnya."
        )

    if VIDEO_MODE == "SOFT_PROMO":

        return (
            "Kalau ingin latihan lebih banyak, "
            "kunjungi math315.id. "
            "Link ada di bio."
        )

    if VIDEO_MODE == "PROMO":

        return (
            "Latihan soal TKA Matematika "
            "tersedia di Portal Matematika. "
            "Kunjungi math315.id. "
            "Link ada di bio."
        )

    return ""


# =========================================================
# AUDIO
# =========================================================

def generate_audio(text, output_path):

    """
    Placeholder TTS.

    Fungsi ini dapat dihubungkan ke:
    - edge-tts
    - gTTS
    - Piper
    - ElevenLabs
    - API TTS lainnya

    Untuk sementara generator tetap membuat video
    tanpa audio jika TTS belum dipasang.
    """

    print(
        "NARASI:",
        math_to_speech(text)
    )

    return None


# =========================================================
# MEMBUAT SLIDE VIDEO
# =========================================================

def make_video(
    question,
    question_number
):

    print()
    print("=" * 60)
    print(
        f"MEMBUAT SOAL {question_number}"
    )
    print(
        f"MODE : {VIDEO_MODE}"
    )
    print("=" * 60)

    slides = []

    # -----------------------------------------------------
    # INTRO
    # -----------------------------------------------------

    intro_text = get_intro(
        question
    )

    intro_img = create_slide(
        "LATIHAN TKA MATEMATIKA",
        intro_text,
        BRAND,
        seed=question_number * 10
    )

    slides.append(
        (
            intro_img,
            intro_text
        )
    )

    # -----------------------------------------------------
    # SOAL
    # -----------------------------------------------------

    question_text = question["question"]

    question_img = create_slide(
        f"SOAL {question_number} • {question['element']}",
        wrap_text(question_text, 30),
        BRAND,
        seed=question_number * 10 + 1
    )

    slides.append(
        (
            question_img,
            question_text
        )
    )

    # -----------------------------------------------------
    # PILIHAN
    # -----------------------------------------------------

    options_text = "\n".join(
        question["options"]
    )

    options_img = create_slide(
        "PILIHAN JAWABAN",
        options_text,
        "Pilih jawabanmu",
        seed=question_number * 10 + 2
    )

    slides.append(
        (
            options_img,
            options_text
        )
    )

    # -----------------------------------------------------
    # PEMBAHASAN
    # -----------------------------------------------------

    for i, step in enumerate(
        question["explanation"],
        start=1
    ):

        step_text = (
            f"Langkah {i}\n\n"
            f"{step}"
        )

        step_img = create_slide(
            "PEMBAHASAN",
            step_text,
            BRAND,
            seed=question_number * 20 + i
        )

        slides.append(
            (
                step_img,
                step_text
            )
        )

    # -----------------------------------------------------
    # JAWABAN
    # -----------------------------------------------------

    if question["type"] == "MULTI":

        answer = ", ".join(
            question["answers"]
        )

        answer_text = (
            "Jawaban benar:\n\n"
            + answer
        )

    else:

        answer = question["answer"]

        answer_text = (
            "Jawaban yang benar:\n\n"
            + answer
        )

    answer_img = create_slide(
        "JAWABAN",
        answer_text,
        BRAND,
        seed=question_number * 100
    )

    slides.append(
        (
            answer_img,
            answer_text
        )
    )

    # -----------------------------------------------------
    # CTA
    # -----------------------------------------------------

    cta = get_cta()

    cta_img = create_promo_slide(
        BRAND,
        cta,
        seed=question_number * 200
    )

    slides.append(
        (
            cta_img,
            cta
        )
    )

    # -----------------------------------------------------
    # MOVIEPY
    # -----------------------------------------------------

    clips = []

    image_files = []

    for i, (img, narration) in enumerate(
        slides
    ):

        image_path = (
            TEMP_DIR /
            f"q{question_number}_"
            f"{i}.png"
        )

        img.save(
            image_path
        )

        image_files.append(
            image_path
        )

        clip = (
            ImageClip(
                str(image_path)
            )
            .with_duration(
                DURATION_PER_SLIDE
            )
        )

        clips.append(
            clip
        )

    final_clip = concatenate_videoclips(
        clips,
        method="compose"
    )

    # -----------------------------------------------------
    # OUTPUT
    # -----------------------------------------------------

    output_dir = output_directory()

    filename = (
        f"tka12_"
        f"{VIDEO_MODE.lower()}_"
        f"{question_number:02d}.mp4"
    )

    output_path = (
        output_dir /
        filename
    )

    print(
        "Output:",
        output_path
    )

    final_clip.write_videofile(
        str(output_path),
        fps=FPS,
        codec="libx264",
        audio=False,
        preset="medium"
    )

    final_clip.close()

    for clip in clips:
        try:
            clip.close()
        except Exception:
            pass

    return output_path


# =========================================================
# GENERATE SEMUA VIDEO
# =========================================================

def generate_all():

    print()
    print("=" * 70)
    print("PORTAL MATEMATIKA - TIKTOK GENERATOR")
    print("=" * 70)
    print(
        f"MODE       : {VIDEO_MODE}"
    )
    print(
        f"ACCOUNT    : {ACCOUNT}"
    )
    print(
        f"WEBSITE    : {WEBSITE}"
    )
    print(
        f"OUTPUT     : {output_directory()}"
    )
    print("=" * 70)

    results = []

    for question in QUESTIONS:

        try:

            output = make_video(
                question,
                question["id"]
            )

            results.append(
                output
            )

        except Exception as error:

            print(
                f"GAGAL soal {question['id']}: "
                f"{error}"
            )

    print()
    print("=" * 70)
    print("SELESAI")
    print("=" * 70)

    for result in results:
        print(result)


# =========================================================
# MAIN
# =========================================================

if __name__ == "__main__":

    generate_all()
