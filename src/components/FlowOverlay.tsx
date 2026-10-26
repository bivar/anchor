import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { isRunningTimer, useStore } from '../state/store';
import { Icon } from './Icon';

/** Full-screen modal used by every flow: focus moves in, Escape/✕ closes (confirming if a timer runs). */
export function FlowOverlay({ labelledBy, children, variant = 'overlay' }: { labelledBy: string; children: ReactNode; variant?: 'overlay' | 'dialog' }) {
  const { state, dispatch, m } = useStore();
  const ref = useRef<HTMLDivElement>(null);

  const close = () => {
    if (isRunningTimer(state.activeFlow) && !window.confirm(m.focus.confirmClose)) return;
    dispatch({ type: 'CLOSE_FLOW' });
  };
  const closeRef = useRef(close);
  useLayoutEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, []);

  const closeButton = (
    <button className="btn btn-icon btn-ghost flow-close" aria-label={m.common.close} onClick={close}>
      <Icon name="x" size={18} />
    </button>
  );

  if (variant === 'dialog') {
    return (
      <div className="dialog-backdrop" onClick={close}>
        <div ref={ref} className="dialog pop" role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
          {closeButton}
          {children}
        </div>
      </div>
    );
  }
  return (
    <div ref={ref} className="flow-overlay fade-in" role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}>
      {closeButton}
      {children}
    </div>
  );
}
