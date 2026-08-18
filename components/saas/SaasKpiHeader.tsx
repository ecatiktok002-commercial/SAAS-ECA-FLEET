import React from 'react';
import { DollarSign, Users, Wallet, AlertCircle, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import { SaaSMetricsSummary } from '../../utils/saasUtils';

interface SaasKpiHeaderProps {
  metrics: SaaSMetricsSummary;
  onFilterPastDue: () => void;
  onFilterActive: () => void;
  onFilterRenewingSoon?: () => void;
}

export const SaasKpiHeader: React.FC<SaasKpiHeaderProps> = ({
  metrics,
  onFilterPastDue,
  onFilterActive,
  onFilterRenewingSoon
}) => {
  // Determine Payment Attention card content dynamically
  const hasPastDue = metrics.pastDueAmount > 0 || metrics.pastDueSubscribersCount > 0;
  const hasRenewals = metrics.renewals.next7DaysCount > 0;

  let attentionTitle = 'Payment Attention';
  let attentionValue = '0 overdue';
  let attentionSubtext = 'All subscriptions up to date';
  let attentionColor = 'text-emerald-700';
  let attentionBadgeBg = 'bg-emerald-50 text-emerald-600';
  let attentionBorderHover = 'hover:border-emerald-300';
  let onAttentionClick = onFilterPastDue;

  if (hasPastDue) {
    attentionValue = `RM ${metrics.pastDueAmount.toLocaleString()} overdue`;
    attentionSubtext = `${metrics.pastDueSubscribersCount} customer${metrics.pastDueSubscribersCount === 1 ? '' : 's'} past due`;
    attentionColor = 'text-rose-600';
    attentionBadgeBg = 'bg-rose-50 text-rose-600';
    attentionBorderHover = 'hover:border-rose-300 hover:shadow-md';
    onAttentionClick = onFilterPastDue;
  } else if (hasRenewals) {
    attentionValue = `${metrics.renewals.next7DaysCount} renewal${metrics.renewals.next7DaysCount === 1 ? '' : 's'} due`;
    attentionSubtext = `RM ${metrics.renewals.next7DaysAmount.toLocaleString()} in next 7 days`;
    attentionColor = 'text-blue-700';
    attentionBadgeBg = 'bg-blue-50 text-blue-600';
    attentionBorderHover = 'hover:border-blue-300 hover:shadow-md';
    onAttentionClick = onFilterRenewingSoon || onFilterPastDue;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. MRR */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">MRR</span>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            RM {metrics.mrr.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Recurring subscription value</span>
            {metrics.mrrGrowthPercent > 0 && (
              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{metrics.mrrGrowthPercent}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Paying Customers */}
      <div 
        onClick={onFilterActive}
        className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paying Customers</span>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {metrics.activeSubscribers}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Commercial active subscribers</span>
            <span className="text-blue-600 font-semibold group-hover:underline">View List →</span>
          </div>
        </div>
      </div>

      {/* 3. Cash Collected This Month */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cash Collected This Month</span>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-105 transition-transform">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            RM {metrics.cashCollectedThisMonth.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Actual payments received</span>
            <span className="text-slate-400 font-medium text-[11px]">MTD Realized</span>
          </div>
        </div>
      </div>

      {/* 4. Payment Attention (Dynamic) */}
      <div 
        onClick={onAttentionClick}
        className={`bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 ${attentionBorderHover} transition-all flex flex-col justify-between cursor-pointer group`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{attentionTitle}</span>
          <div className={`p-2 rounded-xl group-hover:scale-105 transition-transform ${attentionBadgeBg}`}>
            {hasPastDue ? (
              <AlertCircle className="w-4 h-4" />
            ) : hasRenewals ? (
              <Clock className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </div>
        </div>
        <div>
          <div className={`text-2xl sm:text-3xl font-black tracking-tight ${attentionColor}`}>
            {attentionValue}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">{attentionSubtext}</span>
            <span className={`font-semibold group-hover:underline ${attentionColor}`}>
              {hasPastDue || hasRenewals ? 'Action →' : 'Healthy'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
