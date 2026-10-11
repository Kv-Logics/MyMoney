import React from 'react';
import { useApp } from '../context/AppContext';
import { Activity } from 'lucide-react';

export default function AuditLogPage() {
  const { auditLogs } = useApp();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="app-card">
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          FAMILY AUDIT LOG
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Logs creations, edits, and deletions for tracking transparency across the family group.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3 w-40">Date & Time</th>
                <th className="pb-3 w-32">User</th>
                <th className="pb-3 w-40">Action</th>
                <th className="pb-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.map((log) => {
                const d = new Date(log.created_at || log.date || Date.now());
                const dateStr = d.toLocaleDateString();
                const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{dateStr}</span>
                      <span className="text-[10px] text-slate-400 block">{timeStr}</span>
                    </td>
                    <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">
                      {log.user_name || 'kv'}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded border text-[10px] font-bold uppercase ${
                        log.action?.includes('CREATE') ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200' :
                        log.action?.includes('UPDATE') ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200' :
                        log.action?.includes('DELETE') ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200' :
                        'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">
                      {log.details || log.text}
                    </td>
                  </tr>
                );
              })}
              {(!auditLogs || auditLogs.length === 0) && (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-400 font-semibold">No audit logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
