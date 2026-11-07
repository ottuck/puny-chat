import type { BuddyJob } from '../../api';

// The room's time: the device's, or the hour and day the art preview picks (MM-DD this year, or
// YYYY-MM-DD for a moon).
export function roomTime(clock: Date, hour?: number, date?: string): Date {
  if (hour === undefined && !date) return clock;
  const parts = date ? date.split('-').map(Number) : [clock.getMonth() + 1, clock.getDate()];
  const [year, month, day] = parts.length === 3 ? parts : [clock.getFullYear(), ...parts];
  return new Date(
    year,
    month - 1,
    day,
    hour ?? clock.getHours(),
    hour === undefined ? clock.getMinutes() : 10,
  );
}

// The buddy's night hours.
const SLEEP_FROM = 23;
const SLEEP_UNTIL = 7;
// The radio DJ (DJ) keeps the opposite hours: on air in the small hours, asleep through the morning.
const DJ_SLEEP_FROM = 3;
const DJ_SLEEP_UNTIL = 11;

// Whether the buddy sleeps at this hour (0–23).
export function asleepAt(job: BuddyJob | null, hour: number): boolean {
  if (job === 'DJ') return hour >= DJ_SLEEP_FROM && hour < DJ_SLEEP_UNTIL;
  return hour >= SLEEP_FROM || hour < SLEEP_UNTIL;
}
