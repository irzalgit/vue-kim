// src/config/kisiTKA.tsx
import React, { useState, useEffect, useCallback } from "react";
import { ChevronRight, Check, Loader2, RotateCcw, CheckCircle2, AlertTriangle, XCircle, Circle, ArrowRight, ListChecks, BarChart3 } from "lucide-react";

/* ============================================================
   INTERFACES & TYPES
   ============================================================ */
export interface SubSubElemen {
  nama: string;
  kelas: number[];
  bloom: string[];
}

export interface SubElemen {
  nama: string;
  kelas?: number[];
  bloom?: string[];
  subSubElemen?: SubSubElemen[];
}

export interface Elemen {
  nama: string;
  fase: string;
  subElemen: SubElemen[];
}

export interface LeafItem {
  id: string;
  fase: string;
  grup?: string;
  elemenNama: string;
  subElemenNama: string;
  nama: string;
  kelas: number[];
  bloom: string[];
}

export interface SoalItem {
  id: string;
  soal: string;
  pilihan: string[];
  jawaban_index: number;
  pembahasan: string;
}

export interface RiwayatItem {
  benar: boolean;
  waktu: number;
}

export type StatusType = "belum_dicoba" | "belum_menguasai" | "sedang_berkembang" | "sudah_menguasai";

/* ============================================================
   KISI-KISI MATEMATIKA — Fase A-F (dengan 3 tingkat kedalaman)
   ============================================================ */
