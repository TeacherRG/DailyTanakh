import { html, useSignal, useRef } from '../lib/html.js';
import { t, lang, LOCALES, LANGS } from '../lib/i18n.js';
import { settings, setSettings, setNotify, toggleTransLang, resetProgress, exportData, importData, toast } from '../lib/store.js';
import { navigate } from '../lib/router.js';
import { todayISO } from '../lib/schedule.js';
import * as notify from '../lib/notify.js';
import { setupReminders } from '../lib/reminders.js';
import { Icon } from '../lib/icons.js';
import { Segmented, Switch, ConfirmDialog } from '../components/ui.js';

const FLAGS = { ru: '🇷🇺', en: '🇬🇧', de: '🇩🇪', he: '🇮🇱' };
const TRANS = { ru: 'Русский', en: 'English', de: 'Deutsch' };

function Group({ title, children }) {
  return html`<div class="settings-group rise"><div class="gh">${title}</div><div class="card">${children}</div></div>`;
}
function Row({ label, hint, children }) {
  return html`<div class="set-row"><div class="grow"><div class="lab">${label}</div>${hint && html`<div class="hint">${hint}</div>`}</div>
    <div class="ctl">${children}</div></div>`;
}

function FontControl() {
  const sc = settings.value.fontScale;
  return html`<div class="row gap-2">
    <button class="iconbtn" onClick=${() => setSettings({ fontScale: Math.max(0.8, +(sc - 0.1).toFixed(2)) })}><${Icon} name="minus" /></button>
    <span class="tnum" style="min-width:46px;text-align:center;font-weight:700">${Math.round(sc * 100)}%</span>
    <button class="iconbtn" onClick=${() => setSettings({ fontScale: Math.min(1.6, +(sc + 0.1).toFixed(2)) })}><${Icon} name="plus" /></button>
  </div>`;
}

