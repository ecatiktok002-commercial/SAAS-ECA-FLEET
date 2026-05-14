"use client";

import React, { useState } from 'react';
import type { OrganizationConfig, TeamMember } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';

interface ManagerOrgViewProps {
  config: OrganizationConfig;
  setConfig: (c: OrganizationConfig) => void;
  onDeleteStaff: (id: string, name: string) => void;
  team: TeamMember[];
  setTeam: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  onSaveRoleSync: (config: OrganizationConfig) => Promise<void>;
  viewedIds: string[];
  markViewed: (id: string) => void;
}

export default function ManagerOrgView({
  config,
  setConfig,
  onDeleteStaff,
  team,
  setTeam,
  onSaveRoleSync,
  viewedIds,
  markViewed
}: ManagerOrgViewProps) {
  const allRoles = Object.keys(config.autoAssignments);

  // —— Create Staff ——
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRoles, setNewStaffRoles] = useState<string[]>([]); // multi-role
  const [newAccessCode, setNewAccessCode] = useState('');
  const [creating, setCreating] = useState(false);

  const toggleNewRole = (role: string) =>
    setNewStaffRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);

  const handleCreateStaff = async () => {
    if (!newStaffName.trim() || !newAccessCode.trim()) return alert('Name and Access Code required.');
    setCreating(true);
    const roleStr = newStaffRoles.join(', ') || 'Staff';
    const { data: profile, error } = await supabase.from('profiles').insert([{
      full_name: newStaffName.trim(),
      access_id: newStaffName.trim().toLowerCase().replace(/\s+/g, ''),
      passcode: newAccessCode.trim(),
      role: roleStr,
      photo_url: `https://i.pravatar.cc/150?u=${Date.now()}`
    }]).select().single();
    setCreating(false);
    if (error) { alert('Error creating staff: ' + error.message); return; }
    alert(`Staff "${profile.full_name}" created. Access ID: ${profile.access_id}`);
    setTeam(prev => [...prev, {
      id: profile.id, name: profile.full_name, imgUrl: profile.photo_url,
      status: 'online', currentTask: 'Awaiting Task', department: profile.department || 'General',
      monthPoints: 0, rank: prev.length + 1, elapsed: '', role: roleStr,
      points: 0, level: 1, current_rank_points: 0, is_manager: false,
      last_active: new Date().toISOString()
    }]);
    setNewStaffName(''); setNewAccessCode(''); setNewStaffRoles([]);
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editPasscode, setEditPasscode] = useState('');
  const [saving, setSaving] = useState(false);

  const openEdit = (staff: any) => {
    setEditingId(staff.id);
    setEditName(staff.name || '');
    setEditRoles(staff.role ? staff.role.split(',').map((r: string) => r.trim()).filter(Boolean) : []);
    setEditPasscode('');
  };

  const toggleEditRole = (role: string) =>
    setEditRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const roleStr = editRoles.join(', ') || 'Staff';
    const updates: any = { full_name: editName.trim(), role: roleStr };
    if (editPasscode.trim()) updates.passcode = editPasscode.trim();
    const { error } = await supabase.from('profiles').update(updates).eq('id', editingId);
    setSaving(false);
    if (error) { alert('Failed to update: ' + error.message); return; }
    setTeam(prev => prev.map(s => s.id === editingId ? { ...s, name: editName.trim(), role: roleStr } : s));
    setEditingId(null);
  };

  // —— Role Config ——
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [newRoleName, setNewRoleName] = useState('');
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});

  const handleAddDefaultTask = async (role: string) => {
    const taskName = taskInputs[role]?.trim();
    if (!taskName) return;
    const newConfig = { ...config, autoAssignments: { ...config.autoAssignments, [role]: { ...config.autoAssignments[role], tasks: [...config.autoAssignments[role].tasks, taskName] } } };
    setConfig(newConfig);
    setTaskInputs(prev => ({ ...prev, [role]: '' }));
    await onSaveRoleSync(newConfig);
  };

  const handleRemoveTask = async (role: string, idx: number) => {
    const newConfig = { ...config, autoAssignments: { ...config.autoAssignments, [role]: { ...config.autoAssignments[role], tasks: config.autoAssignments[role].tasks.filter((_, i) => i !== idx) } } };
    setConfig(newConfig);
    await onSaveRoleSync(newConfig);
  };

  const handleDeleteRole = async (role: string) => {
    if (!confirm(`Delete the "${role}" role configuration?`)) return;
    const { [role]: _r, ...rest } = config.autoAssignments;
    const newConfig = { ...config, autoAssignments: rest };
    setConfig(newConfig);
    await onSaveRoleSync(newConfig);
  };

  const handleCreateRole = async () => {
    const roleName = newRoleName.trim();
    if (!roleName) return;
    if (config.autoAssignments[roleName]) { alert('Role already exists.'); return; }
    const newConfig = { ...config, autoAssignments: { ...config.autoAssignments, [roleName]: { tasks: [] } } };
    setConfig(newConfig);
    setNewRoleName('');
    await onSaveRoleSync(newConfig);
  };

  return (
    <>
      <div className="mb-10">
        <p className="text-xs font-bold uppercase tracking-[0.15em] mb-2 text-primary">Workspace Governance</p>
        <h2 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Organization Settings</h2>
        <p className="text-on-surface-variant mt-2 text-lg">Manage business roles, auto-assignments, and issue staff access codes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* —— LEFT: Staff Access —— */}
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">badge</span> Issued Access
            </h3>

            {/* Create Staff Form */}
            <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/5 shadow-inner mb-8">
              <p className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">person_add</span>
                Create Staff Gateway
              </p>
              <div className="space-y-3">
                <input
                  value={newStaffName}
                  onChange={e => setNewStaffName(e.target.value)}
                  placeholder="Full Name (e.g. John Doe)"
                  className="w-full bg-white rounded-xl py-3 px-4 outline-none border border-outline-variant/10 text-sm font-medium focus:border-primary/30 focus:ring-2 focus:ring-primary/5 transition-all"
                />

                {/* Multi-role checkboxes */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Assign Roles (select one or more)</p>
                  {allRoles.length === 0 ? (
                    <p className="text-xs text-on-surface-variant italic">No roles configured yet. Add roles on the right first.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allRoles.map(role => {
                        const checked = newStaffRoles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => toggleNewRole(role)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                              checked
                                ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                                : 'bg-white text-on-surface-variant border-outline-variant/20 hover:border-primary/40 hover:text-primary'
                            }`}
                          >
                            {checked && <span className="mr-1">✓</span>}{role}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {newStaffRoles.length > 0 && (
                    <p className="text-[10px] text-primary font-bold mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      Assigned: {newStaffRoles.join(' · ')}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    value={newAccessCode}
                    onChange={e => setNewAccessCode(e.target.value)}
                    placeholder="Set Passcode..."
                    className="flex-1 bg-white rounded-xl py-3 px-4 outline-none border border-outline-variant/10 text-sm font-medium focus:border-primary/30 focus:ring-2 focus:ring-primary/5 transition-all"
                  />
                  <button
                    onClick={() => setNewAccessCode(Math.floor(100000 + Math.random() * 900000).toString())}
                    className="px-4 py-3 bg-surface-container rounded-xl text-primary hover:bg-primary/10 transition-colors"
                    title="Generate Random"
                  >
                    <span className="material-symbols-outlined text-[20px]">refresh</span>
                  </button>
                </div>

                <button
                  disabled={creating}
                  onClick={handleCreateStaff}
                  className="w-full bg-primary text-white py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all mission-gradient"
                >
                  {creating ? 'Issuing Gateway...' : 'Initialize Access'}
                </button>
              </div>
            </div>

            {/* Staff List with Edit */}
            <div className="space-y-3">
              {team.map(staff => (
                <div key={staff.id} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/5 shadow-sm group">
                  {editingId === staff.id ? (
                    <div className="space-y-4">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full bg-white rounded-xl p-3 text-sm font-bold border border-primary/20 outline-none"
                        placeholder="Edit Name"
                      />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Update Roles</p>
                        <div className="flex flex-wrap gap-1.5">
                          {allRoles.map(role => {
                            const checked = editRoles.includes(role);
                            return (
                              <button
                                key={role}
                                onClick={() => toggleEditRole(role)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all ${
                                  checked ? 'bg-primary text-white border-primary' : 'bg-white border-outline-variant/20 text-on-surface-variant'
                                }`}
                              >
                                {role}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={editPasscode}
                          onChange={e => setEditPasscode(e.target.value)}
                          placeholder="New Passcode (leave blank for no change)"
                          className="flex-1 bg-white rounded-xl p-3 text-xs border border-outline-variant/10 outline-none"
                        />
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="px-4 py-3 bg-primary text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
                        >
                          {saving ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-4 py-3 bg-surface-container text-on-surface-variant rounded-xl text-xs font-bold active:scale-95">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={staff.imgUrl} className="w-10 h-10 rounded-full border border-outline-variant/10" alt="" />
                        <div>
                          <p className="font-bold text-sm text-on-surface">{staff.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {(staff.role || 'Staff').split(',').map((r: string) => (
                              <span key={r} className="text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                                {r.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(staff)} className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => onDeleteStaff(staff.id, staff.name)} className="p-2 text-on-surface-variant hover:text-error transition-colors">
                          <span className="material-symbols-outlined text-[18px]">person_remove</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* —— RIGHT: Global Roles & Missions —— */}
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">diversity_3</span> Role Definition Matrix
            </h3>

            {/* Create Role */}
            <div className="flex gap-2 mb-8">
              <input
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                placeholder="New Role Title (e.g. Creative Lead)"
                className="flex-1 bg-surface-container-low rounded-xl py-3 px-4 outline-none border border-outline-variant/10 text-sm font-medium focus:border-primary/30 transition-all"
              />
              <button
                onClick={handleCreateRole}
                className="bg-primary text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:scale-[1.05] active:scale-95 transition-all mission-gradient"
              >
                Deploy Role
              </button>
            </div>

            {/* Role List */}
            <div className="space-y-4">
              {allRoles.map(role => (
                <div key={role} className="p-6 rounded-[2rem] bg-surface-container-low border border-outline-variant/5 shadow-inner">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-lg font-black font-headline text-on-surface">{role}</h4>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mt-1">Default Mission Scope</p>
                    </div>
                    <button onClick={() => handleDeleteRole(role)} className="p-2 text-on-surface-variant hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>

                  <div className="space-y-2 mb-6">
                    {config.autoAssignments[role].tasks.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic opacity-60 px-2">No default tasks assigned.</p>
                    ) : (
                      config.autoAssignments[role].tasks.map((task, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/50 p-3 rounded-xl border border-outline-variant/5 group">
                          <span className="text-sm font-medium text-on-surface">{task}</span>
                          <button onClick={() => handleRemoveTask(role, i)} className="text-error opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={taskInputs[role] || ''}
                      onChange={e => setTaskInputs({ ...taskInputs, [role]: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && handleAddDefaultTask(role)}
                      placeholder="Add standard mission..."
                      className="flex-1 bg-white border border-outline-variant/10 rounded-xl py-2.5 px-4 text-xs font-medium focus:border-primary/30 outline-none transition-all"
                    />
                    <button
                      onClick={() => handleAddDefaultTask(role)}
                      className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[20px]">add</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onSaveRoleSync(config)}
              className="w-full mt-8 bg-surface-container text-on-surface py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] border border-outline-variant/10 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all active:scale-95"
            >
              Sync Global Role Architecture
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
