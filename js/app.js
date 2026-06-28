const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.startsWith('192.168.') || 
                window.location.hostname.startsWith('10.') || 
                window.location.hostname.startsWith('172.') || 
                window.location.protocol === 'file:';

window.API_BASE = isLocal
  ? `http://${window.location.hostname || 'localhost'}:8000/api`
  : (localStorage.getItem('api_base') || 'https://mymoney-jd0n.onrender.com/api');
const API_BASE = window.API_BASE;

// Cookie helper functions
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax; Secure";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function eraseCookie(name) {
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax; Secure';
}

// Global API Interceptor & Token Refresh
const originalFetch = window.fetch;
let isRefreshing = false;
let refreshSubscribers = [];

function onTokenRefreshed(token) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb) {
  refreshSubscribers.push(cb);
}

async function attemptTokenRefresh() {
  if (isRefreshing) {
    return new Promise(resolve => {
      addRefreshSubscriber(token => {
        resolve(!!token);
      });
    });
  }

  isRefreshing = true;

  try {
    const res = await originalFetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: state.refreshToken })
    });

    if (res.ok) {
      const data = await res.json();
      setCookie('access_token', data.access_token, 1);
      setCookie('refresh_token', data.refresh_token, 7);
      state.token = data.access_token;
      state.refreshToken = data.refresh_token;
      onTokenRefreshed(data.access_token);
      isRefreshing = false;
      return true;
    } else {
      onTokenRefreshed(null);
      isRefreshing = false;
      logout();
      return false;
    }
  } catch (err) {
    console.error('Error refreshing token:', err);
    onTokenRefreshed(null);
    isRefreshing = false;
    return false;
  }
}

window.fetch = async function (url, options = {}) {
  if (state && state.token) {
    if (!options.headers) {
      options.headers = {};
    }
    if (!options.headers['Authorization']) {
      options.headers['Authorization'] = `Bearer ${state.token}`;
    }
  }

  let response = await originalFetch(url, options);

  if (response.status === 401 && state && state.refreshToken && !url.includes('/auth/refresh') && !url.includes('/auth/register') && !url.includes('/auth/login')) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      if (options.headers) {
        options.headers['Authorization'] = `Bearer ${state.token}`;
      }
      response = await originalFetch(url, options);
    }
  }

  return response;
};

// State management
const state = {
  token: getCookie('access_token') || '',
  refreshToken: getCookie('refresh_token') || '',
  user: null,
  activeOwner: null,
  expenses: [],
  categories: [],
  budgets: [],
  paymentMethods: [],
  savingsGoals: [],
  sharingList: [],
  sharedTrackers: [],
  notifications: [],
  auditLogs: [],
  settings: {
    currency: '₹',
    theme: 'dark',
    language: 'en',
    timezone: 'UTC'
  },
  syncQueue: JSON.parse(localStorage.getItem('sync_queue') || '[]'),
  isOffline: !navigator.onLine,
  currentTab: 'dashboard',
  receiptBase64: ''
};

// Escape HTML to prevent XSS vulnerability
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Initialize application
window.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  setupEventListeners();
  
  if (state.token) {
    showApp();
  } else {
    showAuth();
  }
});

// Offline / Online sync events
window.addEventListener('online', () => {
  state.isOffline = false;
  updateSyncStatus();
  syncOfflineQueue();
});
window.addEventListener('offline', () => {
  state.isOffline = true;
  updateSyncStatus();
});

function setupEventListeners() {
  // Auth toggle
  const switchBtn = document.getElementById('auth-switch-btn');
  switchBtn.addEventListener('click', () => {
    const regFields = document.getElementById('register-fields');
    const authSwitchText = document.getElementById('auth-switch-text');
    const authBtn = document.getElementById('auth-btn');
    if (regFields.classList.contains('hidden')) {
      regFields.classList.remove('hidden');
      authSwitchText.innerText = 'Already have an account?';
      switchBtn.innerText = 'Sign In';
      authBtn.innerText = 'Register Account';
      document.getElementById('auth-name').setAttribute('required', 'true');
    } else {
      regFields.classList.add('hidden');
      authSwitchText.innerText = 'New to MyMoney?';
      switchBtn.innerText = 'Register';
      authBtn.innerText = 'Sign In';
      document.getElementById('auth-name').removeAttribute('required');
    }
  });

  // Forms
  document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
  document.getElementById('expense-form').addEventListener('submit', handleExpenseSubmit);
  document.getElementById('budget-form').addEventListener('submit', handleBudgetSubmit);
  document.getElementById('goal-form').addEventListener('submit', handleGoalSubmit);
  document.getElementById('sharing-form').addEventListener('submit', handleSharingSubmit);
}

