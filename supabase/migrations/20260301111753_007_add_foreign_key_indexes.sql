/*
  # Add indexes for all unindexed foreign keys

  Adds covering indexes on every foreign key column that was missing one.
  This prevents sequential scans when joining or filtering by these columns.

  Tables covered:
  - audit_logs (user_id)
  - customer_documents (customer_id, created_by)
  - customers (created_by)
  - exchange_rates (set_by)
  - expenses (category_id, created_by, linked_order_id)
  - installment_entries (schedule_id, order_id, modified_by)
  - installment_schedules (created_by)
  - lock_sessions (opened_by, closed_by)
  - lock_transactions (session_id, created_by)
  - order_items (order_id)
  - order_status_history (order_id, changed_by)
  - orders (customer_id, created_by, assigned_to)
  - payments (order_id, created_by, reversed_by)
*/

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON public.customer_documents (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_created_by ON public.customer_documents (created_by);

CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers (created_by);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_set_by ON public.exchange_rates (set_by);

CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses (category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses (created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_linked_order_id ON public.expenses (linked_order_id);

CREATE INDEX IF NOT EXISTS idx_installment_entries_schedule_id ON public.installment_entries (schedule_id);
CREATE INDEX IF NOT EXISTS idx_installment_entries_order_id ON public.installment_entries (order_id);
CREATE INDEX IF NOT EXISTS idx_installment_entries_modified_by ON public.installment_entries (modified_by);

CREATE INDEX IF NOT EXISTS idx_installment_schedules_created_by ON public.installment_schedules (created_by);

CREATE INDEX IF NOT EXISTS idx_lock_sessions_opened_by ON public.lock_sessions (opened_by);
CREATE INDEX IF NOT EXISTS idx_lock_sessions_closed_by ON public.lock_sessions (closed_by);

CREATE INDEX IF NOT EXISTS idx_lock_transactions_session_id ON public.lock_transactions (session_id);
CREATE INDEX IF NOT EXISTS idx_lock_transactions_created_by ON public.lock_transactions (created_by);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history (order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by ON public.order_status_history (changed_by);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON public.orders (created_by);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders (assigned_to);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments (created_by);
CREATE INDEX IF NOT EXISTS idx_payments_reversed_by ON public.payments (reversed_by);
