import { html, render } from './lib/html.js';
import { route } from './lib/router.js';
import { loadBooks } from './lib/data.js';
import './lib/store.js'; // installs theme/lang/dir env effect
import { setupReminders } from './lib/reminders.js';
import { t } from './lib/i18n.js';
import { Icon } from './lib/icons.js';
import { Header, TabBar } from './components/chrome.js';
import { ToastHost } from './components/ui.js';
import { settings } from './lib/store.js';
import { Home } from './views/home.js';
import { Reader } from './views/reader.js';
import { Library, Book } from './views/library.js';
import { Cycle } from './views/cycle.js';
import { Profile } from './views/profile.js';
import { Settings } from './views/settings.js';
import { About } from './views/about.js';
import { ModePick } from './views/mode.js';
import { KidsHome, KidsLibrary, KidsStory, KidsAwards } from './views/kids.js';

function NotFound() {
  return html`<div class="container main"><div class="empty">
    <div class="ic"><${Icon} name="search" size=28 /></div>
    <h3>404</h3><p>—</p>
    <div style="margin-top:16px"><a class="btn btn-primary" href="#/"><${Icon} name="home" />${t('nav.home')}</a></div>
  </div></div>`;
}

function resolve(parts) {
  const a = parts[0];
  // режим ещё не выбран — показываем экран выбора
  if (!settings.value.mode && a !== 'mode') return html`<${ModePick} />`;
  if (a === 'mode') return html`<${ModePick} />`;
  if (a === 'kids') {
    const b = parts[1];
    if (b === 'library') return html`<${KidsLibrary} />`;
    if (b === 'story') return html`<${KidsStory} />`;
    if (b === 'awards') return html`<${KidsAwards} />`;
    return html`<${KidsHome} />`;
  }
  if (!a || a === 'today') return html`<${Home} />`;
  if (a === 'start') return html`<${Cycle} />`;
  if (a === 'library') return html`<${Library} />`;
  if (a === 'book' && parts[1]) return html`<${Book} />`;
  if (a === 'read' && parts[1]) return html`<${Reader} />`;
  if (a === 'profile') return html`<${Profile} />`;
  if (a === 'settings') return html`<${Settings} />`;
  if (a === 'about') return html`<${About} />`;
  return html`<${NotFound} />`;
}

function App() {
  const r = route.value;
  const a = r.parts[0];
  // на экране выбора режима прячем шапку и таб-бар
  const bare = !settings.value.mode || a === 'mode';
  const key = a === 'read' ? 'read:' + r.parts[1]
    : a === 'book' ? 'book:' + r.parts[1]
    : a === 'kids' ? 'kids:' + (r.parts[1] || '') + ':' + (r.parts[2] || '')
    : (a || 'home');
  return html`<div class="app">
    ${!bare && html`<${Header} />`}
    <main>${html`<div key=${key} style="display:contents">${resolve(r.parts)}</div>`}</main>
    ${!bare && html`<${TabBar} />`}
    <${ToastHost} />
  </div>`;
}

const root = document.getElementById('app');
loadBooks().then(() => {
  render(html`<${App} />`, root);
  setupReminders();
}).catch(() => {
  root.innerHTML = '<div style="max-width:32rem;margin:18vh auto;text-align:center;padding:24px;font-family:system-ui">'
    + '<h2 style="margin-bottom:8px">DailyTanakh</h2>'
    + '<p style="color:#697185">Не удалось загрузить данные. Запустите локальный сервер: '
    + '<code>python3 -m http.server</code> и откройте через http://localhost:8000</p></div>';
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {}));
}
