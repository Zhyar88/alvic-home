/*
  # Installment Discount Support

  ## Summary
  Adds discount tracking to the installment payment system. When a customer makes
  an installment payment with a discount applied, the discount amount is recorded
  and all remaining installment balances and order totals are recalculated.

  ## Changes

  ### Modified Tables

  #### `payments`
  - `discount_percent` (numeric) — the discount % applied during this payment (0 if none)
  - `discount_amount_usd` (numeric) — the USD value of the discount applied

  #### `orders`
  - `installment_discount_percent` (numeric) — cumulative discount % granted on installments
  - `installment_discount_amount_usd` (numeric) — cumulative discount amount in USD

  ### Notes
  - The discount is optional and defaults to 0
  - When applied it reduces the remaining installment entry amounts proportionally
  - The order final_total_usd and balance_due_usd are adjusted accordingly
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'discount_percent'
  ) THEN
    ALTER TABLE payments ADD COLUMN discount_percent numeric(5,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'discount_amount_usd'
  ) THEN
    ALTER TABLE payments ADD COLUMN discount_amount_usd numeric(14,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'installment_discount_percent'
  ) THEN
    ALTER TABLE orders ADD COLUMN installment_discount_percent numeric(5,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'installment_discount_amount_usd'
  ) THEN
    ALTER TABLE orders ADD COLUMN installment_discount_amount_usd numeric(14,2) NOT NULL DEFAULT 0;
  END IF;
END $$;
