import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { ref, get } from 'firebase/database';
import { 
  BookOpen, 
  X, 
  Play, 
  Layers, 
  AlertCircle, 
  RefreshCw,
  Search
} from 'lucide-react';

interface SoalMapelItem {
  id?: string;
  pertanyaan: string;
  pilihan: string[];
  jawaban_benar: string;
  topik?: string;
  mapel?: string;
  elemen?: string;
  subElemen?: string;
  kelas?: number;
  taxonomiBloom?: string;
  pembahasan?: string;
}

interface SimulasiMapelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMulaiSimulasi: (
    mapelKey: string,
    soalList: SoalMapelItem[],
    judul: string
  ) => void;
  initialKategori?: string;
}

// Daftar default mapel/materi jika ingin quick filter
const DAFTAR_PRESET_MAPEL = [
  { id: 'semua', label: 'Semua Mapel (Acak)' },
  { id: 'matriks', label: 'Matriks' },
  { id: 'spltv', label: 'SPLTV' },
  { id: 'fungsi', label: 'Fungsi & Kuadrat' },
  { id: 'vektor', label: 'Vektor' },
  { id: 'trigonometri', label: 'Trigonometri' },
  { id: 'turunan', label: 'Turunan / Kalkulus' },
  { id: 'peluang', label: 'Peluang & Statistik' },
  { id: 'eksponen', label: 'Eksponen & Logaritma' },
];

