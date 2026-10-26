import { messagesFor } from '../i18n';
import {
  DEFAULT_EXERCISES,
  DEFAULT_WORK_DAYS,
  FIVE_MIN_SECONDS,
  REWARD_CATALOG,
  TORNADO_SECONDS,
  addDays,
  applicableBlocks,
  daysBetween,
  defaultRoutine,
  launchpadTasks,
  logicalTodayKey,
  orderFor,
  tornadoTasksFor,
  type DayConfig,
} from './constants';
import { analyzeHistory } from './insights';
import { LIMITS, isValidTime, sanitizeExercises, sanitizeReward, sanitizeRoutine, sanitizeState, sanitizeText, sanitizeWeekdays } from './sanitize';
import type {
  AppState,
  BlockId,
  BlockStatus,
  CheckinFrequency,
  DaySummary,
  EnergyLevel,
  Exercise,
  Flow,
  LanguagePref,
  PetConfig,
  Reward,
  StruggleConfig,
  Tab,
  ThemePref,
  ToastKey,
  WorkConfig,
} from './types';

export const SCHEMA_VERSION = 3;

/** Blocks that can never be skipped for free (Tornado is handled separately: free only on low energy). */
const NOT_SKIPPABLE: ReadonlySet<BlockId> = new Set(['launchpad', 'petAM', 'petMid', 'work', 'sport', 'petPM']);
const MAX_BACKFILLED_MISSED_DAYS = 60;
const DEFAULT_DAY_START = '07:00';

/** Everything the first-run setup collects. */
export interface SetupConfig {
  pet: PetConfig;
  struggle: StruggleConfig;
  dayStart: string;
  work: WorkConfig;
  exercises: Exercise[];
}

function freshDayState(cfg: DayConfig, focusEarly: boolean, today: string) {
  return {
    today,
    energy: null,
    order: orderFor(null, applicableBlocks(cfg, today), focusEarly),
    blockStatus: {},
    blockXp: {},
    blockResistance: {},
    focusWorked: null,
    energyAfterFocus: null,
    currentInsight: null,
  } satisfies Partial<AppState>;
}

/** Today's plan for the current anchors, keeping whatever is already done or skipped. */
function replan(state: AppState, level: EnergyLevel | null = state.energy): BlockId[] {
  return orderFor(level, applicableBlocks(state, state.today), state.focusEarly);
}

export function initialState(): AppState {
  const pet: PetConfig = { name: '', species: 'dog', routine: defaultRoutine('dog') };
  const work: WorkConfig = { startTime: '09:00', endTime: '17:00', days: DEFAULT_WORK_DAYS };
  const exercises = DEFAULT_EXERCISES;
  return {
    schemaVersion: SCHEMA_VERSION,
    screen: 'setup',
    obStep: 0,
    pet,
    struggle: { label: '' },
    checkinFrequency: 'once',
    language: 'auto',
    theme: 'auto',
    dayStart: DEFAULT_DAY_START,
    work,
    exercises,
    customLaunchpadTasks: [],
    customRewards: [],
    tornadoSkips: 0,
    tab: 'today',
    ...freshDayState({ pet, work, exercises }, false, logicalTodayKey(DEFAULT_DAY_START)),
    xp: 0,
    level: 1,
    xpToNext: 150,
    gold: 10,
    streak: 0,
    momentum: 0,
    claimedRewards: [],
    history: {},
    focusEarly: false,
    insights: [],
    lastBackupAt: null,
    activeFlow: null,
    toast: null,
  };
}

