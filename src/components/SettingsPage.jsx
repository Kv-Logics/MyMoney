import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Key, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user, settings, setSettings } = useApp();
  const [userEmail, setUserEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [pushStatus, setPushStatus] = useState(null);
  const [reminderTime, setReminderTime] = useState('21:00');
  
  const [pwdStatus, setPwdStatus] = useState(null);
  const [adminStatus, setAdminStatus] = useState(null);

  return (
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Left Column */}
      <div className="space-y-6">
        <div className="app-card space-y-6">
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
        </div>

        <div className="app-card space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-500" /> DAILY REMINDERS (AI PUSH)
            </h4>
            <p className="text-[10px] text-slate-500 mt-1">
              Receive a personalized daily summary at night directly on your device. No email or WhatsApp needed!
            </p>
          </div>
          
          {pushStatus && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              pushStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
            }`}>
              <span>{pushStatus.message}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">REMINDER TIME</label>
              <input 
                type="time" 
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
            <button
              onClick={async () => {
                setPushStatus({ type: 'loading', message: 'Requesting permissions...' });
                try {
                  const registration = await navigator.serviceWorker.register('/sw.js');
                  const permission = await Notification.requestPermission();
                  if (permission !== 'granted') {
                    setPushStatus({ type: 'error', message: 'Notification permission denied.' });
                    return;
                  }
                  const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: 'BIMi_b_1NBMksseVvdVyJF6w0eRn9w157A3CyTo9_WlbwOrwm5LXnHwlQJJzq8C5K03m1Npi5c_VUZ_VQBzZNe0'
                  });
                  
                  const payload = {
                    endpoint: subscription.endpoint,
                    keys: {
                      p256dh: subscription.toJSON().keys.p256dh,
                      auth: subscription.toJSON().keys.auth
                    },
                    reminder_time: reminderTime
                  };
                  
                  const { API_BASE, fetchWithAuth } = await import('../api');
                  const res = await fetchWithAuth(`${API_BASE}/push/subscribe`, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                  });
                  if (res.ok) {
                    setPushStatus({ type: 'success', message: 'Successfully subscribed to daily AI reminders!' });
                  } else {
                    setPushStatus({ type: 'error', message: 'Failed to save subscription to server.' });
                  }
                } catch (err) {
                  console.error(err);
                  setPushStatus({ type: 'error', message: 'Error: ' + err.message });
                }
              }}
              className="flex-2 mt-5 py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              Enable Reminders
            </button>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        <div className="app-card space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Key className="w-4 h-4 text-emerald-500" /> CHANGE ACCOUNT PASSWORD
            </h4>
          </div>
          {pwdStatus && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${pwdStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
              <span>{pwdStatus.message}</span>
            </div>
          )}
          <form onSubmit={async (e) => {
            e.preventDefault();
            setPwdStatus(null);
            const old_pw = e.target.oldPassword.value;
            const new_pw = e.target.newPassword.value;
            if (!old_pw || !new_pw) return;
            try {
              const { API_BASE, fetchWithAuth } = await import('../api');
              const res = await fetchWithAuth(`${API_BASE}/auth/change-password`, {
                method: 'POST',
                body: JSON.stringify({ old_password: old_pw, new_password: new_pw })
              });
              if (res.ok) {
                setPwdStatus({ type: 'success', message: 'Password changed successfully!' });
                e.target.reset();
              } else {
                setPwdStatus({ type: 'error', message: 'Failed to change password. Check your old password.' });
              }
            } catch (err) {
              console.error(err);
              setPwdStatus({ type: 'error', message: 'Network error occurred.' });
            }
          }} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">OLD PASSWORD</label>
                <input type="password" name="oldPassword" required className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">NEW PASSWORD</label>
                <input type="password" name="newPassword" required minLength={6} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs" />
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition">
              Update Password
            </button>
          </form>
        </div>

        {user?.email === 'keerthivasan.220722@gmail.com' && (
          <div className="app-card space-y-4">
            <div>
              <h4 className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> ADMIN USER MANAGEMENT
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Set or override passwords for existing or new users.</p>
            </div>
            
            {adminStatus && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${adminStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                <span>{adminStatus.message}</span>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setAdminStatus(null);
              if (!userEmail || !newPassword) return;
              try {
                const { API_BASE, fetchWithAuth } = await import('../api');
                const res = await fetchWithAuth(`${API_BASE}/auth/admin/set-password`, {
                  method: 'POST',
                  body: JSON.stringify({ email: userEmail, password: newPassword })
                });
                if (res.ok) {
                  setAdminStatus({ type: 'success', message: `Password overridden for ${userEmail}` });
                  setUserEmail('');
                  setNewPassword('');
                } else {
                  const data = await res.json();
                  setAdminStatus({ type: 'error', message: `Error: ${data.detail || 'Failed to update'}` });
                }
              } catch (err) {
                console.error(err);
                setAdminStatus({ type: 'error', message: 'Network error occurred.' });
              }
            }} className="space-y-3">
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
    </div>
    </div>
  );
}
