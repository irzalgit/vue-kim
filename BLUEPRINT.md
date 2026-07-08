# Vue-Kim Blueprint v0.1

> **Living Document**
>
> Last Updated: July 2026

---

# 1. Purpose

Dokumen ini menjadi acuan utama seluruh pengembangan Vue-Kim.

Seluruh implementasi, perubahan arsitektur, penambahan fitur, maupun pengembangan Agentic AI harus mengacu pada Blueprint ini.

Blueprint bersifat dinamis dan akan berkembang mengikuti implementasi sistem.

---

# 2. Vision

Membangun platform asesmen matematika berbasis Agentic AI yang mampu:

- Menyelenggarakan asesmen matematika adaptif.
- Menggunakan Claude API sebagai Reasoning Engine.
- Menghasilkan Learning Analytics secara otomatis.
- Memberikan rekomendasi belajar personal.
- Mengirimkan laporan hasil melalui email.
- Mendukung scan lembar jawaban (OMR).
- Mendukung QR Code Question Bank.
- Siap melayani hingga 600.000 pengguna.

---

# 3. Philosophy

Vue-Kim bukan chatbot AI.

Vue-Kim adalah platform asesmen matematika.

Claude API digunakan sebagai mesin penalaran (Reasoning Engine).

Prompt tidak diketik langsung oleh pengguna.

Prompt dibangun otomatis berdasarkan:

- Jawaban siswa
- Riwayat belajar
- Penguasaan topik
- Tingkat Bloom
- Miskonsepsi
- Target pembelajaran

AI digunakan sebagai alat bantu analisis, bukan sebagai pengganti proses asesmen.

---

# 4. Core Principles

1. Documentation First
2. Blueprint Before Code
3. Issue Before Code
4. Reuse Existing Components
5. Modular Architecture
6. Data Driven Learning
7. AI Assisted Assessment
8. Continuous Improvement

---

# 5. System Architecture

Student

↓

Assessment Engine

↓

Question Analyzer

↓

Agent Manager

↓

Prompt Builder

↓

Claude API

↓

Learning Analytics

↓

Recommendation Engine

↓

Dashboard

↓

Email Report

---

# 6. Project Modules

## Foundation

- Authentication
- Dashboard
- Assessment
- Report

## AI

- Agent Manager
- Prompt Builder
- Claude API
- Search Agent

## Analytics

- Statistics
- Learning Profile
- Learning Graph
- University Readiness

## Future

- OMR Scanner
- QR Question Bank
- Dashboard Guru
- Dashboard Sekolah
- National Analytics

---

# 7. Assessment Engine

Tahap pertama pengembangan.

Fitur utama:

- Bank Soal
- Display Question
- Timer
- Navigation
- Autosave
- Submit
- Review
- Statistics
- Progress
- Final Result

---

# 8. Question Bank

Topik utama:

- Bilangan
- Aljabar
- Geometri
- Trigonometri
- Data dan Peluang

Jenjang:

- Kelas 6
- Kelas 7
- Kelas 8
- Kelas 9
- Kelas 10
- Kelas 11
- Kelas 12

Fase Kurikulum Merdeka:

- Fase A
- Fase B
- Fase C
- Fase D
- Fase E
- Fase F

---

# 9. Question Metadata

Setiap soal memiliki metadata lengkap.

## Identitas

- Question ID
- Version
- Status

## Kurikulum

- Jenjang
- Kelas
- Fase
- Mata Pelajaran

## Materi

- Topik
- Subtopik
- Kompetensi

## Kognitif

- Bloom Level (C1–C6)

## Kesulitan

- Difficulty
- Estimated Solving Time

## Pembelajaran

- Prerequisite
- Remedial
- Next Topic

## Analisis

- Explanation
- Tags
- Validation Status

---

# 10. Learning Profile

Setiap siswa memiliki profil belajar.

Disimpan:

- Topic Mastery
- Bloom Mastery
- Learning History
- Speed
- Accuracy
- Misconception
- Learning Graph
- University Readiness Score

---

# 11. Question Statistics

Statistik dihitung berdasarkan status terakhir setiap pengguna.

Satu pengguna hanya dihitung satu kali.

Jika jawaban terakhir berubah, statistik ikut berubah.

Data yang disimpan:

- Total User
- Correct User
- Incorrect User
- Question Mastery Rate
- Average Time
- Median Time

Saat soal ditampilkan pengguna juga melihat:

