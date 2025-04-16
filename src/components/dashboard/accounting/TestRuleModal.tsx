import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, Brain, CheckCircle, AlertTriangle } from 'lucide-react';

interface TestRuleModalProps {
  onClose: () => void;
}

interface TestResult {
  rule_id: string;
  name: string;
  confidence: number;
  category: string;
}

export function TestRuleModal({ onClose }: TestRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [transaction, setTransaction] = useState({
    description: '',
    amount: '',
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    category: '',
    vendor: ''
  });

  const testTransaction = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const { data, error: testError } = await supabase.functions.invoke('test-transaction-rules', {
        body: {
          transaction: {
            ...transaction,
            amount: parseFloat(transaction.amount)
          }
        }
      });

      if (testError) throw testError;
      setResults(data.matched_rules);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Test Transaction Rules</h3>
            <p className="mt-1 text-sm text-gray-500">
              Enter a sample transaction to test against all rules
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Transaction Form */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={transaction.description}
                onChange={(e) => setTransaction({ ...transaction, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={transaction.amount}
                onChange={(e) => setTransaction({ ...transaction, amount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={transaction.type}
                onChange={(e) => setTransaction({ ...transaction, type: e.target.value })}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={transaction.date}
                onChange={(e) => setTransaction({ ...transaction, date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={transaction.category}
                onChange={(e) => setTransaction({ ...transaction, category: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Vendor
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={transaction.vendor}
                onChange={(e) => setTransaction({ ...transaction, vendor: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={testTransaction}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Brain className="h-4 w-4 mr-2" />
              {loading ? 'Testing...' : 'Test Rules'}
            </button>
          </div>

          {/* Results */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Matching Rules</h4>
              {results.length === 0 ? (
                <p className="text-sm text-gray-500">No rules matched this transaction.</p>
              ) : (
                <div className="space-y-4">
                  {results.map((result) => (
                    <div key={result.rule_id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900">{result.name}</h5>
                          <p className="text-sm text-gray-500">Category: {result.category}</p>
                        </div>
                        <div className="flex items-center">
                          <div className="h-2 w-16 bg-gray-200 rounded-full mr-2">
                            <div
                              className="h-2 bg-green-500 rounded-full"
                              style={{ width: `${result.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {(result.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}