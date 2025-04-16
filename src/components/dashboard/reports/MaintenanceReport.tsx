import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MaintenanceData {
  summary: {
    totalCost: number;
    averageCostPerVehicle: number;
    totalServices: number;
    upcomingServices: number;
  };
  costByType: {
    [key: string]: number;
  };
  costByVehicle: {
    [key: string]: number;
  };
  monthlyTrend: {
    month: string;
    cost: number;
  }[];
}

interface MaintenanceReportProps {
  dateRange: string;
}

export function MaintenanceReport({ dateRange }: MaintenanceReportProps) {
  const { profile } = useAuthStore();
  const [data, setData] = useState<MaintenanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.company_id) {
      fetchMaintenanceData();
    }
  }, [profile, dateRange]);

  async function fetchMaintenanceData() {
    try {
      // In a real app, this would fetch from your backend
      setData({
        summary: {
          totalCost: 75000,
          averageCostPerVehicle: 7500,
          totalServices: 120,
          upcomingServices: 15
        },
        costByType: {
          'Preventive Maintenance': 25000,
          'Repairs': 20000,
          'Tires': 15000,
          'Oil Changes': 10000,
          'Other': 5000
        },
        costByVehicle: {
          'Truck #1': 12000,
          'Truck #2': 15000,
          'Truck #3': 8000,
          'Truck #4': 20000,
          'Truck #5': 10000
        },
        monthlyTrend: [
          { month: 'Jan', cost: 5000 },
          { month: 'Feb', cost: 6000 },
          { month: 'Mar', cost: 4500 },
          { month: 'Apr', cost: 7000 },
          { month: 'May', cost: 8000 },
          { month: 'Jun', cost: 6500 }
        ]
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching maintenance data:', error);
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
    return <div>Loading maintenance data...</div>;
  }

  if (!data) {
    return <div>No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Maintenance Cost</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(data.summary.totalCost)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Cost per Vehicle</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(data.summary.averageCostPerVehicle)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Services</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {data.summary.totalServices}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Services</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {data.summary.upcomingServices}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Trends Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance Cost Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value) => formatCurrency(value as number)}
                labelStyle={{ color: '#111827' }}
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.375rem'
                }}
              />
              <Legend />
              <Bar dataKey="cost" fill="#3B82F6" name="Maintenance Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cost by Type */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cost by Maintenance Type</h3>
          <div className="space-y-4">
            {Object.entries(data.costByType).map(([type, cost]) => (
              <div key={type}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{type}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(cost)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(cost / data.summary.totalCost) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost by Vehicle */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cost by Vehicle</h3>
          <div className="space-y-4">
            {Object.entries(data.costByVehicle).map(([vehicle, cost]) => (
              <div key={vehicle}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{vehicle}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(cost)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${(cost / data.summary.totalCost) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}