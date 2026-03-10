import React, { useEffect, useState } from 'react';
import { Plus, CreditCard as Edit, Shield, Check, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BilingualInput } from '../components/ui/BilingualInput';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import type { Role } from '../types';
import { supabase } from '../lib/database';

const MODULES = [
  { key: 'orders', label: 'Orders' },
  { key: 'customers', label: 'Customers' },
  { key: 'payments', label: 'Payments' },
  { key: 'installments', label: 'Installments' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'lock', label: 'Cash Register' },
  { key: 'reports', label: 'Reports' },
  { key: 'users', label: 'Users' },
  { key: 'exchange_rates', label: 'Exchange Rates' },
  { key: 'audit_logs', label: 'Audit Logs' },
  { key: 'roles', label: 'Roles' },
];
const ACTIONS = ['create', 'read', 'update', 'delete'];

export function Roles() {
  const { t, language } = useLanguage();
  const { profile, hasPermission } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<{ name_en: string; name_ku: string; permissions: Record<string, Record<string, boolean>> }>({ name_en: '', name_ku: '', permissions: {} });

  const fetchRoles = async () => {
    setLoading(true);
    const { data } = await supabase.from('roles').select('*').order('created_at');
    setRoles((data || []) as Role[]);
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, []);

  const openCreate = () => {
    const perms: Record<string, Record<string, boolean>> = {};
    MODULES.forEach(m => { perms[m.key] = {}; ACTIONS.forEach(a => { perms[m.key][a] = false; }); });
    setFormData({ name_en: '', name_ku: '', permissions: perms });
    setSelectedRole(null);
    setShowModal(true);
  };

  const openEdit = (r: Role) => {
    const perms: Record<string, Record<string, boolean>> = {};
    MODULES.forEach(m => {
      perms[m.key] = {};
      ACTIONS.forEach(a => { perms[m.key][a] = r.permissions?.[m.key]?.[a] ?? false; });
    });
    setFormData({ name_en: r.name_en, name_ku: r.name_ku, permissions: perms });
    setSelectedRole(r);
    setShowModal(true);
  };

  const togglePerm = (module: string, action: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: { ...prev.permissions[module], [action]: !prev.permissions[module]?.[action] },
      },
    }));
  };

  const handleSave = async () => {
    if (!formData.name_en) return;
    setSaving(true);

    const payload = { name_en: formData.name_en, name_ku: formData.name_ku, permissions: formData.permissions, updated_at: new Date().toISOString() };

    if (selectedRole) {
      await supabase.from('roles').update(payload).eq('id', selectedRole.id);
    } else {
      await supabase.from('roles').insert([{ ...payload, is_system: false, created_at: new Date().toISOString() }]);
    }

    await supabase.from('audit_logs').insert([{
      user_id: profile?.id,
      user_name_en: profile?.full_name_en || '',
      user_name_ku: profile?.full_name_ku || '',
      action: selectedRole ? 'UPDATE_ROLE' : 'CREATE_ROLE',
      module: 'roles',
      record_id: selectedRole?.id || '',
      old_values: selectedRole ? { name_en: selectedRole.name_en } : {},
      new_values: { name_en: formData.name_en, name_ku: formData.name_ku },
      details: {},
      created_at: new Date().toISOString(),
    }]);

    setSaving(false);
    setShowModal(false);
    fetchRoles();
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex justify-end">
        {hasPermission('roles', 'create') && <Button onClick={openCreate} icon={<Plus size={16} />}>{t('create')} {t('roles')}</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-40 animate-pulse" />)
        ) : roles.map(role => (
          <div key={role.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center"><Shield size={18} className="text-emerald-700" /></div>
                <div>
                  <p className="font-semibold text-gray-900">{language === 'ku' ? role.name_ku : role.name_en}</p>
                  <p className="text-xs text-gray-500">{language === 'ku' ? role.name_en : role.name_ku}</p>
                </div>
              </div>
              {!role.is_system && hasPermission('roles', 'update') && (
                <button onClick={() => openEdit(role)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-700"><Edit size={14} /></button>
              )}
            </div>
            {role.is_system && <Badge variant="info" className="mb-2">System</Badge>}
            <div className="space-y-1">
              {MODULES.slice(0, 5).map(m => {
                const perms = role.permissions?.[m.key] || {};
                const hasAny = Object.values(perms).some(Boolean);
                return (
                  <div key={m.key} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{m.label}</span>
                    <div className="flex gap-0.5">
                      {ACTIONS.map(a => (
                        <span key={a} className={`w-4 h-4 rounded flex items-center justify-center ${perms[a] ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-300'}`}>
                          {perms[a] ? <Check size={8} /> : <X size={8} />}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">C R U D</p>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selectedRole ? 'Edit Role' : 'Create Role'} size="xl" footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowModal(false)}>{t('cancel')}</Button>
          {!selectedRole?.is_system && <Button onClick={handleSave} loading={saving}>{t('save')}</Button>}
        </div>
      }>
        <div className="space-y-5">
          <BilingualInput
            labelEn="Role Name (EN)"
            labelKu="ناوی ئەرک (کوردی)"
            valueEn={formData.name_en}
            valueKu={formData.name_ku}
            onChangeEn={v => setFormData(p => ({ ...p, name_en: v }))}
            onChangeKu={v => setFormData(p => ({ ...p, name_ku: v }))}
            required
          />

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">{t('permissionsMatrix')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-100 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs text-gray-500">Module</th>
                    {ACTIONS.map(a => <th key={a} className="px-4 py-2 text-center text-xs text-gray-500 uppercase">{a}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {MODULES.map(m => (
                    <tr key={m.key} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-700">{m.label}</td>
                      {ACTIONS.map(a => (
                        <td key={a} className="px-4 py-2 text-center">
                          <button
                            onClick={() => !selectedRole?.is_system && togglePerm(m.key, a)}
                            disabled={!!selectedRole?.is_system}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${formData.permissions[m.key]?.[a] ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-300 hover:bg-gray-200'} ${selectedRole?.is_system ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {formData.permissions[m.key]?.[a] ? <Check size={14} /> : <X size={14} />}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