export const KISI_MATEMATIKA: Elemen[] = [
  // ---- FASE A (Kelas 1-2) ----
  { 
    nama: "Bilangan", 
    fase: "A", 
    subElemen: [
      { 
        nama: "Bilangan cacah sampai 999", 
        kelas: [1, 2], 
        bloom: ["C1", "C2"],
        subSubElemen: [
          { nama: "Membaca bilangan 1-100", kelas: [1], bloom: ["C1"] },
          { nama: "Membaca bilangan 101-999", kelas: [2], bloom: ["C1"] },
          { nama: "Menulis bilangan 1-100", kelas: [1], bloom: ["C1", "C2"] },
          { nama: "Menulis bilangan 101-999", kelas: [2], bloom: ["C1", "C2"] },
          { nama: "Membandingkan 2 bilangan", kelas: [1, 2], bloom: ["C2"] },
          { nama: "Mengurutkan 3 bilangan", kelas: [1, 2], bloom: ["C2"] },
        ]
      },
      { 
        nama: "Sistem nilai tempat", 
        kelas: [1, 2], 
        bloom: ["C1", "C2"],
        subSubElemen: [
          { nama: "Nilai tempat puluhan", kelas: [1], bloom: ["C1"] },
          { nama: "Nilai tempat ratusan", kelas: [2], bloom: ["C1"] },
          { nama: "Menentukan nilai angka", kelas: [1, 2], bloom: ["C2"] },
        ]
      },
      { 
        nama: "Penjumlahan bilangan cacah", 
        kelas: [1, 2], 
        bloom: ["C2", "C3"],
        subSubElemen: [
          { nama: "Penjumlahan 2 angka tanpa menyimpan", kelas: [1], bloom: ["C2"] },
          { nama: "Penjumlahan 2 angka dengan menyimpan", kelas: [2], bloom: ["C3"] },
          { nama: "Penjumlahan 3 angka", kelas: [2], bloom: ["C3"] },
          { nama: "Soal cerita penjumlahan", kelas: [1, 2], bloom: ["C3"] },
        ]
      },
      { 
        nama: "Pengurangan bilangan cacah", 
        kelas: [1, 2], 
        bloom: ["C2", "C3"],
        subSubElemen: [
          { nama: "Pengurangan 2 angka tanpa meminjam", kelas: [1], bloom: ["C2"] },
          { nama: "Pengurangan 2 angka dengan meminjam", kelas: [2], bloom: ["C3"] },
          { nama: "Pengurangan 3 angka", kelas: [2], bloom: ["C3"] },
          { nama: "Soal cerita pengurangan", kelas: [1, 2], bloom: ["C3"] },
        ]
      },
      { 
        nama: "Bilangan pecahan sederhana (½, ¼, ⅛)", 
        kelas: [2], 
        bloom: ["C1", "C2"],
        subSubElemen: [
          { nama: "Mengenal pecahan 1/2", kelas: [2], bloom: ["C1"] },
          { nama: "Mengenal pecahan 1/4", kelas: [2], bloom: ["C1"] },
          { nama: "Mengenal pecahan 1/8", kelas: [2], bloom: ["C1"] },
          { nama: "Membandingkan pecahan sederhana", kelas: [2], bloom: ["C2"] },
        ]
      },
    ]
  },
  { 
    nama: "Aljabar", 
    fase: "A", 
    subElemen: [
      { 
        nama: "Pola gambar berulang", 
        kelas: [1, 2], 
        bloom: ["C1", "C2"],
        subSubElemen: [
          { nama: "Mengidentifikasi pola gambar", kelas: [1], bloom: ["C1"] },
          { nama: "Melanjutkan pola gambar", kelas: [1, 2], bloom: ["C2"] },
          { nama: "Membuat pola gambar sendiri", kelas: [2], bloom: ["C3"] },
        ]
      },
      { 
        nama: "Pola bilangan membesar & mengecil", 
        kelas: [1, 2], 
        bloom: ["C1", "C2"],
        subSubElemen: [
          { nama: "Pola +1, +2, +3", kelas: [1], bloom: ["C1"] },
          { nama: "Pola -1, -2, -3", kelas: [2], bloom: ["C1"] },
          { nama: "Pola loncat 2, 5, 10", kelas: [2], bloom: ["C2"] },
          { nama: "Menentukan suku berikutnya", kelas: [2], bloom: ["C2"] },
        ]
      },
      { 
        nama: "Persamaan sederhana", 
        kelas: [2], 
        bloom: ["C2", "C3"],
        subSubElemen: [
          { nama: "Mengenal simbol =", kelas: [2], bloom: ["C1"] },
          { nama: "Mengenal simbol + dan -", kelas: [2], bloom: ["C1"] },
          { nama: "Menyelesaikan a + b = c", kelas: [2], bloom: ["C2"] },
          { nama: "Menyelesaikan a - b = c", kelas: [2], bloom: ["C2"] },
          { nama: "Soal cerita persamaan sederhana", kelas: [2], bloom: ["C3"] },
        ]
      },
    ]
  },
  { 
    nama: "Pengukuran", 
    fase: "A", 
    subElemen: [
      { 
        nama: "Pengukuran panjang (satuan tidak baku)", 
        kelas: [1], 
        bloom: ["C1", "C2"],
        subSubElemen: [
          { nama: "Mengukur dengan jengkal", kelas: [1], bloom: ["C1"] },
          { nama: "Mengukur dengan langkah", kelas: [1], bloom: ["C1"] },
          { nama: "Membandingkan panjang", kelas: [1], bloom: ["C2"] },
        ]
      },
      { 
        nama: "Pengukuran berat (satuan tidak baku)", 
        kelas: [1], 
        bloom: ["C1", "C2"],
        subSubElemen: [
          { nama: "Mengukur berat dengan kelereng", kelas: [1], bloom: ["C1"] },
          { nama: "Membandingkan berat", kelas: [1], bloom: ["C2"] },
        ]
      },
      { 
        nama: "Satuan baku panjang (cm, m)", 
        kelas: [2], 
        bloom: ["C2", "C3"],
        subSubElemen: [
          { nama: "Mengukur panjang dengan penggaris", kelas: [2], bloom: ["C2"] },
          { nama: "Mengubah cm ke m", kelas: [2], bloom: ["C2"] },
          { nama: "Mengubah m ke cm", kelas: [2], bloom: ["C2"] },
          { nama: "Soal cerita panjang", kelas: [2], bloom: ["C3"] },
        ]
      },
      { 
        nama: "Satuan baku berat (gr, kg)", 
        kelas: [2], 
        bloom: ["C2", "C3"],
        subSubElemen: [
          { nama: "Mengenal satuan gram", kelas: [2], bloom: ["C1"] },
          { nama: "Mengenal satuan kilogram", kelas: [2], bloom: ["C1"] },
          { nama: "Mengubah gr ke kg", kelas: [2], bloom: ["C2"] },
          { nama: "Soal cerita berat", kelas: [2], bloom: ["C3"] },
        ]
      },
      { 
        nama: "Satuan baku waktu (detik, menit, jam)", 
        kelas: [2], 
        bloom: ["C2", "C3"],
        subSubElemen: [
          { nama: "Membaca jam analog", kelas: [2], bloom: ["C1"] },
          { nama: "Membaca jam digital", kelas: [2], bloom: ["C1"] },
          { nama: "Menghitung durasi waktu", kelas: [2], bloom: ["C2"] },
          { nama: "Mengubah jam ke menit", kelas: [2], bloom: ["C2"] },
          { nama: "Soal cerita waktu", kelas: [2], bloom: ["C3"] },
        ]
      },
    ]
  },
  { 
    nama: "Geometri", 
    fase: "A", 
    subElemen: [
      { 
        nama: "Bangun datar (segiempat, segitiga, lingkaran)", 
        kelas: [1, 2], 
        bloom: ["C1", "C2"],
        subSubElemen: [
          { nama: "Mengenal persegi", kelas: [1], bloom: ["C1"] },
          { nama: "Mengenal persegi panjang", kelas: [1], bloom: ["C1"] },
          { nama: "Mengenal segitiga", kelas: [1], bloom: ["C1"] },
          { nama: "Mengenal lingkaran", kelas: [1], bloom: ["C1"] },
          { nama: "Membedakan bangun datar", kelas: [1, 2], bloom: ["C2"] },
        ]
      },
      { 
        nama: "Bangun ruang (balok, kubus)", 
        kelas: [2], 
        bloom: ["C1", "C2"],
        subSubElemen: [
          { nama: "Mengenal kubus", kelas: [2], bloom: ["C1"] },
          { nama: "Mengenal balok", kelas: [2], bloom: ["C1"] },
          { nama: "Membedakan kubus & balok", kelas: [2], bloom: ["C2"] },
        ]
      },
      { 
        nama: "Posisi benda (kanan, kiri, depan, belakang)", 
        kelas: [1, 2], 
        bloom: ["C1", "C2"],
        subSubElemen: [
          { nama: "Menentukan posisi kanan/kiri", kelas: [1], bloom: ["C1"] },
          { nama: "Menentukan posisi depan/belakang", kelas: [1], bloom: ["C1"] },
          { nama: "Menentukan posisi atas/bawah", kelas: [2], bloom: ["C1"] },
          { nama: "Menentukan posisi relatif", kelas: [2], bloom: ["C2"] },
        ]
      },
      { 
        nama: "Pengubinan bangun datar", 
        kelas: [2], 
        bloom: ["C3", "C4"],
        subSubElemen: [
          { nama: "Pengubinan persegi", kelas: [2], bloom: ["C3"] },
          { nama: "Pengubinan segitiga", kelas: [2], bloom: ["C3"] },
          { nama: "Membuat pola pengubinan", kelas: [2], bloom: ["C4"] },
        ]
      },
    ]
  },
  { 
    nama: "Data dan Peluang", 
    fase: "A", 
    subElemen: [
      { 
        nama: "Pengurutan & perbandingan data", 
        kelas: [2], 
        bloom: ["C2", "C3"],
        subSubElemen: [
          { nama: "Mengurutkan data", kelas: [2], bloom: ["C2"] },
          { nama: "Membandingkan data", kelas: [2], bloom: ["C2"] },
          { nama: "Menentukan data terkecil/terbesar", kelas: [2], bloom: ["C2"] },
          { nama: "Soal cerita perbandingan data", kelas: [2], bloom: ["C3"] },
        ]
      },
      { 
        nama: "Penyajian data dengan turus", 
        kelas: [2], 
        bloom: ["C2", "C3"],
        subSubElemen: [
          { nama: "Membuat tabel turus", kelas: [2], bloom: ["C2"] },
          { nama: "Membaca tabel turus", kelas: [2], bloom: ["C2"] },
          { nama: "Membuat grafik batang sederhana", kelas: [2], bloom: ["C3"] },
        ]
      },
      { 
        nama: "Penyajian data dengan gambar", 
        kelas: [2], 
        bloom: ["C2", "C3"],
        subSubElemen: [
          { nama: "Membuat pictograph", kelas: [2], bloom: ["C2"] },
          { nama: "Membaca pictograph", kelas: [2], bloom: ["C2"] },
          { nama: "Menafsirkan pictograph", kelas: [2], bloom: ["C3"] },
        ]
      },
    ]
  },

  // ---- FASE B (Kelas 3-4) ----
  { 
    nama: "Bilangan", 
    fase: "B", 
    subElemen: [
      { 
        nama: "Bilangan cacah sampai 10.000", 
        kelas: [3, 4], 
        bloom: ["C1", "C2"],
        subSubElemen: [
          { nama: "Membaca bilangan 4 angka", kelas: [3], bloom: ["C1"] },
          { nama: "Menulis bilangan 4 angka", kelas: [3], bloom: ["C1"] },
          { nama: "Nilai tempat ribuan", kelas: [3], bloom: ["C1"] },
          { nama: "Membandingkan bilangan ribuan", kelas: [3, 4], bloom: ["C2"] },
          { nama: "Mengurutkan bilangan ribuan", kelas: [3, 4], bloom: ["C2"] },
        ]
      },
      { 
        nama: "Perkalian bilangan", 
        kelas: [3, 4], 
        bloom: ["C2", "C3"],
        subSubElemen: [
          { nama: "Perkalian 1 digit", kelas: [3], bloom: ["C2"] },
          { nama: "Perkalian 2 digit dengan 1 digit", kelas: [3], bloom: ["C2"] },
          { nama: "Perkalian 2 digit dengan 2 digit", kelas: [4], bloom: ["C3"] },
          { nama: "Soal cerita perkalian", kelas: [3, 4], bloom: ["C3"] },
        ]
      },
      { 
        nama: "Pembagian bilangan", 
        kelas: [3, 4], 
        bloom: ["C2", "C3"],
        subSubElemen: [
          { nama: "Pembagian 1 digit", kelas: [3], bloom: ["C2"] },
          { nama: "Pembagian 2 digit dengan 1 digit", kelas: [3], bloom: ["C2"] },
          { nama: "Pembagian 3 digit dengan 1 digit", kelas: [4], bloom: ["C3"] },
          { nama: "Soal cerita pembagian", kelas: [3, 4], bloom: ["C3"] },
        ]
      },
      { 
        nama: "Faktor & kelipatan", 
        kelas: [4], 
        bloom: ["C2", "C3"],
        subSubElemen: [
          { nama: "Menentukan faktor", kelas: [4], bloom: ["C2"] },
          { nama: "Menentukan kelipatan", kelas: [4], bloom: ["C2"] },
          { nama: "Faktor persekutuan", kelas: [4], bloom: ["C2"] },
        ]
      },
      { 
        nama: "KPK & FPB", 
        kelas: [4], 
        bloom: ["C3", "C4"],
        subSubElemen: [
          { nama: "KPK dengan faktorisasi", kelas: [4], bloom: ["C3"] },
          { nama: "FPB dengan faktorisasi", kelas: [4], bloom: ["C3"] },
          { nama: "Soal cerita KPK", kelas: [4], bloom: ["C4"] },
          { nama: "Soal cerita FPB", kelas: [4], bloom: ["C4"] },
        ]
      },
      { 
        nama: "Pecahan (penjumlahan & pengurangan)", 
        kelas: [3, 4], 
        bloom: ["C2", "C3"],
        subSubElemen: [
          { nama: "Pecahan senilai", kelas: [3], bloom: ["C2"] },
          { nama: "Penjumlahan pecahan berpenyebut sama", kelas: [3], bloom: ["C2"] },
          { nama: "Pengurangan pecahan berpenyebut sama", kelas: [3], bloom: ["C2"] },
          { nama: "Penjumlahan pecahan berpenyebut berbeda", kelas: [4], bloom: ["C3"] },
          { nama: "Pengurangan pecahan berpenyebut berbeda", kelas: [4], bloom: ["C3"] },
          { nama: "Soal cerita pecahan", kelas: [3, 4], bloom: ["C3"] },
        ]
      },
      { 
        nama: "Perbandingan pecahan", 
        kelas: [4], 
        bloom: ["C2", "C3"],
        subSubElemen: [
          { nama: "Membandingkan pecahan berpenyebut sama", kelas: [4], bloom: ["C2"] },
          { nama: "Membandingkan pecahan berpenyebut berbeda", kelas: [4], bloom: ["C3"] },
        ]
      },
    ]
  },
];

