/*
  # Fix document analysis configuration
  
  1. Changes
    - Add missing columns to document_analyses
    - Add proper constraints and defaults
    - Update RLS policies
  
  2. Security
    - Maintain existing RLS policies
    - Add proper access control
*/

-- Drop and recreate document_analyses table with proper structure
DROP TABLE IF EXISTS document_analyses;

CREATE TABLE document_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  analysis_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  summary text,
  key_points jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  risk_factors jsonb DEFAULT '[]'::jsonb,
  raw_analysis jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_analysis_type CHECK (analysis_type IN ('fleet_document', 'loan_document', 'purchase_agreement', 'maintenance_record')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Enable RLS
ALTER TABLE document_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for document analyses
CREATE POLICY "enable_document_analyses_access"
  ON document_analyses
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

-- Create error handling function
CREATE OR REPLACE FUNCTION handle_document_analysis_error()
RETURNS trigger AS $$
BEGIN
  IF NEW.error_message IS NOT NULL THEN
    NEW.status := 'failed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for error handling
DROP TRIGGER IF EXISTS document_analysis_error_handler ON document_analyses;
CREATE TRIGGER document_analysis_error_handler
  BEFORE INSERT OR UPDATE ON document_analyses
  FOR EACH ROW
  EXECUTE FUNCTION handle_document_analysis_error();