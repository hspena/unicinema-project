import React, { useState, useEffect } from 'react';
import { Button, Modal } from './ui';
import { Movie } from '../services/movieService';
import {
  Review, createReview, updateReview, deleteReview, getReviewForBooking,
} from '../services/reviewService';
import {
  IconGlyph, Hourglass, Save, Send, Star, AlertTriangle,
} from '../utils/icons';

// Minimal booking shape needed to attach a review.
export interface ReviewableBooking {
  id:         string;
  movieId:    string;
  movieTitle: string;
  userName:   string;
  userId:     string;
}

// ─── Interactive stars ──────────────────────────────────────────────────────────
const Stars = ({ rating, onRate }: { rating: number; onRate: (r: number) => void }) => {
  const [hover, setHover] = useState(0);
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => {
        const val  = i + 1;
        const fill = (hover || rating) >= val;
        return (
          <span key={i}
            style={{ fontSize: '1.5rem', color: fill ? 'var(--gold)' : 'var(--border)', cursor: 'pointer', transition: 'color 0.1s' }}
            onMouseEnter={() => setHover(val)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onRate(val)}
          >★</span>
        );
      })}
    </span>
  );
};

// ─── Guest / walk-in review modal ───────────────────────────────────────────────
// Staff or managers collect a review on behalf of a walk-in guest. Reviews are
// keyed by booking (not user) since every walk-in guest shares userId 'GUEST'.

interface GuestReviewModalProps {
  open:    boolean;
  onClose: () => void;
  booking: ReviewableBooking | null;
  movie?:  Movie | null;
}

const GuestReviewModal = ({ open, onClose, booking, movie }: GuestReviewModalProps) => {
  const [existing, setExisting] = useState<Review | null>(null);
  const [rating,   setRating]   = useState(0);
  const [comment,  setComment]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  useEffect(() => {
    if (!open || !booking) return;
    setSuccess(false); setError(''); setRating(0); setComment(''); setExisting(null);
    getReviewForBooking(booking.id).then(r => {
      if (r) { setExisting(r); setRating(r.rating); setComment(r.comment); }
    });
  }, [open, booking?.id]);

  const isGuest = !booking?.userId || booking.userId === 'GUEST';

  const handleSave = async () => {
    if (rating === 0) { setError('Please select a rating.'); return; }
    if (!booking)     return;
    setSaving(true); setError('');
    try {
      if (existing) {
        await updateReview(existing.id, rating, comment);
      } else {
        await createReview({
          movieId:     booking.movieId,
          // Walk-in guests share the literal 'GUEST' id, so make each distinct by
          // booking to keep reviewer counts and de-duplication accurate.
          userId:      isGuest ? `guest:${booking.id}` : booking.userId,
          displayName: booking.userName || 'Walk-in Guest',
          username:    isGuest ? 'guest' : booking.userName,
          rating,
          comment,
          bookingId:   booking.id,
        });
      }
      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? 'Failed to save review.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existing || !window.confirm('Delete this review?')) return;
    await deleteReview(existing.id);
    onClose();
  };

  const title = booking ? `${existing ? 'Edit' : 'Guest'} Review — ${booking.movieTitle}` : 'Guest Review';

  return (
    <Modal
      title={title}
      open={open}
      onClose={onClose}
      footer={
        success ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <>
            {existing && <Button variant="danger" onClick={handleDelete}>Delete</Button>}
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}
              icon={saving ? <Hourglass size={13} /> : existing ? <Save size={13} /> : <Send size={13} />}>
              {saving ? 'Saving…' : existing ? 'Update' : 'Submit'}
            </Button>
          </>
        )
      }
    >
      {success ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ marginBottom: 12, color: 'var(--gold)' }}><Star size={36} /></div>
          <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>
            {existing ? 'Review Updated!' : 'Review Submitted!'}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Thanks for collecting {booking?.userName || 'the guest'}'s feedback.
          </div>
        </div>
      ) : (
        <div>
          {/* Booking / movie info */}
          {booking && (
            <div style={{
              display: 'flex', gap: 12, padding: '10px 12px',
              background: 'var(--navy)', borderRadius: 'var(--radius)',
              border: '1px solid var(--border)', marginBottom: 18,
            }}>
              <IconGlyph iconKey={movie?.emoji} size={32} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{booking.movieTitle}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Collecting review for <strong style={{ color: 'var(--gold)' }}>{booking.userName || 'Walk-in Guest'}</strong>
                  {isGuest && ' · Guest'}
                </div>
              </div>
            </div>
          )}

          {/* Rating */}
          <div style={{ marginBottom: 16 }}>
            <label className="input-label">Guest Rating *</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <Stars rating={rating} onRate={setRating} />
              {rating > 0 && (
                <span style={{ fontSize: '0.82rem', color: 'var(--gold)' }}>
                  {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div className="input-group">
            <label className="input-label">Comment (optional)</label>
            <textarea
              className="textarea-field"
              rows={4}
              placeholder="What did the guest think about this movie?"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>

          {error && (
            <div className="auth-error" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default GuestReviewModal;
