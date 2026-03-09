import React, { useEffect, useState } from 'react';
import { Plus, Edit, UserCheck, UserX, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BilingualInput } from '../components/ui/BilingualInput';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import type { UserProfile, Role } from '../types';

const SYSTEM_ROLES = ['administrator', 'admin', 'employee'];

export function Users() {
  const { t, language } = useLanguage();
  const { profile: currentProfile, hasPermission } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<{ full_name_en: string; full_name_ku: string; selectedRoleId: string; phone: string; is_active: boolean }>({
    full_name_en: '', full_name_ku: '', selectedRoleId: 'employee', phone: '', is_active: true,
  });
  const [createData, setCreateData] = useState({ email: '', password: '', full_name_en: '', full_name_ku: '', selectedRoleId: 'employee', phone: '' });
  const [error, setError] = useState('');

  const canCreate = hasPermission('users', 'create');
  const canEdit = hasPermission('users', 'update');
  const canToggle = hasPermission('users', 'update');

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
    setUsers((data || []) as UserProfile[]);
    setLoading(false);
  };

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('*').order('name_en');
    setRoles((data || []) as Role[]);
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const resolveRolePayload = (selectedRoleId: string): { role: UserProfile['role']; custom_role_id: string | null } => {
    if (SYSTEM_ROLES.includes(selectedRoleId)) {
      return { role: selectedRoleId as UserProfile['role'], custom_role_id: null };
    }
    const customRole = roles.find(r => r.id === selectedRoleId);
    if (customRole) {
      return { role: 'custom', custom_role_id: customRole.id };
    }
    return { role: 'employee', custom_role_id: null };
  };

  const getRoleDisplayId = (u: UserProfile): string => {
    if (u.role === 'custom' && u.custom_role_id) return u.custom_role_id;
    return u.role;
  };

  const getRoleLabel = (u: UserProfile): string => {
    if (u.role === 'custom' && u.custom_role_id) {
      const found = roles.find(r => r.id === u.custom_role_id);
      if (found) return language === 'ku' ? found.name_ku : found.name_en;
    }
    return t(u.role as Parameters<typeof t>[0]);
  };

  const openEdit = (u: UserProfile) => {
    setFormData({
      full_name_en: u.full_name_en,
      full_name_ku: u.full_name_ku,
      selectedRoleId: getRoleDisplayId(u),
      phone: u.phone || '',
      is_active: u.is_active,
    });
    setSelectedUser(u);
    setError('');
    setShowModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    setSaving(true);
    const { role, custom_role_id } = resolveRolePayload(formData.selectedRoleId);
    await supabase.from('user_profiles').update({
      full_name_en: formData.full_name_en,
      full_name_ku: formData.full_name_ku,
      role,
      custom_role_id,
      phone: formData.phone,
      is_active: formData.is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', selectedUser.id);
    setSaving(false);
    setShowModal(false);
    fetchUsers();
  };

  const handleCreate = async () => {
    if (!createData.email || !createData.password) { setError('Email and password are required'); return; }
    setSaving(true);
    setError('');

    const { role, custom_role_id } = resolveRolePayload(createData.selectedRoleId);
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: createData.email,
          password: createData.password,
          full_name_en: createData.full_name_en,
          full_name_ku: createData.full_name_ku,
          role,
          custom_role_id,
          phone: createData.phone,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error || 'Failed to create user');
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowCreateModal(false);
    fetchUsers();
  };

  const handleToggle = async (u: UserProfile) => {
    await supabase.from('user_profiles').update({ is_active: !u.is_active, updated_at: new Date().toISOString() }).eq('id', u.id);
    fetchUsers();
  };

  const roleColors: Record<string, string> = { administrator: 'error', admin: 'warning', employee: 'info', custom: 'neutral' };

  const allRoleOptions = [
    ...SYSTEM_ROLES.map(r => ({ value: r, label: t(r as Parameters<typeof t>[0]) })),
    ...roles.filter(r => !r.is_system).map(r => ({ value: r.id, label: language === 'ku' ? r.name_ku : r.name_en })),
  ];

  const RoleSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('role')}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
      >
        {allRoleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex justify-end">
        {canCreate && (
          <Button onClick={() => { setCreateData({ email: '', password: '', full_name_en: '', full_name_ku: '', selectedRoleId: 'employee', phone: '' }); setError(''); setShowCreateModal(true); }} icon={<Plus size={16} />}>
            {t('createUser')}
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {[t('name'), t('role'), t('phone'), t('status'), 'Created', t('actions')].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!u.is_active ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">{u.full_name_en?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{language === 'ku' ? u.full_name_ku : u.full_name_en}</p>
                      <p className="text-xs text-gray-400">{language === 'ku' ? u.full_name_en : u.full_name_ku}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={(roleColors[u.role] || 'neutral') as 'error' | 'warning' | 'info' | 'neutral'}>
                    <Shield size={10} className="mr-1" />{getRoleLabel(u)}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{u.phone || '—'}</td>
                <td className="px-4 py-3"><Badge variant={u.is_active ? 'success' : 'neutral'}>{u.is_active ? t('active') : t('inactive')}</Badge></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {currentProfile?.id !== u.id && (
                      <>
                        {canEdit && <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-700 transition-colors"><Edit size={14} /></button>}
                        {canToggle && (
                          <button onClick={() => handleToggle(u)} className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'hover:bg-red-50 text-red-500' : 'hover:bg-emerald-50 text-emerald-600'}`}>
                            {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t('updateUser')} size="md" footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowModal(false)}>{t('cancel')}</Button>
          <Button onClick={handleUpdate} loading={saving}>{t('save')}</Button>
        </div>
      }>
        <div className="space-y-4">
          <BilingualInput
            labelEn={t('nameEn')}
            labelKu={t('nameKu')}
            valueEn={formData.full_name_en}
            valueKu={formData.full_name_ku}
            onChangeEn={v => setFormData(p => ({ ...p, full_name_en: v }))}
            onChangeKu={v => setFormData(p => ({ ...p, full_name_ku: v }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <RoleSelect value={formData.selectedRoleId} onChange={v => setFormData(p => ({ ...p, selectedRoleId: v }))} />
            <Input label={t('phone')} value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="is_active_user" checked={formData.is_active} onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 text-emerald-600 rounded" />
            <label htmlFor="is_active_user" className="text-sm text-gray-700">{t('active')}</label>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={t('createUser')} size="md" footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>{t('cancel')}</Button>
          <Button onClick={handleCreate} loading={saving}>{t('create')}</Button>
        </div>
      }>
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
          <Input label={t('email')} type="email" value={createData.email} onChange={e => setCreateData(p => ({ ...p, email: e.target.value }))} required />
          <Input label={t('password')} type="password" value={createData.password} onChange={e => setCreateData(p => ({ ...p, password: e.target.value }))} required />
          <BilingualInput
            labelEn={t('nameEn')}
            labelKu={t('nameKu')}
            valueEn={createData.full_name_en}
            valueKu={createData.full_name_ku}
            onChangeEn={v => setCreateData(p => ({ ...p, full_name_en: v }))}
            onChangeKu={v => setCreateData(p => ({ ...p, full_name_ku: v }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <RoleSelect value={createData.selectedRoleId} onChange={v => setCreateData(p => ({ ...p, selectedRoleId: v }))} />
            <Input label={t('phone')} value={createData.phone} onChange={e => setCreateData(p => ({ ...p, phone: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
