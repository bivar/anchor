import type { IconName } from '../components/Icon';
import type { Messages } from '../i18n';
import type { BlockId, EnergyLevel, Exercise, PetActivityKind, PetConfig, PetRoutine, PetSlot, PetSpecies, Reward, WorkConfig } from './types';

export const todayKey = (d = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return todayKey(d);
}

/** Whole calendar days from a to b (DST-safe because both are local midnights rounded). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86_400_000);
}

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Hour at which a new day begins: 3 h before the user's start of day, kept between 00:00 and 05:00,
 * so a late night still counts as the same day and an early riser never sees yesterday.
 */
export function dayBoundaryHour(dayStart: string): number {
  return Math.min(5, Math.max(0, Math.floor(minutesOf(dayStart) / 60) - 3));
}

/** The calendar day the user is living in right now (before the boundary hour it is still "yesterday"). */
export function logicalTodayKey(dayStart: string, now = new Date()): string {
  return todayKey(new Date(now.getTime() - dayBoundaryHour(dayStart) * 3_600_000));
}

export function weekdayOf(key: string): number {
  return parseDateKey(key).getDay();
}

export function weekdayName(locale: string, d = new Date()): string {
  const name = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Short localized names for weekday indexes (0 = Sunday), e.g. "Tue, Thu". */
export function formatWeekdays(days: number[], locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  // 2023-01-01 was a Sunday.
  return [...days]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((d) => fmt.format(new Date(2023, 0, 1 + d)).replace('.', ''))
    .join(', ');
}

/** The exercise planned for a given day, if any (a day holds at most one). */
export function exerciseFor(exercises: Exercise[], key: string): Exercise | null {
  const day = weekdayOf(key);
  return exercises.find((e) => e.days.includes(day)) ?? null;
}

export function isWorkDay(work: WorkConfig, key: string): boolean {
  return work.days.includes(weekdayOf(key));
}

export const PET_SLOTS: readonly PetSlot[] = ['morning', 'afterWork', 'evening'];
export const PET_ACTIVITY_KINDS: readonly PetActivityKind[] = ['walk', 'play', 'feed', 'cuddle', 'groom', 'train'];
export const PET_SLOT_BLOCK: Record<PetSlot, BlockId> = { morning: 'petAM', afterWork: 'petMid', evening: 'petPM' };

export function defaultRoutine(species: PetSpecies): PetRoutine {
  switch (species) {
    case 'dog':
      return { morning: 'walk', afterWork: null, evening: 'walk' };
    case 'cat':
      return { morning: 'feed', afterWork: null, evening: 'play' };
    case 'other':
      return { morning: 'feed', afterWork: null, evening: 'cuddle' };
    default:
      return { morning: null, afterWork: null, evening: null };
  }
}

export const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];
export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'ex-gym', name: 'Gym', days: [1, 3, 5] },
  { id: 'ex-pilates', name: 'Pilates', days: [2, 4] },
];

export interface DayConfig {
  pet: PetConfig;
  work: WorkConfig;
  exercises: Exercise[];
}

/** The blocks that exist on a given day, given the user's anchors. */
export function applicableBlocks(cfg: DayConfig, key: string): Set<BlockId> {
  const blocks = new Set<BlockId>(['launchpad', 'focus', 'tornado', 'winddown']);
  if (cfg.pet.species !== 'none') {
    for (const slot of PET_SLOTS) if (cfg.pet.routine[slot]) blocks.add(PET_SLOT_BLOCK[slot]);
  }
  if (isWorkDay(cfg.work, key)) {
    blocks.add('work');
    blocks.add('bridge');
  }
  if (exerciseFor(cfg.exercises, key)) blocks.add('sport');
  return blocks;
}

export interface PetCopy {
  hasPet: boolean;
  displayName: string;
  iconName: 'paw' | 'heart';
  launchpadItem: string;
  moodGood: string;
  moodNeutral: string;
}

export function petCopy(pet: Pick<PetConfig, 'name' | 'species'>, m: Messages): PetCopy {
  const name = pet.name.trim() || m.pet.fallbackName;
  if (pet.species === 'none') {
    return { hasPet: false, displayName: name, iconName: 'heart', ...m.pet.none };
  }
  return {
    hasPet: true,
    displayName: name,
    iconName: pet.species === 'other' ? 'heart' : 'paw',
    launchpadItem: m.pet.launchpadItem[pet.species](name),
    moodGood: pet.species === 'dog' ? m.pet.moodGoodDog(name) : m.pet.moodGood(name),
    moodNeutral: m.pet.moodNeutral(name),
  };
}

const PET_ACTIVITY_ICON: Record<PetActivityKind, IconName> = { walk: 'paw', play: 'star', feed: 'heart', cuddle: 'heart', groom: 'heart', train: 'paw' };

export interface BlockMeta {
  label: string;
  iconName: IconName;
  tag: string;
  flow: 'simple' | 'focus' | 'launchpad' | 'tornado';
  skippable: boolean;
  actionLabel: string;
  blurb: string;
}

