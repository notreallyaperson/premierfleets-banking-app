-- Drop ALL existing bills bucket policies
DO $$ 
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "bills_bucket_insert_policy" ON storage.objects;
  DROP POLICY IF EXISTS "bills_bucket_select_policy" ON storage.objects;
  DROP POLICY IF EXISTS "bills_bucket_delete_policy" ON storage.objects;
  DROP POLICY IF EXISTS "bills_bucket_insert_policy_20250205150012" ON storage.objects;
  DROP POLICY IF EXISTS "bills_bucket_select_policy_20250205150012" ON storage.objects;
  DROP POLICY IF EXISTS "bills_bucket_delete_policy_20250205150012" ON storage.objects;
  DROP POLICY IF EXISTS "bills_bucket_insert_policy_20250205150411" ON storage.objects;
  DROP POLICY IF EXISTS "bills_bucket_select_policy_20250205150411" ON storage.objects;
  DROP POLICY IF EXISTS "bills_bucket_delete_policy_20250205150411" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

-- Ensure bills bucket exists with proper configuration
DO $$ 
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'bills',
    'bills',
    false,
    10485760, -- 10MB limit
    ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/png'
    ]
  )
  ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/png'
    ];
EXCEPTION
  WHEN others THEN null;
END $$;

-- Create function to get company ID from profile
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT company_id::text 
    FROM profiles 
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new storage policies with unique names
CREATE POLICY "bills_access_20250205150518_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bills' AND
    (storage.foldername(name))[1] = get_user_company_id()
  );

CREATE POLICY "bills_access_20250205150518_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bills' AND
    (storage.foldername(name))[1] = get_user_company_id()
  );

CREATE POLICY "bills_access_20250205150518_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bills' AND
    (storage.foldername(name))[1] = get_user_company_id()
  );

-- Add indexes for better performance
DO $$ 
BEGIN
  CREATE INDEX IF NOT EXISTS idx_storage_objects_bills_bucket 
    ON storage.objects (bucket_id) 
    WHERE bucket_id = 'bills';

  CREATE INDEX IF NOT EXISTS idx_storage_objects_bills_path 
    ON storage.objects (name) 
    WHERE bucket_id = 'bills';
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;