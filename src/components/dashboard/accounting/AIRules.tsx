import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Brain, Plus, AlertTriangle, CheckCircle, RefreshCw, Eye, Settings, Ban } from 'lucide-react';
import { RuleDetailsModal } from './RuleDetailsModal';
import { CreateRuleModal } from './CreateRuleModal';
import { TestRuleModal } from './TestRuleModal';

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
  };
  category: string;
  confidence_score: number;
  is_ai_generated: boolean;
  times_applied: number;
  last_applied_at: string;
}

export function AIRules() {
  const { profile } = useAuthStore();
  const [rules, setRules] = useState<TransactionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<TransactionRule | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);

  useEffect(() => {
    if (profile?.company_id) {
      fetchRules();
    }
  }, [profile]);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('transaction_rules')
        .select('*')
        .eq('company_id', profile!.company_id)
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      if (data) setRules(data);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRules = async () => {
    setGenerating(true);
    try {
      // Fetch recent transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', profile!.company_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (transactions) {
        // Call Edge Function to analyze transactions
        const { data: analysis } = await supabase.functions.invoke('analyze-transaction', {
          body: { transactions, type: 'rules' }
        });

        if (analysis?.rules) {
          // Create rules from analysis
          const { error: rulesError } = await supabase
            .from('transaction_rules')
            .insert(analysis.rules.map((rule: any) => ({
              company_id: profile!.company_id,
              name: rule.name,
              description: rule.description,
              pattern: rule.pattern,
              category: rule.category,
              confidence_score: rule.confidence_score,
              is_ai_generated: true
            })));

          if (rulesError) throw rulesError;
          fetchRules();
        }
      }
    } catch (error) {
      console.error('Error generating rules:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleRuleAction = async (ruleId: string, action: 'enable' | 'disable' | 'delete') => {
    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('transaction_rules')
          .delete()
          .eq('id', ruleId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('transaction_rules')
          .update({ is_active: action === 'enable' })
          .eq('id', ruleId);

        if (error) throw error;
      }
      fetchRules();
    } catch (error) {
      console.error('Error updating rule:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">AI Transaction Rules</h2>
        <div className="flex space-x-4">
          <button
            onClick={generateRules}
            disabled={generating}
            className="flex items-center px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <Brain className="w-4 h-4 mr-2" />
            {generating ? 'Analyzing...' : 'Generate Rules'}
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
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pattern
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
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
                    Loading rules...
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No rules found. Generate some or create one manually.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">
                          {rule.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {rule.description}
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rule.category}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {rule.pattern.conditions.map((condition, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            {condition.field} {condition.operator} {condition.value}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${rule.confidence_score * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500">
                          {(rule.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        Applied {rule.times_applied} times
                      </div>
                      <div className="text-sm text-gray-500">
                        Last: {rule.last_applied_at ? new Date(rule.last_applied_at).toLocaleDateString() : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedRule(rule)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setShowTestModal(true)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        <Brain className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleRuleAction(rule.id, 'delete')}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Ban className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rule Details Modal */}
      {selectedRule && (
        <RuleDetailsModal
          rule={selectedRule}
          onClose={() => setSelectedRule(null)}
          onUpdate={fetchRules}
        />
      )}

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

      {/* Test Rule Modal */}
      {showTestModal && (
        <TestRuleModal
          onClose={() => setShowTestModal(false)}
        />
      )}
    </div>
  );
}