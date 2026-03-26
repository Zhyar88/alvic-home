import { supabase } from '../../lib/database';
import React, { useState, useEffect } from 'react';
import { Receipt, Filter, Download, Users, DollarSign, TrendingUp, Search, ArrowUpDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface SalesData {
  id: string;
  order_number: string;
  created_at: string;
  customer_name_en: string;
  customer_name_ku: string;
  sale_type: string;
  status: string;
  final_total_usd: number;
  total_paid_usd: number;
  balance_due_usd: number;
}

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';
type SortField = 'created_at' | 'final_total_usd' | 'total_paid_usd' | 'balance_due_usd';
type SortOrder = 'asc' | 'desc';

function getDateRange(preset: DatePreset): { from: string; to: string } | null {
  if (preset === 'custom') return null;
  const now = new Date();
  let from = new Date();
  let to = new Date();

  switch (preset) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'yesterday':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      break;
    case 'this_week': {
      const day = now.getDay();
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    }
    case 'last_week': {
      const day = now.getDay();
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day - 7);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day - 1);
      break;
    }
    case 'this_month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'last_month':
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      from = new Date(now.getFullYear(), quarter * 3, 1);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    }
    case 'this_year':
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
  }

  // With this:
const pad = (n: number) => String(n).padStart(2, '0');
const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
return {
  from: toLocal(from),
  to: toLocal(to),
};
}

