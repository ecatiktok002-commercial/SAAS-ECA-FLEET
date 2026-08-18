import React from 'react';
import { AlertCircle, Clock, AlertTriangle, ShieldAlert, PauseCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { SaaSMetricsSummary } from '../../utils/saasUtils';

interface SaasPaymentHealthProps {
  healthItems?: SaaSMetricsSummary['paymentHealth'];
  renewals?: SaaSMetricsSummary['renewals'];
  activeFilter?: string;
  onSelectStatus: (status: string) => void;
}

export const SaasPaymentHealth: React.FC<SaasPaymentHealthProps> = ({
  healthItems = [],
  renewals = { next7DaysCount: 0, next7DaysAmount: 0, next30DaysCount: 0, next30DaysAmount: 0 },
  activeFilter,
  onSelectStatus
}) => {
  // Extract actionable categories
  const pastDueItem = healthItems.find(i => i.status === 'past_due') || { subscribersCount: 0, amount: 0 };
  const graceItem = healthItems.find(i => i.status === 'grace_period') || { subscribersCount: 0, amount: 0 };
  const suspendedItem = healthItems.find(i => i.status === 'suspended') || { subscribersCount: 0, amount: 0 };

  const renewingCount = renewals.next7DaysCount || 0;
  const renewingAmount = renewals.next7DaysAmount || 0;
  const pastDueCount = pastDueItem.subscribersCount || 0;
  const pastDueAmount = pastDueItem.amount || 0;
  const graceCount = graceItem.subscribersCount || 0;
  const graceAmount = graceItem.amount || 0;
  const suspendedCount = suspendedItem.subscribersCount || 0;
  const suspendedAmount = suspendedItem.amount || 0;

  // Total attention required
  const totalAttentionCount = renewingCount + pastDueCount + graceCount + suspendedCount;
  const isHealthy = totalAttentionCount === 0;

  return (
    <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80">
      {/* Header with clear summary banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-900" />
            <span>Billing Attention</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Actionable subscription renewals and payment issues</p>
        </div>

        <div>
          {isHealthy ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>All subscriptions healthy</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>
                {totalAttentionCount} subscription{totalAttentionCount === 1 ? '' : 's'} require attention
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Actionable Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Renewing Soon (Next 7 Days) */}
        <div
          onClick={() => onSelectStatus(activeFilter === 'due_soon' ? 'all' : 'due_soon')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            renewingCount > 0 
              ? 'bg-blue-50/70 border-blue-200 hover:bg-blue-100/70' 
              : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
          } ${activeFilter === 'due_soon' ? 'ring-2 ring-blue-600 shadow-xs border-blue-600' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Renewing Soon (7d)</span>
            <Clock className={`w-4 h-4 ${renewingCount > 0 ? 'text-blue-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <div className={`text-xl font-black ${renewingCount > 0 ? 'text-blue-700' : 'text-slate-700'}`}>
              {renewingCount} {renewingCount === 1 ? 'customer' : 'customers'}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {renewingCount > 0 ? `RM ${renewingAmount.toLocaleString()} expected` : 'RM 0 expected'}
            </div>
          </div>
        </div>

        {/* 2. Past Due */}
        <div
          onClick={() => onSelectStatus(activeFilter === 'past_due' ? 'all' : 'past_due')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            pastDueCount > 0 
              ? 'bg-rose-50 border-rose-200 hover:bg-rose-100/80' 
              : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
          } ${activeFilter === 'past_due' ? 'ring-2 ring-rose-600 shadow-xs border-rose-600' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Past Due</span>
            <AlertTriangle className={`w-4 h-4 ${pastDueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <div className={`text-xl font-black ${pastDueCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
              {pastDueCount} {pastDueCount === 1 ? 'customer' : 'customers'}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {pastDueCount > 0 ? `RM ${pastDueAmount.toLocaleString()} overdue` : 'RM 0'}
            </div>
          </div>
        </div>

        {/* 3. Grace Period */}
        <div
          onClick={() => onSelectStatus(activeFilter === 'grace_period' ? 'all' : 'grace_period')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            graceCount > 0 
              ? 'bg-amber-50 border-amber-200 hover:bg-amber-100/80' 
              : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
          } ${activeFilter === 'grace_period' ? 'ring-2 ring-amber-600 shadow-xs border-amber-600' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Grace Period</span>
            <ShieldAlert className={`w-4 h-4 ${graceCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <div className={`text-xl font-black ${graceCount > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
              {graceCount}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {graceCount > 0 ? `RM ${graceAmount.toLocaleString()} in grace` : '0 in grace'}
            </div>
          </div>
        </div>

        {/* 4. Suspended */}
        <div
          onClick={() => onSelectStatus(activeFilter === 'suspended' ? 'all' : 'suspended')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            suspendedCount > 0 
              ? 'bg-slate-100 border-slate-300 hover:bg-slate-200/80' 
              : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
          } ${activeFilter === 'suspended' ? 'ring-2 ring-slate-900 shadow-xs border-slate-900' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Suspended</span>
            <PauseCircle className={`w-4 h-4 ${suspendedCount > 0 ? 'text-slate-700' : 'text-slate-400'}`} />
          </div>
          <div>
            <div className={`text-xl font-black ${suspendedCount > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
              {suspendedCount}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {suspendedCount > 0 ? `${suspendedCount} accounts locked` : '0 locked'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
