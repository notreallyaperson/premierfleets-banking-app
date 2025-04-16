import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { X, Plus, Trash2, Calculator } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  payment_terms: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
  total: number;
}

interface InvoiceFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function InvoiceForm({ onClose, onSuccess }: InvoiceFormProps) {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    reference: '',
    notes: '',
    terms_and_conditions: '',
    tax_inclusive: false
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([{
    description: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 0,
    tax_amount: 0,
    subtotal: 0,
    total: 0
  }]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, payment_terms')
        .eq('company_id', profile!.company_id)
        .order('name');

      if (error) throw error;
      if (data) setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const generateInvoiceNumber = () => {
    const prefix = 'INV';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  };

  const calculateLineTotals = (item: LineItem): LineItem => {
    const subtotal = item.quantity * item.unit_price;
    const taxAmount = subtotal * (item.tax_rate / 100);
    return {
      ...item,
      subtotal,
      tax_amount: taxAmount,
      total: subtotal + taxAmount
    };
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: number | string) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = {
      ...newLineItems[index],
      [field]: value
    };
    newLineItems[index] = calculateLineTotals(newLineItems[index]);
    setLineItems(newLineItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: lineItems[lineItems.length - 1]?.tax_rate || 0,
      tax_amount: 0,
      subtotal: 0,
      total: 0
    }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    return lineItems.reduce((acc, item) => ({
      subtotal: acc.subtotal + item.subtotal,
      tax: acc.tax + item.tax_amount,
      total: acc.total + item.total
    }), { subtotal: 0, tax: 0, total: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const invoiceNumber = generateInvoiceNumber();
      const totals = calculateTotals();

      // Create invoice record
      const { data: invoice, error: invoiceError } = await supabase
        .from('accounts_receivable')
        .insert([{
          company_id: profile!.company_id,
          customer_id: formData.customer_id,
          invoice_number: invoiceNumber,
          invoice_date: formData.invoice_date,
          due_date: formData.due_date,
          reference: formData.reference,
          notes: formData.notes,
          terms_and_conditions: formData.terms_and_conditions,
          tax_inclusive: formData.tax_inclusive,
          subtotal: totals.subtotal,
          tax_amount: totals.tax,
          amount: totals.total,
          balance: totals.total,
          status: 'pending'
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create line items
      const { error: lineItemsError } = await supabase
        .from('invoice_lines')
        .insert(
          lineItems.map(item => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            subtotal: item.subtotal,
            total: item.total
          }))
        );

      if (lineItemsError) throw lineItemsError;

      onSuccess();
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

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full m-4">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-gray-900">Create New Invoice</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Customer
              </label>
              <select
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Reference Number
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="PO number, project ID, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Invoice Date
              </label>
              <input
                type="date"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Due Date
              </label>
              <input
                type="date"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-medium text-gray-900">Line Items</h4>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tax Rate %</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tax Amount</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lineItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          required
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                          placeholder="Item description"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          required
                          min="1"
                          step="1"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm text-right"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm text-right"
                          value={item.unit_price}
                          onChange={(e) => handleLineItemChange(index, 'unit_price', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          required
                          min="0"
                          max="100"
                          step="0.1"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm text-right"
                          value={item.tax_rate}
                          onChange={(e) => handleLineItemChange(index, 'tax_rate', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-sm text-gray-900">
                        {formatCurrency(item.tax_amount)}
                      </td>
                      <td className="px-3 py-2 text-right text-sm text-gray-900">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="text-red-600 hover:text-red-900"
                          disabled={lineItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                      Subtotal
                    </td>
                    <td colSpan={3} className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(calculateTotals().subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                      Total Tax
                    </td>
                    <td colSpan={3} className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(calculateTotals().tax)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                      Total Amount
                    </td>
                    <td colSpan={3} className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(calculateTotals().total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes for the customer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Terms and Conditions
              </label>
              <textarea
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.terms_and_conditions}
                onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                placeholder="Payment terms, delivery terms, etc."
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="tax_inclusive"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={formData.tax_inclusive}
              onChange={(e) => setFormData({ ...formData, tax_inclusive: e.target.checked })}
            />
            <label htmlFor="tax_inclusive" className="ml-2 block text-sm text-gray-900">
              Prices are tax inclusive
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
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}