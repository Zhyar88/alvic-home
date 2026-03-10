-- Complete PostgreSQL Database Schema for Cash Register System
-- Run this file on your PostgreSQL database to set up the entire schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 1. USER PROFILES AND ROLES
-- ==============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier', 'manager', 'accountant')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ==============================================
-- 2. EXCHANGE RATES
-- ==============================================

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency_code TEXT NOT NULL CHECK (currency_code IN ('USD', 'EUR', 'TRY', 'GBP')),
  rate_to_iqd NUMERIC(12, 4) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates(currency_code);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(effective_date);

-- ==============================================
-- 3. CUSTOMERS
-- ==============================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  phone TEXT,
  address_ar TEXT,
  address_en TEXT,
  id_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_id_number ON customers(id_number);

CREATE TABLE IF NOT EXISTS customer_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('id_card', 'passport', 'residence_permit', 'other')),
  document_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_docs_customer_id ON customer_documents(customer_id);

-- ==============================================
-- 4. ORDERS
-- ==============================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_number TEXT UNIQUE NOT NULL,
  product_description_ar TEXT NOT NULL,
  product_description_en TEXT,
  total_amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IQD' CHECK (currency IN ('IQD', 'USD', 'EUR', 'TRY', 'GBP')),
  amount_paid NUMERIC(12, 2) DEFAULT 0,
  remaining_balance NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'installment', 'mixed')),
  cost_price NUMERIC(12, 2) DEFAULT 0,
  profit_amount NUMERIC(12, 2) DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- ==============================================
-- 5. PAYMENTS
-- ==============================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IQD' CHECK (currency IN ('IQD', 'USD', 'EUR', 'TRY', 'GBP')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'card')),
  receipt_number TEXT,
  notes TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- ==============================================
-- 6. INSTALLMENTS
-- ==============================================

CREATE TABLE IF NOT EXISTS installment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  total_amount NUMERIC(12, 2) NOT NULL,
  number_of_months INTEGER NOT NULL CHECK (number_of_months > 0 AND number_of_months <= 60),
  monthly_amount NUMERIC(12, 2) NOT NULL,
  discount_percentage NUMERIC(5, 2) DEFAULT 0,
  discount_amount NUMERIC(12, 2) DEFAULT 0,
  start_date DATE NOT NULL,
  mode TEXT NOT NULL DEFAULT 'equal' CHECK (mode IN ('equal', 'custom')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_installment_schedules_order_id ON installment_schedules(order_id);

CREATE TABLE IF NOT EXISTS installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES installment_schedules(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  amount_paid NUMERIC(12, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
  paid_date TIMESTAMP WITH TIME ZONE,
  payment_id UUID REFERENCES payments(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_installments_schedule_id ON installments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_installments_order_id ON installments(order_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);

-- ==============================================
-- 7. EXPENSES
-- ==============================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  description_en TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IQD' CHECK (currency IN ('IQD', 'USD', 'EUR', 'TRY', 'GBP')),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- ==============================================
-- 8. LOCK SESSIONS (Cash Register Sessions)
-- ==============================================

CREATE TABLE IF NOT EXISTS lock_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_number TEXT UNIQUE NOT NULL,
  opened_by UUID NOT NULL REFERENCES users(id),
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP WITH TIME ZONE,
  opening_balance_iqd NUMERIC(12, 2) DEFAULT 0,
  closing_balance_iqd NUMERIC(12, 2),
  opening_balance_usd NUMERIC(12, 2) DEFAULT 0,
  closing_balance_usd NUMERIC(12, 2),
  opening_balance_eur NUMERIC(12, 2) DEFAULT 0,
  closing_balance_eur NUMERIC(12, 2),
  opening_balance_try NUMERIC(12, 2) DEFAULT 0,
  closing_balance_try NUMERIC(12, 2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_lock_sessions_opened_by ON lock_sessions(opened_by);
CREATE INDEX IF NOT EXISTS idx_lock_sessions_status ON lock_sessions(status);

CREATE TABLE IF NOT EXISTS lock_session_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES lock_sessions(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'expense', 'opening', 'closing')),
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('IQD', 'USD', 'EUR', 'TRY', 'GBP')),
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lock_transactions_session_id ON lock_session_transactions(session_id);

-- ==============================================
-- 9. AUDIT LOG
-- ==============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at);

-- ==============================================
-- 10. SEED ADMIN USER
-- ==============================================

-- Default admin user: admin@cashregister.com / Admin@123
-- Password hash for 'Admin@123'
INSERT INTO users (email, password_hash, full_name, role, is_active)
VALUES (
  'admin@cashregister.com',
  '$2a$10$rGKqJ5pN8R.qZUdXb/1d4ezJYLzWV5jPHxPmFmJBzMYqPqNmKR3lO',
  'System Administrator',
  'admin',
  true
) ON CONFLICT (email) DO NOTHING;

-- ==============================================
-- TRIGGERS FOR UPDATED_AT
-- ==============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installments_updated_at BEFORE UPDATE ON installments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
