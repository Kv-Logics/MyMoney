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

// Login loading state
let loginTimerInterval = null;
let loginTimerStart = null;
let loginStatusInterval = null;
let loginAbortController = null;

const LOGIN_STATUS_MESSAGES = [
  "Connecting to server...",
  "Waking up the backend...",
  "Establishing secure connection...",
  "Server is warming up...",
  "Almost there, hold tight...",
  "Fetching your financial data...",
  "Authenticating credentials...",
  "Preparing your dashboard...",
  "Just a few more seconds...",
  "Loading your expense tracker..."
];

let loginParticlesRAF = null;

function showLoginLoading() {
  const overlay = document.getElementById('login-loading-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');

  // Reset and start timer
  loginTimerStart = Date.now();
  const timerEl = document.getElementById('login-timer');
  if (timerEl) timerEl.textContent = '00:00';

  loginTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - loginTimerStart) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;
  }, 1000);

  // Cycle status messages
  let msgIndex = 0;
  const msgEl = document.getElementById('login-status-msg');
  if (msgEl) msgEl.textContent = LOGIN_STATUS_MESSAGES[0];

  loginStatusInterval = setInterval(() => {
    msgIndex = (msgIndex + 1) % LOGIN_STATUS_MESSAGES.length;
    if (msgEl) msgEl.textContent = LOGIN_STATUS_MESSAGES[msgIndex];
  }, 3500);

  // Re-render lucide icons inside the overlay
  if (window.lucide) lucide.createIcons();

  // Start canvas particle animation
  startLoginParticles();
}

function startLoginParticles() {
  const canvas = document.getElementById('login-particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const PARTICLE_COUNT = 70;
  const CONNECT_DIST = 140;

  function resize() {
    canvas.width = canvas.parentElement.clientWidth || window.innerWidth;
    canvas.height = canvas.parentElement.clientHeight || window.innerHeight;
  }
  resize();
  window._loginParticleResize = resize;
  window.addEventListener('resize', resize);

  const colors = [
    'rgba(99, 102, 241, ',
    'rgba(16, 185, 129, ',
    'rgba(139, 92, 246, ',
    'rgba(14, 165, 233, ',
    'rgba(244, 63, 94, ',
  ];

  const particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 2 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.5 + 0.3
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update & draw particles
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.alpha + ')';
      ctx.fill();
    });

    // Draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(148, 163, 184, ${(1 - dist / CONNECT_DIST) * 0.15})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    loginParticlesRAF = requestAnimationFrame(animate);
  }

  animate();
}

function hideLoginLoading() {
  const overlay = document.getElementById('login-loading-overlay');
  if (overlay) overlay.classList.add('hidden');

  if (loginTimerInterval) { clearInterval(loginTimerInterval); loginTimerInterval = null; }
  if (loginStatusInterval) { clearInterval(loginStatusInterval); loginStatusInterval = null; }
  if (loginParticlesRAF) { cancelAnimationFrame(loginParticlesRAF); loginParticlesRAF = null; }
  if (window._loginParticleResize) {
    window.removeEventListener('resize', window._loginParticleResize);
    window._loginParticleResize = null;
  }
  loginTimerStart = null;
}

function cancelLoginLoading() {
  if (loginAbortController) {
    loginAbortController.abort();
    loginAbortController = null;
  }
  hideLoginLoading();
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

  // Show immersive loading screen
  showLoginLoading();
  loginAbortController = new AbortController();

  try {
    const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: loginAbortController.signal
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
      
      hideLoginLoading();
      showApp();
    } else {
      hideLoginLoading();
      showAuthError(data.detail || 'Authentication failed');
    }
  } catch (err) {
    hideLoginLoading();
    if (err.name === 'AbortError') return; // User cancelled
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

