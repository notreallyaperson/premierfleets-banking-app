/*
  # Fix document analysis setup
  
  1. Changes
    - Add missing columns to documents table
    - Update document analyses table
  
  2. Security
    - Add proper RLS policies
*/

-- Add analysis_result to documents table if it doesn't exist
DO $$ 
BEGIN
  ALTER TABLE documents 
    ADD COLUMN IF NOT EXISTS analysis_result jsonb;
EXCEPTION
  WHEN duplicate_column THEN
    NULL;
END $$;

-- Recreate document analyses table
DROP TABLE IF EXISTS document_analyses;

CREATE TABLE document_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  analysis_type text NOT NULL,
  summary text,
  key_points jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  risk_factors jsonb DEFAULT '[]'::jsonb,
  raw_analysis jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE document_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for document analyses
CREATE POLICY "Users can view analyses in their company"
  ON document_analyses FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create analyses"
  ON document_analyses FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_document_analyses_updated_at
  BEFORE UPDATE ON document_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();