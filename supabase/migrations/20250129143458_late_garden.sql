/*
  # Improve document analysis error handling
  
  1. Changes
    - Add error_message column to document_analyses
    - Add status column to document_analyses
    - Add validation for analysis_type
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add error handling columns to document_analyses
ALTER TABLE document_analyses
ADD COLUMN IF NOT EXISTS error_message text,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- Add constraint for analysis_type
ALTER TABLE document_analyses
ADD CONSTRAINT valid_analysis_type
  CHECK (analysis_type IN ('fleet_document', 'loan_document', 'purchase_agreement', 'maintenance_record'));

-- Create function to handle document analysis errors
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