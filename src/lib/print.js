// Print engine — renders a clean, essentials-only sheet and triggers window.print().
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function ensureRoot() {
  let el = document.getElementById('print-root');
  if (!el) { el = document.createElement('div'); el.id = 'print-root'; document.body.appendChild(el); }
  return el;
}

/**
 * doc = {
 *   title, subtitle,
 *   verses: [{ n, he, tr, trRtl, comm:[{who, text}], note }],
 *   footerLeft, footerRight
 * }
 */
export function printDoc(doc) {
  const root = ensureRoot();
  const verses = (doc.verses || []).map(v => {
    let h = `<div class="p-verse">`;
    if (v.he) h += `<div class="p-he"><span class="p-num">${esc(v.n)}</span>${esc(v.he)}</div>`;
    if (v.tr) h += `<div class="p-tr ${v.trRtl ? 'rtl' : ''}">${v.he ? '' : `<span class="p-num">${esc(v.n)}</span>`}${esc(v.tr)}</div>`;
    if (v.note) h += `<div class="p-note">✎ ${esc(v.note)}</div>`;
    if (v.comm && v.comm.length) {
      for (const c of v.comm) h += `<div class="p-comm"><b>${esc(c.who)}:</b> ${esc(c.text)}</div>`;
    }
    h += `</div>`;
    return h;
  }).join('');

  root.innerHTML = `
    <div class="print-doc">
      <div class="p-head">
        <div class="p-brand">DailyTanakh</div>
        <div class="p-title">${esc(doc.title || '')}</div>
        ${doc.subtitle ? `<div class="p-sub">${esc(doc.subtitle)}</div>` : ''}
      </div>
      ${verses}
      <div class="p-foot">
        <span>${esc(doc.footerLeft || '')}</span>
        <span>${esc(doc.footerRight || '')}</span>
      </div>
    </div>`;

  const cleanup = () => { root.innerHTML = ''; window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  // give layout a tick, then print
  setTimeout(() => { window.print(); setTimeout(cleanup, 1500); }, 60);
}
