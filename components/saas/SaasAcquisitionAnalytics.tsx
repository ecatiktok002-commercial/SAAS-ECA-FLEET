import React, { useState } from 'react';
import { Target, ChevronDown, ChevronUp } from 'lucide-react';
import { Company } from '../../types';
import { calculateSubscriberMRR, DEFAULT_ACQUISITION_SOURCES, getSubscriberEffectiveStatus, isCommercialSubscriber } from '../../utils/saasUtils';

interface SaasAcquisitionAnalyticsProps {
  subscribers: Company[];
  onSelectChannel?: (channel: string) => void;
  selectedChannel?: string;
}

export const SaasAcquisitionAnalytics: React.FC<SaasAcquisitionAnalyticsProps> = ({
  subscribers,
  onSelectChannel,
  selectedChannel
}) => {
  const [showAllChannels, setShowAllChannels] = useState(false);

  // Map channels to leads, paid, and new MRR
  const channelStatsMap = new Map<string, { leads: number; paid: number; mrr: number }>();

  DEFAULT_ACQUISITION_SOURCES.forEach(source => {
    channelStatsMap.set(source, { leads: 0, paid: 0, mrr: 0 });
  });

  subscribers.forEach(sub => {
    const rawSource = sub.lead_source || 'Direct Sales';
    const source = DEFAULT_ACQUISITION_SOURCES.find(
      s => s.toLowerCase() === rawSource.toLowerCase()
    ) || rawSource;

    const existing = channelStatsMap.get(source) || { leads: 0, paid: 0, mrr: 0 };
    
    // Each subscriber record counts as a lead/engagement in that channel
    existing.leads += 1;

    const isCommercial = isCommercialSubscriber(sub);
    const status = getSubscriberEffectiveStatus(sub);
    const isPaying = isCommercial && (status === 'active' || status === 'cancel_at_period_end' || status === 'grace_period') && !sub.is_trial;

    if (isPaying) {
      existing.paid += 1;
      existing.mrr += calculateSubscriberMRR(sub);
    }

    channelStatsMap.set(source, existing);
  });

  const allChannelsList = Array.from(channelStatsMap.entries()).map(([source, stats]) => {
    return {
      channel: source,
      leads: Math.max(stats.leads, stats.paid),
      customers: stats.paid,
      newMrr: stats.mrr
    };
  }).sort((a, b) => b.newMrr - a.newMrr || b.customers - a.customers || b.leads - a.leads);

  // Filter only channels that have activity (leads > 0, customers > 0, or newMrr > 0)
  const activeChannels = allChannelsList.filter(c => c.leads > 0 || c.customers > 0 || c.newMrr > 0);
  
  // Channels to display based on toggle
  const displayedChannels = showAllChannels 
    ? allChannelsList 
    : (activeChannels.length > 0 ? activeChannels : allChannelsList.slice(0, 3));

  const totalAttributedMrr = allChannelsList.reduce((sum, c) => sum + c.newMrr, 0);

  return (
    <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Target className="w-4 h-4 text-slate-900" />
              <span>Where Customers Came From</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Acquisition sources producing active customers and revenue</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-medium">New MRR</span>
            <span className="text-xs font-black text-emerald-700">RM {totalAttributedMrr.toLocaleString()}</span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-y border-slate-100 text-[10px]">
                <th className="py-2 px-3">Channel</th>
                <th className="py-2 px-3 text-center">Leads</th>
                <th className="py-2 px-3 text-center">Customers</th>
                <th className="py-2 px-3 text-right">New MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {displayedChannels.map((ch) => {
                const isSelected = selectedChannel === ch.channel;
                return (
                  <tr 
                    key={ch.channel} 
                    onClick={() => onSelectChannel?.(isSelected ? 'all' : ch.channel)}
                    className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/60 font-bold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>{ch.channel}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                      {ch.leads}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      {ch.customers}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      RM {ch.newMrr.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {allChannelsList.length > activeChannels.length && (
        <div className="pt-2 mt-2 border-t border-slate-100 flex justify-center">
          <button
            onClick={() => setShowAllChannels(!showAllChannels)}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 py-1"
          >
            {showAllChannels ? (
              <>
                <span>Show Active Channels Only</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>View All Channels ({allChannelsList.length})</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
