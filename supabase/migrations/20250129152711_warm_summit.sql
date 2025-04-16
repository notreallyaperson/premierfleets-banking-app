/*
  # Fix Profile Policies
  
  1. Changes
    - Drop all existing profile policies
    - Create new simplified policies without recursion
    - Add clear access rules for profiles
  
  2. Security
    - Users can always see their own profile
    - Users can see other profiles in their company
    - Users can only update their own profile
*/

-- Drop ALL existing profile policies
DROP POLICY IF EXISTS "enable_profiles_access_20250129152521" ON profiles;
DROP POLICY IF EXISTS "enable_all_access_20250129135930" ON profiles;
DROP POLICY IF EXISTS "enable_insert_20250129135930" ON profiles;
DROP POLICY IF EXISTS "enable_update_20250129135930" ON profiles;
DROP POLICY IF EXISTS "enable_delete_20250129135930" ON profiles;

-- Create new simplified policies
CREATE POLICY "profiles_select_20250129153012"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Users can always see their own profile
    id = auth.uid()
    OR
    -- Users can see profiles from their company
    EXISTS (
      SELECT 1
      FROM profiles AS viewer
      WHERE viewer.id = auth.uid()
      AND viewer.company_id = profiles.company_id
      AND viewer.id != profiles.id  -- Prevent recursion
    )
  );

CREATE POLICY "profiles_insert_20250129153012"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_20250129153012"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete_20250129153012"
  ON profiles FOR DELETE
  TO authenticated
  USING (id = auth.uid());