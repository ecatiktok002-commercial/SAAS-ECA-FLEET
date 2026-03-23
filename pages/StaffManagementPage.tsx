import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { supabase } from '../services/supabase'; // Direct access for the status toggle
import { StaffMember } from '../types';
import { ShieldAlert, UserPlus, Trash2, Edit2, KeyRound, UserMinus, UserCheck, Search, Archive } from 'lucide-react';

const StaffManagementPage: React.FC = () => {
  const { subscriberId, staffRole } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'active' | 'archived'>('active'); // Tab State
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    staff_uid: '', 
    pin: '', 
    commission_tier_override: 'auto' as 'auto' | 'premium' | 'prestige' | 'privilege', 
    commission_rate: '' 
  });

  useEffect(() => {
    if (subscriberId) loadStaff();
  }, [subscriberId]);

  const loadStaff = async () => {
    try {
      setIsLoading(true);
      // Fetch all staff (active and inactive)
      const data = await apiService.getStaffMembers(subscriberId!);
      setStaff(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW: Toggle Deactivation Logic ---
  const toggleStaffStatus = async (id: string, currentStatus: boolean) => {
  const action = currentStatus ? 'deactivate' : 'restore';
  if (!window.confirm(`Are you sure you want to ${action} this staff member?`)) return;

  try {
    setIsLoading(true);
    
    // Use your existing apiService to update the member
    // We send { is_active: false } to deactivate
    await apiService.updateStaffMember(id, subscriberId!, { 
      is_active: !currentStatus 
    });

    await loadStaff(); // Refresh the list to move them to the Archive tab
  } catch (err: any) {
    console.error("Deactivation Error:", err);
    alert(`Error updating status: ${err.message}`);
  } finally {
    setIsLoading(false);
  }
};

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriberId) return;
    const cleanUid = formData.staff_uid.trim().toLowerCase();

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
        await apiService.addStaffMember(formData.name, subscriberId, 'staff', formData.pin, cleanUid, formData.commission_tier_override, formData.commission_rate ? parseFloat(formData.commission_rate) : undefined);
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

  // --- NEW: Filtering Logic ---
  const filteredStaff = useMemo(() => {
    return staff.filter(member => {
      const matchesView = view === 'active' ? (member.is_active !== false) : (member.is_active === false);
      const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           member.staff_uid?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesView && matchesSearch;
    });
  }, [staff, view, searchTerm]);

  if (staffRole !== 'admin') {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center h-[60vh]">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
        <p className="text-slate-500 mt-2">Administrator privileges required.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Management</h1>
          <p className="text-slate-500 font-medium">Control team access and commission structures.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search staff..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-48 md:w-64"
            />
          </div>
          <button
            onClick={() => {
              setEditingStaff(null);
              setFormData({ name: '', staff_uid: '', pin: '', commission_tier_override: 'auto', commission_rate: '' });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
          >
            <UserPlus className="w-5 h-5" /> Add Staff
          </button>
        </div>
      </div>

      {/* --- NEW: View Tabs --- */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setView('active')}
          className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${view === 'active' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
        >
          Active Team
        </button>
        <button 
          onClick={() => setView('archived')}
          className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${view === 'archived' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
        >
          Archive
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Member</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Login UID</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Commission</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                   <Archive className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                   <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No {view} staff found</p>
                </td>
              </tr>
            ) : (
              filteredStaff.map((member) => (
                <tr key={member.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className={`font-black tracking-tight ${member.is_active === false ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {member.name}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg uppercase">
                      {member.staff_uid}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter ${
                      member.commission_tier_override === 'premium' ? 'bg-slate-100 text-slate-700' :
                      member.commission_tier_override === 'prestige' ? 'bg-blue-100 text-blue-700' :
                      member.commission_tier_override === 'privilege' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {member.commission_rate ? `${member.commission_rate}%` : member.commission_tier_override}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(member)}
                        className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      
                      {/* --- TOGGLE BUTTON: Deactivate or Restore --- */}
                      <button
                        onClick={() => toggleStaffStatus(member.id, member.is_active !== false)}
                        className={`p-2 transition-all rounded-xl ${
                          member.is_active !== false 
                          ? 'text-slate-300 hover:text-rose-600 hover:bg-rose-50' 
                          : 'text-slate-300 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={member.is_active !== false ? 'Deactivate' : 'Restore'}
                      >
                        {member.is_active !== false ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal remains largely the same but with the bold styling from previous turns */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {editingStaff ? 'Edit Team Member' : 'New Team Member'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2"><Plus className="w-6 h-6 rotate-45" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" placeholder="John Doe" />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Login UID</label>
                <input type="text" required value={formData.staff_uid} onChange={e => setFormData({ ...formData, staff_uid: e.target.value.toLowerCase().replace(/\s+/g, '') })} className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm font-bold" placeholder="idjohn" />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Login PIN (4-6 Digits)</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="password" maxLength={6} pattern="[0-9]*" inputMode="numeric" value={formData.pin} onChange={e => setFormData({ ...formData, pin: e.target.value })} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" placeholder="••••••" />
                </div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-4 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50">
                  {isLoading ? 'Saving...' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagementPage;