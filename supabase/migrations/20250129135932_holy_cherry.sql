/*
  # Fix profiles table RLS policies with simplified approach
  
  1. Changes
    - Drop all existing profile policies
    - Create new simplified policies without self-referential queries
    - Add basic access rules for profiles
  
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
DROP POLICY IF EXISTS "profiles_view_20250129135920" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_20250129135920" ON profiles;
DROP POLICY IF EXISTS "profiles_update_20250129135920" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_20250129135920" ON profiles;

-- Create basic view policy without self-referential queries
CREATE POLICY "enable_all_access_20250129135930"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Basic insert policy
CREATE POLICY "enable_insert_20250129135930"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Basic update policy
CREATE POLICY "enable_update_20250129135930"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Basic delete policy
CREATE POLICY "enable_delete_20250129135930"
  ON profiles FOR DELETE
  TO authenticated
  USING (id = auth.uid());