// ============================================================
// FUNGSI UTILITY
// ============================================================
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function getAllSubSubElemen(): LeafItem[] {
  const result: LeafItem[] = [];
  
  KISI_MATEMATIKA.forEach(elemen => {
    elemen.subElemen.forEach(sub => {
      if (sub.subSubElemen) {
        sub.subSubElemen.forEach(subsub => {
          result.push({
            id: `${elemen.fase}_${slug(elemen.nama)}_${slug(sub.nama)}_${slug(subsub.nama)}`,
            fase: elemen.fase,
            elemenNama: elemen.nama,
            subElemenNama: sub.nama,
            nama: subsub.nama,
            kelas: subsub.kelas || sub.kelas || [],
            bloom: subsub.bloom || sub.bloom || [],
          });
        });
      }
    });
  });
  return result;
}

// ============================================================
// MAPPING Fase -> Kelompok tampilan
// ============================================================
const FASE_KE_GRUP: Record<string, string> = { A: "sd", B: "sd", C: "sd", D: "smp", E: "sma", F: "sma" };

export const GRUP_META: Record<string, { label: string; fase: string[]; warna: { border: string; bg: string; accent: string; text: string } }> = {
  sd: { label: "SD (Fase A–C)", fase: ["A", "B", "C"], warna: { border: "border-emerald-300", bg: "bg-emerald-50", accent: "bg-emerald-600", text: "text-emerald-800" } },
  smp: { label: "SMP (Fase D)", fase: ["D"], warna: { border: "border-sky-300", bg: "bg-sky-50", accent: "bg-sky-600", text: "text-sky-800" } },
  sma: { label: "SMA (Fase E–F)", fase: ["E", "F"], warna: { border: "border-rose-300", bg: "bg-rose-50", accent: "bg-rose-600", text: "text-rose-800" } },
};

