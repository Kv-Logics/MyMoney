import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE, fetchWithAuth } from '../api';
import { Download, Play, RefreshCw, FileText, Calendar, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  const { settings, expenses: allExpenses } = useApp();

  const getDefaultDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);
    return { firstDay, today };
  };

  const { firstDay: initialStart, today: initialEnd } = getDefaultDates();
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const runReport = async (start = startDate, end = endDate) => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/reports?start_date=${start}&end_date=${end}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        // Fallback to client-side filtering if backend returns non-200
        calculateLocalReport(start, end);
      }
    } catch (err) {
      console.warn('API report call error, using local computation:', err);
      calculateLocalReport(start, end);
    } finally {
      setLoading(false);
    }
  };

  const calculateLocalReport = (start, end) => {
    const filtered = allExpenses.filter(e => e.date && e.date >= start && e.date <= end && (e.category || '').toLowerCase() !== 'rent');
    const total = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);
    const count = filtered.length;
    
    // Calculate days between start and end inclusive
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffDays = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
    const avg = count > 0 ? Math.round(total / diffDays) : 0;

    const catTotals = {};
    filtered.forEach(e => {
      const c = e.category || 'Other';
      catTotals[c] = (catTotals[c] || 0) + (e.amount || 0);
    });

    const highestCat = Object.keys(catTotals).length > 0 ? Object.keys(catTotals).reduce((a, b) => catTotals[a] > catTotals[b] ? a : b) : 'None';
    const lowestCat = Object.keys(catTotals).length > 0 ? Object.keys(catTotals).reduce((a, b) => catTotals[a] < catTotals[b] ? a : b) : 'None';

    setReportData({
      start_date: start,
      end_date: end,
      total_expense: total,
      average_expense: avg,
      transaction_count: count,
      highest_spending_category: highestCat,
      highest_spending_category_amount: catTotals[highestCat] || 0,
      lowest_spending_category: lowestCat,
      lowest_spending_category_amount: catTotals[lowestCat] || 0,
      expenses: filtered
    });
  };

  useEffect(() => {
    runReport(initialStart, initialEnd);
  }, [allExpenses]);

  const handleDownloadCsv = async () => {
    setDownloading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/reports/export?format=csv&start_date=${startDate}&end_date=${endDate}`);
      let csvText = '';
      let filename = `expenses_${startDate}_to_${endDate}.csv`;

      if (res.ok) {
        const data = await res.json();
        csvText = data.content || '';
        if (data.filename) filename = data.filename;
      }

      // Fallback client-side generation if content is empty
      if (!csvText) {
        const rows = (reportData?.expenses || allExpenses.filter(e => e.date >= startDate && e.date <= endDate)).map(e => {
          const desc = (e.description || '').replace(/"/g, '""');
          return `"${e.date}","${(e.title || '').replace(/"/g, '""')}","${e.category || ''}","${e.payment_method || 'Cash'}",${e.amount},"${desc}"`;
        });
        csvText = "Date,Title,Category,Payment Method,Amount,Description\n" + rows.join("\n");
      }

      // Trigger browser download via Blob
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading CSV:', err);
    } finally {
      setDownloading(false);
    }
  };

  const reportExpenses = reportData?.expenses || [];
  const totalExpense = reportData?.total_expense ?? 0;
  const avgExpense = reportData?.average_expense ?? 0;
  const highestCat = reportData?.highest_spending_category || 'None';
  const highestAmount = reportData?.highest_spending_category_amount || 0;
  const lowestCat = reportData?.lowest_spending_category || 'None';
  const lowestAmount = reportData?.lowest_spending_category_amount || 0;

  return (
    <div className="space-y-6">
      {/* Date Range Selection Card */}
      <div className="app-card space-y-4">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-500" />
          <span>SELECT DATE RANGE</span>
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

          <button
            onClick={() => runReport(startDate, endDate)}
            disabled={loading}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            <span>Run Report</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={downloading}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition"
          >
            {downloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>Download CSV Report</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="app-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL PERIOD EXPENSE</span>
          <h4 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-2">
            {settings.currency}{totalExpense.toLocaleString()}
          </h4>
        </div>

        <div className="app-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DAILY AVERAGE EXPENSE</span>
          <h4 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-2">
            {settings.currency}{avgExpense.toLocaleString()}
          </h4>
        </div>

        <div className="app-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">HIGHEST SPENDING CATEGORY</span>
          <h4 className="text-lg font-bold text-slate-800 dark:text-white mt-2">
            {highestCat} ({settings.currency}{highestAmount.toLocaleString()})
          </h4>
        </div>

        <div className="app-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">LOWEST SPENDING CATEGORY</span>
          <h4 className="text-lg font-bold text-slate-800 dark:text-white mt-2">
            {lowestCat} ({settings.currency}{lowestAmount.toLocaleString()})
          </h4>
        </div>
      </div>

      {/* Expenses Log Table Card */}
      <div className="app-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>EXPENSES LOG ({reportExpenses.length} ENTRIES)</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-semibold">
            {startDate} to {endDate}
          </span>
        </div>

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
              {reportExpenses.length > 0 ? (
                reportExpenses.map(e => (
                  <tr key={e.id || e._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 text-slate-500">{e.date}</td>
                    <td className="py-3 font-bold text-slate-800 dark:text-white">{e.title}</td>
                    <td className="py-3 text-slate-500">{e.category}</td>
                    <td className="py-3 text-slate-500">{e.payment_method || 'Cash'}</td>
                    <td className="py-3 text-right font-extrabold text-slate-800 dark:text-white">
                      {settings.currency}{(e.amount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400 italic">
                    No expense records found for this date range.
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
