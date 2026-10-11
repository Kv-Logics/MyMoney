import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE, fetchWithAuth } from '../api';
import { UserPlus, Users, Eye, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

export default function SharingPage() {
  const { 
    sharingList, setSharingList, 
    sharedByList, setSharedByList, 
    activeOwner, setActiveOwner, 
    setActiveTab, 
    showConfirm 
  } = useApp();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }

  const reloadSharingData = async () => {
    try {
      const [withRes, byRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/sharing/shared-with`),
        fetchWithAuth(`${API_BASE}/sharing/shared-by`)
      ]);
      if (withRes.ok) {
        const data = await withRes.json();
        setSharingList(Array.isArray(data) ? data : []);
      }
      if (byRes.ok) {
        const data = await byRes.json();
        setSharedByList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error refreshing sharing lists:', err);
    }
  };

  useEffect(() => {
    reloadSharingData();
  }, []);

  const handleShareAccess = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetchWithAuth(`${API_BASE}/sharing/invite`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), permission: 'view' })
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: data.message || `Shared access granted to ${email}` });
        setEmail('');
        await reloadSharingData();
      } else {
        setStatus({ type: 'error', message: data.detail || 'Failed to share access. Check the email address.' });
      }
    } catch (err) {
      console.error('Error inviting user:', err);
      setStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (item) => {
    const id = item._id || item.id;
    const confirmed = await showConfirm(
      `Are you sure you want to revoke account access for ${item.shared_with_email}?`,
      'Revoke Access',
      'Revoke',
      true
    );
    if (!confirmed) return;

    try {
      const res = await fetchWithAuth(`${API_BASE}/sharing/revoke/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSharingList(prev => prev.filter(v => (v._id || v.id) !== id));
        setStatus({ type: 'success', message: `Revoked access for ${item.shared_with_email}` });
      } else {
        const data = await res.json();
        setStatus({ type: 'error', message: data.detail || 'Failed to revoke access' });
      }
    } catch (err) {
      console.error('Error revoking access:', err);
      setStatus({ type: 'error', message: 'Failed to revoke access.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner if viewing another user's tracker */}
      {activeOwner && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                Currently Viewing Shared Tracker: <span className="underline">{activeOwner}</span>
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                You have real-time view-only access to this user's expenses.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveOwner(null);
              setActiveTab('expenses');
            }}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            Switch to My Tracker
          </button>
        </div>
      )}

      {/* Global Status Message */}
      {status && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
            status.type === 'success'
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{status.message}</span>
        </div>
      )}

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
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">PERMISSION LEVEL</label>
              <select className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none">
                <option value="view">View Only (Real time dashboard)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sharing...</span>
                </>
              ) : (
                <span>Grant Shared Access</span>
              )}
            </button>
          </form>
        </div>

        {/* Card 2: Active Viewers */}
        <div className="app-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>ACTIVE VIEWERS</span>
            </h3>
            <button
              onClick={reloadSharingData}
              title="Refresh viewers"
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {sharingList && sharingList.length > 0 ? (
              sharingList.map((item) => (
                <div
                  key={item._id || item.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">{item.shared_with_email}</p>
                    <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded">
                      View-Only Access
                    </span>
                  </div>
                  <button
                    onClick={() => handleRevoke(item)}
                    className="text-xs text-rose-500 hover:underline font-semibold"
                  >
                    Revoke Access
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">
                No active viewers. Invite someone on the left.
              </p>
            )}
          </div>
        </div>

        {/* Card 3: Trackers Shared With Me */}
        <div className="app-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-rose-500" />
              <span>TRACKERS SHARED WITH ME</span>
            </h3>
            <button
              onClick={reloadSharingData}
              title="Refresh trackers"
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {sharedByList && sharedByList.length > 0 ? (
              sharedByList.map((item) => {
                const isCurrent = activeOwner === item.owner_email;
                return (
                  <div
                    key={item._id || item.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">
                        {item.owner_name || item.owner_email}
                      </p>
                      <span className="text-[10px] text-slate-400 block">{item.owner_email}</span>
                      <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded mt-1 inline-block">
                        Permission: {item.permission || 'view'}
                      </span>
                    </div>
                    <div>
                      {isCurrent ? (
                        <button
                          onClick={() => {
                            setActiveOwner(null);
                            setActiveTab('expenses');
                          }}
                          className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] rounded-lg transition"
                        >
                          Exit View
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveOwner(item.owner_email);
                            setActiveTab('expenses');
                          }}
                          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 shadow-sm transition"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">
                No trackers shared with you yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
