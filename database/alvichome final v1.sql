--
-- PostgreSQL database dump
--

\restrict vT1yAzn2Bkson5d8HlFzfdcce5TtklmhrBtMlweDX3qO85WnmGyJP6b6KfdYUcn

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-03-17 23:41:32 +03

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

--
-- TOC entry 2 (class 3079 OID 19670)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 4313 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 288 (class 1255 OID 20348)
-- Name: calculate_order_item_profit(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.calculate_order_item_profit() OWNER TO postgres;

--
-- TOC entry 282 (class 1255 OID 19857)
-- Name: generate_order_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_order_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN 'AH-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('order_number_seq')::text, 4, '0');
END;
$$;


ALTER FUNCTION public.generate_order_number() OWNER TO postgres;

--
-- TOC entry 287 (class 1255 OID 19858)
-- Name: generate_payment_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_payment_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN 'PAY-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('payment_number_seq')::text, 4, '0');
END;
$$;


ALTER FUNCTION public.generate_payment_number() OWNER TO postgres;

--
-- TOC entry 295 (class 1255 OID 20350)
-- Name: update_order_profit_totals(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.update_order_profit_totals() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 225 (class 1259 OID 19832)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 19708)
-- Name: auth_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.auth_users OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 20262)
-- Name: customer_documents; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.customer_documents OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 19794)
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.customers OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 19859)
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT orders_discount_percent_check CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (5)::numeric))),
    CONSTRAINT orders_sale_type_check CHECK ((sale_type = ANY (ARRAY['cash'::text, 'installment'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'deposit_paid'::text, 'in_production'::text, 'ready'::text, 'installed'::text, 'finished'::text])))
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 20367)
-- Name: customer_profit_summary; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.customer_profit_summary OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 20138)
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.expenses OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 20352)
-- Name: daily_profit_report; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.daily_profit_report OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 19771)
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.exchange_rates OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 20122)
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.expense_categories OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 20082)
-- Name: installment_entries; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.installment_entries OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 20045)
-- Name: installment_schedules; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.installment_schedules OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 20188)
-- Name: lock_sessions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.lock_sessions OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 20227)
-- Name: lock_transactions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.lock_transactions OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 20357)
-- Name: monthly_profit_report; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.monthly_profit_report OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 19926)
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.order_items OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 19855)
-- Name: order_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_number_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_number_seq OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 19968)
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.order_status_history OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 20324)
-- Name: payment_installment_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_installment_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    installment_entry_id uuid NOT NULL,
    allocated_amount_usd numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.payment_installment_links OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 19856)
-- Name: payment_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_number_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_number_seq OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 19995)
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT payments_currency_check CHECK ((currency = ANY (ARRAY['USD'::text, 'IQD'::text]))),
    CONSTRAINT payments_payment_type_check CHECK ((payment_type = ANY (ARRAY['deposit'::text, 'installment'::text, 'final'::text, 'partial'::text, 'reversal'::text])))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 19755)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 20378)
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    key character varying(100) NOT NULL,
    value text NOT NULL,
    label_en character varying(200),
    label_ku character varying(200),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 19727)
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 20362)
-- Name: yearly_profit_report; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.yearly_profit_report OWNER TO postgres;

--
-- TOC entry 4292 (class 0 OID 19832)
-- Dependencies: 225
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, user_name_en, user_name_ku, action, module, record_id, old_values, new_values, details, created_at) FROM stdin;
\.


--
-- TOC entry 4287 (class 0 OID 19708)
-- Dependencies: 220
-- Data for Name: auth_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_users (id, username, email, password_hash, created_at) FROM stdin;
b74ec180-384a-4c03-babe-630321a35e3f	admin	admin@alvichome.com	$2a$06$ik4zCAR7Ju7L8Oq8O.wj9OCs87YwFZWHyURqv1lTs9/vg3n4pdCV6	2026-03-11 00:48:13.684744+03
\.


