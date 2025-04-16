-- Create bank accounts table for payment methods
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  type text NOT NULL,
  name text NOT NULL,
  bank_name text,
  account_number text,
  routing_number text,
  stripe_payment_method_id text,
  is_default boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_payment_type CHECK (type IN ('bank_account', 'credit_card', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'pending_verification'))
);

-- Add payment method reference to bill payments
ALTER TABLE bill_payments
ADD COLUMN payment_method_id uuid REFERENCES payment_methods(id);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "payment_methods_access" ON payment_methods
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  -- Only encrypt if account numbers are provided
  IF NEW.account_number IS NOT NULL THEN
    -- In a real implementation, use proper encryption
    -- For demo purposes, we'll just mask the numbers
    NEW.account_number = RIGHT(NEW.account_number, 4);
  END IF;
  IF NEW.routing_number IS NOT NULL THEN
    -- Only store last 4 digits
    NEW.routing_number = RIGHT(NEW.routing_number, 4);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for encryption
CREATE TRIGGER encrypt_payment_method_data
  BEFORE INSERT OR UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_payment_method();