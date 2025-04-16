-- Add bank_account_id to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account_id 
ON transactions(bank_account_id);

-- Add account_type column to bank_accounts if it doesn't exist
ALTER TABLE bank_accounts 
ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'checking'
CHECK (account_type IN ('checking', 'savings', 'business'));

-- Add account_number column if it doesn't exist
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS account_number text,
ADD COLUMN IF NOT EXISTS routing_number text,
ADD COLUMN IF NOT EXISTS bank_name text;

-- Add balance column if it doesn't exist
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS balance decimal(12,2) DEFAULT 0;

-- Add status column if it doesn't exist
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'inactive', 'frozen', 'closed'));

-- Add last_synced_at column if it doesn't exist
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS last_synced_at timestamptz DEFAULT now();