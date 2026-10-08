import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Key, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user, settings, setSettings } = useApp();
  const [userEmail, setUserEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  return (
    <div className="app-card max-w-xl space-y-6">
      <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
        CONFIGURATION SETTINGS
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CURRENCY SYMBOL</label>
          <select
            value={settings.currency}
            onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none"
          >
            <option value="₹">Indian Rupee (₹)</option>
            <option value="$">US Dollar ($)</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">DEFAULT TIME ZONE</label>
          <select className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none">
            <option>UTC (Universal Time)</option>
          </select>
        </div>
      </div>

      {user?.email === 'keerthivasan.220722@gmail.com' && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> ADMIN USER MANAGEMENT
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Set or override passwords for existing or new users.</p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">USER EMAIL</label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SET PASSWORD</label>
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition"
            >
              <Key className="w-4 h-4" /> Upsert Password
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
