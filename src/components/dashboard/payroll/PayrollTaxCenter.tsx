import { useState } from 'react';
import { Calendar, FileText, CheckCircle, AlertTriangle, Download, Archive, Printer } from 'lucide-react';

interface TaxFiling {
  id: string;
  name: string;
  period: string;
  dueDate: string;
  filedDate?: string;
  status: 'Accepted' | 'Filed' | 'Due';
}

export function PayrollTaxCenter() {
  const [activeTab, setActiveTab] = useState<'filings' | 'payments'>('filings');
  const [automatedTaxes, setAutomatedTaxes] = useState(true);

  const taxFilings: TaxFiling[] = [
    {
      id: '1',
      name: 'WA PFML Filing & Payment Worksheet',
      period: '10/01/2024 - 12/31/2024 (Q4)',
      dueDate: '01/31/2025',
      filedDate: '01/21/2025',
      status: 'Accepted'
    },
    {
      id: '2',
      name: '940',
      period: '01/01/2024 - 12/31/2024',
      dueDate: '01/31/2025',
      filedDate: '01/22/2025',
      status: 'Accepted'
    },
    {
      id: '3',
      name: 'ID 967',
      period: '01/01/2024 - 12/31/2024',
      dueDate: '01/31/2025',
      filedDate: '02/07/2025',
      status: 'Filed'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Filed':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'Due':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted':
        return 'text-green-600';
      case 'Filed':
        return 'text-blue-600';
      case 'Due':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Payroll Tax Center</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">Automated taxes and forms:</span>
            <button
              onClick={() => setAutomatedTaxes(!automatedTaxes)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                automatedTaxes ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  automatedTaxes ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('filings')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'filings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Filings
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Payments
          </button>
        </nav>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </button>
        <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
          <Download className="h-4 w-4 mr-2" />
          Resources
        </button>
        <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </button>
      </div>

      {/* Status Sections */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Action Needed</h3>
          <p className="text-sm text-gray-500">All good! We got you covered.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Coming Up</h3>
          <p className="text-sm text-gray-500">Coast is clear!</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Done</h3>
          <div className="space-y-4">
            {taxFilings.map((filing) => (
              <div
                key={filing.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-start space-x-4">
                  {getStatusIcon(filing.status)}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{filing.name}</h4>
                    <p className="text-sm text-gray-500">{filing.period}</p>
                    <div className="mt-1 flex items-center space-x-4 text-sm">
                      <span className="text-gray-500">
                        Due {new Date(filing.dueDate).toLocaleDateString()}
                      </span>
                      {filing.filedDate && (
                        <span className="text-gray-500">
                          Filed on {new Date(filing.filedDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`text-sm font-medium ${getStatusColor(filing.status)}`}>
                    {filing.status}
                  </span>
                  <button className="text-blue-600 hover:text-blue-900">
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}