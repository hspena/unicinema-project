// ─── Room-Day Cancellation ────────────────────────────────────────────────────
// Calling off every show in a room for a given day (a burst pipe, a power cut,
// a campus event) touches four things at once, so it lives in one place:
//
//   1. the schedules   → marked 'cancelled'
//   2. the bookings    → marked 'cancelled'
//   3. an in-app notification per affected moviegoer
//   4. an email per affected moviegoer
//
// Steps 1–2 are the source of truth and are awaited. Steps 3–4 are best-effort:
// a notification or mail failure is counted and reported, never thrown, so a
// flaky mail provider can't leave the schedules half-cancelled.

import {
  Schedule, getRoomSchedulesOn, cancelSchedules, effectiveStatus, formatDate,
} from './scheduleService';
import {
  Booking, getActiveBookingsForSchedules, cancelBookings,
} from './bookingService';
import { createNotification } from './notificationService';
import { sendEmails, isEmailConfigured, EmailMessage } from './emailService';
import { getUserById } from './userService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CancellationPreview {
  /** Shows that will be cancelled (already-cancelled and finished ones excluded). */
  schedules:     Schedule[];
  /** Still-valid bookings across those shows. */
  bookings:      Booking[];
  affectedUsers: number;
  /** Ticket revenue that will need refunding (paid, non-free bookings only). */
  refundTotal:   number;
  /** Shows on this date that are already cancelled or already finished. */
  untouched:     number;
}

export interface CancellationResult {
  schedulesCancelled: number;
  bookingsCancelled:  number;
  usersNotified:      number;
  emailsSent:         number;
  emailsSkipped:      number;
  emailsFailed:       number;
}

export interface CancelRoomDayInput {
  roomId:   string;
  roomName: string;
  date:     string;   // YYYY-MM-DD
  reason:   string;   // shown to the moviegoer verbatim
}

// ─── Preview ──────────────────────────────────────────────────────────────────

/**
 * Work out what cancelling a room's day would affect, without writing anything.
 * A show is skipped when it is already cancelled or has already finished —
 * there is nothing to call off, and ticket holders of a show they already
 * watched shouldn't get a cancellation email.
 */
export const previewRoomDayCancellation = async (
  roomId: string,
  date:   string,
): Promise<CancellationPreview> => {
  const all       = await getRoomSchedulesOn(roomId, date);
  const cancelable = all.filter(s => ['upcoming', 'running'].includes(effectiveStatus(s)));
  const bookings  = await getActiveBookingsForSchedules(cancelable.map(s => s.id));

  return {
    schedules:     cancelable,
    bookings,
    affectedUsers: new Set(bookings.map(b => b.userId)).size,
    refundTotal:   bookings
      .filter(b => b.paid && !b.isFree)
      .reduce((sum, b) => sum + (b.totalPrice ?? 0), 0),
    untouched:     all.length - cancelable.length,
  };
};

// ─── Message composition ──────────────────────────────────────────────────────

/** "Dune at 14:00 · seats A1, A2 (TKT-ABC123)" */
const describeBooking = (b: Booking): string =>
  `${b.movieTitle} at ${b.showTime} · seat${b.seats.length > 1 ? 's' : ''} ${b.seats.join(', ')} (${b.ticketCode})`;

/** "Dune 14:00" — the short form used in the one-line in-app notification. */
const briefBooking = (b: Booking): string => `${b.movieTitle} ${b.showTime}`;

const refundLine = (bookings: Booking[]): string => {
  const total = bookings
    .filter(b => b.paid && !b.isFree)
    .reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);
  return total > 0
    ? `A refund of RM ${total.toFixed(2)} will be processed for the tickets you paid for.`
    : 'No payment was taken for these tickets, so there is nothing to refund.';
};

// ─── Cancel ───────────────────────────────────────────────────────────────────

/**
 * Cancel every remaining show in a room on one date and tell each affected
 * moviegoer, in-app and by email.
 *
 * Cancellation notices ignore the user's notification preferences: unlike a
 * promo or a reminder, this is information they need in order to not turn up
 * at a cinema that isn't open.
 */
export const cancelRoomDay = async (
  input: CancelRoomDayInput,
): Promise<CancellationResult> => {
  const { roomId, roomName, date, reason } = input;

  const preview = await previewRoomDayCancellation(roomId, date);

  const empty: CancellationResult = {
    schedulesCancelled: 0, bookingsCancelled: 0, usersNotified: 0,
    emailsSent: 0, emailsSkipped: 0, emailsFailed: 0,
  };
  if (!preview.schedules.length) return empty;

  // 1–2. Source of truth first: if these fail, the caller sees the error and
  //      nobody has been told about a cancellation that didn't happen.
  await cancelSchedules(preview.schedules.map(s => s.id));
  await cancelBookings(preview.bookings.map(b => b.id));

  // Bookings a moviegoer holds may span several shows on the day — group them
  // so one person gets one notification listing all of them, not one each.
  const byUser = new Map<string, Booking[]>();
  preview.bookings.forEach((b) => {
    byUser.set(b.userId, [...(byUser.get(b.userId) ?? []), b]);
  });

  const prettyDate = formatDate(date);
  const emails: EmailMessage[] = [];

  // 3. In-app notifications (createNotification swallows its own failures).
  await Promise.all(
    [...byUser.entries()].map(async ([userId, bookings]) => {
      const sorted = [...bookings].sort((a, b) => a.showTime.localeCompare(b.showTime));

      // The notification dropdown shows one flowing line, so keep the in-app
      // copy tight — the full per-ticket breakdown goes in the email.
      await createNotification(userId, {
        type:    'cancel',
        title:   `Shows cancelled — ${roomName}`,
        message:
          `${roomName} is closed on ${prettyDate}. Reason: ${reason}. ` +
          `Your ticket${sorted.length === 1 ? '' : 's'} for ${sorted.map(briefBooking).join(', ')} ` +
          `${sorted.length === 1 ? 'has' : 'have'} been cancelled. ${refundLine(sorted)}`,
      });

      // Bookings made before userEmail was stored (and any left blank by the
      // walk-up counter) carry no address — fall back to the account record.
      const toEmail = sorted[0].userEmail?.trim()
        || (userId ? (await getUserById(userId).catch(() => null))?.email ?? '' : '');

      emails.push({
        toEmail,
        toName:  sorted[0].userName,
        subject: `Cancelled: your ${prettyDate} booking at ${roomName}`,
        heading: 'Your show has been cancelled',
        message:
          `We're sorry — all shows at ${roomName} on ${prettyDate} have been cancelled.\n\n` +
          `Reason: ${reason}\n\n${refundLine(sorted)}\n\n` +
          `You don't need to do anything: the tickets below have already been cancelled ` +
          `for you. We hope to see you at another showing soon.`,
        details: sorted.map(b => `• ${describeBooking(b)}`).join('\n'),
      });
    }),
  );

  // 4. Email. Unconfigured mail counts as "skipped", not a failure — the app is
  //    demonstrable without EmailJS credentials and in-app alerts still land.
  const mail = isEmailConfigured()
    ? await sendEmails(emails)
    : { sent: 0, skipped: emails.length, failed: 0 };

  return {
    schedulesCancelled: preview.schedules.length,
    bookingsCancelled:  preview.bookings.length,
    usersNotified:      byUser.size,
    emailsSent:         mail.sent,
    emailsSkipped:      mail.skipped,
    emailsFailed:       mail.failed,
  };
};