--
-- TOC entry 4305 (class 0 OID 20262)
-- Dependencies: 238
-- Data for Name: customer_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_documents (id, customer_id, document_type, label_en, label_ku, file_name, file_path, file_size, mime_type, created_by, created_at) FROM stdin;
2753ef83-99d0-4f68-88b2-919e26c1a4f0	c92bc3fd-7fed-4209-8239-0bbfc2b774f2	national_id	199921381107	199921381107	IMG_7888.jpg	c92bc3fd-7fed-4209-8239-0bbfc2b774f2/1773661966367-56okaug88g5.jpg	1037595	image/jpeg	b74ec180-384a-4c03-babe-630321a35e3f	2026-03-16 14:52:46.38655+03
9c78e564-c496-4a8c-818d-3db04ce673fe	ced4e350-1caf-4bdd-b386-88a90f4b075a	national_id	199921381107	کارتی زانیاری 	IMG_7888.jpg	ced4e350-1caf-4bdd-b386-88a90f4b075a/1773663531812-4fotuoga5wq.jpg	1037595	image/jpeg	b74ec180-384a-4c03-babe-630321a35e3f	2026-03-16 15:18:51.822237+03
236d203b-bdae-424f-85a8-7cf615f30a18	ced4e350-1caf-4bdd-b386-88a90f4b075a	passport	passport 	پاسپۆرت	IMG_7889.jpg	ced4e350-1caf-4bdd-b386-88a90f4b075a/1773663531830-lz6t187aict.jpg	843303	image/jpeg	b74ec180-384a-4c03-babe-630321a35e3f	2026-03-16 15:18:51.838528+03
940c034c-6ddc-445f-8d39-4080152228c1	8d8e9435-4f2d-4dc1-834a-3f51a4944659	national_id	199921381107	199921381107	IMG_7888.jpg	8d8e9435-4f2d-4dc1-834a-3f51a4944659/1773753829800-fi8ffb4r50c.jpg	1037595	image/jpeg	b74ec180-384a-4c03-babe-630321a35e3f	2026-03-17 16:23:49.816028+03
870e53e4-80d8-4a8e-a3d9-7c6e9f40c259	dbfe199d-b5c8-4dbc-9926-c354dd6606e7	national_id	199921381107	199921381107	IMG_7889.jpg	dbfe199d-b5c8-4dbc-9926-c354dd6606e7/1773777588364-17d23u4znxg.jpg	843303	image/jpeg	b74ec180-384a-4c03-babe-630321a35e3f	2026-03-17 22:59:48.385925+03
3ea82896-1226-4ddb-9567-88db1ef77147	1a37a561-180d-439e-add1-51453a1316bb	national_id	199921381107	کارتی ناسنامه	IMG_7889.jpg	1a37a561-180d-439e-add1-51453a1316bb/1773777621152-ta0jtzbv6s.jpg	843303	image/jpeg	b74ec180-384a-4c03-babe-630321a35e3f	2026-03-17 23:00:21.167594+03
\.


