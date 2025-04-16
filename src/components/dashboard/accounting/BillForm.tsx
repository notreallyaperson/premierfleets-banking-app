import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { X, Upload, FileText, AlertTriangle, Loader2 } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  payment_terms: string;
}

interface BillFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function BillForm({ onClose, onSuccess }: BillFormProps) {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    vendor_id: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    amount: '',
    notes: ''
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name, payment_terms')
        .eq('company_id', profile!.company_id)
        .order('name');

      if (error) throw error;
      if (data) setVendors(data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

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
      analyzeBill(selectedFile);
    }
  };

  const analyzeBill = async (billFile: File) => {
    setAnalyzing(true);
    try {
      // 1. Upload file to storage
      const fileExt = billFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${profile!.company_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bills')
        .upload(filePath, billFile);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('bills')
        .getPublicUrl(filePath);

      // 3. Analyze document
      const { data: analysis, error: analysisError } = await supabase.functions
        .invoke('analyze-document', {
          body: { 
            url: publicUrl,
            type: 'bill',
            document_id: null
          }
        });

      if (analysisError) throw analysisError;

      // 4. Update form with extracted data
      if (analysis && analysis.extracted_data) {
        const { vendor_name, amount, bill_date, due_date } = analysis.extracted_data;
        
        // Find vendor by name
        const vendor = vendors.find(v => 
          v.name.toLowerCase().includes(vendor_name.toLowerCase())
        );

        setFormData(prev => ({
          ...prev,
          vendor_id: vendor?.id || prev.vendor_id,
          amount: amount?.toString() || prev.amount,
          bill_date: bill_date || prev.bill_date,
          due_date: due_date || prev.due_date
        }));
      }
    } catch (err: any) {
      console.error('Error analyzing bill:', err);
      setError('Failed to analyze bill. Please enter details manually.');
    } finally {
      setAnalyzing(false);
    }
  };

  const generateBillNumber = () => {
    const prefix = 'BILL';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const billNumber = generateBillNumber();
      const amount = parseFloat(formData.amount);

      // Create bill record
      const { data: bill, error: billError } = await supabase
        .from('accounts_payable')
        .insert([{
          company_id: profile!.company_id,
          vendor_id: formData.vendor_id,
          bill_number: billNumber,
          bill_date: formData.bill_date,
          due_date: formData.due_date,
          amount,
          balance: amount,
          status: 'pending',
          notes: formData.notes
        }])
        .select()
        .single();

      if (billError) throw billError;

      // If file was uploaded, create document record
      if (file && bill) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${billNumber}.${fileExt}`;
        const filePath = `${profile!.company_id}/bills/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        const { error: docError } = await supabase
          .from('documents')
          .insert([{
            company_id: profile!.company_id,
            user_id: profile!.id,
            name: fileName,
            description: `Bill document for ${billNumber}`,
            file_url: publicUrl,
            file_type: file.type,
            category: 'bill',
            related_id: bill.id
          }]);

        if (docError) throw docError;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-gray-900">Create New Bill</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Document Upload */}
        <div className="mb-6">
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
            <div className="mt-4 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-900">
                  {file.name}
                </span>
              </div>
              {analyzing && (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Vendor
            </label>
            <select
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.vendor_id}
              onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
            >
              <option value="">Select Vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Bill Date
            </label>
            <input
              type="date"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.bill_date}
              onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Amount
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                required
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600">
              {error}
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
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}