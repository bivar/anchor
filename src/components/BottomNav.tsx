import { useStore } from '../state/store';
import type { Tab } from '../state/types';
import { Icon, type IconName } from './Icon';
import { petCopy } from '../state/constants';

export function BottomNav() {
  const { state, dispatch, m } = useStore();
  const pc = petCopy(state.pet, m);
  const items: { key: Tab; label: string; iconName: IconName }[] = [
    { key: 'today', label: m.nav.today, iconName: 'home' },
    { key: 'quests', label: m.nav.quests, iconName: 'star' },
    { key: 'stats', label: m.nav.stats, iconName: 'chart' },
    { key: 'pet', label: pc.hasPet ? pc.displayName : m.nav.you, iconName: pc.hasPet ? pc.iconName : 'heart' },
    { key: 'settings', label: m.nav.settings, iconName: 'gear' },
  ];
  return (
    <nav className="bottom-nav" aria-label={m.nav.label}>
      {items.map((item) => {
        const active = state.tab === item.key;
        return (
          <button
            key={item.key}
            className={active ? 'active' : ''}
            aria-current={active ? 'page' : undefined}
            onClick={() => dispatch({ type: 'SET_TAB', tab: item.key })}
          >
            <Icon name={item.iconName} size={20} color={active ? 'var(--color-accent-700)' : 'var(--color-neutral-600)'} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
