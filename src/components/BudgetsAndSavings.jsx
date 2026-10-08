import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE, fetchWithAuth } from '../api';
import { PieChart, Plus, Edit3, Target, PiggyBank, X } from 'lucide-react';

export default function BudgetsAndSavings() {
  const { budgets, setBudgets, savingsGoals, setSavingsGoals, categories, settings, showConfirm } = useApp();
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);

  const [category, setCategory] = useState('Overall');
  const [amount, setAmount] = useState('');

  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!amount) return;

    try {
      const res = await fetchWithAuth(`${API_BASE}/budgets`, {
        method: 'POST',
        body: JSON.stringify({ category, amount: parseFloat(amount) })
      });

      if (res.ok) {
        setIsBudgetModalOpen(false);
        const bRes = await fetchWithAuth(`${API_BASE}/budgets`);
        if (bRes.ok) setBudgets(await bRes.json());
      }
    } catch (err) {
      console.error('Error saving budget:', err);
    }
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!goalName || !targetAmount) return;

    try {
      const res = await fetchWithAuth(`${API_BASE}/savings`, {
        method: 'POST',
        body: JSON.stringify({ name: goalName, target_amount: parseFloat(targetAmount) })
      });

      if (res.ok) {
        setIsSavingsModalOpen(false);
        const sRes = await fetchWithAuth(`${API_BASE}/savings`);
        if (sRes.ok) setSavingsGoals(await sRes.json());
      }
    } catch (err) {
      console.error('Error saving savings goal:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Category Budgets */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                EXPENSE CATEGORY BUDGETS
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure and track monthly thresholds for your spending categories
            </p>
          </div>

          <button
            onClick={() => setIsBudgetModalOpen(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> Set Category Budget
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Overall Budget Card */}
          <div className="app-card space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-white">Overall Budget</h4>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">MONTHLY LIMIT</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-slate-800 dark:text-white">Not Set</span>
                <span className="text-[10px] text-slate-400 block">Spent: ₹1,480</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 italic pt-2">No budget limit set</p>
            <button onClick={() => setIsBudgetModalOpen(true)} className="text-xs text-emerald-600 font-bold hover:underline">
              Set Limit Now
            </button>
          </div>

          {/* Food Budget Card (Exact matching Screenshot 6) */}
          <div className="app-card space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-slate-800 dark:text-white">Food Budget</h4>
                <button onClick={() => setIsBudgetModalOpen(true)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-slate-800 dark:text-white">₹1,500</span>
                <span className="text-[10px] text-slate-400 block">Spent: ₹980</span>
              </div>
            </div>

            <span className="text-[10px] text-slate-400 font-semibold uppercase block">MONTHLY LIMIT</span>

            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full" style={{ width: '65%' }}></div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-slate-500">65% Limit Used</span>
              <span className="text-emerald-600">Within Budget</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Savings Goals */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                SAVINGS GOALS
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Create target milestones and track progress over time
            </p>
          </div>

          <button
            onClick={() => setIsSavingsModalOpen(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> Create Savings Goal
          </button>
        </div>

        {/* Empty state card matching Screenshot 6 */}
        <div className="app-card min-h-[140px] flex items-center justify-center text-center">
          <p className="text-xs text-slate-400 italic">No savings goals created</p>
        </div>
      </div>

      {/* Set Budget Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal max-w-md w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Set Category Budget</h3>
              <button onClick={() => setIsBudgetModalOpen(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs">
                  <option value="Overall">Overall Budget</option>
                  {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Monthly Limit (₹)</label>
                <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-xl">Save Budget</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
