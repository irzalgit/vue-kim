#!/usr/bin/env python3
"""
generate_tka12.py
Membuat video iklan vertikal (1080x1920, 9:16) untuk math315.id
Persiapan TKA (Tes Kemampuan Akademik) kelas 12.

Kebutuhan:
    pip install pillow numpy
    ffmpeg terpasang di sistem (ffmpeg -version)

Pemakaian:
    python generate_tka12.py
    python generate_tka12.py --output iklan.mp4 --music musik.mp3

Edit bagian SCENES di bawah untuk mengganti teks/durasi/warna.
"""

import argparse
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# ---------------- Pengaturan umum ----------------
W, H = 1080, 1920
FPS = 30
FADE = 0.4  # detik fade in/out tiap scene

BRAND = "math315.id"
URL = "www.math315.id"

# Setiap scene: durasi (detik), warna gradasi atas & bawah, teks utama, teks kecil
SCENES = [
    {
        "dur": 3.5,
        "c1": (30, 41, 110), "c2": (79, 70, 229),
        "title": "TKA Kelas 12\nSebentar Lagi?",
        "sub": "Matematika bikin deg-degan?",
    },
    {
        "dur": 5.0,
        "c1": (127, 29, 29), "c2": (220, 80, 60),
        "title": "Les mahal.\nJadwal bentrok.\nPenjelasan terlalu cepat.",
        "sub": "Persiapan jadi tidak maksimal",
    },
    {
        "dur": 7.0,
        "c1": (6, 78, 59), "c2": (16, 185, 129),
        "title": "Belajar di\nmath315.id",
        "sub": "Video pembahasan\nLatihan soal TKA\nUlangi materi sampai paham",
    },
    {
        "dur": 5.0,
        "c1": (124, 45, 18), "c2": (245, 158, 11),
        "title": "15 menit sehari,\nnilai ikut naik",
        "sub": "Belajar kapan saja, dari HP",
    },
    {
        "dur": 6.0,
        "c1": (30, 41, 110), "c2": (14, 165, 233),
        "title": "Berlangganan\nsekarang!",
        "sub": URL,
        "cta": "Pelajari Selengkapnya",
    },
]

FONT_BOLD_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
]
FONT_REG_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]


def load_font(candidates, size):
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


F_TITLE = load_font(FONT_BOLD_CANDIDATES, 96)
F_SUB = load_font(FONT_REG_CANDIDATES, 52)
F_BRAND = load_font(FONT_BOLD_CANDIDATES, 44)
F_CTA = load_font(FONT_BOLD_CANDIDATES, 60)


def gradient(c1, c2):
    """Latar gradasi vertikal."""
    t = np.linspace(0, 1, H)[:, None, None]
    top = np.array(c1, dtype=np.float32)[None, None, :]
    bot = np.array(c2, dtype=np.float32)[None, None, :]
    img = top * (1 - t) + bot * t
    return np.repeat(img, W, axis=1).astype(np.uint8)


def draw_centered(draw, text, font, y, fill, spacing=18):
    """Gambar teks multi-baris di tengah; kembalikan y berikutnya."""
    for line in text.split("\n"):
        box = draw.textbbox((0, 0), line, font=font)
        w, h = box[2] - box[0], box[3] - box[1]
        # bayangan tipis agar mudah dibaca
        draw.text(((W - w) / 2 + 4, y + 4), line, font=font, fill=(0, 0, 0, 90))
        draw.text(((W - w) / 2, y), line, font=font, fill=fill)
        y += h + spacing
    return y


def text_height(draw, text, font, spacing=18):
    total = 0
    for line in text.split("\n"):
        box = draw.textbbox((0, 0), line, font=font)
        total += (box[3] - box[1]) + spacing
    return total


def render_scene_base(scene):
    """Render 1 gambar statis untuk scene (teks sudah menempel)."""
    img = Image.fromarray(gradient(scene["c1"], scene["c2"])).convert("RGBA")

    # lingkaran dekoratif lembut
    deco = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(deco)
    dd.ellipse((-250, -250, 450, 450), fill=(255, 255, 255, 28))
    dd.ellipse((W - 450, H - 550, W + 250, H + 150), fill=(255, 255, 255, 24))
    img = Image.alpha_composite(img, deco)

    d = ImageDraw.Draw(img)
    th = text_height(d, scene["title"], F_TITLE)
    sh = text_height(d, scene["sub"], F_SUB, 14)
    y = (H - (th + sh + 70)) / 2 - 60
    y = draw_centered(d, scene["title"], F_TITLE, y, (255, 255, 255, 255))
    y += 50
    draw_centered(d, scene["sub"], F_SUB, y, (255, 255, 255, 230), spacing=14)

    # tombol CTA (opsional)
    if scene.get("cta"):
        bw, bh = 760, 130
        x0, y0 = (W - bw) // 2, H - 520
        d.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), radius=65,
                            fill=(255, 255, 255, 255))
        box = d.textbbox((0, 0), scene["cta"], font=F_CTA)
        tw, tx_h = box[2] - box[0], box[3] - box[1]
        d.text(((W - tw) / 2, y0 + (bh - tx_h) / 2 - 8), scene["cta"],
               font=F_CTA, fill=scene["c1"] + (255,))

    # watermark brand
    box = d.textbbox((0, 0), BRAND, font=F_BRAND)
    d.text(((W - (box[2] - box[0])) / 2, H - 150), BRAND,
           font=F_BRAND, fill=(255, 255, 255, 200))

    return np.array(img.convert("RGB"), dtype=np.float32)


def main():
    ap = argparse.ArgumentParser(description="Generate video iklan math315.id (TKA 12)")
    ap.add_argument("--output", default="math315_tka12.mp4")
    ap.add_argument("--music", default=None, help="file audio opsional (mp3/wav)")
    args = ap.parse_args()

    total = sum(s["dur"] for s in SCENES)
    print(f"Membuat video {W}x{H}, {total:.1f} detik...")

    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
        "-r", str(FPS), "-i", "-",
    ]
    if args.music:
        cmd += ["-i", args.music, "-shortest", "-c:a", "aac", "-b:a", "128k",
                "-af", f"afade=t=out:st={max(total - 1.5, 0)}:d=1.5"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20",
            "-movflags", "+faststart", args.output]

    try:
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    except FileNotFoundError:
        sys.exit("ffmpeg tidak ditemukan. Pasang ffmpeg lebih dulu.")

    black = np.zeros((H, W, 3), dtype=np.float32)
    for i, scene in enumerate(SCENES, 1):
        base = render_scene_base(scene)
        n = int(scene["dur"] * FPS)
        fade_n = int(FADE * FPS)
        for f in range(n):
            # fade in/out; scene pertama langsung tampil, scene terakhir tidak fade out
            a = 1.0
            if i > 1 and f < fade_n:
                a = f / fade_n
            if i < len(SCENES) and f >= n - fade_n:
                a = (n - f) / fade_n
            # gerak zoom halus (parallax ringan) lewat geser vertikal kecil
            frame = black * (1 - a) + base * a
            proc.stdin.write(frame.astype(np.uint8).tobytes())
        print(f"  scene {i}/{len(SCENES)} selesai")

    proc.stdin.close()
    proc.wait()
    if proc.returncode != 0:
        sys.exit("ffmpeg gagal membuat video.")
    print(f"Selesai: {args.output}")


if __name__ == "__main__":
    main()
