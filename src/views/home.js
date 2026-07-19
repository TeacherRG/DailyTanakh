import { html } from '../lib/html.js';
import { t, lang, bookName } from '../lib/i18n.js';
import { settings, profile, stats, markChapterRead, toast } from '../lib/store.js';
import { portionForDay, personalDayIndex, communalDayIndex, cycleProgress } from '../lib/schedule.js';
import { totals, getMeta } from '../lib/data.js';
import { navigate } from '../lib/router.js';
import { greetKey, segLabel, relTime, refLabel } from '../lib/util.js';
import { Icon } from '../lib/icons.js';
import { ProgressRing } from '../components/ui.js';

const FEATURED = [
  { slug: 'psalms', chapter: 23 }, { slug: 'isaiah', chapter: 40 }, { slug: 'ruth', chapter: 1 },
  { slug: 'jonah', chapter: 2 }, { slug: 'ecclesiastes', chapter: 3 }, { slug: 'proverbs', chapter: 3 },
];

function dateLine() {
  try {
    const s = new Intl.DateTimeFormat(lang.value, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch { return new Date().toDateString(); }
}

function hebrewDateLine() {
  try {
    const loc = (lang.value === 'he' ? 'he' : lang.value) + '-u-ca-hebrew';
    const parts = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric' })
      .formatToParts(new Date());
    while (parts.length && ['era', 'literal'].includes(parts[parts.length - 1].type)) parts.pop();
    return parts.map(p => p.value).join('');
  } catch { return ''; }
}

function TodayHero() {
  const s = settings.value;
  const cycle = s.cycle;
  const dayIdx = personalDayIndex(s);
  const p = portionForDay(cycle, dayIdx);
  const first = p.segments[0];
  const open = () => first && navigate(`/read/${first.slug}/${first.chapter}`);
  const markAll = () => {
    const chs = [...new Set(p.segments.map(g => g.slug + '.' + g.chapter))];
    chs.forEach(k => { const [sl, ch] = k.split('.'); markChapterRead(sl, +ch); });
    toast(t('toast.chapterDone'), 'checkCircle');
  };
  const allRead = p.segments.every(g => profile.value.read[g.slug + '.' + g.chapter]);
  return html`<section class="hero rise">
    <${Icon} name="sparkles" size=120 cls="star" />
    <div style="position:absolute;top:18px;inset-inline-end:22px" class="hide-sm">
      <span class="daybadge"><${Icon} name="calendar" size=15 />${t('home.dayOf', { n: p.day, total: p.days })}</span>
    </div>
    <div class="eyebrow">${t('home.todaysReading')}</div>
    <h1 class="display" style="font-size:clamp(1.7rem,4vw,2.5rem);margin-top:10px">${dateLine()}</h1>
    ${(() => { const hd = hebrewDateLine(); return hd && html`<div class="hebdate">${hd}</div>`; })()}
    <div class="tracks">
      ${['neviim', 'ketuvim'].map(key => {
        const segs = p.tracks[key].segments;
        if (!segs.length) return null;
        return html`<div class="track-row" key=${key}>
          <span class="track-tag">${t('sections.' + key)}</span>
          <div class="track-pills">
            ${segs.slice(0, 4).map(g => {
              const done = !!profile.value.read[g.slug + '.' + g.chapter];
              return html`<button class=${'seg-pill' + (done ? ' done' : '')} key=${g.slug + g.chapter}
                onClick=${() => navigate(`/read/${g.slug}/${g.chapter}${g.vFrom > 1 ? `?v=${g.vFrom}` : ''}`)}>
                ${done && html`<span class="pcheck"><${Icon} name="check" size=10 /></span>`}
                <span class="heb">${bookName(getMeta(g.slug), 'he')}</span>${segLabel(g, lang.value)}</button>`;
            })}
            ${segs.length > 4 && html`<span class="seg-pill">+${segs.length - 4}</span>`}
          </div>
        </div>`;
      })}
    </div>
    <div class="hero-actions">
      <button class="btn btn-primary btn-lg" onClick=${open}><${Icon} name="bookOpen" />${t('home.openReading')}</button>
      <button class="btn btn-outline btn-lg" onClick=${markAll} disabled=${allRead}>
        <${Icon} name=${allRead ? 'checkCircle' : 'check'} />${allRead ? t('home.markedRead') : t('home.markRead')}</button>
    </div>
  </section>`;
}

function StartHero() {
  return html`<section class="hero rise">
    <${Icon} name="layers" size=120 cls="star" />
    <div class="eyebrow">DailyTanakh</div>
    <h1 class="display" style="font-size:clamp(1.7rem,4vw,2.4rem);margin-top:10px">${t('home.noCycleTitle')}</h1>
    <p style="max-width:42ch;margin-top:12px;color:rgba(255,255,255,.85);line-height:1.6">${t('home.noCycleBody')}</p>
    <div class="hero-actions">
      <button class="btn btn-primary btn-lg" onClick=${() => navigate('/start')}><${Icon} name="play" />${t('home.chooseCycle')}</button>
    </div>
  </section>`;
}

function ContinueCard() {
  const lr = profile.value.lastRead;
  if (!lr) return null;
  return html`<div class="card hover card-link mini-card rise"
    onClick=${() => navigate(`/read/${lr.slug}/${lr.chapter}${lr.verse > 1 ? `?v=${lr.verse}` : ''}`)}>
    <div class="ic"><${Icon} name="bookmark" /></div>
    <div class="grow">
      <div class="t">${refLabel(lr.slug, lr.chapter, lr.verse)}</div>
      <div class="s">${t('home.continueHint')} · ${relTime(lr.ts)}</div>
    </div>
    <${Icon} name=${lang.value === 'he' ? 'chevronLeft' : 'chevronRight'} cls="faint" />
  </div>`;
}

function ProgressCard() {
  const st = stats.value;
  const T = totals();
  const frac = T.chapters ? st.chaptersRead / T.chapters : 0;
  const cp = cycleProgress(settings.value);
  return html`<div class="card pad rise">
    <div class="row gap-5" style="align-items:center">
      <${ProgressRing} value=${frac} size=112 stroke=10>
        <div style="font-size:1.5rem;font-weight:700;color:var(--blue)">${Math.round(frac * 100)}%</div>
        <div style="font-size:.66rem;color:var(--muted);font-weight:600">${t('home.cycleProgress')}</div>
      <//>
      <div class="grow stat-grid">
        <div class="stat"><div class="n"><${Icon} name="flame" size=18 cls="streak-flame" /> ${st.streak}</div><div class="l">${t('home.streak')}</div></div>
        <div class="stat"><div class="n">${st.chaptersRead}</div><div class="l">${t('home.chaptersRead')}</div></div>
        <div class="stat"><div class="n">${st.favorites}</div><div class="l">${t('home.favorites')}</div></div>
        <div class="stat"><div class="n">${st.notes}</div><div class="l">${t('home.notes')}</div></div>
      </div>
    </div>
    ${settings.value.cycle && html`<div style="margin-top:18px">
      <div class="between" style="margin-bottom:7px"><span class="muted" style="font-size:.82rem;font-weight:600">${t('home.cycleProgress')}</span>
        <span class="tnum" style="font-size:.82rem;font-weight:700;color:var(--blue)">${Math.round(cp * 100)}%</span></div>
      <div class="bar"><i style=${`width:${Math.max(2, cp * 100)}%`}></i></div>
    </div>`}
  </div>`;
}

function CommunityStrip() {
  const cycle = settings.value.cycle || '1yr';
  const p = portionForDay(cycle, communalDayIndex());
  const seg = p.segments[0];
  const letters = ['א', 'ב', 'ש', 'מ'];
  return html`<div class="community rise">
    <div class="av">${letters.map((l, i) => html`<span key=${i} style=${`z-index:${4 - i}`}>${l}</span>`)}</div>
    <div class="grow">
      <div style="font-weight:600;font-size:.9rem;display:flex;align-items:center;gap:8px">
        <span class="dot live"></span>${t('home.community')}</div>
      <div class="s muted" style="font-size:.82rem;margin-top:2px">${seg ? segLabel(seg) : ''}</div>
    </div>
  </div>`;
}

function Featured() {
  return html`<div class="rise">
    <div class="section-head"><h2>${t('home.featuredTitle')}</h2></div>
    <div class="feature-grid">
      ${FEATURED.map(f => {
        const m = getMeta(f.slug); if (!m) return null;
        return html`<div class="card hover card-link feature-card" key=${f.slug + f.chapter}
          onClick=${() => navigate(`/read/${f.slug}/${f.chapter}`)}>
          <div class="heb">${bookName(m, 'he')}</div>
          <div class="nm">${bookName(m, lang.value)} ${f.chapter}</div>
          <div class="sub">${m.hasCommentary ? t('library.hasCommentary') : t('sections.' + m.section)}</div>
        </div>`;
      })}
    </div>
  </div>`;
}

export function Home() {
  const hasCycle = !!settings.value.cycle;
  return html`<div class="container main">
    <div class="greeting rise" style="margin-bottom:10px">${t('home.' + greetKey())}.</div>
    ${hasCycle ? html`<${TodayHero} />` : html`<${StartHero} />`}
    <div class="home-grid" style="margin-top:24px">
      <div class="stack gap-4">
        <${ContinueCard} />
        <${Featured} />
      </div>
      <div class="stack gap-4">
        <${ProgressCard} />
        <${CommunityStrip} />
        ${hasCycle && html`<div class="card hover card-link mini-card rise" onClick=${() => navigate('/start')}>
          <div class="ic amber"><${Icon} name="refresh" /></div>
          <div class="grow"><div class="t">${t('settings.cycle')}</div>
            <div class="s">${settings.value.cycle === '3yr' ? t('cycle.threeYears') : t('cycle.oneYear')}</div></div>
          <${Icon} name=${lang.value === 'he' ? 'chevronLeft' : 'chevronRight'} cls="faint" />
        </div>`}
      </div>
    </div>
  </div>`;
}
