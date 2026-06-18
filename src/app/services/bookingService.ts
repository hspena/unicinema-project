import {
  ref, set, get, update, remove, push, onValue, off,
} from 'firebase/database';
import { db } from '../config/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingStatus = 'confirmed' | 'checked-in' | 'cancelled';

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