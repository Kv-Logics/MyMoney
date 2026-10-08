import React from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, HelpCircle } from 'lucide-react';

export default function ConfirmModal() {
  const { confirmState, handleConfirmClose } = useApp();

  if (!confirmState.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all">
      <div className="glass-modal max-w-md w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            confirmState.isDanger 
              ? 'bg-rose-100 text-rose-600 border border-rose-200' 
              : 'bg-emerald-100 text-emerald-600 border border-emerald-200'
          }`}>
            {confirmState.isDanger ? <Trash2 className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
          </div>
          <div className="space-y-1 pt-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">{confirmState.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{confirmState.message}</p>
          </div>
        </div>

        <div className="flex justify-end items-center gap-3 pt-2">
          <button
            onClick={() => handleConfirmClose(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={() => handleConfirmClose(true)}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition ${
              confirmState.isDanger
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
            }`}
          >
            {confirmState.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
