import { useEffect, useRef, useState } from 'react';
import { initialState } from '../state/reducer';
import { useStore } from '../state/store';
import type { LanguagePref, PetSpecies, ThemePref } from '../state/types';
import { defaultRoutine, exerciseFor, launchpadTasks, petCopy } from '../state/constants';
import { DayStartField, ExerciseEditor, PetRoutineEditor, WorkEditor, boundaryLabel } from '../components/AnchorEditors';
import { BackupError, LIMITS, parseBackup } from '../state/sanitize';
import { Segmented } from '../components/pickers';
import { readFileText, saveFile } from '../platform/backup';
import { buildRemindersIcs } from '../platform/calendar';
import { clearErrors, readErrors } from '../platform/errorLog';
import { isIos, isStandalone, useInstallPrompt } from '../platform/install';
import { notificationPermission, requestNotifications, type NotifyPermission } from '../platform/notify';
import { clearAll, isPersisted } from '../platform/storage';

const SPECIES_OPTIONS: PetSpecies[] = ['dog', 'cat', 'other', 'none'];
const BACKUP_NUDGE_MS = 30 * 24 * 60 * 60 * 1000;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="stack-sm">
      <h3 id={id} className="card-kicker section-kicker">{title}</h3>
      {children}
    </section>
  );
}

