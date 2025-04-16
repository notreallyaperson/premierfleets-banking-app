/*
  # Fix RLS policies for profiles and companies
  
  1. Changes
    - Drop and recreate companies RLS policies with proper access rules
    - Update profiles policies to handle new user creation
  
  2. Security
    - Allow users to see their own company
    - Allow profile creation during signup
    - Maintain company data isolation
*/

-- Drop existing company policies
DROP POLICY IF EXISTS "enable_company_access" ON companies;

-- Create new company policies
CREATE POLICY "companies_select_policy" ON companies
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "companies_insert_policy" ON companies
FOR INSERT TO authenticated
WITH CHECK (true);  -- Allow company creation during signup

-- Drop existing profile policies
DROP POLICY IF EXISTS "enable_read_access" ON profiles;
DROP POLICY IF EXISTS "enable_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "enable_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "enable_delete_own_profile" ON profiles;

-- Create new profile policies
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() OR  -- Can always see own profile
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())  -- Can see profiles in same company
);

CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());  -- Can only create own profile

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());  -- Can only update own profile

CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE TO authenticated
USING (id = auth.uid());  -- Can only delete own profile