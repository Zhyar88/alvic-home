import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Eye, CreditCard as Edit, Trash2, ChevronRight, Package, Tag, ChevronUp, ChevronDown, ChevronsUpDown, History, Printer } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { BilingualInput } from '../components/ui/BilingualInput';
import { Modal } from '../components/ui/Modal';
import { Badge, OrderStatusBadge } from '../components/ui/Badge';
import { Pagination } from '../components/ui/Table';
import { OrderPaymentHistory } from '../components/orders/OrderPaymentHistory';
import { OrderContract } from '../components/orders/OrderContract';
import type { Order, Customer, UserProfile, OrderItem, ProductType } from '../types';
import { supabase } from '../lib/database';

type SortField = 'order_number' | 'customer' | 'status' | 'sale_type' | 'final_total_usd' | 'balance_due_usd' | 'created_at';
type SortDir = 'asc' | 'desc';

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <ChevronsUpDown size={12} className="text-gray-300 ml-1 inline" />;
  return dir === 'asc' ? <ChevronUp size={12} className="text-emerald-600 ml-1 inline" /> : <ChevronDown size={12} className="text-emerald-600 ml-1 inline" />;
}

const PAGE_SIZE = 15;
const ORDER_STATUSES = ['draft', 'approved', 'deposit_paid', 'in_production', 'ready', 'installed', 'finished'];
const PRODUCT_TYPES: { value: ProductType; labelEn: string; labelKu: string }[] = [
  { value: 'kitchen_cabinet', labelEn: 'Kitchen Cabinet', labelKu: 'کابینەتی چێشتخانە' },
  { value: 'bedroom_cabinet', labelEn: 'Bedroom Cabinet', labelKu: 'کابینەتی ژووری خەو' },
  { value: 'tv_console', labelEn: 'TV Console', labelKu: 'کۆنسۆلی تەلەڤزیۆن' },
  { value: 'shoe_cabinet', labelEn: 'Shoe Cabinet', labelKu: 'کابینەتی پێڵاو' },
  { value: 'understairs_cabinet', labelEn: 'Understairs Cabinet', labelKu: 'کابینەتی ژێر پلەکان' },
  { value: 'custom_console', labelEn: 'Custom Console', labelKu: 'کۆنسۆلی تایبەتمەند' },
];

const KITCHEN_FIELDS = [
  { key: 'upper_cabinet_door_color', enLabel: 'Upper Cabinet Door Color', kuLabel: 'ڕەنگی دەرگای کابینەتی سەروو' },
  { key: 'lower_cabinet_door_color', enLabel: 'Lower Cabinet Door Color', kuLabel: 'ڕەنگی دەرگای کابینەتی خوارەوە' },
  { key: 'cabinet_body_color', enLabel: 'Cabinet Body Color', kuLabel: 'ڕەنگی جەستەی کابینەت' },
  { key: 'naxsh', enLabel: 'Naxsh', kuLabel: 'نەخش' },
  { key: 'crown', enLabel: 'Crown', kuLabel: 'کراون' },
  { key: 'kiler', enLabel: 'Kiler', kuLabel: 'کیلەر' },
  { key: 'cabinet_top', enLabel: 'Cabinet Top', kuLabel: 'سەری کابینەت' },
  { key: 'stove', enLabel: 'Stove', kuLabel: 'ئۆجاق' },
  { key: 'countertop', enLabel: 'Countertop (Stone)', kuLabel: 'سەری کانتەر (بەرد)' },
  { key: 'liner_led', enLabel: 'Liner LED', kuLabel: 'لاینەر LED' },
  { key: 'suction_device', enLabel: 'Suction Device', kuLabel: 'ئامێری مێژانەوە' },
  { key: 'microwave', enLabel: 'Microwave', kuLabel: 'مایکرۆویڤ' },
  { key: 'mujameda', enLabel: 'Mujameda', kuLabel: 'موجەمەدا' },
  { key: 'handle_type', enLabel: 'Handle Type', kuLabel: 'جۆری دەستگیرە' },
  { key: 'oven', enLabel: 'Oven', kuLabel: 'تەنوور' },
  { key: 'fridge', enLabel: 'Fridge', kuLabel: 'بریکێل' },
  { key: 'washer', enLabel: 'Washer', kuLabel: 'مەکینەی شستن' },
  { key: 'baza', enLabel: 'Baza', kuLabel: 'بازا' },
  { key: 'glass_color', enLabel: 'Glass Color', kuLabel: 'ڕەنگی شووشە' },
];

