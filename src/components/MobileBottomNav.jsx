import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, DollarSign, Bot, TrendingUp, Menu, Sparkles } from 'lucide-react';

export default function MobileBottomNav() {
  const { activeTab, setActiveTab, setIsMobileMenuOpen } = useApp();

  return (
    <nav className="md:hidden sticky bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-colors duration-200 shadow-lg shadow-slate-900/10">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition active:scale-95 ${
            activeTab === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight">Overview</span>
        </button>

        {/* Expenses */}
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition active:scale-95 ${
            activeTab === 'expenses'
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <DollarSign className={`w-5 h-5 mb-0.5 ${activeTab === 'expenses' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight">Expenses</span>
        </button>

        {/* Hero AI Agent Center Button */}
        <button
          onClick={() => setActiveTab('ai-agent')}
          className="relative -top-4 flex flex-col items-center justify-center group focus:outline-none"
        >
          <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 transform active:scale-90 ${
            activeTab === 'ai-agent'
              ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-purple-500/40 ring-4 ring-purple-500/20 scale-105'
              : 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 text-white shadow-emerald-500/30 hover:scale-105'
          }`}>
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <span className={`text-[10px] mt-1 font-bold flex items-center gap-0.5 ${
            activeTab === 'ai-agent'
              ? 'text-purple-600 dark:text-purple-400'
              : 'text-slate-600 dark:text-slate-300'
          }`}>
            <Sparkles className="w-2.5 h-2.5 text-amber-500 inline" /> AI Mode
          </span>
        </button>

        {/* Profit Tracker */}
        <button
          onClick={() => setActiveTab('profit')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition active:scale-95 ${
            activeTab === 'profit'
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className={`w-5 h-5 mb-0.5 ${activeTab === 'profit' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight">Profit</span>
        </button>

        {/* Menu / Drawer */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200 transition active:scale-95"
        >
          <Menu className="w-5 h-5 mb-0.5 stroke-2" />
          <span className="text-[10px] tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
}

