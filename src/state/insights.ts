import { addDays } from './constants';
import type { BlockId, DaySummary, Insight } from './types';

const LOOKBACK_DAYS = 14;

/**
 * Learns from recent history. Returns the insights worth surfacing and whether the focus block
 * should move earlier on medium-energy days (it already comes right after work on high days).
 */
export function analyzeHistory(
  history: Record<string, DaySummary>,
  today: string,
  wasFocusEarly: boolean,
): { insights: Insight[]; focusEarly: boolean } {
  const days: DaySummary[] = [];
  for (let i = 1; i <= LOOKBACK_DAYS; i++) {
    const d = history[addDays(today, -i)];
    if (d && !d.missed) days.push(d); // newest first
  }

  const insights: Insight[] = [];
  const sessions = days.filter((d) => typeof d.focusResistance === 'number').slice(0, 5);
  const heavy = sessions.filter((d) => (d.focusResistance ?? 0) >= 4).length;
  const recentLight = sessions.slice(0, 3);

  let focusEarly = wasFocusEarly;
  if (!wasFocusEarly && sessions.length >= 3 && heavy >= 3) {
    focusEarly = true;
    insights.push({ id: 'focusMovedEarlier', date: today });
  } else if (wasFocusEarly && recentLight.length === 3 && recentLight.every((d) => (d.focusResistance ?? 5) <= 2)) {
    insights.push({ id: 'focusEarlyWorking', date: today });
  }

  if (sessions.length >= 3 && sessions.filter((d) => d.focusWorked).length >= 3) {
    insights.push({ id: 'fiveMinuteWorks', date: today });
  }

  const week = days.slice(0, 7);
  if (week.filter((d) => d.energy === 'low').length >= 4) {
    insights.push({ id: 'lowEnergyWeek', date: today });
  }

  const skipCounts = new Map<BlockId, number>();
  for (const d of week) for (const id of d.skippedBlocks) skipCounts.set(id, (skipCounts.get(id) ?? 0) + 1);
  const mostSkipped = [...skipCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (mostSkipped && mostSkipped[1] >= 4) {
    insights.push({ id: 'oftenSkipped', date: today, block: mostSkipped[0] });
  }

  return { insights, focusEarly };
}

/** Longest run of consecutive successful days in history. */
export function bestStreak(history: Record<string, DaySummary>): number {
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of Object.keys(history).sort()) {
    const ok = history[key].success;
    run = ok ? (prev && addDays(prev, 1) === key ? run + 1 : 1) : 0;
    if (ok) prev = key;
    best = Math.max(best, run);
  }
  return best;
}
