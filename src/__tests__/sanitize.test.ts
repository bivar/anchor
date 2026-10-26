import { describe, it, expect } from 'vitest';
import { LIMITS, BackupError, parseBackup, sanitizeFlow, sanitizeState, sanitizeText } from '../state/sanitize';
import { initialState } from '../state/reducer';
import { todayKey } from '../state/constants';

// Built from code points so no invisible characters live in this source file.
const RLO = String.fromCharCode(0x202e);
const ZWSP = String.fromCharCode(0x200b);
const NUL = String.fromCharCode(0);

describe('sanitizeText', () => {
  it('strips control and bidi-override characters and flattens newlines', () => {
    expect(sanitizeText(`a${NUL}b${RLO}c\nd${ZWSP}e`, 60)).toBe('abc de');
  });

  it('caps length without splitting surrogate pairs', () => {
    expect(sanitizeText('🐶🐶🐶', 2)).toBe('🐶🐶');
  });

  it('returns an empty string for non-strings', () => {
    expect(sanitizeText({ toString: () => 'x' }, 10)).toBe('');
  });
});

describe('sanitizeState', () => {
  it('drops unknown block ids that would crash the Today list', () => {
    const s = sanitizeState({ order: ['launchpad', '__proto__', 'nope'], pet: { species: 'dog' } }, initialState());
    expect(s.order).toEqual(['launchpad']);
  });

  it('falls back to a derived order when none survive', () => {
    expect(sanitizeState({ order: 'garbage' }, initialState()).order.length).toBeGreaterThan(0);
  });

  it('rejects custom rewards that impersonate built-in ids or use unknown icons', () => {
    const s = sanitizeState(
      {
        customRewards: [
          { id: 'skip', label: 'Free passes', cost: 1, iconName: 'gift' },
          { id: 'custom-1', label: 'Movie', cost: -50, iconName: 'not-an-icon' },
          { id: 'custom-1', label: 'Dup', cost: 30, iconName: 'gift' },
        ],
      },
      initialState(),
    );
    expect(s.customRewards).toHaveLength(1);
    expect(s.customRewards[0]).toMatchObject({ id: 'custom-1', cost: LIMITS.rewardCostMin, iconName: 'gift' });
  });

  it('clamps numbers and keeps xpToNext positive', () => {
    const s = sanitizeState({ gold: -1e9, xp: Infinity, xpToNext: 0, level: 'x', streak: 3.7 }, initialState());
    expect(s.gold).toBe(0);
    expect(s.xpToNext).toBeGreaterThanOrEqual(1);
    expect(s.level).toBe(1);
    expect(s.streak).toBe(3);
  });

  it('rejects invalid work times and history keys', () => {
    const s = sanitizeState(
      { work: { startTime: '25:00', endTime: '18:30' }, history: { 'not-a-date': { success: true }, '2026-10-20': { success: true } } },
      initialState(),
    );
    expect(s.work).toMatchObject({ startTime: '09:00', endTime: '18:30' });
    expect(Object.keys(s.history)).toEqual(['2026-10-20']);
  });

  it('migrates schema v1: sportPreference, free-text insights', () => {
    const s = sanitizeState(
      { schemaVersion: 1, sportPreference: 'Volleyball', sportSchedule: { secondarySport: 'Pilates', secondaryDays: [2] }, insights: ['old text'], currentInsight: 'old text' },
      initialState(),
    );
    expect(s.exercises).toEqual([
      { id: 'ex-primary', name: 'Volleyball', days: [0, 1, 3, 4, 5, 6] },
      { id: 'ex-secondary', name: 'Pilates', days: [2] },
    ]);
    expect(s.insights).toEqual([]);
    expect(s.currentInsight).toBeNull();
    expect(s.schemaVersion).toBe(3);
    expect('sportPreference' in s).toBe(false);
  });

  it('migrates schema v2: keeps the old behaviour (work every day, morning + evening pet time)', () => {
    const s = sanitizeState(
      {
        schemaVersion: 2,
        pet: { name: 'Fred', species: 'dog' },
        work: { startTime: '08:00', endTime: '16:00' },
        sportSchedule: { primarySport: 'Gym', secondarySport: 'Yoga', secondaryDays: [2, 4] },
      },
      initialState(),
    );
    expect(s.pet.routine).toEqual({ morning: 'walk', afterWork: null, evening: 'walk' });
    expect(s.work).toEqual({ startTime: '08:00', endTime: '16:00', days: [0, 1, 2, 3, 4, 5, 6] });
    expect(s.exercises.map((e) => e.name)).toEqual(['Gym', 'Yoga']);
    expect(s.dayStart).toBe('07:00');
  });

  it('keeps each weekday on one exercise and drops invalid routine entries', () => {
    const s = sanitizeState(
      {
        exercises: [
          { id: 'a', name: 'Gym', days: [1, 3, 9] },
          { id: 'b', name: 'Run', days: [3, 5] },
          { id: 'c', name: '  ', days: [6] },
        ],
        pet: { species: 'cat', routine: { morning: 'feed', afterWork: 'skydive', evening: 'play' } },
      },
      initialState(),
    );
    expect(s.exercises).toEqual([
      { id: 'a', name: 'Gym', days: [1, 3] },
      { id: 'b', name: 'Run', days: [5] },
    ]);
    expect(s.pet.routine).toEqual({ morning: 'feed', afterWork: null, evening: 'play' });
  });

  it('restores a running timer flow but never a toast', () => {
    const s = sanitizeState(
      { activeFlow: { type: 'focus', phase: 'timer', seconds: 120, targetTimestamp: 123, resistance: 9, elapsed: 0 }, toast: { key: 'logged' } },
      initialState(),
    );
    expect(s.activeFlow).toMatchObject({ type: 'focus', phase: 'timer', targetTimestamp: 123, resistance: 5 });
    expect(s.toast).toBeNull();
  });

  it('drops malformed flows', () => {
    expect(sanitizeFlow({ type: 'log', blockId: 'nope' })).toBeNull();
    expect(sanitizeFlow({ type: 'launchpad', tasks: [] })).toBeNull();
    expect(sanitizeFlow({ type: 'evil' })).toBeNull();
  });
});

describe('parseBackup', () => {
  const code = (fn: () => unknown) => {
    try {
      fn();
    } catch (e) {
      return e instanceof BackupError ? e.code : 'other';
    }
    return 'none';
  };

  it('rejects non-JSON, non-backup and oversized input', () => {
    expect(code(() => parseBackup('{', initialState()))).toBe('notJson');
    expect(code(() => parseBackup('{"foo":1}', initialState()))).toBe('invalid');
    expect(code(() => parseBackup(' '.repeat(LIMITS.backupBytes + 1), initialState()))).toBe('tooLarge');
  });

  it('accepts a real export', () => {
    const exported = JSON.stringify({ ...initialState(), streak: 4, today: todayKey() });
    expect(parseBackup(exported, initialState()).streak).toBe(4);
  });
});
