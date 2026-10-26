import { useStore } from '../state/store';
import { Icon } from '../components/Icon';
import { EnergyPicker } from '../components/pickers';
import { weekdayName, launchpadTasks, parseDateKey, pickTornadoTasks } from '../state/constants';
import type { BlockId } from '../state/types';
import { useTodayList } from '../lib/today';
import { insightText } from '../lib/insights';
import { haptic } from '../platform/haptics';

export function TodayTab() {
  const { state, dispatch, m } = useStore();
  const { meta, sportToday, activeBlock, queueBlocks, doneBlocks, allDone } = useTodayList(state, m);
  const t = m.today;

  function startActive(id: BlockId) {
    haptic('medium');
    const flow = meta[id].flow;
    if (flow === 'focus') dispatch({ type: 'OPEN_FOCUS' });
    else if (flow === 'launchpad') {
      const tasks = state.customLaunchpadTasks.length > 0 ? state.customLaunchpadTasks : launchpadTasks(state.pet, m);
      dispatch({ type: 'OPEN_LAUNCHPAD', tasks });
    } else if (flow === 'tornado') dispatch({ type: 'OPEN_TORNADO', tasks: pickTornadoTasks(state.pet, m) });
    else dispatch({ type: 'OPEN_LOG', id });
  }

  function skipActive(id: BlockId) {
    haptic('light');
    dispatch({ type: 'SKIP_BLOCK', id });
  }

  return (
    <div className="fade-in stack">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>{weekdayName(m.locale, parseDateKey(state.today))}</h2>
        <span className="text-muted" style={{ fontSize: 12 }}>{sportToday ? t.sportDay(sportToday) : t.restDay}</span>
      </div>

      {!state.energy && (
        <section className="card elev-sm" style={{ gap: 'var(--space-3)' }} aria-labelledby="checkin-title">
          <div className="card-kicker">{t.checkinKicker}</div>
          <h3 id="checkin-title" className="card-title" style={{ fontSize: 16, margin: 0 }}>{t.checkinTitle}</h3>
          <EnergyPicker onSelect={(level) => dispatch({ type: 'SET_ENERGY', level })} />
          <p className="card-body" style={{ fontSize: 12 }}>{t.checkinHint}</p>
        </section>
      )}

      {state.energy && (
        <button className="btn btn-ghost" style={{ alignSelf: 'flex-start', padding: 0, fontSize: 12 }} onClick={() => dispatch({ type: 'RESET_ENERGY' })}>
          {t.energyChange(m.energy[state.energy])}
        </button>
      )}

      {state.currentInsight && (
        <div className="card fade-in insight-card">
          <div style={{ flex: 'none', paddingTop: 1 }}>
            <Icon name="bulb" size={16} color="var(--color-accent-2-700)" />
          </div>
          <p className="card-body">{insightText(m, { id: state.currentInsight }, (id) => meta[id].label)}</p>
        </div>
      )}

      {activeBlock && (
        <section className="card elev-md pop" style={{ gap: 'var(--space-2)' }} aria-labelledby="up-next-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div className="row-icon-md">
              <Icon name={activeBlock.iconName} size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="card-kicker">{t.upNext}</div>
              <h3 id="up-next-title" className="card-title" style={{ fontSize: 18, margin: 0 }}>{activeBlock.label}</h3>
            </div>
            <div className="tag tag-neutral">{activeBlock.tag}</div>
          </div>
          <p className="card-body">{activeBlock.blurb}</p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => startActive(activeBlock.id)}>
              {activeBlock.actionLabel}
            </button>
            {activeBlock.id === 'tornado' && !activeBlock.skippable && state.tornadoSkips > 0 && (
              <button className="btn btn-secondary" onClick={() => dispatch({ type: 'USE_TORNADO_SKIP' })}>
                {t.usePass(state.tornadoSkips)}
              </button>
            )}
            {activeBlock.skippable && (
              <button className="btn btn-secondary" onClick={() => skipActive(activeBlock.id)}>
                {t.skip}
              </button>
            )}
          </div>
        </section>
      )}

      {state.energy === 'low' && activeBlock?.id === 'tornado' && (
        <div className="card" style={{ border: '1px solid var(--color-divider)' }}>
          <p className="card-body" style={{ fontSize: 12 }}>{t.lowEnergyTornado}</p>
        </div>
      )}

      {queueBlocks.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }} aria-labelledby="then-title">
          <h3 id="then-title" className="card-kicker" style={{ paddingLeft: 2, margin: 0, fontFamily: 'inherit' }}>{t.then}</h3>
          <ul className="plain-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {queueBlocks.map((item) => (
              <li key={item.id} className="row queue-row">
                <div className="row-icon-sm">
                  <Icon name={item.iconName} size={16} />
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                <div className="tag tag-neutral" style={{ fontSize: 10 }}>{item.tag}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {doneBlocks.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }} aria-labelledby="done-title">
          <h3 id="done-title" className="card-kicker" style={{ paddingLeft: 2, margin: 0, fontFamily: 'inherit' }}>{t.doneToday}</h3>
          <ul className="plain-list">
            {doneBlocks.map((item) => (
              <li key={item.id} className="done-row">
                <div style={{ flex: 'none' }}>
                  <Icon name="check" size={14} color="var(--color-accent-2-700)" />
                </div>
                <div style={{ flex: 1, fontSize: 13, textDecoration: item.status === 'done' ? 'line-through' : 'none' }}>{item.label}</div>
                <div style={{ fontSize: 11 }}>{item.status === 'done' ? t.xp(item.xpEarned) : t.skipped}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {allDone && (
        <div className="card elev-sm" style={{ alignItems: 'center', textAlign: 'center', gap: 'var(--space-2)', padding: 'var(--space-6) var(--space-3)' }}>
          <Icon name="star" size={44} color="var(--color-accent)" />
          <div className="card-title">{t.allDoneTitle}</div>
          <p className="card-body">{t.allDoneBody}</p>
        </div>
      )}
    </div>
  );
}
