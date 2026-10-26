import type { IconName } from '../components/Icon';

export type EnergyLevel = 'low' | 'medium' | 'high';

export type PetSpecies = 'dog' | 'cat' | 'other' | 'none';

export type PetActivityKind = 'walk' | 'play' | 'feed' | 'cuddle' | 'groom' | 'train';
/** The three moments a pet anchor can sit in: before work, right after work, and in the evening. */
export type PetSlot = 'morning' | 'afterWork' | 'evening';
export type PetRoutine = Record<PetSlot, PetActivityKind | null>;

export interface PetConfig {
  name: string;
  species: PetSpecies;
  routine: PetRoutine;
}

export interface StruggleConfig {
  /** The thing the user is avoiding right now — e.g. "Finish my thesis". */
  label: string;
}

export interface WorkConfig {
  startTime: string; // HH:mm, e.g. "09:00"
  endTime: string;   // HH:mm, e.g. "17:00"
  days: number[];    // 0=Sun … 6=Sat; days without work have no work/bridge blocks
}

/** One kind of exercise and the weekdays it happens on (its "times per week"). A day holds at most one exercise. */
export interface Exercise {
  id: string;
  name: string;    // e.g. "Gym", "Pilates", "Running"
  days: number[];  // 0=Sun … 6=Sat
}

export type CheckinFrequency = 'once' | 'few';
export type LanguagePref = 'auto' | 'en' | 'pt';
export type ThemePref = 'auto' | 'light' | 'dark';

export type BlockId =
  | 'launchpad'
  | 'petAM'
  | 'work'
  | 'petMid'
  | 'bridge'
  | 'focus'
  | 'sport'
  | 'petPM'
  | 'tornado'
  | 'winddown';

export type BlockStatus = 'pending' | 'done' | 'skipped';

export interface Reward {
  id: string;
  label: string;
  desc: string;
  cost: number;
  iconName: IconName;
  isCustom?: boolean;
}

export interface DaySummary {
  today: string;
  energy: EnergyLevel | null;
  completedBlocks: BlockId[];
  skippedBlocks: BlockId[];
  xpEarned: number;
  success: boolean;
  /** True when the app was not opened at all that day. */
  missed?: boolean;
  /** Every block that was on the plan that day (absent in data recorded before schema v3). */
  plannedBlocks?: BlockId[];
  focusResistance?: number | null;
  focusWorked?: boolean | null;
  energyAfterFocus?: EnergyLevel | null;
}

export type InsightId =
  | 'energyLow'
  | 'energyHigh'
  | 'focusHeavyToday'
  | 'focusMovedEarlier'
  | 'focusEarlyWorking'
  | 'fiveMinuteWorks'
  | 'lowEnergyWeek'
  | 'oftenSkipped';

export interface Insight {
  id: InsightId;
  date: string;
  block?: BlockId;
}

export type ToastKey =
  | 'reordered'
  | 'skipped'
  | 'logged'
  | 'focusSkipped'
  | 'focusWorked'
  | 'focusLogged'
  | 'liftoff'
  | 'tornadoDone'
  | 'passAdded'
  | 'claimed'
  | 'passUsed'
  | 'rewardCreated'
  | 'rewardUpdated'
  | 'rewardDeleted'
  | 'energyUpdated'
  | 'backupRestored';

export type Flow =
  | { type: 'log'; blockId: BlockId; step: 'resistance' | 'energy'; resistance: number | null }
  | {
      type: 'focus';
      phase: 'threshold' | 'timer' | 'checkpoint' | 'running' | 'debrief';
      resistance: number | null;
      seconds: number;
      targetTimestamp?: number;
      /** When the open-ended "keep going" phase started (ms epoch). */
      runningSince?: number;
      elapsed: number;
      paused?: boolean;
      worked?: boolean;
    }
  | { type: 'launchpad'; tasks: string[]; done: boolean[] }
  | {
      type: 'tornado';
      phase: 'intro' | 'running' | 'done';
      seconds: number;
      targetTimestamp?: number;
      paused?: boolean;
      tasks: { label: string; done: boolean }[];
    };

export interface Toast {
  key: ToastKey;
  xp: number | null;
  token: number;
}

export type Screen = 'setup' | 'onboarding' | 'app';
export type Tab = 'today' | 'quests' | 'stats' | 'pet' | 'settings';

export interface AppState {
  schemaVersion: number;
  screen: Screen;
  obStep: number;

  pet: PetConfig;
  struggle: StruggleConfig;
  checkinFrequency: CheckinFrequency;
  language: LanguagePref;
  theme: ThemePref;

  /** HH:mm when the user's day begins (wake-up). Also sets when a new day starts: 3 h earlier, between 00:00 and 05:00. */
  dayStart: string;
  work: WorkConfig;
  exercises: Exercise[];
  customLaunchpadTasks: string[];
  customRewards: Reward[];
  tornadoSkips: number;

  tab: Tab;
  today: string; // YYYY-MM-DD, the day the current "today" state belongs to

  energy: EnergyLevel | null;
  order: BlockId[];
  blockStatus: Partial<Record<BlockId, BlockStatus>>;
  blockXp: Partial<Record<BlockId, number>>;
  blockResistance: Partial<Record<BlockId, number>>;
  focusWorked: boolean | null;
  energyAfterFocus: EnergyLevel | null;

  xp: number;
  level: number;
  xpToNext: number;
  gold: number;
  streak: number;
  momentum: number;
  claimedRewards: string[];

  history: Record<string, DaySummary>;

  /** Learned from history: put the focus block right after work on medium-energy days. */
  focusEarly: boolean;
  insights: Insight[];
  currentInsight: InsightId | null;

  lastBackupAt: number | null;

  activeFlow: Flow | null;
  toast: Toast | null;
}
