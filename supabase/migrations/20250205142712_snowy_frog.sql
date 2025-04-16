-- Drop existing foreign key constraints if they exist
DO $$ BEGIN
  ALTER TABLE accounts_payable DROP CONSTRAINT IF EXISTS accounts_payable_vendor_id_fkey;
  ALTER TABLE bill_payments DROP CONSTRAINT IF EXISTS bill_payments_accounts_payable_id_fkey;
EXCEPTION
  WHEN others THEN null;
END $$;

-- Drop and recreate vendors table with proper constraints
DROP TABLE IF EXISTS vendors CASCADE;
CREATE TABLE vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  payment_terms text,
  credit_limit decimal(12,2),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'suspended'))
);

-- Drop and recreate accounts payable table with proper constraints
DROP TABLE IF EXISTS accounts_payable CASCADE;
CREATE TABLE accounts_payable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  bill_number text NOT NULL,
  bill_date timestamptz NOT NULL,
  due_date timestamptz NOT NULL,
  amount decimal(12,2) NOT NULL,
  balance decimal(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'paid', 'partial', 'overdue', 'cancelled'))
);

-- Drop and recreate bill payments table with proper constraints
DROP TABLE IF EXISTS bill_payments CASCADE;
CREATE TABLE bill_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accounts_payable_id uuid REFERENCES accounts_payable(id) ON DELETE CASCADE NOT NULL,
  payment_date timestamptz NOT NULL,
  amount decimal(12,2) NOT NULL,
  payment_method text NOT NULL,
  reference_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('bank_transfer', 'check', 'credit_card', 'cash', 'other'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_company_id ON vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_company_id ON accounts_payable(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_vendor_id ON accounts_payable(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_accounts_payable_id ON bill_payments(accounts_payable_id);

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "vendors_access" ON vendors
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "accounts_payable_access" ON accounts_payable
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "bill_payments_access" ON bill_payments
FOR ALL TO authenticated
USING (
  accounts_payable_id IN (
    SELECT id FROM accounts_payable 
    WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_payable_updated_at
  BEFORE UPDATE ON accounts_payable
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_payments_updated_at
  BEFORE UPDATE ON bill_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update bill balance
CREATE OR REPLACE FUNCTION update_bill_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the bill balance
  WITH payment_totals AS (
    SELECT SUM(amount) as total_payments
    FROM bill_payments
    WHERE accounts_payable_id = NEW.accounts_payable_id
  )
  UPDATE accounts_payable
  SET 
    balance = amount - COALESCE(payment_totals.total_payments, 0),
    status = CASE 
      WHEN amount - COALESCE(payment_totals.total_payments, 0) <= 0 THEN 'paid'
      WHEN amount - COALESCE(payment_totals.total_payments, 0) < amount THEN 'partial'
      ELSE status
    END
  FROM payment_totals
  WHERE id = NEW.accounts_payable_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update bill balance
CREATE TRIGGER update_bill_balance_insert
  AFTER INSERT ON bill_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_balance();

CREATE TRIGGER update_bill_balance_update
  AFTER UPDATE ON bill_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_balance();

CREATE TRIGGER update_bill_balance_delete
  AFTER DELETE ON bill_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_balance();