import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { Orders } from './pages/Orders';
import { Payments } from './pages/Payments';
import { Installments } from './pages/Installments';
import { Expenses } from './pages/Expenses';
import { Lock } from './pages/Lock';
import { ExchangeRates } from './pages/ExchangeRates';
import { Reports } from './pages/Reports';
import { Users } from './pages/Users';
import { Roles } from './pages/Roles';
import { AuditLog } from './pages/AuditLog';
import { Settings } from './pages/Settings';
import { ShieldOff } from 'lucide-react';
import { CashRegisterProvider } from './contexts/CashRegisterContext';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { TitleBar } from './components/layout/TitleBar';

type Page =
  | 'dashboard' | 'orders' | 'customers' | 'payments'
  | 'installments' | 'expenses' | 'lock' | 'reports'
  | 'exchange_rates' | 'users' | 'roles' | 'audit_log' | 'settings';

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  customers: 'Customers',
  payments: 'Payments',
  installments: 'Installments',
  expenses: 'Expenses',
  lock: 'Cash Register',
  reports: 'Reports',
  exchange_rates: 'Exchange Rates',
  users: 'Users',
  roles: 'Roles & Permissions',
  audit_log: 'Audit Log',
  settings: 'Settings',
};

const PAGE_PERMISSION: Partial<Record<Page, { module: string; action: string }>> = {
  orders: { module: 'orders', action: 'read' },
  customers: { module: 'customers', action: 'read' },
  payments: { module: 'payments', action: 'read' },
  installments: { module: 'installments', action: 'read' },
  expenses: { module: 'expenses', action: 'read' },
  lock: { module: 'lock', action: 'read' },
  reports: { module: 'reports', action: 'read' },
  exchange_rates: { module: 'exchange_rates', action: 'read' },
  users: { module: 'users', action: 'read' },
  roles: { module: 'roles', action: 'read' },
  audit_log: { module: 'audit_logs', action: 'read' },
  dashboard: { module: 'audit_logs', action: 'read' },
}
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <ShieldOff size={28} className="text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Access Denied</h2>
      <p className="text-sm text-gray-400 max-w-xs">You don't have permission to view this page. Contact your administrator to request access.</p>
    </div>
  );
}

function AppContent() {
  const { user, profile, loading, hasPermission } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = (location.pathname.replace('/', '') || 'dashboard') as Page;
  const setActivePage = (page: string) => navigate(`/${page}`);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Login />;
  }

  const canAccessPage = (page: Page): boolean => {
    const perm = PAGE_PERMISSION[page];
    if (!perm) return true; // ← dashboard has no perm so always returns true
    return hasPermission(perm.module, perm.action);
  };

  const renderPage = () => {
    if (!canAccessPage(activePage)) return <AccessDenied />;
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'orders': return <Orders />;
      case 'customers': return <Customers />;
      case 'payments': return <Payments />;
      case 'installments': return <Installments />;
      case 'expenses': return <Expenses />;
      case 'lock': return <Lock />;
      case 'reports': return <Reports />;
      case 'exchange_rates': return <ExchangeRates />;
      case 'users': return <Users />;
      case 'roles': return <Roles />;
      case 'audit_log': return <AuditLog />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
    <TitleBar />
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar
          activePage={activePage}
          onNavigate={(page) => setActivePage(page)}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(prev => !prev)}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            title={PAGE_TITLES[activePage]}
            onMenuToggle={() => setSidebarOpen(prev => !prev)}
          />
          <main className="flex-1 overflow-y-auto">
            {renderPage()}
          </main>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <CashRegisterProvider>
            <AppContent />
          </CashRegisterProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
