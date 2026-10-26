import { describe, expect, it } from 'vitest';
import { analyzeHistory, bestStreak } from '../state/insights';
import { addDays } from '../state/constants';
import type { DaySummary } from '../state/types';

const today = '2026-10-24';
const day = (n: number, extra: Partial<DaySummary> = {}): [string, DaySummary] => {
  const key = addDays(today, -n);
  return [key, { today: key, energy: 'medium', completedBlocks: [], skippedBlocks: [], xpEarned: 0, success: false, ...extra }];
};

describe('insights engine', () => {
  it('flags a low-energy week and an often-skipped block', () => {
    const history = Object.fromEntries([1, 2, 3, 4, 5].map((n) => day(n, { energy: 'low', skippedBlocks: ['bridge'] })));
    const ids = analyzeHistory(history, today, false).insights;
    expect(ids.map((i) => i.id)).toEqual(expect.arrayContaining(['lowEnergyWeek', 'oftenSkipped']));
    expect(ids.find((i) => i.id === 'oftenSkipped')?.block).toBe('bridge');
  });

  it('notices when moving focus earlier is working', () => {
    const history = Object.fromEntries([1, 2, 3].map((n) => day(n, { focusResistance: 2, focusWorked: true })));
    const result = analyzeHistory(history, today, true);
    expect(result.focusEarly).toBe(true);
    expect(result.insights.map((i) => i.id)).toEqual(expect.arrayContaining(['focusEarlyWorking', 'fiveMinuteWorks']));
  });

  it('computes the best streak across gaps', () => {
    const history = Object.fromEntries([day(10, { success: true }), day(9, { success: true }), day(8, { success: true }), day(5, { success: true }), day(4)]);
    expect(bestStreak(history)).toBe(3);
  });
});
