import React, { useEffect, useState } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import type { ExchangeRate } from '../types';
import { supabase } from '../lib/database';

export function ExchangeRates() {
  const { t } = useLanguage();
  const { profile, hasPermission } = useAuth();
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    rate_cash: '1330',
    rate_installment: '1470',
    effective_date: new Date().toISOString().split('T')[0],
    notes_en: '',
    notes_ku: '',
  });

  const canCreate = hasPermission('exchange_rates', 'create');

  const fetchRates = async () => {
    setLoading(true);
    const { data } = await supabase.from('exchange_rates')
  .select('*')
  .order('effective_date', { ascending: false })
  .order('created_at', { ascending: false })
  .limit(30);
    setRates((data || []) as ExchangeRate[]);
    setLoading(false);
  };

  useEffect(() => { fetchRates(); }, []);

  const latestRate = rates[0];

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('exchange_rates').insert([{
      rate_cash: Number(formData.rate_cash),
      rate_installment: Number(formData.rate_installment),
      effective_date: formData.effective_date,
      created_by: profile?.id,
      notes_en: formData.notes_en,
      notes_ku: formData.notes_ku,
      created_at: new Date().toISOString(),
    }]);
    

    await supabase.from('audit_logs').insert([{
      user_id: profile?.id,
      user_name_en: profile?.full_name_en || '',
      user_name_ku: profile?.full_name_ku || '',
      action: 'CHANGE_EXCHANGE_RATE',
      module: 'exchange_rates',
      record_id: '',
      old_values: latestRate ? { rate_cash: latestRate.rate_cash, rate_installment: latestRate.rate_installment } : {},
      new_values: { rate_cash: formData.rate_cash, rate_installment: formData.rate_installment },
      details: { effective_date: formData.effective_date },
      created_at: new Date().toISOString(),
    }]);

    setSaving(false);
    setShowModal(false);
    fetchRates();
  };

  const fmtIQD = (n: number) => `${Number(n).toLocaleString()} IQD`;
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
      {latestRate && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Cash Rate (Today)</p>
                <p className="text-2xl font-bold text-gray-900">{fmtIQD(latestRate.rate_cash)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">$1 USD = {fmtIQD(latestRate.rate_cash)}</p>
            <p className="text-xs text-gray-400 mt-1">Effective: {fmtDate(latestRate.effective_date)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Installment Rate (Today)</p>
                <p className="text-2xl font-bold text-gray-900">{fmtIQD(latestRate.rate_installment)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">$1 USD = {fmtIQD(latestRate.rate_installment)}</p>
            <p className="text-xs text-gray-400 mt-1">Effective: {fmtDate(latestRate.effective_date)}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-800">Rate History</p>
        {canCreate && <Button onClick={() => setShowModal(true)} icon={<Plus size={16} />} size="sm">Set New Rate</Button>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {[t('effectiveDate'), t('rateCash') + ' (IQD)', t('rateInstallment') + ' (IQD)', 'Set By', t('notes'), t('date')].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : rates.map((rate, idx) => (
              <tr key={rate.id} className={`hover:bg-amber-50/20 transition-colors ${idx === 0 ? 'bg-amber-50/40' : ''}`}>
                <td className="px-4 py-3 font-semibold text-gray-900">{fmtDate(latestRate.effective_date)}</td>
                <td className="px-4 py-3 font-bold text-amber-700">{fmtIQD(rate.rate_cash)}</td>
                <td className="px-4 py-3 font-bold text-emerald-700">{fmtIQD(rate.rate_installment)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{rate.set_by || 'System'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{rate.notes_en || '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(rate.created_at).toLocaleDateString('en-GB')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Set New Exchange Rate" size="sm" footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowModal(false)}>{t('cancel')}</Button>
          <Button variant="gold" onClick={handleSave} loading={saving}>Set Rate</Button>
        </div>
      }>
        <div className="space-y-4">
          {latestRate && (
            <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
              Current: Cash {fmtIQD(latestRate.rate_cash)} · Installment {fmtIQD(latestRate.rate_installment)}
            </div>
          )}
          <Input label={t('rateCash') + ' (IQD per $1)'} type="number" min={1} step={1} value={formData.rate_cash} onChange={e => setFormData(p => ({ ...p, rate_cash: e.target.value }))} required />
          <Input label={t('rateInstallment') + ' (IQD per $1)'} type="number" min={1} step={1} value={formData.rate_installment} onChange={e => setFormData(p => ({ ...p, rate_installment: e.target.value }))} required />
          <Input label={t('effectiveDate')} type="date" value={formData.effective_date} onChange={e => setFormData(p => ({ ...p, effective_date: e.target.value }))} required />
          <Input label="Notes (EN)" value={formData.notes_en} onChange={e => setFormData(p => ({ ...p, notes_en: e.target.value }))} placeholder="Reason for rate change..." />
          <div dir="rtl">
            <Input label="تێبینی (کوردی)" value={formData.notes_ku} onChange={e => setFormData(p => ({ ...p, notes_ku: e.target.value }))} className="text-right" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
