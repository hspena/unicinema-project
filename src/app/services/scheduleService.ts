import {
  ref, set, get, update, remove, push, onValue, off,
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
  freeTickets: boolean;   // ← new: if true, booking is free
  status:      ScheduleStatus;
  createdBy:   string;
  createdAt:   string;
}

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

export const subscribeToRoomSchedules = (
  roomId: string,
  callback: (schedules: Schedule[]) => void
): (() => void) => {
  const dbRef = schedulesRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const all = Object.values(snap.val()) as Schedule[];
    callback(all.filter(s => s.roomId === roomId));
  });
  return () => off(dbRef);
};

export const subscribeToAllSchedules = (
  callback: (schedules: Schedule[]) => void
): (() => void) => {
  const dbRef = schedulesRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.values(snap.val()) as Schedule[]);
  });
  return () => off(dbRef);
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
  const recessStart = hasRecess ? toMinutes(config.recessStart!) : 0;
  const recessEnd   = hasRecess ? toMinutes(config.recessEnd!)   : 0;
  const out: SchedulePayload[] = [];

  for (const date of config.dates) {
    let cursor = dayStart;
    for (const movieId of playlist) {
      const duration = durationOf(movieId);
      if (duration <= 0) continue;
      let end = cursor + duration;

      // Skip past the recess window if this show would overlap it.
      if (hasRecess && cursor < recessEnd && end > recessStart) {
        cursor = recessEnd;
        end    = cursor + duration;
      }
      if (end > dayEnd) break;               // playlist exhausted for the day

      out.push({
        roomId:      config.roomId,
        movieId,
        date,
        startTime:   toHHMM(cursor),
        endTime:     toHHMM(end),
        freeTickets: config.freeTickets,
        status:      'upcoming',
        createdBy:   config.createdBy,
      });

      cursor = end + config.gapMinutes;      // gap before the next show
    }
  }

  return out;
};