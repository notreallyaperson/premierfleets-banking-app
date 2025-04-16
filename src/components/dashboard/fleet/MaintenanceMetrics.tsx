import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Wrench, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';

interface MaintenanceMetrics {
  totalCost: number;
  averageCostPerVehicle: number;
  completedServices: number;
  upcomingServices: number;
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

export function MaintenanceMetrics() {
  const { profile } = useAuthStore();
  const [metrics, setMetrics] = useState<MaintenanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.company_id) {
      fetchMaintenanceMetrics();
    }
  }, [profile]);

  const fetchMaintenanceMetrics = async () => {
    try {
      const { data: records, error } = await supabase
        .from('service_records')
        .select(`
          *,
          service_items (
            description,
            parts_cost,
            labor_cost
          )
        `)
        .eq('company_id', profile!.company_id);

      if (error) throw error;

      if (records) {
        // Calculate metrics
        const totalCost = records.reduce((sum, record) => sum + record.total_cost, 0);
        const vehicleCount = new Set(records.map(r => r.vehicle_id)).size;

        const costByType: { [key: string]: number } = {};
        const costByVehicle: { [key: string]: number } = {};
        const monthlyData: { [key: string]: number } = {};

        records.forEach(record => {
          // Cost by service type
          record.service_items.forEach(item => {
            costByType[item.description] = (costByType[item.description] || 0) + item.parts_cost + item.labor_cost;
          });

          // Cost by vehicle
          costByVehicle[record.vehicle_id] = (costByVehicle[record.vehicle_id] || 0) + record.total_cost;

          // Monthly trend
          const month = new Date(record.service_date).toLocaleString('default', { month: 'short' });
          monthlyData[month] = (monthlyData[month] || 0) + record.total_cost;
        });

        setMetrics({
          totalCost,
          averageCostPerVehicle: totalCost / (vehicleCount || 1),
          completedServices: records.filter(r => r.status === 'completed').length,
          upcomingServices: records.filter(r => r.status === 'pending').length,
          costByType,
          costByVehicle,
          monthlyTrend: Object.entries(monthlyData).map(([month, cost]) => ({
            month,
            cost
          }))
        });
      }
    } catch (error) {
      console.error('Error fetching maintenance metrics:', error);
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

  if (loading) {
    return <div>Loading maintenance metrics...</div>;
  }

  if (!metrics) {
    return <div>No maintenance data available</div>;
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
                {formatCurrency(metrics.totalCost)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Cost per Vehicle</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(metrics.averageCostPerVehicle)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Services</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {metrics.completedServices}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Wrench className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Services</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {metrics.upcomingServices}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Cost Trends Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance Cost Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.monthlyTrend}>
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
        {/* Cost by Service Type */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cost by Service Type</h3>
          <div className="space-y-4">
            {Object.entries(metrics.costByType).map(([type, cost]) => (
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
                    style={{ width: `${(cost / metrics.totalCost) * 100}%` }}
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
            {Object.entries(metrics.costByVehicle).map(([vehicleId, cost]) => (
              <div key={vehicleId}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">Vehicle #{vehicleId.slice(-6)}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(cost)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${(cost / metrics.totalCost) * 100}%` }}
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