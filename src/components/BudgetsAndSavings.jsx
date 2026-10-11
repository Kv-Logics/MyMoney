import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE, fetchWithAuth } from '../api';
import { PieChart, Plus, Edit3, Target, PiggyBank, X, Trash2, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export default function BudgetsAndSavings() {
  const { budgets, setBudgets, savingsGoals, setSavingsGoals, categories, expenses, settings, showConfirm } = useApp();
  
  // Budget Modal State
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState('Overall');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [editingBudgetId, setEditingBudgetId] = useState(null);

  // Savings Modal State
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialSaved, setInitialSaved] = useState('0');

  // Add Contribution Modal State
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');

  // Calculate real current month spending
  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const currentMonthExpenses = expenses.filter(e => e.date && e.date.startsWith(currentMonth));
  const totalMonthSpent = currentMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const getCategorySpent = (cat) => {
    if (cat === 'Overall') return totalMonthSpent;
    return currentMonthExpenses
      .filter(e => e.category && e.category.toLowerCase() === cat.toLowerCase())
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  };

  const overallBudget = budgets.find(b => b.category === 'Overall');
  const categoryBudgets = budgets.filter(b => b.category !== 'Overall');

  // Budget Handlers
  const handleOpenBudgetModal = (existing = null) => {
    if (existing) {
      setEditingBudgetId(existing.id || existing._id);
      setBudgetCategory(existing.category);
      setBudgetAmount(String(existing.amount));
    } else {
      setEditingBudgetId(null);
      setBudgetCategory('Overall');
      setBudgetAmount('');
    }
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!budgetAmount || isNaN(parseFloat(budgetAmount))) return;

    try {
      const res = await fetchWithAuth(`${API_BASE}/budgets`, {
        method: 'POST',
        body: JSON.stringify({ category: budgetCategory, amount: parseFloat(budgetAmount) })
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

  const handleDeleteBudget = async (b) => {
    const confirmed = await showConfirm(
      `Are you sure you want to delete the ${b.category} budget limit?`,
      'Delete Budget',
      'Delete',
      true
    );
    if (!confirmed) return;

    try {
      const id = b.id || b._id;
      const res = await fetchWithAuth(`${API_BASE}/budgets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBudgets(prev => prev.filter(item => (item.id || item._id) !== id && item.category !== b.category));
      }
    } catch (err) {
      console.error('Error deleting budget:', err);
    }
  };

  // Savings Handlers
  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!goalTitle || !targetAmount) return;

    try {
      const res = await fetchWithAuth(`${API_BASE}/savings`, {
        method: 'POST',
        body: JSON.stringify({
          title: goalTitle,
          target_amount: parseFloat(targetAmount),
          saved_amount: parseFloat(initialSaved || 0)
        })
      });

      if (res.ok) {
        setIsSavingsModalOpen(false);
        setGoalTitle('');
        setTargetAmount('');
        setInitialSaved('0');
        const sRes = await fetchWithAuth(`${API_BASE}/savings`);
        if (sRes.ok) setSavingsGoals(await sRes.json());
      }
    } catch (err) {
      console.error('Error saving goal:', err);
    }
  };

  const handleAddContribution = async (e) => {
    e.preventDefault();
    if (!selectedGoal || !contributeAmount || isNaN(parseFloat(contributeAmount))) return;

    const newSaved = (selectedGoal.saved_amount || 0) + parseFloat(contributeAmount);
    const goalId = selectedGoal.id || selectedGoal._id;

    try {
      const res = await fetchWithAuth(`${API_BASE}/savings/${goalId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: selectedGoal.title,
          target_amount: selectedGoal.target_amount,
          saved_amount: newSaved
        })
      });

      if (res.ok) {
        setIsContributeModalOpen(false);
        setSelectedGoal(null);
        setContributeAmount('');
        const sRes = await fetchWithAuth(`${API_BASE}/savings`);
        if (sRes.ok) setSavingsGoals(await sRes.json());
      }
    } catch (err) {
      console.error('Error contributing to goal:', err);
    }
  };

  const handleDeleteGoal = async (g) => {
    const confirmed = await showConfirm(
      `Are you sure you want to delete the "${g.title}" savings goal?`,
      'Delete Savings Goal',
      'Delete',
      true
    );
    if (!confirmed) return;

    try {
      const id = g.id || g._id;
      const res = await fetchWithAuth(`${API_BASE}/savings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSavingsGoals(prev => prev.filter(item => (item.id || item._id) !== id));
      }
    } catch (err) {
      console.error('Error deleting goal:', err);
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
              Configure and track real-time monthly limits for your expenses
            </p>
          </div>

          <button
            onClick={() => handleOpenBudgetModal(null)}
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
                <span className="text-sm font-extrabold text-slate-800 dark:text-white">
                  {overallBudget ? `${settings.currency}${overallBudget.amount.toLocaleString()}` : 'Not Set'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Spent: {settings.currency}{totalMonthSpent.toLocaleString()}
                </span>
              </div>
            </div>

            {overallBudget ? (
              <>
                {(() => {
                  const pct = Math.min(100, Math.round((totalMonthSpent / overallBudget.amount) * 100));
                  const isOver = totalMonthSpent > overallBudget.amount;
                  return (
                    <>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOver ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className={isOver ? 'text-rose-500' : 'text-slate-500'}>{pct}% Limit Used</span>
                        <div className="flex items-center gap-2">
                          <span className={isOver ? 'text-rose-600 font-extrabold' : 'text-emerald-600'}>
                            {isOver ? `Over by ${settings.currency}${(totalMonthSpent - overallBudget.amount).toLocaleString()}` : 'Within Budget'}
                          </span>
                          <button
                            onClick={() => handleOpenBudgetModal(overallBudget)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBudget(overallBudget)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                <p className="text-xs text-slate-400 italic pt-2">No overall budget limit configured</p>
                <button
                  onClick={() => {
                    setEditingBudgetId(null);
                    setBudgetCategory('Overall');
                    setBudgetAmount('');
                    setIsBudgetModalOpen(true);
                  }}
                  className="text-xs text-emerald-600 font-bold hover:underline"
                >
                  Set Overall Limit Now
                </button>
              </>
            )}
          </div>

          {/* Dynamic Category Budget Cards */}
          {categoryBudgets.map((b) => {
            const spent = getCategorySpent(b.category);
            const pct = Math.min(100, Math.round((spent / b.amount) * 100));
            const isOver = spent > b.amount;

            return (
              <div key={b.id || b._id} className="app-card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-800 dark:text-white">{b.category} Budget</h4>
                    <button
                      onClick={() => handleOpenBudgetModal(b)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(b)}
                      className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-slate-400 hover:text-rose-500"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-slate-800 dark:text-white">
                      {settings.currency}{b.amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Spent: {settings.currency}{spent.toLocaleString()}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-slate-400 font-semibold uppercase block">MONTHLY LIMIT</span>

                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className={isOver ? 'text-rose-500' : 'text-slate-500'}>{pct}% Limit Used</span>
                  <span className={isOver ? 'text-rose-600 font-extrabold' : 'text-emerald-600'}>
                    {isOver ? `Over by ${settings.currency}${(spent - b.amount).toLocaleString()}` : 'Within Budget'}
                  </span>
                </div>
              </div>
            );
          })}

          {categoryBudgets.length === 0 && (
            <div className="app-card border-dashed border-2 border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-2">
              <Target className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No Category Limits Set</p>
              <p className="text-[10px] text-slate-400">Set limits on Food, Travel, Rent or Fuel to avoid overspending.</p>
              <button
                onClick={() => handleOpenBudgetModal(null)}
                className="mt-2 text-xs text-emerald-600 font-bold hover:underline"
              >
                + Add Category Budget
              </button>
            </div>
          )}
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

        {savingsGoals && savingsGoals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {savingsGoals.map((g) => {
              const saved = g.saved_amount || 0;
              const target = g.target_amount || 1;
              const pct = Math.min(100, Math.round((saved / target) * 100));
              const isCompleted = saved >= target;

              return (
                <div key={g.id || g._id} className="app-card space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        {g.title}
                        {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">TARGET MILESTONE</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedGoal(g);
                          setContributeAmount('');
                          setIsContributeModalOpen(true);
                        }}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition"
                        title="Add Contribution"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(g)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-black text-slate-800 dark:text-white">
                      {settings.currency}{saved.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      Goal: {settings.currency}{target.toLocaleString()}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-500">{pct}% Achieved</span>
                    <button
                      onClick={() => {
                        setSelectedGoal(g);
                        setContributeAmount('');
                        setIsContributeModalOpen(true);
                      }}
                      className="text-emerald-600 hover:underline"
                    >
                      + Add Funds
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="app-card min-h-[140px] flex flex-col items-center justify-center text-center space-y-2">
            <PiggyBank className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            <p className="text-xs text-slate-400 italic">No savings goals created yet</p>
            <button
              onClick={() => setIsSavingsModalOpen(true)}
              className="text-xs text-emerald-600 font-bold hover:underline"
            >
              + Create First Savings Goal
            </button>
          </div>
        )}
      </div>

      {/* Set Budget Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal max-w-md w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {editingBudgetId ? 'Edit Budget Limit' : 'Set Category Budget'}
              </h3>
              <button onClick={() => setIsBudgetModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Category</label>
                <select
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                  disabled={!!editingBudgetId}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                >
                  <option value="Overall">Overall Budget</option>
                  {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Monthly Limit ({settings.currency})</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 5000"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition shadow-md">
                Save Budget Limit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Savings Goal Modal */}
      {isSavingsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal max-w-md w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">New Savings Goal</h3>
              <button onClick={() => setIsSavingsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vacation Trip, Emergency Fund"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Target Amount ({settings.currency})</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 50000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Initial Saved Amount ({settings.currency})</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={initialSaved}
                  onChange={(e) => setInitialSaved(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition shadow-md">
                Create Savings Goal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Contribution Modal */}
      {isContributeModalOpen && selectedGoal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal max-w-sm w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Add Contribution</h3>
              <button onClick={() => setIsContributeModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Contribute to <span className="font-bold text-slate-700 dark:text-slate-300">{selectedGoal.title}</span> (Target: {settings.currency}{selectedGoal.target_amount.toLocaleString()})
            </p>
            <form onSubmit={handleAddContribution} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Contribution Amount ({settings.currency})</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 1000"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition shadow-md">
                Save Contribution
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
