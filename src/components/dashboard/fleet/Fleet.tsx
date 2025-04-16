import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Plus, Filter, AlertTriangle, Calendar, Upload, X, ChevronRight, ArrowLeft, TruckIcon } from 'lucide-react';
import { DocumentAnalysis } from './DocumentAnalysis';
import { FleetEvaluation } from './FleetEvaluation';
import { FleetPurchasing } from './FleetPurchasing';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  license_plate: string;
  status: 'active' | 'maintenance' | 'retired' | 'sold';
  mileage: number;
  fuel_type: string;
}

interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  type: string;
  description: string;
  service_date: string;
  next_service_date: string;
}

export function Fleet() {
  const { profile } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showDocumentAnalysis, setShowDocumentAnalysis] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [showPurchasing, setShowPurchasing] = useState(false);

  useEffect(() => {
    if (profile?.company_id) {
      fetchVehicles();
      fetchMaintenance();
    }
  }, [profile]);

  async function fetchVehicles() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', profile!.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMaintenance() {
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .eq('company_id', profile!.company_id)
        .order('next_service_date', { ascending: true });

      if (error) throw error;
      if (data) setMaintenance(data);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'retired':
        return 'bg-gray-100 text-gray-800';
      case 'sold':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddVehicleClick = () => {
    if (!profile?.company_id) {
      console.error('No company ID available');
      return;
    }
    setShowAddVehicle(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {(showEvaluation || showPurchasing) && (
            <button
              onClick={() => {
                setShowEvaluation(false);
                setShowPurchasing(false);
              }}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Back to Fleet
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {showEvaluation ? 'Fleet Evaluation' : showPurchasing ? 'Purchase Vehicles' : 'Fleet Management'}
          </h1>
        </div>
        {!showEvaluation && !showPurchasing && (
          <div className="flex space-x-4">
            <button
              onClick={() => setShowPurchasing(true)}
              className="flex items-center px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              <TruckIcon className="w-4 h-4 mr-2" />
              Purchase Vehicles
            </button>
            <button
              onClick={() => setShowEvaluation(true)}
              className="flex items-center px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              <ChevronRight className="w-4 h-4 mr-2" />
              Fleet Evaluation
            </button>
            <button
              onClick={() => setShowDocumentAnalysis(true)}
              className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Analyze Documents
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
            <button
              onClick={handleAddVehicleClick}
              disabled={!profile?.company_id}
              className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </button>
          </div>
        )}
      </div>

      {/* Show either the main fleet view, evaluation view, or purchasing view */}
      {showPurchasing ? (
        <FleetPurchasing />
      ) : showEvaluation ? (
        <FleetEvaluation />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">
                    {vehicles.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Vehicles</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">
                    {vehicles.filter((v) => v.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Maintenance</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">
                    {vehicles.filter((v) => v.status === 'maintenance').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upcoming Maintenance</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">
                    {maintenance.filter((m) => new Date(m.next_service_date) > new Date()).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle List */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      License Plate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mileage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Service
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        Loading vehicles...
                      </td>
                    </tr>
                  ) : vehicles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No vehicles found
                      </td>
                    </tr>
                  ) : (
                    vehicles.map((vehicle) => {
                      const nextMaintenance = maintenance.find(
                        (m) => m.vehicle_id === vehicle.id
                      );
                      return (
                        <tr
                          key={vehicle.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedVehicle(vehicle)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {vehicle.year} {vehicle.make} {vehicle.model}
                                </div>
                                <div className="text-sm text-gray-500">
                                  VIN: {vehicle.vin}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(
                                vehicle.status
                              )}`}
                            >
                              {vehicle.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {vehicle.license_plate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {vehicle.mileage.toLocaleString()} mi
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {nextMaintenance ? (
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                {new Date(
                                  nextMaintenance.next_service_date
                                ).toLocaleDateString()}
                              </div>
                            ) : (
                              'No maintenance scheduled'
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Document Analysis Modal */}
      {showDocumentAnalysis && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">Document Analysis</h2>
              <button
                onClick={() => setShowDocumentAnalysis(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <X className="h-6 w-6" />
              </button>
            </div>
            <DocumentAnalysis onClose={() => setShowDocumentAnalysis(false)} />
          </div>
        </div>
      )}

      {/* Vehicle Details Modal */}
      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          maintenance={maintenance.filter((m) => m.vehicle_id === selectedVehicle.id)}
        />
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicle && profile?.company_id && (
        <AddVehicleModal
          companyId={profile.company_id}
          onClose={() => setShowAddVehicle(false)}
          onAdd={fetchVehicles}
        />
      )}
    </div>
  );
}

function VehicleDetailsModal({
  vehicle,
  onClose,
  maintenance,
}: {
  vehicle: Vehicle;
  onClose: () => void;
  maintenance: MaintenanceRecord[];
}) {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-medium text-gray-900">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Vehicle Details</h4>
            <dl className="mt-2 space-y-2">
              <div>
                <dt className="text-sm text-gray-500">VIN</dt>
                <dd className="text-sm font-medium text-gray-900">{vehicle.vin}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">License Plate</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {vehicle.license_plate}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Mileage</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {vehicle.mileage.toLocaleString()} mi
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Fuel Type</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {vehicle.fuel_type}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500">
              Maintenance History
            </h4>
            <div className="mt-2 space-y-2">
              {maintenance.map((record) => (
                <div
                  key={record.id}
                  className="bg-gray-50 p-3 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {record.type}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(record.service_date).toLocaleDateString()}
                      </p>
                    </div>
                    {record.next_service_date && (
                      <div className="text-sm text-gray-500">
                        Next: {new Date(record.next_service_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddVehicleModal({
  companyId,
  onClose,
  onAdd,
}: {
  companyId: string;
  onClose: () => void;
  onAdd: () => void;
}) {
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    license_plate: '',
    fuel_type: 'gasoline',
    mileage: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const mileage = parseInt(formData.mileage.toString(), 10);
      if (isNaN(mileage)) {
        throw new Error('Mileage must be a valid number');
      }

      const { error: insertError } = await supabase.from('vehicles').insert([
        {
          ...formData,
          mileage,
          company_id: companyId,
          status: 'active',
        },
      ]);

      if (insertError) throw insertError;

      onAdd();
      onClose();
    } catch (err: any) {
      console.error('Error adding vehicle:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Vehicle</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Make
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.make}
                onChange={(e) =>
                  setFormData({ ...formData, make: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Model
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.model}
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Year
              </label>
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear() + 1}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                VIN
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.vin}
                onChange={(e) =>
                  setFormData({ ...formData, vin: e.target.value })
                }
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              License Plate
            </label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.license_plate}
              onChange={(e) =>
                setFormData({ ...formData, license_plate: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Initial Mileage
            </label>
            <input
              type="number"
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.mileage}
              onChange={(e) =>
                setFormData({ ...formData, mileage: parseInt(e.target.value) || 0 })
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fuel Type
            </label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.fuel_type}
              onChange={(e) =>
                setFormData({ ...formData, fuel_type: e.target.value })
              }
              required
            >
              <option value="gasoline">Gasoline</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electric</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
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
              {loading ? 'Adding...' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}