export default function SimulasiMapelModal({
  isOpen,
  onClose,
  onMulaiSimulasi,
  initialKategori = 'semua',
}: SimulasiMapelModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [rawSoalData, setRawSoalData] = useState<Record<string, any>>({});
  const [kategoriList, setKategoriList] = useState<string[]>([]);
  const [selectedKategori, setSelectedKategori] = useState<string>(initialKategori);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredSoal, setFilteredSoal] = useState<SoalMapelItem[]>([]);
  const [jumlahSoalPilihan, setJumlahSoalPilihan] = useState<number>(10);

  // Ambil data dari Firebase Realtime Database path /soal_mapel
  const loadDataSoalMapel = async () => {
    setLoading(true);
    setError('');
    try {
      const soalMapelRef = ref(db, 'soal_mapel');
      const snapshot = await get(soalMapelRef);
      if (snapshot.exists()) {
        const val = snapshot.val();
        setRawSoalData(val);

        // Ekstrak kategori mapel / topik yang tersedia
        const categories = new Set<string>();
        const allItems: SoalMapelItem[] = [];

        if (Array.isArray(val)) {
          val.forEach((item, index) => {
            if (item) {
              const mapelName = item.mapel || item.topik || item.elemen || 'Lainnya';
              categories.add(mapelName);
              allItems.push({ ...item, id: `item_${index}` });
            }
          });
        } else if (typeof val === 'object') {
          Object.entries(val).forEach(([key, item]: [string, any]) => {
            if (item) {
              if (Array.isArray(item)) {
                // Format node kategori berisi array soal: /soal_mapel/matriks/[soal1, soal2]
                categories.add(key);
                item.forEach((subItem, sIdx) => {
                  if (subItem) {
                    allItems.push({
                      ...subItem,
                      id: `${key}_${sIdx}`,
                      mapel: subItem.mapel || key,
                      topik: subItem.topik || key,
                    });
                  }
                });
              } else if (typeof item === 'object' && item.pertanyaan) {
                // Format langsung flat object
                const mapelName = item.mapel || item.topik || item.elemen || key;
                categories.add(mapelName);
                allItems.push({ ...item, id: key });
              } else if (typeof item === 'object') {
                // Format nested object /soal_mapel/matriks/{soalId: {...}}
                categories.add(key);
                Object.entries(item).forEach(([subKey, subVal]: [string, any]) => {
                  if (subVal && typeof subVal === 'object') {
                    allItems.push({
                      ...subVal,
                      id: `${key}_${subKey}`,
                      mapel: subVal.mapel || key,
                      topik: subVal.topik || key,
                    });
                  }
                });
              }
            }
          });
        }

        setKategoriList(Array.from(categories));
        setFilteredSoal(allItems);
      } else {
        setRawSoalData({});
        setFilteredSoal([]);
        setKategoriList([]);
      }
    } catch (err: any) {
      console.error('[SimulasiMapel] Error loading /soal_mapel:', err);
      setError(err.message || 'Gagal memuat bank soal dari Firebase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialKategori) {
        setSelectedKategori(initialKategori);
      }
      loadDataSoalMapel();
    }
  }, [isOpen, initialKategori]);

  // Filter soal saat kategori atau search query berubah
  useEffect(() => {
    if (!rawSoalData) return;

    let items: SoalMapelItem[] = [];

    if (Array.isArray(rawSoalData)) {
      items = rawSoalData.filter(Boolean);
    } else {
      Object.entries(rawSoalData).forEach(([key, item]: [string, any]) => {
        if (Array.isArray(item)) {
          item.forEach((sub, idx) => {
            if (sub) items.push({ ...sub, id: `${key}_${idx}`, mapel: sub.mapel || key });
          });
        } else if (item && item.pertanyaan) {
          items.push({ ...item, id: key });
        } else if (item && typeof item === 'object') {
          Object.entries(item).forEach(([subKey, subVal]: [string, any]) => {
            if (subVal) items.push({ ...subVal, id: `${key}_${subKey}`, mapel: subVal.mapel || key });
          });
        }
      });
    }

    if (selectedKategori !== 'semua') {
      items = items.filter((s) => {
        const str = `${s.mapel || ''} ${s.topik || ''} ${s.elemen || ''} ${s.subElemen || ''}`.toLowerCase();
        return str.includes(selectedKategori.toLowerCase());
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((s) => {
        return (
          (s.pertanyaan && s.pertanyaan.toLowerCase().includes(q)) ||
          (s.topik && s.topik.toLowerCase().includes(q)) ||
          (s.mapel && s.mapel.toLowerCase().includes(q)) ||
          (s.subElemen && s.subElemen.toLowerCase().includes(q))
        );
      });
    }

    setFilteredSoal(items);
  }, [selectedKategori, searchQuery, rawSoalData]);

  const handleStart = () => {
    if (filteredSoal.length === 0) {
      alert('Tidak ada soal yang tersedia untuk kategori ini.');
      return;
    }

    // Acak & ambil sejumlah `jumlahSoalPilihan`
    const shuffled = [...filteredSoal].sort(() => 0.5 - Math.random());
    const finalSoal = shuffled.slice(0, Math.min(jumlahSoalPilihan, shuffled.length));

    const judul = selectedKategori === 'semua' ? 'Simulasi Semua Mapel' : `Simulasi Mapel: ${selectedKategori.toUpperCase()}`;
    onMulaiSimulasi('mapel_firebase', finalSoal, judul);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-3 sm:p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl text-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Simulasi MAPEL (Firebase Realtime)
              </h2>
              <p className="text-xs text-gray-400">
                Pilih topik materi dari database <code className="text-indigo-400 font-mono">/soal_mapel</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Konten Utama */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Dropdown & Quick Filters / Preset Mapel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>📚 Pilih Topik / Materi Mapel:</span>
              </label>
            </div>

            {/* Dropdown Selector */}
            <div className="relative">
              <select
                value={selectedKategori}
                onChange={(e) => setSelectedKategori(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800/90 border border-indigo-500/40 hover:border-indigo-400 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner cursor-pointer"
              >
                <optgroup label="Pilihan Utama / Preset">
                  {DAFTAR_PRESET_MAPEL.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
                {kategoriList.filter(
                  (kat) => !DAFTAR_PRESET_MAPEL.some((p) => p.id.toLowerCase() === kat.toLowerCase())
                ).length > 0 && (
                  <optgroup label="Topik Lainnya (Ditemukan di Database)">
                    {kategoriList
                      .filter((kat) => !DAFTAR_PRESET_MAPEL.some((p) => p.id.toLowerCase() === kat.toLowerCase()))
                      .map((kat) => (
                        <option key={kat} value={kat}>
                          {kat}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {DAFTAR_PRESET_MAPEL.map((p) => {
                const isSelected = selectedKategori.toLowerCase() === p.id.toLowerCase();
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedKategori(p.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400 scale-[1.02]'
                        : 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700/80'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Bar & Setting Jumlah Soal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 relative">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                Cari Soal / Kata Kunci:
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari materi matriks, invers, SPLTV, determinan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                Jumlah Soal Sesi:
              </label>
              <select
                value={jumlahSoalPilihan}
                onChange={(e) => setJumlahSoalPilihan(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={5}>5 Soal (Cepat)</option>
                <option value={10}>10 Soal (Standar)</option>
                <option value={15}>15 Soal</option>
                <option value={20}>20 Soal</option>
                <option value={30}>30 Soal</option>
                <option value={filteredSoal.length || 50}>Semua yang Ada ({filteredSoal.length} Soal)</option>
              </select>
            </div>
          </div>

          {/* Status Loading / Preview Soal */}
          <div className="bg-gray-800/40 rounded-xl border border-gray-700/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Layers size={15} className="text-indigo-400" />
                Soal Ditemukan: <strong className="text-white text-sm ml-1">{filteredSoal.length}</strong>
              </span>
              <button
                onClick={loadDataSoalMapel}
                className="text-[11px] text-gray-400 hover:text-indigo-400 flex items-center gap-1 transition"
                title="Muat ulang dari database"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                Refresh Data
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                <RefreshCw size={20} className="animate-spin text-indigo-400" />
                Memuat bank soal dari Firebase Realtime Database...
              </div>
            ) : error ? (
              <div className="py-6 px-4 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-3">
                <AlertCircle size={20} className="shrink-0 text-red-400" />
                <div>
                  <div className="font-semibold">Peringatan:</div>
                  <div className="opacity-90">{error}</div>
                </div>
              </div>
            ) : filteredSoal.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs space-y-2">
                <p>Belum ada data soal pada path <code className="text-amber-400">/soal_mapel</code> di Firebase.</p>
                <p className="text-[11px] text-gray-500">
                  Anda dapat menambahkan bank soal dengan format JSON ke node <code>soal_mapel</code> di Firebase Console.
                </p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {filteredSoal.slice(0, 5).map((s, idx) => (
                  <div
                    key={s.id || idx}
                    className="p-2.5 rounded-lg bg-gray-900/60 border border-gray-700/50 text-xs flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 overflow-hidden">
                      <p className="line-clamp-2 text-gray-200">{s.pertanyaan}</p>
                      <div className="flex gap-2 mt-1 text-[10px] text-gray-400">
                        {s.mapel && <span className="bg-gray-800 px-1.5 py-0.5 rounded text-indigo-300">{s.mapel}</span>}
                        {s.topik && <span className="bg-gray-800 px-1.5 py-0.5 rounded text-emerald-300">{s.topik}</span>}
                        <span className="text-gray-500">{s.pilihan?.length || 0} Pilihan</span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredSoal.length > 5 && (
                  <p className="text-center text-[11px] text-gray-500 pt-1">
                    ... dan {filteredSoal.length - 5} soal lainnya
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal Action */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-800/40 flex items-center justify-between">
          <div className="text-xs text-gray-400">
            {filteredSoal.length > 0 && (
              <span>
                Akan disimulasikan: <strong className="text-indigo-300">{Math.min(jumlahSoalPilihan, filteredSoal.length)} Soal</strong>
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleStart}
              disabled={filteredSoal.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition transform active:scale-95"
            >
              <Play size={14} className="fill-current" />
              Mulai Simulasi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
