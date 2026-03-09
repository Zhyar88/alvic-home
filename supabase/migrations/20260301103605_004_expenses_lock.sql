
/*
  # Expenses and Lock (Cash Register) Module

  1. New Tables
    - `expense_categories` - Bilingual expense category definitions
    - `expenses` - Expense entries with currency conversion
    - `lock_sessions` - Daily cash register open/close sessions
    - `lock_transactions` - Individual cash movements within a session

  2. Notes
    - Expenses stored as USD equivalent with original currency preserved
    - Lock sessions track daily reconciliation
*/

-- Expense categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_ku text NOT NULL,
  description_en text DEFAULT '',
  description_ku text DEFAULT '',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view expense categories"
  ON expense_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Administrators can manage expense categories"
  ON expense_categories FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('administrator', 'admin')
    )
  );

CREATE POLICY "Administrators can update expense categories"
  ON expense_categories FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('administrator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('administrator', 'admin')
    )
  );

-- Seed default expense categories
INSERT INTO expense_categories (name_en, name_ku, sort_order) VALUES
  ('Utilities - Water', 'خزمەتگوزاری - ئاو', 1),
  ('Utilities - Electricity', 'خزمەتگوزاری - کارەبا', 2),
  ('Office Supplies', 'پێداویستیەکانی ئۆفیس', 3),
  ('Rent', 'کرێ', 4),
  ('Factory Materials', 'کەرەستەی فابریکە', 5),
  ('Employee Salaries', 'مووچەی کارمەندان', 6),
  ('Transportation', 'گواستنەوە', 7),
  ('Maintenance & Repair', 'چاکسازی و گرتنەوە', 8),
  ('Marketing', 'بازارگەری', 9),
  ('Other', 'جووتری', 10)
ON CONFLICT DO NOTHING;

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number text UNIQUE NOT NULL DEFAULT ('EXP-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || floor(random()*9000+1000)::text),
  category_id uuid REFERENCES expense_categories(id),
  category_name_en text DEFAULT '',
  category_name_ku text DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  description_ku text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','IQD')),
  amount_in_currency numeric(16, 2) NOT NULL DEFAULT 0,
  exchange_rate_used numeric(12, 2) NOT NULL DEFAULT 1330,
  amount_usd numeric(14, 2) NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  linked_order_id uuid REFERENCES orders(id),
  receipt_url text DEFAULT '',
  notes_en text DEFAULT '',
  notes_ku text DEFAULT '',
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view expenses"
  ON expenses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('administrator', 'admin')
    )
  );

CREATE POLICY "Authorized users can insert expenses"
  ON expenses FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('administrator', 'admin')
    )
  );

CREATE POLICY "Authorized users can update expenses"
  ON expenses FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('administrator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('administrator', 'admin')
    )
  );

-- Lock sessions (daily cash register)
CREATE TABLE IF NOT EXISTS lock_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  opened_by uuid REFERENCES user_profiles(id),
  closed_by uuid REFERENCES user_profiles(id),
  opening_balance_usd numeric(14, 2) NOT NULL DEFAULT 0,
  closing_balance_usd numeric(14, 2),
  total_income_usd numeric(14, 2) DEFAULT 0,
  total_expenses_usd numeric(14, 2) DEFAULT 0,
  net_usd numeric(14, 2) DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  notes_en text DEFAULT '',
  notes_ku text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lock_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lock sessions"
  ON lock_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert lock sessions"
  ON lock_sessions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update lock sessions"
  ON lock_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Lock transactions (individual cash movements)
CREATE TABLE IF NOT EXISTS lock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES lock_sessions(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('income','expense')),
  reference_type text DEFAULT '' CHECK (reference_type IN ('payment','expense','manual','')),
  reference_id uuid,
  description_en text NOT NULL DEFAULT '',
  description_ku text NOT NULL DEFAULT '',
  amount_usd numeric(14, 2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lock_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lock transactions"
  ON lock_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert lock transactions"
  ON lock_transactions FOR INSERT TO authenticated WITH CHECK (true);
