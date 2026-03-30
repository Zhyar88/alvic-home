--
-- PostgreSQL database dump
--


-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-03-27 22:31:49

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_reversed_by_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_installment_links DROP CONSTRAINT IF EXISTS payment_installment_links_payment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_installment_links DROP CONSTRAINT IF EXISTS payment_installment_links_installment_entry_id_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_assigned_to_fkey;
ALTER TABLE IF EXISTS ONLY public.order_status_history DROP CONSTRAINT IF EXISTS order_status_history_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_status_history DROP CONSTRAINT IF EXISTS order_status_history_changed_by_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_profit_updated_by_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lock_transactions DROP CONSTRAINT IF EXISTS lock_transactions_session_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lock_transactions DROP CONSTRAINT IF EXISTS lock_transactions_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.lock_sessions DROP CONSTRAINT IF EXISTS lock_sessions_opened_by_fkey;
ALTER TABLE IF EXISTS ONLY public.lock_sessions DROP CONSTRAINT IF EXISTS lock_sessions_closed_by_fkey;
ALTER TABLE IF EXISTS ONLY public.installment_schedules DROP CONSTRAINT IF EXISTS installment_schedules_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.installment_schedules DROP CONSTRAINT IF EXISTS installment_schedules_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.installment_entries DROP CONSTRAINT IF EXISTS installment_entries_schedule_id_fkey;
ALTER TABLE IF EXISTS ONLY public.installment_entries DROP CONSTRAINT IF EXISTS installment_entries_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.installment_entries DROP CONSTRAINT IF EXISTS installment_entries_modified_by_fkey;
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS expenses_linked_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS expenses_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS expenses_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exchange_rates DROP CONSTRAINT IF EXISTS exchange_rates_set_by_fkey;
ALTER TABLE IF EXISTS ONLY public.exchange_rates DROP CONSTRAINT IF EXISTS exchange_rates_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.customer_documents DROP CONSTRAINT IF EXISTS customer_documents_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.customer_documents DROP CONSTRAINT IF EXISTS customer_documents_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
DROP TRIGGER IF EXISTS trigger_update_order_profit_totals ON public.order_items;
DROP TRIGGER IF EXISTS trigger_calculate_order_item_profit ON public.order_items;
DROP INDEX IF EXISTS public.idx_pil_payment_id;
DROP INDEX IF EXISTS public.idx_pil_entry_id;
DROP INDEX IF EXISTS public.idx_payments_reversed_by;
DROP INDEX IF EXISTS public.idx_payments_order_id_type;
DROP INDEX IF EXISTS public.idx_payments_order_id;
DROP INDEX IF EXISTS public.idx_payments_installment_entry_id;
DROP INDEX IF EXISTS public.idx_payments_created_by;
DROP INDEX IF EXISTS public.idx_orders_customer_id;
DROP INDEX IF EXISTS public.idx_orders_created_by;
DROP INDEX IF EXISTS public.idx_orders_assigned_to;
DROP INDEX IF EXISTS public.idx_order_status_history_order_id;
DROP INDEX IF EXISTS public.idx_order_status_history_changed_by;
DROP INDEX IF EXISTS public.idx_order_items_order_id;
DROP INDEX IF EXISTS public.idx_lock_transactions_session_id;
DROP INDEX IF EXISTS public.idx_lock_transactions_created_by;
DROP INDEX IF EXISTS public.idx_lock_sessions_opened_by;
DROP INDEX IF EXISTS public.idx_lock_sessions_closed_by;
DROP INDEX IF EXISTS public.idx_installment_schedules_created_by;
DROP INDEX IF EXISTS public.idx_installment_entries_status;
DROP INDEX IF EXISTS public.idx_installment_entries_schedule_id;
DROP INDEX IF EXISTS public.idx_installment_entries_order_id;
DROP INDEX IF EXISTS public.idx_installment_entries_modified_by;
DROP INDEX IF EXISTS public.idx_expenses_linked_order_id;
DROP INDEX IF EXISTS public.idx_expenses_created_by;
DROP INDEX IF EXISTS public.idx_expenses_category_id;
DROP INDEX IF EXISTS public.idx_exchange_rates_set_by;
DROP INDEX IF EXISTS public.idx_customers_created_by;
DROP INDEX IF EXISTS public.idx_customer_documents_customer_id;
DROP INDEX IF EXISTS public.idx_customer_documents_created_by;
DROP INDEX IF EXISTS public.idx_auth_users_username;
DROP INDEX IF EXISTS public.idx_auth_users_email;
DROP INDEX IF EXISTS public.idx_audit_logs_user_id;
ALTER TABLE IF EXISTS ONLY public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_key;
ALTER TABLE IF EXISTS ONLY public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_pkey;
ALTER TABLE IF EXISTS ONLY public.settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_payment_number_key;
ALTER TABLE IF EXISTS ONLY public.payment_installment_links DROP CONSTRAINT IF EXISTS payment_installment_links_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_order_number_key;
ALTER TABLE IF EXISTS ONLY public.order_status_history DROP CONSTRAINT IF EXISTS order_status_history_pkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.lock_transactions DROP CONSTRAINT IF EXISTS lock_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.lock_sessions DROP CONSTRAINT IF EXISTS lock_sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.installment_schedules DROP CONSTRAINT IF EXISTS installment_schedules_pkey;
ALTER TABLE IF EXISTS ONLY public.installment_schedules DROP CONSTRAINT IF EXISTS installment_schedules_order_id_key;
ALTER TABLE IF EXISTS ONLY public.installment_entries DROP CONSTRAINT IF EXISTS installment_entries_pkey;
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS expenses_pkey;
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS expenses_expense_number_key;
ALTER TABLE IF EXISTS ONLY public.expense_categories DROP CONSTRAINT IF EXISTS expense_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.exchange_rates DROP CONSTRAINT IF EXISTS exchange_rates_pkey;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_pkey;
ALTER TABLE IF EXISTS ONLY public.customer_documents DROP CONSTRAINT IF EXISTS customer_documents_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_users DROP CONSTRAINT IF EXISTS auth_users_username_key;
ALTER TABLE IF EXISTS ONLY public.auth_users DROP CONSTRAINT IF EXISTS auth_users_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_users DROP CONSTRAINT IF EXISTS auth_users_email_key;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
DROP VIEW IF EXISTS public.yearly_profit_report;
DROP TABLE IF EXISTS public.user_profiles;
DROP TABLE IF EXISTS public.settings;
DROP TABLE IF EXISTS public.roles;
DROP TABLE IF EXISTS public.payments;
DROP SEQUENCE IF EXISTS public.payment_number_seq;
DROP TABLE IF EXISTS public.payment_installment_links;
DROP TABLE IF EXISTS public.order_status_history;
DROP SEQUENCE IF EXISTS public.order_number_seq;
DROP TABLE IF EXISTS public.order_items;
DROP VIEW IF EXISTS public.monthly_profit_report;
DROP TABLE IF EXISTS public.lock_transactions;
DROP TABLE IF EXISTS public.lock_sessions;
DROP TABLE IF EXISTS public.installment_schedules;
DROP TABLE IF EXISTS public.installment_entries;
DROP TABLE IF EXISTS public.expense_categories;
DROP TABLE IF EXISTS public.exchange_rates;
DROP VIEW IF EXISTS public.daily_profit_report;
DROP TABLE IF EXISTS public.expenses;
DROP VIEW IF EXISTS public.customer_profit_summary;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.customers;
DROP TABLE IF EXISTS public.customer_documents;
DROP TABLE IF EXISTS public.auth_users;
DROP TABLE IF EXISTS public.audit_logs;
DROP FUNCTION IF EXISTS public.update_order_profit_totals();
DROP FUNCTION IF EXISTS public.generate_payment_number();
DROP FUNCTION IF EXISTS public.generate_order_number();
DROP FUNCTION IF EXISTS public.calculate_order_item_profit();
DROP EXTENSION IF EXISTS pgcrypto;
--
-- TOC entry 2 (class 3079 OID 19580)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5500 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 282 (class 1255 OID 19618)
-- Name: calculate_order_item_profit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_order_item_profit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.profit_per_unit_usd := NEW.unit_price_usd - COALESCE(NEW.cost_price_usd, 0);
  NEW.total_profit_usd := NEW.profit_per_unit_usd * NEW.quantity;
  RETURN NEW;
