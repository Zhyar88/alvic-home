import React, { useState, useEffect } from 'react';
import { Users, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface CustomerStats {
  customer_id: string;
  full_name_en: string;
  full_name_ku: string;
  total_orders: number;
  lifetime_revenue: number;
  lifetime_profit: number;
  avg_profit_per_order: number;
}

export function CustomerReport() {
  const { language } = useLanguage();
  const [customers, setCustomers] = useState<CustomerStats[]>([]);
  const [loading, setLoading] = useState(false);

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('customer_profit_summary')
        .select('*')
        .order('lifetime_profit', { ascending: false });

      setCustomers((data || []) as CustomerStats[]);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
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

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">
              {language === 'ku' ? 'شیکاری کڕیاران' : 'Customer Analysis'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {language === 'ku' ? 'ڕیزبەندی کڕیاران بەپێی قازانج' : 'Customers ranked by profitability'}
            </p>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download size={14} />
            {language === 'ku' ? 'هاوردەکردن CSV' : 'Export CSV'}
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">{language === 'ku' ? 'چاوەڕوان بە...' : 'Loading...'}</p>
          </div>
        ) : customers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {language === 'ku' ? 'ڕیز' : 'Rank'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {language === 'ku' ? 'کڕیار' : 'Customer'}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {language === 'ku' ? 'داواکاری' : 'Orders'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {language === 'ku' ? 'کۆی داهات' : 'Total Revenue'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {language === 'ku' ? 'کۆی قازانج' : 'Total Profit'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {language === 'ku' ? 'مامناوەند/داواکاری' : 'Avg/Order'}
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
        ) : (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {language === 'ku' ? 'هیچ زانیاریەک نییە' : 'No customer data available'}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
