// Inline SVG icon set (feather/lucide-style, stroke = currentColor).
import { html } from './html.js';

const I = {
  home: '<path d="M3 9.2 12 2l9 7.2"/><path d="M5 9.6V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.6"/>',
  today: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/><circle cx="12" cy="15" r="2.3"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  bookOpen: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  library: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
  scroll: '<path d="M8 3h9a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H8z"/><path d="M19 7v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3 2 2 0 0 1 2-2h2"/><path d="M6 3a2 2 0 0 0-2 2v9"/>',
  bookmark: '<path d="M19 21l-7-4.7L5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  star: '<path d="M12 2.5l2.95 6.0 6.6.96-4.78 4.66 1.13 6.58L12 17.6l-5.9 3.1 1.13-6.58L2.45 9.46l6.6-.96z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5z"/>',
  printer: '<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/><path d="M16.5 11.5h.01"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"/>',
  moon: '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/>',
  monitor: '<rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M8 21h8M12 16.5V21"/>',
  globe: '<circle cx="12" cy="12" r="9.2"/><path d="M2.8 12h18.4M12 2.8c2.6 2.5 4 5.8 4 9.2s-1.4 6.7-4 9.2c-2.6-2.5-4-5.8-4-9.2s1.4-6.7 4-9.2z"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 7 2.6h.1A1.6 1.6 0 0 0 8.8 1.1V1a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 15 2.6a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.4 1z"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  bellOff: '<path d="M8.7 3.6A6 6 0 0 1 18 8c0 2.3.3 4 .8 5.3M17.5 17.5H3s3-2 3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/><path d="M2 2l20 20"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  chevronLeft: '<path d="M15 5l-7 7 7 7"/>',
  chevronDown: '<path d="M5 9l7 7 7-7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9.2"/><path d="M8.3 12.2l2.6 2.6 4.8-5.2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  flame: '<path d="M12 22c4 0 7-2.7 7-6.6 0-4-3-6.4-3-6.4s-.6 2-2 2.6c0-2.6-1.5-5.6-4-7.6 0 3.2-3 5.2-3 9 0 4 3 9 8 9z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  comment: '<path d="M21 11.5a8 8 0 0 1-8.5 8 8.5 8.5 0 0 1-3.6-.8L3 20l1.3-3.9A8 8 0 0 1 21 11.5z"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  play: '<path d="M6 4.5l13 7.5-13 7.5z"/>',
  flag: '<path d="M4 22V4M4 4l9.5 2L21 4v11l-7.5 2L4 15"/>',
  heart: '<path d="M20.8 6.6a5 5 0 0 0-8.8-2.2A5 5 0 0 0 3.2 6.6c0 5 8.8 11 8.8 11s8.8-6 8.8-11z"/>',
  sparkles: '<path d="M12 3l1.8 4.6L18.4 9l-4.6 1.8L12 15l-1.8-4.2L5.6 9l4.6-1.4z"/><path d="M18 14l.9 2.3L21 17l-2.1.8L18 20l-.9-2.2L15 17l2.1-.7z"/>',
  layers: '<path d="M12 2 2 7l10 5 10-5z"/><path d="M2 12l10 5 10-5M2 17l10 5 10-5"/>',
  clock: '<circle cx="12" cy="12" r="9.2"/><path d="M12 7.5V12l3.5 2"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  type: '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
  languages: '<path d="M5 8h9M9.5 4.5V8M11.5 8s-1 5.5-7 8M7 12c2.5 3 5 4 5 4"/><path d="M13 21l4.5-10L22 21M14.8 17.4h5.4"/>',
  info: '<circle cx="12" cy="12" r="9.2"/><path d="M12 16v-4.5M12 8h.01"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  sunrise: '<path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 2v6M5.6 9.6 4.2 8.2M18.4 9.6l1.4-1.4M2 18h2M20 18h2M22 22H2M8 6l4-4 4 4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  external: '<path d="M15 3h6v6M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
  feather: '<path d="M20 6a6.7 6.7 0 0 0-9.4 0L4 12.5V20h7.5l6.5-6.6A6.7 6.7 0 0 0 20 6z"/><path d="M16 8 6.5 17.5M14 10H9M14 10v5"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="M9 14.5 7.5 22 12 19l4.5 3-1.5-7.5"/>',
};

export function Icon({ name, size = 20, stroke = 2, fill = 'none', cls = '' }) {
  const inner = I[name] || I.info;
  return html`<svg class=${cls} width=${size} height=${size} viewBox="0 0 24 24"
    fill=${fill} stroke="currentColor" stroke-width=${stroke} stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: inner }}></svg>`;
}

// Brand mark — open scroll with a star-of-david spark.
export function Mark({ size = 30 }) {
  return html`<svg class="mark" width=${size} height=${size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--blue)"/>
    <path d="M9 8.5h7a3.2 3.2 0 0 1 3.2 3.2v12.8a2.4 2.4 0 0 0-2.4-2.4H9z" fill="rgba(255,255,255,.16)" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M23 8.5h-3.8a3.2 3.2 0 0 0-3.2 3.2v12.8a2.4 2.4 0 0 1 2.4-2.4H23z" fill="rgba(255,255,255,.28)" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M22.4 4.6l.7 1.8 1.8.5-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.5z" fill="#fff"/>
  </svg>`;
}