export function Settings() {
  const s = settings.value;
  const confirmReset = useSignal(false);
  const fileRef = useRef();

  const onImportFile = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const obj = JSON.parse(rd.result);
        if (obj && obj.app === 'DailyTanakh') { importData(obj); toast(t('toast.importDone'), 'check'); }
        else toast(t('toast.importInvalid'), 'x');
      } catch { toast(t('toast.importInvalid'), 'x'); }
    };
    rd.readAsText(f);
  };

  const onToggleNotif = async (v) => {
    if (v) {
      const perm = notify.permission() === 'granted' ? 'granted' : await notify.requestPermission();
      if (perm === 'granted') { setNotify({ enabled: true }); setupReminders(); toast(t('toast.notifOn'), 'bell'); }
      else { setNotify({ enabled: false }); toast(t('toast.notifBlocked'), 'bellOff'); }
    } else { setNotify({ enabled: false }); setupReminders(); }
  };

  const setMode = (m) => {
    const patch = { mode: m };
    if (m === 'kids' && !s.kidsStart) patch.kidsStart = todayISO();
    setSettings(patch);
    navigate(m === 'kids' ? '/kids' : '/');
    toast(t('toast.settingsSaved'), 'check');
  };

  return html`<div class="container main" style="max-width:760px">
    <div class="page-head rise"><h1 class="display">${t('settings.title')}</h1></div>

    <${Group} title=${t('mode.section')}>
      <div class="set-row"><div class="grow">
        <div class="lab">${t('mode.current')}</div>
        <div class="hint">${s.mode === 'kids' ? t('mode.kidsBody') : t('mode.adultBody')}</div>
      </div></div>
      <div style="padding:0 18px 18px"><div class="mode-switch">
        <button class=${'mode-chip' + (s.mode !== 'kids' ? ' on' : '')} onClick=${() => setMode('adult')}>
          <${Icon} name="bookOpen" size=18 />${t('mode.adultTitle')}</button>
        <button class=${'mode-chip' + (s.mode === 'kids' ? ' on' : '')} onClick=${() => setMode('kids')}>
          <${Icon} name="sparkles" size=18 />${t('mode.kidsTitle')}</button>
      </div></div>
    <//>

    <${Group} title=${t('settings.appearance')}>
      <${Row} label=${t('settings.theme')}>
        <${Segmented} value=${s.theme} onChange=${v => setSettings({ theme: v })}
          options=${[{ value: 'light', label: t('settings.light') }, { value: 'dark', label: t('settings.dark') }, { value: 'system', label: t('settings.system') }]} />
      <//>
      <div class="set-row"><div class="grow"><div class="lab">${t('settings.language')}</div></div></div>
      <div style="padding:0 18px 16px"><div class="lang-grid">
        ${LANGS.map(l => html`<button key=${l} class=${'lang-opt' + (s.uiLang === l ? ' on' : '')} onClick=${() => setSettings({ uiLang: l })}>
          <span class="flag">${FLAGS[l]}</span><span class="grow">${LOCALES[l].langNames[l]}</span>
          ${s.uiLang === l && html`<${Icon} name="check" size=16 />`}</button>`)}
      </div></div>
      <${Row} label=${t('settings.fontSize')}><${FontControl} /><//>
    <//>

    <${Group} title=${t('settings.content')}>
      <${Row} label=${t('settings.showHebrew')} hint=${t('settings.showHebrewHint')}>
        <${Switch} checked=${s.showHebrew} onChange=${v => setSettings({ showHebrew: v })} />
      <//>
      <div class="set-row"><div class="grow"><div class="lab">${t('settings.scriptureLangs')}</div></div></div>
      <div style="padding:0 18px 18px"><div class="chips-wrap">
        ${['ru', 'en', 'de'].map(l => html`<button key=${l} class=${'chip-toggle' + (s.transLangs.includes(l) ? ' on' : '')}
          onClick=${() => toggleTransLang(l)}>${TRANS[l]}</button>`)}
      </div></div>
    <//>

    <${Group} title=${t('settings.cycle')}>
      <${Row} label=${t('settings.currentCycle')}
        hint=${s.cycle ? (s.cycle === '3yr' ? t('cycle.threeYears') : t('cycle.oneYear')) + (s.startDate ? ' · ' + s.startDate : '') : t('settings.notCycleSet')}>
        <button class="btn btn-outline btn-sm" onClick=${() => navigate('/start')}><${Icon} name="refresh" size=16 />${t('settings.changeCycle')}</button>
      <//>
    <//>

    <${Group} title=${t('settings.notifications')}>
      <${Row} label=${t('settings.enableNotif')} hint=${t('settings.enableNotifHint')}>
        ${notify.supported()
          ? html`<${Switch} checked=${s.notify.enabled} onChange=${onToggleNotif} />`
          : html`<span class="muted" style="font-size:.8rem">${t('settings.notifBlocked')}</span>`}
      <//>
      ${s.notify.enabled && html`<${Row} label=${t('settings.reminderTime')}>
        <input class="input" type="time" style="width:130px" value=${s.notify.time}
          onChange=${e => { setNotify({ time: e.target.value }); setupReminders(); }} />
      <//>`}
      ${s.notify.enabled && html`<div style="padding:0 18px 16px">
        <button class="btn btn-ghost btn-sm" onClick=${() => notify.notify('DailyTanakh', { body: t('home.todaysReading') })}>
          <${Icon} name="bell" size=16 />${t('settings.testNotif')}</button></div>`}
      <div style="padding:0 18px 16px"><div class="hint">${t('settings.notifLocalHint')}</div></div>
    <//>

    <${Group} title=${t('settings.data')}>
      <${Row} label=${t('settings.exportData')}>
        <button class="btn btn-outline btn-sm" onClick=${() => { exportData(); toast(t('toast.exportDone'), 'download'); }}>
          <${Icon} name="download" size=16 />${t('common.save')}</button>
      <//>
      <${Row} label=${t('settings.importData')}>
        <input type="file" accept="application/json,.json" hidden ref=${fileRef} onChange=${onImportFile} />
        <button class="btn btn-outline btn-sm" onClick=${() => fileRef.current && fileRef.current.click()}>
          <${Icon} name="refresh" size=16 />${t('common.open')}</button>
      <//>
      <${Row} label=${t('settings.resetProgress')} hint=${t('settings.resetHint')}>
        <button class="btn btn-danger btn-sm" onClick=${() => { confirmReset.value = true; }}>
          <${Icon} name="trash" size=16 />${t('settings.resetProgress')}</button>
      <//>
    <//>

    <div class="rise" style="text-align:center;padding:10px 0 0">
      <a class="btn btn-ghost btn-sm" href="#/about"><${Icon} name="info" size=16 />${t('settings.about')}</a>
      <div class="faint" style="font-size:.78rem;margin-top:10px">${t('settings.version')} 1.0 · DailyTanakh</div>
    </div>

    ${confirmReset.value && html`<${ConfirmDialog} danger=${true}
      title=${t('settings.resetConfirmTitle')} body=${t('settings.resetConfirmBody')}
      confirmLabel=${t('settings.resetProgress')} cancelLabel=${t('common.cancel')}
      onConfirm=${() => { resetProgress(); toast(t('toast.progressReset'), 'refresh'); }}
      onClose=${() => { confirmReset.value = false; }} />`}
  </div>`;
}
