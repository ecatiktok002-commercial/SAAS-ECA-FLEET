import React, { useEffect, useState } from 'react';
import { Trophy, Star, Target, Zap, Clock, CheckCircle2 } from 'lucide-react';
import { MarketingEvent, Booking } from '../types';
import { getNowMYT, utcToMyt, formatInMYT } from '../utils/dateUtils';
import confetti from 'canvas-confetti';

interface AgentGamificationWidgetProps {
  salesThisMonth: number;
  commissionTierOverride: 'auto' | 'premium' | 'prestige' | 'privilege';
  events: MarketingEvent[];
  bookings: Booking[];
  userId: string;
}

export const AgentGamificationWidget: React.FC<AgentGamificationWidgetProps> = ({
  salesThisMonth,
  commissionTierOverride,
  events,
  bookings,
  userId
}) => {
  const [celebratedEvents, setCelebratedEvents] = useState<string[]>([]);

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
    progressPercent = (salesThisMonth / tiers.premium.max) * 100;
  } 
  else if (salesThisMonth < tiers.privilege.min) {
    activeTier = tiers.prestige;
    nextTier = tiers.privilege;
    remainingToNext = tiers.prestige.max - salesThisMonth;
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

  if (commissionTierOverride !== 'auto') {
    activeTier = { ...tiers[commissionTierOverride], name: `${tiers[commissionTierOverride].name} (Locked)` };
    nextTier = null;
    remainingToNext = 0;
    progressPercent = 100;
  }

  const isMaxTier = activeTier.name.includes('Privilege');

  const formatRM = (amount: number) => `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const activeEvents = React.useMemo(() => {
    const nowStr = formatInMYT(getNowMYT(), 'yyyy-MM-dd');
    return events.filter(e => {
      const eStart = e.start_date.substring(0, 10);
      const eEnd = e.end_date.substring(0, 10);
      return eStart <= nowStr && eEnd >= nowStr;
    });
  }, [events]);

  // Calculate event progress
  const eventProgress = React.useMemo(() => {
    return activeEvents.map(event => {
      const eventBookings = bookings.filter(b => {
        const bookingDate = formatInMYT(b.start_date ? new Date(b.start_date).getTime() : getNowMYT(), 'yyyy-MM-dd');
        return b.agent_id === userId && 
               b.status === 'completed' &&
               bookingDate >= event.start_date.substring(0, 10) && 
               bookingDate <= event.end_date.substring(0, 10);
      });

      let current = 0;
      if (event.goal_type === 'Total Orders') {
        current = eventBookings.length;
      } else {
        current = eventBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
      }

      const percent = Math.min((current / event.target_goal) * 100, 100);
      const isCompleted = current >= event.target_goal;

      // Time left calculation
      const now = getNowMYT();
      const end = utcToMyt(event.end_date);
      const diffMs = end.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const timeLeft = diffDays > 0 ? `${diffDays}d ${diffHrs}h` : `${diffHrs}h`;

      return { ...event, current, percent, isCompleted, timeLeft };
    });
  }, [activeEvents, bookings, userId]);

  // Trigger confetti for newly completed events
  useEffect(() => {
    eventProgress.forEach(event => {
      if (event.isCompleted && !celebratedEvents.includes(event.id)) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']
        });
        setCelebratedEvents(prev => [...prev, event.id]);
      }
    });
  }, [eventProgress, celebratedEvents]);

  return (
    <div className="space-y-6">
      {/* Sales Progress Widget */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Trophy className="w-32 h-32 text-slate-800" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Commission Tier Progress</p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">{formatRM(salesThisMonth)}</h2>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active Tier</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide bg-slate-100 ${activeTier.text} border border-slate-200/80`}>
                {activeTier.name}
              </span>
            </div>
          </div>

          <div className="relative w-full h-3.5 bg-slate-100 rounded-full overflow-hidden my-3">
            <div 
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${isMaxTier ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 animate-shimmer bg-[length:200%_100%]' : activeTier.color}`}
              style={{ width: `${isMaxTier ? 100 : Math.max(progressPercent, 2)}%` }}
            ></div>
          </div>

          <div className="mt-3 text-center">
            {isMaxTier ? (
              <p className="text-xs sm:text-sm font-bold text-amber-600 animate-pulse">
                🔥 Elite Status Unlocked. You've reached the top tier! Keep setting the standard for the team.
              </p>
            ) : nextTier ? (
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Just <span className={`font-bold ${nextTier.text}`}>{formatRM(remainingToNext)}</span> more to unlock <span className="font-bold text-slate-900">{nextTier.name}</span>!
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Dynamic Goal Progress Widget */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" /> Active Bonus Events
        </h3>
        
        {eventProgress.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {eventProgress.map(event => (
              <div 
                key={event.id} 
                className={`bg-white p-5 rounded-2xl shadow-sm border transition-all relative overflow-hidden ${
                  event.isCompleted ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200'
                }`}
              >
                {event.isCompleted && (
                  <div className="absolute -right-6 -top-6 bg-emerald-500 text-white p-8 rounded-full shadow-lg transform rotate-12">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                )}

                <div className="flex justify-between items-start mb-3.5">
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      🔥 {event.name}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5" /> Time Left: {event.timeLeft}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reward</span>
                    <p className="text-lg font-black text-emerald-600">RM {event.reward_amount}</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between items-end text-xs">
                    <span className="font-bold text-slate-600">
                      {event.goal_type === 'Total Orders' 
                        ? `${event.current} / ${event.target_goal} Orders` 
                        : `${formatRM(event.current)} / ${formatRM(event.target_goal)}`}
                    </span>
                    <span className={`font-black ${event.isCompleted ? 'text-emerald-600' : 'text-indigo-600'}`}>
                      {Math.round(event.percent)}%
                    </span>
                  </div>
                  
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden relative">
                    <div 
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${
                        event.isCompleted ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                      }`}
                      style={{ width: `${Math.max(event.percent, 2)}%` }}
                    ></div>
                  </div>

                  <div className="pt-1.5">
                    {event.isCompleted ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-black animate-bounce">
                        <Star className="w-4 h-4 fill-emerald-600" />
                        BONUS UNLOCKED!
                        <Star className="w-4 h-4 fill-emerald-600" />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 text-center font-medium">
                        Just <span className="text-indigo-600 font-bold">
                          {event.goal_type === 'Total Orders' 
                            ? `${event.target_goal - event.current} more orders` 
                            : formatRM(event.target_goal - event.current)}
                        </span> to unlock your RM{event.reward_amount} Bonus!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center">
            <Zap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-xs font-medium">No Active Bonus Events. Stay tuned!</p>
          </div>
        )}
      </div>
    </div>
  );
};