export const GRUP_ORDER = ["sd", "smp", "sma"];

// ============================================================
// BANGUN POHON: grup -> fase -> elemen -> subElemen -> subSubElemen
// ============================================================
export const TREE: Record<string, any> = {};
export const LEAF_INDEX: Record<string, LeafItem> = {};

GRUP_ORDER.forEach((g) => (TREE[g] = {}));

KISI_MATEMATIKA.forEach((elemen) => {
  const grup = FASE_KE_GRUP[elemen.fase];
  if (!TREE[grup][elemen.fase]) TREE[grup][elemen.fase] = {};
  if (!TREE[grup][elemen.fase][elemen.nama]) TREE[grup][elemen.fase][elemen.nama] = {};
  
  elemen.subElemen.forEach((sub) => {
    if (!TREE[grup][elemen.fase][elemen.nama][sub.nama]) {
      TREE[grup][elemen.fase][elemen.nama][sub.nama] = [];
    }
    
    if (sub.subSubElemen && sub.subSubElemen.length > 0) {
      sub.subSubElemen.forEach((subsub) => {
        const id = `${elemen.fase}_${slug(elemen.nama)}_${slug(sub.nama)}_${slug(subsub.nama)}`;
        const leaf: LeafItem = {
          id,
          fase: elemen.fase,
          grup,
          elemenNama: elemen.nama,
          subElemenNama: sub.nama,
          nama: subsub.nama,
          kelas: subsub.kelas || sub.kelas || [],
          bloom: subsub.bloom || sub.bloom || [],
        };
        TREE[grup][elemen.fase][elemen.nama][sub.nama].push(leaf);
        LEAF_INDEX[id] = leaf;
      });
    } else {
      const id = `${elemen.fase}_${slug(elemen.nama)}_${slug(sub.nama)}`;
      const leaf: LeafItem = {
        id,
        fase: elemen.fase,
        grup,
        elemenNama: elemen.nama,
        subElemenNama: sub.nama,
        nama: sub.nama,
        kelas: sub.kelas || [],
        bloom: sub.bloom || [],
      };
      TREE[grup][elemen.fase][elemen.nama][sub.nama].push(leaf);
      LEAF_INDEX[id] = leaf;
    }
  });
});