END;
$$;


--
-- TOC entry 287 (class 1255 OID 19619)
-- Name: generate_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN 'AH-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('order_number_seq')::text, 4, '0');
END;
$$;


--
-- TOC entry 288 (class 1255 OID 19620)
-- Name: generate_payment_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_payment_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN 'PAY-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('payment_number_seq')::text, 4, '0');
END;
$$;


--
-- TOC entry 295 (class 1255 OID 19621)
-- Name: update_order_profit_totals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_order_profit_totals() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 19622)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_name_en text DEFAULT ''::text,
    user_name_ku text DEFAULT ''::text,
    action text NOT NULL,
    module text NOT NULL,
    record_id text DEFAULT ''::text,
    old_values jsonb DEFAULT '{}'::jsonb,
    new_values jsonb DEFAULT '{}'::jsonb,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 221 (class 1259 OID 19638)
-- Name: auth_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 222 (class 1259 OID 19649)
-- Name: customer_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    document_type text DEFAULT 'other'::text NOT NULL,
    label_en text DEFAULT ''::text NOT NULL,
    label_ku text DEFAULT ''::text NOT NULL,
    file_name text DEFAULT ''::text NOT NULL,
    file_path text DEFAULT ''::text NOT NULL,
    file_size integer DEFAULT 0,
    mime_type text DEFAULT ''::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_documents_document_type_check CHECK ((document_type = ANY (ARRAY['national_id'::text, 'passport'::text, 'driving_license'::text, 'work_permit'::text, 'residence_card'::text, 'other'::text])))
);


--
-- TOC entry 223 (class 1259 OID 19671)
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name_en text DEFAULT ''::text NOT NULL,
    full_name_ku text DEFAULT ''::text NOT NULL,
    address_en text DEFAULT ''::text NOT NULL,
    address_ku text DEFAULT ''::text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    phone_secondary text DEFAULT ''::text,
    national_id_number text DEFAULT ''::text,
    national_id_image_url text DEFAULT ''::text,
    guarantor_name_en text DEFAULT ''::text,
    guarantor_name_ku text DEFAULT ''::text,
    guarantor_workplace_en text DEFAULT ''::text,
    guarantor_workplace_ku text DEFAULT ''::text,
    guarantor_phone text DEFAULT ''::text,
    salary_deduction_consent boolean DEFAULT false,
    notes_en text DEFAULT ''::text,
    notes_ku text DEFAULT ''::text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 224 (class 1259 OID 19702)
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    customer_id uuid NOT NULL,
    sale_type text DEFAULT 'cash'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    total_amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    discount_amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    final_total_usd numeric(14,2) DEFAULT 0 NOT NULL,
    deposit_required_usd numeric(14,2) DEFAULT 0 NOT NULL,
    deposit_paid_usd numeric(14,2) DEFAULT 0 NOT NULL,
    total_paid_usd numeric(14,2) DEFAULT 0 NOT NULL,
    balance_due_usd numeric(14,2) DEFAULT 0 NOT NULL,
    installment_months integer DEFAULT 0,
    installment_mode text DEFAULT 'by_months'::text NOT NULL,
    installment_monthly_amount numeric(12,2) DEFAULT 0 NOT NULL,
    installment_discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    installment_discount_amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    total_cost_usd numeric(15,2) DEFAULT 0,
    total_profit_usd numeric(15,2) DEFAULT 0,
    start_date date,
    end_date date,
    notes_en text DEFAULT ''::text,
    notes_ku text DEFAULT ''::text,
    project_design_url text DEFAULT ''::text,
    created_by uuid,
    assigned_to uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT orders_discount_percent_check CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))),
    CONSTRAINT orders_sale_type_check CHECK ((sale_type = ANY (ARRAY['cash'::text, 'installment'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'deposit_paid'::text, 'in_production'::text, 'ready'::text, 'installed'::text, 'finished'::text])))
);


