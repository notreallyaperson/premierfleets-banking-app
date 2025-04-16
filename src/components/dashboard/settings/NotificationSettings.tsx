import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { Bell, Mail, MessageSquare, AlertTriangle } from 'lucide-react';

interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  maintenance_alerts: boolean;
  transaction_alerts: boolean;
  fleet_updates: boolean;
  security_alerts: boolean;
  weekly_reports: boolean;
  monthly_reports: boolean;
}

const defaultPreferences: NotificationPreferences = {
  email_notifications: true,
  push_notifications: true,
  maintenance_alerts: true,
  transaction_alerts: true,
  fleet_updates: true,
  security_alerts: true,
  weekly_reports: true,
  monthly_reports: true
};

export function NotificationSettings() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);

  useEffect(() => {
    if (profile?.id) {
      fetchNotificationPreferences();
    }
  }, [profile]);

  const fetchNotificationPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', profile!.id);

      if (error) throw error;
      
      // If preferences exist, use them. Otherwise, use defaults
      if (data && data.length > 0) {
        setPreferences(data[0]);
      } else {
        // Create default preferences for the user
        const { error: insertError } = await supabase
          .from('notification_preferences')
          .insert([{
            user_id: profile!.id,
            ...defaultPreferences
          }]);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  };

  const handleToggle = async (key: keyof NotificationPreferences) => {
    setLoading(true);
    setError(null);

    try {
      const newPreferences = {
        ...preferences,
        [key]: !preferences[key]
      };

      const { error: updateError } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: profile!.id,
          ...newPreferences
        });

      if (updateError) throw updateError;
      setPreferences(newPreferences);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200">
        {/* General Notifications */}
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Notification Preferences</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Choose how you want to receive notifications.</p>
          </div>
          <div className="mt-5 space-y-6">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="email_notifications"
                  type="checkbox"
                  checked={preferences.email_notifications}
                  onChange={() => handleToggle('email_notifications')}
                  disabled={loading}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="email_notifications" className="font-medium text-gray-700">
                  Email Notifications
                </label>
                <p className="text-gray-500 text-sm">Receive notifications via email.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="push_notifications"
                  type="checkbox"
                  checked={preferences.push_notifications}
                  onChange={() => handleToggle('push_notifications')}
                  disabled={loading}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="push_notifications" className="font-medium text-gray-700">
                  Push Notifications
                </label>
                <p className="text-gray-500 text-sm">Receive push notifications in your browser.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Types */}
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Alert Types</h3>
          <div className="mt-5 space-y-6">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="maintenance_alerts"
                  type="checkbox"
                  checked={preferences.maintenance_alerts}
                  onChange={() => handleToggle('maintenance_alerts')}
                  disabled={loading}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="maintenance_alerts" className="font-medium text-gray-700">
                  Maintenance Alerts
                </label>
                <p className="text-gray-500 text-sm">Get notified about vehicle maintenance schedules and updates.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="transaction_alerts"
                  type="checkbox"
                  checked={preferences.transaction_alerts}
                  onChange={() => handleToggle('transaction_alerts')}
                  disabled={loading}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="transaction_alerts" className="font-medium text-gray-700">
                  Transaction Alerts
                </label>
                <p className="text-gray-500 text-sm">Receive notifications about financial transactions.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="fleet_updates"
                  type="checkbox"
                  checked={preferences.fleet_updates}
                  onChange={() => handleToggle('fleet_updates')}
                  disabled={loading}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="fleet_updates" className="font-medium text-gray-700">
                  Fleet Updates
                </label>
                <p className="text-gray-500 text-sm">Get updates about vehicle status changes and assignments.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="security_alerts"
                  type="checkbox"
                  checked={preferences.security_alerts}
                  onChange={() => handleToggle('security_alerts')}
                  disabled={loading}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="security_alerts" className="font-medium text-gray-700">
                  Security Alerts
                </label>
                <p className="text-gray-500 text-sm">Receive important security notifications.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Report Preferences */}
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Report Preferences</h3>
          <div className="mt-5 space-y-6">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="weekly_reports"
                  type="checkbox"
                  checked={preferences.weekly_reports}
                  onChange={() => handleToggle('weekly_reports')}
                  disabled={loading}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="weekly_reports" className="font-medium text-gray-700">
                  Weekly Reports
                </label>
                <p className="text-gray-500 text-sm">Receive weekly summary reports.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="monthly_reports"
                  type="checkbox"
                  checked={preferences.monthly_reports}
                  onChange={() => handleToggle('monthly_reports')}
                  disabled={loading}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="monthly_reports" className="font-medium text-gray-700">
                  Monthly Reports
                </label>
                <p className="text-gray-500 text-sm">Receive detailed monthly reports.</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="px-4 py-5 sm:p-6">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}