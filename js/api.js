
async function fetchUserData() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) {
      state.user = await res.json();
      document.getElementById('user-name-display').innerText = state.user.name;
      document.getElementById('user-email-display').innerText = state.user.email;
      document.getElementById('user-avatar').innerText = state.user.name[0].toUpperCase();
      
      const adminPanel = document.getElementById('settings-admin-panel');
      const isAdmin = state.user.email === 'keerthivasan.220722@gmail.com' || state.user.email === 'a.keerthivasan7676@gmail.com';
      state.isAdmin = isAdmin;
      if (adminPanel) {
        if (isAdmin) {
          adminPanel.classList.remove('hidden');
        } else {
          adminPanel.classList.add('hidden');
        }
      }
      
      state.settings = {
        currency: state.user.currency || '₹',
        theme: state.user.theme || 'light',
        language: state.user.language || 'en',
        timezone: state.user.timezone || 'UTC'
      };
      
      applyTheme();
      
      if (document.getElementById('settings-currency')) {
        document.getElementById('settings-currency').value = state.settings.currency;
      }
      if (document.getElementById('settings-theme')) {
        document.getElementById('settings-theme').value = state.settings.theme;
      }
      if (document.getElementById('settings-timezone')) {
        document.getElementById('settings-timezone').value = state.settings.timezone;
      }
      if (document.getElementById('settings-api-base')) {
        document.getElementById('settings-api-base').value = localStorage.getItem('api_base') || 'https://mymoney-jd0n.onrender.com/api';
      }
    } else {
      logout();
    }
  } catch (err) {
    console.warn('Backend server unreachable. Using cached offline mode.');
    if (document.getElementById('settings-api-base')) {
      document.getElementById('settings-api-base').value = localStorage.getItem('api_base') || 'https://mymoney-jd0n.onrender.com/api';
    }
  }
}

async function fetchAllData() {
  document.getElementById('loading-overlay').classList.remove('hidden');
  const ownerQuery = state.activeOwner ? `?owner_email=${encodeURIComponent(state.activeOwner.owner_email)}` : '';
  const headers = { 'Authorization': `Bearer ${state.token}` };

  try {
    const results = await Promise.allSettled([
      fetch(`${API_BASE}/expenses${ownerQuery}`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/categories`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/budgets${ownerQuery}`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/payment-methods`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/savings${ownerQuery}`, { headers }).then(r => r.ok ? r.json() : null),
      (!state.activeOwner ? fetch(`${API_BASE}/sharing/shared-with`, { headers }).then(r => r.ok ? r.json() : null) : Promise.resolve(null)),
      fetch(`${API_BASE}/sharing/shared-by`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/notifications`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/audit-logs${ownerQuery}`, { headers }).then(r => r.ok ? r.json() : null),
      typeof fetchTasksData === 'function' ? fetchTasksData() : Promise.resolve(null)
    ]);

    const [expRes, catRes, budRes, pmRes, savRes, swRes, sbRes, notRes, auditRes] = results;

    if (expRes.status === 'fulfilled' && expRes.value) {
      state.expenses = expRes.value;
      localStorage.setItem('cached_expenses', JSON.stringify(state.expenses));
    }
    if (catRes.status === 'fulfilled' && catRes.value) {
      state.categories = catRes.value;
      localStorage.setItem('cached_categories', JSON.stringify(state.categories));
    }
    if (budRes.status === 'fulfilled' && budRes.value) {
      state.budgets = budRes.value;
      localStorage.setItem('cached_budgets', JSON.stringify(state.budgets));
    }
    if (pmRes.status === 'fulfilled' && pmRes.value) state.paymentMethods = pmRes.value;
    if (savRes.status === 'fulfilled' && savRes.value) state.savingsGoals = savRes.value;
    if (swRes.status === 'fulfilled' && swRes.value) state.sharingList = swRes.value;
    if (sbRes.status === 'fulfilled' && sbRes.value) {
      state.sharedTrackers = sbRes.value;
      if (typeof renderSharedTrackersSection === 'function') renderSharedTrackersSection();
    }
    if (notRes.status === 'fulfilled' && notRes.value) {
      state.notifications = notRes.value;
      if (typeof renderNotifications === 'function') renderNotifications();
    }
    if (auditRes.status === 'fulfilled' && auditRes.value) state.auditLogs = auditRes.value;

  } catch (err) {
    console.warn('Backend server offline or partial fetch error. Loading cache:', err);
    state.expenses = JSON.parse(localStorage.getItem('cached_expenses') || '[]');
    state.categories = JSON.parse(localStorage.getItem('cached_categories') || '[]');
    state.budgets = JSON.parse(localStorage.getItem('cached_budgets') || '[]');
    state.tasks = [];
  } finally {
    document.getElementById('loading-overlay').classList.add('hidden');
    populateSelectDropdowns();
    renderTabContent();
  }
}

async function syncOfflineQueue() {
  if (state.syncQueue.length === 0 || state.isOffline) return;
  const remaining = [...state.syncQueue];
  
  for (const op of state.syncQueue) {
    try {
      let res;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      };
      if (op.type === 'create_expense') {
        res = await fetch(`${API_BASE}/expenses`, {
          method: 'POST',
          headers,
          body: JSON.stringify(op.data)
        });
      } else if (op.type === 'delete_expense') {
        res = await fetch(`${API_BASE}/expenses/${op.id}`, {
          method: 'DELETE',
          headers
        });
      }
      
      if (res && res.ok) {
        const idx = remaining.findIndex(item => item.id === op.id);
        if (idx > -1) remaining.splice(idx, 1);
      }
    } catch (e) {
      break;
    }
  }
  state.syncQueue = remaining;
  localStorage.setItem('sync_queue', JSON.stringify(remaining));
  updateSyncStatus();
  fetchAllData();
}
