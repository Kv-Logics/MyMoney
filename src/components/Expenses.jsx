import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE, fetchWithAuth } from '../api';
import {
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  X,
  ScanLine,
  Download,
  Calendar,
  DollarSign
} from 'lucide-react';

export default function Expenses({ isModalOpen, setIsModalOpen }) {
  const {
    expenses,
    setExpenses,
    categories,
    paymentMethods,
    settings,
    showConfirm
  } = useApp();

  // Filter state
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedPay, setSelectedPay] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Modal Form state matching Screenshot
  const [editingId, setEditingId] = useState(null);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Food');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [date, setDate] = useState('2026-10-07');
  const [time, setTime] = useState('09:00 AM');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const clearFilters = () => {
    setSearch('');
    setSelectedCat('');
    setSelectedPay('');
    setSortBy('latest');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
  };

  const openNewExpenseModal = () => {
    setEditingId(null);
    setAmount('');
    setTitle('');
    setCategory(categories[0]?.name || 'Food');
    setPaymentMethod(paymentMethods[0] || 'Cash');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('09:00 AM');
    setLocation('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditExpenseModal = (item) => {
    setEditingId(item.id || item._id);
    setAmount(item.amount);
    setTitle(item.title);
    setCategory(item.category || 'Food');
    setPaymentMethod(item.payment_method || 'Cash');
    setDate(item.date || '2026-10-07');
    setTime(item.time || '09:00 AM');
    setLocation(item.location || '');
    setNotes(item.description || item.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!title || !amount) return;

    try {
      const payload = {
        title,
        amount: parseFloat(amount),
        category,
        payment_method: paymentMethod,
        date,
        time,
        location,
        description: notes
      };

      const url = editingId ? `${API_BASE}/expenses/${editingId}` : `${API_BASE}/expenses`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        const expRes = await fetchWithAuth(`${API_BASE}/expenses`);
        if (expRes.ok) setExpenses(await expRes.json());
      }
    } catch (err) {
      console.error('Error saving expense:', err);
    }
  };

  const handleDeleteExpense = async (id) => {
    const confirmed = await showConfirm(
      'Are you sure you want to delete this expense?',
      'Delete Expense',
      'Delete',
      true
    );
    if (!confirmed) return;

    try {
      const res = await fetchWithAuth(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setExpenses(prev => prev.filter(e => (e.id || e._id) !== id));
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const mSearch = !search || e.title.toLowerCase().includes(search.toLowerCase());
    const mCat = !selectedCat || e.category === selectedCat;
    const mPay = !selectedPay || e.payment_method === selectedPay;
    const mStart = !startDate || e.date >= startDate;
    const mEnd = !endDate || e.date <= endDate;
    const mMin = !minAmount || e.amount >= parseFloat(minAmount);
    const mMax = !maxAmount || e.amount <= parseFloat(maxAmount);
    return mSearch && mCat && mPay && mStart && mEnd && mMin && mMax;
  });

  const totalFilteredSum = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Search & Filters Collapsible Panel */}
      <div className="app-card space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsFilterOpen(!isFilterOpen)}>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              SEARCH & FILTERS
            </h3>
          </div>
          <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-slate-600 font-semibold">
            Clear Filters
          </button>
        </div>

        {isFilterOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SEARCH KEYWORDS</label>
              <input
                type="text"
                placeholder="Title, Notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CATEGORY</label>
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">PAYMENT METHOD</label>
              <select
                value={selectedPay}
                onChange={(e) => setSelectedPay(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Payments</option>
                {paymentMethods.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SORT BY</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="latest">Latest first</option>
                <option value="oldest">Oldest first</option>
                <option value="amount-high">Amount high to low</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">START DATE</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">END DATE</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">MIN AMOUNT</label>
              <input
                type="number"
                placeholder="Min"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">MAX AMOUNT</label>
              <input
                type="number"
                placeholder="Max"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table Card */}
      <div className="app-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>SHOWING {filteredExpenses.length} TRANSACTIONS</span>
            <span>TOTAL: ₹{totalFilteredSum.toLocaleString()}</span>
          </div>

          <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition">
            <Download className="w-3.5 h-3.5" /> CSV Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                <th className="pb-3">Title/Description</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Payment Method</th>
                <th className="pb-3">Date/Time</th>
                <th className="pb-3">Location</th>
                <th className="pb-3">Receipt</th>
                <th className="pb-3 text-right">Amount</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.map(item => (
                <tr key={item.id || item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3">
                    <p className="font-bold text-slate-800 dark:text-white">{item.title}</p>
                    {item.description && <p className="text-[10px] text-slate-400">{item.description}</p>}
                  </td>
                  <td className="py-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      item.category === 'Food' ? 'bg-rose-100 text-rose-600' :
                      item.category === 'Rent' ? 'bg-blue-100 text-blue-600' :
                      item.category === 'Fuel' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500">{item.payment_method || 'Cash'}</td>
                  <td className="py-3 text-slate-500">{item.date} {item.time || ''}</td>
                  <td className="py-3 text-slate-400">—</td>
                  <td className="py-3 text-slate-400">—</td>
                  <td className="py-3 text-right font-extrabold text-slate-800 dark:text-white">
                    ₹{item.amount.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditExpenseModal(item)} className="p-1 text-slate-400 hover:text-slate-700">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteExpense(item.id || item._id)} className="p-1 text-rose-400 hover:text-rose-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modify Expense Details Modal (Screenshot 5 Exact Replica) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal max-w-lg w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Modify Expense details</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scan Bill/Receipt Banner */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-center space-y-1">
              <ScanLine className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-white">Scan Bill / Receipt</h4>
              <p className="text-[10px] text-slate-500">Upload a photo to auto-fill details (Powered by AI)</p>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">AMOUNT</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">TITLE</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CATEGORY</label>
                  <div className="flex gap-1.5">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                    >
                      {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    <button type="button" className="px-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 font-bold">+</button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">PAYMENT METHOD</label>
                  <div className="flex gap-1.5">
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                    >
                      {paymentMethods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button type="button" className="px-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 font-bold">+</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">DATE</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">TIME</label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
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
                  placeholder="Description details"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">RECEIPT IMAGE</label>
                <input
                  type="file"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Confirm Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
