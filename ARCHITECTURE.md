Vue-Kim Architecture

«System Architecture Document»

Version: 0.1

Status: Active Development

---

Purpose

Dokumen ini menjelaskan arsitektur tingkat tinggi (High-Level Architecture) dari Vue-Kim.

Tujuan utamanya adalah memberikan gambaran bagaimana setiap komponen saling terhubung sehingga pengembangan tetap konsisten dan mudah dikembangkan di masa depan.

---

Design Principles

Vue-Kim dibangun berdasarkan prinsip berikut:

- Modular Architecture
- Agentic AI
- Component Reusability
- Separation of Concerns
- Scalability
- Maintainability
- Documentation First

---

High-Level Architecture

                   Student
                      │
                      ▼
              Vue-Kim Frontend
                      │
                      ▼
             Assessment Engine
                      │
                      ▼
              Agent Manager
      ┌──────────┼──────────┐
      ▼          ▼          ▼
 Prompt Builder Search Agent Analytics
      │                     │
      └──────────┬──────────┘
                 ▼
             Claude API
                 │
                 ▼
        Learning Analytics
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
 Dashboard            Email Report

---

Main Components

Frontend

Dibangun menggunakan:

- React
- TypeScript
- Vite

Bertanggung jawab terhadap:

- Antarmuka pengguna
- Dashboard
- Assessment
- Progress
- Report

---

Assessment Engine

Komponen inti sistem.

Fungsi:

- Menampilkan soal
- Timer
- Navigasi
- Autosave
- Submit
- Review jawaban

---

Agent Manager

Pusat koordinasi seluruh Agent.

Agent Manager menentukan:

- Agent yang dijalankan
- Urutan proses
- Pertukaran data antarmodul

---

Prompt Builder

Prompt tidak ditulis oleh pengguna.

Prompt dibangun otomatis berdasarkan:

- Jawaban siswa
- Metadata soal
- Learning Profile
- Statistik
- Riwayat belajar

---

Claude API

Claude digunakan sebagai mesin penalaran (Reasoning Engine).

Claude bertugas:

- Menganalisis jawaban
- Mengidentifikasi miskonsepsi
- Memberikan rekomendasi
- Membantu menghasilkan laporan belajar

---

Learning Analytics

Mengolah hasil asesmen menjadi informasi yang mudah dipahami.

Contoh:

- Penguasaan topik
- Penguasaan Bloom
- Kecepatan mengerjakan
- Prasyarat yang belum dikuasai
- Learning Graph

---

Dashboard

Dashboard menampilkan informasi utama kepada pengguna.

Fitur:

- Progress
- Statistik
- Target belajar
- Riwayat asesmen
- Rekomendasi AI

---

Email Service

Mengirimkan:

- Nilai
- Analisis AI
- Rekomendasi belajar
- Ringkasan hasil asesmen

---

Data Flow

Alur utama sistem:

Login
   │
   ▼
Assessment
   │
   ▼
Jawaban Disimpan
   │
   ▼
Agent Manager
   │
   ▼
Prompt Builder
   │
   ▼
Claude API
   │
   ▼
Learning Analytics
   │
   ▼
Dashboard
   │
   ▼
Email Report

---

Folder Architecture

src/

app/

components/

pages/

layouts/

agent/

assessment/

dashboard/

report/

scanner/

services/

hooks/

stores/

router/

types/

utils/

config/

---

Backend Architecture

Backend menggunakan:

- Firebase Authentication
- Firebase Realtime Database
- Cloud Functions / Serverless API
- Claude API
- Email Service

---

Database Overview

Data utama yang disimpan:

- Users
- Questions
- Attempts
- Learning Profile
- Reports
- Statistics
- Question Mastery
- Settings

---

Agent Architecture

Agent yang direncanakan:

- Exam Agent
- Assessment Agent
- Prompt Builder Agent
- Claude Agent
- Search Agent
- Analytics Agent
- Recommendation Agent
- Report Agent
- Email Agent
- Scan Agent

---

Future Architecture

Fitur masa depan:

- OMR Scanner
- QR Detection
- Adaptive Learning
- Dashboard Guru
- Dashboard Sekolah
- Dashboard Admin
- National Learning Analytics

---

Scalability

Target arsitektur:

- Modular
- Mudah dikembangkan
- Mudah diuji
- Siap melayani sekitar 600.000 pengguna

---

Related Documents

Dokumen yang terkait:

- README.md
- BLUEPRINT.md
- ROADMAP.md
- CHANGELOG.md
- docs/assessment-engine.md
- docs/database.md
- docs/agent-manager.md

---

Notes

Dokumen ini menjelaskan arsitektur tingkat tinggi.

Rincian implementasi setiap modul akan didokumentasikan pada folder "docs/" sesuai perkembangan proyek.
