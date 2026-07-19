// Namespaced localStorage helpers (safe, JSON).
const NS = 'dailytanakh:';

export function load(key, fallback) {
  try {
    const v = localStorage.getItem(NS + key);
    return v == null ? fallback : JSON.parse(v);
  } catch { return fallback; }
}
export function save(key, val) {
  try { localStorage.setItem(NS + key, JSON.stringify(val)); } catch {}
}
export function remove(key) {
  try { localStorage.removeItem(NS + key); } catch {}
}
export function uid() {
  return 'x' + Math.abs(Date.now() ^ (performance.now() * 1000 | 0)).toString(36) + (load.__c = (load.__c || 0) + 1).toString(36);
}
