import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { DollarSign, Calendar, TrendingDown, Ban as Bank } from 'lucide-react';

interface DebtSchedule {
  id: string;
  loan_type: string;
  original_amount: number;
  current_balance: number;
  interest_rate: number;
  monthly_payment: number;
  start_date: string;
  maturity_date: string;
  next_payment_date: string;
  remaining_payments: number;
  total_interest_paid: number;
  total_interest_remaining: number;
}

interface DebtScheduleReportProps {
  dateRange: string;
}

export function DebtScheduleReport({ dateRange }: DebtScheduleReportProps) {
  const { profile } = useAuthStore();
  const [debts, setDebts] = useState<DebtSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.company_id) {
      fetchDebtSchedule();
    }
  }, [profile, dateRange]);

  const fetchDebtSchedule = async () => {
    try {
      // In a real app, this would fetch from your backend
      // For now, using sample data
      setDebts([
        {
          id: '1',
          loan_type: 'Vehicle Loan - Truck #1234',
          original_amount: 150000,
          current_balance: 120000,
          interest_rate: 4.5,
          monthly_payment: 2800,
          start_date: '2024-06-01',
          maturity_date: '2029-06-01',
          next_payment_date: '2025-02-15',
          remaining_payments: 52,
          total_interest_paid: 8500,
          total_interest_remaining: 15600
        },
        {
          id: '2',
          loan_type: 'Equipment Financing',
          original_amount: 75000,
          current_balance: 65000,
          interest_rate: 5.2,
          monthly_payment: 1500,
          start_date: '2024-09-01',
          maturity_date: '2028-09-01',
          next_payment_date: '2025-02-15',
          remaining_payments: 43,
          total_interest_paid: 3200,
          total_interest_remaining: 8900
        },
        {
          id: '3',
          loan_type: 'Business Line of Credit',
          original_amount: 200000,
          current_balance: 150000,
          interest_rate: 6.5,
          monthly_payment: 4200,
          start_date: '2024-01-01',
          maturity_date: '2027-01-01',
          next_payment_date: '2025-02-15',
          remaining_payments: 24,
          total_interest_paid: 12500,
          total_interest_remaining: 18200
        }
      ]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching debt schedule:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateTotals = () => {
    return debts.reduce((acc, debt) => ({
      totalDebt: acc.totalDebt + debt.current_balance,
      monthlyPayments: acc.monthlyPayments + debt.monthly_payment,
      totalInterestPaid: acc.totalInterestPaid + debt.total_interest_paid,
      totalInterestRemaining: acc.totalInterestRemaining + debt.total_interest_remaining
    }), {
      totalDebt: 0,
      monthlyPayments: 0,
      totalInterestPaid: 0,
      totalInterestRemaining: 0
    });
  };

  const totals = calculateTotals();

  if (loading) {
    return <div>Loading debt schedule...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Debt</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(totals.totalDebt)}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <Bank className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Payments</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(totals.monthlyPayments)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Interest Paid</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(totals.totalInterestPaid)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Interest Remaining</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(totals.totalInterestRemaining)}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <TrendingDown className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Debt Schedule Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Debt Schedule</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loan Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Balance
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interest Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly Payment
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Payment
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Maturity Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {debts.map((debt) => (
                <tr key={debt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {debt.loan_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    {formatCurrency(debt.original_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {formatCurrency(debt.current_balance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {debt.interest_rate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(debt.monthly_payment)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {new Date(debt.next_payment_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {new Date(debt.maturity_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Schedule */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Schedule</h3>
        <div className="space-y-4">
          {debts.map((debt) => (
            <div key={debt.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{debt.loan_type}</h4>
                  <p className="text-sm text-gray-500">
                    {debt.remaining_payments} payments remaining
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(debt.monthly_payment)}/month
                  </p>
                  <p className="text-sm text-gray-500">
                    Next: {new Date(debt.next_payment_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Principal + Interest Paid</span>
                    <span className="text-gray-900">
                      {formatCurrency(debt.original_amount - debt.current_balance + debt.total_interest_paid)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${((debt.original_amount - debt.current_balance) / debt.original_amount) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Total Interest: {formatCurrency(debt.total_interest_paid + debt.total_interest_remaining)}</span>
                  <span>Remaining: {formatCurrency(debt.total_interest_remaining)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}