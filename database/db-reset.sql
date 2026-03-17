-- =============================================================================
-- RESET: Clear all business data
-- Keeps: auth_users, user_profiles, roles, expense_categories
-- Clears: everything else
-- =============================================================================

-- Disable triggers temporarily to avoid interference
SET session_replication_role = replica;

-- 1. Child tables first (most dependent)
DELETE FROM payment_installment_links;
DELETE FROM lock_transactions;
DELETE FROM audit_logs;

-- 2. Installment data
DELETE FROM installment_entries;
DELETE FROM installment_schedules;

-- 3. Payments
DELETE FROM payments;

-- 4. Order related
DELETE FROM order_items;
DELETE FROM order_status_history;

DELETE FROM orders;

-- 5. Customers
DELETE FROM customers;

-- 6. Exchange rates (keep only the initial seed rate)
DELETE FROM exchange_rates
WHERE notes_en != 'Initial rate';

-- 7. Expenses (but keep categories)
DELETE FROM expenses;

-- 8. Cash register / lock sessions
DELETE FROM lock_sessions;

-- 9. Settings (optional — remove if you want to keep settings)
-- DELETE FROM settings;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Reset order and payment number sequences
ALTER SEQUENCE order_number_seq RESTART WITH 1000;
ALTER SEQUENCE payment_number_seq RESTART WITH 1000;
-- Remove non-superadmin users
DELETE FROM user_profiles
WHERE user_id != 'b74ec180-384a-4c03-babe-630321a35e3f';

DELETE FROM auth_users
WHERE id != 'b74ec180-384a-4c03-babe-630321a35e3f';

-- Remove custom/test roles, keep only the 3 system roles
DELETE FROM roles
WHERE id NOT IN (
  '6db28546-0796-4076-b357-dc4ce785c844', -- Administrator
  '7b7655e9-40c3-49f9-aa93-9bb35c7b6388', -- Admin
  '2a36e9dd-21ca-47b1-9e23-cd426d6d4d1a'  -- Employee
);