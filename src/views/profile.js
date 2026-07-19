import { html, useSignal } from '../lib/html.js';
import { t, lang, bookName } from '../lib/i18n.js';
import { profile, stats, deleteNote, toggleFavorite, toast } from '../lib/store.js';
import { allBooks, totals } from '../lib/data.js';
import { navigate } from '../lib/router.js';
import { refLabel, relTime } from '../lib/util.js';
import { Icon } from '../lib/icons.js';
import { ProgressRing, Empty } from '../components/ui.js';

function NotesTab() {
  const notes = [...profile.value.notes].sort((a, b) => (b.updated || b.ts) - (a.updated || a.ts));
  if (!notes.length) return html`<${Empty} icon="edit" title=${t('profile.noNotes')} body=${t('profile.noNotesHint')}
    action=${html`<a class="btn btn-primary" href="#/library"><${Icon} name="library" />${t('nav.library')}</a>`} />`;
  return html`<div class="list-stack">
    ${notes.map(n => html`<div class="card hover note-item rise" key=${n.id}
      onClick=${() => navigate(`/read/${n.slug}/${n.chapter}?v=${n.verse}`)}>
      <div class="between">
        <div class="ref"><${Icon} name="bookmark" size=13 />${refLabel(n.slug, n.chapter, n.verse)}</div>
        <button class="va" onClick=${e => { e.stopPropagation(); deleteNote(n.id); toast(t('toast.noteDeleted'), 'trash'); }}
          title=${t('common.delete')}><${Icon} name="trash" size=15 /></button>
      </div>
      <div class="body" dir="auto" style="white-space:pre-wrap">${n.text}</div>
      <div class="when">${t('profile.edited')} ${relTime(n.updated || n.ts)}</div>
    </div>`)}
  </div>`;
}

function FavTab() {
  const favs = profile.value.favorites;
  if (!favs.length) return html`<${Empty} icon="star" title=${t('profile.noFavorites')} body=${t('profile.noFavoritesHint')}
    action=${html`<a class="btn btn-primary" href="#/library"><${Icon} name="library" />${t('nav.library')}</a>`} />`;
  return html`<div class="list-stack">
    ${favs.map(f => html`<div class="card hover fav-item rise" key=${f.id}
      onClick=${() => navigate(`/read/${f.slug}/${f.chapter}?v=${f.verse}`)}>
      <div class="between">
        <div class="ref"><${Icon} name="star" size=13 />${refLabel(f.slug, f.chapter, f.verse)}</div>
        <button class="va fav on" onClick=${e => { e.stopPropagation(); toggleFavorite(f); toast(t('toast.favRemoved'), 'check'); }}
          title=${t('reader.unfavorite')}><${Icon} name="star" size=15 /></button>
      </div>
      ${f.he && html`<div class="heb" dir="rtl">${f.he}</div>`}
      ${f.tr && html`<div class="tr" dir="auto">${f.tr}</div>`}
    </div>`)}
  </div>`;
}

function StatsTab() {
  const p = profile.value;
  const st = stats.value;
  const T = totals();
  const frac = T.chapters ? st.chaptersRead / T.chapters : 0;
  const perBook = allBooks().map(b => {
    const c = Object.keys(p.read).filter(k => k.startsWith(b.slug + '.')).length;
    return { b, c };
  }).filter(x => x.c > 0).sort((a, b) => b.c - a.c);
  return html`<div class="stack gap-5">
    <div class="card pad rise row gap-5" style="align-items:center;flex-wrap:wrap">
      <${ProgressRing} value=${frac} size=128 stroke=11>
        <div style="font-size:1.7rem;font-weight:700;color:var(--blue)">${Math.round(frac * 100)}%</div>
        <div style="font-size:.66rem;color:var(--muted);font-weight:600">${T.chapters} ${t('units.chapters')}</div>
      <//>
      <div class="grow stat-grid" style="min-width:240px">
        <div class="stat"><div class="n"><${Icon} name="flame" size=18 cls="streak-flame" /> ${st.streak}</div><div class="l">${t('profile.currentStreak')}</div></div>
        <div class="stat"><div class="n">${st.best}</div><div class="l">${t('profile.bestStreak')}</div></div>
        <div class="stat"><div class="n">${st.chaptersRead}</div><div class="l">${t('profile.totalRead')}</div></div>
        <div class="stat"><div class="n">${st.favorites}</div><div class="l">${t('home.favorites')}</div></div>
      </div>
    </div>
    ${p.joinDate && html`<div class="muted rise" style="font-size:.88rem">${t('profile.started')}: ${p.joinDate}</div>`}
    ${perBook.length > 0 && html`<div class="rise">
      <div class="section-head"><h2 style="font-size:1.1rem">${t('profile.booksProgress')}</h2></div>
      <div class="stack gap-4">
        ${perBook.map(({ b, c }) => html`<div key=${b.slug}>
          <div class="between" style="margin-bottom:6px">
            <span style="font-weight:600;font-size:.92rem">${bookName(b, lang.value)}</span>
            <span class="tnum muted" style="font-size:.82rem">${c} / ${b.chapters}</span>
          </div>
          <div class="bar"><i style=${`width:${Math.round(c / b.chapters * 100)}%`}></i></div>
        </div>`)}
      </div>
    </div>`}
  </div>`;
}

export function Profile() {
  const tab = useSignal('notes');
  const tabs = [['notes', 'tabNotes'], ['favorites', 'tabFavorites'], ['stats', 'tabStats']];
  return html`<div class="container main">
    <div class="page-head rise"><h1 class="display">${t('profile.title')}</h1><div class="sub">${t('profile.subtitle')}</div></div>
    <div class="tabs rise">
      ${tabs.map(([id, key]) => html`<button key=${id} class=${tab.value === id ? 'on' : ''} onClick=${() => { tab.value = id; }}>${t('profile.' + key)}</button>`)}
    </div>
    ${tab.value === 'notes' ? html`<${NotesTab} />` : tab.value === 'favorites' ? html`<${FavTab} />` : html`<${StatsTab} />`}
  </div>`;
}
