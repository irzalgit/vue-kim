// src/pages/DashboardPage.tsx
import { useState } from 'react';
import Header from "../components/Header";
import Agent from "../sections/Agent";
import SoalGeneratorWithChecklist from "../components/soal/SoalGeneratorWithChecklist";

interface DashboardPageProps {
  onBukaSoal: (kode: string, selectedItems?: any[]) => void;
  onKembaliKeLanding: () => void;
}

export default function DashboardPage({
  onBukaSoal,
  onKembaliKeLanding
}: DashboardPageProps) {
  const [selectedSimulasi, setSelectedSimulasi] = useState<string | null>(null);
  const [showChecklistModal, setShowChecklistModal] = useState<boolean>(false);
  const [sesiDimulai, setSesiDimulai] = useState<boolean>(false);

  const daftarSimulasi = [
    {
      kode: "matematika",
      nama: "Simulasi Matematika",
      warna: "#2563eb",
      icon: "📐",
      deskripsi: "Latihan soal matematika dari SD hingga SMA"
    },
    {
      kode: "fisika",
      nama: "Simulasi Fisika",
      warna: "#059669",
      icon: "⚛️",
      deskripsi: "Latihan soal fisika untuk SMA"
    }
  ];

  const handlePilihSimulasi = (kode: string) => {
    setSelectedSimulasi(kode);
    setShowChecklistModal(true);
  };

  // 1. Terima selectedItems dari komponen SoalGeneratorWithChecklist
  const handleMulaiSesi = (selectedItems: any[]) => {
    setShowChecklistModal(false);
    setSesiDimulai(true);

    // 2. Kirim kode simulasi dan selectedItems ke parent (App.tsx)
    if (selectedSimulasi) {
      onBukaSoal(selectedSimulasi, selectedItems);
    }
  };

  const handleTutupModal = () => {
    setShowChecklistModal(false);
    if (!sesiDimulai) {
      setSelectedSimulasi(null);
    }
  };

  return (
    <div
      style={{
        padding: "40px",
        color: "#fff",
        background: "#0a0a0a",
        minHeight: "100vh"
      }}
    >
      <Header />

      <button
        onClick={onKembaliKeLanding}
        style={{
          marginTop: "20px",
          cursor: "pointer",
          background: "transparent",
          border: "none",
          color: "#94a3b8",
          fontSize: "14px"
        }}
      >
        ← Kembali ke Landing
      </button>

      <h1 style={{ marginTop: "20px" }}>
        📚 Vue-Kim Dashboard
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          maxWidth: "700px",
          marginTop: "20px"
        }}
      >
        {daftarSimulasi.map((sim) => (
          <button
            key={sim.kode}
            onClick={() => handlePilihSimulasi(sim.kode)}
            style={{
              background: sim.warna,
              padding: "30px",
              borderRadius: "16px",
              border: "none",
              color: "white",
              cursor: "pointer",
              textAlign: "center",
              fontSize: "18px",
              fontWeight: "bold"
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>
              {sim.icon}
            </div>
            {sim.nama}
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px", fontWeight: "normal" }}>
              {sim.deskripsi}
            </div>
          </button>
        ))}
      </div>

      <hr style={{ margin: "40px 0", borderColor: "#334155" }} />
      <Agent />

      {/* MODAL 2: CHECKLIST PILIH TOPIK */}
      {showChecklistModal && selectedSimulasi && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}
          onClick={handleTutupModal}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: "24px",
              padding: "32px",
              maxWidth: "900px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleTutupModal}
              style={{
                position: "absolute",
                top: "16px",
                right: "20px",
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                fontSize: "24px",
                cursor: "pointer"
              }}
            >
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "bold" }}>
                  {daftarSimulasi.find(s => s.kode === selectedSimulasi)?.nama}
                </h2>
                <p style={{ color: "#94a3b8", fontSize: "14px" }}>
                  Pilih topik yang ingin Anda pelajari
                </p>
              </div>
            </div>

            {/* Komponen Checklist yang akan melemparkan selectedItems */}
            <SoalGeneratorWithChecklist
              onMulaiSesi={handleMulaiSesi}
              simulasiKode={selectedSimulasi}
            />
          </div>
        </div>
      )}
    </div>
  );
}
