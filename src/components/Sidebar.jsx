import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Bot,
  DollarSign,
  PieChart,
  TrendingUp,
  CheckSquare,
  FileText,
  Users,
  Activity,
  Settings,
  LogOut,
  Wallet
} from 'lucide-react';

export default function Sidebar() {
  const { activeTab, setActiveTab, user, logout } = useApp();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ai-agent', label: 'AI Mode', icon: Bot, badge: 'VOICE', badgeColor: 'bg-purple-100 text-purple-600 border-purple-200' },
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
    { id: 'profit', label: 'Profit Tracker', icon: TrendingUp, badge: 'ISOLATED', badgeColor: 'bg-amber-100 text-amber-700 border-amber-300' },
    { id: 'tasks', label: 'Task Manager', icon: CheckSquare },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'sharing', label: 'Family Sharing', icon: Users },
    { id: 'audit-log', label: 'Audit Log', icon: Activity },
    { id: 'budgets', label: 'Budgets & Savings', icon: PieChart, advanced: true },
    { id: 'settings', label: 'Settings', icon: Settings, advanced: true }
  ];

  return (
    <aside className="w-60 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col justify-between p-4 shrink-0 transition-colors duration-200 overflow-y-auto">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-slate-800 dark:text-white tracking-tight">MyMoney</h1>
          </div>
        </div>

        {/* User Handle */}
        <div className="px-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
          {user?.name || 'kv'}
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.filter(item => showAdvanced || !item.advanced).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold border-l-4 border-emerald-500'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 rounded-xl font-medium text-[10px] text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-all uppercase tracking-wider border border-dashed border-slate-200 dark:border-slate-800"
          >
            {showAdvanced ? "Hide Advanced" : "Show Advanced Options"}
          </button>
        </nav>
      </div>

      {/* Footer & Shared Section */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="px-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
            SHARED WITH ME
          </span>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

        <div className="px-2 text-[10px] text-slate-400">
          Developed by Kv Logics
        </div>
      </div>
    </aside>
  );
}
