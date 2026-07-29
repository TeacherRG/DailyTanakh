// App chrome — top header (desktop) + bottom tab bar (mobile).
import { html } from '../lib/html.js';
import { Icon, Mark } from '../lib/icons.js';
import { t } from '../lib/i18n.js';
import { route } from '../lib/router.js';
import { settings } from '../lib/store.js';
import { LangMenu, ThemeToggle } from './ui.js';

const ADULT_TABS = [
  ['/', 'home', 'home'],
  ['/library', 'library', 'library'],
  ['/profile', 'profile', 'user'],
  ['/settings', 'settings', 'sliders'],
];
const KIDS_TABS = [
  ['/kids', 'home', 'home'],
  ['/kids/library', 'library', 'library'],
  ['/kids/awards', 'awards', 'award'],
  ['/settings', 'settings', 'sliders'],
];

const isKids = () => settings.value.mode === 'kids';
const tabs = () => (isKids() ? KIDS_TABS : ADULT_TABS);
const label = (k) => (k === 'awards' ? t('kids.awards') : t('nav.' + k));

function activeKey(path) {
  if (isKids()) {
    if (path.startsWith('/kids/library') || path.startsWith('/kids/story')) return 'library';
    if (path.startsWith('/kids/awards')) return 'awards';
    if (path.startsWith('/settings') || path.startsWith('/about')) return 'settings';
    return 'home';
  }
  if (path === '/' || path.startsWith('/today') || path.startsWith('/start')) return 'home';
  if (path.startsWith('/library') || path.startsWith('/book') || path.startsWith('/read')) return 'library';
  if (path.startsWith('/profile')) return 'profile';
  if (path.startsWith('/settings') || path.startsWith('/about')) return 'settings';
  return '';
}

export function Header() {
  const key = activeKey(route.value.path);
  const home = isKids() ? '#/kids' : '#/';
  return html`<header class="header">
    <div class="container">
      <a class="brand" href=${home} aria-label="DailyTanakh"><${Mark} size=30 /><span>Daily<b>Tanakh</b></span></a>
      <nav class="nav" aria-label="Main">
        ${tabs().map(([to, k]) => html`<a key=${k} class=${key === k ? 'active' : ''} href=${'#' + to}>${label(k)}</a>`)}
      </nav>
      <div class="header-spacer"></div>
      <div class="header-tools">
        ${isKids() && html`<span class="chip blue hide-sm"><${Icon} name="sparkles" size=13 />${t('mode.kidsShort')}</span>`}
        <${LangMenu} />
        <${ThemeToggle} />
      </div>
    </div>
  </header>`;
}

export function TabBar() {
  const key = activeKey(route.value.path);
  return html`<nav class="tabbar" aria-label="Main">
    ${tabs().map(([to, k, ic]) => html`<a key=${k} class=${key === k ? 'active' : ''} href=${'#' + to}>
      <${Icon} name=${ic} size=22 /><span>${label(k)}</span>
    </a>`)}
  </nav>`;
}
