/*
  # Fix vehicles table RLS policies
  
  1. Changes
    - Drop existing vehicle policies
    - Create new simplified policies for vehicles table
    - Add clear access rules for vehicles
  
  2. Security
    - Users can view vehicles in their company
    - Users can manage vehicles if they are admin or fleet_manager
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view vehicles in their company" ON vehicles;
DROP POLICY IF EXISTS "Fleet managers can manage vehicles" ON vehicles;

-- Create new policies
CREATE POLICY "vehicles_select_policy"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "vehicles_insert_policy"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "vehicles_update_policy"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "vehicles_delete_policy"
  ON vehicles FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );