import React, { useEffect, useState, useCallback } from 'react';
import { Search, Shield } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Pagination } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import type { AuditLog as AuditLogType } from '../types';
import { supabase } from '../lib/database';

const PAGE_SIZE = 25;

const MODULE_COLORS: Record<string, string> = {
  orders: 'info', payments: 'success', installments: 'warning', customers: 'neutral',
  expenses: 'error', exchange_rates: 'warning', roles: 'info', users: 'neutral',
};

export function AuditLog() {
  const { t, language } = useLanguage();
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [selected, setSelected] = useState<AuditLogType | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('audit_logs').select('*', { count: 'exact' });
    if (search) query = query.or(`action.ilike.%${search}%,user_name_en.ilike.%${search}%`);
    if (filterModule !== 'all') query = query.eq('module', filterModule);
    if (filterDate) query = query.gte('created_at', filterDate).lte('created_at', filterDate + 'T23:59:59');
    const from = (page - 1) * PAGE_SIZE;
    const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    setLogs((data || []) as AuditLogType[]);
    setTotal(count || 0);
    setLoading(false);
  }, [search, filterModule, filterDate, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [search, filterModule, filterDate]);

  const modules = ['orders', 'payments', 'installments', 'customers', 'expenses', 'exchange_rates', 'roles', 'users', 'lock'];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search audit logs..." className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
        </div>
        <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
          <option value="all">All Modules</option>
          {modules.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none" />
      </div>

      <p className="text-sm text-gray-500">{total} audit entries</p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['timestamp', 'User', 'action', 'module', 'record', 'details'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">{t('noData')}</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelected(log)}>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{language === 'ku' ? log.user_name_ku : log.user_name_en}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{log.action}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={MODULE_COLORS[log.module] as 'info' | 'success' | 'warning' | 'neutral' | 'error' || 'neutral'}>
                    {log.module}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.record_id?.substring(0, 8) || '—'}...</td>
                <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">
                  {Object.keys(log.new_values || {}).length > 0 ? JSON.stringify(log.new_values).substring(0, 60) + '...' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-emerald-700" />
                <h3 className="font-bold text-gray-900">{t('auditLog')} Detail</h3>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">×</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-gray-400">Action</p><p className="font-mono font-bold text-amber-700">{selected.action}</p></div>
                <div><p className="text-xs text-gray-400">Module</p><Badge variant={MODULE_COLORS[selected.module] as 'info' || 'neutral'}>{selected.module}</Badge></div>
                <div><p className="text-xs text-gray-400">User</p><p className="font-medium">{selected.user_name_en}</p></div>
                <div><p className="text-xs text-gray-400">Time</p><p className="text-gray-700">{new Date(selected.created_at).toLocaleString()}</p></div>
              </div>
              {Object.keys(selected.old_values || {}).length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">{t('oldValue')}</p>
                  <pre className="bg-red-50 rounded-lg p-3 text-xs text-red-700 overflow-x-auto">{JSON.stringify(selected.old_values, null, 2)}</pre>
                </div>
              )}
              {Object.keys(selected.new_values || {}).length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">{t('newValue')}</p>
                  <pre className="bg-emerald-50 rounded-lg p-3 text-xs text-emerald-700 overflow-x-auto">{JSON.stringify(selected.new_values, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
