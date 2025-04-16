-- Add transaction_id to transaction_patterns
DO $$ 
BEGIN
  -- Add transaction_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transaction_patterns' 
    AND column_name = 'transaction_id'
  ) THEN
    ALTER TABLE transaction_patterns
    ADD COLUMN transaction_id uuid;

    -- Add foreign key constraint
    ALTER TABLE transaction_patterns
    ADD CONSTRAINT transaction_patterns_transaction_id_fkey
    FOREIGN KEY (transaction_id)
    REFERENCES transactions(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transaction_patterns_transaction_id 
ON transaction_patterns(transaction_id);