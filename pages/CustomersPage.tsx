import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Users, Search, Phone, CreditCard, Download, MessageCircle, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatInMYT, getNowMYT } from '../utils/dateUtils';
import { apiService } from '../services/apiService';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';

interface CustomerCRM {
  id: string;
  full_name: string;
  phone_number: string;
  ic_passport: string;
  total_bookings: number;
  last_rental_date: string | null;
  acquired_by_agent: string | null;
  status: 'Active' | 'Repeat' | 'New' | 'Lead';
}

const CustomersPage: React.FC = () => {
  const { subscriberId, staffRole, userId } = useAuth();
  const [customersData, setCustomersData] = useState<CustomerCRM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    let isMounted = true;

    const fetchData = async (showLoading = true) => {
      if (!subscriberId) return;
      if (showLoading) setIsLoading(true);
      try {
        const data = await apiService.getCustomersCRM(subscriberId);
        if (isMounted) {
          setCustomersData(data);
        }
      } catch (error) {
        console.error('Error fetching customer CRM data:', error);
      } finally {
        if (isMounted && showLoading) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    if (!subscriberId) return;

    // Set up real-time subscriptions for the underlying tables
    const channel = supabase.channel('customers-crm-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `subscriber_id=eq.${subscriberId}` }, () => {
        fetchData(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agreements', filter: `subscriber_id=eq.${subscriberId}` }, () => {
        fetchData(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_forms', filter: `subscriber_id=eq.${subscriberId}` }, () => {
        fetchData(false);
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
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

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const currentCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToExcel = () => {
    const dataToExport = filteredCustomers.map(c => ({
      'Name': c.full_name,
      'IC/Passport': c.ic_passport || 'N/A',
      'Phone Number': c.phone_number || 'N/A',
      'Total Bookings': c.total_bookings,
      'Agent': c.acquired_by_agent || 'N/A',
      'Status': c.status,
      'Last Rental Date': c.last_rental_date ? formatInMYT(new Date(c.last_rental_date).getTime(), 'dd/MM/yyyy') : 'N/A'
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
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">Active</span>;
      case 'Repeat':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">Repeat</span>;
      case 'New':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">New</span>;
      case 'Lead':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">Lead</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  // Ensure 5 rows minimum
  const displayRows = [...currentCustomers];
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
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search by Name or Phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">IC / Passport</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4 text-center">Total Bookings</th>
                  <th className="px-6 py-4">Agent</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Last Rental</th>
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
                      className={`hover:bg-slate-50 transition-colors group ${customer.full_name ? '' : 'opacity-30'}`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{customer.full_name || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm text-slate-700">{customer.ic_passport || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        {customer.phone_number ? (
                          <div className="flex items-center gap-2">
                            <a 
                              href={`tel:${customer.phone_number}`}
                              className="font-mono text-sm text-slate-700 hover:text-blue-600 hover:underline"
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
                        ) : (
                          <div className="font-mono text-sm text-slate-700">-</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="font-bold text-slate-900">{customer.total_bookings || 0}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600 font-medium uppercase">{customer.acquired_by_agent || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        {customer.full_name ? getStatusBadge(customer.status) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-500">
                          {customer.last_rental_date ? formatInMYT(new Date(customer.last_rental_date).getTime(), 'dd/MM/yyyy') : '-'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="text-sm text-slate-500">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredCustomers.length)}</span> of <span className="font-medium">{filteredCustomers.length}</span> results
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-md text-sm font-medium flex items-center justify-center transition-colors ${
                          currentPage === page
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return <span key={page} className="px-1 text-slate-400">...</span>;
                  }
                  return null;
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center">
            <p className="text-xs text-slate-500 font-medium">
              Total {customersData.length} customers
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
