// ─── Transactional Email Service ──────────────────────────────────────────────
// Sends transactional email (e.g. "your show was cancelled") through EmailJS's
// REST API. EmailJS is used because this is a client-only app with no backend
// of its own — Firebase Auth handles its own emails (password resets), but
// anything we compose ourselves needs a delivery service.
//
// Configuration (see .env.example):
//   REACT_APP_EMAILJS_SERVICE_ID   — EmailJS service (the connected mailbox)
//   REACT_APP_EMAILJS_TEMPLATE_ID  — EmailJS template id
//   REACT_APP_EMAILJS_PUBLIC_KEY   — EmailJS public key ("user ID")
//
// The EmailJS template should reference these variables:
//   {{to_email}} {{to_name}} {{subject}} {{heading}} {{message}} {{details}}
//
// NOTE: like REACT_APP_GEMINI_API_KEY, these values are bundled into the
// client-side JS. That is expected for an EmailJS *public* key — lock the
// account down with the domain allow-list in the EmailJS dashboard. For
// production you would proxy this through a backend instead.
//
// When the keys are absent the service degrades gracefully: nothing is sent,
// nothing throws, and callers get a `skipped` result they can report. The app
// (and its in-app notifications) keeps working without email configured.

const SERVICE_ID  = process.env.REACT_APP_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY  = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

const ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailMessage {
  toEmail:  string;
  toName:   string;
  subject:  string;
  heading:  string;   // large line at the top of the email body
  message:  string;   // main paragraph
  details?: string;   // pre-formatted block (e.g. one line per affected show)
}

export type EmailResult =
  | { status: 'sent' }
  | { status: 'skipped'; reason: string }   // not configured / no address
  | { status: 'failed';  reason: string };

/** True when all three EmailJS environment variables are present. */
export const isEmailConfigured = (): boolean =>
  Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);

// ─── Send ─────────────────────────────────────────────────────────────────────

/**
 * Send one transactional email. Never throws — the caller's action (cancelling
 * a day of shows, for instance) must not fail just because mail delivery did.
 */
export const sendEmail = async (msg: EmailMessage): Promise<EmailResult> => {
  if (!isEmailConfigured()) {
    return { status: 'skipped', reason: 'Email is not configured (REACT_APP_EMAILJS_* missing).' };
  }
  if (!msg.toEmail?.trim()) {
    return { status: 'skipped', reason: 'No email address on file for this user.' };
  }

  try {
    const res = await fetch(ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  SERVICE_ID,
        template_id: TEMPLATE_ID,
        user_id:     PUBLIC_KEY,
        template_params: {
          to_email: msg.toEmail.trim(),
          to_name:  msg.toName,
          subject:  msg.subject,
          heading:  msg.heading,
          message:  msg.message,
          details:  msg.details ?? '',
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { status: 'failed', reason: body || `Mail request failed (${res.status}).` };
    }
    return { status: 'sent' };
  } catch (err: any) {
    return { status: 'failed', reason: err?.message ?? 'Mail request failed.' };
  }
};

/**
 * Send a batch of emails and tally the outcomes. Runs them in parallel; one
 * bad address never aborts the rest.
 */
export const sendEmails = async (
  messages: EmailMessage[],
): Promise<{ sent: number; skipped: number; failed: number }> => {
  const results = await Promise.all(messages.map(sendEmail));
  return {
    sent:    results.filter(r => r.status === 'sent').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    failed:  results.filter(r => r.status === 'failed').length,
  };
};
