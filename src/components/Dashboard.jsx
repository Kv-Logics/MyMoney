import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE, fetchWithAuth } from '../api';
import {
  Calendar,
  Info,
  Home,
  PlusCircle,
  TrendingUp,
  Plus,
  Target,
  CheckSquare,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Zap,
  PieChart,
  Shield,
  Users,
  Search,
  RefreshCw
} from 'lucide-react';

export default function Dashboard({ onOpenExpenseModal, onOpenProfitModal }) {
  const {
    user,
    expenses,
    budgets,
    dailyProfits,
    profitSummary,
    settings,
    setActiveTab
  } = useApp();

  const isAdmin = user && (user.email === 'keerthivasan.220722@gmail.com' || user.email === 'a.keerthivasan7676@gmail.com');
  const [dashboardView, setDashboardView] = useState('user'); // 'user' | 'admin'
  const [selectedDay, setSelectedDay] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Admin stats & users state
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminUserSearch, setAdminUserSearch] = useState('');

  const loadAdminData = async () => {
    if (!isAdmin) return;
    setAdminLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/auth/admin/stats`),
        fetchWithAuth(`${API_BASE}/auth/admin/users`)
      ]);
      if (statsRes.ok) {
        setAdminStats(await statsRes.json());
      }
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setAdminUsers(Array.isArray(uData) ? uData : []);
      }
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && dashboardView === 'admin') {
      loadAdminData();
    }
  }, [isAdmin, dashboardView]);

  // Summary math
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const todayStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const currentMonthStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

  const nonRentExpenses = expenses.filter(e => e.category && e.category.toLowerCase() !== 'rent');
  const currentMonthExpenses = nonRentExpenses.filter(e => e.date && e.date.startsWith(currentMonthStr));
  const monthTotal = currentMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const todayTotal = nonRentExpenses
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const rentExpensesList = expenses.filter(e => e.category && e.category.toLowerCase() === 'rent' && e.date && e.date.startsWith(currentMonthStr));
  const rentTotal = rentExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);

  const overallBudget = budgets.find(b => b.category === 'Overall');
  const budgetAmount = overallBudget ? overallBudget.amount : 0;
  const remainingBudget = Math.max(0, budgetAmount - monthTotal);
  const budgetUsedPct = overallBudget ? Math.min(100, Math.round((monthTotal / (budgetAmount || 1)) * 100)) : 0;

  const todayProfitRecord = (dailyProfits || []).find(p => p.date === todayStr);
  const todayProfit = todayProfitRecord ? todayProfitRecord.amount : 0;

  // Category Breakdown Math (Current Month)
  const categoryTotals = {};
  currentMonthExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
  const categoryBreakdown = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt], idx) => ({
      name: cat,
      amount: amt,
      pct: Math.round((amt / (monthTotal || 1)) * 100),
      color: CHART_COLORS[idx % CHART_COLORS.length]
    }));

  let currentAngle = 0;
  const dynamicCircles = categoryBreakdown.map(c => {
    const dashLength = (c.pct / 100) * 251.2;
    const isHovered = hoveredCategory && hoveredCategory.name === c.name;
    const isAnyHovered = hoveredCategory !== null;

    const circle = (
      <circle
        key={c.name}
        cx="50" cy="50" r="40"
        fill="transparent"
        stroke={c.color}
        strokeWidth={isHovered ? "13" : "10"}
        strokeDasharray={`${dashLength} 251.2`}
        strokeDashoffset="0"
        transform={`rotate(${currentAngle} 50 50)`}
        onMouseEnter={() => setHoveredCategory(c)}
        onMouseLeave={() => setHoveredCategory(null)}
        className={`transition-all duration-300 ease-out cursor-pointer ${
          isHovered
            ? 'opacity-100 drop-shadow-md'
            : isAnyHovered
            ? 'opacity-40 hover:opacity-100'
            : 'opacity-100 hover:opacity-90'
        }`}
      />
    );
    currentAngle += (c.pct / 100) * 360;
    return circle;
  });

  // Daily Spending Trend Math (7 Days shifted by weekOffset)
  const chartData = [];
  let maxDailyAmount = 0;
  let weekTotal = 0;
  
  const anchorDate = new Date();
  anchorDate.setDate(anchorDate.getDate() + (weekOffset * 7));

  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    
    const dayExpenses = nonRentExpenses.filter(e => e.date === dateStr);
    const sum = dayExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    
    if (sum > maxDailyAmount) maxDailyAmount = sum;
    weekTotal += sum;
    
    chartData.push({ dateStr, dayName, sum, expenses: dayExpenses });
  }

  const firstChartDay = chartData[0] ? `${chartData[0].dateStr.slice(8, 10)}/${chartData[0].dateStr.slice(5, 7)}` : '';
  const lastChartDay = chartData[6] ? `${chartData[6].dateStr.slice(8, 10)}/${chartData[6].dateStr.slice(5, 7)}` : '';
  const weekLabel = weekOffset === 0
    ? `This Week – ${firstChartDay} - ${lastChartDay}`
    : weekOffset === -1
    ? `Last Week – ${firstChartDay} - ${lastChartDay}`
    : `${firstChartDay} - ${lastChartDay}`;

  return (
    <div className="space-y-6">
      {/* Dashboard View Toggle Tabs (Only shown to System Admin) */}
      {isAdmin && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setDashboardView('user')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                dashboardView === 'user'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              My Personal Expenses
            </button>
            <button
              onClick={() => setDashboardView('admin')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                dashboardView === 'admin'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              System Admin Stats
            </button>
          </div>

          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Administrator Account
          </span>
        </div>
      )}

      {(!isAdmin || dashboardView === 'user') ? (
        <>
          {/* Top 5 Stat Cards Grid */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-${overallBudget ? '5' : '4'} gap-5`}>
            {/* Month Spending */}
            <div className="app-card">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">MONTH SPENDING</span>
              <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-2">
                {settings.currency} {monthTotal.toLocaleString()}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>Current Month</span>
              </div>
            </div>

            {/* Today Spending */}
            <div className="app-card">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">TODAY SPENDING</span>
              <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-2">
                {settings.currency} {todayTotal.toLocaleString()}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                <Info className="w-3.5 h-3.5 text-rose-500" />
                <span>Updated just now</span>
              </div>
            </div>

            {/* Monthly Rent */}
            <div className="app-card">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">MONTHLY RENT</span>
              <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-2">
                {settings.currency} {rentTotal.toLocaleString()}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                <Home className="w-3.5 h-3.5 text-violet-500" />
                <span>Dedicated Rent Tracker</span>
              </div>
            </div>

            {/* Remaining Budget (Only show if set) */}
            {overallBudget && (
              <div className="app-card">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">REMAINING BUDGET</span>
                <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-2">
                  {settings.currency} {remainingBudget.toLocaleString()}
                </h3>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${budgetUsedPct}%` }}></div>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">{budgetUsedPct}% used ({settings.currency}{monthTotal.toLocaleString()})</p>
              </div>
            )}

            {/* Monthly Profit Card */}
            <div className="app-card border border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-500/5 via-transparent to-emerald-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">MONTHLY PROFIT</span>
                <span className="text-[9px] bg-amber-100 dark:bg-amber-950/40 border border-amber-300 text-amber-700 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full uppercase">
                  ISOLATED
                </span>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-2">
                {settings.currency} {(profitSummary?.total_profit || 0).toLocaleString()}
              </h3>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  <span>{todayProfit > 0 ? `+${settings.currency}${todayProfit.toLocaleString()} today` : "Keep going!"}</span>
                </div>
                <button
                  onClick={() => setActiveTab('profit')}
                  className="text-amber-600 dark:text-amber-400 font-bold text-xs hover:underline flex items-center gap-0.5"
                >
                  Tracker →
                </button>
              </div>
            </div>
          </div>

          {/* Daily Profit Bar Banner */}
          <div className="app-card border border-amber-200 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/40 border border-amber-200 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-slate-800 dark:text-white">Daily Profit Tracker</h4>
                  <span className="text-[9px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full">
                    Separate Module
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Track isolated business profits & daily revenues without mixing with expense categories.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={onOpenProfitModal}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                + Record Today's Profit
              </button>
              <button
                onClick={() => setActiveTab('profit')}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition"
              >
                View History
              </button>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Donut */}
            <div className="app-card">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-500" />
                <span>CATEGORY BREAKDOWN</span>
              </h3>

              <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e2e8f0" strokeWidth="10" />
                    {dynamicCircles}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2 transition-all duration-300">
                    {hoveredCategory ? (
                      <>
                        <span
                          className="text-[10px] uppercase font-extrabold tracking-wider block transition-colors duration-200 truncate max-w-[100px]"
                          style={{ color: hoveredCategory.color }}
                        >
                          {hoveredCategory.name}
                        </span>
                        <span className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                          {settings.currency}{hoveredCategory.amount.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                          {hoveredCategory.pct}% of total
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                          TOTAL SPENT
                        </span>
                        <span className="text-lg font-extrabold text-slate-800 dark:text-white leading-tight">
                          {settings.currency}{monthTotal.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                          {categoryBreakdown.length} {categoryBreakdown.length === 1 ? 'Category' : 'Categories'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2 flex-1 min-w-[180px] max-w-[260px]">
                  {categoryBreakdown.map(c => {
                    const isHovered = hoveredCategory && hoveredCategory.name === c.name;
                    return (
                      <div
                        key={c.name}
                        onMouseEnter={() => setHoveredCategory(c)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        className={`flex items-center justify-between text-xs p-1.5 rounded-xl transition-all cursor-pointer ${
                          isHovered
                            ? 'bg-slate-100 dark:bg-slate-800 scale-[1.02] shadow-sm'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: c.color }}
                          ></div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {c.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-right">
                          <span className="font-extrabold text-slate-800 dark:text-white">
                            {settings.currency}{c.amount.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            ({c.pct}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Daily Spending Trend Bar Chart */}
            <div className="app-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>DAILY SPENDING TREND</span>
                </h3>
                <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-600 font-bold rounded-lg border border-emerald-200">
                  ₹{weekTotal.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between mb-4 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDay(null);
                    setWeekOffset((prev) => prev - 1);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white transition rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                  title="Previous week"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {weekLabel}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (weekOffset < 0) {
                      setSelectedDay(null);
                      setWeekOffset((prev) => Math.min(0, prev + 1));
                    }
                  }}
                  disabled={weekOffset >= 0}
                  className={`p-1 transition rounded-lg ${
                    weekOffset >= 0
                      ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                      : 'text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                  title={weekOffset >= 0 ? 'Current week' : 'Next week'}
                  aria-label="Next week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Bar graph */}
              <div className="h-44 flex items-end justify-between px-2 gap-3 pt-4">
                {chartData.map((item) => {
                  const heightPct = maxDailyAmount === 0 ? 5 : Math.max(5, (item.sum / maxDailyAmount) * 100);
                  const isSelected = selectedDay === item.dateStr;
                  return (
                    <div key={item.dateStr} className="flex-1 h-full flex flex-col items-center justify-end gap-2 group cursor-pointer" onClick={() => setSelectedDay(isSelected ? null : item.dateStr)}>
                      <div 
                        className={`relative w-full rounded-lg transition-all flex items-end justify-center ${isSelected ? 'bg-emerald-500' : 'bg-indigo-100 dark:bg-indigo-950/60 group-hover:bg-emerald-400'}`}
                        style={{ height: `${heightPct}%` }}
                      >
                        <div className="absolute -top-8 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg">
                          ₹{item.sum.toLocaleString()}
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium ${isSelected ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>{item.dayName}</span>
                    </div>
                  );
                })}
              </div>

              {selectedDay && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-3">
                    Expenses for {chartData.find(d => d.dateStr === selectedDay)?.dateStr}
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {chartData.find(d => d.dateStr === selectedDay)?.expenses.length > 0 ? (
                      chartData.find(d => d.dateStr === selectedDay).expenses.map(e => (
                        <div key={e.id || e._id} className="flex justify-between items-center text-xs bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{e.title}</span>
                            <span className="text-[9px] text-slate-400">{e.category}</span>
                          </div>
                          <span className="font-bold text-slate-800 dark:text-white">₹{e.amount.toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 text-center py-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg">No expenses recorded for this day.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Comparison Badges (Placeholder math for now) */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">MONTH AVG / DAY</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">
                      ₹{Math.round(monthTotal / (new Date().getDate() || 1)).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">HIGHEST DAY</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">
                      ₹{maxDailyAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Recent Transactions & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Recent Transactions */}
            <div className="app-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  RECENT TRANSACTIONS
                </h3>
                <button onClick={() => setActiveTab('expenses')} className="text-xs text-emerald-600 font-bold hover:underline">
                  View All →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                      <th className="pb-3">Title/Category</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Payment</th>
                      <th className="pb-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {nonRentExpenses.slice(0, 5).map(e => (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3">
                          <p className="font-bold text-slate-800 dark:text-white">{e.title}</p>
                          <span className="text-[10px] text-slate-400">{e.category}</span>
                        </td>
                        <td className="py-3 text-slate-500">{e.date}</td>
                        <td className="py-3 text-slate-500">{e.payment_method || 'Cash'}</td>
                        <td className="py-3 text-right font-extrabold text-slate-800 dark:text-white">
                          ₹{e.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="app-card">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500" />
                <span>QUICK ACTIONS</span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={onOpenExpenseModal}
                  className="flex flex-col items-center justify-center p-5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl transition group min-h-[120px]"
                >
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-bold text-emerald-700">Add Expense</span>
                </button>

                <button
                  onClick={() => setActiveTab('budgets')}
                  className="flex flex-col items-center justify-center p-5 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-2xl transition group min-h-[120px]"
                >
                  <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-bold text-teal-700">Set Budget</span>
                </button>

                <button
                  onClick={() => setActiveTab('tasks')}
                  className="flex flex-col items-center justify-center p-5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-2xl transition group min-h-[120px]"
                >
                  <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform">
                    <CheckSquare className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-bold text-indigo-700">New Task</span>
                </button>

                <button
                  onClick={() => setActiveTab('reports')}
                  className="flex flex-col items-center justify-center p-5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-2xl transition group min-h-[120px]"
                >
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform">
                    <BarChart2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-bold text-purple-700">View Reports</span>
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* System Admin View */
        <div className="space-y-6">
          <div className="app-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <span>Platform Administration Overview</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time database metrics and registered platform accounts
                </p>
              </div>
              <button
                onClick={loadAdminData}
                disabled={adminLoading}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 font-bold uppercase">TOTAL USERS</span>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
                  {adminStats?.total_users ?? adminUsers.length} Accounts
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 font-bold uppercase">PLATFORM TRANSACTIONS</span>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
                  {adminStats?.total_expenses ?? '...'} Expenses
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 font-bold uppercase">TOTAL SPEND TRACKED</span>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {settings.currency}{(adminStats?.total_amount ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Registered Users Table Card */}
          <div className="app-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>REGISTERED USERS ({adminUsers.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  User accounts and names registered on the platform
                </p>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={adminUserSearch}
                  onChange={(e) => setAdminUserSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none w-full sm:w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                    <th className="pb-3">User Name</th>
                    <th className="pb-3">Email Address</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Account ID</th>
                    <th className="pb-3 text-right">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {adminUsers
                    .filter((u) => {
                      if (!adminUserSearch) return true;
                      const q = adminUserSearch.toLowerCase();
                      return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
                    })
                    .map((u) => {
                      const isMe = (u.email || '').toLowerCase() === (user?.email || '').toLowerCase();
                      const isUserAdmin = (u.email || '').toLowerCase() === 'keerthivasan.220722@gmail.com' || (u.email || '').toLowerCase() === 'a.keerthivasan7676@gmail.com';
                      return (
                        <tr key={u.id || u._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span>{u.name || 'Anonymous User'}</span>
                            {isMe && (
                              <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-extrabold uppercase">
                                You
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">{u.email}</td>
                          <td className="py-3">
                            {isUserAdmin ? (
                              <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full">
                                Super Admin
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium px-2 py-0.5 rounded-full">
                                User
                              </span>
                            )}
                          </td>
                          <td className="py-3 font-mono text-[10px] text-slate-400">{u.id || u._id}</td>
                          <td className="py-3 text-right text-slate-400">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Active'}
                          </td>
                        </tr>
                      );
                    })}
                  {adminUsers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400 italic">
                        {adminLoading ? 'Loading users from database...' : 'No users found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
