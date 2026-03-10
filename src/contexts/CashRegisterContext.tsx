import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { LockSession } from '../types';

interface CashRegisterContextType {
  activeSession: LockSession | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logTransaction: (params: {
    session_id: string;
    transaction_type: 'income' | 'expense';
    reference_type: 'payment' | 'expense' | 'installment' | 'manual';
    reference_id?: string;
    reference_number?: string;
    description_en: string;
    description_ku: string;
    amount_usd: number;
    currency?: string;
    amount_in_currency?: number;
    exchange_rate_used?: number;
    created_by?: string;
  }) => Promise<void>;
}

const CashRegisterContext = createContext<CashRegisterContextType>({
  activeSession: null,
  loading: true,
  refresh: async () => {},
  logTransaction: async () => {},
});

export function CashRegisterProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<LockSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('lock_sessions')
      .select('*')
      .eq('session_date', today)
      .eq('status', 'open')
      .maybeSingle();
    setActiveSession(data as LockSession | null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logTransaction = useCallback(async (params: {
    session_id: string;
    transaction_type: 'income' | 'expense';
    reference_type: 'payment' | 'expense' | 'installment' | 'manual';
    reference_id?: string;
    reference_number?: string;
    description_en: string;
    description_ku: string;
    amount_usd: number;
    currency?: string;
    amount_in_currency?: number;
    exchange_rate_used?: number;
    created_by?: string;
  }) => {
    await supabase.from('lock_transactions').insert([{
      session_id: params.session_id,
      transaction_type: params.transaction_type,
      reference_type: params.reference_type,
      reference_id: params.reference_id || null,
      reference_number: params.reference_number || '',
      description_en: params.description_en,
      description_ku: params.description_ku,
      amount_usd: params.amount_usd,
      currency: params.currency || 'USD',
      amount_in_currency: params.amount_in_currency ?? params.amount_usd,
      exchange_rate_used: params.exchange_rate_used ?? 1,
      created_by: params.created_by || null,
      created_at: new Date().toISOString(),
    }]);

    const colIncome = params.transaction_type === 'income' ? 'total_income_usd' : 'total_expenses_usd';
    const { data: sess } = await supabase
      .from('lock_sessions')
      .select('total_income_usd, total_expenses_usd, payment_income_usd, expense_outflow_usd, installment_income_usd')
      .eq('id', params.session_id)
      .single();

    if (sess) {
      const updates: Record<string, number> = {
        [colIncome]: Number(sess[colIncome] || 0) + params.amount_usd,
      };
      if (params.reference_type === 'payment') {
        updates.payment_income_usd = Number(sess.payment_income_usd || 0) + params.amount_usd;
      } else if (params.reference_type === 'installment') {
        updates.installment_income_usd = Number(sess.installment_income_usd || 0) + params.amount_usd;
      } else if (params.reference_type === 'expense') {
        updates.expense_outflow_usd = Number(sess.expense_outflow_usd || 0) + params.amount_usd;
      }
      await supabase.from('lock_sessions').update(updates).eq('id', params.session_id);
      await refresh();
    }
  }, [refresh]);

  return (
    <CashRegisterContext.Provider value={{ activeSession, loading, refresh, logTransaction }}>
      {children}
    </CashRegisterContext.Provider>
  );
}

export function useCashRegister() {
  return useContext(CashRegisterContext);
}
