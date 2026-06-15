import { ref, get, set } from 'firebase/database';
import { db } from '../config/firebase';

// ─── Notification preferences ─────────────────────────────────────────────────
// Stored per-user in Firebase at /notificationPrefs/{uid}. Kept in Firebase
// (rather than localStorage) so they can be honoured from any client — e.g. an
// admin broadcasting a "new movie" alert must respect each moviegoer's opt-in.

export interface NotificationPrefs {
  bookingConfirmations: boolean;  // confirmation when a ticket is booked
  bookingReminders:     boolean;  // reminders before a show
  promotions:           boolean;  // new-movie / offer alerts
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  bookingConfirmations: true,
  bookingReminders:     true,
  promotions:           false,
};

const prefsRef = (uid: string) => ref(db, `notificationPrefs/${uid}`);

export const getNotificationPrefs = async (
  uid: string | null,
): Promise<NotificationPrefs> => {
  if (!uid) return DEFAULT_NOTIFICATION_PREFS;
  try {
    const snap = await get(prefsRef(uid));
    if (!snap.exists()) return DEFAULT_NOTIFICATION_PREFS;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...snap.val() };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
};

export const saveNotificationPrefs = (
  uid: string,
  prefs: NotificationPrefs,
): Promise<void> => set(prefsRef(uid), prefs);
