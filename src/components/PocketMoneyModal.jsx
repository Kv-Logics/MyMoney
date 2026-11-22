import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Gift, X, Check, Clock } from 'lucide-react';

export default function PocketMoneyModal({ isOpen, onClose }) {
  const { settings, fetchWithAuth, API_BASE, refreshPocketMoney, setBudgets } = useApp();
  const todayStr = new Date().toISOString().split('T')[0];

  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/pocket-money`, {
        method: 'POST',
        body: JSON.stringify({
          amount: parsedAmount,
          start_date: startDate || todayStr,
          note: note.trim() || 'Parent Allowance'
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to deposit pocket money');
      }

      if (refreshPocketMoney) await refreshPocketMoney();
      const bRes = await fetchWithAuth(`${API_BASE}/budgets`);
      if (bRes.ok && setBudgets) {
        setBudgets(await bRes.json());
      }

      setAmount('');
      setNote('');
      setStartDate(todayStr);
      onClose();
    } catch (err) {
      console.error('Pocket money deposit error:', err);
      setError(err.message || 'Error depositing pocket money');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="glass-modal max-w-sm w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Pocket Money</h3>
              <p className="text-[11px] text-slate-400">Add allowance deposit to your box</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              AMOUNT ({settings.currency})
            </label>
            <input
              type="number"
              step="any"
              required
              autoFocus
              placeholder="e.g. 2000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              UTILIZE FROM (START DATE)
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
              {startDate === todayStr ? (
                <span className="text-emerald-500 font-semibold">Active immediately today.</span>
              ) : startDate < todayStr ? (
                <span className="text-indigo-500 font-semibold">Deducts expenses since {startDate}.</span>
              ) : (
                <span className="text-amber-500 font-semibold">Scheduled for {startDate}.</span>
              )}
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              NOTE / SOURCE
            </label>
            <input
              type="text"
              placeholder="e.g. From Dad, Mom, Birthday gift"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span>Depositing...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Deposit Box</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

