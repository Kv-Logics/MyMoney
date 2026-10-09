import React, { useState } from 'react';
import { API_BASE, fetchWithAuth } from '../api';
import { Key } from 'lucide-react';

export default function ResetPasswordStandalone() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg('Updating...');
    try {
      const res = await fetchWithAuth(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      });
      if (res.ok) {
        setStatusMsg('Password successfully changed!');
        setIsSuccess(true);
        setOldPassword('');
        setNewPassword('');
      } else {
        const data = await res.json();
        setStatusMsg(`Error: ${data.detail || 'Failed to update password'}`);
        setIsSuccess(false);
      }
    } catch (err) {
      console.error(err);
      setStatusMsg('Network error. Are you logged in?');
      setIsSuccess(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">Change Password</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Update your account security credentials</p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-slate-200 dark:border-slate-800">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Current Password
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {statusMsg && (
              <div className={`p-3 rounded-lg text-xs font-bold text-center ${isSuccess ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                {statusMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition duration-150"
            >
              <Key className="w-4 h-4" /> Reset Password
            </button>
            
            <div className="text-center mt-4">
              <a href="/" className="text-xs font-bold text-slate-400 hover:text-emerald-500 transition-colors">
                &larr; Back to Dashboard
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
