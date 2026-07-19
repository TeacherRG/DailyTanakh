import { html, useSignal } from '../lib/html.js';
import { t, lang, bookName } from '../lib/i18n.js';
import { allBooks, neviim, ketuvim, getMeta, totals, loadBook } from '../lib/data.js';
import { profile, settings } from '../lib/store.js';
import { route, navigate } from '../lib/router.js';
import { Icon } from '../lib/icons.js';
import { Empty } from '../components/ui.js';

const HEB_RE = /[֐-׿]/;
// strip nikkud & maqaf so Hebrew queries match pointed text
const strip = (s) => s.normalize('NFD').replace(/[֑-ׇ]/g, '').replace(/־/g, ' ').toLowerCase();

function snippet(txt, idx, len) {
  const a = Math.max(0, idx - 44), b = Math.min(txt.length, idx + len + 64);
  return {
    pre: (a > 0 ? '…' : '') + txt.slice(a, idx),
    hit: txt.slice(idx, idx + len),
    post: txt.slice(idx + len, b) + (b < txt.length ? '…' : ''),
  };
}

function BookCard(b) {
  const heName = bookName(b, 'he');
  return html`<div class="card hover book-card" key=${b.slug} onClick=${() => navigate('/book/' + b.slug)}>
    <div class="glyph">${heName[0] || '׳'}</div>
    <div class="grow">
      <div class="nm">${bookName(b, lang.value)}</div>
      <div class="meta">
        <span>${t('library.chapters', { n: b.chapters })}</span>
        ${b.hasCommentary && html`<span class="dot" style="background:var(--amber)"></span>`}
      </div>
    </div>
  </div>`;
}

let searchRun = 0;

export function Library() {
  const q = useSignal('');
  const hits = useSignal(null);       // null = no text-search performed
  const busy = useSignal('');         // book being scanned
  const T = totals();
  const match = (b) => {
    const s = q.value.trim().toLowerCase();
    if (!s) return true;
    return bookName(b, lang.value).toLowerCase().includes(s)
      || bookName(b, 'en').toLowerCase().includes(s)
      || bookName(b, 'he').includes(q.value.trim());
  };

  const runTextSearch = async () => {
    const raw = q.value.trim();
    if (raw.length < 2) return;
    const run = ++searchRun;
    const isHeb = HEB_RE.test(raw);
    const needle = isHeb ? strip(raw) : raw.toLowerCase();
    const pref = settings.value.transLangs[0];
    hits.value = [];
    const out = [];
    for (const b of allBooks()) {
      if (run !== searchRun) return;
      busy.value = bookName(b, lang.value);
      let bk; try { bk = await loadBook(b.slug); } catch { continue; }
      const L = isHeb ? 'he' : (bk.text[pref] ? pref : (bk.text.en ? 'en' : bk.langs.find(x => x !== 'he')));
      const chs = L && bk.text[L]; if (!chs) continue;
      for (let c = 0; c < chs.length && out.length < 100; c++) {
        const vs = chs[c] || [];
        for (let v = 0; v < vs.length && out.length < 100; v++) {
          const orig = vs[v] || '';
          const hay = isHeb ? strip(orig) : orig.toLowerCase();
          const idx = hay.indexOf(needle);
          if (idx >= 0) out.push({ slug: b.slug, ch: c + 1, v: v + 1, isHeb,
            ...snippet(isHeb ? hay : orig, idx, needle.length) });
        }
      }
      hits.value = [...out];
      if (out.length >= 100) break;
      await Promise.resolve(); // microtask yield — not throttled in background tabs
    }
    if (run === searchRun) busy.value = '';
  };
  const sec = (key, list) => {
    const items = list.filter(match);
    if (!items.length) return null;
    return html`<div class="rise">
      <div class="section-head"><h2>${t('sections.' + key + 'Full')}</h2><span class="tag">${items.length}</span></div>
      <div class="book-grid">${items.map(BookCard)}</div>
    </div>`;
  };
  return html`<div class="container main">
    <div class="page-head rise">
      <h1 class="display">${t('library.title')}</h1>
      <div class="sub">${t('library.subtitle', { books: T.books, chapters: T.chapters, verses: T.verses.toLocaleString(lang.value) })}</div>
    </div>
    <div class="rise" style="margin-bottom:8px;max-width:480px">
      <div style="position:relative">
        <span style="position:absolute;top:50%;inset-inline-start:13px;transform:translateY(-50%);color:var(--muted)"><${Icon} name="search" size=18 /></span>
        <input class="input" style="padding-inline-start:42px" placeholder=${t('library.search')}
          value=${q.value}
          onInput=${e => { q.value = e.target.value; hits.value = null; busy.value = ''; searchRun++; }}
          onKeyDown=${e => { if (e.key === 'Enter') runTextSearch(); }} />
      </div>
      ${q.value.trim().length >= 2 && hits.value === null && html`<button class="btn btn-ghost btn-sm" style="margin-top:8px"
        onClick=${runTextSearch}><${Icon} name="bookOpen" size=15 />${t('library.searchInText')} <span class="kbd">↵</span></button>`}
      ${busy.value && html`<div class="muted fade" style="margin-top:8px;font-size:.85rem;display:flex;align-items:center;gap:8px">
        <span class="dot live"></span>${t('library.searching', { b: busy.value })}</div>`}
    </div>

    ${hits.value !== null && html`<div class="fade">
      <div class="section-head"><h2>${t('library.matches', { n: hits.value.length })}</h2></div>
      ${hits.value.length === 0 && !busy.value && html`<${Empty} icon="search" title=${t('library.noResults')} body=${q.value} />`}
      <div class="list-stack">
        ${hits.value.map((h, i) => html`<div class="card hover hit" key=${i}
          onClick=${() => navigate(`/read/${h.slug}/${h.ch}?v=${h.v}`)}>
          <div class="ref"><${Icon} name="bookmark" size=13 />${bookName(getMeta(h.slug), lang.value)} ${h.ch}:${h.v}</div>
          <div class=${'snip' + (h.isHeb ? ' heb' : '')} dir=${h.isHeb ? 'rtl' : 'ltr'}>${h.pre}<mark>${h.hit}</mark>${h.post}</div>
        </div>`)}
      </div>
    </div>`}

    ${hits.value === null && html`<div style="display:contents">
      ${sec('neviim', neviim())}
      ${sec('ketuvim', ketuvim())}
      ${q.value.trim() && !allBooks().some(match) && html`<${Empty} icon="search" title=${t('library.noResults')} body=${q.value} />`}
    </div>`}
  </div>`;
}

