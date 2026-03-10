import React, { useState } from 'react';
import { Users, Download, Search, ArrowUpDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';

interface CustomerStats {
  customer_id: string;
  full_name_en: string;
  full_name_ku: string;
  total_orders: number;
  lifetime_revenue: number;
  lifetime_profit: number;
  avg_profit_per_order: number;
}

type SortField = 'full_name_en' | 'total_orders' | 'lifetime_revenue' | 'lifetime_profit' | 'avg_profit_per_order';
type SortOrder = 'asc' | 'desc';

export function CustomerReport() {
  const { language } = useLanguage();
  const [customers, setCustomers] = useState<CustomerStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('lifetime_profit');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          customer_id,
          final_total_usd,
          total_profit_usd,
          customers (
            id,
            full_name_en,
            full_name_ku
          )
        `);

      const customerMap = new Map<string, CustomerStats>();

      (ordersData || []).forEach(order => {
        const customerId = order.customer_id;
        const customer = order.customers;

        if (!customer) return;

        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customer_id: customerId,
            full_name_en: customer.full_name_en || '',
            full_name_ku: customer.full_name_ku || '',
            total_orders: 0,
            lifetime_revenue: 0,
            lifetime_profit: 0,
            avg_profit_per_order: 0,
          });
        }

        const data = customerMap.get(customerId)!;
        data.total_orders += 1;
        data.lifetime_revenue += Number(order.final_total_usd || 0);
        data.lifetime_profit += Number(order.total_profit_usd || 0);
      });

      customerMap.forEach(data => {
        data.avg_profit_per_order = data.total_orders > 0 ? data.lifetime_profit / data.total_orders : 0;
      });

      let customersData = Array.from(customerMap.values());

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        customersData = customersData.filter(c =>
          c.full_name_en.toLowerCase().includes(query) ||
          c.full_name_ku.toLowerCase().includes(query)
        );
      }

      customersData.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        if (sortField === 'full_name_en') {
          aVal = language === 'ku' ? a.full_name_ku : a.full_name_en;
          bVal = language === 'ku' ? b.full_name_ku : b.full_name_en;
          return sortOrder === 'asc'
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
        }

        return sortOrder === 'asc'
          ? Number(aVal) - Number(bVal)
          : Number(bVal) - Number(aVal);
      });

      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const exportToCSV = () => {
    const headers = ['Customer', 'Orders', 'Revenue', 'Profit', 'Avg Profit/Order'];
    const rows = customers.map(c => [
      language === 'ku' ? c.full_name_ku : c.full_name_en,
      c.total_orders,
      c.lifetime_revenue,
      c.lifetime_profit,
      c.avg_profit_per_order,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_analysis_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = customers.reduce((acc, c) => ({
    total_customers: acc.total_customers + 1,
    total_orders: acc.total_orders + c.total_orders,
    total_revenue: acc.total_revenue + c.lifetime_revenue,
    total_profit: acc.total_profit + c.lifetime_profit,
  }), {
    total_customers: 0,
    total_orders: 0,
    total_revenue: 0,
    total_profit: 0,
  });

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">
              {language === 'ku' ? 'شیکاری کڕیاران' : 'Customer Analysis'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {language === 'ku' ? 'ڕیزبەندی کڕیاران بەپێی قازانج' : 'Search and sort customers'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Input
              label={language === 'ku' ? 'گەڕان' : 'Search'}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={language === 'ku' ? 'ناوی کڕیار...' : 'Customer name...'}
            />
            <Search size={16} className="absolute left-3 top-[38px] text-gray-400" />
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={fetchCustomers} disabled={loading} className="flex-1">
              <Users size={16} />
              {loading ? (language === 'ku' ? 'چاوەڕوان بە...' : 'Loading...') : (language === 'ku' ? 'پیشاندان' : 'Generate')}
            </Button>
          </div>
        </div>
      </div>

      {customers.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">
                {language === 'ku' ? 'کۆی کڕیاران' : 'Total Customers'}
              </p>
              <p className="text-2xl font-bold text-blue-900">{summary.total_customers}</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
              <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide mb-2">
                {language === 'ku' ? 'کۆی داهات' : 'Total Revenue'}
              </p>
              <p className="text-2xl font-bold text-emerald-900">{fmt(summary.total_revenue)}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <p className="text-xs font-medium text-orange-700 uppercase tracking-wide mb-2">
                {language === 'ku' ? 'کۆی قازانج' : 'Total Profit'}
              </p>
              <p className="text-2xl font-bold text-orange-900">{fmt(summary.total_profit)}</p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                {language === 'ku' ? 'میانگین/داواکاری' : 'Avg/Order'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{fmt(summary.total_orders > 0 ? summary.total_revenue / summary.total_orders : 0)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {language === 'ku' ? 'وردەکاری' : 'Customer Details'}
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
                      {language === 'ku' ? 'ڕیز' : 'Rank'}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('full_name_en')}
                    >
                      <div className="flex items-center gap-1">
                        {language === 'ku' ? 'کڕیار' : 'Customer'}
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
                      onClick={() => toggleSort('lifetime_revenue')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'کۆی داهات' : 'Total Revenue'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('lifetime_profit')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'کۆی قازانج' : 'Total Profit'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('avg_profit_per_order')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'میانگین/داواکاری' : 'Avg/Order'}
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customers.map((customer, idx) => (
                    <tr key={customer.customer_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Badge variant={idx < 3 ? 'success' : 'neutral'}>#{idx + 1}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {language === 'ku' ? customer.full_name_ku : customer.full_name_en}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <Badge variant="neutral">{customer.total_orders}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-700">
                        {fmt(customer.lifetime_revenue)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-700">
                        {fmt(customer.lifetime_profit)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {fmt(customer.avg_profit_per_order)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && customers.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">
            {language === 'ku' ? 'هیچ زانیاریەک نییە' : 'No customer data available'}
          </p>
          <p className="text-sm text-gray-400">
            {language === 'ku' ? 'تکایە داواکاری زیاد بکە' : 'Click Generate to load customer analytics'}
          </p>
        </div>
      )}
    </>
  );
}
