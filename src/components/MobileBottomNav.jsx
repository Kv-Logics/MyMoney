import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, DollarSign, TrendingUp, Menu, Sparkles, ExternalLink } from 'lucide-react';

export default function MobileBottomNav() {
  const { activeTab, setActiveTab, setIsMobileMenuOpen } = useApp();

  const handleOpenChatGPT = () => {
    // Open official ChatGPT web app / native app
    window.open('https://chatgpt.com', '_blank', 'noopener,noreferrer');
  };

  return (
    <nav className="md:hidden sticky bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] transition-colors duration-200 shadow-xl shadow-slate-950/10">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* 1. Overview */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition active:scale-95 ${
            activeTab === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight">Overview</span>
        </button>

        {/* 2. Expenses */}
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition active:scale-95 ${
            activeTab === 'expenses'
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <DollarSign className={`w-5 h-5 mb-0.5 ${activeTab === 'expenses' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight">Expenses</span>
        </button>

        {/* 3. ChatGPT Button (Official Real Logo & Direct Link) */}
        <button
          onClick={handleOpenChatGPT}
          className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl group transition active:scale-95"
          title="Open ChatGPT"
        >
          <div className="w-8 h-8 rounded-xl bg-[#10a37f] text-white flex items-center justify-center shadow-md shadow-[#10a37f]/30 group-hover:scale-105 group-hover:shadow-[#10a37f]/50 transition-all">
            {/* Authentic OpenAI ChatGPT Logo */}
            <svg
              role="img"
              viewBox="0 0 24 24"
              className="w-4 h-4 fill-white"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M22.282 9.821a6 6 0 0 0-.516-4.91a6.05 6.05 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a6 6 0 0 0-3.998 2.9a6.05 6.05 0 0 0 .743 7.097a5.98 5.98 0 0 0 .51 4.911a6.05 6.05 0 0 0 6.515 2.9A6 6 0 0 0 13.26 24a6.06 6.06 0 0 0 5.772-4.206a6.06 6.06 0 0 0 3.997-2.9a6.06 6.06 0 0 0-.747-7.073M13.26 22.43a4.48 4.48 0 0 1-2.876-1.04l.141-.081l4.779-2.758a.8.8 0 0 0 .392-.681v-6.737l2.02 1.168a.07.07 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494M3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085l4.783 2.759a.77.77 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646M2.34 7.896a4.5 4.5 0 0 1 2.366-1.973V11.6a.77.77 0 0 0 .388.677l5.815 3.354l-2.02 1.168a.08.08 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.08.08 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667m2.01-3.023l-.141-.085l-4.774-2.782a.78.78 0 0 0-.785 0L9.409 9.23V6.897a.07.07 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.8.8 0 0 0-.393.681zm1.097-2.365l2.602-1.5l2.607 1.5v2.999l-2.597 1.5l-2.607-1.5Z"/>
            </svg>
          </div>
          <span className="text-[10px] tracking-tight font-bold text-[#10a37f] dark:text-[#2dd4bf] mt-0.5">
            ChatGPT
          </span>
        </button>

        {/* 4. Profit */}
        <button
          onClick={() => setActiveTab('profit')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition active:scale-95 ${
            activeTab === 'profit'
              ? 'text-amber-600 dark:text-amber-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className={`w-5 h-5 mb-0.5 ${activeTab === 'profit' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight">Profit</span>
        </button>

        {/* 5. Menu */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition active:scale-95"
        >
          <Menu className="w-5 h-5 mb-0.5 stroke-2" />
          <span className="text-[10px] tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
}
