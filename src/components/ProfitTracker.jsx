import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE, fetchWithAuth } from '../api';
import {
  TrendingUp,
  Plus,
  Calendar,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function ProfitTracker({ onOpenProfitModal }) {
  const {
    dailyProfits,
    setDailyProfits,
    profitSummary,
    setProfitSummary,
    settings,
    showConfirm
  } = useApp();

  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, -1 = prev month
  const [showAllTime, setShowAllTime] = useState(false);

  // Calculate target month for filtering
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const targetDate = new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
  const targetMonthStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}`;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const targetMonthName = monthNames[targetDate.getMonth()];
  const monthLabel = monthOffset === 0
    ? `This Month (${targetMonthName} ${targetDate.getFullYear()})`
    : `${targetMonthName} ${targetDate.getFullYear()}`;

  // Filter profits for display
  const filteredProfits = showAllTime
    ? [...dailyProfits].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    : [...dailyProfits]
        .filter(p => p.date && p.date.startsWith(targetMonthStr))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Calculate dynamic metrics for the displayed period
  const amounts = filteredProfits.map(p => Number(p.amount) || 0);
  const totalProfit = amounts.reduce((sum, a) => sum + a, 0);
  const profitableDays = amounts.filter(a => a > 0).length;
  const lossDays = amounts.filter(a => a < 0).length;
  const avgProfit = profitableDays > 0 ? Math.round(amounts.filter(a => a > 0).reduce((sum, a) => sum + a, 0) / profitableDays) : 0;

  const handleDeleteProfit = async (id, date) => {
    const confirmed = await showConfirm(
      `Are you sure you want to delete the daily profit record for ${date}?`,
      'Delete Profit Record',
      'Delete',
      true
    );
    if (!confirmed) return;

    try {
      const res = await fetchWithAuth(`${API_BASE}/profit/${id || date}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setDailyProfits(prev => prev.filter(p => (p.id || p._id) !== id && p.date !== date));
        const profSumRes = await fetchWithAuth(`${API_BASE}/profit/summary`);
        if (profSumRes.ok) setProfitSummary(await profSumRes.json());
      }
    } catch (err) {
      console.error('Error deleting daily profit record:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="app-card border border-amber-200 dark:border-amber-800/40 bg-gradient-to-r from-amber-50 via-white to-emerald-50 dark:from-amber-950/20 dark:to-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">Isolated Daily Profit Tracker</h3>
            <span className="text-[9px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full uppercase">
              Dedicated Module
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Keep your business revenue & daily profit logs completely separate from your expense budgets.
          </p>
        </div>
        <button
          onClick={() => onOpenProfitModal && onOpenProfitModal()}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 shrink-0 transition"
        >
          <Plus className="w-4 h-4" /> Record Today's Profit
        </button>
      </div>

      {/* Period Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl gap-2">
            <button
              type="button"
              disabled={showAllTime}
              onClick={() => setMonthOffset(prev => prev - 1)}
              className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white transition rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous month"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 min-w-[150px] text-center">
              {showAllTime ? 'All Time History' : monthLabel}
            </span>
            <button
              type="button"
              disabled={showAllTime || monthOffset >= 0}
              onClick={() => setMonthOffset(prev => Math.min(0, prev + 1))}
              className={`p-1 transition rounded-lg ${
                showAllTime || monthOffset >= 0
                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                  : 'text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
              title={monthOffset >= 0 ? 'Current month' : 'Next month'}
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!showAllTime && monthOffset !== 0 && (
            <button
              type="button"
              onClick={() => setMonthOffset(0)}
              className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline px-2"
            >
              Reset to Current
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowAllTime(false)}
            className={`px-3 py-1 font-bold rounded-lg transition ${
              !showAllTime
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setShowAllTime(true)}
            className={`px-3 py-1 font-bold rounded-lg transition ${
              showAllTime
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            All History ({dailyProfits.length})
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="app-card border border-amber-100">
          <span className="text-xs font-semibold uppercase text-slate-400">
            {showAllTime ? 'Total Profit (All Time)' : `Total Profit (${targetMonthName})`}
          </span>
          <h4 className={`text-2xl font-extrabold mt-2 ${totalProfit >= 0 ? 'text-slate-800 dark:text-white' : 'text-rose-500'}`}>
            {settings.currency} {totalProfit.toLocaleString()}
          </h4>
        </div>

        <div className="app-card border border-emerald-100">
          <span className="text-xs font-semibold uppercase text-emerald-600">Profitable Days</span>
          <h4 className="text-2xl font-extrabold text-emerald-600 mt-2">
            {profitableDays} Days
          </h4>
        </div>

        <div className="app-card border border-rose-100">
          <span className="text-xs font-semibold uppercase text-rose-500">Loss Days</span>
          <h4 className="text-2xl font-extrabold text-rose-500 mt-2">
            {lossDays} Days
          </h4>
        </div>

        <div className="app-card border border-indigo-100">
          <span className="text-xs font-semibold uppercase text-slate-400">Average Profit / Day</span>
          <h4 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-2">
            {settings.currency} {avgProfit.toLocaleString()}
          </h4>
        </div>
      </div>

      {/* History Table */}
      <div className="app-card space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span>Daily Profit History</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
              {filteredProfits.length} {filteredProfits.length === 1 ? 'record' : 'records'}
            </span>
          </h4>
          <span className="text-xs font-bold text-slate-400">
            {showAllTime ? 'Viewing All Time' : monthLabel}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                <th className="pb-3">Date</th>
                <th className="pb-3">Note / Description</th>
                <th className="pb-3 text-right">Profit Amount</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProfits.map((item) => (
                <tr key={item.id || item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    {item.date}
                  </td>
                  <td className="py-3 text-slate-500">{item.note || '—'}</td>
                  <td className={`py-3 text-right font-extrabold ${
                    item.amount > 0 ? 'text-emerald-600' : item.amount < 0 ? 'text-rose-500' : 'text-slate-500'
                  }`}>
                    {item.amount > 0 ? '+' : ''}{settings.currency} {Number(item.amount).toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onOpenProfitModal && onOpenProfitModal(item)} className="p-1 text-slate-400 hover:text-slate-700">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteProfit(item.id || item._id, item.date)} className="p-1 text-rose-400 hover:text-rose-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProfits.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400 italic">
                    {dailyProfits.length > 0 ? (
                      <div className="space-y-2">
                        <p>No daily profit records logged for {monthLabel}.</p>
                        <p className="text-xs text-slate-500 not-italic">
                          You have {dailyProfits.length} record(s) logged in other months.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowAllTime(true)}
                          className="px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs rounded-xl hover:bg-amber-500/20 transition not-italic"
                        >
                          View All Time History
                        </button>
                      </div>
                    ) : (
                      "No daily profit records logged yet. Click '+ Record Today's Profit' above to start tracking!"
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
