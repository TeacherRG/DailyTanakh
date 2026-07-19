// Reading-cycle engine — TWO parallel tracks (Nevi'im + Ketuvim studied together).
// Each track spans the whole cycle, so every day gives a portion from each.
import { allBooks, totals } from './data.js';

export const CYCLES = { '1yr': 365, '3yr': 1095 };
const ANCHOR = '2024-09-16'; // communal anchor (~Rosh Hashana 5785)

let _tracks = null, _key = 0;
function trackUnits() {
  const books = allBooks();
  if (_tracks && _key === books.length) return _tracks;
  const neviim = [], ketuvim = [];
  for (const b of books) {
    const dst = b.section === 'ketuvim' ? ketuvim : neviim;
    for (let c = 0; c < b.chapters; c++) {
      const vc = (b.verseCounts && b.verseCounts[c]) || 0;
      for (let v = 1; v <= vc; v++) dst.push({ slug: b.slug, chapter: c + 1, verse: v, section: b.section });
    }
  }
  _tracks = { neviim, ketuvim }; _key = books.length;
  return _tracks;
}
export function totalVerses() { const t = trackUnits(); return t.neviim.length + t.ketuvim.length; }

export function dayDiff(fromISO, to = new Date()) {
  const a = new Date(fromISO + 'T00:00:00');
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((b - a) / 86400000);
}
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function personalDayIndex(s) { return (!s || !s.startDate) ? 0 : Math.max(0, dayDiff(s.startDate)); }
export function communalDayIndex() { return Math.max(0, dayDiff(ANCHOR)); }

function sliceTrack(units, days, dayIndex) {
  const total = units.length;
  if (!total) return { segments: [], start: 0, end: 0, total: 0 };
  const d = ((Math.floor(dayIndex) % days) + days) % days;
  let start = Math.floor(d * total / days);
  let end = Math.floor((d + 1) * total / days);
  if (end <= start) end = Math.min(total, start + 1);
  const slice = units.slice(start, end);
  const segments = [];
  for (const x of slice) {
    const last = segments[segments.length - 1];
    if (last && last.slug === x.slug && last.chapter === x.chapter) last.vTo = x.verse;
    else segments.push({ slug: x.slug, chapter: x.chapter, section: x.section, vFrom: x.verse, vTo: x.verse });
  }
  const books = allBooks();
  for (const s of segments) {
    const meta = books.find(b => b.slug === s.slug);
    const vc = meta && meta.verseCounts ? meta.verseCounts[s.chapter - 1] : 0;
    s.full = s.vFrom === 1 && s.vTo === vc;
  }
  return { segments, start, end, total };
}

// Returns { day, days, dayIndex, tracks:{neviim, ketuvim}, segments:[all] }
export function portionForDay(cycle, dayIndex) {
  const days = CYCLES[cycle] || 365;
  const t = trackUnits();
  const d = ((Math.floor(dayIndex) % days) + days) % days;
  const neviim = sliceTrack(t.neviim, days, dayIndex);
  const ketuvim = sliceTrack(t.ketuvim, days, dayIndex);
  return {
    day: d + 1, days, dayIndex: d,
    tracks: { neviim, ketuvim },
    segments: [...neviim.segments, ...ketuvim.segments],
  };
}

export function cycleInfo(cycle) {
  const days = CYCLES[cycle];
  const total = totalVerses();
  const t = totals();
  return {
    days,
    versesPerDay: Math.max(1, Math.round(total / days)),
    chaptersPerDay: +(t.chapters / days).toFixed(1),
    totalChapters: t.chapters,
    totalVerses: total,
    years: cycle === '3yr' ? 3 : 1,
  };
}

export function cycleProgress(s) {
  if (!s || !s.cycle || !s.startDate) return 0;
  const days = CYCLES[s.cycle] || 365;
  return Math.min(1, (personalDayIndex(s) + 1) / days);
}
