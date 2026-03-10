/*
  # Seed Default Administrator User

  Creates the initial admin account for first login.

  - Username: admin
  - Password: admin123
  - Role: Administrator (full permissions)

  Note: This runs AFTER migration 015 which creates the auth_users table
*/

-- This migration intentionally left empty
-- The admin user will be seeded by migration 015 (auth_users_table.sql)
