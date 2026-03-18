import React, { useState, useEffect } from 'react';
import { AlertTriangle, Link as LinkIcon, Trash2, FileText, Calendar, AlertCircle } from 'lucide-react';
import { runMatchyScan } from '../services/auditService';

interface MatchyScanAlertProps {
  subscriberId: string;
  monthStartDate: string;
  monthEndDate: string;
}

const MatchyScanAlert: React.FC<MatchyScanAlertProps> = ({ subscriberId, monthStartDate, monthEndDate }) => {
  const [orphanedBookings, setOrphanedBookings] = useState<any[]>([]);
  const [orphanedAgreements, setOrphanedAgreements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchScanData = async () => {
      setIsLoading(true);
      try {
        const { orphanedAgreements, orphanedBookings } = await runMatchyScan(subscriberId, monthStartDate, monthEndDate);
        setOrphanedAgreements(orphanedAgreements);
        setOrphanedBookings(orphanedBookings);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (subscriberId) fetchScanData();
  }, [subscriberId, monthStartDate, monthEndDate]);

  const totalOrphans = orphanedBookings.length + orphanedAgreements.length;

  if (isLoading) return <div className="animate-pulse h-16 bg-slate-100 rounded-xl w-full mb-8"></div>;
  if (error) return <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold mb-8">Error: {error}</div>;
  if (totalOrphans === 0) return null; // Bypass alert phase if perfectly matched

  return (
    <div className="space-y-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* 1. The Alert Banner UI */}
      <div className="bg-rose-50 border-l-4 border-rose-500 p-5 rounded-r-xl shadow-sm flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-rose-800 font-bold text-lg tracking-tight">
            Data Integrity Alert: Action Required Before Payout
          </h3>
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
                <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center gap-1.5">
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
                <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center gap-1.5">
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
    </div>
  );
};

export default MatchyScanAlert;
