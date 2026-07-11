import { useEffect, Component } from 'react';
import type { ReactNode } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import { renderMathJax } from './utils/helpers';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import SoalPage from './pages/SoalPage';

// --- Definisi Tipe untuk ErrorBoundary ---
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-950 text-white p-6">
          <div className="max-w-xl w-full rounded-xl border border-red-700 bg-red-900/40 p-6">
            <h1 className="text-2xl font-bold mb-4">🚨 Aplikasi Crash</h1>
            <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded bg-red-600 px-4 py-2">
              Refresh Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Wrapper agar SoalPage dapat kodeSoal dari URL ---
function SoalPageWrapper() {
  const navigate = useNavigate();
  const { kode } = useParams<{ kode: string }>();

  if (!kode) {
    return null;
  }

  return <SoalPage kodeSoal={kode} onKembali={() => navigate('/dashboard')} />;
}

// --- Komponen AppContent ---
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentView = location.pathname.startsWith('/soal')
    ? 'soal'
    : location.pathname.startsWith('/dashboard')
    ? 'dashboard'
    : 'landing';

  useEffect(() => {
    if (typeof renderMathJax === 'function') {
      renderMathJax();
    }
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen text-white transition-colors duration-500 pt-16 relative"
      style={{
        backgroundColor: currentView === 'landing' ? '#16a34a' : currentView === 'dashboard' ? '#dc2626' : '#2563eb',
      }}
    >
   {/* Panel Debug */}
<div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 border-b border-black/20 bg-black/20 p-3 text-sm backdrop-blur-sm">
  <button type="button" onClick={() => navigate('/')} className="rounded bg-green-700 px-4 py-2">🟢 Landing</button>
  <button type="button" onClick={() => navigate('/dashboard')} className="rounded bg-red-700 px-4 py-2">🔴 Dashboard</button>
  <span className="rounded bg-black/30 px-3 py-2">View Aktif: <strong>{currentView}</strong></span>
</div>

      <Routes>
        <Route path="/" element={<LandingPage onMulai={() => navigate('/dashboard')} />} />
        <Route path="/dashboard" element={<DashboardPage onBukaSoal={(kode) => navigate(`/soal/${kode}`)} onKembaliKeLanding={() => navigate('/')} />} />
        <Route path="/soal/:kode" element={<SoalPageWrapper />} />
      </Routes>
    </div>
  );
}

// --- App Utama ---
export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </ErrorBoundary>
  );
}