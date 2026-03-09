/*
  # Fix installment_schedules months constraint

  ## Problem
  The `months` column on `installment_schedules` has a CHECK constraint of `months >= 6 AND months <= 12`.
  When using "by monthly amount" mode, the calculated number of months can be less than 6
  (e.g. a $500 order with $200/month = 3 months), causing the insert to fail silently
  and no installment entries to be created.

  ## Fix
  - Drop the overly restrictive CHECK constraint
  - Replace with a simple `months >= 1` constraint to allow any valid installment plan
*/

ALTER TABLE installment_schedules DROP CONSTRAINT IF EXISTS installment_schedules_months_check;

ALTER TABLE installment_schedules ADD CONSTRAINT installment_schedules_months_check CHECK (months >= 1);
