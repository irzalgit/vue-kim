import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { renderMathJax } from './utils/helpers';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import SoalPage from './pages/SoalPage';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-950 text-white p-6">
          <div className="max-w-xl w-full rounded-xl border border-red-700 bg-red-900/40 p-6">
            <h1 className="text-2xl font-bold mb-4">🚨 Aplikasi Crash</h1>
            <pre className="text-xs overflow-auto whitespace-pre-wrap">
              {this.state.error?.stack || this.state.error?.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded bg-red-600 px-4 py-2 hover:bg-red-500"
            >
              Refresh Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [currentView, setCurrentView] = useState<
    'landing' | 'dashboard' | 'soal'
  >('landing');

  const [kodeSoal, setKodeSoal] = useState('');

  useEffect(() => {
    renderMathJax();
  }, [currentView]);

  const bukaSoal = (kode: string) => {
    console.log('✅ Buka soal:', kode);
    setKodeSoal(kode);
    setCurrentView('soal');
  };

  const kembaliKeDashboard = () => {
    console.log('✅ Kembali ke Dashboard');
    setCurrentView('dashboard');
  };

  const pindahKeLanding = () => {
    console.log('🟢 Landing aktif');
    setCurrentView('landing');
  };

  const pindahKeDashboard = () => {
    console.log('🔴 Dashboard aktif');
    setCurrentView('dashboard');
  };

  const mulaiDariLanding = () => {
    console.log('▶️ Mulai Belajar');
    setCurrentView('dashboard');
  };

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* Container utama dengan padding atas untuk memberi ruang pada panel debug fixed */}
        <div
          className="min-h-screen text-white transition-colors duration-500 pt-16 relative"
          style={{
            backgroundColor:
              currentView === 'landing'
                ? '#16a34a' // Hijau
                : currentView === 'dashboard'
                ? '#dc2626' // Merah
                : '#2563eb', // Biru
          }}
        >
          {/* Panel Debug - fixed di atas */}
          <div className="fixed top-0 left-0 right-0 z-50 flex flex-wrap items-center justify-center gap-3 border-b border-black/20 bg-black/20 p-3 text-sm backdrop-blur-sm">
            <button
              onClick={pindahKeLanding}
              className="rounded bg-green-700 px-4 py-2 hover:bg-green-600"
            >
              🟢 Landing
            </button>

            <button
              onClick={pindahKeDashboard}
              className="rounded bg-red-700 px-4 py-2 hover:bg-red-600"
            >
              🔴 Dashboard
            </button>

            <span className="rounded bg-black/30 px-3 py-2">
              View Aktif: <strong>{currentView}</strong>
            </span>
          </div>

          {/* Halaman */}
          {currentView === 'landing' && (
            <LandingPage onMulai={mulaiDariLanding} />
          )}

          {currentView === 'dashboard' && (
            <DashboardPage
              onBukaSoal={bukaSoal}
              onKembaliKeLanding={pindahKeLanding}
            />
          )}

          {currentView === 'soal' && (
            <SoalPage kodeSoal={kodeSoal} onKembali={kembaliKeDashboard} />
          )}
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}