// Bloom -> kompetensi TKA
export function bloomKeKompetensiTKA(bloomArr: string[]): string {
  const tinggi = bloomArr.some((b) => ["C4", "C5", "C6"].includes(b));
  const sedang = bloomArr.some((b) => b === "C3");
  if (tinggi) return "Penalaran (L3)";
  if (sedang) return "Aplikasi (L2)";
  return "Pengetahuan & Pemahaman (L1)";
}

// ============================================================
// KOMPONEN REACT
// ============================================================

interface TriCheckboxProps {
  state: "all" | "some" | "none";
  onClick: () => void;
  colorClass: string;
}

function TriCheckbox({ state, onClick, colorClass }: TriCheckboxProps) {
  return (
    <button 
      onClick={onClick} 
      role="checkbox" 
      aria-checked={state === "all" ? "true" : state === "some" ? "mixed" : "false"}
      className={`h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${state === "none" ? "bg-white border-slate-300" : `${colorClass} border-transparent`}`}
    >
      {state === "all" && <Check size={13} strokeWidth={3} className="text-white" />}
      {state === "some" && <div className="h-2 w-2 rounded-sm bg-white" />}
    </button>
  );
}

interface SubSubLeafRowProps {
  leaf: LeafItem;
  checked: boolean;
  onToggle: () => void;
  warna: { accent: string; border: string; bg: string; text: string };
}

function SubSubLeafRow({ leaf, checked, onToggle, warna }: SubSubLeafRowProps) {
  return (
    <div className="flex items-center gap-2 py-1 pl-10">
      <TriCheckbox state={checked ? "all" : "none"} onClick={onToggle} colorClass={warna.accent} />
      <span onClick={onToggle} className="cursor-pointer select-none text-sm text-slate-600">
        {leaf.nama}
        <span className="ml-1.5 text-[10px] text-slate-400 font-mono">kls {leaf.kelas.join(",")} · {leaf.bloom.join("/")}</span>
      </span>
    </div>
  );
}

interface SubElemenAccordionProps {
  subElemenNama: string;
  leaves: LeafItem[];
  selected: Set<string>;
  toggleMany: (ids: string[]) => void;
  warna: { accent: string; border: string; bg: string; text: string };
}

