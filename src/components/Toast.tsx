import { useStore } from '../state/store';

export function Toast() {
  const { state, m } = useStore();
  return (
    <div role="status" aria-live="polite" className="toast-region">
      {state.toast && (
        <div className="toast pop" key={state.toast.token}>
          <div className="toast-text">{m.toasts[state.toast.key]}</div>
          {state.toast.xp != null && <div className="tag tag-accent">{m.today.xp(state.toast.xp)}</div>}
        </div>
      )}
    </div>
  );
}