export function calculateRollover(state: AppState, now = logicalTodayKey(state.dayStart)): AppState {
  const diffDays = daysBetween(state.today, now);
  const list = state.order;
  const doneBlocks = list.filter((id) => state.blockStatus[id] === 'done');
  const skippedBlocks = list.filter((id) => state.blockStatus[id] === 'skipped');
  const daySuccess = list.length > 0 && doneBlocks.length + skippedBlocks.length === list.length && doneBlocks.length > 0;

  let streak = state.streak;
  if (diffDays === 1) streak = daySuccess ? streak + 1 : 0;
  else if (diffDays > 1) streak = 0;

  const history: Record<string, DaySummary> = {
    ...state.history,
    [state.today]: {
      today: state.today,
      energy: state.energy,
      completedBlocks: doneBlocks,
      skippedBlocks,
      xpEarned: Object.values(state.blockXp).reduce((acc: number, curr) => acc + (curr || 0), 0),
      success: daySuccess,
      plannedBlocks: list,
      focusResistance: state.blockResistance.focus ?? null,
      focusWorked: state.focusWorked,
      energyAfterFocus: state.energyAfterFocus,
    },
  };
  // Record days the app was never opened so history and the week strip show them as missed.
  for (let i = 1; i < Math.min(diffDays, MAX_BACKFILLED_MISSED_DAYS + 1); i++) {
    const key = addDays(state.today, i);
    if (key >= now) break;
    history[key] ??= { today: key, energy: null, completedBlocks: [], skippedBlocks: [], xpEarned: 0, success: false, missed: true };
  }
  const prunedHistory = Object.fromEntries(Object.entries(history).sort(([a], [b]) => a.localeCompare(b)).slice(-LIMITS.historyDays));

  const learned = analyzeHistory(prunedHistory, now, state.focusEarly);
  const newIds = new Set(learned.insights.map((i) => i.id));
  const insights = [...learned.insights, ...state.insights.filter((i) => !newIds.has(i.id))].slice(0, LIMITS.insights);

  return {
    ...state,
    ...freshDayState(state, learned.focusEarly, now),
    history: prunedHistory,
    streak,
    focusEarly: learned.focusEarly,
    insights,
    activeFlow: null,
    toast: null,
  };
}

export type Action =
  | { type: 'COMPLETE_SETUP'; setup: SetupConfig }
  | { type: 'OB_NEXT' }
  | { type: 'OB_BACK' }
  | { type: 'SET_TAB'; tab: Tab }
  | { type: 'SET_ENERGY'; level: EnergyLevel }
  | { type: 'RESET_ENERGY' }
  | { type: 'SKIP_BLOCK'; id: BlockId }
  | { type: 'OPEN_LOG'; id: BlockId }
  | { type: 'SET_LOG_RESISTANCE'; n: number }
  | { type: 'SET_LOG_ENERGY'; level: EnergyLevel }
  | { type: 'OPEN_FOCUS' }
  | { type: 'SET_RESISTANCE'; n: number }
  | { type: 'START_FIVEMIN_TIMER' }
  | { type: 'TOGGLE_PAUSE_FLOW' }
  | { type: 'NOT_FEELING_IT' }
  | { type: 'KEEP_GOING' }
  | { type: 'STOP_HERE' }
  | { type: 'WRAP_UP' }
  | { type: 'FINISH_FOCUS'; energyAfter: EnergyLevel }
  | { type: 'CLOSE_FLOW' }
  | { type: 'OPEN_LAUNCHPAD'; tasks: string[] }
  | { type: 'TOGGLE_LAUNCH_TASK'; i: number }
  | { type: 'LIFTOFF' }
  | { type: 'OPEN_TORNADO'; tasks: string[] }
  | { type: 'START_TORNADO' }
  | { type: 'TOGGLE_TORNADO_TASK'; i: number }
  | { type: 'REROLL_TORNADO_TASK'; i: number }
  | { type: 'FINISH_TORNADO' }
  | { type: 'REDEEM'; id: string }
  | { type: 'USE_TORNADO_SKIP' }
  | { type: 'ADD_CUSTOM_REWARD'; reward: Reward }
  | { type: 'UPDATE_CUSTOM_REWARD'; reward: Reward }
  | { type: 'DELETE_CUSTOM_REWARD'; id: string }
  | { type: 'CHECK_DAY_ROLLOVER' }
  | { type: 'SET_CHECKIN_FREQ'; freq: CheckinFrequency }
  | { type: 'SET_LANGUAGE'; language: LanguagePref }
  | { type: 'SET_THEME'; theme: ThemePref }
  | { type: 'UPDATE_PET'; pet: PetConfig }
  | { type: 'UPDATE_STRUGGLE'; struggle: StruggleConfig }
  | { type: 'UPDATE_WORK'; work: Partial<WorkConfig> }
  | { type: 'SET_EXERCISES'; exercises: Exercise[] }
  | { type: 'SET_DAY_START'; dayStart: string }
  | { type: 'ADD_LAUNCHPAD_TASK'; task: string }
  | { type: 'REMOVE_LAUNCHPAD_TASK'; i: number }
  | { type: 'IMPORT_STATE'; newState: unknown }
  | { type: 'RESTORE_BACKUP'; newState: AppState }
  | { type: 'MARK_BACKUP'; at: number }
  | { type: 'RESET_DAY' }
  | { type: 'RESET_ALL' }
  | { type: 'TICK' }
  | { type: 'HIDE_TOAST'; token: number };

