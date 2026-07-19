// Lazy data layer over the bundled offline JSON.
import { signal } from './html.js';

const cache = { books: null, text: {}, comm: {} };
export const booksMeta = signal(null);

export async function loadBooks() {
  if (cache.books) return cache.books;
  const r = await fetch('data/books.json');
  const d = await r.json();
  cache.books = d; booksMeta.value = d;
  return d;
}
export async function loadBook(slug) {
  if (cache.text[slug]) return cache.text[slug];
  const r = await fetch(`data/text/${slug}.json`);
  if (!r.ok) throw new Error('not_found');
  const d = await r.json();
  cache.text[slug] = d;
  return d;
}
export async function loadCommentary(slug) {
  if (slug in cache.comm) return cache.comm[slug];
  try {
    const r = await fetch(`data/commentary/${slug}.json`);
    cache.comm[slug] = r.ok ? await r.json() : null;
  } catch { cache.comm[slug] = null; }
  return cache.comm[slug];
}

export function allBooks() { return (cache.books && cache.books.books) || []; }
export function getMeta(slug) { return allBooks().find(b => b.slug === slug) || null; }
export function sectionMeta(key) { return cache.books && cache.books.sections && cache.books.sections[key]; }
export function attribution() { return (cache.books && cache.books.attribution) || {}; }
export function totals() { return (cache.books && cache.books.totals) || { books: 0, chapters: 0, verses: 0 }; }
export function neviim() { return allBooks().filter(b => b.section === 'neviim'); }
export function ketuvim() { return allBooks().filter(b => b.section === 'ketuvim'); }
