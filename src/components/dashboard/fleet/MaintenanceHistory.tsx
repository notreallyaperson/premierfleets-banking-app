import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Wrench, DollarSign, Calendar, AlertTriangle } from 'lucide-react';

interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  service_date: string;
  odometer_reading: number;
  location: string;
  total_cost: number;
  status: string;
  notes: string;
  service_items: {
    description: string;
    parts_cost: number;
    labor_cost: number;
  }[];
}

interface MaintenanceHistoryProps {
  vehicleId?: string;
}

export function MaintenanceHistory({ vehicleId }: MaintenanceHistoryProps) {
  const { profile } = useAuthStore();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchMaintenanceHistory();
    }
  }, [profile, vehicleId]);

  const fetchMaintenanceHistory = async () => {
    try {
      let query = supabase
        .from('service_records')
        .select(`
          *,
          service_items (
            description,
            parts_cost,
            labor_cost
          )
        `)
        .eq('company_id', profile!.company_id)
        .order('service_date', { ascending: false });

      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (data) setRecords(data);
    } catch (err: any) {
      setError(err.message);
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
    return <div>Loading maintenance history...</div>;
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {records.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No maintenance records</h3>
          <p className="mt-1 text-sm text-gray-500">
            No maintenance records have been added yet.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {records.map((record) => (
              <li key={record.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Wrench className="h-5 w-5 text-gray-400 mr-2" />
                      <p className="text-sm font-medium text-gray-900">
                        {record.service_items[0]?.description || 'Maintenance Service'}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {record.status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        {new Date(record.service_date).toLocaleDateString()}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        <DollarSign className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        {formatCurrency(record.total_cost)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>Odometer: {record.odometer_reading.toLocaleString()} miles</p>
                    </div>
                  </div>
                  {record.notes && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">{record.notes}</p>
                    </div>
                  )}
                  <div className="mt-2">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Parts Cost</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatCurrency(record.service_items[0]?.parts_cost || 0)}
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Labor Cost</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatCurrency(record.service_items[0]?.labor_cost || 0)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}