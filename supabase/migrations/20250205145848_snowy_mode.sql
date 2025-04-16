-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload bills" ON storage.objects;
DROP POLICY IF EXISTS "Users can view bills from their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company's bills" ON storage.objects;

-- Create storage bucket for bills if it doesn't exist
DO $$ 
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('bills', 'bills', false)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN others THEN null;
END $$;

-- Storage policies for bills bucket
CREATE POLICY "bills_bucket_insert_policy"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bills' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "bills_bucket_select_policy"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bills' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "bills_bucket_delete_policy"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bills' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_name 
  ON storage.objects (bucket_id, name);