--
-- TOC entry 4291 (class 0 OID 19794)
-- Dependencies: 224
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (id, full_name_en, full_name_ku, address_en, address_ku, phone, phone_secondary, national_id_number, national_id_image_url, guarantor_name_en, guarantor_name_ku, guarantor_workplace_en, guarantor_workplace_ku, guarantor_phone, salary_deduction_consent, notes_en, notes_ku, is_active, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4290 (class 0 OID 19771)
-- Dependencies: 223
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exchange_rates (id, rate_cash, rate_installment, effective_date, set_by, notes_en, notes_ku, created_at, created_by) FROM stdin;
\.


--
-- TOC entry 4301 (class 0 OID 20122)
-- Dependencies: 234
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_categories (id, name_en, name_ku, description_en, description_ku, is_active, sort_order, created_at) FROM stdin;
12fa8025-22c3-4d27-8a32-8dc085de568b	Utilities - Water	خزمەتگوزاری - ئاو			t	1	2026-03-16 14:47:12.054944+03
c2247e9d-2cde-4e47-bcc4-e3fe555a8265	Utilities - Electricity	خزمەتگوزاری - کارەبا			t	2	2026-03-16 14:47:12.054944+03
5291eeb0-e660-4ea0-9a18-6ddb2ddbe900	Office Supplies	پێداویستیەکانی ئۆفیس			t	3	2026-03-16 14:47:12.054944+03
c1aab36b-c5b9-4ee5-9ab0-fab12acfd114	Rent	کرێ			t	4	2026-03-16 14:47:12.054944+03
a5817c2e-31b2-4739-a0ce-ef4c1255c191	Factory Materials	کەرەستەی فابریکە			t	5	2026-03-16 14:47:12.054944+03
1bf456b3-007f-40e8-bb6c-926db75e3760	Employee Salaries	مووچەی کارمەندان			t	6	2026-03-16 14:47:12.054944+03
ad69794b-2ffa-44e0-887f-6916a0af91de	Transportation	گواستنەوە			t	7	2026-03-16 14:47:12.054944+03
69c3ca09-f869-416a-9fdb-109bd141338f	Maintenance & Repair	چاکسازی و گرتنەوە			t	8	2026-03-16 14:47:12.054944+03
b66e9843-911d-4801-8a9e-5439bb4ae3eb	Marketing	بازارگەری			t	9	2026-03-16 14:47:12.054944+03
e3d8f4bc-23fa-44cf-86b0-68b2f762a4ea	Other	جووتری			t	10	2026-03-16 14:47:12.054944+03
\.


--
-- TOC entry 4302 (class 0 OID 20138)
-- Dependencies: 235
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, expense_number, category_id, category_name_en, category_name_ku, description_en, description_ku, currency, amount_in_currency, exchange_rate_used, amount_usd, expense_date, linked_order_id, receipt_url, notes_en, notes_ku, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4300 (class 0 OID 20082)
-- Dependencies: 233
-- Data for Name: installment_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.installment_entries (id, schedule_id, order_id, installment_number, due_date, amount_usd, paid_amount_usd, status, is_modified, modification_reason_en, modification_reason_ku, modified_by, modified_at, original_amount_usd, original_due_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4299 (class 0 OID 20045)
-- Dependencies: 232
-- Data for Name: installment_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.installment_schedules (id, order_id, total_amount_usd, deposit_usd, remaining_usd, months, monthly_amount_usd, start_date, original_snapshot, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4303 (class 0 OID 20188)
-- Dependencies: 236
-- Data for Name: lock_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lock_sessions (id, session_date, opened_at, closed_at, opened_by, closed_by, opening_balance_usd, closing_balance_usd, total_income_usd, total_expenses_usd, net_usd, payment_income_usd, expense_outflow_usd, installment_income_usd, status, notes_en, notes_ku, created_at) FROM stdin;
\.


--
-- TOC entry 4304 (class 0 OID 20227)
-- Dependencies: 237
-- Data for Name: lock_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lock_transactions (id, session_id, transaction_type, reference_type, reference_id, reference_number, description_en, description_ku, currency, amount_in_currency, exchange_rate_used, amount_usd, created_by, created_at) FROM stdin;
\.


--
-- TOC entry 4296 (class 0 OID 19926)
-- Dependencies: 229
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_type, product_type_name_en, product_type_name_ku, item_name_en, item_name_ku, quantity, unit_price_usd, total_price_usd, cost_price_usd, profit_per_unit_usd, total_profit_usd, profit_updated_by, profit_updated_at, config, notes_en, notes_ku, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4297 (class 0 OID 19968)
-- Dependencies: 230
-- Data for Name: order_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_status_history (id, order_id, from_status, to_status, changed_by, changed_by_name_en, changed_by_name_ku, reason_en, reason_ku, created_at) FROM stdin;
\.


--
-- TOC entry 4295 (class 0 OID 19859)
-- Dependencies: 228
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, order_number, customer_id, sale_type, status, total_amount_usd, discount_percent, discount_amount_usd, final_total_usd, deposit_required_usd, deposit_paid_usd, total_paid_usd, balance_due_usd, installment_months, installment_mode, installment_monthly_amount, installment_discount_percent, installment_discount_amount_usd, total_cost_usd, total_profit_usd, start_date, end_date, notes_en, notes_ku, project_design_url, created_by, assigned_to, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4306 (class 0 OID 20324)
-- Dependencies: 239
-- Data for Name: payment_installment_links; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_installment_links (id, payment_id, installment_entry_id, allocated_amount_usd, created_at) FROM stdin;
\.


--
-- TOC entry 4298 (class 0 OID 19995)
-- Dependencies: 231
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, order_id, payment_number, payment_type, currency, amount_in_currency, exchange_rate_used, amount_usd, payment_date, installment_entry_id, is_reversed, reversed_by, reversal_reference_id, discount_percent, discount_amount_usd, notes_en, notes_ku, created_by, created_at) FROM stdin;
\.


--
-- TOC entry 4289 (class 0 OID 19755)
-- Dependencies: 222
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name_en, name_ku, is_system, permissions, created_at, updated_at) FROM stdin;
6db28546-0796-4076-b357-dc4ce785c844	Administrator	بەڕێوەبەری گشتی	t	{"lock": {"read": true, "create": true, "delete": true, "update": true}, "roles": {"read": true, "create": true, "delete": true, "update": true}, "users": {"read": true, "create": true, "delete": true, "update": true}, "orders": {"read": true, "create": true, "delete": true, "update": true, "change_status": true}, "reports": {"read": true}, "expenses": {"read": true, "create": true, "delete": true, "update": true}, "payments": {"read": true, "create": true, "delete": true, "update": true, "reverse": true}, "customers": {"read": true, "create": true, "delete": true, "update": true}, "audit_logs": {"read": true}, "installments": {"read": true, "create": true, "delete": true, "update": true}, "exchange_rates": {"read": true, "create": true, "update": true}}	2026-03-11 00:48:13.684744+03	2026-03-11 00:48:13.684744+03
7b7655e9-40c3-49f9-aa93-9bb35c7b6388	Admin	بەڕێوەبەر	t	{"lock": {"read": true, "create": true, "delete": false, "update": false}, "users": {"read": false, "create": false, "delete": false, "update": false}, "orders": {"read": true, "create": true, "delete": true, "update": true, "change_status": true}, "reports": {"read": false}, "expenses": {"read": true, "create": true, "delete": false, "update": true}, "payments": {"read": true, "create": true, "delete": false, "update": false}, "customers": {"read": true, "create": true, "delete": false, "update": true}, "installments": {"read": true, "create": false, "delete": false, "update": false}, "exchange_rates": {"read": true}}	2026-03-11 00:48:13.684744+03	2026-03-11 00:48:13.684744+03
2a36e9dd-21ca-47b1-9e23-cd426d6d4d1a	Employee	کارمەند	t	{"lock": {"read": true}, "users": {"read": false, "create": false, "delete": false, "update": false}, "orders": {"read": true, "create": true, "delete": true, "update": true, "change_status": false}, "reports": {"read": false}, "expenses": {"read": false, "create": false, "delete": false, "update": false}, "payments": {"read": true, "create": true, "delete": false, "update": false}, "customers": {"read": true, "create": true, "delete": false, "update": true}, "installments": {"read": true, "create": false, "delete": false, "update": false}, "exchange_rates": {"read": true}}	2026-03-11 00:48:13.684744+03	2026-03-11 00:48:13.684744+03
\.


--
-- TOC entry 4307 (class 0 OID 20378)
-- Dependencies: 244
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (key, value, label_en, label_ku, updated_at) FROM stdin;
deposit_rate_cash	0.60	Cash Deposit Rate	ڕێژەی بیانە نەقد	2026-03-16 16:56:47.96+03
deposit_rate_installment	0.50	Installment Deposit Rate	ڕێژەی بیانە بەش	2026-03-16 16:56:47.982+03
\.


--
-- TOC entry 4288 (class 0 OID 19727)
-- Dependencies: 221
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_profiles (id, user_id, full_name_en, full_name_ku, role, custom_role_id, is_active, phone, created_at, updated_at) FROM stdin;
b74ec180-384a-4c03-babe-630321a35e3f	b74ec180-384a-4c03-babe-630321a35e3f	System Administrator	بەڕێوەبەری سیستەم	administrator	\N	t		2026-03-11 00:48:13.684744+03	2026-03-11 00:48:13.684744+03
\.


--
-- TOC entry 4314 (class 0 OID 0)
-- Dependencies: 226
-- Name: order_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_number_seq', 1000, false);


--
-- TOC entry 4315 (class 0 OID 0)
-- Dependencies: 227
-- Name: payment_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_number_seq', 1000, false);


--
-- TOC entry 4023 (class 2606 OID 19849)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4003 (class 2606 OID 19724)
-- Name: auth_users auth_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_email_key UNIQUE (email);


--
-- TOC entry 4005 (class 2606 OID 19720)
-- Name: auth_users auth_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_pkey PRIMARY KEY (id);


--
-- TOC entry 4007 (class 2606 OID 19722)
-- Name: auth_users auth_users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_username_key UNIQUE (username);


--
-- TOC entry 4077 (class 2606 OID 20285)
-- Name: customer_documents customer_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_documents
    ADD CONSTRAINT customer_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 4020 (class 2606 OID 19826)
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- TOC entry 4017 (class 2606 OID 19788)
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- TOC entry 4060 (class 2606 OID 20137)
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4062 (class 2606 OID 20172)
-- Name: expenses expenses_expense_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_expense_number_key UNIQUE (expense_number);


--
-- TOC entry 4064 (class 2606 OID 20170)
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- TOC entry 4058 (class 2606 OID 20106)
-- Name: installment_entries installment_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installment_entries
    ADD CONSTRAINT installment_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 4050 (class 2606 OID 20071)
-- Name: installment_schedules installment_schedules_order_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installment_schedules
    ADD CONSTRAINT installment_schedules_order_id_key UNIQUE (order_id);


--
-- TOC entry 4052 (class 2606 OID 20069)
-- Name: installment_schedules installment_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installment_schedules
    ADD CONSTRAINT installment_schedules_pkey PRIMARY KEY (id);


--
-- TOC entry 4071 (class 2606 OID 20216)
-- Name: lock_sessions lock_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lock_sessions
    ADD CONSTRAINT lock_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4075 (class 2606 OID 20251)
-- Name: lock_transactions lock_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lock_transactions
    ADD CONSTRAINT lock_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 4034 (class 2606 OID 19957)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4038 (class 2606 OID 19984)
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4029 (class 2606 OID 19910)
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- TOC entry 4031 (class 2606 OID 19908)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 4083 (class 2606 OID 20335)
-- Name: payment_installment_links payment_installment_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_installment_links
    ADD CONSTRAINT payment_installment_links_pkey PRIMARY KEY (id);


--
-- TOC entry 4045 (class 2606 OID 20029)
-- Name: payments payments_payment_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_payment_number_key UNIQUE (payment_number);


--
-- TOC entry 4047 (class 2606 OID 20027)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- TOC entry 4015 (class 2606 OID 19770)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4085 (class 2606 OID 20387)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- TOC entry 4011 (class 2606 OID 19747)
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 4013 (class 2606 OID 19749)
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- TOC entry 4024 (class 1259 OID 20296)
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- TOC entry 4008 (class 1259 OID 19726)
-- Name: idx_auth_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auth_users_email ON public.auth_users USING btree (email);


--
-- TOC entry 4009 (class 1259 OID 19725)
-- Name: idx_auth_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auth_users_username ON public.auth_users USING btree (username);


--
-- TOC entry 4078 (class 1259 OID 20298)
-- Name: idx_customer_documents_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_documents_created_by ON public.customer_documents USING btree (created_by);


--
-- TOC entry 4079 (class 1259 OID 20297)
-- Name: idx_customer_documents_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_documents_customer_id ON public.customer_documents USING btree (customer_id);


--
-- TOC entry 4021 (class 1259 OID 20299)
-- Name: idx_customers_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customers_created_by ON public.customers USING btree (created_by);


--
-- TOC entry 4018 (class 1259 OID 20300)
-- Name: idx_exchange_rates_set_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exchange_rates_set_by ON public.exchange_rates USING btree (set_by);


--
-- TOC entry 4065 (class 1259 OID 20301)
-- Name: idx_expenses_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_category_id ON public.expenses USING btree (category_id);


--
-- TOC entry 4066 (class 1259 OID 20302)
-- Name: idx_expenses_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_created_by ON public.expenses USING btree (created_by);


--
-- TOC entry 4067 (class 1259 OID 20303)
-- Name: idx_expenses_linked_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_linked_order_id ON public.expenses USING btree (linked_order_id);


--
-- TOC entry 4053 (class 1259 OID 20306)
-- Name: idx_installment_entries_modified_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_installment_entries_modified_by ON public.installment_entries USING btree (modified_by);


--
-- TOC entry 4054 (class 1259 OID 20305)
-- Name: idx_installment_entries_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_installment_entries_order_id ON public.installment_entries USING btree (order_id);


--
-- TOC entry 4055 (class 1259 OID 20304)
-- Name: idx_installment_entries_schedule_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_installment_entries_schedule_id ON public.installment_entries USING btree (schedule_id);


--
-- TOC entry 4056 (class 1259 OID 20307)
-- Name: idx_installment_entries_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_installment_entries_status ON public.installment_entries USING btree (status);


--
-- TOC entry 4048 (class 1259 OID 20308)
-- Name: idx_installment_schedules_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_installment_schedules_created_by ON public.installment_schedules USING btree (created_by);


--
-- TOC entry 4068 (class 1259 OID 20310)
-- Name: idx_lock_sessions_closed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lock_sessions_closed_by ON public.lock_sessions USING btree (closed_by);


--
-- TOC entry 4069 (class 1259 OID 20309)
-- Name: idx_lock_sessions_opened_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lock_sessions_opened_by ON public.lock_sessions USING btree (opened_by);


--
-- TOC entry 4072 (class 1259 OID 20312)
-- Name: idx_lock_transactions_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lock_transactions_created_by ON public.lock_transactions USING btree (created_by);


--
-- TOC entry 4073 (class 1259 OID 20311)
-- Name: idx_lock_transactions_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lock_transactions_session_id ON public.lock_transactions USING btree (session_id);


--
-- TOC entry 4032 (class 1259 OID 20313)
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- TOC entry 4035 (class 1259 OID 20315)
-- Name: idx_order_status_history_changed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_status_history_changed_by ON public.order_status_history USING btree (changed_by);


--
-- TOC entry 4036 (class 1259 OID 20314)
-- Name: idx_order_status_history_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history USING btree (order_id);


--
-- TOC entry 4025 (class 1259 OID 20318)
-- Name: idx_orders_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_assigned_to ON public.orders USING btree (assigned_to);


--
-- TOC entry 4026 (class 1259 OID 20317)
-- Name: idx_orders_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_created_by ON public.orders USING btree (created_by);


--
-- TOC entry 4027 (class 1259 OID 20316)
-- Name: idx_orders_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_customer_id ON public.orders USING btree (customer_id);


--
-- TOC entry 4039 (class 1259 OID 20320)
-- Name: idx_payments_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_created_by ON public.payments USING btree (created_by);


--
-- TOC entry 4040 (class 1259 OID 20322)
-- Name: idx_payments_installment_entry_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_installment_entry_id ON public.payments USING btree (installment_entry_id);


--
-- TOC entry 4041 (class 1259 OID 20319)
-- Name: idx_payments_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);


