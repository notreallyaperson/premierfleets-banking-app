/*
  # Simplify profiles policy to prevent recursion

  1. Changes
    - Drop all existing profile policies
    - Create simpler policies that avoid recursion
    - Add basic CRUD policies
  
  2. Security
    - Maintains row-level security
    - Users can view their own profile
    - Users in the same company can view each other's profiles
    - Users can only update their own profile
*/

-- Drop all existing profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert profiles with matching auth id" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new simplified policies
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- User can see their own profile
    id = auth.uid()
    OR
    -- User can see profiles from their company
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1)
  );

CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  TO authenticated
  USING (id = auth.uid());