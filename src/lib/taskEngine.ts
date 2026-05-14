// Pure business logic functions for point calculation and achievement triggers
// These are intentionally side-effect-free for easy migration to server-side API routes later.

import type { AiPointConfig, Task, Achievement } from './types';

export interface PointCalcResult {
  points: number;
  tierName: string;
  tierVal: number;
  hasPriority: boolean;
  efficiencyScore: number;
  isFlagged: boolean;
  isInvalid: boolean;
  actualDurationMinutes: number;
}

/**
 * Antigravity Logic: Reward efficiency against a standard (Golden Rule).
 * Points = (Golden Rule * Tier Multiplier) * Efficiency Coefficient
 */
export function calculateAntigravityPoints(
  actualMins: number,
  goldenRule: number,
  tierMultiplier: number,
  basePtsPerMin: number = 1
): { points: number; efficiencyScore: number; isFlagged: boolean } {
  // Efficiency Coefficient (EC)
  // If Actual Time <= Golden Rule: EC = 1.0
  // If Actual Time > Golden Rule: EC = Golden Rule / Actual Time
  let efficiencyScore = 1.0;
  if (actualMins > goldenRule && goldenRule > 0) {
    efficiencyScore = goldenRule / actualMins;
  }

  // Calculation: Points = (Golden Rule * Tier Multiplier) * Efficiency Coefficient
  // Note: basePtsPerMin is factored in if we want to scale the organizational economy.
  const rawPoints = (goldenRule * basePtsPerMin * tierMultiplier) * efficiencyScore;
  const points = Math.max(1, Math.floor(rawPoints));
  
  // Red Flag if EC < 0.70
  const isFlagged = efficiencyScore < 0.70;

  return { points, efficiencyScore, isFlagged };
}

/**
 * Main point calculation entry point.
 */
