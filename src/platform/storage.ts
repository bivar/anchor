const STORAGE_KEY = 'anchor-app-state-v1';
// Where the Capacitor build's web layer kept the same data; read once so nothing is lost.
const LEGACY_KEY = 'CapacitorStorage.anchor-app-state-v1';

export function loadRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
  } catch {
    return null;
  }
}

export function saveRaw(value: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

export function clearAll(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

/** Asks the browser not to evict our data under storage pressure. Resolves to whether it is persistent. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function isPersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}
