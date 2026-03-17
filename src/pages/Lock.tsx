import React, { useEffect, useState, useCallback } from 'react';
import {
  Lock as LockIcon, Unlock, TrendingUp, TrendingDown, DollarSign,
  ChevronRight, X, CreditCard, Receipt, Calendar, Eye, ChevronDown, ChevronUp
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useCashRegister } from '../contexts/CashRegisterContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import type { LockSession, LockTransaction } from '../types';
import { supabase } from '../lib/database';

const fmt = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function refTypeIcon(ref: string) {
  if (ref === 'payment') return <CreditCard size={13} className="text-emerald-600" />;
  if (ref === 'installment') return <Calendar size={13} className="text-blue-600" />;
  if (ref === 'expense') return <Receipt size={13} className="text-red-500" />;
  return <DollarSign size={13} className="text-gray-400" />;
}

function refTypeLabel(ref: string, tFn: (key: string) => string) {
  if (ref === 'payment') return tFn('paymentTypeLabel');
  if (ref === 'installment') return tFn('installmentTypeLabel');
  if (ref === 'expense') return tFn('expenseTypeLabel');
  return tFn('manualTypeLabel');
}

interface SessionDetailProps {
  session: LockSession;
  onClose: () => void;
}

function SessionDetail({ session, onClose }: SessionDetailProps) {
  const { language, t } = useLanguage();
  const [transactions, setTransactions] = useState<LockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['payment', 'installment', 'expense', 'manual']));

  useEffect(() => {
    supabase
      .from('lock_transactions')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTransactions((data || []) as LockTransaction[]);
        setLoading(false);
      });
  }, [session.id]);

  const groups = ['payment', 'installment', 'expense', 'manual'] as const;

  const grouped = groups.reduce((acc, g) => {
    acc[g] = transactions.filter(t => t.reference_type === g);
    return acc;
  }, {} as Record<string, LockTransaction[]>);

  const groupLabels: Record<string, string> = {
    payment: t('paymentsGroup'), installment: t('installmentsGroup'), expense: t('expensesGroup'), manual: t('manualGroup'),
  };

  const toggleGroup = (g: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  const closing = (session.opening_balance_usd || 0) + (session.total_income_usd || 0) - (session.total_expenses_usd || 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-900 text-lg">{t('sessionPrefix')} {session.session_date}</p>
            <Badge variant={session.status === 'open' ? 'success' : 'neutral'} className="mt-1">{session.status}</Badge>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-gray-100">
          <div className="p-3 bg-gray-50 rounded-xl text-center">
            <p className="text-xs text-gray-500 mb-1">{t('openingLabel')}</p>
            <p className="font-bold text-gray-800 text-sm">{fmt(session.opening_balance_usd)}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-center">
            <p className="text-xs text-emerald-600 mb-1">{t('totalIncomeShort')}</p>
            <p className="font-bold text-emerald-700 text-sm">{fmt(session.total_income_usd || 0)}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-center">
            <p className="text-xs text-red-500 mb-1">{t('totalExpensesShort')}</p>
            <p className="font-bold text-red-700 text-sm">{fmt(session.total_expenses_usd || 0)}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-center">
            <p className="text-xs text-blue-600 mb-1">{t('closingLabel')}</p>
            <p className="font-bold text-blue-800 text-sm">{fmt(session.status === 'closed' ? (session.closing_balance_usd || 0) : closing)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 px-5 pb-4 border-b border-gray-100">
          <div className="p-2.5 bg-emerald-50 rounded-lg text-center">
            <p className="text-xs text-emerald-600">Payment Income</p>
            <p className="font-semibold text-emerald-800 text-sm">{fmt((session as LockSession & { payment_income_usd?: number }).payment_income_usd || 0)}</p>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-lg text-center">
            <p className="text-xs text-blue-600">Installment Income</p>
            <p className="font-semibold text-blue-800 text-sm">{fmt((session as LockSession & { installment_income_usd?: number }).installment_income_usd || 0)}</p>
          </div>
          <div className="p-2.5 bg-red-50 rounded-lg text-center">
            <p className="text-xs text-red-500">Expense Outflow</p>
            <p className="font-semibold text-red-700 text-sm">{fmt((session as LockSession & { expense_outflow_usd?: number }).expense_outflow_usd || 0)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No transactions recorded</div>
          ) : (
            groups.map(g => {
              const txs = grouped[g];
              if (txs.length === 0) return null;
              const isExpanded = expandedGroups.has(g);
              const groupTotal = txs.reduce((s, t) => s + (t.transaction_type === 'income' ? t.amount_usd : -t.amount_usd), 0);
              return (
                <div key={g} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleGroup(g)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {refTypeIcon(g)}
                      <span className="font-semibold text-sm text-gray-700">{groupLabels[g]}</span>
                      <span className="text-xs text-gray-400">({txs.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${groupTotal >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {groupTotal >= 0 ? '+' : ''}{fmt(groupTotal)}
                      </span>
                      {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="divide-y divide-gray-50">
                      {txs.map(tx => (
                        <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                          <div className="flex-shrink-0">
                            {tx.transaction_type === 'income'
                              ? <TrendingUp size={14} className="text-emerald-500" />
                              : <TrendingDown size={14} className="text-red-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 truncate">
                              {language === 'ku' ? tx.description_ku : tx.description_en}
                            </p>
                            {(tx as LockTransaction & { reference_number?: string }).reference_number && (
                              <p className="text-xs text-gray-400">{(tx as LockTransaction & { reference_number?: string }).reference_number}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold ${tx.transaction_type === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>
                              {tx.transaction_type === 'income' ? '+' : '-'}{fmt(tx.amount_usd)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {session.notes_en && (
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 font-medium mb-1">Notes</p>
            <p className="text-sm text-gray-700">{language === 'ku' ? session.notes_ku : session.notes_en}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function Lock() {
  const { t, language } = useLanguage();
  const { profile, hasPermission } = useAuth();
  const { activeSession, refresh: refreshContext } = useCashRegister();
  const [sessions, setSessions] = useState<LockSession[]>([]);
  const [transactions, setTransactions] = useState<LockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [closingNotes, setClosingNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LockSession | null>(null);

  const canCreate = hasPermission('lock', 'create');
  const canUpdate = hasPermission('lock', 'update');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('lock_sessions')
      .select('*')
      .order('session_date', { ascending: false })
      .limit(60);
    setSessions((data || []) as LockSession[]);

    if (activeSession?.id) {
      const { data: txData } = await supabase
        .from('lock_transactions')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setTransactions((txData || []) as LockTransaction[]);
    } else {
      setTransactions([]);
    }
    setLoading(false);
  }, [activeSession]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleOpenSession = async () => {
    if (!canCreate) return;
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    const existing = sessions.find(s => s.session_date === today);
    if (existing) { setSaving(false); setShowOpenModal(false); return; }

    await supabase.from('lock_sessions').insert([{
      session_date: today,
      opened_by: profile?.id,
      opening_balance_usd: Number(openingBalance),
      total_income_usd: 0,
      total_expenses_usd: 0,
      payment_income_usd: 0,
      installment_income_usd: 0,
      expense_outflow_usd: 0,
      net_usd: 0,
      status: 'open',
      created_at: new Date().toISOString(),
    }]);

    setSaving(false);
    setShowOpenModal(false);
    setOpeningBalance('0');
    await refreshContext();
    fetchSessions();
  };

  const handleCloseSession = async () => {
    if (!activeSession || !canUpdate) return;
    setSaving(true);
    const closing = Number(activeSession.opening_balance_usd || 0) + Number(activeSession.total_income_usd || 0) - Number(activeSession.total_expenses_usd || 0);
    await supabase.from('lock_sessions').update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: profile?.id,
      closing_balance_usd: closing,
      net_usd: closing - (activeSession.opening_balance_usd || 0),
      notes_en: closingNotes,
      notes_ku: closingNotes,
    }).eq('id', activeSession.id);
    setSaving(false);
    setShowCloseModal(false);
    setClosingNotes('');
    await refreshContext();
    fetchSessions();
  };

  console.log('activeSession:', JSON.stringify(activeSession));
  const closingBalance = activeSession
    ? (Number(activeSession.opening_balance_usd) || 0) + (Number(activeSession.total_income_usd) || 0) - (Number(activeSession.total_expenses_usd) || 0)
    : 0;

  const today = new Date().toISOString().split('T')[0];
  const todaySession = sessions.find(s => s.session_date === today);
  const todayOpenSession = sessions.find(s => s.session_date === today && s.status === 'open');
  const canOpenToday = !todayOpenSession;

  const closedSessions = sessions.filter(s => s.status === 'closed');

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {selectedSession && (
        <SessionDetail session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          {activeSession ? (
            <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-emerald-100 bg-emerald-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Unlock size={20} className="text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-900 text-base">{t('cashRegisterOpen')}</p>
                    <p className="text-sm text-emerald-700">{activeSession.session_date}</p>
                  </div>
                </div>
                {canUpdate && (
                  <Button size="sm" variant="danger" icon={<LockIcon size={14} />} onClick={() => setShowCloseModal(true)}>
                    {t('closeRegister')}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
                <div className="p-3.5 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">{t('openingBalance')}</p>
                  <p className="font-bold text-gray-800">{fmt(activeSession.opening_balance_usd || 0)}</p>
                </div>
                <div className="p-3.5 bg-emerald-50 rounded-xl">
                  <p className="text-xs text-emerald-600 mb-1">{t('income')}</p>
                  <p className="font-bold text-emerald-700">{fmt(Number(activeSession.total_income_usd) || 0)}</p>
                </div>
                <div className="p-3.5 bg-red-50 rounded-xl">
                  <p className="text-xs text-red-500 mb-1">{t('expensesLabel')}</p>
                  <p className="font-bold text-red-700">{fmt(Number(activeSession.total_expenses_usd) || 0)}</p>
                </div>
                <div className="p-3.5 bg-blue-50 rounded-xl">
                  <p className="text-xs text-blue-600 mb-1">{t('currentBalance')}</p>
                  <p className="font-bold text-blue-800">{fmt(closingBalance)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 px-5 pb-5">
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CreditCard size={12} className="text-emerald-600" />
                    <p className="text-xs text-emerald-600 font-medium">{t('paymentIncome')}</p>
                  </div>
                  <p className="font-bold text-emerald-800 text-sm">{fmt((activeSession as LockSession & { payment_income_usd?: number }).payment_income_usd || 0)}</p>
                </div>
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar size={12} className="text-blue-600" />
                    <p className="text-xs text-blue-600 font-medium">{t('installmentIncome')}</p>
                  </div>
                  <p className="font-bold text-blue-800 text-sm">{fmt((activeSession as LockSession & { installment_income_usd?: number }).installment_income_usd || 0)}</p>
                </div>
                <div className="p-3 bg-red-50/70 rounded-xl border border-red-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Receipt size={12} className="text-red-500" />
                    <p className="text-xs text-red-500 font-medium">{t('expenseOutflow')}</p>
                  </div>
                  <p className="font-bold text-red-700 text-sm">{fmt((activeSession as LockSession & { expense_outflow_usd?: number }).expense_outflow_usd || 0)}</p>
                </div>
              </div>

              {transactions.length > 0 && (
                <div className="border-t border-gray-100">
                  <div className="px-5 py-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">{t('todaysTransactions')}</p>
                    <button
                      onClick={() => setSelectedSession(activeSession)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                    >
                      View All <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {transactions.slice(0, 20).map(tx => (
                      <div key={tx.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0 flex items-center gap-1.5">
                          {tx.transaction_type === 'income'
                            ? <TrendingUp size={13} className="text-emerald-500" />
                            : <TrendingDown size={13} className="text-red-500" />}
                          {refTypeIcon(tx.reference_type || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{language === 'ku' ? tx.description_ku : tx.description_en}</p>
                          <p className="text-xs text-gray-400">{refTypeLabel(tx.reference_type || '', t)} &middot; {new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <span className={`text-sm font-bold flex-shrink-0 ${tx.transaction_type === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>
                          {tx.transaction_type === 'income' ? '+' : '-'}{fmt(tx.amount_usd)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {transactions.length === 0 && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-400 text-center py-4">{t('noTransactionsYet')}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <LockIcon size={26} className="text-gray-400" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">{t('cashRegisterIsClosed')}</p>
              {canOpenToday ? (
                <>
                  <p className="text-sm text-gray-400 mb-5">{t('openRegisterToAllow')}</p>
                  {canCreate && (
                    <Button onClick={() => setShowOpenModal(true)} icon={<Unlock size={16} />}>{t('openSession')}</Button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-400 mb-2">{t('todaySessionClosed')}</p>
                  {canCreate && (
                    <Button onClick={() => setShowOpenModal(true)} icon={<Unlock size={16} />} className="mt-4">
                      {t('openSession')}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">{t('sessionHistory')}</p>
            {!activeSession && canOpenToday && canCreate && (
              <button onClick={() => setShowOpenModal(true)} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                <Unlock size={12} /> {t('openToday')}
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-8 text-gray-400 text-sm">{t('loading')}</div>
            ) : closedSessions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{t('noClosedSessions')}</p>
            ) : (
              closedSessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className="w-full bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-800">{session.session_date}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral" className="text-xs">closed</Badge>
                      <Eye size={13} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-400">{t('openingLabel')}</p>
                      <p className="font-semibold text-gray-600">{fmt(session.opening_balance_usd)}</p>
                    </div>
                    <div>
                      <p className="text-emerald-500">{t('incomeLabel')}</p>
                      <p className="font-semibold text-emerald-700">{fmt(session.total_income_usd || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">{t('closingLabel')}</p>
                      <p className="font-semibold text-gray-800">{fmt(Number(session.closing_balance_usd) || (Number(session.opening_balance_usd || 0) + Number(session.total_income_usd || 0) - Number(session.total_expenses_usd || 0)))}</p>
                    </div>
                  </div>
                  {(session.total_expenses_usd || 0) > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between text-xs">
                      <span className="text-red-400">{t('expensesShort')}</span>
                      <span className="text-red-600 font-medium">-{fmt(session.total_expenses_usd || 0)}</span>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={showOpenModal} onClose={() => setShowOpenModal(false)} title={t('openSession')} size="sm" footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowOpenModal(false)}>{t('cancel')}</Button>
          <Button onClick={handleOpenSession} loading={saving} icon={<Unlock size={15} />}>{t('openSession')}</Button>
        </div>
      }>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{t('openingCashRegisterNote')}</p>
          <Input
            label={`${t('openingBalance')} (USD)`}
            type="number"
            min={0}
            step={0.01}
            value={openingBalance}
            onChange={e => setOpeningBalance(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </Modal>

      <Modal isOpen={showCloseModal} onClose={() => setShowCloseModal(false)} title={t('closeSession')} size="sm" footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowCloseModal(false)}>{t('cancel')}</Button>
          <Button variant="danger" onClick={handleCloseSession} loading={saving} icon={<LockIcon size={15} />}>{t('closeRegister')}</Button>
        </div>
      }>
        {activeSession && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{t('closingCashRegisterNote')}</p>
            <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('openingBalanceLabel')}</span>
                <span className="font-medium">{fmt(activeSession.opening_balance_usd)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-600">{t('totalIncomeLabel')}</span>
                <span className="font-medium text-emerald-700">{fmt(activeSession.total_income_usd || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-500">{t('totalExpensesLabel')}</span>
                <span className="font-medium text-red-600">{fmt(activeSession.total_expenses_usd || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
                <span>{t('closingBalanceLabel')}</span>
                <span className="text-emerald-800">{fmt(closingBalance)}</span>
              </div>
            </div>
            <Input
              label={t('notesOptionalLabel')}
              value={closingNotes}
              onChange={e => setClosingNotes(e.target.value)}
              placeholder={t('endOfDayNotes')}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
