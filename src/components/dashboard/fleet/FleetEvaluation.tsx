import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign,
  Calendar,
  Car,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface VehicleEvaluation {
  id: string;
  vehicle_id: string;
  evaluation_date: string;
  market_value: number;
  condition_rating: number;
  maintenance_score: number;
  efficiency_score: number;
  recommendations: string[];
  risk_factors: string[];
  documents: {
    id: string;
    name: string;
    analysis_result: any;
  }[];
}

export function FleetEvaluation() {
  const { profile } = useAuthStore();
  const [evaluations, setEvaluations] = useState<VehicleEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState<VehicleEvaluation | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.company_id) {
      fetchVehicles();
      fetchEvaluations();
    }
  }, [profile]);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', profile!.company_id)
        .eq('status', 'active');

      if (error) throw error;
      if (data) setVehicles(data);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    }
  };

  const fetchEvaluations = async () => {
    try {
      // In a real app, this would fetch from a vehicle_evaluations table
      // For now, we'll generate some sample data
      const sampleEvaluations = vehicles.map(vehicle => ({
        id: crypto.randomUUID(),
        vehicle_id: vehicle.id,
        evaluation_date: new Date().toISOString(),
        market_value: Math.floor(Math.random() * 50000) + 10000,
        condition_rating: Math.floor(Math.random() * 5) + 1,
        maintenance_score: Math.floor(Math.random() * 100),
        efficiency_score: Math.floor(Math.random() * 100),
        recommendations: [
          'Schedule regular maintenance',
          'Monitor fuel efficiency',
          'Update vehicle documentation'
        ],
        risk_factors: [
          'High mileage',
          'Aging components',
          'Market depreciation'
        ],
        documents: []
      }));

      setEvaluations(sampleEvaluations);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching evaluations:', err);
      setLoading(false);
    }
  };

  const getConditionColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const calculateAverageValue = () => {
    if (evaluations.length === 0) return 0;
    const total = evaluations.reduce((sum, evaluation) => sum + evaluation.market_value, 0);
    return Math.floor(total / evaluations.length);
  };

  const calculateAverageCondition = () => {
    if (evaluations.length === 0) return 0;
    const total = evaluations.reduce((sum, evaluation) => sum + evaluation.condition_rating, 0);
    return (total / evaluations.length).toFixed(1);
  };

  const calculateAverageMaintenanceScore = () => {
    if (evaluations.length === 0) return 0;
    const total = evaluations.reduce((sum, evaluation) => sum + evaluation.maintenance_score, 0);
    return Math.floor(total / evaluations.length);
  };

  const calculateAverageEfficiencyScore = () => {
    if (evaluations.length === 0) return 0;
    const total = evaluations.reduce((sum, evaluation) => sum + evaluation.efficiency_score, 0);
    return Math.floor(total / evaluations.length);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Fleet Evaluation</h2>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Value</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                ${calculateAverageValue().toLocaleString()}
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
              <p className="text-sm font-medium text-gray-600">Avg Condition</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {calculateAverageCondition()}/5
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Car className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Maintenance Score</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {calculateAverageMaintenanceScore()}%
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Efficiency Score</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {calculateAverageEfficiencyScore()}%
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Evaluations List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Market Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Condition
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Maintenance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Efficiency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Evaluated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading evaluations...
                  </td>
                </tr>
              ) : evaluations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No evaluations found
                  </td>
                </tr>
              ) : (
                evaluations.map((evaluation) => {
                  const vehicle = vehicles.find(v => v.id === evaluation.vehicle_id);
                  return (
                    <tr
                      key={evaluation.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedEvaluation(evaluation)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {vehicle?.year} {vehicle?.make} {vehicle?.model}
                            </div>
                            <div className="text-sm text-gray-500">
                              VIN: {vehicle?.vin}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          ${evaluation.market_value.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getConditionColor(evaluation.condition_rating)}`}>
                          {evaluation.condition_rating}/5
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getScoreColor(evaluation.maintenance_score)}`}>
                          {evaluation.maintenance_score}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getScoreColor(evaluation.efficiency_score)}`}>
                          {evaluation.efficiency_score}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(evaluation.evaluation_date).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluation Details Modal */}
      {selectedEvaluation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Vehicle Evaluation Details
              </h3>
              <button
                onClick={() => setSelectedEvaluation(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Evaluation Scores</h4>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-500">Market Value</span>
                      <span className="text-sm font-bold text-gray-900">
                        ${selectedEvaluation.market_value.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-500">Condition Rating</span>
                      <span className={`text-sm font-bold ${getConditionColor(selectedEvaluation.condition_rating)}`}>
                        {selectedEvaluation.condition_rating}/5
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-500">Maintenance Score</span>
                      <span className={`text-sm font-bold ${getScoreColor(selectedEvaluation.maintenance_score)}`}>
                        {selectedEvaluation.maintenance_score}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-500">Efficiency Score</span>
                      <span className={`text-sm font-bold ${getScoreColor(selectedEvaluation.efficiency_score)}`}>
                        {selectedEvaluation.efficiency_score}%
                      </span>
                    </div>
                  </div>
                </div>

                <h4 className="text-sm font-medium text-gray-900 mb-4 mt-6">Recommendations</h4>
                <div className="space-y-2">
                  {selectedEvaluation.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Risk Factors</h4>
                <div className="space-y-2">
                  {selectedEvaluation.risk_factors.map((risk, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{risk}</span>
                    </div>
                  ))}
                </div>

                <h4 className="text-sm font-medium text-gray-900 mb-4 mt-6">Related Documents</h4>
                <div className="space-y-2">
                  {selectedEvaluation.documents.length === 0 ? (
                    <p className="text-sm text-gray-500">No documents available</p>
                  ) : (
                    selectedEvaluation.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-600">{doc.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}