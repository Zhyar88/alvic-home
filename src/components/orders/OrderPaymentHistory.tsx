import React, { useEffect, useState } from 'react';
import { X, CreditCard, Clock, CheckCircle, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Badge, InstallmentStatusBadge, OrderStatusBadge } from '../ui/Badge';
import type { Order, Payment, InstallmentEntry } from '../../types';

interface Props {
  order: Order;
  onClose: () => void;
}

export function OrderPaymentHistory({ order: initialOrder, onClose }: Props) {
  const { t, language } = useLanguage();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [installments, setInstallments] = useState<InstallmentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: freshOrder }, { data: pays }, { data: insts }] = await Promise.all([
        supabase.from('orders')
          .select('*, customer:customers(full_name_en, full_name_ku)')
          .eq('id', initialOrder.id)
          .maybeSingle(),
        supabase.from('payments')
          .select('*, created_by_profile:user_profiles!payments_created_by_fkey(full_name_en,full_name_ku)')
          .eq('order_id', initialOrder.id)
          .order('payment_date', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase.from('installment_entries')
          .select('*')
          .eq('order_id', initialOrder.id)
          .order('installment_number'),
      ]);
      if (freshOrder) setOrder(freshOrder as Order);
      setPayments((pays || []) as Payment[]);
      setInstallments((insts || []) as InstallmentEntry[]);
      setLoading(false);
    };
    load();
  }, [initialOrder.id]);

  const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtIQD = (n: number) => `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })} IQD`;

  const paymentTypeColors: Record<string, string> = {
    deposit: 'info', installment: 'warning', final: 'success', partial: 'neutral', reversal: 'error',
  };

  const activePayments = payments.filter(p => !p.is_reversed && p.payment_type !== 'reversal');
  const reversals = payments.filter(p => p.payment_type === 'reversal' || p.is_reversed);

  const totals = {
    usd: activePayments.reduce((s, p) => s + p.amount_usd, 0),
    usdPayments: activePayments.filter(p => p.currency === 'USD').reduce((s, p) => s + p.amount_in_currency, 0),
    iqdPayments: activePayments.filter(p => p.currency === 'IQD').reduce((s, p) => s + p.amount_in_currency, 0),
    deposit: activePayments.filter(p => p.payment_type === 'deposit').reduce((s, p) => s + p.amount_usd, 0),
    installment: activePayments.filter(p => p.payment_type === 'installment').reduce((s, p) => s + p.amount_usd, 0),
    final: activePayments.filter(p => p.payment_type === 'final').reduce((s, p) => s + p.amount_usd, 0),
    partial: activePayments.filter(p => p.payment_type === 'partial').reduce((s, p) => s + p.amount_usd, 0),
  };

  const balance = Math.max(0, order.final_total_usd - totals.usd);
  const progressPct = order.final_total_usd > 0 ? Math.min(100, (totals.usd / order.final_total_usd) * 100) : 0;

  const statusLabels: Record<string, string> = {
    draft: t('draft'), approved: t('approved'), deposit_paid: t('deposit_paid'),
    in_production: t('in_production'), ready: t('ready'), installed: t('installed'), finished: t('finished'),
  };

  const installmentStatusLabels: Record<string, string> = {
    unpaid: t('unpaid'), partial: t('partial'), paid: t('paid'), overdue: t('overdue'),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('paymentHistoryTitle')}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {order.order_number} &mdash;{' '}
              {language === 'ku'
                ? (order.customer as Record<string, string>)?.full_name_ku
                : (order.customer as Record<string, string>)?.full_name_en}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{t('contractValueLabel')}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{fmt(order.final_total_usd)}</p>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-4">
                <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">{t('totalPaidLabel')}</p>
                <p className="text-lg font-bold text-emerald-800 mt-1">{fmt(totals.usd)}</p>
              </div>
              <div className={`rounded-2xl p-4 ${balance > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                <p className={`text-xs font-medium uppercase tracking-wide ${balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{t('balanceDueStat')}</p>
                <p className={`text-lg font-bold mt-1 ${balance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{fmt(balance)}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{t('status')}</p>
                <div className="mt-1">
                  <OrderStatusBadge status={order.status} label={statusLabels[order.status] || order.status} />
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{t('paymentProgress')}</span>
                <span>{progressPct.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${progressPct >= 100 ? 'bg-emerald-500' : progressPct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: t('deposits'), value: totals.deposit, color: 'text-blue-700', bg: 'bg-blue-50' },
                { label: t('installments'), value: totals.installment, color: 'text-amber-700', bg: 'bg-amber-50' },
                { label: t('finalPayments'), value: totals.final, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                { label: t('partialPayments'), value: totals.partial, color: 'text-gray-700', bg: 'bg-gray-50' },
              ].map(item => (
                <div key={item.label} className={`${item.bg} rounded-xl p-3`}>
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className={`font-bold text-sm mt-0.5 ${item.color}`}>{fmt(item.value)}</p>
                </div>
              ))}
            </div>

            {(totals.iqdPayments > 0 || totals.usdPayments > 0) && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign size={16} className="text-blue-600" />
                  <p className="text-sm font-semibold text-blue-800">{t('currencyBreakdown')}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">{t('paidInUSD')}</p>
                    <p className="font-bold text-gray-900">{fmt(totals.usdPayments)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">{t('paidInIQD')}</p>
                    <p className="font-bold text-gray-900">{fmtIQD(totals.iqdPayments)}</p>
                    <p className="text-xs text-gray-400">(≈ {fmt(activePayments.filter(p => p.currency === 'IQD').reduce((s, p) => s + p.amount_usd, 0))} USD)</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={16} className="text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-800">{t('allPayments')} ({payments.length})</h3>
              </div>
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{t('receiptHash')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{t('typeColumn')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">{t('usdAmount')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">{t('inCurrency')}</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">{t('rateColumn')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{t('date')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{t('byColumn')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {payments.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">{t('noData')}</td></tr>
                    ) : payments.map(pay => (
                      <tr key={pay.id} className={`${pay.is_reversed ? 'opacity-40 bg-red-50/20' : 'hover:bg-gray-50/60'} transition-colors`}>
                        <td className="px-4 py-2.5 font-mono text-xs font-bold text-emerald-700">{pay.payment_number}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant={paymentTypeColors[pay.payment_type] as 'info' | 'warning' | 'success' | 'neutral' | 'error'}>
                            {t(pay.payment_type as Parameters<typeof t>[0])}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmt(pay.amount_usd)}</td>
                        <td className="px-4 py-2.5 text-right text-xs text-gray-600">
                          {pay.currency === 'IQD' ? fmtIQD(pay.amount_in_currency) : fmt(pay.amount_in_currency)}
                          <span className="block text-gray-400">{pay.currency}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs text-gray-500">
                          {Number(pay.exchange_rate_used) > 1 ? Number(pay.exchange_rate_used).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{pay.payment_date}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {(pay.created_by_profile as Record<string, string>)?.full_name_en || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {payments.length > 0 && (
                    <tfoot>
                      <tr className="bg-emerald-50 border-t border-emerald-100">
                        <td colSpan={2} className="px-4 py-2.5 font-bold text-gray-700 text-sm">{t('totalPaidLabel')}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-800">{fmt(totals.usd)}</td>
                        <td colSpan={4} className="px-4 py-2.5 text-right text-xs text-gray-500">
                          {totals.iqdPayments > 0 && `${fmtIQD(totals.iqdPayments)} + `}
                          {totals.usdPayments > 0 && `${fmt(totals.usdPayments)}`}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {installments.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-800">{t('installmentScheduleSection')} ({installments.length})</h3>
                </div>
                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">#</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{t('dueDateColumn')}</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">{t('amount')}</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">{t('paidColumn')}</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">{t('remainingColumn')}</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{t('status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {installments.map(inst => {
                        const remaining = inst.amount_usd - inst.paid_amount_usd;
                        const today = new Date().toISOString().split('T')[0];
                        const daysOverdue = inst.status === 'overdue' ? Math.floor((new Date(today).getTime() - new Date(inst.due_date).getTime()) / 86400000) : 0;
                        return (
                          <tr key={inst.id} className={`${inst.status === 'overdue' ? 'bg-red-50/20' : 'hover:bg-gray-50/40'} transition-colors`}>
                            <td className="px-4 py-2.5 font-bold text-gray-600">#{inst.installment_number}</td>
                            <td className="px-4 py-2.5">
                              <p className={inst.status === 'overdue' ? 'text-red-600 font-semibold' : 'text-gray-700'}>{inst.due_date}</p>
                              {daysOverdue > 0 && <p className="text-xs text-red-500">{daysOverdue}{t('daysOverdueLabel')}</p>}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmt(inst.amount_usd)}</td>
                            <td className="px-4 py-2.5 text-right font-medium text-emerald-700">{fmt(inst.paid_amount_usd)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={remaining > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>{fmt(remaining)}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <InstallmentStatusBadge status={inst.status} label={installmentStatusLabels[inst.status] || inst.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-100">
                        <td colSpan={2} className="px-4 py-2.5 font-bold text-gray-700 text-sm">{t('totalRow')}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmt(installments.reduce((s, i) => s + i.amount_usd, 0))}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{fmt(installments.reduce((s, i) => s + i.paid_amount_usd, 0))}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-red-600">{fmt(installments.reduce((s, i) => s + Math.max(0, i.amount_usd - i.paid_amount_usd), 0))}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {reversals.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  <p className="text-xs font-semibold text-red-700">{t('reversedCancelledPayments')}</p>
                </div>
                <div className="space-y-1">
                  {reversals.map(pay => (
                    <div key={pay.id} className="flex justify-between text-xs text-red-600">
                      <span className="font-mono">{pay.payment_number}</span>
                      <span>{fmt(Math.abs(pay.amount_usd))} — {pay.payment_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
