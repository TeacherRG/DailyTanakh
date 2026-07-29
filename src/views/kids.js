// Детский режим: главная, библиотека историй, читалка, награды.
import { html, useState, useEffect } from '../lib/html.js';
import { t, lang } from '../lib/i18n.js';
import { settings, profile, toast } from '../lib/store.js';
import { route, navigate } from '../lib/router.js';
import { Icon } from '../lib/icons.js';
import { Empty, ProgressRing } from '../components/ui.js';
import {
  loadKids, kids, allStories, kidsBooks, story, bookOfStory, totalStories,
  todayStory, kidsDayIndex, daysPerStory, startKidsCycle, KIDS_DAYS,
  isStoryRead, markStoryRead, isStoryStarred, toggleStar,
  nextStory, prevStory, continueStory, kidsStats, earnedBadges,
} from '../lib/kids.js';

/* ================= общая загрузка данных ================= */
function useKids() {
  const [state, setState] = useState({ loading: !kids(), data: kids() });
  useEffect(() => {
    if (kids()) { setState({ loading: false, data: kids() }); return; }
    let alive = true;
    loadKids().then(d => alive && setState({ loading: false, data: d }))
              .catch(() => alive && setState({ loading: false, error: true }));
    return () => { alive = false; };
  }, []);
  return state;
}
const Loading = () => html`<div class="container main"><div class="spinner"></div></div>`;

/* ================= ГЛАВНАЯ ================= */
export function KidsHome() {
  const { loading, data, error } = useKids();
  if (loading) return html`<${Loading} />`;
  if (error || !data) return html`<div class="container main"><${Empty} icon="book"
    title=${t('kids.loadFail')} body="data/kids.json" /></div>`;

  const st = kidsStats.value;
  const n = todayStory();
  const s = story(n);
  const day = kidsDayIndex() + 1;
  const cont = continueStory();
  const total = totalStories();
  // «путь» — 24 точки, показывающие продвижение по всем историям
  const dots = Array.from({ length: 24 }, (_, i) => {
    const from = Math.floor(i * total / 24) + 1;
    const to = Math.floor((i + 1) * total / 24);
    const read = profile.value.kidsRead || {};
    let done = 0, cnt = 0;
    for (let x = from; x <= Math.max(from, to); x++) { cnt++; if (read[x]) done++; }
    return { done: cnt > 0 && done === cnt, now: n >= from && n <= Math.max(from, to) };
  });

  return html`<div class="container main">
    <div class="greeting rise" style="margin-bottom:10px">${t('kids.hello')}</div>

    <section class="hero rise">
      <${Icon} name="sparkles" size=120 cls="star" />
      <div style="position:absolute;top:18px;inset-inline-end:22px" class="hide-sm">
        <span class="daybadge"><${Icon} name="calendar" size=15 />${t('kids.dayOf', { n: day, total: KIDS_DAYS })}</span>
      </div>
      <div class="eyebrow">${t('kids.todayStory')}</div>
      <h1 class="display" style="font-size:clamp(1.6rem,3.9vw,2.3rem);margin-top:10px">${s ? s.title : ''}</h1>
      <div class="hebdate">${s ? s.book : ''} · ${t('kids.storyNo', { n })}</div>
      <div class="kid-path" aria-hidden="true">
        ${dots.map((d, i) => html`<i key=${i} class=${(d.done ? 'done' : '') + (d.now ? ' now' : '')}></i>`)}
      </div>
      <div class="hero-actions">
        <button class="btn btn-primary btn-lg" onClick=${() => navigate('/kids/story/' + n)}>
          <${Icon} name="bookOpen" />${t('kids.read')}</button>
        ${cont !== n && html`<button class="btn btn-outline btn-lg" onClick=${() => navigate('/kids/story/' + cont)}>
          <${Icon} name="play" />${t('kids.continue')}</button>`}
      </div>
    </section>

    <div class="kid-stats rise" style="margin-top:24px">
      <div class="kid-stat"><div class="n">${st.read}</div><div class="l">${t('kids.storiesRead')}</div></div>
      <div class="kid-stat"><div class="n">${st.streak}</div><div class="l">${t('kids.streak')}</div></div>
      <div class="kid-stat"><div class="n">${st.stars}</div><div class="l">${t('kids.favorites')}</div></div>
    </div>

    <div class="card pad rise" style="margin-top:16px">
      <div class="row gap-5" style="align-items:center;flex-wrap:wrap">
        <${ProgressRing} value=${st.percent / 100} size=110 stroke=10>
          <div style="font-size:1.45rem;font-weight:800;color:var(--blue)">${st.percent}%</div>
          <div style="font-size:.66rem;color:var(--muted);font-weight:700">${st.read}/${st.total}</div>
        <//>
        <div class="grow" style="min-width:200px">
          <div style="font-weight:700;font-size:1.02rem;margin-bottom:6px">${t('kids.yourJourney')}</div>
          <div class="muted" style="font-size:.9rem;line-height:1.55">
            ${t('kids.journeyBody', { books: st.booksDone, total: st.booksTotal })}</div>
          <a class="btn btn-ghost btn-sm" href="#/kids/library" style="margin-top:12px">
            <${Icon} name="library" size=16 />${t('kids.allStories')}</a>
        </div>
      </div>
    </div>

    <div class="section-head"><h2>${t('kids.awards')}</h2>
      <a class="btn btn-ghost btn-sm" href="#/kids/awards">${t('common.more')}</a></div>
    <${BadgeRow} limit=${4} />
  </div>`;
}