// Tab navigation router
function switchTab(tabId) {
  state.currentTab = tabId;
  
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.className = 'nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-slate-400 hover:bg-slate-900/60 hover:text-white';
  });
  document.getElementById(`nav-${tabId}`).className = 'nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all bg-brand-500 text-white shadow-lg shadow-brand-500/15';

  const title = tabId.charAt(0).toUpperCase() + tabId.slice(1).replace('-', ' ');
  document.getElementById('page-title').innerHTML = state.activeOwner 
    ? `Viewing ${state.activeOwner.owner_name}'s Tracker <span class="text-xs px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 text-rose-400 font-medium rounded-full ml-2">Read Only</span>`
    : title;

  // Auto-close sidebar on mobile after choosing a tab
  const sidebar = document.querySelector('aside');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar && !sidebar.classList.contains('-translate-x-full') && window.innerWidth < 768) {
    sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }

  renderTabContent();
}

function renderTabContent() {
  if (state.currentTab === 'dashboard') renderDashboard();
  else if (state.currentTab === 'expenses') renderExpensesList();
  else if (state.currentTab === 'budgets') renderBudgets();
  else if (state.currentTab === 'savings') renderSavingsGoals();
  else if (state.currentTab === 'reports') runReport();
  else if (state.currentTab === 'sharing') renderSharingTab();
  else if (state.currentTab === 'audit-log') renderAuditLogs();
}

