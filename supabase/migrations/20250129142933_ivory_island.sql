/*
  # Fix RLS policies for companies and vehicles
  
  1. Changes
    - Drop existing policies
    - Create new simplified policies for companies and vehicles
    - Ensure proper access control based on user's company
  
  2. Security
    - Users can access their own company
    - Users can manage vehicles within their company
*/

-- Drop existing company policies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;

-- Create new company policy
CREATE POLICY "enable_company_access"
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

-- Drop ALL existing vehicle policies
DROP POLICY IF EXISTS "Users can view vehicles in their company" ON vehicles;
DROP POLICY IF EXISTS "Fleet managers can manage vehicles" ON vehicles;
DROP POLICY IF EXISTS "vehicles_select_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete_policy" ON vehicles;
DROP POLICY IF EXISTS "enable_all_for_company_users" ON vehicles;
DROP POLICY IF EXISTS "vehicles_access_policy" ON vehicles;
DROP POLICY IF EXISTS "enable_all_vehicles_access" ON vehicles;
DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
DROP POLICY IF EXISTS "enable_all_vehicles_for_company_users" ON vehicles;

-- Create new vehicle policy
CREATE POLICY "enable_vehicle_access"
  ON vehicles
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

-- Ensure RLS is enabled
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;