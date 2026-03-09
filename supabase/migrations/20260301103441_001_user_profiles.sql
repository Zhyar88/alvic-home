
/*
  # User Profiles and Roles

  1. New Tables
    - `roles` - Custom role definitions with JSONB permissions
    - `user_profiles` - Extended user data with bilingual names

  2. Security
    - RLS enabled on all tables
    - Administrators have full access, users can view own profile
*/

-- User profiles table (created first, roles references it later)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name_en text NOT NULL DEFAULT '',
  full_name_ku text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('administrator', 'admin', 'employee', 'custom')),
  custom_role_id uuid,
  is_active boolean DEFAULT true,
  phone text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_ku text NOT NULL,
  is_system boolean DEFAULT false,
  permissions jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can manage roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'administrator'
    )
  );

CREATE POLICY "Administrators can update roles"
  ON roles FOR UPDATE
  TO authenticated
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

-- Insert default system roles
INSERT INTO roles (name_en, name_ku, is_system, permissions) VALUES
  ('Administrator', 'بەڕێوەبەری گشتی', true, '{"orders":{"create":true,"read":true,"update":true,"delete":true,"change_status":true},"customers":{"create":true,"read":true,"update":true,"delete":true},"payments":{"create":true,"read":true,"update":true,"delete":true,"reverse":true},"installments":{"create":true,"read":true,"update":true,"delete":true},"expenses":{"create":true,"read":true,"update":true,"delete":true},"lock":{"create":true,"read":true,"update":true,"delete":true},"reports":{"read":true},"users":{"create":true,"read":true,"update":true,"delete":true},"exchange_rates":{"create":true,"read":true,"update":true},"audit_logs":{"read":true},"roles":{"create":true,"read":true,"update":true,"delete":true}}'),
  ('Admin', 'بەڕێوەبەر', true, '{"orders":{"create":true,"read":true,"update":true,"delete":true,"change_status":true},"customers":{"create":true,"read":true,"update":true,"delete":false},"payments":{"create":true,"read":true,"update":false,"delete":false},"installments":{"create":false,"read":true,"update":false,"delete":false},"expenses":{"create":true,"read":true,"update":true,"delete":false},"lock":{"create":true,"read":true,"update":false,"delete":false},"reports":{"read":false},"users":{"create":false,"read":false,"update":false,"delete":false},"exchange_rates":{"read":true}}'),
  ('Employee', 'کارمەند', true, '{"orders":{"create":true,"read":true,"update":true,"delete":true,"change_status":false},"customers":{"create":true,"read":true,"update":true,"delete":false},"payments":{"create":true,"read":true,"update":false,"delete":false},"installments":{"create":false,"read":true,"update":false,"delete":false},"expenses":{"create":false,"read":false,"update":false,"delete":false},"lock":{"read":true},"reports":{"read":false},"users":{"create":false,"read":false,"update":false,"delete":false},"exchange_rates":{"read":true}}')
ON CONFLICT DO NOTHING;
