import React from 'react';
import { Layers, ShieldCheck, Calendar, FileText } from 'lucide-react';
import { SaaSMetricsSummary } from '../../utils/saasUtils';

interface SaasPlanPerformanceProps {
  plans: SaaSMetricsSummary['planPerformance'];
  onSelectTier?: (tier: string) => void;
  selectedTier?: string;
}

export const SaasPlanPerformance: React.FC<SaasPlanPerformanceProps> = ({
  plans,
  onSelectTier,
  selectedTier
}) => {
  const getIcon = (tier: string) => {
    if (tier === 'Tier 3') return <ShieldCheck className="w-4 h-4 text-indigo-600" />;
    if (tier === 'Tier 2') return <Calendar className="w-4 h-4 text-blue-600" />;
    return <FileText className="w-4 h-4 text-emerald-600" />;
  };

  const getTierBadge = (tier: string) => {
    if (tier === 'Tier 3') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (tier === 'Tier 2') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Plan Mix</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Subscriber count and recurring revenue distribution by plan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {plans.map((plan) => {
          const isSelected = selectedTier === plan.tier;
          return (
            <div
              key={plan.tier}
              onClick={() => onSelectTier?.(isSelected ? 'all' : plan.tier)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10'
                  : 'border-slate-200/80 bg-slate-50/40 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      {getIcon(plan.tier)}
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">{plan.name}</h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTierBadge(plan.tier)}`}>
                    {plan.tier}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <div className="text-sm font-bold text-slate-800">
                    {plan.subscribersCount} {plan.subscribersCount === 1 ? 'customer' : 'customers'}
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    RM {plan.mrr.toLocaleString()} <span className="text-[11px] font-medium text-slate-400">MRR</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">RM {plan.priceMonthly}/mo standard</span>
                <span className="font-bold text-slate-700">{plan.mrrPercentage}% of MRR</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
