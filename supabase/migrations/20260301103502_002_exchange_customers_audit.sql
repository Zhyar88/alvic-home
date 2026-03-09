
/*
  # Exchange Rates, Customers, and Audit Logs

  1. New Tables
    - `exchange_rates` - Daily USD/IQD exchange rates with cash and installment variants
    - `customers` - Customer records with full bilingual support and guarantor info
    - `audit_logs` - Immutable audit trail (INSERT only)

  2. Notes
    - Both Kurdish and English fields for all user-facing data
    - Audit logs cannot be updated or deleted
*/

-- Exchange rates
CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_cash numeric(12, 2) NOT NULL DEFAULT 1330,
  rate_installment numeric(12, 2) NOT NULL DEFAULT 1470,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  set_by uuid REFERENCES user_profiles(id),
  notes_en text DEFAULT '',
  notes_ku text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can insert exchange rates"
  ON exchange_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'administrator'
    )
  );

-- Insert default exchange rate
INSERT INTO exchange_rates (rate_cash, rate_installment, effective_date, notes_en, notes_ku)
VALUES (1330, 1470, CURRENT_DATE, 'Initial rate', 'ریتی سەرەتایی');

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name_en text NOT NULL DEFAULT '',
  full_name_ku text NOT NULL DEFAULT '',
  address_en text NOT NULL DEFAULT '',
  address_ku text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
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
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Audit logs (immutable)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id),
  user_name_en text DEFAULT '',
  user_name_ku text DEFAULT '',
  action text NOT NULL,
  module text NOT NULL,
  record_id text DEFAULT '',
  old_values jsonb DEFAULT '{}',
  new_values jsonb DEFAULT '{}',
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Administrators can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'administrator'
    )
  );

CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
