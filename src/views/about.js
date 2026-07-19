import { html } from '../lib/html.js';
import { t } from '../lib/i18n.js';
import { attribution, totals } from '../lib/data.js';
import { Icon } from '../lib/icons.js';

const LANG_LABEL = {
  he: 'עברית', ru: 'Русский',
  en: 'English — Ктувим', steinsaltz: 'English — Невиим (Steinsaltz)',
  de: 'Deutsch', de_ezekiel: 'Deutsch — Йехезкель (Breuer)',
};

export function About() {
  const at = attribution();
  const T = totals();
  const block = (icon, title, body) => html`<div class="card pad rise" style="display:flex;gap:14px">
    <div class="mini-card-ic" style="width:42px;height:42px;border-radius:12px;background:var(--blue-tint);color:var(--blue);display:flex;align-items:center;justify-content:center;flex:none">
      <${Icon} name=${icon} /></div>
    <div><h3 style="font-size:1.02rem;margin-bottom:5px">${title}</h3><p class="muted" style="line-height:1.6;font-size:.93rem">${body}</p></div>
  </div>`;
  return html`<div class="container main" style="max-width:760px">
    <div class="page-head rise"><h1 class="display">${t('about.title')}</h1>
      <p class="sub" style="line-height:1.65;max-width:60ch">${t('about.intro')}</p></div>

    <div class="stack gap-4" style="margin-bottom:28px">
      ${block('layers', `${T.books} ${t('units.books')} · ${T.chapters} ${t('units.chapters')}`, t('about.sourcesBody'))}
      ${block('download', t('about.offline'), t('about.offlineBody'))}
      ${block('user', t('about.privacy'), t('about.privacyBody'))}
    </div>

    <div class="settings-group rise">
      <div class="gh">${t('about.licenses')}</div>
      <div class="card">
        ${Object.keys(at).map(l => html`<div class="set-row" key=${l}>
          <div class="grow">
            <div class="lab">${LANG_LABEL[l] || l} — ${at[l].title}</div>
            <div class="hint">${at[l].by}</div>
          </div>
          <span class="chip ${at[l].license === 'Public Domain' ? 'blue' : ''}">${at[l].license}</span>
        </div>`)}
        <div class="set-row">
          <div class="grow"><div class="lab">Sefaria</div><div class="hint">www.sefaria.org — texts, translations & commentary</div></div>
          <a class="iconbtn" href="https://www.sefaria.org" target="_blank" rel="noopener"><${Icon} name="external" size=18 /></a>
        </div>
      </div>
    </div>
  </div>`;
}
