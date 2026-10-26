import { useStore } from '../state/store';
import { Icon } from '../components/Icon';
import { calculateWorkHours, formatWeekdays, petCopy } from '../state/constants';
import { exerciseSummary, routineSummary } from '../components/AnchorEditors';

export function Onboarding() {
  const { state, dispatch, m } = useStore();
  const { obStep } = state;
  const ob = m.onboarding;
  const pc = petCopy(state.pet, m);
  const petName = pc.hasPet ? pc.displayName : null;
  const struggleLabel = state.struggle.label || ob.struggleFallback;
  const movement = exerciseSummary(state.exercises, m);

  return (
    <div className="ob-screen">
      <div className="ob-dots" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={obStep + 1} aria-label={ob.progress(obStep + 1, 4)}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`ob-dot${i <= obStep ? ' active' : ''}`} />
        ))}
      </div>

      {obStep === 0 && (
        <div className="fade-in ob-step ob-center">
          <div className="icon-badge">
            <Icon name={pc.hasPet ? pc.iconName : 'star'} size={38} color="var(--color-accent-700)" />
          </div>
          <h1 style={{ fontSize: 30, margin: 0 }}>{ob.hiTitle}</h1>
          <p className="card-body" style={{ fontSize: 15 }}>{ob.hiBody(petName)}</p>
        </div>
      )}

      {obStep === 1 && (
        <div className="fade-in ob-step">
          <h1 style={{ fontSize: 24, margin: 0 }}>{ob.anchorsTitle}</h1>
          <p className="card-body" style={{ margin: 0 }}>{ob.anchorsBody}</p>
          <ul className="plain-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <li className="card anchor-row">
              <Icon name="rocket" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{ob.dayStart}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>{ob.dayStartDetail(state.dayStart)}</div>
              </div>
            </li>
            <li className="card anchor-row">
              <Icon name="briefcase" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{ob.work}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {state.work.days.length > 0
                    ? ob.workDetail(calculateWorkHours(state.work), `${state.work.startTime} – ${state.work.endTime}`, formatWeekdays(state.work.days, m.locale))
                    : ob.noWork}
                </div>
              </div>
            </li>
            {pc.hasPet && routineSummary(state.pet.routine, m) && (
              <li className="card anchor-row">
                <Icon name={pc.iconName} size={18} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{pc.displayName}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{routineSummary(state.pet.routine, m)}</div>
                </div>
              </li>
            )}
            {movement && (
              <li className="card anchor-row">
                <Icon name="dumbbell" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{ob.movement}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{movement}</div>
                </div>
              </li>
            )}
          </ul>
        </div>
      )}

      {obStep === 2 && (
        <div className="fade-in ob-step">
          <h1 style={{ fontSize: 24, margin: 0 }}>{ob.struggleTitle(struggleLabel.toLowerCase())}</h1>
          <p className="card-body" style={{ margin: 0 }}>{ob.struggleBody}</p>
          <div className="card elev-sm" style={{ gap: 'var(--space-2)' }}>
            <div className="card-kicker">{ob.ruleKicker}</div>
            <div className="card-title" style={{ fontSize: 16 }}>{ob.ruleTitle}</div>
            <p className="card-body">{ob.ruleBody}</p>
          </div>
          <p className="card-body" style={{ margin: 0, fontSize: 12 }}>{ob.learnHint}</p>
        </div>
      )}

      {obStep === 3 && (
        <div className="fade-in ob-step ob-center">
          <div className="icon-badge alt pop">
            <Icon name="rocket" size={38} color="var(--color-accent-2-700)" />
          </div>
          <h1 style={{ fontSize: 28, margin: 0 }}>{ob.readyTitle}</h1>
          <p className="card-body">{ob.readyBody(petName)}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'auto' }}>
        {obStep > 0 && (
          <button className="btn btn-secondary" onClick={() => dispatch({ type: 'OB_BACK' })}>
            {m.common.back}
          </button>
        )}
        <button className="btn btn-primary btn-block" style={{ marginTop: 0, flex: 1 }} onClick={() => dispatch({ type: 'OB_NEXT' })}>
          {obStep >= 3 ? ob.go : m.common.next}
        </button>
      </div>
    </div>
  );
}
