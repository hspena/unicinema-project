import React, { useState, useEffect } from 'react';
import { Badge, Button, Modal } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { Booking, subscribeToUserBookings, cancelBooking } from '../../services/bookingService';
import { Movie, subscribeToMovies, Genre, subscribeToGenres } from '../../services/movieService';
import {
  Review, createReview, updateReview, deleteReview,
  getUserReviewForMovie, subscribeToMovieReviews,
} from '../../services/reviewService';
import { getUserById } from '../../services/userService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Stars = ({ rating, interactive = false, onRate, size = 'md' }: {
  rating:       number;
  interactive?: boolean;
  onRate?:      (r: number) => void;
  size?:        'sm' | 'md' | 'lg';
}) => {
  const [hover, setHover] = useState(0);
  const fs = size === 'sm' ? '0.85rem' : size === 'lg' ? '1.5rem' : '1.1rem';
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => {
        const val  = i + 1;
        const fill = (hover || rating) >= val;
        return (
          <span key={i}
            style={{ fontSize: fs, color: fill ? 'var(--gold)' : 'var(--border)', cursor: interactive ? 'pointer' : 'default', transition: 'color 0.1s' }}
            onMouseEnter={() => interactive && setHover(val)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => interactive && onRate?.(val)}
          >★</span>
        );
      })}
    </span>
  );
};

