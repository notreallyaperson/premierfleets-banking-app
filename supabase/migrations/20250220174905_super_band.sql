-- Add new columns to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'parent'
  CHECK (type IN ('parent', 'subsidiary')),
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_companies_parent_id ON companies(parent_id);

-- Update test company data
UPDATE companies
SET 
  type = 'parent',
  metadata = jsonb_build_object(
    'fleet_size', 10,
    'location', 'Headquarters',
    'business_unit', 'Main Fleet'
  )
WHERE id = 'e52869a7-4f5d-4f19-b25f-2dc0e9aa0226';

-- Insert a sample subsidiary
INSERT INTO companies (
  name,
  parent_id,
  type,
  metadata
) VALUES (
  'West Coast Fleet Division',
  'e52869a7-4f5d-4f19-b25f-2dc0e9aa0226',
  'subsidiary',
  jsonb_build_object(
    'fleet_size', 5,
    'location', 'Los Angeles, CA',
    'business_unit', 'Regional Fleet'
  )
);