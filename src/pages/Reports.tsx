import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, DollarSign, AlertCircle, Users, Lock, Clock, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

type ReportType = 'daily' | 'monthly' | 'outstanding' | 'profit' | 'expenses' | 'cash_vs_installment' | 'sales_employee' | 'lock_summary' | 'aging';

const reportCardDefs = [
  { id: 'daily' as ReportType, icon: <Calendar size={20} />, titleKey: 'dailyRevenue', descKey: 'dailyRevenueDesc', color: 'bg-blue-50 text-blue-600' },
  { id: 'monthly' as ReportType, icon: <TrendingUp size={20} />, titleKey: 'monthlyRevenue', descKey: 'monthlyRevenueDesc', color: 'bg-emerald-50 text-emerald-600' },
  { id: 'outstanding' as ReportType, icon: <AlertCircle size={20} />, titleKey: 'outstandingInstallments', descKey: 'outstandingInstallmentsDesc', color: 'bg-red-50 text-red-600' },
  { id: 'profit' as ReportType, icon: <DollarSign size={20} />, titleKey: 'profitPerProject', descKey: 'profitPerProjectDesc', color: 'bg-amber-50 text-amber-600' },
  { id: 'expenses' as ReportType, icon: <Package size={20} />, titleKey: 'expenseBreakdown', descKey: 'expenseBreakdownDesc', color: 'bg-orange-50 text-orange-600' },
  { id: 'cash_vs_installment' as ReportType, icon: <BarChart3 size={20} />, titleKey: 'cashVsInstallment', descKey: 'cashVsInstallmentDesc', color: 'bg-teal-50 text-teal-600' },
  { id: 'sales_employee' as ReportType, icon: <Users size={20} />, titleKey: 'salesPerEmployee', descKey: 'salesPerEmployeeDesc', color: 'bg-stone-50 text-stone-600' },
  { id: 'lock_summary' as ReportType, icon: <Lock size={20} />, titleKey: 'lockSummary', descKey: 'lockSummaryDesc', color: 'bg-stone-50 text-stone-600' },
  { id: 'aging' as ReportType, icon: <Clock size={20} />, titleKey: 'installmentAging', descKey: 'installmentAgingDesc', color: 'bg-rose-50 text-rose-600' },
];

