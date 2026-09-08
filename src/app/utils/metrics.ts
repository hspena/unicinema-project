import { Booking } from '../services/bookingService';
import { Schedule, isVipShow } from '../services/scheduleService';

/**
 * Shared operational metrics.
 *
 * These answer the questions the dashboards actually exist to answer — "are we
 * filling the room?", "did the people who booked turn up?", "is this week better
 * than last?" — rather than restating how many rows a table has. Every page
 * computes them through here so the same number never means two different
 * things in two places.
 */

// ─── Booking predicates ───────────────────────────────────────────────────────

/** A booking that still counts: not cancelled. */
export const isLive = (b: Booking) => b.status !== 'cancelled';

/** Seats (tickets), not bookings — one booking can hold several seats. */
export const seatsIn = (bookings: Booking[]): number =>
  bookings.reduce((sum, b) => sum + (b.seats?.length ?? 0), 0);

/** Money actually taken: cancelled and comped shows earn nothing. */
export const revenueOf = (bookings: Booking[]): number =>
  bookings.filter(isLive).reduce((sum, b) => sum + (b.isFree ? 0 : b.totalPrice ?? 0), 0);

/** When a booking's show starts. */
export const showStart = (b: { showDate: string; showTime?: string }): Date =>
  new Date(`${b.showDate}T${b.showTime || '00:00'}:00`);

// ─── Occupancy ────────────────────────────────────────────────────────────────

export interface Occupancy {
  sold:     number;   // seats sold
  capacity: number;   // seats offered across the counted shows
  shows:    number;   // shows counted (VIP screenings excluded — they take no bookings)
  pct:      number;   // 0–100, 0 when there is no capacity to fill
}

/**
 * Share of offered seats that were actually sold.
 *
 * `seatsForRoom` returns a room's seat count (from its template); rooms with no
 * known template contribute no capacity, so they are skipped entirely rather
 * than silently counted as zero-capacity and dragging the percentage up.
 */
export const computeOccupancy = (
  schedules:    Schedule[],
  bookings:     Booking[],
  seatsForRoom: (roomId: string) => number,
): Occupancy => {
  const counted = schedules.filter(s => !isVipShow(s) && s.status !== 'cancelled' && seatsForRoom(s.roomId) > 0);
  const ids = new Set(counted.map(s => s.id));

  const capacity = counted.reduce((sum, s) => sum + seatsForRoom(s.roomId), 0);
  const sold     = seatsIn(bookings.filter(b => isLive(b) && ids.has(b.scheduleId)));

  return { sold, capacity, shows: counted.length, pct: capacity > 0 ? (sold / capacity) * 100 : 0 };
};

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface Attendance {
  checkedIn: number;  // seats that turned up
  noShows:   number;  // seats booked and paid for that never arrived
  expected:  number;  // checkedIn + noShows
  pct:       number;  // 0–100
}

/**
 * Turn-up rate for shows that have already started. A confirmed booking for a
 * future show is not a no-show, so counting it as one would make attendance
 * look worse every time someone books ahead.
 */
export const computeAttendance = (bookings: Booking[], now: Date = new Date()): Attendance => {
  const past = bookings.filter(b => isLive(b) && showStart(b).getTime() <= now.getTime());
  const checkedIn = seatsIn(past.filter(b => b.status === 'checked-in'));
  const noShows   = seatsIn(past.filter(b => b.status === 'confirmed'));
  const expected  = checkedIn + noShows;
  return { checkedIn, noShows, expected, pct: expected > 0 ? (checkedIn / expected) * 100 : 0 };
};

// ─── Change over time ─────────────────────────────────────────────────────────

export interface Delta { pct: number; up: boolean; label: string; }

/**
 * Percentage change from `prev` to `curr`, ready for a StatCard trend.
 * Returns null when there is no prior period to compare against — an
 * invented "+100%" against a zero baseline is noise, not information.
 */
export const changeVs = (curr: number, prev: number): Delta | null => {
  if (prev <= 0) return null;
  const pct = ((curr - prev) / prev) * 100;
  // Same adaptive precision as pctText, so a small-but-real move doesn't
  // flatten to "+0%" and look like nothing changed.
  return { pct, up: pct >= 0, label: `${pct > 0 ? '+' : ''}${pctText(pct)}` };
};

