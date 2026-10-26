import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import type { PetSpecies } from '../state/types';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/pickers';
import { DayStartField, ExerciseEditor, PetRoutineEditor, WorkEditor, boundaryLabel } from '../components/AnchorEditors';
import { defaultRoutine, petCopy } from '../state/constants';
import { LIMITS } from '../state/sanitize';
import type { SetupConfig } from '../state/reducer';

const SPECIES_OPTIONS: PetSpecies[] = ['dog', 'cat', 'other', 'none'];
const STEPS = 4;

/** First run: pet & routine → the day's fixed anchors → movement → the focus struggle. */
export function Setup() {
  const { state, dispatch, m } = useStore();
  const st = m.setup;
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<SetupConfig>(() => ({
    pet: { ...state.pet, name: '' },
    struggle: { label: '' },
    dayStart: state.dayStart,
    work: state.work,
    exercises: state.exercises,
  }));
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the new step's heading so screen readers announce it.
  useEffect(() => {
    if (step > 0) headingRef.current?.focus();
  }, [step]);

  const { pet } = draft;
  const needsName = pet.species !== 'none';
  const petName = petCopy(pet, m).displayName;
  const canContinue = step === 0 ? !needsName || pet.name.trim().length > 0 : step === 3 ? draft.struggle.label.trim().length > 0 : true;

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (!canContinue) return;
    if (step < STEPS - 1) setStep(step + 1);
    else dispatch({ type: 'COMPLETE_SETUP', setup: draft });
  }

  function setSpecies(species: PetSpecies) {
    setDraft({ ...draft, pet: { ...pet, species, routine: defaultRoutine(species) } });
  }

  return (
    <form className="setup-screen fade-in" onSubmit={next} key={step}>
      <div className="ob-dots" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step + 1} aria-label={st.progress(step + 1, STEPS)}>
        {Array.from({ length: STEPS }, (_, i) => (
          <div key={i} className={`ob-dot${i <= step ? ' active' : ''}`} />
        ))}
      </div>

      {step === 0 && (
        <>
          <div className="icon-badge">
            <Icon name="paw" size={38} color="var(--color-accent-700)" />
          </div>
          <h1 style={{ fontSize: 26, margin: 0 }}>{st.title}</h1>
          <p className="card-body" style={{ fontSize: 14 }}>{st.subtitle}</p>

          <div className="field">
            <span className="field-label">{st.petQuestion}</span>
            <Segmented
              name="species"
              label={st.petQuestion}
              value={pet.species}
              stretch
              options={SPECIES_OPTIONS.map((opt) => ({ value: opt, label: m.species[opt] }))}
              onChange={setSpecies}
            />
          </div>

          {needsName && (
            <>
              <div className="field fade-in">
                <label htmlFor="setup-pet-name">{st.petName}</label>
                <input
                  id="setup-pet-name"
                  className="input"
                  value={pet.name}
                  maxLength={LIMITS.petName}
                  autoComplete="off"
                  placeholder={st.petPlaceholder[pet.species]}
                  onChange={(e) => setDraft({ ...draft, pet: { ...pet, name: e.target.value } })}
                />
              </div>
              <div className="field fade-in">
                <span className="field-label">{st.petRoutineTitle(petName)}</span>
                <p className="card-body" style={{ fontSize: 12, marginBottom: 6 }}>{st.petRoutineHint}</p>
                <PetRoutineEditor routine={pet.routine} petName={petName} m={m} onChange={(routine) => setDraft({ ...draft, pet: { ...pet, routine } })} />
              </div>
            </>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <h1 ref={headingRef} tabIndex={-1} style={{ fontSize: 26, margin: 0 }}>{st.dayTitle}</h1>
          <p className="card-body" style={{ fontSize: 14 }}>{st.daySubtitle}</p>
          <DayStartField
            value={draft.dayStart}
            label={st.dayStart}
            hint={st.dayStartHint(boundaryLabel(draft.dayStart))}
            onChange={(dayStart) => dayStart && setDraft({ ...draft, dayStart })}
          />
          <WorkEditor
            work={draft.work}
            m={m}
            locale={m.locale}
            daysLabel={st.workDays}
            hoursLabel={st.workHours}
            onChange={(patch) => setDraft({ ...draft, work: { ...draft.work, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== '')) } })}
          />
        </>
      )}

      {step === 2 && (
        <>
          <h1 ref={headingRef} tabIndex={-1} style={{ fontSize: 26, margin: 0 }}>{st.movementTitle}</h1>
          <p className="card-body" style={{ fontSize: 14 }}>{st.movementSubtitle}</p>
          <ExerciseEditor exercises={draft.exercises} m={m} locale={m.locale} onChange={(exercises) => setDraft({ ...draft, exercises })} />
        </>
      )}

      {step === 3 && (
        <>
          <h1 ref={headingRef} tabIndex={-1} style={{ fontSize: 26, margin: 0 }}>{st.focusTitle}</h1>
          <div className="field">
            <label htmlFor="setup-struggle">{st.struggle}</label>
            <input
              id="setup-struggle"
              className="input"
              value={draft.struggle.label}
              maxLength={LIMITS.struggle}
              autoComplete="off"
              placeholder={st.strugglePlaceholder}
              aria-describedby="setup-struggle-hint"
              onChange={(e) => setDraft({ ...draft, struggle: { label: e.target.value } })}
            />
            <p id="setup-struggle-hint" className="card-body" style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>
              {st.struggleHint}
            </p>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'auto' }}>
        {step > 0 && (
          <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>
            {m.common.back}
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 0, flex: 1 }} disabled={!canContinue}>
          {step === STEPS - 1 ? st.finish : st.continue}
        </button>
      </div>
    </form>
  );
}
