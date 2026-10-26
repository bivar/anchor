import { useStore, fmtClock } from '../state/store';
import { Icon } from '../components/Icon';
import { FlowOverlay } from '../components/FlowOverlay';
import { ResistancePicker, EnergyPicker } from '../components/pickers';
import { FIVE_MIN_SECONDS } from '../state/constants';
import { haptic } from '../platform/haptics';
import { requestNotifications } from '../platform/notify';
import type { EnergyLevel } from '../state/types';

export function FocusFlow() {
  const { state, dispatch, m } = useStore();
  const f = state.activeFlow;
  if (!f || f.type !== 'focus') return null;
  const t = m.focus;

  function step(type: 'KEEP_GOING' | 'STOP_HERE' | 'WRAP_UP') {
    haptic('medium');
    dispatch({ type });
  }

  function startTimer() {
    // Asked here, from the tap, so the browser treats it as a user-initiated request.
    void requestNotifications();
    dispatch({ type: 'START_FIVEMIN_TIMER' });
  }

  function handleFinishFocus(level: EnergyLevel) {
    haptic('success');
    dispatch({ type: 'FINISH_FOCUS', energyAfter: level });
  }

  return (
    <FlowOverlay labelledBy="focus-title">
      {f.phase === 'threshold' && (
        <>
          <div className="flow-center">
            <Icon name="book" size={44} color="var(--color-accent)" />
            <h2 id="focus-title" style={{ margin: 0 }}>{t.thresholdTitle}</h2>
            <ResistancePicker selected={f.resistance} onSelect={(n) => dispatch({ type: 'SET_RESISTANCE', n })} />
            <p className="card-body" style={{ fontSize: 12 }}>{t.scaleHint}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <button className="btn btn-primary btn-block" style={{ marginTop: 0 }} disabled={!f.resistance} onClick={startTimer}>
              {t.start}
            </button>
            <button className="btn btn-ghost" style={{ alignSelf: 'center' }} onClick={() => dispatch({ type: 'NOT_FEELING_IT' })}>
              {t.notToday}
            </button>
          </div>
        </>
      )}

      {f.phase === 'timer' && (
        <div className="flow-center">
          <h2 id="focus-title" className="visually-hidden">{t.timerLabel}</h2>
          <div className="timer-big" role="timer" aria-label={t.timerLabel}>{fmtClock(f.seconds)}</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.round(((FIVE_MIN_SECONDS - f.seconds) / FIVE_MIN_SECONDS) * 100)}%` }} />
          </div>
          <p className="card-body" aria-live="polite">
            {f.paused ? t.paused : f.seconds > 240 ? t.begin : f.seconds > 60 ? t.doing : t.almost}
          </p>
          <button className="btn btn-secondary" style={{ alignSelf: 'center', marginTop: 'var(--space-2)' }} onClick={() => dispatch({ type: 'TOGGLE_PAUSE_FLOW' })}>
            {f.paused ? t.resume : t.pause}
          </button>
        </div>
      )}

      {f.phase === 'checkpoint' && (
        <>
          <div className="flow-center">
            <Icon name="check" size={44} color="var(--color-accent-2)" />
            <h2 id="focus-title" style={{ margin: 0 }}>{t.doneTitle}</h2>
            <p className="card-body">{t.whatNow}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <button className="btn btn-primary btn-block" style={{ marginTop: 0 }} onClick={() => step('KEEP_GOING')}>
              {t.keepGoing}
            </button>
            <button className="btn btn-secondary btn-block" onClick={() => step('STOP_HERE')}>
              {t.enough}
            </button>
          </div>
        </>
      )}

      {f.phase === 'running' && (
        <>
          <div className="flow-center">
            <div className="tag tag-accent-2" style={{ alignSelf: 'center' }}>{t.zone}</div>
            <h2 id="focus-title" className="visually-hidden">{t.zone}</h2>
            <div className="timer-medium" role="timer">{fmtClock(f.elapsed || 0)}</div>
            <p className="card-body">{t.noRush}</p>
          </div>
          <button className="btn btn-secondary btn-block" style={{ marginTop: 0 }} onClick={() => step('WRAP_UP')}>
            {t.wrapUp}
          </button>
        </>
      )}

      {f.phase === 'debrief' && (
        <div className="flow-center">
          <h2 id="focus-title" style={{ margin: 0 }}>{t.energyNow}</h2>
          <EnergyPicker onSelect={handleFinishFocus} />
        </div>
      )}
    </FlowOverlay>
  );
}