--
-- TOC entry 225 (class 1259 OID 19750)
-- Name: customer_profit_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.customer_profit_summary AS
 SELECT c.id AS customer_id,
    c.full_name_en,
    c.full_name_ku,
    count(DISTINCT o.id) AS total_orders,
    COALESCE(sum(o.final_total_usd), (0)::numeric) AS lifetime_revenue,
    COALESCE(sum(o.total_cost_usd), (0)::numeric) AS lifetime_cost,
    COALESCE(sum(o.total_profit_usd), (0)::numeric) AS lifetime_profit,
        CASE
            WHEN (count(o.id) > 0) THEN (COALESCE(sum(o.total_profit_usd), (0)::numeric) / (count(o.id))::numeric)
            ELSE (0)::numeric
        END AS avg_profit_per_order
   FROM (public.customers c
     LEFT JOIN public.orders o ON (((c.id = o.customer_id) AND (o.status <> 'draft'::text))))
  GROUP BY c.id, c.full_name_en, c.full_name_ku
  ORDER BY COALESCE(sum(o.total_profit_usd), (0)::numeric) DESC;


--
-- TOC entry 226 (class 1259 OID 19755)
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_number text DEFAULT ((('EXP-'::text || to_char(now(), 'YYYYMM'::text)) || '-'::text) || (floor(((random() * (9000)::double precision) + (1000)::double precision)))::text) NOT NULL,
    category_id uuid,
    category_name_en text DEFAULT ''::text,
    category_name_ku text DEFAULT ''::text,
    description_en text DEFAULT ''::text NOT NULL,
    description_ku text DEFAULT ''::text NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    amount_in_currency numeric(16,2) DEFAULT 0 NOT NULL,
    exchange_rate_used numeric(12,2) DEFAULT 1330 NOT NULL,
    amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    linked_order_id uuid,
    receipt_url text DEFAULT ''::text,
    notes_en text DEFAULT ''::text,
    notes_ku text DEFAULT ''::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT expenses_currency_check CHECK ((currency = ANY (ARRAY['USD'::text, 'IQD'::text])))
);


--
-- TOC entry 227 (class 1259 OID 19786)
-- Name: daily_profit_report; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.daily_profit_report AS
 WITH daily_orders AS (
         SELECT date(o.created_at) AS report_date,
            o.customer_id,
            c.full_name_en,
            c.full_name_ku,
            count(DISTINCT o.id) AS total_orders,
            sum(o.final_total_usd) AS total_revenue,
            sum(o.total_cost_usd) AS total_cost,
            sum(o.total_profit_usd) AS gross_profit
           FROM (public.orders o
             LEFT JOIN public.customers c ON ((o.customer_id = c.id)))
          WHERE (o.status <> 'draft'::text)
          GROUP BY (date(o.created_at)), o.customer_id, c.full_name_en, c.full_name_ku
        ), daily_expenses AS (
         SELECT e.expense_date,
            sum(e.amount_usd) AS total_expenses
           FROM public.expenses e
          GROUP BY e.expense_date
        )
 SELECT ord.report_date,
    ord.customer_id,
    ord.full_name_en AS customer_name_en,
    ord.full_name_ku AS customer_name_ku,
    ord.total_orders,
    ord.total_revenue,
    ord.total_cost,
    ord.gross_profit,
    COALESCE(exp.total_expenses, (0)::numeric) AS total_expenses,
    (ord.gross_profit - COALESCE(exp.total_expenses, (0)::numeric)) AS net_profit
   FROM (daily_orders ord
     LEFT JOIN daily_expenses exp ON ((ord.report_date = exp.expense_date)))
  ORDER BY ord.report_date DESC;


--
-- TOC entry 228 (class 1259 OID 19791)
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rate_cash numeric(12,2) DEFAULT 1330 NOT NULL,
    rate_installment numeric(12,2) DEFAULT 1470 NOT NULL,
    effective_date date DEFAULT CURRENT_DATE NOT NULL,
    set_by uuid,
    notes_en text DEFAULT ''::text,
    notes_ku text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- TOC entry 229 (class 1259 OID 19807)
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_en text NOT NULL,
    name_ku text NOT NULL,
    description_en text DEFAULT ''::text,
    description_ku text DEFAULT ''::text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 230 (class 1259 OID 19821)
-- Name: installment_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installment_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schedule_id uuid NOT NULL,
    order_id uuid NOT NULL,
    installment_number integer NOT NULL,
    due_date date NOT NULL,
    amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    paid_amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'unpaid'::text NOT NULL,
    is_modified boolean DEFAULT false,
    modification_reason_en text DEFAULT ''::text,
    modification_reason_ku text DEFAULT ''::text,
    modified_by uuid,
    modified_at timestamp with time zone,
    original_amount_usd numeric(14,2),
    original_due_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT installment_entries_status_check CHECK ((status = ANY (ARRAY['unpaid'::text, 'partial'::text, 'paid'::text, 'overdue'::text])))
);


--
-- TOC entry 231 (class 1259 OID 19844)
-- Name: installment_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installment_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    total_amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    deposit_usd numeric(14,2) DEFAULT 0 NOT NULL,
    remaining_usd numeric(14,2) DEFAULT 0 NOT NULL,
    months integer DEFAULT 6 NOT NULL,
    monthly_amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    start_date date NOT NULL,
    original_snapshot jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT installment_schedules_months_check CHECK ((months >= 1))
);


--
-- TOC entry 232 (class 1259 OID 19867)
-- Name: lock_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lock_sessions (
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
    status text DEFAULT 'open'::text NOT NULL,
    notes_en text DEFAULT ''::text,
    notes_ku text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lock_sessions_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text])))
);


