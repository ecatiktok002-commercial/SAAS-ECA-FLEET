import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { supabase } from '../services/supabase';
import { StaffMember } from '../types';
import { Shield, ShieldAlert, UserPlus, Trash2, Edit2, KeyRound } from 'lucide-react';
import { hashPin } from '../utils/crypto';

const StaffManagementPage: React.FC = () => {
  const { subscriberId, staffRole } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({ name: '', designated_uid: '', pin: '', commission_tier_override: 'auto' as 'auto' | 'premium' | 'prestige' | 'privilege' });

  useEffect(() => {
    if (subscriberId) {
      loadStaff();
    }
  }, [subscriberId]);

  const loadStaff = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getStaffMembers(subscriberId!);
      setStaff(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriberId) return;

    const cleanUid = formData.designated_uid.trim().toLowerCase();

    try {
      setIsLoading(true);
      
      const hashedPin = formData.pin ? await hashPin(formData.pin) : undefined;
      
      if (editingStaff) {
        // Update existing
        const updates: Partial<StaffMember> = { 
          name: formData.name, 
          designated_uid: cleanUid,
          commission_tier_override: formData.commission_tier_override
        };
        if (hashedPin) {
          updates.pin_hash = hashedPin; 
        }
        await apiService.updateStaffMember(editingStaff.id, subscriberId, updates);
      } else {
        // Create new
        setStatusMessage('Setting up your account...');

        // 1. Call the Edge Function using the official Supabase helper
        const { data: provisionData, error: functionError } = await supabase.functions.invoke('auth-provisioner-index-ts', {
          body: { 
            uid: cleanUid, 
            subscriber_id: subscriberId 
          }
        });

        // 2. Check for Function Errors
        if (functionError) {
          let errorMsg = functionError.message;
          try {
            const body = await functionError.context?.json();
            if (body && body.error) errorMsg = body.error;
          } catch (e) {}
          throw new Error(`Auth Provisioning Failed: ${errorMsg}`);
        }

        // 3. If Auth is successful (or user already exists), save to the Staff Table
        // We use apiService.addStaffMember which now uses the provisioned account
        await apiService.addStaffMember(formData.name, subscriberId, 'staff', hashedPin, cleanUid, formData.commission_tier_override);
        
        alert('Staff member created successfully in both Auth and Database!');
      }
      
      await loadStaff();
      setIsModalOpen(false);
      setEditingStaff(null);
      setFormData({ name: '', designated_uid: '', pin: '', commission_tier_override: 'auto' });
    } catch (err: any) {
      console.error('Handshake Error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!subscriberId || !window.confirm('Are you sure you want to delete this staff member?')) return;
    try {
      setIsLoading(true);
      await apiService.deleteStaffMember(id, subscriberId);
      await loadStaff();
    } catch (err: any) {
      alert(`Error deleting staff: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (member: StaffMember) => {
    setEditingStaff(member);
    setFormData({ 
      name: member.name, 
      designated_uid: member.designated_uid || '', 
      pin: '',
      commission_tier_override: member.commission_tier_override || 'auto'
    });
    setIsModalOpen(true);
  };

  if (staffRole !== 'admin') {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center h-[60vh]">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
        <p className="text-slate-500 mt-2">You need administrator privileges to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Staff Management</h1>
          <p className="text-slate-500 mt-2">Manage your team members and their access levels.</p>
        </div>
        <button
          onClick={() => {
            setEditingStaff(null);
            setFormData({ name: '', designated_uid: '', pin: '', commission_tier_override: 'auto' });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add Staff
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-600 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Designated UID</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Commission Tier</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && staff.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading...</td>
              </tr>
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No staff members found.</td>
              </tr>
            ) : (
              staff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{member.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {member.designated_uid}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      member.commission_tier_override === 'premium' ? 'bg-slate-100 text-slate-700' :
                      member.commission_tier_override === 'prestige' ? 'bg-blue-100 text-blue-700' :
                      member.commission_tier_override === 'privilege' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {member.commission_tier_override === 'premium' ? 'Premium (20%)' :
                       member.commission_tier_override === 'prestige' ? 'Prestige (25%)' :
                       member.commission_tier_override === 'privilege' ? 'Privilege (30%)' :
                       'Auto-Calculate'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(member)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Designated UID</label>
                <input
                  type="text"
                  required
                  value={formData.designated_uid}
                  onChange={e => setFormData({ ...formData, designated_uid: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                  placeholder="e.g. idmahira"
                />
                <p className="text-[10px] text-slate-500 mt-1">This will be used for login. No spaces allowed.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {editingStaff ? 'New PIN (Leave blank to keep current)' : 'PIN Code (Optional)'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={formData.pin}
                    onChange={e => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. 1234"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Used for quick login. Numbers only.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Commission Tier</label>
                <select
                  value={formData.commission_tier_override}
                  onChange={e => setFormData({ ...formData, commission_tier_override: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="auto">Auto-Calculate</option>
                  <option value="premium">Premium Base (20%)</option>
                  <option value="prestige">Prestige Base (25%)</option>
                  <option value="privilege">Privilege Base (30%)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Select 'Auto-Calculate' to use RM threshold logic based on current month sales.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading ? (statusMessage || 'Saving...') : 'Save Staff'}
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