/* ================= НАГРАДЫ ================= */
function BadgeRow({ limit }) {
  const list = earnedBadges();
  const shown = limit ? list.slice(0, limit) : list;
  return html`<div class="badges rise">
    ${shown.map(b => html`<div class=${'badge-card' + (b.earned ? ' on' : '')} key=${b.id}>
      <div class="ic"><${Icon} name=${b.earned ? b.icon : 'award'} size=24 /></div>
      <div class="nm">${t('kids.badge.' + b.id)}</div>
      <div class="ds">${t('kids.badgeD.' + b.id)}</div>
    </div>`)}
  </div>`;
}

export function KidsAwards() {
  const { loading } = useKids();
  if (loading) return html`<${Loading} />`;
  const st = kidsStats.value;
  const got = earnedBadges().filter(b => b.earned).length;
  return html`<div class="container main">
    <div class="page-head rise">
      <h1 class="display">${t('kids.awards')}</h1>
      <div class="sub">${t('kids.awardsSub', { n: got, total: earnedBadges().length })}</div>
    </div>
    <${BadgeRow} />
    <div class="section-head"><h2>${t('kids.byBooks')}</h2></div>
    <div class="stack gap-4 rise">
      ${kidsBooks().map(b => {
        const read = profile.value.kidsRead || {};
        const done = b.chapters.filter(n => read[n]).length;
        return html`<div key=${b.title}>
          <div class="between" style="margin-bottom:6px">
            <span style="font-weight:600;font-size:.94rem">${b.title}</span>
            <span class="tnum muted" style="font-size:.82rem">${done} / ${b.chapters.length}</span>
          </div>
          <div class="bar"><i style=${`width:${Math.round(done / b.chapters.length * 100)}%`}></i></div>
        </div>`;
      })}
    </div>
  </div>`;
}

/* ================= БИБЛИОТЕКА ИСТОРИЙ ================= */
export function KidsLibrary() {
  const { loading, data } = useKids();
  if (loading) return html`<${Loading} />`;
  if (!data) return html`<div class="container main"><${Empty} icon="book" title=${t('kids.loadFail')} /></div>`;
  const read = profile.value.kidsRead || {};
  const today = todayStory();
  const st = kidsStats.value;

  return html`<div class="container main">
    <div class="page-head rise">
      <h1 class="display">${t('kids.allStories')}</h1>
      <div class="sub">${t('kids.libSub', { total: st.total, read: st.read })}</div>
    </div>
    ${kidsBooks().map(b => html`<div class="rise" key=${b.title}>
      <div class="section-head">
        <h2>${b.title}</h2>
        <span class="tag">${b.chapters.filter(n => read[n]).length}/${b.chapters.length}</span>
      </div>
      <div class="story-grid">
        ${b.chapters.map(n => {
          const s = story(n); if (!s) return null;
          const cls = 'card hover story-card' + (read[n] ? ' done' : '') + (n === today ? ' today' : '');
          return html`<div class=${cls} key=${n} onClick=${() => navigate('/kids/story/' + n)}>
            <div class="num">${read[n] ? html`<${Icon} name="check" size=18 />` : n}</div>
            <div class="grow">
              <div class="t">${s.title}</div>
              <div class="b">${n === today ? t('kids.todayLabel') : t('kids.storyNo', { n })}</div>
            </div>
            ${isStoryStarred(n) && html`<span class="star"><${Icon} name="star" size=15 fill="currentColor" /></span>`}
          </div>`;
        })}
      </div>
    </div>`)}
  </div>`;
}

