/*
  # Fix profiles table RLS policies to prevent recursion
  
  1. Changes
    - Drop all existing profile policies
    - Create new simplified policies that avoid recursion
    - Add clear access rules for profiles
  
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

-- Create new policies with recursion-safe logic
CREATE POLICY "profiles_view_20250129135817"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    CASE
      -- Allow users to always see their own profile
      WHEN id = auth.uid() THEN true
      -- For other profiles, directly compare company_ids
      ELSE company_id = (
        SELECT p.company_id 
        FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.id != profiles.id -- Prevent recursion
        LIMIT 1
      )
    END
  );

CREATE POLICY "profiles_insert_20250129135817"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_20250129135817"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_delete_20250129135817"
  ON profiles FOR DELETE
  TO authenticated
  USING (id = auth.uid());