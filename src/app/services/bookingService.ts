import {
  ref, set, get, update, remove, push, onValue, off, query, orderByChild, equalTo,
} from 'firebase/database';
import { db } from '../config/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingStatus = 'confirmed' | 'checked-in' | 'cancelled';

export interface Booking {
  id:          string;
  ticketCode:  string;       // short readable e.g. "TKT-A3F2"
  scheduleId:  string;
  roomId:      string;
  movieId:     string;
  movieTitle:  string;       // denormalized for easy display
  showDate:    string;       // YYYY-MM-DD
  showTime:    string;       // HH:MM
  userId:      string;
  userName:    string;
  userEmail:   string;
  seats:       string[];     // seat IDs from template e.g. ["r0c0-5", "r0c0-6"]
  totalPrice:  number;
  status:      BookingStatus;
  bookedAt:    string;
  checkedInAt?: string;
}

export type BookingPayload = Omit<Booking, 'id' | 'bookedAt' | 'ticketCode'>;

// ─── Firebase refs ────────────────────────────────────────────────────────────
const bookingsRef  = () => ref(db, 'bookings');
const bookingRef   = (id: string) => ref(db, `bookings/${id}`);

// ─── Ticket code generator ─────────────────────────────────────────────────────
const generateTicketCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TKT-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createBooking = async (payload: BookingPayload): Promise<Booking> => {
  const newRef    = push(bookingsRef());
  const id        = newRef.key!;
  const booking: Booking = {
    ...payload,
    id,
    ticketCode: generateTicketCode(),
    bookedAt:   new Date().toISOString(),
  };
  await set(newRef, booking);
  return booking;
};

/** Check in a ticket by booking ID */
export const checkInBooking = async (id: string): Promise<void> => {
  await update(bookingRef(id), {
    status:      'checked-in',
    checkedInAt: new Date().toISOString(),
  });
};

/** Cancel a booking */
export const cancelBooking = async (id: string): Promise<void> => {
  await update(bookingRef(id), { status: 'cancelled' });
};

/** Find a booking by its ticket code */
export const findBookingByCode = async (code: string): Promise<Booking | null> => {
  const snap = await get(bookingsRef());
  if (!snap.exists()) return null;
  const all = Object.values(snap.val()) as Booking[];
  return all.find(b => b.ticketCode.toUpperCase() === code.toUpperCase()) ?? null;
};

/** Get all booked seat IDs for a given schedule */
export const getBookedSeats = async (scheduleId: string): Promise<string[]> => {
  const snap = await get(bookingsRef());
  if (!snap.exists()) return [];
  const all = Object.values(snap.val()) as Booking[];
  return all
    .filter(b => b.scheduleId === scheduleId && b.status !== 'cancelled')
    .flatMap(b => b.seats);
};

/** Subscribe to all bookings for a specific room */
export const subscribeToRoomBookings = (
  roomId: string,
  callback: (bookings: Booking[]) => void
): (() => void) => {
  const dbRef = bookingsRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const all = Object.values(snap.val()) as Booking[];
    callback(all.filter(b => b.roomId === roomId));
  });
  return () => off(dbRef);
};

/** Subscribe to bookings for a specific user */
export const subscribeToUserBookings = (
  userId: string,
  callback: (bookings: Booking[]) => void
): (() => void) => {
  const dbRef = bookingsRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const all = Object.values(snap.val()) as Booking[];
    callback(all.filter(b => b.userId === userId));
  });
  return () => off(dbRef);
};

/** Subscribe to bookings for a specific schedule */
export const subscribeToScheduleBookings = (
  scheduleId: string,
  callback: (bookings: Booking[]) => void
): (() => void) => {
  const dbRef = bookingsRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const all = Object.values(snap.val()) as Booking[];
    callback(all.filter(b => b.scheduleId === scheduleId));
  });
  return () => off(dbRef);
};