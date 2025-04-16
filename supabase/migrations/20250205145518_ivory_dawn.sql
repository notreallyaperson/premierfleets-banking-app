-- Create storage bucket for bills if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('bills', 'bills', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for bills bucket
CREATE POLICY "Users can upload bills"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bills' AND
    (storage.foldername(name))[1] = (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view bills from their company"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bills' AND
    (storage.foldername(name))[1] = (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's bills"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bills' AND
    (storage.foldername(name))[1] = (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );