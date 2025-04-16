import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ProfitLossData {
  revenue: {
    total: number;
    categories: {
      [key: string]: number;
    };
  };
  expenses: {
    total: number;
    categories: {
      [key: string]: number;
    };
  };
  netIncome: number;
  previousPeriod: {
    revenue: number;
    expenses: number;
    netIncome: number;
  };
}

interface ProfitLossReportProps {
  dateRange: string;
}

export function ProfitLossReport({ dateRange }: ProfitLossReportProps) {
  const { profile } = useAuthStore();
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.company_id) {
      fetchProfitLossData();
    }
  }, [profile, dateRange]);

  async function fetchProfitLossData() {
    try {
      // In a real app, this would fetch from your backend
      setData({
        revenue: {
          total: 150000,
          categories: {
            'Freight Services': 100000,
            'Logistics': 30000,
            'Storage': 20000
          }
        },
        expenses: {
          total: 100000,
          categories: {
            'Fuel': 30000,
            'Maintenance': 20000,
            'Insurance': 15000,
            'Payroll': 25000,
            'Other': 10000
          }
        },
        netIncome: 50000,
        previousPeriod: {
          revenue: 140000,
          expenses: 95000,
          netIncome: 45000
        }
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching P&L data:', error);
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
  };

  if (loading) {
    return <div>Loading profit & loss data...</div>;
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
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(data.revenue.total)}
              </p>
              <div className="mt-2 flex items-center">
                <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">
                  {calculatePercentageChange(data.revenue.total, data.previousPeriod.revenue)}%
                </span>
                <span className="text-sm text-gray-500 ml-1">vs previous period</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(data.expenses.total)}
              </p>
              <div className="mt-2 flex items-center">
                <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                <span className="text-sm text-red-600">
                  {calculatePercentageChange(data.expenses.total, data.previousPeriod.expenses)}%
                </span>
                <span className="text-sm text-gray-500 ml-1">vs previous period</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Income</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(data.netIncome)}
              </p>
              <div className="mt-2 flex items-center">
                <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">
                  {calculatePercentageChange(data.netIncome, data.previousPeriod.netIncome)}%
                </span>
                <span className="text-sm text-gray-500 ml-1">vs previous period</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Breakdown</h3>
          <div className="space-y-4">
            {Object.entries(data.revenue.categories).map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{category}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(amount / data.revenue.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Expenses Breakdown</h3>
          <div className="space-y-4">
            {Object.entries(data.expenses.categories).map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{category}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{ width: `${(amount / data.expenses.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}