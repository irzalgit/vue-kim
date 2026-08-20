import { Toaster } from 'sonner';
import Navigation from "../sections/Navigation";
import Hero from "../sections/Hero";
import Curriculum from "../sections/Curriculum";
import CinematicVision from "../sections/CinematicVision";
import AlumniArchives from "../sections/AlumniArchives";
import Footer from "../sections/Footer";
import LoginWithGoogle from "../components/LoginWithGoogle";
import { useAuth } from '../context/AuthContext';

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

      <main>
        <Hero />
        <Curriculum />
        <CinematicVision />
        <AlumniArchives />
    
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
