import React, { useState, useEffect } from 'react';
import { Calendar, Download, DollarSign, TrendingUp, AlertCircle, ArrowUpDown, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface InstallmentData {
  id: string;
  order_id: string;
  order_number: string;
  customer_name_en: string;
  customer_name_ku: string;
  installment_number: number;
  due_date: string;
  amount_usd: number;
  paid_amount_usd: number;
  status: string;
  is_modified: boolean;
}

type SortField = 'due_date' | 'installment_number' | 'order_number' | 'customer_name' | 'amount_usd' | 'paid_amount_usd' | 'status';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'paid' | 'unpaid' | 'overdue' | 'partial';

export function InstallmentReport() {
  const { language } = useLanguage();
  const [installments, setInstallments] = useState<InstallmentData[]>([]);
  const [filteredInstallments, setFilteredInstallments] = useState<InstallmentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total_due: 0,
    total_paid: 0,
    total_pending: 0,
    overdue_count: 0,
    paid_count: 0,
    unpaid_count: 0,
    partial_count: 0,
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Sort states
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchInstallments = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('installment_entries')
        .select(`
          id,
          installment_number,
          due_date,
          amount_usd,
          paid_amount_usd,
          status,
          is_modified,
          orders!inner (
            id,
            order_number,
            customers (
              full_name_en,
              full_name_ku
            )
          )
        `)
        .order('due_date', { ascending: true });

      const installmentData = (data || []).map(entry => ({
        id: entry.id,
        order_id: entry.orders?.id || '',
        order_number: entry.orders?.order_number || '',
        customer_name_en: entry.orders?.customers?.full_name_en || '',
        customer_name_ku: entry.orders?.customers?.full_name_ku || '',
        installment_number: entry.installment_number,
        due_date: entry.due_date,
        amount_usd: entry.amount_usd,
        paid_amount_usd: entry.paid_amount_usd,
        status: entry.status,
        is_modified: entry.is_modified,
      }));

      setInstallments(installmentData);
      setFilteredInstallments(installmentData);

      calculateSummary(installmentData);
    } catch (error) {
      console.error('Error fetching installments:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data: InstallmentData[]) => {
    const totals = data.reduce((acc, i) => ({
      total_due: acc.total_due + Number(i.amount_usd || 0),
      total_paid: acc.total_paid + Number(i.paid_amount_usd || 0),
      total_pending: acc.total_pending + (Number(i.amount_usd || 0) - Number(i.paid_amount_usd || 0)),
      overdue_count: acc.overdue_count + (i.status === 'overdue' ? 1 : 0),
      paid_count: acc.paid_count + (i.status === 'paid' ? 1 : 0),
      unpaid_count: acc.unpaid_count + (i.status === 'unpaid' ? 1 : 0),
      partial_count: acc.partial_count + (i.status === 'partial' ? 1 : 0),
    }), {
      total_due: 0,
      total_paid: 0,
      total_pending: 0,
      overdue_count: 0,
      paid_count: 0,
      unpaid_count: 0,
      partial_count: 0,
    });

    setSummary(totals);
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...installments];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }

    setFilteredInstallments(filtered);
    calculateSummary(filtered);
  }, [installments, statusFilter]);

  // Sort installments
  const sortedInstallments = [...filteredInstallments].sort((a, b) => {
    let compareValue = 0;

    switch (sortField) {
      case 'due_date':
        compareValue = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        break;
      case 'installment_number':
        compareValue = a.installment_number - b.installment_number;
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
      case 'paid_amount_usd':
        compareValue = Number(a.paid_amount_usd) - Number(b.paid_amount_usd);
        break;
      case 'status':
        compareValue = a.status.localeCompare(b.status);
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
    const headers = ['Order', 'Customer', 'Installment #', 'Due Date', 'Amount', 'Paid', 'Status'];
    const rows = sortedInstallments.map(i => [
      i.order_number,
      language === 'ku' ? i.customer_name_ku : i.customer_name_en,
      i.installment_number,
      i.due_date,
      i.amount_usd,
      i.paid_amount_usd,
      i.status,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `installment_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchInstallments();
  }, []);

  const collectionRate = summary.total_due > 0 ? (summary.total_paid / summary.total_due) * 100 : 0;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">
              {language === 'ku' ? 'دۆخی بەشەکان' : 'Installment Status'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {language === 'ku' ? 'هەموو بەشە پارەکان' : 'All installment payments'}
            </p>
          </div>
          <Button onClick={fetchInstallments} disabled={loading} size="sm">
            {loading ? (language === 'ku' ? 'چاوەڕوان بە...' : 'Loading...') : (language === 'ku' ? 'نوێکردنەوە' : 'Refresh')}
          </Button>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant={statusFilter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            {language === 'ku' ? 'هەموو' : 'All'}
            <Badge variant="neutral" className="ml-2">{installments.length}</Badge>
          </Button>
          <Button
            variant={statusFilter === 'paid' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('paid')}
          >
            <CheckCircle size={14} />
            {language === 'ku' ? 'پارەدراو' : 'Paid'}
            <Badge variant="success" className="ml-2">{summary.paid_count}</Badge>
          </Button>
          <Button
            variant={statusFilter === 'unpaid' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('unpaid')}
          >
            <Clock size={14} />
            {language === 'ku' ? 'پارەنەدراو' : 'Unpaid'}
            <Badge variant="neutral" className="ml-2">{summary.unpaid_count}</Badge>
          </Button>
          <Button
            variant={statusFilter === 'overdue' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('overdue')}
          >
            <XCircle size={14} />
            {language === 'ku' ? 'دواکەوتوو' : 'Overdue'}
            <Badge variant="error" className="ml-2">{summary.overdue_count}</Badge>
          </Button>
          <Button
            variant={statusFilter === 'partial' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('partial')}
          >
            <AlertCircle size={14} />
            {language === 'ku' ? 'بەشێک' : 'Partial'}
            <Badge variant="warning" className="ml-2">{summary.partial_count}</Badge>
          </Button>
        </div>
      </div>

      {installments.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} className="text-blue-600" />
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                  {language === 'ku' ? 'کۆی بەش' : 'Total Due'}
                </p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{fmt(summary.total_due)}</p>
              <p className="text-xs text-blue-600 mt-1">{filteredInstallments.length} {language === 'ku' ? 'بەش' : 'installments'}</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-emerald-600" />
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
                  {language === 'ku' ? 'پارەدراو' : 'Collected'}
                </p>
              </div>
              <p className="text-2xl font-bold text-emerald-900">{fmt(summary.total_paid)}</p>
              <p className="text-xs text-emerald-600 mt-1">{collectionRate.toFixed(1)}% {language === 'ku' ? 'ڕێژە' : 'rate'}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} className="text-orange-600" />
                <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">
                  {language === 'ku' ? 'ماوە' : 'Pending'}
                </p>
              </div>
              <p className="text-2xl font-bold text-orange-900">{fmt(summary.total_pending)}</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={18} className="text-red-600" />
                <p className="text-xs font-medium text-red-700 uppercase tracking-wide">
                  {language === 'ku' ? 'دواکەوتوو' : 'Overdue'}
                </p>
              </div>
              <p className="text-2xl font-bold text-red-900">{summary.overdue_count}</p>
              <p className="text-xs text-red-600 mt-1">{language === 'ku' ? 'بەش' : 'installments'}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {language === 'ku' ? 'وردەکارییەکان' : 'Installment Details'}
                <span className="text-sm text-gray-500 ml-2">
                  ({sortedInstallments.length} {language === 'ku' ? 'بەش' : 'installments'})
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
                      onClick={() => handleSort('due_date')}
                    >
                      <div className="flex items-center gap-1">
                        {language === 'ku' ? 'بەرواری کۆتایی' : 'Due Date'}
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('installment_number')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        #
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
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('amount_usd')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'بڕ' : 'Amount'}
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('paid_amount_usd')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {language === 'ku' ? 'پارەدراو' : 'Paid'}
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {language === 'ku' ? 'دۆخ' : 'Status'}
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedInstallments.map(installment => (
                    <tr key={installment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(installment.due_date).toLocaleDateString(language === 'ku' ? 'ku' : 'en-US')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="neutral">{installment.installment_number}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">
                        {installment.order_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {language === 'ku' ? installment.customer_name_ku : installment.customer_name_en}
                        {installment.is_modified && (
                          <Badge variant="warning" className="ml-2">
                            {language === 'ku' ? 'گۆڕدراو' : 'Modified'}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-700">
                        {fmt(installment.amount_usd)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-700">
                        {fmt(installment.paid_amount_usd)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={
                          installment.status === 'paid' ? 'success' :
                          installment.status === 'overdue' ? 'error' :
                          installment.status === 'partial' ? 'warning' : 'neutral'
                        }>
                          {installment.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && installments.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {language === 'ku' ? 'هیچ بەشێک نییە' : 'No installments found'}
          </p>
        </div>
      )}
    </>
  );
}