export function Reports() {
  const { t, language } = useLanguage();
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [profitData, setProfitData] = useState<Record<string, { actual_cost: number; margin: number }>>({});

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const runReport = async (type: ReportType) => {
    setActiveReport(type);
    setLoading(true);
    setReportData([]);

    try {
      switch (type) {
        case 'daily': {
          const { data } = await supabase.from('payments').select('payment_date, amount_usd, payment_type, order:orders(order_number, customer:customers(full_name_en,full_name_ku))')
            .eq('is_reversed', false).gte('payment_date', dateFrom).lte('payment_date', dateTo).order('payment_date', { ascending: false });
          setReportData((data || []) as Record<string, unknown>[]);
          break;
        }
        case 'monthly': {
          const { data } = await supabase.from('payments').select('payment_date, amount_usd')
            .eq('is_reversed', false).gte('payment_date', dateFrom).lte('payment_date', dateTo);
          const byMonth: Record<string, number> = {};
          (data || []).forEach(p => {
            const month = p.payment_date.substring(0, 7);
            byMonth[month] = (byMonth[month] || 0) + p.amount_usd;
          });
          setReportData(Object.entries(byMonth).map(([month, total]) => ({ month, total })).sort((a, b) => (b.month as string).localeCompare(a.month as string)));
          break;
        }
        case 'outstanding': {
          const { data } = await supabase.from('installment_entries')
            .select('*, order:orders(order_number, customer:customers(full_name_en,full_name_ku))')
            .in('status', ['unpaid', 'partial', 'overdue']).order('due_date');
          setReportData((data || []) as Record<string, unknown>[]);
          break;
        }
        case 'profit': {
          const { data } = await supabase.from('orders')
            .select('id, order_number, customer:customers(full_name_en,full_name_ku), final_total_usd, total_paid_usd, status')
            .gte('created_at', dateFrom).lte('created_at', dateTo + 'T23:59:59').order('created_at', { ascending: false });
          setReportData((data || []) as Record<string, unknown>[]);
          break;
        }
        case 'expenses': {
          const { data } = await supabase.from('expenses')
            .select('*, category:expense_categories(name_en,name_ku)')
            .gte('expense_date', dateFrom).lte('expense_date', dateTo).order('expense_date', { ascending: false });
          const byCat: Record<string, { name_en: string; name_ku: string; total: number; count: number }> = {};
          (data || []).forEach(e => {
            const key = (e.category as Record<string, string>)?.name_en || 'Other';
            if (!byCat[key]) byCat[key] = { name_en: key, name_ku: (e.category as Record<string, string>)?.name_ku || key, total: 0, count: 0 };
            byCat[key].total += e.amount_usd;
            byCat[key].count++;
          });
          setReportData(Object.values(byCat).sort((a, b) => b.total - a.total));
          break;
        }
        case 'cash_vs_installment': {
          const { data } = await supabase.from('payments')
            .select('amount_usd, order:orders(sale_type)')
            .eq('is_reversed', false).gte('payment_date', dateFrom).lte('payment_date', dateTo);
          let cashTotal = 0, installTotal = 0, cashCount = 0, installCount = 0;
          (data || []).forEach(p => {
            if ((p.order as Record<string, string>)?.sale_type === 'cash') { cashTotal += p.amount_usd; cashCount++; }
            else { installTotal += p.amount_usd; installCount++; }
          });
          setReportData([
            { type: 'Cash', total: cashTotal, count: cashCount },
            { type: 'Installment', total: installTotal, count: installCount },
          ]);
          break;
        }
        case 'sales_employee': {
          const { data } = await supabase.from('orders')
            .select('id, final_total_usd, assigned_to, assigned_to_profile:user_profiles!orders_assigned_to_fkey(full_name_en,full_name_ku)')
            .gte('created_at', dateFrom).lte('created_at', dateTo + 'T23:59:59');
          const byEmp: Record<string, { name_en: string; name_ku: string; total: number; count: number }> = {};
          (data || []).forEach(o => {
            const key = o.assigned_to || 'unassigned';
            const name = (o.assigned_to_profile as Record<string, string>)?.full_name_en || 'Unassigned';
            if (!byEmp[key]) byEmp[key] = { name_en: name, name_ku: (o.assigned_to_profile as Record<string, string>)?.full_name_ku || name, total: 0, count: 0 };
            byEmp[key].total += o.final_total_usd || 0;
            byEmp[key].count++;
          });
          setReportData(Object.values(byEmp).sort((a, b) => b.total - a.total));
          break;
        }
        case 'lock_summary': {
          const { data } = await supabase.from('lock_sessions')
            .select('*').gte('session_date', dateFrom).lte('session_date', dateTo).order('session_date', { ascending: false });
          setReportData((data || []) as Record<string, unknown>[]);
          break;
        }
        case 'aging': {
          const today = new Date().toISOString().split('T')[0];
          const { data } = await supabase.from('installment_entries')
            .select('*, order:orders(order_number, customer:customers(full_name_en,full_name_ku))')
            .eq('status', 'overdue').order('due_date');
          setReportData(((data || []) as Record<string, unknown>[]).map(e => ({
            ...e,
            days_overdue: Math.floor((new Date(today).getTime() - new Date(e.due_date as string).getTime()) / 86400000),
          })));
          break;
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const updateProfitData = (orderId: string, field: 'actual_cost' | 'margin', value: number) => {
    setProfitData(prev => ({
      ...prev,
      [orderId]: { ...prev[orderId], actual_cost: 0, margin: 0, [field]: value },
    }));
  };

  const renderReport = () => {
    if (loading) return <div className="flex items-center justify-center py-12 text-gray-400 gap-2"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />Loading report...</div>;

    switch (activeReport) {
      case 'daily':
        return (
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-gray-500">{reportData.length} transactions · Total: <strong className="text-emerald-700">{fmt(reportData.reduce((s, r) => s + (r.amount_usd as number), 0))}</strong></p>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50"><th className="px-4 py-2 text-left text-xs text-gray-500">Date</th><th className="px-4 py-2 text-left text-xs text-gray-500">Order</th><th className="px-4 py-2 text-left text-xs text-gray-500">Customer</th><th className="px-4 py-2 text-left text-xs text-gray-500">Type</th><th className="px-4 py-2 text-left text-xs text-gray-500">Amount</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {reportData.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{r.payment_date as string}</td>
                    <td className="px-4 py-2 font-mono text-xs text-emerald-700">{(r.order as Record<string, string>)?.order_number}</td>
                    <td className="px-4 py-2">{language === 'ku' ? ((r.order as Record<string, unknown>)?.customer as Record<string, string>)?.full_name_ku : ((r.order as Record<string, unknown>)?.customer as Record<string, string>)?.full_name_en}</td>
                    <td className="px-4 py-2"><Badge variant="info">{r.payment_type as string}</Badge></td>
                    <td className="px-4 py-2 font-bold text-emerald-700">{fmt(r.amount_usd as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'monthly':
        return (
          <div>
            <div className="mb-3 font-semibold text-gray-700">Monthly Revenue Summary</div>
            <div className="space-y-3">
              {reportData.map((r, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <span className="font-medium w-20">{r.month as string}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${Math.min(100, ((r.total as number) / (reportData[0]?.total as number || 1)) * 100)}%` }} />
                  </div>
                  <span className="font-bold text-emerald-700 w-28 text-right">{fmt(r.total as number)}</span>
                </div>
              ))}
              <div className="flex justify-end pt-3 border-t border-gray-200">
                <span className="font-bold text-lg text-emerald-800">Total: {fmt(reportData.reduce((s, r) => s + (r.total as number), 0))}</span>
              </div>
            </div>
          </div>
        );

      case 'outstanding':
        return (
          <div>
            <div className="flex justify-between mb-3">
              <p className="text-sm text-gray-500">{reportData.length} unpaid installments</p>
              <p className="font-bold text-red-700">Total: {fmt(reportData.reduce((s, r) => s + ((r.amount_usd as number) - (r.paid_amount_usd as number)), 0))}</p>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50">{['#', 'Order', 'Customer', 'Due Date', 'Amount', 'Paid', 'Remaining', 'Status'].map(h => <th key={h} className="px-3 py-2 text-left text-xs text-gray-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {reportData.map((r, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${r.status === 'overdue' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-3 py-2 font-bold">#{r.installment_number as number}</td>
                    <td className="px-3 py-2 font-mono text-xs text-emerald-700">{(r.order as Record<string, string>)?.order_number}</td>
                    <td className="px-3 py-2">{language === 'ku' ? ((r.order as Record<string, unknown>)?.customer as Record<string, string>)?.full_name_ku : ((r.order as Record<string, unknown>)?.customer as Record<string, string>)?.full_name_en}</td>
                    <td className="px-3 py-2">{r.due_date as string}</td>
                    <td className="px-3 py-2 font-semibold">{fmt(r.amount_usd as number)}</td>
                    <td className="px-3 py-2">{fmt(r.paid_amount_usd as number)}</td>
                    <td className="px-3 py-2 font-bold text-red-700">{fmt((r.amount_usd as number) - (r.paid_amount_usd as number))}</td>
                    <td className="px-3 py-2"><Badge variant={r.status === 'overdue' ? 'error' : 'warning'}>{r.status as string}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'profit':
        return (
          <div>
            <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl mb-4 border border-amber-200">Enter actual cost and profit margin manually for each contract below. All values are editable.</p>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50">{['Order', 'Customer', 'Contract Value', 'Paid', 'Actual Cost', 'Profit Margin %', 'Profit'].map(h => <th key={h} className="px-3 py-2 text-left text-xs text-gray-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {reportData.map((r, i) => {
                  const pd = profitData[r.id as string] || { actual_cost: 0, margin: 0 };
                  const profit = (r.final_total_usd as number) - pd.actual_cost;
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-emerald-700">{r.order_number as string}</td>
                      <td className="px-3 py-2">{language === 'ku' ? ((r.customer as Record<string, string>))?.full_name_ku : (r.customer as Record<string, string>)?.full_name_en}</td>
                      <td className="px-3 py-2 font-bold">{fmt(r.final_total_usd as number)}</td>
                      <td className="px-3 py-2 text-emerald-700">{fmt(r.total_paid_usd as number)}</td>
                      <td className="px-3 py-2"><input type="number" min={0} step={0.01} value={pd.actual_cost || ''} onChange={e => updateProfitData(r.id as string, 'actual_cost', Number(e.target.value))} placeholder="0.00" className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500" /></td>
                      <td className="px-3 py-2"><input type="number" min={0} max={100} step={0.1} value={pd.margin || ''} onChange={e => updateProfitData(r.id as string, 'margin', Number(e.target.value))} placeholder="%" className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500" /></td>
                      <td className="px-3 py-2 font-bold text-emerald-800">{pd.actual_cost ? fmt(profit) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      case 'expenses':
        return (
          <div>
            <div className="flex justify-end mb-3">
              <span className="font-bold text-red-700">Total: {fmt(reportData.reduce((s, r) => s + (r.total as number), 0))}</span>
            </div>
            <div className="space-y-3">
              {reportData.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium">{language === 'ku' ? r.name_ku as string : r.name_en as string}</p>
                    <p className="text-xs text-gray-500">{r.count as number} expenses</p>
                  </div>
                  <p className="font-bold text-red-700">{fmt(r.total as number)}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'cash_vs_installment':
        return (
          <div className="space-y-4">
            {reportData.map((r, i) => (
              <div key={i} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xl font-bold text-gray-900">{r.type as string}</p>
                  <Badge variant={r.type === 'Cash' ? 'info' : 'warning'}>{r.count as number} payments</Badge>
                </div>
                <p className="text-3xl font-bold text-emerald-700">{fmt(r.total as number)}</p>
                <div className="mt-3 bg-gray-100 rounded-full h-3">
                  <div className={`h-3 rounded-full ${r.type === 'Cash' ? 'bg-blue-500' : 'bg-amber-500'}`}
                    style={{ width: `${reportData.length ? ((r.total as number) / reportData.reduce((s, d) => s + (d.total as number), 0)) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        );

      case 'sales_employee':
        return (
          <div>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50">{['Employee', 'Orders', 'Total Value'].map(h => <th key={h} className="px-4 py-2 text-left text-xs text-gray-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {reportData.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{language === 'ku' ? r.name_ku as string : r.name_en as string}</td>
                    <td className="px-4 py-3"><Badge variant="info">{r.count as number}</Badge></td>
                    <td className="px-4 py-3 font-bold text-emerald-700">{fmt(r.total as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'lock_summary':
        return (
          <div>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50">{['Date', 'Status', 'Opening', 'Income', 'Expenses', 'Closing', 'Net'].map(h => <th key={h} className="px-3 py-2 text-left text-xs text-gray-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {reportData.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{s.session_date as string}</td>
                    <td className="px-3 py-2"><Badge variant={s.status === 'open' ? 'success' : 'neutral'}>{s.status as string}</Badge></td>
                    <td className="px-3 py-2">{fmt(s.opening_balance_usd as number)}</td>
                    <td className="px-3 py-2 text-emerald-700">{fmt(s.total_income_usd as number)}</td>
                    <td className="px-3 py-2 text-red-600">{fmt(s.total_expenses_usd as number)}</td>
                    <td className="px-3 py-2 font-bold">{fmt(s.closing_balance_usd as number)}</td>
                    <td className="px-3 py-2 font-bold text-emerald-700">{fmt(s.net_usd as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'aging':
        return (
          <div>
            <div className="flex justify-between mb-3">
              <p className="text-sm font-semibold text-red-700">{reportData.length} overdue installments</p>
              <p className="font-bold text-red-700">Total Overdue: {fmt(reportData.reduce((s, r) => s + ((r.amount_usd as number) - (r.paid_amount_usd as number)), 0))}</p>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-red-50">{['Order', 'Customer', '#', 'Due Date', 'Days Overdue', 'Amount Due'].map(h => <th key={h} className="px-3 py-2 text-left text-xs text-red-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {reportData.map((r, i) => (
                  <tr key={i} className="hover:bg-red-50/30">
                    <td className="px-3 py-2 font-mono text-xs text-emerald-700">{(r.order as Record<string, string>)?.order_number}</td>
                    <td className="px-3 py-2">{language === 'ku' ? ((r.order as Record<string, unknown>)?.customer as Record<string, string>)?.full_name_ku : ((r.order as Record<string, unknown>)?.customer as Record<string, string>)?.full_name_en}</td>
                    <td className="px-3 py-2 font-bold">#{r.installment_number as number}</td>
                    <td className="px-3 py-2 text-red-600">{r.due_date as string}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${(r.days_overdue as number) > 30 ? 'bg-red-200 text-red-800' : 'bg-orange-100 text-orange-700'}`}>
                        {r.days_overdue as number} days
                      </span>
                    </td>
                    <td className="px-3 py-2 font-bold text-red-700">{fmt((r.amount_usd as number) - (r.paid_amount_usd as number))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {!activeReport ? (
        <>
          <p className="text-sm text-gray-500">{t('selectReport')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportCardDefs.map(card => (
              <button
                key={card.id}
                onClick={() => { setActiveReport(card.id); runReport(card.id); }}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all text-left group"
              >
                <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center mb-3`}>{card.icon}</div>
                <p className="font-semibold text-gray-900 mb-1">{t(card.titleKey as Parameters<typeof t>[0])}</p>
                <p className="text-xs text-gray-500">{t(card.descKey as Parameters<typeof t>[0])}</p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <Button variant="ghost" onClick={() => setActiveReport(null)} size="sm">← Back</Button>
            <h2 className="font-bold text-gray-900">{t(reportCardDefs.find(r => r.id === activeReport)?.titleKey as Parameters<typeof t>[0] || 'reports')}</h2>
          </div>

          <div className="flex flex-wrap gap-3 mb-5 p-4 bg-gray-50 rounded-2xl">
            <Input label="From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-auto" />
            <Input label="To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-auto" />
            <div className="flex items-end">
              <Button onClick={() => runReport(activeReport)} loading={loading}>{t('generate')}</Button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-x-auto">
            {reportData.length === 0 && !loading ? (
              <p className="text-center py-8 text-gray-400">{t('noData')}</p>
            ) : renderReport()}
          </div>
        </div>
      )}
    </div>
  );
}
