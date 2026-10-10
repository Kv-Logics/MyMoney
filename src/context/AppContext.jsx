import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE, fetchWithAuth } from '../api';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('mymoney_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('mymoney_user') || 'null'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('mymoney_theme') || 'light');
  const [activeOwner, setActiveOwner] = useState(null);

  // System Design Readiness Enum: 'INITIALIZING' | 'READY' | 'ERROR'
  const [appState, setAppState] = useState('INITIALIZING');
  const [appError, setAppError] = useState(null);

  // Collections
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([
    { name: 'Food', color: '#ef4444' },
    { name: 'Travel', color: '#10b981' },
    { name: 'Fuel', color: '#6366f1' },
    { name: 'Rent', color: '#8b5cf6' },
    { name: 'Utilities', color: '#eab308' },
    { name: 'Other', color: '#64748b' }
  ]);
  const [paymentMethods, setPaymentMethods] = useState(['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer']);
  const [budgets, setBudgets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [dailyProfits, setDailyProfits] = useState([]);
  const [profitSummary, setProfitSummary] = useState({ total_profit: 0, profitable_days: 0, loss_days: 0, average_daily_profit: 0 });
  const [tasks, setTasks] = useState([]);
  const [sharingList, setSharingList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isServerAwake, setIsServerAwake] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(!localStorage.getItem('mymoney_token'));

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
    try {
      const expRes = await fetchWithAuth(`${API_BASE}/expenses`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      if (expRes.ok) {
        const expData = await expRes.json();
        setExpenses(Array.isArray(expData) ? expData : []);
      }

      const budRes = await fetchWithAuth(`${API_BASE}/budgets`);
      if (budRes.ok) setBudgets(await budRes.json());

      const profRes = await fetchWithAuth(`${API_BASE}/profit`);
      if (profRes.ok) {
        const data = await profRes.json();
        setDailyProfits(data.records || []);
      }

      const profSumRes = await fetchWithAuth(`${API_BASE}/profit/summary`);
      if (profSumRes.ok) setProfitSummary(await profSumRes.json());
      
      const tasksRes = await fetchWithAuth(`${API_BASE}/tasks`);
      if (tasksRes.ok) setTasks(await tasksRes.json());
      
      const auditRes = await fetchWithAuth(`${API_BASE}/audit-logs`);
      if (auditRes.ok) setAuditLogs(await auditRes.json());
    } catch (err) {
      console.warn('Data loading error:', err);
    }
  };

  const startBackendCheckAndInitialization = useCallback(async () => {
    setAppState('INITIALIZING');
    setAppError(null);

    const rootUrl = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;
    const healthUrl = `${rootUrl}/health`;

    let isHealthy = false;
    let attempts = 0;

    // Retry checking /health until backend responds 200 OK
    while (!isHealthy && attempts < 40) {
      attempts++;
      try {
        const res = await fetch(healthUrl, { cache: 'no-store' });
        if (res.ok) {
          isHealthy = true;
          break;
        }
      } catch (e) {
        // Backend cold start in progress
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
      setAppState('READY');
    }
  }, []);

  useEffect(() => {
    startBackendCheckAndInitialization();
  }, [startBackendCheckAndInitialization]);

  const loadAllData = async () => {
    try {
      await loadAllDataInternal(token);
    } catch (e) {
      console.warn(e);
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
    await loadAllDataInternal(userToken);
    setAppState('READY');
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
      loadAllData
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
