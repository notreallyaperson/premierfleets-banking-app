import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Users, DollarSign, Clock, Calendar, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PayrollDashboard() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalPayroll: 0,
    nextPayrollDate: '',
    pendingTimesheets: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.company_id) {
      fetchPayrollStats();
    }
  }, [profile]);

  const fetchPayrollStats = async () => {
    try {
      // Fetch employee count
      const { data: employees } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', profile!.company_id);

      // Fetch latest payroll run
      const { data: latestPayroll } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('company_id', profile!.company_id)
        .order('pay_date', { ascending: false })
        .limit(1);

      // Fetch pending timesheets
      const { data: timesheets } = await supabase
        .from('timesheets')
        .select('id')
        .eq('company_id', profile!.company_id)
        .eq('status', 'pending');

      setStats({
        totalEmployees: employees?.length || 0,
        totalPayroll: latestPayroll?.[0]?.total_amount || 0,
        nextPayrollDate: latestPayroll?.[0]?.next_pay_date || new Date().toISOString(),
        pendingTimesheets: timesheets?.length || 0
      });
    } catch (error) {
      console.error('Error fetching payroll stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = () => {
    navigate('/dashboard/payroll/employees');
  };

  const handleRunPayroll = () => {
    navigate('/dashboard/payroll/payroll-runs');
  };

  const handleAddTimesheet = () => {
    navigate('/dashboard/payroll/timesheets');
  };

  const handleGenerateReports = () => {
    navigate('/dashboard/reports');
  };

  if (loading) {
    return <div>Loading payroll dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {stats.totalEmployees}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Last Payroll Total</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                ${stats.totalPayroll.toLocaleString()}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Next Payroll Date</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {new Date(stats.nextPayrollDate).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Timesheets</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {stats.pendingTimesheets}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={handleRunPayroll}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <DollarSign className="h-5 w-5 mr-2 text-gray-400" />
            Run Payroll
          </button>
          <button 
            onClick={handleAddEmployee}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Users className="h-5 w-5 mr-2 text-gray-400" />
            Add Employee
          </button>
          <button 
            onClick={handleAddTimesheet}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Clock className="h-5 w-5 mr-2 text-gray-400" />
            Add Timesheet
          </button>
          <button 
            onClick={handleGenerateReports}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FileText className="h-5 w-5 mr-2 text-gray-400" />
            Generate Reports
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">January Payroll Completed</p>
                <p className="text-sm text-gray-500">Total: $45,000</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">2 days ago</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">New Employee Added</p>
                <p className="text-sm text-gray-500">John Smith - Driver</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">3 days ago</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Timesheet Approvals</p>
                <p className="text-sm text-gray-500">15 timesheets approved</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">4 days ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}