export function SettingsTab() {
  const { state, dispatch, m } = useStore();
  const s = m.settings;
  const [newLaunchpadTask, setNewLaunchpadTask] = useState('');
  const [importError, setImportError] = useState('');
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotifyPermission>(notificationPermission);
  const [errorCount, setErrorCount] = useState(() => readErrors().length);
  const [copied, setCopied] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const fileRef = useRef<HTMLInputElement>(null);
  const install = useInstallPrompt();

  useEffect(() => {
    void isPersisted().then(setPersisted);
  }, []);

  const needsName = state.pet.species !== 'none';
  const currentLaunchpadTasks = state.customLaunchpadTasks.length > 0 ? state.customLaunchpadTasks : launchpadTasks(state.pet, m);
  const backupDue = !state.lastBackupAt || openedAt - state.lastBackupAt > BACKUP_NUDGE_MS;

  function handleAddLaunchpadTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newLaunchpadTask.trim()) return;
    dispatch({ type: 'ADD_LAUNCHPAD_TASK', task: newLaunchpadTask });
    setNewLaunchpadTask('');
  }

  async function handleExport() {
    const data = JSON.stringify({ ...state, toast: null }, null, 2);
    const result = await saveFile(`anchor-backup-${state.today}.json`, data, 'application/json', m.backup.shareTitle);
    if (result !== 'cancelled') dispatch({ type: 'MARK_BACKUP', at: Date.now() });
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError('');
    try {
      const restored = parseBackup(await readFileText(file, LIMITS.backupBytes), initialState());
      if (window.confirm(s.importConfirm)) dispatch({ type: 'RESTORE_BACKUP', newState: restored });
    } catch (err) {
      setImportError(err instanceof BackupError ? m.backup[err.code] : err instanceof RangeError ? m.backup.tooLarge : m.backup.readFailed);
    }
  }

  function handleReminders() {
    const focusLabel = state.struggle.label || m.blocks.focus.label;
    const ics = buildRemindersIcs(state.dayStart, state.work, {
      checkinTitle: m.reminders.checkinTitle,
      checkinBody: m.reminders.checkinBody,
      focusTitle: m.reminders.focusTitle(focusLabel),
      focusBody: m.reminders.focusBody,
    });
    void saveFile('anchor-reminders.ics', ics, 'text/calendar', m.reminders.checkinTitle);
  }

  async function copyErrors() {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ version: __APP_VERSION__, userAgent: navigator.userAgent, errors: readErrors() }, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fade-in stack">
      <h2 style={{ margin: 0, fontSize: 20 }}>{s.title}</h2>

      <Section id="settings-setup" title={s.setup}>
        <div className="field">
          <label htmlFor="settings-struggle">{s.struggle}</label>
          <input
            id="settings-struggle"
            className="input"
            value={state.struggle.label}
            maxLength={LIMITS.struggle}
            onChange={(e) => dispatch({ type: 'UPDATE_STRUGGLE', struggle: { label: e.target.value } })}
          />
        </div>
        <div className="field">
          <span className="field-label">{s.pet}</span>
          <Segmented
            name="settings-species"
            label={s.pet}
            value={state.pet.species}
            stretch
            options={SPECIES_OPTIONS.map((opt) => ({ value: opt, label: m.species[opt] }))}
            onChange={(species) =>
              dispatch({
                type: 'UPDATE_PET',
                // Coming from "no pet", start from that species' usual routine.
                pet: { ...state.pet, species, routine: state.pet.species === 'none' ? defaultRoutine(species) : state.pet.routine },
              })
            }
          />
        </div>
        {needsName && (
          <div className="field">
            <label htmlFor="settings-pet-name">{s.petName}</label>
            <input
              id="settings-pet-name"
              className="input"
              value={state.pet.name}
              maxLength={LIMITS.petName}
              onChange={(e) => dispatch({ type: 'UPDATE_PET', pet: { ...state.pet, name: e.target.value } })}
            />
          </div>
        )}
      </Section>

      <div className="hr" />
      <Section id="settings-anchors" title={s.anchors}>
        <DayStartField
          value={state.dayStart}
          label={s.dayStart}
          hint={s.dayStartHint(boundaryLabel(state.dayStart))}
          onChange={(dayStart) => dispatch({ type: 'SET_DAY_START', dayStart })}
        />
        <WorkEditor
          work={state.work}
          m={m}
          locale={m.locale}
          daysLabel={s.workDays}
          hoursLabel={s.workHours}
          onChange={(work) => dispatch({ type: 'UPDATE_WORK', work })}
        />
        {needsName && (
          <div className="field">
            <span className="field-label">{s.petRoutine}</span>
            <PetRoutineEditor
              routine={state.pet.routine}
              petName={petCopy(state.pet, m).displayName}
              m={m}
              onChange={(routine) => dispatch({ type: 'UPDATE_PET', pet: { ...state.pet, routine } })}
            />
          </div>
        )}
        <div className="field">
          <span className="field-label">{s.exercises}</span>
          <ExerciseEditor exercises={state.exercises} m={m} locale={m.locale} onChange={(exercises) => dispatch({ type: 'SET_EXERCISES', exercises })} />
          <div className="card-body" style={{ fontSize: 12, marginTop: 4 }}>
            {s.todaysMovement} <strong>{exerciseFor(state.exercises, state.today)?.name || s.restToday}</strong>
          </div>
        </div>
      </Section>

      <div className="hr" />
      <Section id="settings-launchpad" title={s.launchpad}>
        <ul className="plain-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {currentLaunchpadTasks.map((t, i) => (
            <li key={`${i}-${t}`} className="card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}>
              <span style={{ fontSize: 13 }}>{t}</span>
              <button
                className="btn btn-ghost link-btn"
                aria-label={s.removeLabel(t)}
                disabled={currentLaunchpadTasks.length <= 1}
                onClick={() => dispatch({ type: 'REMOVE_LAUNCHPAD_TASK', i })}
              >
                {s.remove}
              </button>
            </li>
          ))}
        </ul>
        {currentLaunchpadTasks.length < LIMITS.launchpadTasks && (
          <form onSubmit={handleAddLaunchpadTask} style={{ display: 'flex', gap: 6 }}>
            <input
              className="input"
              style={{ flex: 1, fontSize: 13 }}
              aria-label={s.addTaskPlaceholder}
              placeholder={s.addTaskPlaceholder}
              value={newLaunchpadTask}
              maxLength={LIMITS.launchpadTask}
              onChange={(e) => setNewLaunchpadTask(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary" style={{ fontSize: 12 }}>
              {s.add}
            </button>
          </form>
        )}
      </Section>

      <div className="hr" />
      <Section id="settings-prefs" title={s.preferences}>
        <div className="field">
          <span className="field-label">{s.checkin}</span>
          <Segmented
            name="freq"
            label={s.checkin}
            value={state.checkinFrequency}
            options={[
              { value: 'once', label: s.checkinOnce },
              { value: 'few', label: s.checkinFew },
            ]}
            onChange={(freq) => dispatch({ type: 'SET_CHECKIN_FREQ', freq })}
          />
          <p className="card-body" style={{ fontSize: 12, marginTop: 4 }}>{s.checkinHint}</p>
        </div>
        <div className="field">
          <span className="field-label">{s.language}</span>
          <Segmented<LanguagePref>
            name="language"
            label={s.language}
            value={state.language}
            options={[
              { value: 'auto', label: s.languageAuto },
              { value: 'en', label: 'English' },
              { value: 'pt', label: 'Português' },
            ]}
            onChange={(language) => dispatch({ type: 'SET_LANGUAGE', language })}
          />
        </div>
        <div className="field">
          <span className="field-label">{s.theme}</span>
          <Segmented<ThemePref>
            name="theme"
            label={s.theme}
            value={state.theme}
            options={[
              { value: 'auto', label: s.themeAuto },
              { value: 'light', label: s.themeLight },
              { value: 'dark', label: s.themeDark },
            ]}
            onChange={(theme) => dispatch({ type: 'SET_THEME', theme })}
          />
        </div>
      </Section>

      <div className="hr" />
      <Section id="settings-reminders" title={s.reminders}>
        <p className="card-body" style={{ fontSize: 12 }}>{s.remindersHint}</p>
        <button className="btn btn-secondary" onClick={handleReminders}>{s.remindersButton}</button>
        <div className="field" style={{ marginTop: 'var(--space-2)' }}>
          <span className="field-label">{s.notifications}</span>
          <p className="card-body" style={{ fontSize: 12 }}>
            {permission === 'granted'
              ? s.notificationsOn
              : permission === 'denied'
                ? s.notificationsBlocked
                : permission === 'unsupported'
                  ? s.notificationsUnsupported
                  : s.notificationsOff}
          </p>
          {permission === 'default' && (
            <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => void requestNotifications().then(setPermission)}>
              {s.notificationsEnable}
            </button>
          )}
        </div>
      </Section>

      <div className="hr" />
      <Section id="settings-install" title={s.install}>
        {isStandalone() ? (
          <p className="card-body" style={{ fontSize: 12 }}>{s.installed}</p>
        ) : (
          <>
            <p className="card-body" style={{ fontSize: 12 }}>{s.installHint}</p>
            {install.canPrompt && (
              <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => void install.prompt()}>
                {s.installButton}
              </button>
            )}
            {!install.canPrompt && isIos() && <p className="card-body" style={{ fontSize: 12 }}>{s.installIos}</p>}
          </>
        )}
      </Section>

      <div className="hr" />
      <Section id="settings-backup" title={s.backup}>
        <p className="card-body" style={{ fontSize: 12 }}>{s.backupHint}</p>
        <p className={`card-body${backupDue ? ' text-warn' : ''}`} style={{ fontSize: 12 }}>
          {state.lastBackupAt ? s.lastBackup(new Intl.DateTimeFormat(m.locale, { dateStyle: 'medium' }).format(state.lastBackupAt)) : s.neverBackedUp}
          {backupDue && state.lastBackupAt ? ` ${s.backupDue}` : ''}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" style={{ flex: 1, fontSize: 13 }} onClick={() => void handleExport()}>
            {s.export}
          </button>
          <button className="btn btn-secondary" style={{ flex: 1, fontSize: 13 }} onClick={() => fileRef.current?.click()}>
            {s.import}
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void handleImportFile(e)} />
        </div>
        {importError && <div role="alert" className="text-error" style={{ fontSize: 12 }}>{importError}</div>}
        {persisted !== null && <p className="card-body" style={{ fontSize: 11 }}>{persisted ? s.storagePersistent : s.storageBestEffort}</p>}
      </Section>

      <div className="hr" />
      <Section id="settings-privacy" title={s.privacy}>
        <p className="card-body" style={{ fontSize: 12 }}>{s.privacyBody}</p>
      </Section>

      {errorCount > 0 && (
        <>
          <div className="hr" />
          <Section id="settings-diagnostics" title={s.diagnostics}>
            <p className="card-body" style={{ fontSize: 12 }}>{s.errors(errorCount)}</p>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => void copyErrors()}>
                {copied ? s.copied : s.copyErrors}
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={() => {
                  clearErrors();
                  setErrorCount(0);
                }}
              >
                {s.clearErrors}
              </button>
            </div>
          </Section>
        </>
      )}

      <div className="hr" />
      <button className="btn btn-secondary btn-block" onClick={() => window.confirm(s.resetTodayConfirm) && dispatch({ type: 'RESET_DAY' })}>
        {s.resetToday}
      </button>
      <button
        className="btn btn-ghost btn-block danger"
        onClick={() => {
          if (!window.confirm(s.resetAllConfirm)) return;
          clearAll();
          dispatch({ type: 'RESET_ALL' });
        }}
      >
        {s.resetAll}
      </button>
      <p className="card-body" style={{ fontSize: 11, textAlign: 'center' }}>{s.version(__APP_VERSION__)}</p>
    </div>
  );
}
