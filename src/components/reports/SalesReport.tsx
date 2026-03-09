import React, { useState } from 'react';
import { Receipt, Filter, Download, Users, DollarSign, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Input } from '../ui/Input';
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

export function SalesReport() {
  const { language } = useLanguage();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [sales, setSales] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total_orders: 0,
    total_sales: 0,
    total_collected: 0,
    total_pending: 0,
    cash_orders: 0,
    installment_orders: 0,
  });

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchSales = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          sale_type,
          status,
          final_total_usd,
          total_paid_usd,
          balance_due_usd,
          customers (
            full_name_en,
            full_name_ku
          )
        `)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59')
        .neq('status', 'draft')
        .order('created_at', { ascending: false });

      const salesData = (data || []).map(order => ({
        id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        customer_name_en: order.customers?.full_name_en || '',
        customer_name_ku: order.customers?.full_name_ku || '',
        sale_type: order.sale_type,
        status: order.status,
        final_total_usd: order.final_total_usd,
        total_paid_usd: order.total_paid_usd,
        balance_due_usd: order.balance_due_usd,
      }));

      setSales(salesData);

      const totals = salesData.reduce((acc, s) => ({
        total_orders: acc.total_orders + 1,
        total_sales: acc.total_sales + Number(s.final_total_usd || 0),
        total_collected: acc.total_collected + Number(s.total_paid_usd || 0),
        total_pending: acc.total_pending + Number(s.balance_due_usd || 0),
        cash_orders: acc.cash_orders + (s.sale_type === 'cash' ? 1 : 0),
        installment_orders: acc.installment_orders + (s.sale_type === 'installment' ? 1 : 0),
      }), {
        total_orders: 0,
        total_sales: 0,
        total_collected: 0,
        total_pending: 0,
        cash_orders: 0,
        installment_orders: 0,
      });

      setSummary(totals);
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
      new Date(s.created_at).toLocaleDateString(),
      language === 'ku' ? s.customer_name_ku : s.customer_name_en,
      s.sale_type,
      s.status,
      s.final_total_usd,
      s.total_paid_usd,
      s.balance_due_usd,
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

  const collectionRate = summary.total_sales > 0 ? (summary.total_collected / summary.total_sales) * 100 : 0;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">
            {language === 'ku' ? 'فلتەرکردن' : 'Filters'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label={language === 'ku' ? 'لە بەروار' : 'From Date'}
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />

          <Input
            label={language === 'ku' ? 'بۆ بەروار' : 'To Date'}
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />

          <div className="flex items-end gap-2">
            <Button onClick={fetchSales} disabled={loading} className="flex-1">
              <Receipt size={16} />
              {loading ? (language === 'ku' ? 'چاوەڕوان بە...' : 'Loading...') : (language === 'ku' ? 'پیشاندان' : 'Generate')}
            </Button>
          </div>
        </div>
      </div>

      {sales.length > 0 && (
        <>
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
              <p className="text-xs text-emerald-600 mt-1">{collectionRate.toFixed(1)}% {language === 'ku' ? 'ڕێژە' : 'rate'}</p>
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
                  <p className="text-xs text-gray-600">{language === 'ku' ? 'بەش' : 'Installment'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {language === 'ku' ? 'وردەکارییەکان' : 'Sales Details'}
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'بەروار' : 'Date'}
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
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'کۆی گشتی' : 'Total'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'پارەدراو' : 'Paid'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'ماوە' : 'Balance'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sales.map(sale => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">
                        {sale.order_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(sale.created_at).toLocaleDateString(language === 'ku' ? 'ku' : 'en-US')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {language === 'ku' ? sale.customer_name_ku : sale.customer_name_en}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={sale.sale_type === 'cash' ? 'success' : 'neutral'}>
                          {language === 'ku' ? (sale.sale_type === 'cash' ? 'نەقد' : 'بەش') : sale.sale_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={sale.status === 'finished' ? 'success' : 'warning'}>
                          {sale.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-700">
                        {fmt(sale.final_total_usd)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-700">
                        {fmt(sale.total_paid_usd)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-orange-700">
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
          <p className="text-gray-500">
            {language === 'ku' ? 'تکایە فلتەرەکان هەڵبژێرە و دووگمەی پیشاندان دابگرە' : 'Select filters and click Generate to view report'}
          </p>
        </div>
      )}
    </>
  );
}
