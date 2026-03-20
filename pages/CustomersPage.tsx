import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Users, Search, Phone, CreditCard, Download, MessageCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatInMYT, getNowMYT } from '../utils/dateUtils';
import { apiService } from '../services/apiService';
import * as XLSX from 'xlsx';

interface CustomerCRM {
  id: string;
  full_name: string;
  phone_number: string;
  ic_passport: string;
  total_bookings: number;
  last_rental_date: string | null;
  acquired_by_agent: string | null;
  status: 'Active' | 'Repeat' | 'New';
}

const CustomersPage: React.FC = () => {
  const { subscriberId, staffRole, userId } = useAuth();
  const [customersData, setCustomersData] = useState<CustomerCRM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!subscriberId) return;
      setIsLoading(true);
      try {
        const data = await apiService.getCustomersCRM(subscriberId);
        setCustomersData(data);
      } catch (error) {
        console.error('Error fetching customer CRM data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [subscriberId]);

  const filteredCustomers = useMemo(() => {
    let result = [...customersData];

    // Filter by search term
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.full_name.toLowerCase().includes(lowerTerm) ||
        (c.ic_passport && c.ic_passport.toLowerCase().includes(lowerTerm)) ||
        (c.phone_number && c.phone_number.toLowerCase().includes(lowerTerm))
      );
    }

    // Sort by last rental date (descending)
    result.sort((a, b) => {
      const dateA = a.last_rental_date ? new Date(a.last_rental_date).getTime() : 0;
      const dateB = b.last_rental_date ? new Date(b.last_rental_date).getTime() : 0;
      return dateB - dateA;
    });

    return result;
  }, [customersData, searchTerm]);

  const exportToExcel = () => {
    const dataToExport = filteredCustomers.map(c => ({
      'Name': c.full_name,
      'IC/Passport': c.ic_passport || 'N/A',
      'Phone Number': c.phone_number || 'N/A',
      'Total Bookings': c.total_bookings,
      'Agent': c.acquired_by_agent || 'N/A',
      'Status': c.status,
      'Last Rental Date': c.last_rental_date ? format(new Date(c.last_rental_date), 'dd/MM/yyyy') : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
    
    // Generate filename with date
    const date = formatInMYT(getNowMYT(), 'yyyy-MM-dd');
    XLSX.writeFile(workbook, `Customer_Database_${date}.xlsx`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">Active</span>;
      case 'Repeat':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">Repeat</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">New</span>;
    }
  };

  // Ensure 5 rows minimum
  const displayRows = [...filteredCustomers];
  while (displayRows.length < 5 && !isLoading) {
    displayRows.push({
      id: `placeholder-${displayRows.length}`,
      full_name: '',
      phone_number: '',
      ic_passport: '',
      total_bookings: 0,
      last_rental_date: null,
      status: 'New'
    } as any);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Customer CRM</h1>
              <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">Subscriber ID: {subscriberId?.substring(0, 8)}...</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search Name or Phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-800 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
              />
            </div>
            
            <button 
              onClick={exportToExcel}
              disabled={isLoading || filteredCustomers.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 shadow-lg"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export to Excel</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">IC / Passport</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Total Bookings</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Agent</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Rental</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-3/4"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-1/2"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-1/2"></div></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-slate-100 rounded w-8 mx-auto"></div></td>
                      <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded-full w-16"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-1/2"></div></td>
                    </tr>
                  ))
                ) : (
                  displayRows.map((customer, idx) => (
                    <tr 
                      key={customer.id} 
                      className={`hover:bg-slate-50 transition-colors ${customer.full_name ? '' : 'opacity-30'}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {customer.full_name && (
                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-xs">
                              {customer.full_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-bold text-slate-900">{customer.full_name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-600">
                        {customer.ic_passport || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {customer.phone_number ? (
                          <div className="flex items-center gap-2">
                            <a 
                              href={`tel:${customer.phone_number}`}
                              className="text-blue-600 hover:underline font-medium"
                            >
                              {customer.phone_number}
                            </a>
                            <a 
                              href={`https://wa.me/${customer.phone_number.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Message on WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold ${customer.total_bookings > 0 ? 'bg-blue-50 text-blue-700' : 'text-slate-300'}`}>
                          {customer.total_bookings || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                        {customer.acquired_by_agent || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {customer.full_name ? getStatusBadge(customer.status) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {customer.last_rental_date ? format(new Date(customer.last_rental_date), 'dd/MM/yyyy') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center">
            <p className="text-xs text-slate-500 font-medium">
              Showing {filteredCustomers.length} of {customersData.length} customers
            </p>
            <p className="text-xs text-slate-400 italic">
              * Data isolated by Subscriber ID
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomersPage;