--
-- TOC entry 4042 (class 1259 OID 20323)
-- Name: idx_payments_order_id_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_order_id_type ON public.payments USING btree (order_id, payment_type);


--
-- TOC entry 4043 (class 1259 OID 20321)
-- Name: idx_payments_reversed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_reversed_by ON public.payments USING btree (reversed_by);


--
-- TOC entry 4080 (class 1259 OID 20347)
-- Name: idx_pil_entry_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pil_entry_id ON public.payment_installment_links USING btree (installment_entry_id);


--
-- TOC entry 4081 (class 1259 OID 20346)
-- Name: idx_pil_payment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pil_payment_id ON public.payment_installment_links USING btree (payment_id);


--
-- TOC entry 4117 (class 2620 OID 20349)
-- Name: order_items trigger_calculate_order_item_profit; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_calculate_order_item_profit BEFORE INSERT OR UPDATE OF unit_price_usd, cost_price_usd, quantity ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.calculate_order_item_profit();


--
-- TOC entry 4118 (class 2620 OID 20351)
-- Name: order_items trigger_update_order_profit_totals; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_order_profit_totals AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_profit_totals();


--
-- TOC entry 4090 (class 2606 OID 19850)
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id);


--
-- TOC entry 4113 (class 2606 OID 20291)
-- Name: customer_documents customer_documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_documents
    ADD CONSTRAINT customer_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);


