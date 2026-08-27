// Ubah baris pertama di App.tsx menjadi:
import { useEffect, Component, createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { renderMathJax } from './utils/helpers';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import SoalPage from './pages/SoalPage';
import ShopPage from './pages/ShopPage';
import { PaymentModal } from './components/PaymentModal';
import type { SelectedItem } from './agent/generateSoalWithChecklist';

// --- Context ---
const PaymentContext = createContext<{ triggerPayment: () => void } | null>(null);
export const usePayment = () => useContext(PaymentContext)!;

// --- ErrorBoundary ---
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

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

// Data yang dikirim dari DashboardPage saat "Mulai Sesi" diklik, dibawa lewat
// router state (BUKAN URL) karena selectedItems adalah array objek yang tidak
// bisa dikodekan ke URL path. Dibaca lagi di SoalPageWrapper lewat useLocation().
interface SoalNavigationState {
  selectedItems?: SelectedItem[];
  jumlahSesi?: number;
  jumlahSoalPerSesi?: number;
}

// --- Wrapper ---
function SoalPageWrapper() {
  const navigate = useNavigate();
  const { kode } = useParams<{ kode: string }>();
  const location = useLocation();

  if (!kode) return null;

  // location.state bisa null kalau SoalPage diakses langsung lewat URL
  // (refresh halaman, buka link langsung, dll) tanpa lewat Dashboard —
  // dalam kasus itu SoalPage otomatis fallback ke perilaku lamanya sendiri
  // (selectedItems kosong, jumlahSesi/jumlahSoalPerSesi default 10/1).
  const state = (location.state as SoalNavigationState | null) ?? {};

  return (
    <SoalPage
      kodeSoal={kode}
      selectedItems={state.selectedItems}
      jumlahSesi={state.jumlahSesi}
      jumlahSoalPerSesi={state.jumlahSoalPerSesi}
      onKembali={() => navigate('/dashboard')}
    />
  );
}

// --- AppContent ---
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showPayment, setShowPayment] = useState(false);

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
    <PaymentContext.Provider value={{ triggerPayment: () => setShowPayment(true) }}>
      <div
        className={`min-h-screen text-white transition-colors duration-500 relative ${import.meta.env.DEV ? "pt-16" : ""}`}
        style={{
          backgroundColor: currentView === 'landing' ? '#0a0a0a' : currentView === 'dashboard' ? '#dc2626' : '#2563eb',
        }}
      >
        {/* Panel Debug — hanya tampil saat development (npm run dev),
            otomatis tersembunyi di build production (npm run build). */}
        {import.meta.env.DEV && (
          <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 border-b border-black/20 bg-black/20 p-3 text-sm backdrop-blur-sm">
            <button type="button" onClick={() => navigate('/')} className="rounded bg-green-700 px-4 py-2">🟢 Landing</button>
            <button type="button" onClick={() => navigate('/dashboard')} className="rounded bg-red-700 px-4 py-2">🔴 Dashboard</button>
            <span className="rounded bg-black/30 px-3 py-2">View: <strong>{currentView}</strong></span>
          </div>
        )}

        <Routes>
          <Route path="/" element={<LandingPage onMulai={() => navigate('/dashboard')} />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route 
            path="/dashboard" 
            element={
              <DashboardPage 
                onBukaSoal={(
                  kode: string,
                  selectedItems?: SelectedItem[],
                  jumlahSesi?: number,
                  jumlahSoalPerSesi?: number
                ) =>
                  navigate(`/soal/${kode}`, {
                    state: { selectedItems, jumlahSesi, jumlahSoalPerSesi } as SoalNavigationState,
                  })
                }
                onKembaliKeLanding={() => navigate('/')} 
              />
            } 
          />
          <Route path="/soal/:kode" element={<SoalPageWrapper />} />
        </Routes>
        <PaymentModal open={showPayment} onOpenChange={setShowPayment} />
      </div>
    </PaymentContext.Provider>
  );
}

// --- App Utama ---
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <AppContent />
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
