import {
  ref, set, get, update, remove, push, onValue, off,
} from 'firebase/database';
import { db } from '../config/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingStatus = 'confirmed' | 'checked-in' | 'cancelled';

// A snack line ordered as part of a booking. Stored on the booking so staff can
// see what to prepare at check-in.
export interface BookingSnack {
  snackId: string;
  name:    string;
  emoji:   string;
  price:   number;   // unit price in RM at time of booking
  qty:     number;
}

export interface Booking {
  id:          string;
  ticketCode:  string;
  scheduleId:  string;
  roomId:      string;
  movieId:     string;
  movieTitle:  string;
  showDate:    string;
  showTime:    string;
  userId:      string;
  userName:    string;
  userEmail:   string;
  seats:       string[];
  snacks?:     BookingSnack[];   // snacks ordered with this booking (optional)
  totalPrice:  number;
  isFree:      boolean;
  paid:        boolean;       // true once payment is settled (always true for free shows)
  paymentRef?: string;        // gateway transaction reference (paid shows only)
  status:      BookingStatus;
  bookedAt:    string;
  checkedInAt?: string;
}

export type BookingPayload = Omit<Booking, 'id' | 'bookedAt' | 'ticketCode'>;

// ─── Firebase refs ────────────────────────────────────────────────────────────
const bookingsRef = () => ref(db, 'bookings');
const bookingRef  = (id: string) => ref(db, `bookings/${id}`);

// ─── Ticket code ──────────────────────────────────────────────────────────────
const generateTicketCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'TKT-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createBooking = async (payload: BookingPayload): Promise<Booking> => {
  const newRef = push(bookingsRef());
  const id     = newRef.key!;
  const booking: Booking = {
    ...payload, id,
    ticketCode: generateTicketCode(),
    bookedAt:   new Date().toISOString(),
  };
  await set(newRef, booking);
  return booking;
};

export const checkInBooking = async (id: string): Promise<void> => {
  await update(bookingRef(id), {
    status:      'checked-in',
    checkedInAt: new Date().toISOString(),
  });
};

export const cancelBooking = async (id: string): Promise<void> => {
  await update(bookingRef(id), { status: 'cancelled' });
};

// ─── Self-service cancellation window ─────────────────────────────────────────

/**
 * How long before the show a moviegoer may still cancel their own booking.
 * Staff/manager cancellations are not bound by this.
 */
export const CANCELLATION_CUTOFF_HOURS = 2;

/** Hours left until the show starts. Negative once it has begun. */
export const hoursUntilShowtime = (
  b: Pick<Booking, 'showDate' | 'showTime'>,
  now: Date = new Date()
): number => {
  const start = new Date(`${b.showDate}T${b.showTime}:00`).getTime();
  return (start - now.getTime()) / 3_600_000;
};

/** Whether the moviegoer can still cancel this booking themselves. */
export const canCancelBooking = (
  b: Pick<Booking, 'showDate' | 'showTime' | 'status'>,
  now: Date = new Date()
): boolean =>
  b.status === 'confirmed' && hoursUntilShowtime(b, now) >= CANCELLATION_CUTOFF_HOURS;

/**
 * Cancel on behalf of the ticket holder. Rejects once the show is inside the
 * cutoff window — re-checked here against the stored booking so a stale page
 * can't slip a late cancellation through.
 */
export const cancelBookingByUser = async (id: string): Promise<void> => {
  const snap = await get(bookingRef(id));
  if (!snap.exists()) throw new Error('Booking not found.');
  const booking = snap.val() as Booking;

  if (booking.status !== 'confirmed') {
    throw new Error('This booking can no longer be cancelled.');
  }
  if (hoursUntilShowtime(booking) < CANCELLATION_CUTOFF_HOURS) {
    throw new Error(
      `Bookings can only be cancelled at least ${CANCELLATION_CUTOFF_HOURS} hours before the show starts. Please see staff at the counter.`
    );
  }
  await cancelBooking(id);
};

/**
 * Every still-valid booking (confirmed or already checked in) across a set of
 * shows. Used when a whole day of shows is called off and each ticket holder
 * has to be found and told.
 */
export const getActiveBookingsForSchedules = async (
  scheduleIds: string[]
): Promise<Booking[]> => {
  if (!scheduleIds.length) return [];
  const ids  = new Set(scheduleIds);
  const snap = await get(bookingsRef());
  if (!snap.exists()) return [];
  return (Object.values(snap.val()) as Booking[])
    .filter(b => ids.has(b.scheduleId) && b.status !== 'cancelled');
};

/** Mark several bookings cancelled in one write. */
export const cancelBookings = async (ids: string[]): Promise<void> => {
  if (!ids.length) return;
  const updates: Record<string, BookingStatus> = {};
  ids.forEach((id) => { updates[`${id}/status`] = 'cancelled'; });
  await update(bookingsRef(), updates);
};

export const findBookingByCode = async (code: string): Promise<Booking | null> => {
  const snap = await get(bookingsRef());
  if (!snap.exists()) return null;
  const all = Object.values(snap.val()) as Booking[];
  return all.find(b => b.ticketCode.toUpperCase() === code.toUpperCase()) ?? null;
};

export const getBookedSeats = async (scheduleId: string): Promise<string[]> => {
  const snap = await get(bookingsRef());
  if (!snap.exists()) return [];
  const all  = Object.values(snap.val()) as Booking[];
  return all
    .filter(b => b.scheduleId === scheduleId && b.status !== 'cancelled')
    .flatMap(b => b.seats);
};

export const subscribeToAllBookings = (
  callback: (bookings: Booking[]) => void
): (() => void) => {
  const dbRef = bookingsRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.values(snap.val()) as Booking[]);
  });
  return () => off(dbRef);
};

export const subscribeToRoomBookings = (
  roomId: string,
  callback: (bookings: Booking[]) => void
): (() => void) => {
  const dbRef = bookingsRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback((Object.values(snap.val()) as Booking[]).filter(b => b.roomId === roomId));
  });
  return () => off(dbRef);
};

export const subscribeToUserBookings = (
  userId: string,
  callback: (bookings: Booking[]) => void
): (() => void) => {
  const dbRef = bookingsRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(
      (Object.values(snap.val()) as Booking[])
        .filter(b => b.userId === userId)
        .sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime())
    );
  });
  return () => off(dbRef);
};

export const subscribeToScheduleBookings = (
  scheduleId: string,
  callback: (bookings: Booking[]) => void
): (() => void) => {
  const dbRef = bookingsRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback((Object.values(snap.val()) as Booking[]).filter(b => b.scheduleId === scheduleId));
  });
  return () => off(dbRef);
};