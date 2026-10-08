import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE, fetchWithAuth } from '../api';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('mymoney_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('mymoney_user') || 'null') || { name: 'kv', email: 'kv@example.com' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('mymoney_theme') || 'light');
  const [activeOwner, setActiveOwner] = useState(null);

  // Collections
  const [expenses, setExpenses] = useState([
    { id: '1', title: 'Milk Bikies Biscuit', category: 'Food', payment_method: 'Cash', date: '2026-10-07', amount: 10 },
    { id: '2', title: 'Rent', category: 'Rent', payment_method: 'Unknown', date: '2026-10-07', amount: 1888.89 },
    { id: '3', title: 'Fruit juice', category: 'Food', payment_method: 'Not specified', date: '2026-10-07', amount: 35 },
    { id: '4', title: 'Dinner - rice with chicken curry', category: 'Food', payment_method: 'Not specified', date: '2026-10-07', amount: 75 },
    { id: '5', title: 'Petrol', category: 'Fuel', payment_method: 'UPI', date: '2026-10-06', amount: 100 }
  ]);
  const [categories, setCategories] = useState([
    { name: 'Food', color: '#ef4444' },
    { name: 'Travel', color: '#10b981' },
    { name: 'Fuel', color: '#6366f1' },
    { name: 'Rent', color: '#8b5cf6' },
    { name: 'Utilities', color: '#eab308' },
    { name: 'Other', color: '#64748b' }
  ]);
  const [paymentMethods, setPaymentMethods] = useState(['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer']);
  const [budgets, setBudgets] = useState([
    { id: 'b1', category: 'Food Budget', amount: 1500, spent: 980 }
  ]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [dailyProfits, setDailyProfits] = useState([]);
  const [profitSummary, setProfitSummary] = useState({ total_profit: 0, profitable_days: 0, loss_days: 0, average_daily_profit: 0 });
  const [tasks, setTasks] = useState([
    { id: 't1', title: 'Week 1', category: 'Work', priority: 'MEDIUM', status: 'Overdue', due_date: '30/06/2026', progress: 33, items: [{ text: 'Git', done: true }, { text: 'antigravity cli', done: false }, { text: 'plugins', done: false }] },
    { id: 't2', title: 'SEM 5', category: 'Study', priority: 'HIGH', status: 'Overdue', due_date: '29/06/2026 - 02/07/2026', progress: 0, items: [{ text: 'SDEPS', done: false }, { text: 'IoT Record', done: false }, { text: 'DC', done: false }] }
  ]);
  const [sharingList, setSharingList] = useState([
    { id: 's1', shared_with_email: 'keerthivasan@gmail.com' },
    { id: 's2', shared_with_email: 'nilaaguna23@gmail.com' }
  ]);
  const [auditLogs, setAuditLogs] = useState([
    { id: 'a1', action: 'expense deleted', text: "Deleted expense 'Daily Profit' of amount 220.0.", date: '10/8/2026, 6:02:24 AM' },
    { id: 'a2', action: 'expense created', text: "Added expense 'Paneer Gravy, Naan' of amount 160.0 in Food.", date: '10/7/2026, 4:51:06 PM' }
  ]);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isServerAwake, setIsServerAwake] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Confirm Modal state
  const [confirmState, setConfirmState] = useState({
    isOpen: false, title: '', message: '', confirmText: 'Confirm', isDanger: true, resolve: null
  });

  const [settings, setSettings] = useState({ currency: '₹', timezone: 'UTC' });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('mymoney_theme', theme);
  }, [theme]);

  // Only load data when BOTH token exists AND server is confirmed awake
  useEffect(() => {
    if (token && isServerAwake) loadAllData();
  }, [token, isServerAwake]);

  const loadAllData = async () => {
    try {
      const expRes = await fetchWithAuth(`${API_BASE}/expenses`);
      if (expRes.ok) setExpenses(await expRes.json());

      const budRes = await fetchWithAuth(`${API_BASE}/budgets`);
      if (budRes.ok) setBudgets(await budRes.json());

      const profRes = await fetchWithAuth(`${API_BASE}/profit`);
      if (profRes.ok) {
        const data = await profRes.json();
        setDailyProfits(data.records || []);
      }

      const profSumRes = await fetchWithAuth(`${API_BASE}/profit/summary`);
      if (profSumRes.ok) setProfitSummary(await profSumRes.json());
    } catch (err) {
      // Suppress initial NetworkError during wake-up to keep console clean
      if (err.name !== 'TypeError' || err.message !== 'NetworkError when attempting to fetch resource.') {
        console.warn('Backend loading warning:', err);
      }
    }
  };

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('mymoney_token', userToken);
    localStorage.setItem('mymoney_user', JSON.stringify(userData));
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('mymoney_token');
    localStorage.removeItem('mymoney_user');
    
    // Clear all sensitive data to prevent flash/leakage to next user
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
