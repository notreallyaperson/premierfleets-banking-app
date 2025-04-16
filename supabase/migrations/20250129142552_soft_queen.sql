/*
  # Fix vehicles table RLS policies
  
  1. Changes
    - Drop all existing vehicle policies
    - Create new simplified policies for CRUD operations
    - Add proper company-based access control
  
  2. Security
    - Users can only access vehicles from their company
    - All authenticated users in a company can perform CRUD operations
*/

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

-- Create a single policy for all operations
CREATE POLICY "enable_all_vehicles_for_company_users"
  ON vehicles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = vehicles.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = vehicles.company_id
    )
  );

-- Ensure RLS is enabled
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;