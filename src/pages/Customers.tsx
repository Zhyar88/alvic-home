import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, CreditCard as Edit, Eye, Phone, MapPin, UserCheck, FileText, Upload, Download, Trash2, X, FileBadge } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { BilingualInput } from '../components/ui/BilingualInput';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Table, Pagination } from '../components/ui/Table';
import type { Customer, CustomerDocument, DocumentType } from '../types';

const PAGE_SIZE = 15;

const DOCUMENT_TYPES: { value: DocumentType; labelEn: string; labelKu: string }[] = [
  { value: 'national_id', labelEn: 'National ID', labelKu: 'کارتی ناسنامه' },
  { value: 'passport', labelEn: 'Passport', labelKu: 'پاسپۆرت' },
  { value: 'driving_license', labelEn: 'Driving License', labelKu: 'مۆڵەتی شوفێری' },
  { value: 'work_permit', labelEn: 'Work Permit', labelKu: 'مۆڵەتی کار' },
  { value: 'residence_card', labelEn: 'Residence Card', labelKu: 'کارتی نیشتەجێبوون' },
  { value: 'other', labelEn: 'Other', labelKu: 'دیکە' },
];

function getDocumentTypeLabel(type: DocumentType, lang: string) {
  const found = DOCUMENT_TYPES.find(d => d.value === type);
  if (!found) return type;
  return lang === 'ku' ? found.labelKu : found.labelEn;
}

