/*
  # Fix vehicles table RLS policies
  
  1. Changes
    - Drop all existing vehicle policies
    - Create new simplified policies that allow company members to manage vehicles
    - Add clear access rules for vehicles
  
  2. Security
    - Users can manage vehicles within their company
    - Policies use simple, direct company_id checks
*/

-- Drop ALL existing vehicle policies
DROP POLICY IF EXISTS "Users can view vehicles in their company" ON vehicles;
DROP POLICY IF EXISTS "Fleet managers can manage vehicles" ON vehicles;
DROP POLICY IF EXISTS "vehicles_select_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete_policy" ON vehicles;
DROP POLICY IF EXISTS "enable_all_for_company_users" ON vehicles;

-- Create new simplified policies
CREATE POLICY "vehicles_access_policy"
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