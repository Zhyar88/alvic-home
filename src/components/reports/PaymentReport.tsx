import React, { useState } from 'react';
import { CreditCard, Filter, Download, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Input } from '../ui/Input';
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
}

export function PaymentReport() {
  const { language } = useLanguage();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total_payments: 0,
    total_usd: 0,
    total_iqd: 0,
    deposit_count: 0,
    installment_count: 0,
    final_count: 0,
  });

  const fmt = (n: number, currency: string = 'USD') => {
    if (currency === 'IQD') {
      return `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })} IQD`;
    }
    return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('payments')
        .select(`
          id,
          payment_number,
          payment_date,
          payment_type,
          currency,
          amount_in_currency,
          amount_usd,
          orders (
            order_number,
            customers (
              full_name_en,
              full_name_ku
            )
          )
        `)
        .gte('payment_date', dateFrom)
        .lte('payment_date', dateTo)
        .eq('is_reversed', false)
        .order('payment_date', { ascending: false });

      const paymentData = (data || []).map(payment => ({
        id: payment.id,
        payment_number: payment.payment_number,
        payment_date: payment.payment_date,
        payment_type: payment.payment_type,
        order_number: payment.orders?.order_number || '',
        customer_name_en: payment.orders?.customers?.full_name_en || '',
        customer_name_ku: payment.orders?.customers?.full_name_ku || '',
        currency: payment.currency,
        amount_in_currency: payment.amount_in_currency,
        amount_usd: payment.amount_usd,
      }));

      setPayments(paymentData);

      const totals = paymentData.reduce((acc, p) => ({
        total_payments: acc.total_payments + 1,
        total_usd: acc.total_usd + (p.currency === 'USD' ? Number(p.amount_in_currency || 0) : 0),
        total_iqd: acc.total_iqd + (p.currency === 'IQD' ? Number(p.amount_in_currency || 0) : 0),
        deposit_count: acc.deposit_count + (p.payment_type === 'deposit' ? 1 : 0),
        installment_count: acc.installment_count + (p.payment_type === 'installment' ? 1 : 0),
        final_count: acc.final_count + (p.payment_type === 'final' ? 1 : 0),
      }), {
        total_payments: 0,
        total_usd: 0,
        total_iqd: 0,
        deposit_count: 0,
        installment_count: 0,
        final_count: 0,
      });

      setSummary(totals);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Payment #', 'Date', 'Order #', 'Customer', 'Type', 'Currency', 'Amount', 'Amount USD'];
    const rows = payments.map(p => [
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
            <Button onClick={fetchPayments} disabled={loading} className="flex-1">
              <CreditCard size={16} />
              {loading ? (language === 'ku' ? 'چاوەڕوان بە...' : 'Loading...') : (language === 'ku' ? 'پیشاندان' : 'Generate')}
            </Button>
          </div>
        </div>
      </div>

      {payments.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={18} className="text-gray-600" />
                <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  {language === 'ku' ? 'جۆرەکان' : 'By Type'}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <Badge variant="success">{summary.deposit_count} {language === 'ku' ? 'پێشەکی' : 'Deposit'}</Badge>
                <Badge variant="neutral">{summary.installment_count} {language === 'ku' ? 'بەش' : 'Installment'}</Badge>
                <Badge variant="warning">{summary.final_count} {language === 'ku' ? 'کۆتایی' : 'Final'}</Badge>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {language === 'ku' ? 'وردەکارییەکان' : 'Payment Details'}
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
                      {language === 'ku' ? 'ژمارە' : 'Payment #'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'بەروار' : 'Date'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'داواکاری' : 'Order'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'کڕیار' : 'Customer'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'جۆر' : 'Type'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {language === 'ku' ? 'بڕ' : 'Amount'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      USD
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map(payment => (
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
                        <Badge variant={payment.payment_type === 'deposit' ? 'success' : payment.payment_type === 'final' ? 'warning' : 'neutral'}>
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