function sanitizePet(pet: PetConfig, trim: boolean): PetConfig {
  const name = sanitizeText(pet.name, LIMITS.petName);
  return { name: trim ? name.trim() : name, species: pet.species, routine: sanitizeRoutine(pet.routine) };
}

function mergeWork(current: WorkConfig, patch: Partial<WorkConfig>): WorkConfig {
  const work = { ...current };
  if (isValidTime(patch.startTime)) work.startTime = patch.startTime;
  if (isValidTime(patch.endTime)) work.endTime = patch.endTime;
  if (patch.days) work.days = sanitizeWeekdays(patch.days);
  return work;
}

function award(state: AppState, baseXp: number, bonus = 0) {
  let xp = state.xp + baseXp + bonus;
  let xpToNext = state.xpToNext;
  let level = state.level;
  while (xp >= xpToNext) {
    xp -= xpToNext;
    level += 1;
    xpToNext = Math.round(xpToNext * 1.18);
  }
  const goldEarned = Math.ceil((baseXp + bonus) / 3);
  return { xp, xpToNext, level, gold: state.gold + goldEarned, earned: baseXp + bonus, goldEarned };
}

function completeBlock(state: AppState, id: BlockId, baseXp: number, bonus = 0) {
  const bx = award(state, baseXp, bonus);
  return {
    xp: bx.xp,
    xpToNext: bx.xpToNext,
    level: bx.level,
    gold: bx.gold,
    blockStatus: { ...state.blockStatus, [id]: 'done' as BlockStatus },
    blockXp: { ...state.blockXp, [id]: bx.earned },
    earned: bx.earned,
  };
}

let toastCounter = 0;
function withToast(key: ToastKey, xp: number | null = null): Pick<AppState, 'toast'> {
  toastCounter += 1;
  return { toast: { key, xp, token: toastCounter } };
}

/** Starts the user's own launchpad list from the defaults, so editing never wipes the defaults out. */
function editableLaunchpad(state: AppState): string[] {
  return state.customLaunchpadTasks.length > 0 ? state.customLaunchpadTasks : launchpadTasks(state.pet, messagesFor(state.language));
}

function completeTornado(state: AppState, f: Extract<Flow, { type: 'tornado' }>): AppState {
  if (state.blockStatus.tornado === 'done') return { ...state, activeFlow: { ...f, phase: 'done', seconds: 0 } };
  const { earned, ...done } = completeBlock(state, 'tornado', 25);
  return { ...state, ...done, activeFlow: { ...f, phase: 'done', seconds: 0, paused: false }, ...withToast('tornadoDone', earned) };
}