--
-- TOC entry 233 (class 1259 OID 19894)
-- Name: lock_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lock_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    transaction_type text NOT NULL,
    reference_type text DEFAULT ''::text,
    reference_id uuid,
    reference_number text DEFAULT ''::text,
    description_en text DEFAULT ''::text NOT NULL,
    description_ku text DEFAULT ''::text NOT NULL,
    currency text DEFAULT 'USD'::text,
    amount_in_currency numeric(16,2) DEFAULT 0,
    exchange_rate_used numeric(12,2) DEFAULT 1,
    amount_usd numeric(14,2) DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lock_transactions_reference_type_check CHECK ((reference_type = ANY (ARRAY['payment'::text, 'expense'::text, 'manual'::text, 'installment'::text, ''::text]))),
    CONSTRAINT lock_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['income'::text, 'expense'::text])))
);


--
-- TOC entry 234 (class 1259 OID 19917)
-- Name: monthly_profit_report; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.monthly_profit_report AS
 WITH monthly_orders AS (
         SELECT date_trunc('month'::text, o.created_at) AS report_month,
            o.customer_id,
            c.full_name_en,
            c.full_name_ku,
            count(DISTINCT o.id) AS total_orders,
            sum(o.final_total_usd) AS total_revenue,
            sum(o.total_cost_usd) AS total_cost,
            sum(o.total_profit_usd) AS gross_profit
           FROM (public.orders o
             LEFT JOIN public.customers c ON ((o.customer_id = c.id)))
          WHERE (o.status <> 'draft'::text)
          GROUP BY (date_trunc('month'::text, o.created_at)), o.customer_id, c.full_name_en, c.full_name_ku
        ), monthly_expenses AS (
         SELECT date_trunc('month'::text, (e.expense_date)::timestamp with time zone) AS expense_month,
            sum(e.amount_usd) AS total_expenses
           FROM public.expenses e
          GROUP BY (date_trunc('month'::text, (e.expense_date)::timestamp with time zone))
        )
 SELECT ord.report_month,
    ord.customer_id,
    ord.full_name_en AS customer_name_en,
    ord.full_name_ku AS customer_name_ku,
    ord.total_orders,
    ord.total_revenue,
    ord.total_cost,
    ord.gross_profit,
    COALESCE(exp.total_expenses, (0)::numeric) AS total_expenses,
    (ord.gross_profit - COALESCE(exp.total_expenses, (0)::numeric)) AS net_profit
   FROM (monthly_orders ord
     LEFT JOIN monthly_expenses exp ON ((ord.report_month = exp.expense_month)))
  ORDER BY ord.report_month DESC;


--
-- TOC entry 235 (class 1259 OID 19922)
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_type text NOT NULL,
    product_type_name_en text DEFAULT ''::text,
    product_type_name_ku text DEFAULT ''::text,
    item_name_en text DEFAULT ''::text,
    item_name_ku text DEFAULT ''::text,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price_usd numeric(14,2) DEFAULT 0 NOT NULL,
    total_price_usd numeric(14,2) DEFAULT 0 NOT NULL,
    cost_price_usd numeric(15,2) DEFAULT 0,
    profit_per_unit_usd numeric(15,2) DEFAULT 0,
    total_profit_usd numeric(15,2) DEFAULT 0,
    profit_updated_by uuid,
    profit_updated_at timestamp with time zone,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes_en text DEFAULT ''::text,
    notes_ku text DEFAULT ''::text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_items_product_type_check CHECK ((product_type = ANY (ARRAY['kitchen_cabinet'::text, 'bedroom_cabinet'::text, 'tv_console'::text, 'shoe_cabinet'::text, 'understairs_cabinet'::text, 'custom_console'::text])))
);


--
-- TOC entry 236 (class 1259 OID 19952)
-- Name: order_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_number_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 237 (class 1259 OID 19953)
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    from_status text DEFAULT ''::text,
    to_status text NOT NULL,
    changed_by uuid,
    changed_by_name_en text DEFAULT ''::text,
    changed_by_name_ku text DEFAULT ''::text,
    reason_en text DEFAULT ''::text,
    reason_ku text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 238 (class 1259 OID 19968)
-- Name: payment_installment_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_installment_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    installment_entry_id uuid NOT NULL,
    allocated_amount_usd numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 239 (class 1259 OID 19978)
-- Name: payment_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_number_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 240 (class 1259 OID 19979)
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    payment_number text NOT NULL,
    payment_type text DEFAULT 'deposit'::text NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
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
    notes_en text DEFAULT ''::text,
    notes_ku text DEFAULT ''::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    accountant_name text DEFAULT ''::text NOT NULL,
    CONSTRAINT payments_currency_check CHECK ((currency = ANY (ARRAY['USD'::text, 'IQD'::text]))),
    CONSTRAINT payments_payment_type_check CHECK ((payment_type = ANY (ARRAY['deposit'::text, 'installment'::text, 'final'::text, 'partial'::text, 'reversal'::text])))
);


--
-- TOC entry 241 (class 1259 OID 20012)
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_en text NOT NULL,
    name_ku text NOT NULL,
    is_system boolean DEFAULT false,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 242 (class 1259 OID 20026)
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    key character varying(100) NOT NULL,
    value text NOT NULL,
    label_en character varying(200),
    label_ku character varying(200),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 243 (class 1259 OID 20034)
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name_en text DEFAULT ''::text NOT NULL,
    full_name_ku text DEFAULT ''::text NOT NULL,
    role text DEFAULT 'employee'::text NOT NULL,
    custom_role_id uuid,
    is_active boolean DEFAULT true,
    phone text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_profiles_role_check CHECK ((role = ANY (ARRAY['administrator'::text, 'admin'::text, 'employee'::text, 'custom'::text, 'data entry'::text])))
);