export function calculateWorkHours(work?: WorkConfig): string {
  if (!work || !work.startTime || !work.endTime) return '8h';
  const [sh, sm] = work.startTime.split(':').map(Number);
  const [eh, em] = work.endTime.split(':').map(Number);
  let totalMin = eh * 60 + em - (sh * 60 + sm);
  if (totalMin < 0) totalMin += 24 * 60;
  const hours = totalMin / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

export function blockMeta(opts: {
  pet: PetConfig;
  struggleLabel: string;
  exerciseName: string | null;
  workConfig: WorkConfig;
  dayStart: string;
  energy: EnergyLevel | null;
  m: Messages;
}): Record<BlockId, BlockMeta> {
  const { m } = opts;
  const pc = petCopy(opts.pet, m);
  const workTimes = `${opts.workConfig.startTime} – ${opts.workConfig.endTime}`;
  const b = m.blocks;
  const petBlock = (slot: PetSlot): BlockMeta => {
    const kind = opts.pet.routine[slot] ?? 'cuddle';
    const activity = m.petActivities[kind];
    return {
      label: activity.label(pc.displayName),
      iconName: PET_ACTIVITY_ICON[kind],
      tag: b.pet.tag,
      flow: 'simple',
      skippable: false,
      actionLabel: b.pet.action,
      blurb: activity.blurb(pc.displayName),
    };
  };
  return {
    launchpad: {
      label: b.launchpad.label,
      iconName: 'rocket',
      tag: b.launchpad.tag,
      flow: 'launchpad',
      skippable: false,
      actionLabel: b.launchpad.action,
      blurb: b.launchpad.blurb(opts.dayStart),
    },
    petAM: petBlock('morning'),
    petMid: petBlock('afterWork'),
    work: {
      label: b.work.label(calculateWorkHours(opts.workConfig)),
      iconName: 'briefcase',
      tag: b.work.tag,
      flow: 'simple',
      skippable: false,
      actionLabel: b.work.action,
      blurb: b.work.blurb(workTimes),
    },
    bridge: { label: b.bridge.label, iconName: 'wind', tag: b.bridge.tag, flow: 'simple', skippable: true, actionLabel: b.bridge.action, blurb: b.bridge.blurb },
    focus: { label: opts.struggleLabel || b.focus.label, iconName: 'book', tag: b.focus.tag, flow: 'focus', skippable: true, actionLabel: b.focus.action, blurb: b.focus.blurb },
    sport: {
      label: opts.exerciseName || b.sport.fallback,
      iconName: 'dumbbell',
      tag: b.sport.tag,
      flow: 'simple',
      skippable: false,
      actionLabel: b.sport.action,
      blurb: b.sport.blurb,
    },
    petPM: petBlock('evening'),
    // Free skip only on low-energy days; otherwise skipping Tornado costs a Skip Pass.
    tornado: { label: b.tornado.label, iconName: 'broom', tag: b.tornado.tag, flow: 'tornado', skippable: opts.energy === 'low', actionLabel: b.tornado.action, blurb: b.tornado.blurb },
    winddown: { label: b.winddown.label, iconName: 'moon', tag: b.winddown.tag, flow: 'simple', skippable: true, actionLabel: b.winddown.action, blurb: b.winddown.blurb },
  };
}

const BASE_ORDERS: Record<EnergyLevel, BlockId[]> = {
  low: ['launchpad', 'petAM', 'work', 'petMid', 'petPM', 'bridge', 'sport', 'focus', 'tornado', 'winddown'],
  medium: ['launchpad', 'petAM', 'work', 'petMid', 'bridge', 'focus', 'sport', 'petPM', 'tornado', 'winddown'],
  high: ['launchpad', 'petAM', 'work', 'petMid', 'focus', 'bridge', 'sport', 'petPM', 'tornado', 'winddown'],
};

/**
 * Today's order for the blocks that exist today. `focusEarly` (learned from history) promotes the
 * high-energy ordering on medium days.
 */
export function orderFor(level: EnergyLevel | null, applicable: ReadonlySet<BlockId>, focusEarly = false): BlockId[] {
  const effective = level === 'medium' || level === null ? (focusEarly ? 'high' : 'medium') : level;
  return BASE_ORDERS[effective].filter((id) => applicable.has(id));
}

export function launchpadTasks(pet: PetConfig, m: Messages): string[] {
  const [first, second, ...rest] = m.launchpadDefaults;
  return Array.from(new Set([first, second, petCopy(pet, m).launchpadItem, ...rest]));
}

export function tornadoTasksFor(pet: PetConfig, m: Messages): string[] {
  const pc = petCopy(pet, m);
  return pc.hasPet ? [...m.tornadoPool, m.tornadoPetTask(pc.displayName)] : m.tornadoPool;
}

export function shuffle<T>(array: readonly T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickTornadoTasks(pet: PetConfig, m: Messages): string[] {
  return shuffle(tornadoTasksFor(pet, m)).slice(0, 3);
}

/** Built-in reward catalog. Labels are localized at render time via `builtInRewards`. */
export const REWARD_CATALOG: { id: string; cost: number; iconName: IconName }[] = [
  { id: 'show', cost: 40, iconName: 'star' },
  { id: 'treat', cost: 60, iconName: 'heart' },
  { id: 'skip', cost: 30, iconName: 'broom' },
  { id: 'takeout', cost: 80, iconName: 'gift' },
  { id: 'sleepin', cost: 50, iconName: 'moon' },
];

export function builtInRewards(m: Messages): Reward[] {
  return REWARD_CATALOG.map((r) => ({ ...r, ...m.quests.builtIn[r.id] }));
}

export const FIVE_MIN_SECONDS = 300;
export const TORNADO_SECONDS = 600;
