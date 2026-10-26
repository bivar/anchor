import { describe, it, expect } from 'vitest';
import { en } from '../i18n/en';
import { pt } from '../i18n/pt';

function shape(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) return [`${path}[]`];
  if (typeof value === 'function') return [`${path}()`];
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  return [path];
}

describe('translations', () => {
  it('Portuguese covers exactly the same keys as English', () => {
    expect(shape(pt).sort()).toEqual(shape(en).sort());
  });

  it('has no empty strings', () => {
    const empty = (v: unknown, path: string): string[] =>
      typeof v === 'string' ? (v.trim() || path.endsWith('none') ? [] : [path]) : v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => empty(x, `${path}.${k}`)) : [];
    expect(empty(en, 'en')).toEqual([]);
    expect(empty(pt, 'pt')).toEqual([]);
  });
});
