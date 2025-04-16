import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Heart, Plus, Edit2, X } from 'lucide-react';

interface Benefit {
  id: string;
  name: string;
  type: string;
  description: string;
  cost_employee: number;
  cost_employer: number;
  enrollment_period: string;
  status: 'active' | 'inactive';
}

export function Benefits() {
  const { profile } = useAuthStore();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBenefitForm, setShowBenefitForm] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchBenefits();
    }
  }, [profile]);

  const fetchBenefits = async () => {
    try {
      const { data, error } = await supabase
        .from('benefits')
        .select('*')
        .eq('company_id', profile!.company_id)
        .order('name');

      if (error) throw error;
      if (data) setBenefits(data);
    } catch (error) {
      console.error('Error fetching benefits:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Benefits</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage employee benefits and plans.
          </p>
        </div>
        <button
          onClick={() => setShowBenefitForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Benefit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center text-gray-500">
            Loading benefits...
          </div>
        ) : benefits.length === 0 ? (
          <div className="col-span-3 text-center text-gray-500">
            No benefits found
          </div>
        ) : (
          benefits.map((benefit) => (
            <div
              key={benefit.id}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Heart className={`h-5 w-5 ${benefit.status === 'active' ? 'text-red-500' : 'text-gray-400'} mr-2`} />
                  <h4 className="text-lg font-medium text-gray-900">{benefit.name}</h4>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  benefit.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {benefit.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">{benefit.description}</p>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{benefit.type}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Enrollment</dt>
                  <dd className="mt-1 text-sm text-gray-900">{benefit.enrollment_period}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Employee Cost</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatCurrency(benefit.cost_employee)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Employer Cost</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatCurrency(benefit.cost_employer)}</dd>
                </div>
              </dl>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => setSelectedBenefit(benefit)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  <Edit2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Benefit Form Modal */}
      {(showBenefitForm || selectedBenefit) && (
        <BenefitForm
          benefit={selectedBenefit}
          onClose={() => {
            setShowBenefitForm(false);
            setSelectedBenefit(null);
          }}
          onSuccess={() => {
            setShowBenefitForm(false);
            setSelectedBenefit(null);
            fetchBenefits();
          }}
        />
      )}
    </div>
  );
}

interface BenefitFormProps {
  benefit?: Benefit | null;
  onClose: () => void;
  onSuccess: () => void;
}

function BenefitForm({ benefit, onClose, onSuccess }: BenefitFormProps) {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: benefit?.name || '',
    type: benefit?.type || '',
    description: benefit?.description || '',
    cost_employee: benefit?.cost_employee || 0,
    cost_employer: benefit?.cost_employer || 0,
    enrollment_period: benefit?.enrollment_period || '',
    status: benefit?.status || 'active'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (benefit) {
        // Update existing benefit
        const { error: updateError } = await supabase
          .from('benefits')
          .update(formData)
          .eq('id', benefit.id);

        if (updateError) throw updateError;
      } else {
        // Create new benefit
        const { error: insertError } = await supabase
          .from('benefits')
          .insert([{
            ...formData,
            company_id: profile!.company_id
          }]);

        if (insertError) throw insertError;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {benefit ? 'Edit Benefit' : 'Add Benefit'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Benefit Name
            </label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="">Select Type</option>
              <option value="health">Health Insurance</option>
              <option value="dental">Dental Insurance</option>
              <option value="vision">Vision Insurance</option>
              <option value="life">Life Insurance</option>
              <option value="retirement">Retirement Plan</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Employee Cost
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  value={formData.cost_employee}
                  onChange={(e) => setFormData({ ...formData, cost_employee: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Employer Cost
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  value={formData.cost_employer}
                  onChange={(e) => setFormData({ ...formData, cost_employer: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Enrollment Period
            </label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.enrollment_period}
              onChange={(e) => setFormData({ ...formData, enrollment_period: e.target.value })}
              placeholder="e.g., Annual, Quarterly, Open"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600">
              {error}
            </div>
          )}

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
              {loading ? 'Saving...' : (benefit ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}