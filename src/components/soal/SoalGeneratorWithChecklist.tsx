// src/components/soal/SoalGeneratorWithChecklist.tsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  generateSoalWithChecklist,
  getAllItemsFromKisi,
  getDaftarTopikRotasi,
  type SelectedItem,
  type SoalHasil,
  type TopikRotasi
} from '../../agent/generateSoalWithChecklist';

interface SesiBelajar {
  sesiKe: number;
  selectedItems: SelectedItem[];
  soalTerakhir?: SoalHasil;
  riwayatJawaban: Array<{
    soalId: string;
    jawabanUser: string;
    benar: boolean;
    timestamp: string;
  }>;
  levelSaatIni: number;
  totalBenar: number;
  totalSalah: number;
}

interface SoalGeneratorProps {
  onMulaiSesi?: (selectedItems: SelectedItem[], jumlahSesi: number, jumlahSoalPerSesi: number) => void;
  simulasiKode?: string;
}

const styles = {
  container: {
    background: "#1e293b",
    borderRadius: "12px",
    padding: "16px",
    color: "#e2e8f0"
  },
  statusBar: {
    display: "flex",
    flexWrap: "wrap" as const,
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "12px",
    padding: "12px",
    background: "#0f172a",
    borderRadius: "8px"
  },
  statusText: {
    color: "#94a3b8",
    fontSize: "14px"
  },
  statusActive: {
    color: "#34d399",
    fontWeight: "bold" as const
  },
  statusInactive: {
    color: "#64748b",
    fontWeight: "bold" as const
  },
  button: {
    padding: "8px 20px",
    borderRadius: "8px",
    border: "none",
    fontWeight: "bold" as const,
    cursor: "pointer",
    fontSize: "14px",
    transition: "background 0.2s"
  },
  buttonPrimary: {
    background: "#10b981",
    color: "white"
  },
  buttonDisabled: {
    background: "#475569",
    color: "#94a3b8",
    cursor: "not-allowed"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px"
  },
  panel: {
    background: "#0f172a",
    borderRadius: "8px",
    padding: "12px"
  },
  panelTitle: {
    fontSize: "14px",
    fontWeight: "bold" as const,
    color: "#94a3b8",
    marginBottom: "8px"
  },
  checklist: {
    maxHeight: "400px",
    overflowY: "auto" as const,
    paddingRight: "4px"
  },
  checklistItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "3px 0",
    fontSize: "13px",
    cursor: "pointer",
    borderRadius: "4px",
    transition: "background 0.15s"
  },
  checkbox: {
    width: "18px",
    height: "18px",
    borderRadius: "4px",
    border: "2px solid #475569",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0 as const,
    transition: "all 0.2s"
  },
  checkboxChecked: {
    background: "#10b981",
    borderColor: "#10b981"
  },
  checkboxPartial: {
    background: "#f59e0b",
    borderColor: "#f59e0b"
  },
  soalPanel: {
    background: "#0f172a",
    borderRadius: "8px",
    padding: "12px",
    minHeight: "200px"
  },
  soalInfo: {
    background: "#1e293b",
    padding: "8px 12px",
    borderRadius: "6px",
    marginBottom: "10px",
    fontSize: "12px",
    color: "#94a3b8"
  },
  soalText: {
    background: "#1e293b",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "10px",
    fontSize: "14px",
    color: "#f1f5f9"
  },
  pilihan: {
    display: "block",
    width: "100%",
    textAlign: "left" as const,
    padding: "8px 12px",
    marginBottom: "6px",
    borderRadius: "6px",
    border: "1px solid #334155",
    background: "transparent",
    color: "#e2e8f0",
    cursor: "pointer",
    fontSize: "13px",
    transition: "all 0.2s"
  },
  pilihanSelected: {
    borderColor: "#10b981",
    background: "rgba(16, 185, 129, 0.15)"
  },
  pilihanDisabled: {
    cursor: "not-allowed",
    opacity: 0.6
  },
  feedbackBenar: {
    padding: "10px",
    borderRadius: "6px",
    background: "rgba(16, 185, 129, 0.15)",
    color: "#34d399",
    marginTop: "10px",
    fontSize: "14px"
  },
  feedbackSalah: {
    padding: "10px",
    borderRadius: "6px",
    background: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    marginTop: "10px",
    fontSize: "14px"
  },
  progress: {
    marginTop: "10px"
  },
  progressBar: {
    width: "100%",
    height: "4px",
    background: "#334155",
    borderRadius: "4px",
    overflow: "hidden" as const
  },
  progressFill: {
    height: "100%",
    background: "#10b981",
    borderRadius: "4px",
    transition: "width 0.5s"
  },
  riwayat: {
    marginTop: "12px",
    padding: "10px",
    background: "#0f172a",
    borderRadius: "8px"
  },
  emptyState: {
    textAlign: "center" as const,
    padding: "40px 0",
    color: "#64748b"
  },
  expandButton: {
    background: "transparent",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    transition: "transform 0.2s",
    padding: "0 4px",
    fontSize: "10px"
  },
  labelDim: {
    color: "#94a3b8",
    fontSize: "12px"
  },
  kelasTag: {
    color: "#64748b",
    fontSize: "10px",
    marginLeft: "4px"
  }
};