--
-- TOC entry 244 (class 1259 OID 20053)
-- Name: yearly_profit_report; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.yearly_profit_report AS
 WITH yearly_orders AS (
         SELECT date_trunc('year'::text, o.created_at) AS report_year,
            o.customer_id,
            c.full_name_en,
            c.full_name_ku,
            count(DISTINCT o.id) AS total_orders,
            sum(o.final_total_usd) AS total_revenue,
            sum(o.total_cost_usd) AS total_cost,
            sum(o.total_profit_usd) AS gross_profit
           FROM (public.orders o
             LEFT JOIN public.customers c ON ((o.customer_id = c.id)))
          WHERE (o.status <> 'draft'::text)
          GROUP BY (date_trunc('year'::text, o.created_at)), o.customer_id, c.full_name_en, c.full_name_ku
        ), yearly_expenses AS (
         SELECT date_trunc('year'::text, (e.expense_date)::timestamp with time zone) AS expense_year,
            sum(e.amount_usd) AS total_expenses
           FROM public.expenses e
          GROUP BY (date_trunc('year'::text, (e.expense_date)::timestamp with time zone))
        )
 SELECT ord.report_year,
    ord.customer_id,
    ord.full_name_en AS customer_name_en,
    ord.full_name_ku AS customer_name_ku,
    ord.total_orders,
    ord.total_revenue,
    ord.total_cost,
    ord.gross_profit,
    COALESCE(exp.total_expenses, (0)::numeric) AS total_expenses,
    (ord.gross_profit - COALESCE(exp.total_expenses, (0)::numeric)) AS net_profit
   FROM (yearly_orders ord
     LEFT JOIN yearly_expenses exp ON ((ord.report_year = exp.expense_year)))
  ORDER BY ord.report_year DESC;


--
-- TOC entry 5474 (class 0 OID 19622)
-- Dependencies: 220
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5475 (class 0 OID 19638)
-- Dependencies: 221
-- Data for Name: auth_users; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5476 (class 0 OID 19649)
-- Dependencies: 222
-- Data for Name: customer_documents; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5477 (class 0 OID 19671)
-- Dependencies: 223
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5480 (class 0 OID 19791)
-- Dependencies: 228
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5481 (class 0 OID 19807)
-- Dependencies: 229
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5479 (class 0 OID 19755)
-- Dependencies: 226
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5482 (class 0 OID 19821)
-- Dependencies: 230
-- Data for Name: installment_entries; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5483 (class 0 OID 19844)
-- Dependencies: 231
-- Data for Name: installment_schedules; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5484 (class 0 OID 19867)
-- Dependencies: 232
-- Data for Name: lock_sessions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5485 (class 0 OID 19894)
-- Dependencies: 233
-- Data for Name: lock_transactions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5486 (class 0 OID 19922)
-- Dependencies: 235
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5488 (class 0 OID 19953)
-- Dependencies: 237
-- Data for Name: order_status_history; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5478 (class 0 OID 19702)
-- Dependencies: 224
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5489 (class 0 OID 19968)
-- Dependencies: 238
-- Data for Name: payment_installment_links; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5491 (class 0 OID 19979)
-- Dependencies: 240
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5492 (class 0 OID 20012)
-- Dependencies: 241
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5493 (class 0 OID 20026)
-- Dependencies: 242
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- TOC entry 5494 (class 0 OID 20034)
-- Dependencies: 243
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--




-- GUI-friendly INSERT data

-- Data for public.auth_users
INSERT INTO public.auth_users (id, username, email, password_hash, created_at) VALUES
('b74ec180-384a-4c03-babe-630321a35e3f', 'admin', 'admin@alvichome.com', '$2a$10$c471RpcqDohMxF6ZQHZY7.BhibLyx6V0DuQZlkjusUgK/.u.cYsXW', '2026-03-11 00:48:13.684744+03');

-- Data for public.roles
INSERT INTO public.roles (id, name_en, name_ku, is_system, permissions, created_at, updated_at) VALUES
('6db28546-0796-4076-b357-dc4ce785c844', 'Administrator', 'بەڕێوەبەری گشتی', TRUE, '{"lock": {"read": true, "create": true, "delete": true, "update": true}, "roles": {"read": true, "create": true, "delete": true, "update": true}, "users": {"read": true, "create": true, "delete": true, "update": true}, "orders": {"read": true, "create": true, "delete": true, "update": true, "change_status": true}, "reports": {"read": true}, "expenses": {"read": true, "create": true, "delete": true, "update": true}, "payments": {"read": true, "create": true, "delete": true, "update": true, "reverse": true}, "customers": {"read": true, "create": true, "delete": true, "update": true}, "audit_logs": {"read": true}, "installments": {"read": true, "create": true, "delete": true, "update": true}, "exchange_rates": {"read": true, "create": true, "update": true}}', '2026-03-11 00:48:13.684744+03', '2026-03-11 00:48:13.684744+03');

-- Data for public.settings
INSERT INTO public.settings (key, value, label_en, label_ku, updated_at) VALUES
('deposit_rate_cash', '0.60', 'Cash Deposit Rate', 'ڕێژەی بیانە نەقد', '2026-03-24 20:04:09.775+03'),
('deposit_rate_installment', '0.50', 'Installment Deposit Rate', 'ڕێژەی بیانە بەش', '2026-03-24 20:04:09.838+03'),
('max_discount_percent', '10', NULL, NULL, '2026-03-24 20:04:09.845+03');

-- Data for public.user_profiles
INSERT INTO public.user_profiles (id, user_id, full_name_en, full_name_ku, role, custom_role_id, is_active, phone, created_at, updated_at) VALUES
('b74ec180-384a-4c03-babe-630321a35e3f', 'b74ec180-384a-4c03-babe-630321a35e3f', 'System Administrator', 'بەڕێوەبەری سیستەم', 'administrator', NULL, TRUE, '', '2026-03-11 00:48:13.684744+03', '2026-03-11 00:48:13.684744+03');

-- Data for public.customers
-- No data for public.customers

