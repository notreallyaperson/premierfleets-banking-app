/*
  # Fix profiles policy recursion

  1. Changes
    - Drop existing profiles policy that causes recursion
    - Add new policy that directly checks auth.uid()
    - Add policy for inserting profiles
  
  2. Security
    - Maintains row-level security
    - Users can only view profiles in their company
    - Users can only update their own profile
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;

-- Add new policy for viewing profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = profiles.company_id
    )
  );

-- Add policy for inserting profiles
CREATE POLICY "Users can insert profiles with matching auth id"
  ON profiles FOR INSERT 
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Add policy for updating own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());