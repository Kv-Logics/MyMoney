import React from 'react';
import { useApp } from '../context/AppContext';

export default function AuditLogPage() {
  const { auditLogs } = useApp();

  return (
    <div className="app-card max-w-4xl space-y-6">
      <div>
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
          FAMILY AUDIT LOG
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Logs creations, edits, and deletions for tracking transparency
        </p>
      </div>

      <div className="space-y-6 pl-4 border-l-2 border-emerald-500/30">
        {auditLogs.map((log) => (
          <div key={log.id} className="relative space-y-1">
            <div className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-white absolute -left-[23px] top-1"></div>
            <p className="text-xs font-bold text-slate-800 dark:text-white">
              kv <span className="text-slate-500 font-semibold">({log.action})</span>
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">{log.text}</p>
            <span className="text-[10px] text-slate-400 block">{log.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
