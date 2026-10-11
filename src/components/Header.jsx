import React from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Moon, Sun, Bell, Bot, Plus, Menu } from 'lucide-react';

export default function Header({ onOpenExpenseModal, onOpenMcpGuide }) {
  const { activeTab, setActiveTab, theme, toggleTheme, setIsVoiceModalOpen, setIsMobileMenuOpen } = useApp();

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
    <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight hidden sm:block">
          {titleMap[activeTab] || 'Dashboard'}
        </h2>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* New Update: ChatGPT MCP Guide */}
        <button
          onClick={onOpenMcpGuide}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 hover:from-amber-500/20 hover:to-purple-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-full text-xs font-bold transition shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>New Update</span>
          <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded-full font-bold uppercase hidden md:inline">
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

        {/* Notification Bell */}
        <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
          <Bell className="w-4 h-4" />
        </button>

        {/* AI Mode Purple Button */}
        <button
          onClick={() => {
            setActiveTab('ai-agent');
            setIsVoiceModalOpen(true);
          }}
          className="px-3 md:px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition"
        >
          <Bot className="w-4 h-4" />
          <span className="hidden md:inline">AI Mode</span>
        </button>

        {/* Add Expense Green Button */}
        <button
          onClick={onOpenExpenseModal}
          className="px-3 md:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden md:inline">Add Expense</span>
        </button>
      </div>
    </header>
  );
}
