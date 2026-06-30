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
  tasks: [],
  settings: {
    currency: '₹',
    theme: 'light',
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
  // Initialize Flatpickr on all date inputs for DD/MM/YYYY formatting
  if (window.flatpickr) {
    flatpickr("#expense-date", {
      altInput: true,
      altFormat: "d/m/Y",
      dateFormat: "Y-m-d",
      allowInput: true,
      disableMobile: true
    });
    
    flatpickr("#filter-start-date", {
      altInput: true,
      altFormat: "d/m/Y",
      dateFormat: "Y-m-d",
      allowInput: true,
      disableMobile: true,
      onChange: () => {
        if (typeof renderExpensesList === 'function') renderExpensesList();
      }
    });
    
    flatpickr("#filter-end-date", {
      altInput: true,
      altFormat: "d/m/Y",
      dateFormat: "Y-m-d",
      allowInput: true,
      disableMobile: true,
      onChange: () => {
        if (typeof renderExpensesList === 'function') renderExpensesList();
      }
    });
    
    flatpickr("#report-start-date", {
      altInput: true,
      altFormat: "d/m/Y",
      dateFormat: "Y-m-d",
      allowInput: true,
      disableMobile: true
    });
    
    flatpickr("#report-end-date", {
      altInput: true,
      altFormat: "d/m/Y",
      dateFormat: "Y-m-d",
      allowInput: true,
      disableMobile: true
    });

    flatpickr("#checklist-item-date", {
      altInput: true,
      altFormat: "d/m/Y",
      dateFormat: "Y-m-d",
      allowInput: true,
      disableMobile: true
    });
  }

  lucide.createIcons();
  setupEventListeners();
  
  // Restore saved desktop sidebar collapsed preference
  const aside = document.querySelector('aside');
  if (aside && localStorage.getItem('sidebar_collapsed') === 'true' && window.innerWidth >= 768) {
    aside.classList.add('collapsed');
  }
  
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
  if (switchBtn) {
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
  }

  // Forms
  document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
  document.getElementById('expense-form').addEventListener('submit', handleExpenseSubmit);
  document.getElementById('budget-form').addEventListener('submit', handleBudgetSubmit);
  document.getElementById('goal-form').addEventListener('submit', handleGoalSubmit);
  document.getElementById('sharing-form').addEventListener('submit', handleSharingSubmit);
  
  const taskForm = document.getElementById('task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', handleTaskSubmit);
  }
}

// Tab navigation router
function switchTab(tabId) {
  state.currentTab = tabId;
  
  // Collapse sidebar if expanded on mobile
  const aside = document.querySelector('aside');
  if (aside && aside.classList.contains('expanded')) {
    aside.classList.remove('expanded');
    const icon = document.getElementById('sidebar-toggle-icon');
    if (icon) icon.style.transform = 'rotate(0deg)';
  }

  document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.add('text-slate-400', 'hover:bg-slate-900/60', 'hover:text-white');
    btn.classList.remove('bg-brand-500', 'text-white', 'shadow-lg', 'shadow-brand-500/15');
  });

  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-400', 'hover:bg-slate-900/60', 'hover:text-white');
    activeBtn.classList.add('bg-brand-500', 'text-white', 'shadow-lg', 'shadow-brand-500/15');
  }

  let title = tabId.charAt(0).toUpperCase() + tabId.slice(1).replace('-', ' ');
  if (tabId === 'budgets') title = 'Budgets & Savings';
  
  document.getElementById('page-title').innerHTML = state.activeOwner 
    ? `Viewing ${state.activeOwner.owner_name}'s Tracker <span class="text-xs px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 text-rose-400 font-medium rounded-full ml-2">Read Only</span>`
    : title;

  renderTabContent();
}

function renderTabContent() {
  if (state.currentTab === 'dashboard') renderDashboard();
  else if (state.currentTab === 'expenses') renderExpensesList();
  else if (state.currentTab === 'budgets') {
    renderBudgets();
    renderSavingsGoals();
  }
  else if (state.currentTab === 'reports') runReport();
  else if (state.currentTab === 'sharing') renderSharingTab();
  else if (state.currentTab === 'audit-log') renderAuditLogs();
  else if (state.currentTab === 'tasks') renderTasks();
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
  const dot = document.getElementById('bell-dot');
  if (dot) dot.classList.add('hidden');
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

function toggleMobileSidebar() {
  // Sidebar is static now; no-op to prevent errors
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
  const dropdown = document.getElementById('notifications-dropdown');
  const bellBtn = document.getElementById('bell-btn');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    if (!dropdown.contains(event.target) && (!bellBtn || !bellBtn.contains(event.target))) {
      dropdown.classList.add('hidden');
    }
  }

  const parentDropdown = document.getElementById('parent-shared-dropdown');
  const parentBtn = document.querySelector('#parent-shared-dropdown-container button');
  if (parentDropdown && !parentDropdown.classList.contains('hidden')) {
    if (!parentDropdown.contains(event.target) && (!parentBtn || !parentBtn.contains(event.target))) {
      parentDropdown.classList.add('hidden');
    }
  }
});

function applyTheme() {
  const theme = state.settings?.theme || 'dark';
  const icons = document.querySelectorAll('.theme-toggle-icon');
  
  if (theme === 'light') {
    document.documentElement.classList.remove('dark');
    icons.forEach(icon => {
      icon.setAttribute('data-lucide', 'moon');
    });
  } else {
    document.documentElement.classList.add('dark');
    icons.forEach(icon => {
      icon.setAttribute('data-lucide', 'sun');
    });
  }
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function toggleThemeGlobal() {
  const currentTheme = state.settings?.theme || 'dark';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  if (!state.settings) {
    state.settings = { currency: '₹', theme: 'dark', timezone: 'UTC', language: 'en' };
  }
  
  state.settings.theme = newTheme;
  applyTheme();
  
  if (typeof saveSettings === 'function' && state.token) {
    await saveSettings();
  }
}

function toggleSidebar() {
  const aside = document.querySelector('aside');
  const icon = document.getElementById('sidebar-toggle-icon');
  
  if (aside.classList.contains('expanded')) {
    aside.classList.remove('expanded');
    if (icon) icon.style.transform = 'rotate(0deg)';
  } else {
    aside.classList.add('expanded');
    if (icon) icon.style.transform = 'rotate(180deg)';
  }
}

// Global DD/MM/YYYY formatting helper
function formatDateToDMY(dateStr) {
  if (!dateStr) return '';
  // If already in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) { // YYYY-MM-DD
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateStr;
}

// Helper to set inputs with or without Flatpickr instances
function setDateValue(id, valueString) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el._flatpickr) {
    el._flatpickr.setDate(valueString, false);
  } else {
    el.value = valueString;
  }
}

function toggleDesktopSidebar() {
  const aside = document.querySelector('aside');
  if (!aside) return;
  
  if (window.innerWidth >= 768) {
    aside.classList.toggle('collapsed');
    localStorage.setItem('sidebar_collapsed', aside.classList.contains('collapsed'));
  } else {
    aside.classList.toggle('expanded');
    const icon = document.getElementById('sidebar-toggle-icon');
    if (icon) {
      if (aside.classList.contains('expanded')) {
        icon.style.transform = 'rotate(180deg)';
      } else {
        icon.style.transform = 'rotate(0deg)';
      }
    }
  }
}