// CSV Export Utility
function exportToCSV(expList) {
  let csv = 'Date,Title,Category,Payment Method,Amount,Location,Notes\n';
  expList.forEach(e => {
    csv += `"${e.date}","${e.title.replace(/"/g, '""')}","${e.category}","${e.payment_method}",${e.amount},"${(e.location || '').replace(/"/g, '""')}","${(e.description || '').replace(/"/g, '""')}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `mymoney_report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadCSVReport(list) {
  exportToCSV(list || state.expenses);
}

// Notification bells
function toggleNotifications() {
  const dropdown = document.getElementById('notifications-dropdown');
  if (dropdown.classList.contains('hidden')) {
    dropdown.classList.remove('hidden');
    clearNotificationsDot();
  } else {
    dropdown.classList.add('hidden');
  }
}

async function clearNotificationsDot() {
  document.getElementById('bell-dot').classList.add('hidden');
  try {
    await fetch(`${API_BASE}/notifications/read`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
  } catch (e) {}
}

async function clearNotifications() {
  state.notifications = [];
  renderNotifications();
  clearNotificationsDot();
}

// Shared view activation
async function viewSharedTracker(id) {
  const tracker = state.sharedTrackers.find(t => t.id === id);
  if (tracker) {
    state.activeOwner = tracker;
    document.getElementById('shared-badge').classList.remove('hidden');
    document.getElementById('header-add-expense-btn').classList.add('hidden');
    await fetchAllData();
    switchTab('dashboard');
  }
}

async function exitSharedView() {
  state.activeOwner = null;
  document.getElementById('shared-badge').classList.add('hidden');
  document.getElementById('header-add-expense-btn').classList.remove('hidden');
  await fetchAllData();
  switchTab('dashboard');
}

// EXPENSE SUBMISSIONS
function openExpenseModal(editingId = null) {
  if (state.activeOwner) return;
  const modal = document.getElementById('modal-expense');
  modal.classList.remove('hidden');

  if (editingId) {
    document.getElementById('modal-expense-title').innerText = 'Modify Expense details';
    const exp = state.expenses.find(e => e.id === editingId);
    
    document.getElementById('expense-id').value = exp.id;
    document.getElementById('expense-amount').value = exp.amount;
    document.getElementById('expense-title').value = exp.title;
    document.getElementById('expense-category').value = exp.category;
    document.getElementById('expense-payment').value = exp.payment_method;
    document.getElementById('expense-date').value = exp.date;
    document.getElementById('expense-time').value = exp.time || '';
    document.getElementById('expense-location').value = exp.location || '';
    document.getElementById('expense-desc').value = exp.description || '';
    
    state.receiptBase64 = exp.receipt_image || '';
    const badge = document.getElementById('expense-receipt-badge');
    if (state.receiptBase64) badge.classList.remove('hidden');
    else badge.classList.add('hidden');
  } else {
    document.getElementById('modal-expense-title').innerText = 'Record Expense Entry';
    document.getElementById('expense-id').value = '';
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-title').value = '';
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('expense-time').value = new Date().toTimeString().split(' ')[0].substring(0, 5);
    document.getElementById('expense-location').value = '';
    document.getElementById('expense-desc').value = '';
    state.receiptBase64 = '';
    document.getElementById('expense-receipt-badge').classList.add('hidden');
  }
}

function closeExpenseModal() {
  document.getElementById('modal-expense').classList.add('hidden');
}

function handleReceiptUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onloadend = () => {
    state.receiptBase64 = reader.result;
    document.getElementById('expense-receipt-badge').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

async function handleExpenseSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('expense-id').value;
  const amount = parseFloat(document.getElementById('expense-amount').value);
  const title = document.getElementById('expense-title').value.trim();
  const category = document.getElementById('expense-category').value;
  const payment_method = document.getElementById('expense-payment').value;
  const date = document.getElementById('expense-date').value;
  const time = document.getElementById('expense-time').value;
  const location = document.getElementById('expense-location').value.trim();
  const description = document.getElementById('expense-desc').value.trim();

  const payload = {
    amount, title, category, payment_method, date, time, location, description,
    receipt_image: state.receiptBase64
  };

  if (state.isOffline) {
    const tempId = 'offline_' + Date.now();
    if (id) {
      state.expenses = state.expenses.map(exp => exp.id === id ? { ...exp, ...payload } : exp);
      state.syncQueue.push({ type: 'create_expense', id, data: payload });
    } else {
      const newExp = { ...payload, id: tempId, _id: tempId, user_id: state.user.id, user_email: state.user.email, created_at: new Date().toISOString() };
      state.expenses.unshift(newExp);
      state.syncQueue.push({ type: 'create_expense', id: tempId, data: payload });
    }
    localStorage.setItem('sync_queue', JSON.stringify(state.syncQueue));
    localStorage.setItem('cached_expenses', JSON.stringify(state.expenses));
    closeExpenseModal();
    updateSyncStatus();
    renderTabContent();
    return;
  }

  try {
    let res;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    };
    if (id) {
      res = await fetch(`${API_BASE}/expenses/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
      closeExpenseModal();
      fetchAllData();
    } else {
      alert('Failed to save expense');
    }
  } catch (err) {
    alert('Server error');
  }
}

async function deleteExpense(id) {
  if (state.activeOwner) return;
  if (!confirm('Are you sure you want to delete this expense?')) return;

  if (state.isOffline) {
    state.expenses = state.expenses.filter(e => e.id !== id);
    state.syncQueue.push({ type: 'delete_expense', id });
    localStorage.setItem('sync_queue', JSON.stringify(state.syncQueue));
    localStorage.setItem('cached_expenses', JSON.stringify(state.expenses));
    updateSyncStatus();
    renderTabContent();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) fetchAllData();
  } catch (e) {
    alert('Server error');
  }
}

function editExpense(id) {
  openExpenseModal(id);
}

function viewReceipt(id) {
  const exp = state.expenses.find(e => e.id === id);
  if (exp && exp.receipt_image) {
    const w = window.open();
    w.document.write(`<img src="${exp.receipt_image}" alt="Uploaded expense receipt" style="max-width: 100%; max-height: 100vh; margin: auto; display: block;" />`);
  }
}

// BUDGET ACTIONS
function openBudgetModal(cat = 'Overall') {
  if (state.activeOwner) return;
  document.getElementById('modal-budget').classList.remove('hidden');
  document.getElementById('budget-category').value = cat;
  const existing = state.budgets.find(b => b.category === cat);
  document.getElementById('budget-amount').value = existing ? existing.amount : '';
}

function closeBudgetModal() {
  document.getElementById('modal-budget').classList.add('hidden');
}

async function handleBudgetSubmit(e) {
  e.preventDefault();
  if (state.activeOwner) return;
  const category = document.getElementById('budget-category').value;
  const amount = parseFloat(document.getElementById('budget-amount').value);

  try {
    const res = await fetch(`${API_BASE}/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ category, amount })
    });
    if (res.ok) {
      closeBudgetModal();
      fetchAllData();
    }
  } catch (err) {
    alert('Failed to update budget limit');
  }
}

// GOALS SUBMISSIONS
function openGoalModal() {
  if (state.activeOwner) return;
  document.getElementById('modal-goal').classList.remove('hidden');
  document.getElementById('modal-goal-title').innerText = 'Create Savings Goal';
  document.getElementById('goal-id').value = '';
  document.getElementById('goal-title').value = '';
  document.getElementById('goal-target').value = '';
  document.getElementById('goal-saved').value = '0';
}

function closeGoalModal() {
  document.getElementById('modal-goal').classList.add('hidden');
}

function editGoal(id) {
  const g = state.savingsGoals.find(item => item.id === id);
  if (!g) return;
  document.getElementById('modal-goal').classList.remove('hidden');
  document.getElementById('modal-goal-title').innerText = 'Update Goal Progress';
  document.getElementById('goal-id').value = g.id;
  document.getElementById('goal-title').value = g.title;
  document.getElementById('goal-target').value = g.target_amount;
  document.getElementById('goal-saved').value = g.saved_amount;
}

async function handleGoalSubmit(e) {
  e.preventDefault();
  if (state.activeOwner) return;

  const id = document.getElementById('goal-id').value;
  const title = document.getElementById('goal-title').value.trim();
  const target_amount = parseFloat(document.getElementById('goal-target').value);
  const saved_amount = parseFloat(document.getElementById('goal-saved').value);

  const payload = { title, target_amount, saved_amount };

  try {
    let res;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    };
    if (id) {
      res = await fetch(`${API_BASE}/savings/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API_BASE}/savings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      if (saved_amount >= target_amount) {
        confetti({ particleCount: 100, spread: 80 });
      }
      closeGoalModal();
      fetchAllData();
    }
  } catch (err) {
    alert('Failed to save savings goal details');
  }
}

async function deleteGoal(id) {
  if (state.activeOwner) return;
  if (!confirm('Are you sure you want to delete this savings goal?')) return;
  try {
    const res = await fetch(`${API_BASE}/savings/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) fetchAllData();
  } catch (e) {
    alert('Failed to delete savings goal');
  }
}

// SHARING SUBMISSIONS
async function handleSharingSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('share-email').value.trim();
  const msgDiv = document.getElementById('sharing-msg');
  msgDiv.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/sharing/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ email, permission: 'view' })
    });
    const data = await res.json();
    if (res.ok) {
      msgDiv.className = 'p-3 rounded-xl text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      msgDiv.innerText = data.message;
      msgDiv.classList.remove('hidden');
      document.getElementById('share-email').value = '';
      fetchAllData();
    } else {
      msgDiv.className = 'p-3 rounded-xl text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20';
      msgDiv.innerText = data.detail || 'Failed to share';
      msgDiv.classList.remove('hidden');
    }
  } catch (err) {
    msgDiv.className = 'p-3 rounded-xl text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20';
    msgDiv.innerText = 'Connection error';
    msgDiv.classList.remove('hidden');
  }
}

