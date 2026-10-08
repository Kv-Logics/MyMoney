import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
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
  PieChart
} from 'lucide-react';

export default function Dashboard({ onOpenExpenseModal, onOpenProfitModal }) {
  const {
    expenses,
    budgets,
    dailyProfits,
    profitSummary,
    settings,
    setActiveTab
  } = useApp();

  const [dashboardView, setDashboardView] = useState('user'); // 'user' | 'admin'
  const [selectedDay, setSelectedDay] = useState(null);

  // Summary math
  const nonRentExpenses = expenses.filter(e => e.category !== 'Rent');
  const monthTotal = nonRentExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const todayTotal = 0;
  const rentExpense = expenses.find(e => e.category === 'Rent');
  const rentTotal = rentExpense ? rentExpense.amount : 0;

  const overallBudget = budgets.find(b => b.category === 'Overall');
  const budgetAmount = overallBudget ? overallBudget.amount : 1500;
  const remainingBudget = 520;

  // Category Breakdown Math
  const categoryTotals = {};
  nonRentExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const categoryBreakdown = Object.entries(categoryTotals).map(([cat, amt]) => ({
    name: cat,
    amount: amt,
    pct: Math.round((amt / (monthTotal || 1)) * 100),
    color: cat === 'Food' ? '#ef4444' : cat === 'Travel' ? '#10b981' : cat === 'Fuel' ? '#6366f1' : '#f59e0b'
  }));

  let currentAngle = 0;
  const dynamicCircles = categoryBreakdown.map(c => {
    const dashLength = (c.pct / 100) * 251.2;
    const circle = (
      <circle
        key={c.name}
        cx="50" cy="50" r="40"
        fill="transparent"
        stroke={c.color}
        strokeWidth="10"
        strokeDasharray={`${dashLength} 251.2`}
        strokeDashoffset="0"
        transform={`rotate(${currentAngle} 50 50)`}
        className="transition-all duration-1000 ease-out"
      />
    );
    currentAngle += (c.pct / 100) * 360;
    return circle;
  });

  // Daily Spending Trend Math (Last 7 Days)
  const chartData = [];
  let maxDailyAmount = 0;
  let weekTotal = 0;
  
  const pad = (n) => n.toString().padStart(2, '0');
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    
    const dayExpenses = nonRentExpenses.filter(e => e.date === dateStr);
    const sum = dayExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    
    if (sum > maxDailyAmount) maxDailyAmount = sum;
    weekTotal += sum;
    
    chartData.push({ dateStr, dayName, sum, expenses: dayExpenses });
  }

  return (
    <div className="space-y-6">
      {/* Dashboard View Toggle Tabs */}
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

      {dashboardView === 'user' ? (
        <>
          {/* Top 5 Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
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
                {settings.currency} {todayTotal}
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

            {/* Remaining Budget */}
            <div className="app-card">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">REMAINING BUDGET</span>
              <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-2">
                {settings.currency} {remainingBudget}
              </h3>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '65%' }}></div>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">65% used (₹980)</p>
            </div>

            {/* Today's Profit Card */}
            <div className="app-card border border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-500/5 via-transparent to-emerald-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">TODAY'S PROFIT</span>
                <span className="text-[9px] bg-amber-100 dark:bg-amber-950/40 border border-amber-300 text-amber-700 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full uppercase">
                  ISOLATED
                </span>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-2">
                {settings.currency} 0
              </h3>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  <span>No entry today</span>
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
                  <div className="absolute text-center">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">TOTAL SPENT</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-white">
                      ₹{monthTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 flex-1 max-w-[200px]">
                  {categoryBreakdown.map(c => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }}></div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{c.name}</span>
                      </div>
                      <span className="font-extrabold text-slate-800 dark:text-white">{c.pct}%</span>
                    </div>
                  ))}
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
                <button className="p-1 text-slate-400 hover:text-slate-800">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  This Week - 02/10 - 08/10
                </span>
                <button className="p-1 text-slate-400 hover:text-slate-800">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Bar graph */}
              <div className="h-44 flex items-end justify-between px-2 gap-3 pt-4">
                {chartData.map((item) => {
                  const heightPct = maxDailyAmount === 0 ? 5 : Math.max(5, (item.sum / maxDailyAmount) * 100);
                  const isSelected = selectedDay === item.dateStr;
                  return (
                    <div key={item.dateStr} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer" onClick={() => setSelectedDay(isSelected ? null : item.dateStr)}>
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

              {/* Comparison Badges */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">PREVIOUS WEEK</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">₹460</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-600 font-bold rounded-full">+176%</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">PREVIOUS MONTH</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">₹250</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-600 font-bold rounded-full">+492%</span>
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
                    {expenses.slice(0, 5).map(e => (
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
        <div className="app-card space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">System Admin Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-400 font-bold uppercase">TOTAL USERS</span>
              <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">12 Accounts</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-400 font-bold uppercase">PLATFORM TRANSACTIONS</span>
              <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">348 Expenses</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-400 font-bold uppercase">DATABASE STATUS</span>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">Connected (MongoDB)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
