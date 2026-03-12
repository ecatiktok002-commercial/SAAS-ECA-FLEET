import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { StaffMember } from '../types';
import PinModal, { hashPin } from './PinModal';

// Modal for selecting staff member and entering PIN
interface StaffSelectionModalProps {
  isOpen: boolean;
  companyId: string;
  onStaffSelected: (staff: StaffMember) => void;
}

const StaffSelectionModal: React.FC<StaffSelectionModalProps> = ({ isOpen, companyId, onStaffSelected }) => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  
  // PIN Setting State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingStaff, setPendingStaff] = useState<StaffMember | null>(null); // Staff member waiting for PIN setup

  useEffect(() => {
    if (isOpen && companyId) {
      fetchStaff();
    }
  }, [isOpen, companyId]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await apiService.getStaffMembers(companyId);
      setStaffList(data);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffClick = (staff: StaffMember) => {
    if (!staff.pin_hash) {
      // PIN not set, force setup
      setPendingStaff(staff);
      setIsPinModalOpen(true);
    } else {
      // PIN exists, just select
      onStaffSelected(staff);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    try {
      setLoading(true);
      // Create staff without PIN first
      const newStaff = await apiService.addStaffMember(newStaffName, companyId);
      setStaffList(prev => [...prev, newStaff]);
      setNewStaffName('');
      setShowAddForm(false);
      
      // Immediately trigger PIN setup
      setPendingStaff(newStaff);
      setIsPinModalOpen(true);
    } catch (err) {
      alert('Failed to add staff member');
    } finally {
      setLoading(false);
    }
  };

  const handlePinSet = async (pin: string) => {
    if (!pendingStaff) return;

    try {
      const hashed = await hashPin(pin);
      await apiService.updateStaffPin(pendingStaff.id, hashed);
      
      // Update local state
      const updatedStaff = { ...pendingStaff, pin_hash: hashed };
      setStaffList(prev => prev.map(s => s.id === pendingStaff.id ? updatedStaff : s));
      
      // Complete selection
      onStaffSelected(updatedStaff);
      setIsPinModalOpen(false);
      setPendingStaff(null);
    } catch (err) {
      alert('Failed to save PIN');
    }
  };

  const handleDeleteStaff = async (e: React.MouseEvent, staff: StaffMember) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${staff.name}? This will not affect existing bookings.`)) {
      try {
        setLoading(true);
        await apiService.deleteStaffMember(staff.id, companyId);
        setStaffList(prev => prev.filter(s => s.id !== staff.id));
      } catch (err) {
        alert('Failed to delete staff member');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-slate-50 p-8 text-center border-b border-slate-100">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Who are you?</h2>
            <p className="text-sm text-slate-500 mt-2">Select your profile to access the dashboard.</p>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {loading && staffList.length === 0 ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {staffList.map(staff => (
                  <div key={staff.id} className="relative group">
                    <button
                      onClick={() => handleStaffClick(staff)}
                      className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-200 hover:shadow-lg transition-all text-left relative overflow-hidden"
                    >
                      <div className="font-bold text-slate-700 group-hover:text-indigo-700">{staff.name}</div>
                      {!staff.pin_hash && (
                        <div className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          Setup PIN
                        </div>
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDeleteStaff(e, staff)}
                      className="absolute top-2 right-2 p-1.5 bg-white rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                      title="Delete Staff"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={() => setShowAddForm(true)}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  <span className="text-xs font-bold uppercase tracking-wider">Add New</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Staff Modal Overlay */}
      {showAddForm && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <form onSubmit={handleAddStaff} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add New Staff Member</h3>
            <input
              autoFocus
              type="text"
              placeholder="Enter name..."
              value={newStaffName}
              onChange={e => setNewStaffName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none mb-4 font-semibold"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newStaffName.trim() || loading}
                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PIN Setup Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          // If cancelling setup for a new staff, we might want to revert or just close
          setIsPinModalOpen(false);
          setPendingStaff(null);
        }}
        onSuccess={() => {}} // Not used for setting
        onPinSet={handlePinSet}
        isSettingPin={true}
        staffName={pendingStaff?.name || ''}
        title="Create Security PIN"
      />
    </>
  );
};

export default StaffSelectionModal;
