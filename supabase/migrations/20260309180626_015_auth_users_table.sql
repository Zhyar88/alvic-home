/*
  # Create Auth Users Table for Express Backend

  1. New Tables
    - `auth_users` - Stores user authentication credentials
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `created_at` (timestamptz)

  2. Notes
    - This table is separate from Supabase auth and is used by the Express backend
    - Passwords are stored as bcrypt hashes
*/

CREATE TABLE IF NOT EXISTS auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
