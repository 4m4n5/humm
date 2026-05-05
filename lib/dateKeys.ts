/** Local calendar day key (device timezone), YYYY-MM-DD */
export function localDayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function previousLocalDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return localDayKey(dt);
}

/** Shift a local calendar day key by `deltaDays` (negative = past). */
export function offsetLocalDayKey(dayKey: string, deltaDays: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return localDayKey(dt);
}

/** Monday-start week id in local TZ (day key of that Monday), e.g. 2026-04-06 */
export function localWeekKey(d = new Date()): string {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return localDayKey(x);
}

/** Seven local calendar keys from Monday `weekKey` through Sunday (inclusive). */
export function weekLocalDayKeysFromMonday(weekMondayDayKey: string): string[] {
  const [y, m, d] = weekMondayDayKey.split('-').map(Number);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(y, m - 1, d + i);
    keys.push(localDayKey(dt));
  }
  return keys;
}

/** Monday `localWeekKey` of the calendar week that starts *after* the week containing `d`. */
export function nextLocalMondayWeekKey(d = new Date()): string {
  const thisMonday = localWeekKey(d);
  return offsetLocalDayKey(thisMonday, 7);
}

/** Inclusive count of days from `d` through Sunday of the same local week (Mon → 6, Sun → 0). */
export function daysLeftInLocalWeek(d = new Date()): number {
  const mon = localWeekKey(d);
  const days = weekLocalDayKeysFromMonday(mon);
  const today = localDayKey(d);
  const idx = days.indexOf(today);
  if (idx < 0) return 0;
  return days.length - 1 - idx;
}
