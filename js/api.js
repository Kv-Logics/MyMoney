const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000/api'
  : (localStorage.getItem('api_base') || 'https://mymoney-jd0n.onrender.com/api');

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
      
      state.settings = {
        currency: state.user.currency || '₹',
        theme: state.user.theme || 'dark',
        language: state.user.language || 'en',
        timezone: state.user.timezone || 'UTC'
      };
      
      document.getElementById('settings-currency').value = state.settings.currency;
      document.getElementById('settings-theme').value = state.settings.theme;
      document.getElementById('settings-timezone').value = state.settings.timezone;
      document.getElementById('settings-api-base').value = localStorage.getItem('api_base') || 'https://mymoney-jd0n.onrender.com/api';
    } else {
      logout();
    }
  } catch (err) {
    console.warn('Backend server unreachable. Using cached offline mode.');
    document.getElementById('settings-api-base').value = localStorage.getItem('api_base') || 'https://mymoney-jd0n.onrender.com/api';
  }
}

async function fetchAllData() {
  document.getElementById('loading-overlay').classList.remove('hidden');
  const ownerQuery = state.activeOwner ? `?owner_email=${encodeURIComponent(state.activeOwner.email)}` : '';
  const headers = { 'Authorization': `Bearer ${state.token}` };

  try {
    // Fetch Expenses
    const expRes = await fetch(`${API_BASE}/expenses${ownerQuery}`, { headers });
    if (expRes.ok) {
      state.expenses = await expRes.json();
      localStorage.setItem('cached_expenses', JSON.stringify(state.expenses));
    }

    // Fetch Categories
    const catRes = await fetch(`${API_BASE}/categories`, { headers });
    if (catRes.ok) {
      state.categories = await catRes.json();
      localStorage.setItem('cached_categories', JSON.stringify(state.categories));
    }

    // Fetch Budgets
    const budRes = await fetch(`${API_BASE}/budgets${ownerQuery}`, { headers });
    if (budRes.ok) {
      state.budgets = await budRes.json();
      localStorage.setItem('cached_budgets', JSON.stringify(state.budgets));
    }

    // Fetch Payment Methods
    const pmRes = await fetch(`${API_BASE}/payment-methods`, { headers });
    if (pmRes.ok) state.paymentMethods = await pmRes.json();

    // Fetch Savings Goals
    const savRes = await fetch(`${API_BASE}/savings${ownerQuery}`, { headers });
    if (savRes.ok) state.savingsGoals = await savRes.json();

    // Fetch active sharing list
    if (!state.activeOwner) {
      const swRes = await fetch(`${API_BASE}/sharing/shared-with`, { headers });
      if (swRes.ok) state.sharingList = await swRes.json();
    }

    // Fetch shared trackers with me
    const sbRes = await fetch(`${API_BASE}/sharing/shared-by`, { headers });
    if (sbRes.ok) {
      state.sharedTrackers = await sbRes.json();
      renderSharedTrackersSection();
    }

    // Fetch notifications
    const notRes = await fetch(`${API_BASE}/notifications`, { headers });
    if (notRes.ok) {
      state.notifications = await notRes.json();
      renderNotifications();
    }

    // Fetch Audit Log
    const auditRes = await fetch(`${API_BASE}/audit-logs${ownerQuery}`, { headers });
    if (auditRes.ok) state.auditLogs = await auditRes.json();

  } catch (err) {
    console.warn('Backend server offline. Loading cache.');
    state.expenses = JSON.parse(localStorage.getItem('cached_expenses') || '[]');
    state.categories = JSON.parse(localStorage.getItem('cached_categories') || '[]');
    state.budgets = JSON.parse(localStorage.getItem('cached_budgets') || '[]');
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
