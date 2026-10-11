import React from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE, fetchWithAuth } from '../api';
import {
  TrendingUp,
  Plus,
  Calendar,
  Edit,
  Trash2
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="app-card border border-amber-100">
          <span className="text-xs font-semibold uppercase text-slate-400">Total Profit (Month)</span>
          <h4 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-2">
            {settings.currency} {(profitSummary?.total_profit || 0).toLocaleString()}
          </h4>
        </div>

        <div className="app-card border border-emerald-100">
          <span className="text-xs font-semibold uppercase text-emerald-600">Profitable Days</span>
          <h4 className="text-2xl font-extrabold text-emerald-600 mt-2">
            {profitSummary?.profitable_days || 0} Days
          </h4>
        </div>

        <div className="app-card border border-rose-100">
          <span className="text-xs font-semibold uppercase text-rose-500">Loss Days</span>
          <h4 className="text-2xl font-extrabold text-rose-500 mt-2">
            {profitSummary?.loss_days || 0} Days
          </h4>
        </div>

        <div className="app-card border border-indigo-100">
          <span className="text-xs font-semibold uppercase text-slate-400">Average Profit / Day</span>
          <h4 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-2">
            {settings.currency} {Math.round(profitSummary?.average_daily_profit || 0).toLocaleString()}
          </h4>
        </div>
      </div>

      {/* History Table */}
      <div className="app-card space-y-4">
        <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-500" />
          Daily Profit History
        </h4>

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
              {dailyProfits.map((item) => (
                <tr key={item.id || item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    {item.date}
                  </td>
                  <td className="py-3 text-slate-500">{item.note || '—'}</td>
                  <td className={`py-3 text-right font-extrabold ${
                    item.amount > 0 ? 'text-emerald-600' : item.amount < 0 ? 'text-rose-500' : 'text-slate-500'
                  }`}>
                    {item.amount > 0 ? '+' : ''}{settings.currency} {item.amount.toLocaleString()}
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
              {dailyProfits.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400 italic">
                    No daily profit records logged yet. Click "+ Record Today's Profit" above to start tracking!
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
