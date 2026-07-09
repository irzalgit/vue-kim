import Navigation from "../sections/Navigation";
import Hero from "../sections/Hero";
import Curriculum from "../sections/Curriculum";
import CinematicVision from "../sections/CinematicVision";
import Agent from "../sections/Agent";
import Footer from "../sections/Footer";

interface LandingPageProps {
  onMulai: () => void;
}

export default function LandingPage({ onMulai }: LandingPageProps) {
  return (
    <div
      style={{
        background: "#0a0a0a",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      <Navigation />

      <main>
        <Hero />
        <Curriculum />
        <CinematicVision />
        <Agent />
      </main>

      {/* Tombol Mulai Belajar */}
      <div style={{ textAlign: 'center', padding: '40px 20px', background: '#0a0a0a' }}>
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
      </div>

      <Footer />
    </div>
  );
}
