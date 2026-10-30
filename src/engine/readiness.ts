// UNVALIDATED HEURISTIC - Readiness score model for family practice
export type ReadinessBand = 'Starting' | 'Building' | 'Ready';

export interface DrillScoreInput {
  hung_up: boolean;
  shared_info?: boolean;
  shared_otp?: boolean;
  refused_otp?: boolean;
  moved_money?: boolean;
  refused_money?: boolean;
  told_someone?: boolean;
  used_pause?: boolean;
  pause_used?: boolean;
  timestamp?: number;
  created_at?: string;
}

/**
 * Calculates raw points for a single drill (0..100)
 * 30 points if hung_up
 * 25 points if no shared_info and no shared_otp
 * 25 points if no moved_money
 * 20 points if told_someone or used_pause
 */
export function calculateSingleDrillPoints(drill: DrillScoreInput): number {
  let points = 0;
  if (drill.hung_up) {
    points += 30;
  }
  const noSharedInfoAndOtp = drill.refused_otp ?? (!drill.shared_info && !drill.shared_otp);
  if (noSharedInfoAndOtp) {
    points += 25;
  }
  const noMovedMoney = drill.refused_money ?? !drill.moved_money;
  if (noMovedMoney) {
    points += 25;
  }
  const toldOrPause = Boolean(drill.told_someone || drill.used_pause || drill.pause_used);
  if (toldOrPause) {
    points += 20;
  }
  return points;
}

/**
 * Calculates weighted average score from up to 5 most recent drills,
 * applies decay penalty of 10 points per full week since the last drill after the first week,
 * and clamps 0..100.
 *
 * Weights for newest to oldest: [1.0, 0.9, 0.8, 0.7, 0.6]
 */
export function calculateReadinessScore(
  drills: DrillScoreInput[],
  referenceTime: number = Date.now()
): { score: number; band: ReadinessBand; caption: string } {
  const caption = 'Readiness, not immunity.';
  if (!drills || drills.length === 0) {
    return { score: 0, band: 'Starting', caption };
  }

  // Take up to 5 most recent drills (assumed ordered from newest to oldest)
  const recentDrills = drills.slice(0, 5);
  const weights = [1.0, 0.9, 0.8, 0.7, 0.6].slice(0, recentDrills.length);

  let weightedSum = 0;
  let totalWeight = 0;

  recentDrills.forEach((drill, index) => {
    const drillPoints = calculateSingleDrillPoints(drill);
    const weight = weights[index];
    weightedSum += drillPoints * weight;
    totalWeight += weight;
  });

  const average = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Time decay: minus 10 points for each full week since the last drill after the first week
  const newest = recentDrills[0];
  const lastDrillTime = newest.timestamp ?? (newest.created_at ? new Date(newest.created_at).getTime() : referenceTime);
  const diffMs = Math.max(0, referenceTime - lastDrillTime);
  const daysSince = diffMs / (1000 * 60 * 60 * 24);
  const fullWeeksSince = Math.floor(daysSince / 7);
  const penaltyWeeks = Math.max(0, fullWeeksSince - 1);
  const penalty = penaltyWeeks * 10;

  const score = Math.max(0, Math.min(100, Math.round(average - penalty)));

  let band: ReadinessBand = 'Starting';
  if (score >= 75) {
    band = 'Ready';
  } else if (score >= 40) {
    band = 'Building';
  }

  return { score, band, caption };
}

/**
 * Calculates consecutive weeks with at least one drill (streak counter).
 */
export function calculateDrillStreak(
  drillTimestamps: number[],
  referenceTime: number = Date.now()
): number {
  if (!drillTimestamps || drillTimestamps.length === 0) return 0;

  const sorted = [...drillTimestamps].sort((a, b) => b - a);
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  const newest = sorted[0];
  if (referenceTime - newest > ONE_WEEK_MS) {
    return 0; // Streak broken because last drill is older than 7 days
  }

  let streak = 0;
  let currentWindowStart = referenceTime;

  while (true) {
    const windowEnd = currentWindowStart - ONE_WEEK_MS;
    const hasDrillInWindow = sorted.some(t => t <= currentWindowStart && t > windowEnd);
    if (hasDrillInWindow) {
      streak++;
      currentWindowStart = windowEnd;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Weekly booster due indicator when last drill is over 7 days old
 */
export function isWeeklyBoosterDue(
  lastDrillTime: number | null | undefined,
  referenceTime: number = Date.now()
): boolean {
  if (!lastDrillTime) return true;
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  return referenceTime - lastDrillTime > ONE_WEEK_MS;
}
