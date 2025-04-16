import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Search, Filter, Calendar, Truck, DollarSign, PenTool as Tool, FileText, Calculator, Plus, X, FileCheck } from 'lucide-react';
import { DocumentAnalysis } from './DocumentAnalysis';

interface Document {
  id: string;
  name: string;
  description: string;
  file_url: string;
  file_type: string;
  category: string;
  tags: string[];
  created_at: string;
  vehicle_id?: string;
  analysis_result?: any;
}

export function Documents() {
  const { profile } = useAuthStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [filters, setFilters] = useState({
    category: '',
    startDate: '',
    endDate: '',
    search: '',
    vehicleId: ''
  });

  useEffect(() => {
    if (profile?.company_id) {
      fetchDocuments();
    }
  }, [profile, filters]);

  const fetchDocuments = async () => {
    try {
      let query = supabase
        .from('documents')
        .select(`
          *,
          vehicle:vehicles (
            make,
            model,
            year,
            vin
          )
        `)
        .eq('company_id', profile!.company_id)
        .order('created_at', { ascending: false });

      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters.vehicleId) {
        query = query.eq('vehicle_id', filters.vehicleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (data) setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const documentCategories = [
    { id: 'contracts', name: 'Purchase Contracts', icon: FileCheck },
    { id: 'invoices', name: 'Paid Invoices', icon: DollarSign },
    { id: 'maintenance', name: 'Maintenance Reports', icon: Tool },
    { id: 'loans', name: 'Loan Documents', icon: Calculator },
    { id: 'tax', name: 'Tax Documents', icon: FileText },
    { id: 'registration', name: 'Vehicle Registration', icon: Truck }
  ];

  const getDocumentIcon = (category: string) => {
    const found = documentCategories.find(c => c.id === category);
    return found?.icon || FileText;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Document Management</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage and analyze your fleet documents.
          </p>
        </div>
        <button
          onClick={() => setShowAnalysisModal(true)}
          className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <FileText className="w-4 h-4 mr-2" />
          Analyze Document
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div>
            <select
              className="w-full p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">All Categories</option>
              {documentCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-2">
            <input
              type="date"
              className="w-full p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
            <input
              type="date"
              className="w-full p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Document Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {documentCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setFilters({ ...filters, category: category.id })}
            className={`p-4 rounded-lg shadow-sm transition-colors ${
              filters.category === category.id
                ? 'bg-blue-50 border-2 border-blue-500'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex flex-col items-center">
              <category.icon className={`h-8 w-8 ${
                filters.category === category.id ? 'text-blue-500' : 'text-gray-400'
              }`} />
              <span className="mt-2 text-sm font-medium text-gray-900">
                {category.name}
              </span>
              <span className="mt-1 text-xs text-gray-500">
                {documents.filter(d => d.category === category.id).length} documents
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Loading documents...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No documents found
                  </td>
                </tr>
              ) : (
                documents.map((document) => {
                  const Icon = getDocumentIcon(document.category);
                  return (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Icon className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {document.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {document.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-blue-100 text-blue-800">
                          {document.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {document.vehicle?.year} {document.vehicle?.make} {document.vehicle?.model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(document.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => window.open(document.file_url, '_blank')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = document.file_url;
                              link.download = document.name;
                              link.click();
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">Document Analysis</h2>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <DocumentAnalysis onClose={() => setShowAnalysisModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}