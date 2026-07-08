Vue-Kim Blueprint v0.1

«Living Document
Last Updated: July 2026»

---

1. Purpose

Dokumen ini menjadi acuan utama pengembangan Vue-Kim.

Semua implementasi baru harus mengacu pada Blueprint ini.

Blueprint bersifat dinamis dan akan berkembang mengikuti implementasi sistem.

---

2. Vision

Membangun platform asesmen matematika berbasis Agentic AI yang mampu:

- menyelenggarakan asesmen adaptif,
- menganalisis hasil menggunakan Claude API,
- memberikan rekomendasi belajar personal,
- menghasilkan Learning Analytics,
- mendukung scan lembar jawaban,
- siap melayani hingga 600.000 pengguna.

---

3. Philosophy

Vue-Kim bukan chatbot AI.

Vue-Kim adalah platform asesmen matematika.

Claude API digunakan sebagai mesin penalaran (Reasoning Engine).

Prompt dibangun otomatis oleh sistem berdasarkan hasil asesmen.

---

4. Core Principles

1. Documentation First
2. Blueprint Before Code
3. Reuse Existing Components
4. Modular Architecture
5. Data Driven Learning
6. AI Assisted Assessment
7. Continuous Improvement

---

5. System Architecture

Student

↓

Assessment Engine

↓

Agent Manager

↓

Prompt Builder

↓

Claude API

↓

Learning Analytics

↓

Dashboard

↓

Email Report

---

6. Project Modules

Foundation

- Authentication
- Dashboard
- Assessment
- Report

AI

- Agent Manager
- Prompt Builder
- Claude API

Analytics

- Statistics
- Learning Profile
- Learning Graph

Future

- OMR
- QR
- National Analytics

---

7. Assessment Engine

Tahap pertama pengembangan.

Fitur:

- Bank Soal
- Timer
- Navigasi
- Autosave
- Submit
- Review
- Hasil

---

8. Bank Soal

Topik:

- Bilangan
- Aljabar
- Geometri
- Trigonometri
- Data dan Peluang

Kurikulum:

- Fase A–F

Target awal:

- Kelas 6–12

---

9. Metadata Soal

Setiap soal memiliki:

- ID
- Jenjang
- Fase
- Kelas
- Topik
- Subtopik
- Kompetensi
- Bloom
- Tingkat Kesulitan
- Estimasi Waktu
- Prasyarat
- Remedial
- Lanjutan
- Pembahasan
- Tag
- Status Validasi

---

10. Learning Profile

Setiap siswa mempunyai:

- Penguasaan Topik
- Penguasaan Bloom
- Riwayat Belajar
- Kecepatan
- Miskonsepsi
- Learning Graph

---

11. Question Statistics

Disimpan berdasarkan status terakhir setiap pengguna.

Bukan berdasarkan jumlah percobaan.

Statistik:

- Total pengguna
- Status benar
- Status salah
- Question Mastery Rate
- Rata-rata waktu
- Median waktu

---

12. Agentic AI

Agent yang direncanakan:

- Exam Agent
- Prompt Builder
- Claude Reasoning
- Recommendation
- Analytics
- Report
- Email
- Search
- Scan

---

13. Dashboard

Dashboard menampilkan:

- Progress
- Penguasaan Topik
- Bloom
- Statistik
- Riwayat
- Target

---

14. Roadmap

Milestone 1

Foundation

Milestone 2

Assessment Engine

Milestone 3

Dashboard

Milestone 4

Claude Integration

Milestone 5

Learning Analytics

Milestone 6

Email Report

Milestone 7

OMR Scanner

Milestone 8

Adaptive Learning

---

15. Documentation Rules

README.md

- Stabil

BLUEPRINT.md

- Living Document

CHANGELOG.md

- Diupdate setiap rilis

docs/

- Diisi mengikuti implementasi.

---

16. Development Workflow

Ide

↓

Blueprint

↓

Review

↓

Implementasi

↓

Testing

↓

Commit

↓

Update Blueprint

↓

Release

---

17. Success Metrics

Target jangka panjang:

- 600.000 pengguna
- Platform asesmen matematika nasional
- Learning Analytics
- Adaptive Learning
- Agentic AI
- Scan OMR
- Dashboard Guru
- Dashboard Sekolah

---

18. Notes

Blueprint ini akan terus berkembang selama pengembangan Vue-Kim.

Perubahan kurikulum, kebutuhan pengguna, maupun inovasi Agentic AI dapat menyebabkan penambahan atau perubahan isi Blueprint.

Tujuan utama Blueprint adalah menjaga agar seluruh pengembangan tetap memiliki arah yang konsisten tanpa menghambat inovasi.
