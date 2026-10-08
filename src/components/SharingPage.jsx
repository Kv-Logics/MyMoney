import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserPlus, Users, Eye } from 'lucide-react';

export default function SharingPage() {
  const { sharingList, setSharingList, showConfirm } = useApp();
  const [email, setEmail] = useState('');

  const handleShareAccess = (e) => {
    e.preventDefault();
    if (!email) return;
    setSharingList(prev => [...prev, { id: Date.now().toString(), shared_with_email: email }]);
    setEmail('');
  };

  const handleRevoke = async (id) => {
    const confirmed = await showConfirm(
      'Are you sure you want to revoke account access for this user?',
      'Revoke Access',
      'Revoke',
      true
    );
    if (!confirmed) return;
    setSharingList(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Card 1: Invite Form */}
      <div className="app-card space-y-4">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-emerald-500" />
          <span>INVITE FAMILY MEMBER / ROOMMATE</span>
        </h3>

        <form onSubmit={handleShareAccess} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">EMAIL ADDRESS</label>
            <input
              type="email"
              required
              placeholder="family@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">PERMISSION LEVEL</label>
            <select className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs">
              <option>View Only (Real time dashboard)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            Grant Shared Access
          </button>
        </form>
      </div>

      {/* Card 2: Active Viewers */}
      <div className="app-card space-y-4">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-500" />
          <span>ACTIVE VIEWERS</span>
        </h3>

        <div className="space-y-3">
          {sharingList.map((item) => (
            <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">{item.shared_with_email}</p>
                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold px-2 py-0.5 rounded">View-Only Access</span>
              </div>
              <button onClick={() => handleRevoke(item.id)} className="text-xs text-rose-500 hover:underline font-semibold">
                Revoke Access
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Card 3: Trackers Shared With Me */}
      <div className="app-card space-y-4">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Eye className="w-4 h-4 text-rose-500" />
          <span>TRACKERS SHARED WITH ME</span>
        </h3>

        <p className="text-xs text-slate-400 italic text-center py-6">
          No trackers shared with you
        </p>
      </div>
    </div>
  );
}
