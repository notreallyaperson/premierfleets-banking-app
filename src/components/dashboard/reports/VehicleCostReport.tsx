import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface VehicleCostData {
  summary: {
    totalCost: number;
    fuelCosts: number;
    maintenanceCosts: number;
    insuranceCosts: number;
    loanPayments: number;
    averageCostPerMile: number;
  };
  costByVehicle: {
    [key: string]: {
      total: number;
      fuel: number;
      maintenance: number;
      insurance: number;
      loan: number;
      mileage: number;
      costPerMile: number;
    };
  };
  monthlyTrend: {
    month: string;
    fuel: number;
    maintenance: number;
    insurance: number;
    loan: number;
  }[];
}

interface VehicleCostReportProps {
  dateRange: string;
}

export function VehicleCostReport({ dateRange }: VehicleCostReportProps) {
  const { profile } = useAuthStore();
  const [data, setData] = useState<VehicleCostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchVehicleCostData();
    }
  }, [profile, dateRange]);

  async function fetchVehicleCostData() {
    try {
      // In a real app, this would fetch from your backend
      setData({
        summary: {
          totalCost: 250000,
          fuelCosts: 100000,
          maintenanceCosts: 75000,
          insuranceCosts: 50000,
          loanPayments: 25000,
          averageCostPerMile: 0.85
        },
        costByVehicle: {
          'Truck #1': {
            total: 45000,
            fuel: 20000,
            maintenance: 12000,
            insurance: 8000,
            loan: 5000,
            mileage: 50000,
            costPerMile: 0.90
          },
          'Truck #2': {
            total: 55000,
            fuel: 25000,
            maintenance: 15000,
            insurance: 10000,
            loan: 5000,
            mileage: 60000,
            costPerMile: 0.92
          },
          'Truck #3': {
            total: 40000,
            fuel: 18000,
            maintenance: 10000,
            insurance: 7000,
            loan: 5000,
            mileage: 45000,
            costPerMile: 0.89
          }
        },
        monthlyTrend: [
          { month: 'Jan', fuel: 15000, maintenance: 12000, insurance: 8000, loan: 4000 },
          { month: 'Feb', fuel: 17000, maintenance: 10000, insurance: 8000, loan: 4000 },
          { month: 'Mar', fuel: 16000, maintenance: 13000, insurance: 8000, loan: 4000 },
          { month: 'Apr', fuel: 18000, maintenance: 11000, insurance: 8000, loan: 4000 },
          { month: 'May', fuel: 19000, maintenance: 14000, insurance: 8000, loan: 4000 },
          { month: 'Jun', fuel: 17000, maintenance: 12000, insurance: 8000, loan: 4000 }
        ]
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching vehicle cost data:', error);
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
    return <div>Loading vehicle cost data...</div>;
  }

  if (!data) {
    return <div>No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cost</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(data.summary.totalCost)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fuel Costs</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(data.summary.fuelCosts)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Maintenance</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(data.summary.maintenanceCosts)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Insurance</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(data.summary.insuranceCosts)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Loan Payments</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(data.summary.loanPayments)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Cost/Mile</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                ${data.summary.averageCostPerMile.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Trends Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Trends</h3>
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
              <Bar dataKey="fuel" stackId="a" fill="#3B82F6" name="Fuel" />
              <Bar dataKey="maintenance" stackId="a" fill="#10B981" name="Maintenance" />
              <Bar dataKey="insurance" stackId="a" fill="#6366F1" name="Insurance" />
              <Bar dataKey="loan" stackId="a" fill="#F59E0B" name="Loan Payments" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vehicle Cost Breakdown */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cost by Vehicle</h3>
        <div className="space-y-6">
          {Object.entries(data.costByVehicle).map(([vehicle, costs]) => (
            <div key={vehicle} className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-900">{vehicle}</h4>
                <div className="text-sm text-gray-500">
                  Cost per mile: ${costs.costPerMile.toFixed(2)} • 
                  Total miles: {costs.mileage.toLocaleString()}
                </div>
              </div>
              
              {/* Cost Breakdown Bars */}
              <div className="space-y-2">
                {/* Fuel */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Fuel</span>
                    <span className="text-gray-900">{formatCurrency(costs.fuel)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(costs.fuel / costs.total) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Maintenance */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Maintenance</span>
                    <span className="text-gray-900">{formatCurrency(costs.maintenance)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(costs.maintenance / costs.total) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Insurance */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Insurance</span>
                    <span className="text-gray-900">{formatCurrency(costs.insurance)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${(costs.insurance / costs.total) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Loan */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Loan Payments</span>
                    <span className="text-gray-900">{formatCurrency(costs.loan)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-600 h-2 rounded-full"
                      style={{ width: `${(costs.loan / costs.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between font-medium">
                  <span className="text-sm text-gray-900">Total Cost</span>
                  <span className="text-sm text-gray-900">{formatCurrency(costs.total)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}