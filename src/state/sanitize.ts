import { isIconName } from '../components/Icon';
import { PET_ACTIVITY_KINDS, PET_SLOTS, applicableBlocks, defaultRoutine, logicalTodayKey, orderFor } from './constants';
import type {
  AppState,
  BlockId,
  BlockStatus,
  DaySummary,
  EnergyLevel,
  Exercise,
  Flow,
  Insight,
  InsightId,
  PetActivityKind,
  PetRoutine,
  Reward,
} from './types';

export const LIMITS = {
  petName: 30,
  struggle: 60,
  sportName: 30,
  exercises: 7,
  launchpadTask: 60,
  launchpadTasks: 20,
  rewardLabel: 40,
  rewardDesc: 60,
  rewards: 50,
  rewardCostMin: 5,
  rewardCostMax: 500,
  insights: 5,
  id: 64,
  claimedRewards: 1000,
  historyDays: 730,
  backupBytes: 1_000_000,
  flowSeconds: 24 * 60 * 60,
} as const;

const BLOCK_IDS: readonly BlockId[] = ['launchpad', 'petAM', 'work', 'petMid', 'bridge', 'focus', 'sport', 'petPM', 'tornado', 'winddown'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const BLOCK_STATUSES: readonly BlockStatus[] = ['pending', 'done', 'skipped'];
const ENERGY_LEVELS: readonly EnergyLevel[] = ['low', 'medium', 'high'];
const INSIGHT_IDS: readonly InsightId[] = [
  'energyLow',
  'energyHigh',
  'focusHeavyToday',
  'focusMovedEarlier',
  'focusEarlyWorking',
  'fiveMinuteWorks',
  'lowEnergyWeek',
  'oftenSkipped',
];
const DATE_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// C0/C1 control characters, zero-width spaces, directional marks/overrides/isolates and BOM.
// ZWNJ/ZWJ (U+200C/U+200D) are kept: emoji sequences and several scripts need them.
// Keep these as \u escapes: literal invisible characters in source are a Trojan Source risk.
// eslint-disable-next-line no-control-regex -- matching control characters is the point.
const UNSAFE_CHARS_RE = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F\\u200B\\u200E\\u200F\\u202A-\\u202E\\u2060-\\u2064\\u2066-\\u2069\\uFEFF]', 'g');

/**
 * Strips invisible/control characters, flattens line breaks and caps length (by code point,
 * so surrogate pairs are never split). Does not trim, so it is safe to run on every keystroke.
 */
export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  const cleaned = value.replace(/[\r\n\t]+/g, ' ').replace(UNSAFE_CHARS_RE, '');
  const chars = Array.from(cleaned);
  return chars.length > maxLength ? chars.slice(0, maxLength).join('') : cleaned;
}

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_RE.test(value);
}

export function sanitizeWeekdays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))).sort((a, b) => a - b);
}

export function sanitizeRoutine(value: unknown): PetRoutine {
  const raw = isRecord(value) ? value : {};
  const routine = { morning: null, afterWork: null, evening: null } as PetRoutine;
  for (const slot of PET_SLOTS) {
    routine[slot] = PET_ACTIVITY_KINDS.includes(raw[slot] as PetActivityKind) ? (raw[slot] as PetActivityKind) : null;
  }
  return routine;
}

/**
 * Validates the exercise plan. A weekday belongs to at most one exercise (the first listing it wins).
 * `finalize` trims names and drops empty rows; pass false while the user is still typing.
 */
export function sanitizeExercises(value: unknown, finalize = true): Exercise[] {
  if (!Array.isArray(value)) return [];
  const taken = new Set<number>();
  const ids = new Set<string>();
  const out: Exercise[] = [];
  for (const raw of value.filter(isRecord).slice(0, LIMITS.exercises)) {
    let id = sanitizeText(raw.id, LIMITS.id);
    if (!id || ids.has(id)) id = `ex-${out.length}-${ids.size}`;
    ids.add(id);
    const name = sanitizeText(raw.name, LIMITS.sportName);
    const days = sanitizeWeekdays(raw.days).filter((d) => !taken.has(d));
    days.forEach((d) => taken.add(d));
    if (finalize && !name.trim()) continue;
    out.push({ id, name: finalize ? name.trim() : name, days });
  }
  return out;
}

