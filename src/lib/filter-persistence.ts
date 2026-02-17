/**
 * Persist and restore filter values via localStorage.
 * Keys are namespaced per page to avoid collisions.
 */

const PREFIX = "bolsago_filters_";

export function saveFilter(page: string, key: string, value: string) {
  try {
    localStorage.setItem(`${PREFIX}${page}_${key}`, value);
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function loadFilter(page: string, key: string): string | null {
  try {
    return localStorage.getItem(`${PREFIX}${page}_${key}`);
  } catch {
    return null;
  }
}

export function saveFilters(page: string, filters: Record<string, string>) {
  Object.entries(filters).forEach(([key, value]) => saveFilter(page, key, value));
}

export function loadFilters(page: string, keys: string[]): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  keys.forEach(key => { result[key] = loadFilter(page, key); });
  return result;
}

export function clearFilters(page: string, keys: string[]) {
  keys.forEach(key => {
    try {
      localStorage.removeItem(`${PREFIX}${page}_${key}`);
    } catch { /* ignore */ }
  });
}
