import { supabase } from '../../lib/database';
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Filter, Download, Users, Wallet, ArrowUpDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { Customer } from '../../types';
interface ProfitReportData {
  period: string;
  total_revenue: number;
  cash_collected: number;
  total_cost: number;
  gross_profit: number;
  cash_profit: number;
  total_expenses: number;
  net_profit: number;
  cash_net_profit: number;
  gross_margin: number;
  net_margin: number;
  total_orders: number;
}

type ReportPeriod = 'daily' | 'monthly' | 'yearly';
type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';
type SortField = 'period' | 'total_orders' | 'total_revenue' | 'cash_collected' | 'total_cost' | 'gross_profit' | 'cash_profit' | 'total_expenses' | 'net_profit' | 'cash_net_profit';
type SortOrder = 'asc' | 'desc';
type ProfitMode = 'order_based' | 'payment_based';

export function ProfitReport() {
  const { language } = useLanguage();
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reports, setReports] = useState<ProfitReportData[]>([]);
  const [sortField, setSortField] = useState<SortField>('period');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total_revenue: 0,
    cash_collected: 0,
    total_cost: 0,
    gross_profit: 0,
    cash_profit: 0,
    total_expenses: 0,
    net_profit: 0,
    cash_net_profit: 0,
    total_orders: 0,
  });
  const [profitMode, setProfitMode] = useState<ProfitMode>('order_based');
  
  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`;

  useEffect(() => {
    fetchCustomers();
    applyDatePreset(datePreset);
  }, []);

    const applyDatePreset = (preset: DatePreset) => {
  const today = new Date();
  let from: Date;
  let to: Date;

  switch (preset) {
    case 'today':
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      to = new Date();
      break;
    case 'yesterday': {
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      to = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 23, 59, 59, 999);
      break;
    }
    case 'this_week': {
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
      to = new Date();
      break;
    }
    case 'last_week': {
      const sundayThisWeek = today.getDate() - today.getDay();
      from = new Date(today.getFullYear(), today.getMonth(), sundayThisWeek - 7);
      to = new Date(today.getFullYear(), today.getMonth(), sundayThisWeek - 1, 23, 59, 59, 999);
      break;
    }
    case 'this_month':
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      to = new Date();
      break;
    case 'last_month':
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'this_quarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      from = new Date(today.getFullYear(), quarter * 3, 1);
      to = new Date();
      break;
    }
    case 'this_year':
      from = new Date(today.getFullYear(), 0, 1);
      to = new Date();
      break;
    case 'custom':
      return;
    default:
      return;
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  setDateFrom(toLocal(from));
  setDateTo(toLocal(to));
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
      // Helper: get period key from a date string
      const getPeriodKeyFromDate = (dateStr: string) => {
        // If it contains 'T', it's a timestamp — parse to local date
        if (dateStr.includes('T')) {
          const date = new Date(dateStr);
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          if (period === 'yearly') return String(yyyy);
          if (period === 'monthly') return `${yyyy}-${mm}`;
          return `${yyyy}-${mm}-${dd}`;
        }
        // Plain date string — slice directly
        if (period === 'yearly') return dateStr.slice(0, 4);
        if (period === 'monthly') return dateStr.slice(0, 7);
        return dateStr.slice(0, 10);
      };
      const getPeriodKeyFromTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        if (period === 'yearly') return String(yyyy);
        if (period === 'monthly') return `${yyyy}-${mm}`;
        return `${yyyy}-${mm}-${dd}`;
      };

      const emptyPeriod = (): ProfitReportData => ({
        period: '', total_revenue: 0, cash_collected: 0, total_cost: 0,
        gross_profit: 0, cash_profit: 0, total_expenses: 0, net_profit: 0,
        cash_net_profit: 0, gross_margin: 0, net_margin: 0, total_orders: 0,
      });

      const dataByPeriod = new Map<string, ProfitReportData>();
      const ensure = (key: string): ProfitReportData => {
        if (!dataByPeriod.has(key)) dataByPeriod.set(key, { ...emptyPeriod(), period: key });
        return dataByPeriod.get(key)!;
      };

      // ── 1. Fetch orders created in the date range (for revenue/cost) ──
      let ordersQuery = supabase
        .from('orders')
        .select('*')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);
      if (customerFilter !== 'all') {
        ordersQuery = ordersQuery.eq('customer_id', customerFilter);
      }
      const { data: ordersInRange } = await ordersQuery;
      const ordersInRangeList = (ordersInRange || []);

      // ── 2. Fetch payments received in the date range (by payment_date) ──
      const { data: allPaymentsRaw } = await supabase
        .from('payments')
        .select('order_id, amount_usd, payment_date, payment_type, is_reversed')
        .gte('payment_date', dateFrom)
        .lte('payment_date', dateTo)
        .eq('is_reversed', false);
      // Filter reversal type client-side
      const allPaymentsInRange = (allPaymentsRaw || []).filter(
        (p: any) => p.payment_type !== 'reversal'
      );

      // ── 3. Fetch orders for payments (that weren't already in range) ──
      const orderIdSet = new Set(ordersInRangeList.map((o: any) => o.id));
      const missingOrderIds = [...new Set(
        allPaymentsInRange.map((p: any) => p.order_id).filter((id: string) => !orderIdSet.has(id))
      )];

      let additionalOrders: any[] = [];
      for (let i = 0; i < missingOrderIds.length; i += 100) {
        const { data: po } = await supabase
          .from('orders')
          .select('id, customer_id, final_total_usd, total_cost_usd, total_profit_usd, status')
          .in('id', missingOrderIds.slice(i, i + 100));
        additionalOrders = additionalOrders.concat(po || []);
      }

      // Build order lookup
      const orderMap = new Map<string, any>();
      ordersInRangeList.forEach((o: any) => orderMap.set(o.id, o));
      additionalOrders.forEach((o: any) => orderMap.set(o.id, o));

      // Filter payments: exclude drafts and apply customer filter
      const paymentsInRange = allPaymentsInRange.filter((p: any) => {
        const order = orderMap.get(p.order_id);
        if (customerFilter !== 'all' && order.customer_id !== customerFilter) return false;
        return true;
      });

      // Count unique non-draft orders that have activity in this period
      const activeOrderIds = new Set<string>();
      ordersInRangeList.forEach((o: any) => activeOrderIds.add(o.id));
      paymentsInRange.forEach((p: any) => activeOrderIds.add(p.order_id));

      // ── 4. Fetch expenses ──
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo);

      // ── 5. Group orders by created_at (revenue, cost, profit) ──
      ordersInRangeList.forEach((order: any) => {
        const key = getPeriodKeyFromTimestamp(order.created_at);
        const data = ensure(key);
        const finalTotal = Number(order.final_total_usd || 0);
        const costTotal = Number(order.total_cost_usd || 0);
        data.total_revenue += finalTotal;
        data.total_cost += costTotal;
        data.gross_profit += finalTotal - costTotal;
        data.total_orders += 1;
      });

      // ── 6. Group payments by payment_date (cash collected, cash profit) ──
      paymentsInRange.forEach((payment: any) => {
        const key = getPeriodKeyFromDate(String(payment.payment_date));
        console.log('Payment grouped:', { payment_date: payment.payment_date, key, amount: payment.amount_usd, order_id: payment.order_id });
        const data = ensure(key);
        const order = orderMap.get(payment.order_id);
        const paidAmount = Number(payment.amount_usd || 0);
        const finalTotal = Number(order?.final_total_usd || 1);
        const costTotal = Number(order?.total_cost_usd || 0);
        const costForPaid = finalTotal > 0 ? costTotal * (paidAmount / finalTotal) : 0;
        data.cash_collected += paidAmount;
        data.cash_profit += paidAmount - costForPaid;
      });

      // ── 7. Group expenses by expense_date ──
      (expensesData || []).forEach((expense: any) => {
        const key = getPeriodKeyFromDate(String(expense.expense_date));
        const data = ensure(key);
        data.total_expenses += Number(expense.amount_usd || 0);
      });

      // ── 8. Calculate derived fields ──
dataByPeriod.forEach(data => {
  if (profitMode === 'order_based') {
    // Order-based: profit = revenue - cost (from order creation date)
    data.net_profit = data.gross_profit - data.total_expenses;
    data.cash_net_profit = data.cash_profit - data.total_expenses;
    data.gross_margin = data.total_revenue > 0 ? (data.gross_profit / data.total_revenue) * 100 : 0;
    data.net_margin = data.total_revenue > 0 ? (data.net_profit / data.total_revenue) * 100 : 0;
  } else {
    // Payment-based: use cash_profit as the main profit metric
    data.gross_profit = data.cash_profit;
    data.total_revenue = data.cash_collected;
    data.total_cost = data.cash_collected > 0 ? data.cash_collected - data.cash_profit : 0;
    data.net_profit = data.cash_profit - data.total_expenses;
    data.cash_net_profit = data.cash_profit - data.total_expenses;
    data.gross_margin = data.cash_collected > 0 ? (data.cash_profit / data.cash_collected) * 100 : 0;
    data.net_margin = data.cash_collected > 0 ? (data.net_profit / data.cash_collected) * 100 : 0;
  }
});

      const reportData = Array.from(dataByPeriod.values());
      setReports(reportData);

      const totals = reportData.reduce((acc, r) => ({
        total_revenue: acc.total_revenue + r.total_revenue,
        cash_collected: acc.cash_collected + r.cash_collected,
        total_cost: acc.total_cost + r.total_cost,
        gross_profit: acc.gross_profit + r.gross_profit,
        cash_profit: acc.cash_profit + r.cash_profit,
        total_expenses: acc.total_expenses + r.total_expenses,
        net_profit: acc.net_profit + r.net_profit,
        cash_net_profit: acc.cash_net_profit + r.cash_net_profit,
        total_orders: acc.total_orders + r.total_orders,
      }), {
        total_revenue: 0, cash_collected: 0, total_cost: 0, gross_profit: 0,
        cash_profit: 0, total_expenses: 0, net_profit: 0, cash_net_profit: 0, total_orders: 0,
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
    const headers = ['Period', 'Orders', 'Total Revenue', 'Cash Collected', 'Cost', 'Total Profit', 'Cash Profit', 'Expenses', 'Net Profit', 'Cash Net Profit'];
    const rows = reports.map(r => [
      formatPeriod(r.period),
      r.total_orders,
      r.total_revenue.toFixed(2),
      r.cash_collected.toFixed(2),
      r.total_cost.toFixed(2),
      r.gross_profit.toFixed(2),
      r.cash_profit.toFixed(2),
      r.total_expenses.toFixed(2),
      r.net_profit.toFixed(2),
      r.cash_net_profit.toFixed(2),
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

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedReports = [...reports].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'period') {
      return sortOrder === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    }

    const aNum = Number(aVal) || 0;
    const bNum = Number(bVal) || 0;
    return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
  });

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
        <div className="col-span-full">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    {language === 'ku' ? 'شێوازی حیسابکردنی قازانج' : 'Profit Calculation Mode'}
  </label>
  <div className="grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => setProfitMode('order_based')}
      className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
        profitMode === 'order_based'
          ? 'bg-emerald-600 text-white border-emerald-600'
          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
      }`}
    >
      <div className="font-bold">{language === 'ku' ? 'بەپێی داواکاری' : 'Order Based'}</div>
      <div className={`text-xs mt-0.5 ${profitMode === 'order_based' ? 'text-emerald-100' : 'text-gray-400'}`}>
        {language === 'ku' ? 'قازانج کاتی دروستکردنی داواکاری' : 'Profit when order is created'}
      </div>
    </button>
    <button
      type="button"
      onClick={() => setProfitMode('payment_based')}
      className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
        profitMode === 'payment_based'
          ? 'bg-emerald-600 text-white border-emerald-600'
          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
      }`}
    >
      <div className="font-bold">{language === 'ku' ? 'بەپێی پارەدان' : 'Payment Based'}</div>
      <div className={`text-xs mt-0.5 ${profitMode === 'payment_based' ? 'text-emerald-100' : 'text-gray-400'}`}>
        {language === 'ku' ? 'قازانج کاتی وەرگرتنی پارە' : 'Profit when payment is received'}
      </div>
    </button>
  </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
    <div className="flex items-center gap-2 mb-2">
      <DollarSign size={18} className="text-blue-600" />
      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
        {profitMode === 'payment_based'
          ? (language === 'ku' ? 'پارەی کۆکراوە' : 'Cash Collected')
          : (language === 'ku' ? 'کۆی داهات' : 'Total Revenue')}
      </p>
    </div>
    <p className="text-2xl font-bold text-blue-900">{fmt(summary.total_revenue)}</p>
    <p className="text-xs text-blue-600 mt-1">
      {profitMode === 'payment_based'
        ? (language === 'ku' ? 'تەنها پارەی وەرگیراو' : 'Actual cash received')
        : (language === 'ku' ? 'پارە + پێماوە' : 'Paid + Unpaid')}
    </p>
  </div>

  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 border border-cyan-200">
    <div className="flex items-center gap-2 mb-2">
      <Wallet size={18} className="text-cyan-600" />
      <p className="text-xs font-medium text-cyan-700 uppercase tracking-wide">
        {language === 'ku' ? 'تێچوو' : 'Cost'}
      </p>
    </div>
    <p className="text-2xl font-bold text-cyan-900">{fmt(summary.total_cost)}</p>
    <p className="text-xs text-cyan-600 mt-1">
      {profitMode === 'payment_based'
        ? (language === 'ku' ? 'تێچووی بەشی پارەدراو' : 'Cost proportional to payments')
        : (language === 'ku' ? 'تێچووی کۆی داواکاری' : 'Total order cost')}
    </p>
  </div>

  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
    <div className="flex items-center gap-2 mb-2">
      <TrendingUp size={18} className="text-emerald-600" />
      <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
        {language === 'ku' ? 'قازانجی کۆ' : 'Gross Profit'}
      </p>
    </div>
    <p className="text-2xl font-bold text-emerald-900">{fmt(summary.gross_profit)}</p>
    <p className="text-xs text-emerald-600 mt-1">
      {profitMode === 'payment_based'
        ? (language === 'ku' ? 'قازانج لە پارەی وەرگیراو' : 'Profit from received cash')
        : (language === 'ku' ? 'پێش خەرجی' : 'Before expenses')}
    </p>
  </div>

  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
    <div className="flex items-center gap-2 mb-2">
      <ArrowUpDown size={18} className="text-amber-600" />
      <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">
        {language === 'ku' ? 'قازانجی دواییە' : 'Net Profit'}
      </p>
    </div>
    <p className="text-2xl font-bold text-amber-900">{fmt(summary.net_profit)}</p>
    <p className="text-xs text-amber-600 mt-1">{pct(netMargin)} {language === 'ku' ? 'لەسەدا' : 'margin'}</p>
  </div>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
    <div className="flex items-center gap-2 mb-2">
      <Wallet size={18} className="text-orange-600" />
      <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">
        {language === 'ku' ? 'خەرجییەکان' : 'Expenses'}
      </p>
    </div>
    <p className="text-2xl font-bold text-orange-900">{fmt(summary.total_expenses)}</p>
  </div>

  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
    <div className="flex items-center gap-2 mb-2">
      <BarChart3 size={18} className="text-gray-600" />
      <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
        {language === 'ku' ? 'داواکاریەکان' : 'Orders'}
      </p>
    </div>
    <p className="text-2xl font-bold text-gray-900">{summary.total_orders}</p>
  </div>

  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
    <div className="flex items-center gap-2 mb-2">
      <TrendingUp size={18} className="text-purple-600" />
      <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">
        {language === 'ku' ? 'ڕێژەی قازانج' : 'Profit Margin'}
      </p>
    </div>
    <p className="text-2xl font-bold text-purple-900">{pct(profitMargin)}</p>
    <p className="text-xs text-purple-600 mt-1">
      {profitMode === 'payment_based'
        ? (language === 'ku' ? 'بەپێی پارەدان' : 'Payment based')
        : (language === 'ku' ? 'بەپێی داواکاری' : 'Order based')}
    </p>
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
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('period')}
                    >
                      <div className="flex items-center gap-1">
                        {language === 'ku' ? 'بەروار' : 'Period'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('total_orders')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {language === 'ku' ? 'داواکاری' : 'Orders'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('total_revenue')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'کۆی داهات' : 'Total Revenue'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('cash_collected')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'پارەی کۆکراوە' : 'Cash Collected'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('total_cost')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'تێچوو' : 'Cost'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('gross_profit')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'قازانجی کۆ' : 'Total Profit'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('cash_profit')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'قازانجی پارە' : 'Cash Profit'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('total_expenses')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'خەرجی' : 'Expenses'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('net_profit')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'قازانجی دواییە' : 'Net Profit'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('cash_net_profit')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'قازانجی پارە دواییە' : 'Cash Net Profit'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedReports.map((report, idx) => (
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
                      <td className="px-4 py-3 text-sm text-right font-semibold text-cyan-700">
                        {fmt(report.cash_collected)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-red-700">
                        {fmt(report.total_cost)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-700">
                        {fmt(report.gross_profit)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-teal-700">
                        {fmt(report.cash_profit)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-orange-700">
                        {fmt(report.total_expenses)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-amber-700">
                        {fmt(report.net_profit)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-yellow-700">
                        {fmt(report.cash_net_profit)}
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