--
-- TOC entry 4114 (class 2606 OID 20286)
-- Name: customer_documents customer_documents_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_documents
    ADD CONSTRAINT customer_documents_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- TOC entry 4089 (class 2606 OID 19827)
-- Name: customers customers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);


--
-- TOC entry 4087 (class 2606 OID 20373)
-- Name: exchange_rates exchange_rates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);


--
-- TOC entry 4088 (class 2606 OID 19789)
-- Name: exchange_rates exchange_rates_set_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_set_by_fkey FOREIGN KEY (set_by) REFERENCES public.user_profiles(id);


--
-- TOC entry 4106 (class 2606 OID 20173)
-- Name: expenses expenses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id);


--
-- TOC entry 4107 (class 2606 OID 20183)
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);


--
-- TOC entry 4108 (class 2606 OID 20178)
-- Name: expenses expenses_linked_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_linked_order_id_fkey FOREIGN KEY (linked_order_id) REFERENCES public.orders(id);


--
-- TOC entry 4103 (class 2606 OID 20117)
-- Name: installment_entries installment_entries_modified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installment_entries
    ADD CONSTRAINT installment_entries_modified_by_fkey FOREIGN KEY (modified_by) REFERENCES public.user_profiles(id);


--
-- TOC entry 4104 (class 2606 OID 20112)
-- Name: installment_entries installment_entries_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installment_entries
    ADD CONSTRAINT installment_entries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- TOC entry 4105 (class 2606 OID 20107)
