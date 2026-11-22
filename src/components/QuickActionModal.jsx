import React from 'react';
import { Plus, TrendingUp, Gift, X, ArrowRight, Receipt, DollarSign } from 'lucide-react';

export default function QuickActionModal({ isOpen, onClose, onSelectAction }) {
  if (!isOpen) return null;

  const actions = [
    {
      id: 'expense',
      number: '1',
      title: 'Add Expense',
      description: 'Log purchase, food, travel, groceries or bill',
      icon: <DollarSign className="w-5 h-5 text-emerald-500" />,
      badge: 'Expense',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      borderHover: 'hover:border-emerald-500/50 hover:bg-emerald-500/5',
      accentColor: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'profit',
      number: '2',
      title: 'Record Profit',
      description: 'Track daily business profit & revenue earnings',
      icon: <TrendingUp className="w-5 h-5 text-amber-500" />,
      badge: 'Revenue',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      borderHover: 'hover:border-amber-500/50 hover:bg-amber-500/5',
      accentColor: 'from-amber-500 to-orange-500',
    },
    {
      id: 'pocket-money',
      number: '3',
      title: 'Pocket Money',
      description: 'Deposit allowance from parents into pocket money box',
      icon: <Gift className="w-5 h-5 text-indigo-500" />,
      badge: 'Allowance',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      borderHover: 'hover:border-indigo-500/50 hover:bg-indigo-500/5',
      accentColor: 'from-indigo-500 to-purple-600',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="glass-modal max-w-sm w-full rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl relative space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Quick Action</h3>
              <p className="text-[11px] text-slate-400">Choose an action to record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 pt-1">
          {actions.map((act) => (
            <button
              key={act.id}
              onClick={() => {
                onClose();
                onSelectAction(act.id);
              }}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 ${act.borderHover} transition-all duration-150 active:scale-[0.98] text-left group shadow-sm`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 font-extrabold text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                  {act.number}
                </span>
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-inner">
                  {act.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {act.title}
                    </h4>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${act.badgeColor}`}>
                      {act.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {act.description}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

