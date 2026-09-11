import {
  ref, set, get, update, remove, push, onValue,
} from 'firebase/database';
import { db } from '../config/firebase';

export type ScheduleStatus = 'upcoming' | 'running' | 'completed' | 'cancelled';

export interface Schedule {
  id:          string;
  roomId:      string;
  movieId:     string;
  date:        string;
  startTime:   string;
  endTime:     string;
  freeTickets: boolean;    // if true, booking is free
  snacksEnabled?: boolean; // if false, snacks cannot be ordered for this show (default: allowed)
  vipOnly?:     boolean;   // if true, a VIP-only screening — the audience is invited, not booked
  status:      ScheduleStatus;
  createdBy:   string;
  createdAt:   string;
}

/** Whether snacks may be ordered for a show. Legacy shows without the flag are allowed. */
export const snacksAllowed = (s: { snacksEnabled?: boolean }): boolean => s.snacksEnabled !== false;

/**
 * A VIP-only slot: the guests are picked in advance by the admin or lecturer and
 * simply turn up, so the show occupies the room but takes no bookings.
 */
export const isVipShow = (s: { vipOnly?: boolean }): boolean => s.vipOnly === true;

export type SchedulePayload = Omit<Schedule, 'id' | 'createdAt'>;

const schedulesRef = () => ref(db, 'schedules');
const scheduleRef  = (id: string) => ref(db, `schedules/${id}`);

// ─── Clash detection ──────────────────────────────────────────────────────────

/** Convert HH:MM to total minutes */
const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Check if a new schedule clashes with existing ones in the same room on the same date.
 * Returns the clashing schedule if found, null otherwise.
 * Pass `excludeId` when editing an existing schedule to ignore itself.
 */
export const findClash = async (
  roomId:    string,
  date:      string,
  startTime: string,
  endTime:   string,
  excludeId?: string
): Promise<Schedule | null> => {
  const snap = await get(schedulesRef());
  if (!snap.exists()) return null;

  const all = Object.values(snap.val()) as Schedule[];
  const same = all.filter(s =>
    s.roomId === roomId &&
    s.date   === date   &&
    s.id     !== excludeId
  );

  const newStart = toMinutes(startTime);
  const newEnd   = toMinutes(endTime);

  for (const s of same) {
    const exStart = toMinutes(s.startTime);
    const exEnd   = toMinutes(s.endTime);
    // Overlap if new show starts before existing ends AND new show ends after existing starts
    if (newStart < exEnd && newEnd > exStart) {
      return s;
    }
  }
  return null;
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createSchedule = async (payload: SchedulePayload): Promise<Schedule> => {
  const newRef = push(schedulesRef());
  const id     = newRef.key!;
  const schedule: Schedule = { ...payload, id, createdAt: new Date().toISOString() };
  await set(newRef, schedule);
  return schedule;
};

export const updateSchedule = async (id: string, payload: Partial<SchedulePayload>): Promise<void> => {
  await update(scheduleRef(id), payload);
};

export const deleteSchedule = async (id: string): Promise<void> => {
  await remove(scheduleRef(id));
};

/** One-shot read of every show in a room on a given date (YYYY-MM-DD). */
export const getRoomSchedulesOn = async (
  roomId: string,
  date:   string
): Promise<Schedule[]> => {
  const snap = await get(schedulesRef());
  if (!snap.exists()) return [];
  return (Object.values(snap.val()) as Schedule[])
    .filter(s => s.roomId === roomId && s.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
};

/** Mark several shows cancelled in one write. */
export const cancelSchedules = async (ids: string[]): Promise<void> => {
  if (!ids.length) return;
  const updates: Record<string, ScheduleStatus> = {};
  ids.forEach((id) => { updates[`${id}/status`] = 'cancelled'; });
  await update(schedulesRef(), updates);
};

export const subscribeToRoomSchedules = (
  roomId: string,
  callback: (schedules: Schedule[]) => void
): (() => void) => {
  return onValue(schedulesRef(), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const all = Object.values(snap.val()) as Schedule[];
    callback(all.filter(s => s.roomId === roomId));
  });
};

export const subscribeToAllSchedules = (
  callback: (schedules: Schedule[]) => void
): (() => void) => {
  return onValue(schedulesRef(), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.values(snap.val()) as Schedule[]);
  });
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const computeEndTime = (startTime: string, durationMinutes: number): string => {
  const [h, m] = startTime.split(':').map(Number);
  const total  = h * 60 + m + durationMinutes;
  const endH   = Math.floor(total / 60) % 24;
  const endM   = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
};

