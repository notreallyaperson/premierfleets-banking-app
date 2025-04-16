import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Plus, Settings, AlertTriangle, CheckCircle, Brain } from 'lucide-react';

interface TransactionRule {
  id: string;
  company_id: string;
  name: string;
  conditions: {
    field: string;
    operator: string;
    value: string;
  }[];
  actions: {
    field: string;
    value: string;
  }[];
  is_ai_generated: boolean;
  confidence_score?: number;
  created_at: string;
  last_applied: string;
  times_applied: number;
}

export function TransactionRules() {
  const { profile } = useAuthStore();
  const [rules, setRules] = useState<TransactionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generatingRules, setGeneratingRules] = useState(false);

  useEffect(() => {
    if (profile?.company_id) {
      fetchRules();
    }
  }, [profile]);

  async function fetchRules() {
    try {
      const { data, error } = await supabase
        .from('transaction_rules')
        .select('*')
        .eq('company_id', profile!.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setRules(data);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  }

  const generateAIRules = async () => {
    setGeneratingRules(true);
    try {
      // Call Edge Function to analyze transactions and generate rules
      const { data, error } = await supabase.functions.invoke('generate-transaction-rules', {
        body: { company_id: profile!.company_id }
      });

      if (error) throw error;
      
      // Refresh rules list
      fetchRules();
    } catch (error) {
      console.error('Error generating rules:', error);
    } finally {
      setGeneratingRules(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Transaction Rules</h2>
        <div className="flex space-x-4">
          <button
            onClick={generateAIRules}
            disabled={generatingRules}
            className="flex items-center px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <Brain className="w-4 h-4 mr-2" />
            {generatingRules ? 'Analyzing...' : 'Generate AI Rules'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Rule
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rule Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conditions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Applied
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Loading rules...
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No rules found. Create one or generate AI rules to get started.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {rule.name}
                          </div>
                          {rule.is_ai_generated && (
                            <div className="flex items-center mt-1">
                              <Brain className="h-4 w-4 text-purple-500 mr-1" />
                              <span className="text-xs text-purple-600">
                                AI Generated
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {rule.conditions.map((condition, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            {condition.field} {condition.operator} {condition.value}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {rule.actions.map((action, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            Set {action.field} to {action.value}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {rule.confidence_score ? (
                          <div className="flex items-center">
                            <div className="h-2 w-16 bg-gray-200 rounded-full mr-2">
                              <div
                                className="h-2 bg-green-500 rounded-full"
                                style={{ width: `${rule.confidence_score}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">
                              {rule.confidence_score}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">
                            {rule.times_applied} applications
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(rule.last_applied).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Rule Modal */}
      {showCreateModal && (
        <CreateRuleModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchRules();
          }}
        />
      )}
    </div>
  );
}

interface CreateRuleModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateRuleModal({ onClose, onSuccess }: CreateRuleModalProps) {
  const { profile } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    conditions: [{ field: '', operator: '', value: '' }],
    actions: [{ field: '', value: '' }]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('transaction_rules')
        .insert([
          {
            company_id: profile!.company_id,
            name: formData.name,
            conditions: formData.conditions,
            actions: formData.actions,
            is_ai_generated: false,
            times_applied: 0,
            last_applied: new Date().toISOString()
          }
        ]);

      if (insertError) throw insertError;
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Rule</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rule Name
            </label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Conditions
            </label>
            {formData.conditions.map((condition, index) => (
              <div key={index} className="mt-2 grid grid-cols-3 gap-4">
                <select
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={condition.field}
                  onChange={(e) => {
                    const newConditions = [...formData.conditions];
                    newConditions[index].field = e.target.value;
                    setFormData({ ...formData, conditions: newConditions });
                  }}
                  required
                >
                  <option value="">Select Field</option>
                  <option value="description">Description</option>
                  <option value="amount">Amount</option>
                  <option value="type">Type</option>
                </select>
                <select
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={condition.operator}
                  onChange={(e) => {
                    const newConditions = [...formData.conditions];
                    newConditions[index].operator = e.target.value;
                    setFormData({ ...formData, conditions: newConditions });
                  }}
                  required
                >
                  <option value="">Select Operator</option>
                  <option value="contains">Contains</option>
                  <option value="equals">Equals</option>
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                </select>
                <input
                  type="text"
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Value"
                  value={condition.value}
                  onChange={(e) => {
                    const newConditions = [...formData.conditions];
                    newConditions[index].value = e.target.value;
                    setFormData({ ...formData, conditions: newConditions });
                  }}
                  required
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFormData({
                ...formData,
                conditions: [...formData.conditions, { field: '', operator: '', value: '' }]
              })}
              className="mt-2 text-sm text-blue-600 hover:text-blue-500"
            >
              + Add Condition
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Actions
            </label>
            {formData.actions.map((action, index) => (
              <div key={index} className="mt-2 grid grid-cols-2 gap-4">
                <select
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={action.field}
                  onChange={(e) => {
                    const newActions = [...formData.actions];
                    newActions[index].field = e.target.value;
                    setFormData({ ...formData, actions: newActions });
                  }}
                  required
                >
                  <option value="">Select Field</option>
                  <option value="category">Category</option>
                  <option value="tags">Tags</option>
                </select>
                <input
                  type="text"
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Value"
                  value={action.value}
                  onChange={(e) => {
                    const newActions = [...formData.actions];
                    newActions[index].value = e.target.value;
                    setFormData({ ...formData, actions: newActions });
                  }}
                  required
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFormData({
                ...formData,
                actions: [...formData.actions, { field: '', value: '' }]
              })}
              className="mt-2 text-sm text-blue-600 hover:text-blue-500"
            >
              + Add Action
            </button>
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
              {loading ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}