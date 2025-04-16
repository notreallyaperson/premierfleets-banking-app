-- Create contractors table
CREATE TABLE IF NOT EXISTS contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  tax_id text NOT NULL,
  business_name text,
  address text,
  start_date date NOT NULL,
  rate decimal(12,2) NOT NULL,
  rate_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_rate_type CHECK (rate_type IN ('hourly', 'project', 'retainer')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive'))
);

-- Create tax forms table
CREATE TABLE IF NOT EXISTS tax_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  form_type text NOT NULL,
  tax_year integer NOT NULL,
  recipient_id uuid NOT NULL,
  recipient_type text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  filing_date timestamptz,
  due_date timestamptz NOT NULL,
  amount decimal(12,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_form_type CHECK (form_type IN ('W2', '1099-NEC', '1099-MISC')),
  CONSTRAINT valid_recipient_type CHECK (recipient_type IN ('employee', 'contractor')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'pending', 'filed', 'error'))
);

-- Enable RLS
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_forms ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "contractors_access" ON contractors
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tax_forms_access" ON tax_forms
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_contractors_updated_at
  BEFORE UPDATE ON contractors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_forms_updated_at
  BEFORE UPDATE ON tax_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_contractors_company_id ON contractors(company_id);
CREATE INDEX idx_contractors_status ON contractors(status);
CREATE INDEX idx_tax_forms_company_id ON tax_forms(company_id);
CREATE INDEX idx_tax_forms_tax_year ON tax_forms(tax_year);
CREATE INDEX idx_tax_forms_recipient ON tax_forms(recipient_id, recipient_type);