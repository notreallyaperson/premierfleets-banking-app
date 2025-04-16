import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Upload, FileText, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface MaintenanceDocumentUploadProps {
  serviceRecordId?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function MaintenanceDocumentUpload({ 
  serviceRecordId, 
  onSuccess,
  onClose 
}: MaintenanceDocumentUploadProps) {
  const { profile } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<'receipt' | 'invoice' | 'estimate' | 'work_order'>('receipt');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !profile?.company_id) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${profile.company_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('maintenance-docs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('maintenance-docs')
        .getPublicUrl(filePath);

      // 3. Create document record
      const { data: docData, error: docError } = await supabase
        .from('maintenance_documents')
        .insert([{
          company_id: profile.company_id,
          service_record_id: serviceRecordId,
          uploaded_by: profile.id,
          file_name: file.name,
          file_type: file.type,
          file_url: publicUrl,
          document_type: documentType,
          status: 'pending',
          analysis_status: 'processing'
        }])
        .select()
        .single();

      if (docError) throw docError;

      // 4. Start document analysis
      setAnalyzing(true);
      const { data: analysisData, error: analysisError } = await supabase.functions
        .invoke('analyze-document', {
          body: { 
            url: publicUrl,
            type: 'maintenance_record',
            document_id: docData.id
          }
        });

      if (analysisError) throw analysisError;

      // 5. Update document with analysis results
      const { error: updateError } = await supabase
        .from('maintenance_documents')
        .update({
          analysis_status: 'completed',
          extracted_data: analysisData.extracted_data,
          confidence_score: analysisData.confidence_score
        })
        .eq('id', docData.id);

      if (updateError) throw updateError;

      onSuccess?.();
      onClose?.();
    } catch (err: any) {
      console.error('Error processing document:', err);
      setError(err.message);
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="max-w-xl mx-auto">
          {/* Document Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as any)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="receipt">Receipt</option>
              <option value="invoice">Invoice</option>
              <option value="estimate">Estimate</option>
              <option value="work_order">Work Order</option>
            </select>
          </div>

          {/* Upload Section */}
          <div className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
            <div className="mb-4">
              <Upload className="h-12 w-12 text-gray-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                Upload Maintenance Document
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload receipts, invoices, or work orders for AI analysis
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Select File
              </label>
            </div>
          </div>

          {/* Selected File */}
          {file && (
            <div className="mt-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-900">
                    {file.name}
                  </span>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploading || analyzing}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Uploading...
                    </>
                  ) : analyzing ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    'Process Document'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}