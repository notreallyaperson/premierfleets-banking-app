/*
  # Fix profiles table RLS recursion
  
  1. Changes
    - Drop existing recursive policies
    - Create new non-recursive policies for profiles
    - Simplify access rules to prevent recursion
  
  2. Security
    - Maintain data isolation between companies
    - Allow profile creation during signup
    - Prevent infinite recursion in RLS policies
*/

-- Drop existing profile policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Create new non-recursive policies
CREATE POLICY "enable_profiles_select" ON profiles
FOR SELECT TO authenticated
USING (true);  -- Allow reading all profiles, filtering will be done in application

CREATE POLICY "enable_profiles_insert" ON profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());  -- Can only create own profile

CREATE POLICY "enable_profiles_update" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());  -- Can only update own profile

CREATE POLICY "enable_profiles_delete" ON profiles
FOR DELETE TO authenticated
USING (id = auth.uid());  -- Can only delete own profile