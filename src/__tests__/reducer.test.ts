import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIMITS } from '../state/sanitize';
import { calculateRollover, initialState, reducer } from '../state/reducer';
import { addDays, TORNADO_SECONDS } from '../state/constants';
import type { AppState } from '../state/types';

const T0 = new Date(2026, 9, 24, 10, 0, 0);

function appState(overrides: Partial<AppState> = {}): AppState {
  // Work and exercise every day so tests don't depend on which weekday they run.
  return {
    ...initialState(),
    screen: 'app',
    language: 'en',
    work: { startTime: '09:00', endTime: '17:00', days: [0, 1, 2, 3, 4, 5, 6] },
    exercises: [{ id: 'ex', name: 'Gym', days: [0, 1, 2, 3, 4, 5, 6] }],
    ...overrides,
  };
}

describe('reducer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it('REDEEM uses the catalog price, not a caller-supplied one', () => {
    const s = appState({ gold: 100 });
    const next = reducer(s, { type: 'REDEEM', id: 'takeout' });
    expect(next.gold).toBe(20);
    expect(reducer(next, { type: 'REDEEM', id: 'takeout' }).gold).toBe(20); // one-time reward
    expect(reducer(s, { type: 'REDEEM', id: 'does-not-exist' })).toBe(s);
  });

  it('custom rewards can be added, edited, redeemed repeatedly and deleted', () => {
    let s = appState({ gold: 100 });
    s = reducer(s, { type: 'ADD_CUSTOM_REWARD', reward: { id: 'custom-9', label: ' Nap ', desc: '', cost: 99999, iconName: 'moon', isCustom: true } });
    expect(s.customRewards[0]).toMatchObject({ label: 'Nap', cost: LIMITS.rewardCostMax });
    s = reducer(s, { type: 'UPDATE_CUSTOM_REWARD', reward: { ...s.customRewards[0], cost: 10 } });
    s = reducer(reducer(s, { type: 'REDEEM', id: 'custom-9' }), { type: 'REDEEM', id: 'custom-9' });
    expect(s.gold).toBe(80);
    s = reducer(s, { type: 'DELETE_CUSTOM_REWARD', id: 'custom-9' });
    expect(s.customRewards).toEqual([]);
  });

  it('UPDATE_WORK ignores malformed times', () => {
    const next = reducer(appState(), { type: 'UPDATE_WORK', work: { startTime: 'evil', endTime: '16:00' } });
    expect(next.work).toMatchObject({ startTime: '09:00', endTime: '16:00' });
  });

  it('Tornado running out of time counts as done and awards XP', () => {
    let s = reducer(appState(), { type: 'OPEN_TORNADO', tasks: ['a', 'b', 'c'] });
    s = reducer(s, { type: 'START_TORNADO' });
    vi.setSystemTime(T0.getTime() + TORNADO_SECONDS * 1000 + 1);
    s = reducer(s, { type: 'TICK' });
    expect(s.activeFlow).toMatchObject({ type: 'tornado', phase: 'done' });
    expect(s.blockStatus.tornado).toBe('done');
    expect(s.blockXp.tornado).toBe(25);
    // A second completion (e.g. "Finish now" racing the clock) does not pay twice.
    const xp = s.xp;
    expect(reducer(s, { type: 'TICK' }).xp).toBe(xp);
  });

  it('Tornado can be skipped for free only on low-energy days; otherwise a pass is needed', () => {
    const s = appState({ energy: 'medium' });
    expect(reducer(s, { type: 'SKIP_BLOCK', id: 'tornado' }).blockStatus.tornado).toBeUndefined();
    expect(reducer({ ...s, energy: 'low' }, { type: 'SKIP_BLOCK', id: 'tornado' }).blockStatus.tornado).toBe('skipped');
    const withPass = reducer({ ...s, tornadoSkips: 1 }, { type: 'USE_TORNADO_SKIP' });
    expect(withPass.blockStatus.tornado).toBe('skipped');
    expect(withPass.tornadoSkips).toBe(0);
    expect(reducer(s, { type: 'SKIP_BLOCK', id: 'work' }).blockStatus.work).toBeUndefined();
  });

  it('editing the launchpad list starts from the defaults instead of wiping them', () => {
    const added = reducer(appState(), { type: 'ADD_LAUNCHPAD_TASK', task: 'Stretch' });
    expect(added.customLaunchpadTasks.length).toBeGreaterThan(2);
    expect(added.customLaunchpadTasks[added.customLaunchpadTasks.length - 1]).toBe('Stretch');
    const removed = reducer(appState(), { type: 'REMOVE_LAUNCHPAD_TASK', i: 0 });
    expect(removed.customLaunchpadTasks).not.toContain('Water + meds');
    expect(removed.customLaunchpadTasks.length).toBeGreaterThan(0);
  });

  it('focus stopwatch is timestamp based (keeps counting while the screen is off)', () => {
    let s = reducer(appState(), { type: 'OPEN_FOCUS' });
    s = reducer(s, { type: 'KEEP_GOING' });
    vi.setSystemTime(T0.getTime() + 125_000);
    s = reducer(s, { type: 'TICK' });
    expect(s.activeFlow).toMatchObject({ phase: 'running', elapsed: 125 });
  });

  it('records focus data used by the insights engine', () => {
    let s = reducer(appState(), { type: 'OPEN_FOCUS' });
    s = reducer(s, { type: 'SET_RESISTANCE', n: 5 });
    s = reducer(s, { type: 'START_FIVEMIN_TIMER' });
    s = reducer(s, { type: 'WRAP_UP' });
    s = reducer(s, { type: 'FINISH_FOCUS', energyAfter: 'high' });
    expect(s).toMatchObject({ focusWorked: true, energyAfterFocus: 'high', currentInsight: 'focusHeavyToday', momentum: 1 });
    expect(s.blockResistance.focus).toBe(5);
  });

  it('"after work too" check-ins re-plan the day from the energy logged after work', () => {
    let s = appState({ energy: 'high', checkinFrequency: 'few' });
    s = reducer(s, { type: 'OPEN_LOG', id: 'work' });
    s = reducer(s, { type: 'SET_LOG_RESISTANCE', n: 2 });
    s = reducer(s, { type: 'SET_LOG_ENERGY', level: 'low' });
    expect(s.energy).toBe('low');
    expect(s.order.indexOf('sport')).toBeLessThan(s.order.indexOf('focus'));
    expect(s.blockResistance.work).toBe(2);
  });
});

