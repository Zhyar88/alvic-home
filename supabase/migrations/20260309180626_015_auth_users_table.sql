/*
  # Create Auth Users Table for Express Backend

  1. New Tables
    - `auth_users` - Stores user authentication credentials
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `email` (text, unique)
      - `password_hash` (text)
      - `created_at` (timestamptz)

  2. Seed Data
    - Creates default admin user (username: admin, password: admin123)

  3. Notes
    - This table is used by the Express backend for authentication
    - Passwords are stored as bcrypt hashes
*/

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create auth_users table
CREATE TABLE IF NOT EXISTS auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_auth_users_username ON auth_users(username);
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);

-- Seed default admin user
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_exists boolean;
BEGIN
  -- Check if admin user already exists
  SELECT EXISTS(SELECT 1 FROM auth_users WHERE username = 'admin') INTO v_exists;

  IF NOT v_exists THEN
    -- Insert admin into auth_users
    INSERT INTO auth_users (id, username, email, password_hash, created_at)
    VALUES (
      v_user_id,
      'admin',
      'admin@alvichome.com',
      crypt('admin123', gen_salt('bf')),
      now()
    );

    -- Insert admin profile
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
