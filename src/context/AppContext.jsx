import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE, fetchWithAuth } from '../api';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('mymoney_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('mymoney_user') || 'null'));
  const [activeTab, setActiveTab] = useState('dashboard');
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
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [dailyProfits, setDailyProfits] = useState(cachedData.dailyProfits || []);
  const [profitSummary, setProfitSummary] = useState(cachedData.profitSummary || { total_profit: 0, profitable_days: 0, loss_days: 0, average_daily_profit: 0 });
  const [tasks, setTasks] = useState(cachedData.tasks || []);
  const [sharingList, setSharingList] = useState([]);
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

  const loadAllDataInternal = async (authToken = token) => {
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    
    // Fetch all required data concurrently to eliminate the 2-3 second delay
    const [expRes, budRes, profRes, profSumRes, tasksRes, auditRes] = await Promise.all([
      fetchWithAuth(`${API_BASE}/expenses`, { headers }),
      fetchWithAuth(`${API_BASE}/budgets`, { headers }),
      fetchWithAuth(`${API_BASE}/profit`, { headers }),
      fetchWithAuth(`${API_BASE}/profit/summary`, { headers }),
      fetchWithAuth(`${API_BASE}/tasks`, { headers }),
      fetchWithAuth(`${API_BASE}/audit-logs`, { headers })
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

    localStorage.setItem('mymoney_cache', JSON.stringify({
      expenses: _expenses,
      budgets: _budgets,
      dailyProfits: _dailyProfits,
      profitSummary: _profitSummary,
      tasks: _tasks,
      auditLogs: _auditLogs
    }));
  };

  const startBackendCheckAndInitialization = useCallback(async () => {
    const isAwake = sessionStorage.getItem('isBackendAwake') === 'true';
    const hasCache = !!localStorage.getItem('mymoney_cache');
    
    setAppState(prev => {
      if (prev === 'READY' && isAwake && hasCache) return 'READY';
      return 'INITIALIZING';
    });
    setAppError(null);

    const rootUrl = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;
    const healthUrl = `${rootUrl}/health`;

    let isHealthy = false;
    let attempts = 0;
    
    // Check if we recently verified the backend is awake to skip the health poll loop on refresh
    const isRecentlyAwake = sessionStorage.getItem('isBackendAwake') === 'true';

    if (isRecentlyAwake) {
      isHealthy = true;
    } else {
      // Retry checking /health until backend responds 200 OK
      while (!isHealthy && attempts < 40) {
        attempts++;
        try {
          const res = await fetch(healthUrl, { cache: 'no-store' });
          if (res.ok) {
            isHealthy = true;
            sessionStorage.setItem('isBackendAwake', 'true');
            break;
          }
        } catch (e) {
          // Backend cold start in progress
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!isHealthy) {
      setAppError('Backend server failed to respond within timeout. Please click Retry.');
      setAppState('ERROR');
      return;
    }

    setIsServerAwake(true);

    const storedToken = localStorage.getItem('mymoney_token');
    if (!storedToken) {
      setIsAuthModalOpen(true);
      setAppState('READY');
      return;
    }

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
      setAppError('Failed to load dashboard data. Please try again.');
      setAppState('ERROR');
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
    setIsAuthModalOpen(false);

    setAppState('INITIALIZING');
    try {
      await loadAllDataInternal(userToken);
      setAppState('READY');
    } catch (e) {
      if (e.message && e.message.includes('401')) {
        logout();
        return;
      }
      console.error('Login data load failed:', e);
      setAppError('Failed to load dashboard data after login. Please refresh.');
      setAppState('ERROR');
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
      token, user, login, logout,
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