-- Data for public.customer_documents
INSERT INTO public.customer_documents (id, customer_id, document_type, label_en, label_ku, file_name, file_path, file_size, mime_type, created_by, created_at) VALUES
('3feb861b-a7ff-4e1e-a4c4-71fc116c3375', '284d5861-c854-470f-80fd-eab0c6d8045e', 'national_id', '199921381107', '199921381107', 'IMG_7889.jpg', '284d5861-c854-470f-80fd-eab0c6d8045e/1773833783385-b7s1pc3oal4.jpg', '843303', 'image/jpeg', 'b74ec180-384a-4c03-babe-630321a35e3f', '2026-03-18 14:36:23.397629+03');

-- Data for public.exchange_rates
INSERT INTO public.exchange_rates (
  rate_cash,
  rate_installment,
  effective_date,
  set_by,
  notes_en,
  notes_ku,
  created_by
)
VALUES (
  1330.00,
  1470.00,
  CURRENT_DATE,
  NULL,
  'Initial exchange rates',
  'نرخی سەرەتایی گۆڕینی دراو',
  NULL
);
-- Data for public.expense_categories
INSERT INTO public.expense_categories (id, name_en, name_ku, description_en, description_ku, is_active, sort_order, created_at) VALUES
('12fa8025-22c3-4d27-8a32-8dc085de568b', 'Utilities - Water', 'خزمەتگوزاری - ئاو', '', '', TRUE, '1', '2026-03-16 14:47:12.054944+03'),
('c2247e9d-2cde-4e47-bcc4-e3fe555a8265', 'Utilities - Electricity', 'خزمەتگوزاری - کارەبا', '', '', TRUE, '2', '2026-03-16 14:47:12.054944+03'),
('5291eeb0-e660-4ea0-9a18-6ddb2ddbe900', 'Office Supplies', 'پێداویستیەکانی ئۆفیس', '', '', TRUE, '3', '2026-03-16 14:47:12.054944+03'),
('c1aab36b-c5b9-4ee5-9ab0-fab12acfd114', 'Rent', 'کرێ', '', '', TRUE, '4', '2026-03-16 14:47:12.054944+03'),
('a5817c2e-31b2-4739-a0ce-ef4c1255c191', 'Factory Materials', 'کەرەستەی فابریکە', '', '', TRUE, '5', '2026-03-16 14:47:12.054944+03'),
('1bf456b3-007f-40e8-bb6c-926db75e3760', 'Employee Salaries', 'مووچەی کارمەندان', '', '', TRUE, '6', '2026-03-16 14:47:12.054944+03'),
('ad69794b-2ffa-44e0-887f-6916a0af91de', 'Transportation', 'گواستنەوە', '', '', TRUE, '7', '2026-03-16 14:47:12.054944+03'),
('69c3ca09-f869-416a-9fdb-109bd141338f', 'Maintenance & Repair', 'چاکسازی و گرتنەوە', '', '', TRUE, '8', '2026-03-16 14:47:12.054944+03'),
('b66e9843-911d-4801-8a9e-5439bb4ae3eb', 'Marketing', 'بازارگەری', '', '', TRUE, '9', '2026-03-16 14:47:12.054944+03'),
('e3d8f4bc-23fa-44cf-86b0-68b2f762a4ea', 'Other', 'جووتری', '', '', TRUE, '10', '2026-03-16 14:47:12.054944+03');

-- Data for public.orders
-- No data for public.orders

-- Data for public.installment_schedules
-- No data for public.installment_schedules

-- Data for public.installment_entries
-- No data for public.installment_entries

-- Data for public.payments
-- No data for public.payments

-- Data for public.payment_installment_links
-- No data for public.payment_installment_links

-- Data for public.expenses
-- No data for public.expenses

-- Data for public.lock_sessions
-- No data for public.lock_sessions

-- Data for public.lock_transactions
-- No data for public.lock_transactions

-- Data for public.order_items
-- No data for public.order_items

-- Data for public.order_status_history
-- No data for public.order_status_history

-- Data for public.audit_logs
-- No data for public.audit_logs

--
-- TOC entry 5501 (class 0 OID 0)
-- Dependencies: 236
-- Name: order_number_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_number_seq', 1000, false);


--
-- TOC entry 5502 (class 0 OID 0)
-- Dependencies: 239
-- Name: payment_number_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payment_number_seq', 1000, false);


--
-- TOC entry 5190 (class 2606 OID 20059)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5193 (class 2606 OID 20061)
-- Name: auth_users auth_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_email_key UNIQUE (email);


--
-- TOC entry 5195 (class 2606 OID 20063)
-- Name: auth_users auth_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_pkey PRIMARY KEY (id);


--
-- TOC entry 5197 (class 2606 OID 20065)
-- Name: auth_users auth_users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_username_key UNIQUE (username);


--
-- TOC entry 5201 (class 2606 OID 20067)
-- Name: customer_documents customer_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_documents
    ADD CONSTRAINT customer_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5205 (class 2606 OID 20069)
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- TOC entry 5222 (class 2606 OID 20071)
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- TOC entry 5225 (class 2606 OID 20073)
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5215 (class 2606 OID 20075)
-- Name: expenses expenses_expense_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_expense_number_key UNIQUE (expense_number);


--
-- TOC entry 5217 (class 2606 OID 20077)
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- TOC entry 5231 (class 2606 OID 20079)
-- Name: installment_entries installment_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installment_entries
    ADD CONSTRAINT installment_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 5234 (class 2606 OID 20081)
-- Name: installment_schedules installment_schedules_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installment_schedules
    ADD CONSTRAINT installment_schedules_order_id_key UNIQUE (order_id);


--
-- TOC entry 5236 (class 2606 OID 20083)
-- Name: installment_schedules installment_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installment_schedules
    ADD CONSTRAINT installment_schedules_pkey PRIMARY KEY (id);


