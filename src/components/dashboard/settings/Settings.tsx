import { useState } from 'react';
import { ProfileSettings } from './ProfileSettings';
import { CompanySettings } from './CompanySettings';
import { UserManagement } from './UserManagement';
import { SecuritySettings } from './SecuritySettings';
import { NotificationSettings } from './NotificationSettings';
import { User, Building2, Users, Shield, Bell } from 'lucide-react';

export function Settings() {
  const [activeSection, setActiveSection] = useState('profile');

  const sections = [
    { id: 'profile', name: 'Profile', icon: User, component: ProfileSettings },
    { id: 'company', name: 'Company', icon: Building2, component: CompanySettings },
    { id: 'users', name: 'Users', icon: Users, component: UserManagement },
    { id: 'security', name: 'Security', icon: Shield, component: SecuritySettings },
    { id: 'notifications', name: 'Notifications', icon: Bell, component: NotificationSettings }
  ];

  const activeComponent = sections.find(s => s.id === activeSection)?.component || ProfileSettings;
  const ActiveComponent = activeComponent;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
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