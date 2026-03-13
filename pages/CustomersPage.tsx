import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Phone, CreditCard, User, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as Storage from '../services/storageService';
import { DigitalForm } from '../types';

interface CustomerData {
  idNumber: string;
  name: string;
  phone: string;
  agentName: string;
  agentId: string;
  lastFormId: string;
  formCount: number;
}

const CustomersPage: React.FC = () => {
  const { companyId, staffRole, userId } = useAuth();
  const [forms, setForms] = useState<DigitalForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      setIsLoading(true);
      try {
        const agentId = staffRole === 'staff' ? userId || undefined : undefined;
        const [formsData, agreementsData] = await Promise.all([
          Storage.getDigitalForms(companyId, agentId),
          Storage.getAgreements(companyId, agentId)
        ]);
        
        // Combine both sources as they both represent customer interactions
        const combined = [
          ...formsData.map((f: any) => ({ ...f, source: 'form' })),
          ...agreementsData.map((a: any) => ({ ...a, source: 'agreement' }))
        ];
        
        setForms(combined as any);
      } catch (error) {
        console.error('Error fetching data for customers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [companyId]);

  const customers = useMemo(() => {
    const customerMap = new Map<string, CustomerData>();

    forms.forEach(form => {
      // Use ID Number as unique key
      const idNumber = form.identity_number || 'N/A';
      
      if (!customerMap.has(idNumber)) {
        customerMap.set(idNumber, {
          idNumber,
          name: form.customer_name || 'Unknown',
          phone: form.customer_phone || 'N/A',
          agentName: form.agent_name || 'N/A',
          agentId: form.agent_id || '',
          lastFormId: form.id,
          formCount: 1
        });
      } else {
        const existing = customerMap.get(idNumber)!;
        existing.formCount += 1;
      }
    });

    let result = Array.from(customerMap.values());

    // Filter by search term
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(lowerTerm) ||
        c.idNumber.toLowerCase().includes(lowerTerm) ||
        c.phone.toLowerCase().includes(lowerTerm)
      );
    }

    // If staff, only show customers they brought in
    if (staffRole === 'staff') {
      result = result.filter(c => c.agentId === userId);
    }

    return result;
  }, [forms, searchTerm, staffRole, userId]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Customer Database</h1>
              <p className="text-xs text-slate-400">Extracted from Digital Forms</p>
            </div>
          </div>

          <div className="relative w-full sm:w-80 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by name, IC/Passport, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-800 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium">Loading customer data...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Customers Found</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              {searchTerm 
                ? `No results matching "${searchTerm}"`
                : 'Customers will appear here once digital forms are submitted.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map((customer) => (
              <div key={customer.idNumber} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {customer.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <User className="w-3 h-3" />
                        <span>Agent: {customer.agentName}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium">IC / Passport</span>
                    </div>
                    <span className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {customer.idNumber}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium">Phone Number</span>
                    </div>
                    <a 
                      href={`tel:${customer.phone}`}
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      {customer.phone}
                    </a>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      Total Forms: <span className="font-bold text-slate-700">{customer.formCount}</span>
                    </div>
                    <button 
                      onClick={() => window.location.href = `/forms`}
                      className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      View Forms <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomersPage;