--
-- TOC entry 5240 (class 2606 OID 20085)
-- Name: lock_sessions lock_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lock_sessions
    ADD CONSTRAINT lock_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5244 (class 2606 OID 20087)
-- Name: lock_transactions lock_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lock_transactions
    ADD CONSTRAINT lock_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5247 (class 2606 OID 20089)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5251 (class 2606 OID 20091)
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5211 (class 2606 OID 20093)
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- TOC entry 5213 (class 2606 OID 20095)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5255 (class 2606 OID 20097)
-- Name: payment_installment_links payment_installment_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_installment_links
    ADD CONSTRAINT payment_installment_links_pkey PRIMARY KEY (id);


--
-- TOC entry 5262 (class 2606 OID 20099)
-- Name: payments payments_payment_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_payment_number_key UNIQUE (payment_number);


--
-- TOC entry 5264 (class 2606 OID 20101)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- TOC entry 5266 (class 2606 OID 20103)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5268 (class 2606 OID 20105)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- TOC entry 5270 (class 2606 OID 20107)
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5272 (class 2606 OID 20109)
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- TOC entry 5191 (class 1259 OID 20110)
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- TOC entry 5198 (class 1259 OID 20111)
-- Name: idx_auth_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_users_email ON public.auth_users USING btree (email);


--
-- TOC entry 5199 (class 1259 OID 20112)
-- Name: idx_auth_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_users_username ON public.auth_users USING btree (username);


--
-- TOC entry 5202 (class 1259 OID 20113)
-- Name: idx_customer_documents_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_documents_created_by ON public.customer_documents USING btree (created_by);


--
-- TOC entry 5203 (class 1259 OID 20114)
-- Name: idx_customer_documents_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_documents_customer_id ON public.customer_documents USING btree (customer_id);


--
-- TOC entry 5206 (class 1259 OID 20115)
-- Name: idx_customers_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_created_by ON public.customers USING btree (created_by);


--
-- TOC entry 5223 (class 1259 OID 20116)
-- Name: idx_exchange_rates_set_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exchange_rates_set_by ON public.exchange_rates USING btree (set_by);


--
-- TOC entry 5218 (class 1259 OID 20117)
-- Name: idx_expenses_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_category_id ON public.expenses USING btree (category_id);


--
-- TOC entry 5219 (class 1259 OID 20118)
-- Name: idx_expenses_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_created_by ON public.expenses USING btree (created_by);


--
-- TOC entry 5220 (class 1259 OID 20119)
-- Name: idx_expenses_linked_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_linked_order_id ON public.expenses USING btree (linked_order_id);


--
-- TOC entry 5226 (class 1259 OID 20120)
-- Name: idx_installment_entries_modified_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installment_entries_modified_by ON public.installment_entries USING btree (modified_by);


--
-- TOC entry 5227 (class 1259 OID 20121)
-- Name: idx_installment_entries_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installment_entries_order_id ON public.installment_entries USING btree (order_id);


--
-- TOC entry 5228 (class 1259 OID 20122)
-- Name: idx_installment_entries_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installment_entries_schedule_id ON public.installment_entries USING btree (schedule_id);


--
-- TOC entry 5229 (class 1259 OID 20123)
-- Name: idx_installment_entries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installment_entries_status ON public.installment_entries USING btree (status);


--
-- TOC entry 5232 (class 1259 OID 20124)
-- Name: idx_installment_schedules_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installment_schedules_created_by ON public.installment_schedules USING btree (created_by);


--
-- TOC entry 5237 (class 1259 OID 20125)
-- Name: idx_lock_sessions_closed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lock_sessions_closed_by ON public.lock_sessions USING btree (closed_by);


--
-- TOC entry 5238 (class 1259 OID 20126)
-- Name: idx_lock_sessions_opened_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lock_sessions_opened_by ON public.lock_sessions USING btree (opened_by);


--
-- TOC entry 5241 (class 1259 OID 20127)
-- Name: idx_lock_transactions_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lock_transactions_created_by ON public.lock_transactions USING btree (created_by);


--
-- TOC entry 5242 (class 1259 OID 20128)
-- Name: idx_lock_transactions_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lock_transactions_session_id ON public.lock_transactions USING btree (session_id);


--
-- TOC entry 5245 (class 1259 OID 20129)
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- TOC entry 5248 (class 1259 OID 20130)
-- Name: idx_order_status_history_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_status_history_changed_by ON public.order_status_history USING btree (changed_by);


--
-- TOC entry 5249 (class 1259 OID 20131)
-- Name: idx_order_status_history_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history USING btree (order_id);


--
-- TOC entry 5207 (class 1259 OID 20132)
-- Name: idx_orders_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_assigned_to ON public.orders USING btree (assigned_to);


--
-- TOC entry 5208 (class 1259 OID 20133)
-- Name: idx_orders_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_by ON public.orders USING btree (created_by);


--
-- TOC entry 5209 (class 1259 OID 20134)
-- Name: idx_orders_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer_id ON public.orders USING btree (customer_id);


--
-- TOC entry 5256 (class 1259 OID 20135)
-- Name: idx_payments_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_created_by ON public.payments USING btree (created_by);


--
-- TOC entry 5257 (class 1259 OID 20136)
-- Name: idx_payments_installment_entry_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_installment_entry_id ON public.payments USING btree (installment_entry_id);


--
-- TOC entry 5258 (class 1259 OID 20137)
-- Name: idx_payments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);


--
-- TOC entry 5259 (class 1259 OID 20138)
-- Name: idx_payments_order_id_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_order_id_type ON public.payments USING btree (order_id, payment_type);


--
-- TOC entry 5260 (class 1259 OID 20139)
-- Name: idx_payments_reversed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_reversed_by ON public.payments USING btree (reversed_by);


--
-- TOC entry 5252 (class 1259 OID 20140)
-- Name: idx_pil_entry_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pil_entry_id ON public.payment_installment_links USING btree (installment_entry_id);


--
-- TOC entry 5253 (class 1259 OID 20141)
-- Name: idx_pil_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pil_payment_id ON public.payment_installment_links USING btree (payment_id);


