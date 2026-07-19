import { html, useState, useEffect, useRef, useSignal } from '../lib/html.js';
import { t, lang, bookName } from '../lib/i18n.js';
import {
  settings, setSettings, toggleTransLang, profile, toggleFavorite, isFavorite,
  getNote, saveNote, markChapterRead, setLastRead, toast,
} from '../lib/store.js';
import { loadBook, loadCommentary, getMeta } from '../lib/data.js';
import { route, navigate } from '../lib/router.js';
import { neighbor, availableTrans, refLabel, copyText } from '../lib/util.js';
import { portionForDay, personalDayIndex } from '../lib/schedule.js';
import { Icon } from '../lib/icons.js';
import { Sheet, Switch } from '../components/ui.js';
import { printDoc } from '../lib/print.js';

const TRANS_LANGS = ['ru', 'en', 'de'];

// commentator display names (RU); HE uses the source's own Hebrew name
const WHO_RU = {
  'Rashi': 'Раши', 'Ibn Ezra': 'Ибн-Эзра', 'Radak': 'Радак', 'Metzudat David': 'Мецудат Давид',
  'Metzudat Zion': 'Мецудат Цион', 'Malbim': 'Мальбим', 'Ralbag': 'Ральбаг', 'Gersonides': 'Ральбаг',
  'Sforno': 'Сфорно', 'Ramban': 'Рамбан', 'Rashbam': 'Рашбам', 'Targum Jonathan': 'Таргум Йонатан',
  'Steinsaltz': 'Штейнзальц', 'Torah Temimah': 'Тора Темима',
};
export function whoName(c) {
  const L = lang.value;
  if (L === 'he') return c.he || c.en;
  if (L === 'ru') return WHO_RU[c.en] || c.en;
  return c.en;
}

/* ---------- commentary ---------- */
function CommentaryPanel({ items }) {
  return html`<div class="subblock commentary">
    <div class="ch"><${Icon} name="comment" size=14 />${t('reader.commentary')}</div>
    ${items.map((c, i) => {
      const L = lang.value;
      let body, isHeb;
      if (L === 'he') { body = c.textHe || c.textRu || c.textEn; isHeb = !!c.textHe; }
      else if (L === 'ru') { body = c.textRu || c.textEn || c.textHe; isHeb = !c.textRu && !c.textEn && !!c.textHe; }
      else { body = c.textEn || c.textRu || c.textHe; isHeb = !c.textEn && !c.textRu && !!c.textHe; }
      const title = L === 'he' ? (c.titleHe || c.titleRu || c.titleEn)
        : L === 'ru' ? (c.titleRu || c.titleEn || c.titleHe)
        : (c.titleEn || c.titleRu || c.titleHe);
      return html`<div class="comm" key=${i}>
        <div class="who"><span>${whoName(c)}</span>${lang.value !== 'he' && c.he && html`<span class="heb">${c.he}</span>`}</div>
        ${title && html`<div class="ctitle" dir="auto">${title}</div>`}
        <div class=${'body' + (isHeb ? ' heb' : '')} dir=${isHeb ? 'rtl' : 'ltr'}>${body}</div>
      </div>`;
    })}
  </div>`;
}

/* ---------- note ---------- */
function NoteBlock({ slug, chapter, n, note, editing, setEditing }) {
  const draft = useSignal(note ? note.text : '');
  const ta = useRef();
  useEffect(() => { if (editing) { draft.value = note ? note.text : ''; if (ta.current) ta.current.focus(); } }, [editing]);
  if (editing) {
    return html`<div class="subblock note-edit"><div class="inner">
      <label style="font-size:.76rem;font-weight:700;color:var(--amber)">${t('reader.yourNote')}</label>
      <textarea ref=${ta} class="textarea" dir="auto" placeholder=${t('reader.notePlaceholder')}
        value=${draft.value} onInput=${e => { draft.value = e.target.value; }}></textarea>
      <div class="row gap-2" style="justify-content:flex-end">
        <button class="btn btn-ghost btn-sm" onClick=${() => setEditing(false)}>${t('common.cancel')}</button>
        <button class="btn btn-primary btn-sm" onClick=${() => {
          const txt = draft.value; saveNote({ slug, chapter, verse: n, text: txt }); setEditing(false);
          toast(txt.trim() ? t('toast.noteSaved') : t('toast.noteDeleted'), 'edit');
        }}>${t('common.save')}</button>
      </div>
    </div></div>`;
  }
  return html`<div class="subblock note-saved">
    <span class="ic"><${Icon} name="edit" size=16 /></span>
    <div class="grow" dir="auto" style="white-space:pre-wrap">${note.text}</div>
    <button class="va" title=${t('common.edit')} onClick=${() => setEditing(true)}><${Icon} name="edit" size=15 /></button>
    <button class="va" title=${t('common.delete')} onClick=${() => { saveNote({ slug, chapter, verse: n, text: '' }); toast(t('toast.noteDeleted'), 'trash'); }}><${Icon} name="trash" size=15 /></button>
  </div>`;
}

