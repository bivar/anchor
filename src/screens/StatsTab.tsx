import { useState } from 'react';
import { useStore } from '../state/store';
import { Segmented } from '../components/pickers';
import { BarList, ColumnChart, DataTable, DotLineChart, ShareBar } from '../components/charts';
import { anchorRates, buildDays, energyCounts, summarize, weekdayRates, type DayPoint } from '../lib/analytics';
import { addDays, parseDateKey } from '../state/constants';
import type { AppState } from '../state/types';

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

type CalStatus = 'full' | 'partial' | 'missed' | 'empty' | 'future';

function calendarStatus(d: DayPoint | undefined, key: string, state: AppState): CalStatus {
  if (key > state.today) return 'future';
  if (!d || d.kind === 'none') return 'empty';
  if (d.kind === 'missed') return 'missed';
  if (d.kind === 'today') return d.planned > 0 && d.done === d.planned ? 'full' : d.done > 0 ? 'partial' : 'empty';
  return d.success ? 'full' : d.done > 0 ? 'partial' : 'empty';
}

function Kpi({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="card stat-cell">
      <dt className="card-body" style={{ fontSize: 11 }}>{label}</dt>
      <dd className="stat-number">{value}</dd>
      {detail && <dd className="card-body kpi-detail">{detail}</dd>}
    </div>
  );
}

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card chart-card" aria-labelledby={id}>
      <h3 id={id} className="chart-title">{title}</h3>
      {hint && <p className="card-body chart-hint">{hint}</p>}
      {children}
    </section>
  );
}

