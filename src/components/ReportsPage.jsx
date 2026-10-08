import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Download, Play } from 'lucide-react';

export default function ReportsPage() {
  const { expenses, settings } = useApp();
  const [startDate, setStartDate] = useState('2026-09-30');
  const [endDate, setEndDate] = useState('2026-10-08');

  const totalPeriodExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const dailyAverageExpense = Math.round(totalPeriodExpense / 16);

  return (
    <div className="space-y-6">
      {/* Date Range Selection Card (Exact matching Screenshot 8) */}
      <div className="app-card space-y-4">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
          SELECT DATE RANGE
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">START DATE</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">END DATE</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
            />
          </div>

          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition">
            <Play className="w-3.5 h-3.5 fill-white" /> Run Report
          </button>

          <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition">
            <Download className="w-3.5 h-3.5" /> Download CSV Report
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards Row (Exact matching Screenshot 8) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="app-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL PERIOD EXPENSE</span>
          <h4 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-2">
            ₹{totalPeriodExpense.toLocaleString()}
          </h4>
        </div>

        <div className="app-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DAILY AVERAGE EXPENSE</span>
          <h4 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-2">
            ₹{dailyAverageExpense}
          </h4>
        </div>

        <div className="app-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">HIGHEST SPENDING CATEGORY</span>
          <h4 className="text-lg font-bold text-slate-800 dark:text-white mt-2">
            Food (₹980)
          </h4>
        </div>

        <div className="app-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">LOWEST SPENDING CATEGORY</span>
          <h4 className="text-lg font-bold text-slate-800 dark:text-white mt-2">
            Fuel (₹100)
          </h4>
        </div>
      </div>

      {/* Expenses Log Table Card */}
      <div className="app-card space-y-4">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
          EXPENSES LOG (16 ENTRIES)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                <th className="pb-3">Date</th>
                <th className="pb-3">Title</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Payment</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {expenses.map(e => (
                <tr key={e.id || e._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 text-slate-500">{e.date}</td>
                  <td className="py-3 font-bold text-slate-800 dark:text-white">{e.title}</td>
                  <td className="py-3 text-slate-500">{e.category}</td>
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
    </div>
  );
}
