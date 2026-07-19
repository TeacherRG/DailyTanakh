// App chrome — top header (desktop) + bottom tab bar (mobile).
import { html } from '../lib/html.js';
import { Icon, Mark } from '../lib/icons.js';
import { t } from '../lib/i18n.js';
import { route } from '../lib/router.js';
import { LangMenu, ThemeToggle } from './ui.js';

function activeKey(path) {
  if (path === '/' || path.startsWith('/today') || path.startsWith('/start')) return 'home';
  if (path.startsWith('/library') || path.startsWith('/book') || path.startsWith('/read')) return 'library';
  if (path.startsWith('/profile')) return 'profile';
  if (path.startsWith('/settings') || path.startsWith('/about')) return 'settings';
  return '';
}

const TABS = [
  ['/', 'home', 'home'],
  ['/library', 'library', 'library'],
  ['/profile', 'profile', 'user'],
  ['/settings', 'settings', 'sliders'],
];

export function Header() {
  const key = activeKey(route.value.path);
  return html`<header class="header">
    <div class="container">
      <a class="brand" href="#/" aria-label="DailyTanakh"><${Mark} size=30 /><span>Daily<b>Tanakh</b></span></a>
      <nav class="nav" aria-label="Main">
        ${TABS.map(([to, k]) => html`<a key=${k} class=${key === k ? 'active' : ''} href=${'#' + to}>${t('nav.' + k)}</a>`)}
      </nav>
      <div class="header-spacer"></div>
      <div class="header-tools">
        <${LangMenu} />
        <${ThemeToggle} />
      </div>
    </div>
  </header>`;
}

export function TabBar() {
  const key = activeKey(route.value.path);
  return html`<nav class="tabbar" aria-label="Main">
    ${TABS.map(([to, k, ic]) => html`<a key=${k} class=${key === k ? 'active' : ''} href=${'#' + to}>
      <${Icon} name=${ic} size=22 /><span>${t('nav.' + k)}</span>
    </a>`)}
  </nav>`;
}
