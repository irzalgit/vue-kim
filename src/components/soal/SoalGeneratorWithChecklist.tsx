// src/components/soal/SoalGeneratorWithChecklist.tsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  generateSoalWithChecklist,
  getDaftarTopikRotasi,
  type SelectedItem,
  type SoalHasil,
  type TopikRotasi
} from '../../agent/generateSoalWithChecklist';
import { MateriFilterChecklist } from '../MateriFilterChecklist';
import { bersihkanPrefixPilihan } from '../../services/soal-generator/parser';

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
    padding: "12px",
    overflowX: "auto" as const,
    WebkitOverflowScrolling: "touch" as const
  },
  panelTitle: {
    fontSize: "14px",
    fontWeight: "bold" as const,
    color: "#94a3b8",
    marginBottom: "8px"
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
  }
};

export default function SoalGeneratorWithChecklist({ 
  onMulaiSesi, 
  simulasiKode 
}: SoalGeneratorProps) {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isSesiAktif, setIsSesiAktif] = useState<boolean>(false);
  const [soalSaatIni, setSoalSaatIni] = useState<SoalHasil | null>(null);
  const [riwayatSesi, setRiwayatSesi] = useState<SesiBelajar[]>([]);
  const [jawabanUser, setJawabanUser] = useState<string | string[] | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Deteksi layar sempit (mobile) supaya panel "Pilih Topik" dan "Soal"
  // ditumpuk vertikal & full-width, bukan berdempetan 2 kolom sempit.
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Konfigurasi jumlah sesi & jumlah soal per sesi
  const [jumlahSesiTarget, setJumlahSesiTarget] = useState<number>(10);
  const [jumlahSoalPerSesi, setJumlahSoalPerSesi] = useState<number>(1);

  // Rotasi topik untuk sesi ini
  const [daftarTopikRotasi, setDaftarTopikRotasi] = useState<TopikRotasi[]>([]);
  const [topikSesiIni, setTopikSesiIni] = useState<TopikRotasi | null>(null);

  // 🎯 Ref untuk memanggil fungsi di child
  const selectionActionsRef = useRef<{
    selectFaseAB: () => void;
    selectFaseCD: () => void;
    selectFaseEF: () => void;
  } | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const daftarTopikRotasiRef = useRef<TopikRotasi[]>([]);
  const riwayatPertanyaanRef = useRef<Record<string, string[]>>({});
  const jumlahSoalPerSesiRef = useRef<number>(1);
  const totalSoalRef = useRef<number>(10);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    setSelectedItems([]);
    setIsSesiAktif(false);
    setSoalSaatIni(null);
    setRiwayatSesi([]);
    setJawabanUser('');
    setFeedback('');
    setDaftarTopikRotasi([]);
    setTopikSesiIni(null);
  }, [simulasiKode]);

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

      // Mode AI
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
      console.error('[DEBUG-GENERATE] Gagal generate! err:', err);
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Gagal: ${errorMessage.substring(0, 50)}...`);
      setLoading(false);
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

    const jumlahSesiValid = Math.max(1, Math.min(50, Math.round(jumlahSesiTarget) || 10));
    const jumlahSoalPerSesiValid = Math.max(1, Math.min(20, Math.round(jumlahSoalPerSesi) || 1));
    jumlahSoalPerSesiRef.current = jumlahSoalPerSesiValid;
    totalSoalRef.current = jumlahSesiValid * jumlahSoalPerSesiValid;
    if (jumlahSesiValid !== jumlahSesiTarget) setJumlahSesiTarget(jumlahSesiValid);
    if (jumlahSoalPerSesiValid !== jumlahSoalPerSesi) setJumlahSoalPerSesi(jumlahSoalPerSesiValid);

    const rotasiBaru = getDaftarTopikRotasi(selectedItems);
    daftarTopikRotasiRef.current = rotasiBaru;
    riwayatPertanyaanRef.current = {};
    setDaftarTopikRotasi(rotasiBaru);
    setTopikSesiIni(null);

    setIsSesiAktif(true);
    setRiwayatSesi([]);
    setSoalSaatIni(null);
    setJawabanUser('');
    setFeedback('');

    if (onMulaiSesi) onMulaiSesi(selectedItems, jumlahSesiValid, jumlahSoalPerSesiValid);
    await generateSoalSesi(1);
  }, [selectedItems, isSesiAktif, generateSoalSesi, onMulaiSesi, jumlahSesiTarget, jumlahSoalPerSesi]);

  const submitJawaban = useCallback(async () => {
    if (!soalSaatIni || jawabanUser === null) return;

    let benar = false;
    if (soalSaatIni.tipeSoal === 'multi') {
      const arrUser = Array.isArray(jawabanUser) ? jawabanUser : [jawabanUser];
      const arrBenar = Array.isArray(soalSaatIni.jawaban_benar) ? soalSaatIni.jawaban_benar : [soalSaatIni.jawaban_benar];
      benar = arrUser.length === arrBenar.length && arrUser.every(val => arrBenar.includes(val));
    } else {
      benar = jawabanUser === soalSaatIni.jawaban_benar;
    }

    const sesiKe = riwayatSesi.length + 1;

    setRiwayatSesi(prev => {
      const newRiwayat = [...prev];
      const sesiBaru: SesiBelajar = {
        sesiKe: sesiKe,
        selectedItems: selectedItems,
        soalTerakhir: soalSaatIni,
        riwayatJawaban: [{
          soalId: soalSaatIni.id,
          jawabanUser: Array.isArray(jawabanUser) ? jawabanUser.join(', ') : (jawabanUser || ''),
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
        setSoalSaatIni(null);
        alert(`🎉 Selamat! Anda telah menyelesaikan ${totalSoalRef.current} soal!`);
      }, 2000);
      return;
    }

    timerRef.current = setTimeout(async () => {
      const nextSesi = sesiKe + 1;
      await generateSoalSesi(nextSesi);
    }, 2000);

  }, [soalSaatIni, jawabanUser, riwayatSesi, selectedItems, generateSoalSesi]);

  return (
    <div style={styles.container}>
      <div style={styles.statusBar}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={styles.statusText}>Status:</span>
          {isSesiAktif ? (
            <span style={styles.statusActive}>🔴 Soal Aktif {riwayatSesi.length + 1}/{totalSoalRef.current}</span>
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

      <div style={{ ...styles.grid, gridTemplateColumns: (isSesiAktif || isMobile) ? "1fr" : "1fr 1fr" }}>
        {!isSesiAktif && (
        <div style={styles.panel}>
          <div style={styles.panelTitle}>
            📋 Pilih Topik
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
            <button
              onClick={() => selectionActionsRef.current?.selectFaseCD()}
              style={{ ...styles.button, background: "#f59e0b", color: "white", padding: "8px 4px", fontSize: "12px" }}
            >
              🎯 TKA#9
            </button>
            <button
              onClick={() => selectionActionsRef.current?.selectFaseEF()}
              style={{ ...styles.button, background: "#8b5cf6", color: "white", padding: "8px 4px", fontSize: "12px" }}
            >
              🎯 TKA#12
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
          {/* Mode soal dikunci ke AI */}
          <input type="hidden" value="ai" />
          </div>

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

          <MateriFilterChecklist 
            onSelectionChange={setSelectedItems} 
            triggerSelect={(actions) => { selectionActionsRef.current = actions; }}
            use2026={false}
          />
        </div>
        )}

        <div style={styles.soalPanel}>
          <div style={styles.panelTitle}>
            {isSesiAktif ? (() => {
              const ukuran = Math.max(1, jumlahSoalPerSesiRef.current);
              const kelompokKe = Math.floor(riwayatSesi.length / ukuran) + 1;
              return `📝 Sesi ${kelompokKe}/${jumlahSesiTarget} · Soal ${riwayatSesi.length + 1}/${totalSoalRef.current}`;
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
                  {soalSaatIni.pilihan?.map((p: string, i: number) => {
                    const isMulti = soalSaatIni.tipeSoal === 'multi';
                    const isSelected = isMulti 
                      ? Array.isArray(jawabanUser) && jawabanUser.includes(p)
                      : jawabanUser === p;
                    const abjad = String.fromCharCode(65 + i);

                    return (
                      <button
                        key={i}
                        onClick={() => {
                          if (feedback) return;
                          if (isMulti) {
                            setJawabanUser(prev => {
                              const arr = Array.isArray(prev) ? prev : [];
                              return arr.includes(p) ? arr.filter(v => v !== p) : [...arr, p];
                            });
                          } else {
                            setJawabanUser(p);
                          }
                        }}
                        disabled={!!feedback}
                        style={{
                          ...styles.pilihan,
                          ...(isSelected ? styles.pilihanSelected : {}),
                          ...(feedback ? styles.pilihanDisabled : {})
                        }}
                      >
                        {isMulti && (isSelected ? '☑️ ' : '☐ ')}
                        <span style={{ fontWeight: 600, marginRight: '8px' }}>{abjad}.</span>
                        {bersihkanPrefixPilihan(p)}
                      </button>
                    );
                  })}
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
                    <span>{riwayatSesi.length + 1}/{totalSoalRef.current}</span>
                  </div>
                  <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, width: `${((riwayatSesi.length + 1) / totalSoalRef.current) * 100}%` }} />
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
