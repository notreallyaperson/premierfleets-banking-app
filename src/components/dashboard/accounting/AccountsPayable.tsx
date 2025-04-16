import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { DollarSign, Plus, Filter, Calendar, AlertTriangle, FileText, X, Upload } from 'lucide-react';
import { BillUploadModal } from './BillUploadModal';
import { BillForm } from './BillForm';

interface Vendor {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  payment_terms: string;
  credit_limit: number;
}

interface Bill {
  id: string;
  vendor_id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  amount: number;
  balance: number;
  status: string;
  vendor: Vendor;
  bill_payments: Payment[];
}

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string;
}

export function AccountsPayable() {
  const { profile } = useAuthStore();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBillForm, setShowBillForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    dateRange: '30',
    vendor: ''
  });

  useEffect(() => {
    if (profile?.company_id) {
      fetchBills();
    }
  }, [profile, filters]);

  const fetchBills = async () => {
    try {
      let query = supabase
        .from('accounts_payable')
        .select(`
          *,
          vendor:vendors (
            id,
            name,
            contact_name,
            email,
            payment_terms,
            credit_limit
          ),
          bill_payments (
            id,
            payment_date,
            amount,
            payment_method,
            reference_number
          )
        `)
        .eq('company_id', profile!.company_id)
        .order('due_date', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.dateRange) {
        const date = new Date();
        date.setDate(date.getDate() - parseInt(filters.dateRange));
        query = query.gte('bill_date', date.toISOString());
      }

      if (filters.vendor) {
        query = query.eq('vendor_id', filters.vendor);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (data) setBills(data);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
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

  const calculateTotals = () => {
    return bills.reduce((acc, bill) => {
      acc.total += bill.amount;
      acc.outstanding += bill.balance;
      if (bill.status === 'overdue') {
        acc.overdue += bill.balance;
      }
      return acc;
    }, {
      total: 0,
      outstanding: 0,
      overdue: 0
    });
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Accounts Payable</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload Bill
          </button>
          <button
            onClick={() => setShowBillForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Bill
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Payables</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(totals.total)}
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
              <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(totals.outstanding)}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(totals.overdue)}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date Range</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            >
              <option value="30">Last 30 Days</option>
              <option value="60">Last 60 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="180">Last 6 Months</option>
              <option value="365">Last Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bills List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {loading ? (
            <li className="px-6 py-4 text-center text-gray-500">
              Loading bills...
            </li>
          ) : bills.length === 0 ? (
            <li className="px-6 py-4 text-center text-gray-500">
              No bills found
            </li>
          ) : (
            bills.map((bill) => (
              <li key={bill.id}>
                <div className="px-4 py-4 flex items-center sm:px-6">
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <div className="flex text-sm">
                        <p className="font-medium text-blue-600 truncate">
                          {bill.bill_number}
                        </p>
                        <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                          from {bill.vendor.name}
                        </p>
                      </div>
                      <div className="mt-2 flex">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                          <p>
                            Due <time dateTime={bill.due_date}>{new Date(bill.due_date).toLocaleDateString()}</time>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                      <div className="flex -space-x-1 overflow-hidden">
                        <div className="flex items-center space-x-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                            {bill.status}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(bill.amount)}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedBill(bill);
                              setShowPaymentForm(true);
                            }}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                          >
                            Record Payment
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Bill Form Modal */}
      {showBillForm && (
        <BillForm
          onClose={() => setShowBillForm(false)}
          onSuccess={() => {
            setShowBillForm(false);
            fetchBills();
          }}
        />
      )}

      {/* Upload Bill Modal */}
      {showUploadModal && (
        <BillUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchBills();
          }}
        />
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedBill && (
        <PaymentForm
          bill={selectedBill}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedBill(null);
          }}
          onSuccess={() => {
            setShowPaymentForm(false);
            setSelectedBill(null);
            fetchBills();
          }}
        />
      )}
    </div>
  );
}

interface PaymentFormProps {
  bill: Bill;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentForm({ bill, onClose, onSuccess }: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: bill.balance.toString(),
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const paymentAmount = parseFloat(formData.amount);
      
      if (paymentAmount > bill.balance) {
        throw new Error('Payment amount cannot exceed remaining balance');
      }

      // Create payment record - Update table name to bill_payments
      const { error: paymentError } = await supabase
        .from('bill_payments')
        .insert([{
          accounts_payable_id: bill.id,
          payment_date: formData.payment_date,
          amount: paymentAmount,
          payment_method: formData.payment_method,
          reference_number: formData.reference_number,
          notes: formData.notes
        }]);

      if (paymentError) throw paymentError;

      // The bill balance and status will be updated automatically by the trigger
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
          <div>
            <h3 className="text-lg font-medium text-gray-900">Record Payment</h3>
            <p className="mt-1 text-sm text-gray-500">
              Bill #{bill.bill_number} for {bill.vendor.name}
            </p>
          </div>
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
              Payment Date
            </label>
            <input
              type="date"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Amount
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                required
                max={bill.balance}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Remaining balance: {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(bill.balance)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Payment Method
            </label>
            <select
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="check">Check</option>
              <option value="credit_card">Credit Card</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reference Number
            </label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder="Check number, transaction ID, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}