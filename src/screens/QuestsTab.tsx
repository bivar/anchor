import { useState } from 'react';
import { useStore } from '../state/store';
import { Icon, type IconName } from '../components/Icon';
import { builtInRewards } from '../state/constants';
import { LIMITS } from '../state/sanitize';
import type { Reward } from '../state/types';

const AVAILABLE_ICONS: IconName[] = ['star', 'gift', 'heart', 'moon', 'flame', 'coin', 'dumbbell', 'book'];

function newRewardId(): string {
  return `custom-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function RewardForm({ initial, onDone }: { initial: Reward | null; onDone: () => void }) {
  const { dispatch, m } = useStore();
  const q = m.quests;
  const [label, setLabel] = useState(initial?.label ?? '');
  const [desc, setDesc] = useState(initial?.desc ?? '');
  const [cost, setCost] = useState(String(initial?.cost ?? 30));
  const [icon, setIcon] = useState<IconName>(initial?.iconName ?? 'gift');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    const reward: Reward = {
      id: initial?.id ?? newRewardId(),
      label: label.trim(),
      desc: desc.trim(),
      cost: Math.min(LIMITS.rewardCostMax, Math.max(LIMITS.rewardCostMin, parseInt(cost, 10) || 30)),
      iconName: icon,
      isCustom: true,
    };
    dispatch(initial ? { type: 'UPDATE_CUSTOM_REWARD', reward } : { type: 'ADD_CUSTOM_REWARD', reward });
    onDone();
  }

  return (
    <form onSubmit={submit} className="card elev-sm fade-in" style={{ gap: 'var(--space-2)' }} aria-labelledby="reward-form-title">
      <h3 id="reward-form-title" style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, margin: 0 }}>
        {initial ? q.editTitle : q.create}
      </h3>
      <input className="input" aria-label={q.namePlaceholder} placeholder={q.namePlaceholder} value={label} maxLength={LIMITS.rewardLabel} onChange={(e) => setLabel(e.target.value)} required />
      <input className="input" aria-label={q.descPlaceholder} placeholder={q.descPlaceholder} value={desc} maxLength={LIMITS.rewardDesc} onChange={(e) => setDesc(e.target.value)} />
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <label htmlFor="reward-cost" style={{ fontSize: 12, fontWeight: 600 }}>{q.cost}</label>
        <input
          id="reward-cost"
          type="number"
          inputMode="numeric"
          className="input"
          style={{ width: 90 }}
          value={cost}
          min={LIMITS.rewardCostMin}
          max={LIMITS.rewardCostMax}
          onChange={(e) => setCost(e.target.value)}
        />
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }} id="reward-icon-label">{q.icon}</div>
        <div role="radiogroup" aria-labelledby="reward-icon-label" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {AVAILABLE_ICONS.map((ic) => (
            <button
              type="button"
              key={ic}
              role="radio"
              aria-checked={icon === ic}
              aria-label={q.iconLabel(ic)}
              className={`resistance-dot sm${icon === ic ? ' selected' : ''}`}
              onClick={() => setIcon(ic)}
            >
              <Icon name={ic} size={16} className="center-icon" />
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 4 }}>
        <button type="button" className="btn btn-secondary" onClick={onDone}>{m.common.cancel}</button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{q.save}</button>
      </div>
    </form>
  );
}

export function QuestsTab() {
  const { state, dispatch, m } = useStore();
  const q = m.quests;
  const [editing, setEditing] = useState<Reward | 'new' | null>(null);
  const allRewards = [...builtInRewards(m), ...state.customRewards];

  return (
    <div className="fade-in stack">
      <h2 style={{ margin: 0, fontSize: 20 }}>{q.title}</h2>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <div className="card elev-sm stat-card">
          <Icon name="flame" size={24} color="var(--color-accent)" />
          <div className="stat-number">{state.streak}</div>
          <div className="card-body" style={{ fontSize: 11 }}>{q.streak}</div>
        </div>
        <div className="card elev-sm stat-card">
          <Icon name="rocket" size={22} />
          <div className="stat-number">{state.momentum}</div>
          <div className="card-body" style={{ fontSize: 11 }}>{q.momentum}</div>
        </div>
      </div>
      <p className="card-body" style={{ fontSize: 12 }}>{q.momentumHint}</p>

      {state.tornadoSkips > 0 && (
        <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-2)', background: 'var(--color-accent-100)' }}>
          <Icon name="broom" size={20} color="var(--color-accent-700)" />
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{q.passes(state.tornadoSkips)}</div>
        </div>
      )}

      <div className="hr" style={{ margin: 'var(--space-1) 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="card-kicker" style={{ paddingLeft: 2, margin: 0, fontFamily: 'inherit' }}>{q.spend}</h3>
        {editing === null && (
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => setEditing('new')}>
            {q.add}
          </button>
        )}
      </div>

      {editing !== null && <RewardForm key={editing === 'new' ? 'new' : editing.id} initial={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}

      <ul className="plain-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {allRewards.map((r) => {
          const isSkip = r.id === 'skip';
          // The Skip Pass and custom rewards can be redeemed again and again.
          const claimed = !isSkip && !r.isCustom && state.claimedRewards.includes(r.id);
          const disabled = claimed || state.gold < r.cost;
          return (
            <li key={r.id} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div className="row reward-icon">
                <Icon name={r.iconName} size={18} color="var(--color-accent-2-700)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{r.label}</div>
                <div className="card-body" style={{ fontSize: 11 }}>{r.desc || q.customDesc}</div>
                {r.isCustom && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                    <button className="btn btn-ghost link-btn" onClick={() => setEditing(r)} aria-label={`${m.common.edit}: ${r.label}`}>
                      {m.common.edit}
                    </button>
                    <button
                      className="btn btn-ghost link-btn"
                      aria-label={`${m.common.delete}: ${r.label}`}
                      onClick={() => window.confirm(q.confirmDelete(r.label)) && dispatch({ type: 'DELETE_CUSTOM_REWARD', id: r.id })}
                    >
                      {m.common.delete}
                    </button>
                  </div>
                )}
              </div>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12 }}
                disabled={disabled}
                aria-label={claimed ? q.claimed : q.redeem(r.label, r.cost)}
                onClick={() => dispatch({ type: 'REDEEM', id: r.id })}
              >
                {claimed ? q.claimed : q.price(r.cost)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
