import { useId, useState, type ReactNode } from 'react';

// Chart geometry lives in a fixed viewBox that scales with the card width.
const W = 340;
const H = 150;
const PAD = { l: 30, r: 8, t: 12, b: 22 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

/** Every `every`-th label plus the last one, skipping a periodic label that would crowd the last. */
function showAxisLabel(i: number, count: number, every: number): boolean {
  if (i === count - 1) return true;
  return i % every === 0 && count - 1 - i >= Math.max(1, every / 2);
}

/** A bar with a 4px rounded data-end and a square baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

interface FrameProps {
  label: string;
  hint: string;
  count: number;
  /** x center of item i in viewBox units, for placing the tooltip. */
  xOf: (i: number) => number;
  describe: (i: number) => { value: string; label: string } | null;
  children: (active: number | null, setActive: (i: number | null) => void) => ReactNode;
}

/** Shared hover + keyboard layer: arrow keys move between values, the tooltip shows the same details as hover. */
function ChartFrame({ label, hint, count, xOf, describe, children }: FrameProps) {
  const [active, setActive] = useState<number | null>(null);
  const hintId = useId();
  const info = active !== null ? describe(active) : null;
  const leftPct = active !== null ? (xOf(active) / W) * 100 : 0;
  const shift = leftPct < 20 ? '0%' : leftPct > 80 ? '-100%' : '-50%';

  function onKeyDown(e: React.KeyboardEvent) {
    if (!count) return;
    const last = count - 1;
    const keys: Record<string, number> = { ArrowLeft: Math.max(0, (active ?? count) - 1), ArrowRight: Math.min(last, (active ?? -1) + 1), Home: 0, End: last };
    if (e.key in keys) {
      e.preventDefault();
      setActive(keys[e.key]);
    }
  }

  return (
    <div
      className="chart-wrap"
      role="group"
      aria-label={label}
      aria-describedby={hintId}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={() => active === null && count && setActive(count - 1)}
      onBlur={() => setActive(null)}
      onPointerLeave={() => setActive(null)}
    >
      <span id={hintId} className="visually-hidden">{hint}</span>
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="presentation">
        {children(active, setActive)}
      </svg>
      {info && (
        <div className="chart-tooltip" style={{ left: `${leftPct}%`, transform: `translateX(${shift})` }} aria-hidden="true">
          <strong>{info.value}</strong>
          <span>{info.label}</span>
        </div>
      )}
      <div className="visually-hidden" aria-live="polite">{info ? `${info.label}: ${info.value}` : ''}</div>
    </div>
  );
}

function YGrid({ ticks, max, format }: { ticks: number[]; max: number; format: (v: number) => string }) {
  return (
    <g>
      {ticks.map((t) => {
        const y = PAD.t + PLOT_H - (t / max) * PLOT_H;
        return (
          <g key={t}>
            <line className="chart-grid" x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} />
            <text className="chart-axis-text" x={PAD.l - 6} y={y + 3} textAnchor="end">{format(t)}</text>
          </g>
        );
      })}
    </g>
  );
}

export interface ColumnDatum {
  key: string;
  /** Short axis label (only some are drawn) and the full label used in the tooltip. */
  axisLabel: string;
  label: string;
  value: number | null;
  /** Shown instead of a value (e.g. "not opened"); drawn as a baseline tick. */
  note?: string;
}

