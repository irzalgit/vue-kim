import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { renderMathJax } from './utils/helpers';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import SoalPage from './pages/SoalPage';

// --- Error Boundary ---
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-slate-950 text-red-400 min-h-screen font-mono flex flex-col justify-center items-center">
          <div className="w-full max-w-xl bg-red-950/30 border border-red-900/50 rounded-2xl p-6 shadow-xl">
            <h1 className="text-xl font-bold text-red-500 mb-2 flex items-center gap-2">
              🚨 Aplikasi Crash (Runtime Error)
            </h1>
            <p className="text-sm text-slate-300 mb-4">
              Ada kode di dalam komponen asli Anda yang mogok kerja:
            </p>
            <pre className="bg-red-950/80 p-4 rounded-xl text-xs text-red-300 overflow-x-auto whitespace-pre-wrap border border-red-900">
              {this.state.error?.stack || this.state.error?.toString()}
            </pre>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 bg-red-800 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-xl text-xs transition-all"
            >
              Coba Segarkan Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- KOMPONEN UTAMA ---
export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'soal'>('landing');
  const [kodeSoal, setKodeSoal] = useState<string>('');

  useEffect(() => {
    renderMathJax();
  }, [currentView]);

  const bukaSoal = (kode: string) => {
    console.log('✅ Buka soal:', kode);
    setKodeSoal(kode);
    setCurrentView('soal');
  };

  const kembaliKeDashboard = () => {
    console.log('✅ Kembali ke dashboard');
    setCurrentView('dashboard');
  };

  // ✅ FUNGSI PINDAH KE DASHBOARD - DIPERBAIKI
  const pindahKeDashboard = () => {
    console.log('✅ Tombol diklik! Pindah dari:', currentView, '→ dashboard');
    setCurrentView('dashboard');
  };

  // ✅ FUNGSI MULAI BELAJAR (dari LandingPage ke Dashboard)
  const mulaiDariLanding = () => {
    console.log('✅ Mulai belajar - Pindah dari landing → dashboard');
    setCurrentView('dashboard');
  };

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-950 text-white">
          {/* Debug Navigation */}
          <div className="bg-slate-900 p-2 text-center border-b border-slate-800 text-xs text-slate-400 flex justify-center gap-4 flex-wrap">
            <span>🔧 Mode Dev:</span>
            <button 
              onClick={mulaiDariLanding}
              className="bg-green-600 px-2 py-0.5 rounded text-white font-medium hover:bg-green-500 transition-colors"
            >
              Landing
            </button>
            <button 
              onClick={pindahKeDashboard}
              className="bg-blue-600 px-2 py-0.5 rounded text-white font-medium hover:bg-blue-500 transition-colors"
            >
              Dashboard
            </button>
            <span>| View: <strong>{currentView}</strong></span>
          </div>
          
          {/* Views Rendering */}
          {currentView === 'landing' && <LandingPage onMulai={mulaiDariLanding} />}
          {currentView === 'dashboard' && (
            <DashboardPage 
              onBukaSoal={bukaSoal}
              onKembaliKeLanding={() => {
                console.log('✅ Kembali ke landing');
                setCurrentView('landing');
              }}
            />
          )}
          {currentView === 'soal' && <SoalPage kodeSoal={kodeSoal} onKembali={kembaliKeDashboard} />}
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
