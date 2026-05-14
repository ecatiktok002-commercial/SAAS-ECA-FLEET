import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { TaskDefinition, MeritConfig, KeywordRule } from '@/lib/types';

interface ManagerCalibrationViewProps {
  taskDefinitions: TaskDefinition[];
  setTaskDefinitions: React.Dispatch<React.SetStateAction<TaskDefinition[]>>;
  meritConfig: MeritConfig;
  setMeritConfig: (c: MeritConfig) => void;
}

export default function ManagerCalibrationView({ taskDefinitions, setTaskDefinitions, meritConfig, setMeritConfig }: ManagerCalibrationViewProps) {
  const [isEditingGlobalTiers, setIsEditingGlobalTiers] = useState(false);
  const [tempMeritConfig, setTempMeritConfig] = useState<MeritConfig>(meritConfig);
  const dynamicTiers = [
    { name: meritConfig.tier1Name, val: meritConfig.multiplierTier1 },
    { name: meritConfig.tier2Name, val: meritConfig.multiplierTier2 },
    { name: meritConfig.tier3Name, val: meritConfig.multiplierTier3 },
    { name: meritConfig.tier4Name, val: meritConfig.multiplierTier4 },
    { name: meritConfig.tier5Name, val: meritConfig.multiplierTier5 }
  ];
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinutes, setEditMinutes] = useState<number>(0);
  const [editMultiplier, setEditMultiplier] = useState<number>(1.2);
  const [staffInputs, setStaffInputs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentStats, setRecentStats] = useState<Record<string, { avg: number; count: number }>>({});
  const [calibrationCounts, setCalibrationCounts] = useState<Record<string, number>>({});
  const [discoveredTasks, setDiscoveredTasks] = useState<{title: string, avgMin: number, count: number}[]>([]);

  useEffect(() => {
    fetchCalibrationStats();
    fetchStaffInputs();
    fetchCalibrationCounts();
    fetchDiscoveredTasks();
  }, []);

  const fetchCalibrationCounts = async () => {
    const { data, error } = await supabase
      .from('task_calibration')
      .select('task_title');
    
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((d: any) => {
        counts[d.task_title] = (counts[d.task_title] || 0) + 1;
      });
      setCalibrationCounts(counts);
    }
  };

  const fetchStaffInputs = async () => {
    const { data, error } = await supabase
      .from('task_calibration')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setStaffInputs(data);
  };

  const fetchCalibrationStats = async () => {
    // Fetch average actual durations from completed tasks to help manager calibrate
    const { data, error } = await supabase
      .from('tasks')
      .select('title, actual_duration_minutes')
      .not('actual_duration_minutes', 'is', null)
      .eq('status', 'completed');

    if (data) {
      const stats: Record<string, { sum: number; count: number }> = {};
      data.forEach((t: any) => {
        if (!stats[t.title]) stats[t.title] = { sum: 0, count: 0 };
        stats[t.title].sum += t.actual_duration_minutes;
        stats[t.title].count += 1;
      });

      const finalStats: Record<string, { avg: number; count: number }> = {};
      Object.keys(stats).forEach(title => {
        finalStats[title] = {
          avg: Math.round(stats[title].sum / stats[title].count),
          count: stats[title].count
        };
      });
      setRecentStats(finalStats);
    }
  };

  const fetchDiscoveredTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('title, actual_duration_minutes')
      .eq('status', 'completed');

    if (data) {
      const groups: Record<string, { sum: number, count: number }> = {};
      data.forEach(t => {
        if (!groups[t.title]) groups[t.title] = { sum: 0, count: 0 };
        groups[t.title].sum += (t.actual_duration_minutes || 0);
        groups[t.title].count += 1;
      });

      const list = Object.keys(groups).map(title => ({
        title,
        avgMin: Math.round(groups[title].sum / groups[title].count),
        count: groups[title].count
      })).sort((a, b) => b.count - a.count);

      setDiscoveredTasks(list);
    }
  };

  const handleToggleCalibration = async (def: TaskDefinition) => {
    const newState = !def.isCalibrated;
    const { error } = await supabase
      .from('task_definitions')
      .update({ is_calibrated: newState })
      .eq('id', def.id);

    if (!error) {
      setTaskDefinitions(prev => prev.map(d => d.id === def.id ? { ...d, isCalibrated: newState } : d));
    } else {
      alert('Error updating calibration status: ' + error.message);
    }
  };

  const handleSaveMinutes = async (id: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('task_definitions')
      .update({ 
        golden_rule_minutes: editMinutes,
        tier_multiplier: editMultiplier
      })
      .eq('id', id);

    if (!error) {
      setTaskDefinitions(prev => prev.map(d => d.id === id ? { ...d, goldenRuleMinutes: editMinutes, tierMultiplier: editMultiplier } : d));
      setEditingId(null);
    } else {
      alert('Error saving configuration: ' + error.message);
    }
    setLoading(false);
  };

  const filteredInputs = staffInputs.filter(input => 
    input.task_title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (input.task_note && input.task_note.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handlePromoteToKeyword = async (input: any) => {
    const keyword = input.task_title;
    const points = input.points_awarded;
    const tierVal = input.tier_val || 1.0;

    // Check if already exists
    if (meritConfig.keywordRules.some(r => r.keyword.toLowerCase() === keyword.toLowerCase())) {
      return alert('This keyword already exists in the Point Ledger.');
    }

    const newRule: KeywordRule = {
      id: crypto.randomUUID(),
      keyword,
      points,
      tierVal
    };

    const newConfig = {
      ...meritConfig,
      keywordRules: [...meritConfig.keywordRules, newRule]
    };

    // Save to DB
    const { error } = await supabase
      .from('system_configs')
      .upsert({ key: 'merit_config', value: newConfig }, { onConflict: 'key' });

    if (!error) {
      setMeritConfig(newConfig);
      alert(`Promoted "${keyword}" to a Keyword Rule with ${points} fixed points.`);
    } else {
      alert('Error promoting to keyword: ' + error.message);
    }
  };

  const handleSaveGlobalTiers = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('system_configs')
      .upsert({ key: 'merit_config', value: tempMeritConfig }, { onConflict: 'key' });

    if (!error) {
      setMeritConfig(tempMeritConfig);
      setIsEditingGlobalTiers(false);
      alert('Global Merit Configuration saved successfully.');
    } else {
      alert('Error saving global configuration: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="pt-10 px-6 max-w-6xl mx-auto pb-32 animate-in fade-in duration-300">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] mb-2 text-primary">Antigravity Core</p>
          <h2 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Task Calibration</h2>
          <p className="text-on-surface-variant mt-2 text-lg">Define standards or review all staff inputs to justify point distribution.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => {
               setTempMeritConfig(meritConfig);
               setIsEditingGlobalTiers(!isEditingGlobalTiers);
             }} 
             className={`px-4 py-2 rounded-2xl font-bold flex items-center gap-2 transition-all border ${
               isEditingGlobalTiers 
                 ? 'bg-primary text-white border-primary shadow-lg' 
                 : 'bg-surface-container text-on-surface-variant hover:text-primary border-outline-variant/10'
             }`}
           >
             <span className="material-symbols-outlined text-[20px]">settings_suggest</span>
             {isEditingGlobalTiers ? 'Close Config' : 'Global Tiers'}
           </button>
           <button onClick={fetchStaffInputs} className="p-3 bg-surface-container rounded-2xl text-on-surface-variant hover:text-primary transition-colors border border-outline-variant/10">
             <span className="material-symbols-outlined">refresh</span>
           </button>
        </div>
      </div>

      {isEditingGlobalTiers && (
        <div className="mb-10 p-8 rounded-[40px] bg-white border border-primary/20 shadow-2xl animate-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-extrabold text-on-surface">Global Efficiency Tiers</h3>
              <p className="text-on-surface-variant text-sm mt-1">Customize the nomenclature and multipliers for the entire organization.</p>
            </div>
            <div className="flex gap-3">
               <button 
                 onClick={handleSaveGlobalTiers}
                 disabled={loading}
                 className="px-6 py-2.5 bg-primary text-white rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
               >
                 {loading ? <span className="animate-spin material-symbols-outlined">sync</span> : <span className="material-symbols-outlined">save</span>}
                 Save Changes
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((tier) => (
              <div key={tier} className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">Tier {tier}</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 block">Display Name</label>
                    <input 
                      type="text"
                      className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-primary/50 transition-all"
                      value={(tempMeritConfig as any)[`tier${tier}Name`]}
                      onChange={(e) => setTempMeritConfig({...tempMeritConfig, [`tier${tier}Name`]: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 block">Multiplier</label>
                    <div className="relative">
                      <input 
                        type="number"
                        step="0.1"
                        className="w-full bg-white border border-outline-variant/20 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-primary/50 transition-all"
                        value={(tempMeritConfig as any)[`multiplierTier${tier}`]}
                        onChange={(e) => setTempMeritConfig({...tempMeritConfig, [`multiplierTier${tier}`]: parseFloat(e.target.value) || 0})}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-on-surface-variant opacity-40">x</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: Calibration Standards */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[32px] border border-outline-variant/10 shadow-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant/10 bg-surface-container-lowest flex justify-between items-center">
               <h3 className="font-bold text-on-surface flex items-center gap-2">
                 <span className="material-symbols-outlined text-primary">analytics</span>
                 Standardized Task Definitions
               </h3>
               <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{taskDefinitions.length} Defined</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/10">
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Definition</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-center">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-center">Golden Rule</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Observations</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {taskDefinitions.map((def) => (
                    <tr key={def.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-5">
                        <p className="font-bold text-on-surface">{def.title}</p>
                        {editingId === def.id ? (
                          <select 
                            className="mt-1 text-[10px] bg-surface-container rounded px-1 py-0.5 font-black uppercase tracking-widest text-primary border-none outline-none cursor-pointer"
                            value={editMultiplier}
                            onChange={(e) => setEditMultiplier(parseFloat(e.target.value))}
                          >
                            {dynamicTiers.map(t => <option key={t.val} value={t.val}>{t.name} ({t.val}x)</option>)}
                          </select>
                        ) : (
                          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest opacity-60">
                            {dynamicTiers.find(t => t.val === def.tierMultiplier)?.name || 'Custom'} ({def.tierMultiplier}x)
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <button 
                            onClick={() => handleToggleCalibration(def)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                              def.isCalibrated 
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[12px]">
                              {def.isCalibrated ? 'verified' : 'pending_actions'}
                            </span>
                            {def.isCalibrated ? 'Standard' : 'Learning'}
                          </button>
                          {!def.isCalibrated && (calibrationCounts[def.title] || 0) >= 15 && (
                            <span className="flex items-center gap-1 text-[8px] font-black text-primary animate-pulse uppercase tracking-widest">
                              <span className="material-symbols-outlined text-[10px]">notification_important</span>
                              Ready to Lock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {editingId === def.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <input 
                              type="number" 
                              className="w-16 bg-surface-container rounded-lg px-2 py-1 text-sm font-bold border border-primary/20 outline-none"
                              value={editMinutes}
                              onChange={(e) => setEditMinutes(parseInt(e.target.value) || 0)}
                              autoFocus
                            />
                            <button onClick={() => handleSaveMinutes(def.id)} className="text-primary hover:scale-110 transition-transform">
                              <span className="material-symbols-outlined text-[18px]">save_as</span>
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="cursor-pointer hover:text-primary transition-colors flex items-center justify-center gap-1"
                            onClick={() => { setEditingId(def.id); setEditMinutes(def.goldenRuleMinutes || 0); setEditMultiplier(def.tierMultiplier); }}
                          >
                            <span className="text-sm font-black">{def.goldenRuleMinutes || '--'}m</span>
                            <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100">edit</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {recentStats[def.title] ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-on-surface-variant">{recentStats[def.title].avg}m avg</span>
                            <span className="text-[8px] uppercase font-black tracking-widest text-on-surface-variant opacity-40">{recentStats[def.title].count} logs</span>
                          </div>
                        ) : (
                          <span className="text-[10px] italic text-on-surface-variant opacity-30">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                         <button 
                          onClick={() => { setEditingId(def.id); setEditMinutes(def.goldenRuleMinutes || 0); setEditMultiplier(def.tierMultiplier); }}
                          className="text-on-surface-variant hover:text-primary transition-colors"
                         >
                           <span className="material-symbols-outlined text-[18px]">tune</span>
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Card */}
          <div className="p-8 rounded-[32px] bg-surface-container-lowest border border-outline-variant/10 flex items-start gap-6 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined">shield_person</span>
            </div>
            <div>
              <h4 className="font-bold text-on-surface mb-2 tracking-tight">Justifying Tiers & Rewards</h4>
              <div className="space-y-4 text-sm text-on-surface-variant leading-relaxed">
                <p>
                  <strong className="text-primary">Tier 1-2 (Routine):</strong> High-frequency, low-complexity tasks. Best for &quot;Fixed Point Overrides&quot; (Keyword Rules) to prevent point inflation.
                </p>
                <p>
                  <strong className="text-primary">Tier 3-5 (Specialized):</strong> Critical operations requiring expertise. Use <strong>Golden Rules</strong> to reward efficiency and speed without compromising quality.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-outline-variant/10 shadow-xl overflow-hidden mt-8">
            <div className="px-6 py-5 border-b border-outline-variant/10 bg-surface-container-lowest flex justify-between items-center">
               <h3 className="font-bold text-on-surface flex items-center gap-2">
                 <span className="material-symbols-outlined text-primary">explore</span>
                 Discovered Tasks (Staff Activity Pool)
               </h3>
               <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Historical Data</span>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
               {discoveredTasks.filter(dt => !taskDefinitions.some(td => td.title === dt.title)).length === 0 ? (
                 <div className="col-span-full py-10 text-center opacity-40">
                   <p className="text-sm font-bold">All active task types are already standardized.</p>
                 </div>
               ) : (
                 discoveredTasks.filter(dt => !taskDefinitions.some(td => td.title === dt.title)).map((dt, idx) => (
                   <div key={idx} className="p-4 rounded-2xl bg-surface-container border border-outline-variant/5 flex items-center justify-between group">
                     <div>
                       <p className="font-bold text-on-surface text-sm">{dt.title}</p>
                       <p className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant opacity-60">
                         {dt.count} Logs · Avg {dt.avgMin}m
                       </p>
                     </div>
                     <button 
                       onClick={() => {
                         const mins = prompt(`Set Standard Golden Rule (Minutes) for "${dt.title}":`, dt.avgMin.toString());
                         if (mins) {
                            const newDef: any = {
                              id: crypto.randomUUID(),
                              title: dt.title,
                              golden_rule_minutes: parseInt(mins),
                              tier_multiplier: 1.3,
                              is_calibrated: true
                            };
                            supabase.from('task_definitions').insert([newDef]).then(({error}) => {
                              if(!error) {
                                setTaskDefinitions(prev => [...prev, {
                                  id: newDef.id,
                                  title: newDef.title,
                                  goldenRuleMinutes: newDef.golden_rule_minutes,
                                  tierMultiplier: newDef.tier_multiplier,
                                  isCalibrated: true
                                }]);
                                alert(`"${dt.title}" is now a Standard Task.`);
                              }
                            });
                         }
                       }}
                       className="opacity-0 group-hover:opacity-100 transition-all bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white"
                     >
                       Standardize
                     </button>
                   </div>
                 ))
               )}
            </div>
          </div>
        </div>

        {/* RIGHT: Staff Input Review Pool */}
        <div className="space-y-6">
          <div className="bg-white rounded-[32px] border border-outline-variant/10 shadow-xl overflow-hidden flex flex-col h-[700px]">
             <div className="px-6 py-5 border-b border-outline-variant/10 bg-surface-container-lowest">
                <h3 className="font-bold text-on-surface flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary">history_edu</span>
                  Staff Review Pool
                </h3>
                <div className="relative">
                   <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant opacity-40">search</span>
                   <input 
                    type="text" 
                    placeholder="Search keywords (e.g. pass car)..." 
                    className="w-full bg-surface-container rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold border border-outline-variant/5 outline-none focus:border-primary/30 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredInputs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-40 grayscale">
                    <span className="material-symbols-outlined text-[48px]">fact_check</span>
                    <p className="text-xs font-bold mt-2 uppercase tracking-widest">No inputs to review</p>
                  </div>
                ) : (
                  filteredInputs.map((input) => (
                    <div key={input.id} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/5 hover:border-primary/20 transition-all group relative">
                       <button 
                        onClick={() => handlePromoteToKeyword(input)}
                        className="absolute right-4 top-10 p-1.5 bg-primary/10 text-primary rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white"
                        title="Promote to Keyword Rule"
                       >
                         <span className="material-symbols-outlined text-[16px]">grade</span>
                       </button>
                       <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{input.task_title}</p>
                          <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-40">
                            {new Date(input.created_at).toLocaleDateString()}
                          </span>
                       </div>
                       {input.task_note && (
                         <p className="text-[10px] text-on-surface-variant italic mb-3 line-clamp-2">&quot;{input.task_note}&quot;</p>
                       )}
                       <div className="flex items-center justify-between pt-3 border-t border-outline-variant/5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                               <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black uppercase">
                                 {input.profiles?.full_name?.[0] || 'S'}
                               </div>
                               <span className="text-[10px] font-bold text-on-surface-variant truncate max-w-[80px]">
                                 {input.profiles?.full_name || 'Staff'}
                               </span>
                            </div>
                            {(input.staff_role || input.department) && (
                              <div className="flex gap-1 mt-1">
                                {input.staff_role && <span className="text-[8px] bg-slate-100 text-slate-500 px-1 rounded uppercase font-bold">{input.staff_role}</span>}
                                {input.department && <span className="text-[8px] bg-slate-100 text-slate-500 px-1 rounded uppercase font-bold">{input.department}</span>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg">
                               {input.actual_duration_minutes}m
                             </span>
                             <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                               +{input.points_awarded} pts
                             </span>
                          </div>
                       </div>
                    </div>
                  ))
                )}
             </div>
             
             <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/10">
                <p className="text-[9px] font-bold text-on-surface-variant text-center opacity-60">
                  Reviewing latest 50 submissions.
                </p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
