import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { X, Ban as Bank, CreditCard, AlertTriangle } from 'lucide-react';

interface PaymentMethodFormProps {
  vendorId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentMethodForm({ vendorId, onClose, onSuccess }: PaymentMethodFormProps) {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<'bank_account' | 'credit_card'>('bank_account');
  const [formData, setFormData] = useState({
    name: '',
    bank_name: '',
    account_number: '',
    routing_number: '',
    is_default: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create Stripe payment method
      const { data: stripeData } = await supabase.functions.invoke('create-payment-method', {
        body: {
          type,
          bank_account: {
            country: 'US',
            currency: 'usd',
            account_number: formData.account_number,
            routing_number: formData.routing_number
          }
        }
      });

      if (!stripeData?.payment_method_id) {
        throw new Error('Failed to create payment method');
      }

      // Save payment method to database
      const { error: saveError } = await supabase
        .from('payment_methods')
        .insert([{
          company_id: profile!.company_id,
          vendor_id: vendorId,
          type,
          name: formData.name,
          bank_name: formData.bank_name,
          stripe_payment_method_id: stripeData.payment_method_id,
          is_default: formData.is_default
        }]);

      if (saveError) throw saveError;
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
          <h3 className="text-lg font-medium text-gray-900">Add Payment Method</h3>
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
              Payment Method Type
            </label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('bank_account')}
                className={`flex items-center justify-center px-4 py-3 border rounded-lg ${
                  type === 'bank_account'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Bank className="h-5 w-5 mr-2" />
                Bank Account
              </button>
              <button
                type="button"
                onClick={() => setType('credit_card')}
                className={`flex items-center justify-center px-4 py-3 border rounded-lg ${
                  type === 'credit_card'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Credit Card
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name on Account
            </label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {type === 'bank_account' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bank Name
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Account Number
                </label>
                <input
                  type="text"
                  required
                  pattern="[0-9]*"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, '') })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Routing Number
                </label>
                <input
                  type="text"
                  required
                  pattern="[0-9]*"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={formData.routing_number}
                  onChange={(e) => setFormData({ ...formData, routing_number: e.target.value.replace(/\D/g, '') })}
                />
              </div>
            </>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_default"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
            />
            <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
              Set as default payment method
            </label>
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
              {loading ? 'Saving...' : 'Save Payment Method'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}