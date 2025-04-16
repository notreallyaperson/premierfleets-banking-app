/*
  # Initial Fleet Finance Database Schema

  1. New Tables
    - `profiles`
      - Extended user profile data linked to auth.users
      - Stores role, name, and company info
    
    - `companies`
      - Company/organization data
      - Stores company details and settings
    
    - `vehicles`
      - Fleet vehicle inventory
      - Stores vehicle details, status, and assignments
    
    - `vehicle_assignments`
      - Vehicle to driver assignments
      - Tracks current and historical vehicle assignments
    
    - `transactions`
      - Financial transactions
      - Stores all financial records with categories
    
    - `expenses`
      - Expense tracking
      - Stores expense claims, receipts, and approvals
    
    - `maintenance_records`
      - Vehicle maintenance history
      - Tracks service records and upcoming maintenance
    
    - `documents`
      - Document management
      - Stores metadata for uploaded documents
    
  2. Security
    - RLS enabled on all tables
    - Policies for role-based access
    - Company-based data isolation
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  tax_id text,
  address text,
  phone text,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  company_id uuid REFERENCES companies ON DELETE SET NULL,
  first_name text,
  last_name text,
  role text NOT NULL DEFAULT 'user',
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'fleet_manager', 'driver', 'accountant', 'user'))
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Vehicles table
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies ON DELETE CASCADE NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  vin text UNIQUE,
  license_plate text,
  status text DEFAULT 'active',
  mileage integer DEFAULT 0,
  fuel_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'maintenance', 'retired', 'sold'))
);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Vehicle assignments
CREATE TABLE vehicle_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id uuid REFERENCES vehicles ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- Enable RLS
ALTER TABLE vehicle_assignments ENABLE ROW LEVEL SECURITY;

-- Transactions table
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies ON DELETE CASCADE NOT NULL,
  vehicle_id uuid REFERENCES vehicles ON DELETE SET NULL,
  user_id uuid REFERENCES profiles ON DELETE SET NULL,
  type text NOT NULL,
  amount decimal(12,2) NOT NULL,
  description text,
  category text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_type CHECK (type IN ('expense', 'income', 'transfer')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Expenses table
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles ON DELETE SET NULL NOT NULL,
  vehicle_id uuid REFERENCES vehicles ON DELETE SET NULL,
  amount decimal(12,2) NOT NULL,
  description text,
  category text NOT NULL,
  receipt_url text,
  status text DEFAULT 'pending',
  approved_by uuid REFERENCES profiles ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Maintenance records
CREATE TABLE maintenance_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies ON DELETE CASCADE NOT NULL,
  vehicle_id uuid REFERENCES vehicles ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  description text,
  cost decimal(12,2),
  service_date timestamptz NOT NULL,
  next_service_date timestamptz,
  service_provider text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

-- Documents table
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles ON DELETE SET NULL NOT NULL,
  vehicle_id uuid REFERENCES vehicles ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text NOT NULL,
  category text NOT NULL,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Companies policies
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Profiles policies
CREATE POLICY "Users can view profiles in their company"
  ON profiles FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Vehicles policies
CREATE POLICY "Users can view vehicles in their company"
  ON vehicles FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Fleet managers can manage vehicles"
  ON vehicles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'fleet_manager')
      AND company_id = vehicles.company_id
    )
  );

-- Vehicle assignments policies
CREATE POLICY "Users can view assignments in their company"
  ON vehicle_assignments FOR SELECT
  TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM vehicles
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Transactions policies
CREATE POLICY "Users can view transactions in their company"
  ON transactions FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Accountants can manage transactions"
  ON transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'accountant')
      AND company_id = transactions.company_id
    )
  );

-- Expenses policies
CREATE POLICY "Users can view expenses in their company"
  ON expenses FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create their own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Maintenance records policies
CREATE POLICY "Users can view maintenance records in their company"
  ON maintenance_records FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Documents policies
CREATE POLICY "Users can view documents in their company"
  ON documents FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_assignments_updated_at
    BEFORE UPDATE ON vehicle_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_records_updated_at
    BEFORE UPDATE ON maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();