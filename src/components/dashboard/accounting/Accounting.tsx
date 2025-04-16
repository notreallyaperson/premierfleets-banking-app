import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { AccountsReceivable } from './AccountsReceivable';
import { AccountsPayable } from './AccountsPayable';
import { GeneralLedger } from './GeneralLedger';
import { TaxCategorization } from './TaxCategorization';
import { AIRules } from './AIRules';
import { FraudDetection } from './FraudDetection';
import { FinancialForecasting } from './FinancialForecasting';
import { CustomerManagement } from './CustomerManagement';
import { VendorManagement } from './VendorManagement';
import { Receipt, FileText, BookOpen, Ban as Bank, Calculator, Brain, Shield, TrendingUp, Users, ArrowLeft, Building2, ChevronDown } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  parent_id?: string | null;
  type: 'parent' | 'subsidiary';
  metadata?: {
    fleet_size?: number;
    location?: string;
    business_unit?: string;
  };
}

export function Accounting() {
  const { profile, setProfile } = useAuthStore();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompanySelector, setShowCompanySelector] = useState(false);

  useEffect(() => {
    if (profile?.company_id) {
      fetchCompanies();
    }
  }, [profile?.company_id]);

  const fetchCompanies = async () => {
    try {
      // First fetch the current company to determine if it's a parent or subsidiary
      const { data: currentCompany, error: currentError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile!.company_id)
        .single();

      if (currentError) throw currentError;

      let relatedCompanies;
      if (currentCompany.type === 'parent') {
        // If current company is parent, fetch all its subsidiaries
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .or(`id.eq.${profile!.company_id},parent_id.eq.${profile!.company_id}`);

        if (error) throw error;
        relatedCompanies = data;
      } else {
        // If current company is subsidiary, fetch parent and siblings
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .or(`id.eq.${currentCompany.parent_id},parent_id.eq.${currentCompany.parent_id}`);

        if (error) throw error;
        relatedCompanies = data;
      }

      setCompanies(relatedCompanies || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ company_id: companyId })
        .eq('id', profile!.id);

      if (error) throw error;
      
      // Update local profile state
      setProfile({ ...profile!, company_id: companyId });
      setShowCompanySelector(false);
    } catch (error) {
      console.error('Error switching company:', error);
    }
  };

  const getCurrentCompany = () => {
    return companies.find(c => c.id === profile?.company_id);
  };

  const getSubsidiaries = () => {
    const currentCompany = getCurrentCompany();
    if (currentCompany?.type === 'parent') {
      return companies.filter(c => c.parent_id === currentCompany.id);
    }
    return companies.filter(c => 
      c.parent_id === currentCompany?.parent_id && 
      c.id !== currentCompany?.id
    );
  };

  const sections = [
    { id: 'ar', name: 'Accounts Receivable', icon: Receipt, component: AccountsReceivable },
    { id: 'ap', name: 'Accounts Payable', icon: FileText, component: AccountsPayable },
    { id: 'customers', name: 'Customer Management', icon: Users, component: CustomerManagement },
    { id: 'vendors', name: 'Vendor Management', icon: Users, component: VendorManagement },
    { id: 'gl', name: 'General Ledger', icon: BookOpen, component: GeneralLedger },
    { id: 'tax', name: 'Tax Categories', icon: Calculator, component: TaxCategorization },
    { id: 'ai', name: 'AI Rules', icon: Brain, component: AIRules },
    { id: 'fraud', name: 'Fraud Detection', icon: Shield, component: FraudDetection },
    { id: 'forecasting', name: 'Forecasting', icon: TrendingUp, component: FinancialForecasting }
  ];

  if (activeSection) {
    const section = sections.find(s => s.id === activeSection);
    if (!section) return null;
    
    const Component = section.component;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveSection(null)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Accounting
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{section.name}</h1>
        </div>
        <Component />
      </div>
    );
  }

  const currentCompany = getCurrentCompany();
  const subsidiaries = getSubsidiaries();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
        <div className="relative">
          <button
            onClick={() => setShowCompanySelector(!showCompanySelector)}
            className="flex items-center px-4 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Building2 className="w-5 h-5 mr-2 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              {currentCompany?.name || 'Select Company'}
            </span>
            <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
          </button>

          {showCompanySelector && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg z-10 border">
              <div className="p-2">
                {/* Parent Company */}
                {currentCompany?.type === 'parent' && (
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    Parent Company
                  </div>
                )}
                <button
                  onClick={() => handleCompanyChange(currentCompany?.id!)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md ${
                    profile?.company_id === currentCompany?.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{currentCompany?.name}</div>
                  {currentCompany?.metadata?.location && (
                    <div className="text-xs text-gray-500">
                      {currentCompany.metadata.location}
                    </div>
                  )}
                </button>

                {/* Subsidiaries */}
                {subsidiaries.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                      {currentCompany?.type === 'parent' ? 'Subsidiaries' : 'Related Companies'}
                    </div>
                    {subsidiaries.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => handleCompanyChange(company.id)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md ${
                          profile?.company_id === company.id
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">{company.name}</div>
                        {company.metadata?.location && (
                          <div className="text-xs text-gray-500">
                            {company.metadata.location}
                          </div>
                        )}
                        {company.metadata?.fleet_size && (
                          <div className="text-xs text-gray-500">
                            Fleet Size: {company.metadata.fleet_size}
                          </div>
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  <section.icon className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">{section.name}</h3>
                </div>
                <p className="mt-1 text-sm text-gray-500">{getDescription(section.id)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function getDescription(id: string): string {
  switch (id) {
    case 'ar':
      return 'Manage customer invoices and payments';
    case 'ap':
      return 'Track and manage vendor bills';
    case 'customers':
      return 'Manage customers and their information';
    case 'vendors':
      return 'Manage vendors and their information';
    case 'gl':
      return 'View and manage your general ledger';
    case 'tax':
      return 'Categorize transactions for tax purposes';
    case 'ai':
      return 'Automated transaction categorization';
    case 'fraud':
      return 'Detect suspicious transactions';
    case 'forecasting':
      return 'Financial predictions and analysis';
    default:
      return '';
  }
}