/* ---------- verse ---------- */
function VerseRow({ slug, chapter, n, he, trans, comm, showHebrew }) {
  const [showComm, setShowComm] = useState(false);
  const [editing, setEditing] = useState(false);
  const note = getNote(slug, chapter, n);
  const fav = isFavorite(slug, chapter, n);
  const hasComm = comm && comm.length;

  const touch = () => setLastRead(slug, chapter, n);
  const copy = () => {
    const txt = [refLabel(slug, chapter, n), he, ...trans.map(x => x.text)].filter(Boolean).join('\n');
    copyText(txt).then(() => toast(t('reader.copied'), 'copy'));
    touch();
  };
  const onFav = () => {
    const added = toggleFavorite({ slug, chapter, verse: n, he: he || '', tr: (trans[0] && trans[0].text) || '', lang: (trans[0] && trans[0].lang) || 'en' });
    toast(added ? t('toast.favAdded') : t('toast.favRemoved'), added ? 'star' : 'check');
    touch();
  };
  const numCls = 'verse-num' + (hasComm ? ' hc' : '');

  return html`<div class=${'verse' + (fav ? ' fav' : '') + (note ? ' has-note' : '')} id=${'v' + n}>
    ${showHebrew && he && html`<div class="he-text"><span class=${numCls}>${n}</span>${he}</div>`}
    ${trans.map(x => html`<div class=${'tr-text' + (x.lang === 'he' ? ' rtl' : '')} dir=${x.lang === 'he' ? 'rtl' : 'ltr'} key=${x.lang}>
      ${!(showHebrew && he) && html`<span class=${numCls}>${n}</span>`}${x.text}</div>`)}
    <div class="verse-actions">
      ${hasComm && html`<button class=${'va' + (showComm ? ' on' : '')} title=${t('reader.commentary')} aria-label=${t('reader.commentary')}
        onClick=${() => { setShowComm(v => !v); touch(); }}><${Icon} name="comment" /></button>`}
      <button class=${'va' + (note && !editing ? ' on' : '')} title=${t('reader.addNote')} aria-label=${t('reader.addNote')}
        onClick=${() => { setEditing(v => !v); touch(); }}><${Icon} name="edit" /></button>
      <button class=${'va fav' + (fav ? ' on' : '')} title=${fav ? t('reader.unfavorite') : t('reader.favorite')} aria-label=${fav ? t('reader.unfavorite') : t('reader.favorite')}
        onClick=${onFav}><${Icon} name="star" /></button>
      <button class="va" title=${t('reader.copy')} aria-label=${t('reader.copy')} onClick=${copy}><${Icon} name="copy" /></button>
    </div>
    ${showComm && hasComm && html`<${CommentaryPanel} items=${comm} />`}
    ${(editing || note) && html`<${NoteBlock} slug=${slug} chapter=${chapter} n=${n} note=${note} editing=${editing} setEditing=${setEditing} />`}
  </div>`;
}

