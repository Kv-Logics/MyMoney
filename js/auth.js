async function handleAuthSubmit(e) {
  e.preventDefault();
  const authErrorDiv = document.getElementById('auth-error');
  authErrorDiv.classList.add('hidden');

  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const name = document.getElementById('auth-name').value.trim();
  
  const isRegister = !document.getElementById('register-fields').classList.contains('hidden');
  const endpoint = isRegister ? 'register' : 'login';
  const body = isRegister ? { name, email, password } : { email, password };

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
  const currency = document.getElementById('settings-currency').value;
  const theme = document.getElementById('settings-theme').value;
  const timezone = document.getElementById('settings-timezone').value;

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

