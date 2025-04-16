import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import {
  Building2,
  Truck,
  Receipt,
  Shield,
  BarChart3,
  Ban as Bank,
  Menu,
  X,
  Gauge,
  CreditCard,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  Users,
} from 'lucide-react';
import { DashboardHome } from './DashboardHome';
import { Transactions } from './transactions/Transactions';
import { Fleet } from './fleet/Fleet';
import { Reports } from './reports/Reports';
import { Settings } from './settings/Settings';
import { Accounting } from './accounting/Accounting';
import { Documents } from './documents/Documents';
import { Payroll } from './payroll/Payroll';
import { Banking } from './banking/Banking';

export function Dashboard() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  const navigation = [
    { name: 'Dashboard', icon: Gauge, path: '/dashboard' },
    { name: 'Banking', icon: Bank, path: '/dashboard/banking' },
    { name: 'Accounting', icon: Receipt, path: '/dashboard/accounting' },
    { name: 'Payroll', icon: Users, path: '/dashboard/payroll' },
    { name: 'Fleet', icon: Truck, path: '/dashboard/fleet' },
    { name: 'Reports', icon: BarChart3, path: '/dashboard/reports' },
    { name: 'Documents', icon: FileText, path: '/dashboard/documents' },
    { name: 'Settings', icon: SettingsIcon, path: '/dashboard/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50">
        <div className="flex items-center p-4 border-b">
          <Bank className="h-8 w-8 text-blue-600" />
          <span className="ml-2 text-xl font-bold text-gray-900">
            FleetFinance
          </span>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600">Welcome,</p>
            <p className="text-sm font-bold text-gray-900">
              {profile?.first_name} {profile?.last_name}
            </p>
          </div>

          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className="flex items-center space-x-3 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-3 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/banking/*" element={<Banking />} />
          <Route path="/accounting/*" element={<Accounting />} />
          <Route path="/payroll/*" element={<Payroll />} />
          <Route path="/fleet/*" element={<Fleet />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/settings/*" element={<Settings />} />
        </Routes>
      </div>
    </div>
  );
}