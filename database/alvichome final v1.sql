-- =============================================================================
-- Alvic Home - Full Database Schema + Seed Data
-- Clean standard SQL (no psql meta-commands)
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculate_order_item_profit() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
  NEW.profit_per_unit_usd := NEW.unit_price_usd - COALESCE(NEW.cost_price_usd, 0);
  NEW.total_profit_usd := NEW.profit_per_unit_usd * NEW.quantity;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_order_number() RETURNS text
    LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  RETURN 'AH-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('order_number_seq')::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_payment_number() RETURNS text
    LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  RETURN 'PAY-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('payment_number_seq')::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_order_profit_totals() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
  UPDATE orders
  SET
    total_cost_usd = (
      SELECT COALESCE(SUM(cost_price_usd * quantity), 0)
      FROM order_items
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ),
    total_profit_usd = (
      SELECT COALESCE(SUM(total_profit_usd), 0)
      FROM order_items
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    )
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =============================================================================
-- SEQUENCES
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq
    START WITH 1000 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.payment_number_seq
    START WITH 1000 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.auth_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT auth_users_pkey PRIMARY KEY (id),
    CONSTRAINT auth_users_email_key UNIQUE (email),
    CONSTRAINT auth_users_username_key UNIQUE (username)
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name_en text DEFAULT '' NOT NULL,
    full_name_ku text DEFAULT '' NOT NULL,
    role text DEFAULT 'employee' NOT NULL,
    custom_role_id uuid,
    is_active boolean DEFAULT true,
    phone text DEFAULT '',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
    CONSTRAINT user_profiles_user_id_key UNIQUE (user_id),
    CONSTRAINT user_profiles_role_check CHECK ((role = ANY (ARRAY['administrator','admin','employee','custom','data entry'])))
);

CREATE TABLE IF NOT EXISTS public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_en text NOT NULL,
    name_ku text NOT NULL,
    is_system boolean DEFAULT false,
    permissions jsonb DEFAULT '{}' NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT roles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rate_cash numeric(12,2) DEFAULT 1330 NOT NULL,
    rate_installment numeric(12,2) DEFAULT 1470 NOT NULL,
    effective_date date DEFAULT CURRENT_DATE NOT NULL,
    set_by uuid,
    notes_en text DEFAULT '',
    notes_ku text DEFAULT '',
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT exchange_rates_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name_en text DEFAULT '' NOT NULL,
    full_name_ku text DEFAULT '' NOT NULL,
    address_en text DEFAULT '' NOT NULL,
    address_ku text DEFAULT '' NOT NULL,
    phone text DEFAULT '' NOT NULL,
    phone_secondary text DEFAULT '',
    national_id_number text DEFAULT '',
    national_id_image_url text DEFAULT '',
    guarantor_name_en text DEFAULT '',
    guarantor_name_ku text DEFAULT '',
    guarantor_workplace_en text DEFAULT '',
    guarantor_workplace_ku text DEFAULT '',
    guarantor_phone text DEFAULT '',
    salary_deduction_consent boolean DEFAULT false,
    notes_en text DEFAULT '',
    notes_ku text DEFAULT '',
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customers_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.customer_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    document_type text DEFAULT 'other' NOT NULL,
    label_en text DEFAULT '' NOT NULL,
    label_ku text DEFAULT '' NOT NULL,
    file_name text DEFAULT '' NOT NULL,
    file_path text DEFAULT '' NOT NULL,
    file_size integer DEFAULT 0,
    mime_type text DEFAULT '',
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_documents_pkey PRIMARY KEY (id),
    CONSTRAINT customer_documents_document_type_check CHECK ((document_type = ANY (ARRAY['national_id','passport','driving_license','work_permit','residence_card','other'])))
);

CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    customer_id uuid NOT NULL,
    sale_type text DEFAULT 'cash' NOT NULL,
    status text DEFAULT 'draft' NOT NULL,
    total_amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    discount_amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    final_total_usd numeric(14,2) DEFAULT 0 NOT NULL,
    deposit_required_usd numeric(14,2) DEFAULT 0 NOT NULL,
    deposit_paid_usd numeric(14,2) DEFAULT 0 NOT NULL,
    total_paid_usd numeric(14,2) DEFAULT 0 NOT NULL,
    balance_due_usd numeric(14,2) DEFAULT 0 NOT NULL,
    installment_months integer DEFAULT 0,
    installment_mode text DEFAULT 'by_months' NOT NULL,
    installment_monthly_amount numeric(12,2) DEFAULT 0 NOT NULL,
    installment_discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    installment_discount_amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    total_cost_usd numeric(15,2) DEFAULT 0,
    total_profit_usd numeric(15,2) DEFAULT 0,
    start_date date,
    end_date date,
    notes_en text DEFAULT '',
    notes_ku text DEFAULT '',
    project_design_url text DEFAULT '',
    created_by uuid,
    assigned_to uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT orders_pkey PRIMARY KEY (id),
    CONSTRAINT orders_order_number_key UNIQUE (order_number),
    CONSTRAINT orders_discount_percent_check CHECK (((discount_percent >= 0) AND (discount_percent <= 5))),
    CONSTRAINT orders_sale_type_check CHECK ((sale_type = ANY (ARRAY['cash','installment']))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['draft','approved','deposit_paid','in_production','ready','installed','finished'])))
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_type text NOT NULL,
    product_type_name_en text DEFAULT '',
    product_type_name_ku text DEFAULT '',
    item_name_en text DEFAULT '',
    item_name_ku text DEFAULT '',
    quantity integer DEFAULT 1 NOT NULL,
    unit_price_usd numeric(14,2) DEFAULT 0 NOT NULL,
    total_price_usd numeric(14,2) DEFAULT 0 NOT NULL,
    cost_price_usd numeric(15,2) DEFAULT 0,
    profit_per_unit_usd numeric(15,2) DEFAULT 0,
    total_profit_usd numeric(15,2) DEFAULT 0,
    profit_updated_by uuid,
    profit_updated_at timestamp with time zone,
    config jsonb DEFAULT '{}' NOT NULL,
    notes_en text DEFAULT '',
    notes_ku text DEFAULT '',
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_items_pkey PRIMARY KEY (id),
    CONSTRAINT order_items_product_type_check CHECK ((product_type = ANY (ARRAY['kitchen_cabinet','bedroom_cabinet','tv_console','shoe_cabinet','understairs_cabinet','custom_console'])))
);

CREATE TABLE IF NOT EXISTS public.order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    from_status text DEFAULT '',
    to_status text NOT NULL,
    changed_by uuid,
    changed_by_name_en text DEFAULT '',
    changed_by_name_ku text DEFAULT '',
    reason_en text DEFAULT '',
    reason_ku text DEFAULT '',
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_status_history_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    payment_number text NOT NULL,
    payment_type text DEFAULT 'deposit' NOT NULL,
    currency text DEFAULT 'USD' NOT NULL,
    amount_in_currency numeric(16,2) DEFAULT 0 NOT NULL,
    exchange_rate_used numeric(12,2) DEFAULT 1330 NOT NULL,
    amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    installment_entry_id uuid,
    is_reversed boolean DEFAULT false,
    reversed_by uuid,
    reversal_reference_id uuid,
    discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    discount_amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    notes_en text DEFAULT '',
    notes_ku text DEFAULT '',
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payments_pkey PRIMARY KEY (id),
    CONSTRAINT payments_payment_number_key UNIQUE (payment_number),
    CONSTRAINT payments_currency_check CHECK ((currency = ANY (ARRAY['USD','IQD']))),
    CONSTRAINT payments_payment_type_check CHECK ((payment_type = ANY (ARRAY['deposit','installment','final','partial','reversal'])))
);

