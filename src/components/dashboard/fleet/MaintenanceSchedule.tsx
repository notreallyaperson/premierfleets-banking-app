import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Calendar, AlertTriangle, Wrench, Plus } from 'lucide-react';
import { MaintenanceForm } from './MaintenanceForm';

interface MaintenanceSchedule {
  id: string;
  vehicle_id: string;
  service_type: string;
  due_date: string;
  mileage_due: number;
  estimated_cost: number;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'scheduled' | 'completed';
  vehicle: {
    make: string;
    model: string;
    year: number;
    mileage: number;
  };
}

export function MaintenanceSchedule() {
  const { profile } = useAuthStore();
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchMaintenanceSchedules();
    }
  }, [profile]);

  const fetchMaintenanceSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_services')
        .select(`
          *,
          vehicle:vehicles (
            make,
            model,
            year,
            mileage
          )
        `)
        .eq('company_id', profile!.company_id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      if (data) setSchedules(data);
    } catch (error) {
      console.error('Error fetching maintenance schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getDueStatus = (schedule: MaintenanceSchedule) => {
    const today = new Date();
    const dueDate = new Date(schedule.due_date);
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (daysDiff < 0) {
      return { text: 'Overdue', class: 'text-red-600' };
    } else if (daysDiff <= 7) {
      return { text: 'Due Soon', class: 'text-yellow-600' };
    } else {
      return { text: `Due in ${daysDiff} days`, class: 'text-gray-600' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Maintenance Schedule</h2>
        <button
          onClick={() => setShowMaintenanceForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Schedule Maintenance
        </button>
      </div>

      {loading ? (
        <div>Loading maintenance schedules...</div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No maintenance scheduled</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by scheduling maintenance for your vehicles.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowMaintenanceForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Schedule Maintenance
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {schedules.map((schedule) => {
              const dueStatus = getDueStatus(schedule);
              return (
                <li key={schedule.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Wrench className="h-5 w-5 text-gray-400 mr-2" />
                        <p className="text-sm font-medium text-gray-900">
                          {schedule.service_type}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(schedule.priority)}`}>
                          {schedule.priority}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {schedule.vehicle.year} {schedule.vehicle.make} {schedule.vehicle.model}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                          {new Date(schedule.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm sm:mt-0">
                        <p className={`${dueStatus.class}`}>
                          {dueStatus.text}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-gray-500">
                          Due at: {schedule.mileage_due.toLocaleString()} miles
                        </div>
                        <div className="font-medium text-gray-900">
                          Est. Cost: {formatCurrency(schedule.estimated_cost)}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {showMaintenanceForm && (
        <MaintenanceForm
          vehicleId={selectedVehicleId}
          onClose={() => {
            setShowMaintenanceForm(false);
            setSelectedVehicleId(null);
          }}
          onSuccess={() => {
            setShowMaintenanceForm(false);
            setSelectedVehicleId(null);
            fetchMaintenanceSchedules();
          }}
        />
      )}
    </div>
  );
}