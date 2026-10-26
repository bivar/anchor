import { useStore } from '../state/store';
import type { EnergyLevel } from '../state/types';

export function ResistancePicker({
  selected,
  onSelect,
  size = 'lg',
}: {
  selected: number | null;
  onSelect: (n: number) => void;
  size?: 'lg' | 'sm';
}) {
  const { m } = useStore();
  return (
    <div role="group" aria-label={m.pickers.resistance} style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          className={`resistance-dot${size === 'sm' ? ' sm' : ''}${selected === n ? ' selected' : ''}`}
          aria-pressed={selected === n}
          onClick={() => onSelect(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

const EMOJI: Record<EnergyLevel, string> = { low: '🌙', medium: '🌤️', high: '⚡' };

export function EnergyPicker({ onSelect }: { onSelect: (level: EnergyLevel) => void }) {
  const { m } = useStore();
  return (
    <div role="group" aria-label={m.pickers.energy} style={{ display: 'flex', gap: 'var(--space-2)' }}>
      {(['low', 'medium', 'high'] as EnergyLevel[]).map((level) => (
        <button key={level} className="btn btn-secondary energy-btn" onClick={() => onSelect(level)}>
          <span aria-hidden="true">{EMOJI[level]}</span>
          <span>{m.energy[level]}</span>
        </button>
      ))}
    </div>
  );
}

/** Segmented single-choice control (radio group) used across setup and settings. */
export function Segmented<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
  stretch,
}: {
  name: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  stretch?: boolean;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label} style={stretch ? { width: '100%' } : undefined}>
      {options.map((opt) => (
        <label className="seg-opt" key={opt.value} style={stretch ? { flex: 1, justifyContent: 'center' } : undefined}>
          <input type="radio" name={name} checked={value === opt.value} onChange={() => onChange(opt.value)} />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}
