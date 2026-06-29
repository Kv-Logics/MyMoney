let selectedAuthTheme = 'light'; // Default theme selection on login screen

function setAuthFormTheme(theme) {
  selectedAuthTheme = theme;
  const lightBtn = document.getElementById('auth-theme-light');
  const darkBtn = document.getElementById('auth-theme-dark');
  
  if (theme === 'light') {
    if (lightBtn) lightBtn.className = "py-2.5 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-2 bg-brand-500/10 border-brand-500 text-brand-500";
    if (darkBtn) darkBtn.className = "py-2.5 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-2 bg-slate-900 border-slate-800 text-slate-400 hover:text-white";
    if (state.settings) state.settings.theme = 'light';
    else state.settings = { theme: 'light' };
    applyTheme();
  } else {
    if (darkBtn) darkBtn.className = "py-2.5 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-2 bg-brand-500/10 border-brand-500 text-brand-500";
    if (lightBtn) lightBtn.className = "py-2.5 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-2 bg-slate-900 border-slate-800 text-slate-400 hover:text-white";
    if (state.settings) state.settings.theme = 'dark';
    else state.settings = { theme: 'dark' };
    applyTheme();
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const authErrorDiv = document.getElementById('auth-error');
  authErrorDiv.classList.add('hidden');

  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const name = document.getElementById('auth-name').value.trim();
  
  const isRegister = !document.getElementById('register-fields').classList.contains('hidden');
  const endpoint = isRegister ? 'register' : 'login';
  
  // Ensure we send theme during registration
  const body = isRegister 
    ? { name, email, password, theme: selectedAuthTheme } 
    : { email, password };

  try {
    const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      setCookie('access_token', data.access_token, 1);
      setCookie('refresh_token', data.refresh_token, 7);
      state.token = data.access_token;
      state.refreshToken = data.refresh_token;
      
      // Update global theme from the selection
      state.settings = {
        currency: data.user.currency || '₹',
        theme: selectedAuthTheme,
        language: data.user.language || 'en',
        timezone: data.user.timezone || 'UTC'
      };
      
      applyTheme();
      
      // Save setting preference immediately to backend
      try {
        await fetch(`${API_BASE}/auth/settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
          },
          body: JSON.stringify(state.settings)
        });
      } catch (err) {
        console.warn("Failed to sync theme preference to backend settings", err);
      }
      
      showApp();
    } else {
      showAuthError(data.detail || 'Authentication failed');
    }
  } catch (err) {
    showAuthError('Cannot reach server');
  }
}

function showAuthError(msg) {
  const authErrorDiv = document.getElementById('auth-error');
  const authErrorMsg = document.getElementById('auth-error-msg');
  if (typeof msg === 'object') {
    if (Array.isArray(msg)) {
      authErrorMsg.innerText = msg.map(m => m.msg || JSON.stringify(m)).join(', ');
    } else {
      authErrorMsg.innerText = msg.message || msg.detail || JSON.stringify(msg);
    }
  } else {
    authErrorMsg.innerText = msg;
  }
  authErrorDiv.classList.remove('hidden');
}

function logout() {
  eraseCookie('access_token');
  eraseCookie('refresh_token');
  state.token = '';
  state.refreshToken = '';
  state.user = null;
  state.activeOwner = null;
  showAuth();
}

function showAuth() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
  setAuthFormTheme('light');
}

async function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  updateSyncStatus();
  
  await fetchUserData();
  await fetchAllData();
  switchTab('dashboard');
}

async function saveSettings() {
  const currencyEl = document.getElementById('settings-currency');
  const timezoneEl = document.getElementById('settings-timezone');

  const currency = currencyEl ? currencyEl.value : (state.settings?.currency || '₹');
  const theme = state.settings?.theme || 'dark';
  const timezone = timezoneEl ? timezoneEl.value : (state.settings?.timezone || 'UTC');

  state.settings = { currency, theme, timezone, language: 'en' };
  applyTheme();
  renderDashboard(); // refresh indicators
  
  if (state.isOffline) return;
  try {
    await fetch(`${API_BASE}/auth/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(state.settings)
    });
  } catch (e) {}
}

function saveApiBase() {
  const val = document.getElementById('settings-api-base').value.trim();
  if (val) {
    localStorage.setItem('api_base', val);
    alert('API Base URL updated! Please refresh the page to apply.');
  } else {
    localStorage.removeItem('api_base');
    alert('API Base URL reset to default. Please refresh the page to apply.');
  }
}

async function adminSetUserPassword() {
  const emailEl = document.getElementById('admin-user-email');
  const passwordEl = document.getElementById('admin-user-password');
  
  if (!emailEl || !passwordEl) return;
  
  const email = emailEl.value.trim();
  const password = passwordEl.value.trim();
  
  if (!email || !password) {
    alert("Please fill in both Email and Password fields.");
    return;
  }
  
  if (state.isOffline) {
    alert("You must be online to update user credentials.");
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/auth/admin/set-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(data.message || "User password updated successfully!");
      emailEl.value = '';
      passwordEl.value = '';
    } else {
      alert("Error: " + (data.detail || "Failed to set user password."));
    }
  } catch (err) {
    alert("Cannot reach server to process administrator action.");
  }
}

