import { supabase } from '../../lib/database';
import React, { useState, useEffect } from 'react';
import { CreditCard, Filter, Download, DollarSign, ArrowUpDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Input, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface PaymentData {
  id: string;
  payment_number: string;
  payment_date: string;
  payment_type: string;
  order_number: string;
  customer_name_en: string;
  customer_name_ku: string;
  currency: string;
  amount_in_currency: number;
  amount_usd: number;
  order_id: string;
  customer_id: string;
}

interface CustomerOption {
  id: string;
  full_name_en: string;
  full_name_ku: string;
}

interface OrderOption {
  id: string;
  order_number: string;
}

type SortField = 'payment_number' | 'payment_date' | 'payment_type' | 'order_number' | 'customer_name' | 'amount_usd';
type SortOrder = 'asc' | 'desc';

export function PaymentReport() {
  const { language } = useLanguage();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total_payments: 0,
    total_usd: 0,
    total_iqd: 0,
    deposit_count: 0,
    installment_count: 0,
    final_count: 0,
    partial_count: 0,
  });

  // Filter states
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);

  // Sort states
  const [sortField, setSortField] = useState<SortField>('payment_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fmt = (n: number, currency: string = 'USD') => {
    if (currency === 'IQD') {
      return `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })} IQD`;
    }
    return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch customers for filter dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, full_name_en, full_name_ku')
        .eq('is_active', true)
        .order('full_name_en');

      if (data) {
        setCustomers(data);
      }
    };
    fetchCustomers();
  }, []);

  // Fetch orders for filter dropdown
  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number')
        .order('order_number', { ascending: false });

      if (data) {
        setOrders(data);
      }
    };
    fetchOrders();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('payments')
        .select('id,payment_number,payment_date,payment_type,currency,amount_in_currency,amount_usd,order_id,is_reversed')
        .gte('payment_date', dateFrom)
        .lte('payment_date', dateTo)
        .eq('is_reversed', false)
        .order('payment_date', { ascending: false });

      const payments = data || [];

      // Fetch orders separately
      const orderIds = [...new Set(payments.map((p: any) => p.order_id).filter(Boolean))];
      let ordersMap: Record<string, any> = {};
      if (orderIds.length > 0) {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id,order_number,customer_id,customer:customers(id,full_name_en,full_name_ku)')
          .in('id', orderIds);
        (ordersData || []).forEach((o: any) => { ordersMap[o.id] = o; });
      }

      const paymentData = payments.map((payment: any) => {
        const order = ordersMap[payment.order_id] || {};
        return {
          id: payment.id,
          payment_number: payment.payment_number,
          payment_date: payment.payment_date,
          payment_type: payment.payment_type,
          order_id: order.id || '',
          order_number: order.order_number || '',
          customer_id: order.customer?.id || '',
          customer_name_en: order.customer?.full_name_en || '',
          customer_name_ku: order.customer?.full_name_ku || '',
          currency: payment.currency,
          amount_in_currency: payment.amount_in_currency,
          amount_usd: payment.amount_usd,
        };
      });

      setPayments(paymentData);
      setFilteredPayments(paymentData);

      const totals = paymentData.reduce((acc, p) => ({
        total_payments: acc.total_payments + 1,
        total_usd: acc.total_usd + Number(p.amount_usd || 0),
        total_iqd: acc.total_iqd + (p.currency === 'IQD' ? Number(p.amount_in_currency || 0) : 0),
        deposit_count: acc.deposit_count + (p.payment_type === 'deposit' ? 1 : 0),
        installment_count: acc.installment_count + (p.payment_type === 'installment' ? 1 : 0),
        final_count: acc.final_count + (p.payment_type === 'final' ? 1 : 0),
        partial_count: acc.partial_count + (p.payment_type === 'partial' ? 1 : 0),
      }), {
        total_payments: 0,
        total_usd: 0,
        total_iqd: 0,
        deposit_count: 0,
        installment_count: 0,
        final_count: 0,
        partial_count: 0,
      });

      setSummary(totals);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...payments];

    // Payment type filter
    if (paymentTypeFilter !== 'all') {
      filtered = filtered.filter(p => p.payment_type === paymentTypeFilter);
    }

    // Customer filter
    if (customerFilter !== 'all') {
      filtered = filtered.filter(p => p.customer_id === customerFilter);
    }

    // Order filter
    if (orderFilter !== 'all') {
      filtered = filtered.filter(p => p.order_id === orderFilter);
    }

    setFilteredPayments(filtered);

    // Recalculate summary for filtered data
    const totals = filtered.reduce((acc, p) => ({
      total_payments: acc.total_payments + 1,
      total_usd: acc.total_usd + (p.currency === 'USD' ? Number(p.amount_in_currency || 0) : 0),
      total_iqd: acc.total_iqd + (p.currency === 'IQD' ? Number(p.amount_in_currency || 0) : 0),
      deposit_count: acc.deposit_count + (p.payment_type === 'deposit' ? 1 : 0),
      installment_count: acc.installment_count + (p.payment_type === 'installment' ? 1 : 0),
      final_count: acc.final_count + (p.payment_type === 'final' ? 1 : 0),
      partial_count: acc.partial_count + (p.payment_type === 'partial' ? 1 : 0),
    }), {
      total_payments: 0,
      total_usd: 0,
      total_iqd: 0,
      deposit_count: 0,
      installment_count: 0,
      final_count: 0,
      partial_count: 0,
    });

    setSummary(totals);
  }, [payments, paymentTypeFilter, customerFilter, orderFilter]);

  // Sort payments
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    let compareValue = 0;

    switch (sortField) {
      case 'payment_number':
        compareValue = a.payment_number.localeCompare(b.payment_number);
        break;
      case 'payment_date':
        compareValue = new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
        break;
      case 'payment_type':
        compareValue = a.payment_type.localeCompare(b.payment_type);
        break;
      case 'order_number':
        compareValue = a.order_number.localeCompare(b.order_number);
        break;
      case 'customer_name':
        const nameA = language === 'ku' ? a.customer_name_ku : a.customer_name_en;
        const nameB = language === 'ku' ? b.customer_name_ku : b.customer_name_en;
        compareValue = nameA.localeCompare(nameB);
        break;
      case 'amount_usd':
        compareValue = Number(a.amount_usd) - Number(b.amount_usd);
        break;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const exportToCSV = () => {
    const headers = ['Payment #', 'Date', 'Order #', 'Customer', 'Type', 'Currency', 'Amount', 'Amount USD'];
    const rows = sortedPayments.map(p => [
      p.payment_number,
      p.payment_date,
      p.order_number,
      language === 'ku' ? p.customer_name_ku : p.customer_name_en,
      p.payment_type,
      p.currency,
      p.amount_in_currency,
      p.amount_usd,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setPaymentTypeFilter('all');
    setCustomerFilter('all');
    setOrderFilter('all');
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">
            {language === 'ku' ? 'فلتەرکردن' : 'Filters'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

          <Select
            label={language === 'ku' ? 'جۆری پارەدان' : 'Payment Type'}
            value={paymentTypeFilter}
            onChange={e => setPaymentTypeFilter(e.target.value)}
          >
            <option value="all">{language === 'ku' ? 'هەموو' : 'All'}</option>
            <option value="deposit">{language === 'ku' ? 'پێشەکی' : 'Deposit'}</option>
            <option value="installment">{language === 'ku' ? 'بەش' : 'Installment'}</option>
            <option value="final">{language === 'ku' ? 'کۆتایی' : 'Final'}</option>
            <option value="partial">{language === 'ku' ? 'بەشێک' : 'Partial'}</option>
          </Select>

          <Select
            label={language === 'ku' ? 'کڕیار' : 'Customer'}
            value={customerFilter}
            onChange={e => setCustomerFilter(e.target.value)}
          >
            <option value="all">{language === 'ku' ? 'هەموو کڕیارەکان' : 'All Customers'}</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {language === 'ku' ? customer.full_name_ku : customer.full_name_en}
              </option>
            ))}
          </Select>

          <Select
            label={language === 'ku' ? 'داواکاری' : 'Order'}
            value={orderFilter}
            onChange={e => setOrderFilter(e.target.value)}
          >
            <option value="all">{language === 'ku' ? 'هەموو داواکارییەکان' : 'All Orders'}</option>
            {orders.map(order => (
              <option key={order.id} value={order.id}>
                {order.order_number}
              </option>
            ))}
          </Select>

          <div className="flex items-end gap-2">
            <Button onClick={fetchPayments} disabled={loading} className="flex-1">
              <CreditCard size={16} />
              {loading ? (language === 'ku' ? 'چاوەڕوان بە...' : 'Loading...') : (language === 'ku' ? 'پیشاندان' : 'Generate')}
            </Button>
            <Button onClick={resetFilters} variant="outline" disabled={loading}>
              {language === 'ku' ? 'ڕێکخستنەوە' : 'Reset'}
            </Button>
          </div>
        </div>
      </div>

      {payments.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} className="text-blue-600" />
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                  {language === 'ku' ? 'کۆکراو USD' : 'Total USD'}
                </p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{fmt(summary.total_usd, 'USD')}</p>
              <p className="text-xs text-blue-600 mt-1">{summary.total_payments} {language === 'ku' ? 'وەرگرتن' : 'payments'}</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} className="text-emerald-600" />
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
                  {language === 'ku' ? 'کۆکراو IQD' : 'Total IQD'}
                </p>
              </div>
              <p className="text-2xl font-bold text-emerald-900">{fmt(summary.total_iqd, 'IQD')}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={18} className="text-purple-600" />
                <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">
                  {language === 'ku' ? 'پێشەکی' : 'Deposits'}
                </p>
              </div>
              <p className="text-2xl font-bold text-purple-900">{summary.deposit_count}</p>
              <p className="text-xs text-purple-600 mt-1">{language === 'ku' ? 'وەرگرتن' : 'payments'}</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={18} className="text-amber-600" />
                <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                  {language === 'ku' ? 'جۆرەکان' : 'By Type'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                <Badge variant="neutral">{summary.installment_count} {language === 'ku' ? 'بەش' : 'Inst.'}</Badge>
                <Badge variant="warning">{summary.final_count} {language === 'ku' ? 'کۆتایی' : 'Final'}</Badge>
                <Badge variant="info">{summary.partial_count} {language === 'ku' ? 'بەشێک' : 'Part.'}</Badge>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {language === 'ku' ? 'وردەکارییەکان' : 'Payment Details'}
                <span className="text-sm text-gray-500 ml-2">
                  ({sortedPayments.length} {language === 'ku' ? 'وەرگرتن' : 'payments'})
                </span>
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
                      onClick={() => handleSort('payment_number')}
                    >
                      <div className="flex items-center gap-1">
                        {language === 'ku' ? 'ژمارە' : 'Payment #'}
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('payment_date')}
                    >
                      <div className="flex items-center gap-1">
                        {language === 'ku' ? 'بەروار' : 'Date'}
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('order_number')}
                    >
                      <div className="flex items-center gap-1">
                        {language === 'ku' ? 'داواکاری' : 'Order'}
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('customer_name')}
                    >
                      <div className="flex items-center gap-1">
                        {language === 'ku' ? 'کڕیار' : 'Customer'}
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('payment_type')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {language === 'ku' ? 'جۆر' : 'Type'}
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'بڕ' : 'Amount'}
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('amount_usd')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        USD
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedPayments.map(payment => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">
                        {payment.payment_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(payment.payment_date).toLocaleDateString(language === 'ku' ? 'ku' : 'en-US')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {payment.order_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {language === 'ku' ? payment.customer_name_ku : payment.customer_name_en}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={
                          payment.payment_type === 'deposit' ? 'success' :
                          payment.payment_type === 'final' ? 'warning' :
                          payment.payment_type === 'partial' ? 'info' :
                          'neutral'
                        }>
                          {payment.payment_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-700">
                        {fmt(payment.amount_in_currency, payment.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-700">
                        {fmt(payment.amount_usd, 'USD')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && payments.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <CreditCard size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {language === 'ku' ? 'تکایە فلتەرەکان هەڵبژێرە و دووگمەی پیشاندان دابگرە' : 'Select filters and click Generate to view report'}
          </p>
        </div>
      )}
    </>
  );
}
