// Экран выбора режима: взрослый (весь Танах) или детский (114 историй).
import { html } from '../lib/html.js';
import { t } from '../lib/i18n.js';
import { settings, setSettings } from '../lib/store.js';
import { navigate } from '../lib/router.js';
import { Icon, Mark } from '../lib/icons.js';
import { todayISO } from '../lib/schedule.js';

export function pickMode(mode) {
  const patch = { mode };
  if (mode === 'kids' && !settings.value.kidsStart) patch.kidsStart = todayISO();
  setSettings(patch);
  navigate(mode === 'kids' ? '/kids' : '/');
}

function Card({ mode, icon, feats }) {
  return html`<div class=${'mode-card ' + mode} onClick=${() => pickMode(mode)} role="button" tabindex="0"
    onKeyDown=${e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickMode(mode); } }}>
    <div class="ic"><${Icon} name=${icon} size=30 /></div>
    <h2>${t('mode.' + mode + 'Title')}</h2>
    <p>${t('mode.' + mode + 'Body')}</p>
    <div class="feats">
      ${feats.map(f => html`<div key=${f}><${Icon} name="check" size=15 />${t('mode.' + f)}</div>`)}
    </div>
  </div>`;
}

export function ModePick() {
  return html`<div class="mode-pick fade">
    <div class="brand-big"><${Mark} size=34 /><span>Daily<b>Tanakh</b></span></div>
    <h1 class="display">${t('mode.title')}</h1>
    <p class="sub">${t('mode.subtitle')}</p>
    <div class="mode-cards">
      <${Card} mode="adult" icon="bookOpen"
        feats=${['adultF1', 'adultF2', 'adultF3']} />
      <${Card} mode="kids" icon="sparkles"
        feats=${['kidsF1', 'kidsF2', 'kidsF3']} />
    </div>
    <p class="note">${t('mode.note')}</p>
  </div>`;
}
