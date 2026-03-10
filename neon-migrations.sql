-- ============================================
-- NEON DATABASE MIGRATION - Complete Schema
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. AUTH USERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_users_username ON auth_users(username);
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);

-- ============================================
-- 2. USER PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  full_name_en text NOT NULL,
  full_name_ku text NOT NULL,
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('administrator', 'manager', 'employee')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- ============================================
-- 3. EXCHANGE RATES
-- ============================================

CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text NOT NULL,
  rate numeric(10, 4) NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth_users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(currency_code, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates(currency_code);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(effective_date);

-- ============================================
-- 4. CUSTOMERS
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name_en text NOT NULL,
  full_name_ku text NOT NULL,
  phone text NOT NULL,
  address_en text DEFAULT '',
  address_ku text DEFAULT '',
  national_id text,
  notes text DEFAULT '',
  created_by uuid REFERENCES auth_users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_national_id ON customers(national_id);

-- ============================================
-- 5. CUSTOMER DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS customer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('id_front', 'id_back', 'passport', 'other')),
  file_path text NOT NULL,
  uploaded_by uuid REFERENCES auth_users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_documents_customer ON customer_documents(customer_id);

-- ============================================
-- 6. ORDERS
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id),
  total_amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'IQD',
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'installment')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes text DEFAULT '',
  created_by uuid REFERENCES auth_users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

-- ============================================
-- 7. ORDER ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_name_en text NOT NULL,
  item_name_ku text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12, 2) NOT NULL,
  total_price numeric(12, 2) NOT NULL,
  cost_price numeric(12, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ============================================
-- 8. PAYMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'IQD',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'cash',
  notes text DEFAULT '',
  created_by uuid REFERENCES auth_users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- ============================================
-- 9. INSTALLMENT SCHEDULES
-- ============================================

CREATE TABLE IF NOT EXISTS installment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  total_amount numeric(12, 2) NOT NULL,
  down_payment numeric(12, 2) NOT NULL DEFAULT 0,
  remaining_amount numeric(12, 2) NOT NULL,
  installment_amount numeric(12, 2) NOT NULL,
  number_of_installments integer NOT NULL,
  months integer,
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  start_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  discount_percentage numeric(5, 2) DEFAULT 0,
  discount_amount numeric(12, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_installment_schedules_order ON installment_schedules(order_id);
CREATE INDEX IF NOT EXISTS idx_installment_schedules_status ON installment_schedules(status);

-- ============================================
-- 10. INSTALLMENT ENTRIES
-- ============================================

CREATE TABLE IF NOT EXISTS installment_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES installment_schedules(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount numeric(12, 2) NOT NULL,
  paid_amount numeric(12, 2) DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_installment_entries_schedule ON installment_entries(schedule_id);
CREATE INDEX IF NOT EXISTS idx_installment_entries_status ON installment_entries(status);
CREATE INDEX IF NOT EXISTS idx_installment_entries_due_date ON installment_entries(due_date);

-- ============================================
-- 11. EXPENSES
-- ============================================

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description_en text NOT NULL,
  description_ku text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'IQD',
  category text NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_by uuid REFERENCES auth_users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- ============================================
-- 12. LOCK SESSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS lock_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  opened_by uuid REFERENCES auth_users(id),
  closed_by uuid REFERENCES auth_users(id),
  opening_balance numeric(12, 2) NOT NULL DEFAULT 0,
  closing_balance numeric(12, 2),
  total_sales numeric(12, 2) DEFAULT 0,
  total_expenses numeric(12, 2) DEFAULT 0,
  total_payments numeric(12, 2) DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  notes text DEFAULT '',
  UNIQUE(session_date)
);

CREATE INDEX IF NOT EXISTS idx_lock_sessions_date ON lock_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_lock_sessions_status ON lock_sessions(status);

-- ============================================
-- 13. LOCK TRANSACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS lock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES lock_sessions(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('sale', 'expense', 'payment')),
  reference_id uuid,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'IQD',
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lock_transactions_session ON lock_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_lock_transactions_type ON lock_transactions(transaction_type);

-- ============================================
-- 14. AUDIT LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth_users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- 15. SEED DEFAULT ADMIN USER
-- ============================================

DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM auth_users WHERE username = 'admin') INTO v_exists;

  IF NOT v_exists THEN
    INSERT INTO auth_users (id, username, email, password_hash, created_at)
    VALUES (
      v_user_id,
      'admin',
      'admin@alvichome.com',
      crypt('admin123', gen_salt('bf')),
      now()
    );

    INSERT INTO user_profiles (
      id,
      user_id,
      full_name_en,
      full_name_ku,
      role,
      is_active
    ) VALUES (
      v_user_id,
      v_user_id,
      'System Administrator',
      'بەڕێوەبەری سیستەم',
      'administrator',
      true
    );
  END IF;
END $$;

-- ============================================
-- COMPLETE
-- ============================================
