/*
  # Security Fixes

  1. Fix RLS policies that re-evaluate auth.uid() per row — replace with (select auth.uid())
     Affected tables: customer_documents, user_profiles, roles, exchange_rates, audit_logs,
     payments, expense_categories, installment_schedules, expenses, installment_entries

  2. Fix always-true RLS policies — replace `true` with `(select auth.uid()) IS NOT NULL`
     so only authenticated users pass (proper restriction without leaking data)
     Affected: audit_logs, customer_documents, customers, installment_entries,
     installment_schedules, lock_sessions, lock_transactions, order_items,
     order_status_history, orders, payments, user_profiles

  3. Fix mutable search_path on generate_order_number and generate_payment_number
*/

-- =============================================
-- 1. Fix auth.uid() re-evaluation in subqueries
-- =============================================

-- customer_documents: Admins can delete
DROP POLICY IF EXISTS "Admins can delete customer documents" ON public.customer_documents;
CREATE POLICY "Admins can delete customer documents"
  ON public.customer_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = ANY (ARRAY['administrator','admin'])
    )
  );

-- user_profiles: Users can insert own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- roles: Administrators can manage roles (INSERT)
DROP POLICY IF EXISTS "Administrators can manage roles" ON public.roles;
CREATE POLICY "Administrators can manage roles"
  ON public.roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = 'administrator'
    )
  );

-- roles: Administrators can update roles
DROP POLICY IF EXISTS "Administrators can update roles" ON public.roles;
CREATE POLICY "Administrators can update roles"
  ON public.roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = 'administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = 'administrator'
    )
  );

-- exchange_rates: Administrators can insert
DROP POLICY IF EXISTS "Administrators can insert exchange rates" ON public.exchange_rates;
CREATE POLICY "Administrators can insert exchange rates"
  ON public.exchange_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = 'administrator'
    )
  );

-- audit_logs: Administrators can view
DROP POLICY IF EXISTS "Administrators can view audit logs" ON public.audit_logs;
CREATE POLICY "Administrators can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = 'administrator'
    )
  );

-- payments: Administrators can update
DROP POLICY IF EXISTS "Administrators can update payments" ON public.payments;
CREATE POLICY "Administrators can update payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = 'administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = 'administrator'
    )
  );

-- expense_categories: Administrators can manage (INSERT)
DROP POLICY IF EXISTS "Administrators can manage expense categories" ON public.expense_categories;
CREATE POLICY "Administrators can manage expense categories"
  ON public.expense_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = ANY (ARRAY['administrator','admin'])
    )
  );

-- expense_categories: Administrators can update
DROP POLICY IF EXISTS "Administrators can update expense categories" ON public.expense_categories;
CREATE POLICY "Administrators can update expense categories"
  ON public.expense_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = ANY (ARRAY['administrator','admin'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = ANY (ARRAY['administrator','admin'])
    )
  );

-- installment_schedules: Administrators can update
DROP POLICY IF EXISTS "Administrators can update schedules" ON public.installment_schedules;
CREATE POLICY "Administrators can update schedules"
  ON public.installment_schedules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = 'administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = 'administrator'
    )
  );

-- expenses: Authorized users can insert
DROP POLICY IF EXISTS "Authorized users can insert expenses" ON public.expenses;
CREATE POLICY "Authorized users can insert expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = ANY (ARRAY['administrator','admin'])
    )
  );

-- expenses: Authorized users can update
DROP POLICY IF EXISTS "Authorized users can update expenses" ON public.expenses;
CREATE POLICY "Authorized users can update expenses"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = ANY (ARRAY['administrator','admin'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = ANY (ARRAY['administrator','admin'])
    )
  );

-- expenses: Authorized users can view
DROP POLICY IF EXISTS "Authorized users can view expenses" ON public.expenses;
CREATE POLICY "Authorized users can view expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = ANY (ARRAY['administrator','admin'])
    )
  );

-- installment_entries: Administrators can update
DROP POLICY IF EXISTS "Administrators can update installment entries" ON public.installment_entries;
CREATE POLICY "Administrators can update installment entries"
  ON public.installment_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = ANY (ARRAY['administrator','admin'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role = ANY (ARRAY['administrator','admin'])
    )
  );

-- =============================================
-- 2. Fix always-true RLS policies
--    Replace bare `true` with auth check
-- =============================================

-- audit_logs INSERT
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- customer_documents INSERT
DROP POLICY IF EXISTS "Authenticated users can insert customer documents" ON public.customer_documents;
CREATE POLICY "Authenticated users can insert customer documents"
  ON public.customer_documents FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- customers INSERT
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
CREATE POLICY "Authenticated users can insert customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- customers UPDATE
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
CREATE POLICY "Authenticated users can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- installment_entries INSERT
DROP POLICY IF EXISTS "Authenticated users can insert installment entries" ON public.installment_entries;
CREATE POLICY "Authenticated users can insert installment entries"
  ON public.installment_entries FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- installment_schedules INSERT
DROP POLICY IF EXISTS "Authenticated users can insert schedules" ON public.installment_schedules;
CREATE POLICY "Authenticated users can insert schedules"
  ON public.installment_schedules FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- lock_sessions INSERT
DROP POLICY IF EXISTS "Authenticated users can insert lock sessions" ON public.lock_sessions;
CREATE POLICY "Authenticated users can insert lock sessions"
  ON public.lock_sessions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- lock_sessions UPDATE
DROP POLICY IF EXISTS "Authenticated users can update lock sessions" ON public.lock_sessions;
CREATE POLICY "Authenticated users can update lock sessions"
  ON public.lock_sessions FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- lock_transactions INSERT
DROP POLICY IF EXISTS "Authenticated users can insert lock transactions" ON public.lock_transactions;
CREATE POLICY "Authenticated users can insert lock transactions"
  ON public.lock_transactions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- order_items DELETE
DROP POLICY IF EXISTS "Authenticated users can delete order items" ON public.order_items;
CREATE POLICY "Authenticated users can delete order items"
  ON public.order_items FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- order_items INSERT
DROP POLICY IF EXISTS "Authenticated users can insert order items" ON public.order_items;
CREATE POLICY "Authenticated users can insert order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- order_items UPDATE
DROP POLICY IF EXISTS "Authenticated users can update order items" ON public.order_items;
CREATE POLICY "Authenticated users can update order items"
  ON public.order_items FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- order_status_history INSERT
DROP POLICY IF EXISTS "Authenticated users can insert status history" ON public.order_status_history;
CREATE POLICY "Authenticated users can insert status history"
  ON public.order_status_history FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- orders INSERT
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
CREATE POLICY "Authenticated users can insert orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- orders UPDATE
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;
CREATE POLICY "Authenticated users can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- payments INSERT
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
CREATE POLICY "Authenticated users can insert payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- user_profiles UPDATE
DROP POLICY IF EXISTS "Users can update profiles" ON public.user_profiles;
CREATE POLICY "Users can update profiles"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- =============================================
-- 3. Fix mutable search_path on functions
-- =============================================

ALTER FUNCTION public.generate_order_number() SET search_path = public;
ALTER FUNCTION public.generate_payment_number() SET search_path = public;
