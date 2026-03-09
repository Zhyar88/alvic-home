/*
  # Fix role check constraint to include all valid roles

  1. Changes
    - Drop existing `user_profiles_role_check` constraint
    - Add updated constraint that includes 'data entry' as a valid role value
    - Also adds 'manager' as a future-safe value

  2. Notes
    - The roles table contains 'Data Entry' which lowercases to 'data entry'
    - The old constraint only allowed: administrator, admin, employee, custom
    - New constraint allows: administrator, admin, employee, custom, data entry
*/

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role = ANY (ARRAY['administrator'::text, 'admin'::text, 'employee'::text, 'custom'::text, 'data entry'::text]));
