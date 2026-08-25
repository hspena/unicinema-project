import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button } from './ui';
import { Movie } from '../services/movieService';
import { todayString, formatDate } from '../services/scheduleService';
import {
  CancellationPreview, CancellationResult,
  previewRoomDayCancellation, cancelRoomDay,
} from '../services/cancellationService';
import { isEmailConfigured } from '../services/emailService';
import {
  AlertTriangle, XCircle, CheckCircle2, Hourglass, Ticket, Users, MailCheck, IconGlyph,
} from '../utils/icons';

// Common reasons a manager calls off a day — one click instead of typing.
const QUICK_REASONS = [
  'Technical fault with the projector or sound system',
  'Emergency maintenance in the cinema room',
  'Power outage affecting the building',
  'Campus event / venue unavailable',
];

interface Props {
  open:     boolean;
  onClose:  () => void;
  roomId:   string;
  roomName: string;
  movies:   Movie[];
}

/**
 * Cancel every remaining show in the manager's room on a chosen date. Shows a
 * live preview of what will be hit (shows, tickets, people, refunds) before the
 * manager commits, then reports how the notifications actually went out.
 */
const CancelDayModal = ({ open, onClose, roomId, roomName, movies }: Props) => {
  const [date,    setDate]    = useState(todayString());
  const [reason,  setReason]  = useState('');
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error,   setError]   = useState('');
  const [result,  setResult]  = useState<CancellationResult | null>(null);

  // Reset to a clean state each time the modal is opened.
  useEffect(() => {
    if (!open) return;
    setDate(todayString());
    setReason('');
    setResult(null);
    setError('');
  }, [open]);

  const loadPreview = useCallback(async () => {
    if (!roomId || !date) return;
    setLoading(true);
    try {
      setPreview(await previewRoomDayCancellation(roomId, date));
    } catch (e: any) {
      setError(e.message ?? 'Could not load the shows for that date.');
    } finally {
      setLoading(false);
    }
  }, [roomId, date]);

  useEffect(() => {
    if (open && !result) loadPreview();
  }, [open, result, loadPreview]);

  const handleConfirm = async () => {
    if (!reason.trim()) { setError('Please give a reason — moviegoers see this in their notification.'); return; }
    if (!preview?.schedules.length) { setError('There are no shows left to cancel on that date.'); return; }

    setWorking(true);
    setError('');
    try {
      setResult(await cancelRoomDay({ roomId, roomName, date, reason: reason.trim() }));
    } catch (e: any) {
      setError(e.message ?? 'Failed to cancel the shows. Nothing was changed.');
    } finally {
      setWorking(false);
    }
  };

  const isToday = date === todayString();

  // ── Result view ─────────────────────────────────────────────────────────────
  if (result) {
    const emailLine =
      result.emailsSent > 0
        ? `${result.emailsSent} email${result.emailsSent === 1 ? '' : 's'} sent`
        : result.emailsSkipped > 0 && !isEmailConfigured()
        ? 'Emails skipped — EmailJS is not configured'
        : `${result.emailsSkipped} email${result.emailsSkipped === 1 ? '' : 's'} skipped`;

    return (
      <Modal
        title="Shows Cancelled" open={open} onClose={onClose}
        footer={<Button onClick={onClose}>Done</Button>}
      >
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <div style={{ color: 'var(--success)', display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <CheckCircle2 size={40} />
          </div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {result.schedulesCancelled} show{result.schedulesCancelled === 1 ? '' : 's'} cancelled
          </div>
          <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            {formatDate(date)} · {roomName}
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
          {[
            { icon: <Ticket size={14} />,    label: 'Tickets cancelled',   value: result.bookingsCancelled },
            { icon: <Users size={14} />,     label: 'Moviegoers notified', value: result.usersNotified },
            { icon: <MailCheck size={14} />, label: 'Email',               value: emailLine },
          ].map((row, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', background: 'var(--surface-raised)',
              borderRadius: 'var(--radius)', fontSize: '0.82rem',
            }}>
              <span style={{ color: 'var(--gold)', display: 'inline-flex' }}>{row.icon}</span>
              <span style={{ flex: 1, color: 'var(--text-muted)' }}>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>

        {result.emailsFailed > 0 && (
          <div className="auth-error" style={{ marginTop: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} />
              {result.emailsFailed} email{result.emailsFailed === 1 ? '' : 's'} could not be delivered.
              Those moviegoers still got an in-app notification.
            </span>
          </div>
        )}
      </Modal>
    );
  }

  // ── Confirmation view ───────────────────────────────────────────────────────
  const nothingToCancel = !loading && preview !== null && preview.schedules.length === 0;

  return (
    <Modal
      title={`Cancel Shows — ${roomName}`} open={open} onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={working}>Keep Shows</Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={working || loading || nothingToCancel}
            icon={working ? <Hourglass size={14} /> : <XCircle size={14} />}
          >
            {working ? 'Cancelling…' : 'Cancel & Notify'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="auth-error" style={{ marginBottom: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> {error}
          </span>
        </div>
      )}

      <div className="input-group">
        <label className="input-label">Date</label>
        <input
          className="input-field" type="date" value={date}
          onChange={e => { setDate(e.target.value); setError(''); }}
          disabled={working}
        />
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
          {isToday ? 'Cancelling today — shows that have already finished are left alone.' : formatDate(date)}
        </div>
      </div>

      {/* Affected shows */}
      <div className="input-group">
        <label className="input-label">Shows to be cancelled</label>
        {loading ? (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Hourglass size={13} /> Checking that day…
          </div>
        ) : nothingToCancel ? (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '8px 0' }}>
            No shows left to cancel on this date
            {preview && preview.untouched > 0 && ` (${preview.untouched} already finished or cancelled)`}.
          </div>
        ) : (
          <div style={{
            maxHeight: 150, overflowY: 'auto',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          }}>
            {preview?.schedules.map((s) => {
              const movie = movies.find(m => m.id === s.movieId);
              return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', fontSize: '0.8rem',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 600, minWidth: 42 }}>{s.startTime}</span>
                  <IconGlyph iconKey={movie?.emoji} size={14} />
                  <span style={{ flex: 1 }}>{movie?.title ?? 'Unknown movie'}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>ends {s.endTime}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Impact summary */}
      {preview && preview.schedules.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap',
        }}>
          {[
            { label: 'tickets',  value: String(preview.bookings.length) },
            { label: 'people',   value: String(preview.affectedUsers) },
            { label: 'to refund', value: `RM ${preview.refundTotal.toFixed(2)}` },
          ].map((chip, i) => (
            <div key={i} style={{
              flex: 1, minWidth: 90, padding: '8px 10px',
              background: 'var(--surface-raised)', borderRadius: 'var(--radius)',
              textAlign: 'center',
            }}>
              <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{chip.value}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{chip.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Reason */}
      <div className="input-group">
        <label className="input-label">Reason *</label>
        <textarea
          className="input-field" rows={2}
          placeholder="Shown to every affected moviegoer."
          value={reason}
          onChange={e => { setReason(e.target.value); setError(''); }}
          disabled={working}
          style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
        />
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
          {QUICK_REASONS.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => { setReason(r); setError(''); }}
              style={{
                padding: '3px 9px', borderRadius: 99, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-muted)', fontSize: '0.68rem',
                fontFamily: 'var(--font-body)',
              }}
            >
              {r.split(' ').slice(0, 3).join(' ')}…
            </button>
          ))}
        </div>
      </div>

      <div style={{
        padding: '9px 12px', background: 'var(--gold-dim)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        fontSize: '0.76rem', color: 'var(--text-muted)',
      }}>
        <AlertTriangle size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
        This cancels the shows <strong>and</strong> every ticket booked for them, then notifies
        each moviegoer in-app{isEmailConfigured() ? ' and by email' : ''}. It can't be undone.
        {!isEmailConfigured() && (
          <> Email is not configured, so only in-app notifications will be sent.</>
        )}
      </div>
    </Modal>
  );
};

export default CancelDayModal;
