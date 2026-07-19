// Global reactive state: settings + profile, persisted to localStorage.
import { signal, computed, effect } from './html.js';
import * as storage from './storage.js';
import { lang as i18nLang, dir as i18nDir } from './i18n.js';

const DEFAULTS = {
  theme: 'system',          // 'light' | 'dark' | 'system'
  uiLang: 'ru',
  transLangs: ['ru'],       // translations shown in reader (subset of ru/en/de)
  showHebrew: true,
  cycle: null,              // '1yr' | '3yr'
  startDate: null,          // ISO yyyy-mm-dd of personal cycle start
  fontScale: 1,
  notify: { enabled: false, time: '08:00' },
  onboarded: false,
};
const PROFILE = {
  lastRead: null,                                   // { slug, chapter, verse, ts }
  read: {},                                         // { "slug.ch": ts }
  streak: { count: 0, lastDay: null, best: 0 },
  notes: [],                                        // { id, slug, chapter, verse, text, ts, updated }
  favorites: [],                                    // { id, slug, chapter, verse, he, tr, lang, ts }
  joinDate: null,
};

function persisted(key, defaults) {
  const stored = storage.load(key, null);
  const s = signal(stored ? { ...defaults, ...stored } : { ...defaults });
  effect(() => storage.save(key, s.value));
  return s;
}

export const settings = persisted('settings', DEFAULTS);
export const profile = persisted('profile', PROFILE);

/* ---------- toasts ---------- */
export const toasts = signal([]);
let _tid = 0;
export function toast(msg, icon = 'check') {
  const id = ++_tid;
  toasts.value = [...toasts.value, { id, msg, icon }];
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 2600);
}

/* ---------- settings actions ---------- */
export function setSettings(patch) { settings.value = { ...settings.value, ...patch }; }
export function setNotify(patch) { settings.value = { ...settings.value, notify: { ...settings.value.notify, ...patch } }; }
export function toggleTransLang(l) {
  const cur = settings.value.transLangs;
  const next = cur.includes(l) ? cur.filter(x => x !== l) : [...cur, l];
  setSettings({ transLangs: next.length ? next : cur });
}

/* ---------- helpers ---------- */
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ensureJoin = () => { if (!profile.value.joinDate) profile.value = { ...profile.value, joinDate: dayKey() }; };

function bumpStreak() {
  const today = dayKey();
  const s = { ...profile.value.streak };
  if (s.lastDay === today) return s;
  const y = new Date(); y.setDate(y.getDate() - 1);
  s.count = (s.lastDay === dayKey(y)) ? (s.count || 0) + 1 : 1;
  s.lastDay = today;
  s.best = Math.max(s.best || 0, s.count);
  return s;
}

/* ---------- profile actions ---------- */
export function setLastRead(slug, chapter, verse = 1) {
  ensureJoin();
  profile.value = { ...profile.value, lastRead: { slug, chapter, verse, ts: Date.now() } };
}
export function markChapterRead(slug, chapter) {
  ensureJoin();
  const read = { ...profile.value.read, [`${slug}.${chapter}`]: Date.now() };
  profile.value = { ...profile.value, read, streak: bumpStreak() };
}
export function isChapterRead(slug, chapter) { return !!profile.value.read[`${slug}.${chapter}`]; }

export function isFavorite(slug, chapter, verse) {
  return profile.value.favorites.some(f => f.slug === slug && f.chapter === chapter && f.verse === verse);
}
export function toggleFavorite(item) {
  ensureJoin();
  const { slug, chapter, verse } = item;
  const exists = isFavorite(slug, chapter, verse);
  let favs;
  if (exists) favs = profile.value.favorites.filter(f => !(f.slug === slug && f.chapter === chapter && f.verse === verse));
  else favs = [{ id: storage.uid(), ts: Date.now(), ...item }, ...profile.value.favorites];
  profile.value = { ...profile.value, favorites: favs };
  return !exists;
}

export function getNote(slug, chapter, verse) {
  return profile.value.notes.find(n => n.slug === slug && n.chapter === chapter && n.verse === verse) || null;
}
export function saveNote({ slug, chapter, verse, text }) {
  ensureJoin();
  const notes = [...profile.value.notes];
  const i = notes.findIndex(n => n.slug === slug && n.chapter === chapter && n.verse === verse);
  const clean = (text || '').trim();
  if (i >= 0) {
    if (!clean) notes.splice(i, 1);
    else notes[i] = { ...notes[i], text: clean, updated: Date.now() };
  } else if (clean) {
    notes.unshift({ id: storage.uid(), slug, chapter, verse, text: clean, ts: Date.now(), updated: Date.now() });
  }
  profile.value = { ...profile.value, notes };
}
export function deleteNote(id) {
  profile.value = { ...profile.value, notes: profile.value.notes.filter(n => n.id !== id) };
}

export function resetProgress() {
  profile.value = { ...PROFILE };
  storage.save('profile', profile.value);
}

/* ---------- derived ---------- */
export const stats = computed(() => {
  const p = profile.value;
  return {
    chaptersRead: Object.keys(p.read).length,
    favorites: p.favorites.length,
    notes: p.notes.length,
    streak: p.streak.count || 0,
    best: p.streak.best || 0,
  };
});

/* ---------- environment: theme, language, direction, scale ---------- */
const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const sysDark = signal(mq ? mq.matches : false);
if (mq) mq.addEventListener('change', e => { sysDark.value = e.matches; });

export const resolvedTheme = computed(() => {
  const th = settings.value.theme;
  return th === 'system' ? (sysDark.value ? 'dark' : 'light') : th;
});

effect(() => {
  const s = settings.value;
  i18nLang.value = s.uiLang;
  const el = document.documentElement;
  el.lang = s.uiLang;
  el.dir = i18nDir.value;
  el.dataset.theme = resolvedTheme.value;
  el.style.setProperty('--reader-scale', s.fontScale);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = resolvedTheme.value === 'dark' ? '#0a0f1d' : '#ffffff';
});

/* ---------- export/import ---------- */
export function exportData() {
  const blob = { app: 'DailyTanakh', version: 1, exported: new Date().toISOString(),
                 settings: settings.value, profile: profile.value };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(blob, null, 2)], { type: 'application/json' }));
  a.download = `dailytanakh-backup-${dayKey()}.json`;
  a.click(); URL.revokeObjectURL(a.href);
}
export function importData(obj) {
  if (obj && obj.settings) settings.value = { ...DEFAULTS, ...obj.settings };
  if (obj && obj.profile) profile.value = { ...PROFILE, ...obj.profile };
}
