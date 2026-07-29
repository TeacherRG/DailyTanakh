// Детский режим: данные энциклопедии, годовой цикл из 114 историй, прогресс и награды.
import { signal, computed } from './html.js';
import { settings, profile } from './store.js';
import { dayDiff, todayISO } from './schedule.js';

export const KIDS_DAYS = 365;

let _cache = null;
export const kidsData = signal(null);

export async function loadKids() {
  if (_cache) return _cache;
  const r = await fetch('data/kids.json');
  if (!r.ok) throw new Error('kids_not_found');
  _cache = await r.json();
  kidsData.value = _cache;
  return _cache;
}
export function kids() { return _cache; }
export function allStories() { return (_cache && _cache.chapters) || []; }
export function kidsBooks() { return (_cache && _cache.books) || []; }
export function story(n) { return allStories().find(c => c.n === +n) || null; }
export function totalStories() { return allStories().length; }

/* ---------- годовой цикл: 114 историй равномерно на 365 дней ---------- */
export function kidsDayIndex() {
  const s = settings.value.kidsStart;
  return s ? Math.max(0, dayDiff(s)) : 0;
}
/** Номер истории для дня цикла (1..114). */
export function storyForDay(dayIndex) {
  const total = totalStories();
  if (!total) return 1;
  const d = ((Math.floor(dayIndex) % KIDS_DAYS) + KIDS_DAYS) % KIDS_DAYS;
  return Math.min(total, Math.floor(d * total / KIDS_DAYS) + 1);
}
/** Сколько дней подряд читается одна история (≈3). */
export function daysPerStory() {
  const total = totalStories();
  return total ? +(KIDS_DAYS / total).toFixed(1) : 0;
}
export function todayStory() { return storyForDay(kidsDayIndex()); }

export function startKidsCycle() {
  settings.value = { ...settings.value, kidsStart: todayISO() };
}

/* ---------- прогресс ---------- */
export function isStoryRead(n) { return !!(profile.value.kidsRead || {})[n]; }
export function markStoryRead(n) {
  const read = { ...(profile.value.kidsRead || {}) };
  if (read[n]) return false;
  read[n] = Date.now();
  profile.value = { ...profile.value, kidsRead: read, kidsStreak: bumpKidsStreak() };
  return true;
}
export function unmarkStoryRead(n) {
  const read = { ...(profile.value.kidsRead || {}) };
  delete read[n];
  profile.value = { ...profile.value, kidsRead: read };
}
export function isStoryStarred(n) { return (profile.value.kidsStars || []).includes(+n); }
export function toggleStar(n) {
  const cur = profile.value.kidsStars || [];
  const has = cur.includes(+n);
  profile.value = { ...profile.value, kidsStars: has ? cur.filter(x => x !== +n) : [...cur, +n] };
  return !has;
}

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function bumpKidsStreak() {
  const st = { ...(profile.value.kidsStreak || { count: 0, lastDay: null, best: 0 }) };
  const today = dayKey();
  if (st.lastDay === today) return st;
  const y = new Date(); y.setDate(y.getDate() - 1);
  st.count = st.lastDay === dayKey(y) ? (st.count || 0) + 1 : 1;
  st.lastDay = today;
  st.best = Math.max(st.best || 0, st.count);
  return st;
}

export const kidsStats = computed(() => {
  const p = profile.value;
  const read = p.kidsRead || {};
  const total = totalStories();
  const doneCount = Object.keys(read).length;
  const booksDone = kidsBooks().filter(b => b.chapters.every(n => read[n])).length;
  return {
    read: doneCount,
    total,
    percent: total ? Math.round(doneCount / total * 100) : 0,
    stars: (p.kidsStars || []).length,
    streak: (p.kidsStreak && p.kidsStreak.count) || 0,
    best: (p.kidsStreak && p.kidsStreak.best) || 0,
    booksDone,
    booksTotal: kidsBooks().length,
  };
});

/** Книга, к которой относится история. */
export function bookOfStory(n) {
  return kidsBooks().find(b => b.chapters.includes(+n)) || null;
}
/** Следующая непрочитанная история (или следующая по порядку). */
export function nextStory(n) {
  const all = allStories();
  const i = all.findIndex(c => c.n === +n);
  return i >= 0 && i + 1 < all.length ? all[i + 1].n : null;
}
export function prevStory(n) {
  const all = allStories();
  const i = all.findIndex(c => c.n === +n);
  return i > 0 ? all[i - 1].n : null;
}
/** С чего продолжить: первая непрочитанная. */
export function continueStory() {
  const read = profile.value.kidsRead || {};
  const all = allStories();
  const next = all.find(c => !read[c.n]);
  return next ? next.n : (all.length ? all[all.length - 1].n : 1);
}

/* ---------- награды ---------- */
export const BADGES = [
  { id: 'first',    icon: 'sparkles', need: p => p.read >= 1 },
  { id: 'five',     icon: 'star',     need: p => p.read >= 5 },
  { id: 'ten',      icon: 'award',    need: p => p.read >= 10 },
  { id: 'book',     icon: 'book',     need: p => p.booksDone >= 1 },
  { id: 'quarter',  icon: 'flag',     need: p => p.percent >= 25 },
  { id: 'half',     icon: 'flame',    need: p => p.percent >= 50 },
  { id: 'neviim',   icon: 'scroll',   need: (p, ctx) => ctx.neviimDone },
  { id: 'streak7',  icon: 'clock',    need: p => p.best >= 7 },
  { id: 'all',      icon: 'checkCircle', need: p => p.total > 0 && p.read >= p.total },
];

export function earnedBadges() {
  const st = kidsStats.value;
  const read = profile.value.kidsRead || {};
  const neviimDone = kidsBooks().filter(b => b.section === 'neviim')
    .every(b => b.chapters.every(n => read[n]));
  const ctx = { neviimDone };
  return BADGES.map(b => ({ ...b, earned: !!b.need(st, ctx) }));
}
