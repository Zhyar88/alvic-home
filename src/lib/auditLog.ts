import { supabase } from './database';

interface AuditParams {
  userId?: string;
  userNameEn?: string;
  userNameKu?: string;
  action: string;
  module: string;
  recordId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

export async function logAudit(params: AuditParams) {
  try {
    await supabase.from('audit_logs').insert([{
      user_id: params.userId,
      user_name_en: params.userNameEn || '',
      user_name_ku: params.userNameKu || '',
      action: params.action,
      module: params.module,
      record_id: params.recordId || '',
      old_values: params.oldValues || {},
      new_values: params.newValues || {},
      details: params.details || {},
      created_at: new Date().toISOString(),
    }]);
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}