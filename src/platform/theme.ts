import type { ThemePref } from '../state/types';

const dark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

/** Applies the theme to <html> and keeps the browser/OS chrome color in sync. */
export function applyTheme(pref: ThemePref): void {
  const effective = pref === 'auto' ? (dark() ? 'dark' : 'light') : pref;
  document.documentElement.dataset.theme = effective;
  document.documentElement.style.colorScheme = effective;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || (effective === 'dark' ? '#1d1a17' : '#f5ead8'));
}

export function onSystemThemeChange(cb: () => void): () => void {
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  mq?.addEventListener('change', cb);
  return () => mq?.removeEventListener('change', cb);
}
