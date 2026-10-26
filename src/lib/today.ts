import type { IconName } from '../components/Icon';
import type { Messages } from '../i18n';
import { blockMeta, exerciseFor } from '../state/constants';
import type { AppState, BlockId } from '../state/types';

export interface TodayBlock {
  id: BlockId;
  label: string;
  tag: string;
  blurb: string;
  iconName: IconName;
  skippable: boolean;
  actionLabel: string;
  status: 'pending' | 'done' | 'skipped';
  xpEarned: number;
}

export function useTodayList(state: AppState, m: Messages): {
  meta: ReturnType<typeof blockMeta>;
  sportToday: string | null;
  list: TodayBlock[];
  activeBlock: TodayBlock | undefined;
  queueBlocks: TodayBlock[];
  doneBlocks: TodayBlock[];
  allDone: boolean;
} {
  const exercise = exerciseFor(state.exercises, state.today);
  const sportToday = exercise ? exercise.name || m.blocks.sport.fallback : null;
  const meta = blockMeta({
    pet: state.pet,
    struggleLabel: state.struggle.label,
    exerciseName: sportToday,
    workConfig: state.work,
    dayStart: state.dayStart,
    energy: state.energy,
    m,
  });
  const list: TodayBlock[] = state.order.map((id) => {
    const bm = meta[id];
    const status = state.blockStatus[id] || 'pending';
    return {
      id,
      label: bm.label,
      tag: bm.tag,
      blurb: bm.blurb,
      iconName: bm.iconName,
      skippable: bm.skippable,
      actionLabel: bm.actionLabel,
      status,
      xpEarned: state.blockXp[id] || 0,
    };
  });
  const activeBlock = list.find((b) => b.status === 'pending');
  const queueBlocks = list.filter((b) => b.status === 'pending' && b !== activeBlock);
  const doneBlocks = list.filter((b) => b.status !== 'pending');
  const allDone = !activeBlock && list.length > 0;
  return { meta, sportToday, list, activeBlock, queueBlocks, doneBlocks, allDone };
}
