import { useStore } from '../state/store';
import { Icon } from './Icon';

export function Header() {
  const { state, m } = useStore();
  const xpPct = Math.round((state.xp / state.xpToNext) * 100);
  return (
    <header className="app-header">
      <div className="app-header-row">
        <div className="nav-brand">{m.appName}</div>
        <div className="stat-pill" style={{ marginLeft: 'auto' }} aria-label={m.header.streak(state.streak)}>
          <Icon name="flame" size={14} color="var(--color-accent)" />
          <b aria-hidden="true">{state.streak}</b>
        </div>
        <div className="stat-pill" aria-label={m.header.gold(state.gold)}>
          <Icon name="coin" size={14} color="var(--color-accent-700)" />
          <b aria-hidden="true">{state.gold}</b>
        </div>
      </div>
      <div className="app-header-row">
        <div className="tag tag-accent-2" style={{ fontWeight: 700 }}>
          {m.header.level(state.level)}
        </div>
        <div className="xp-bar-track" role="progressbar" aria-valuemin={0} aria-valuemax={state.xpToNext} aria-valuenow={state.xp} aria-label="XP">
          <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, whiteSpace: 'nowrap' }}>{m.header.xp(state.xp, state.xpToNext)}</div>
      </div>
    </header>
  );
}