function remaining(targetTimestamp: number | undefined, fallback: number): number {
  return targetTimestamp ? Math.max(0, Math.ceil((targetTimestamp - Date.now()) / 1000)) : fallback;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'COMPLETE_SETUP': {
      const { setup } = action;
      const next: AppState = {
        ...state,
        pet: sanitizePet(setup.pet, true),
        struggle: { label: sanitizeText(setup.struggle.label, LIMITS.struggle).trim() },
        dayStart: isValidTime(setup.dayStart) ? setup.dayStart : state.dayStart,
        work: mergeWork(state.work, setup.work),
        exercises: sanitizeExercises(setup.exercises),
        screen: 'onboarding',
        obStep: 0,
      };
      // The day boundary depends on the start of day just chosen.
      return { ...next, today: logicalTodayKey(next.dayStart), order: replan(next) };
    }
    case 'OB_NEXT':
      if (state.obStep >= 3) return { ...state, screen: 'app' };
      return { ...state, obStep: state.obStep + 1 };
    case 'OB_BACK':
      return { ...state, obStep: Math.max(0, state.obStep - 1) };
    case 'SET_TAB':
      return { ...state, tab: action.tab };

    case 'SET_ENERGY': {
      const order = replan(state, action.level);
      const insight = action.level === 'low' ? 'energyLow' : action.level === 'high' ? 'energyHigh' : null;
      return { ...state, energy: action.level, order, currentInsight: insight, ...withToast('reordered') };
    }
    case 'RESET_ENERGY':
      return { ...state, energy: null, currentInsight: null };

    case 'SKIP_BLOCK': {
      if (NOT_SKIPPABLE.has(action.id) || (action.id === 'tornado' && state.energy !== 'low')) return state;
      return {
        ...state,
        blockStatus: { ...state.blockStatus, [action.id]: 'skipped' as BlockStatus },
        blockXp: { ...state.blockXp, [action.id]: 0 },
        ...withToast('skipped'),
      };
    }

    case 'OPEN_LOG':
      return { ...state, activeFlow: { type: 'log', blockId: action.id, step: 'resistance', resistance: null } };
    case 'SET_LOG_RESISTANCE': {
      if (!state.activeFlow || state.activeFlow.type !== 'log') return state;
      return { ...state, activeFlow: { ...state.activeFlow, resistance: action.n, step: 'energy' } };
    }
    case 'SET_LOG_ENERGY': {
      const f = state.activeFlow;
      if (!f || f.type !== 'log') return state;
      const { earned, ...done } = completeBlock(state, f.blockId, 20);
      const next: AppState = {
        ...state,
        ...done,
        blockResistance: f.resistance ? { ...state.blockResistance, [f.blockId]: f.resistance } : state.blockResistance,
        activeFlow: null,
        ...withToast('logged', earned),
      };
      // "After work too" check-ins: the energy logged after work re-plans the rest of the day.
      if (f.blockId === 'work' && state.checkinFrequency === 'few' && action.level !== state.energy) {
        return { ...next, energy: action.level, order: replan(state, action.level), ...withToast('energyUpdated', earned) };
      }
      return next;
    }

    case 'OPEN_FOCUS':
      return { ...state, activeFlow: { type: 'focus', phase: 'threshold', resistance: null, seconds: FIVE_MIN_SECONDS, elapsed: 0 } };
    case 'SET_RESISTANCE': {
      if (!state.activeFlow || state.activeFlow.type !== 'focus') return state;
      return { ...state, activeFlow: { ...state.activeFlow, resistance: action.n } };
    }
    case 'START_FIVEMIN_TIMER': {
      if (!state.activeFlow || state.activeFlow.type !== 'focus') return state;
      return {
        ...state,
        activeFlow: { ...state.activeFlow, phase: 'timer', seconds: FIVE_MIN_SECONDS, targetTimestamp: Date.now() + FIVE_MIN_SECONDS * 1000, paused: false },
      };
    }
    case 'TOGGLE_PAUSE_FLOW': {
      const f = state.activeFlow;
      if (!f) return state;
      if ((f.type === 'focus' && f.phase === 'timer') || (f.type === 'tornado' && f.phase === 'running')) {
        const isPaused = !f.paused;
        const seconds = isPaused ? remaining(f.targetTimestamp, f.seconds) : f.seconds;
        const target = isPaused ? undefined : Date.now() + f.seconds * 1000;
        return { ...state, activeFlow: { ...f, seconds, paused: isPaused, targetTimestamp: target } };
      }
      return state;
    }
    case 'NOT_FEELING_IT': {
      const f = state.activeFlow;
      return {
        ...state,
        blockStatus: { ...state.blockStatus, focus: 'skipped' as BlockStatus },
        blockXp: { ...state.blockXp, focus: 0 },
        blockResistance: f?.type === 'focus' && f.resistance ? { ...state.blockResistance, focus: f.resistance } : state.blockResistance,
        activeFlow: null,
        ...withToast('focusSkipped'),
      };
    }
    case 'KEEP_GOING': {
      if (!state.activeFlow || state.activeFlow.type !== 'focus') return state;
      return { ...state, activeFlow: { ...state.activeFlow, phase: 'running', elapsed: 0, runningSince: Date.now() } };
    }
    case 'STOP_HERE': {
      if (!state.activeFlow || state.activeFlow.type !== 'focus') return state;
      return { ...state, activeFlow: { ...state.activeFlow, phase: 'debrief', worked: false } };
    }
    case 'WRAP_UP': {
      const f = state.activeFlow;
      if (!f || f.type !== 'focus') return state;
      const elapsed = f.runningSince ? Math.max(0, Math.floor((Date.now() - f.runningSince) / 1000)) : f.elapsed;
      return { ...state, activeFlow: { ...f, phase: 'debrief', worked: true, elapsed } };
    }
    case 'FINISH_FOCUS': {
      const f = state.activeFlow;
      if (!f || f.type !== 'focus') return state;
      const worked = !!f.worked;
      const resistance = f.resistance || 3;
      const { earned, ...done } = completeBlock(state, 'focus', 20, worked ? 15 : 0);
      return {
        ...state,
        ...done,
        blockResistance: { ...state.blockResistance, focus: resistance },
        focusWorked: worked,
        energyAfterFocus: action.energyAfter,
        momentum: state.momentum + (worked ? 1 : 0),
        currentInsight: resistance >= 4 ? 'focusHeavyToday' : state.currentInsight,
        activeFlow: null,
        ...withToast(worked ? 'focusWorked' : 'focusLogged', earned),
      };
    }
    case 'CLOSE_FLOW':
      return { ...state, activeFlow: null };

    case 'OPEN_LAUNCHPAD':
      return { ...state, activeFlow: { type: 'launchpad', tasks: action.tasks, done: action.tasks.map(() => false) } };
    case 'TOGGLE_LAUNCH_TASK': {
      const f = state.activeFlow;
      if (!f || f.type !== 'launchpad') return state;
      const done = [...f.done];
      done[action.i] = !done[action.i];
      return { ...state, activeFlow: { ...f, done } };
    }
    case 'LIFTOFF': {
      const f = state.activeFlow;
      if (!f || f.type !== 'launchpad' || !f.done.every(Boolean)) return state;
      const { earned, ...done } = completeBlock(state, 'launchpad', 25);
      return { ...state, ...done, activeFlow: null, ...withToast('liftoff', earned) };
    }

    case 'OPEN_TORNADO':
      return { ...state, activeFlow: { type: 'tornado', phase: 'intro', seconds: TORNADO_SECONDS, tasks: action.tasks.map((l) => ({ label: l, done: false })) } };
    case 'START_TORNADO': {
      if (!state.activeFlow || state.activeFlow.type !== 'tornado') return state;
      return { ...state, activeFlow: { ...state.activeFlow, phase: 'running', targetTimestamp: Date.now() + TORNADO_SECONDS * 1000, paused: false } };
    }
    case 'TOGGLE_TORNADO_TASK': {
      const f = state.activeFlow;
      if (!f || f.type !== 'tornado') return state;
      const tasks = f.tasks.map((t, idx) => (idx === action.i ? { ...t, done: !t.done } : t));
      return { ...state, activeFlow: { ...f, tasks } };
    }
    case 'REROLL_TORNADO_TASK': {
      const f = state.activeFlow;
      if (!f || f.type !== 'tornado') return state;
      const currentLabels = f.tasks.map((t) => t.label);
      const available = tornadoTasksFor(state.pet, messagesFor(state.language)).filter((t) => !currentLabels.includes(t));
      if (available.length === 0) return state;
      const replacement = available[Math.floor(Math.random() * available.length)];
      return { ...state, activeFlow: { ...f, tasks: f.tasks.map((t, idx) => (idx === action.i ? { label: replacement, done: false } : t)) } };
    }
    case 'FINISH_TORNADO': {
      const f = state.activeFlow;
      if (!f || f.type !== 'tornado' || f.phase !== 'running') return state;
      return completeTornado(state, f);
    }

    case 'REDEEM': {
      // Price comes from the catalog, never from the caller.
      const reward = [...REWARD_CATALOG, ...state.customRewards].find((r) => r.id === action.id);
      if (!reward || state.gold < reward.cost) return state;
      const isSkip = reward.id === 'skip';
      const isCustom = state.customRewards.some((r) => r.id === reward.id);
      if (!isSkip && !isCustom && state.claimedRewards.includes(reward.id)) return state;
      return {
        ...state,
        gold: state.gold - reward.cost,
        tornadoSkips: isSkip ? state.tornadoSkips + 1 : state.tornadoSkips,
        claimedRewards: isCustom || isSkip ? state.claimedRewards : [...state.claimedRewards, reward.id],
        ...withToast(isSkip ? 'passAdded' : 'claimed'),
      };
    }

    case 'USE_TORNADO_SKIP': {
      if (state.tornadoSkips <= 0 || state.blockStatus.tornado) return state;
      return {
        ...state,
        tornadoSkips: state.tornadoSkips - 1,
        blockStatus: { ...state.blockStatus, tornado: 'skipped' as BlockStatus },
        blockXp: { ...state.blockXp, tornado: 0 },
        activeFlow: null,
        ...withToast('passUsed'),
      };
    }

    case 'ADD_CUSTOM_REWARD': {
      const reward = sanitizeReward(action.reward);
      if (!reward || state.customRewards.length >= LIMITS.rewards || state.customRewards.some((r) => r.id === reward.id)) return state;
      return { ...state, customRewards: [...state.customRewards, reward], ...withToast('rewardCreated') };
    }
    case 'UPDATE_CUSTOM_REWARD': {
      const reward = sanitizeReward(action.reward);
      if (!reward || !state.customRewards.some((r) => r.id === reward.id)) return state;
      return { ...state, customRewards: state.customRewards.map((r) => (r.id === reward.id ? reward : r)), ...withToast('rewardUpdated') };
    }
    case 'DELETE_CUSTOM_REWARD':
      return { ...state, customRewards: state.customRewards.filter((r) => r.id !== action.id), ...withToast('rewardDeleted') };

    case 'UPDATE_WORK': {
      const next = { ...state, work: mergeWork(state.work, action.work) };
      return { ...next, order: replan(next) };
    }

    case 'SET_EXERCISES': {
      const next = { ...state, exercises: sanitizeExercises(action.exercises, false) };
      return { ...next, order: replan(next) };
    }

    case 'SET_DAY_START':
      return isValidTime(action.dayStart) ? { ...state, dayStart: action.dayStart } : state;

    case 'ADD_LAUNCHPAD_TASK': {
      const task = sanitizeText(action.task, LIMITS.launchpadTask).trim();
      const tasks = editableLaunchpad(state);
      if (!task || tasks.length >= LIMITS.launchpadTasks) return state;
      return { ...state, customLaunchpadTasks: [...tasks, task] };
    }
    case 'REMOVE_LAUNCHPAD_TASK': {
      const tasks = editableLaunchpad(state).filter((_, idx) => idx !== action.i);
      // An empty list would silently fall back to the defaults, so keep at least one item.
      if (tasks.length === 0) return state;
      return { ...state, customLaunchpadTasks: tasks };
    }

    case 'IMPORT_STATE':
      return sanitizeState(action.newState, initialState());
    case 'RESTORE_BACKUP': {
      const restored = sanitizeState(action.newState, initialState());
      const rolled = restored.today !== logicalTodayKey(restored.dayStart) ? calculateRollover(restored) : restored;
      return { ...rolled, ...withToast('backupRestored') };
    }
    case 'MARK_BACKUP':
      return { ...state, lastBackupAt: action.at };

    case 'CHECK_DAY_ROLLOVER': {
      if (state.today === logicalTodayKey(state.dayStart)) return state;
      return calculateRollover(state);
    }

    case 'SET_CHECKIN_FREQ':
      return { ...state, checkinFrequency: action.freq };
    case 'SET_LANGUAGE':
      return { ...state, language: action.language };
    case 'SET_THEME':
      return { ...state, theme: action.theme };
    case 'UPDATE_PET': {
      // Species or routine changes add/remove pet blocks from today's plan.
      const next = { ...state, pet: sanitizePet(action.pet, false) };
      return { ...next, order: replan(next) };
    }
    case 'UPDATE_STRUGGLE':
      return { ...state, struggle: { label: sanitizeText(action.struggle.label, LIMITS.struggle) } };

    case 'RESET_DAY':
      return { ...state, ...freshDayState(state, state.focusEarly, logicalTodayKey(state.dayStart)), activeFlow: null };
    case 'RESET_ALL':
      return { ...initialState(), language: state.language, theme: state.theme };

    case 'TICK': {
      const f = state.activeFlow;
      if (!f) return state;
      if (f.type === 'focus' && f.phase === 'timer') {
        if (f.paused) return state;
        const left = remaining(f.targetTimestamp, f.seconds - 1);
        if (left <= 0) return { ...state, activeFlow: { ...f, phase: 'checkpoint', seconds: 0 } };
        return left === f.seconds ? state : { ...state, activeFlow: { ...f, seconds: left } };
      }
      if (f.type === 'focus' && f.phase === 'running') {
        const elapsed = f.runningSince ? Math.max(0, Math.floor((Date.now() - f.runningSince) / 1000)) : f.elapsed + 1;
        return elapsed === f.elapsed ? state : { ...state, activeFlow: { ...f, elapsed } };
      }
      if (f.type === 'tornado' && f.phase === 'running') {
        if (f.paused) return state;
        const left = remaining(f.targetTimestamp, f.seconds - 1);
        // Running out the clock counts exactly like tapping "Finish now".
        if (left <= 0) return completeTornado(state, f);
        return left === f.seconds ? state : { ...state, activeFlow: { ...f, seconds: left } };
      }
      return state;
    }

    case 'HIDE_TOAST':
      if (state.toast && state.toast.token === action.token) return { ...state, toast: null };
      return state;

    default:
      return state;
  }
}
