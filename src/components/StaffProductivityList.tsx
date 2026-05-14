"use client";

import React from 'react';
import type { TeamMember, Task, ActivityLog } from '@/lib/types';

interface StaffProductivityListProps {
  team: TeamMember[];
  tasks: Task[];
  activityLog: ActivityLog[];
  viewedIds: string[];
  markViewed: (id: string) => void;
  onMarkTaskViewed: (id: string) => void;
  isManager?: boolean;
  onDeleteStaff: (id: string, name: string) => void;
}

export default function StaffProductivityList({
  team,
  tasks,
  activityLog,
  viewedIds,
  markViewed,
  onMarkTaskViewed,
  isManager,
  onDeleteStaff
}: StaffProductivityListProps) {
  return (
    <div className="space-y-3">
      {team.length === 0 && (
        <div className="text-center py-10 rounded-2xl border-2 border-dashed border-outline-variant text-on-surface-variant">
          <span className="material-symbols-outlined text-[40px] mb-2 block opacity-20">group_off</span>
          <p className="font-bold text-sm">No staff members yet</p>
          <p className="text-xs mt-1 opacity-60">Add staff in Organization Settings to begin monitoring.</p>
        </div>
      )}
      {team.map(member => {
        const hasUnreadActivity = activityLog.some(a => (a.staffId === member.id || a.staffName === member.name) && a.managerViewed === false && !viewedIds.includes(a.id));
        const hasUnreadTask = tasks.some(t => t.ownerId === member.id && t.status === 'running' && t.managerViewed === false);
        const showRedDot = hasUnreadActivity || hasUnreadTask;
        const isIdle = !member.currentTask || member.currentTask === 'Awaiting Task';

        return (
          <div
            key={member.id}
            onClick={() => { if (showRedDot) markViewed(member.id); }}
            className={`flex items-center justify-between p-4 rounded-2xl transition-all shadow-sm border cursor-pointer ${showRedDot ? 'bg-error/5 border-error/30 ring-1 ring-error/10' :
                member.monthPoints > 0 ? 'bg-primary/5 border-primary/20' : 'bg-surface-container-lowest border-outline-variant/10'
              }`}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <img className={`w-12 h-12 rounded-full object-cover ${member.monthPoints > 0 ? 'shadow-sm ring-2 ring-primary/30 ring-offset-2' : 'grayscale opacity-80'}`} src={member.imgUrl} alt={member.name} />
                {showRedDot && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-error rounded-full border-2 border-white animate-pulse shadow-sm shadow-error/50"></span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-lg text-on-surface">{member.name}</p>
                  {member.monthPoints > 0 && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-primary" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                  )}
                  {isIdle && (
                    <span className="bg-error/10 px-1.5 py-0.5 rounded text-[8px] uppercase font-black tracking-widest text-error">Idle</span>
                  )}
                </div>
                <p className={`text-[10px] uppercase font-bold tracking-widest mt-0.5 ${member.monthPoints > 0 ? 'text-primary' : 'text-slate-400'}`}>
                  Dept: {member.department || 'General'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right pl-4 border-l border-outline-variant/20">
                <p className="font-extrabold font-headline text-xl text-on-surface">{member.monthPoints.toLocaleString()}</p>
                <p className={`text-[8px] font-bold uppercase tracking-widest ${member.monthPoints > 0 ? 'text-primary' : 'text-slate-400'}`}>PTS</p>
              </div>
              {isManager && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteStaff(member.id, member.name); }} 
                  className="p-2 text-on-surface-variant hover:text-error transition-colors" 
                  title="Remove Staff"
                >
                  <span className="material-symbols-outlined text-[18px]">person_remove</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
