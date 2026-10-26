import { useStore, fmtClock } from '../state/store';
import { Icon } from '../components/Icon';
import { FlowOverlay } from '../components/FlowOverlay';
import { haptic } from '../platform/haptics';
import { requestNotifications } from '../platform/notify';

export function TornadoFlow() {
  const { state, dispatch, m } = useStore();
  const f = state.activeFlow;
  if (!f || f.type !== 'tornado') return null;
  const t = m.tornado;

  function toggle(i: number) {
    haptic('light');
    dispatch({ type: 'TOGGLE_TORNADO_TASK', i });
  }

  function start() {
    void requestNotifications();
    dispatch({ type: 'START_TORNADO' });
  }

  function finishNow() {
    haptic('success');
    dispatch({ type: 'FINISH_TORNADO' });
  }

  return (
    <FlowOverlay labelledBy="tornado-title">
      {f.phase === 'intro' && (
        <>
          <div className="flow-center">
            <Icon name="broom" size={44} color="var(--color-accent)" className="center-icon" />
            <h2 id="tornado-title" style={{ margin: 0 }}>{t.title}</h2>
            <p className="card-body">{t.intro}</p>
            <ul className="plain-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
              {f.tasks.map((task, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>• {task.label}</span>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: '2px 6px', textDecoration: 'underline' }}
                    aria-label={t.swapLabel(task.label)}
                    onClick={() => dispatch({ type: 'REROLL_TORNADO_TASK', i })}
                  >
                    {t.swap}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 0 }} onClick={start}>
            {t.start}
          </button>
        </>
      )}

      {f.phase === 'running' && (
        <>
          <div style={{ textAlign: 'center', margin: 'var(--space-3) 0' }}>
            <h2 id="tornado-title" className="visually-hidden">{t.title}</h2>
            <div className="timer-medium" role="timer" aria-label={m.focus.timerLabel}>{fmtClock(f.seconds)}</div>
            <button className="btn btn-ghost" style={{ fontSize: 13, padding: '4px 10px', marginTop: 4 }} onClick={() => dispatch({ type: 'TOGGLE_PAUSE_FLOW' })}>
              {f.paused ? `▶ ${m.focus.resume}` : `⏸ ${m.focus.pause}`}
            </button>
          </div>
          <ul className="plain-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: 1 }}>
            {f.tasks.map((task, i) => (
              <li key={i}>
                <button className={`checklist-item${task.done ? ' done' : ''}`} role="checkbox" aria-checked={task.done} onClick={() => toggle(i)}>
                  <div className={`checklist-dot${task.done ? ' done' : ''}`}>{task.done && <Icon name="check" size={13} color="var(--color-bg)" />}</div>
                  <div className={`checklist-label${task.done ? ' done' : ''}`} style={{ fontSize: 14 }}>
                    {task.label}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <button className="btn btn-secondary btn-block" onClick={finishNow}>
            {t.finish}
          </button>
        </>
      )}

      {f.phase === 'done' && (
        <>
          <div className="flow-center">
            <Icon name="star" size={44} color="var(--color-accent)" className="center-icon" />
            <h2 id="tornado-title" style={{ margin: 0 }}>{t.doneTitle}</h2>
            <p className="card-body">{t.doneBody}</p>
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 0 }} onClick={() => dispatch({ type: 'CLOSE_FLOW' })}>
            {m.common.done}
          </button>
        </>
      )}
    </FlowOverlay>
  );
}
