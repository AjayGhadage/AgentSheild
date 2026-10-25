import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X, Shield } from 'lucide-react';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[#070709] text-slate-100">
      {/* Mobile Top Navbar (Hidden on Desktop) */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#09090b]/90 backdrop-blur-md border-b border-white/5 z-30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
            <Shield size={16} strokeWidth={2.8} />
          </div>
          <div>
            <span className="font-extrabold text-white text-sm leading-tight block">AgentShield AI</span>
            <span className="text-[10px] text-amber-400/90 font-mono font-semibold">Autonomous AI Gateway</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Sidebar (Desktop permanent, Mobile slide-in drawer) */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
