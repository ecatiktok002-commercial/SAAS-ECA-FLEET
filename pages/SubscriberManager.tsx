import React, { useState, useEffect, useMemo } from 'react';
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

const SubscriberManager: React.FC = () => {
  const { subscriberId } = useAuth();
  const [subscribers, setSubscribers] = useState<Company[]>([]);
  const [revenueStats, setRevenueStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyTier, setNewCompanyTier] = useState<Company['tier']>('tier_1');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
      setSubscribers(subsData);
      
      // Map stats from the new view: month, current_mrr, active_count
      const aggregatedStats = statsData.map((curr: any) => ({
        month: curr.month,
        monthly_revenue: Number(curr.current_mrr || 0),
        total_subscribers: Number(curr.active_count || 0)
      }));
      
      setRevenueStats(aggregatedStats.reverse()); 
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return;
    try {
      setLoading(true);
      await apiService.addCompany(newCompanyName, newCompanyTier);
      setNewCompanyName('');
      setShowAddModal(false);
      await fetchData();
    } catch (err) {
      setError('Failed to create new subscriber');
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

  const handleAddSubscription = async (id: string, months: number) => {
    const subscriber = subscribers.find(s => s.id === id);
    if (!subscriber) return;

    try {
      setSavingId(id);
      const now = new Date();
      const currentExpiry = subscriber.expiry_date ? new Date(subscriber.expiry_date) : now;
      const baseDate = currentExpiry > now ? currentExpiry : now;
      
      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + months);

      const updates: any = {
        expiry_date: newExpiry.toISOString()
      };
      
      if (subscriber.is_active !== undefined) updates.is_active = true;

      await apiService.updateCompany(id, updates);
      await fetchData();
    } catch (err) {
      setError('Failed to add subscription time');
    } finally {
      setSavingId(null);
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
    // Use the latest data from the view if available, otherwise fallback to manual calculation
    if (revenueStats.length > 0) {
      const latest = revenueStats[revenueStats.length - 1];
      return { 
        mrr: latest.monthly_revenue, 
        activeSubs: latest.total_subscribers 
      };
    }

    let mrr = 0;
    let activeSubs = 0;

    subscribers.forEach(sub => {
      const isExpired = sub.expiry_date && new Date(sub.expiry_date) < new Date();
      const isActive = sub.is_active && !isExpired;

      if (isActive) {
        activeSubs++;
        if (sub.tier === 'tier_1') mrr += 150;
        else if (sub.tier === 'tier_2') mrr += 200;
        else if (sub.tier === 'tier_3') mrr += 399;
      }
    });

    return { mrr, activeSubs };
  }, [subscribers, revenueStats]);

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
              onClick={() => setShowAddModal(true)}
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
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly Recurring Revenue (MRR)</p>
              <h3 className="text-3xl font-bold text-slate-900">RM {metrics.mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
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
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Code</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tier</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiry Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
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
                ) : subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="text-slate-500 font-medium">No subscribers found.</p>
                    </td>
                  </tr>
                ) : (
                  subscribers.map((sub) => {
                    const isExpired = sub.expiry_date && new Date(sub.expiry_date) < new Date();
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
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-[#0F172A] outline-none w-full max-w-[200px] transition-all"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative">
                            <select 
                              value={sub.tier}
                              onChange={(e) => handleUpdateField(sub.id, 'tier', e.target.value)}
                              className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-900 focus:ring-2 focus:ring-[#0F172A] outline-none w-full transition-all cursor-pointer"
                            >
                              <option value="tier_1">Tier 1 (Basic)</option>
                              <option value="tier_2">Tier 2 (Pro)</option>
                              <option value="tier_3">Tier 3 (Enterprise)</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="w-4 h-4 text-slate-400" />
                            {sub.expiry_date ? new Date(sub.expiry_date).toLocaleDateString() : 'No Expiry'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            isActive 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {isActive ? (
                              <><CheckCircle2 className="w-3.5 h-3.5" /> Active</>
                            ) : (
                              <><XCircle className="w-3.5 h-3.5" /> {isExpired ? 'Expired' : 'Inactive'}</>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* Add Time Dropdown */}
                            <div className="relative group/actions">
                              <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm">
                                <Plus className="w-4 h-4" />
                                Add Time
                              </button>
                              <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-lg opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all z-10 p-1">
                                {[
                                  { label: '1 Month', value: 1 },
                                  { label: '3 Months', value: 3 },
                                  { label: '6 Months', value: 6 },
                                  { label: '1 Year', value: 12 }
                                ].map(opt => (
                                  <button
                                    key={opt.label}
                                    onClick={() => handleAddSubscription(sub.id, opt.value)}
                                    className="w-full text-left px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Subscription Tier</label>
                  <select 
                    value={newCompanyTier}
                    onChange={(e) => setNewCompanyTier(e.target.value as Company['tier'])}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-[#0F172A] outline-none transition-all cursor-pointer"
                  >
                    <option value="tier_1">Tier 1 (Basic)</option>
                    <option value="tier_2">Tier 2 (Pro)</option>
                    <option value="tier_3">Tier 3 (Enterprise)</option>
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
