import React, { useState, useEffect } from 'react';
import { AlertTriangle, Link as LinkIcon, Trash2, FileText, Calendar, AlertCircle, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { runMatchyScan } from '../services/auditService';
import { supabase } from '../services/supabase';

interface MatchyScanAlertProps {
  subscriberId: string;
  monthStartDate: string;
  monthEndDate: string;
  scanTrigger?: number;
  onScanComplete?: () => void;
}

const MatchyScanAlert: React.FC<MatchyScanAlertProps> = ({ subscriberId, monthStartDate, monthEndDate, scanTrigger = 0, onScanComplete }) => {
  const [orphanedBookings, setOrphanedBookings] = useState<any[]>([]);
  const [orphanedAgreements, setOrphanedAgreements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Modal State
  const [linkModal, setLinkModal] = useState<{ isOpen: boolean; type: 'booking' | 'agreement'; sourceId: string; sourceLabel: string } | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const fetchScanData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const { orphanedAgreements, orphanedBookings } = await runMatchyScan(subscriberId, monthStartDate, monthEndDate);
      setOrphanedAgreements(orphanedAgreements);
      setOrphanedBookings(orphanedBookings);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (subscriberId) {
      fetchScanData(scanTrigger > 0).then(() => {
        if (onScanComplete) onScanComplete();
      });
    }
  }, [subscriberId, monthStartDate, monthEndDate, scanTrigger]);

  const handleLinkConfirm = async () => {
    if (!selectedMatchId || !linkModal) return;
    setIsLinking(true);
    try {
      // If we are linking a booking, the target is the selected agreement.
      // If we are linking an agreement, the target is the agreement itself.
      const agreementId = linkModal.type === 'agreement' ? linkModal.sourceId : selectedMatchId;
      const bookingId = linkModal.type === 'booking' ? linkModal.sourceId : selectedMatchId;

      const { error } = await supabase
        .from('agreements')
        .update({ booking_id: bookingId })
        .eq('id', agreementId)
        .eq('subscriber_id', subscriberId);

      if (error) throw error;

      // Reset modal and refresh
      setLinkModal(null);
      setSelectedMatchId('');
      await fetchScanData(true);
    } catch (err: any) {
      alert(`Error linking records: ${err.message}`);
    } finally {
      setIsLinking(false);
    }
  };

  const totalOrphans = orphanedBookings.length + orphanedAgreements.length;

  if (isLoading) return <div className="animate-pulse h-16 bg-slate-100 rounded-xl w-full mb-8"></div>;
  if (error) return <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold mb-8">Error: {error}</div>;
  
  if (totalOrphans === 0) {
    if (isRefreshing) {
      return <div className="animate-pulse h-16 bg-slate-100 rounded-xl w-full mb-8"></div>;
    }
    if (scanTrigger > 0) {
      return (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-5 rounded-r-xl shadow-sm flex items-start gap-4 mb-8 animate-in fade-in duration-500">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-emerald-800 font-bold text-lg tracking-tight">
                Scan Complete: All Data Matched
              </h3>
              <button 
                onClick={() => fetchScanData(true)}
                disabled={isRefreshing}
                className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors disabled:opacity-50"
                title="Re-scan for orphans"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-emerald-600 text-sm mt-1 font-medium">
              No orphaned bookings or agreements were found for this month.
            </p>
          </div>
        </div>
      );
    }
    return null; // Bypass alert phase if perfectly matched and no manual scan triggered
  }

  return (
    <div className="space-y-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* 1. The Alert Banner UI */}
      <div className="bg-rose-50 border-l-4 border-rose-500 p-5 rounded-r-xl shadow-sm flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-rose-800 font-bold text-lg tracking-tight">
              Data Integrity Alert: Action Required Before Payout
            </h3>
            <button 
              onClick={() => fetchScanData(true)}
              disabled={isRefreshing}
              className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-md transition-colors disabled:opacity-50"
              title="Re-scan for orphans"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-rose-600 text-sm mt-1 font-medium">
            The Matchy Scan detected {totalOrphans} orphaned record(s) for this month. You must resolve these discrepancies before proceeding to Bank Reconciliation.
          </p>
          <div className="flex flex-wrap gap-4 mt-3">
            {orphanedBookings.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold uppercase tracking-wider rounded-md">
                ⚠️ {orphanedBookings.length} Bookings missing Digital Forms
              </span>
            )}
            {orphanedAgreements.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold uppercase tracking-wider rounded-md">
                ⚠️ {orphanedAgreements.length} Agreements missing on Calendar
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. The Resolution UI */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            Orphan Resolution Queue
          </h4>
        </div>

        <div className="divide-y divide-slate-100">
          {/* List Orphaned Bookings */}
          {orphanedBookings.map((booking) => (
            <div key={booking.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Booking
                    </span>
                    <span className="text-sm font-bold text-slate-900">{booking.cars?.plate || 'Unknown Car'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(booking.start).toLocaleDateString()} • {booking.duration} Days • Agent: {booking.created_by || 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button 
                  onClick={() => setLinkModal({ 
                    isOpen: true, 
                    type: 'booking', 
                    sourceId: booking.id, 
                    sourceLabel: `${booking.cars?.plate || 'Unknown Car'} (${new Date(booking.start).toLocaleDateString()})` 
                  })}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                >
                  <LinkIcon className="w-3 h-3" /> Link Form
                </button>
                <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* List Orphaned Agreements */}
          {orphanedAgreements.map((agreement) => (
            <div key={agreement.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Agreement
                    </span>
                    <span className="text-sm font-bold text-slate-900">{agreement.customer_name}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {agreement.car_plate_number} • RM {agreement.total_price} • Agent: {agreement.agent_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button 
                  onClick={() => setLinkModal({ 
                    isOpen: true, 
                    type: 'agreement', 
                    sourceId: agreement.id, 
                    sourceLabel: `${agreement.customer_name} (${agreement.car_plate_number})` 
                  })}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                >
                  <LinkIcon className="w-3 h-3" /> Link Booking
                </button>
                <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. The Link Modal */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">
                {linkModal.type === 'booking' ? 'Link Agreement to Booking' : 'Link Booking to Agreement'}
              </h3>
              <button 
                onClick={() => { setLinkModal(null); setSelectedMatchId(''); }} 
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Selected {linkModal.type === 'booking' ? 'Booking' : 'Agreement'}
                </label>
                <div className="p-3 bg-slate-50 rounded-lg text-sm font-medium text-slate-700 border border-slate-200">
                  {linkModal.sourceLabel}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Select Matching {linkModal.type === 'booking' ? 'Agreement' : 'Booking'}
                </label>
                <select 
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                >
                  <option value="">-- Select a match --</option>
                  {linkModal.type === 'booking' 
                    ? orphanedAgreements.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.customer_name} - {a.car_plate_number} (RM {a.total_price})
                        </option>
                      ))
                    : orphanedBookings.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.cars?.plate || 'Unknown'} - {new Date(b.start).toLocaleDateString()} ({b.duration} Days)
                        </option>
                      ))
                  }
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button 
                onClick={() => { setLinkModal(null); setSelectedMatchId(''); }}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleLinkConfirm}
                disabled={!selectedMatchId || isLinking}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLinking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                Confirm Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchyScanAlert;
