import React from 'react';
import logoUrl from '../../assets/logo.png';
import {
  LayoutDashboard, ShoppingBag, Users, CreditCard, CalendarDays,
  Receipt, Lock, BarChart3, UserCog, Shield, ClipboardList,
  TrendingUp, Menu, X, LogOut, ChevronDown, Settings
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  key: string;
  icon: React.ReactNode;
  labelKey: string;
  permission?: { module: string; action: string };
  children?: { key: string; labelKey: string }[];
}

const navItems: NavItem[] = [
  { key: 'dashboard', icon: <LayoutDashboard size={18} />, labelKey: 'dashboard' },
  { key: 'customers', icon: <Users size={18} />, labelKey: 'customers', permission: { module: 'customers', action: 'read' } },
  { key: 'orders', icon: <ShoppingBag size={18} />, labelKey: 'orders', permission: { module: 'orders', action: 'read' } },
  { key: 'payments', icon: <CreditCard size={18} />, labelKey: 'payments', permission: { module: 'payments', action: 'read' } },
  { key: 'installments', icon: <CalendarDays size={18} />, labelKey: 'installments', permission: { module: 'installments', action: 'read' } },
  { key: 'expenses', icon: <Receipt size={18} />, labelKey: 'expenses', permission: { module: 'expenses', action: 'read' } },
  { key: 'lock', icon: <Lock size={18} />, labelKey: 'lock', permission: { module: 'lock', action: 'read' } },
  { key: 'reports', icon: <BarChart3 size={18} />, labelKey: 'reports', permission: { module: 'reports', action: 'read' } },
  { key: 'exchange_rates', icon: <TrendingUp size={18} />, labelKey: 'exchangeRates', permission: { module: 'exchange_rates', action: 'read' } },
  { key: 'users', icon: <UserCog size={18} />, labelKey: 'users', permission: { module: 'users', action: 'read' } },
  { key: 'roles', icon: <Shield size={18} />, labelKey: 'roles', permission: { module: 'roles', action: 'read' } },
  { key: 'audit_log', icon: <ClipboardList size={18} />, labelKey: 'auditLog', permission: { module: 'audit_logs', action: 'read' } },
  { key: 'settings', icon: <Settings size={18} />, labelKey: 'settings' },
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ activePage, onNavigate, isOpen, onToggle }: SidebarProps) {
  const { t } = useLanguage();
  const { profile, hasPermission, signOut } = useAuth();

  const filteredItems = navItems.filter(item =>
    !item.permission || hasPermission(item.permission.module, item.permission.action)
  );

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={onToggle} />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 flex flex-col w-64 bg-white border-r border-gray-100 shadow-lg lg:shadow-sm transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="Alvic Home"
              className="h-10 w-auto"
            />
          </div>
          <button onClick={onToggle} className="lg:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {filteredItems.map(item => (
            <button
              key={item.key}
              onClick={() => { onNavigate(item.key); if (window.innerWidth < 1024) onToggle(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                activePage === item.key
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className={activePage === item.key ? 'text-white' : 'text-gray-400'}>
                {item.icon}
              </span>
              {t(item.labelKey as Parameters<typeof t>[0])}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">
                {profile?.full_name_en?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name_en || 'User'}</p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role || ''}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} />
            {t('logout')}
          </button>
        </div>
      </aside>
    </>
  );
}
