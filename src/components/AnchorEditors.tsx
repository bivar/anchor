import { useId } from 'react';
import type { Messages } from '../i18n';
import { PET_ACTIVITY_KINDS, PET_SLOTS, dayBoundaryHour, formatWeekdays } from '../state/constants';
import { LIMITS } from '../state/sanitize';
import type { Exercise, PetActivityKind, PetRoutine, WorkConfig } from '../state/types';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const SPORT_SUGGESTIONS = ['Gym', 'Pilates', 'Yoga', 'Running', 'Swimming', 'Cycling', 'Volleyball', 'Walk', 'Dance'];

export function boundaryLabel(dayStart: string): string {
  return `${String(dayBoundaryHour(dayStart)).padStart(2, '0')}:00`;
}

/** "Walk 2× a day · Play 1× a day" */
export function routineSummary(routine: PetRoutine, m: Messages): string {
  const counts = new Map<PetActivityKind, number>();
  for (const slot of PET_SLOTS) {
    const kind = routine[slot];
    if (kind) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return [...counts].map(([kind, n]) => `${m.petActivities[kind].name} ${m.anchors.perDay(n)}`).join(' · ');
}

/** "Gym 3× a week · Pilates 2× a week" */
export function exerciseSummary(exercises: Exercise[], m: Messages): string {
  return exercises
    .filter((e) => e.days.length > 0)
    .map((e) => `${e.name || m.blocks.sport.fallback} ${e.days.length === 7 ? m.anchors.everyDay : m.anchors.perWeek(e.days.length)}`)
    .join(' · ');
}

export function WeekdayPicker({
  value,
  onChange,
  label,
  locale,
  m,
}: {
  value: number[];
  onChange: (days: number[]) => void;
  label: string;
  locale: string;
  m: Messages;
}) {
  const short = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const long = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  // 2023-01-01 was a Sunday, so 1 + d is weekday d.
  const dateOf = (d: number) => new Date(2023, 0, 1 + d);
  return (
    <div role="group" aria-label={label} className="weekday-picker">
      {WEEK_ORDER.map((d) => {
        const on = value.includes(d);
        return (
          <button
            type="button"
            key={d}
            aria-pressed={on}
            aria-label={m.anchors.dayFull(long.format(dateOf(d)), false)}
            className={`resistance-dot sm day-dot${on ? ' selected' : ''}`}
            onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort((a, b) => a - b))}
          >
            {short.format(dateOf(d)).replace('.', '').slice(0, 3)}
          </button>
        );
      })}
    </div>
  );
}

export function PetRoutineEditor({ routine, petName, onChange, m }: { routine: PetRoutine; petName: string; onChange: (r: PetRoutine) => void; m: Messages }) {
  const id = useId();
  const summary = routineSummary(routine, m);
  return (
    <div className="stack-sm">
      {PET_SLOTS.map((slot) => (
        <div key={slot} className="routine-row">
          <label htmlFor={`${id}-${slot}`} className="routine-slot">{m.anchors.slots[slot]}</label>
          <select
            id={`${id}-${slot}`}
            className="input select"
            value={routine[slot] ?? ''}
            onChange={(e) => onChange({ ...routine, [slot]: (e.target.value || null) as PetActivityKind | null })}
          >
            <option value="">{m.anchors.nothing}</option>
            {PET_ACTIVITY_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {m.petActivities[kind].label(petName)}
              </option>
            ))}
          </select>
        </div>
      ))}
      {summary && <p className="card-body" style={{ fontSize: 12 }}>{summary}</p>}
    </div>
  );
}

