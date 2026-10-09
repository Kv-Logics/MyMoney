import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import VoiceAgentPage from './components/VoiceAgentPage';
import Expenses from './components/Expenses';
import BudgetsAndSavings from './components/BudgetsAndSavings';
import ProfitTracker from './components/ProfitTracker';
import TasksPage from './components/TasksPage';
import ReportsPage from './components/ReportsPage';
import SharingPage from './components/SharingPage';
import AuditLogPage from './components/AuditLogPage';
import SettingsPage from './components/SettingsPage';
import ServerWakeupOverlay from './components/ServerWakeupOverlay';
import ConfirmModal from './components/ConfirmModal';
import AuthModal from './components/AuthModal';
import ResetPasswordStandalone from './components/ResetPasswordStandalone';

function MainContent() {
  const { activeTab } = useApp();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Server Wakeup Particle Loading Animation */}
      <ServerWakeupOverlay />

      {/* Sidebar */}
      <Sidebar />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onOpenExpenseModal={() => setIsExpenseModalOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'dashboard' && (
            <Dashboard
              onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
              onOpenProfitModal={() => setIsProfitModalOpen(true)}
            />
          )}

          {activeTab === 'ai-agent' && <VoiceAgentPage />}

          {activeTab === 'expenses' && (
            <Expenses
              isModalOpen={isExpenseModalOpen}
              setIsModalOpen={setIsExpenseModalOpen}
            />
          )}

          {activeTab === 'profit' && (
            <ProfitTracker
              isModalOpen={isProfitModalOpen}
              setIsModalOpen={setIsProfitModalOpen}
            />
          )}

          {activeTab === 'budgets' && <BudgetsAndSavings />}
          {activeTab === 'tasks' && <TasksPage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'sharing' && <SharingPage />}
          {activeTab === 'audit-log' && <AuditLogPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Custom Confirmation Dialog Modal */}
      <ConfirmModal />
      <AuthModal />
    </div>
  );
}

export default function App() {
  if (window.location.pathname === '/reset-pass') {
    return (
      <AppProvider>
        <ResetPasswordStandalone />
        <AuthModal />
      </AppProvider>
    );
  }

  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