- Status jawaban terakhir
- Persentase benar
- Persentase salah

---

# 12. Agentic AI

Agent yang direncanakan:

- Exam Agent
- Question Analyzer
- Prompt Builder
- Claude Reasoning Agent
- Recommendation Agent
- Analytics Agent
- Report Agent
- Email Agent
- Search Agent
- Scan Agent

---

# 13. Dashboard

Dashboard menampilkan:

- Progress
- Topic Mastery
- Bloom Mastery
- Assessment History
- Learning Graph
- Statistics
- Recommendation
- Target
- University Readiness

---

# 14. Roadmap

## Milestone 1

Foundation

## Milestone 2

Assessment Engine

## Milestone 3

Dashboard

## Milestone 4

Claude Integration

## Milestone 5

Learning Analytics

## Milestone 6

Email Report

## Milestone 7

OMR Scanner

## Milestone 8

Adaptive Learning

## Milestone 9

Beta

## Milestone 10

Stable Release

---

# 15. Documentation Rules

README.md

- Stable Documentation

BLUEPRINT.md

- Living Document

CHANGELOG.md

- Updated Every Release

docs/

- Updated following implementation progress

---

# 16. Development Workflow

Vue-Kim menggunakan GitHub Project sebagai pusat pengelolaan pengembangan.

Seluruh fitur baru mengikuti alur berikut.

Idea

↓

GitHub Issue

↓

Milestone Assignment

↓

Label Assignment

↓

Review

↓

Implementation

↓

Testing

↓

Commit

↓

Push

↓

Close Issue

↓

Update CHANGELOG (if required)

↓

Release

Prinsip utama:

> Issue First, Code Second.

---

# 17. GitHub Project Convention

GitHub Project menjadi pusat seluruh aktivitas pengembangan.

## 17.1 Issue Naming Convention

Seluruh Issue menggunakan prefix berikut.

| Prefix | Deskripsi |
|----------|------------------------------|
| Documentation: | Dokumentasi |
| Assessment: | Assessment Engine |
| Question Bank: | Bank Soal |
| AI: | Claude API & Agentic AI |
| Dashboard: | Dashboard |
| Analytics: | Learning Analytics |
| Report: | Email & PDF Report |
| Scanner: | OMR & QR Scanner |
| Backend: | API & Database |
| Frontend: | React Components |
| Infrastructure: | Deployment & CI/CD |

Contoh:

Assessment: Display Single Mathematics Question

Assessment: Countdown Timer

AI: Analyze Student Performance

Dashboard: Student Dashboard

Scanner: Detect OMR Answer Sheet

---

## 17.2 Milestone Convention

Setiap Issue hanya memiliki satu Milestone.

Contoh:

- v0.1 Foundation
- v0.2 Assessment Engine
- v0.3 Dashboard
- v0.4 Claude Integration
- v0.5 Learning Analytics
- v0.6 Email Report
- v0.7 OMR Scanner
- v0.8 Adaptive Learning
- v0.9 Beta
- v1.0 Stable Release

---

## 17.3 Label Convention

Label digunakan sebagai kategori Issue.

Label awal:

- documentation
- assessment
- frontend
- backend
- ai
- analytics
- report
- scanner
- enhancement
- bug

Label dapat berkembang mengikuti kebutuhan proyek.

---

## 17.4 Commit Convention

Format commit yang direkomendasikan:

docs(readme): update README

feat(assessment): display single mathematics question

feat(ai): generate learning recommendation

fix(timer): correct countdown bug

Jika relevan, sertakan nomor Issue.

Contoh:

feat(assessment): display question (#15)

---

# 18. Success Metrics

Target jangka panjang:

- 600.000 pengguna
- Platform asesmen matematika nasional
- Learning Analytics
- Adaptive Learning
- Agentic AI
- Claude Reasoning Engine
- OMR Scanner
- Dashboard Guru
- Dashboard Sekolah
- National Analytics

---

# 19. Notes

Blueprint ini merupakan Living Document.

Seluruh perubahan arsitektur, workflow, kurikulum, maupun modul baru harus diperbarui pada Blueprint sebelum implementasi dilakukan.

Blueprint menjadi Single Source of Truth bagi seluruh pengembangan Vue-Kim.

Seluruh pengembangan harus menjaga konsistensi arah proyek tanpa menghambat inovasi maupun penyesuaian terhadap perkembangan teknologi dan kebijakan pendidikan.