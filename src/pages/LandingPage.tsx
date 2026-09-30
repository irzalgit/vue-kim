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

interface LandingPageProps {
  onMulai: () => void;
}

export default function LandingPage({ onMulai }: LandingPageProps) {
  const { user } = useAuth();
  const isLoggedIn = !!user;

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

        {/* 3. LINK GALERI VIDEO (diletakkan di bawah section jualan poster) */}
        <div style={{ textAlign: 'center', padding: '30px 20px' }}>
          <a
            href="/video.html"
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
      </main>


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
