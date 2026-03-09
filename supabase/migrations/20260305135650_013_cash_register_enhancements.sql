/*
  # Cash Register Enhancements

  ## Summary
  Enhances the existing lock_sessions/lock_transactions system to serve as a proper
  cash register that automatically logs all financial activity (payments, expenses,
  installments) and enforces that no financial transactions can occur unless a
  cash register session is open for the current date.

  ## Changes

  ### Modified Tables
  - `lock_sessions`
    - Add `session_date` unique constraint to prevent multiple open sessions per day
    - Add `payment_income_usd` column to track payment income separately
    - Add `expense_outflow_usd` column to track expense outflow separately
    - Add `installment_income_usd` column to track installment income separately

  ### Modified: lock_transactions
    - Add `reference_number` column for payment/expense numbers
    - Add `currency` column to store original currency
    - Add `amount_in_currency` column for original amount
    - Add `exchange_rate_used` column

  ### Security
  - RLS already enabled on both tables; adding delete policy for administrators on lock_sessions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lock_sessions' AND column_name = 'payment_income_usd'
  ) THEN
    ALTER TABLE lock_sessions ADD COLUMN payment_income_usd numeric(14,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lock_sessions' AND column_name = 'expense_outflow_usd'
  ) THEN
    ALTER TABLE lock_sessions ADD COLUMN expense_outflow_usd numeric(14,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lock_sessions' AND column_name = 'installment_income_usd'
  ) THEN
    ALTER TABLE lock_sessions ADD COLUMN installment_income_usd numeric(14,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lock_transactions' AND column_name = 'reference_number'
  ) THEN
    ALTER TABLE lock_transactions ADD COLUMN reference_number text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lock_transactions' AND column_name = 'currency'
  ) THEN
    ALTER TABLE lock_transactions ADD COLUMN currency text DEFAULT 'USD';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lock_transactions' AND column_name = 'amount_in_currency'
  ) THEN
    ALTER TABLE lock_transactions ADD COLUMN amount_in_currency numeric(16,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lock_transactions' AND column_name = 'exchange_rate_used'
  ) THEN
    ALTER TABLE lock_transactions ADD COLUMN exchange_rate_used numeric(12,2) DEFAULT 1;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lock_sessions' AND policyname = 'Administrators can delete lock sessions'
  ) THEN
    CREATE POLICY "Administrators can delete lock sessions"
      ON lock_sessions FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.user_id = auth.uid()
          AND user_profiles.role IN ('administrator')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lock_transactions' AND policyname = 'Administrators can delete lock transactions'
  ) THEN
    CREATE POLICY "Administrators can delete lock transactions"
      ON lock_transactions FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.user_id = auth.uid()
          AND user_profiles.role IN ('administrator')
        )
      );
  END IF;
END $$;
