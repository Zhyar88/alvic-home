
/*
  # Orders, Order Items, Payments, and Installment Engine

  1. New Tables
    - `orders` - Main contract/order records with bilingual fields
    - `order_items` - Individual product items per order (bilingual, dynamic JSONB config)
    - `order_status_history` - Immutable log of all status changes
    - `payments` - Payment ledger (non-destructive, reversal-based)
    - `payment_reversals` - Reversal records linked to payments
    - `installment_schedules` - Generated installment plans per order
    - `installment_entries` - Individual installment rows with paid/unpaid tracking

  2. Notes
    - sale_type: 'cash' or 'installment'
    - Discount capped at 5% enforced at application level
    - All amounts stored in USD equivalent
    - Payment reversals are non-destructive (create new entry)
*/

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  sale_type text NOT NULL DEFAULT 'cash' CHECK (sale_type IN ('cash', 'installment')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','deposit_paid','in_production','ready','installed','finished')),
  total_amount_usd numeric(14, 2) NOT NULL DEFAULT 0,
  discount_percent numeric(5, 2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 5),
  discount_amount_usd numeric(14, 2) NOT NULL DEFAULT 0,
  final_total_usd numeric(14, 2) NOT NULL DEFAULT 0,
  deposit_required_usd numeric(14, 2) NOT NULL DEFAULT 0,
  deposit_paid_usd numeric(14, 2) NOT NULL DEFAULT 0,
  total_paid_usd numeric(14, 2) NOT NULL DEFAULT 0,
  balance_due_usd numeric(14, 2) NOT NULL DEFAULT 0,
  installment_months integer DEFAULT 0,
  start_date date,
  end_date date,
  notes_en text DEFAULT '',
  notes_ku text DEFAULT '',
  project_design_url text DEFAULT '',
  created_by uuid REFERENCES user_profiles(id),
  assigned_to uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view orders"
  ON orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert orders"
  ON orders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_type text NOT NULL CHECK (product_type IN ('kitchen_cabinet','bedroom_cabinet','tv_console','shoe_cabinet','understairs_cabinet','custom_console')),
  product_type_name_en text DEFAULT '',
  product_type_name_ku text DEFAULT '',
  item_name_en text DEFAULT '',
  item_name_ku text DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  unit_price_usd numeric(14, 2) NOT NULL DEFAULT 0,
  total_price_usd numeric(14, 2) NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}',
  notes_en text DEFAULT '',
  notes_ku text DEFAULT '',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view order items"
  ON order_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert order items"
  ON order_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update order items"
  ON order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete order items"
  ON order_items FOR DELETE TO authenticated USING (true);

-- Order status history
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  from_status text DEFAULT '',
  to_status text NOT NULL,
  changed_by uuid REFERENCES user_profiles(id),
  changed_by_name_en text DEFAULT '',
  changed_by_name_ku text DEFAULT '',
  reason_en text DEFAULT '',
  reason_ku text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view status history"
  ON order_status_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert status history"
  ON order_status_history FOR INSERT TO authenticated WITH CHECK (true);

-- Payments (non-destructive ledger)
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) NOT NULL,
  payment_number text UNIQUE NOT NULL,
  payment_type text NOT NULL DEFAULT 'deposit' CHECK (payment_type IN ('deposit','installment','final','partial','reversal')),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','IQD')),
  amount_in_currency numeric(16, 2) NOT NULL DEFAULT 0,
  exchange_rate_used numeric(12, 2) NOT NULL DEFAULT 1330,
  amount_usd numeric(14, 2) NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  installment_entry_id uuid,
  is_reversed boolean DEFAULT false,
  reversed_by uuid REFERENCES user_profiles(id),
  reversal_reference_id uuid,
  notes_en text DEFAULT '',
  notes_ku text DEFAULT '',
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payments"
  ON payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert payments"
  ON payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Administrators can update payments"
  ON payments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'administrator'
    )
  );

-- Installment schedules
CREATE TABLE IF NOT EXISTS installment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_amount_usd numeric(14, 2) NOT NULL DEFAULT 0,
  deposit_usd numeric(14, 2) NOT NULL DEFAULT 0,
  remaining_usd numeric(14, 2) NOT NULL DEFAULT 0,
  months integer NOT NULL DEFAULT 6 CHECK (months >= 6 AND months <= 12),
  monthly_amount_usd numeric(14, 2) NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  original_snapshot jsonb DEFAULT '{}',
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE installment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view schedules"
  ON installment_schedules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert schedules"
  ON installment_schedules FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Administrators can update schedules"
  ON installment_schedules FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'administrator'
    )
  );

-- Installment entries (individual monthly installments)
CREATE TABLE IF NOT EXISTS installment_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES installment_schedules(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES orders(id) NOT NULL,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount_usd numeric(14, 2) NOT NULL DEFAULT 0,
  paid_amount_usd numeric(14, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','overdue')),
  is_modified boolean DEFAULT false,
  modification_reason_en text DEFAULT '',
  modification_reason_ku text DEFAULT '',
  modified_by uuid REFERENCES user_profiles(id),
  modified_at timestamptz,
  original_amount_usd numeric(14, 2),
  original_due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE installment_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view installment entries"
  ON installment_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert installment entries"
  ON installment_entries FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Administrators can update installment entries"
  ON installment_entries FOR UPDATE TO authenticated
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

-- Sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000;

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
BEGIN
  RETURN 'AH-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('order_number_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Sequence for payment numbers
CREATE SEQUENCE IF NOT EXISTS payment_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS text AS $$
BEGIN
  RETURN 'PAY-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('payment_number_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;
