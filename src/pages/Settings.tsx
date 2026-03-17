import React, { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/database";

export function Settings() {
    const { language } = useLanguage();
    const { profile } = useAuth();
    const [cashRate, setCashRate] = useState("0.60");
    const [installmentRate, setInstallmentRate] = useState("0.50");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from("settings").select("key,value");
            (data || []).forEach((s: any) => {
                if (s.key === "deposit_rate_cash") setCashRate(s.value);
                if (s.key === "deposit_rate_installment") setInstallmentRate(s.value);
            });
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        await supabase
            .from("settings")
            .update({ value: cashRate, updated_at: new Date().toISOString() })
            .eq("key", "deposit_rate_cash");
        await supabase
            .from("settings")
            .update({ value: installmentRate, updated_at: new Date().toISOString() })
            .eq("key", "deposit_rate_installment");
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleBackup = async () => {
  setBackingUp(true);

  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      alert(language === 'ku' ? 'تکایە دووبارە بچۆرەوە' : 'Please log in again.');
      setBackingUp(false);
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

    const response = await fetch(`${apiUrl}/backup/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      let message = 'Backup failed';
      try {
        const err = await response.json();
        message = err.error || message;
      } catch {}
      throw new Error(message);
    }

    const blob = await response.blob();

    if (blob.size === 0) {
      throw new Error('Backup file is empty');
    }

    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = 'backup.sql';

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) fileName = match[1];
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    alert(
      language === 'ku'
        ? `هەڵە لە پاشەکەوتکردندا: ${err.message}`
        : `Backup failed: ${err.message}`
    );
  } finally {
    setBackingUp(false);
  }
};

    return (
        <div className="p-4 lg:p-6 space-y-5">
            <div className="flex items-center gap-3">
                <SettingsIcon size={24} className="text-gray-700" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {language === "ku" ? "ڕێکخستنەکان" : "Settings"}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {language === "ku" ? "ڕێکخستنی سیستەم" : "System configuration"}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <p className="text-gray-500">
                        {language === "ku" ? "چاوەڕوان بە..." : "Loading..."}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                    <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">
                        {language === "ku" ? "ڕێژەی بیانە" : "Deposit Rates"}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {language === "ku" ? "ڕێژەی بیانەی نەقد" : "Cash Deposit Rate"}
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={cashRate}
                                    onChange={(e) => setCashRate(e.target.value)}
                                    className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                />
                                <span className="text-sm text-gray-500">
                                    = {(Number(cashRate) * 100).toFixed(0)}%
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                {language === "ku"
                                    ? "نموونە: 0.60 = 60%"
                                    : "Example: 0.60 = 60%"}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {language === "ku"
                                    ? "ڕێژەی بیانەی بەش"
                                    : "Installment Deposit Rate"}
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={installmentRate}
                                    onChange={(e) => setInstallmentRate(e.target.value)}
                                    className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                />
                                <span className="text-sm text-gray-500">
                                    = {(Number(installmentRate) * 100).toFixed(0)}%
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                {language === "ku"
                                    ? "نموونە: 0.50 = 50%"
                                    : "Example: 0.50 = 50%"}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                            <Save size={16} />
                            {saved
                                ? language === "ku"
                                    ? "پاشەکەوت کرا ✓"
                                    : "Saved ✓"
                                : saving
                                    ? language === "ku"
                                        ? "پاشەکەوتکردن..."
                                        : "Saving..."
                                    : language === "ku"
                                        ? "پاشەکەوتکردن"
                                        : "Save Changes"}
                        </button>
                    </div>
                </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
  <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">
    {language === 'ku' ? 'پاشەکەوتی داتابەیس' : 'Database Backup'}
  </h2>
  <p className="text-sm text-gray-500">
    {language === 'ku'
      ? 'داگرتنی هەموو داتای داتابەیس وەک فایلی SQL. ناوی فایل دەبێتە بەپێی کات و رووژی ئێستا.'
      : 'Downloads the full database as a SQL file. Filename includes current date and time.'}
  </p>
  <button
    onClick={handleBackup}
    disabled={backingUp}
    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
  >
    {backingUp ? (
      <>
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        {language === 'ku' ? 'چاوەڕێ بکە...' : 'Creating backup...'}
      </>
    ) : (
      <>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {language === 'ku' ? 'داگرتنی پاشەکەوت' : 'Download SQL Backup'}
      </>
    )}
  </button>
</div>
        </div>
    );
}