// Returns the LOCAL calendar date as 'YYYY-MM-DD'. Deliberately avoids
// `toISOString()`, which returns the UTC date — in timezones ahead of UTC
// (e.g. UTC+8), that rolls over to "yesterday" during local early-morning
// hours and throws off date comparisons against locally-entered schedules.
export const todayString = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * The status to display for a show. A stored 'cancelled' always wins — it is
 * a manual decision that the clock can't override. Everything else is derived
 * from the current time, so shows roll from upcoming → running → completed
 * without anyone having to write to the database.
 */
export const effectiveStatus = (
  s: Pick<Schedule, 'date' | 'startTime' | 'endTime' | 'status'>
): ScheduleStatus =>
  s.status === 'cancelled' ? 'cancelled' : autoStatus(s.date, s.startTime, s.endTime);

/** Whether a show can still be booked (not cancelled, not over, not VIP-only). */
export const isBookable = (
  s: Pick<Schedule, 'date' | 'startTime' | 'endTime' | 'status'> & { vipOnly?: boolean }
): boolean => !isVipShow(s) && ['upcoming', 'running'].includes(effectiveStatus(s));

export const autoStatus = (date: string, startTime: string, endTime: string): ScheduleStatus => {
  const now   = new Date();
  const start = new Date(`${date}T${startTime}:00`);
  const end   = new Date(`${date}T${endTime}:00`);
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'running';
  return 'completed';
};

// ─── Automated scheduling ───────────────────────────────────────────────────────

/** A movie reduced to just the fields the generator needs. */
export interface GenMovie {
  id:       string;
  duration: number;   // minutes
}

export interface AutoScheduleConfig {
  roomId:       string;
  movieIds:     string[];   // movies to include, in selection order
  dates:        string[];   // one or more calendar dates (YYYY-MM-DD)
  dayStart:     string;     // HH:MM — earliest a show may start
  dayEnd:       string;     // HH:MM — latest a show may end
  gapMinutes:   number;     // gap between consecutive shows
  recessStart?: string;     // HH:MM — start of a daily rest/recess window (optional)
  recessEnd?:   string;     // HH:MM — end of the rest/recess window (optional)
  vipMovieIds?: string[];   // movies for the VIP-only slot — each plays once (optional)
  vipStart?:    string;     // HH:MM — start of the VIP slot; its length follows the movies
  repeatPerDay: number;     // how many times each movie plays per day
  freeTickets:  boolean;    // mark every generated show as free
  createdBy:    string;
}

const toHHMM = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Build a round-robin playlist so movies alternate before repeating:
 * with movies [A, B, C] and repeatPerDay 2 → A B C A B C.
 */
const buildPlaylist = (movieIds: string[], repeatPerDay: number): string[] => {
  const playlist: string[] = [];
  for (let round = 0; round < repeatPerDay; round++) {
    for (const id of movieIds) playlist.push(id);
  }
  return playlist;
};

