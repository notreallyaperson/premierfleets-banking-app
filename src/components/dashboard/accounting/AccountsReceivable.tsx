import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { DollarSign, Plus, Filter, Calendar, AlertTriangle, FileText } from 'lucide-react';
import { InvoiceForm } from './InvoiceForm';
import { PaymentForm } from './PaymentForm';

interface Customer {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  payment_terms: string;
  credit_limit: number;
}

interface Invoice {
  id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  balance: number;
  status: string;
  customer: Customer;
  payments: Payment[];
}

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string;
}

export function AccountsReceivable() {
  const { profile } = useAuthStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    dateRange: '30',
    customer: ''
  });

  useEffect(() => {
    if (profile?.company_id) {
      fetchInvoices();
    }
  }, [profile, filters]);

  const fetchInvoices = async () => {
    try {
      let query = supabase
        .from('accounts_receivable')
        .select(`
          *,
          customer:customers (
            id,
            name,
            contact_name,
            email,
            payment_terms,
            credit_limit
          ),
          payments (
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
        query = query.gte('invoice_date', date.toISOString());
      }

      if (filters.customer) {
        query = query.eq('customer_id', filters.customer);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (data) setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
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
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: window.innerWidth < 640 ? 'compact' : 'standard',
      maximumFractionDigits: window.innerWidth < 640 ? 1 : 2
    });
    return formatter.format(amount);
  };

  const formatNumber = (num: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      notation: window.innerWidth < 640 ? 'compact' : 'standard',
      maximumFractionDigits: 1
    });
    return formatter.format(num);
  };

  const calculateTotals = () => {
    return invoices.reduce((acc, invoice) => {
      acc.total += invoice.amount;
      acc.outstanding += invoice.balance;
      if (invoice.status === 'overdue') {
        acc.overdue += invoice.balance;
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
        <h1 className="text-2xl font-bold text-gray-900">Accounts Receivable</h1>
        <button
          onClick={() => setShowInvoiceForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Receivables</p>
              <p className="mt-2 text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900">
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

      {/* Invoices List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {loading ? (
            <li className="px-6 py-4 text-center text-gray-500">
              Loading invoices...
            </li>
          ) : invoices.length === 0 ? (
            <li className="px-6 py-4 text-center text-gray-500">
              No invoices found
            </li>
          ) : (
            invoices.map((invoice) => (
              <li key={invoice.id}>
                <div className="px-4 py-4 flex items-center sm:px-6">
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <div className="flex text-sm">
                        <p className="font-medium text-blue-600 truncate">
                          {invoice.invoice_number}
                        </p>
                        <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                          to {invoice.customer.name}
                        </p>
                      </div>
                      <div className="mt-2 flex">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                          <p>
                            Due <time dateTime={invoice.due_date}>{new Date(invoice.due_date).toLocaleDateString()}</time>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                      <div className="flex -space-x-1 overflow-hidden">
                        <div className="flex items-center space-x-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(invoice.amount)}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
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

      {/* Invoice Form Modal */}
      {showInvoiceForm && (
        <InvoiceForm
          onClose={() => setShowInvoiceForm(false)}
          onSuccess={() => {
            setShowInvoiceForm(false);
            fetchInvoices();
          }}
        />
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedInvoice && (
        <PaymentForm
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedInvoice(null);
          }}
          onSuccess={() => {
            setShowPaymentForm(false);
            setSelectedInvoice(null);
            fetchInvoices();
          }}
        />
      )}
    </div>
  );
}