describe('configurable anchors', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0); // Saturday 2026-10-24, 10:00
  });
  afterEach(() => vi.useRealTimers());

  it('COMPLETE_SETUP stores the anchors and plans today from them', () => {
    const s = reducer(initialState(), {
      type: 'COMPLETE_SETUP',
      setup: {
        pet: { name: ' Fred ', species: 'dog', routine: { morning: 'walk', afterWork: 'play', evening: null } },
        struggle: { label: 'Thesis' },
        dayStart: '06:30',
        work: { startTime: '08:00', endTime: '16:00', days: [1, 2, 3, 4, 5] },
        exercises: [{ id: 'x', name: 'Run', days: [6] }, { id: 'y', name: '', days: [0] }],
      },
    });
    expect(s.pet.name).toBe('Fred');
    expect(s.dayStart).toBe('06:30');
    expect(s.exercises).toEqual([{ id: 'x', name: 'Run', days: [6] }]); // unnamed rows are dropped
    // Saturday: no work, Run is planned, pet morning + after-work blocks.
    expect(s.order).toEqual(['launchpad', 'petAM', 'petMid', 'focus', 'sport', 'tornado', 'winddown']);
    expect(s.screen).toBe('onboarding');
  });

  it('changing anchors re-plans today but keeps finished blocks', () => {
    let s = appState({ blockStatus: { launchpad: 'done' } });
    s = reducer(s, { type: 'UPDATE_WORK', work: { days: [1, 2, 3, 4, 5] } });
    expect(s.order).not.toContain('work');
    s = reducer(s, { type: 'SET_EXERCISES', exercises: [] });
    expect(s.order).not.toContain('sport');
    s = reducer(s, { type: 'UPDATE_PET', pet: { ...s.pet, routine: { morning: null, afterWork: null, evening: 'cuddle' } } });
    expect(s.order).toContain('petPM');
    expect(s.order).not.toContain('petAM');
    expect(s.blockStatus.launchpad).toBe('done');
  });

  it('SET_DAY_START rejects malformed times', () => {
    expect(reducer(appState(), { type: 'SET_DAY_START', dayStart: '25:99' }).dayStart).toBe('07:00');
    expect(reducer(appState(), { type: 'SET_DAY_START', dayStart: '05:45' }).dayStart).toBe('05:45');
  });

  it('records the planned blocks so analytics can compute follow-through', () => {
    const s = calculateRollover(appState({ today: '2026-10-23', order: ['launchpad', 'work'], blockStatus: { launchpad: 'done' } }), '2026-10-24');
    expect(s.history['2026-10-23'].plannedBlocks).toEqual(['launchpad', 'work']);
  });
});

describe('calculateRollover', () => {
  it('extends the streak after a full day and records missed days', () => {
    const today = '2026-10-24';
    const full = appState({
      today: addDays(today, -1),
      order: ['launchpad', 'work'],
      blockStatus: { launchpad: 'done', work: 'done' },
      streak: 2,
    });
    expect(calculateRollover(full, today).streak).toBe(3);

    const gap = calculateRollover({ ...full, today: addDays(today, -4) }, today);
    expect(gap.streak).toBe(0);
    expect(gap.history[addDays(today, -2)]).toMatchObject({ missed: true, success: false });
    expect(gap.history[addDays(today, -4)]).toMatchObject({ success: true });
    expect(gap.history[today]).toBeUndefined();
  });

  it('learns to move focus earlier after repeated heavy starts', () => {
    const today = '2026-10-24';
    const history = Object.fromEntries(
      [2, 3, 4].map((n) => {
        const key = addDays(today, -n);
        return [key, { today: key, energy: 'medium' as const, completedBlocks: [], skippedBlocks: [], xpEarned: 0, success: false, focusResistance: 5 }];
      }),
    );
    const s = calculateRollover(appState({ today: addDays(today, -1), history, blockResistance: { focus: 4 } }), today);
    expect(s.focusEarly).toBe(true);
    expect(s.insights.map((i) => i.id)).toContain('focusMovedEarlier');
    expect(s.order.indexOf('focus')).toBe(s.order.indexOf('work') + 1);
  });
});
