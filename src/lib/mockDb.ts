// Centralized seed data and configuration for the KPI Merit system.
// This replaces the old mock DB with comprehensive state matching stitch-app.html prototype.

import type { Task, Achievement, StaffProfile, AppealItem, TeamMember, AiPointConfig, SkillModule, OrganizationConfig, MeritConfig } from './types';

// ═══════════════════════════════════════════
// AI POINT CONFIGURATION
// ═══════════════════════════════════════════
export const AI_POINT_CONFIG: AiPointConfig = {
  basePtsPerMin: 1,
  tierNames: {
    tier1: 'Routine',
    tier2: 'Standard',
    tier3: 'Complex',
    tier4: 'Critical',
    tier5: 'Extraordinary',
  },
  difficultyMultiplier: {
    tier1: 1.0,
    tier2: 1.3,
    tier3: 1.7,
    tier4: 2.2,
    tier5: 3.0,
  },
  priorityKeywords: ['urgent', 'high priority', 'blocker'],
  priorityBonus: 50,
};

// ═══════════════════════════════════════════
// MERIT LOGIC CONFIGURATION (Management set)
// ═══════════════════════════════════════════
export const SEED_MERIT_CONFIG: MeritConfig = {
  basePoints: 10,
  tier1Name: 'Routine',
  multiplierTier1: 1.0,
  tier2Name: 'Standard',
  multiplierTier2: 1.3,
  tier3Name: 'Complex',
  multiplierTier3: 1.7,
  tier4Name: 'Critical',
  multiplierTier4: 2.2,
  tier5Name: 'Extraordinary',
  multiplierTier5: 3.0,
  keywordRules: [],
};

// ═══════════════════════════════════════════
// ORGANIZATION SETTINGS
// ═══════════════════════════════════════════
export const SEED_ORG_CONFIG: OrganizationConfig = {
  workspaceName: 'Merit Organization',
  defaultDesignation: 'Staff',
  autoAssignments: {}
};

// ═══════════════════════════════════════════
// SEED TASKS
// ═══════════════════════════════════════════
export const SEED_TASKS: Task[] = [];

// ═══════════════════════════════════════════
// SEED ACHIEVEMENTS
// ═══════════════════════════════════════════
export const SEED_ACHIEVEMENTS: Achievement[] = [
  { id: 'ach-1', icon: 'stars', title: '5-Star Streak', desc: 'Maintain a perfect 5.0 customer rating for 10 consecutive rentals.', trigger: 'MANUAL' },
  { id: 'ach-2', icon: 'speed', title: 'Flash Handover', desc: 'Complete five vehicle handovers in under 15 minutes each.', trigger: 'MANUAL' },
  { id: 'ach-3', icon: 'clean_hands', title: 'Pristine Fleet', desc: 'Pass five consecutive vehicle cleanliness inspections with zero remarks.', trigger: 'MANUAL' },
  { id: 'ach-4', icon: 'nights_stay', title: 'Midnight Hero', desc: 'Successfully manage three off-hour ground handling tasks or key handovers.', trigger: 'MANUAL' },
  { id: 'ach-5', icon: 'gavel', title: 'Zero Summons', desc: 'Keep a managed vehicle free of traffic or parking summons for 30 days.', trigger: 'MANUAL' },
  { id: 'ach-6', icon: 'psychology', title: 'The Decoy Master', desc: 'Successfully convert three 1-day inquiries into 3-day weekend bookings using decoy pricing.', trigger: 'MANUAL' },
  { id: 'ach-7', icon: 'chat', title: 'WhatsApp Wizard', desc: 'Achieve a 40% conversion rate on incoming WhatsApp leads for one week.', trigger: 'MANUAL' },
  { id: 'ach-8', icon: 'rebase_edit', title: 'Retention King', desc: 'Secure three repeat bookings from customers who previously rented only once.', trigger: 'MANUAL' },
  { id: 'ach-9', icon: 'upgrade', title: 'The Upsell Ace', desc: 'Successfully upgrade a daily rental customer to a higher-tier vehicle model.', trigger: 'MANUAL' },
  { id: 'ach-10', icon: 'group_add', title: 'Referral Rockstar', desc: 'Generate three confirmed bookings through personal or agent referrals.', trigger: 'MANUAL' },
  { id: 'ach-11', icon: 'security', title: 'Semak Sentinel', desc: 'Successfully identify and block a high-risk lead using the background screening platform.', trigger: 'MANUAL' },
  { id: 'ach-12', icon: 'minor_crash', title: 'Fleet Guardian', desc: 'Detect and report a vehicle maintenance issue before it causes a rental disruption.', trigger: 'MANUAL' },
  { id: 'ach-13', icon: 'tire_repair', title: 'Tire Tech', desc: 'Ensure all 12 vehicles in the fleet have optimal tire pressure and fluid levels for the week.', trigger: 'MANUAL' },
  { id: 'ach-14', icon: 'description', title: 'Document Dynamo', desc: 'Achieve 100% accuracy in rental agreement documentation for 20 consecutive deals.', trigger: 'MANUAL' },
  { id: 'ach-15', icon: 'videocam', title: 'TikTok Trailblazer', desc: 'Create one TikTok video that achieves over 1,000 organic views.', trigger: 'MANUAL' },
  { id: 'ach-16', icon: 'movie', title: 'Content King', desc: 'Submit five high-quality "cinematic" vehicle clips for the company marketing bank.', trigger: 'MANUAL' },
  { id: 'ach-17', icon: 'bolt', title: 'Viral Spark', desc: 'Have your content mentioned or shared by a customer on their personal social media.', trigger: 'MANUAL' },
  { id: 'ach-18', icon: 'lightbulb', title: 'Workflow Winner', desc: 'Propose one operational improvement that is officially implemented by the team.', trigger: 'MANUAL' },
  { id: 'ach-19', icon: 'school', title: 'Agent Ally', desc: 'Successfully mentor a new agent through their first three successful bookings.', trigger: 'MANUAL' },
  { id: 'ach-20', icon: 'schedule', title: 'Punctual Pro', desc: 'Achieve 100% on-time arrival for all shifts and handovers for one full month.', trigger: 'MANUAL' }
];

export const SEED_UNLOCKED_ACHIEVEMENTS = [];

// ═══════════════════════════════════════════
// STAFF PROFILE
// ═══════════════════════════════════════════
export const SEED_PROFILE: StaffProfile = {
  name: 'New Staff',
  designation: 'Staff',
  department: 'Operations',
  employmentType: 'Staff',
  photoUrl: 'https://i.pravatar.cc/150?u=new_staff',
};

// ═══════════════════════════════════════════
// TEAM MEMBERS (Manager View)
// ═══════════════════════════════════════════
export const SEED_TEAM: TeamMember[] = [];

// ═══════════════════════════════════════════
// APPEALS (Triage View)
// ═══════════════════════════════════════════
export const SEED_APPEALS: AppealItem[] = [];

// ═══════════════════════════════════════════
// SKILL MODULES (Learning View)
// ═══════════════════════════════════════════
export const SEED_MODULES: SkillModule[] = [];
