// The moon's phase by the device's date (docs/fun-improvements.md, 방의 빛): around each full moon
// the crescent at the night window is round and its light a little brighter. The mean month from a
// known new moon is close enough for a night or so either side.

// A new moon: 2000-01-06 18:14 UTC.
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const SYNODIC_DAYS = 29.530588;
const DAY_MS = 86_400_000;
// How near the full moon still counts as full, in days either side.
const FULL_WITHIN_DAYS = 1.2;

// Days since the last new moon, from 0 up to a month.
export function moonAge(date: Date): number {
  const days = (date.getTime() - NEW_MOON) / DAY_MS;
  return ((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
}

export function isFullMoon(date: Date): boolean {
  return Math.abs(moonAge(date) - SYNODIC_DAYS / 2) <= FULL_WITHIN_DAYS;
}

// The coming full moon's night (at 22:00, local), for the art preview.
export function nextFullMoon(from: Date): Date {
  const age = moonAge(from);
  const half = SYNODIC_DAYS / 2;
  const ahead = age <= half ? half - age : SYNODIC_DAYS - age + half;
  const full = new Date(from.getTime() + ahead * DAY_MS);
  return new Date(full.getFullYear(), full.getMonth(), full.getDate(), 22);
}