const emptyItem = (type: ProductType): Partial<OrderItem> => ({
  product_type: type,
  product_type_name_en: PRODUCT_TYPES.find(p => p.value === type)?.labelEn || '',
  product_type_name_ku: PRODUCT_TYPES.find(p => p.value === type)?.labelKu || '',
  item_name_en: '',
  item_name_ku: '',
  quantity: 1,
  unit_price_usd: 0,
  total_price_usd: 0,
  cost_price_usd: 0,
  profit_per_unit_usd: 0,
  total_profit_usd: 0,
  config: {},
  notes_en: '',
  notes_ku: '',
  sort_order: 0,
});

export function Orders() {
  const { t, language } = useLanguage();
  const { profile, hasPermission } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [contractOrder, setContractOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [currentRate, setCurrentRate] = useState<{ rate_cash: number; rate_installment: number }>({ rate_cash: 1330, rate_installment: 1470 });

  const [formData, setFormData] = useState<Partial<Order>>({
    sale_type: 'cash',
    status: 'draft',
    discount_percent: 0,
    installment_months: 6,
    installment_mode: 'by_months',
    installment_monthly_amount: 0,
    notes_en: '',
    notes_ku: '',
  });
  const [items, setItems] = useState<Partial<OrderItem>[]>([]);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [saving, setSaving] = useState(false);

  const statusLabels: Record<string, string> = {
    draft: t('draft'), approved: t('approved'), deposit_paid: t('deposit_paid'),
    in_production: t('in_production'), ready: t('ready'), installed: t('installed'), finished: t('finished'),
  };

  useEffect(() => {
    supabase.from('customers').select('id,full_name_en,full_name_ku').eq('is_active', true).order('full_name_en').then(({ data }) => setCustomers((data || []) as Customer[]));
    supabase.from('user_profiles').select('id,full_name_en,full_name_ku,role').eq('is_active', true).then(({ data }) => setEmployees((data || []) as UserProfile[]));
    supabase.from('exchange_rates').select('rate_cash,rate_installment').order('effective_date', { ascending: false }).order('created_at', { ascending: false }).limit(1).maybeSingle().then(({ data }) => {
      if (data) setCurrentRate({ rate_cash: Number(data.rate_cash), rate_installment: Number(data.rate_installment) });
    });
  }, []);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('orders').select('*, customer:customers(full_name_en, full_name_ku)', { count: 'exact' });
    if (search) query = query.or(`order_number.ilike.%${search}%`);
    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    if (filterType !== 'all') query = query.eq('sale_type', filterType);

    const serverSortable: Partial<Record<SortField, string>> = {
      order_number: 'order_number',
      status: 'status',
      sale_type: 'sale_type',
      final_total_usd: 'final_total_usd',
      balance_due_usd: 'balance_due_usd',
      created_at: 'created_at',
    };
    const dbField = serverSortable[sortField] || 'created_at';
    query = query.order(dbField, { ascending: sortDir === 'asc' });

    const from = (page - 1) * PAGE_SIZE;
    const { data, count } = await query.range(from, from + PAGE_SIZE - 1);

    let result = (data || []) as Order[];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o => {
        const cust = o.customer as Record<string, string> | undefined;
        return (
          (o.order_number || '').toLowerCase().includes(q) ||
          (cust?.full_name_en || '').toLowerCase().includes(q) ||
          (cust?.full_name_ku || '').toLowerCase().includes(q) ||
          (o.status || '').toLowerCase().includes(q) ||
          (o.sale_type || '').toLowerCase().includes(q)
        );
      });
    }

    if (sortField === 'customer') {
      result.sort((a, b) => {
        const key = 'full_name_en';
        const aV = String((a.customer as Record<string, string>)?.[key] || '');
        const bV = String((b.customer as Record<string, string>)?.[key] || '');
        return sortDir === 'asc' ? aV.localeCompare(bV) : bV.localeCompare(aV);
      });
    }

    setOrders(result);
    setTotal(count || 0);
    setLoading(false);
  }, [search, filterStatus, filterType, page, sortField, sortDir]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [search, filterStatus, filterType, sortField, sortDir]);

  const calcTotals = (itemsList: Partial<OrderItem>[], discountPct: number, _saleType: string): Partial<Order> => {
    const total = itemsList.reduce((s, i) => s + (i.total_price_usd || 0), 0);
    const discountAmt = total * (discountPct / 100);
    const finalTotal = total - discountAmt;
    return {
      total_amount_usd: total,
      discount_amount_usd: discountAmt,
      final_total_usd: finalTotal,
      deposit_required_usd: finalTotal * 0.5,
      balance_due_usd: finalTotal,
      total_paid_usd: 0,
      deposit_paid_usd: 0,
    };
  };

  const openCreate = () => {
    setFormData({ sale_type: 'cash', status: 'draft', discount_percent: 0, installment_months: 6, installment_mode: 'by_months', installment_monthly_amount: 0, notes_en: '', notes_ku: '', customer_id: '' });
    setItems([]);
    setSelectedOrder(null);
    setShowForm(true);
  };

  const openEdit = async (order: Order) => {
    const { data: itemData } = await supabase.from('order_items').select('*').eq('order_id', order.id).order('sort_order');
    setFormData({ ...order });
    setItems((itemData || []) as OrderItem[]);
    setSelectedOrder(order);
    setShowForm(true);
  };

  const openDetail = async (order: Order) => {
    const { data: itemData } = await supabase.from('order_items').select('*').eq('order_id', order.id).order('sort_order');
    setSelectedOrder({ ...order, items: (itemData || []) as OrderItem[] });
    setShowDetail(true);
  };

  const addItem = (type: ProductType) => {
    setItems(prev => [...prev, emptyItem(type)]);
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, key: keyof OrderItem, value: unknown) => {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      if (key === 'quantity' || key === 'unit_price_usd') {
        next[idx].total_price_usd = (Number(next[idx].quantity || 1)) * (Number(next[idx].unit_price_usd || 0));
      }
      if (key === 'quantity' || key === 'unit_price_usd' || key === 'cost_price_usd') {
        const unitPrice = Number(next[idx].unit_price_usd || 0);
        const costPrice = Number(next[idx].cost_price_usd || 0);
        const qty = Number(next[idx].quantity || 1);
        next[idx].profit_per_unit_usd = unitPrice - costPrice;
        next[idx].total_profit_usd = (unitPrice - costPrice) * qty;
        if (key === 'cost_price_usd') {
          next[idx].profit_updated_by = profile?.id;
          next[idx].profit_updated_at = new Date().toISOString();
        }
      }
      return next;
    });
  };

  const updateItemConfig = (idx: number, field: string, value: string, lang: 'en' | 'ku') => {
    setItems(prev => {
      const next = [...prev];
      const config = { ...(next[idx].config || {}) } as Record<string, string>;
      config[`${field}_${lang}`] = value;
      next[idx] = { ...next[idx], config };
      return next;
    });
  };

  const handleSave = async () => {
    if (!formData.customer_id) return;
    setSaving(true);

    const dp = Math.min(Number(formData.discount_percent || 0), 5);
    const totals = calcTotals(items, dp, formData.sale_type || 'cash');

    const orderNum = selectedOrder?.order_number || await generateOrderNumber();

    const payload = {
      ...formData,
      ...totals,
      order_number: orderNum,
      discount_percent: dp,
      created_by: selectedOrder ? formData.created_by : profile?.id,
      assigned_to: formData.assigned_to || profile?.id,
      updated_at: new Date().toISOString(),
    };

    let orderId = selectedOrder?.id;
    if (selectedOrder) {
      await supabase.from('orders').update(payload).eq('id', selectedOrder.id);
      await supabase.from('order_items').delete().eq('order_id', selectedOrder.id);
    } else {
      const { data } = await supabase.from('orders').insert([{ ...payload, created_at: new Date().toISOString() }]).select('id').single();
      orderId = data?.id;
    }

    if (orderId && items.length > 0) {
      const itemRows = items.map((item, i) => ({
        ...item,
        order_id: orderId,
        sort_order: i,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('order_items').insert(itemRows);
    }

    if (orderId && formData.sale_type === 'installment') {
      const mode = formData.installment_mode || 'by_months';

      if (selectedOrder) {
        const { data: existingEntries } = await supabase
          .from('installment_entries')
          .select('id, paid_amount_usd, status')
          .eq('order_id', orderId);

        const allEntries = existingEntries || [];
        const unpaidEntryIds = allEntries
          .filter(e => Number(e.paid_amount_usd) === 0)
          .map(e => e.id);
        const totalAlreadyPaid = allEntries.reduce((s, e) => s + Number(e.paid_amount_usd), 0);

        if (unpaidEntryIds.length > 0) {
          await supabase.from('installment_entries').delete().in('id', unpaidEntryIds);
        }
        await supabase.from('installment_schedules').delete().eq('order_id', orderId);

        const finalTotal = totals.final_total_usd || 0;
        const remainingAfterPayments = Math.max(0, finalTotal - totalAlreadyPaid);

        if (remainingAfterPayments > 0) {
          if (mode === 'by_months') {
            const months = Number(formData.installment_months || 6);
            if (months >= 1) await generateInstallmentSchedule(orderId, totals, months, totalAlreadyPaid === 0 ? undefined : totalAlreadyPaid);
          } else {
            const monthlyAmt = Number(formData.installment_monthly_amount || 0);
            if (monthlyAmt > 0) {
              const months = Math.max(1, Math.round(remainingAfterPayments / monthlyAmt));
              await generateInstallmentSchedule(orderId, totals, months, totalAlreadyPaid > 0 ? totalAlreadyPaid : 0, monthlyAmt);
            }
          }
        }
      } else {
        if (mode === 'by_months') {
          const months = Number(formData.installment_months || 6);
          if (months >= 1) await generateInstallmentSchedule(orderId, totals, months);
        } else {
          const monthlyAmt = Number(formData.installment_monthly_amount || 0);
          if (monthlyAmt > 0) {
            const fullTotal = totals.final_total_usd || 0;
            const months = Math.max(1, Math.round(fullTotal / monthlyAmt));
            await generateInstallmentSchedule(orderId, totals, months, 0, monthlyAmt);
          }
        }
      }
    }

    setSaving(false);
    setShowForm(false);

    const isNew = !selectedOrder;
    await fetchOrders();

    if (isNew && orderId) {
      const { data: fullOrder } = await supabase
        .from('orders')
        .select('*, customer:customers(*)')
        .eq('id', orderId)
        .maybeSingle();
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('sort_order');
      if (fullOrder) {
        setContractOrder({ ...fullOrder as Order, items: (orderItems || []) as OrderItem[] });
        setShowContract(true);
      }
    }
  };

  const generateInstallmentSchedule = async (orderId: string, totals: Partial<Order>, months: number, depositPaidUSD?: number, fixedMonthlyAmount?: number) => {
    const finalTotal = totals.final_total_usd || 0;
    const depositUsed = depositPaidUSD !== undefined ? depositPaidUSD : finalTotal * 0.5;
    const remaining = Math.max(0, finalTotal - depositUsed);
    const baseAmount = fixedMonthlyAmount !== undefined
      ? Math.floor(fixedMonthlyAmount * 100) / 100
      : Math.floor((months > 0 ? remaining / months : 0) * 100) / 100;
    const totalBase = Math.round(baseAmount * months * 100) / 100;
    const lastMonthExtra = Math.round((remaining - totalBase) * 100) / 100;
    const monthly = baseAmount;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() + 1);
    startDate.setDate(1);

    const { data: schedData } = await supabase.from('installment_schedules').insert([{
      order_id: orderId,
      total_amount_usd: finalTotal,
      deposit_usd: depositUsed,
      remaining_usd: remaining,
      months,
      monthly_amount_usd: monthly,
      start_date: startDate.toISOString().split('T')[0],
      original_snapshot: {},
      created_by: profile?.id,
      created_at: new Date().toISOString(),
    }]).select('id').single();

    if (schedData?.id) {
      const entries = Array.from({ length: months }, (_, i) => {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + i);
        const isLast = i === months - 1;
        return {
          schedule_id: schedData.id,
          order_id: orderId,
          installment_number: i + 1,
          due_date: d.toISOString().split('T')[0],
          amount_usd: isLast ? Math.round((baseAmount + lastMonthExtra) * 100) / 100 : baseAmount,
          paid_amount_usd: 0,
          status: 'unpaid',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });
      await supabase.from('installment_entries').insert(entries);
    }
  };

  const generateOrderNumber = async (): Promise<string> => {
    const { data } = await supabase.rpc('generate_order_number').single();
    return (data as string) || `AH-${Date.now()}`;
  };

  const handleChangeStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    setSaving(true);

    await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', selectedOrder.id);
    await supabase.from('order_status_history').insert([{
      order_id: selectedOrder.id,
      from_status: selectedOrder.status,
      to_status: newStatus,
      changed_by: profile?.id,
      changed_by_name_en: profile?.full_name_en || '',
      changed_by_name_ku: profile?.full_name_ku || '',
      reason_en: statusReason,
      reason_ku: statusReason,
      created_at: new Date().toISOString(),
    }]);

    setSaving(false);
    setShowStatusModal(false);
    fetchOrders();
  };

  const handleDelete = async (order: Order) => {
    if (!confirm(t('confirmDelete'))) return;
    await supabase.from('orders').delete().eq('id', order.id);
    fetchOrders();
  };

  const canCreate = hasPermission('orders', 'create');
  const canEdit = hasPermission('orders', 'update');
  const canDelete = hasPermission('orders', 'delete');
  const canChangeStatus = hasPermission('orders', 'change_status');

  const set = (key: keyof Order, value: unknown) => setFormData(prev => ({ ...prev, [key]: value }));

  const isKitchenBedroom = (type: ProductType) => type === 'kitchen_cabinet' || type === 'bedroom_cabinet';

  const currentTotals = calcTotals(items, Math.min(Number(formData.discount_percent || 0), 5), formData.sale_type || 'cash');
  const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const installmentPreview = (() => {
    if (formData.sale_type !== 'installment') return null;
    const finalTotal = currentTotals.final_total_usd || 0;
    if (finalTotal <= 0) return null;
    const mode = formData.installment_mode || 'by_months';
    let months: number;
    let baseAmount: number;
    let remaining: number;
    if (mode === 'by_months') {
      months = Number(formData.installment_months || 6);
      if (months < 1) return null;
      remaining = Math.max(0, finalTotal * 0.5);
      baseAmount = Math.floor((remaining / months) * 100) / 100;
    } else {
      const monthlyAmt = Number(formData.installment_monthly_amount || 0);
      if (monthlyAmt <= 0) return null;
      remaining = finalTotal;
      months = Math.max(1, Math.round(remaining / monthlyAmt));
      baseAmount = Math.floor(monthlyAmt * 100) / 100;
    }
    const totalBase = Math.round(baseAmount * months * 100) / 100;
    const lastMonthExtra = Math.round((remaining - totalBase) * 100) / 100;
    const lastMonthAmount = Math.round((baseAmount + lastMonthExtra) * 100) / 100;
    return { months, baseAmount, lastMonthAmount, remaining, hasRemainder: lastMonthExtra > 0 };
  })();

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchOrders')}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
          <option value="all">{t('allStatuses')}</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
          <option value="all">{t('allTypes')}</option>
          <option value="cash">{t('cash')}</option>
          <option value="installment">{t('installment')}</option>
        </select>
        {canCreate && <Button onClick={openCreate} icon={<Plus size={16} />}>{t('addNew')}</Button>}
      </div>

      <p className="text-sm text-gray-500">{total} {t('orders').toLowerCase()}</p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {([
                ['order_number', t('orderNumber')],
                ['customer', t('customer')],
                ['status', t('status')],
                ['sale_type', t('saleType')],
                ['final_total_usd', t('finalTotal')],
                ['balance_due_usd', t('balanceDue')],
                ['created_at', t('date')],
              ] as [SortField, string][]).map(([field, label]) => (
                <th key={field} onClick={() => toggleSort(field)}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap cursor-pointer hover:text-gray-700 select-none">
                  {label}
                  <SortIcon field={field} current={sortField} dir={sortDir} />
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />{t('loading')}
                </div>
              </td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">{t('noData')}</td></tr>
            ) : orders.map(order => (
              <tr key={order.id} className="hover:bg-emerald-50/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-bold text-emerald-700">{order.order_number}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{language === 'ku' ? (order.customer as Record<string, string>)?.full_name_ku : (order.customer as Record<string, string>)?.full_name_en}</p>
                </td>
                <td className="px-4 py-3"><OrderStatusBadge status={order.status} label={statusLabels[order.status]} /></td>
                <td className="px-4 py-3"><Badge variant={order.sale_type === 'cash' ? 'info' : 'warning'}>{order.sale_type === 'cash' ? t('cash') : t('installment')}</Badge></td>
                <td className="px-4 py-3 font-semibold">{fmt(order.final_total_usd)}</td>
                <td className="px-4 py-3">
                  <span className={Number(order.balance_due_usd) > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600'}>
                    {fmt(order.balance_due_usd)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(order.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openDetail(order)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="View Details"><Eye size={14} /></button>
                    <button
                      onClick={async () => {
                        const { data: itemData } = await supabase.from('order_items').select('*').eq('order_id', order.id).order('sort_order');
                        setSelectedOrder({ ...order, items: (itemData || []) as OrderItem[] });
                        setShowPaymentHistory(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                      title={t('paymentHistory')}
                    >
                      <History size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        const { data: fullOrder } = await supabase.from('orders').select('*, customer:customers(*)').eq('id', order.id).maybeSingle();
                        const { data: itemData } = await supabase.from('order_items').select('*').eq('order_id', order.id).order('sort_order');
                        if (fullOrder) {
                          setContractOrder({ ...fullOrder as Order, items: (itemData || []) as OrderItem[] });
                          setShowContract(true);
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-teal-50 text-teal-600 transition-colors"
                      title={t('printContract')}
                    >
                      <Printer size={14} />
                    </button>
                    {canEdit && <button onClick={() => openEdit(order)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors" title="Edit"><Edit size={14} /></button>}
                    {canChangeStatus && (
                      <button onClick={() => { setSelectedOrder(order); setNewStatus(order.status); setStatusReason(''); setShowStatusModal(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors" title="Change Status"><ChevronRight size={14} /></button>
                    )}
                    {canDelete && <button onClick={() => handleDelete(order)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Delete"><Trash2 size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={selectedOrder ? `${t('edit')} ${t('orders')}` : t('addNew') + ' ' + t('orders')} size="2xl" footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
          <Button onClick={handleSave} loading={saving}>{t('save')}</Button>
        </div>
      }>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('customer')} <span className="text-red-500">*</span></label>
              <select
                value={formData.customer_id || ''}
                onChange={e => set('customer_id', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
              >
                <option value="">{t('selectCustomer')}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{language === 'ku' ? c.full_name_ku : c.full_name_en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('assignedTo')}</label>
              <select
                value={formData.assigned_to || ''}
                onChange={e => set('assigned_to', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
              >
                <option value="">{t('selectOption')}</option>
                {employees.map(e => <option key={e.id} value={e.id}>{language === 'ku' ? e.full_name_ku : e.full_name_en}</option>)}
              </select>
            </div>
            <Select
              label={t('saleType')}
              value={formData.sale_type || 'cash'}
              onChange={e => set('sale_type', e.target.value)}
              options={[{ value: 'cash', label: t('cash') }, { value: 'installment', label: t('installment') }]}
            />
            {formData.sale_type === 'installment' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('installmentMode')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => set('installment_mode', 'by_months')}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                        (formData.installment_mode || 'by_months') === 'by_months'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                      }`}
                    >
                      {t('byNumberOfMonths')}
                    </button>
                    <button
                      type="button"
                      onClick={() => set('installment_mode', 'by_amount')}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                        formData.installment_mode === 'by_amount'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                      }`}
                    >
                      {t('byMonthlyAmount')}
                    </button>
                  </div>
                </div>
                {(formData.installment_mode || 'by_months') === 'by_months' ? (
                  <Select
                    label={t('numberOfMonths')}
                    value={String(formData.installment_months || 6)}
                    onChange={e => set('installment_months', Number(e.target.value))}
                    options={[6,7,8,9,10,11,12].map(m => ({ value: String(m), label: `${m} months` }))}
                  />
                ) : (
                  <Input
                    label={t('monthlyPaymentAmount')}
                    type="number"
                    min={1}
                    step={0.01}
                    value={String(formData.installment_monthly_amount || '')}
                    onChange={e => set('installment_monthly_amount', Number(e.target.value))}
                    placeholder="e.g. 100"
                  />
                )}
              </div>
            )}
            <Input
              label={t('discountPercent') + ' (max 5%)'}
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={String(formData.discount_percent || 0)}
              onChange={e => set('discount_percent', Math.min(5, Number(e.target.value)))}
            />
            <Input
              label={t('startDate')}
              type="date"
              value={formData.start_date || ''}
              onChange={e => set('start_date', e.target.value)}
            />
            <Input
              label={t('endDate')}
              type="date"
              value={formData.end_date || ''}
              onChange={e => set('end_date', e.target.value)}
            />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">{t('items')}</p>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_TYPES.map(pt => (
                  <button key={pt.value} onClick={() => addItem(pt.value)}
                    className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium">
                    + {language === 'ku' ? pt.labelKu : pt.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                <Package size={24} className="mx-auto mb-2 opacity-50" />
                {t('addItem')}
              </div>
            )}

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-emerald-600" />
                      <span className="font-medium text-sm text-gray-800">
                        {language === 'ku' ? (PRODUCT_TYPES.find(p => p.value === item.product_type)?.labelKu) : item.product_type_name_en}
                      </span>
                    </div>
                    <button onClick={() => removeItem(idx)} className="p-1 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                  </div>

                  <BilingualInput
                    labelEn="Item Name (EN)"
                    labelKu="Item Name (KU)"
                    valueEn={item.item_name_en || ''}
                    valueKu={item.item_name_ku || ''}
                    onChangeEn={v => updateItem(idx, 'item_name_en', v)}
                    onChangeKu={v => updateItem(idx, 'item_name_ku', v)}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <Input label={t('quantity')} type="number" min={1} value={String(item.quantity || 1)} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
                    <Input label={t('unitPrice') + ' (USD)'} type="number" min={0} step={0.01} value={String(item.unit_price_usd || '')} onChange={e => updateItem(idx, 'unit_price_usd', Number(e.target.value))} />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('totalPrice')}</label>
                      <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-emerald-700">
                        {fmt(item.total_price_usd || 0)}
                      </div>
                    </div>
                  </div>

                  {profile?.role === 'administrator' && (
                    <div className="border-t border-amber-200 pt-3 mt-3 bg-amber-50/30 -mx-4 px-4 pb-3 rounded-b-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                        <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                          {language === 'ku' ? 'قازانج (تەنها بۆ ئەدمین)' : 'Profit (Admin Only)'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <Input
                          label={language === 'ku' ? 'نرخی تێچوو (USD)' : 'Cost Price (USD)'}
                          type="number"
                          min={0}
                          step={0.01}
                          value={String(item.cost_price_usd || '')}
                          onChange={e => updateItem(idx, 'cost_price_usd', Number(e.target.value))}
                        />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {language === 'ku' ? 'قازانج بۆ یەک دانە' : 'Profit Per Unit'}
                          </label>
                          <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-700">
                            {fmt(item.profit_per_unit_usd || 0)}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {language === 'ku' ? 'کۆی قازانج' : 'Total Profit'}
                          </label>
                          <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-700">
                            {fmt(item.total_profit_usd || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isKitchenBedroom(item.product_type as ProductType) && (
                    <div className="border-t border-gray-100 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {KITCHEN_FIELDS.map(field => (
                        <div key={field.key} className="grid grid-cols-2 gap-2">
                          <Input
                            label={field.enLabel}
                            value={(item.config as Record<string, string>)?.[`${field.key}_en`] || ''}
                            onChange={e => updateItemConfig(idx, field.key, e.target.value, 'en')}
                          />
                          <div dir="rtl">
                            <Input
                              label={field.kuLabel}
                              value={(item.config as Record<string, string>)?.[`${field.key}_ku`] || ''}
                              onChange={e => updateItemConfig(idx, field.key, e.target.value, 'ku')}
                              className="text-right"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isKitchenBedroom(item.product_type as ProductType) && (
                    <div className="border-t border-gray-100 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { key: 'measurement', enLabel: 'Measurement', kuLabel: 'پێوانە' },
                        { key: 'color', enLabel: 'Color', kuLabel: 'ڕەنگ' },
                      ].map(field => (
                        <div key={field.key} className="grid grid-cols-2 gap-2">
                          <Input
                            label={field.enLabel}
                            value={(item.config as Record<string, string>)?.[`${field.key}_en`] || ''}
                            onChange={e => updateItemConfig(idx, field.key, e.target.value, 'en')}
                          />
                          <div dir="rtl">
                            <Input
                              label={field.kuLabel}
                              value={(item.config as Record<string, string>)?.[`${field.key}_ku`] || ''}
                              onChange={e => updateItemConfig(idx, field.key, e.target.value, 'ku')}
                              className="text-right"
                            />
                          </div>
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('material')}</label>
                        <select
                          value={(item.config as Record<string, string>)?.material_en || ''}
                          onChange={e => updateItemConfig(idx, 'material', e.target.value, 'en')}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white"
                        >
                          <option value="">{t('selectMaterial')}</option>
                          <option value="MDF">{t('materialMDF')}</option>
                          <option value="Acrylic">{t('materialAcrylic')}</option>
                          <option value="Ballonpress">{t('materialBallonpress')}</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {items.length > 0 && (
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-gray-500">{t('total')}</p><p className="font-bold text-gray-900">{fmt(currentTotals.total_amount_usd || 0)}</p></div>
                <div><p className="text-gray-500">{t('discount')}</p><p className="font-bold text-amber-700">{fmt(currentTotals.discount_amount_usd || 0)}</p></div>
                <div><p className="text-gray-500">{t('finalTotal')}</p><p className="font-bold text-emerald-800 text-base">{fmt(currentTotals.final_total_usd || 0)}</p></div>
                <div><p className="text-gray-500">{t('depositRequired')}</p><p className="font-bold text-blue-700">{fmt(currentTotals.deposit_required_usd || 0)}</p></div>
              </div>
            </div>
          )}

          {installmentPreview && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-sm font-semibold text-blue-800 mb-3">{t('installmentSchedulePreview')}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                <div>
                  <p className="text-blue-600 text-xs font-medium">{(formData.installment_mode || 'by_months') === 'by_amount' ? t('totalAmountLabel') : t('remainingAfterDeposit')}</p>
                  <p className="font-bold text-blue-900">{fmt(installmentPreview.remaining)}</p>
                </div>
                <div>
                  <p className="text-blue-600 text-xs font-medium">{t('totalMonths')}</p>
                  <p className="font-bold text-blue-900">{installmentPreview.months}</p>
                </div>
                <div>
                  <p className="text-blue-600 text-xs font-medium">{t('monthlyPayment')}</p>
                  <p className="font-bold text-blue-900">{fmt(installmentPreview.baseAmount)}</p>
                </div>
                <div>
                  <p className="text-blue-600 text-xs font-medium">{t('lastMonth')}</p>
                  <p className={`font-bold ${installmentPreview.hasRemainder ? 'text-amber-700' : 'text-blue-900'}`}>
                    {fmt(installmentPreview.lastMonthAmount)}
                    {installmentPreview.hasRemainder && <span className="text-xs ml-1">({t('remainder')})</span>}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: installmentPreview.months }, (_, i) => {
                  const isLast = i === installmentPreview.months - 1;
                  const amount = isLast ? installmentPreview.lastMonthAmount : installmentPreview.baseAmount;
                  return (
                    <div key={i} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${isLast && installmentPreview.hasRemainder ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800'}`}>
                      M{i + 1}: {fmt(amount)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <BilingualInput
              labelEn={t('notesEn')}
              labelKu={t('notesKu')}
              valueEn={formData.notes_en || ''}
              valueKu={formData.notes_ku || ''}
              onChangeEn={v => set('notes_en', v)}
              onChangeKu={v => set('notes_ku', v)}
              type="textarea"
            />
          </div>
        </div>
      </Modal>

      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title={t('changeStatus')} size="sm" footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowStatusModal(false)}>{t('cancel')}</Button>
          <Button onClick={handleChangeStatus} loading={saving}>{t('save')}</Button>
        </div>
      }>
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm">
              <OrderStatusBadge status={selectedOrder.status} label={statusLabels[selectedOrder.status]} />
              <ChevronRight size={16} className="text-gray-400" />
              <Badge variant="info">{t('newStatusBadge')}</Badge>
            </div>
            <Select
              label={t('newStatus')}
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              options={ORDER_STATUSES.map(s => ({ value: s, label: statusLabels[s] }))}
              placeholder={t('selectOption')}
            />
            <Input
              label={t('reason') + ' (optional)'}
              value={statusReason}
              onChange={e => setStatusReason(e.target.value)}
              placeholder={t('reasonForStatusChange')}
            />
          </div>
        )}
      </Modal>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title={`Order ${selectedOrder?.order_number}`} size="2xl">
        {selectedOrder && (
          <OrderDetailView order={selectedOrder} language={language} statusLabels={statusLabels} fmt={fmt} t={t} />
        )}
      </Modal>

      {showPaymentHistory && selectedOrder && (
        <OrderPaymentHistory order={selectedOrder} onClose={() => setShowPaymentHistory(false)} />
      )}

      {showContract && contractOrder && (
        <OrderContract order={contractOrder} onClose={() => { setShowContract(false); setContractOrder(null); }} />
      )}
    </div>
  );
}

function OrderDetailView({ order, language, statusLabels, fmt, t }: { order: Order; language: string; statusLabels: Record<string, string>; fmt: (n: number) => string; t: (key: string) => string }) {
  const [statusHistory, setStatusHistory] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    supabase.from('order_status_history').select('*').eq('order_id', order.id).order('created_at', { ascending: false }).then(({ data }) => setStatusHistory(data || []));
  }, [order.id]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Detail label={t('orderNumber')} value={order.order_number} />
        <Detail label={t('status')} value={statusLabels[order.status] || order.status} />
        <Detail label={t('saleType')} value={order.sale_type === 'cash' ? t('cash') : t('installment')} />
        <Detail label={t('finalTotal')} value={fmt(order.final_total_usd)} />
        <Detail label={t('totalPaid')} value={fmt(order.total_paid_usd)} />
        <Detail label={t('balanceDue')} value={fmt(order.balance_due_usd)} />
        <Detail label={t('depositRequired')} value={fmt(order.deposit_required_usd)} />
        <Detail label={t('discount')} value={`${order.discount_percent}% (${fmt(order.discount_amount_usd)})`} />
        {order.installment_months > 0 && <Detail label={t('installmentMonths')} value={String(order.installment_months)} />}
      </div>

      {order.items && order.items.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">{t('items')}</p>
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-sm">{language === 'ku' ? item.item_name_ku : item.item_name_en || item.product_type_name_en}</p>
                  <span className="font-bold text-emerald-700 text-sm">{fmt(item.total_price_usd)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                  <span>Qty: {item.quantity}</span>
                  <span>Unit: {fmt(item.unit_price_usd)}</span>
                </div>
                {Object.keys(item.config || {}).length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    {Object.entries(item.config || {}).filter(([k]) => k.endsWith('_en') && (item.config as Record<string, string>)[k]).map(([k, v]) => (
                      <div key={k} className="text-xs">
                        <span className="text-gray-400">{k.replace('_en', '').replace(/_/g, ' ')}: </span>
                        <span className="text-gray-700">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {statusHistory.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">{t('statusHistory')}</p>
          <div className="space-y-2">
            {statusHistory.map((h: Record<string, unknown>) => (
              <div key={h.id as string} className="flex items-center gap-3 text-sm p-2 bg-gray-50 rounded-lg">
                <span className="text-gray-400 text-xs">{new Date(h.created_at as string).toLocaleDateString()}</span>
                <Badge variant="neutral">{statusLabels[h.from_status as string] || String(h.from_status || '—')}</Badge>
                <ChevronRight size={12} className="text-gray-400" />
                <Badge variant="info">{statusLabels[h.to_status as string] || String(h.to_status)}</Badge>
                <span className="text-gray-500">{String(h.changed_by_name_en || '')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5 font-medium">{value || '—'}</p>
    </div>
  );
}