/** Single-series columns on a 0–100 scale. */
export function ColumnChart({
  data,
  label,
  hint,
  format,
  labelEvery,
  showValues,
}: {
  data: ColumnDatum[];
  label: string;
  hint: string;
  format: (v: number) => string;
  labelEvery: number;
  showValues?: boolean;
}) {
  const band = PLOT_W / Math.max(1, data.length);
  const barW = Math.min(24, Math.max(2, band - 2));
  const xOf = (i: number) => PAD.l + i * band + band / 2;
  const baseline = PAD.t + PLOT_H;
  return (
    <ChartFrame
      label={label}
      hint={hint}
      count={data.length}
      xOf={xOf}
      describe={(i) => {
        const d = data[i];
        return { value: d.note ?? (d.value === null ? '—' : format(d.value)), label: d.label };
      }}
    >
      {(active, setActive) => (
        <>
          <YGrid ticks={[0, 50, 100]} max={100} format={format} />
          {data.map((d, i) => {
            const x = xOf(i) - barW / 2;
            const h = d.value ? (d.value / 100) * PLOT_H : 0;
            return (
              <g key={d.key}>
                {d.note && d.value === 0 ? (
                  <rect className="chart-missed" x={x} y={baseline - 2} width={barW} height={2} />
                ) : (
                  h > 0 && <path className={`chart-bar${active === i ? ' is-active' : ''}`} d={barPath(x, baseline - h, barW, h)} />
                )}
                {showValues && d.value !== null && !d.note && (
                  <text className="chart-value-text" x={xOf(i)} y={baseline - h - 4} textAnchor="middle">{format(d.value)}</text>
                )}
                {showAxisLabel(i, data.length, labelEvery) && (
                  <text className="chart-axis-text" x={xOf(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>
                    {d.axisLabel}
                  </text>
                )}
                {/* Hit target: the whole band, taller than the mark. */}
                <rect x={PAD.l + i * band} y={PAD.t} width={band} height={PLOT_H} fill="transparent" onPointerEnter={() => setActive(i)} />
              </g>
            );
          })}
          <line className="chart-baseline" x1={PAD.l} x2={W - PAD.r} y1={baseline} y2={baseline} />
        </>
      )}
    </ChartFrame>
  );
}

export interface DotDatum {
  key: string;
  axisLabel: string;
  label: string;
  value: number;
  filled: boolean;
  status: string;
}

/** One series on a 1–5 scale: a 2px line with ringed dots; filled vs hollow carries a second, legended meaning. */
export function DotLineChart({ data, label, hint, labelEvery }: { data: DotDatum[]; label: string; hint: string; labelEvery: number }) {
  const band = PLOT_W / Math.max(1, data.length);
  const xOf = (i: number) => PAD.l + i * band + band / 2;
  const yOf = (v: number) => PAD.t + PLOT_H - ((v - 1) / 4) * PLOT_H;
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${xOf(i)},${yOf(d.value)}`).join('');
  return (
    <ChartFrame
      label={label}
      hint={hint}
      count={data.length}
      xOf={xOf}
      describe={(i) => ({ value: `${data[i].value}/5 · ${data[i].status}`, label: data[i].label })}
    >
      {(active, setActive) => (
        <>
          {[1, 2, 3, 4, 5].map((t) => (
            <g key={t}>
              <line className="chart-grid" x1={PAD.l} x2={W - PAD.r} y1={yOf(t)} y2={yOf(t)} />
              <text className="chart-axis-text" x={PAD.l - 6} y={yOf(t) + 3} textAnchor="end">{t}</text>
            </g>
          ))}
          {active !== null && <line className="chart-crosshair" x1={xOf(active)} x2={xOf(active)} y1={PAD.t} y2={PAD.t + PLOT_H} />}
          {data.length > 1 && <path className="chart-line" d={path} />}
          {data.map((d, i) => (
            <g key={d.key}>
              <circle className={`chart-dot${d.filled ? '' : ' hollow'}${active === i ? ' is-active' : ''}`} cx={xOf(i)} cy={yOf(d.value)} r={active === i ? 5.5 : 4.5} />
              {showAxisLabel(i, data.length, labelEvery) && (
                <text className="chart-axis-text" x={xOf(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>
                  {d.axisLabel}
                </text>
              )}
              <rect x={PAD.l + i * band} y={PAD.t - 6} width={band} height={PLOT_H + 12} fill="transparent" onPointerEnter={() => setActive(i)} />
            </g>
          ))}
        </>
      )}
    </ChartFrame>
  );
}

/** Part-to-whole of an ordinal scale (one hue, light → dark), with a legend that carries every value. */
export function ShareBar({ parts, label }: { parts: { key: string; label: string; count: number; className: string }[]; label: string }) {
  const total = parts.reduce((a, p) => a + p.count, 0);
  return (
    <div className="stack-sm">
      <div className="share-bar" role="img" aria-label={`${label}: ${parts.map((p) => `${p.label} ${p.count}`).join(', ')}`}>
        {parts
          .filter((p) => p.count > 0)
          .map((p) => (
            <div key={p.key} className={`share-seg ${p.className}`} style={{ flexGrow: p.count }} title={`${p.label}: ${p.count}`} />
          ))}
      </div>
      <ul className="plain-list chart-legend">
        {parts.map((p) => (
          <li key={p.key}>
            <i className={`legend-swatch ${p.className}`} aria-hidden="true" />
            <span>{p.label}</span>
            <strong>{p.count}</strong>
            <span className="text-muted">({total ? Math.round((p.count / total) * 100) : 0}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal single-hue bars with the value at the tip. */
export function BarList({ rows, format }: { rows: { key: string; label: string; value: number; detail: string }[]; format: (v: number) => string }) {
  return (
    <ul className="plain-list bar-list">
      {rows.map((r) => (
        <li key={r.key} title={r.detail}>
          <span className="bar-list-label">{r.label}</span>
          <span className="bar-list-track" aria-hidden="true">
            <span className="bar-list-fill" style={{ width: `${Math.max(r.value, r.value > 0 ? 2 : 0)}%` }} />
          </span>
          <span className="bar-list-value">
            {format(r.value)}
            <span className="visually-hidden"> ({r.detail})</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Accessible data view behind every chart. */
export function DataTable({ summary, headers, rows }: { summary: string; headers: [string, string]; rows: [string, string][] }) {
  return (
    <details className="chart-table">
      <summary>{summary}</summary>
      <table>
        <thead>
          <tr>
            <th scope="col">{headers[0]}</th>
            <th scope="col">{headers[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b], i) => (
            <tr key={i}>
              <th scope="row">{a}</th>
              <td>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
