import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';

interface BalanceSheetData {
  assets: {
    current: {
      [key: string]: number;
    };
    fixed: {
      [key: string]: number;
    };
    total: number;
  };
  liabilities: {
    current: {
      [key: string]: number;
    };
    longTerm: {
      [key: string]: number;
    };
    total: number;
  };
  equity: {
    [key: string]: number;
    total: number;
  };
}

interface BalanceSheetReportProps {
  dateRange: string;
}

export function BalanceSheetReport({ dateRange }: BalanceSheetReportProps) {
  const { profile } = useAuthStore();
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.company_id) {
      fetchBalanceSheetData();
    }
  }, [profile, dateRange]);

  async function fetchBalanceSheetData() {
    try {
      // In a real app, this would fetch from your backend
      setData({
        assets: {
          current: {
            'Cash & Equivalents': 250000,
            'Accounts Receivable': 150000,
            'Inventory': 50000
          },
          fixed: {
            'Vehicles': 800000,
            'Equipment': 200000,
            'Buildings': 500000
          },
          total: 1950000
        },
        liabilities: {
          current: {
            'Accounts Payable': 100000,
            'Short-term Loans': 150000,
            'Current Portion of Long-term Debt': 50000
          },
          longTerm: {
            'Long-term Debt': 500000,
            'Vehicle Loans': 400000
          },
          total: 1200000
        },
        equity: {
          'Owner\'s Capital': 500000,
          'Retained Earnings': 250000,
          total: 750000
        }
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching balance sheet data:', error);
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return <div>Loading balance sheet data...</div>;
  }

  if (!data) {
    return <div>No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Assets</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(data.assets.total)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Liabilities</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(data.liabilities.total)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Equity</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(data.equity.total)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="space-y-6">
          {/* Current Assets */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Current Assets</h3>
            <div className="space-y-4">
              {Object.entries(data.assets.current).map(([name, amount]) => (
                <div key={name} className="flex justify-between">
                  <span className="text-sm text-gray-600">{name}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(amount)}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between font-medium">
                  <span className="text-sm text-gray-900">Total Current Assets</span>
                  <span className="text-sm text-gray-900">
                    {formatCurrency(Object.values(data.assets.current).reduce((a, b) => a + b, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Assets */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Fixed Assets</h3>
            <div className="space-y-4">
              {Object.entries(data.assets.fixed).map(([name, amount]) => (
                <div key={name} className="flex justify-between">
                  <span className="text-sm text-gray-600">{name}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(amount)}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between font-medium">
                  <span className="text-sm text-gray-900">Total Fixed Assets</span>
                  <span className="text-sm text-gray-900">
                    {formatCurrency(Object.values(data.assets.fixed).reduce((a, b) => a + b, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Liabilities and Equity */}
        <div className="space-y-6">
          {/* Current Liabilities */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Current Liabilities</h3>
            <div className="space-y-4">
              {Object.entries(data.liabilities.current).map(([name, amount]) => (
                <div key={name} className="flex justify-between">
                  <span className="text-sm text-gray-600">{name}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(amount)}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between font-medium">
                  <span className="text-sm text-gray-900">Total Current Liabilities</span>
                  <span className="text-sm text-gray-900">
                    {formatCurrency(Object.values(data.liabilities.current).reduce((a, b) => a + b, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Long-term Liabilities */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Long-term Liabilities</h3>
            <div className="space-y-4">
              {Object.entries(data.liabilities.longTerm).map(([name, amount]) => (
                <div key={name} className="flex justify-between">
                  <span className="text-sm text-gray-600">{name}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(amount)}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between font-medium">
                  <span className="text-sm text-gray-900">Total Long-term Liabilities</span>
                  <span className="text-sm text-gray-900">
                    {formatCurrency(Object.values(data.liabilities.longTerm).reduce((a, b) => a + b, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Equity */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Equity</h3>
            <div className="space-y-4">
              {Object.entries(data.equity).filter(([key]) => key !== 'total').map(([name, amount]) => (
                <div key={name} className="flex justify-between">
                  <span className="text-sm text-gray-600">{name}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(amount)}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between font-medium">
                  <span className="text-sm text-gray-900">Total Equity</span>
                  <span className="text-sm text-gray-900">
                    {formatCurrency(data.equity.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}