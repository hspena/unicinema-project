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