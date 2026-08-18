import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { SaaSActivityLog } from '../../types';
import { formatMytDate } from '../../utils/dateUtils';

interface SaasRecentActivityProps {
  activities: SaaSActivityLog[];
}

export const SaasRecentActivity: React.FC<SaasRecentActivityProps> = ({ activities = [] }) => {
  const [showAll, setShowAll] = useState(false);

  const displayedActivities = showAll ? activities : activities.slice(0, 5);

  return (
    <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-900" />
            <span>Recent Activity</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Latest subscription payments and onboarding events</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="py-3 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          No subscription activity recorded yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {displayedActivities.map((act) => {
            const formattedDate = formatMytDate(act.created_at, 'dd MMM');
            const desc = act.description || act.event_type.replace(/_/g, ' ');
            const amountText = act.amount !== undefined && act.amount > 0 ? ` · RM ${act.amount}` : '';

            return (
              <div key={act.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/60 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0" />
                  <div className="truncate text-slate-700">
                    <span className="text-slate-500 font-semibold">{formattedDate}</span>
                    <span className="text-slate-400 mx-1.5">—</span>
                    <strong className="text-slate-900 font-bold">{act.subscriber_name}</strong>
                    <span className="text-slate-600 ml-1.5">{desc}</span>
                  </div>
                </div>

                {amountText && (
                  <div className="font-bold text-slate-900 shrink-0 ml-3 text-xs">
                    RM {act.amount}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activities.length > 5 && (
        <div className="pt-2 mt-2 border-t border-slate-100 flex justify-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 py-1"
          >
            {showAll ? (
              <>
                <span>Show Latest 5 Only</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>View All Activity ({activities.length})</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
