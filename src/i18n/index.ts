import { en, type Messages } from './en';
import { pt } from './pt';
import type { LanguagePref } from '../state/types';

export type Lang = 'en' | 'pt';
export type { Messages };

const CATALOGS: Record<Lang, Messages> = { en, pt };

export function resolveLang(pref: LanguagePref): Lang {
  if (pref === 'en' || pref === 'pt') return pref;
  const langs = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.some((l) => l?.toLowerCase().startsWith('pt')) ? 'pt' : 'en';
}

export function messagesFor(pref: LanguagePref): Messages {
  return CATALOGS[resolveLang(pref)];
}