-- Name: installment_entries installment_entries_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installment_entries
    ADD CONSTRAINT installment_entries_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.installment_schedules(id) ON DELETE CASCADE;


--
-- TOC entry 4101 (class 2606 OID 20077)
-- Name: installment_schedules installment_schedules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installment_schedules
    ADD CONSTRAINT installment_schedules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);


--
-- TOC entry 4102 (class 2606 OID 20072)
-- Name: installment_schedules installment_schedules_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installment_schedules
    ADD CONSTRAINT installment_schedules_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4109 (class 2606 OID 20222)
-- Name: lock_sessions lock_sessions_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lock_sessions
    ADD CONSTRAINT lock_sessions_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.user_profiles(id);


--
-- TOC entry 4110 (class 2606 OID 20217)
-- Name: lock_sessions lock_sessions_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lock_sessions
    ADD CONSTRAINT lock_sessions_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.user_profiles(id);


--
-- TOC entry 4111 (class 2606 OID 20257)
-- Name: lock_transactions lock_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lock_transactions
    ADD CONSTRAINT lock_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);


--
-- TOC entry 4112 (class 2606 OID 20252)
-- Name: lock_transactions lock_transactions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lock_transactions
    ADD CONSTRAINT lock_transactions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.lock_sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4094 (class 2606 OID 19958)
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4095 (class 2606 OID 19963)
-- Name: order_items order_items_profit_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_profit_updated_by_fkey FOREIGN KEY (profit_updated_by) REFERENCES public.user_profiles(id);


