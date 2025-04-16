import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { AlertTriangle, Shield, Activity, RefreshCw, Eye, Ban, X } from 'lucide-react';

interface FraudAlert {
  id: string;
  transaction_id: string;
  risk_score: number;
  risk_factors: string[];
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
  pattern_data: {
    risk_factors: string[];
    recommendations: string[];
  };
  transaction: {
    date: string;
    description: string;
    amount: number;
    type: string;
  } | null;
}

interface TransactionPattern {
  id: string;
  pattern_type: string;
  pattern_data: any;
  risk_score: number;
  detection_count: number;
  last_detected_at: string;
}

export function FraudDetection() {
  const { profile } = useAuthStore();
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [patterns, setPatterns] = useState<TransactionPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchAlerts();
      fetchPatterns();
    }
  }, [profile]);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('transaction_patterns')
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
        .eq('pattern_type', 'fraud')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        // Ensure risk_factors exists in pattern_data
        const processedAlerts = data.map(alert => ({
          ...alert,
          risk_factors: alert.pattern_data?.risk_factors || []
        }));
        setAlerts(processedAlerts);
      }
    } catch (error) {
      console.error('Error fetching fraud alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatterns = async () => {
    try {
      const { data, error } = await supabase
        .from('transaction_patterns')
        .select('*')
        .eq('company_id', profile!.company_id)
        .order('risk_score', { ascending: false });

      if (error) throw error;
      if (data) setPatterns(data);
    } catch (error) {
      console.error('Error fetching patterns:', error);
    }
  };

  const analyzeTransactions = async () => {
    setAnalyzing(true);
    try {
      // Fetch recent transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', profile!.company_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (transactions) {
        // Analyze each transaction for fraud
        for (const transaction of transactions) {
          const { data: analysis } = await supabase.functions.invoke('analyze-transaction', {
            body: { transaction, type: 'fraud' }
          });

          if (analysis && analysis.risk_score > 0.7) { // High risk threshold
            // Create fraud alert
            await supabase
              .from('transaction_patterns')
              .insert([{
                company_id: profile!.company_id,
                pattern_type: 'fraud',
                pattern_data: {
                  risk_factors: analysis.risk_factors || [],
                  recommendations: analysis.recommendations || []
                },
                risk_score: analysis.risk_score,
                transaction_id: transaction.id
              }]);
          }
        }

        fetchAlerts();
        fetchPatterns();
      }
    } catch (error) {
      console.error('Error analyzing transactions:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAlertAction = async (alertId: string, action: 'review' | 'dismiss') => {
    try {
      const { error } = await supabase
        .from('transaction_patterns')
        .update({
          status: action === 'review' ? 'reviewed' : 'dismissed'
        })
        .eq('id', alertId);

      if (error) throw error;
      fetchAlerts();
    } catch (error) {
      console.error('Error updating alert:', error);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 0.8) return 'text-red-600';
    if (score >= 0.6) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Fraud Detection</h2>
        <button
          onClick={analyzeTransactions}
          disabled={analyzing}
          className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
          {analyzing ? 'Analyzing...' : 'Analyze Transactions'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {alerts.filter(a => a.status === 'pending').length}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Detected Patterns</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {patterns.length}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Prevention Rate</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                98.5%
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900">Fraud Alerts</h3>
        </div>
        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Factors
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Loading alerts...
                    </td>
                  </tr>
                ) : alerts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No fraud alerts detected
                    </td>
                  </tr>
                ) : (
                  alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {alert.transaction?.description || 'Unknown Transaction'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {alert.transaction ? (
                              <>
                                {new Date(alert.transaction.date).toLocaleDateString()} •{' '}
                                {formatCurrency(alert.transaction.amount)}
                              </>
                            ) : (
                              'Transaction details unavailable'
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-2 w-16 bg-gray-200 rounded-full mr-2">
                            <div
                              className="h-2 bg-red-500 rounded-full"
                              style={{ width: `${alert.risk_score * 100}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${getRiskColor(alert.risk_score)}`}>
                            {(alert.risk_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {(alert.risk_factors || []).map((factor, index) => (
                            <div key={index} className="flex items-center">
                              <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                              {factor}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          alert.status === 'reviewed'
                            ? 'bg-green-100 text-green-800'
                            : alert.status === 'dismissed'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {alert.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleAlertAction(alert.id, 'dismiss')}
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
      </div>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">Alert Details</h3>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Transaction Details</h4>
                <div className="mt-2 bg-gray-50 p-4 rounded-lg">
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Date</dt>
                      <dd className="text-sm text-gray-900">
                        {selectedAlert.transaction ? 
                          new Date(selectedAlert.transaction.date).toLocaleDateString() :
                          'Not available'
                        }
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Amount</dt>
                      <dd className="text-sm text-gray-900">
                        {selectedAlert.transaction ? 
                          formatCurrency(selectedAlert.transaction.amount) :
                          'Not available'
                        }
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Description</dt>
                      <dd className="text-sm text-gray-900">
                        {selectedAlert.transaction?.description || 'Not available'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900">Risk Assessment</h4>
                <div className="mt-2 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500">Risk Score</span>
                      <span className={`text-sm font-medium ${getRiskColor(selectedAlert.risk_score)}`}>
                        {(selectedAlert.risk_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${selectedAlert.risk_score * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Risk Factors</h5>
                    <ul className="space-y-2">
                      {(selectedAlert.risk_factors || []).map((factor, index) => (
                        <li key={index} className="flex items-start">
                          <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    handleAlertAction(selectedAlert.id, 'dismiss');
                    setSelectedAlert(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    handleAlertAction(selectedAlert.id, 'review');
                    setSelectedAlert(null);
                  }}
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Mark as Reviewed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}