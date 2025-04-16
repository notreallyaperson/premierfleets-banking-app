/*
  # Database Schema Update
  
  1. Changes
    - Drop existing policies and triggers safely
    - Recreate tables with proper constraints
    - Add new policies with unique names
    - Set up document analysis functionality
  
  2. Security
    - Enable RLS on all tables
    - Set up proper access policies
    - Maintain data integrity
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "enable_company_access" ON companies;
DROP POLICY IF EXISTS "enable_profiles_access" ON profiles;
DROP POLICY IF EXISTS "enable_vehicles_access" ON vehicles;
DROP POLICY IF EXISTS "enable_documents_access" ON documents;
DROP POLICY IF EXISTS "enable_document_analyses_access" ON document_analyses;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents from their company" ON storage.objects;

-- Drop triggers that depend on update_updated_at_column
DROP TRIGGER IF EXISTS update_vehicle_assignments_updated_at ON vehicle_assignments;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
DROP TRIGGER IF EXISTS update_maintenance_records_updated_at ON maintenance_records;
DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON bank_accounts;
DROP TRIGGER IF EXISTS update_payment_cards_updated_at ON payment_cards;
DROP TRIGGER IF EXISTS update_capital_applications_updated_at ON capital_applications;

-- Now we can safely drop other triggers
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS update_document_analyses_updated_at ON document_analyses;
DROP TRIGGER IF EXISTS document_analysis_error_handler ON document_analyses;

-- Drop existing functions
DROP FUNCTION IF EXISTS handle_document_analysis_error();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE IF NOT EXISTS profiles (
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
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles ON DELETE SET NULL NOT NULL,
  vehicle_id uuid REFERENCES vehicles ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text NOT NULL,
  category text NOT NULL,
  analysis_result jsonb,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Document analyses table
CREATE TABLE IF NOT EXISTS document_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  analysis_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  summary text,
  key_points jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  risk_factors jsonb DEFAULT '[]'::jsonb,
  raw_analysis jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_analysis_type CHECK (analysis_type IN ('fleet_document', 'loan_document', 'purchase_agreement', 'maintenance_record')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Enable RLS
ALTER TABLE document_analyses ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create new policies
CREATE POLICY "enable_company_access_20250129152521"
  ON companies
  FOR ALL
  TO authenticated
  USING (
    id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "enable_profiles_access_20250129152521"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    id = auth.uid() OR
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "enable_vehicles_access_20250129152521"
  ON vehicles
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "enable_documents_access_20250129152521"
  ON documents
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "enable_document_analyses_access_20250129152521"
  ON document_analyses
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "enable_storage_upload_20250129152521"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "enable_storage_select_20250129152521"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Insert test company
INSERT INTO companies (id, name)
VALUES (
  'e52869a7-4f5d-4f19-b25f-2dc0e9aa0226',
  'Test Fleet Company'
)
ON CONFLICT (id) DO NOTHING;

-- Create function to handle document analysis errors
CREATE OR REPLACE FUNCTION handle_document_analysis_error()
RETURNS trigger AS $$
BEGIN
  IF NEW.error_message IS NOT NULL THEN
    NEW.status := 'failed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for error handling
CREATE TRIGGER document_analysis_error_handler
  BEFORE INSERT OR UPDATE ON document_analyses
  FOR EACH ROW
  EXECUTE FUNCTION handle_document_analysis_error();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
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

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_analyses_updated_at
    BEFORE UPDATE ON document_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();