function formatBytes(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const emptyCustomer = (): Partial<Customer> => ({
  full_name_en: '', full_name_ku: '',
  address_en: '', address_ku: '',
  phone: '', phone_secondary: '',
  national_id_number: '',
  guarantor_name_en: '', guarantor_name_ku: '',
  guarantor_workplace_en: '', guarantor_workplace_ku: '',
  guarantor_phone: '',
  salary_deduction_consent: false,
  notes_en: '', notes_ku: '',
  is_active: true,
});

interface PendingDoc {
  uid: string;
  document_type: DocumentType;
  label_en: string;
  label_ku: string;
  file: File;
}

export function Customers() {
  const { t, language } = useLanguage();
  const { profile, hasPermission } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>(emptyCustomer());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [newDocType, setNewDocType] = useState<DocumentType>('national_id');
  const [newDocLabelEn, setNewDocLabelEn] = useState('');
  const [newDocLabelKu, setNewDocLabelKu] = useState('');
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const [detailDocs, setDetailDocs] = useState<CustomerDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('customers').select('*', { count: 'exact' });
    if (search) {
      query = query.or(`full_name_en.ilike.%${search}%,full_name_ku.ilike.%${search}%,phone.ilike.%${search}%,national_id_number.ilike.%${search}%`);
    }
    if (filterActive !== 'all') {
      query = query.eq('is_active', filterActive === 'active');
    }
    const validDbFields = ['full_name_en', 'full_name_ku', 'phone', 'is_active', 'created_at'];
    const dbField = validDbFields.includes(sortKey) ? sortKey : 'created_at';
    const from = (page - 1) * PAGE_SIZE;
    const { data, count } = await query.order(dbField, { ascending: sortDir === 'asc' }).range(from, from + PAGE_SIZE - 1);
    setCustomers((data || []) as Customer[]);
    setTotal(count || 0);
    setLoading(false);
  }, [search, filterActive, page, sortKey, sortDir]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [search, filterActive, sortKey, sortDir]);

  const fetchDocs = useCallback(async (customerId: string) => {
    setLoadingDocs(true);
    const { data } = await supabase
      .from('customer_documents')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true });
    setDetailDocs((data || []) as CustomerDocument[]);
    setLoadingDocs(false);
  }, []);

  const openCreate = () => {
    setFormData(emptyCustomer());
    setSelectedCustomer(null);
    setPendingDocs([]);
    setNewDocType('national_id');
    setNewDocLabelEn('');
    setNewDocLabelKu('');
    setNewDocFile(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setFormData({ ...c });
    setSelectedCustomer(c);
    setPendingDocs([]);
    setNewDocType('national_id');
    setNewDocLabelEn('');
    setNewDocLabelKu('');
    setNewDocFile(null);
    setError('');
    setShowModal(true);
  };

  const openDetail = async (c: Customer) => {
    setSelectedCustomer(c);
    setShowDetail(true);
    await fetchDocs(c.id);
  };

  const addPendingDoc = () => {
    if (!newDocFile) return;
    const autoLabel = DOCUMENT_TYPES.find(d => d.value === newDocType);
    setPendingDocs(prev => [...prev, {
      uid: Math.random().toString(36).slice(2),
      document_type: newDocType,
      label_en: newDocLabelEn || (autoLabel?.labelEn ?? ''),
      label_ku: newDocLabelKu || (autoLabel?.labelKu ?? ''),
      file: newDocFile,
    }]);
    setNewDocFile(null);
    setNewDocLabelEn('');
    setNewDocLabelKu('');
    setNewDocType('national_id');
  };

  const removePendingDoc = (uid: string) => {
    setPendingDocs(prev => prev.filter(d => d.uid !== uid));
  };

  const uploadDocuments = async (customerId: string) => {
    if (!pendingDocs.length) return true;
    setUploadingDocs(true);
    const errors: string[] = [];

    console.log('Starting upload for customer:', customerId);
    console.log('Pending documents:', pendingDocs.length);

    for (const doc of pendingDocs) {
      console.log('Processing document:', doc.file.name);
      const ext = doc.file.name.split('.').pop();
      const path = `${customerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      console.log('Uploading to path:', path);
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('customer-documents')
        .upload(path, doc.file, { contentType: doc.file.type, upsert: false });

      console.log('Upload result:', { uploadData, uploadErr });

      if (uploadErr) {
        console.error('Upload error:', uploadErr);
        errors.push(`Failed to upload ${doc.file.name}: ${uploadErr.message}`);
        continue;
      }

      console.log('Inserting document record...');
      const { data: insertData, error: insertErr } = await supabase.from('customer_documents').insert({
        customer_id: customerId,
        document_type: doc.document_type,
        label_en: doc.label_en,
        label_ku: doc.label_ku,
        file_name: doc.file.name,
        file_path: path,
        file_size: doc.file.size,
        mime_type: doc.file.type,
        created_by: profile?.id,
      });

      console.log('Insert result:', { insertData, insertErr });

      if (insertErr) {
        console.error('Insert error:', insertErr);
        errors.push(`Failed to save ${doc.file.name}: ${insertErr.message}`);
        await supabase.storage.from('customer-documents').remove([path]);
      }
    }

    setUploadingDocs(false);

    if (errors.length > 0) {
      console.error('Upload completed with errors:', errors);
      setError(errors.join('\n'));
      return false;
    }

    console.log('Upload completed successfully');
    setPendingDocs([]);
    return true;
  };

  const handleSave = async () => {
    if (!formData.full_name_en && !formData.full_name_ku) { setError(t('customerNameRequired')); return; }
    if (!formData.phone) { setError(t('phoneNumberRequired')); return; }
    setSaving(true);
    setError('');
    const payload = { ...formData, created_by: profile?.id, updated_at: new Date().toISOString() };
    let savedId = selectedCustomer?.id;
    if (selectedCustomer) {
      const { error: e } = await supabase.from('customers').update(payload).eq('id', selectedCustomer.id);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { data, error: e } = await supabase.from('customers').insert([{ ...payload, created_at: new Date().toISOString() }]).select('id').single();
      if (e) { setError(e.message); setSaving(false); return; }
      savedId = data?.id;
    }

    if (savedId && pendingDocs.length) {
      const uploadSuccess = await uploadDocuments(savedId);
      if (!uploadSuccess) {
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setShowModal(false);
    fetchCustomers();
  };

  const handleDownload = async (doc: CustomerDocument) => {
    const { data } = await supabase.storage
      .from('customer-documents')
      .createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = doc.file_name;
      a.target = '_blank';
      a.click();
    }
  };

  const handleDeleteDoc = async (doc: CustomerDocument) => {
    if (!confirm(`Delete "${doc.label_en || doc.file_name}"?`)) return;
    setDeletingDocId(doc.id);
    await supabase.storage.from('customer-documents').remove([doc.file_path]);
    await supabase.from('customer_documents').delete().eq('id', doc.id);
    setDetailDocs(prev => prev.filter(d => d.id !== doc.id));
    setDeletingDocId(null);
  };

  const handleToggleActive = async (c: Customer) => {
    await supabase.from('customers').update({ is_active: !c.is_active }).eq('id', c.id);
    fetchCustomers();
  };

  const set = (key: keyof Customer, value: unknown) => setFormData(prev => ({ ...prev, [key]: value }));

  const canCreate = hasPermission('customers', 'create');
  const canEdit = hasPermission('customers', 'update');
  const canDelete = hasPermission('customers', 'delete');
  const canDeleteDocs = hasPermission('customers', 'delete');

  const columns = [
    {
      key: language === 'ku' ? 'full_name_ku' : 'full_name_en', header: t('fullName'),
      render: (c: Customer) => (
        <div>
          <p className="font-medium text-gray-900">{language === 'ku' ? c.full_name_ku : c.full_name_en}</p>
          <p className="text-xs text-gray-400">{language === 'ku' ? c.full_name_en : c.full_name_ku}</p>
        </div>
      ), sortable: true,
    },
    {
      key: 'phone', header: t('phone'), sortable: true,
      render: (c: Customer) => (
        <div className="flex items-center gap-1.5">
          <Phone size={13} className="text-gray-400" />
          <span className="font-mono text-sm">{c.phone}</span>
        </div>
      ),
    },
    {
      key: 'address', header: t('address'),
      render: (c: Customer) => (
        <div className="flex items-center gap-1.5 max-w-xs truncate">
          <MapPin size={13} className="text-gray-400 shrink-0" />
          <span className="truncate text-sm">{language === 'ku' ? c.address_ku : c.address_en}</span>
        </div>
      ),
    },
    {
      key: 'guarantor', header: t('guarantor'),
      render: (c: Customer) => c.guarantor_name_en ? (
        <div className="flex items-center gap-1.5">
          <UserCheck size={13} className="text-emerald-600" />
          <span className="text-sm">{language === 'ku' ? c.guarantor_name_ku : c.guarantor_name_en}</span>
        </div>
      ) : <span className="text-gray-300">—</span>,
    },
    {
      key: 'is_active', header: t('status'), sortable: true,
      render: (c: Customer) => <Badge variant={c.is_active ? 'success' : 'neutral'}>{c.is_active ? t('active') : t('inactive')}</Badge>,
    },
    {
      key: 'created_at', header: t('date'),
      render: (c: Customer) => <span className="text-gray-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</span>,
      sortable: true,
    },
    {
      key: 'actions', header: t('actions'),
      render: (c: Customer) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openDetail(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="View">
            <Eye size={15} />
          </button>
          {canEdit && (
            <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-700 transition-colors" title="Edit">
              <Edit size={15} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleToggleActive(c)}
              className={`p-1.5 rounded-lg transition-colors text-xs font-medium px-2 ${c.is_active ? 'hover:bg-red-50 text-red-600' : 'hover:bg-emerald-50 text-emerald-700'}`}
            >
              {c.is_active ? t('deactivate') : t('activate')}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchCustomers')}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>
        <select
          value={filterActive}
          onChange={e => setFilterActive(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
        >
          <option value="all">{t('allStatuses')}</option>
          <option value="active">{t('active')}</option>
          <option value="inactive">{t('inactive')}</option>
        </select>
        {canCreate && <Button onClick={openCreate} icon={<Plus size={16} />}>{t('addNew')}</Button>}
      </div>

      <div className="text-sm text-gray-500">{total} {t('customers').toLowerCase()}</div>

      <Table
        columns={columns as Parameters<typeof Table>[0]['columns']}
        data={customers as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={t('noData')}
        rowKey={(c) => (c as Customer).id}
        onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
        sortKey={sortKey}
        sortDir={sortDir}
      />
      <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedCustomer ? `${t('edit')} ${t('customer')}` : `${t('addNew')} ${t('customer')}`}
        size="2xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowModal(false)}>{t('cancel')}</Button>
            <Button onClick={handleSave} loading={saving || uploadingDocs}>{t('save')}</Button>
          </div>
        }
      >
        <div className="space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span>{t('english')}</span>
            <span className="text-right">{t('kurdish')}</span>
          </div>

          <BilingualInput
            labelEn={`${t('fullName')} (EN)`} labelKu={`${t('fullName')} (KU)`}
            valueEn={formData.full_name_en || ''} valueKu={formData.full_name_ku || ''}
            onChangeEn={v => set('full_name_en', v)} onChangeKu={v => set('full_name_ku', v)}
            required
          />
          <BilingualInput
            labelEn={`${t('address')} (EN)`} labelKu={`${t('address')} (KU)`}
            valueEn={formData.address_en || ''} valueKu={formData.address_ku || ''}
            onChangeEn={v => set('address_en', v)} onChangeKu={v => set('address_ku', v)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label={`${t('phone')} (Primary)`} value={formData.phone || ''} onChange={e => set('phone', e.target.value)} required type="tel" />
            <Input label={`${t('phone')} (Secondary)`} value={formData.phone_secondary || ''} onChange={e => set('phone_secondary', e.target.value)} type="tel" />
          </div>

          <Input label={t('nationalId')} value={formData.national_id_number || ''} onChange={e => set('national_id_number', e.target.value)} />

          {/* Documents section */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <FileBadge size={16} className="text-emerald-700" />
              <span className="text-sm font-semibold text-gray-700">{t('credentialDocuments')}</span>
              <span className="text-xs text-gray-400 ml-1">{t('credentialDocumentsHint')}</span>
            </div>
            <div className="p-4 space-y-4">
              {/* Pending docs list */}
              {pendingDocs.length > 0 && (
                <div className="space-y-2">
                  {pendingDocs.map(doc => (
                    <div key={doc.uid} className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <FileText size={16} className="text-emerald-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.label_en || getDocumentTypeLabel(doc.document_type, 'en')}</p>
                        <p className="text-xs text-gray-500">{getDocumentTypeLabel(doc.document_type, 'en')} · {doc.file.name} · {formatBytes(doc.file.size)}</p>
                      </div>
                      <button onClick={() => removePendingDoc(doc.uid)} className="p-1 rounded-lg hover:bg-red-100 text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new doc row */}
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('documentType')}</label>
                    <select
                      value={newDocType}
                      onChange={e => setNewDocType(e.target.value as DocumentType)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    >
                      {DOCUMENT_TYPES.map(dt => (
                        <option key={dt.value} value={dt.value}>{dt.labelEn}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('labelEn')}</label>
                    <input
                      type="text"
                      value={newDocLabelEn}
                      onChange={e => setNewDocLabelEn(e.target.value)}
                      placeholder={DOCUMENT_TYPES.find(d => d.value === newDocType)?.labelEn}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('labelKu')}</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={newDocLabelKu}
                      onChange={e => setNewDocLabelKu(e.target.value)}
                      placeholder={DOCUMENT_TYPES.find(d => d.value === newDocType)?.labelKu}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      {t('fileUploadHint')}
                    </label>
                    <label className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${newDocFile ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50'}`}>
                      <Upload size={16} className={newDocFile ? 'text-emerald-600' : 'text-gray-400'} />
                      <span className={`text-sm truncate ${newDocFile ? 'text-emerald-700 font-medium' : 'text-gray-500'}`}>
                        {newDocFile ? `${newDocFile.name} (${formatBytes(newDocFile.size)})` : t('clickToSelectFile')}
                      </span>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={e => setNewDocFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={addPendingDoc}
                    disabled={!newDocFile}
                    className="px-4 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Plus size={15} />
                    {t('add')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Guarantor */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">{t('guarantorInformation')}</p>
            <BilingualInput
              labelEn={`${t('guarantor')} Name (EN)`} labelKu={`${t('guarantor')} Name (KU)`}
              valueEn={formData.guarantor_name_en || ''} valueKu={formData.guarantor_name_ku || ''}
              onChangeEn={v => set('guarantor_name_en', v)} onChangeKu={v => set('guarantor_name_ku', v)}
            />
            <div className="mt-3">
              <BilingualInput
                labelEn={`${t('guarantorWorkplace')} (EN)`} labelKu={`${t('guarantorWorkplace')} (KU)`}
                valueEn={formData.guarantor_workplace_en || ''} valueKu={formData.guarantor_workplace_ku || ''}
                onChangeEn={v => set('guarantor_workplace_en', v)} onChangeKu={v => set('guarantor_workplace_ku', v)}
              />
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label={`${t('guarantor')} Phone`} value={formData.guarantor_phone || ''} onChange={e => set('guarantor_phone', e.target.value)} type="tel" />
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="salary_consent"
                  checked={!!formData.salary_deduction_consent}
                  onChange={e => set('salary_deduction_consent', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="salary_consent" className="text-sm text-gray-700">{t('salaryConsent')}</label>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <BilingualInput
              labelEn={t('notesEn')} labelKu={t('notesKu')}
              valueEn={formData.notes_en || ''} valueKu={formData.notes_ku || ''}
              onChangeEn={v => set('notes_en', v)} onChangeKu={v => set('notes_ku', v)}
              type="textarea"
            />
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title={language === 'ku' ? (selectedCustomer?.full_name_ku || '') : (selectedCustomer?.full_name_en || '')}
        size="xl"
        footer={
          <div className="flex justify-between items-center">
            {canEdit ? (
              <button
                onClick={() => { setShowDetail(false); if (selectedCustomer) openEdit(selectedCustomer); }}
                className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 font-medium"
              >
                <Edit size={14} />
                {t('editCustomer')}
              </button>
            ) : <span />}
            <Button variant="secondary" onClick={() => setShowDetail(false)}>{t('close')}</Button>
          </div>
        }
      >
        {selectedCustomer && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Detail label={`${t('fullName')} (EN)`} value={selectedCustomer.full_name_en} />
              <Detail label={`${t('fullName')} (KU)`} value={selectedCustomer.full_name_ku} />
              <Detail label={`${t('address')} (EN)`} value={selectedCustomer.address_en} />
              <Detail label={`${t('address')} (KU)`} value={selectedCustomer.address_ku} />
              <Detail label={t('phone')} value={selectedCustomer.phone} />
              {selectedCustomer.phone_secondary && <Detail label={`${t('phone')} 2`} value={selectedCustomer.phone_secondary} />}
              <Detail label={t('nationalId')} value={selectedCustomer.national_id_number || '—'} />
              <Detail label={t('status')} value={selectedCustomer.is_active ? t('active') : t('inactive')} />
            </div>

            {/* Documents section */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <FileBadge size={16} className="text-emerald-700" />
                <span className="text-sm font-semibold text-gray-700">{t('credentialDocuments')}</span>
              </div>
              <div className="p-4">
                {loadingDocs ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : detailDocs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">{t('noDocumentsYet')}</p>
                ) : (
                  <div className="space-y-2">
                    {detailDocs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${doc.mime_type === 'application/pdf' ? 'bg-red-100' : 'bg-blue-100'}`}>
                          <FileText size={16} className={doc.mime_type === 'application/pdf' ? 'text-red-600' : 'text-blue-600'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {language === 'ku' ? (doc.label_ku || doc.label_en) : (doc.label_en || doc.label_ku)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getDocumentTypeLabel(doc.document_type, language)} · {doc.file_name}
                            {doc.file_size ? ` · ${formatBytes(doc.file_size)}` : ''}
                          </p>
                          <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-2 rounded-lg hover:bg-emerald-100 text-emerald-700 transition-colors"
                            title={t('download')}
                          >
                            <Download size={15} />
                          </button>
                          {canDeleteDocs && (
                            <button
                              onClick={() => handleDeleteDoc(doc)}
                              disabled={deletingDocId === doc.id}
                              className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {(selectedCustomer.guarantor_name_en || selectedCustomer.guarantor_name_ku) && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">{t('guarantor')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <Detail label={t('nameEn')} value={selectedCustomer.guarantor_name_en} />
                  <Detail label={t('nameKu')} value={selectedCustomer.guarantor_name_ku} />
                  <Detail label={`${t('guarantorWorkplace')} (EN)`} value={selectedCustomer.guarantor_workplace_en} />
                  <Detail label={`${t('guarantorWorkplace')} (KU)`} value={selectedCustomer.guarantor_workplace_ku} />
                  <Detail label={t('phone')} value={selectedCustomer.guarantor_phone || '—'} />
                  <Detail label={t('salaryConsent')} value={selectedCustomer.salary_deduction_consent ? t('yes') : t('no')} />
                </div>
              </div>
            )}

            {(selectedCustomer.notes_en || selectedCustomer.notes_ku) && (
              <div className="border-t border-gray-100 pt-4">
                <Detail label={t('notesEn')} value={selectedCustomer.notes_en} />
                <div className="mt-2" dir="rtl"><Detail label={t('notesKu')} value={selectedCustomer.notes_ku} /></div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value || '—'}</p>
    </div>
  );
}
