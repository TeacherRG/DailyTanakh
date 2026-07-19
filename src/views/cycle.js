import { html, useSignal } from '../lib/html.js';
import { t } from '../lib/i18n.js';
import { settings, setSettings, toast } from '../lib/store.js';
import { cycleInfo, todayISO } from '../lib/schedule.js';
import { navigate } from '../lib/router.js';
import { Icon } from '../lib/icons.js';
import { ConfirmDialog } from '../components/ui.js';

function CycleCard({ id, selected, onPick }) {
  const info = cycleInfo(id);
  const on = selected === id;
  return html`<div class=${'card cycle-card' + (on ? ' on' : '')} onClick=${() => onPick(id)}>
    <div class="pick">${on && html`<${Icon} name="check" size=15 />`}</div>
    <div class="yr">${info.years}</div>
    <div class="nm">${id === '3yr' ? t('cycle.threeYears') : t('cycle.oneYear')}</div>
    <div class="desc">${id === '3yr' ? t('cycle.threeYearsDesc') : t('cycle.oneYearDesc')}</div>
    <div class="facts">
      <div class="fact"><${Icon} name="bookOpen" size=16 />${t('cycle.parallelTracks')}</div>
      <div class="fact"><${Icon} name="clock" size=16 />${t('cycle.finishes', { n: info.days })}</div>
      <div class="fact"><${Icon} name="layers" size=16 />≈ ${info.versesPerDay} ${t('units.verses')} · ${t('common.day')}</div>
      <div class="fact"><${Icon} name="book" size=16 />${info.totalChapters} ${t('units.chapters')}</div>
    </div>
  </div>`;
}

export function Cycle() {
  const selected = useSignal(settings.value.cycle || '1yr');
  const done = useSignal(false);
  const confirm = useSignal(false);

  const apply = () => {
    setSettings({ cycle: selected.value, startDate: todayISO(), onboarded: true });
    done.value = true;
    toast(t('toast.cycleStarted'), 'sparkles');
  };
  const start = () => { if (settings.value.cycle) confirm.value = true; else apply(); };

  if (done.value) {
    return html`<div class="container main">
      <div class="welcome-wrap fade">
        <div class="welcome-badge"><${Icon} name="award" size=40 /></div>
        <h1 class="display" style="font-size:2rem">${t('cycle.welcomeTitle')}</h1>
        <p class="muted" style="margin-top:14px;line-height:1.65;font-size:1.05rem">
          ${t('cycle.welcomeBody', { cycle: selected.value === '3yr' ? t('cycle.threeYears') : t('cycle.oneYear'), n: 1 })}</p>
        <div style="margin-top:26px;display:flex;gap:12px;justify-content:center">
          <button class="btn btn-primary btn-lg" onClick=${() => navigate('/')}><${Icon} name="bookOpen" />${t('home.openReading')}</button>
        </div>
      </div>
    </div>`;
  }

  return html`<div class="container main">
    <div class="page-head rise" style="text-align:center;max-width:40rem;margin-inline:auto">
      <div class="eyebrow" style="justify-content:center">DailyTanakh</div>
      <h1 class="display" style="margin-top:8px">${t('cycle.title')}</h1>
      <div class="sub">${t('cycle.subtitle')}</div>
    </div>
    <div class="cycle-options rise" style="max-width:46rem;margin-inline:auto">
      <${CycleCard} id="1yr" selected=${selected.value} onPick=${v => { selected.value = v; }} />
      <${CycleCard} id="3yr" selected=${selected.value} onPick=${v => { selected.value = v; }} />
    </div>
    <div class="rise" style="display:flex;justify-content:center;margin-top:28px">
      <button class="btn btn-primary btn-lg" onClick=${start}>
        <${Icon} name="play" />${settings.value.cycle ? t('cycle.restart') : t('cycle.startCycle')}</button>
    </div>
    ${confirm.value && html`<${ConfirmDialog}
      title=${t('cycle.confirmRestartTitle')} body=${t('cycle.confirmRestartBody')}
      confirmLabel=${t('cycle.restart')} cancelLabel=${t('common.cancel')}
      onConfirm=${apply} onClose=${() => { confirm.value = false; }} />`}
  </div>`;
}
