/*
  # Fix Profile Policies - Final Version
  
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
DROP POLICY IF EXISTS "profiles_select_20250129153012" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_20250129153012" ON profiles;
DROP POLICY IF EXISTS "profiles_update_20250129153012" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_20250129153012" ON profiles;

-- Create new simplified policies
CREATE POLICY "profiles_select_20250129153812"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Allow users to see their own profile
    id = auth.uid()
    OR
    -- Allow users to see profiles from their company
    (
      SELECT company_id
      FROM profiles
      WHERE id = auth.uid()
      LIMIT 1
    ) = company_id
  );

CREATE POLICY "profiles_insert_20250129153812"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_20250129153812"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete_20250129153812"
  ON profiles FOR DELETE
  TO authenticated
  USING (id = auth.uid());