async function revokeSharing(id) {
  if (!confirm('Are you sure you want to revoke access?')) return;
  try {
    const res = await fetch(`${API_BASE}/sharing/revoke/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) fetchAllData();
  } catch (err) {
    alert('Failed to revoke sharing invite');
  }
}

// REPORTS BUILDER
async function runReport() {
  let start = document.getElementById('report-start-date').value;
  let end = document.getElementById('report-end-date').value;

  if (!start || !end) {
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    end = now.toISOString().split('T')[0];
    document.getElementById('report-start-date').value = start;
    document.getElementById('report-end-date').value = end;
  }

  const ownerQuery = state.activeOwner ? `&owner_email=${encodeURIComponent(state.activeOwner.owner_email)}` : '';
  
  try {
    const res = await fetch(`${API_BASE}/reports?start_date=${start}&end_date=${end}${ownerQuery}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) {
      const report = await res.json();
      document.getElementById('report-total').innerText = `${state.settings.currency}${report.total_expense.toLocaleString()}`;
      document.getElementById('report-avg').innerText = `${state.settings.currency}${Math.round(report.average_expense).toLocaleString()}`;
      document.getElementById('report-highest').innerText = `${report.highest_spending_category} (${state.settings.currency}${Math.round(report.highest_spending_category_amount).toLocaleString()})`;
      document.getElementById('report-lowest').innerText = `${report.lowest_spending_category} (${state.settings.currency}${Math.round(report.lowest_spending_category_amount).toLocaleString()})`;

      document.getElementById('report-log-title').innerText = `Expenses Log (${report.transaction_count} entries)`;
      const tbody = document.getElementById('report-tbody');
      tbody.innerHTML = '';
      
      report.expenses.forEach(e => {
        tbody.innerHTML += `
          <tr class="hover:bg-slate-900/10">
            <td class="py-3 text-xs text-slate-400">${escapeHTML(e.date)}</td>
            <td class="py-3 font-semibold text-slate-200">${escapeHTML(e.title)}</td>
            <td class="py-3 text-slate-400 text-xs">${escapeHTML(e.category)}</td>
            <td class="py-3 text-slate-400 text-xs">${escapeHTML(e.payment_method)}</td>
            <td class="py-3 text-right font-bold text-white">${state.settings.currency}${e.amount.toLocaleString()}</td>
          </tr>
        `;
      });
      
      if (report.expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400 text-xs">No expenses in this date range</td></tr>`;
      }
    }
  } catch (err) {
    const filtered = state.expenses.filter(e => e.date >= start && e.date <= end);
    const total = filtered.reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('report-total').innerText = `${state.settings.currency}${total.toLocaleString()}`;
    document.getElementById('report-avg').innerText = `${state.settings.currency}${filtered.length ? Math.round(total / filtered.length).toLocaleString() : 0}`;
    document.getElementById('report-highest').innerText = 'Local Offline';
    document.getElementById('report-lowest').innerText = 'Local Offline';
    
    const tbody = document.getElementById('report-tbody');
    tbody.innerHTML = '';
    filtered.forEach(e => {
      tbody.innerHTML += `
        <tr class="hover:bg-slate-900/10">
          <td class="py-3 text-xs text-slate-400">${escapeHTML(e.date)}</td>
          <td class="py-3 font-semibold text-slate-200">${escapeHTML(e.title)}</td>
          <td class="py-3 text-slate-400 text-xs">${escapeHTML(e.category)}</td>
          <td class="py-3 text-slate-400 text-xs">${escapeHTML(e.payment_method)}</td>
          <td class="py-3 text-right font-bold text-white">${state.settings.currency}${e.amount.toLocaleString()}</td>
        </tr>
      `;
    });
  }
}