export function Book() {
  const slug = route.value.parts[1];
  const b = getMeta(slug);
  if (!b) return html`<div class="container main"><div class="spinner"></div></div>`;
  const read = profile.value.read;
  const chevPrev = lang.value === 'he' ? 'chevronRight' : 'chevronLeft';
  return html`<div class="container main">
    <a class="btn btn-ghost btn-sm rise" href="#/library" style="margin-bottom:18px"><${Icon} name=${chevPrev} />${t('nav.library')}</a>
    <div class="page-head rise row gap-4" style="align-items:center">
      <div class="glyph book-card-glyph" style="width:60px;height:72px;border-radius:10px;display:flex;align-items:center;justify-content:center;
        background:linear-gradient(160deg,var(--blue-tint),var(--blue-tint-2));color:var(--blue);font-family:var(--font-hebrew);font-size:2rem;border:1px solid var(--line);flex:none">
        ${bookName(b, 'he')[0]}</div>
      <div>
        <h1 class="display">${bookName(b, lang.value)}</h1>
        <div class="sub heb" style="font-size:1.1rem">${bookName(b, 'he')} · ${t('sections.' + b.section)}</div>
      </div>
    </div>
    <div class="section-head"><h2 style="font-size:1.05rem">${t('library.selectChapter')}</h2>
      <span class="tag">${t('library.chapters', { n: b.chapters })}</span></div>
    <div class="chapter-grid rise">
      ${Array.from({ length: b.chapters }, (_, i) => i + 1).map(c => html`<div key=${c}
        class=${'chapter-cell' + (read[slug + '.' + c] ? ' read' : '')}
        onClick=${() => navigate(`/read/${slug}/${c}`)}>${c}</div>`)}
    </div>
  </div>`;
}
