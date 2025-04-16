/*
  # Fix Document Analysis Function and Error Handling
  
  1. Changes
    - Add better error handling for document analyses
    - Add retry mechanism for failed analyses
    - Add more detailed status tracking
  
  2. Security
    - Maintain existing RLS policies
    - Add audit trail for analysis attempts
*/

-- Add new columns for better error tracking
ALTER TABLE document_analyses
ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
ADD COLUMN IF NOT EXISTS error_details jsonb;

-- Update the status check constraint to include more detailed states
ALTER TABLE document_analyses
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE document_analyses
ADD CONSTRAINT valid_status 
  CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'retry_pending',
    'cancelled'
  ));

-- Update error handling function
CREATE OR REPLACE FUNCTION handle_document_analysis_error()
RETURNS trigger AS $$
BEGIN
  IF NEW.error_message IS NOT NULL THEN
    NEW.status := 'failed';
    NEW.attempt_count := COALESCE(OLD.attempt_count, 0) + 1;
    NEW.last_attempt_at := now();
    
    -- If less than 3 attempts, mark for retry
    IF NEW.attempt_count < 3 THEN
      NEW.status := 'retry_pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;