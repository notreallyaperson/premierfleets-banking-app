-- Add new columns to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS pay_type text NOT NULL DEFAULT 'salary'
  CHECK (pay_type IN ('salary', 'hourly')),
ADD COLUMN IF NOT EXISTS pay_rate decimal(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_eligible boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS overtime_rate decimal(5,2) DEFAULT 1.5;

-- Create bonuses table
CREATE TABLE bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  amount decimal(12,2) NOT NULL,
  bonus_type text NOT NULL,
  description text,
  payment_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_bonus_type CHECK (bonus_type IN ('performance', 'annual', 'holiday', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'paid', 'cancelled'))
);

-- Enable RLS
ALTER TABLE bonuses ENABLE ROW LEVEL SECURITY;

-- Create policy for bonuses
CREATE POLICY "bonuses_access" ON bonuses
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_bonuses_updated_at
  BEFORE UPDATE ON bonuses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();