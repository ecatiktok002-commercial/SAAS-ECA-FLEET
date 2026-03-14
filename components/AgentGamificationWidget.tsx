import React from 'react';
import { Trophy, Star, Target, Zap } from 'lucide-react';
import { MarketingEvent } from '../types';

interface AgentGamificationWidgetProps {
  salesThisMonth: number;
  commissionTierOverride: 'auto' | 'premium' | 'prestige' | 'privilege';
  events: MarketingEvent[];
}

export const AgentGamificationWidget: React.FC<AgentGamificationWidgetProps> = ({
  salesThisMonth,
  commissionTierOverride,
  events
}) => {
  // 1. Define the Tier Logic
  const tiers = {
    premium: { name: 'Premium Base (20%)', min: 0, max: 5000, color: 'bg-slate-700', text: 'text-slate-700' },
    prestige: { name: 'Prestige Base (25%)', min: 5000, max: 8000, color: 'bg-blue-500', text: 'text-blue-500' },
    privilege: { name: 'Privilege Base (30%)', min: 8000, max: null, color: 'bg-yellow-500', text: 'text-yellow-600' }
  };

  // 2. Calculate Current State
  let activeTier, nextTier, progressPercent, remainingToNext;

  if (salesThisMonth < tiers.prestige.min) {
    activeTier = tiers.premium;
    nextTier = tiers.prestige;
    remainingToNext = tiers.premium.max - salesThisMonth;
    // Calculate percentage filled within this specific tier bracket
    progressPercent = (salesThisMonth / tiers.premium.max) * 100;
  } 
  else if (salesThisMonth < tiers.privilege.min) {
    activeTier = tiers.prestige;
    nextTier = tiers.privilege;
    remainingToNext = tiers.prestige.max - salesThisMonth;
    // Calculate percentage filled within the 5k - 8k bracket
    const tierRange = tiers.prestige.max - tiers.prestige.min;
    const salesInTier = salesThisMonth - tiers.prestige.min;
    progressPercent = (salesInTier / tierRange) * 100;
  } 
  else {
    activeTier = tiers.privilege;
    nextTier = null;
    remainingToNext = 0;
    progressPercent = 100;
  }

  // Apply override if not auto
  if (commissionTierOverride !== 'auto') {
    activeTier = { ...tiers[commissionTierOverride], name: `${tiers[commissionTierOverride].name} (Locked)` };
  }

  // Helper to format currency nicely
  const formatRM = (amount: number) => `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const activeEvents = events.filter(e => new Date(e.start_date) <= new Date() && new Date(e.end_date) >= new Date());

  return (
    <div className="space-y-6 mb-8">
      {/* Sales Progress Widget */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 w-full relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Trophy className="w-32 h-32" />
        </div>
        
        <div className="relative z-10">
          {/* Header Section */}
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Current Sales</p>
              <h2 className="text-3xl font-bold text-slate-900">{formatRM(salesThisMonth)}</h2>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Active Tier</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold bg-slate-50 ${activeTier.text}`}>
                {activeTier.name}
              </span>
            </div>
          </div>

          {/* The Progress Bar */}
          <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden my-4">
            <div 
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${activeTier.color}`}
              style={{ width: `${Math.max(progressPercent, 2)}%` }} // Minimum 2% so they always see a little sliver of progress
            ></div>
          </div>

          {/* Gamification Messaging */}
          <div className="mt-4 text-center">
            {nextTier ? (
              <p className="text-sm text-slate-500 font-medium">
                Just <span className={`font-bold ${nextTier.text}`}>{formatRM(remainingToNext)}</span> more to unlock <span className="font-bold text-slate-900">{nextTier.name}</span>!
              </p>
            ) : (
              <p className="text-sm font-bold text-yellow-600 animate-pulse">
                🏆 Maximum Commission Tier Reached! Outstanding Work!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Active Promotions */}
      {activeEvents.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" /> Active Promotions (Pitch These Today!)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeEvents.map(event => (
              <div key={event.id} className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-5 text-white shadow-md relative overflow-hidden group hover:shadow-lg transition-all">
                <div className="absolute -right-4 -top-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
                  <Target className="w-24 h-24" />
                </div>
                <div className="relative z-10">
                  <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider mb-3 inline-block">Sudden Event</span>
                  <h4 className="font-bold text-xl mb-1">{event.name}</h4>
                  <p className="text-indigo-100 text-sm mb-4">
                    {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                  </p>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                    <p className="text-xs text-indigo-200 uppercase font-bold tracking-wider mb-1">Target Goal</p>
                    <p className="text-2xl font-black">RM {event.target_goal.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
