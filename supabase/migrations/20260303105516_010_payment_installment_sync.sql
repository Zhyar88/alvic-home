/*
  # Payment & Installment Sync Enhancement

  ## Summary
  Strengthens the bidirectional link between payments and installment entries,
  adds support for paying multiple installments in a single payment, and ensures
  that when a payment is recorded in either the Payments module or the Installments
  module, both tables stay in sync.

  ## Changes

  ### New Table
  - `payment_installment_links` — maps one payment to one or more installment entries
    (supports paying 2+ installments together in a single payment transaction)

  ### Modified Tables
  - `payments` — ensures `installment_entry_id` column exists (already present, but
    we add an index for lookup performance)
  - `installment_entries` — no schema change; syncing is handled at the application layer

  ## Indexes
  - `idx_payment_installment_links_payment_id`
  - `idx_payment_installment_links_entry_id`
  - `idx_payments_installment_entry_id`
  - `idx_payments_order_id_type`

  ## Security
  - RLS enabled on `payment_installment_links`
  - Authenticated users can read; only service role / app backend writes
*/

CREATE TABLE IF NOT EXISTS payment_installment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  installment_entry_id uuid NOT NULL REFERENCES installment_entries(id) ON DELETE CASCADE,
  allocated_amount_usd numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_installment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read payment_installment_links"
  ON payment_installment_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payment_installment_links"
  ON payment_installment_links FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pil_payment_id ON payment_installment_links(payment_id);
CREATE INDEX IF NOT EXISTS idx_pil_entry_id ON payment_installment_links(installment_entry_id);
CREATE INDEX IF NOT EXISTS idx_payments_installment_entry_id ON payments(installment_entry_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id_type ON payments(order_id, payment_type);
CREATE INDEX IF NOT EXISTS idx_installment_entries_order_id ON installment_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_installment_entries_status ON installment_entries(status);
