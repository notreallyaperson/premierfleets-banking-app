import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Upload, FileText, AlertTriangle, Loader2, X } from 'lucide-react';

interface BillUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export function BillUploadModal({ onClose, onSuccess }: BillUploadModalProps) {
  const { profile } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setRetryCount(0);
      analyzeBill(selectedFile);
    }
  };

  const analyzeBill = async (billFile: File) => {
    if (retryCount >= MAX_RETRIES) {
      setError('Failed to process bill after multiple attempts. Please try again.');
      setAnalyzing(false);
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No active session');

      // 1. Upload file to storage
      const fileExt = billFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${profile!.company_id}/bills/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bills')
        .upload(filePath, billFile);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('bills')
        .getPublicUrl(filePath);

      // 3. Analyze document with auth token
      const { data: analysis, error: analysisError } = await supabase.functions.invoke('analyze-document', {
        body: { 
          url: publicUrl,
          type: 'bill',
          document_id: null
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (analysisError) throw analysisError;

      // 4. Create bill record
      if (analysis && analysis.extracted_data) {
        const { vendor_name, amount, bill_date, due_date } = analysis.extracted_data;
        
        // Find or create vendor
        const { data: vendors } = await supabase
          .from('vendors')
          .select('id')
          .ilike('name', `%${vendor_name}%`)
          .limit(1);

        let vendorId;
        if (vendors && vendors.length > 0) {
          vendorId = vendors[0].id;
        } else {
          const { data: newVendor } = await supabase
            .from('vendors')
            .insert([{
              company_id: profile!.company_id,
              name: vendor_name,
              status: 'active'
            }])
            .select()
            .single();
          
          if (newVendor) vendorId = newVendor.id;
        }

        if (vendorId) {
          const billNumber = `BILL-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
          
          const { error: billError } = await supabase
            .from('accounts_payable')
            .insert([{
              company_id: profile!.company_id,
              vendor_id: vendorId,
              bill_number: billNumber,
              bill_date: bill_date || new Date().toISOString(),
              due_date: due_date || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
              amount: amount || 0,
              balance: amount || 0,
              status: 'pending'
            }]);

          if (billError) throw billError;
        }

        onSuccess();
        return;
      }

      throw new Error('Failed to extract data from bill');

    } catch (err: any) {
      console.error('Error processing bill:', err);

      // Handle network errors and timeouts
      if (
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('timeout') ||
        err.message?.includes('network') ||
        err.name === 'FunctionsFetchError' ||
        !navigator.onLine
      ) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          analyzeBill(billFile);
        }, RETRY_DELAY);
        return;
      }

      setError(err.message || 'Failed to process bill. Please try again or enter details manually.');
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-gray-900">Upload Bill</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400">
            <Upload className="h-12 w-12 text-gray-400 mb-4" />
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Upload a bill document (PDF, JPEG, PNG)
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                id="bill-upload"
              />
              <label
                htmlFor="bill-upload"
                className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Select File
              </label>
            </div>
          </div>

          {file && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-900">
                  {file.name}
                </span>
              </div>
              {analyzing && (
                <div className="flex items-center">
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin mr-2" />
                  {retryCount > 0 && (
                    <span className="text-sm text-gray-500">
                      Retry {retryCount}/{MAX_RETRIES}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}