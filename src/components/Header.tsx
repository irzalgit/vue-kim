// src/components/Header.tsx

import { Brain, User, Settings, Sparkles } from 'lucide-react';

interface HeaderProps {
  onSimulasiClick?: () => void;
}

export default function Header({ onSimulasiClick }: HeaderProps) {
  return (
    <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
      <div className="flex items-center gap-3">
        <Brain size={28} className="text-emerald-400" />
        <div>
          <h1 className="text-xl font-bold">Math315</h1>
          <p className="text-xs text-slate-400">Belajar Matematika dengan AI</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onSimulasiClick}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors text-sm font-medium"
        >
          <Sparkles size={16} />
          Simulasi
        </button>
        <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
          <User size={20} />
        </button>
        <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}