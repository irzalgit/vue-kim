// src/components/Certificate.tsx
import { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { X, Download, Printer } from 'lucide-react';

interface CertificateProps {
  mataPelajaran: string;
  nilai: number;
  tanggal: string;
  onClose: () => void;
}

const NAMA_STORAGE_KEY = 'sertifikat_nama_siswa';

export default function Certificate({ mataPelajaran, nilai, tanggal, onClose }: CertificateProps) {
  const certRef = useRef<HTMLDivElement>(null);
  const [namaSiswa, setNamaSiswa] = useState<string>('');
  const [isEditingNama, setIsEditingNama] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEffect(() => {
    const tersimpan = localStorage.getItem(NAMA_STORAGE_KEY);
    if (tersimpan) {
      setNamaSiswa(tersimpan);
      setIsEditingNama(false);
    }
  }, []);

  const simpanNama = () => {
    if (namaSiswa.trim().length === 0) return;
    localStorage.setItem(NAMA_STORAGE_KEY, namaSiswa.trim());
    setIsEditingNama(false);
  };

  const tanggalFormatted = new Date(tanggal).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleDownloadPDF = async () => {
    if (!certRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      // Sertifikat orientasi landscape, ukuran A4
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const yOffset = Math.max((pageHeight - imgHeight) / 2, 0);
      pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, Math.min(imgHeight, pageHeight));
      pdf.save(`Sertifikat_${mataPelajaran.replace(/\s+/g, '_')}_${namaSiswa.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Gagal membuat PDF sertifikat:', err);
      alert('Gagal membuat PDF. Coba lagi atau gunakan opsi Print.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isEditingNama) {
    return (
      <div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-gray-800 rounded-2xl max-w-md w-full p-6 relative shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
          <h2 className="text-xl font-bold text-white mb-2">🎉 Selamat!</h2>
          <p className="text-sm text-gray-400 mb-4">
            Skor kamu {nilai}% — memenuhi syarat untuk mendapatkan sertifikat. Masukkan nama lengkap untuk dicetak di sertifikat:
          </p>
          <input
            type="text"
            value={namaSiswa}
            onChange={(e) => setNamaSiswa(e.target.value)}
            placeholder="Nama lengkap"
            className="w-full px-4 py-2 rounded-lg bg-gray-900 text-white border border-gray-700 focus:outline-none focus:border-blue-500 mb-4"
            onKeyDown={(e) => { if (e.key === 'Enter') simpanNama(); }}
            autoFocus
          />
          <button
            onClick={simpanNama}
            disabled={namaSiswa.trim().length === 0}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            Lanjutkan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 print:p-0 print:bg-white">
      <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto p-4 sm:p-6 relative shadow-2xl print:shadow-none print:max-h-none print:rounded-none print:bg-white print:p-0">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <h2 className="text-lg font-bold text-white">Sertifikat Kamu</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Area sertifikat yang di-capture untuk PDF & di-print */}
        <div
          ref={certRef}
          id="certificate-printable"
          style={{
            background: 'linear-gradient(135deg, #fdfcf8 0%, #f5f3ec 100%)',
            border: '10px solid #1a1a1a',
            borderRadius: 8,
            padding: '48px 56px',
            position: 'relative',
            fontFamily: "'EB Garamond', serif",
            color: '#1a1a1a',
          }}
        >
          <div
            style={{
              border: '2px solid #c9a961',
              borderRadius: 4,
              padding: '40px 48px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: 4, color: '#8a8a8a', marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
              BPHY — PLATFORM BELAJAR MATEMATIKA
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 1, marginBottom: 24 }}>
              SERTIFIKAT PENCAPAIAN
            </div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
              Diberikan kepada
            </div>
            <div
              style={{
                fontSize: 42,
                fontWeight: 600,
                color: '#1a1a1a',
                marginBottom: 20,
                borderBottom: '1px solid #c9a961',
                display: 'inline-block',
                paddingBottom: 8,
                minWidth: 300,
              }}
            >
              {namaSiswa}
            </div>
            <div style={{ fontSize: 15, color: '#444', lineHeight: 1.8, maxWidth: 520, margin: '0 auto 24px', fontFamily: "'Inter', sans-serif" }}>
              Telah berhasil menyelesaikan simulasi <strong>{mataPelajaran}</strong> dengan pencapaian nilai <strong>{nilai}%</strong>, menunjukkan penguasaan yang baik atas materi yang diujikan.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 40 }}>
              <div style={{ textAlign: 'left', fontSize: 12, color: '#666', fontFamily: "'Inter', sans-serif" }}>
                Tanggal<br />
                <strong style={{ fontSize: 14, color: '#1a1a1a' }}>{tanggalFormatted}</strong>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: '#666', fontFamily: "'Inter', sans-serif" }}>
                Nilai Akhir<br />
                <strong style={{ fontSize: 14, color: '#1a1a1a' }}>{nilai} / 100</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6 print:hidden">
          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium transition-colors"
          >
            <Download size={18} />
            {isGenerating ? 'Membuat PDF...' : 'Unduh PDF'}
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
          >
            <Printer size={18} />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