CREATE TABLE IF NOT EXISTS public.installment_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    total_amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    deposit_usd numeric(14,2) DEFAULT 0 NOT NULL,
    remaining_usd numeric(14,2) DEFAULT 0 NOT NULL,
    months integer DEFAULT 6 NOT NULL,
    monthly_amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    start_date date NOT NULL,
    original_snapshot jsonb DEFAULT '{}',
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT installment_schedules_pkey PRIMARY KEY (id),
    CONSTRAINT installment_schedules_order_id_key UNIQUE (order_id),
    CONSTRAINT installment_schedules_months_check CHECK ((months >= 1))
);

CREATE TABLE IF NOT EXISTS public.installment_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schedule_id uuid NOT NULL,
    order_id uuid NOT NULL,
    installment_number integer NOT NULL,
    due_date date NOT NULL,
    amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    paid_amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'unpaid' NOT NULL,
    is_modified boolean DEFAULT false,
    modification_reason_en text DEFAULT '',
    modification_reason_ku text DEFAULT '',
    modified_by uuid,
    modified_at timestamp with time zone,
    original_amount_usd numeric(14,2),
    original_due_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT installment_entries_pkey PRIMARY KEY (id),
    CONSTRAINT installment_entries_status_check CHECK ((status = ANY (ARRAY['unpaid','partial','paid','overdue'])))
);

CREATE TABLE IF NOT EXISTS public.payment_installment_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    installment_entry_id uuid NOT NULL,
    allocated_amount_usd numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_installment_links_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_en text NOT NULL,
    name_ku text NOT NULL,
    description_en text DEFAULT '',
    description_ku text DEFAULT '',
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT expense_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_number text DEFAULT (('EXP-' || to_char(now(), 'YYYYMM')) || '-' || floor((random() * 9000 + 1000))::text) NOT NULL,
    category_id uuid,
    category_name_en text DEFAULT '',
    category_name_ku text DEFAULT '',
    description_en text DEFAULT '' NOT NULL,
    description_ku text DEFAULT '' NOT NULL,
    currency text DEFAULT 'USD' NOT NULL,
    amount_in_currency numeric(16,2) DEFAULT 0 NOT NULL,
    exchange_rate_used numeric(12,2) DEFAULT 1330 NOT NULL,
    amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    linked_order_id uuid,
    receipt_url text DEFAULT '',
    notes_en text DEFAULT '',
    notes_ku text DEFAULT '',
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT expenses_pkey PRIMARY KEY (id),
    CONSTRAINT expenses_expense_number_key UNIQUE (expense_number),
    CONSTRAINT expenses_currency_check CHECK ((currency = ANY (ARRAY['USD','IQD'])))
);

CREATE TABLE IF NOT EXISTS public.lock_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_date date DEFAULT CURRENT_DATE NOT NULL,
    opened_at timestamp with time zone DEFAULT now(),
    closed_at timestamp with time zone,
    opened_by uuid,
    closed_by uuid,
    opening_balance_usd numeric(14,2) DEFAULT 0 NOT NULL,
    closing_balance_usd numeric(14,2),
    total_income_usd numeric(14,2) DEFAULT 0,
    total_expenses_usd numeric(14,2) DEFAULT 0,
    net_usd numeric(14,2) DEFAULT 0,
    payment_income_usd numeric(14,2) DEFAULT 0 NOT NULL,
    expense_outflow_usd numeric(14,2) DEFAULT 0 NOT NULL,
    installment_income_usd numeric(14,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'open' NOT NULL,
    notes_en text DEFAULT '',
    notes_ku text DEFAULT '',
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lock_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT lock_sessions_status_check CHECK ((status = ANY (ARRAY['open','closed'])))
);

