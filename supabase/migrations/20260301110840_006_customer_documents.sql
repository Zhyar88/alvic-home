/*
  # Customer Documents

  Adds support for multiple credential documents per customer (National ID, Passport, etc.)
  Files are stored in Supabase Storage under the 'customer-documents' bucket.

  1. New Tables
    - `customer_documents`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, FK to customers)
      - `document_type` (text enum: national_id, passport, driving_license, work_permit, residence_card, other)
      - `label_en` (text, custom label in English)
      - `label_ku` (text, custom label in Kurdish)
      - `file_name` (text, original file name)
      - `file_path` (text, storage path)
      - `file_size` (integer, bytes)
      - `mime_type` (text)
      - `created_by` (uuid, FK to user_profiles)
      - `created_at` (timestamptz)

  2. Storage
    - Creates 'customer-documents' bucket (private, authenticated access only)

  3. Security
    - RLS enabled on customer_documents
    - Authenticated users can view/insert documents
    - Only admins/administrators can delete
*/

CREATE TABLE IF NOT EXISTS customer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL DEFAULT 'other'
    CHECK (document_type IN ('national_id','passport','driving_license','work_permit','residence_card','other')),
  label_en text NOT NULL DEFAULT '',
  label_ku text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  file_path text NOT NULL DEFAULT '',
  file_size integer DEFAULT 0,
  mime_type text DEFAULT '',
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customer documents"
  ON customer_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer documents"
  ON customer_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can delete customer documents"
  ON customer_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('administrator', 'admin')
    )
  );

-- Storage bucket for customer documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-documents',
  'customer-documents',
  false,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow authenticated users to upload
CREATE POLICY "Authenticated users can upload customer documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'customer-documents');

-- Storage RLS: allow authenticated users to read
CREATE POLICY "Authenticated users can read customer documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'customer-documents');

-- Storage RLS: allow admins to delete
CREATE POLICY "Admins can delete customer document files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'customer-documents'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('administrator', 'admin')
    )
  );
