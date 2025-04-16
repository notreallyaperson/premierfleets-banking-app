import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, Edit2, Ban, CheckCircle, Brain } from 'lucide-react';

interface TransactionRule {
  id: string;
  name: string;
  description: string;
  pattern: {
    conditions: {
      field: string;
      operator: string;
      value: any;
    }[];
    metadata_match?: any;
    temporal_match?: any;
    location_match?: any;
    amount_range?: any;
    frequency_pattern?: any;
    vendor_match?: any;
    account_relations?: any;
    custom_match?: any;
  };
  category: string;
  confidence_score: number;
  is_ai_generated: boolean;
  times_applied: number;
  last_applied_at: string;
  priority: number;
  valid_from?: string;
  valid_until?: string;
  execution_schedule?: any;
  metadata?: any;
  rule_type: string;
  parent_rule_id?: string;
  exception_handling?: any;
  version: number;
  tags?: string[];
}

interface RuleDetailsModalProps {
  rule: TransactionRule;
  onClose: () => void;
  onUpdate: () => void;
}

export function RuleDetailsModal({ rule, onClose, onUpdate }: RuleDetailsModalProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(rule);

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('transaction_rules')
        .update(formData)
        .eq('id', rule.id);

      if (updateError) throw updateError;
      onUpdate();
      setEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderConditions = () => {
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Pattern Matching</h4>
        
        {/* Basic Conditions */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-gray-700">Basic Conditions</h5>
          {formData.pattern.conditions.map((condition, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
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
                disabled={!editing}
              />
              <select
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
                disabled={!editing}
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
                disabled={!editing}
              />
            </div>
          ))}
        </div>

        {/* Advanced Matching */}
        {editing && (
          <>
            {/* Amount Range */}
            <div>
              <h5 className="text-sm font-medium text-gray-700">Amount Range</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500">Min Amount</label>
                  <input
                    type="number"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    value={formData.pattern.amount_range?.min || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        pattern: {
                          ...formData.pattern,
                          amount_range: {
                            ...formData.pattern.amount_range,
                            min: parseFloat(e.target.value)
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
                    value={formData.pattern.amount_range?.max || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        pattern: {
                          ...formData.pattern,
                          amount_range: {
                            ...formData.pattern.amount_range,
                            max: parseFloat(e.target.value)
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
                value={formData.pattern.frequency_pattern?.type || ''}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    pattern: {
                      ...formData.pattern,
                      frequency_pattern: {
                        ...formData.pattern.frequency_pattern,
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
                value={formData.tags?.join(', ') || ''}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    tags: e.target.value.split(',').map(tag => tag.trim())
                  });
                }}
                placeholder="Enter tags separated by commas"
              />
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Rule Details</h3>
            {rule.is_ai_generated && (
              <div className="flex items-center mt-1">
                <Brain className="h-4 w-4 text-purple-500 mr-1" />
                <span className="text-xs text-purple-600">AI Generated</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!editing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={!editing}
            />
          </div>

          {/* Pattern Matching */}
          {renderConditions()}

          {/* Performance Metrics */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Performance</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Confidence Score</p>
                <div className="flex items-center mt-1">
                  <div className="flex-grow h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-green-500 rounded-full"
                      style={{ width: `${formData.confidence_score * 100}%` }}
                    />
                  </div>
                  <span className="ml-2 text-sm text-gray-700">
                    {(formData.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Times Applied</p>
                <p className="text-lg font-medium text-gray-900">
                  {formData.times_applied}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={loading}
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Edit Rule
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}