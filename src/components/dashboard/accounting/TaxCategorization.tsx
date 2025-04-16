import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { FileText, CheckCircle, AlertTriangle, Brain, RefreshCw, Filter, Download } from 'lucide-react';

interface TaxCategory {
  id: string;
  transaction_id: string;
  tax_category: string;
  tax_year: number;
  amount: number;
  is_ai_categorized: boolean;
  confidence_score: number;
  verified: boolean;
  transaction: {
    date: string;
    description: string;
    amount: number;
    type: string;
  };
}

export function TaxCategorization() {
  const { profile } = useAuthStore();
  const [categories, setCategories] = useState<TaxCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [filters, setFilters] = useState({
    taxYear: new Date().getFullYear(),
    verified: 'all',
    category: ''
  });

  useEffect(() => {
    if (profile?.company_id) {
      fetchCategories();
    }
  }, [profile, filters]);

  const fetchCategories = async () => {
    try {
      let query = supabase
        .from('tax_categorizations')
        .select(`
          *,
          transaction:transactions (
            date,
            description,
            amount,
            type
          )
        `)
        .eq('company_id', profile!.company_id)
        .eq('tax_year', filters.taxYear);

      if (filters.verified !== 'all') {
        query = query.eq('verified', filters.verified === 'verified');
      }
      if (filters.category) {
        query = query.eq('tax_category', filters.category);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (data) setCategories(data);
    } catch (error) {
      console.error('Error fetching tax categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeTransactions = async () => {
    setAnalyzing(true);
    try {
      // Fetch uncategorized transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', profile!.company_id)
        .not('id', 'in', categories.map(c => c.transaction_id))
        .order('date', { ascending: false });

      if (transactions) {
        // Analyze each transaction
        for (const transaction of transactions) {
          const { data: analysis } = await supabase.functions.invoke('analyze-transaction', {
            body: { transaction, type: 'categorize' }
          });

          if (analysis) {
            // Create tax categorization
            await supabase
              .from('tax_categorizations')
              .insert([{
                company_id: profile!.company_id,
                transaction_id: transaction.id,
                tax_category: analysis.category,
                tax_year: new Date(transaction.date).getFullYear(),
                amount: transaction.amount,
                is_ai_categorized: true,
                confidence_score: analysis.confidence,
                verified: false
              }]);
          }
        }

        fetchCategories();
      }
    } catch (error) {
      console.error('Error analyzing transactions:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleVerify = async (categoryId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('tax_categorizations')
        .update({ verified })
        .eq('id', categoryId);

      if (error) throw error;
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleUpdateCategory = async (categoryId: string, newCategory: string) => {
    try {
      const { error } = await supabase
        .from('tax_categorizations')
        .update({ tax_category: newCategory })
        .eq('id', categoryId);

      if (error) throw error;
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateTotals = () => {
    return categories.reduce((acc, cat) => {
      if (!acc[cat.tax_category]) {
        acc[cat.tax_category] = 0;
      }
      acc[cat.tax_category] += cat.amount;
      return acc;
    }, {} as Record<string, number>);
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Tax Categorization</h2>
        <div className="flex space-x-4">
          <button
            onClick={analyzeTransactions}
            disabled={analyzing}
            className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Brain className="w-4 h-4 mr-2" />
            {analyzing ? 'Analyzing...' : 'Analyze Transactions'}
          </button>
          <button
            onClick={() => {}} // TODO: Implement export
            className="flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tax Year</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filters.taxYear}
              onChange={(e) => setFilters({ ...filters, taxYear: parseInt(e.target.value) })}
            >
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Verification Status</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filters.verified}
              onChange={(e) => setFilters({ ...filters, verified: e.target.value })}
            >
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">All Categories</option>
              <option value="vehicle_expenses">Vehicle Expenses</option>
              <option value="equipment">Equipment</option>
              <option value="supplies">Supplies</option>
              <option value="insurance">Insurance</option>
              <option value="utilities">Utilities</option>
              <option value="professional_services">Professional Services</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Category Totals</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(totals).map(([category, total]) => (
            <div key={category} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-900">{category}</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {formatCurrency(total)}
                  </p>
                </div>
                <div className="bg-white p-2 rounded-full">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No categories found
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">
                          {category.transaction.description}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(category.transaction.date).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        className="text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={category.tax_category}
                        onChange={(e) => handleUpdateCategory(category.id, e.target.value)}
                      >
                        <option value="vehicle_expenses">Vehicle Expenses</option>
                        <option value="equipment">Equipment</option>
                        <option value="supplies">Supplies</option>
                        <option value="insurance">Insurance</option>
                        <option value="utilities">Utilities</option>
                        <option value="professional_services">Professional Services</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="other">Other</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {formatCurrency(category.amount)}
                    </td>
                    <td className="px-6 py-4">
                      {category.is_ai_categorized && (
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${category.confidence_score * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-500">
                            {(category.confidence_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        category.verified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {category.verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleVerify(category.id, !category.verified)}
                        className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                          category.verified
                            ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200'
                            : 'text-green-700 bg-green-100 hover:bg-green-200'
                        }`}
                      >
                        {category.verified ? 'Unverify' : 'Verify'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}