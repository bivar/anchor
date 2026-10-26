import { describe, expect, it } from 'vitest';
import { anchorRates, buildDays, energyCounts, summarize, weekdayRates } from '../lib/analytics';
import { initialState } from '../state/reducer';
import type { AppState, DaySummary } from '../state/types';

const day = (key: string, extra: Partial<DaySummary>): DaySummary => ({
  today: key,
  energy: null,
  completedBlocks: [],
  skippedBlocks: [],
  xpEarned: 0,
  success: false,
  ...extra,
});

function state(): AppState {
  return {
    ...initialState(),
    today: '2026-10-24',
    order: ['launchpad', 'focus'],
    blockStatus: { launchpad: 'done' },
    blockXp: { launchpad: 25 },
    energy: 'medium',
    streak: 1,
    history: {
      '2026-10-20': day('2026-10-20', { energy: 'low', completedBlocks: ['launchpad'], plannedBlocks: ['launchpad', 'work', 'focus', 'sport'], focusResistance: 5, focusWorked: false, xpEarned: 20 }),
      '2026-10-21': day('2026-10-21', { missed: true }),
      '2026-10-22': day('2026-10-22', { energy: 'high', completedBlocks: ['launchpad', 'work', 'focus'], plannedBlocks: ['launchpad', 'work', 'focus'], success: true, focusResistance: 2, focusWorked: true, xpEarned: 80 }),
      // Recorded before plannedBlocks existed: done + skipped stand in for the plan.
      '2026-10-23': day('2026-10-23', { completedBlocks: ['launchpad'], skippedBlocks: ['bridge'] }),
    },
  };
}

describe('analytics', () => {
  const s = state();
  const days = buildDays(s, 7);

  it('builds one point per day ending with a live today', () => {
    expect(days.map((d) => d.kind)).toEqual(['none', 'none', 'past', 'missed', 'past', 'past', 'today']);
    expect(days[6]).toMatchObject({ planned: 2, done: 1, rate: 50, energy: 'medium', xp: 25 });
    expect(days[5]).toMatchObject({ planned: 2, done: 1, rate: 50 });
  });

  it('summarizes finished days only for completion, and counts focus sessions', () => {
    const k = summarize(days, s);
    expect(k).toMatchObject({ doneBlocks: 5, plannedBlocks: 9, completion: 56, fullDays: 1, trackedDays: 4, focusSessions: 2, keptGoing: 1, avgResistance: 3.5, xp: 125 });
    expect(k.best).toBe(1);
  });

  it('averages follow-through per weekday (Monday first), missed days counting as 0', () => {
    // 2026-10-20 Tue 25%, 21 Wed missed 0%, 22 Thu 100%, 23 Fri 50%.
    expect(weekdayRates(days)).toEqual([null, 25, 0, 100, 50, null, null]);
  });

  it('rates each anchor against the days it was planned', () => {
    const rates = Object.fromEntries(anchorRates(days).map((r) => [r.id, [r.done, r.planned]]));
    expect(rates).toEqual({ launchpad: [3, 3], work: [1, 2], bridge: [0, 1], focus: [1, 2], sport: [0, 1] });
  });

  it('counts energy check-ins including today', () => {
    expect(energyCounts(days)).toEqual({ low: 1, medium: 1, high: 1 });
  });
});
