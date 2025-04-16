/*
  # Add maintenance document analysis support
  
  1. New Tables
    - maintenance_documents
      - Stores uploaded maintenance receipts and invoices
      - Links to service records
      - Tracks document status and analysis results
    
  2. Changes
    - Add AI analysis results storage
    - Add document categorization
    - Add extracted data fields
    
  3. Security
    - Enable RLS
    - Add policies for company-based access
*/

-- Create maintenance documents table
CREATE TABLE maintenance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  service_record_id uuid REFERENCES service_records(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_url text NOT NULL,
  document_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  analysis_status text NOT NULL DEFAULT 'pending',
  analysis_error text,
  extracted_data jsonb DEFAULT '{}'::jsonb,
  confidence_score decimal(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_document_type CHECK (document_type IN ('receipt', 'invoice', 'estimate', 'work_order')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT valid_analysis_status CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Enable RLS
ALTER TABLE maintenance_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "maintenance_documents_access" ON maintenance_documents
FOR ALL TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Create storage bucket for maintenance documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-docs', 'maintenance-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "maintenance_docs_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'maintenance-docs' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "maintenance_docs_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-docs' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_maintenance_documents_updated_at
  BEFORE UPDATE ON maintenance_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();