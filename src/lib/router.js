// Minimal hash router with View Transitions.
import { signal } from './html.js';

function parse() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const query = {};
  if (qs) for (const kv of qs.split('&')) { const [k, v] = kv.split('='); query[decodeURIComponent(k)] = decodeURIComponent(v || ''); }
  return { path: '/' + parts.join('/'), parts, query };
}

export const route = signal(parse());

const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function update() {
  const next = parse();
  const apply = () => {
    route.value = next;
    if (!next.parts.includes('read')) window.scrollTo({ top: 0, left: 0 });
    return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  };
  if (document.startViewTransition && !reduce()) document.startViewTransition(apply);
  else apply();
}

window.addEventListener('hashchange', update);

export function navigate(to) {
  if (to.startsWith('#')) to = to.slice(1);
  if (location.hash === '#' + to || (location.hash === '' && to === '/')) return;
  location.hash = to;
}

export const href = (to) => '#' + to;
