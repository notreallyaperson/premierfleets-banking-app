import { useState } from 'react';
import { PayrollDashboard } from './PayrollDashboard';
import { Employees } from './Employees';
import { Contractors } from './Contractors';
import { Timesheets } from './Timesheets';
import { PayrollRuns } from './PayrollRuns';
import { TaxForms } from './TaxForms';
import { Benefits } from './Benefits';
import { Users, Clock, DollarSign, FileText, Heart, Calculator, Briefcase } from 'lucide-react';

export function Payroll() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const sections = [
    { id: 'dashboard', name: 'Dashboard', icon: Calculator, component: PayrollDashboard },
    { id: 'employees', name: 'Employees', icon: Users, component: Employees },
    { id: 'contractors', name: 'Contractors', icon: Briefcase, component: Contractors },
    { id: 'timesheets', name: 'Timesheets', icon: Clock, component: Timesheets },
    { id: 'payroll-runs', name: 'Payroll Runs', icon: DollarSign, component: PayrollRuns },
    { id: 'tax-forms', name: 'Tax Forms', icon: FileText, component: TaxForms },
    { id: 'benefits', name: 'Benefits', icon: Heart, component: Benefits }
  ];

  const ActiveComponent = sections.find(s => s.id === activeSection)?.component || PayrollDashboard;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
      </div>

      <div className="flex gap-6">
        {/* Navigation Sidebar */}
        <div className="w-64 bg-white rounded-lg shadow-sm p-4">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <section.icon className={`h-5 w-5 mr-3 ${
                  activeSection === section.id ? 'text-blue-700' : 'text-gray-400'
                }`} />
                {section.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}