/*
  # Create maintenance and service tracking tables
  
  1. New Tables
    - maintenance_services: Defines service types and intervals
    - service_records: Tracks actual service events
    - service_items: Stores line items for each service record
  
  2. Changes
    - Added proper foreign key relationships
    - Added status constraints
    - Added cost tracking fields
  
  3. Security
    - Enabled RLS on all tables
    - Added company-based access policies
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS service_items CASCADE;
DROP TABLE IF EXISTS service_records CASCADE;
DROP TABLE IF EXISTS maintenance_services CASCADE;

-- Create maintenance services table
CREATE TABLE maintenance_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  service_interval_miles integer,
  service_interval_months integer,
  estimated_duration integer,
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

-- Enable RLS
ALTER TABLE maintenance_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "maintenance_services_policy" ON maintenance_services
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "service_records_policy" ON service_records
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "service_items_policy" ON service_items
FOR ALL TO authenticated
USING (service_record_id IN (
  SELECT id FROM service_records 
  WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
))
WITH CHECK (service_record_id IN (
  SELECT id FROM service_records 
  WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
));