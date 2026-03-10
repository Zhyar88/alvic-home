import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Filter, Download, Users, Wallet, ArrowUpDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { Customer } from '../../types';

interface ProfitReportData {
  period: string;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  total_expenses: number;
  net_profit: number;
  gross_margin: number;
  net_margin: number;
  total_orders: number;
}

type ReportPeriod = 'daily' | 'monthly' | 'yearly';
type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';

export function ProfitReport() {
  const { language } = useLanguage();
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reports, setReports] = useState<ProfitReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total_revenue: 0,
    total_cost: 0,
    gross_profit: 0,
    total_expenses: 0,
    net_profit: 0,
    total_orders: 0,
  });

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`;

  useEffect(() => {
    fetchCustomers();
    applyDatePreset(datePreset);
  }, []);

  const applyDatePreset = (preset: DatePreset) => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    switch (preset) {
      case 'today':
        from = new Date(now.setHours(0, 0, 0, 0));
        to = new Date();
        break;
      case 'yesterday':
        from = new Date(now.setDate(now.getDate() - 1));
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setHours(23, 59, 59, 999);
        break;
      case 'this_week':
        from = new Date(now.setDate(now.getDate() - now.getDay()));
        from.setHours(0, 0, 0, 0);
        to = new Date();
        break;
      case 'last_week':
        from = new Date(now.setDate(now.getDate() - now.getDay() - 7));
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setDate(to.getDate() + 6);
        to.setHours(23, 59, 59, 999);
        break;
      case 'this_month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date();
        break;
      case 'last_month':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        from = new Date(now.getFullYear(), quarter * 3, 1);
        to = new Date();
        break;
      case 'this_year':
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date();
        break;
      case 'custom':
        return;
    }

    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(to.toISOString().split('T')[0]);
  };

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      applyDatePreset(preset);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, full_name_en, full_name_ku')
        .eq('is_active', true)
        .order('full_name_en');
      setCustomers((data || []) as Customer[]);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      let ordersQuery = supabase
        .from('orders')
        .select('*')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59')
        .neq('status', 'draft');

      if (customerFilter !== 'all') {
        ordersQuery = ordersQuery.eq('customer_id', customerFilter);
      }

      const { data: ordersData } = await ordersQuery;

      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo);

      const dataByPeriod = new Map<string, ProfitReportData>();

      (ordersData || []).forEach(order => {
        const date = new Date(order.created_at);
        let periodKey: string;

        if (period === 'yearly') {
          periodKey = date.getFullYear().toString();
        } else if (period === 'monthly') {
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
          periodKey = date.toISOString().split('T')[0];
        }

        if (!dataByPeriod.has(periodKey)) {
          dataByPeriod.set(periodKey, {
            period: periodKey,
            total_revenue: 0,
            total_cost: 0,
            gross_profit: 0,
            total_expenses: 0,
            net_profit: 0,
            gross_margin: 0,
            net_margin: 0,
            total_orders: 0,
          });
        }

        const data = dataByPeriod.get(periodKey)!;
        data.total_revenue += Number(order.final_total_usd || 0);
        data.total_cost += Number(order.total_cost_usd || 0);
        data.gross_profit += Number(order.total_profit_usd || 0);
        data.total_orders += 1;
      });

      (expensesData || []).forEach(expense => {
        const date = new Date(expense.expense_date);
        let periodKey: string;

        if (period === 'yearly') {
          periodKey = date.getFullYear().toString();
        } else if (period === 'monthly') {
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
          periodKey = date.toISOString().split('T')[0];
        }

        if (!dataByPeriod.has(periodKey)) {
          dataByPeriod.set(periodKey, {
            period: periodKey,
            total_revenue: 0,
            total_cost: 0,
            gross_profit: 0,
            total_expenses: 0,
            net_profit: 0,
            gross_margin: 0,
            net_margin: 0,
            total_orders: 0,
          });
        }

        const data = dataByPeriod.get(periodKey)!;
        data.total_expenses += Number(expense.amount_usd || 0);
      });

      dataByPeriod.forEach(data => {
        data.net_profit = data.gross_profit - data.total_expenses;
        data.gross_margin = data.total_revenue > 0 ? (data.gross_profit / data.total_revenue) * 100 : 0;
        data.net_margin = data.total_revenue > 0 ? (data.net_profit / data.total_revenue) * 100 : 0;
      });

      const reportData = Array.from(dataByPeriod.values()).sort((a, b) => b.period.localeCompare(a.period));
      setReports(reportData);

      const totals = reportData.reduce((acc, r) => ({
        total_revenue: acc.total_revenue + r.total_revenue,
        total_cost: acc.total_cost + r.total_cost,
        gross_profit: acc.gross_profit + r.gross_profit,
        total_expenses: acc.total_expenses + r.total_expenses,
        net_profit: acc.net_profit + r.net_profit,
        total_orders: acc.total_orders + r.total_orders,
      }), {
        total_revenue: 0,
        total_cost: 0,
        gross_profit: 0,
        total_expenses: 0,
        net_profit: 0,
        total_orders: 0,
      });

      setSummary(totals);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPeriod = (periodStr: string) => {
    if (period === 'yearly') {
      return periodStr;
    } else if (period === 'monthly') {
      const [year, month] = periodStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString(language === 'ku' ? 'ku' : 'en-US', { year: 'numeric', month: 'long' });
    } else {
      const date = new Date(periodStr);
      return date.toLocaleDateString(language === 'ku' ? 'ku' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
  };

  const exportToCSV = () => {
    const headers = ['Period', 'Orders', 'Revenue', 'Cost', 'Gross Profit', 'Expenses', 'Net Profit', 'Gross Margin', 'Net Margin'];
    const rows = reports.map(r => [
      formatPeriod(r.period),
      r.total_orders,
      r.total_revenue.toFixed(2),
      r.total_cost.toFixed(2),
      r.gross_profit.toFixed(2),
      r.total_expenses.toFixed(2),
      r.net_profit.toFixed(2),
      r.gross_margin.toFixed(1) + '%',
      r.net_margin.toFixed(1) + '%',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit_report_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const profitMargin = summary.total_revenue > 0 ? (summary.gross_profit / summary.total_revenue) * 100 : 0;
  const netMargin = summary.total_revenue > 0 ? (summary.net_profit / summary.total_revenue) * 100 : 0;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">
            {language === 'ku' ? 'فلتەرکردنی پێشکەوتوو' : 'Advanced Filters'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Select
            label={language === 'ku' ? 'پێش‌دیاری بەروار' : 'Date Preset'}
            value={datePreset}
            onChange={e => handlePresetChange(e.target.value as DatePreset)}
          >
            <option value="today">{language === 'ku' ? 'ئەمڕۆ' : 'Today'}</option>
            <option value="yesterday">{language === 'ku' ? 'دوێنێ' : 'Yesterday'}</option>
            <option value="this_week">{language === 'ku' ? 'ئەم هەفتەیە' : 'This Week'}</option>
            <option value="last_week">{language === 'ku' ? 'هەفتەی ڕابردوو' : 'Last Week'}</option>
            <option value="this_month">{language === 'ku' ? 'ئەم مانگە' : 'This Month'}</option>
            <option value="last_month">{language === 'ku' ? 'مانگی ڕابردوو' : 'Last Month'}</option>
            <option value="this_quarter">{language === 'ku' ? 'ئەم چارەکە' : 'This Quarter'}</option>
            <option value="this_year">{language === 'ku' ? 'ئەمساڵ' : 'This Year'}</option>
            <option value="custom">{language === 'ku' ? 'دڵخواز' : 'Custom'}</option>
          </Select>

          <Select
            label={language === 'ku' ? 'ماوە' : 'Period'}
            value={period}
            onChange={e => setPeriod(e.target.value as ReportPeriod)}
          >
            <option value="daily">{language === 'ku' ? 'ڕۆژانە' : 'Daily'}</option>
            <option value="monthly">{language === 'ku' ? 'مانگانە' : 'Monthly'}</option>
            <option value="yearly">{language === 'ku' ? 'ساڵانە' : 'Yearly'}</option>
          </Select>

          <Input
            label={language === 'ku' ? 'لە بەروار' : 'From Date'}
            type="date"
            value={dateFrom}
            onChange={e => {
              setDateFrom(e.target.value);
              setDatePreset('custom');
            }}
          />

          <Input
            label={language === 'ku' ? 'بۆ بەروار' : 'To Date'}
            type="date"
            value={dateTo}
            onChange={e => {
              setDateTo(e.target.value);
              setDatePreset('custom');
            }}
          />

          <Select
            label={language === 'ku' ? 'کڕیار' : 'Customer'}
            value={customerFilter}
            onChange={e => setCustomerFilter(e.target.value)}
          >
            <option value="all">{language === 'ku' ? 'هەموو کڕیاران' : 'All Customers'}</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {language === 'ku' ? c.full_name_ku : c.full_name_en}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex justify-end">
          <Button onClick={fetchReports} disabled={loading}>
            <BarChart3 size={16} />
            {loading ? (language === 'ku' ? 'چاوەڕوان بە...' : 'Loading...') : (language === 'ku' ? 'پیشاندان' : 'Generate')}
          </Button>
        </div>
      </div>

      {reports.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} className="text-blue-600" />
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                  {language === 'ku' ? 'داهات' : 'Revenue'}
                </p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{fmt(summary.total_revenue)}</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={18} className="text-red-600" />
                <p className="text-xs font-medium text-red-700 uppercase tracking-wide">
                  {language === 'ku' ? 'تێچوو' : 'Cost'}
                </p>
              </div>
              <p className="text-2xl font-bold text-red-900">{fmt(summary.total_cost)}</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-emerald-600" />
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
                  {language === 'ku' ? 'قازانجی ناوەکی' : 'Gross Profit'}
                </p>
              </div>
              <p className="text-2xl font-bold text-emerald-900">{fmt(summary.gross_profit)}</p>
              <p className="text-xs text-emerald-600 mt-1">{pct(profitMargin)} {language === 'ku' ? 'لەسەدا' : 'margin'}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={18} className="text-orange-600" />
                <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">
                  {language === 'ku' ? 'خەرجییەکان' : 'Expenses'}
                </p>
              </div>
              <p className="text-2xl font-bold text-orange-900">{fmt(summary.total_expenses)}</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} className="text-amber-600" />
                <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                  {language === 'ku' ? 'قازانجی دواییە' : 'Net Profit'}
                </p>
              </div>
              <p className="text-2xl font-bold text-amber-900">{fmt(summary.net_profit)}</p>
              <p className="text-xs text-amber-600 mt-1">{pct(netMargin)} {language === 'ku' ? 'لەسەدا' : 'margin'}</p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-gray-600" />
                <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  {language === 'ku' ? 'داواکاریەکان' : 'Orders'}
                </p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.total_orders}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {language === 'ku' ? 'وردەکارییەکان' : 'Detailed Report'}
              </h3>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download size={14} />
                {language === 'ku' ? 'هاوردەکردن CSV' : 'Export CSV'}
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'بەروار' : 'Period'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'داواکاری' : 'Orders'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'داهات' : 'Revenue'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'تێچوو' : 'Cost'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'قازانجی ناوەکی' : 'Gross Profit'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'خەرجی' : 'Expenses'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'قازانجی دواییە' : 'Net Profit'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reports.map((report, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {formatPeriod(report.period)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <Badge variant="neutral">{report.total_orders}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-700">
                        {fmt(report.total_revenue)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-red-700">
                        {fmt(report.total_cost)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-emerald-700">{fmt(report.gross_profit)}</div>
                        <div className="text-xs text-emerald-600">{pct(report.gross_margin)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-orange-700">
                        {fmt(report.total_expenses)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-semibold text-amber-700">{fmt(report.net_profit)}</div>
                        <div className="text-xs text-amber-600">{pct(report.net_margin)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && reports.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">
            {language === 'ku' ? 'هیچ داتایەکی قازانج نەدۆزرایەوە' : 'No profit data found'}
          </p>
          <p className="text-sm text-gray-400">
            {language === 'ku' ? 'تکایە فلتەرەکان بگۆڕە یان داواکاری زیاد بکە' : 'Try adjusting filters or add some orders first'}
          </p>
        </div>
      )}
    </>
  );
}
