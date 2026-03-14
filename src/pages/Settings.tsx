import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/database';

export function Settings() {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [cashRate, setCashRate] = useState('0.60');
  const [installmentRate, setInstallmentRate] = useState('0.50');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('key,value');
      (data || []).forEach((s: any) => {
        if (s.key === 'deposit_rate_cash') setCashRate(s.value);
        if (s.key === 'deposit_rate_installment') setInstallmentRate(s.value);
      });
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('settings').update({ value: cashRate, updated_at: new Date().toISOString() }).eq('key', 'deposit_rate_cash');
    await supabase.from('settings').update({ value: installmentRate, updated_at: new Date().toISOString() }).eq('key', 'deposit_rate_installment');
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (profile?.role !== 'administrator') {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800">{language === 'ku' ? 'تەنها ئەدمین دەتوانێت ئەم بەشە بگۆڕێت' : 'Only administrators can access settings'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <SettingsIcon size={24} className="text-gray-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{language === 'ku' ? 'ڕێکخستنەکان' : 'Settings'}</h1>
          <p className="text-sm text-gray-500">{language === 'ku' ? 'ڕێکخستنی سیستەم' : 'System configuration'}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">{language === 'ku' ? 'چاوەڕوان بە...' : 'Loading...'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">
            {language === 'ku' ? 'ڕێژەی بیانە' : 'Deposit Rates'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ku' ? 'ڕێژەی بیانەی نەقد' : 'Cash Deposit Rate'}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={cashRate}
                  onChange={e => setCashRate(e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                <span className="text-sm text-gray-500">= {(Number(cashRate) * 100).toFixed(0)}%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{language === 'ku' ? 'نموونە: 0.60 = 60%' : 'Example: 0.60 = 60%'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ku' ? 'ڕێژەی بیانەی بەش' : 'Installment Deposit Rate'}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={installmentRate}
                  onChange={e => setInstallmentRate(e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                <span className="text-sm text-gray-500">= {(Number(installmentRate) * 100).toFixed(0)}%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{language === 'ku' ? 'نموونە: 0.50 = 50%' : 'Example: 0.50 = 50%'}</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {saved ? (language === 'ku' ? 'پاشەکەوت کرا ✓' : 'Saved ✓') : saving ? (language === 'ku' ? 'پاشەکەوتکردن...' : 'Saving...') : (language === 'ku' ? 'پاشەکەوتکردن' : 'Save Changes')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}