CREATE TABLE IF NOT EXISTS public.lock_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    transaction_type text NOT NULL,
    reference_type text DEFAULT '',
    reference_id uuid,
    reference_number text DEFAULT '',
    description_en text DEFAULT '' NOT NULL,
    description_ku text DEFAULT '' NOT NULL,
    currency text DEFAULT 'USD',
    amount_in_currency numeric(16,2) DEFAULT 0,
    exchange_rate_used numeric(12,2) DEFAULT 1,
    amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lock_transactions_pkey PRIMARY KEY (id),
    CONSTRAINT lock_transactions_reference_type_check CHECK ((reference_type = ANY (ARRAY['payment','expense','manual','installment','']))),
    CONSTRAINT lock_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['income','expense'])))
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_name_en text DEFAULT '',
    user_name_ku text DEFAULT '',
    action text NOT NULL,
    module text NOT NULL,
    record_id text DEFAULT '',
    old_values jsonb DEFAULT '{}',
    new_values jsonb DEFAULT '{}',
    details jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.settings (
    key character varying(100) NOT NULL,
    value text NOT NULL,
    label_en character varying(200),
    label_ku character varying(200),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT settings_pkey PRIMARY KEY (key)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON public.auth_users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_auth_users_username ON public.auth_users USING btree (username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON public.customer_documents USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_created_by ON public.customer_documents USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_set_by ON public.exchange_rates USING btree (set_by);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses USING btree (category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_linked_order_id ON public.expenses USING btree (linked_order_id);
CREATE INDEX IF NOT EXISTS idx_installment_entries_schedule_id ON public.installment_entries USING btree (schedule_id);
CREATE INDEX IF NOT EXISTS idx_installment_entries_order_id ON public.installment_entries USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_installment_entries_status ON public.installment_entries USING btree (status);
CREATE INDEX IF NOT EXISTS idx_installment_entries_modified_by ON public.installment_entries USING btree (modified_by);
CREATE INDEX IF NOT EXISTS idx_installment_schedules_created_by ON public.installment_schedules USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_lock_sessions_opened_by ON public.lock_sessions USING btree (opened_by);
CREATE INDEX IF NOT EXISTS idx_lock_sessions_closed_by ON public.lock_sessions USING btree (closed_by);
CREATE INDEX IF NOT EXISTS idx_lock_transactions_session_id ON public.lock_transactions USING btree (session_id);
CREATE INDEX IF NOT EXISTS idx_lock_transactions_created_by ON public.lock_transactions USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by ON public.order_status_history USING btree (changed_by);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON public.orders USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders USING btree (assigned_to);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_payments_reversed_by ON public.payments USING btree (reversed_by);
CREATE INDEX IF NOT EXISTS idx_payments_installment_entry_id ON public.payments USING btree (installment_entry_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id_type ON public.payments USING btree (order_id, payment_type);
CREATE INDEX IF NOT EXISTS idx_pil_payment_id ON public.payment_installment_links USING btree (payment_id);
CREATE INDEX IF NOT EXISTS idx_pil_entry_id ON public.payment_installment_links USING btree (installment_entry_id);

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================

ALTER TABLE public.user_profiles
    DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;

ALTER TABLE public.customers
    DROP CONSTRAINT IF EXISTS customers_created_by_fkey;
ALTER TABLE public.customers
    ADD CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.customer_documents
    DROP CONSTRAINT IF EXISTS customer_documents_customer_id_fkey;
ALTER TABLE public.customer_documents
    ADD CONSTRAINT customer_documents_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

ALTER TABLE public.customer_documents
    DROP CONSTRAINT IF EXISTS customer_documents_created_by_fkey;
ALTER TABLE public.customer_documents
    ADD CONSTRAINT customer_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.exchange_rates
    DROP CONSTRAINT IF EXISTS exchange_rates_set_by_fkey;
ALTER TABLE public.exchange_rates
    ADD CONSTRAINT exchange_rates_set_by_fkey FOREIGN KEY (set_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.exchange_rates
    DROP CONSTRAINT IF EXISTS exchange_rates_created_by_fkey;
ALTER TABLE public.exchange_rates
    ADD CONSTRAINT exchange_rates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS orders_created_by_fkey;
ALTER TABLE public.orders
    ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS orders_assigned_to_fkey;
ALTER TABLE public.orders
    ADD CONSTRAINT orders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id);

ALTER TABLE public.order_items
    DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.order_items
    DROP CONSTRAINT IF EXISTS order_items_profit_updated_by_fkey;
ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_profit_updated_by_fkey FOREIGN KEY (profit_updated_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.order_status_history
    DROP CONSTRAINT IF EXISTS order_status_history_order_id_fkey;
ALTER TABLE public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.order_status_history
    DROP CONSTRAINT IF EXISTS order_status_history_changed_by_fkey;
ALTER TABLE public.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.payments
    DROP CONSTRAINT IF EXISTS payments_order_id_fkey;
ALTER TABLE public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);

ALTER TABLE public.payments
    DROP CONSTRAINT IF EXISTS payments_created_by_fkey;
ALTER TABLE public.payments
    ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.payments
    DROP CONSTRAINT IF EXISTS payments_reversed_by_fkey;
ALTER TABLE public.payments
    ADD CONSTRAINT payments_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.installment_schedules
    DROP CONSTRAINT IF EXISTS installment_schedules_order_id_fkey;
ALTER TABLE public.installment_schedules
    ADD CONSTRAINT installment_schedules_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.installment_schedules
    DROP CONSTRAINT IF EXISTS installment_schedules_created_by_fkey;
ALTER TABLE public.installment_schedules
    ADD CONSTRAINT installment_schedules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.installment_entries
    DROP CONSTRAINT IF EXISTS installment_entries_schedule_id_fkey;
ALTER TABLE public.installment_entries
    ADD CONSTRAINT installment_entries_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.installment_schedules(id) ON DELETE CASCADE;

ALTER TABLE public.installment_entries
    DROP CONSTRAINT IF EXISTS installment_entries_order_id_fkey;
ALTER TABLE public.installment_entries
    ADD CONSTRAINT installment_entries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);

ALTER TABLE public.installment_entries
    DROP CONSTRAINT IF EXISTS installment_entries_modified_by_fkey;
ALTER TABLE public.installment_entries
    ADD CONSTRAINT installment_entries_modified_by_fkey FOREIGN KEY (modified_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.payment_installment_links
    DROP CONSTRAINT IF EXISTS payment_installment_links_payment_id_fkey;
ALTER TABLE public.payment_installment_links
    ADD CONSTRAINT payment_installment_links_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;

ALTER TABLE public.payment_installment_links
    DROP CONSTRAINT IF EXISTS payment_installment_links_installment_entry_id_fkey;
ALTER TABLE public.payment_installment_links
    ADD CONSTRAINT payment_installment_links_installment_entry_id_fkey FOREIGN KEY (installment_entry_id) REFERENCES public.installment_entries(id) ON DELETE CASCADE;

ALTER TABLE public.expenses
    DROP CONSTRAINT IF EXISTS expenses_category_id_fkey;
ALTER TABLE public.expenses
    ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id);

ALTER TABLE public.expenses
    DROP CONSTRAINT IF EXISTS expenses_created_by_fkey;
ALTER TABLE public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.expenses
    DROP CONSTRAINT IF EXISTS expenses_linked_order_id_fkey;
ALTER TABLE public.expenses
    ADD CONSTRAINT expenses_linked_order_id_fkey FOREIGN KEY (linked_order_id) REFERENCES public.orders(id);

ALTER TABLE public.lock_sessions
    DROP CONSTRAINT IF EXISTS lock_sessions_opened_by_fkey;
ALTER TABLE public.lock_sessions
    ADD CONSTRAINT lock_sessions_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.lock_sessions
    DROP CONSTRAINT IF EXISTS lock_sessions_closed_by_fkey;
ALTER TABLE public.lock_sessions
    ADD CONSTRAINT lock_sessions_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.lock_transactions
    DROP CONSTRAINT IF EXISTS lock_transactions_session_id_fkey;
ALTER TABLE public.lock_transactions
    ADD CONSTRAINT lock_transactions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.lock_sessions(id) ON DELETE CASCADE;

ALTER TABLE public.lock_transactions
    DROP CONSTRAINT IF EXISTS lock_transactions_created_by_fkey;
ALTER TABLE public.lock_transactions
    ADD CONSTRAINT lock_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);

ALTER TABLE public.audit_logs
    DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_calculate_order_item_profit ON public.order_items;
CREATE TRIGGER trigger_calculate_order_item_profit
    BEFORE INSERT OR UPDATE OF unit_price_usd, cost_price_usd, quantity
    ON public.order_items FOR EACH ROW
    EXECUTE FUNCTION public.calculate_order_item_profit();

DROP TRIGGER IF EXISTS trigger_update_order_profit_totals ON public.order_items;
CREATE TRIGGER trigger_update_order_profit_totals
    AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW
    EXECUTE FUNCTION public.update_order_profit_totals();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lock_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_installment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Superadmin user (password: admin123)
INSERT INTO public.auth_users (id, username, email, password_hash, created_at)
VALUES ('b74ec180-384a-4c03-babe-630321a35e3f', 'admin', 'admin@alvichome.com',
        '$2a$06$ik4zCAR7Ju7L8Oq8O.wj9OCs87YwFZWHyURqv1lTs9/vg3n4pdCV6',
        '2026-03-11 00:48:13.684744+03')
ON CONFLICT (id) DO NOTHING;

-- Superadmin profile
INSERT INTO public.user_profiles (id, user_id, full_name_en, full_name_ku, role, custom_role_id, is_active, phone, created_at, updated_at)
VALUES ('b74ec180-384a-4c03-babe-630321a35e3f', 'b74ec180-384a-4c03-babe-630321a35e3f',
        'System Administrator', 'بەڕێوەبەری سیستەم', 'administrator', NULL, true, '',
        '2026-03-11 00:48:13.684744+03', '2026-03-11 00:48:13.684744+03')
ON CONFLICT (id) DO NOTHING;

-- System roles
INSERT INTO public.roles (id, name_en, name_ku, is_system, permissions, created_at, updated_at) VALUES
('6db28546-0796-4076-b357-dc4ce785c844', 'Administrator', 'بەڕێوەبەری گشتی', true,
 '{"lock":{"read":true,"create":true,"delete":true,"update":true},"roles":{"read":true,"create":true,"delete":true,"update":true},"users":{"read":true,"create":true,"delete":true,"update":true},"orders":{"read":true,"create":true,"delete":true,"update":true,"change_status":true},"reports":{"read":true},"expenses":{"read":true,"create":true,"delete":true,"update":true},"payments":{"read":true,"create":true,"delete":true,"update":true,"reverse":true},"customers":{"read":true,"create":true,"delete":true,"update":true},"audit_logs":{"read":true},"installments":{"read":true,"create":true,"delete":true,"update":true},"exchange_rates":{"read":true,"create":true,"update":true}}',
 '2026-03-11 00:48:13.684744+03', '2026-03-11 00:48:13.684744+03'),
('7b7655e9-40c3-49f9-aa93-9bb35c7b6388', 'Admin', 'بەڕێوەبەر', true,
 '{"lock":{"read":true,"create":true,"delete":false,"update":false},"users":{"read":false,"create":false,"delete":false,"update":false},"orders":{"read":true,"create":true,"delete":true,"update":true,"change_status":true},"reports":{"read":false},"expenses":{"read":true,"create":true,"delete":false,"update":true},"payments":{"read":true,"create":true,"delete":false,"update":false},"customers":{"read":true,"create":true,"delete":false,"update":true},"installments":{"read":true,"create":false,"delete":false,"update":false},"exchange_rates":{"read":true}}',
 '2026-03-11 00:48:13.684744+03', '2026-03-11 00:48:13.684744+03'),
('2a36e9dd-21ca-47b1-9e23-cd426d6d4d1a', 'Employee', 'کارمەند', true,
 '{"lock":{"read":true},"users":{"read":false,"create":false,"delete":false,"update":false},"orders":{"read":true,"create":true,"delete":true,"update":true,"change_status":false},"reports":{"read":false},"expenses":{"read":false,"create":false,"delete":false,"update":false},"payments":{"read":true,"create":true,"delete":false,"update":false},"customers":{"read":true,"create":true,"delete":false,"update":true},"installments":{"read":true,"create":false,"delete":false,"update":false},"exchange_rates":{"read":true}}',
 '2026-03-11 00:48:13.684744+03', '2026-03-11 00:48:13.684744+03')
ON CONFLICT (id) DO NOTHING;

-- Default exchange rate
INSERT INTO public.exchange_rates (id, rate_cash, rate_installment, effective_date, notes_en, notes_ku, created_at, created_by)
VALUES ('06ccf59d-220a-4fe7-a25b-a620b5cd476b', 1330.00, 1470.00, '2026-03-17', '', '',
        '2026-03-17 21:01:42.684+03', 'b74ec180-384a-4c03-babe-630321a35e3f')
ON CONFLICT (id) DO NOTHING;

-- Expense categories
INSERT INTO public.expense_categories (id, name_en, name_ku, description_en, description_ku, is_active, sort_order, created_at) VALUES
('12fa8025-22c3-4d27-8a32-8dc085de568b', 'Utilities - Water',       'خزمەتگوزاری - ئاو',       '', '', true, 1,  '2026-03-16 14:47:12.054944+03'),
('c2247e9d-2cde-4e47-bcc4-e3fe555a8265', 'Utilities - Electricity',  'خزمەتگوزاری - کارەبا',    '', '', true, 2,  '2026-03-16 14:47:12.054944+03'),
('5291eeb0-e660-4ea0-9a18-6ddb2ddbe900', 'Office Supplies',          'پێداویستیەکانی ئۆفیس',    '', '', true, 3,  '2026-03-16 14:47:12.054944+03'),
('c1aab36b-c5b9-4ee5-9ab0-fab12acfd114', 'Rent',                     'کرێ',                     '', '', true, 4,  '2026-03-16 14:47:12.054944+03'),
('a5817c2e-31b2-4739-a0ce-ef4c1255c191', 'Factory Materials',        'کەرەستەی فابریکە',        '', '', true, 5,  '2026-03-16 14:47:12.054944+03'),
('1bf456b3-007f-40e8-bb6c-926db75e3760', 'Employee Salaries',        'مووچەی کارمەندان',        '', '', true, 6,  '2026-03-16 14:47:12.054944+03'),
('ad69794b-2ffa-44e0-887f-6916a0af91de', 'Transportation',           'گواستنەوە',               '', '', true, 7,  '2026-03-16 14:47:12.054944+03'),
('69c3ca09-f869-416a-9fdb-109bd141338f', 'Maintenance & Repair',     'چاکسازی و گرتنەوە',       '', '', true, 8,  '2026-03-16 14:47:12.054944+03'),
('b66e9843-911d-4801-8a9e-5439bb4ae3eb', 'Marketing',                'بازارگەری',               '', '', true, 9,  '2026-03-16 14:47:12.054944+03'),
('e3d8f4bc-23fa-44cf-86b0-68b2f762a4ea', 'Other',                    'جووتری',                  '', '', true, 10, '2026-03-16 14:47:12.054944+03')
ON CONFLICT (id) DO NOTHING;

-- Settings
INSERT INTO public.settings (key, value, label_en, label_ku, updated_at) VALUES
('deposit_rate_cash',         '0.60', 'Cash Deposit Rate',         'ڕێژەی بیانە نەقد', '2026-03-16 16:56:47.96+03'),
('deposit_rate_installment',  '0.50', 'Installment Deposit Rate',  'ڕێژەی بیانە بەش',  '2026-03-16 16:56:47.982+03')
ON CONFLICT (key) DO NOTHING;

-- Reset sequences
SELECT setval('public.order_number_seq',   1000, false);
SELECT setval('public.payment_number_seq', 1000, false);

INSERT INTO public.settings (key, value, updated_at)
VALUES ('max_discount_percent', '5', now())
ON CONFLICT (key) DO NOTHING;