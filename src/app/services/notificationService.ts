import {
  ref, push, set, get, update, remove, onValue, off,
} from 'firebase/database';
import { db } from '../config/firebase';
import { getAllUsers } from './userService';
import { getNotificationPrefs } from '../utils/preferences';

// ─── Types ────────────────────────────────────────────────────────────────────
// A lightweight in-app notification stored per user at /notifications/{userId}.
// `type` drives which icon the Topbar renders; the service stays UI-agnostic.

export type NotificationType =
  | 'booking'    // a ticket was confirmed
  | 'cancel'     // a booking was cancelled
  | 'reminder'   // upcoming-show reminder
  | 'movie'      // a new movie was added
  | 'promo'      // promotional / offer
  | 'system';    // generic system message

export interface AppNotification {
  id:        string;
  type:      NotificationType;
  title:     string;
  message:   string;
  read:      boolean;
  createdAt: string;          // ISO timestamp
}

export type NotificationPayload = Omit<AppNotification, 'id' | 'read' | 'createdAt'>;

// ─── Firebase refs ────────────────────────────────────────────────────────────
const userNotifsRef = (uid: string) => ref(db, `notifications/${uid}`);
const notifRef      = (uid: string, id: string) => ref(db, `notifications/${uid}/${id}`);

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Create a notification for a single user. Fire-and-forget friendly: callers
 * usually don't await this so booking flows aren't blocked by it. Any failure
 * is swallowed so a notification hiccup never breaks the action that caused it.
 */
export const createNotification = async (
  uid: string,
  payload: NotificationPayload,
): Promise<void> => {
  try {
    const newRef = push(userNotifsRef(uid));
    const notification: AppNotification = {
      ...payload,
      id:        newRef.key!,
      read:      false,
      createdAt: new Date().toISOString(),
    };
    await set(newRef, notification);
  } catch (err) {
    // Non-critical: never let a notification failure break the caller.
    console.warn('Failed to create notification:', err);
  }
};

/**
 * Broadcast a promotional notification to every Moviegoer who has opted in to
 * promotions. Used e.g. when a new movie is added to the catalogue. Failures
 * are swallowed per-user so one bad write doesn't abort the whole broadcast.
 */
export const broadcastPromoToMoviegoers = async (
  payload: NotificationPayload,
): Promise<void> => {
  try {
    const users = await getAllUsers();
    const moviegoers = users.filter(u => u.role === 'Moviegoer');
    await Promise.all(
      moviegoers.map(async (u) => {
        const prefs = await getNotificationPrefs(u.id);
        if (prefs.promotions) await createNotification(u.id, payload);
      }),
    );
  } catch (err) {
    console.warn('Failed to broadcast promo notification:', err);
  }
};

export const markNotificationRead = async (uid: string, id: string): Promise<void> => {
  await update(notifRef(uid, id), { read: true });
};

export const markAllNotificationsRead = async (uid: string): Promise<void> => {
  const snap = await get(userNotifsRef(uid));
  if (!snap.exists()) return;
  const updates: Record<string, boolean> = {};
  Object.keys(snap.val()).forEach((id) => { updates[`${id}/read`] = true; });
  await update(userNotifsRef(uid), updates);
};

export const deleteNotification = (uid: string, id: string): Promise<void> =>
  remove(notifRef(uid, id));

export const clearNotifications = (uid: string): Promise<void> =>
  remove(userNotifsRef(uid));

// ─── Real-time subscription ───────────────────────────────────────────────────
export const subscribeToUserNotifications = (
  uid: string,
  callback: (notifications: AppNotification[]) => void,
): (() => void) => {
  const dbRef = userNotifsRef(uid);
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const list = (Object.values(snap.val()) as AppNotification[]).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    callback(list);
  });
  return () => off(dbRef);
};
