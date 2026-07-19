// Tiny reactive i18n. Locales are JS modules (offline, no fetch).
import { signal, computed } from './html.js';
import ru from '../i18n/ru.js';
import en from '../i18n/en.js';
import de from '../i18n/de.js';
import he from '../i18n/he.js';

export const LOCALES = { ru, en, de, he };
export const LANGS = ['ru', 'en', 'de', 'he'];
export const lang = signal('ru');

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

// t() reads lang.value, so any component that calls it re-renders on language change.
export function t(key, vars) {
  const L = LOCALES[lang.value] || ru;
  let s = get(L, key);
  if (s == null) s = get(ru, key); // graceful fallback to Russian
  if (s == null) return key;
  if (vars) for (const k in vars) s = String(s).split('{' + k + '}').join(vars[k]);
  return s;
}

export const dir = computed(() => (LOCALES[lang.value] && LOCALES[lang.value].dir) || 'ltr');
export const isRTL = computed(() => dir.value === 'rtl');

// localized book + section names from books.json metadata
export function bookName(meta, l = lang.value) {
  if (!meta) return '';
  return (meta.names && (meta.names[l] || meta.names.en)) || meta.slug;
}