const statusBadge = (status: Booking['status']) => {
  const map = {
    'confirmed':  { variant: 'info'    as const, label: '⏳ Confirmed'   },
    'checked-in': { variant: 'success' as const, label: '✅ Attended'    },
    'cancelled':  { variant: 'danger'  as const, label: '❌ Cancelled'   },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
};

// ─── Review Modal ─────────────────────────────────────────────────────────────

const ReviewModal = ({
  open, onClose, movie, booking, userId, userProfile,
}: {
  open:        boolean;
  onClose:     () => void;
  movie:       Movie | null;
  booking:     Booking | null;
  userId:      string;
  userProfile: { displayName: string; username: string } | null;
}) => {
  const [existing,  setExisting]  = useState<Review | null>(null);
  const [rating,    setRating]    = useState(0);
  const [comment,   setComment]   = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  useEffect(() => {
    if (!open || !movie || !userId) return;
    setSuccess(false); setError('');
    getUserReviewForMovie(userId, movie.id).then(r => {
      if (r) { setExisting(r); setRating(r.rating); setComment(r.comment); }
      else   { setExisting(null); setRating(0); setComment(''); }
    });
  }, [open, movie?.id]);

  const handleSave = async () => {
    if (rating === 0) { setError('Please select a rating.'); return; }
    if (!movie || !userProfile) return;
    setSaving(true); setError('');
    try {
      if (existing) {
        await updateReview(existing.id, rating, comment);
      } else {
        await createReview({
          movieId:     movie.id,
          userId,
          displayName: userProfile.displayName,
          username:    userProfile.username,
          rating,
          comment,
          bookingId:   booking?.id ?? '',
        });
      }
      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existing || !window.confirm('Delete your review?')) return;
    await deleteReview(existing.id);
    onClose();
  };

  return (
    <Modal
      title={existing ? `Edit Review — ${movie?.title}` : `Review — ${movie?.title}`}
      open={open}
      onClose={onClose}
      footer={
        success ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <>
            {existing && <Button variant="danger" onClick={handleDelete}>Delete Review</Button>}
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Saving…' : existing ? '💾 Update' : '📝 Submit'}
            </Button>
          </>
        )
      }
    >
      {success ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⭐</div>
          <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>
            {existing ? 'Review Updated!' : 'Review Submitted!'}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Thank you for your feedback.
          </div>
        </div>
      ) : (
        <div>
          {/* Movie info */}
          {movie && (
            <div style={{
              display: 'flex', gap: 12, padding: '10px 12px',
              background: 'var(--navy)', borderRadius: 'var(--radius)',
              border: '1px solid var(--border)', marginBottom: 18,
            }}>
              <span style={{ fontSize: '2rem' }}>{movie.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{movie.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {movie.year} · {movie.duration} min
                </div>
              </div>
            </div>
          )}

          {/* Rating */}
          <div style={{ marginBottom: 16 }}>
            <label className="input-label">Your Rating *</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <Stars rating={rating} size="lg" interactive onRate={setRating} />
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
              placeholder="Share what you thought about this movie…"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>

          {error && (
            <div className="auth-error">⚠️ {error}</div>
          )}

          {/* Display name note */}
          {userProfile && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Posting as <strong style={{ color: 'var(--gold)' }}>{userProfile.displayName}</strong>
              {userProfile.displayName.toLowerCase() !== userProfile.username.toLowerCase() && (
                <> (@{userProfile.username})</>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const MyTickets = () => {
  const { uid } = useAuth();

  const [bookings,     setBookings]     = useState<Booking[]>([]);
  const [movies,       setMovies]       = useState<Movie[]>([]);
  const [genres,       setGenres]       = useState<Genre[]>([]);
  const [userProfile,  setUserProfile]  = useState<{ displayName: string; username: string } | null>(null);
  const [filter,       setFilter]       = useState<'all' | 'upcoming' | 'attended' | 'cancelled'>('all');
  const [reviewMovie,  setReviewMovie]  = useState<Movie | null>(null);
  const [reviewBooking,setReviewBooking]= useState<Booking | null>(null);
  const [showReview,   setShowReview]   = useState(false);
  const [myReviews,    setMyReviews]    = useState<Record<string, Review>>({});

  useEffect(() => {
    const u1 = subscribeToMovies(setMovies);
    const u2 = subscribeToGenres(setGenres);
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    if (!uid) return;
    const u = subscribeToUserBookings(uid, setBookings);
    getUserById(uid).then(user => {
      if (user) setUserProfile({
        displayName: (user as any).displayName || user.name,
        username:    (user as any).username    || user.name,
      });
    });
    return u;
  }, [uid]);

  // Load user's reviews for attended movies
  useEffect(() => {
    const attendedMovieIds = Array.from(new Set(
      bookings.filter(b => b.status === 'checked-in').map(b => b.movieId)
    ));
    attendedMovieIds.forEach(movieId => {
      if (!uid) return;
      getUserReviewForMovie(uid, movieId).then(r => {
        if (r) setMyReviews(prev => ({ ...prev, [movieId]: r }));
      });
    });
  }, [bookings.length, uid]);

  const filtered = bookings.filter(b => {
    if (filter === 'upcoming') return b.status === 'confirmed';
    if (filter === 'attended') return b.status === 'checked-in';
    if (filter === 'cancelled')return b.status === 'cancelled';
    return true;
  });

  const handleOpenReview = (booking: Booking) => {
    const movie = movies.find(m => m.id === booking.movieId);
    if (!movie) return;
    setReviewMovie(movie);
    setReviewBooking(booking);
    setShowReview(true);
  };

  const handleCancel = async (b: Booking) => {
    if (!window.confirm(`Cancel booking ${b.ticketCode}?`)) return;
    await cancelBooking(b.id);
  };

  // Stats
  const upcoming  = bookings.filter(b => b.status === 'confirmed').length;
  const attended  = bookings.filter(b => b.status === 'checked-in').length;
  const cancelled = bookings.filter(b => b.status === 'cancelled').length;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>My Tickets</h2>
        <p>All your upcoming and past bookings.</p>
      </div>

      {/* Stats row */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { icon: '🎟️', value: bookings.length, label: 'Total'     },
          { icon: '⏳', value: upcoming,         label: 'Upcoming'  },
          { icon: '✅', value: attended,         label: 'Attended'  },
          { icon: '❌', value: cancelled,        label: 'Cancelled' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="rm-tabs" style={{ marginBottom: 20 }}>
        {([
          { key: 'all',       label: `All (${bookings.length})`  },
          { key: 'upcoming',  label: `Upcoming (${upcoming})`    },
          { key: 'attended',  label: `Attended (${attended})`    },
          { key: 'cancelled', label: `Cancelled (${cancelled})`  },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            className={`rm-tab ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎟️</div>
          <div className="empty-state-text">
            {bookings.length === 0 ? 'No bookings yet. Browse movies to get started!' : 'No tickets in this category.'}
          </div>
        </div>
      ) : (
        filtered.map(b => {
          const movie   = movies.find(m => m.id === b.movieId);
          const genre   = genres.find(g => g.id === movie?.genreId);
          const hasReview = !!myReviews[b.movieId];
          const canReview = b.status === 'checked-in';

          return (
            <div key={b.id} className="ticket-card" style={{ marginBottom: 14 }}>
              {/* Top section */}
              <div className="ticket-card-top">
                <div style={{
                  width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                  background: movie?.color || genre?.color || '#1a1628',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.6rem',
                }}>
                  {movie?.emoji || genre?.emoji || '🎬'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{b.movieTitle}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gold)', fontFamily: 'monospace', marginTop: 2 }}>
                    {b.ticketCode}
                  </div>
                  {b.isFree && (
                    <Badge variant="gold" style={{ marginTop: 4, fontSize: '0.65rem' }}>Free Entry</Badge>
                  )}
                </div>
                {statusBadge(b.status)}
              </div>

              {/* Divider */}
              <div className="ticket-card-divider" />

              {/* Bottom info */}
              <div className="ticket-card-bottom">
                <div>
                  <div className="ticket-info-label">Date</div>
                  <div className="ticket-info-value">{b.showDate}</div>
                </div>
                <div>
                  <div className="ticket-info-label">Time</div>
                  <div className="ticket-info-value">{b.showTime}</div>
                </div>
                <div>
                  <div className="ticket-info-label">Seats</div>
                  <div className="ticket-info-value">{b.seats.length} seat(s)</div>
                </div>
                <div>
                  <div className="ticket-info-label">Total</div>
                  <div className="ticket-info-value" style={{ color: 'var(--gold)' }}>
                    {b.isFree ? 'FREE' : `RM ${b.totalPrice.toFixed(2)}`}
                  </div>
                </div>
              </div>

              {/* Actions */}
              {(canReview || b.status === 'confirmed') && (
                <div style={{
                  borderTop: '1px solid var(--border)',
                  padding: '10px 0 0',
                  display: 'flex', gap: 8, justifyContent: 'flex-end',
                }}>
                  {canReview && (
                    <Button
                      size="sm"
                      variant={hasReview ? 'outline' : 'primary'}
                      onClick={() => handleOpenReview(b)}
                    >
                      {hasReview ? '✏️ Edit Review' : '⭐ Leave Review'}
                    </Button>
                  )}
                  {b.status === 'confirmed' && (
                    <Button size="sm" variant="danger" onClick={() => handleCancel(b)}>
                      Cancel Booking
                    </Button>
                  )}
                </div>
              )}

              {/* Review preview if exists */}
              {hasReview && myReviews[b.movieId] && (
                <div style={{
                  marginTop: 10, padding: '8px 12px',
                  background: 'var(--gold-dim)', borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <Stars rating={myReviews[b.movieId].rating} size="sm" />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Your review</span>
                  </div>
                  {myReviews[b.movieId].comment && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      "{myReviews[b.movieId].comment}"
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Review modal */}
      <ReviewModal
        open={showReview}
        onClose={() => setShowReview(false)}
        movie={reviewMovie}
        booking={reviewBooking}
        userId={uid ?? ''}
        userProfile={userProfile}
      />
    </div>
  );
};

export default MyTickets;