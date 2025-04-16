import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Upload, FileText, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface VehicleInfo {
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  mileage?: number;
}

interface LoanInfo {
  fundDate?: string;
  paymentAmount?: number;
  termMonths?: number;
  interestRate?: number;
}

interface AnalysisResult {
  status: 'success' | 'error';
  summary: string;
  key_points: string[];
  recommendations: string[];
  risk_factors: string[];
  error?: string;
  extracted_data?: {
    vehicle_info: VehicleInfo | null;
    loan_info: LoanInfo | null;
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(selectedFile.type)) {
        setError('Please upload a PDF, JPEG, or PNG file');
        return;
      }
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const analyzeDocument = async () => {
    if (!file || !profile?.company_id) {
      setError('Please select a file to analyze');
      return;
    }

    setUploading(true);
    setAnalyzing(false);
    setError(null);
    setCanRetry(false);
    let documentId: string | null = null;
    let analysisId: string | null = null;
    let uploadedFilePath: string | null = null;

    try {
      // 1. Check network connectivity
      if (!navigator.onLine) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      // 2. Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No active session');

      // 3. Upload file
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${profile.company_id}/fleet/${fileName}`;
      uploadedFilePath = filePath;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setUploading(false);
      setAnalyzing(true);

      // 4. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 5. Create document record
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .insert([{
          company_id: profile.company_id,
          user_id: profile.id,
          name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          category: 'fleet_document'
        }])
        .select()
        .single();

      if (documentError) {
        throw new Error(`Failed to create document record: ${documentError.message}`);
      }

      documentId = documentData.id;

      // 6. Create analysis record
      const { data: analysisData, error: analysisError } = await supabase
        .from('document_analyses')
        .insert([{
          document_id: documentId,
          company_id: profile.company_id,
          user_id: profile.id,
          analysis_type: 'fleet_document',
          status: 'processing'
        }])
        .select()
        .single();

      if (analysisError) {
        throw new Error(`Failed to create analysis record: ${analysisError.message}`);
      }

      analysisId = analysisData.id;

      // 7. Call Edge Function with proper error handling
      const { data: analysisResult, error: functionError } = await supabase.functions.invoke('analyze-document', {
        body: { 
          url: publicUrl,
          type: 'fleet_document',
          document_id: documentId,
          analysis_id: analysisId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (functionError) throw functionError;
      if (!analysisResult) throw new Error('No response from analysis service');

      // 8. Update analysis record with results
      const { error: updateError } = await supabase
        .from('document_analyses')
        .update({
          status: 'completed',
          summary: analysisResult.summary,
          key_points: analysisResult.key_points,
          recommendations: analysisResult.recommendations,
          risk_factors: analysisResult.risk_factors,
          raw_analysis: analysisResult
        })
        .eq('id', analysisId);

      if (updateError) throw updateError;

      setResult(analysisResult as AnalysisResult);
      setRetryCount(0);
      setCanRetry(false);

    } catch (err: any) {
      console.error('Document analysis error:', err);
      
      // Show user-friendly error message
      setError(err.message);

      // Update analysis record if it exists
      if (analysisId) {
        await supabase
          .from('document_analyses')
          .update({
            status: 'failed',
            error_message: err.message
          })
          .eq('id', analysisId);
      }

      // Clean up on non-retryable errors
      if (!canRetry) {
        // Clean up uploaded file
        if (uploadedFilePath) {
          await supabase.storage
            .from('documents')
            .remove([uploadedFilePath]);
        }

        // Delete document record
        if (documentId) {
          await supabase
            .from('documents')
            .delete()
            .eq('id', documentId);
        }
      }
    } finally {
      setUploading(false);
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
                {/* Extracted Vehicle Info */}
                {result.extracted_data?.vehicle_info && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-medium text-blue-900 mb-2">
                          Vehicle Information
                        </h4>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <dt className="text-gray-500">Year</dt>
                            <dd className="font-medium text-gray-900">
                              {result.extracted_data.vehicle_info.year}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Make</dt>
                            <dd className="font-medium text-gray-900">
                              {result.extracted_data.vehicle_info.make}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Model</dt>
                            <dd className="font-medium text-gray-900">
                              {result.extracted_data.vehicle_info.model}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">VIN</dt>
                            <dd className="font-medium text-gray-900">
                              {result.extracted_data.vehicle_info.vin}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Mileage</dt>
                            <dd className="font-medium text-gray-900">
                              {result.extracted_data.vehicle_info.mileage?.toLocaleString()}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
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