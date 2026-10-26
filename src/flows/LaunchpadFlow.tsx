import { useStore } from '../state/store';
import { Icon } from '../components/Icon';
import { FlowOverlay } from '../components/FlowOverlay';
import { haptic } from '../platform/haptics';

export function LaunchpadFlow() {
  const { state, dispatch, m } = useStore();
  const f = state.activeFlow;
  if (!f || f.type !== 'launchpad') return null;
  const ready = f.done.every(Boolean);

  function toggle(i: number) {
    haptic('light');
    dispatch({ type: 'TOGGLE_LAUNCH_TASK', i });
  }

  function liftoff() {
    haptic('success');
    dispatch({ type: 'LIFTOFF' });
  }

  return (
    <FlowOverlay labelledBy="launchpad-title">
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-3)' }}>
        <Icon name="rocket" size={44} color="var(--color-accent)" className="center-icon" />
        <h2 id="launchpad-title" style={{ margin: 'var(--space-2) 0 0' }}>{m.launchpad.title}</h2>
      </div>
      <ul className="plain-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: 1 }}>
        {f.tasks.map((label, i) => {
          const done = f.done[i];
          return (
            <li key={i}>
              <button className={`checklist-item${done ? ' done' : ''}`} role="checkbox" aria-checked={done} onClick={() => toggle(i)}>
                <div className={`checklist-dot${done ? ' done' : ''}`}>{done && <Icon name="check" size={13} color="var(--color-bg)" />}</div>
                <div className={`checklist-label${done ? ' done' : ''}`} style={{ fontSize: 14 }}>
                  {label}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {ready && (
        <button className="btn btn-primary btn-block fade-in" style={{ marginTop: 'var(--space-3)' }} onClick={liftoff}>
          {m.launchpad.liftoff}
        </button>
      )}
    </FlowOverlay>
  );
}
