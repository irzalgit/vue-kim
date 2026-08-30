import React, { useState, useMemo } from 'react';
import { getAllItemsFromKisi as getItemsLama, type SelectedItem } from '../agent/generateSoalWithChecklist';
import { getAllItemsFromKisi as getItemsBaru } from '../agent/generateSoalWithChecklist2026';

const FILTER_OPTIONS = [
  { label: 'FASE A', value: 'A' },
  { label: 'FASE B', value: 'B' },
  { label: 'FASE C', value: 'C' },
  { label: 'FASE D', value: 'D' },
  { label: 'FASE E', value: 'E' },
  { label: 'FASE F', value: 'F' },
  { label: 'Kelas 6', value: '6' },
  { label: 'Kelas 9', value: '9' },
  { label: 'Kelas 12', value: '12' },
];

// 🔥 Elemen yang terpengaruh oleh TKA6
const ELEMEN_TERKAIT_TKA6 = [
  'Aljabar',
  'Geometri',
  'Data dan Peluang',
];

// 🔥 Persentase item yang akan dipilih secara acak (dalam desimal)
const PERSENTASE_ACAK = 0.3; // 30%

interface MateriFilterChecklistProps {
  onSelectionChange: (items: any[]) => void;
  triggerSelect?: (actions: {
    selectFaseAB: () => void;
    selectFaseCD: () => void;
    selectFaseEF: () => void;
  }) => void;
  use2026?: boolean;
}