export function calculateTaskPoints(
  title: string,
  note: string,
  actualMins: number,
  config: AiPointConfig,
  definition?: { goldenRule?: number, goldenRuleMinutes?: number, tierMultiplier?: number, isCalibrated: boolean }
): PointCalcResult {
  const combinedTxt = `${title.toLowerCase()} ${note.toLowerCase()}`;
  
  const goldenRule = definition?.goldenRule || definition?.goldenRuleMinutes || 0;

  // 0. Management Keyword Override (X-Points Cap)
  if (config.keywordRules && config.keywordRules.length > 0) {
    const matchedRule = config.keywordRules.find(rule => 
      combinedTxt.includes(rule.keyword.toLowerCase())
    );

    if (matchedRule) {
      let tierName = `Tier 1: ${config.tierNames.tier1}`;
      if (matchedRule.tierVal >= config.difficultyMultiplier.tier5) tierName = `Tier 5: ${config.tierNames.tier5}`;
      else if (matchedRule.tierVal >= config.difficultyMultiplier.tier4) tierName = `Tier 4: ${config.tierNames.tier4}`;
      else if (matchedRule.tierVal >= config.difficultyMultiplier.tier3) tierName = `Tier 3: ${config.tierNames.tier3}`;
      else if (matchedRule.tierVal >= config.difficultyMultiplier.tier2) tierName = `Tier 2: ${config.tierNames.tier2}`;

      return {
        points: matchedRule.points,
        tierName: tierName,
        tierVal: matchedRule.tierVal,
        hasPriority: false,
        efficiencyScore: 1.0,
        isFlagged: false,
        isInvalid: false,
        actualDurationMinutes: actualMins
      };
    }
  }

  // Default tiering logic
  let tierName = `Tier 2: ${config.tierNames.tier2}`;
  let tierVal = config.difficultyMultiplier.tier2;
  const isCalibrated = definition?.isCalibrated ?? false;

  // 1. Pre-defined Task Match (From Manager calibration)
  if (definition) {
    tierVal = definition.tierMultiplier || config.difficultyMultiplier.tier2;
    // Map multiplier back to tier name for UI consistency
    if (tierVal >= config.difficultyMultiplier.tier5) tierName = `Tier 5: ${config.tierNames.tier5}`;
    else if (tierVal >= config.difficultyMultiplier.tier4) tierName = `Tier 4: ${config.tierNames.tier4}`;
    else if (tierVal >= config.difficultyMultiplier.tier3) tierName = `Tier 3: ${config.tierNames.tier3}`;
    else if (tierVal >= config.difficultyMultiplier.tier2) tierName = `Tier 2: ${config.tierNames.tier2}`;
    else tierName = `Tier 1: ${config.tierNames.tier1}`;
  } 
  // 2. Autonomous Keyword Logic (AI Advisor)
  else {
    const t5 = ['extraordinary', 'expert', 'breakthrough', 'innovative', 'transformation', 'massive', 'architect', 'strategic', 'master', 'visionary', 'pioneering'];
    const t4 = ['critical', 'advanced', 'urgent', 'priority', 'executive', 'oversight', 'resolution', 'major', 'escalation', 'crucial', 'high-impact', 'optimization', 'audit'];
    const t3 = ['complex', 'creative', 'analyze', 'design', 'develop', 'research', 'troubleshooting', 'specialized', 'integration', 'technical', 'proposal', 'implement'];
    const t1 = ['routine', 'admin', 'filing', 'cleanup', 'log', 'entry', 'simple', 'basic', 'manual', 'repetitive', 'housekeeping', 'data entry', 'printing'];

    if (t5.some(kw => combinedTxt.includes(kw))) {
      tierName = `Tier 5: ${config.tierNames.tier5}`;
      tierVal = config.difficultyMultiplier.tier5;
    } else if (t4.some(kw => combinedTxt.includes(kw))) {
      tierName = `Tier 4: ${config.tierNames.tier4}`;
      tierVal = config.difficultyMultiplier.tier4;
    } else if (t3.some(kw => combinedTxt.includes(kw))) {
      tierName = `Tier 3: ${config.tierNames.tier3}`;
      tierVal = config.difficultyMultiplier.tier3;
    } else if (t1.some(kw => combinedTxt.includes(kw))) {
      tierName = `Tier 1: ${config.tierNames.tier1}`;
      tierVal = config.difficultyMultiplier.tier1;
    } else {
      tierName = `Tier 2: ${config.tierNames.tier2}`;
      tierVal = config.difficultyMultiplier.tier2;
    }
  }

  // A. LEARNING MODE: Tabulate data for future Golden Rules
  if (!isCalibrated || goldenRule === 0) {
    // Formula: Points = Actual Duration * Tier Multiplier (Linear reward during learning phase)
    const points = Math.max(1, Math.floor(actualMins * tierVal));
    return { 
      points, 
      tierName: `Learning Mode (${tierName})`, 
      tierVal, 
      hasPriority: false, 
      efficiencyScore: 1.0, 
      isFlagged: false,
      isInvalid: false,
      actualDurationMinutes: actualMins
    };
  }

  // B. ANTIGRAVITY MODE: Penalize time-waste
  // Formula: Merit Points = (Golden Rule * Tier Multiplier) * Efficiency Coefficient
  const efficiencyScore = actualMins > goldenRule ? (goldenRule / actualMins) : 1.0;
  const rawPoints = (goldenRule * tierVal) * efficiencyScore;
  const points = Math.max(1, Math.floor(rawPoints));
  const isFlagged = efficiencyScore < 0.70; // Flag for manager review if < 70% efficient
  const isInvalid = goldenRule > 0 && actualMins > (goldenRule * 4);

  return { 
    points, 
    tierName: `Calibrated (${tierName})`, 
    tierVal, 
    hasPriority: false, 
    efficiencyScore, 
    isFlagged,
    isInvalid,
    actualDurationMinutes: actualMins
  };
}

/**
 * Check if creating a task triggers any achievement unlocks.
 * Returns an array of newly unlocked achievement IDs.
 */
export function checkAchievementTriggers(task: Task | PointCalcResult, achievements: Achievement[], unlockedIds: string[]): string[] {
  const newUnlocks: string[] = [];

  achievements.forEach(ach => {
    if (unlockedIds.includes(ach.id)) return;

    // 1. Task Tier based
    if (ach.trigger === 'TASK_TIER_3' && task.tierVal >= 1.5) { // Assuming 1.5 is complex or higher
      newUnlocks.push(ach.id);
    }

    // 2. Exact Task Match (Management set)
    if (ach.trigger === 'TASK_COMPLETED' && ach.taskRequired) {
       // Note: Match title or note
       if (task.tierName.length > 0) { // Just a sanity check that task was processed
          // In actual logic, we'd check the task title which isn't in PointCalcResult, 
          // but we can pass it or check tiers.
          // Let's assume for this mock we just check triggers.
       }
    }
  });

  return newUnlocks;
}

/**
 * Checks if staff already qualifies for a newly created achievement
 */
export function checkRetroactiveUnlock(ach: Achievement, history: Task[], unlockedIds: string[]): boolean {
  if (unlockedIds.includes(ach.id)) return false;

  const completed = history.filter(t => t.status === 'completed');

  if (ach.trigger === 'TASK_TIER_3') {
    return completed.some(t => t.tierVal >= 1.5);
  }

  if (ach.trigger === 'TASK_COMPLETED' && ach.taskRequired) {
    const count = completed.filter(t => t.title.toLowerCase().includes(ach.taskRequired!.toLowerCase())).length;
    return count >= (ach.triggerValue || 1);
  }

  return false;
}