function SubElemenAccordion({ subElemenNama, leaves, selected, toggleMany, warna }: SubElemenAccordionProps) {
  const [open, setOpen] = useState(false);
  const n = leaves.filter((l) => selected.has(l.id)).length;
  const state = n === 0 ? "none" : n === leaves.length ? "all" : "some";
  
  return (
    <div className="ml-4 mt-1">
      <div className="flex items-center gap-2 py-1">
        <button onClick={() => setOpen((o) => !o)} className="text-slate-400" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>
          <ChevronRight size={15} />
        </button>
        <TriCheckbox state={state} onClick={() => toggleMany(leaves.map((l) => l.id))} colorClass={warna.accent} />
        <span onClick={() => toggleMany(leaves.map((l) => l.id))} className="cursor-pointer select-none font-medium text-sm text-slate-700">
          {subElemenNama} <span className="text-xs text-slate-400 font-normal">({leaves.length})</span>
        </span>
      </div>
      {open && (
        <div className={`border-l ${warna.border}`}>
          {leaves.map((leaf) => (
            <SubSubLeafRow key={leaf.id} leaf={leaf} checked={selected.has(leaf.id)} onToggle={() => toggleMany([leaf.id])} warna={warna} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ElemenAccordionProps {
  elemenNama: string;
  subElemenMap: Record<string, LeafItem[]>;
  selected: Set<string>;
  toggleMany: (ids: string[]) => void;
  warna: { accent: string; border: string; bg: string; text: string };
}

function ElemenAccordion({ elemenNama, subElemenMap, selected, toggleMany, warna }: ElemenAccordionProps) {
  const [open, setOpen] = useState(false);
  const allLeaves = Object.values(subElemenMap).flat();
  const n = allLeaves.filter((l) => selected.has(l.id)).length;
  const state = n === 0 ? "none" : n === allLeaves.length ? "all" : "some";
  
  return (
    <div className="ml-4 mt-1">
      <div className="flex items-center gap-2 py-1">
        <button onClick={() => setOpen((o) => !o)} className="text-slate-400" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>
          <ChevronRight size={15} />
        </button>
        <TriCheckbox state={state} onClick={() => toggleMany(allLeaves.map((l) => l.id))} colorClass={warna.accent} />
        <span onClick={() => toggleMany(allLeaves.map((l) => l.id))} className="cursor-pointer select-none font-medium text-sm text-slate-700">
          {elemenNama} <span className="text-xs text-slate-400 font-normal">({allLeaves.length})</span>
        </span>
      </div>
      {open && (
        <div className={`border-l ${warna.border}`}>
          {Object.entries(subElemenMap).map(([subNama, leaves]) => (
            <SubElemenAccordion key={subNama} subElemenNama={subNama} leaves={leaves} selected={selected} toggleMany={toggleMany} warna={warna} />
          ))}
        </div>
      )}
    </div>
  );
}

interface FaseAccordionProps {
  fase: string;
  elemenMap: Record<string, Record<string, LeafItem[]>>;
  selected: Set<string>;
  toggleMany: (ids: string[]) => void;
  warna: { accent: string; border: string; bg: string; text: string };
}

function FaseAccordion({ fase, elemenMap, selected, toggleMany, warna }: FaseAccordionProps) {
  const [open, setOpen] = useState(false);
  const allLeaves = Object.values(elemenMap).flatMap((subMap) => Object.values(subMap).flat());
  const n = allLeaves.filter((l) => selected.has(l.id)).length;
  const state = n === 0 ? "none" : n === allLeaves.length ? "all" : "some";
  
  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-2 py-1">
        <button onClick={() => setOpen((o) => !o)} className="text-slate-400" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>
          <ChevronRight size={15} />
        </button>
        <TriCheckbox state={state} onClick={() => toggleMany(allLeaves.map((l) => l.id))} colorClass={warna.accent} />
        <span onClick={() => toggleMany(allLeaves.map((l) => l.id))} className={`cursor-pointer select-none font-semibold ${warna.text}`}>
          Fase {fase} <span className="text-xs font-normal text-slate-400">({allLeaves.length} sub-sub-elemen)</span>
        </span>
      </div>
      {open && Object.entries(elemenMap).map(([elemenNama, subElemenMap]) => (
        <ElemenAccordion key={elemenNama} elemenNama={elemenNama} subElemenMap={subElemenMap} selected={selected} toggleMany={toggleMany} warna={warna} />
      ))}
    </div>
  );
}

interface GrupPanelProps {
  grupKey: string;
  selected: Set<string>;
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function GrupPanel({ grupKey, selected, setSelected }: GrupPanelProps) {
  const meta = GRUP_META[grupKey];
  const toggleMany = (ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allIn = ids.every((id) => next.has(id));
      ids.forEach((id) => (allIn ? next.delete(id) : next.add(id)));
      return next;
    });
  };
  return (
    <div className={`rounded-2xl border-2 ${meta.warna.border} ${meta.warna.bg} p-3.5`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`h-2.5 w-2.5 rounded-full ${meta.warna.accent}`} />
        <h3 className={`font-bold ${meta.warna.text}`}>{meta.label}</h3>
      </div>
      {meta.fase.map((f) => (
        <FaseAccordion key={f} fase={f} elemenMap={TREE[grupKey]?.[f] || {}} selected={selected} toggleMany={toggleMany} warna={meta.warna} />
      ))}
    </div>
  );
}

interface StatCardProps {
  n: number;
  label: string;
  cls: string;
}

function StatCard({ n, label, cls }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-3 text-center ${cls}`}>
      <div className="text-xl font-bold">{n}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

const STATUS_META: Record<StatusType, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  belum_dicoba: { label: "Belum dicoba", color: "text-slate-400", bg: "bg-slate-100", Icon: Circle },
  belum_menguasai: { label: "Belum menguasai", color: "text-rose-700", bg: "bg-rose-100", Icon: XCircle },
  sedang_berkembang: { label: "Sedang berkembang", color: "text-amber-700", bg: "bg-amber-100", Icon: AlertTriangle },
  sudah_menguasai: { label: "Sudah menguasai", color: "text-emerald-700", bg: "bg-emerald-100", Icon: CheckCircle2 },
};

function hitungStatus(percobaan: RiwayatItem[]): StatusType {
  if (!percobaan || percobaan.length === 0) return "belum_dicoba";
  const w = percobaan.slice(-5);
  const akurasi = w.filter((p) => p.benar).length / w.length;
  if (akurasi >= 0.8) return "sudah_menguasai";
  if (akurasi >= 0.5) return "sedang_berkembang";
  return "belum_menguasai";
}

/* ============================================================
   EXPORT KOMPONEN UTAMA
   ============================================================ */
export default function Math315App() {
  const [tab, setTab] = useState("pilih");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [soalList, setSoalList] = useState<SoalItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [jawabanUser, setJawabanUser] = useState<number | null>(null);
  const [sudahJawab, setSudahJawab] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riwayat, setRiwayat] = useState<Record<string, RiwayatItem[]>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await (window as any).storage?.get("riwayat_math315");
        if (res?.value) setRiwayat(JSON.parse(res.value));
      } catch (e) { /* belum ada data */ }
    })();
  }, []);

  const simpanRiwayat = useCallback(async (next: Record<string, RiwayatItem[]>) => {
    setRiwayat(next);
    try { await (window as any).storage?.set("riwayat_math315", JSON.stringify(next)); } catch (e) { console.error("Gagal simpan riwayat", e); }
  }, []);

  const totalDipilih = selected.size;

  const mulaiGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      const topikList = [...selected].map((id) => {
        const l = LEAF_INDEX[id];
        return { 
          id, 
          fase: l.fase, 
          kelas: l.kelas, 
          elemen: l.elemenNama, 
          subElemen: l.subElemenNama,
          topik: l.nama, 
          bloomTarget: l.bloom, 
          kompetensiTKA: bloomKeKompetensiTKA(l.bloom) 
        };
      });

      // Simulasi generate (ganti dengan API call sebenarnya)
      const hasil: SoalItem[] = [
        {
          id: [...selected][0],
          soal: "Contoh soal untuk topik terpilih",
          pilihan: ["A", "B", "C", "D"],
          jawaban_index: 0,
          pembahasan: "Contoh pembahasan"
        }
      ];
      setSoalList(hasil);
      setIdx(0);
      setJawabanUser(null);
      setSudahJawab(false);
      setTab("kuis");
    } catch (e) {
      setError("Gagal membuat soal. Coba lagi ya.");
    } finally {
      setLoading(false);
    }
  };

  const jawab = (i: number) => {
    if (sudahJawab) return;
    setJawabanUser(i);
    setSudahJawab(true);
    const soal = soalList[idx];
    const benar = i === soal.jawaban_index;
    const next = { ...riwayat };
    next[soal.id] = [...(next[soal.id] || []), { benar, waktu: Date.now() }];
    simpanRiwayat(next);
  };

  const lanjut = () => {
    if (idx + 1 < soalList.length) {
      setIdx(idx + 1);
      setJawabanUser(null);
      setSudahJawab(false);
    } else {
      setTab("rapor");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-4xl mx-auto p-5 md:p-8">
        <header className="mb-5">
          <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-1">math315.id</p>
          <h1 className="text-2xl font-bold text-slate-800">Kisi-kisi Fase A–F → Generate Soal → Riwayat</h1>
        </header>

        <nav className="flex gap-1.5 mb-5 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          <TabBtn active={tab === "pilih"} onClick={() => setTab("pilih")} icon={ListChecks} label="Pilih Topik" />
          <TabBtn active={tab === "kuis"} onClick={() => soalList.length && setTab("kuis")} icon={ArrowRight} label="Kuis" disabled={!soalList.length} />
          <TabBtn active={tab === "rapor"} onClick={() => setTab("rapor")} icon={BarChart3} label="Rapor" />
        </nav>

        {tab === "pilih" && (
          <div>
            <div className="grid md:grid-cols-3 gap-3 mb-4">
              {GRUP_ORDER.map((g) => <GrupPanel key={g} grupKey={g} selected={selected} setSelected={setSelected} />)}
            </div>
            {error && <div className="mb-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}
            <button onClick={mulaiGenerate} disabled={totalDipilih === 0 || loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 text-white font-medium px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {loading ? "Membuat soal..." : `Buat Soal (${totalDipilih} topik dipilih)`}
            </button>
          </div>
        )}

        {tab === "kuis" && soalList.length > 0 && (
          <KuisView soal={soalList[idx]} idx={idx} total={soalList.length} jawabanUser={jawabanUser} sudahJawab={sudahJawab} onJawab={jawab} onLanjut={lanjut} />
        )}

        {tab === "rapor" && <RaporView riwayat={riwayat} onReset={() => simpanRiwayat({})} />}
      </div>
    </div>
  );
}

/* ============================================================
   KOMPONEN PENDUKUNG
   ============================================================ */
interface TabBtnProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
}

function TabBtn({ active, onClick, icon: Icon, label, disabled }: TabBtnProps) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${active ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
      <Icon size={14} />{label}
    </button>
  );
}

interface KuisViewProps {
  soal: SoalItem;
  idx: number;
  total: number;
  jawabanUser: number | null;
  sudahJawab: boolean;
  onJawab: (i: number) => void;
  onLanjut: () => void;
}

function KuisView({ soal, idx, total, jawabanUser, sudahJawab, onJawab, onLanjut }: KuisViewProps) {
  const meta = LEAF_INDEX[soal.id] || { fase: "?", nama: "" };
  const benar = jawabanUser === soal.jawaban_index;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-slate-400">Soal {idx + 1} / {total}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Fase {meta.fase} · {meta.nama}</span>
      </div>
      <p className="text-slate-800 font-medium mb-4">{soal.soal}</p>
      <div className="space-y-2 mb-4">
        {soal.pilihan.map((p: string, i: number) => {
          let cls = "border-slate-200 hover:border-slate-300";
          if (sudahJawab) {
            if (i === soal.jawaban_index) cls = "border-emerald-400 bg-emerald-50";
            else if (i === jawabanUser) cls = "border-rose-400 bg-rose-50";
          }
          return (
            <button key={i} onClick={() => onJawab(i)} disabled={sudahJawab}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl border-2 text-sm text-slate-700 transition-colors ${cls}`}>
              <span className="font-mono text-xs text-slate-400 mr-2">{String.fromCharCode(65 + i)}</span>{p}
            </button>
          );
        })}
      </div>
      {sudahJawab && (
        <div className={`rounded-xl px-3.5 py-3 mb-3 text-sm ${benar ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          <p className="font-semibold mb-1">{benar ? "Benar!" : "Belum tepat."}</p>
          <p>{soal.pembahasan}</p>
        </div>
      )}
      {sudahJawab && (
        <button onClick={onLanjut} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 text-white text-sm font-medium px-4 py-2 hover:bg-slate-700">
          {idx + 1 < total ? "Soal berikutnya" : "Lihat rapor"} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

interface RaporViewProps {
  riwayat: Record<string, RiwayatItem[]>;
  onReset: () => void;
}

function RaporView({ riwayat, onReset }: RaporViewProps) {
  const keys = Object.keys(riwayat);
  if (keys.length === 0) {
    return <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-400 italic">Belum ada riwayat. Kerjakan beberapa soal dulu di tab Kuis.</div>;
  }
  const rows = keys.map((id) => {
    const meta = LEAF_INDEX[id] || { nama: id, fase: "?", elemenNama: "?" };
    const status = hitungStatus(riwayat[id]);
    return { id, ...meta, status, trend: riwayat[id].slice(-5) };
  });
  const counts = rows.reduce((acc: Record<StatusType, number>, r) => { acc[r.status]++; return acc; }, { belum_dicoba: 0, belum_menguasai: 0, sedang_berkembang: 0, sudah_menguasai: 0 });

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard n={counts.sudah_menguasai} label="Menguasai" cls="bg-emerald-50 border-emerald-200 text-emerald-700" />
        <StatCard n={counts.sedang_berkembang} label="Berkembang" cls="bg-amber-50 border-amber-200 text-amber-700" />
        <StatCard n={counts.belum_menguasai} label="Belum menguasai" cls="bg-rose-50 border-rose-200 text-rose-700" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {rows.map((r) => {
          const meta = STATUS_META[r.status];
          const Icon = meta.Icon;
          return (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-slate-700 truncate">{r.nama}</p>
                <p className="text-xs text-slate-400">Fase {r.fase} · {r.elemenNama}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex gap-0.5">{r.trend.map((p, i) => <div key={i} className={`h-2 w-2 rounded-sm ${p.benar ? "bg-emerald-500" : "bg-rose-400"}`} />)}</div>
                <span className={`inline-flex items-center gap-1 rounded-full ${meta.bg} ${meta.color} px-2 py-0.5 text-xs font-medium`}>
                  <Icon size={11} />{meta.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={onReset} className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600">
        <RotateCcw size={12} /> Reset riwayat
      </button>
    </div>
  );
}
