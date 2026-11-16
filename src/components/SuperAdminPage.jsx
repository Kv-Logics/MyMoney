import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE, fetchWithAuth } from '../api';
import { 
  Shield, 
  Key, 
  Users, 
  Search, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  ArrowLeft, 
  Lock, 
  Eye, 
  EyeOff, 
  DollarSign, 
  FileText,
  CheckCircle2,
  Sparkles,
  Trash2
} from 'lucide-react';

const ADMIN_EMAILS = ['keerthivasan.220722@gmail.com', 'a.keerthivasan7676@gmail.com'];

export default function SuperAdminPage() {
  const { user, login, logout } = useApp();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reset password form state
  const [targetEmail, setTargetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState(null);

  // Delete user state
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [deleteStatus, setDeleteStatus] = useState(null);

  // Admin login form state (if not logged in as admin)
  const [adminEmail, setAdminEmail] = useState('keerthivasan.220722@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const isAdmin = user && ADMIN_EMAILS.includes(user.email?.trim().toLowerCase());

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/auth/admin/users`),
        fetchWithAuth(`${API_BASE}/auth/admin/stats`)
      ]);

      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail.trim().toLowerCase(), password: adminPassword })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user, data.access_token);
      } else {
        setLoginError(data.detail || 'Invalid admin credentials');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Server connection failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!targetEmail || !newPassword) return;

    setIsResetting(true);
    setResetStatus(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/auth/admin/set-password`, {
        method: 'POST',
        body: JSON.stringify({
          email: targetEmail.trim().toLowerCase(),
          password: newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setResetStatus({
          type: 'success',
          message: data.message || `Password successfully updated for ${targetEmail}!`
        });
        setNewPassword('');
        // Reload users list
        loadAdminData();
      } else {
        setResetStatus({
          type: 'error',
          message: data.detail || 'Failed to update password.'
        });
      }
    } catch (err) {
      console.error(err);
      setResetStatus({
        type: 'error',
        message: 'Network error occurred.'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleAdminDeleteUser = async (targetUser) => {
    const isTargetAdmin = ADMIN_EMAILS.includes(targetUser.email?.trim().toLowerCase());
    if (isTargetAdmin) {
      alert("Cannot delete a system administrator account.");
      return;
    }

    const confirmed = window.confirm(
      `⚠️ PERMANENT ACCOUNT DELETION\n\nAre you sure you want to delete user "${targetUser.email}"?\n\nThis will permanently erase all their expenses, budgets, savings goals, profit records, settings, and personal data.\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingUserId(targetUser.id);
    setDeleteStatus(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/auth/admin/users/${targetUser.id}`, {
        method: 'DELETE'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDeleteStatus({
          type: 'success',
          message: data.message || `User ${targetUser.email} has been permanently deleted.`
        });
        loadAdminData();
      } else {
        setDeleteStatus({
          type: 'error',
          message: data.detail || `Failed to delete user ${targetUser.email}.`
        });
      }
    } catch (err) {
      console.error(err);
      setDeleteStatus({
        type: 'error',
        message: 'Network error occurred while deleting user.'
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  // If not logged in as Admin, show Admin Login view
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">MyMoney Super Admin</h2>
            <p className="text-xs text-slate-400">
              Restricted portal for authorized administrators (<code className="text-emerald-400 font-mono">keerthivasan.220722@gmail.com</code>)
            </p>
          </div>

          {user && !isAdmin && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 space-y-1">
              <p className="font-bold">Access Denied</p>
              <p>You are logged in as <strong>{user.email}</strong>, which does not have administrator privileges.</p>
              <button
                onClick={logout}
                className="mt-2 text-xs text-rose-400 hover:text-rose-200 underline font-semibold"
              >
                Sign out to login with Admin credentials
              </button>
            </div>
          )}

          {(!user || !isAdmin) && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {loginError && (
                <div className="p-2.5 rounded-lg bg-rose-900/40 border border-rose-800 text-rose-300 text-xs text-center font-bold">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isLoggingIn ? 'Verifying Admin...' : 'Sign In to Super Admin'}</span>
              </button>

              <div className="text-center pt-2">
                <a href="/" className="text-[11px] text-slate-400 hover:text-white flex items-center justify-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Return to MyMoney App
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Admin Authenticated View
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">Super Admin Portal</h1>
              <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase">
                Active Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Logged in as <strong className="text-slate-200">{user.email}</strong> • Full system access to reset passwords & manage users
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadAdminData}
            disabled={isLoading}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            title="Refresh Users"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <a
            href="/"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to MyMoney App
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Metric Cards Row */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-lg">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Registered Users</p>
                <p className="text-2xl font-extrabold text-white mt-1">{stats.total_users || users.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-lg">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total System Expenses</p>
                <p className="text-2xl font-extrabold text-white mt-1">{stats.total_expenses}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-lg">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Volume Tracked</p>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">₹{Number(stats.total_amount || 0).toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/50 flex items-center justify-center text-amber-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Action Box */}
        <div id="reset-form" className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-900/50 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Reset Any User's Password</h3>
                <p className="text-[11px] text-slate-400">
                  Select a user from the table below or type their email address to instantly assign a new password.
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
              Instant Bcrypt Update
            </span>
          </div>

          {resetStatus && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              resetStatus.type === 'success' 
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' 
                : 'bg-rose-950/60 text-rose-300 border border-rose-800'
            }`}>
              {resetStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>{resetStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Target User Email
              </label>
              <input
                type="email"
                required
                placeholder="user@example.com"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-4 relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 pr-9 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 bottom-2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={isResetting || !targetEmail || !newPassword}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{isResetting ? 'Updating...' : 'Set Password'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Registered Users Table */}
        {deleteStatus && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-lg ${
            deleteStatus.type === 'success' 
              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800' 
              : 'bg-rose-950/70 text-rose-300 border border-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {deleteStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>{deleteStatus.message}</span>
            </div>
            <button 
              onClick={() => setDeleteStatus(null)}
              className="text-[11px] underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" /> All Platform Users ({filteredUsers.length})
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Manage accounts, reset credentials, or permanently delete user profiles.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Expenses</th>
                  <th className="px-4 py-3">Joined Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>Loading platform users...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-500 italic">
                      No users match your search query "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isUserAdmin = ADMIN_EMAILS.includes(u.email?.trim().toLowerCase());
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px]">
                              {(u.name || u.email || '?')[0].toUpperCase()}
                            </div>
                            <span className="font-bold text-white">{u.name || 'Unnamed User'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                          {u.email}
                        </td>
                        <td className="px-4 py-3">
                          {isUserAdmin ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                              Admin
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-800 text-slate-400 uppercase">
                              User
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-300">
                          {u.expense_count !== undefined ? `${u.expense_count} items` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px]">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setTargetEmail(u.email);
                                const el = document.getElementById('reset-form');
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-[10px] font-bold border border-indigo-500/30 transition whitespace-nowrap"
                            >
                              Reset Password
                            </button>
                            {!isUserAdmin && (
                              <button
                                onClick={() => handleAdminDeleteUser(u)}
                                disabled={deletingUserId === u.id}
                                className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-[10px] font-bold border border-rose-500/30 transition flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                                title={`Permanently delete user ${u.email} and all their records`}
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>{deletingUserId === u.id ? 'Deleting...' : 'Delete'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

