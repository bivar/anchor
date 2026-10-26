import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';
import { messagesFor, type Messages } from '../i18n';
import { recordError } from '../platform/errorLog';
import { showNotification } from '../platform/notify';
import { loadRaw, requestPersistence, saveRaw } from '../platform/storage';
import { applyTheme, onSystemThemeChange } from '../platform/theme';
import { logicalTodayKey } from './constants';
import { calculateRollover, initialState, reducer, type Action } from './reducer';
import { sanitizeState } from './sanitize';
import type { AppState, Flow } from './types';

const SAVE_THROTTLE_MS = 1500;

export function hydrateState(raw: string | null): AppState {
  try {
    if (!raw) return initialState();
    const state = sanitizeState(JSON.parse(raw), initialState());
    return state.today !== logicalTodayKey(state.dayStart) ? calculateRollover(state) : state;
  } catch (e) {
    recordError(e);
    return initialState();
  }
}

export function isRunningTimer(f: Flow | null): boolean {
  return !!f && ((f.type === 'focus' && (f.phase === 'timer' || f.phase === 'running')) || (f.type === 'tornado' && f.phase === 'running'));
}

function alertTimestamp(f: Flow | null): number | undefined {
  if (f?.type === 'focus' && f.phase === 'timer' && !f.paused) return f.targetTimestamp;
  if (f?.type === 'tornado' && f.phase === 'running' && !f.paused) return f.targetTimestamp;
  return undefined;
}

interface StoreValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  m: Messages;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children, initial }: { children: React.ReactNode; initial?: AppState }) {
  const [state, dispatch] = useReducer(reducer, initial, (init) => init ?? hydrateState(loadRaw()));
  const m = useMemo(() => messagesFor(state.language), [state.language]);
  // Latest values for timers and DOM listeners registered once.
  const stateRef = useRef(state);
  const mRef = useRef(m);
  useLayoutEffect(() => {
    stateRef.current = state;
    mRef.current = m;
  });

  // Persist, throttled (timers re-render every second), and flushed when the page is hidden.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = null;
      if (!saveRaw(JSON.stringify({ ...stateRef.current, toast: null }))) recordError(new Error('Could not save state (storage full or blocked)'));
    };
    if (!saveTimer.current) saveTimer.current = setTimeout(flush, SAVE_THROTTLE_MS);
    const onHide = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    };
  }, [state]);

  // Once set up, ask the browser to keep our data out of automatic eviction.
  useEffect(() => {
    if (state.screen === 'app') void requestPersistence();
  }, [state.screen]);

  useEffect(() => {
    document.documentElement.lang = m.locale;
  }, [m]);

  useEffect(() => {
    applyTheme(state.theme);
    return onSystemThemeChange(() => applyTheme(stateRef.current.theme));
  }, [state.theme]);

  // Alert when a timer ends while Anchor is in the background (only while the page is still alive).
  const alertAt = alertTimestamp(state.activeFlow);
  const alertKind = state.activeFlow?.type;
  useEffect(() => {
    if (!alertAt) return;
    const id = setTimeout(() => {
      if (document.visibilityState !== 'hidden') return;
      const n = mRef.current.notify;
      if (alertKind === 'focus') void showNotification(n.focusTitle, n.focusBody, 'anchor-focus');
      else void showNotification(n.tornadoTitle, n.tornadoBody, 'anchor-tornado');
    }, Math.max(0, alertAt - Date.now()));
    return () => clearTimeout(id);
  }, [alertAt, alertKind]);

  // Daily rollover detection across midnight or backgrounding.
  useEffect(() => {
    const checkRollover = () => {
      if (stateRef.current.today !== logicalTodayKey(stateRef.current.dayStart)) dispatch({ type: 'CHECK_DAY_ROLLOVER' });
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkRollover();
        dispatch({ type: 'TICK' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkRollover);
    const id = setInterval(checkRollover, 30000);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkRollover);
      clearInterval(id);
    };
  }, []);

  // Flow timers (five-minute rule, tornado cleaning). Times derive from timestamps, so this only refreshes the display.
  const timing = isRunningTimer(state.activeFlow);
  useEffect(() => {
    if (!timing) return;
    dispatch({ type: 'TICK' });
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, [timing]);

  // Android back button / browser back closes the open flow instead of leaving the app.
  const flowOpen = state.activeFlow !== null;
  const pushed = useRef(false);
  useEffect(() => {
    if (flowOpen && !pushed.current) {
      history.pushState({ anchorFlow: true }, '');
      pushed.current = true;
    } else if (!flowOpen && pushed.current) {
      pushed.current = false;
      history.back();
    }
  }, [flowOpen]);
  useEffect(() => {
    const onPop = () => {
      if (!pushed.current) return;
      if (isRunningTimer(stateRef.current.activeFlow) && !window.confirm(mRef.current.focus.confirmClose)) {
        history.pushState({ anchorFlow: true }, '');
        return;
      }
      pushed.current = false;
      dispatch({ type: 'CLOSE_FLOW' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Auto-dismiss toasts.
  useEffect(() => {
    if (!state.toast) return;
    const token = state.toast.token;
    const id = setTimeout(() => dispatch({ type: 'HIDE_TOAST', token }), 2600);
    return () => clearTimeout(id);
  }, [state.toast]);

  const value = useMemo(() => ({ state, dispatch, m }), [state, m]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function fmtClock(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