/**
 * Generate a list of schedule payloads from the manager's constraints.
 * Shows are packed back-to-back (plus the configured gap) starting at
 * `dayStart`; any show that would end after `dayEnd` is dropped. Movies
 * alternate before repeating. Returns one batch per selected date.
 *
 * If a rest/recess window (`recessStart`–`recessEnd`) is configured, no show
 * is allowed to run during it: a show that would overlap the window is pushed
 * to start once the recess ends.
 *
 * A VIP slot (`vipMovieIds` from `vipStart`) works the same way, except the window
 * is itself made of shows: each VIP movie is screened once, back to back, flagged
 * `vipOnly` so they take no bookings, and the regular playlist is pushed past them.
 *
 * This is a pure function — it performs no clash detection or writes.
 */
export const generateAutoSchedule = (
  config: AutoScheduleConfig,
  movies: GenMovie[]
): SchedulePayload[] => {
  const durationOf = (id: string) => movies.find(m => m.id === id)?.duration ?? 0;
  const playlist   = buildPlaylist(config.movieIds, config.repeatPerDay);
  const dayStart   = toMinutes(config.dayStart);
  const dayEnd     = toMinutes(config.dayEnd);
  const hasRecess  = !!config.recessStart && !!config.recessEnd
    && toMinutes(config.recessStart) < toMinutes(config.recessEnd);

  // The VIP block: every chosen movie, once each, back to back from `vipStart`.
  const vipMovieIds = (config.vipMovieIds ?? []).filter(id => durationOf(id) > 0);
  const hasVip      = vipMovieIds.length > 0 && !!config.vipStart;
  const vipStart    = hasVip ? toMinutes(config.vipStart!) : 0;
  const vipRuns: Array<{ movieId: string; start: number; end: number }> = [];
  if (hasVip) {
    let vipCursor = vipStart;
    for (const movieId of vipMovieIds) {
      const end = vipCursor + durationOf(movieId);
      vipRuns.push({ movieId, start: vipCursor, end });
      vipCursor = end + config.gapMinutes;
    }
  }
  const vipEnd = vipRuns.length ? vipRuns[vipRuns.length - 1].end : 0;

  // Windows the regular playlist may not run in. A show overlapping one is
  // pushed to start when that window ends (the gap still applies afterwards).
  const blocked: Array<{ start: number; end: number }> = [];
  if (hasRecess) blocked.push({ start: toMinutes(config.recessStart!), end: toMinutes(config.recessEnd!) });
  if (hasVip)    blocked.push({ start: vipStart, end: vipEnd + config.gapMinutes });

  const out: SchedulePayload[] = [];

  for (const date of config.dates) {
    const day: SchedulePayload[] = [];

    for (const run of vipRuns) {
      day.push({
        roomId:      config.roomId,
        movieId:     run.movieId,
        date,
        startTime:   toHHMM(run.start),
        endTime:     toHHMM(run.end),
        freeTickets: true,     // VIPs are invited, never charged
        snacksEnabled: false,  // and there is nothing to order against
        vipOnly:     true,
        status:      'upcoming',
        createdBy:   config.createdBy,
      });
    }

    let cursor = dayStart;
    for (const movieId of playlist) {
      const duration = durationOf(movieId);
      if (duration <= 0) continue;
      let end = cursor + duration;

      // Skip past any blocked window this show would overlap. Looping, because
      // clearing one window can drop the show straight into the next.
      for (let guard = 0; guard < blocked.length; guard++) {
        let hit: { start: number; end: number } | undefined;
        for (const w of blocked) {
          if (cursor < w.end && end > w.start) { hit = w; break; }
        }
        if (!hit) break;
        cursor = hit.end;
        end    = cursor + duration;
      }
      if (end > dayEnd) break;               // playlist exhausted for the day

      day.push({
        roomId:      config.roomId,
        movieId,
        date,
        startTime:   toHHMM(cursor),
        endTime:     toHHMM(end),
        freeTickets: config.freeTickets,
        snacksEnabled: true,
        status:      'upcoming',
        createdBy:   config.createdBy,
      });

      cursor = end + config.gapMinutes;      // gap before the next show
    }

    day.sort((a, b) => a.startTime.localeCompare(b.startTime));
    out.push(...day);
  }

  return out;
};