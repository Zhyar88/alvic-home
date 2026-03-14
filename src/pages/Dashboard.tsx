import React, { useEffect, useState } from 'react';
import { ShoppingBag, Users, DollarSign, AlertCircle, TrendingUp, Clock, CheckCircle, Package } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Badge, OrderStatusBadge } from '../components/ui/Badge';
import type { Order } from '../types';
import { supabase } from '../lib/database';

interface Stats {
  totalOrders: number;
  activeOrders: number;
  totalRevenue: number;
  pendingInstallments: number;
  overdueInstallments: number;
  cashSales: number;
  installmentSales: number;
  todayRevenue: number;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  trend?: string;
}

function StatCard({ title, value, icon, color, bgColor, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {trend && <p className="text-xs text-gray-400 mt-1">{trend}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const statusLabels: Record<string, string> = {
    draft: t('draft'),
    approved: t('approved'),
    deposit_paid: t('deposit_paid'),
    in_production: t('in_production'),
    ready: t('ready'),
    installed: t('installed'),
    finished: t('finished'),
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const thisMonth = today.substring(0, 7);

        const [ordersRes, paymentsRes, installmentsRes] = await Promise.all([
          supabase.from('orders').select('id, status, sale_type, final_total_usd, created_at'),
          supabase.from('payments').select('amount_usd, payment_date, payment_type').eq('is_reversed', false),
          supabase.from('installment_entries').select('status').in('status', ['unpaid', 'overdue', 'partial']),
        ]);

        const orders = ordersRes.data || [];
        const payments = paymentsRes.data || [];
        const installments = installmentsRes.data || [];

        const activeStatuses = ['approved', 'deposit_paid', 'in_production', 'ready', 'installed'];
        const todayPayments = payments.filter(p => p.payment_date === today);

        setStats({
          totalOrders: orders.length,
          activeOrders: orders.filter(o => activeStatuses.includes(o.status)).length,
          totalRevenue: payments.filter(p => p.payment_type !== 'reversal').reduce((s, p) => s + Number(p.amount_usd || 0), 0),
          todayRevenue: todayPayments.filter(p => p.payment_type !== 'reversal').reduce((s, p) => s + Number(p.amount_usd || 0), 0),
          pendingInstallments: installments.filter(i => i.status === 'unpaid' || i.status === 'partial').length,
          overdueInstallments: installments.filter(i => i.status === 'overdue').length,
          cashSales: orders.filter(o => o.sale_type === 'cash').length,
          installmentSales: orders.filter(o => o.sale_type === 'installment').length,
          
        });

        const { data: recentData } = await supabase
          .from('orders')
          .select('*, customer:customers(full_name_en, full_name_ku)')
          .order('created_at', { ascending: false })
          .limit(6);

        setRecentOrders((recentData || []) as Order[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {t('welcome')}, {language === 'ku' ? profile?.full_name_ku : profile?.full_name_en} 👋
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-28 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
              <div className="h-7 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={t('totalOrders')}
              value={String(stats.totalOrders)}
              icon={<ShoppingBag size={20} className="text-emerald-700" />}
              color="text-emerald-800"
              bgColor="bg-emerald-50"
              trend={`${stats.cashSales} cash · ${stats.installmentSales} installment`}
            />
            <StatCard
              title={t('activeOrders')}
              value={String(stats.activeOrders)}
              icon={<Package size={20} className="text-blue-600" />}
              color="text-blue-700"
              bgColor="bg-blue-50"
            />
            <StatCard
              title={t('totalRevenue')}
              value={fmt(stats.totalRevenue)}
              icon={<DollarSign size={20} className="text-amber-600" />}
              color="text-amber-700"
              bgColor="bg-amber-50"
              trend={`Today: ${fmt(stats.todayRevenue)}`}
            />
            <StatCard
              title={t('pendingInstallments')}
              value={String(stats.pendingInstallments)}
              icon={<Clock size={20} className="text-orange-500" />}
              color="text-orange-600"
              bgColor="bg-orange-50"
            />
            <StatCard
              title={t('overdueInstallments')}
              value={String(stats.overdueInstallments)}
              icon={<AlertCircle size={20} className="text-red-500" />}
              color="text-red-600"
              bgColor="bg-red-50"
            />
            <StatCard
              title={t('cashSales')}
              value={String(stats.cashSales)}
              icon={<TrendingUp size={20} className="text-teal-600" />}
              color="text-teal-700"
              bgColor="bg-teal-50"
            />
            <StatCard
              title={t('installmentSales')}
              value={String(stats.installmentSales)}
              icon={<CheckCircle size={20} className="text-violet-500" />}
              color="text-violet-700"
              bgColor="bg-violet-50"
            />
            <StatCard
              title={t('customers')}
              value="—"
              icon={<Users size={20} className="text-rose-500" />}
              color="text-rose-600"
              bgColor="bg-rose-50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{t('recentOrders')}</h3>
              <button onClick={() => onNavigate('orders')} className="text-sm text-emerald-700 hover:text-emerald-800 font-medium">
                {t('viewAll')}
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('orderNumber')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('customer')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('status')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('saleType')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('finalTotal')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t('date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentOrders.map(order => (
                      <tr key={order.id} className="hover:bg-emerald-50/20 transition-colors cursor-pointer" onClick={() => onNavigate('orders')}>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-emerald-700">{order.order_number}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {language === 'ku' ? (order.customer as Record<string, string>)?.full_name_ku : (order.customer as Record<string, string>)?.full_name_en || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <OrderStatusBadge status={order.status} label={statusLabels[order.status] || order.status} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={order.sale_type === 'cash' ? 'info' : 'warning'}>
                            {order.sale_type === 'cash' ? t('cash') : t('installment')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{fmt(order.final_total_usd)}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {recentOrders.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{t('noData')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