export const MateriFilterChecklist: React.FC<MateriFilterChecklistProps> = ({ 
  onSelectionChange, 
  triggerSelect,
  use2026 = false 
}) => {
  const allItems = useMemo(() => {
    return use2026 ? getItemsBaru() : getItemsLama();
  }, [use2026]);

  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [expandedElemen, setExpandedElemen] = useState<Set<string>>(new Set());

  // 🎯 Fungsi untuk memilih fase
  const selectFase = (fases: string[]) => {
    const newSet = new Set<string>();
    allItems.forEach(item => {
      // Perbaikan: Fase hanya ada di kisi lama
      if (item.fase && fases.includes(item.fase)) {
        newSet.add(item.id);
      }
    });
    setSelectedItemIds(newSet);
    onSelectionChange(allItems.filter(item => newSet.has(item.id)));
  };

  // Ekspos fungsi ke parent
  React.useEffect(() => {
    if (triggerSelect) {
      triggerSelect({
        selectFaseAB: () => selectFase(['A', 'B']),
        selectFaseCD: () => selectFase(['C', 'D']),
        selectFaseEF: () => selectFase(['E', 'F']),
      });
    }
  }, [triggerSelect, allItems]); // allItems added to dependencies

  const itemNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    allItems.forEach((item, index) => {
      map.set(item.id, index + 1);
    });
    return map;
  }, [allItems]);

  // Kelompokkan item berdasarkan elemenNama
  const groupedItems = useMemo(() => {
    const groups: Record<string, SelectedItem[]> = {};
    const filteredItems = activeFilters.length === 0 
      ? allItems 
      : allItems.filter((item: SelectedItem) => {
          const matchFase = activeFilters.some(f => item.fase === f);
          const matchKelas = activeFilters.some(f => {
            const kelasNum = parseInt(f);
            if (isNaN(kelasNum)) return false;
            if (Array.isArray(item.kelas)) return item.kelas.includes(kelasNum);
            if (typeof item.kelas === 'number') return item.kelas === kelasNum;
            return false;
          });
          return matchFase || matchKelas;
        });

    filteredItems.forEach(item => {
      const key = item.elemenNama || 'Lainnya';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    const sortedKeys = Object.keys(groups).sort();
    const sortedGroups: Record<string, SelectedItem[]> = {};
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });
    return sortedGroups;
  }, [allItems, activeFilters]);

  const toggleElemen = (elemenNama: string) => {
    const newSet = new Set(expandedElemen);
    if (newSet.has(elemenNama)) {
      newSet.delete(elemenNama);
    } else {
      newSet.add(elemenNama);
    }
    setExpandedElemen(newSet);
  };

  const toggleFilter = (value: string) => {
    setActiveFilters(prev =>
      prev.includes(value) ? prev.filter(f => f !== value) : [...prev, value]
    );
  };

  // 🎯 Fungsi toggle dengan logika TKA6 → 30% acak sub-sub-elemen
  const toggleItemSelection = (id: string) => {
    const item = allItems.find(i => i.id === id);
    if (!item) return;

    const isTKA6 = item.elemenNama === 'TKA6' || item.nama === 'Kosong (TKA6)' || item.nama === 'TKA6';

    const newSet = new Set(selectedItemIds);

    if (isTKA6) {
      // Ambil semua item dari elemen terkait, tapi hanya sub-sub-elemen
      const semuaSubSub = allItems.filter(i => 
        ELEMEN_TERKAIT_TKA6.includes(i.elemenNama || '') && i.type === 'subSubElemen'
      );

      if (newSet.has(id)) {
        // Uncheck TKA6 dan hapus semua item dari elemen terkait (kembali ke logika sebelumnya)
        const semuaIds = allItems
          .filter(i => ELEMEN_TERKAIT_TKA6.includes(i.elemenNama || ''))
          .map(i => i.id);
        newSet.delete(id);
        semuaIds.forEach(tid => newSet.delete(tid));
      } else {
        // Check TKA6 dan pilih 30% acak dari sub-sub-elemen
        newSet.add(id);

        // Acak dan ambil 30%
        const shuffled = [...semuaSubSub].sort(() => Math.random() - 0.5);
        const jumlahPilih = Math.ceil(semuaSubSub.length * PERSENTASE_ACAK);
        const terpilih = shuffled.slice(0, jumlahPilih);

        terpilih.forEach(t => newSet.add(t.id));
      }
    } else {
      // Perilaku normal untuk item selain TKA6
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
    }

    setSelectedItemIds(newSet);
    onSelectionChange(allItems.filter(i => newSet.has(i.id)));
  };

  // Fungsi untuk mencentang/menghapus semua item dalam satu elemen
  const toggleAllInElemen = (items: SelectedItem[]) => {
    const allSelected = items.every(i => selectedItemIds.has(i.id));
    const newSet = new Set(selectedItemIds);

    items.forEach(item => {
      if (allSelected) {
        newSet.delete(item.id);
      } else {
        newSet.add(item.id);
      }
    });

    setSelectedItemIds(newSet);
    onSelectionChange(allItems.filter(item => newSet.has(item.id)));
  };

  return (
    <div className="bg-white p-3 rounded-lg border border-gray-200">
      {/* Filter Kancing (Fase / Kelas) */}
      <div className="flex flex-wrap gap-1 mb-3">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggleFilter(opt.value)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              activeFilters.includes(opt.value)
                ? 'bg-blue-600 text-white border-blue-600 font-bold'
                : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Daftar Checklist dengan Grouping Elemen */}
      <div className="max-h-80 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
        {Object.entries(groupedItems).map(([elemenNama, items]) => {
          const isExpanded = expandedElemen.has(elemenNama);
          const semuaTercentang = items.every(i => selectedItemIds.has(i.id));
          const sebagianTercentang = items.some(i => selectedItemIds.has(i.id));

          return (
            <div key={elemenNama} className="border-b border-gray-100 last:border-0">
              {/* Header Elemen */}
              <div 
                className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1"
                onClick={() => toggleElemen(elemenNama)}
              >
                <span className="text-sm font-medium text-gray-700">
                  {isExpanded ? '▼' : '▶'} {elemenNama}
                </span>
                <span className="text-xs text-gray-400">({items.length})</span>
                <div className="flex-1" />
                <input
                  type="checkbox"
                  checked={semuaTercentang}
                  ref={(input) => {
                    if (input) input.indeterminate = sebagianTercentang && !semuaTercentang;
                  }}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleAllInElemen(items);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Sub-elemen (collapse/expand) */}
              {isExpanded && (
                <div className="ml-6 space-y-1 pb-1">
                  {items.map((item: SelectedItem) => {
                    const noUrut = itemNumberMap.get(item.id);
                    let displayText = item.nama;
                    if (item.type === 'subSubElemen') {
                      displayText = `  ${item.nama}`;
                    }

                    return (
                      <label
                        key={item.id}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-0.5 rounded pl-1"
                      >
                        <input
                          type="checkbox"
                          checked={selectedItemIds.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-mono font-bold text-blue-600 min-w-[32px]">
                          #{noUrut}
                        </span>
                        {item.refNomor && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-purple-100 text-purple-700 font-semibold rounded" title={`Merujuk ke Topik Kurikulum Merdeka #${item.refNomor}`}>
                            (KM #{item.refNomor})
                          </span>
                        )}
                        <span className="text-sm text-gray-700">
                          {displayText}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {item.type === 'subSubElemen' ? '↳' : ''}
                        </span>
                      </label>

                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-gray-500 border-t pt-2">
        Dipilih: {selectedItemIds.size} sub-elemen
      </div>
    </div>
  );
};