import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';

const SubscriberManager: React.FC = () => {
  const { companyId } = useAuth();
  const [subscribers, setSubscribers] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId === 'superadmin') {
      fetchSubscribers();
    }
  }, [companyId]);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCompanies();
      setSubscribers(data);
    } catch (err) {
      setError('Failed to load subscribers');
      console.error(err);
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
      await apiService.updateCompany(subscriber.id, {
        name: subscriber.name,
        tier: subscriber.tier,
        is_active: subscriber.is_active
      });
      // Refresh to get latest state
      await fetchSubscribers();
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

      await apiService.updateCompany(id, {
        expiry_date: newExpiry.toISOString(),
        is_active: true
      });
      
      await fetchSubscribers();
    } catch (err) {
      setError('Failed to add subscription time');
    } finally {
      setSavingId(null);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      setSavingId(id);
      await apiService.updateCompany(id, { is_active: !currentStatus });
      await fetchSubscribers();
    } catch (err) {
      setError('Failed to toggle status');
    } finally {
      setSavingId(null);
    }
  };

  if (companyId !== 'superadmin') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-red-900/50 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl shadow-red-900/10">
          <div className="w-20 h-20 bg-red-950/50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-900/30">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-white mb-4">403 Restricted</h1>
          <p className="text-slate-400 leading-relaxed">
            This area is reserved for Superadmin access only. Your current credentials do not have the required permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-indigo-600 p-2 rounded-xl">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">Subscriber Manager</h1>
            </div>
            <p className="text-slate-400">Manage platform subscriptions, tiers, and access control.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3">
              <Users className="w-5 h-5 text-indigo-400" />
              <div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Subscribers</div>
                <div className="text-xl font-black text-white">{subscribers.length}</div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/30 border border-red-900/50 p-4 rounded-2xl flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto hover:text-white">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Table Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800">
                  <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Company Code</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Company Name</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Tier</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Expiry Date</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
                      <p className="text-slate-500 font-medium tracking-wide">Fetching subscriber data...</p>
                    </td>
                  </tr>
                ) : subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <p className="text-slate-500 font-medium">No subscribers found.</p>
                    </td>
                  </tr>
                ) : (
                  subscribers.map((sub) => {
                    const isExpired = sub.expiry_date && new Date(sub.expiry_date) < new Date();
                    const isActive = sub.is_active && !isExpired;

                    return (
                      <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4">
                          <code className="text-xs font-mono text-indigo-400 bg-indigo-950/30 px-2 py-1 rounded border border-indigo-900/30">
                            {sub.id.substring(0, 8)}...
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text"
                            value={sub.name}
                            onChange={(e) => handleUpdateField(sub.id, 'name', e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none w-full max-w-[200px] transition-all"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative">
                            <select 
                              value={sub.tier}
                              onChange={(e) => handleUpdateField(sub.id, 'tier', e.target.value)}
                              className="appearance-none bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 pr-8 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none w-full transition-all cursor-pointer"
                            >
                              <option value="tier_1">Tier 1 (Basic)</option>
                              <option value="tier_2">Tier 2 (Pro)</option>
                              <option value="tier_3">Tier 3 (Enterprise)</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Clock className="w-4 h-4" />
                            {sub.expiry_date ? new Date(sub.expiry_date).toLocaleDateString() : 'No Expiry'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            isActive 
                              ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30' 
                              : 'bg-red-950/30 text-red-400 border-red-900/30'
                          }`}>
                            {isActive ? (
                              <><CheckCircle2 className="w-3 h-3" /> Active</>
                            ) : (
                              <><XCircle className="w-3 h-3" /> {isExpired ? 'Expired' : 'Inactive'}</>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* Add Time Dropdown */}
                            <div className="relative group/actions">
                              <button className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
                                <Plus className="w-4 h-4" />
                                Add Time
                              </button>
                              <div className="absolute right-0 top-full mt-2 w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all z-10 p-1">
                                {[
                                  { label: '1 Month', value: 1 },
                                  { label: '3 Months', value: 3 },
                                  { label: '6 Months', value: 6 },
                                  { label: '1 Year', value: 12 }
                                ].map(opt => (
                                  <button
                                    key={opt.label}
                                    onClick={() => handleAddSubscription(sub.id, opt.value)}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button 
                              onClick={() => handleSaveChanges(sub)}
                              disabled={savingId === sub.id}
                              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2 rounded-lg transition-all shadow-lg shadow-indigo-900/20"
                              title="Save Changes"
                            >
                              {savingId === sub.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </button>

                            <button 
                              onClick={() => toggleStatus(sub.id, sub.is_active)}
                              className={`p-2 rounded-lg transition-all border ${
                                sub.is_active 
                                  ? 'bg-red-950/20 text-red-500 border-red-900/30 hover:bg-red-900/30' 
                                  : 'bg-emerald-950/20 text-emerald-500 border-emerald-900/30 hover:bg-emerald-900/30'
                              }`}
                              title={sub.is_active ? 'Deactivate' : 'Activate'}
                            >
                              <Power className="w-4 h-4" />
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
      </div>
    </div>
  );
};

export default SubscriberManager;
