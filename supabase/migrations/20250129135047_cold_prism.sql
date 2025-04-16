/*
  # Add test company

  1. New Data
    - Create test company for demo purposes
  
  2. Security
    - No changes to security policies
*/

-- Insert test company
INSERT INTO companies (id, name)
VALUES (
  'e52869a7-4f5d-4f19-b25f-2dc0e9aa0226',
  'Test Fleet Company'
)
ON CONFLICT (id) DO NOTHING;