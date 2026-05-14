"use client";

import React from 'react';
import type { Task } from '@/lib/types';

interface SkillGapVisualizerProps {
  completedTasks: Task[];
}

export default function SkillGapVisualizer({ completedTasks }: SkillGapVisualizerProps) {
  return (
    <div className="mb-6 p-6 rounded-[2rem] bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-bold font-headline text-on-surface">Skill Gap Heatmap</h3>
        <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mt-1">Efficiency across Complexity Tiers</p>
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(tier => {
          const tierTasks = completedTasks.filter(t => (t as any).tierVal === tier);
          const avg = tierTasks.length > 0
            ? tierTasks.reduce((s, t) => s + (t.efficiencyScore || 0), 0) / tierTasks.length
            : 0;
          const effPercent = Math.round(avg * 100);
          const tierLabel = tier === 1 ? 'Routine' : tier === 2 ? 'Standard' : tier === 3 ? 'Complex' : tier === 4 ? 'Critical' : 'Extraordinary';
          const colorClass = effPercent >= 85 ? 'bg-emerald-500' : effPercent >= 60 ? 'bg-amber-400' : 'bg-red-400';

          return (
            <div key={tier} className="flex items-center gap-4">
              <div className="w-24 shrink-0">
                <p className="text-[10px] font-black uppercase text-on-surface-variant">{tierLabel}</p>
                <p className="text-[9px] font-bold text-on-surface-variant/40">Tier {tier}</p>
              </div>
              <div className="flex-1 h-3 bg-outline-variant/10 rounded-full overflow-hidden flex">
                <div className={`h-full transition-all duration-1000 ${colorClass}`} style={{ width: `${effPercent}%` }} />
              </div>
              <div className="w-12 text-right">
                <p className="text-sm font-black text-on-surface">{effPercent}%</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-[10px] text-on-surface-variant italic opacity-60">
        Tip: If Tier 3-5 efficiency is consistently low, consider re-training or shifting creative resources.
      </p>
    </div>
  );
}
