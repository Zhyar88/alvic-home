import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, CreditCard as Edit, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Lock as LockIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useCashRegister } from '../contexts/CashRegisterContext';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { BilingualInput } from '../components/ui/BilingualInput';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Table';
import type { Expense, ExpenseCategory, Order, Currency } from '../types';
import { supabase } from '../lib/database';

const PAGE_SIZE = 20;

export function Expenses() {
  const { t, language } = useLanguage();
  const { profile, hasPermission } = useAuth();
  const { activeSession, logTransaction } = useCashRegister();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [sortField, setSortField] = useState('expense_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [currentRate, setCurrentRate] = useState(1330);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    category_id: '',
    description_en: '', description_ku: '',
    currency: 'USD' as Currency,
    amount_in_currency: '',
    expense_date: new Date().toISOString().split('T')[0],
    linked_order_id: '',
    notes_en: '', notes_ku: '',
  });

  useEffect(() => {
    supabase.from('expense_categories').select('*').eq('is_active', true).order('sort_order').then(({ data }) => setCategories((data || []) as ExpenseCategory[]));
    supabase.from('orders').select('id,order_number').order('created_at', { ascending: false }).then(({ data }) => setOrders((data || []) as Order[]));
    supabase.from('exchange_rates').select('rate_cash').order('effective_date', { ascending: false }).order('created_at', { ascending: false }).limit(1).maybeSingle().then(({ data }) => { if (data) setCurrentRate(Number(data.rate_cash)); });
  }, []);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('expenses', { count: 'exact' }).select('*, category:expense_categories(name_en,name_ku)');
    if (search) query = query.or(`description_en.ilike.%${search}%,description_ku.ilike.%${search}%`);
    if (filterCat !== 'all') query = query.eq('category_id', filterCat);
    if (filterDate) query = query.eq('expense_date', filterDate);
    const validFields = ['expense_date', 'amount_usd', 'currency'];
    const dbField = validFields.includes(sortField) ? sortField : 'expense_date';
    const from = (page - 1) * PAGE_SIZE;
    const { data, count } = await query.order(dbField, { ascending: sortDir === 'asc' }).range(from, from + PAGE_SIZE - 1);
    setExpenses((data || []) as Expense[]);
    setTotal(count || 0);
    setLoading(false);
  }, [search, filterCat, filterDate, page, sortField, sortDir]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => { setPage(1); }, [search, filterCat, filterDate, sortField, sortDir]);

  const getAmountUSD = () => {
    const amt = Number(formData.amount_in_currency || 0);
    return formData.currency === 'USD' ? amt : amt / currentRate;
  };

  const handleSave = async () => {
    console.log('handleSave called');
  console.log('description_en:', formData.description_en);
  console.log('description_ku:', formData.description_ku);
  console.log('activeSession:', activeSession);
  console.log('selectedExpense:', selectedExpense);
  if (!formData.description_en && !formData.description_ku) {
    console.log('BLOCKED: no description');
    return;
  }
  if (!selectedExpense && !activeSession) {
    console.log('BLOCKED: no session and no selected expense');
    return;
  }
    if (!selectedExpense && !activeSession) return;  // ← THIS LINE
    setSaving(true);
console.log('past checks, saving...');
const cat = categories.find(c => c.id === formData.category_id);
const amtUSD = getAmountUSD();
console.log('amtUSD:', amtUSD);
console.log('amount_in_currency:', formData.amount_in_currency);
    const expNum = `EXP-${Date.now()}`;
    const payload = {
      expense_number: selectedExpense?.expense_number || expNum,
      category_id: formData.category_id || null,
      category_name_en: cat?.name_en || '',
      category_name_ku: cat?.name_ku || '',
      description_en: formData.description_en,
      description_ku: formData.description_ku,
      currency: formData.currency,
      amount_in_currency: Number(formData.amount_in_currency),
      exchange_rate_used: currentRate,
      amount_usd: amtUSD,
      expense_date: formData.expense_date,
      linked_order_id: formData.linked_order_id || null,
      notes_en: formData.notes_en,
      notes_ku: formData.notes_ku,
      created_by: profile?.id,
      updated_at: new Date().toISOString(),
    };

    if (selectedExpense) {
      await supabase.from('expenses').update(payload).eq('id', selectedExpense.id);
    } else {
      console.log('inserting expense payload:', payload);
const { data: insertedRows } = await supabase
  .from('expenses')
  .insert([{ ...payload, created_at: new Date().toISOString() }]);

const expData = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;
console.log('insert result:', expData);

if (activeSession && expData?.id && amtUSD > 0) {
        await logTransaction({
          session_id: activeSession.id,
          transaction_type: 'expense',
          reference_type: 'expense',
          reference_id: expData.id,
          reference_number: payload.expense_number,
          description_en: formData.description_en || formData.description_ku,
          description_ku: formData.description_ku || formData.description_en,
          amount_usd: amtUSD,
          currency: formData.currency,
          amount_in_currency: Number(formData.amount_in_currency),
          exchange_rate_used: currentRate,
          created_by: profile?.id,
        });
      }
    }
    setSaving(false);
    setShowModal(false);
    fetchExpenses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    await supabase.from('expenses').delete().eq('id', id);
    fetchExpenses();
  };

  const openCreate = () => {
    setFormData({ category_id: '', description_en: '', description_ku: '', currency: 'USD', amount_in_currency: '', expense_date: new Date().toISOString().split('T')[0], linked_order_id: '', notes_en: '', notes_ku: '' });
    setSelectedExpense(null);
    setShowModal(true);
  };

  const openEdit = (e: Expense) => {
    setFormData({
      category_id: e.category_id || '',
      description_en: e.description_en, description_ku: e.description_ku,
      currency: e.currency, amount_in_currency: String(e.amount_in_currency),
      expense_date: e.expense_date,
      linked_order_id: e.linked_order_id || '',
      notes_en: e.notes_en, notes_ku: e.notes_ku,
    });
    setSelectedExpense(e);
    setShowModal(true);
  };

  const canCreate = hasPermission('expenses', 'create');
  const canEdit = hasPermission('expenses', 'update');
  const canDelete = hasPermission('expenses', 'delete');

  const fmt = (n: number) => `$${Number(n).toFixed(2)}`;
  const totalAmount = expenses.reduce((s, e) => s + e.amount_usd, 0);
