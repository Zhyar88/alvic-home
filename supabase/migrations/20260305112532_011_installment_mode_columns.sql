/*
  # Add installment mode columns to orders

  1. Changes
    - `installment_mode` (text): either 'by_months' or 'by_amount'
      - 'by_months': user picks number of months (6-12), system divides remaining by months
      - 'by_amount': user picks fixed monthly amount, system calculates number of months automatically
    - `installment_monthly_amount` (numeric): the fixed monthly amount used when mode is 'by_amount'

  2. Defaults
    - installment_mode defaults to 'by_months' to preserve existing behavior
    - installment_monthly_amount defaults to 0
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'installment_mode'
  ) THEN
    ALTER TABLE orders ADD COLUMN installment_mode text NOT NULL DEFAULT 'by_months';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'installment_monthly_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN installment_monthly_amount numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;
