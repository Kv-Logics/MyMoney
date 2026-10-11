import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE, fetchWithAuth } from '../api';
import { TrendingUp, X, Check, DollarSign } from 'lucide-react';

export default function ProfitModal({ isOpen, onClose, initialData = null }) {
  const { setDailyProfits, setProfitSummary, settings } = useApp();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccess(false);
      if (initialData) {
        setDate(initialData.date || new Date().toISOString().split('T')[0]);
        setAmount(initialData.amount !== undefined ? String(initialData.amount) : '');
        setNote(initialData.note || '');
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setAmount('');
        setNote('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount)) {
      setError('Please enter a valid profit amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        date,
        amount: parseFloat(amount),
        note: note.trim()
      };

      const res = await fetchWithAuth(`${API_BASE}/profit`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to save daily profit');
      }

      setSuccess(true);

      // Refresh profits and summary in context
      const [profRes, profSumRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/profit`),
        fetchWithAuth(`${API_BASE}/profit/summary`)
      ]);

      if (profRes.ok) {
        const profData = await profRes.json();
        setDailyProfits(profData.records || profData || []);
      }

      if (profSumRes.ok) {
        const sumData = await profSumRes.json();
        setProfitSummary(sumData);
      }

      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error saving profit:', err);
      setError(err.message || 'Failed to record daily profit. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="glass-modal max-w-md w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 bg-white dark:bg-slate-900 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {initialData ? 'Edit Daily Profit Entry' : "Record Today's Profit"}
              </h3>
              <p className="text-[11px] text-slate-400">Track isolated revenue without mixing expenses</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            Profit record saved successfully!
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              Profit Amount ({settings?.currency || '₹'})
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 pl-8 font-semibold"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">
                {settings?.currency || '₹'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              Notes / Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Shop sales, freelance payout, side business"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-1/3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{initialData ? 'Update Record' : 'Record Profit'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
