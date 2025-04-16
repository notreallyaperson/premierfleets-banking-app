/*
  # Document Analysis Table
  
  1. New Tables
    - `document_analyses` for storing AI analysis results
  
  2. Security
    - Enable RLS
    - Add policies for company-based access
*/

-- Create document analyses table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS document_analyses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    analysis_type text NOT NULL,
    summary text,
    key_points jsonb,
    recommendations jsonb,
    risk_factors jsonb,
    raw_analysis jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Enable RLS
ALTER TABLE document_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for document analyses
DO $$ BEGIN
  CREATE POLICY "Users can view analyses in their company"
    ON document_analyses FOR SELECT
    TO authenticated
    USING (company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create analyses"
    ON document_analyses FOR INSERT
    TO authenticated
    WITH CHECK (company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Add trigger for updated_at
DO $$ BEGIN
  CREATE TRIGGER update_document_analyses_updated_at
    BEFORE UPDATE ON document_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;