function downloadReportCSV() {
  const start = document.getElementById('report-start-date').value;
  const end = document.getElementById('report-end-date').value;
  const filtered = state.expenses.filter(e => e.date >= start && e.date <= end);
  exportToCSV(filtered);
}

function clearExpensesFilters() {
  document.getElementById('filter-search').value = '';
  document.getElementById('filter-category').value = '';
  document.getElementById('filter-payment').value = '';
  document.getElementById('filter-sort').value = 'date_desc';
  document.getElementById('filter-start-date').value = '';
  document.getElementById('filter-end-date').value = '';
  document.getElementById('filter-min-amount').value = '';
  document.getElementById('filter-max-amount').value = '';
  renderExpensesList();
}

async function showAddPaymentMethodPrompt() {
  const name = prompt("Enter new payment method name (e.g. UPI-KVB, UPI SBI):");
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed) return;

  try {
    const headers = {
      'Authorization': `Bearer ${state.token}`
    };
    const res = await fetch(`${API_BASE}/payment-methods?name=${encodeURIComponent(trimmed)}`, {
      method: 'POST',
      headers
    });
    if (res.ok) {
      await fetchAllData();
      document.getElementById('expense-payment').value = trimmed;
    } else {
      const err = await res.json();
      alert(err.detail || "Failed to add payment method");
    }
  } catch (error) {
    console.error(error);
    alert("Connection error occurred");
  }
}