export function StatsTab() {
  const { state, m } = useStore();
  const s = m.stats;
  const [range, setRange] = useState<Range>(30);

  const days = buildDays(state, range);
  const kpis = summarize(days, state);
  const axisFmt = new Intl.DateTimeFormat(m.locale, { day: 'numeric', month: 'numeric' });
  const longFmt = new Intl.DateTimeFormat(m.locale, { weekday: 'short', day: 'numeric', month: 'short' });
  const dateLabel = (key: string) => longFmt.format(parseDateKey(key));
  const labelEvery = range === 7 ? 1 : range === 30 ? 7 : 15;
  const hasHistory = days.some((d) => d.kind === 'past' || d.kind === 'missed');

  const daily = days.map((d) => ({
    key: d.key,
    axisLabel: axisFmt.format(parseDateKey(d.key)),
    label: d.kind === 'today' ? `${dateLabel(d.key)} · ${s.inProgress}` : dateLabel(d.key),
    value: d.kind === 'none' ? null : d.rate,
    note: d.kind === 'missed' ? s.notOpened : d.kind !== 'none' && d.planned === 0 ? s.noPlan : undefined,
  }));

  const sessions = days
    .filter((d) => d.resistance !== null)
    .map((d) => ({
      key: d.key,
      axisLabel: axisFmt.format(parseDateKey(d.key)),
      label: dateLabel(d.key),
      value: d.resistance ?? 0,
      filled: !!d.worked,
      status: d.worked ? s.keptGoing : s.stoppedAt5,
    }));

  const weekdayFmt = new Intl.DateTimeFormat(m.locale, { weekday: 'short' });
  const weekdayNames = [1, 2, 3, 4, 5, 6, 0].map((d) => weekdayFmt.format(new Date(2023, 0, 1 + d)).replace('.', ''));
  const byWeekday = weekdayRates(days).map((v, i) => ({ key: weekdayNames[i], axisLabel: weekdayNames[i], label: weekdayNames[i], value: v }));

  const energy = energyCounts(days);
  const anchors = anchorRates(days);

  // The 4-week calendar always shows the four Monday-first weeks ending with this one.
  const calDays = buildDays(state, 35);
  const calByKey = new Map(calDays.map((d) => [d.key, d]));
  const offset = (parseDateKey(state.today).getDay() + 6) % 7;
  const calStart = addDays(state.today, -offset - 21);
  const calKeys = Array.from({ length: 28 }, (_, i) => addDays(calStart, i));
  const calLabel: Record<CalStatus, string> = { full: s.legendFull, partial: s.legendPartial, missed: s.legendMissed, empty: '—', future: '' };

  return (
    <div className="fade-in stack">
      <h2 style={{ margin: 0, fontSize: 20 }}>{s.title}</h2>

      <div className="filter-row">
        <Segmented<`${Range}`>
          name="stats-range"
          label={s.range}
          value={`${range}`}
          options={RANGES.map((r) => ({ value: `${r}` as `${Range}`, label: s.rangeOption(r) }))}
          onChange={(v) => setRange(Number(v) as Range)}
        />
      </div>

      {!hasHistory && <p className="card-body">{s.empty}</p>}

      <dl className="stats-grid">
        <Kpi label={s.kpiCompletion} value={kpis.completion === null ? '—' : s.pct(kpis.completion)} detail={kpis.plannedBlocks ? s.count(kpis.doneBlocks, kpis.plannedBlocks) : undefined} />
        <Kpi label={s.kpiFullDays} value={kpis.fullDays} detail={kpis.trackedDays ? s.ofDays(kpis.fullDays, kpis.trackedDays) : undefined} />
        <Kpi label={s.kpiStreak} value={kpis.streak} />
        <Kpi label={s.kpiBest} value={kpis.best} />
        <Kpi label={s.kpiFocus} value={kpis.focusSessions} detail={kpis.focusSessions ? `${s.kpiFiveMin}: ${s.ofSessions(kpis.keptGoing, kpis.focusSessions)}` : undefined} />
        <Kpi label={s.kpiResistance} value={kpis.avgResistance ?? '—'} />
        <Kpi label={s.kpiXp} value={kpis.xp} />
      </dl>

      <Section id="stats-daily" title={s.daily} hint={s.dailyHint}>
        <ColumnChart data={daily} label={s.daily} hint={s.chartNav} format={s.pct} labelEvery={labelEvery} />
        <DataTable
          summary={s.table}
          headers={[s.colDay, s.colValue]}
          rows={daily.filter((d) => d.value !== null).map((d) => [d.label, d.note ?? s.pct(d.value ?? 0)])}
        />
      </Section>

      <Section id="stats-energy" title={s.energy} hint={s.energyHint}>
        {energy.low + energy.medium + energy.high === 0 ? (
          <p className="card-body">{s.noEnergy}</p>
        ) : (
          <ShareBar
            label={s.energy}
            parts={(['low', 'medium', 'high'] as const).map((lvl) => ({ key: lvl, label: m.energy[lvl], count: energy[lvl], className: `energy-${lvl}` }))}
          />
        )}
      </Section>

      <Section id="stats-resistance" title={s.resistance} hint={s.resistanceHint}>
        {sessions.length === 0 ? (
          <p className="card-body">{s.noResistance}</p>
        ) : (
          <>
            <DotLineChart data={sessions} label={s.resistance} hint={s.chartNav} labelEvery={Math.max(1, Math.ceil(sessions.length / 5))} />
            <ul className="plain-list chart-legend" aria-hidden="true">
              <li><i className="legend-dot" />{s.keptGoing}</li>
              <li><i className="legend-dot hollow" />{s.stoppedAt5}</li>
            </ul>
            <DataTable summary={s.table} headers={[s.colDay, s.colValue]} rows={sessions.map((d) => [d.label, `${d.value}/5 · ${d.status}`])} />
          </>
        )}
      </Section>

      <Section id="stats-weekday" title={s.weekday} hint={s.weekdayHint}>
        <ColumnChart data={byWeekday} label={s.weekday} hint={s.chartNav} format={s.pct} labelEvery={1} showValues />
        <DataTable summary={s.table} headers={[s.colDay, s.colValue]} rows={byWeekday.map((d) => [d.label, d.value === null ? '—' : s.pct(d.value)])} />
      </Section>

      {anchors.length > 0 && (
        <Section id="stats-anchors" title={s.anchors} hint={s.anchorsHint}>
          <BarList format={s.pct} rows={anchors.map((a) => ({ key: a.id, label: m.blockNames[a.id], value: a.rate, detail: s.count(a.done, a.planned) }))} />
        </Section>
      )}

      <Section id="stats-calendar" title={s.calendar}>
        <div className="week-grid" role="list">
          {m.you.weekdayInitials.map((l, i) => (
            <div key={`h${i}`} className="week-label" aria-hidden="true">{l}</div>
          ))}
          {calKeys.map((key) => {
            const status = calendarStatus(calByKey.get(key), key, state);
            return (
              <div
                key={key}
                role="listitem"
                className={`week-swatch status-${status}${key === state.today ? ' is-today' : ''}`}
                aria-label={status === 'future' ? undefined : s.dayLabel(dateLabel(key), calLabel[status])}
                aria-hidden={status === 'future' ? true : undefined}
              />
            );
          })}
        </div>
        <div className="legend" aria-hidden="true">
          <span><i className="week-swatch status-full" />{s.legendFull}</span>
          <span><i className="week-swatch status-partial" />{s.legendPartial}</span>
          <span><i className="week-swatch status-missed" />{s.legendMissed}</span>
        </div>
      </Section>
    </div>
  );
}
