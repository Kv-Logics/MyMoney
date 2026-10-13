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
  const [categories, setCategories] = useState([
    { name: 'Food', color: '#ef4444' },
    { name: 'Travel', color: '#10b981' },
    { name: 'Fuel', color: '#6366f1' },
    { name: 'Rent', color: '#8b5cf6' },
    { name: 'Utilities', color: '#eab308' },
    { name: 'Other', color: '#64748b' }
  ]);
  const [paymentMethods, setPaymentMethods] = useState(['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer']);
  const [budgets, setBudgets] = useState(cachedData.budgets || []);
  const [savingsGoals, setSavingsGoals] = useState(cachedData.savingsGoals || []);
  const [dailyProfits, setDailyProfits] = useState(cachedData.dailyProfits || []);
  const [profitSummary, setProfitSummary] = useState(cachedData.profitSummary || { total_profit: 0, profitable_days: 0, loss_days: 0, average_daily_profit: 0 });
  const [tasks, setTasks] = useState(cachedData.tasks || []);
  const [sharingList, setSharingList] = useState(cachedData.sharingList || []);
  const [sharedByList, setSharedByList] = useState(cachedData.sharedByList || []);
  const [auditLogs, setAuditLogs] = useState(cachedData.auditLogs || []);

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
    
    // Fetch all required data concurrently to eliminate the delay
    const [expRes, budRes, profRes, profSumRes, tasksRes, auditRes, savRes, shareWithRes, shareByRes] = await Promise.all([
      fetchWithAuth(`${API_BASE}/expenses`, { headers }),
      fetchWithAuth(`${API_BASE}/budgets`, { headers }),
      fetchWithAuth(`${API_BASE}/profit`, { headers }),
      fetchWithAuth(`${API_BASE}/profit/summary`, { headers }),
      fetchWithAuth(`${API_BASE}/tasks`, { headers }),
      fetchWithAuth(`${API_BASE}/audit-logs`, { headers }),
      fetchWithAuth(`${API_BASE}/savings`, { headers }),
      fetchWithAuth(`${API_BASE}/sharing/shared-with`, { headers }),
      fetchWithAuth(`${API_BASE}/sharing/shared-by`, { headers })
    ]);

    if (!expRes.ok) throw new Error(`Expenses API failed: ${expRes.status}`);
    const expData = await expRes.json();
    const _expenses = Array.isArray(expData) ? expData : [];
    setExpenses(_expenses);

    if (!budRes.ok) throw new Error(`Budgets API failed: ${budRes.status}`);
    const _budgets = await budRes.json();
    setBudgets(_budgets);

    if (!profRes.ok) throw new Error(`Profit API failed: ${profRes.status}`);
    const profData = await profRes.json();
    const _dailyProfits = profData.records || [];
    setDailyProfits(_dailyProfits);

    if (!profSumRes.ok) throw new Error(`Profit Summary API failed: ${profSumRes.status}`);
    const _profitSummary = await profSumRes.json();
    setProfitSummary(_profitSummary);
    
    // Optional endpoints
    const _tasks = tasksRes.ok ? await tasksRes.json() : [];
    if (tasksRes.ok) setTasks(_tasks);

    const _auditLogs = auditRes.ok ? await auditRes.json() : [];
    if (auditRes.ok) setAuditLogs(_auditLogs);

    const _savingsGoals = savRes.ok ? await savRes.json() : [];
    if (savRes.ok) setSavingsGoals(_savingsGoals);

    const _sharingList = shareWithRes.ok ? await shareWithRes.json() : [];
    if (shareWithRes.ok) setSharingList(_sharingList);

    const _sharedByList = shareByRes.ok ? await shareByRes.json() : [];
    if (shareByRes.ok) setSharedByList(_sharedByList);

    localStorage.setItem('mymoney_cache', JSON.stringify({
      expenses: _expenses,
      budgets: _budgets,
      dailyProfits: _dailyProfits,
      profitSummary: _profitSummary,
      tasks: _tasks,
      auditLogs: _auditLogs,
      savingsGoals: _savingsGoals,
      sharingList: _sharingList,
      sharedByList: _sharedByList
    }));
  };

  const startBackendCheckAndInitialization = useCallback(async () => {
    const isAwake = sessionStorage.getItem('isBackendAwake') === 'true';
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

    setAppState(prev => {
      if (prev === 'READY' && isAwake && hasCache) return 'READY';
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
    let adblockDetected = false;
    
    // Check if we recently verified the backend is awake to skip the health poll loop on refresh
    const isRecentlyAwake = sessionStorage.getItem('isBackendAwake') === 'true';

    if (isRecentlyAwake) {
      isHealthy = true;
    } else {
      // Retry checking until backend responds 200 OK or adblocker detected
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
            sessionStorage.setItem('isBackendAwake', 'true');
            break;
          }
        } catch (e) {
          // If the request was immediately blocked (Adblocker error)
          if (e.name !== 'AbortError' && attempts <= 3) {
            // Check if user is offline or adblocker is intercepting
            if (!navigator.onLine) {
              setAppError('You appear to be offline. Please check your internet connection.');
              setAppState('ERROR');
              return;
            }
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    // If pings failed but user has token, don't trap them forever; attempt data load directly
    if (!isHealthy) {
      console.warn('Backend pings timed out or were blocked by adblocker. Attempting direct data load.');
    }

    setIsServerAwake(true);
    sessionStorage.setItem('isBackendAwake', 'true');

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
        setAppError('Backend server connection timed out or is blocked by an adblocker. Please allow mymoney-jd0n.onrender.com or click Retry.');
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
    sessionStorage.setItem('isBackendAwake', 'true');
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
    setPaymentMethods([]);
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