export function SalesReport() {
  const { language } = useLanguage();
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [saleTypeFilter, setSaleTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [sales, setSales] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total_orders: 0, total_sales: 0, total_collected: 0,
    total_pending: 0, cash_orders: 0, installment_orders: 0,
  });

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Initialize dates on mount
  useEffect(() => {
    const range = getDateRange('this_month');
    if (range) {
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }, []);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRange(preset);
      if (range) {
        setDateFrom(range.from);
        setDateTo(range.to);
      }
    }
  };

  const fetchSales = async () => {
    if (!dateFrom || !dateTo) return;

    setLoading(true);
    console.log('Fetching sales from', dateFrom, 'to', dateTo);

    try {
      // Step 1: Fetch orders without join (avoids join issues)
      let ordersQuery = supabase
        .from('orders')
        .select('id, order_number, created_at, sale_type, status, final_total_usd, total_paid_usd, balance_due_usd, customer_id')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo)
        .order('created_at', { ascending: sortOrder === 'asc' });

      if (statusFilter !== 'all') {
        ordersQuery = ordersQuery.eq('status', statusFilter);
      }
      if (saleTypeFilter !== 'all') {
        ordersQuery = ordersQuery.eq('sale_type', saleTypeFilter);
      }

      const { data: ordersData } = await ordersQuery;
      console.log('Orders raw:', (ordersData || []).length);

      // Filter out drafts client-side
      let validOrders = ordersData || [];
      console.log('Non-draft orders:', validOrders.length);

      // Step 2: Fetch customers for these orders
      const customerIds = [...new Set(validOrders.map((o: any) => o.customer_id).filter(Boolean))];
      let customersMap: Record<string, { full_name_en: string; full_name_ku: string }> = {};

      if (customerIds.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, full_name_en, full_name_ku')
          .in('id', customerIds);
        (customersData || []).forEach((c: any) => {
          customersMap[c.id] = { full_name_en: c.full_name_en || '', full_name_ku: c.full_name_ku || '' };
        });
      }

      // Step 3: Build sales data
      let salesData: SalesData[] = validOrders.map((order: any) => {
        const customer = customersMap[order.customer_id] || { full_name_en: '', full_name_ku: '' };
        return {
          id: order.id,
          order_number: order.order_number || '',
          created_at: order.created_at,
          customer_name_en: customer.full_name_en,
          customer_name_ku: customer.full_name_ku,
          sale_type: order.sale_type || '',
          status: order.status || '',
          final_total_usd: Number(order.final_total_usd || 0),
          total_paid_usd: Number(order.total_paid_usd || 0),
          balance_due_usd: Number(order.balance_due_usd || 0),
        };
      });

      // Step 4: Apply search filter client-side
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        salesData = salesData.filter(s =>
          s.order_number.toLowerCase().includes(q) ||
          s.customer_name_en.toLowerCase().includes(q) ||
          s.customer_name_ku.toLowerCase().includes(q)
        );
      }

      // Step 5: Sort
      salesData.sort((a, b) => {
        if (sortField === 'created_at') {
          return sortOrder === 'asc'
            ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        const aVal = Number(a[sortField] || 0);
        const bVal = Number(b[sortField] || 0);
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });

      setSales(salesData);

      // Step 6: Calculate summary
      const totals = salesData.reduce((acc, s) => ({
        total_orders: acc.total_orders + 1,
        total_sales: acc.total_sales + s.final_total_usd,
        total_collected: acc.total_collected + s.total_paid_usd,
        total_pending: acc.total_pending + s.balance_due_usd,
        cash_orders: acc.cash_orders + (s.sale_type === 'cash' ? 1 : 0),
        installment_orders: acc.installment_orders + (s.sale_type === 'installment' ? 1 : 0),
      }), { total_orders: 0, total_sales: 0, total_collected: 0, total_pending: 0, cash_orders: 0, installment_orders: 0 });

      setSummary(totals);
      console.log('Sales summary:', totals);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Order Number', 'Date', 'Customer', 'Type', 'Status', 'Total', 'Paid', 'Balance'];
    const rows = sales.map(s => [
      s.order_number,
      new Date(s.created_at).toLocaleDateString('en-GB'),
      language === 'ku' ? s.customer_name_ku : s.customer_name_en,
      s.sale_type, s.status,
      s.final_total_usd, s.total_paid_usd, s.balance_due_usd,
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  };

  const collectionRate = summary.total_sales > 0 ? (summary.total_collected / summary.total_sales) * 100 : 0;

  const statusLabels: Record<string, string> = {
    draft: 'Draft', approved: 'Approved', deposit_paid: 'Deposit Paid',
    in_production: 'In Production', ready: 'Ready', installed: 'Installed', finished: 'Finished',
  };

  const statusVariants: Record<string, string> = {
    finished: 'success', installed: 'success', ready: 'success',
    in_production: 'warning', deposit_paid: 'warning', approved: 'info',
    draft: 'neutral',
  };

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">
            {language === 'ku' ? 'فلتەرکردنی پێشکەوتوو' : 'Advanced Filters'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <Input
            label={language === 'ku' ? 'لە بەروار' : 'From Date'}
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setDatePreset('custom'); }}
          />

          <Input
            label={language === 'ku' ? 'بۆ بەروار' : 'To Date'}
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setDatePreset('custom'); }}
          />

          <Select
            label={language === 'ku' ? 'دۆخ' : 'Status'}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">{language === 'ku' ? 'هەموو دۆخەکان' : 'All Statuses'}</option>
            {Object.entries(statusLabels).filter(([k]) => k !== 'draft').map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label={language === 'ku' ? 'جۆری فرۆشتن' : 'Sale Type'}
            value={saleTypeFilter}
            onChange={e => setSaleTypeFilter(e.target.value)}
          >
            <option value="all">{language === 'ku' ? 'هەموو جۆرەکان' : 'All Types'}</option>
            <option value="cash">{language === 'ku' ? 'نەقد' : 'Cash'}</option>
            <option value="installment">{language === 'ku' ? 'قیست' : 'Installment'}</option>
          </Select>

          <div className="relative">
            <Input
              label={language === 'ku' ? 'گەڕان' : 'Search'}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={language === 'ku' ? 'ژمارەی داواکاری یان ناوی کڕیار...' : 'Order # or customer name...'}
            />
            <Search size={16} className="absolute left-3 top-[38px] text-gray-400 pointer-events-none" />
          </div>

          <div className="flex items-end">
            <Button onClick={fetchSales} disabled={loading || !dateFrom || !dateTo} className="w-full">
              <Receipt size={16} />
              {loading
                ? (language === 'ku' ? 'چاوەڕوان بە...' : 'Loading...')
                : (language === 'ku' ? 'پیشاندان' : 'Generate')}
            </Button>
          </div>
        </div>

        {dateFrom && dateTo && (
          <p className="text-sm text-gray-500">
            {language === 'ku' ? 'بازەی بەروار:' : 'Date range:'}{' '}
            <strong>{dateFrom}</strong> → <strong>{dateTo}</strong>
          </p>
        )}
      </div>

      {sales.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Receipt size={18} className="text-blue-600" />
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                  {language === 'ku' ? 'کۆی فرۆشتن' : 'Total Sales'}
                </p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{fmt(summary.total_sales)}</p>
              <p className="text-xs text-blue-600 mt-1">{summary.total_orders} {language === 'ku' ? 'داواکاری' : 'orders'}</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} className="text-emerald-600" />
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
                  {language === 'ku' ? 'کۆکراوە' : 'Collected'}
                </p>
              </div>
              <p className="text-2xl font-bold text-emerald-900">{fmt(summary.total_collected)}</p>
              <p className="text-xs text-emerald-600 mt-1">{collectionRate.toFixed(1)}% {language === 'ku' ? 'ڕێژە' : 'collection rate'}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-orange-600" />
                <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">
                  {language === 'ku' ? 'ماوە' : 'Pending'}
                </p>
              </div>
              <p className="text-2xl font-bold text-orange-900">{fmt(summary.total_pending)}</p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-gray-600" />
                <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  {language === 'ku' ? 'جۆری فرۆشتن' : 'Sale Types'}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{summary.cash_orders}</p>
                  <p className="text-xs text-gray-600">{language === 'ku' ? 'نەقد' : 'Cash'}</p>
                </div>
                <div className="h-8 w-px bg-gray-300"></div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{summary.installment_orders}</p>
                  <p className="text-xs text-gray-600">{language === 'ku' ? 'قیست' : 'Installment'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {language === 'ku' ? 'وردەکارییەکان' : 'Sales Details'}
                <span className="text-sm text-gray-400 font-normal ml-2">({sales.length} {language === 'ku' ? 'داواکاری' : 'orders'})</span>
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
                      {language === 'ku' ? 'ژمارە' : 'Order #'}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('created_at')}
                    >
                      <div className="flex items-center gap-1">
                        {language === 'ku' ? 'بەروار' : 'Date'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'کڕیار' : 'Customer'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'جۆر' : 'Type'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'دۆخ' : 'Status'}
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('final_total_usd')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'کۆی گشتی' : 'Total'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('total_paid_usd')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'پارەدراو' : 'Paid'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('balance_due_usd')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'ماوە' : 'Balance'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sales.map(sale => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-emerald-700">
                        {sale.order_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(sale.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {language === 'ku' ? (sale.customer_name_ku || sale.customer_name_en) : (sale.customer_name_en || sale.customer_name_ku)}
                        {!sale.customer_name_en && !sale.customer_name_ku && <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={sale.sale_type === 'cash' ? 'success' : 'warning'}>
                          {language === 'ku'
                            ? (sale.sale_type === 'cash' ? 'نەقد' : 'قیست')
                            : (sale.sale_type === 'cash' ? 'Cash' : 'Installment')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={(statusVariants[sale.status] || 'neutral') as any}>
                          {statusLabels[sale.status] || sale.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-700">
                        {fmt(sale.final_total_usd)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-700">
                        {fmt(sale.total_paid_usd)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold ${sale.balance_due_usd > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {fmt(sale.balance_due_usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && sales.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">
            {language === 'ku' ? 'هیچ داواکارییەک نەدۆزرایەوە' : 'No sales data found'}
          </p>
          <p className="text-sm text-gray-400">
            {language === 'ku' ? 'تکایە فلتەرەکان بگۆڕە و دووگمەی پیشاندان دابگرە' : 'Adjust filters and click Generate'}
          </p>
        </div>
      )}
    </>
  );
}