/** Schema ≤ v2 stored one "primary" sport for most days and a "secondary" one on chosen days. */
function legacyExercises(raw: Record<string, unknown>): Exercise[] {
  const sport = isRecord(raw.sportSchedule) ? raw.sportSchedule : {};
  const primary = sanitizeText(sport.primarySport, LIMITS.sportName).trim() || sanitizeText(raw.sportPreference, LIMITS.sportName).trim() || 'Gym';
  const secondary = sanitizeText(sport.secondarySport, LIMITS.sportName).trim() || 'Pilates';
  const secondaryDays = Array.isArray(sport.secondaryDays) ? sanitizeWeekdays(sport.secondaryDays) : [2, 4];
  return [
    { id: 'ex-primary', name: primary, days: ALL_DAYS.filter((d) => !secondaryDays.includes(d)) },
    { id: 'ex-secondary', name: secondary, days: secondaryDays },
  ].filter((e) => e.days.length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function int(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function timestamp(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function energyOrNull(value: unknown): EnergyLevel | null {
  return ENERGY_LEVELS.includes(value as EnergyLevel) ? (value as EnergyLevel) : null;
}

function textList(value: unknown, maxItemLength: number, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => sanitizeText(v, maxItemLength).trim())
    .filter((v) => v.length > 0)
    .slice(0, maxItems);
}

function blockIdList(value: unknown): BlockId[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((v): v is BlockId => BLOCK_IDS.includes(v as BlockId))));
}

function blockRecord<T>(value: unknown, pick: (v: unknown) => T | undefined): Partial<Record<BlockId, T>> {
  const out: Partial<Record<BlockId, T>> = {};
  if (!isRecord(value)) return out;
  for (const id of BLOCK_IDS) {
    const v = pick(value[id]);
    if (v !== undefined) out[id] = v;
  }
  return out;
}

export function sanitizeReward(value: unknown): Reward | null {
  if (!isRecord(value)) return null;
  const id = sanitizeText(value.id, LIMITS.id);
  const label = sanitizeText(value.label, LIMITS.rewardLabel).trim();
  // Custom rewards must not reuse a built-in id (e.g. "skip" would mint Tornado passes).
  if (!id.startsWith('custom-') || !label) return null;
  return {
    id,
    label,
    desc: sanitizeText(value.desc, LIMITS.rewardDesc).trim(),
    cost: int(value.cost, 30, LIMITS.rewardCostMin, LIMITS.rewardCostMax),
    iconName: isIconName(value.iconName) ? value.iconName : 'gift',
    isCustom: true,
  };
}

function sanitizeHistory(value: unknown): Record<string, DaySummary> {
  if (!isRecord(value)) return {};
  const keys = Object.keys(value)
    .filter((k) => DATE_KEY_RE.test(k) && isRecord(value[k]))
    .sort()
    .slice(-LIMITS.historyDays);
  const out: Record<string, DaySummary> = {};
  for (const key of keys) {
    const day = value[key] as Record<string, unknown>;
    out[key] = {
      today: key,
      energy: energyOrNull(day.energy),
      completedBlocks: blockIdList(day.completedBlocks),
      skippedBlocks: blockIdList(day.skippedBlocks),
      xpEarned: int(day.xpEarned, 0, 0, 1_000_000),
      success: day.success === true,
      missed: day.missed === true,
      ...(Array.isArray(day.plannedBlocks) ? { plannedBlocks: blockIdList(day.plannedBlocks) } : {}),
      focusResistance: typeof day.focusResistance === 'number' ? int(day.focusResistance, 3, 1, 5) : null,
      focusWorked: typeof day.focusWorked === 'boolean' ? day.focusWorked : null,
      energyAfterFocus: energyOrNull(day.energyAfterFocus),
    };
  }
  return out;
}

function sanitizeInsights(value: unknown): Insight[] {
  if (!Array.isArray(value)) return [];
  // Schema v1 stored insights as free text; those are dropped (they are regenerated from history).
  return value
    .filter((v): v is Record<string, unknown> => isRecord(v) && INSIGHT_IDS.includes(v.id as InsightId))
    .map((v) => ({
      id: v.id as InsightId,
      date: typeof v.date === 'string' && DATE_KEY_RE.test(v.date) ? v.date : '1970-01-01',
      ...(BLOCK_IDS.includes(v.block as BlockId) ? { block: v.block as BlockId } : {}),
    }))
    .slice(0, LIMITS.insights);
}

function boolList(value: unknown, length: number): boolean[] {
  return Array.from({ length }, (_, i) => Array.isArray(value) && value[i] === true);
}

/** Restores an in-progress flow (so a timer survives the browser killing the page). */
export function sanitizeFlow(value: unknown): Flow | null {
  if (!isRecord(value)) return null;
  const seconds = int(value.seconds, 0, 0, LIMITS.flowSeconds);
  const resistance = typeof value.resistance === 'number' ? int(value.resistance, 3, 1, 5) : null;
  switch (value.type) {
    case 'log': {
      if (!BLOCK_IDS.includes(value.blockId as BlockId)) return null;
      return { type: 'log', blockId: value.blockId as BlockId, step: oneOf(value.step, ['resistance', 'energy'] as const, 'resistance'), resistance };
    }
    case 'focus':
      return {
        type: 'focus',
        phase: oneOf(value.phase, ['threshold', 'timer', 'checkpoint', 'running', 'debrief'] as const, 'threshold'),
        resistance,
        seconds,
        targetTimestamp: timestamp(value.targetTimestamp),
        runningSince: timestamp(value.runningSince),
        elapsed: int(value.elapsed, 0, 0, LIMITS.flowSeconds),
        paused: value.paused === true,
        worked: value.worked === true,
      };
    case 'launchpad': {
      const tasks = textList(value.tasks, LIMITS.launchpadTask, LIMITS.launchpadTasks);
      if (tasks.length === 0) return null;
      return { type: 'launchpad', tasks, done: boolList(value.done, tasks.length) };
    }
    case 'tornado': {
      const raw = Array.isArray(value.tasks) ? value.tasks.filter(isRecord).slice(0, 10) : [];
      const tasks = raw.map((t) => ({ label: sanitizeText(t.label, LIMITS.launchpadTask).trim(), done: t.done === true })).filter((t) => t.label);
      if (tasks.length === 0) return null;
      return {
        type: 'tornado',
        phase: oneOf(value.phase, ['intro', 'running', 'done'] as const, 'intro'),
        seconds,
        targetTimestamp: timestamp(value.targetTimestamp),
        paused: value.paused === true,
        tasks,
      };
    }
    default:
      return null;
  }
}

/**
 * Rebuilds a trusted AppState from untrusted data (persisted storage or an imported backup),
 * migrating older schema versions on the way. Every field is type-checked, bounded and falls
 * back to `base` when invalid, so a corrupted or hand-crafted payload can never put the app
 * into a state that crashes on render.
 */
export function sanitizeState(raw: unknown, base: AppState): AppState {
  if (!isRecord(raw)) return base;
  const pet = isRecord(raw.pet) ? raw.pet : {};
  const struggle = isRecord(raw.struggle) ? raw.struggle : {};
  const work = isRecord(raw.work) ? raw.work : {};

  const species = oneOf(pet.species, ['dog', 'cat', 'other', 'none'] as const, base.pet.species);
  const energy = energyOrNull(raw.energy);
  const focusEarly = raw.focusEarly === true;
  const order = blockIdList(raw.order);
  const xpToNext = int(raw.xpToNext, base.xpToNext, 1, Number.MAX_SAFE_INTEGER);
  const dayStart = isValidTime(raw.dayStart) ? raw.dayStart : base.dayStart;
  const today = typeof raw.today === 'string' && DATE_KEY_RE.test(raw.today) ? raw.today : logicalTodayKey(dayStart);
  const petConfig = {
    name: sanitizeText(pet.name, LIMITS.petName).trim(),
    species,
    // Before v3 a pet always had a morning and an evening block.
    routine: isRecord(pet.routine) ? sanitizeRoutine(pet.routine) : defaultRoutine(species),
  };
  const workConfig = {
    startTime: isValidTime(work.startTime) ? work.startTime : base.work.startTime,
    endTime: isValidTime(work.endTime) ? work.endTime : base.work.endTime,
    // Before v3 work happened every day; keep that for migrated data.
    days: Array.isArray(work.days) ? sanitizeWeekdays(work.days) : Array.isArray(raw.exercises) ? base.work.days : ALL_DAYS,
  };
  const exercises = Array.isArray(raw.exercises) ? sanitizeExercises(raw.exercises) : 'sportSchedule' in raw || 'sportPreference' in raw ? legacyExercises(raw) : base.exercises;

  const rewardIds = new Set<string>();
  const customRewards = (Array.isArray(raw.customRewards) ? raw.customRewards : [])
    .map(sanitizeReward)
    .filter((r): r is Reward => r !== null && !rewardIds.has(r.id) && !!rewardIds.add(r.id))
    .slice(0, LIMITS.rewards);

  return {
    ...base,
    schemaVersion: base.schemaVersion,
    screen: oneOf(raw.screen, ['setup', 'onboarding', 'app'] as const, base.screen),
    obStep: int(raw.obStep, 0, 0, 3),
    pet: petConfig,
    struggle: { label: sanitizeText(struggle.label, LIMITS.struggle).trim() },
    checkinFrequency: oneOf(raw.checkinFrequency, ['once', 'few'] as const, base.checkinFrequency),
    language: oneOf(raw.language, ['auto', 'en', 'pt'] as const, base.language),
    theme: oneOf(raw.theme, ['auto', 'light', 'dark'] as const, base.theme),
    dayStart,
    work: workConfig,
    exercises,
    customLaunchpadTasks: textList(raw.customLaunchpadTasks, LIMITS.launchpadTask, LIMITS.launchpadTasks),
    customRewards,
    tornadoSkips: int(raw.tornadoSkips, 0, 0, 999),
    tab: oneOf(raw.tab, ['today', 'quests', 'stats', 'pet', 'settings'] as const, base.tab),
    today,
    energy,
    order: order.length > 0 ? order : orderFor(energy, applicableBlocks({ pet: petConfig, work: workConfig, exercises }, today), focusEarly),
    blockStatus: blockRecord(raw.blockStatus, (v) => (BLOCK_STATUSES.includes(v as BlockStatus) ? (v as BlockStatus) : undefined)),
    blockXp: blockRecord(raw.blockXp, (v) => (typeof v === 'number' && Number.isFinite(v) ? int(v, 0, 0, 10_000) : undefined)),
    blockResistance: blockRecord(raw.blockResistance, (v) => (typeof v === 'number' && Number.isFinite(v) ? int(v, 3, 1, 5) : undefined)),
    focusWorked: typeof raw.focusWorked === 'boolean' ? raw.focusWorked : null,
    energyAfterFocus: energyOrNull(raw.energyAfterFocus),
    xp: int(raw.xp, base.xp, 0, xpToNext - 1),
    level: int(raw.level, base.level, 1, 10_000),
    xpToNext,
    gold: int(raw.gold, base.gold, 0, 1_000_000_000),
    streak: int(raw.streak, base.streak, 0, 1_000_000),
    momentum: int(raw.momentum, base.momentum, 0, 1_000_000),
    claimedRewards: textList(raw.claimedRewards, LIMITS.id, LIMITS.claimedRewards),
    history: sanitizeHistory(raw.history),
    focusEarly,
    insights: sanitizeInsights(raw.insights),
    currentInsight: INSIGHT_IDS.includes(raw.currentInsight as InsightId) ? (raw.currentInsight as InsightId) : null,
    lastBackupAt: timestamp(raw.lastBackupAt) ?? null,
    activeFlow: sanitizeFlow(raw.activeFlow),
    toast: null,
  };
}

export type BackupErrorCode = 'tooLarge' | 'notJson' | 'invalid';

export class BackupError extends Error {
  constructor(public readonly code: BackupErrorCode) {
    super(code);
    this.name = 'BackupError';
  }
}

/** Parses a user-supplied backup. Throws a BackupError when it is not an Anchor backup. */
export function parseBackup(text: string, base: AppState): AppState {
  if (text.length > LIMITS.backupBytes) throw new BackupError('tooLarge');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError('notJson');
  }
  if (!isRecord(parsed) || typeof parsed.today !== 'string' || !DATE_KEY_RE.test(parsed.today) || typeof parsed.streak !== 'number') {
    throw new BackupError('invalid');
  }
  return sanitizeState(parsed, base);
}