/** Seats sold for shows in the [from, to) window. */
export const seatsBetween = (bookings: Booking[], from: Date, to: Date): number =>
  seatsIn(bookings.filter(b => {
    if (!isLive(b)) return false;
    const t = showStart(b).getTime();
    return t >= from.getTime() && t < to.getTime();
  }));

export const DAY_MS = 24 * 60 * 60 * 1000;
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// ─── Time ranges ──────────────────────────────────────────────────────────────

export type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all';

export const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year' },
  { key: 'all',   label: 'All Time' },
];

export interface Bounds {
  from:     Date | null;   // null = unbounded (All Time)
  to:       Date | null;
  prevFrom: Date | null;   // the equivalent preceding period, for the trend
  prevTo:   Date | null;
  label:    string;
}

/**
 * Calendar bounds for a range, plus the preceding period of the same span.
 *
 * These are calendar periods, not rolling windows — "This Month" means the
 * month you are in, so it is compared against the whole of last month rather
 * than against a 30-day window that slides every time you open the page.
 */
export const rangeBounds = (range: TimeRange, now: Date = new Date()): Bounds => {
  const label = TIME_RANGES.find(r => r.key === range)?.label ?? 'All Time';
  if (range === 'all') return { from: null, to: null, prevFrom: null, prevTo: null, label };

  const day = startOfDay(now);
  let from: Date, to: Date;

  if (range === 'today') {
    from = day;
    to   = new Date(day.getTime() + DAY_MS);
  } else if (range === 'week') {
    const dow = (day.getDay() + 6) % 7;              // Monday = 0
    from = new Date(day.getTime() - dow * DAY_MS);
    to   = new Date(from.getTime() + 7 * DAY_MS);
  } else if (range === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else {
    from = new Date(now.getFullYear(), 0, 1);
    to   = new Date(now.getFullYear() + 1, 0, 1);
  }

  // Month and year step by calendar unit so the baseline is a real month/year,
  // not "31 days ago", which would straddle two months.
  let prevFrom: Date;
  if (range === 'month')      prevFrom = new Date(from.getFullYear(), from.getMonth() - 1, 1);
  else if (range === 'year')  prevFrom = new Date(from.getFullYear() - 1, 0, 1);
  else                        prevFrom = new Date(from.getTime() - (to.getTime() - from.getTime()));

  return { from, to, prevFrom, prevTo: from, label };
};

const within = (t: number, from: Date | null, to: Date | null) =>
  (!from || t >= from.getTime()) && (!to || t < to.getTime());

/** Bookings whose show falls inside the range (cancelled ones already dropped). */
export const bookingsInRange = (bookings: Booking[], b: Bounds, previous = false): Booking[] => {
  const [from, to] = previous ? [b.prevFrom, b.prevTo] : [b.from, b.to];
  if (previous && !from) return [];
  return bookings.filter(x => isLive(x) && within(showStart(x).getTime(), from, to));
};

/** Shows scheduled inside the range. */
export const schedulesInRange = (schedules: Schedule[], b: Bounds): Schedule[] =>
  schedules.filter(s => within(new Date(`${s.date}T00:00:00`).getTime(), b.from, b.to));

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Percentages with adaptive precision.
 *
 * Rounding to whole numbers turns any real-but-small figure into a flat "0%" —
 * 35 seats sold out of 9,540 is 0.4%, and reporting that as zero says nothing
 * happened when something did. Rounding it *up* to 1% would be the same lie in
 * the other direction, and would make 0.4% and 1.4% indistinguishable. So the
 * precision follows the magnitude, and only a genuine zero prints "0%":
 *
 *   0        → "0%"        nothing sold
 *   0.04     → "<0.1%"     real, but below what one decimal can show
 *   0.37     → "0.4%"
 *   3.7      → "3.7%"
 *   42.3     → "42%"       whole numbers once the detail stops mattering
 */
export const pctText = (n: number): string => {
  if (!isFinite(n) || n === 0) return '0%';
  const sign = n < 0 ? '-' : '';
  const abs  = Math.abs(n);
  if (abs < 0.05) return `${sign}<0.1%`;
  if (abs < 10)   return `${sign}${abs.toFixed(1)}%`;
  return `${sign}${Math.round(abs)}%`;
};
export const money   = (n: number) => `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const moneyShort = (n: number) => `RM ${Math.round(n).toLocaleString()}`;
