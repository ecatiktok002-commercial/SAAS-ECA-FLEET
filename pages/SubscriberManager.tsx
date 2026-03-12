import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { 
  Users, 
  ShieldAlert, 
  Calendar, 
  Clock, 
  Save, 
  Power, 
  ChevronDown, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  expiry_date: string;
  is_active: boolean;
  created_at: string;
}

const SubscriberManager: React.FC = () => {
  const { companyId } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Access Control
  if (companyId !== 'superadmin') {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0a0a] p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto border border-rose-500/20">
            <ShieldAlert size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight">403 Restricted</h1>
            <p className="text-zinc-500 font-medium">
              You do not have the required permissions to access the Superadmin Dashboard.
            </p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-8 py-3 bg-white text-black rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-zinc-200 transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCompanies();
      setCompanies(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = (id: string, field: keyof Company, value: any) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = async (company: Company) => {
    try {
      setSavingId(company.id);
      await apiService.updateCompany(company.id, {
        name: company.name,
        tier: company.tier,
        is_active: company.is_active
      });
      // Optional: Show success toast
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleAddTime = async (id: string, months: number) => {
    const company = companies.find(c => c.id === id);
    if (!company) return;

    const now = new Date();
    const currentExpiry = new Date(company.expiry_date);
    const baseDate = currentExpiry > now ? currentExpiry : now;
    
    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + months);

    try {
      setSavingId(id);
      const expiryStr = newExpiry.toISOString();
      await apiService.updateCompany(id, { expiry_date: expiryStr });
      handleUpdateField(id, 'expiry_date', expiryStr);
    } catch (err: any) {
      alert(`Failed to add time: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-white rounded-full animate-spin" />
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Loading Subscribers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0a0a0a] text-zinc-300 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-zinc-500">
              <ShieldAlert size={16} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Superadmin Console</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Manage Subscribers</h1>
            <p className="text-zinc-500 font-medium">Monitor and manage fleet company subscriptions and access.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchCompanies}
              className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-zinc-800 transition-all text-zinc-400 hover:text-white"
            >
              <RefreshCw size={20} />
            </button>
            <div className="px-4 py-2 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-white">{companies.length} Active Companies</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-4 text-rose-500">
            <AlertTriangle size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Table Container */}
        <div className="bg-zinc-900/50 rounded-[2rem] border border-zinc-800/50 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/50 bg-zinc-900/30">
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Company Details</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Subscription</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Expiry & Status</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Name & ID */}
                    <td className="px-6 py-6">
                      <div className="space-y-3">
                        <input 
                          type="text"
                          value={company.name}
                          onChange={(e) => handleUpdateField(company.id, 'name', e.target.value)}
                          className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm font-bold text-white w-full focus:outline-none focus:border-white/20 transition-all"
                        />
                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600">
                          <span className="uppercase">ID:</span>
                          <span className="select-all">{company.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Tier Dropdown */}
                    <td className="px-6 py-6">
                      <div className="relative group/select">
                        <select 
                          value={company.tier}
                          onChange={(e) => handleUpdateField(company.id, 'tier', e.target.value)}
                          className="appearance-none bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-4 py-2.5 text-xs font-bold text-white w-full focus:outline-none focus:border-white/20 transition-all cursor-pointer pr-10"
                        >
                          <option value="tier_1">Tier 1: Basic</option>
                          <option value="tier_2">Tier 2: Growth</option>
                          <option value="tier_3">Tier 3: Enterprise</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover/select:text-white transition-colors" />
                      </div>
                    </td>

                    {/* Expiry & Status */}
                    <td className="px-6 py-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                          <Clock size={14} />
                          {new Date(company.expiry_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </div>
                        <div className="flex items-center gap-2">
                          {company.is_active && !isExpired(company.expiry_date) ? (
                            <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-emerald-500/20">
                              <CheckCircle2 size={10} />
                              Active
                            </div>
                          ) : (
                            <div className="px-2 py-1 bg-rose-500/10 text-rose-500 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-rose-500/20">
                              <XCircle size={10} />
                              {isExpired(company.expiry_date) ? 'Expired' : 'Inactive'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-6">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Add Time Dropdown */}
                        <div className="relative group/time">
                          <button className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-all flex items-center gap-2 border border-zinc-700/50">
                            <Calendar size={14} />
                            Add Time
                            <ChevronDown size={12} />
                          </button>
                          <div className="absolute top-full left-0 mt-2 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl opacity-0 invisible group-hover/time:opacity-100 group-hover/time:visible transition-all z-50 overflow-hidden">
                            {[
                              { label: '1 Month', val: 1 },
                              { label: '3 Months', val: 3 },
                              { label: '6 Months', val: 6 },
                              { label: '1 Year', val: 12 }
                            ].map(opt => (
                              <button 
                                key={opt.label}
                                onClick={() => handleAddTime(company.id, opt.val)}
                                className="w-full px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Save Button */}
                        <button 
                          onClick={() => handleSave(company)}
                          disabled={savingId === company.id}
                          className="p-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50"
                          title="Save Changes"
                        >
                          {savingId === company.id ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                        </button>

                        {/* Deactivate Toggle */}
                        <button 
                          onClick={() => handleUpdateField(company.id, 'is_active', !company.is_active)}
                          className={`p-2 rounded-lg transition-all border ${
                            company.is_active 
                              ? 'bg-zinc-800 text-zinc-500 border-zinc-700/50 hover:text-rose-500 hover:border-rose-500/30' 
                              : 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                          title={company.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <Power size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <div className="space-y-3">
                        <Users size={40} className="mx-auto text-zinc-800" />
                        <p className="text-zinc-600 font-bold uppercase text-xs tracking-widest">No subscribers found</p>
                      </div>
                    </td>
                  </tr>
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
