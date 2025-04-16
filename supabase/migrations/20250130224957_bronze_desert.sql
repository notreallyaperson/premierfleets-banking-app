/*
  # Add fleet management and maintenance tracking tables
  
  1. New Tables
    - maintenance_services: Predefined service types
    - service_records: Detailed maintenance records
    - service_items: Individual items in a service record
    - accounts_receivable: Track customer invoices and payments
    - customers: Customer information for billing
  
  2. Changes
    - Add new columns to vehicles table
    - Add new columns to maintenance_records table
  
  3. Security
    - Enable RLS on all new tables
    - Add policies for proper access control
*/

-- Create maintenance services table
CREATE TABLE maintenance_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  service_interval_miles integer,
  service_interval_months integer,
  estimated_duration integer, -- in minutes
  estimated_cost decimal(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create service records table
CREATE TABLE service_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  service_date timestamptz NOT NULL,
  odometer_reading integer NOT NULL,
  technician_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  location text,
  total_cost decimal(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

-- Create service items table
CREATE TABLE service_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_record_id uuid REFERENCES service_records(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES maintenance_services(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_cost decimal(12,2) NOT NULL,
  total_cost decimal(12,2) NOT NULL,
  parts_cost decimal(12,2),
  labor_cost decimal(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE customers (
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

-- Create accounts receivable table
CREATE TABLE accounts_receivable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  invoice_number text NOT NULL,
  invoice_date timestamptz NOT NULL,
  due_date timestamptz NOT NULL,
  amount decimal(12,2) NOT NULL,
  balance decimal(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'paid', 'partial', 'overdue', 'cancelled'))
);

-- Create payments table
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accounts_receivable_id uuid REFERENCES accounts_receivable(id) ON DELETE CASCADE NOT NULL,
  payment_date timestamptz NOT NULL,
  amount decimal(12,2) NOT NULL,
  payment_method text NOT NULL,
  reference_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('cash', 'check', 'credit_card', 'bank_transfer', 'other'))
);

-- Enable RLS
ALTER TABLE maintenance_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for maintenance services
CREATE POLICY "maintenance_services_access"
  ON maintenance_services
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

-- Create policies for service records
CREATE POLICY "service_records_access"
  ON service_records
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

-- Create policies for service items
CREATE POLICY "service_items_access"
  ON service_items
  FOR ALL
  TO authenticated
  USING (
    service_record_id IN (
      SELECT id 
      FROM service_records 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    )
  )
  WITH CHECK (
    service_record_id IN (
      SELECT id 
      FROM service_records 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    )
  );

-- Create policies for customers
CREATE POLICY "customers_access"
  ON customers
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

-- Create policies for accounts receivable
CREATE POLICY "accounts_receivable_access"
  ON accounts_receivable
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

-- Create policies for payments
CREATE POLICY "payments_access"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    accounts_receivable_id IN (
      SELECT id 
      FROM accounts_receivable 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    )
  )
  WITH CHECK (
    accounts_receivable_id IN (
      SELECT id 
      FROM accounts_receivable 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_maintenance_services_updated_at
  BEFORE UPDATE ON maintenance_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_records_updated_at
  BEFORE UPDATE ON service_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_items_updated_at
  BEFORE UPDATE ON service_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_receivable_updated_at
  BEFORE UPDATE ON accounts_receivable
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();