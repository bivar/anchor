import { describe, it, expect } from 'vitest';
import { en } from '../i18n/en';
import { pt } from '../i18n/pt';
import {
  addDays,
  applicableBlocks,
  blockMeta,
  calculateWorkHours,
  dayBoundaryHour,
  daysBetween,
  defaultRoutine,
  exerciseFor,
  formatWeekdays,
  launchpadTasks,
  logicalTodayKey,
  orderFor,
  shuffle,
  todayKey,
} from '../state/constants';
import type { BlockId } from '../state/types';

const ALL = new Set<BlockId>(['launchpad', 'petAM', 'work', 'petMid', 'bridge', 'focus', 'sport', 'petPM', 'tornado', 'winddown']);
const NO_PET = new Set([...ALL].filter((id) => !id.startsWith('pet')));
const exercises = [
  { id: 'a', name: 'Gym', days: [1, 3, 5] },
  { id: 'b', name: 'Pilates', days: [2, 4] },
];
const work = { startTime: '09:00', endTime: '17:00', days: [1, 2, 3, 4, 5] };
const dog = { name: 'Fred', species: 'dog' as const, routine: defaultRoutine('dog') };

describe('Constants & Routine Logic', () => {
  it('generates a valid YYYY-MM-DD today key', () => {
    expect(todayKey(new Date(2026, 9, 21, 12))).toBe('2026-10-21');
  });

  it('does calendar math across month ends and DST', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
    expect(daysBetween('2026-10-24', '2026-10-24')).toBe(0);
  });

  it('starts a new day 3 h before the start of day, between 00:00 and 05:00', () => {
    expect(dayBoundaryHour('07:00')).toBe(4);
    expect(dayBoundaryHour('10:30')).toBe(5);
    expect(dayBoundaryHour('02:00')).toBe(0);
    expect(logicalTodayKey('07:00', new Date(2026, 9, 24, 1, 30))).toBe('2026-10-23'); // still "last night"
    expect(logicalTodayKey('07:00', new Date(2026, 9, 24, 4, 0))).toBe('2026-10-24');
  });

  it('finds the exercise planned for a day (or none on rest days)', () => {
    expect(exerciseFor(exercises, '2026-10-20')?.name).toBe('Pilates'); // Tuesday
    expect(exerciseFor(exercises, '2026-10-21')?.name).toBe('Gym'); // Wednesday
    expect(exerciseFor(exercises, '2026-10-25')).toBeNull(); // Sunday
  });

  it('only plans the anchors that exist on a given day', () => {
    const weekday = applicableBlocks({ pet: dog, work, exercises }, '2026-10-21');
    expect([...weekday].sort()).toEqual(['bridge', 'focus', 'launchpad', 'petAM', 'petPM', 'sport', 'tornado', 'winddown', 'work']);
    const sunday = applicableBlocks({ pet: { ...dog, routine: { morning: 'walk', afterWork: 'play', evening: null } }, work, exercises }, '2026-10-25');
    expect([...sunday].sort()).toEqual(['focus', 'launchpad', 'petAM', 'petMid', 'tornado', 'winddown']);
    const noPet = applicableBlocks({ pet: { ...dog, species: 'none' }, work, exercises }, '2026-10-21');
    expect(noPet.has('petAM')).toBe(false);
  });

  it('formats weekday lists Monday-first in the given locale', () => {
    expect(formatWeekdays([4, 2], 'en-US')).toBe('Tue, Thu');
    expect(formatWeekdays([0, 1], 'en-US')).toBe('Mon, Sun');
  });

  it('calculates work hours duration accurately', () => {
    expect(calculateWorkHours({ ...work, startTime: '09:00', endTime: '17:00' })).toBe('8h');
    expect(calculateWorkHours({ ...work, startTime: '08:30', endTime: '17:00' })).toBe('8.5h');
    expect(calculateWorkHours({ ...work, startTime: '22:00', endTime: '06:00' })).toBe('8h');
  });

  it('orders routine by energy, available blocks and the learned focusEarly flag', () => {
    expect(orderFor('high', ALL)).toContain('petAM');
    expect(orderFor('high', NO_PET)).not.toContain('petPM');
    const low = orderFor('low', NO_PET);
    expect(low.indexOf('sport')).toBeLessThan(low.indexOf('focus'));
    const medium = orderFor('medium', NO_PET);
    expect(medium.indexOf('bridge')).toBeLessThan(medium.indexOf('focus'));
    const early = orderFor('medium', NO_PET, true);
    expect(early.indexOf('focus')).toBe(early.indexOf('work') + 1);
    const all = orderFor('medium', ALL);
    expect(all.indexOf('petMid')).toBe(all.indexOf('work') + 1);
  });

  it('labels pet blocks by the chosen activity and only skips Tornado for free on low energy', () => {
    const base = { pet: { ...dog, routine: { morning: 'walk' as const, afterWork: 'play' as const, evening: 'feed' as const } }, struggleLabel: 'Thesis', exerciseName: 'Gym', workConfig: work, dayStart: '07:00', m: en };
    const meta = blockMeta({ ...base, energy: 'medium' });
    expect([meta.petAM.label, meta.petMid.label, meta.petPM.label]).toEqual(['Walk Fred', 'Play with Fred', 'Feed Fred']);
    expect(meta.sport.label).toBe('Gym');
    expect(meta.tornado.skippable).toBe(false);
    expect(blockMeta({ ...base, energy: 'low' }).tornado.skippable).toBe(true);
    expect(blockMeta({ ...base, energy: 'low' }).work.skippable).toBe(false);
  });

  it('localizes default content', () => {
    expect(launchpadTasks(dog, en)).toContain('Leash + bags by the door');
    expect(launchpadTasks(dog, pt)).toContain('Coleira + saquinhos na porta');
  });

  it('Fisher-Yates shuffle preserves elements and array length', () => {
    const input = [1, 2, 3, 4, 5, 6, 7];
    const shuffled = shuffle(input);
    expect(shuffled).toHaveLength(input.length);
    expect([...shuffled].sort()).toEqual([...input].sort());
  });
});
