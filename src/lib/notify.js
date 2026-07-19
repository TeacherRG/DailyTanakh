// Local notifications — best-effort daily reminder while the app is open.
export function supported() { return typeof window !== 'undefined' && 'Notification' in window; }
export function permission() { return supported() ? Notification.permission : 'denied'; }

export async function requestPermission() {
  if (!supported()) return 'denied';
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

export function notify(title, opts = {}) {
  if (permission() !== 'granted') return false;
  try {
    new Notification(title, { icon: 'assets/icons/icon-192.png', badge: 'assets/icons/icon-192.png', ...opts });
    return true;
  } catch { return false; }
}

let timer = null;
export function scheduleDaily(time, makeBody) {
  cancelDaily();
  if (!time || permission() !== 'granted') return;
  const plan = () => {
    const [h, m] = time.split(':').map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(h || 8, m || 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    timer = setTimeout(() => { const b = makeBody(); notify(b.title, b.opts); plan(); }, next - now);
  };
  plan();
}
export function cancelDaily() { if (timer) { clearTimeout(timer); timer = null; } }
