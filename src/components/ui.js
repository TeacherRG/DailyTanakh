// Reusable UI primitives.
import { html, Fragment, useRef, useEffect, useSignal } from '../lib/html.js';
import { Icon } from '../lib/icons.js';
import { t, lang, LOCALES, LANGS } from '../lib/i18n.js';
import { settings, setSettings, resolvedTheme, toasts } from '../lib/store.js';

/* dropdown */
export function Pop({ trigger, children, align = 'right' }) {
  const open = useSignal(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) open.value = false; };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);
  return html`<div class="pop" ref=${ref}>
    <div onClick=${(e) => { e.stopPropagation(); open.value = !open.value; }}>${trigger}</div>
    ${open.value && html`<div class="menu ${align}" onClick=${() => { open.value = false; }}>${children}</div>`}
  </div>`;
}

/* theme toggle */
export function ThemeToggle() {
  const dark = resolvedTheme.value === 'dark';
  return html`<button class="iconbtn" title=${t('settings.theme')} aria-label=${t('settings.theme')}
    onClick=${() => setSettings({ theme: dark ? 'light' : 'dark' })}>
    <${Icon} name=${dark ? 'sun' : 'moon'} />
  </button>`;
}

/* language menu */
const FLAGS = { ru: '🇷🇺', en: '🇬🇧', de: '🇩🇪', he: '🇮🇱' };
export function LangMenu() {
  const cur = lang.value;
  return html`<${Pop} align=${LOCALES[cur].dir === 'rtl' ? 'left' : 'right'}
    trigger=${html`<button class="iconbtn" aria-label=${t('settings.language')}><${Icon} name="globe" /></button>`}>
    ${LANGS.map(l => html`<button key=${l} class=${l === cur ? 'on' : ''} onClick=${() => setSettings({ uiLang: l })}>
      <span class="flag">${FLAGS[l]}</span><span>${LOCALES[l].langNames[l]}</span>
      ${l === cur && html`<span style="margin-inline-start:auto;display:flex"><${Icon} name="check" size=16 /></span>`}
    </button>`)}
  <//>`;
}

/* progress ring */
export function ProgressRing({ value = 0, size = 124, stroke = 11, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, value)));
  return html`<div style=${`position:relative;width:${size}px;height:${size}px;flex:none`}>
    <svg class="ring" width=${size} height=${size} viewBox=${`0 0 ${size} ${size}`}>
      <circle class="track" cx=${size / 2} cy=${size / 2} r=${r} stroke-width=${stroke} />
      <circle class="fill" cx=${size / 2} cy=${size / 2} r=${r} stroke-width=${stroke}
        stroke-dasharray=${c} stroke-dashoffset=${off} />
    </svg>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
      ${children}
    </div>
  </div>`;
}

/* switch */
export function Switch({ checked, onChange, label }) {
  return html`<button role="switch" aria-checked=${!!checked} aria-label=${label || ''}
    class=${'switch ' + (checked ? 'on' : '')} onClick=${() => onChange && onChange(!checked)}></button>`;
}

/* segmented control */
export function Segmented({ options, value, onChange, block }) {
  return html`<div class=${'seg ' + (block ? 'block' : '')} role="tablist">
    ${options.map(o => html`<button key=${o.value} role="tab" aria-selected=${o.value === value}
      class=${o.value === value ? 'on' : ''} onClick=${() => onChange && onChange(o.value)}>${o.label}</button>`)}
  </div>`;
}

/* modal / sheet */
export function Sheet({ children, onClose, variant = 'center', title }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, []);
  return html`<${Fragment}>
    <div class="scrim" onClick=${onClose}></div>
    <div class=${'sheet ' + variant} role="dialog" aria-modal="true">
      ${title !== undefined && html`<div class="sheet-head">
        <h3>${title}</h3>
        <button class="iconbtn" onClick=${onClose} aria-label=${t('common.close')}><${Icon} name="x" /></button>
      </div>`}
      <div class="sheet-body">${children}</div>
    </div>
  <//>`;
}

export function ConfirmDialog({ title, body, confirmLabel, cancelLabel, danger, onConfirm, onClose }) {
  return html`<${Sheet} variant="center" onClose=${onClose} title=${title}>
    <p class="muted" style="margin:-6px 0 22px;line-height:1.6">${body}</p>
    <div class="row gap-3" style="justify-content:flex-end">
      <button class="btn btn-ghost" onClick=${onClose}>${cancelLabel || t('common.cancel')}</button>
      <button class=${'btn ' + (danger ? 'btn-danger' : 'btn-primary')}
        onClick=${() => { onConfirm && onConfirm(); onClose && onClose(); }}>${confirmLabel || t('common.yes')}</button>
    </div>
  <//>`;
}

/* empty state */
export function Empty({ icon = 'feather', title, body, action }) {
  return html`<div class="empty fade">
    <div class="ic"><${Icon} name=${icon} size=28 /></div>
    <h3>${title}</h3>
    ${body && html`<p>${body}</p>`}
    ${action && html`<div style="margin-top:18px;display:flex;justify-content:center">${action}</div>`}
  </div>`;
}

/* toasts host */
export function ToastHost() {
  return html`<div class="toasts" aria-live="polite">
    ${toasts.value.map(x => html`<div class="toast" key=${x.id}><${Icon} name=${x.icon} size=17 />${x.msg}</div>`)}
  </div>`;
}
