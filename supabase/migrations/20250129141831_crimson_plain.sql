/*
  # Fix vehicle RLS policies
  
  1. Changes
    - Drop existing vehicle policies
    - Create new simplified policies for all operations
    - Add proper company_id checks
  
  2. Security
    - Users can only access vehicles from their company
    - All operations (select, insert, update, delete) use the same company check
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view vehicles in their company" ON vehicles;
DROP POLICY IF EXISTS "Fleet managers can manage vehicles" ON vehicles;
DROP POLICY IF EXISTS "vehicles_select_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete_policy" ON vehicles;

-- Create new unified policy for all operations
CREATE POLICY "enable_all_for_company_users"
  ON vehicles
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );