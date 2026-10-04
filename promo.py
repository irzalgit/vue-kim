#!/usr/bin/env python3
"""
Video promo portal math315.id untuk Ayah & Bunda siswa SMA kelas 12 (portrait 1080 x 1920).

Skrip ini memakai fungsi gambar, suara, dan ffmpeg dari generate_data_hots.py,
jadi letakkan KEDUA file di folder yang sama.

Pemakaian:
    python generate_promo_ortu.py                      # buat video_promo_ortu.mp4
    python generate_promo_ortu.py hasil.mp4 --bgm bgm_canon_in_d.ogg
    python generate_promo_ortu.py --frames-only        # hanya simpan PNG tiap adegan (cek tampilan, tanpa suara)
"""
import os
import sys
import math
import shutil
import argparse

import generate_data_hots as g
from generate_data_hots import (
    WIDTH, HEIGHT, FPS, S, Image, ImageDraw, ImageChops, RESAMPLE,
    get_font, wrap_text, draw_rounded_rect, draw_colorful_background, draw_blue_check,
)

# ============================================================
# PENGATURAN YANG MUDAH DIUBAH
# ============================================================
DOMAIN = "https://www.math315.id"     # alamat lengkap yang tampil di layar
DOMAIN_SPOKEN = "we we we titik math tiga satu lima titik ai di"  # cara TTS membacakannya
ACCOUNT = "@pairzal"
VIEWS_TEXT = "47.000"                 # jumlah penonton yang tampil di layar
VIEWS_TARGET = 47000
VIEWS_SPOKEN = "empat puluh tujuh ribu"

BG_TOP = "#070B19"


# ============================================================
# IKON (memakai fungsi gambar di generate_data_hots.py)
# ============================================================
_icon_cache = {}