export function WorkEditor({ work, onChange, m, locale, daysLabel, hoursLabel }: { work: WorkConfig; onChange: (patch: Partial<WorkConfig>) => void; m: Messages; locale: string; daysLabel: string; hoursLabel: string }) {
  const id = useId();
  return (
    <>
      <div className="field">
        <span className="field-label">{daysLabel}</span>
        <WeekdayPicker value={work.days} onChange={(days) => onChange({ days })} label={daysLabel} locale={locale} m={m} />
        {work.days.length === 0 && <p className="card-body" style={{ fontSize: 12, marginTop: 4 }}>{m.setup.noWorkDays}</p>}
      </div>
      {work.days.length > 0 && (
        <div className="field">
          <span className="field-label" id={`${id}-hours`}>{hoursLabel}</span>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }} role="group" aria-labelledby={`${id}-hours`}>
            <input
              type="time"
              className="input"
              style={{ flex: 1 }}
              aria-label={m.anchors.startTime}
              value={work.startTime}
              onChange={(e) => onChange({ startTime: e.target.value })}
            />
            <span style={{ alignSelf: 'center' }} className="text-muted">{m.anchors.to}</span>
            <input
              type="time"
              className="input"
              style={{ flex: 1 }}
              aria-label={m.anchors.endTime}
              value={work.endTime}
              onChange={(e) => onChange({ endTime: e.target.value })}
            />
          </div>
        </div>
      )}
    </>
  );
}

function newExerciseId(): string {
  return `ex-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function ExerciseEditor({ exercises, onChange, m, locale }: { exercises: Exercise[]; onChange: (list: Exercise[]) => void; m: Messages; locale: string }) {
  const id = useId();
  const used = new Set(exercises.flatMap((e) => e.days));
  const rest = [0, 1, 2, 3, 4, 5, 6].filter((d) => !used.has(d));

  function update(index: number, patch: Partial<Exercise>) {
    onChange(
      exercises.map((e, i) => {
        if (i === index) return { ...e, ...patch };
        // A day belongs to one exercise: picking it here takes it away from the others.
        return patch.days ? { ...e, days: e.days.filter((d) => !patch.days!.includes(d)) } : e;
      }),
    );
  }

  return (
    <div className="stack-sm">
      <datalist id={`${id}-sports`}>
        {SPORT_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {exercises.length === 0 && <p className="card-body" style={{ fontSize: 12 }}>{m.anchors.noExercise}</p>}
      {exercises.map((ex, i) => {
        const name = ex.name || m.blocks.sport.fallback;
        return (
          <div key={ex.id} className="card exercise-card">
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <input
                className="input"
                style={{ flex: 1 }}
                list={`${id}-sports`}
                aria-label={m.anchors.exerciseName}
                placeholder={m.anchors.exercisePlaceholder}
                maxLength={LIMITS.sportName}
                value={ex.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
              <button type="button" className="btn btn-ghost link-btn" aria-label={m.anchors.removeExercise(name)} onClick={() => onChange(exercises.filter((_, j) => j !== i))}>
                {m.settings.remove}
              </button>
            </div>
            <WeekdayPicker value={ex.days} onChange={(days) => update(i, { days })} label={m.anchors.exerciseDays(name)} locale={locale} m={m} />
            <div className="card-body" style={{ fontSize: 12 }}>
              {ex.days.length === 7 ? m.anchors.everyDay : m.anchors.perWeek(ex.days.length)}
            </div>
          </div>
        );
      })}
      {exercises.length > 0 && rest.length > 0 && <p className="card-body" style={{ fontSize: 12 }}>{m.anchors.restDays(formatWeekdays(rest, locale))}</p>}
      {exercises.length < LIMITS.exercises && (
        <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...exercises, { id: newExerciseId(), name: '', days: [] }])}>
          {m.anchors.addExercise}
        </button>
      )}
    </div>
  );
}

export function DayStartField({ value, onChange, label, hint }: { value: string; onChange: (v: string) => void; label: string; hint: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="time" className="input" style={{ maxWidth: 160 }} value={value} aria-describedby={`${id}-hint`} onChange={(e) => onChange(e.target.value)} />
      <p id={`${id}-hint`} className="card-body" style={{ fontSize: 12, marginTop: 4 }}>{hint}</p>
    </div>
  );
}
