import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { X, Plus, Trash2 } from 'lucide-react';

interface CreateRuleModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateRuleModal({ onClose, onSuccess }: CreateRuleModalProps) {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pattern: {
      conditions: [{
        field: '',
        operator: 'equals',
        value: ''
      }],
      amount_range: {
        min: null,
        max: null
      },
      frequency_pattern: {
        type: ''
      }
    },
    category: '',
    priority: 0,
    rule_type: 'standard',
    tags: [] as string[]
  });

  const addCondition = () => {
    setFormData({
      ...formData,
      pattern: {
        ...formData.pattern,
        conditions: [
          ...formData.pattern.conditions,
          { field: '', operator: 'equals', value: '' }
        ]
      }
    });
  };

  const removeCondition = (index: number) => {
    if (formData.pattern.conditions.length > 1) {
      const newConditions = [...formData.pattern.conditions];
      newConditions.splice(index, 1);
      setFormData({
        ...formData,
        pattern: {
          ...formData.pattern,
          conditions: newConditions
        }
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('transaction_rules')
        .insert([{
          ...formData,
          company_id: profile!.company_id,
          confidence_score: 1.0,
          is_ai_generated: false,
          times_applied: 0
        }]);

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
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-gray-900">Create New Rule</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rule Name
            </label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Pattern Matching */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-900">Conditions</h4>
              <button
                type="button"
                onClick={addCondition}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Condition
              </button>
            </div>

            {formData.pattern.conditions.map((condition, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Field"
                  required
                  className="block w-1/3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={condition.field}
                  onChange={(e) => {
                    const newConditions = [...formData.pattern.conditions];
                    newConditions[index].field = e.target.value;
                    setFormData({
                      ...formData,
                      pattern: { ...formData.pattern, conditions: newConditions }
                    });
                  }}
                />
                <select
                  required
                  className="block w-1/4 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={condition.operator}
                  onChange={(e) => {
                    const newConditions = [...formData.pattern.conditions];
                    newConditions[index].operator = e.target.value;
                    setFormData({
                      ...formData,
                      pattern: { ...formData.pattern, conditions: newConditions }
                    });
                  }}
                >
                  <option value="equals">equals</option>
                  <option value="contains">contains</option>
                  <option value="startsWith">starts with</option>
                  <option value="endsWith">ends with</option>
                  <option value="greaterThan">greater than</option>
                  <option value="lessThan">less than</option>
                </select>
                <input
                  type="text"
                  placeholder="Value"
                  required
                  className="block w-1/3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={condition.value}
                  onChange={(e) => {
                    const newConditions = [...formData.pattern.conditions];
                    newConditions[index].value = e.target.value;
                    setFormData({
                      ...formData,
                      pattern: { ...formData.pattern, conditions: newConditions }
                    });
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeCondition(index)}
                  className="text-red-600 hover:text-red-900"
                  disabled={formData.pattern.conditions.length === 1}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          {/* Advanced Matching */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Advanced Matching</h4>

            {/* Amount Range */}
            <div>
              <h5 className="text-sm font-medium text-gray-700">Amount Range</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500">Min Amount</label>
                  <input
                    type="number"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    value={formData.pattern.amount_range.min || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        pattern: {
                          ...formData.pattern,
                          amount_range: {
                            ...formData.pattern.amount_range,
                            min: parseFloat(e.target.value) || null
                          }
                        }
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Max Amount</label>
                  <input
                    type="number"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    value={formData.pattern.amount_range.max || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        pattern: {
                          ...formData.pattern,
                          amount_range: {
                            ...formData.pattern.amount_range,
                            max: parseFloat(e.target.value) || null
                          }
                        }
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Frequency Pattern */}
            <div>
              <h5 className="text-sm font-medium text-gray-700">Frequency Pattern</h5>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                value={formData.pattern.frequency_pattern.type}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    pattern: {
                      ...formData.pattern,
                      frequency_pattern: {
                        type: e.target.value
                      }
                    }
                  });
                }}
              >
                <option value="">No Pattern</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <h5 className="text-sm font-medium text-gray-700">Tags</h5>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                value={formData.tags.join(', ')}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    tags: e.target.value.split(',').map(tag => tag.trim())
                  });
                }}
                placeholder="Enter tags separated by commas"
              />
            </div>
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