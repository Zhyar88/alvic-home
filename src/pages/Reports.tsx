import React, { useState } from 'react';
import { BarChart3, Receipt, Users, CreditCard, Calendar } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { ProfitReport } from '../components/reports/ProfitReport';
import { SalesReport } from '../components/reports/SalesReport';
import { CustomerReport } from '../components/reports/CustomerReport';
import { PaymentReport } from '../components/reports/PaymentReport';
import { InstallmentReport } from '../components/reports/InstallmentReport';

type ReportType = 'profit' | 'sales' | 'customers' | 'payments' | 'installments';

export function Reports() {
  const { language } = useLanguage();
  const { profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportType>('profit');

  const tabs = [
    { id: 'profit' as ReportType, icon: BarChart3, labelEn: 'Profit Analysis', labelKu: 'شیکاری قازانج' },
    { id: 'sales' as ReportType, icon: Receipt, labelEn: 'Sales Summary', labelKu: 'پوختەی فرۆشتن' },
    { id: 'customers' as ReportType, icon: Users, labelEn: 'Customer Analysis', labelKu: 'شیکاری کڕیاران' },
    { id: 'payments' as ReportType, icon: CreditCard, labelEn: 'Payment Collections', labelKu: 'کۆکردنەوەی پارە' },
    { id: 'installments' as ReportType, icon: Calendar, labelEn: 'Installment Status', labelKu: 'دۆخی بەشەکان' },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {language === 'ku' ? 'ڕاپۆرتەکان' : 'Reports'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {language === 'ku' ? 'شیکاری و ڕاپۆرتی کاروبار' : 'Business analytics and reporting'}
          </p>
        </div>
      </div>

      {authLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">{language === 'ku' ? 'چاوەڕوان بە...' : 'Loading...'}</p>
        </div>
      ) : profile?.role === 'administrator' ? (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                      isActive
                        ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    {language === 'ku' ? tab.labelKu : tab.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-5">
            {activeTab === 'profit' && <ProfitReport />}
            {activeTab === 'sales' && <SalesReport />}
            {activeTab === 'customers' && <CustomerReport />}
            {activeTab === 'payments' && <PaymentReport />}
            {activeTab === 'installments' && <InstallmentReport />}
          </div>
        </>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800">
            {language === 'ku' ? 'تەنها ئەدمین دەتوانێت ڕاپۆرتی قازانج ببینێت' : 'Only administrators can view profit reports'}
          </p>
        </div>
      )}
    </div>
  );
}
