import { useEffect, useRef } from 'react';
import { Booking, subscribeToUserBookings } from '../services/bookingService';
import { createNotification } from '../services/notificationService';
import { getNotificationPrefs } from '../utils/preferences';

// How far ahead (minutes) a show triggers a "starting soon" reminder.
const REMINDER_WINDOW_MIN = 60;
const CHECK_INTERVAL_MS   = 60_000; // re-check every minute while the app is open

const remindedKey = (uid: string) => `unicinema:reminded:${uid}`;

const loadReminded = (uid: string): Set<string> => {
  try {
    const raw = localStorage.getItem(remindedKey(uid));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
};

const saveReminded = (uid: string, ids: Set<string>) => {
  try { localStorage.setItem(remindedKey(uid), JSON.stringify([...ids])); }
  catch { /* ignore */ }
};

/**
 * While the app is open, watch the logged-in user's bookings and fire a one-time
 * "starting soon" notification for any confirmed show beginning within the next
 * hour. Reminders are de-duplicated per booking via localStorage so refreshing
 * the page won't re-notify. (A client-only app can't push reminders when closed;
 * this covers the common "already browsing" case.)
 */
export const useBookingReminders = (uid: string | null) => {
  const bookingsRef = useRef<Booking[]>([]);

  useEffect(() => {
    if (!uid) return;

    const unsubscribe = subscribeToUserBookings(uid, (bookings) => {
      bookingsRef.current = bookings;
    });

    const check = async () => {
      if (!(await getNotificationPrefs(uid)).bookingReminders) return;

      const now      = Date.now();
      const reminded = loadReminded(uid);
      let changed    = false;

      bookingsRef.current.forEach((b) => {
        if (b.status !== 'confirmed' || reminded.has(b.id)) return;
        const start = new Date(`${b.showDate}T${b.showTime}:00`).getTime();
        if (Number.isNaN(start)) return;
        const minsUntil = (start - now) / 60000;
        if (minsUntil > 0 && minsUntil <= REMINDER_WINDOW_MIN) {
          createNotification(uid, {
            type:    'reminder',
            title:   'Show starting soon',
            message: `${b.movieTitle} starts at ${b.showTime} · seats ${b.seats.join(', ')}`,
          });
          reminded.add(b.id);
          changed = true;
        }
      });

      if (changed) saveReminded(uid, reminded);
    };

    // Run shortly after mount (give the subscription time to populate), then poll.
    const initial  = window.setTimeout(check, 4000);
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      unsubscribe();
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [uid]);
};