/* ---------- reader options ---------- */
function OptionsSheet({ book, onClose }) {
  const s = settings.value;
  const scale = s.fontScale;
  return html`<${Sheet} variant="center" title=${t('reader.readerSettings')} onClose=${onClose}>
    <div class="set-row" style="padding-inline:0">
      <div><div class="lab">${t('reader.textSize')}</div></div>
      <div class="row gap-2">
        <button class="iconbtn" onClick=${() => setSettings({ fontScale: Math.max(0.8, +(scale - 0.1).toFixed(2)) })}><${Icon} name="minus" /></button>
        <span class="tnum" style="min-width:42px;text-align:center;font-weight:700">${Math.round(scale * 100)}%</span>
        <button class="iconbtn" onClick=${() => setSettings({ fontScale: Math.min(1.6, +(scale + 0.1).toFixed(2)) })}><${Icon} name="plus" /></button>
      </div>
    </div>
    <div class="set-row" style="padding-inline:0">
      <div><div class="lab">${t('settings.showHebrew')}</div><div class="hint">${t('settings.showHebrewHint')}</div></div>
      <${Switch} checked=${s.showHebrew} onChange=${v => setSettings({ showHebrew: v })} />
    </div>
    <div style="padding:15px 0 4px"><div class="lab" style="margin-bottom:10px">${t('reader.languages')}</div>
      <div class="chips-wrap">
        ${TRANS_LANGS.map(l => {
          const has = book.langs.includes(l);
          const on = s.transLangs.includes(l);
          return html`<button key=${l} class=${'chip-toggle' + (on ? ' on' : '')} disabled=${!has}
            title=${has ? '' : t('reader.noTranslation')}
            onClick=${() => toggleTransLang(l)}>${({ ru: 'Русский', en: 'English', de: 'Deutsch' })[l]}</button>`;
        })}
      </div>
    </div>
  <//>`;
}

/* ---------- print options ---------- */
function PrintSheet({ book, meta, chapter, comm, onClose }) {
  const opt = useSignal({ he: settings.value.showHebrew, tr: true, comm: false, notes: true });
  const set = (k, v) => { opt.value = { ...opt.value, [k]: v }; };
  const avail = availableTrans(book, settings.value.transLangs);
  const doPrint = () => {
    const o = opt.value;
    const heV = book.text.he ? book.text.he[chapter - 1] || [] : [];
    const trLang = avail.langs[0];
    const trV = trLang ? (book.text[trLang] ? book.text[trLang][chapter - 1] || [] : []) : [];
    const count = (meta.verseCounts && meta.verseCounts[chapter - 1]) || heV.length;
    const chComm = comm && comm.chapters ? comm.chapters[String(chapter)] : null;
    const verses = [];
    for (let i = 0; i < count; i++) {
      const n = i + 1;
      const note = o.notes ? getNote(meta.slug, chapter, n) : null;
      let cm = [];
      if (o.comm && chComm && chComm[String(n)]) {
        const L = lang.value;
        cm = chComm[String(n)].map(c => ({
          who: c.en,
          text: L === 'ru' ? (c.textRu || c.textEn || c.textHe)
              : L === 'he' ? (c.textHe || c.textRu || c.textEn)
              : (c.textEn || c.textRu || c.textHe),
        }));
      }
      verses.push({
        n,
        he: o.he ? heV[i] : '',
        tr: o.tr ? trV[i] : '',
        trRtl: trLang === 'he',
        note: note ? note.text : '',
        comm: cm,
      });
    }
    const date = new Intl.DateTimeFormat(lang.value, { dateStyle: 'long' }).format(new Date());
    printDoc({
      title: `${bookName(meta, lang.value)} ${chapter}`,
      subtitle: trLang ? `${bookName(meta, 'he')} · ${book.attribution[trLang] ? book.attribution[trLang].title : ''}` : bookName(meta, 'he'),
      verses,
      footerLeft: t('print.preparedWith'),
      footerRight: `${t('print.source')}: Sefaria · ${date}`,
    });
    onClose();
  };
  const Row = (k, label) => html`<div class="set-row" style="padding-inline:0">
    <div class="lab">${label}</div><${Switch} checked=${opt.value[k]} onChange=${v => set(k, v)} /></div>`;
  return html`<${Sheet} variant="center" title=${t('reader.print')} onClose=${onClose}>
    <p class="muted" style="margin:-4px 0 14px;font-size:.88rem">${t('print.preview')}</p>
    ${Row('he', t('print.includeHebrew'))}
    ${Row('tr', t('print.includeTranslation'))}
    ${comm ? Row('comm', t('print.includeCommentary')) : ''}
    ${Row('notes', t('print.includeNotes'))}
    <button class="btn btn-primary btn-block btn-lg" style="margin-top:18px" onClick=${doPrint}>
      <${Icon} name="printer" />${t('print.printNow')}</button>
  <//>`;
}

