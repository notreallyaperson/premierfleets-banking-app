import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { DollarSign, Plus, Download, X } from 'lucide-react';

interface PayrollRun {
  id: string;
  pay_date: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  status: 'draft' | 'processing' | 'completed' | 'cancelled';
  employee_count: number;
}

export function PayrollRuns() {
  const { profile } = useAuthStore();
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRunModal, setShowNewRunModal] = useState(false);

  useEffect(() => {
    if (profile?.company_id) {
      fetchPayrollRuns();
    }
  }, [profile]);

  const fetchPayrollRuns = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('company_id', profile!.company_id)
        .order('pay_date', { ascending: false });

      if (error) throw error;
      if (data) setPayrollRuns(data);
    } catch (error) {
      console.error('Error fetching payroll runs:', error);
    } finally {
      setLoading(false);
    }
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
        <div>
          <h3 className="text-lg font-medium text-gray-900">Payroll Runs</h3>
          <p className="mt-1 text-sm text-gray-500">
            View and manage payroll processing history.
          </p>
        </div>
        <button
          onClick={() => setShowNewRunModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Payroll Run
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pay Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employees
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
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
                    Loading payroll runs...
                  </td>
                </tr>
              ) : payrollRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No payroll runs found
                  </td>
                </tr>
              ) : (
                payrollRuns.map((run) => (
                  <tr key={run.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(run.pay_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {run.employee_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(run.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        run.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : run.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : run.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {run.status === 'completed' && (
                        <button className="text-blue-600 hover:text-blue-900">
                          <Download className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Payroll Run Modal */}
      {showNewRunModal && (
        <NewPayrollRunModal
          onClose={() => setShowNewRunModal(false)}
          onSuccess={() => {
            setShowNewRunModal(false);
            fetchPayrollRuns();
          }}
        />
      )}
    </div>
  );
}

interface NewPayrollRunModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function NewPayrollRunModal({ onClose, onSuccess }: NewPayrollRunModalProps) {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    pay_date: new Date().toISOString().split('T')[0],
    period_start: '',
    period_end: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get employee count
      const { data: employees } = await supabase
        .from('employees')
        .select('id, pay_type, pay_rate, overtime_eligible')
        .eq('company_id', profile!.company_id)
        .eq('status', 'active');

      if (!employees?.length) {
        throw new Error('No active employees found');
      }

      // Calculate total payroll amount
      const totalAmount = employees.reduce((sum, emp) => {
        if (emp.pay_type === 'salary') {
          // For salary employees, calculate per-period amount
          return sum + (emp.pay_rate / 24); // Assuming bi-monthly pay periods
        } else {
          // For hourly employees, use standard 80 hours per period
          return sum + (emp.pay_rate * 80);
        }
      }, 0);

      // Create payroll run
      const { error: runError } = await supabase
        .from('payroll_runs')
        .insert([{
          company_id: profile!.company_id,
          pay_date: formData.pay_date,
          period_start: formData.period_start,
          period_end: formData.period_end,
          total_amount: totalAmount,
          employee_count: employees.length,
          status: 'draft'
        }]);

      if (runError) throw runError;
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
          <h3 className="text-lg font-medium text-gray-900">New Payroll Run</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pay Date
            </label>
            <input
              type="date"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.pay_date}
              onChange={(e) => setFormData({ ...formData, pay_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Period Start
            </label>
            <input
              type="date"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.period_start}
              onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Period End
            </label>
            <input
              type="date"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.period_end}
              onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
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
              {loading ? 'Creating...' : 'Create Payroll Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}