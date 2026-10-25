import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE, fetchWithAuth } from '../api';

const AppContext = createContext();

const VALID_TABS = ['dashboard', 'ai-agent', 'expenses', 'profit', 'budgets', 'tasks', 'reports', 'sharing', 'audit-log', 'settings'];

function getInitialTab() {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (hash && VALID_TABS.includes(hash)) {
      return hash;
    }
    const saved = localStorage.getItem('mymoney_activeTab');
    if (saved && VALID_TABS.includes(saved)) {
      return saved;
    }
  }
  return 'dashboard';
}

export function AppProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('mymoney_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('mymoney_user') || 'null'));
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [theme, setTheme] = useState(localStorage.getItem('mymoney_theme') || 'light');
  const [activeOwner, setActiveOwner] = useState(null);

  // Check local cache for instant load
  const cachedDataStr = localStorage.getItem('mymoney_cache');
  const cachedData = cachedDataStr ? JSON.parse(cachedDataStr) : {};
  const isRecentlyAwake = sessionStorage.getItem('isBackendAwake') === 'true';

  // System Design Readiness Enum: 'INITIALIZING' | 'READY' | 'ERROR'
  const [appState, setAppState] = useState((isRecentlyAwake && cachedDataStr) ? 'READY' : 'INITIALIZING');
  const [appError, setAppError] = useState(null);

  // Collections
  const [expenses, setExpenses] = useState(cachedData.expenses || []);
  const [categories, setCategories] = useState(cachedData.categories || [
    { name: 'Food', color: '#ef4444' },
    { name: 'Travel', color: '#10b981' },
    { name: 'Fuel', color: '#6366f1' },
    { name: 'Rent', color: '#8b5cf6' },
    { name: 'Grocery', color: '#10b981' },
    { name: 'Shopping', color: '#ec4899' },
    { name: 'Medical', color: '#14b8a6' },
    { name: 'Utilities', color: '#eab308' },
    { name: 'Miscellaneous', color: '#6b7280' },
    { name: 'Other', color: '#64748b' }
  ]);
  const DEFAULT_PAYMENT_METHODS = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Wallet'];
  const [paymentMethods, setPaymentMethods] = useState(
    cachedData.paymentMethods && cachedData.paymentMethods.length > 0
      ? cachedData.paymentMethods
      : DEFAULT_PAYMENT_METHODS
  );
  const [budgets, setBudgets] = useState(cachedData.budgets || []);
  const [savingsGoals, setSavingsGoals] = useState(cachedData.savingsGoals || []);
  const [dailyProfits, setDailyProfits] = useState(cachedData.dailyProfits || []);
  const [profitSummary, setProfitSummary] = useState(cachedData.profitSummary || { total_profit: 0, profitable_days: 0, loss_days: 0, average_daily_profit: 0 });
  const [tasks, setTasks] = useState(cachedData.tasks || []);
  const [sharingList, setSharingList] = useState(cachedData.sharingList || []);
  const [sharedByList, setSharedByList] = useState(cachedData.sharedByList || []);
  const [auditLogs, setAuditLogs] = useState(cachedData.auditLogs || []);
  const [pocketMoneyData, setPocketMoneyData] = useState(cachedData.pocketMoneyData || {
    summary: { available_balance: 0, total_active_deposited: 0, total_waiting_deposited: 0, total_spent: 0, waiting_count: 0, active_count: 0 },
    deposits: []
  });

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isServerAwake, setIsServerAwake] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(!localStorage.getItem('mymoney_token'));

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Confirm Modal state
  const [confirmState, setConfirmState] = useState({
    isOpen: false, title: '', message: '', confirmText: 'Confirm', isDanger: true, resolve: null
  });

  const [settings, setSettings] = useState({ currency: '₹', timezone: 'UTC' });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('mymoney_theme', theme);
  }, [theme]);

  // Keep activeTab synced with localStorage AND URL hash so any refresh remains on the exact tab
  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('mymoney_activeTab', activeTab);
      if (window.location.hash !== `#${activeTab}`) {
        window.history.replaceState(null, '', `#${activeTab}`);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash && VALID_TABS.includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const loadAllDataInternal = async (authToken = token) => {
    if (authToken === 'guest_token_demo') {
      const todayStr = new Date().toISOString().split('T')[0];
      const mockExpenses = [
        { _id: 'g1', title: 'Groceries & Provisions', amount: 850, category: 'Food', payment_method: 'UPI', date: todayStr },
        { _id: 'g2', title: 'Travel & Metro Card', amount: 200, category: 'Travel', payment_method: 'Cash', date: todayStr }
      ];
      const mockBudgets = [
        { _id: 'gb1', category: 'Overall', amount: 5000, period: 'monthly' },
        { _id: 'gb2', category: 'Weekly Allowance', amount: 1500, period: 'weekly', reset_day: 'Monday' }
      ];
      setExpenses(mockExpenses);
      setBudgets(mockBudgets);
      setDailyProfits([{ date: todayStr, amount: 350, note: 'Freelance earnings' }]);
      setProfitSummary({ total_profit: 350, profitable_days: 1, loss_days: 0, average_daily_profit: 350 });
      return;
    }

    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    // Fetch all required data concurrently with individual error safety
    const [expRes, budRes, profRes, profSumRes, tasksRes, auditRes, savRes, shareWithRes, shareByRes, catRes, pmRes, paymRes] = await Promise.all([
      fetchWithAuth(`${API_BASE}/expenses`, { headers }),
      fetchWithAuth(`${API_BASE}/budgets`, { headers }),
      fetchWithAuth(`${API_BASE}/profit`, { headers }).catch(() => ({ ok: false })),
      fetchWithAuth(`${API_BASE}/profit/summary`, { headers }).catch(() => ({ ok: false })),
      fetchWithAuth(`${API_BASE}/tasks`, { headers }).catch(() => ({ ok: false })),
      fetchWithAuth(`${API_BASE}/audit-logs`, { headers }).catch(() => ({ ok: false })),
      fetchWithAuth(`${API_BASE}/savings`, { headers }).catch(() => ({ ok: false })),
      fetchWithAuth(`${API_BASE}/sharing/shared-with`, { headers }).catch(() => ({ ok: false })),
      fetchWithAuth(`${API_BASE}/sharing/shared-by`, { headers }).catch(() => ({ ok: false })),
      fetchWithAuth(`${API_BASE}/categories`, { headers }).catch(() => ({ ok: false })),
      fetchWithAuth(`${API_BASE}/pocket-money`, { headers }).catch(() => ({ ok: false })),
      fetchWithAuth(`${API_BASE}/payment-methods`, { headers }).catch(() => ({ ok: false }))
    ]);

    let _expenses = expenses;
    if (expRes && expRes.ok) {
      const expData = await expRes.json();
      _expenses = Array.isArray(expData) ? expData : [];
      setExpenses(_expenses);
    } else if (expRes && expRes.status === 401) {
      throw new Error('401 Unauthorized');
    }

    let _budgets = budgets;
    if (budRes && budRes.ok) {
      _budgets = await budRes.json();
      setBudgets(_budgets);
    } else if (budRes && budRes.status === 401) {
      throw new Error('401 Unauthorized');
    }

    let _dailyProfits = dailyProfits;
    if (profRes && profRes.ok) {
      try {
        const profData = await profRes.json();
        _dailyProfits = profData.records || [];
        setDailyProfits(_dailyProfits);
      } catch (e) {
        console.warn('Profit parsing warning:', e);
      }
    }

    let _profitSummary = profitSummary;
    if (profSumRes && profSumRes.ok) {
      try {
        _profitSummary = await profSumRes.json();
        setProfitSummary(_profitSummary);
      } catch (e) {
        console.warn('Profit summary parsing warning:', e);
      }
    }
    
    // Optional endpoints
    const _tasks = tasksRes && tasksRes.ok ? await tasksRes.json() : [];
    if (tasksRes && tasksRes.ok) setTasks(_tasks);

    const _auditLogs = auditRes && auditRes.ok ? await auditRes.json() : [];
    if (auditRes && auditRes.ok) setAuditLogs(_auditLogs);

    const _savingsGoals = savRes && savRes.ok ? await savRes.json() : [];
    if (savRes && savRes.ok) setSavingsGoals(_savingsGoals);

    const _sharingList = shareWithRes && shareWithRes.ok ? await shareWithRes.json() : [];
    if (shareWithRes && shareWithRes.ok) setSharingList(_sharingList);

    const _sharedByList = shareByRes && shareByRes.ok ? await shareByRes.json() : [];
    if (shareByRes && shareByRes.ok) setSharedByList(_sharedByList);

    let _categories = categories;
    if (catRes && catRes.ok) {
      const catData = await catRes.json();
      if (Array.isArray(catData) && catData.length > 0) {
        _categories = catData;
        setCategories(catData);
      }
    }

    let _paymentMethods = (paymentMethods && paymentMethods.length > 0) ? paymentMethods : DEFAULT_PAYMENT_METHODS;
    if (paymRes && paymRes.ok) {
      try {
        const pmData = await paymRes.json();
        if (Array.isArray(pmData) && pmData.length > 0) {
          _paymentMethods = pmData;
          setPaymentMethods(pmData);
        }
      } catch (e) {
        console.warn('Payment methods parsing error:', e);
      }
    }

    let _pocketMoneyData = pocketMoneyData;
    if (pmRes && pmRes.ok) {
      try {
        const pmJson = await pmRes.json();
        if (pmJson && pmJson.summary) {
          _pocketMoneyData = pmJson;
          setPocketMoneyData(pmJson);
        }
      } catch (e) {
        console.warn('Pocket money parsing error:', e);
      }
    }

    localStorage.setItem('mymoney_cache', JSON.stringify({
      expenses: _expenses,
      budgets: _budgets,
      dailyProfits: _dailyProfits,
      profitSummary: _profitSummary,
      tasks: _tasks,
      auditLogs: _auditLogs,
      savingsGoals: _savingsGoals,
      sharingList: _sharingList,
      sharedByList: _sharedByList,
      categories: _categories,
      paymentMethods: _paymentMethods,
      pocketMoneyData: _pocketMoneyData
    }));
  };

  const startBackendCheckAndInitialization = useCallback(async () => {
    const hasCache = !!localStorage.getItem('mymoney_cache');
    const storedToken = localStorage.getItem('mymoney_token');
    
    // If not logged in yet, allow the login modal to display immediately
    if (!storedToken) {
      setIsAuthModalOpen(true);
      setAppState('READY');
      // Fire a non-blocking background ping to warm up the backend while user types credentials
      fetch(`${API_BASE}/ping`, { cache: 'no-store' }).catch(() => {});
      return;
    }

    // Check if backend was verified awake recently (within 5 minutes, since Render spins down after 15m)
    const awakeTimestamp = parseInt(sessionStorage.getItem('backendAwakeTimestamp') || '0', 10);
    const isRecentlyAwake = Date.now() - awakeTimestamp < 5 * 60 * 1000;

    setAppState(prev => {
      if (prev === 'READY' && isRecentlyAwake && hasCache) return 'READY';
      return 'INITIALIZING';
    });
    setAppError(null);

    const rootUrl = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;
    // Use /api/ping and /api/status - adblockers block /health!
    const pingEndpoints = [
      `${API_BASE}/ping`,
      `${API_BASE}/status`,
      `${rootUrl}/`
    ];

    let isHealthy = false;
    let attempts = 0;

    if (isRecentlyAwake) {
      isHealthy = true;
    } else {
      // Retry checking until backend responds 200 OK
      while (!isHealthy && attempts < 25) {
        attempts++;
        const targetUrl = pingEndpoints[(attempts - 1) % pingEndpoints.length];
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(targetUrl, { 
            cache: 'no-store',
            signal: controller.signal 
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            isHealthy = true;
            sessionStorage.setItem('backendAwakeTimestamp', Date.now().toString());
            break;
          }
        } catch (e) {
          if (!navigator.onLine) {
            setAppError('You appear to be offline. Please check your internet connection.');
            setAppState('ERROR');
            return;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    setIsServerAwake(true);
    sessionStorage.setItem('backendAwakeTimestamp', Date.now().toString());

    try {
      await loadAllDataInternal(storedToken);
      setAppState('READY');
    } catch (e) {
      if (e.message && e.message.includes('401')) {
        console.warn('Session expired (401). Logging out.');
        logout();
        return;
      }
      console.error('Initial data loading failed:', e);
      // If we have cached data, display it instead of hard error screen
      if (hasCache) {
        setAppState('READY');
      } else {
        setAppError('Backend server connection timed out or is warming up. Please check your connection or click Retry.');
      }
    }
  }, []);

  useEffect(() => {
    startBackendCheckAndInitialization();
  }, [startBackendCheckAndInitialization]);

  const loadAllData = async () => {
    try {
      await loadAllDataInternal(token);
    } catch (e) {
      if (e.message && e.message.includes('401')) {
        logout();
        return;
      }
      console.error('Data refresh failed:', e);
      setAppError('Failed to refresh data. Please try again.');
      setAppState('ERROR');
    }
  };

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  const login = async (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('mymoney_token', userToken);
    localStorage.setItem('mymoney_user', JSON.stringify(userData));
    sessionStorage.setItem('backendAwakeTimestamp', Date.now().toString());
    setIsAuthModalOpen(false);
    setAppState('READY');

    try {
      await loadAllDataInternal(userToken);
    } catch (e) {
      if (e.message && e.message.includes('401')) {
        logout();
        return;
      }
      console.warn('Login background data load had issues:', e);
    }
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('mymoney_token');
    localStorage.removeItem('mymoney_user');
    
    setExpenses([]);
    setCategories([]);
    setPaymentMethods(DEFAULT_PAYMENT_METHODS);
    setBudgets([]);
    setSavingsGoals([]);
    setDailyProfits([]);
    setProfitSummary(null);
    setTasks([]);
    setSharingList([]);
    setAuditLogs([]);

    localStorage.removeItem('mymoney_cache');
    sessionStorage.removeItem('isBackendAwake');

    setIsAuthModalOpen(true);
    setAppState('READY');
  };

  const showConfirm = (message, title = 'Confirm Action', confirmText = 'Confirm', isDanger = true) => {
    return new Promise((resolve) => {
      setConfirmState({ isOpen: true, title, message, confirmText, isDanger, resolve });
    });
  };

  const handleConfirmClose = (result) => {
    if (confirmState.resolve) confirmState.resolve(result);
    setConfirmState(prev => ({ ...prev, isOpen: false, resolve: null }));
  };

  const refreshPocketMoney = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/pocket-money`);
      if (res.ok) {
        const data = await res.json();
        setPocketMoneyData(data);
      }
    } catch (e) {
      console.warn('Failed to refresh pocket money:', e);
    }
  };

  return (
    <AppContext.Provider value={{
      appState, setAppState,
      appError, setAppError,
      retryConnection: startBackendCheckAndInitialization,
      token, user, setUser, login, logout,
      activeTab, setActiveTab,
      theme, toggleTheme,
      activeOwner, setActiveOwner,
      expenses, setExpenses,
      categories, setCategories,
      paymentMethods, setPaymentMethods,
      budgets, setBudgets,
      pocketMoneyData, setPocketMoneyData, refreshPocketMoney,
      savingsGoals, setSavingsGoals,
      dailyProfits, setDailyProfits,
      profitSummary, setProfitSummary,
      tasks, setTasks,
      sharingList, setSharingList,
      sharedByList, setSharedByList,
      auditLogs, setAuditLogs,
      isOffline,
      isServerAwake, setIsServerAwake,
      isVoiceModalOpen, setIsVoiceModalOpen,
      isAuthModalOpen, setIsAuthModalOpen,
      settings, setSettings,
      showConfirm, confirmState, handleConfirmClose,
      isMobileMenuOpen, setIsMobileMenuOpen,
      loadAllData
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
