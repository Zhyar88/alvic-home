import React, { useState, useEffect } from 'react';
import { Receipt, Filter, Download, DollarSign, TrendingDown, ArrowUpDown, PieChart } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Input, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface ExpenseData {
  id: string;
  expense_number: string;
  expense_date: string;
  category_id: string;
  category_name_en: string;
  category_name_ku: string;
  description_en: string;
  description_ku: string;
  currency: string;
  amount_in_currency: number;
  amount_usd: number;
}

interface ExpenseCategory {
  id: string;
  name_en: string;
  name_ku: string;
}

interface CategorySummary {
  category_name_en: string;
  category_name_ku: string;
  total: number;
  count: number;
}

type SortField = 'expense_date' | 'expense_number' | 'category_name' | 'description' | 'amount_usd';
type SortOrder = 'asc' | 'desc';

export function ExpensesReport() {
  const { language } = useLanguage();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total_expenses: 0,
    total_usd: 0,
    total_iqd: 0,
    by_category: [] as CategorySummary[],
  });

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  // Sort states
  const [sortField, setSortField] = useState<SortField>('expense_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fmt = (n: number, currency: string = 'USD') => {
    if (currency === 'IQD') {
      return `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })} IQD`;
    }
    return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch categories for filter dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('expense_categories')
        .select('id, name_en, name_ku')
        .eq('is_active', true)
        .order('name_en');

      if (data) {
        setCategories(data);
      }
    };
    fetchCategories();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('expenses')
        .select(`
          id,
          expense_number,
          expense_date,
          category_id,
          category_name_en,
          category_name_ku,
          description_en,
          description_ku,
          currency,
          amount_in_currency,
          amount_usd
        `)
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo)
        .order('expense_date', { ascending: false });

      const expenseData = (data || []).map(expense => ({
        id: expense.id,
        expense_number: expense.expense_number,
        expense_date: expense.expense_date,
        category_id: expense.category_id || '',
        category_name_en: expense.category_name_en || 'Uncategorized',
        category_name_ku: expense.category_name_ku || 'بێ پۆل',
        description_en: expense.description_en || '',
        description_ku: expense.description_ku || '',
        currency: expense.currency,
        amount_in_currency: expense.amount_in_currency,
        amount_usd: expense.amount_usd,
      }));

      setExpenses(expenseData);
      setFilteredExpenses(expenseData);

      calculateSummary(expenseData);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data: ExpenseData[]) => {
    const totals = data.reduce((acc, e) => ({
      total_expenses: acc.total_expenses + 1,
      total_usd: acc.total_usd + (e.currency === 'USD' ? Number(e.amount_in_currency || 0) : 0),
      total_iqd: acc.total_iqd + (e.currency === 'IQD' ? Number(e.amount_in_currency || 0) : 0),
    }), {
      total_expenses: 0,
      total_usd: 0,
      total_iqd: 0,
    });

    // Calculate by category
    const categoryMap = new Map<string, CategorySummary>();
    data.forEach(expense => {
      const key = expense.category_id || 'uncategorized';
      const existing = categoryMap.get(key);
      if (existing) {
        existing.total += Number(expense.amount_usd || 0);
        existing.count += 1;
      } else {
        categoryMap.set(key, {
          category_name_en: expense.category_name_en,
          category_name_ku: expense.category_name_ku,
          total: Number(expense.amount_usd || 0),
          count: 1,
        });
      }
    });

    const by_category = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);

    setSummary({ ...totals, by_category });
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...expenses];

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => e.category_id === categoryFilter);
    }

    setFilteredExpenses(filtered);
    calculateSummary(filtered);
  }, [expenses, categoryFilter]);

  // Sort expenses
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    let compareValue = 0;

    switch (sortField) {
      case 'expense_number':
        compareValue = a.expense_number.localeCompare(b.expense_number);
        break;
      case 'expense_date':
        compareValue = new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime();
        break;
      case 'category_name':
        const catA = language === 'ku' ? a.category_name_ku : a.category_name_en;
        const catB = language === 'ku' ? b.category_name_ku : b.category_name_en;
        compareValue = catA.localeCompare(catB);
        break;
      case 'description':
        const descA = language === 'ku' ? a.description_ku : a.description_en;
        const descB = language === 'ku' ? b.description_ku : b.description_en;
        compareValue = descA.localeCompare(descB);
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
    const headers = ['Expense #', 'Date', 'Category', 'Description', 'Currency', 'Amount', 'Amount USD'];
    const rows = sortedExpenses.map(e => [
      e.expense_number,
      e.expense_date,
      language === 'ku' ? e.category_name_ku : e.category_name_en,
      language === 'ku' ? e.description_ku : e.description_en,
      e.currency,
      e.amount_in_currency,
      e.amount_usd,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setCategoryFilter('all');
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            label={language === 'ku' ? 'پۆل' : 'Category'}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="all">{language === 'ku' ? 'هەموو پۆلەکان' : 'All Categories'}</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {language === 'ku' ? category.name_ku : category.name_en}
              </option>
            ))}
          </Select>

          <div className="flex items-end gap-2">
            <Button onClick={fetchExpenses} disabled={loading} className="flex-1">
              <Receipt size={16} />
              {loading ? (language === 'ku' ? 'چاوەڕوان بە...' : 'Loading...') : (language === 'ku' ? 'پیشاندان' : 'Generate')}
            </Button>
            <Button onClick={resetFilters} variant="outline" disabled={loading}>
              {language === 'ku' ? 'ڕێکخستنەوە' : 'Reset'}
            </Button>
          </div>
        </div>
      </div>

      {expenses.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={18} className="text-red-600" />
                <p className="text-xs font-medium text-red-700 uppercase tracking-wide">
                  {language === 'ku' ? 'کۆی خەرجی' : 'Total Expenses'}
                </p>
              </div>
              <p className="text-2xl font-bold text-red-900">{fmt(summary.total_usd + (summary.total_iqd / 1330), 'USD')}</p>
              <p className="text-xs text-red-600 mt-1">{summary.total_expenses} {language === 'ku' ? 'خەرجی' : 'expenses'}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} className="text-blue-600" />
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                  {language === 'ku' ? 'کۆکراو USD' : 'Total USD'}
                </p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{fmt(summary.total_usd, 'USD')}</p>
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
                <PieChart size={18} className="text-purple-600" />
                <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">
                  {language === 'ku' ? 'پۆلەکان' : 'Categories'}
                </p>
              </div>
              <p className="text-2xl font-bold text-purple-900">{summary.by_category.length}</p>
              <p className="text-xs text-purple-600 mt-1">{language === 'ku' ? 'پۆلی جیاواز' : 'different'}</p>
            </div>
          </div>

          {/* Category Breakdown */}
          {summary.by_category.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">
                {language === 'ku' ? 'دابەشکردن بەپێی پۆل' : 'Breakdown by Category'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {summary.by_category.map((cat, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {language === 'ku' ? cat.category_name_ku : cat.category_name_en}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-lg font-bold text-red-700">{fmt(cat.total, 'USD')}</p>
                      <Badge variant="neutral">{cat.count} {language === 'ku' ? 'خەرجی' : 'items'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {language === 'ku' ? 'وردەکارییەکان' : 'Expense Details'}
                <span className="text-sm text-gray-500 ml-2">
                  ({sortedExpenses.length} {language === 'ku' ? 'خەرجی' : 'expenses'})
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
                      onClick={() => handleSort('expense_number')}
                    >
                      <div className="flex items-center gap-1">
                        {language === 'ku' ? 'ژمارە' : 'Expense #'}
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('expense_date')}
                    >
                      <div className="flex items-center gap-1">
                        {language === 'ku' ? 'بەروار' : 'Date'}
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('category_name')}
                    >
                      <div className="flex items-center gap-1">
                        {language === 'ku' ? 'پۆل' : 'Category'}
                        <ArrowUpDown size={14} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('description')}
                    >
                      <div className="flex items-center gap-1">
                        {language === 'ku' ? 'وەسف' : 'Description'}
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
                  {sortedExpenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">
                        {expense.expense_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(expense.expense_date).toLocaleDateString(language === 'ku' ? 'ku' : 'en-US')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="neutral">
                          {language === 'ku' ? expense.category_name_ku : expense.category_name_en}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {language === 'ku' ? expense.description_ku : expense.description_en}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-red-700">
                        {fmt(expense.amount_in_currency, expense.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-red-700">
                        {fmt(expense.amount_usd, 'USD')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && expenses.length === 0 && (
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