const fmtDate = (dateStr: string) => {
    // If it's just a date string "2026-03-11", use it directly
    // If it's a full ISO string, extract the date in LOCAL time (not UTC)
    if (dateStr.includes('T')) {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };
  return (
    <div className="p-4 lg:p-6 space-y-5">
      {!activeSession && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <LockIcon size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-800">{t('cashRegisterClosed')}</p>
            <p className="text-amber-700 text-xs">{t('openCashRegisterForExpenses')}</p>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchExpenses')} className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
          <option value="all">{t('allCategories')}</option>
          {categories.map(c => <option key={c.id} value={c.id}>{language === 'ku' ? c.name_ku : c.name_en}</option>)}
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none" />
        {canCreate && <Button onClick={openCreate} icon={<Plus size={16} />} disabled={!activeSession}>{t('addNew')}</Button>}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">{total} {t('expenses2')}</span>
        <span className="font-bold text-red-700">{t('total')}: {fmt(totalAmount)}</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{t('category')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{t('description')}</th>
              {[['amount_usd', t('amount')], ['currency', t('currency')], ['expense_date', t('date')]].map(([field, label]) => (
                <th key={field} onClick={() => toggleSort(field)}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap cursor-pointer hover:text-gray-700 select-none">
                  {label}
                  {sortField === field
                    ? (sortDir === 'asc' ? <ChevronUp size={12} className="text-emerald-600 ml-1 inline" /> : <ChevronDown size={12} className="text-emerald-600 ml-1 inline" />)
                    : <ChevronsUpDown size={12} className="text-gray-300 ml-1 inline" />}
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{t('orders')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">{t('loading')}</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">{t('noData')}</td></tr>
            ) : expenses.map(exp => (
              <tr key={exp.id} className="hover:bg-red-50/10 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{exp.expense_number}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium">
                    {language === 'ku' ? exp.category_name_ku : exp.category_name_en}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-900">{language === 'ku' ? exp.description_ku : exp.description_en}</p>
                  <p className="text-xs text-gray-400">{language === 'ku' ? exp.description_en : exp.description_ku}</p>
                </td>
                <td className="px-4 py-3 font-bold text-red-700">{fmt(exp.amount_usd)}</td>
                <td className="px-4 py-3 text-xs">{exp.currency === 'IQD' ? `${Number(exp.amount_in_currency).toLocaleString()} IQD` : fmt(exp.amount_in_currency)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(exp.expense_date)}</td>
                <td className="px-4 py-3 font-mono text-xs text-emerald-700">{exp.linked_order_id ? orders.find(o => o.id === exp.linked_order_id)?.order_number || '—' : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {canEdit && <button onClick={() => openEdit(exp)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-700 transition-colors"><Edit size={14} /></button>}
                    {canDelete && <button onClick={() => handleDelete(exp.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedExpense ? t('editExpense') : t('addExpense')} size="lg" footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowModal(false)}>{t('cancel')}</Button>
          <Button onClick={handleSave} loading={saving}>{t('save')}</Button>
        </div>
      }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')}</label>
            <select value={formData.category_id} onChange={e => setFormData(p => ({ ...p, category_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white">
              <option value="">{t('selectOption')}</option>
              {categories.map(c => <option key={c.id} value={c.id}>{language === 'ku' ? c.name_ku : c.name_en}</option>)}
            </select>
          </div>
          <BilingualInput
            labelEn={t('descriptionEn')}
            labelKu={t('descriptionKu')}
            valueEn={formData.description_en}
            valueKu={formData.description_ku}
            onChangeEn={v => setFormData(p => ({ ...p, description_en: v }))}
            onChangeKu={v => setFormData(p => ({ ...p, description_ku: v }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('currency')} value={formData.currency} onChange={e => setFormData(p => ({ ...p, currency: e.target.value as Currency }))} options={[{ value: 'USD', label: 'USD' }, { value: 'IQD', label: 'IQD' }]} />
            <Input label={`${t('amount')} (${formData.currency})`} type="number" min={0} step={0.01} value={formData.amount_in_currency} onChange={e => setFormData(p => ({ ...p, amount_in_currency: e.target.value }))} required />
          </div>
          {formData.currency === 'IQD' && formData.amount_in_currency && (
            <div className="p-3 bg-emerald-50 rounded-xl text-sm">
              {t('rateLabel')}: {currentRate.toLocaleString()} IQD = <strong className="text-emerald-700">${getAmountUSD().toFixed(2)}</strong>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('date')} type="date" value={formData.expense_date} onChange={e => setFormData(p => ({ ...p, expense_date: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('linkedOrder')}</label>
              <select value={formData.linked_order_id} onChange={e => setFormData(p => ({ ...p, linked_order_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white">
                <option value="">{t('noneGeneralOverhead')}</option>
                {orders.map(o => <option key={o.id} value={o.id}>{o.order_number}</option>)}
              </select>
            </div>
          </div>
          <BilingualInput labelEn={t('notesEn')} labelKu={t('notesKu')} valueEn={formData.notes_en} valueKu={formData.notes_ku} onChangeEn={v => setFormData(p => ({ ...p, notes_en: v }))} onChangeKu={v => setFormData(p => ({ ...p, notes_ku: v }))} type="textarea" />
        </div>
      </Modal>
    </div>
  );
}