async function showAddCategoryPrompt() {
  const name = prompt("Enter new category name:");
  if (!name) return;
  const trimmedName = name.trim();
  if (!trimmedName) return;

  const color = prompt("Enter category color (e.g. #3b82f6 or name):", "#3b82f6");
  const trimmedColor = (color || "#3b82f6").trim();

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    };
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: trimmedName, color: trimmedColor })
    });
    if (res.ok) {
      await fetchAllData();
      document.getElementById('expense-category').value = trimmedName;
    } else {
      const err = await res.json();
      alert(err.detail || "Failed to add category");
    }
  } catch (error) {
    console.error(error);
    alert("Connection error occurred");
  }
}

async function quickAddGoalMoney(id) {
  if (state.activeOwner) return;
  const g = state.savingsGoals.find(item => item.id === id);
  if (!g) return;

  const input = prompt(`Add money to "${g.title}" (Current saved: ${state.settings.currency} ${g.saved_amount.toLocaleString()})\nEnter amount to add:`);
  if (!input) return;
  
  const amount = parseFloat(input);
  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid positive number.");
    return;
  }

  const oldSaved = g.saved_amount;
  const newSaved = oldSaved + amount;
  
  // Optimistic UI Update: update state and render immediately!
  g.saved_amount = newSaved;
  renderSavingsGoals();

  if (newSaved >= g.target_amount && oldSaved < g.target_amount) {
    confetti({ particleCount: 100, spread: 80 });
  }

  const payload = {
    title: g.title,
    target_amount: g.target_amount,
    saved_amount: newSaved
  };

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    };
    const res = await fetch(`${API_BASE}/savings/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      g.saved_amount = oldSaved;
      renderSavingsGoals();
      alert("Failed to save to database. Restored previous value.");
    } else {
      const updatedGoal = await res.json();
      g.saved_amount = updatedGoal.saved_amount;
      g.target_amount = updatedGoal.target_amount;
      g.title = updatedGoal.title;
      renderSavingsGoals();
    }
  } catch (err) {
    console.error(err);
    g.saved_amount = oldSaved;
    renderSavingsGoals();
    alert("Connection error. Saved value restored.");
  }
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('aside');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar.classList.contains('-translate-x-full')) {
    sidebar.classList.remove('-translate-x-full');
    backdrop.classList.remove('hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.add('hidden');
  }
}

// Close notifications dropdown and mobile sidebar when clicking outside
document.addEventListener('click', function(event) {
  // Notifications Dropdown
  const dropdown = document.getElementById('notifications-dropdown');
  const bellBtn = document.getElementById('bell-btn');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    if (!dropdown.contains(event.target) && (!bellBtn || !bellBtn.contains(event.target))) {
      dropdown.classList.add('hidden');
    }
  }

  // Mobile Sidebar
  const sidebar = document.querySelector('aside');
  const backdrop = document.getElementById('sidebar-backdrop');
  const menuBtn = document.getElementById('mobile-menu-btn');
  if (sidebar && !sidebar.classList.contains('-translate-x-full') && window.innerWidth < 768) {
    if (!sidebar.contains(event.target) && (!menuBtn || !menuBtn.contains(event.target)) && (!backdrop || !backdrop.contains(event.target))) {
      sidebar.classList.add('-translate-x-full');
      if (backdrop) backdrop.classList.add('hidden');
    }
  }
});

