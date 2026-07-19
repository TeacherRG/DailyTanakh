// Wires the daily local reminder to current settings.
import { settings } from './store.js';
import * as notify from './notify.js';
import { t } from './i18n.js';

export function setupReminders() {
  const n = settings.value.notify;
  if (n && n.enabled && notify.permission() === 'granted') {
    notify.scheduleDaily(n.time, () => ({ title: 'DailyTanakh', opts: { body: t('home.todaysReading'), tag: 'daily' } }));
  } else {
    notify.cancelDaily();
  }
}