/* ================= ЧИТАЛКА ИСТОРИИ ================= */
export function KidsStory() {
  const { loading, data } = useKids();
  const n = Math.max(1, parseInt(route.value.parts[2], 10) || 1);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [n]);

  if (loading) return html`<${Loading} />`;
  const s = data && story(n);
  if (!s) return html`<div class="container main"><${Empty} icon="book" title=${t('kids.notFound')}
    action=${html`<a class="btn btn-primary" href="#/kids/library">${t('kids.allStories')}</a>`} /></div>`;

  const book = bookOfStory(n);
  const done = isStoryRead(n);
  const starred = isStoryStarred(n);
  const prev = prevStory(n), next = nextStory(n);
  const chevPrev = lang.value === 'he' ? 'chevronRight' : 'chevronLeft';
  const chevNext = lang.value === 'he' ? 'chevronLeft' : 'chevronRight';

  const finish = () => {
    if (markStoryRead(n)) toast(t('kids.wellDone'), 'checkCircle');
    if (next) setTimeout(() => navigate('/kids/story/' + next), 700);
  };

  return html`<div class="container main">
    <div class="story-top rise">
      <a class="btn btn-ghost btn-sm" href="#/kids/library"><${Icon} name=${chevPrev} size=16 />${t('kids.allStories')}</a>
      <div class="row gap-2">
        <button class=${'iconbtn' + (starred ? ' on' : '')} title=${t('kids.favorite')}
          style=${starred ? 'color:var(--kid-sun)' : ''}
          onClick=${() => { const a = toggleStar(n); toast(a ? t('kids.starred') : t('kids.unstarred'), 'star'); }}>
          <${Icon} name="star" fill=${starred ? 'currentColor' : 'none'} /></button>
      </div>
    </div>

    <div class="story">
      <div class="story-badge rise"><${Icon} name="book" size=15 />${book ? book.title : ''} · ${t('kids.storyNo', { n })}</div>
      <h1 class="display rise" style="font-size:clamp(1.6rem,4vw,2.2rem);margin:12px 0 18px">${s.title}</h1>
      ${s.intro && html`<div class="lede rise">${s.intro}</div>`}

      ${s.blocks.map((b, bi) => html`<div key=${bi}>
        ${b.h && html`<h2>${b.h}</h2>`}
        ${b.p.map((p, pi) => typeof p === 'string'
          ? html`<p key=${pi}>${p}</p>`
          : html`<div class="quote" key=${pi}>${p.q}</div>`)}
      </div>`)}

      ${(s.questions || []).map((q, qi) => html`<div class="think" key=${qi}>
        <div class="lab"><${Icon} name="sparkles" size=15 />${t('kids.think')}</div>
        <p>${q}</p>
      </div>`)}

      <div class="story-foot">
        <button class=${'btn ' + (done ? 'btn-ghost' : 'btn-primary')} onClick=${finish} disabled=${done}>
          <${Icon} name=${done ? 'checkCircle' : 'check'} />${done ? t('kids.doneRead') : t('kids.markRead')}</button>
        ${prev && html`<button class="btn btn-outline" onClick=${() => navigate('/kids/story/' + prev)}>
          <${Icon} name=${chevPrev} />${t('kids.prev')}</button>`}
        ${next && html`<button class="btn btn-outline" onClick=${() => navigate('/kids/story/' + next)}>
          ${t('kids.next')}<${Icon} name=${chevNext} /></button>`}
      </div>
    </div>
  </div>`;
}
