/*
  # Add status column to transaction_patterns table

  1. Changes
    - Add status column to transaction_patterns table
    - Add status constraint
    - Update existing rows with default status
  
  2. Security
    - No changes to RLS policies needed
*/

-- Add status column if it doesn't exist
ALTER TABLE transaction_patterns
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
CHECK (status IN ('pending', 'reviewed', 'dismissed'));

-- Update existing rows to have a default status
UPDATE transaction_patterns 
SET status = 'pending' 
WHERE status IS NULL;