/* ---------- reader ---------- */
export function Reader() {
  const parts = route.value.parts;
  const slug = parts[1];
  const chapter = Math.max(1, parseInt(parts[2], 10) || 1);
  const [data, setData] = useState({ loading: true });
  const [optsOpen, setOptsOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [chOpen, setChOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(d => ({ ...d, loading: true, error: false }));
    Promise.all([loadBook(slug), loadCommentary(slug)])
      .then(([book, comm]) => { if (alive) setData({ loading: false, book, comm }); })
      .catch(() => { if (alive) setData({ loading: false, error: true }); });
    return () => { alive = false; };
  }, [slug]);

  // deep-link to a verse (?v=N) with flash highlight; otherwise scroll to top
  useEffect(() => {
    if (!data.book) return;
    const v = parseInt(route.value.query.v, 10);
    const el = v ? document.getElementById('v' + v) : null;
    if (el) {
      el.scrollIntoView({ block: 'center' });
      el.classList.add('jump');
      setTimeout(() => el.classList.remove('jump'), 1700);
      setLastRead(slug, chapter, v);
    } else {
      window.scrollTo({ top: 0 });
      setLastRead(slug, chapter, 1);
    }
  }, [slug, chapter, data.book]);

  // reading progress + scroll-to-top fab
  const [scrollPct, setScrollPct] = useState(0);
  const [showFab, setShowFab] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        setScrollPct(max > 0 ? window.scrollY / max : 0);
        setShowFab(window.scrollY > 600);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [slug, chapter]);

  const meta = getMeta(slug);
  if (data.loading) return html`<div class="container main"><div class="spinner"></div></div>`;
  if (data.error || !meta) {
    return html`<div class="container main"><div class="empty"><div class="ic"><${Icon} name="book" size=28 /></div>
      <h3>${t('common.loading')}</h3><p>${slug}</p>
      <div style="margin-top:16px"><a class="btn btn-primary" href="#/library">${t('nav.library')}</a></div></div></div>`;
  }

  const book = data.book;
  const s = settings.value;
  const heV = book.text.he ? book.text.he[chapter - 1] || [] : [];
  const avail = availableTrans(book, s.transLangs);
  const count = (meta.verseCounts && meta.verseCounts[chapter - 1]) || heV.length;
  const chComm = data.comm && data.comm.chapters ? data.comm.chapters[String(chapter)] : null;

  const prev = neighbor(slug, chapter, -1);
  const next = neighbor(slug, chapter, +1);

  // keyboard: ← / → switch chapters (flipped in RTL), ignored while typing
  // (deps on slug/chapter only — recomputing neighbor() fresh avoids re-registering
  // these listeners on every unrelated re-render, e.g. scroll-driven progress updates)
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (document.querySelector('.sheet')) return; // a modal (chapter picker, options, print) is open
      const rtl = lang.value === 'he';
      const dst = (e.key === 'ArrowLeft') ? neighbor(slug, chapter, rtl ? 1 : -1)
        : (e.key === 'ArrowRight') ? neighbor(slug, chapter, rtl ? -1 : 1) : null;
      if (dst) navigate(`/read/${dst.slug}/${dst.chapter}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slug, chapter]);

  // swipe left/right on touch devices → next/prev chapter
  useEffect(() => {
    let x0 = 0, y0 = 0, t0 = 0;
    const start = (e) => { const p = e.touches[0]; x0 = p.clientX; y0 = p.clientY; t0 = Date.now(); };
    const end = (e) => {
      if (document.querySelector('.sheet') || (window.getSelection() + '').length) return;
      const p = e.changedTouches[0];
      const dx = p.clientX - x0, dy = p.clientY - y0, dt = Date.now() - t0;
      if (dt > 600 || Math.abs(dx) < 72 || Math.abs(dy) > 56) return;
      const rtl = lang.value === 'he';
      const fwd = rtl ? dx > 0 : dx < 0; // swipe toward "next" respects direction
      const dst = neighbor(slug, chapter, fwd ? 1 : -1);
      if (dst) navigate(`/read/${dst.slug}/${dst.chapter}`);
    };
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchend', end, { passive: true });
    return () => { window.removeEventListener('touchstart', start); window.removeEventListener('touchend', end); };
  }, [slug, chapter]);

  // is this chapter part of today's personal cycle portion?
  let inCycle = false;
  if (s.cycle) {
    const p = portionForDay(s.cycle, personalDayIndex(s));
    inCycle = p.segments.some(g => g.slug === slug && g.chapter === chapter);
  }

  const verses = [];
  for (let i = 0; i < count; i++) {
    const n = i + 1;
    const trans = avail.langs.map(l => ({ lang: l, text: book.text[l] && book.text[l][chapter - 1] ? book.text[l][chapter - 1][i] : '' }))
      .filter(x => x.text);
    const comm = chComm && chComm[String(n)] ? chComm[String(n)] : null;
    verses.push(html`<${VerseRow} key=${slug + chapter + n} slug=${slug} chapter=${chapter} n=${n}
      he=${heV[i]} trans=${trans} comm=${comm} showHebrew=${s.showHebrew} />`);
  }

  const finish = () => { markChapterRead(slug, chapter); toast(t('toast.chapterDone'), 'checkCircle'); };
  const isRead = !!profile.value.read[slug + '.' + chapter];
  const chevNext = lang.value === 'he' ? 'chevronLeft' : 'chevronRight';
  const chevPrev = lang.value === 'he' ? 'chevronRight' : 'chevronLeft';

  return html`<div class="main">
    <div class="read-progress" aria-hidden="true"><i style=${`width:${(scrollPct * 100).toFixed(1)}%`}></i></div>
    <button class=${'fab' + (showFab ? ' show' : '')} aria-label="↑"
      onClick=${() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      <${Icon} name="chevronDown" size=20 />
    </button>
    <div class="reader-top">
      <div class="container"><div class="container2">
        <div class="row gap-2">
          <a class="iconbtn" href="#/book/${slug}" aria-label=${t('common.back')}><${Icon} name=${chevPrev} /></a>
          <button class="reader-title" onClick=${() => setChOpen(true)} aria-label=${t('library.selectChapter')}>
            <span class="bk">${bookName(meta, lang.value)}</span>
            <span class="ch">${t('common.chapter')} ${chapter} ▾ · ${t('sections.' + meta.section)}</span>
          </button>
        </div>
        <div class="reader-tools">
          <button class="iconbtn" title=${t('reader.readerSettings')} onClick=${() => setOptsOpen(true)}><${Icon} name="type" /></button>
          <button class="iconbtn" title=${t('reader.print')} onClick=${() => setPrintOpen(true)}><${Icon} name="printer" /></button>
        </div>
      </div></div>
    </div>

    <div class="container">
      ${inCycle && html`<div class="cycle-banner"><${Icon} name="sparkles" size=16 />${t('reader.inThisCycle')}</div>`}
      ${avail.fallback && html`<div class="translit-note"><${Icon} name="info" size=16 />${t('reader.noTranslationHint')}</div>`}

      <div class="reader fade">${verses}</div>

      <div class="chapter-mark">
        <button class=${'btn ' + (isRead ? 'btn-ghost' : 'btn-primary')} onClick=${finish} disabled=${isRead}>
          <${Icon} name=${isRead ? 'checkCircle' : 'check'} />${isRead ? t('reader.chapterDone') : t('reader.finishChapter')}</button>
      </div>

      <div class="reader-foot">
        <button class="btn btn-outline" disabled=${!prev} onClick=${() => prev && navigate(`/read/${prev.slug}/${prev.chapter}`)}>
          <${Icon} name=${chevPrev} />${t('reader.prevChapter')}</button>
        <button class="btn btn-outline" disabled=${!next} onClick=${() => next && navigate(`/read/${next.slug}/${next.chapter}`)}>
          ${t('reader.nextChapter')}<${Icon} name=${chevNext} /></button>
      </div>
    </div>

    ${chOpen && html`<${Sheet} variant="center" title=${t('library.selectChapter')} onClose=${() => setChOpen(false)}>
      <div class="chapter-grid" style="margin-bottom:6px">
        ${Array.from({ length: meta.chapters }, (_, i) => i + 1).map(c => html`<div key=${c}
          class=${'chapter-cell' + (profile.value.read[slug + '.' + c] ? ' read' : '') + (c === chapter ? ' current' : '')}
          onClick=${() => { setChOpen(false); navigate(`/read/${slug}/${c}`); }}>${c}</div>`)}
      </div>
    <//>`}
    ${optsOpen && html`<${OptionsSheet} book=${book} onClose=${() => setOptsOpen(false)} />`}
    ${printOpen && html`<${PrintSheet} book=${book} meta=${meta} chapter=${chapter} comm=${data.comm} onClose=${() => setPrintOpen(false)} />`}
  </div>`;
}
