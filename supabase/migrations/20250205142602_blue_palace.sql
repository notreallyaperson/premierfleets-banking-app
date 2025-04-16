-- Create invoice lines table
CREATE TABLE invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES accounts_receivable(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(12,2) NOT NULL,
  tax_rate decimal(5,2) NOT NULL DEFAULT 0,
  tax_amount decimal(12,2) NOT NULL DEFAULT 0,
  subtotal decimal(12,2) NOT NULL,
  total decimal(12,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns to accounts_receivable
ALTER TABLE accounts_receivable
ADD COLUMN IF NOT EXISTS reference text,
ADD COLUMN IF NOT EXISTS terms_and_conditions text,
ADD COLUMN IF NOT EXISTS tax_inclusive boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS subtotal decimal(12,2),
ADD COLUMN IF NOT EXISTS tax_amount decimal(12,2);

-- Enable RLS
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

-- Create policy for invoice lines
CREATE POLICY "invoice_lines_access" ON invoice_lines
FOR ALL TO authenticated
USING (
  invoice_id IN (
    SELECT id FROM accounts_receivable 
    WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_invoice_lines_updated_at
  BEFORE UPDATE ON invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update invoice totals
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the invoice totals
  WITH totals AS (
    SELECT 
      SUM(subtotal) as subtotal,
      SUM(tax_amount) as tax_amount,
      SUM(total) as total
    FROM invoice_lines
    WHERE invoice_id = NEW.invoice_id
  )
  UPDATE accounts_receivable
  SET 
    subtotal = totals.subtotal,
    tax_amount = totals.tax_amount,
    amount = totals.total,
    balance = totals.total
  FROM totals
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update invoice totals
CREATE TRIGGER update_invoice_totals_insert
  AFTER INSERT ON invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

CREATE TRIGGER update_invoice_totals_update
  AFTER UPDATE ON invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

CREATE TRIGGER update_invoice_totals_delete
  AFTER DELETE ON invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();