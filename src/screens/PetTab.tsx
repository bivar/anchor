import { useStore } from '../state/store';
import { Icon } from '../components/Icon';
import { petCopy } from '../state/constants';
import { insightText } from '../lib/insights';
import { useTodayList } from '../lib/today';
import { routineSummary } from '../components/AnchorEditors';

export function PetTab() {
  const { state, dispatch, m } = useStore();
  const y = m.you;
  const pc = petCopy(state.pet, m);
  const { meta } = useTodayList(state, m);
  const mood = state.streak >= 5 ? pc.moodGood : pc.moodNeutral;
  const routine = pc.hasPet ? routineSummary(state.pet.routine, m) : '';

  return (
    <div className="fade-in stack">
      <div className="card elev-sm" style={{ alignItems: 'center', textAlign: 'center', gap: 'var(--space-2)', padding: 'var(--space-6) var(--space-3)' }}>
        <div className="icon-badge" style={{ width: 96, height: 96 }}>
          <Icon name={pc.hasPet ? pc.iconName : 'star'} size={44} />
        </div>
        <h2 className="card-title" style={{ margin: 0 }}>{pc.hasPet ? pc.displayName : y.you}</h2>
        <p className="card-body">{mood}</p>
        {routine && <p className="card-body" style={{ fontSize: 12 }}>{routine}</p>}
      </div>

      <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => dispatch({ type: 'SET_TAB', tab: 'stats' })}>
        <Icon name="chart" size={16} />
        {y.seeStats}
      </button>

      <div className="hr" style={{ margin: 'var(--space-1) 0' }} />
      <section aria-labelledby="noticed-title" className="stack-sm">
        <h3 id="noticed-title" className="card-kicker section-kicker">{y.noticed}</h3>
        {state.insights.length === 0 && <p className="card-body">{y.nothingYet}</p>}
        <ul className="plain-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {state.insights.map((ins) => (
            <li key={`${ins.id}-${ins.date}`} className="card insight-card">
              <div style={{ flex: 'none', paddingTop: 1 }}>
                <Icon name="bulb" size={16} color="var(--color-accent-2-700)" />
              </div>
              <p className="card-body">{insightText(m, ins, (id) => meta[id].label)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
