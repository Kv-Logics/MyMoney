import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE, fetchWithAuth } from '../api';
import { X, ScanLine, Plus } from 'lucide-react';

export default function ExpenseModal({ isOpen, onClose, initialData = null }) {
  const { categories, paymentMethods, setExpenses } = useApp();

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Food');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00 AM');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (initialData) {
        setAmount(String(initialData.amount || ''));
        setTitle(initialData.title || '');
        setCategory(initialData.category || categories[0]?.name || 'Food');
        setPaymentMethod(initialData.payment_method || paymentMethods[0] || 'Cash');
        setDate(initialData.date || new Date().toISOString().split('T')[0]);
        setTime(initialData.time || '09:00 AM');
        setLocation(initialData.location || '');
        setNotes(initialData.notes || initialData.description || '');
      } else {
        setAmount('');
        setTitle('');
        setCategory(categories[0]?.name || 'Food');
        setPaymentMethod(paymentMethods[0] || 'Cash');
        setDate(new Date().toISOString().split('T')[0]);
        setTime('09:00 AM');
        setLocation('');
        setNotes('');
      }
    }
  }, [isOpen, initialData, categories, paymentMethods]);

  if (!isOpen) return null;

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!title || !amount || isNaN(parseFloat(amount))) {
      setError('Please provide a valid title and amount.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        title,
        amount: parseFloat(amount),
        category,
        payment_method: paymentMethod,
        date,
        time,
        location,
        description: notes,
        notes
      };

      const editingId = initialData?.id || initialData?._id;
      const url = editingId ? `${API_BASE}/expenses/${editingId}` : `${API_BASE}/expenses`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const expRes = await fetchWithAuth(`${API_BASE}/expenses`);
        if (expRes.ok) {
          setExpenses(await expRes.json());
        }
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'Failed to save expense. Please try again.');
      }
    } catch (err) {
      console.error('Error saving expense:', err);
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-lg w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {initialData ? 'Modify Expense details' : 'Add New Expense'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Bill/Receipt Banner */}
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-center space-y-1">
          <ScanLine className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-white">Scan Bill / Receipt</h4>
          <p className="text-[10px] text-slate-500">Log instantly or type details below</p>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSaveExpense} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">AMOUNT (₹)</label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">TITLE</label>
              <input
                type="text"
                required
                placeholder="e.g. Groceries, Coffee, Bus"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CATEGORY</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">PAYMENT METHOD</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {paymentMethods.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">DATE</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">TIME</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="09:00 AM"
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">LOCATION (OPTIONAL)</label>
            <input
              type="text"
              placeholder="Store or City"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">DESCRIPTION / NOTES</label>
            <input
              type="text"
              placeholder="e.g. Travel to college or snacks with friends"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Expense' : 'Confirm Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
