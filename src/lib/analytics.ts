import { addDays, parseDateKey } from '../state/constants';
import { bestStreak } from '../state/insights';
import type { AppState, BlockId, EnergyLevel } from '../state/types';

export type DayKind = 'past' | 'missed' | 'today' | 'none';

export interface DayPoint {
  key: string;
  kind: DayKind;
  planned: number;
  done: number;
  /** Share of planned blocks finished, 0–100; null when nothing is known for the day. */
  rate: number | null;
  success: boolean;
  energy: EnergyLevel | null;
  resistance: number | null;
  worked: boolean | null;
  xp: number;
  plannedBlocks: BlockId[];
  doneBlocks: BlockId[];
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** One point per calendar day, oldest first, ending today (today is live, from the current state). */
export function buildDays(state: AppState, range: number): DayPoint[] {
  return Array.from({ length: range }, (_, i) => {
    const key = addDays(state.today, i - range + 1);
    if (key === state.today) {
      const doneBlocks = state.order.filter((id) => state.blockStatus[id] === 'done');
      const focusDone = state.blockStatus.focus === 'done';
      return {
        key,
        kind: 'today',
        planned: state.order.length,
        done: doneBlocks.length,
        rate: state.order.length ? pct(doneBlocks.length, state.order.length) : null,
        success: false,
        energy: state.energy,
        resistance: focusDone ? (state.blockResistance.focus ?? null) : null,
        worked: focusDone ? state.focusWorked : null,
        xp: Object.values(state.blockXp).reduce((a: number, b) => a + (b || 0), 0),
        plannedBlocks: state.order,
        doneBlocks,
      };
    }
    const d = state.history[key];
    if (!d) {
      return { key, kind: 'none', planned: 0, done: 0, rate: null, success: false, energy: null, resistance: null, worked: null, xp: 0, plannedBlocks: [], doneBlocks: [] };
    }
    // Days recorded before schema v3 don't list their plan; what was finished or skipped is the best estimate.
    const plannedBlocks = d.plannedBlocks ?? Array.from(new Set([...d.completedBlocks, ...d.skippedBlocks]));
    return {
      key,
      kind: d.missed ? 'missed' : 'past',
      planned: plannedBlocks.length,
      done: d.completedBlocks.length,
      rate: d.missed ? 0 : plannedBlocks.length ? pct(d.completedBlocks.length, plannedBlocks.length) : null,
      success: d.success,
      energy: d.energy,
      resistance: d.focusResistance ?? null,
      worked: d.focusWorked ?? null,
      xp: d.xpEarned,
      plannedBlocks,
      doneBlocks: d.completedBlocks,
    };
  });
}

export interface Kpis {
  completion: number | null;
  doneBlocks: number;
  plannedBlocks: number;
  fullDays: number;
  trackedDays: number;
  streak: number;
  best: number;
  focusSessions: number;
  keptGoing: number;
  avgResistance: number | null;
  xp: number;
}

/** Headline numbers. Completion and full days use finished days only, so an in-progress today doesn't drag them down. */
export function summarize(days: DayPoint[], state: AppState): Kpis {
  const finished = days.filter((d) => d.kind === 'past' || d.kind === 'missed');
  const plannedBlocks = finished.reduce((a, d) => a + d.planned, 0);
  const doneBlocks = finished.reduce((a, d) => a + d.done, 0);
  const sessions = days.filter((d) => d.resistance !== null);
  return {
    completion: plannedBlocks > 0 ? pct(doneBlocks, plannedBlocks) : null,
    doneBlocks,
    plannedBlocks,
    fullDays: finished.filter((d) => d.success).length,
    trackedDays: finished.length,
    streak: state.streak,
    best: Math.max(state.streak, bestStreak(state.history)),
    focusSessions: sessions.length,
    keptGoing: sessions.filter((d) => d.worked).length,
    avgResistance: sessions.length ? Math.round((sessions.reduce((a, d) => a + (d.resistance ?? 0), 0) / sessions.length) * 10) / 10 : null,
    xp: days.reduce((a, d) => a + d.xp, 0),
  };
}

/** Average follow-through per weekday, Monday first; null where no finished day fell on it. */
export function weekdayRates(days: DayPoint[]): (number | null)[] {
  const sums = Array.from({ length: 7 }, () => ({ total: 0, n: 0 }));
  for (const d of days) {
    if (d.kind === 'today' || d.kind === 'none' || d.rate === null) continue;
    const i = (parseDateKey(d.key).getDay() + 6) % 7;
    sums[i].total += d.rate;
    sums[i].n += 1;
  }
  return sums.map((s) => (s.n ? Math.round(s.total / s.n) : null));
}

export interface AnchorRate {
  id: BlockId;
  planned: number;
  done: number;
  rate: number;
}

const BLOCK_ORDER: BlockId[] = ['launchpad', 'petAM', 'work', 'petMid', 'bridge', 'focus', 'sport', 'petPM', 'tornado', 'winddown'];

/** How often each anchor got done on the days it was planned (finished days only). */
export function anchorRates(days: DayPoint[]): AnchorRate[] {
  return BLOCK_ORDER.map((id) => {
    const planned = days.filter((d) => (d.kind === 'past' || d.kind === 'missed') && d.plannedBlocks.includes(id));
    const done = planned.filter((d) => d.doneBlocks.includes(id)).length;
    return { id, planned: planned.length, done, rate: pct(done, planned.length) };
  }).filter((r) => r.planned > 0);
}

export function energyCounts(days: DayPoint[]): Record<EnergyLevel, number> {
  const counts: Record<EnergyLevel, number> = { low: 0, medium: 0, high: 0 };
  for (const d of days) if (d.energy) counts[d.energy] += 1;
  return counts;
}