def render_icon(fn, target_w, *extra, **kw):
    """Gambar ikon vektor PIL pada kanvas transparan, potong tepinya, lalu skala ke lebar target."""
    key = (fn.__name__, target_w, extra, tuple(sorted(kw.items())))
    if key in _icon_cache:
        return _icon_cache[key]
    k, box = 3, 900
    im = Image.new("RGBA", (box * k, box * k), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    fn(d, k, box / 2, box / 2, 420, *extra, **kw)
    bb = im.getbbox()
    im = im.crop(bb)
    ratio = target_w / im.width
    out = im.resize((max(1, int(im.width * ratio)), max(1, int(im.height * ratio))), RESAMPLE)
    _icon_cache[key] = out
    return out


def paste_icon(img, fn, cx, cy, target_w, *extra, **kw):
    ic = render_icon(fn, target_w, *extra, **kw)
    img.paste(ic, (int(cx - ic.width / 2), int(cy - ic.height / 2)), ic)


def draw_link_icon(img, cx, cy, s, color="#38BDF8"):
    d = ImageDraw.Draw(img)
    w = max(6, int(s * 0.10))
    for dx, dy in ((-0.17, 0.08), (0.17, -0.08)):
        x, y = cx + dx * s, cy + dy * s
        d.rounded_rectangle((x - 0.30 * s, y - 0.16 * s, x + 0.30 * s, y + 0.16 * s), radius=int(0.16 * s), outline=color, width=w)
    d.line((cx - 0.12 * s, cy + 0.02 * s, cx + 0.12 * s, cy - 0.02 * s), fill=color, width=w)


def draw_red_x(draw, cx, cy, r):
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill="#EF4444", outline="#FFFFFF", width=max(3, r // 12))
    w = max(5, int(r * 0.22))
    a = r * 0.42
    draw.line((cx - a, cy - a, cx + a, cy + a), fill="#FFFFFF", width=w)
    draw.line((cx - a, cy + a, cx + a, cy - a), fill="#FFFFFF", width=w)


# ============================================================
# KOMPONEN UMUM
# ============================================================
def new_canvas():
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_TOP)
    draw = ImageDraw.Draw(img)
    draw_colorful_background(draw, WIDTH, HEIGHT)
    return img, draw


def header_bar(draw, right_text="UNTUK AYAH & BUNDA"):
    draw_rounded_rect(draw, (40, 45, 480, 125), radius=22, fill="#121829", outline="#3B82F6", width=2)
    draw.text((65, 70), f"♫ {ACCOUNT}", font=get_font(S(30), bold=True), fill="#FFFFFF")
    draw_rounded_rect(draw, (505, 45, WIDTH - 40, 125), radius=22, fill="#121829", outline="#3B82F6", width=2)
    f = get_font(S(26), bold=True)
    tb = f.getbbox(right_text)
    draw.text((505 + (WIDTH - 40 - 505 - (tb[2] - tb[0])) / 2, 70), right_text, font=f, fill="#38BDF8")


def fit_font(text, size, max_w, bold=True, min_size=20):
    """Kecilkan ukuran font sampai teks muat dalam max_w piksel."""
    while size > min_size and get_font(size, bold).getlength(text) > max_w:
        size -= 2
    return get_font(size, bold)


def center_text(draw, y, text, font, fill, max_w=WIDTH - 160, line_h=None, anchor_x=WIDTH // 2):
    lines = wrap_text(text, font, max_w)
    lh = line_h or round(font.size * 1.25)
    for ln in lines:
        tb = font.getbbox(ln)
        draw.text((anchor_x - (tb[2] - tb[0]) / 2 - tb[0], y), ln, font=font, fill=fill)
        y += lh
    return y


def pill(draw, cx, y, text, font, fill, text_fill="#FFFFFF", outline=None, pad_x=40, pad_y=16):
    tb = font.getbbox(text)
    w, h = tb[2] - tb[0], tb[3] - tb[1]
    draw_rounded_rect(draw, (cx - w / 2 - pad_x, y, cx + w / 2 + pad_x, y + h + 2 * pad_y), radius=int((h + 2 * pad_y) / 2),
                      fill=fill, outline=outline, width=3 if outline else 1)
    draw.text((cx - w / 2 - tb[0], y + pad_y - tb[1]), text, font=font, fill=text_fill)
    return y + h + 2 * pad_y


# ============================================================
# ADEGAN 1 - PEMBUKA
# ============================================================
def frame_hook():
    img, draw = new_canvas()
    header_bar(draw)

    paste_icon(img, g._icon_gradcap, 540, 330, 520)
    paste_icon(img, g._icon_book, 200, 560, 230)
    paste_icon(img, g._icon_pencil, 880, 560, 260, deg=-30)
    paste_icon(img, g._icon_star, 150, 300, 110)
    paste_icon(img, g._icon_heart, 930, 300, 120)

    draw_rounded_rect(draw, (60, 700, WIDTH - 60, 1160), radius=36, fill="#111827", outline="#4F46E5", width=3)
    y = center_text(draw, 745, "Ayah & Bunda,", get_font(S(60), True), "#FBBF24")
    y = center_text(draw, y + 10, "anak kelas 12 sedang berjuang menuju", get_font(S(46), True), "#FFFFFF", max_w=WIDTH - 200)
    y = pill(draw, 540, y + 25, "TKA MATEMATIKA 2026", get_font(S(54), True), "#FE2C55", pad_x=50, pad_y=22)

    center_text(draw, 1250, "Ada satu hal penting yang perlu Ayah & Bunda tahu.", get_font(S(38), True), "#93C5FD", max_w=WIDTH - 180)
    paste_icon(img, g._icon_smiley, 540, 1640, 230)
    return img


# ============================================================
# ADEGAN 2 - FAKTA 24 RIBU VIEW, 0 KLIK
# ============================================================
def frame_fact(count):
    img, draw = new_canvas()
    header_bar(draw)

    draw_rounded_rect(draw, (60, 170, WIDTH - 60, 790), radius=36, fill="#111827", outline="#38BDF8", width=3)
    center_text(draw, 215, "Video pembahasan kami sudah ditonton", get_font(S(36), True), "#CBD5E1", max_w=WIDTH - 200)
    num = f"{count:,}".replace(",", ".")
    center_text(draw, 330, num, get_font(S(150), True), "#38BDF8")
    center_text(draw, 590, "KALI", get_font(S(56), True), "#FFFFFF")
    paste_icon(img, g._icon_barchart, 190, 700, 130)
    paste_icon(img, g._icon_star, 890, 700, 90)

    draw_rounded_rect(draw, (60, 840, WIDTH - 60, 1480), radius=36, fill="#1F1020", outline="#EF4444", width=3)
    draw_link_icon(img, 540, 960, 190)
    draw_red_x(draw, 650, 1000, 55)
    center_text(draw, 1070, "0", get_font(S(150), True), "#F87171")
    center_text(draw, 1340, "yang membuka link di bio", get_font(S(44), True), "#FFFFFF", max_w=WIDTH - 200)

    center_text(draw, 1560, "Padahal semua latihan dan pembahasannya ada di sana.", get_font(S(40), True), "#FBBF24", max_w=WIDTH - 180)
    return img


# ============================================================
# ADEGAN 3 - ISI PORTAL
# ============================================================
def frame_features():
    img, draw = new_canvas()
    header_bar(draw, "PORTAL MATH315.ID")

    center_text(draw, 170, "Apa isi portal", get_font(S(48), True), "#FFFFFF")
    fu = fit_font(DOMAIN, S(78), WIDTH - 120)
    center_text(draw, 310 - fu.size // 2, DOMAIN, fu, "#38BDF8", max_w=WIDTH - 100)

    items = [
        (g._icon_sheet, "Video pembahasan soal TKA level HOTS, langkah demi langkah"),
        (g._icon_gradcap, "Latihan soal per topik sesuai kisi-kisi TKA 2026"),
        (g._icon_barchart, "Rapor: topik mana yang sudah dikuasai anak"),
        (g._icon_bulb, "Galeri video yang bisa ditonton kapan saja"),
    ]
    top, h, gap = 410, 290, 26
    f = get_font(S(36), True)
    for i, (fn, text) in enumerate(items):
        y0 = top + i * (h + gap)
        draw_rounded_rect(draw, (50, y0, WIDTH - 50, y0 + h), radius=30, fill="#111827", outline="#4F46E5", width=3)
        paste_icon(img, fn, 180, y0 + h / 2, 150)
        lines = wrap_text(text, f, WIDTH - 470)
        lh = round(f.size * 1.2)
        ty = y0 + (h - len(lines) * lh) / 2
        for ln in lines:
            draw.text((290, ty), ln, font=f, fill="#FFFFFF")
            ty += lh
        draw_blue_check(draw, WIDTH - 110, y0 + h / 2, 34)
    pill(draw, 540, 1790, f"Semua ada di {DOMAIN}", fit_font(f"Semua ada di {DOMAIN}", S(36), 880), "#FE2C55", pad_x=50, pad_y=18)
    return img


# ============================================================
# ADEGAN 4 - PERAN AYAH & BUNDA
# ============================================================
def frame_parents():
    img, draw = new_canvas()
    header_bar(draw)

    paste_icon(img, g._icon_heart, 540, 330, 330)
    paste_icon(img, g._icon_star, 220, 250, 120)
    paste_icon(img, g._icon_star, 860, 400, 90)

    center_text(draw, 560, "Peran Ayah & Bunda", get_font(S(62), True), "#FBBF24")
    center_text(draw, 660, "tidak perlu pandai matematika", get_font(S(42), True), "#CBD5E1")

    items = [
        "Tanyakan: \"Sudah latihan hari ini?\"",
        "Lihat rapor topik bersama anak",
        "Beri semangat, sekecil apa pun kemajuannya",
    ]
    f = get_font(S(38), True)
    y0 = 800
    for i, text in enumerate(items):
        yy = y0 + i * 250
        draw_rounded_rect(draw, (50, yy, WIDTH - 50, yy + 215), radius=30, fill="#111827", outline="#EC4899", width=3)
        draw.ellipse((90, yy + 55, 195, yy + 160), fill="#EC4899")
        nf = get_font(S(52), True)
        tb = nf.getbbox(str(i + 1))
        draw.text((142 - (tb[2] - tb[0]) / 2 - tb[0], 107 + yy - (tb[3] - tb[1]) / 2 - tb[1]), str(i + 1), font=nf, fill="#FFFFFF")
        lines = wrap_text(text, f, WIDTH - 360)
        lh = round(f.size * 1.2)
        ty = yy + (215 - len(lines) * lh) / 2
        for ln in lines:
            draw.text((235, ty), ln, font=f, fill="#FFFFFF")
            ty += lh
    center_text(draw, 1610, "Dukungan kecil, dampaknya besar.", get_font(S(38), True), "#93C5FD", max_w=WIDTH - 100)
    return img


# ============================================================
# ADEGAN 5 - CARA MEMBUKA (HP + KETIK ALAMAT)
# ============================================================
def draw_phone(img, draw, typed, show_cursor):
    x0, y0, x1, y1 = 140, 170, 940, 1190
    draw_rounded_rect(draw, (x0, y0, x1, y1), radius=70, fill="#0B0F19", outline="#64748B", width=6)
    sx0, sy0, sx1, sy1 = x0 + 22, y0 + 60, x1 - 22, y1 - 40
    draw_rounded_rect(draw, (sx0, sy0, sx1, sy1), radius=36, fill="#F1F5F9")
    draw_rounded_rect(draw, (x0 + 200, y0 + 20, x1 - 200, y0 + 42), radius=11, fill="#1E293B")  # notch

    # bilah alamat browser
    bar = (sx0 + 22, sy0 + 25, sx1 - 22, sy0 + 105)
    draw_rounded_rect(draw, bar, radius=40, fill="#FFFFFF", outline="#38BDF8", width=4)
    f = fit_font(DOMAIN, S(34), bar[2] - bar[0] - 90)  # ukuran tetap selama mengetik
    text = typed
    th = f.getbbox("Ag")
    draw.text((bar[0] + 30, (bar[1] + bar[3]) / 2 - (th[1] + th[3]) / 2), text, font=f, fill="#0F172A")
    if show_cursor:
        w = draw.textlength(text, font=f)
        cx = bar[0] + 30 + w + 4
        draw.rectangle((cx, sy0 + 38, cx + 4, sy0 + 92), fill="#0EA5E9")

    # isi halaman (tampil setelah alamat lengkap)
    page_top = sy0 + 140
    if typed == DOMAIN:
        draw_rounded_rect(draw, (sx0 + 22, page_top, sx1 - 22, page_top + 130), radius=22, fill="#1A1A2E")
        tf = get_font(S(34), True)
        t = "Galeri Video"
        tb = tf.getbbox(t)
        draw.text(((sx0 + sx1) / 2 - (tb[2] - tb[0]) / 2 - tb[0], page_top + 40), t, font=tf, fill="#E94560")
        for i in range(2):
            ty = page_top + 160 + i * 300
            draw_rounded_rect(draw, (sx0 + 22, ty, sx1 - 22, ty + 270), radius=22, fill="#0F172A")
            cx, cy = (sx0 + sx1) / 2, ty + 135
            draw.ellipse((cx - 55, cy - 55, cx + 55, cy + 55), fill="#E94560")
            draw.polygon([(cx - 18, cy - 30), (cx - 18, cy + 30), (cx + 32, cy)], fill="#FFFFFF")
    else:
        center_text(draw, page_top + 260, "Ketik alamat di sini", get_font(S(30), True), "#94A3B8", max_w=sx1 - sx0 - 80,
                    anchor_x=(sx0 + sx1) // 2)


def frame_howto(progress):
    """progress 0..1 selama adegan: langkah 1 -> 2 (mengetik) -> 3 -> penutup."""
    img, draw = new_canvas()
    header_bar(draw, "CARA MEMBUKA")

    if progress < 0.28:
        active = 0
    elif progress < 0.58:
        active = 1
    else:
        active = 2

    type_p = 0.0 if progress < 0.28 else min(1.0, (progress - 0.28) / 0.22)
    typed = DOMAIN[: int(round(len(DOMAIN) * type_p))]
    cursor = (int(progress * 30) % 2 == 0) or typed != DOMAIN
    draw_phone(img, draw, typed, cursor)

    steps = [
        "Buka browser di HP Ayah atau Bunda",
        f"Ketik  {DOMAIN}",
        "Pilih topik, temani anak berlatih",
    ]
    f = get_font(S(36), True)
    top = 1230
    for i, text in enumerate(steps):
        y0 = top + i * 190
        on = (i == active)
        draw_rounded_rect(draw, (50, y0, WIDTH - 50, y0 + 165), radius=28,
                          fill="#0B2A55" if on else "#111827", outline="#1D9BF0" if on else "#374151", width=4 if on else 2)
        draw.ellipse((85, y0 + 35, 180, y0 + 130), fill="#1D9BF0" if on else "#374151")
        nf = get_font(S(48), True)
        tb = nf.getbbox(str(i + 1))
        draw.text((132 - (tb[2] - tb[0]) / 2 - tb[0], y0 + 82 - (tb[3] - tb[1]) / 2 - tb[1]), str(i + 1), font=nf, fill="#FFFFFF")
        sf = fit_font(text, S(36), WIDTH - 330) if "http" in text else f
        lines = wrap_text(text, sf, WIDTH - 330)
        lh = round(sf.size * 1.2)
        ty = y0 + (165 - len(lines) * lh) / 2
        for ln in lines:
            draw.text((215, ty), ln, font=sf, fill="#FFFFFF" if on else "#9CA3AF")
            ty += lh
    return img


# ============================================================
# ADEGAN 6 - PENUTUP / AJAKAN
# ============================================================
def frame_cta():
    img, draw = new_canvas()
    header_bar(draw)

    paste_icon(img, g._icon_smiley, 540, 330, 330)
    paste_icon(img, g._icon_star, 200, 260, 120)
    paste_icon(img, g._icon_heart, 890, 300, 130)

    center_text(draw, 560, "BUKA SEKARANG", get_font(S(68), True), "#FBBF24")

    draw_rounded_rect(draw, (60, 700, WIDTH - 60, 1000), radius=40, fill="#111827", outline="#4F46E5", width=4)
    center_text(draw, 740, "Ketik di browser:", get_font(S(38), True), "#CBD5E1")
    fc = fit_font(DOMAIN, S(104), WIDTH - 180)
    center_text(draw, 880 - fc.size // 2, DOMAIN, fc, "#38BDF8", max_w=WIDTH - 140)

    draw_rounded_rect(draw, (60, 1060, WIDTH - 60, 1260), radius=34, fill="#FE2C55")
    center_text(draw, 1095, "Bagikan ke grup WhatsApp", get_font(S(42), True), "#FFFFFF")
    center_text(draw, 1160, "wali murid kelas 12", get_font(S(42), True), "#FFFFFF")

    draw_rounded_rect(draw, (60, 1320, WIDTH - 60, 1510), radius=34, fill="#111827", outline="#3B82F6", width=3)
    center_text(draw, 1355, f"Like, Simpan & Follow {ACCOUNT}", get_font(S(40), True), "#FFFFFF", max_w=WIDTH - 160)
    center_text(draw, 1435, "Semangat untuk anak-anak kita!", get_font(S(34), True), "#93C5FD")

    center_text(draw, 1595, "Tidak perlu klik link di bio.", get_font(S(40), True), "#FBBF24")
    center_text(draw, 1665, "Cukup ketik alamatnya.", get_font(S(40), True), "#FBBF24")
    return img


# ============================================================
# NARASI (TTS) - angka dan alamat ditulis sesuai bunyinya
# ============================================================
NARASI = {
    "hook": (
        "Ayah, Bunda. Anak kita yang duduk di kelas dua belas sedang berjuang menghadapi te ka a matematika "
        "dua ribu dua puluh enam. Ada satu hal penting yang perlu Ayah dan Bunda ketahui."
    ),
    "fact": (
        f"Video-video pembahasan kami sudah ditonton {VIEWS_SPOKEN} kali. Tetapi, belum ada satu pun yang membuka "
        "link di bio. Padahal, semua latihan dan pembahasannya ada di sana."
    ),
    "features": (
        f"Di portal {DOMAIN_SPOKEN}, ada video pembahasan soal te ka a level HOTS langkah demi langkah, "
        "latihan soal per topik sesuai kisi-kisi te ka a dua ribu dua puluh enam, rapor yang menunjukkan topik mana "
        "yang sudah dikuasai anak, dan galeri video yang bisa ditonton kapan saja."
    ),
    "parents": (
        "Ayah dan Bunda tidak perlu pandai matematika. Cukup tanyakan, sudah latihan hari ini? Lihat rapor topik "
        "bersama anak, dan beri semangat, sekecil apa pun kemajuannya. Dukungan kecil, dampaknya besar."
    ),
    "howto": (
        "Tidak perlu repot mencari link di bio. Cukup tiga langkah. Satu, buka browser di HP Ayah atau Bunda. "
        f"Dua, ketik {DOMAIN_SPOKEN}. Tiga, pilih topik dan temani anak berlatih."
    ),
    "cta": (
        f"Ayah, Bunda, jangan menunggu sampai hari ujian. Buka {DOMAIN_SPOKEN} sekarang juga, dan bagikan video ini "
        "ke grup WhatsApp wali murid kelas dua belas. Semangat untuk anak-anak kita!"
    ),
}


# ============================================================
# RENDER VIDEO
# ============================================================
def build_video(output_mp4, bgm_path=None, bgm_volume=0.25):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    temp_dir = os.path.join(base_dir, "temp_promo_ortu")
    os.makedirs(temp_dir, exist_ok=True)
    segs = []

    def audio_for(name):
        path = os.path.join(temp_dir, f"{name}.mp3")
        g.generate_voice(NARASI[name], path)
        return path, g.get_audio_duration(path)

    def still(name, img, pad=0.8):
        a, dur = audio_for(name)
        png = os.path.join(temp_dir, f"{name}.png")
        img.save(png)
        out = os.path.join(temp_dir, f"{name}.mp4")
        g.render_still_video(png, a, out, dur + pad)
        segs.append(out)

    print("1/6 Pembuka...")
    still("hook", frame_hook())

    print("2/6 Fakta 24 ribu view...")
    a, dur = audio_for("fact")
    total = dur + 1.0
    n = int(total * FPS)
    count_frames = int(2.6 * FPS)
    cache = {}

    def fact_iter():
        for f in range(n):
            v = VIEWS_TARGET if f >= count_frames else int(VIEWS_TARGET * (1 - (1 - f / count_frames) ** 3))
            v = (v // 100) * 100 if v < VIEWS_TARGET else v
            if v not in cache:
                cache[v] = g.png_bytes(frame_fact(v))
            yield cache[v]

    out = os.path.join(temp_dir, "fact.mp4")
    g.pipe_frames_to_video(fact_iter(), a, out, total, apad=True)
    segs.append(out)

    print("3/6 Isi portal...")
    still("features", frame_features())

    print("4/6 Peran orang tua...")
    still("parents", frame_parents())

    print("5/6 Cara membuka (animasi ketik)...")
    a, dur = audio_for("howto")
    total = dur + 1.2
    n = int(total * FPS)
    cache = {}

    def how_iter():
        for f in range(n):
            p = f / max(1, n - 1)
            key = (min(2, 0 if p < 0.28 else (1 if p < 0.58 else 2)),
                   int(round(len(DOMAIN) * (0 if p < 0.28 else min(1.0, (p - 0.28) / 0.22)))),
                   (int(p * 30) % 2 == 0))
            if key not in cache:
                cache[key] = g.png_bytes(frame_howto(p))
            yield cache[key]

    out = os.path.join(temp_dir, "howto.mp4")
    g.pipe_frames_to_video(how_iter(), a, out, total, apad=True)
    segs.append(out)

    print("6/6 Penutup...")
    still("cta", frame_cta(), pad=1.2)

    concat = os.path.join(temp_dir, "concat.txt")
    with open(concat, "w") as fh:
        for p in segs:
            fh.write(f"file '{p}'\n")
    merged = os.path.join(temp_dir, "merged.mp4")
    g.run_cmd(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat, "-c:v", "libx264", "-preset", "ultrafast",
               "-r", FPS, "-c:a", "aac", "-ar", g.SAMPLE_RATE, "-ac", "2", "-b:a", "192k", "-pix_fmt", "yuv420p", merged])

    bgm = bgm_path or os.path.join(base_dir, "bgm_canon_in_d.ogg")
    if os.path.exists(bgm):
        g.run_cmd(["ffmpeg", "-y", "-i", merged, "-stream_loop", "-1", "-i", bgm, "-filter_complex",
                   f"[0:a]volume=1.0[v];[1:a]volume={bgm_volume}[b];[v][b]amix=inputs=2:duration=first:dropout_transition=2[a]",
                   "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-ar", g.SAMPLE_RATE, "-b:a", "192k", output_mp4])
    else:
        print(f"(musik latar tidak ditemukan: {bgm} - video dibuat tanpa musik)")
        shutil.copyfile(merged, output_mp4)
    print(f"\nSELESAI! Video promo: {output_mp4}")


def dump_frames(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    frames = {
        "1_hook": frame_hook(),
        "2_fakta": frame_fact(VIEWS_TARGET),
        "3_isi_portal": frame_features(),
        "4_peran_ortu": frame_parents(),
        "5a_langkah1": frame_howto(0.10),
        "5b_mengetik": frame_howto(0.43),
        "5c_langkah3": frame_howto(0.85),
        "6_ajakan": frame_cta(),
    }
    for name, im in frames.items():
        im.save(os.path.join(out_dir, f"promo_{name}.png"))
    print(f"{len(frames)} gambar disimpan di {out_dir}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Video promo portal math315.id untuk Ayah & Bunda siswa kelas 12")
    ap.add_argument("output", nargs="?", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "video_promo_ortu.mp4"))
    ap.add_argument("--bgm", default=None, help="Path file musik latar")
    ap.add_argument("--vol", type=float, default=0.25, help="Volume musik latar (default 0.25)")
    ap.add_argument("--frames-only", action="store_true", help="Hanya simpan PNG tiap adegan, tanpa suara/video")
    args = ap.parse_args()

    if args.frames_only:
        dump_frames(os.path.join(os.path.dirname(os.path.abspath(__file__)), "promo_frames"))
        sys.exit(0)
    build_video(args.output, bgm_path=args.bgm, bgm_volume=args.vol)
