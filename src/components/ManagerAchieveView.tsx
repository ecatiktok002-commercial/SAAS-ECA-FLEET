"use client";

import React, { useState } from 'react';
import type { Achievement, MeritConfig, KeywordRule } from '@/lib/types';

interface ManagerAchieveViewProps {
  achievements: Achievement[];
  setAddAchOpen: (v: boolean) => void;
  onRemoveAchievement: (id: string) => void;
  onEditAchievement: (ach: Achievement) => void;
}

export default function ManagerAchieveView({
  achievements,
  setAddAchOpen,
  onRemoveAchievement,
  onEditAchievement
}: ManagerAchieveViewProps) {
  return (
    <>
      <div className="flex justify-between items-end mb-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] mb-2 text-primary">Gamification Strategy</p>
          <h2 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Achieve Setting</h2>
          <p className="text-on-surface-variant mt-2 text-lg">Define milestones and rewards for the talent pool.</p>
        </div>
        <button onClick={() => setAddAchOpen(true)} className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-md hover:scale-[1.05] active:scale-95 transition-all mission-gradient">
          <span className="material-symbols-outlined">add</span> Create New Achievement
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map(ach => (
          <div key={ach.id} className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm hover:shadow-lg transition-all flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">{ach.icon}</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-surface-container px-2 py-1 rounded">
                Active
              </span>
            </div>
            <h4 className="text-lg font-bold text-on-surface mb-2">{ach.title}</h4>
            <p className="text-sm text-on-surface-variant mb-6 flex-1">{ach.desc}</p>
            
            <div className="pt-4 border-t border-outline-variant/10">
              <div className="flex items-center justify-between text-xs font-bold mb-3">
                <span className="text-on-surface-variant uppercase tracking-widest">Trigger Logic</span>
                <span className="text-primary">{ach.trigger || 'Manual'}</span>
              </div>
              {ach.taskRequired && (
                <div className="flex items-center justify-between text-xs font-bold mb-3">
                   <span className="text-on-surface-variant uppercase tracking-widest">Target Task</span>
                   <span className="text-on-surface">{ach.taskRequired}</span>
                </div>
              )}
               {ach.triggerValue && (
                <div className="flex items-center justify-between text-xs font-bold mb-3">
                   <span className="text-on-surface-variant uppercase tracking-widest">Req. Count</span>
                   <span className="text-on-surface">{ach.triggerValue}x</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => onEditAchievement(ach)}
                className="flex-1 bg-surface-container text-on-surface text-[10px] font-bold uppercase tracking-widest py-2 rounded-xl border border-outline-variant/10 hover:bg-white transition-all"
              >
                Edit
              </button>
              <button 
                onClick={() => onRemoveAchievement(ach.id)}
                className="flex-1 bg-surface-container text-error text-[10px] font-bold uppercase tracking-widest py-2 rounded-xl border border-error/10 hover:bg-error/5 transition-all"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function TierKeywordManager({ tierVal, config, setConfig }: { tierVal: number, config: MeritConfig, setConfig: (c: MeritConfig) => void }) {
  const [newKeyword, setNewKeyword] = useState('');
  const [newPoints, setNewPoints] = useState(0);

  const rules = (config.keywordRules || []).filter(r => r.tierVal === tierVal);

  const handleAdd = () => {
    if (!newKeyword.trim()) return;
    const rule: KeywordRule = {
      id: Math.random().toString(36).substr(2, 9),
      keyword: newKeyword.trim(),
      points: newPoints,
      tierVal
    };
    setConfig({ ...config, keywordRules: [...(config.keywordRules || []), rule] });
    setNewKeyword('');
    setNewPoints(0);
  };

  const handleRemove = (id: string) => {
    setConfig({ ...config, keywordRules: (config.keywordRules || []).filter(r => r.id !== id) });
  };

  return (
    <div className="mt-4 pt-4 border-t border-outline-variant/10">
      <div className="flex justify-between items-center mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Keyword Overrides (Fixed Pts)</p>
        <span className="text-[9px] opacity-40 font-bold">{rules.length} Active</span>
      </div>
      <div className="space-y-2 mb-4 max-h-[120px] overflow-y-auto pr-1">
        {rules.map(rule => (
          <div key={rule.id} className="flex items-center justify-between bg-surface-container-low p-2 rounded-xl border border-outline-variant/5 group">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-on-surface">"{rule.keyword}"</span>
              <span className="text-[9px] opacity-60 font-bold">{rule.points} Fixed Points</span>
            </div>
            <button onClick={() => handleRemove(rule.id)} className="text-error opacity-20 group-hover:opacity-100 transition-opacity p-1">
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input 
          placeholder="e.g. 'pass car'" 
          value={newKeyword}
          onChange={e => setNewKeyword(e.target.value)}
          className="flex-1 bg-white border border-outline-variant/20 rounded-xl p-2 text-xs font-bold focus:border-primary/30 outline-none transition-all"
        />
        <input 
          type="number"
          placeholder="Pts" 
          value={newPoints}
          onChange={e => setNewPoints(parseInt(e.target.value) || 0)}
          className="w-14 bg-white border border-outline-variant/20 rounded-xl p-2 text-xs font-bold text-center focus:border-primary/30 outline-none transition-all"
        />
        <button onClick={handleAdd} className="bg-primary text-white w-9 h-9 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm">
          <span className="material-symbols-outlined text-[20px]">add</span>
        </button>
      </div>
    </div>
  );
}
