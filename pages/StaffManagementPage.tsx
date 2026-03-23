import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Menu, Search, Filter, LayoutGrid, Edit2, Trash2, 
  TrendingUp, User, Shield, KeyRound, Plus, X, ShieldAlert 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { StaffMember } from '../types';

const StaffManagementPage: React.FC = () => {
  const { subscriberId, staffRole } = useAuth();
  
  // --- Data State ---
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // --- UI & Form State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    staff_uid: '', 
    pin: '', 
    commission_tier_override: 'auto' as 'auto' | 'premium' | 'prestige' | 'privilege', 
    commission_rate: '' 
  });

  const loadStaff = useCallback(async () => {
    if (!subscriberId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiService.getStaffMembers(subscriberId);
      setStaff(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [subscriberId]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriberId) return;

    const cleanUid = formData.staff_uid.trim().toLowerCase().replace(/\s+/g, '');

    try {
      setIsLoading(true);
      if (editingStaff) {
        const updates: Partial<StaffMember> = { 
          name: formData.name, 
          staff_uid: cleanUid,
          commission_tier_override: formData.commission_tier_override,
          commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : undefined
        };
        if (formData.pin) updates.pin_code = formData.pin; 
        await apiService.updateStaffMember(editingStaff.id, subscriberId, updates);
      } else {
        await apiService.addStaffMember(
          formData.name, subscriberId, 'staff', formData.pin, 
          cleanUid, formData.commission_tier_override, 
          formData.commission_rate ? parseFloat(formData.commission_rate) : undefined
        );
      }
      await loadStaff();
      setIsModalOpen(false);
      setEditingStaff(null);
      setFormData({ name: '', staff_uid: '', pin: '', commission_tier_override: 'auto', commission_rate: '' });
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!subscriberId || !window.confirm('Permanently delete this staff member?')) return;
    try {
      setIsLoading(true);
      await apiService.deleteStaffMember(id, subscriberId);
      await loadStaff();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setFormData({ 
      name: member.name, 
      staff_uid: member.staff_uid || '', 
      pin: '',
      commission_tier_override: member.commission_tier_override || 'auto',
      commission_rate: member.commission_rate?.toString() || ''
    });
    setIsModalOpen(true);
  };

  const filteredStaff = useMemo(() => {
    return staff.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.staff_uid?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staff, searchTerm]);

  if (staffRole !== 'admin') {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center min-h-[60vh]">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-slate-500 mt-2 font-medium">Administrator privileges required.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen pb-32">
      
      {/* Navigation - Standardized (Removed Title) */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200">
        <div className="flex justify-between items-center px-8 py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
              <User className="w-5 h-5 text-white" />
            </div>
            {/* Staff Registry text removed as requested */}
          </div>
          
          <button 
            onClick={() => { setEditingStaff(null); setFormData({ name: '', staff_uid: '', pin: '', commission_tier_override: 'auto', commission_rate: '' }); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-sm flex items-center gap-3 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Add Team Member</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10">
        
        {/* Page Header Area */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Personnel Management</p>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Staff Management</h2>
            </div>
            
            <div className="w-full md:w-80 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search by name or UID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
              />
            </div>
          </div>
        </section>

        {/* Staff Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((member) => (
            <div key={member.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(member)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(member.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-tighter">
                    {member.staff_uid}
                  </span>
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    {member.commission_tier_override === 'auto' ? 'Auto-Tier' : member.commission_tier_override}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{member.name}</h3>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">{member.role}</p>
              </div>

              <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Commission</span>
                  <span className="text-slate-900 font-bold text-sm">
                    {member.commission_rate ? `${member.commission_rate}%` : 'Dynamic'}
                  </span>
                </div>
                <Shield className="w-4 h-4 text-slate-200" />
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* --- REBUILT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">
                {editingStaff ? 'Edit Staff Member' : 'Register New Staff'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Full Name</label>
                <input
                  type="text" required value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white outline-none font-bold text-slate-700 transition-all"
                  placeholder="e.g. Mahira Atelier"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Staff Login UID</label>
                <input
                  type="text" required value={formData.staff_uid}
                  onChange={e => setFormData({ ...formData, staff_uid: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white outline-none font-mono font-bold text-blue-600 transition-all"
                  placeholder="idmahira"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  {editingStaff ? 'Reset PIN (Leave blank to keep)' : 'Security PIN'}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input
                    type="password" maxLength={6} pattern="[0-9]*" inputMode="numeric"
                    value={formData.pin} onChange={e => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold tracking-[0.3em] outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all"
                    placeholder="••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Commission Tier</label>
                  <select
                    value={formData.commission_tier_override}
                    onChange={e => setFormData({ ...formData, commission_tier_override: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                  >
                    <option value="auto">Auto-Calculate</option>
                    <option value="premium">Premium (20%)</option>
                    <option value="prestige">Prestige (25%)</option>
                    <option value="privilege">Privilege (30%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Custom Rate (%)</label>
                  <input
                    type="number" step="0.1" value={formData.commission_rate}
                    onChange={e => setFormData({ ...formData, commission_rate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                    placeholder="e.g. 12.5"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={isLoading}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
              >
                {isLoading ? 'Processing...' : (editingStaff ? 'Update Staff Member' : 'Register Member')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagementPage;