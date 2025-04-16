import { useState } from 'react';
import { ExternalLink, TruckIcon, DollarSign, FileText, Calculator } from 'lucide-react';

interface TruckListing {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  location: string;
  imageUrl: string;
  specs: {
    engine: string;
    transmission: string;
    horsepower: number;
    torque: string;
    wheelbase: string;
    gvwr: string;
  };
}

export function FleetPurchasing() {
  const [selectedTruck, setSelectedTruck] = useState<TruckListing | null>(null);
  const [showFinanceCalc, setShowFinanceCalc] = useState(false);
  const [showFinanceForm, setShowFinanceForm] = useState(false);
  const [financeParams, setFinanceParams] = useState({
    downPayment: 0,
    termLength: '60',
    interestRate: 7.99
  });

  const truckListings: TruckListing[] = [
    {
      id: '1',
      make: 'Freightliner',
      model: 'Cascadia',
      year: 2024,
      price: 165000,
      mileage: 0,
      location: 'Dallas, TX',
      imageUrl: 'https://images.unsplash.com/photo-1586191582056-b7f0a8c1b3c0?auto=format&fit=crop&w=800&q=80',
      specs: {
        engine: 'Detroit DD15',
        transmission: 'DT12 Automated Manual',
        horsepower: 505,
        torque: '1850 lb-ft',
        wheelbase: '244"',
        gvwr: '80,000 lbs'
      }
    },
    {
      id: '2',
      make: 'Peterbilt',
      model: '579',
      year: 2024,
      price: 175000,
      mileage: 0,
      location: 'Chicago, IL',
      imageUrl: 'https://images.unsplash.com/photo-1566585396039-6431e8012657?auto=format&fit=crop&w=800&q=80',
      specs: {
        engine: 'PACCAR MX-13',
        transmission: 'PACCAR TX-18',
        horsepower: 510,
        torque: '1850 lb-ft',
        wheelbase: '240"',
        gvwr: '80,000 lbs'
      }
    },
    {
      id: '3',
      make: 'Kenworth',
      model: 'T680',
      year: 2024,
      price: 172000,
      mileage: 0,
      location: 'Atlanta, GA',
      imageUrl: 'https://images.unsplash.com/photo-1591768793355-74d04bb6608f?auto=format&fit=crop&w=800&q=80',
      specs: {
        engine: 'PACCAR MX-13',
        transmission: 'PACCAR TX-18',
        horsepower: 510,
        torque: '1850 lb-ft',
        wheelbase: '238"',
        gvwr: '80,000 lbs'
      }
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculatePayments = () => {
    if (!selectedTruck) return { monthlyPayment: 0, totalInterest: 0, totalCost: 0 };

    const loanAmount = selectedTruck.price - financeParams.downPayment;
    const monthlyRate = financeParams.interestRate / 100 / 12;
    const numberOfPayments = parseInt(financeParams.termLength);

    const monthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    const totalCost = monthlyPayment * numberOfPayments + financeParams.downPayment;
    const totalInterest = totalCost - selectedTruck.price;

    return {
      monthlyPayment,
      totalInterest,
      totalCost
    };
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {truckListings.map((truck) => (
          <div key={truck.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="aspect-w-16 aspect-h-9">
              <img
                src={truck.imageUrl}
                alt={`${truck.year} ${truck.make} ${truck.model}`}
                className="object-cover w-full h-48"
              />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {truck.year} {truck.make} {truck.model}
              </h3>
              <p className="text-sm text-gray-500">{truck.location}</p>
              <div className="mt-2">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(truck.price)}
                </p>
                <p className="text-sm text-gray-500">
                  {truck.mileage.toLocaleString()} miles
                </p>
              </div>
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Specifications</h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <dt className="text-sm text-gray-500">Engine</dt>
                    <dd className="text-sm font-medium text-gray-900">{truck.specs.engine}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Transmission</dt>
                    <dd className="text-sm font-medium text-gray-900">{truck.specs.transmission}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Horsepower</dt>
                    <dd className="text-sm font-medium text-gray-900">{truck.specs.horsepower} HP</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Torque</dt>
                    <dd className="text-sm font-medium text-gray-900">{truck.specs.torque}</dd>
                  </div>
                </dl>
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={() => {
                    setSelectedTruck(truck);
                    setShowFinanceCalc(true);
                  }}
                  className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate Payments
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Finance Calculator Modal */}
      {showFinanceCalc && selectedTruck && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Finance Calculator
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedTruck.year} {selectedTruck.make} {selectedTruck.model}
                </p>
              </div>
              <button
                onClick={() => setShowFinanceCalc(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <ExternalLink className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Down Payment
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={selectedTruck.price}
                    step="1000"
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    value={financeParams.downPayment}
                    onChange={(e) => setFinanceParams({ ...financeParams, downPayment: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Term Length (months)
                </label>
                <select
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={financeParams.termLength}
                  onChange={(e) => setFinanceParams({ ...financeParams, termLength: e.target.value })}
                >
                  <option value="36">36 months</option>
                  <option value="48">48 months</option>
                  <option value="60">60 months</option>
                  <option value="72">72 months</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Interest Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={financeParams.interestRate}
                  onChange={(e) => setFinanceParams({ ...financeParams, interestRate: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Payment Summary</h4>
                {(() => {
                  const { monthlyPayment, totalInterest, totalCost } = calculatePayments();
                  return (
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Vehicle Price</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {formatCurrency(selectedTruck.price)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Down Payment</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {formatCurrency(financeParams.downPayment)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Monthly Payment</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {formatCurrency(monthlyPayment)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Total Interest</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {formatCurrency(totalInterest)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Total Cost</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {formatCurrency(totalCost)}
                        </dd>
                      </div>
                    </dl>
                  );
                })()}
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowFinanceCalc(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFinanceCalc(false);
                    setShowFinanceForm(true);
                  }}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Apply for Financing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFinanceForm && selectedTruck && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Financing Application
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Please fill out all required fields to submit your financing application.
                </p>
              </div>
              <button
                onClick={() => setShowFinanceForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <ExternalLink className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-6">
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Vehicle</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedTruck.year} {selectedTruck.make} {selectedTruck.model}
                    </p>
                    <p className="text-sm text-gray-500">
                      Price: {formatCurrency(selectedTruck.price)}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    <p>Down Payment: {formatCurrency(financeParams.downPayment)}</p>
                    <p>Term: {financeParams.termLength} months</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Our financing team will review your application and contact you within 1-2 business days.
                </p>
                <button
                  onClick={() => setShowFinanceForm(false)}
                  className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Submit Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}