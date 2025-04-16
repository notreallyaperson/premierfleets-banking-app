-- Add transaction_id to transaction_patterns
ALTER TABLE transaction_patterns
ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transaction_patterns_transaction_id 
ON transaction_patterns(transaction_id);