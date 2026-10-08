import { useState } from 'react';
import { Toaster } from 'sonner';
import Navigation from "../sections/Navigation";
import Hero from "../sections/Hero";
import Curriculum from "../sections/Curriculum";
import CinematicVision from "../sections/CinematicVision";
import AlumniArchives from "../sections/AlumniArchives";
import Footer from "../sections/Footer";
import LoginWithGoogle from "../components/LoginWithGoogle";
import { useAuth } from '../context/AuthContext';
import ShopBphy from "../components/ShopBphy";
import PaywuzPosterShop from "../components/PaywuzPosterShop";
import TikTokEduModal from "../components/TikTokEduModal";

interface LandingPageProps {
  onMulai: () => void;
}

export default function LandingPage({ onMulai }: LandingPageProps) {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const [showTikTokModal, setShowTikTokModal] = useState(false);

  return (
    <div
      style={{
        background: "#0a0a0a",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      <Toaster richColors position="top-right" />

      <Navigation
        onLoginClick={() => {}}
        isLoggedIn={isLoggedIn}
        onLogout={() => {}}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Hero />
        <Curriculum />
        <CinematicVision />
        <AlumniArchives />

        {/* 1. SEKSI SHOP BPHY (POSTER 1 - 5 & KERANJANG) */}
        <ShopBphy />

        {/* 2. SEKSI JUALAN POSTER PAYWUZ TERPISAH (CHECKOUT PAYWUZ.ID) */}
        <PaywuzPosterShop />

        {/* 3. TOMBOL SOAL TKA + GALERI VIDEO + PROFIL TIKTOK */}
        <div style={{ textAlign: 'center', padding: '30px 20px' }}>

          {/* Tombol Soal TKA - tepat di atas Galeri Video */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '0 0 25px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/tka';
              }}
              className="hover:scale-105 transition-transform"
              style={{
                width: '100%',
                maxWidth: '420px',
                padding: '17px 24px',
                borderRadius: '18px',
                border: '1px solid rgba(96, 165, 250, 0.7)',
                background:
                  'linear-gradient(135deg, #2563eb 0%, #4f46e5 55%, #7c3aed 100%)',
                color: '#ffffff',
                boxShadow: '0 10px 35px rgba(37, 99, 235, 0.35)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '21px',
                  fontWeight: 800,
                  lineHeight: 1.3,
                }}
              >
                📝 Soal TKA Matematika
              </div>

              <div
                style={{
                  marginTop: '5px',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: 0.92,
                }}
              >
                Tes Diagnostik • Latihan TKA 2026
              </div>

              <div
                style={{
                  marginTop: '9px',
                  fontSize: '13px',
                  fontWeight: 700,
                  opacity: 0.95,
                }}
              >
                👉 Mulai Soal TKA
              </div>
            </button>
          </div>

          {/* Galeri Video */}
          <div>
            <a
              href={`${import.meta.env.BASE_URL}video.html`}
              style={{
                display: 'inline-block',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 600,
                textDecoration: 'none',
                borderBottom: '2px solid #3b82f6',
                paddingBottom: '4px',
                transition: 'opacity 0.2s ease',
              }}
            >
              🎬 Galeri Video
            </a>
          </div>

          {/* Tombol Profil TikTok Pa_Irzal */}
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap',
            }}
          >
            <a
              href="https://www.tiktok.com/@_pa.irzal?_r=1&_t=ZS-9AGoh2bFDpk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:scale-105 transition-transform"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #09090b 0%, #1f1f2e 50%, #fe2c55 100%)',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                padding: '12px 26px',
                borderRadius: '14px',
                border: '1px solid rgba(254, 44, 85, 0.45)',
                boxShadow: '0 4px 20px rgba(254, 44, 85, 0.25)',
                cursor: 'pointer',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ color: '#fe2c55' }}
              >
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.81 4.48 6.3 6.3 0 0 0 1.83-4.48V8.75a8.2 8.2 0 0 0 4.95 1.66V6.96c-.34 0-.67-.09-1-.27z"/>
              </svg>
              <span>profil tiktok pa_irzal</span>
            </a>

            <button
              type="button"
              onClick={() => setShowTikTokModal(true)}
              className="hover:bg-pink-900/50 transition-colors"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(254, 44, 85, 0.12)',
                color: '#fda4af',
                fontSize: '14px',
                fontWeight: 600,
                padding: '11px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(254, 44, 85, 0.35)',
                cursor: 'pointer',
              }}
            >
              <span>📱 Buka Video TikTok</span>
            </button>
          </div>
        </div>
      </main>

      {/* Modal Video TikTok Pa_Irzal */}
      <TikTokEduModal
        isOpen={showTikTokModal}
        onClose={() => setShowTikTokModal(false)}
        materi="Matematika"
        mataPelajaran="Matematika"
        videoTitle="Koleksi Video TikTok Pa_Irzal"
      />

      {/* Area Login */}
      <div style={{ textAlign: 'center', padding: '40px 20px', background: '#0a0a0a' }}>
        {isLoggedIn ? (
          <button
            onClick={onMulai}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '15px 40px',
              fontSize: '18px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Mulai Belajar ➡️
          </button>
        ) : (
          <div className="flex justify-center">
            <LoginWithGoogle />
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
