import { useStore } from '../state/store';
import { FlowOverlay } from '../components/FlowOverlay';
import { ResistancePicker, EnergyPicker } from '../components/pickers';
import { useTodayList } from '../lib/today';

export function LogDialog() {
  const { state, dispatch, m } = useStore();
  const { meta } = useTodayList(state, m);
  const f = state.activeFlow;
  if (!f || f.type !== 'log') return null;
  const label = meta[f.blockId].label;

  return (
    <FlowOverlay labelledBy="log-title" variant="dialog">
      {f.step === 'resistance' ? (
        <>
          <h2 id="log-title" className="dialog-title">{m.log.title(label)}</h2>
          <div className="dialog-body">{m.log.resistance}</div>
          <ResistancePicker selected={f.resistance} onSelect={(n) => dispatch({ type: 'SET_LOG_RESISTANCE', n })} size="sm" />
        </>
      ) : (
        <>
          <h2 id="log-title" className="dialog-title">{m.log.energy}</h2>
          <EnergyPicker onSelect={(level) => dispatch({ type: 'SET_LOG_ENERGY', level })} />
        </>
      )}
    </FlowOverlay>
  );
}