--
-- TOC entry 4096 (class 2606 OID 19990)
-- Name: order_status_history order_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.user_profiles(id);


--
-- TOC entry 4097 (class 2606 OID 19985)
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 4091 (class 2606 OID 19921)
-- Name: orders orders_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id);


--
-- TOC entry 4092 (class 2606 OID 19916)
-- Name: orders orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);


--
-- TOC entry 4093 (class 2606 OID 19911)
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- TOC entry 4115 (class 2606 OID 20341)
-- Name: payment_installment_links payment_installment_links_installment_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_installment_links
    ADD CONSTRAINT payment_installment_links_installment_entry_id_fkey FOREIGN KEY (installment_entry_id) REFERENCES public.installment_entries(id) ON DELETE CASCADE;


--
-- TOC entry 4116 (class 2606 OID 20336)
-- Name: payment_installment_links payment_installment_links_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_installment_links
    ADD CONSTRAINT payment_installment_links_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;


--
-- TOC entry 4098 (class 2606 OID 20040)
-- Name: payments payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);


--
-- TOC entry 4099 (class 2606 OID 20030)
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- TOC entry 4100 (class 2606 OID 20035)
-- Name: payments payments_reversed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.user_profiles(id);


--
-- TOC entry 4086 (class 2606 OID 19750)
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- TOC entry 4274 (class 0 OID 19832)
-- Dependencies: 225
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4285 (class 0 OID 20262)
-- Dependencies: 238
-- Name: customer_documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4273 (class 0 OID 19794)
-- Dependencies: 224
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4272 (class 0 OID 19771)
-- Dependencies: 223
-- Name: exchange_rates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4281 (class 0 OID 20122)
-- Dependencies: 234
-- Name: expense_categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4282 (class 0 OID 20138)
-- Dependencies: 235
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4280 (class 0 OID 20082)
-- Dependencies: 233
-- Name: installment_entries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.installment_entries ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4279 (class 0 OID 20045)
-- Dependencies: 232
-- Name: installment_schedules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.installment_schedules ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4283 (class 0 OID 20188)
-- Dependencies: 236
-- Name: lock_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lock_sessions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4284 (class 0 OID 20227)
-- Dependencies: 237
-- Name: lock_transactions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lock_transactions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4276 (class 0 OID 19926)
-- Dependencies: 229
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4277 (class 0 OID 19968)
-- Dependencies: 230
-- Name: order_status_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4275 (class 0 OID 19859)
-- Dependencies: 228
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4286 (class 0 OID 20324)
-- Dependencies: 239
-- Name: payment_installment_links; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payment_installment_links ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4278 (class 0 OID 19995)
-- Dependencies: 231
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4271 (class 0 OID 19755)
-- Dependencies: 222
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4270 (class 0 OID 19727)
-- Dependencies: 221
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Completed on 2026-03-17 23:41:32 +03

--
-- PostgreSQL database dump complete
--

\unrestrict vT1yAzn2Bkson5d8HlFzfdcce5TtklmhrBtMlweDX3qO85WnmGyJP6b6KfdYUcn

