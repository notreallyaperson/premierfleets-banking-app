import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  Truck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

interface DashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  monthlyExpenses: number;
  fuelEfficiency: number;
  maintenanceDue: number;
}

export function DashboardHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    activeVehicles: 0,
    monthlyExpenses: 0,
    fuelEfficiency: 0,
    maintenanceDue: 0,
  });

  // Sample data for the expense chart
  const expenseData = [
    { date: 'Jan', amount: 45000 },
    { date: 'Feb', amount: 52000 },
    { date: 'Mar', amount: 48000 },
    { date: 'Apr', amount: 51000 },
    { date: 'May', amount: 53000 },
    { date: 'Jun', amount: 49000 }
  ];

  // Sample data for upcoming maintenance
  const upcomingMaintenance = [
    {
      vehicle_id: 'TRK1234',
      type: 'Oil Change',
      next_service_date: '2025-02-15'
    },
    {
      vehicle_id: 'TRK5678',
      type: 'Tire Rotation',
      next_service_date: '2025-02-18'
    },
    {
      vehicle_id: 'TRK9012',
      type: 'Brake Inspection',
      next_service_date: '2025-02-20'
    }
  ];

  const formatCurrency = (amount: number) => {
    // Format based on screen size
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: window.innerWidth < 640 ? 'compact' : 'standard',
      maximumFractionDigits: window.innerWidth < 640 ? 1 : 2
    });
    return formatter.format(amount);
  };

  const formatNumber = (num: number) => {
    // Format based on screen size
    const formatter = new Intl.NumberFormat('en-US', {
      notation: window.innerWidth < 640 ? 'compact' : 'standard',
      maximumFractionDigits: 1
    });
    return formatter.format(num);
  };

  const handleCardClick = (section: string) => {
    navigate(`/dashboard/${section}`);
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Vehicles</p>
              <p className="mt-2 text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900">
                {formatNumber(stats.activeVehicles)}/{formatNumber(stats.totalVehicles)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Expenses</p>
              <p className="mt-2 text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900">
                {formatCurrency(stats.monthlyExpenses)}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fuel Efficiency</p>
              <p className="mt-2 text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900">
                {stats.fuelEfficiency.toFixed(1)} mpg
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Maintenance Due</p>
              <p className="mt-2 text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900">
                {formatNumber(stats.maintenanceDue)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Expenses Trend
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={expenseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#2563eb"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Upcoming Maintenance
          </h3>
          <div className="space-y-4">
            {upcomingMaintenance.map((record, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => handleCardClick('maintenance')}
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Vehicle ID: {record.vehicle_id.slice(-6)}
                    </p>
                    <p className="text-sm text-gray-500">{record.type}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(record.next_service_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}