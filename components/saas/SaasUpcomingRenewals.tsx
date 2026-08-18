import React, { useState } from 'react';
import { CalendarClock, AlertCircle, ChevronRight, X, CreditCard, ShieldAlert } from 'lucide-react';
import { Company } from '../../types';
import { calculateSubscriberMRR, getPlanName, getSubscriberEffectiveStatus } from '../../utils/saasUtils';
import { formatMytDate } from '../../utils/dateUtils';

interface SaasUpcomingRenewalsProps {
  subscribers: Company[];
  onSelectSubscriber: (subscriber: Company) => void;
}

export const SaasUpcomingRenewals: React.FC<SaasUpcomingRenewalsProps> = ({
  subscribers,
  onSelectSubscriber
}) => {
  const [modalDays, setModalDays] = useState<7 | 30 | null>(null);

  const now = new Date();

  // Filter subscribers renewing in 7 and 30 days
  const getRenewalsList = (maxDays: number) => {
    return (subscribers || []).filter(sub => {
      if (!sub.expiry_date || sub.is_trial) return false;
      const status = getSubscriberEffectiveStatus(sub);
      if (status === 'cancelled' || status === 'expired' || status === 'suspended') return false;
      
      const expiry = new Date(sub.expiry_date);
      if (isNaN(expiry.getTime())) return false;
      const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= maxDays;
    }).sort((a, b) => (new Date(a.expiry_date || 0).getTime() || 0) - (new Date(b.expiry_date || 0).getTime() || 0));
  };

  const next7DaysList = getRenewalsList(7);
  const next30DaysList = getRenewalsList(30);

  const next7Amount = next7DaysList.reduce((sum, s) => sum + (s.billing_cycle === 'annual' ? (s.annual_amount || 1500) : calculateSubscriberMRR(s)), 0);
  const next30Amount = next30DaysList.reduce((sum, s) => sum + (s.billing_cycle === 'annual' ? (s.annual_amount || 1500) : calculateSubscriberMRR(s)), 0);

  const activeList = modalDays === 7 ? next7DaysList : next30DaysList;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-amber-600" />
            <span>Upcoming Subscription Renewals</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Forecasted renewals and expected cash collections</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Next 7 Days */}
        <div 
          onClick={() => setModalDays(7)}
          className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-amber-800 tracking-wider">Next 7 Days</span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span>View List</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-900 tracking-tight">
              {next7DaysList.length} Accounts
            </div>
            <div className="text-xs font-semibold text-amber-700 mt-1">
              Expected: RM {next7Amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Next 30 Days */}
        <div 
          onClick={() => setModalDays(30)}
          className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-blue-800 tracking-wider">Next 30 Days</span>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span>View List</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-blue-900 tracking-tight">
              {next30DaysList.length} Accounts
            </div>
            <div className="text-xs font-semibold text-blue-700 mt-1">
              Expected: RM {next30Amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Renewals Drilldown Modal */}
      {modalDays !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Upcoming Renewals ({modalDays === 7 ? 'Next 7 Days' : 'Next 30 Days'})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeList.length} subscriptions due for billing
                </p>
              </div>
              <button 
                onClick={() => setModalDays(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto divide-y divide-slate-100 space-y-3">
              {activeList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm font-medium">
                  No upcoming renewals in this period.
                </div>
              ) : (
                activeList.map((sub) => {
                  const planName = getPlanName(sub.tier);
                  const amount = sub.billing_cycle === 'annual' ? (sub.annual_amount || 1500) : calculateSubscriberMRR(sub);
                  return (
                    <div 
                      key={sub.id} 
                      onClick={() => {
                        setModalDays(null);
                        onSelectSubscriber(sub);
                      }}
                      className="pt-3 first:pt-0 flex items-center justify-between hover:bg-slate-50 p-2.5 rounded-xl cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <span>{sub.name}</span>
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {planName}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>Billing Date: {sub.expiry_date ? formatMytDate(sub.expiry_date, 'dd MMM yyyy') : 'N/A'}</span>
                          <span>•</span>
                          <span className="capitalize">{sub.billing_cycle || 'monthly'}</span>
                          <span>•</span>
                          <span>Method: {sub.payment_method || 'FPX / Auto-debit'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">
                          RM {amount.toFixed(2)}
                        </div>
                        <span className="text-[10px] font-semibold text-blue-600 hover:underline">
                          View details →
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setModalDays(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