--
-- TOC entry 5304 (class 2620 OID 20142)
-- Name: order_items trigger_calculate_order_item_profit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calculate_order_item_profit BEFORE INSERT OR UPDATE OF unit_price_usd, cost_price_usd, quantity ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.calculate_order_item_profit();


--
-- TOC entry 5305 (class 2620 OID 20143)
-- Name: order_items trigger_update_order_profit_totals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_order_profit_totals AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_profit_totals();


--
-- TOC entry 5273 (class 2606 OID 20144)
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5274 (class 2606 OID 20149)
-- Name: customer_documents customer_documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_documents
    ADD CONSTRAINT customer_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5275 (class 2606 OID 20154)
-- Name: customer_documents customer_documents_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_documents
    ADD CONSTRAINT customer_documents_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 5276 (class 2606 OID 20159)
-- Name: customers customers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5283 (class 2606 OID 20164)
-- Name: exchange_rates exchange_rates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5284 (class 2606 OID 20169)
-- Name: exchange_rates exchange_rates_set_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_set_by_fkey FOREIGN KEY (set_by) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5280 (class 2606 OID 20174)
-- Name: expenses expenses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id) NOT VALID;


--
-- TOC entry 5281 (class 2606 OID 20179)
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5282 (class 2606 OID 20184)
-- Name: expenses expenses_linked_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_linked_order_id_fkey FOREIGN KEY (linked_order_id) REFERENCES public.orders(id) NOT VALID;


--
-- TOC entry 5285 (class 2606 OID 20189)
-- Name: installment_entries installment_entries_modified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installment_entries
    ADD CONSTRAINT installment_entries_modified_by_fkey FOREIGN KEY (modified_by) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5286 (class 2606 OID 20194)
-- Name: installment_entries installment_entries_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installment_entries
    ADD CONSTRAINT installment_entries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) NOT VALID;


--
-- TOC entry 5287 (class 2606 OID 20199)
-- Name: installment_entries installment_entries_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installment_entries
    ADD CONSTRAINT installment_entries_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.installment_schedules(id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 5288 (class 2606 OID 20204)
-- Name: installment_schedules installment_schedules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installment_schedules
    ADD CONSTRAINT installment_schedules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5289 (class 2606 OID 20209)
-- Name: installment_schedules installment_schedules_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installment_schedules
    ADD CONSTRAINT installment_schedules_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 5290 (class 2606 OID 20214)
-- Name: lock_sessions lock_sessions_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lock_sessions
    ADD CONSTRAINT lock_sessions_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5291 (class 2606 OID 20219)
-- Name: lock_sessions lock_sessions_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lock_sessions
    ADD CONSTRAINT lock_sessions_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5292 (class 2606 OID 20224)
-- Name: lock_transactions lock_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lock_transactions
    ADD CONSTRAINT lock_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5293 (class 2606 OID 20229)
-- Name: lock_transactions lock_transactions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lock_transactions
    ADD CONSTRAINT lock_transactions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.lock_sessions(id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 5294 (class 2606 OID 20234)
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 5295 (class 2606 OID 20239)
-- Name: order_items order_items_profit_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_profit_updated_by_fkey FOREIGN KEY (profit_updated_by) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5296 (class 2606 OID 20244)
-- Name: order_status_history order_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5297 (class 2606 OID 20249)
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 5277 (class 2606 OID 20254)
-- Name: orders orders_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5278 (class 2606 OID 20259)
-- Name: orders orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5279 (class 2606 OID 20264)
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) NOT VALID;


--
-- TOC entry 5298 (class 2606 OID 20269)
-- Name: payment_installment_links payment_installment_links_installment_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_installment_links
    ADD CONSTRAINT payment_installment_links_installment_entry_id_fkey FOREIGN KEY (installment_entry_id) REFERENCES public.installment_entries(id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 5299 (class 2606 OID 20274)
-- Name: payment_installment_links payment_installment_links_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_installment_links
    ADD CONSTRAINT payment_installment_links_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 5300 (class 2606 OID 20279)
-- Name: payments payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5301 (class 2606 OID 20284)
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) NOT VALID;


--
-- TOC entry 5302 (class 2606 OID 20289)
-- Name: payments payments_reversed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.user_profiles(id) NOT VALID;


--
-- TOC entry 5303 (class 2606 OID 20294)
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE NOT VALID;


--
-- TOC entry 5457 (class 0 OID 19622)
-- Dependencies: 220
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5458 (class 0 OID 19649)
-- Dependencies: 222
-- Name: customer_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5459 (class 0 OID 19671)
-- Dependencies: 223
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5462 (class 0 OID 19791)
-- Dependencies: 228
-- Name: exchange_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5463 (class 0 OID 19807)
-- Dependencies: 229
-- Name: expense_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5461 (class 0 OID 19755)
-- Dependencies: 226
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5464 (class 0 OID 19821)
-- Dependencies: 230
-- Name: installment_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.installment_entries ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5465 (class 0 OID 19844)
-- Dependencies: 231
-- Name: installment_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.installment_schedules ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5466 (class 0 OID 19867)
-- Dependencies: 232
-- Name: lock_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lock_sessions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5467 (class 0 OID 19894)
-- Dependencies: 233
-- Name: lock_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lock_transactions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5468 (class 0 OID 19922)
-- Dependencies: 235
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5469 (class 0 OID 19953)
-- Dependencies: 237
-- Name: order_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5460 (class 0 OID 19702)
-- Dependencies: 224
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5470 (class 0 OID 19968)
-- Dependencies: 238
-- Name: payment_installment_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_installment_links ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5471 (class 0 OID 19979)
-- Dependencies: 240
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5472 (class 0 OID 20012)
-- Dependencies: 241
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5473 (class 0 OID 20034)
-- Dependencies: 243
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Completed on 2026-03-27 22:31:50

--
-- PostgreSQL database dump complete
--


