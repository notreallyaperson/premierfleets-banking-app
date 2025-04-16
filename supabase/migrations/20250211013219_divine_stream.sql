-- Add new columns to employees table if they don't exist
DO $$ BEGIN
  -- Add pay_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'pay_type'
  ) THEN
    ALTER TABLE employees
    ADD COLUMN pay_type text NOT NULL DEFAULT 'salary'
    CHECK (pay_type IN ('salary', 'hourly'));
  END IF;

  -- Add pay_rate column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'pay_rate'
  ) THEN
    ALTER TABLE employees
    ADD COLUMN pay_rate decimal(12,2) NOT NULL DEFAULT 0;
  END IF;

  -- Add overtime_eligible column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'overtime_eligible'
  ) THEN
    ALTER TABLE employees
    ADD COLUMN overtime_eligible boolean DEFAULT false;
  END IF;

  -- Add overtime_rate column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'overtime_rate'
  ) THEN
    ALTER TABLE employees
    ADD COLUMN overtime_rate decimal(5,2) DEFAULT 1.5;
  END IF;
END $$;

-- Create bonuses table if it doesn't exist
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS bonuses (
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
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Enable RLS if not already enabled
DO $$ BEGIN
  ALTER TABLE bonuses ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "bonuses_access" ON bonuses;
CREATE POLICY "bonuses_access" ON bonuses
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Add trigger for updated_at if it doesn't exist
DO $$ BEGIN
  CREATE TRIGGER update_bonuses_updated_at
    BEFORE UPDATE ON bonuses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;