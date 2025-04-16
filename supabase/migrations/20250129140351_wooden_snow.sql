/*
  # Storage Setup for Documents
  
  1. Storage
    - Create documents bucket
    - Set up storage policies
*/

-- Create storage bucket for documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view documents from their company"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );