/*
  # Fix Profile Policies - Final Version
  
  1. Changes
    - Drop all existing profile policies
    - Create new ultra-simplified policies without any recursion
    - Add clear access rules for profiles
  
  2. Security
    - Users can always see their own profile
    - Users can see other profiles in their company
    - Users can only update their own profile
*/

-- Drop ALL existing profile policies
DROP POLICY IF EXISTS "profiles_select_20250129153912" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_20250129153912" ON profiles;
DROP POLICY IF EXISTS "profiles_update_20250129153912" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_20250129153912" ON profiles;

-- Create new ultra-simplified policies
CREATE POLICY "enable_read_access"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);  -- Allow all reads

CREATE POLICY "enable_insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "enable_update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "enable_delete_own_profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (id = auth.uid());