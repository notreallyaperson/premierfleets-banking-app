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

-- Create separate policies for each operation
CREATE POLICY "vehicles_select"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "vehicles_insert"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "vehicles_update"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "vehicles_delete"
  ON vehicles FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Ensure RLS is enabled
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;