/*
  # Fix profiles table RLS policies with materialized approach
  
  1. Changes
    - Drop all existing profile policies
    - Create new policies using materialized subquery
    - Simplify access rules to prevent recursion
  
  2. Security
    - Users can see their own profile
    - Users can see profiles from their company
    - Users can only update their own profile
*/

-- Drop ALL possible existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert profiles with matching auth id" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_view_20250129135749" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_20250129135749" ON profiles;
DROP POLICY IF EXISTS "profiles_update_20250129135749" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_20250129135749" ON profiles;
DROP POLICY IF EXISTS "profiles_view_20250129135817" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_20250129135817" ON profiles;
DROP POLICY IF EXISTS "profiles_update_20250129135817" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_20250129135817" ON profiles;

-- Create new policies with materialized approach
CREATE POLICY "profiles_view_20250129135920"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid()
      ) AS user_company
      WHERE 
        -- Allow access if it's the user's own profile
        profiles.id = auth.uid()
        OR 
        -- Or if they belong to the same company
        profiles.company_id = user_company.company_id
    )
  );

CREATE POLICY "profiles_insert_20250129135920"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_20250129135920"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_delete_20250129135920"
  ON profiles FOR DELETE
  TO authenticated
  USING (id = auth.uid());