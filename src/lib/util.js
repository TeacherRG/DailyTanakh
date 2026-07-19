// Small view helpers.
import { lang as L, bookName } from './i18n.js';
import { getMeta, allBooks } from './data.js';

export function greetKey() {
  const h = new Date().getHours();
  return h < 5 ? 'greetNight' : h < 12 ? 'greetMorning' : h < 18 ? 'greetDay' : 'greetEvening';
}

export function segLabel(seg, lng = L.value) {
  const nm = bookName(getMeta(seg.slug), lng);
  if (seg.full) return `${nm} ${seg.chapter}`;
  if (seg.vFrom === seg.vTo) return `${nm} ${seg.chapter}:${seg.vFrom}`;
  return `${nm} ${seg.chapter}:${seg.vFrom}–${seg.vTo}`;
}
export function refLabel(slug, chapter, verse, lng = L.value) {
  return `${bookName(getMeta(slug), lng)} ${chapter}${verse ? ':' + verse : ''}`;
}

export function relTime(ts, lng = L.value) {
  if (!ts) return '';
  const s = Math.round((Date.now() - ts) / 1000);
  let rtf;
  try { rtf = new Intl.RelativeTimeFormat(lng, { numeric: 'auto' }); }
  catch { rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }); }
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [u, sec] of units) if (Math.abs(s) >= sec) return rtf.format(-Math.round(s / sec), u);
  return rtf.format(0, 'minute');
}

export function neighbor(slug, chapter, dir) {
  const books = allBooks();
  const bi = books.findIndex(b => b.slug === slug);
  if (bi < 0) return null;
  const b = books[bi];
  const ch = chapter + dir;
  if (ch >= 1 && ch <= b.chapters) return { slug, chapter: ch };
  if (dir > 0 && books[bi + 1]) return { slug: books[bi + 1].slug, chapter: 1 };
  if (dir < 0 && books[bi - 1]) return { slug: books[bi - 1].slug, chapter: books[bi - 1].chapters };
  return null;
}

// which requested translation langs are actually available for this book (+ english fallback)
export function availableTrans(book, requested) {
  const have = requested.filter(l => l !== 'he' && book.langs.includes(l));
  if (have.length) return { langs: have, fallback: false };
  if (book.langs.includes('en')) return { langs: ['en'], fallback: !requested.includes('en') };
  return { langs: [], fallback: false };
}

export function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
  return new Promise((res) => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta); res();
  });
}
