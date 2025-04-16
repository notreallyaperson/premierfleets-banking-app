import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Upload, FileText, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface AnalysisResult {
  summary: string;
  key_points: string[];
  recommendations: string[];
  risk_factors: string[];
  status: 'success' | 'error';
  extracted_data?: {
    vendor_name?: string;
    amount?: number;
    date?: string;
    due_date?: string;
    line_items?: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
    }>;
    tax_amount?: number;
    payment_terms?: string;
  };
}

interface DocumentAnalysisProps {
  onClose: () => void;
}

export function DocumentAnalysis({ onClose }: DocumentAnalysisProps) {
  const { profile } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [canRetry, setCanRetry] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(selectedFile.type)) {
        setError('Please upload a PDF or image file');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setCanRetry(false);
      
      // Upload file immediately when selected
      await handleUpload(selectedFile);
    }
  };

  const handleUpload = async (selectedFile: File) => {
    if (!profile?.company_id) {
      setError('No company profile found');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${profile.company_id}/documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 3. Create document record
      const { data: document, error: documentError } = await supabase
        .from('documents')
        .insert([{
          company_id: profile.company_id,
          user_id: profile.id,
          name: selectedFile.name,
          file_url: publicUrl,
          file_type: selectedFile.type,
          category: 'pending_analysis'
        }])
        .select()
        .single();

      if (documentError) throw documentError;

      // Store document ID for analysis
      setDocumentId(document.id);
      setUploading(false);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message);
      setUploading(false);
    }
  };

  const analyzeDocument = async () => {
    if (!file || !documentId) {
      setError('Please select a file to analyze');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No active session');

      // Get document URL
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;

      // Call Edge Function to analyze document
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-document', {
        body: { 
          url: document.file_url,
          type: 'document',
          document_id: documentId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (analysisError) throw analysisError;
      if (!analysisResult) throw new Error('No analysis results received');

      setResult(analysisResult as AnalysisResult);
      setRetryCount(0);
      setCanRetry(false);

    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message);
      setCanRetry(true);
      setRetryCount(prev => prev + 1);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-xl mx-auto">
        {/* Upload Section */}
        <div className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
          <div className="mb-4">
            <Upload className="h-12 w-12 text-gray-400" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Upload Document for Analysis
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Upload PDF documents or images (JPEG, PNG) for AI analysis
            </p>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
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
              {documentId && (
                <button
                  onClick={analyzeDocument}
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
                  ) : retryCount > 0 ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2" />
                      Retry Analysis
                    </>
                  ) : (
                    'Analyze Document'
                  )}
                </button>
              )}
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
                {canRetry && (
                  <button
                    onClick={analyzeDocument}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Click to try again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {result && result.status === 'success' && (
          <div className="mt-6 bg-white rounded-lg border">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Analysis Results
                </h3>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>

              <div className="space-y-4">
                {/* Extracted Data */}
                {result.extracted_data && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                      Extracted Information
                    </h4>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {result.extracted_data.vendor_name && (
                        <div>
                          <dt className="text-sm text-gray-500">Vendor</dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {result.extracted_data.vendor_name}
                          </dd>
                        </div>
                      )}
                      {result.extracted_data.amount && (
                        <div>
                          <dt className="text-sm text-gray-500">Amount</dt>
                          <dd className="text-sm font-medium text-gray-900">
                            ${result.extracted_data.amount.toLocaleString()}
                          </dd>
                        </div>
                      )}
                      {result.extracted_data.date && (
                        <div>
                          <dt className="text-sm text-gray-500">Date</dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {new Date(result.extracted_data.date).toLocaleDateString()}
                          </dd>
                        </div>
                      )}
                      {result.extracted_data.due_date && (
                        <div>
                          <dt className="text-sm text-gray-500">Due Date</dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {new Date(result.extracted_data.due_date).toLocaleDateString()}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                {/* Summary */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Summary
                  </h4>
                  <p className="text-sm text-gray-600">{result.summary}</p>
                </div>

                {/* Key Points */}
                {result.key_points.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Key Points
                    </h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {result.key_points.map((point, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Recommendations
                    </h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {result.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risk Factors */}
                {result.risk_factors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Risk Factors
                    </h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {result.risk_factors.map((risk, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}