const KEY = 'anchor-error-log';
const MAX_ENTRIES = 20;

export interface ErrorEntry {
  at: string;
  message: string;
  stack?: string;
}

export function readErrors(): ErrorEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as ErrorEntry[]).slice(-MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

/** Keeps a small on-device error log. Nothing is ever sent anywhere. */
export function recordError(error: unknown): void {
  const e = error instanceof Error ? error : new Error(String(error));
  const entry: ErrorEntry = { at: new Date().toISOString(), message: e.message.slice(0, 500), stack: e.stack?.slice(0, 2000) };
  try {
    localStorage.setItem(KEY, JSON.stringify([...readErrors(), entry].slice(-MAX_ENTRIES)));
  } catch {
    // Storage full or unavailable.
  }
}

export function clearErrors(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable.
  }
}

export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (e) => recordError(e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => recordError(e.reason));
}