export default function SoalGeneratorWithChecklist({ 
  onMulaiSesi, 
  simulasiKode 
}: SoalGeneratorProps) {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [allItems, setAllItems] = useState<SelectedItem[]>([]);
  const [sesiKe, setSesiKe] = useState<number>(0);
  const [isSesiAktif, setIsSesiAktif] = useState<boolean>(false);
  const [soalSaatIni, setSoalSaatIni] = useState<SoalHasil | null>(null);
  const [riwayatSesi, setRiwayatSesi] = useState<SesiBelajar[]>([]);
  const [jawabanUser, setJawabanUser] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Konfigurasi jumlah sesi & jumlah soal per sesi — bisa diatur user di
  // panel setup (bersama checklist), TERKUNCI begitu sesi berjalan (sama
  // seperti checklist). "Sesi" = 1 kelompok topik hasil rotasi; setiap sesi
  // berisi `jumlahSoalPerSesi` soal berurutan untuk topik yang sama sebelum
  // pindah ke topik berikutnya di rotasi.
  const [jumlahSesiTarget, setJumlahSesiTarget] = useState<number>(10);
  const [jumlahSoalPerSesi, setJumlahSoalPerSesi] = useState<number>(1);

  // Rotasi topik untuk sesi ini (ditetapkan sekali saat "Mulai Sesi" diklik,
  // dihitung dari selectedItems saat itu) + riwayat pertanyaan per topik,
  // supaya: (1) setiap topik tercentang pasti kebagian giliran round-robin,
  // (2) LLM tidak mengulang pertanyaan yang sama untuk topik yang sama.
  const [daftarTopikRotasi, setDaftarTopikRotasi] = useState<TopikRotasi[]>([]);
  const [topikSesiIni, setTopikSesiIni] = useState<TopikRotasi | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref-versi dari daftarTopikRotasi & riwayatPertanyaanPerTopik: dibaca secara
  // sinkron di dalam generateSoalSesi (yang dipanggil dari setTimeout), supaya
  // tidak kena masalah "state belum flush" antar sesi.
  const daftarTopikRotasiRef = useRef<TopikRotasi[]>([]);
  const riwayatPertanyaanRef = useRef<Record<string, string[]>>({});
  // Dikunci nilainya sekali saat "Mulai Sesi" diklik (sama alasan seperti
  // daftarTopikRotasiRef): supaya perubahan input di tengah sesi (kalaupun
  // terjadi) tidak mengacak rotasi yang sudah berjalan.
  const jumlahSoalPerSesiRef = useRef<number>(1);
  const totalSoalRef = useRef<number>(10);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    setSelectedItems([]);
    setSesiKe(0);
    setIsSesiAktif(false);
    setSoalSaatIni(null);
    setRiwayatSesi([]);
    setJawabanUser('');
    setFeedback('');
    setExpandedNodes(new Set());
    setDaftarTopikRotasi([]);
    setTopikSesiIni(null);
  }, [simulasiKode]);

  useEffect(() => {
    const items = getAllItemsFromKisi();
    setAllItems(items);
  }, []);

  const isItemSelected = useCallback((itemId: string): boolean => {
    return selectedItems.some(item => item.id === itemId);
  }, [selectedItems]);

  const toggleItem = useCallback((itemId: string) => {
    if (isSesiAktif) return;

    setSelectedItems(prev => {
      const exists = prev.some(item => item.id === itemId);
      if (exists) {
        return prev.filter(item => item.id !== itemId);
      } else {
        const item = allItems.find(i => i.id === itemId);
        return item ? [...prev, item] : prev;
      }
    });
  }, [isSesiAktif, allItems]);

  const toggleFase = useCallback((fase: string) => {
    if (isSesiAktif) return;

    const faseItems = allItems.filter(item => item.fase === fase);
    const allSelected = faseItems.every(item => selectedItems.some(s => s.id === item.id));

    if (allSelected) {
      setSelectedItems(prev => prev.filter(item => item.fase !== fase));
    } else {
      setSelectedItems(prev => {
        const newItems = [...prev];
        faseItems.forEach(item => {
          if (!newItems.some(s => s.id === item.id)) {
            newItems.push(item);
          }
        });
        return newItems;
      });
    }
  }, [isSesiAktif, selectedItems, allItems]);

  const toggleElemen = useCallback((elemenNama: string, fase: string) => {
    if (isSesiAktif) return;

    const elemenItems = allItems.filter(item => 
      item.elemenNama === elemenNama && item.fase === fase
    );
    const allSelected = elemenItems.every(item => selectedItems.some(s => s.id === item.id));

    if (allSelected) {
      setSelectedItems(prev => prev.filter(item => 
        !(item.elemenNama === elemenNama && item.fase === fase)
      ));
    } else {
      setSelectedItems(prev => {
        const newItems = [...prev];
        elemenItems.forEach(item => {
          if (!newItems.some(s => s.id === item.id)) {
            newItems.push(item);
          }
        });
        return newItems;
      });
    }
  }, [isSesiAktif, selectedItems, allItems]);

  const getStatistikDariRiwayat = useCallback(() => {
    const stat: Record<string, { benar: number; total: number }> = {};
    
    riwayatSesi.forEach(sesi => {
      const elemen = sesi.soalTerakhir?.elemen || 'unknown';
      if (!stat[elemen]) {
        stat[elemen] = { benar: 0, total: 0 };
      }
      sesi.riwayatJawaban.forEach(jawaban => {
        stat[elemen].total++;
        if (jawaban.benar) stat[elemen].benar++;
      });
    });
    
    return stat;
  }, [riwayatSesi]);

  const generateSoalSesi = useCallback(async (sesi: number) => {
    try {
      setLoading(true);
      setFeedback('');
      setError(null);

      // Round-robin per KELOMPOK: topik untuk soal ke-`sesi` (overall, 1-based)
      // ditentukan dari daftar rotasi, dikelompokkan per `jumlahSoalPerSesi`.
      // Contoh: jumlahSoalPerSesi=3, rotasi=[A,B] -> soal 1-3 pakai topik A,
      // soal 4-6 pakai topik B, soal 7-9 balik ke topik A, dst. Ini menjamin
      // setiap topik yang dicentang pasti kebagian giliran (misal cuma 1 topik
      // dicentang -> topik itu yang dipakai di SEMUA soal).
      const rotasi = daftarTopikRotasiRef.current;
      const ukuranKelompok = Math.max(1, jumlahSoalPerSesiRef.current);
      const topikIndex = rotasi.length > 0 ? Math.floor((sesi - 1) / ukuranKelompok) % rotasi.length : -1;
      const topik = topikIndex >= 0 ? rotasi[topikIndex] : undefined;
      const riwayatTopikIni = topik ? (riwayatPertanyaanRef.current[topik.id] || []) : [];

      const soal = await generateSoalWithChecklist({
        selectedItems: selectedItems,
        sesiKe: sesi,
        mataPelajaran: simulasiKode === 'fisika' ? 'Fisika' : 'Matematika',
        selectedModel: 'gemini',
        statistikElemen: getStatistikDariRiwayat(),
        topikSesiIni: topik,
        riwayatPertanyaanTopik: riwayatTopikIni,
      });

      // Catat pertanyaan ini ke riwayat topiknya, supaya sesi berikutnya untuk
      // topik yang sama tidak mengulang pertanyaan yang sama.
      if (topik) {
        riwayatPertanyaanRef.current = {
          ...riwayatPertanyaanRef.current,
          [topik.id]: [...(riwayatPertanyaanRef.current[topik.id] || []), soal.pertanyaan],
        };
        setTopikSesiIni(topik);
      }

      setSoalSaatIni(soal);
      setJawabanUser('');
    } catch (err: unknown) {
      console.error('Gagal generate, mencoba fallback ke soal statis...', err);
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Gagal membuat soal AI: ${errorMessage.substring(0, 50)}... Menggunakan soal cadangan.`);

      try {
        const mapel = simulasiKode === 'fisika' ? 'fisika' : 'matematika';
        const response = await fetch(`/data/soal-${mapel}.json`);
        if (!response.ok) throw new Error('Gagal memuat soal cadangan');
        const data = await response.json();
        const randomSoal = data.soal[Math.floor(Math.random() * data.soal.length)];
        
        const fallback: SoalHasil = {
            id: 'fallback-' + Date.now(),
            elemen: randomSoal.elemen,
            subElemen: 'Umum',
            kelas: randomSoal.kelas,
            taxonomiBloom: randomSoal.taxonomiBloom,
            pertanyaan: randomSoal.pertanyaan,
            pilihan: randomSoal.pilihan,
            jawaban_benar: randomSoal.jawaban_benar,
            pembahasan: 'Soal cadangan.',
        };
        
        setSoalSaatIni(fallback);
        setJawabanUser('');
        setFeedback('⚠️ Menggunakan soal cadangan.');
      } catch (fallbackErr) {
        console.error(fallbackErr);
        setError('❌ Gagal membuat soal dan gagal memuat soal cadangan.');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedItems, getStatistikDariRiwayat, simulasiKode]);

  const mulaiSesi = useCallback(async () => {
    if (selectedItems.length === 0) {
      alert('Pilih minimal 1 topik terlebih dahulu!');
      return;
    }

    if (isSesiAktif) return;

    // Validasi & kunci nilai konfigurasi (input di UI di-disable saat sesi
    // aktif, tapi kita kunci juga di sini demi keamanan/kejelasan logika).
    const jumlahSesiValid = Math.max(1, Math.min(50, Math.round(jumlahSesiTarget) || 10));
    const jumlahSoalPerSesiValid = Math.max(1, Math.min(20, Math.round(jumlahSoalPerSesi) || 1));
    jumlahSoalPerSesiRef.current = jumlahSoalPerSesiValid;
    totalSoalRef.current = jumlahSesiValid * jumlahSoalPerSesiValid;
    if (jumlahSesiValid !== jumlahSesiTarget) setJumlahSesiTarget(jumlahSesiValid);
    if (jumlahSoalPerSesiValid !== jumlahSoalPerSesi) setJumlahSoalPerSesi(jumlahSoalPerSesiValid);

    // Tetapkan urutan rotasi topik SEKALI di awal sesi, dari topik yang
    // tercentang saat "Mulai Sesi" diklik. Kalau hanya 1 topik dicentang
    // (misal 1.1.1), rotasi ini panjangnya 1 -> topik itu dipakai di semua
    // soal. Riwayat pertanyaan per topik juga dikosongkan lagi.
    const rotasiBaru = getDaftarTopikRotasi(selectedItems);
    daftarTopikRotasiRef.current = rotasiBaru;
    riwayatPertanyaanRef.current = {};
    setDaftarTopikRotasi(rotasiBaru);
    setTopikSesiIni(null);

    setIsSesiAktif(true);
    setSesiKe(1);
    setRiwayatSesi([]);
    setSoalSaatIni(null);
    setJawabanUser('');
    setFeedback('');

    if (onMulaiSesi) onMulaiSesi(selectedItems, jumlahSesiValid, jumlahSoalPerSesiValid);
    await generateSoalSesi(1);
  }, [selectedItems, isSesiAktif, generateSoalSesi, onMulaiSesi, jumlahSesiTarget, jumlahSoalPerSesi]);

  const submitJawaban = useCallback(async () => {
    if (!soalSaatIni || !jawabanUser) return;

    const benar = jawabanUser === soalSaatIni.jawaban_benar;

    setRiwayatSesi(prev => {
      const newRiwayat = [...prev];
      const sesiBaru: SesiBelajar = {
        sesiKe: sesiKe,
        selectedItems: selectedItems,
        soalTerakhir: soalSaatIni,
        riwayatJawaban: [{
          soalId: soalSaatIni.id,
          jawabanUser,
          benar,
          timestamp: new Date().toISOString()
        }],
        levelSaatIni: prev.length > 0 ? prev[prev.length - 1].levelSaatIni + (benar ? 1 : 0) : 1,
        totalBenar: benar ? 1 : 0,
        totalSalah: benar ? 0 : 1,
      };
      newRiwayat.push(sesiBaru);
      return newRiwayat;
    });

    setFeedback(benar ? '✅ Jawaban benar! 🎉' : '❌ Kurang tepat. Coba perhatikan pembahasan.');

    if (sesiKe >= totalSoalRef.current) {
      timerRef.current = setTimeout(() => {
        setIsSesiAktif(false);
        setSesiKe(0);
        setSoalSaatIni(null);
        alert(`🎉 Selamat! Anda telah menyelesaikan ${totalSoalRef.current} soal!`);
      }, 2000);
      return;
    }

    timerRef.current = setTimeout(async () => {
      const nextSesi = sesiKe + 1;
      setSesiKe(nextSesi);
      await generateSoalSesi(nextSesi);
    }, 2000);

  }, [soalSaatIni, jawabanUser, sesiKe, selectedItems, generateSoalSesi]);

  const getItemsByFase = (fase: string) => {
    return allItems.filter(item => item.fase === fase);
  };

  const renderChecklist = () => {
    const fases = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    return fases.map((fase) => {
      const faseItems = getItemsByFase(fase);
      if (faseItems.length === 0) return null;

      const faseKey = `fase-${fase}`;
      const isFaseExpanded = expandedNodes.has(faseKey);
      
      const faseSelected = faseItems.every(item => isItemSelected(item.id));
      const fasePartial = faseItems.some(item => isItemSelected(item.id)) && !faseSelected;

      const elemenGroups: Record<string, SelectedItem[]> = {};
      faseItems.forEach(item => {
        const key = item.elemenNama || item.nama;
        if (!elemenGroups[key]) elemenGroups[key] = [];
        elemenGroups[key].push(item);
      });

      return (
        <div key={faseKey} style={{ marginBottom: "4px" }}>
          <div
            style={{
              ...styles.checklistItem,
              cursor: isSesiAktif ? "not-allowed" : "pointer",
              opacity: isSesiAktif ? 0.5 : 1,
              padding: "4px 0",
              background: isFaseExpanded ? "rgba(255,255,255,0.05)" : "transparent"
            }}
            onClick={() => !isSesiAktif && toggleFase(fase)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isSesiAktif) {
                  setExpandedNodes(prev => {
                    const next = new Set(prev);
                    if (next.has(faseKey)) next.delete(faseKey);
                    else next.add(faseKey);
                    return next;
                  });
                }
              }}
              style={{
                ...styles.expandButton,
                transform: isFaseExpanded ? "rotate(90deg)" : "none",
                fontSize: "10px",
                width: "16px"
              }}
              disabled={isSesiAktif}
            >
              ▶
            </button>
            <div
              style={{
                ...styles.checkbox,
                ...(faseSelected ? styles.checkboxChecked : {}),
                ...(fasePartial ? styles.checkboxPartial : {})
              }}
            >
              {faseSelected && <span style={{ color: "white", fontSize: "11px" }}>✓</span>}
              {fasePartial && <span style={{ color: "white", fontSize: "11px" }}>−</span>}
            </div>
            <span style={{ fontWeight: "bold", color: "#e2e8f0", fontSize: "13px" }}>
              Fase {fase}
            </span>
            <span style={{ color: "#64748b", fontSize: "11px" }}>
              ({faseItems.length})
            </span>
          </div>

          {isFaseExpanded && Object.entries(elemenGroups).map(([elemenNama, items]) => {
            const elemenKey = `elemen-${fase}-${elemenNama}`;
            const isElemenExpanded = expandedNodes.has(elemenKey);
            
            const elemenSelected = items.every(item => isItemSelected(item.id));
            const elemenPartial = items.some(item => isItemSelected(item.id)) && !elemenSelected;

            const subGroups: Record<string, SelectedItem[]> = {};
            items.forEach(item => {
              const key = item.subElemenNama || item.nama;
              if (!subGroups[key]) subGroups[key] = [];
              subGroups[key].push(item);
            });

            return (
              <div key={elemenKey} style={{ paddingLeft: "20px" }}>
                <div
                  style={{
                    ...styles.checklistItem,
                    cursor: isSesiAktif ? "not-allowed" : "pointer",
                    opacity: isSesiAktif ? 0.5 : 1,
                    padding: "3px 0"
                  }}
                  onClick={() => !isSesiAktif && toggleElemen(elemenNama, fase)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isSesiAktif) {
                        setExpandedNodes(prev => {
                          const next = new Set(prev);
                          if (next.has(elemenKey)) next.delete(elemenKey);
                          else next.add(elemenKey);
                          return next;
                        });
                      }
                    }}
                    style={{
                      ...styles.expandButton,
                      transform: isElemenExpanded ? "rotate(90deg)" : "none",
                      fontSize: "10px",
                      width: "16px"
                    }}
                    disabled={isSesiAktif}
                  >
                    ▶
                  </button>
                  <div
                    style={{
                      ...styles.checkbox,
                      ...(elemenSelected ? styles.checkboxChecked : {}),
                      ...(elemenPartial ? styles.checkboxPartial : {})
                    }}
                  >
                    {elemenSelected && <span style={{ color: "white", fontSize: "11px" }}>✓</span>}
                    {elemenPartial && <span style={{ color: "white", fontSize: "11px" }}>−</span>}
                  </div>
                  <span style={{ color: "#cbd5e1", fontSize: "13px" }}>
                    {elemenNama}
                  </span>
                  <span style={{ color: "#64748b", fontSize: "10px" }}>
                    ({items.length})
                  </span>
                </div>

                {isElemenExpanded && Object.entries(subGroups).map(([subNama, subItems]) => {
                  const subKey = `sub-${fase}-${elemenNama}-${subNama}`;
                  const isSubExpanded = expandedNodes.has(subKey);
                  
                  const subSelected = subItems.every(item => isItemSelected(item.id));
                  const subPartial = subItems.some(item => isItemSelected(item.id)) && !subSelected;
                  const subSubItems = subItems.filter(item => item.type === 'subSubElemen');

                  return (
                    <div key={subKey} style={{ paddingLeft: "20px" }}>
                      <div
                        style={{
                          ...styles.checklistItem,
                          cursor: isSesiAktif ? "not-allowed" : "pointer",
                          opacity: isSesiAktif ? 0.5 : 1,
                          padding: "2px 0"
                        }}
                        onClick={() => !isSesiAktif && toggleItem(subItems[0].id)}
                      >
                        {subSubItems.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isSesiAktif) {
                                setExpandedNodes(prev => {
                                  const next = new Set(prev);
                                  if (next.has(subKey)) next.delete(subKey);
                                  else next.add(subKey);
                                  return next;
                                });
                              }
                            }}
                            style={{
                              ...styles.expandButton,
                              transform: isSubExpanded ? "rotate(90deg)" : "none",
                              fontSize: "10px",
                              width: "16px"
                            }}
                            disabled={isSesiAktif}
                          >
                            ▶
                          </button>
                        )}
                        <div
                          style={{
                            ...styles.checkbox,
                            ...(subSelected ? styles.checkboxChecked : {}),
                            ...(subPartial ? styles.checkboxPartial : {})
                          }}
                        >
                          {subSelected && <span style={{ color: "white", fontSize: "11px" }}>✓</span>}
                          {subPartial && <span style={{ color: "white", fontSize: "11px" }}>−</span>}
                        </div>
                        <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                          {subNama}
                        </span>
                        {subItems[0]?.kelas && subItems[0].kelas.length > 0 && (
                          <span style={styles.kelasTag}>
                            kls {subItems[0].kelas.join(',')}
                          </span>
                        )}
                      </div>

                      {isSubExpanded && subSubItems.map((ss) => (
                        <div
                          key={ss.id}
                          style={{
                            ...styles.checklistItem,
                            paddingLeft: "20px",
                            cursor: isSesiAktif ? "not-allowed" : "pointer",
                            opacity: isSesiAktif ? 0.5 : 1,
                            padding: "2px 0"
                          }}
                          onClick={() => !isSesiAktif && toggleItem(ss.id)}
                        >
                          <div style={{ width: "16px", flexShrink: 0 }} />
                          <div
                            style={{
                              ...styles.checkbox,
                              ...(isItemSelected(ss.id) ? styles.checkboxChecked : {})
                            }}
                          >
                            {isItemSelected(ss.id) && <span style={{ color: "white", fontSize: "11px" }}>✓</span>}
                          </div>
                          <span style={{ ...styles.labelDim, fontSize: "12px" }}>
                            {ss.nama}
                          </span>
                          {ss.kelas && ss.kelas.length > 0 && (
                            <span style={styles.kelasTag}>
                              kls {ss.kelas.join(',')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.statusBar}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={styles.statusText}>Status:</span>
          {isSesiAktif ? (
            <span style={styles.statusActive}>🔴 Soal Aktif {sesiKe}/{totalSoalRef.current}</span>
          ) : (
            <span style={styles.statusInactive}>⏸️ Pilih topik & mulai sesi</span>
          )}
          <span style={styles.statusText}>
            Topik: <strong style={{ color: "#e2e8f0" }}>{selectedItems.length}</strong>
          </span>
        </div>
        <button
          onClick={mulaiSesi}
          disabled={isSesiAktif || selectedItems.length === 0 || loading}
          style={{
            ...styles.button,
            ...(isSesiAktif || selectedItems.length === 0 || loading
              ? styles.buttonDisabled
              : styles.buttonPrimary)
          }}
        >
          {loading ? '⏳ Memuat...' : isSesiAktif ? 'Sesi Berjalan...' : '🚀 Mulai Sesi'}
        </button>
      </div>

      <div style={{ ...styles.grid, gridTemplateColumns: isSesiAktif ? "1fr" : "1fr 1fr" }}>
        {!isSesiAktif && (
        <div style={styles.panel}>
          <div style={styles.panelTitle}>
            📋 Pilih Topik
          </div>

          {/* Konfigurasi jumlah sesi & soal per sesi + checklist topik —
              panel INI SELURUHNYA hanya tampil sebelum sesi dimulai (setup
              phase). Begitu "Mulai Sesi" diklik, panel ini disembunyikan
              total (bukan cuma dikunci/disabled) supaya layar soal dapat
              ruang penuh. Nilai yang sudah dipilih tetap dipakai/dibekukan
              di jumlahSoalPerSesiRef/totalSoalRef/daftarTopikRotasiRef. */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
            <label style={{ flex: 1, fontSize: "12px", color: "#94a3b8" }}>
              Jumlah Sesi
              <input
                type="number"
                min={1}
                max={50}
                value={jumlahSesiTarget}
                onChange={(e) => setJumlahSesiTarget(Number(e.target.value))}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  border: "1px solid #334155",
                  background: "#0f172a",
                  color: "#e2e8f0",
                }}
              />
            </label>
            <label style={{ flex: 1, fontSize: "12px", color: "#94a3b8" }}>
              Soal / Sesi
              <input
                type="number"
                min={1}
                max={20}
                value={jumlahSoalPerSesi}
                onChange={(e) => setJumlahSoalPerSesi(Number(e.target.value))}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  border: "1px solid #334155",
                  background: "#0f172a",
                  color: "#e2e8f0",
                }}
              />
            </label>
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "12px" }}>
            Total soal: {Math.max(1, Math.min(50, Math.round(jumlahSesiTarget) || 10)) * Math.max(1, Math.min(20, Math.round(jumlahSoalPerSesi) || 1))}
          </div>

          <div style={styles.checklist}>
            {renderChecklist()}
          </div>
        </div>
        )}

        <div style={styles.soalPanel}>
          <div style={styles.panelTitle}>
            {isSesiAktif ? (() => {
              const ukuran = Math.max(1, jumlahSoalPerSesiRef.current);
              const kelompokKe = Math.floor((sesiKe - 1) / ukuran) + 1;
              return `📝 Sesi ${kelompokKe}/${jumlahSesiTarget} · Soal ${sesiKe}/${totalSoalRef.current}`;
            })() : '📝 Soal'}
          </div>

          {loading ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>⏳</div>
              <p>Membuat soal...</p>
            </div>
          ) : (
            isSesiAktif && soalSaatIni ? (
              <div>
                <div style={styles.soalInfo}>
                  Topik: <span style={{ color: "#e2e8f0" }}>{soalSaatIni.elemen} &gt; {soalSaatIni.subElemen}{soalSaatIni.subSubElemen ? ` > ${soalSaatIni.subSubElemen}` : ''}</span>
                  <span style={{ marginLeft: "12px" }}>Kelas {soalSaatIni.kelas}</span>
                  <span style={{ marginLeft: "12px" }}>Bloom: {soalSaatIni.taxonomiBloom}</span>
                  {daftarTopikRotasi.length > 1 && topikSesiIni && (
                    <span style={{ marginLeft: "12px", color: "#60a5fa" }}>
                      Rotasi: {daftarTopikRotasi.findIndex(t => t.id === topikSesiIni.id) + 1}/{daftarTopikRotasi.length}
                    </span>
                  )}
                </div>

                <div style={styles.soalText}>
                  {soalSaatIni.pertanyaan}
                </div>

                <div>
                  {soalSaatIni.pilihan?.map((p: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => !feedback && setJawabanUser(p)}
                      disabled={!!feedback}
                      style={{
                        ...styles.pilihan,
                        ...(jawabanUser === p ? styles.pilihanSelected : {}),
                        ...(feedback ? styles.pilihanDisabled : {})
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {!feedback && (
                  <button
                    onClick={submitJawaban}
                    disabled={!jawabanUser}
                    style={{
                      ...styles.button,
                      ...styles.buttonPrimary,
                      width: "100%",
                      padding: "10px",
                      ...(!jawabanUser ? styles.buttonDisabled : {})
                    }}
                  >
                    Submit Jawaban
                  </button>
                )}

                {error && (
                  <div style={{ ...styles.feedbackSalah, background: 'rgba(239, 68, 68, 0.25)', color: '#fca5a5' }}>
                    <strong>{error}</strong>
                  </div>
                )}
                {feedback && !error && (
                  <div style={feedback.includes('benar') ? styles.feedbackBenar : styles.feedbackSalah}>
                    <strong>{feedback}</strong>
                  </div>
                )}
                {soalSaatIni.pembahasan && (
                  <p style={{ marginTop: "6px", fontSize: "13px", color: "#94a3b8" }}>
                    {soalSaatIni.pembahasan}
                  </p>
                )}
                <div style={styles.progress}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                    <span>Progress</span>
                    <span>{sesiKe}/{totalSoalRef.current}</span>
                  </div>
                  <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, width: `${(sesiKe / totalSoalRef.current) * 100}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p style={{ fontSize: "16px" }}>📚 Pilih topik di sebelah kiri</p>
                <p style={{ fontSize: "13px", marginTop: "4px" }}>Lalu klik "Mulai Sesi"</p>
                {selectedItems.length > 0 && !isSesiAktif && (
                  <p style={{ color: "#34d399", fontSize: "12px", marginTop: "8px" }}>
                    ✅ {selectedItems.length} topik siap
                  </p>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {riwayatSesi.length > 0 && (
        <div style={styles.riwayat}>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#94a3b8", marginBottom: "6px" }}>
            📊 Riwayat
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {riwayatSesi.map((r, i) => {
              const benar = r.riwayatJawaban[r.riwayatJawaban.length - 1]?.benar;
              return (
                <div
                  key={i}
                  style={{
                    padding: "2px 10px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    background: benar === true ? "rgba(16, 185, 129, 0.2)" : 
                               benar === false ? "rgba(239, 68, 68, 0.2)" : 
                               "#1e293b",
                    color: benar === true ? "#34d399" : 
                           benar === false ? "#f87171" : 
                           "#64748b"
                  }}
                >
                  {i+1}: {benar ? '✅' : benar === false ? '❌' : '⏳'}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
