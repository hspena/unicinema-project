import {
  ref, set, get, update, remove, push, onValue, off,
} from 'firebase/database';
import { db } from '../config/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScheduleStatus = 'upcoming' | 'running' | 'completed' | 'cancelled';

export interface Schedule {
  id:        string;
  roomId:    string;
  movieId:   string;
  date:      string;        // YYYY-MM-DD
  startTime: string;        // HH:MM
  endTime:   string;        // HH:MM — computed from movie duration
  status:    ScheduleStatus;
  createdBy: string;
  createdAt: string;
}

export type SchedulePayload = Omit<Schedule, 'id' | 'createdAt'>;

// ─── Firebase refs ────────────────────────────────────────────────────────────
const schedulesRef  = () => ref(db, 'schedules');
const scheduleRef   = (id: string) => ref(db, `schedules/${id}`);

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createSchedule = async (payload: SchedulePayload): Promise<Schedule> => {
  const newRef = push(schedulesRef());
  const id     = newRef.key!;
  const schedule: Schedule = { ...payload, id, createdAt: new Date().toISOString() };
  await set(newRef, schedule);
  return schedule;
};

export const updateSchedule = async (
  id: string, payload: Partial<SchedulePayload>
): Promise<void> => {
  await update(scheduleRef(id), payload);
};

export const deleteSchedule = async (id: string): Promise<void> => {
  await remove(scheduleRef(id));
};

/** Subscribe to schedules for a specific room */
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

/** Subscribe to all schedules (Admin view) */
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

/** Compute end time given start time (HH:MM) and duration in minutes */
export const computeEndTime = (startTime: string, durationMinutes: number): string => {
  const [h, m]   = startTime.split(':').map(Number);
  const total    = h * 60 + m + durationMinutes;
  const endH     = Math.floor(total / 60) % 24;
  const endM     = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
};

/** Today's date in YYYY-MM-DD */
export const todayString = (): string =>
  new Date().toISOString().split('T')[0];

/** Format date for display */
export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/** Determine current status based on time */
export const autoStatus = (date: string, startTime: string, endTime: string): ScheduleStatus => {
  const now   = new Date();
  const start = new Date(`${date}T${startTime}:00`);
  const end   = new Date(`${date}T${endTime}:00`);
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'running';
  return 'completed';
};