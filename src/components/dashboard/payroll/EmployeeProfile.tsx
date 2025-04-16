import { useState } from 'react';
import { useAuthStore } from '../../../lib/store';
import { Edit2, Mail, Phone, MapPin, Calendar, User, DollarSign, Building2 } from 'lucide-react';

interface EmployeeProfile {
  legal_name: string;
  preferred_name: string;
  email: string;
  phone: string;
  home_address: string;
  mailing_address: string;
  birth_date: string;
  gender: string;
  ssn: string;
  status: string;
  hire_date: string;
  pay_schedule: string;
  work_location: string;
  manager: string;
  department: string;
  job_title: string;
  employee_id: string;
  workers_comp_class: string;
  billing_rate: string;
  federal_filing_status: string;
  state_filing_status: string;
  payment_method: string;
  salary: string;
  additional_pay: {
    holiday_pay: boolean;
    bonus: boolean;
  };
}

export function EmployeeProfile() {
  const { profile } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [employeeData, setEmployeeData] = useState<EmployeeProfile>({
    legal_name: 'Samantha Moss',
    preferred_name: 'Samantha',
    email: 'smoss@cfgef.com',
    phone: '',
    home_address: '1000 NE Butler Market Rd Apt 2\nBend, OR 97701',
    mailing_address: 'Same as home address',
    birth_date: '06/16/yyyy',
    gender: 'Female',
    ssn: 'XXXXX-7710',
    status: 'Active',
    hire_date: '10/25/2021',
    pay_schedule: 'Twice a month 2',
    work_location: '1001 SW Dick DR, Suite 102\nBEND, OR 97702',
    manager: '-',
    department: '-',
    job_title: 'Docs and Funding Coordinator',
    employee_id: '-',
    workers_comp_class: '-',
    billing_rate: '-',
    federal_filing_status: 'Single or Married Filing Separately',
    state_filing_status: 'Single',
    payment_method: 'Direct deposit',
    salary: '$68,500.00/year',
    additional_pay: {
      holiday_pay: true,
      bonus: true
    }
  });

  const sections = [
    {
      title: 'Personal info',
      fields: [
        { label: 'Legal name', value: employeeData.legal_name },
        { label: 'Preferred first name', value: employeeData.preferred_name },
        { label: 'Email', value: employeeData.email },
        { label: 'Phone number', value: employeeData.phone },
        { label: 'Home address', value: employeeData.home_address },
        { label: 'Mailing address', value: employeeData.mailing_address, badge: 'NEW' },
        { label: 'Birth date', value: employeeData.birth_date },
        { label: 'Gender', value: employeeData.gender },
        { label: 'Social Security number', value: employeeData.ssn }
      ]
    },
    {
      title: 'Employment details',
      fields: [
        { label: 'Status', value: employeeData.status },
        { label: 'Hire date', value: employeeData.hire_date },
        { label: 'Pay schedule', value: employeeData.pay_schedule },
        { label: 'Work location', value: employeeData.work_location },
        { label: 'Manager', value: employeeData.manager },
        { label: 'Department', value: employeeData.department },
        { label: 'Job title', value: employeeData.job_title },
        { label: 'Employee ID', value: employeeData.employee_id },
        { label: "Workers' comp class", value: employeeData.workers_comp_class },
        { label: 'Billing rate', value: employeeData.billing_rate }
      ]
    },
    {
      title: 'Tax withholdings',
      fields: [
        { label: 'Federal filing status', value: employeeData.federal_filing_status },
        { label: 'OR State taxes', value: employeeData.state_filing_status }
      ]
    },
    {
      title: 'Payment method',
      fields: [
        { label: 'Payment method', value: employeeData.payment_method }
      ]
    },
    {
      title: 'Pay types',
      fields: [
        { label: 'Salary', value: employeeData.salary },
        { label: 'Additional pay types', value: 'Holiday Pay, Bonus' }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {sections.map((section, index) => (
        <div key={index} className="bg-white shadow-sm rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
              <button
                onClick={() => setEditing(true)}
                className="text-blue-600 hover:text-blue-900"
              >
                <Edit2 className="h-5 w-5" />
              </button>
            </div>

            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              {section.fields.map((field, fieldIndex) => (
                <div key={fieldIndex} className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    {field.label}
                    {field.badge && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {field.badge}
                      </span>
                    )}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                    {field.value || '-'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ))}
    </div>
  );
}