import React from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Moon, Sun, Bell, Plus, Menu } from 'lucide-react';

export default function Header({ onOpenExpenseModal, onOpenQuickActions, onOpenMcpGuide }) {
  const { activeTab, setActiveTab, theme, toggleTheme, setIsMobileMenuOpen } = useApp();

  const handleActionClick = () => {
    if (onOpenQuickActions) {
      onOpenQuickActions();
    } else if (onOpenExpenseModal) {
      onOpenExpenseModal();
    }
  };

  const titleMap = {
    dashboard: 'Dashboard',
    'ai-agent': 'Agentic MyMoney (AI Mode)',
    expenses: 'Expenses',
    budgets: 'Budgets & Savings',
    profit: 'Daily Profit Tracker',
    tasks: 'Tasks',
    reports: 'Reports',
    sharing: 'Sharing',
    'audit-log': 'Audit log',
    settings: 'Settings'
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-3 md:px-6 py-2.5 md:py-3.5 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200">
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile Hamburger Menu */}
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          aria-label="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <h2 className="text-base md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            {titleMap[activeTab] || 'Dashboard'}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-3">
        {/* New Update: ChatGPT MCP Guide - Desktop only to save mobile space */}
        <button
          onClick={onOpenMcpGuide}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 hover:from-amber-500/20 hover:to-purple-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-full text-xs font-bold transition shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>New Update</span>
          <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded-full font-bold uppercase">
            MCP
          </span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title="Toggle Light / Dark Theme"
          className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Primary Action Button */}
        <button
          onClick={handleActionClick}
          className="px-3 md:px-4 py-2 bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/30 flex items-center gap-1.5 transition active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="hidden sm:inline">Quick Action</span>
        </button>
      </div>
    </header>
  );
}
