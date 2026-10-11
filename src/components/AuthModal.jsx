import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE } from '../api';
import { Wallet, Eye, EyeOff } from 'lucide-react';

export default function AuthModal() {
  const { isAuthModalOpen, login } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isRegister ? `${API_BASE}/auth/register` : `${API_BASE}/auth/login`;
      const normalizedEmail = email.trim().toLowerCase();
      const payload = isRegister 
        ? { name: name.trim(), email: normalizedEmail, password } 
        : { email: normalizedEmail, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        login(data.user, data.access_token);
      } else {
        let errMessage = 'Authentication failed';
        if (typeof data.detail === 'string') {
          errMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          errMessage = data.detail.map(d => d.msg || d.message).join('. ');
        } else if (data.detail && typeof data.detail === 'object') {
          errMessage = data.detail.msg || data.detail.message || JSON.stringify(data.detail);
        }
        setError(errMessage);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('Server connection failed. Please ensure the backend is active.');
    }
  };

  const handleGuestLogin = () => {
    login({ name: 'kv', email: 'kv@mymoney.local' }, 'guest_token_demo');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-md w-full rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 bg-white dark:bg-slate-900">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Wallet className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Welcome to MyMoney</h2>
          <p className="text-xs text-slate-400">Personal & Business Finance Management</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs text-rose-600 dark:text-rose-400 text-center font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="kv"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-400">Password</label>
              <span className="text-[10px] text-slate-400">Min 4 chars</span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={4}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            {isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <button
          onClick={handleGuestLogin}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition"
        >
          Continue as Guest
        </button>

        <div className="text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-emerald-600 hover:underline font-semibold"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
