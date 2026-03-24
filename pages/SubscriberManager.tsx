import React, { useState, useEffect, useMemo } from 'react';
import { format, isValid } from 'date-fns';
import { getNowMYT, formatInMYT, utcToMyt } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { Company } from '../types';
import { 
  Users, 
  Clock, 
  Shield, 
  Save, 
  Power, 
  Plus, 
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Loader2,
  DollarSign,
  Activity,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const prepare12MonthRevenue = (apiData: any[]) => {
  const currentYear = 2026;
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // 1. Create the empty 12-month template
  const fullYearTemplate = monthNames.map((name) => ({
    month: name,
    displayMonth: `${name} ${currentYear}`,
    monthly_revenue: 0, 
    total_subscribers: 0
  }));

  // 2. Merge actual data from Supabase into the template
  if (apiData && apiData.length > 0) {
    apiData.forEach((row) => {
      const monthPart = row.month.split(' ')[0]; 
      const monthIndex = monthNames.indexOf(monthPart);
      
      if (monthIndex !== -1) {
        fullYearTemplate[monthIndex].monthly_revenue = Number(row.distributed_revenue || 0);
        fullYearTemplate[monthIndex].total_subscribers = Number(row.active_subscribers || 0);
      }
    });
  }

  return fullYearTemplate;
};

const SubscriberManager: React.FC = () => {
  const { subscriberId } = useAuth();
  const [subscribers, setSubscribers] = useState<Company[]>([]);
  const [revenueStats, setRevenueStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [manualUid, setManualUid] = useState('');
  const [newCompanyTier, setNewCompanyTier] = useState<Company['tier']>('Tier 1');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState("1");
  const [activeSubscriberId, setActiveSubscriberId] = useState<string | null>(null);

  useEffect(() => {
    if (subscriberId === 'superadmin') {
      fetchData();
    }
  }, [subscriberId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subsData, statsData] = await Promise.all([
        apiService.getCompanies(),
        apiService.getSaasRevenueStats().catch(() => []) 
      ]);
      
      // Trial Automation: Check for expired trials
      const now = getNowMYT();
      const expiredTrials = subsData.filter(sub => 
        sub.is_trial && 
        sub.status === 'ACTIVE' && 
        sub.expiry_date && 
        utcToMyt(sub.expiry_date) < now
      );

      if (expiredTrials.length > 0) {
        await Promise.all(expiredTrials.map(trial => 
          apiService.updateCompany(trial.id, { status: 'INACTIVE', is_active: false })
        ));
        // Re-fetch if we updated anything
        const updatedSubs = await apiService.getCompanies();
        setSubscribers(updatedSubs);
      } else {
        setSubscribers(subsData);
      }
      
      // Use the 12-month merger function
      const formattedChartData = prepare12MonthRevenue(statsData);
      setRevenueStats(formattedChartData); 
    } catch (err: any) {
      if (err.message?.includes('Failed to fetch') || err.message?.includes('CONNECTION_FAILED')) {
        setError('Supabase Connection Error: Your project may be paused or unreachable.');
      } else if (err.message?.includes('column subscribers.name does not exist')) {
        setError('Database Schema Error: Missing "name" column in subscribers table. Please run the SQL fix.');
      } else {
        setError('Failed to load dashboard data');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return;
    try {
      setLoading(true);
      
      let expiryDate: string | null = null;
      let isTrial = false;
      let tier = newCompanyTier;

      if (selectedDuration === 'trial') {
        isTrial = true;
        tier = 'Tier 3';
        const date = getNowMYT();
        date.setDate(date.getDate() + 30);
        expiryDate = date.toISOString();
      } else if (selectedDuration === 'unlimited') {
        expiryDate = null;
      } else {
        const date = getNowMYT();
        date.setMonth(date.getMonth() + parseInt(selectedDuration));
        expiryDate = date.toISOString();
      }

      await apiService.addCompany(newCompanyName, tier, isTrial, expiryDate, manualUid.trim() || undefined);
      setNewCompanyName('');
      setManualUid('');
      setShowAddModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create new subscriber');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = (id: string, field: keyof Company, value: any) => {
    setSubscribers(prev => prev.map(sub => 
      sub.id === id ? { ...sub, [field]: value } : sub
    ));
  };

  const handleSaveChanges = async (subscriber: Company) => {
    try {
      setSavingId(subscriber.id);
      const updates: any = {
        name: subscriber.name,
        tier: subscriber.tier
      };
      
      if (subscriber.is_active !== undefined) updates.is_active = subscriber.is_active;
      if (subscriber.expiry_date !== undefined) updates.expiry_date = subscriber.expiry_date;

      await apiService.updateCompany(subscriber.id, updates);
      await fetchData();
    } catch (err) {
      setError(`Failed to save changes for ${subscriber.name}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleAddSubscription = async () => {
    if (!activeSubscriberId) return;
    const subscriber = subscribers.find(s => s.id === activeSubscriberId);
    if (!subscriber) return;

    try {
      setLoading(true);
      
      let newDate: string | null = null;
      let isTrial = false;
      let tier = subscriber.tier;

      if (selectedDuration === "trial") {
        isTrial = true;
        tier = 'Tier 3';
        const date = getNowMYT();
        date.setDate(date.getDate() + 30);
        newDate = date.toISOString();
      } else if (selectedDuration === "unlimited") {
        newDate = null;
      } else {
        // If subscriber already has an expiry in the future, extend from there
        const now = getNowMYT();
        const currentExpiry = subscriber.expiry_date ? utcToMyt(subscriber.expiry_date) : now;
        const baseDate = currentExpiry > now ? currentExpiry : now;
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + parseInt(selectedDuration));
        newDate = date.toISOString();
      }

      const updates: any = {
        expiry_date: newDate,
        is_active: true,
        status: 'ACTIVE',
        is_trial: isTrial,
        tier: tier
      };
      
      await apiService.updateCompany(activeSubscriberId, updates);
      setShowExpiryModal(false);
      setActiveSubscriberId(null);
      await fetchData();
    } catch (err) {
      setError('Failed to extend subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setLoading(true);
      await apiService.deleteCompany(deleteId);
      setShowDeleteModal(false);
      setDeleteId(null);
      await fetchData();
    } catch (err) {
      setError('Failed to delete subscriber');
    } finally {
      setLoading(false);
    }
  };

  // Calculate Metrics
  const metrics = useMemo(() => {
    // Find current month in revenueStats (which is now cash-basis)
    const now = getNowMYT();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthName = monthNames[now.getMonth()];
    
    const currentMonthData = revenueStats.find(m => m.month.startsWith(currentMonthName));
    const mrr = currentMonthData ? currentMonthData.monthly_revenue : 0;

    let activeSubs = 0;
    subscribers.forEach(sub => {
      const isExpired = sub.expiry_date && utcToMyt(sub.expiry_date) < now;
      const isActive = sub.status === 'ACTIVE' && (sub.expiry_date === null || !isExpired);

      if (isActive) {
        activeSubs++;
      }
    });

    return { mrr, activeSubs };
  }, [subscribers, revenueStats]);

  const displayedSubscribers = useMemo(() => {
    const minRows = 5;
    const result = [...subscribers];
    while (result.length < minRows) {
      result.push({ 
        id: `placeholder-${result.length}`, 
        name: '', 
        tier: 'Tier 1', 
        is_active: false,
        isPlaceholder: true 
      } as any);
    }
    return result;
  }, [subscribers]);

  if (subscriberId !== 'superadmin') {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 p-8 rounded-xl max-w-md w-full text-center shadow-sm">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">403 Restricted</h1>
          <p className="text-slate-500 leading-relaxed">
            This area is reserved for Superadmin access only. Your current credentials do not have the required permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-navy-900 p-2 rounded-lg bg-[#0F172A]">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome to the Global Fleet Command</h1>
            </div>
            <p className="text-slate-500">Manage platform subscriptions, tiers, and access control.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setSelectedDuration('1');
                setShowAddModal(true);
              }}
              className="bg-[#0F172A] hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Add Subscriber
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto hover:text-red-900">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* SaaS Analytics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-slate-50 text-slate-900 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Revenue (Current Month)</p>
              <h3 className="text-3xl font-bold text-slate-900">RM {(metrics.mrr || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-slate-50 text-slate-900 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Subscriber Growth</p>
              <div className="flex items-center gap-3">
                <h3 className="text-3xl font-bold text-slate-900">{metrics.activeSubs}</h3>
                <div className="flex items-center text-emerald-600 text-sm font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  Live
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-slate-50 text-slate-900 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">System Health</p>
              <h3 className="text-3xl font-bold text-emerald-600 flex items-center gap-2">
                <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                Live
              </h3>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Revenue by Month</h2>
          <div className="h-72 w-full">
            {revenueStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    tickFormatter={(value) => `RM ${value}`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`RM ${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar 
                    dataKey="monthly_revenue" 
                    fill="#0F172A" 
                    radius={[4, 4, 0, 0]}
                    activeBar={{ fill: '#1E293B' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                {loading ? 'Loading chart data...' : 'No revenue data available yet.'}
              </div>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-auto">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap table-fixed">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="w-[8%] px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="w-[22%] px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Name</th>
                  <th className="w-[15%] px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tier</th>
                  <th className="w-[15%] px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiry</th>
                  <th className="w-[15%] px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="w-[25%] px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">Fetching subscriber data...</p>
                    </td>
                  </tr>
                ) : displayedSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="text-slate-500 font-medium">No subscribers found.</p>
                    </td>
                  </tr>
                ) : (
                  displayedSubscribers.map((sub: any) => {
                    if (sub.isPlaceholder) {
                      return (
                        <tr key={sub.id} className="h-[73px]">
                          <td className="px-6 py-4"><div className="h-4 bg-slate-50 rounded w-16"></div></td>
                          <td className="px-6 py-4"><div className="h-4 bg-slate-50 rounded w-32"></div></td>
                          <td className="px-6 py-4"><div className="h-4 bg-slate-50 rounded w-20"></div></td>
                          <td className="px-6 py-4"><div className="h-4 bg-slate-50 rounded w-24"></div></td>
                          <td className="px-6 py-4 text-center"><div className="h-6 bg-slate-50 rounded-full w-16 mx-auto"></div></td>
                          <td className="px-6 py-4"></td>
                        </tr>
                      );
                    }

                    const isExpired = sub.expiry_date && utcToMyt(sub.expiry_date) < getNowMYT();
                    const isActive = sub.is_active && !isExpired;

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <code className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            {sub.id.substring(0, 8)}...
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text"
                            value={sub.name}
                            onChange={(e) => handleUpdateField(sub.id, 'name', e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-[#0F172A] outline-none w-full transition-all"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative">
                            <select 
                              value={sub.tier}
                              onChange={(e) => handleUpdateField(sub.id, 'tier', e.target.value)}
                              className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-900 focus:ring-2 focus:ring-[#0F172A] outline-none w-full transition-all cursor-pointer"
                            >
                              <option value="Tier 1">Tier 1 (Basic)</option>
                              <option value="Tier 2">Tier 2 (Pro)</option>
                              <option value="Tier 3">Tier 3 (Enterprise)</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="w-4 h-4 text-slate-400" />
                            {sub.expiry_date ? formatInMYT(new Date(sub.expiry_date).getTime(), 'dd/MM/yyyy') : 'No Expiry'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={async () => {
                              const newStatus = sub.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                              const newIsActive = newStatus === 'ACTIVE';
                              try {
                                setSavingId(sub.id);
                                await apiService.updateCompany(sub.id, { status: newStatus, is_active: newIsActive });
                                await fetchData();
                              } catch (err) {
                                setError('Failed to toggle status');
                              } finally {
                                setSavingId(null);
                              }
                            }}
                            disabled={savingId === sub.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                              sub.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 group/status'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 group/status'
                            }`}
                          >
                            {sub.status === 'ACTIVE' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 group-hover/status:hidden" />
                                <Power className="w-3.5 h-3.5 hidden group-hover/status:block" />
                                <span className="group-hover/status:hidden">Active</span>
                                <span className="hidden group-hover/status:block">Deactivate</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 group-hover/status:hidden" />
                                <CheckCircle2 className="w-3.5 h-3.5 hidden group-hover/status:block" />
                                <span className="group-hover/status:hidden">{isExpired ? 'Expired' : 'Inactive'}</span>
                                <span className="hidden group-hover/status:block">Activate</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setActiveSubscriberId(sub.id);
                                setSelectedDuration('1');
                                setShowExpiryModal(true);
                              }}
                              className="bg-[#0F172A] hover:bg-slate-800 text-white px-2.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
                            >
                              <Plus className="w-4 h-4" />
                              Add Time
                            </button>

                            <button 
                              onClick={() => handleSaveChanges(sub)}
                              disabled={savingId === sub.id}
                              className="bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white p-2 rounded-lg transition-all shadow-sm"
                              title="Save Changes"
                            >
                              {savingId === sub.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </button>

                            <button 
                              onClick={() => {
                                setDeleteId(sub.id);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 rounded-lg transition-all border bg-white text-slate-400 border-slate-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                              title="Delete Subscriber"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertCircle className="w-6 h-6" />
                <h2 className="text-xl font-bold tracking-tight">Confirm Deletion</h2>
              </div>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Are you sure you want to delete this subscriber? This action is irreversible and will immediately remove all associated revenue from your dashboard.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expiry Modal */}
        {showExpiryModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Extend Subscription</h2>
                <button onClick={() => setShowExpiryModal(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 p-5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Extend Subscription</label>
                  <select 
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-[#0F172A] outline-none transition-all"
                  >
                    <option value="trial">Trial (30 Days - Tier 3)</option>
                    <option value="1">1 Month</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months (1 Year)</option>
                    <option value="unlimited">No Expiry (Lifetime)</option>
                  </select>
                  
                  <button 
                    onClick={handleAddSubscription}
                    disabled={loading}
                    className="w-full bg-[#0F172A] text-white py-3 rounded-lg text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CONFIRM EXTENSION'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Subscriber Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">New Subscriber</h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
                  <input 
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="e.g. EcaFleet Rentals"
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-[#0F172A] outline-none transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-slate-700">Auth UID (Optional)</label>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Manual Link</span>
                  </div>
                  <input 
                    type="text"
                    value={manualUid}
                    onChange={(e) => setManualUid(e.target.value)}
                    placeholder="Paste Supabase User UID here"
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-[#0F172A] outline-none transition-all font-mono text-xs"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Only use if automatic detection fails. Found in Supabase Auth table.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Subscription Duration</label>
                  <select 
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-[#0F172A] outline-none transition-all cursor-pointer"
                  >
                    <option value="trial">Trial (30 Days - Tier 3)</option>
                    <option value="1">1 Month</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months (1 Year)</option>
                    <option value="unlimited">No Expiry (Lifetime)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Subscription Tier</label>
                  <select 
                    value={newCompanyTier}
                    disabled={selectedDuration === 'trial'}
                    onChange={(e) => setNewCompanyTier(e.target.value as Company['tier'])}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-[#0F172A] outline-none transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="Tier 1">Tier 1 (Basic)</option>
                    <option value="Tier 2">Tier 2 (Pro)</option>
                    <option value="Tier 3">Tier 3 (Enterprise)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleAddCompany}
                    disabled={!newCompanyName.trim() || loading}
                    className="w-full bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Subscriber'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriberManager;
