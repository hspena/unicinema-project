import React, { useState, useEffect } from 'react';
import { Badge, Button, Modal, QrCodeView } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { Booking, subscribeToUserBookings, cancelBooking } from '../../services/bookingService';
import { Movie, subscribeToMovies, Genre, subscribeToGenres } from '../../services/movieService';
import { Room, RoomTemplate, subscribeToRooms, subscribeToTemplates } from '../../services/templateService';
import {
  Review, createReview, updateReview, deleteReview,
  getUserReviewForMovie, subscribeToMovieReviews,
} from '../../services/reviewService';
import { getUserById } from '../../services/userService';
import { createNotification } from '../../services/notificationService';
import {
  IconGlyph, Hourglass, CheckCircle2, XCircle, Save, Send, Star,
  AlertTriangle, Ticket, Pencil, QrCode,
} from '../../utils/icons';

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
    'confirmed':  { variant: 'info'    as const, label: 'Confirmed', icon: <Hourglass size={12} /> },
    'checked-in': { variant: 'success' as const, label: 'Attended',  icon: <CheckCircle2 size={12} /> },
    'cancelled':  { variant: 'danger'  as const, label: 'Cancelled', icon: <XCircle size={12} /> },
  };
  const { variant, label, icon } = map[status];
  return <Badge variant={variant} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{icon} {label}</Badge>;
};

// Turn a raw seat id ("r0c0-5") into a friendly label ("Premium A3").
// Falls back to the raw id if the room's layout can't be resolved.
const seatLabel = (seatId: string, template: RoomTemplate | null | undefined): string => {
  const parts   = seatId.split('-');
  const idx     = parseInt(parts[parts.length - 1], 10);
  const secKey  = parts.slice(0, -1).join('-');
  const sec     = template?.sections[secKey];
  if (!sec || isNaN(idx)) return seatId;
  const rowLetter = String.fromCharCode(65 + Math.floor(idx / sec.seatCols));
  const colNum    = (idx % sec.seatCols) + 1;
  return `${sec.name} ${rowLetter}${colNum}`;
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
              <IconGlyph iconKey={movie.emoji} size={32} />
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
            <div className="auth-error" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} /> {error}
            </div>
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
  const [rooms,        setRooms]        = useState<Room[]>([]);
  const [templates,    setTemplates]    = useState<RoomTemplate[]>([]);
  const [userProfile,  setUserProfile]  = useState<{ displayName: string; username: string } | null>(null);
  const [filter,       setFilter]       = useState<'all' | 'upcoming' | 'attended' | 'cancelled'>('all');
  const [reviewMovie,  setReviewMovie]  = useState<Movie | null>(null);
  const [reviewBooking,setReviewBooking]= useState<Booking | null>(null);
  const [showReview,   setShowReview]   = useState(false);
  const [myReviews,    setMyReviews]    = useState<Record<string, Review>>({});
  const [qrBooking,    setQrBooking]    = useState<Booking | null>(null);

  useEffect(() => {
    const u1 = subscribeToMovies(setMovies);
    const u2 = subscribeToGenres(setGenres);
    const u3 = subscribeToRooms(setRooms);
    const u4 = subscribeToTemplates(setTemplates);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const templateForRoom = (roomId: string): RoomTemplate | null => {
    const room = rooms.find(r => r.id === roomId);
    return templates.find(t => t.id === room?.templateId) ?? null;
  };

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
    createNotification(b.userId, {
      type:    'cancel',
      title:   'Booking cancelled',
      message: `${b.movieTitle} · ${b.ticketCode} has been cancelled`,
    });
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
          { icon: <Ticket size={20} />,      value: bookings.length, label: 'Total'     },
          { icon: <Hourglass size={20} />,    value: upcoming,        label: 'Upcoming'  },
          { icon: <CheckCircle2 size={20} />, value: attended,        label: 'Attended'  },
          { icon: <XCircle size={20} />,      value: cancelled,       label: 'Cancelled' },
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
          <div className="empty-state-icon"><Ticket size={32} /></div>
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
          const template  = templateForRoom(b.roomId);
          const seatLabels = b.seats.map(s => seatLabel(s, template));

          return (
            <div key={b.id} className="ticket-card" style={{ marginBottom: 14 }}>
              {/* Top section */}
              <div className="ticket-card-top">
                <div style={{
                  width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                  background: movie?.color || genre?.color || '#1a1628',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconGlyph iconKey={movie?.emoji || genre?.emoji} size={24} />
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

              {/* Seat numbers */}
              {seatLabels.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 12 }}>
                  <span className="ticket-info-label" style={{ marginRight: 2 }}>Seat numbers</span>
                  {seatLabels.map((lbl, i) => (
                    <span key={i} style={{
                      fontSize: '0.72rem', fontWeight: 600, fontFamily: 'monospace',
                      padding: '2px 9px', borderRadius: 99,
                      background: 'var(--gold-dim)', color: 'var(--gold)',
                      border: '1px solid var(--border)',
                    }}>
                      {lbl}
                    </span>
                  ))}
                </div>
              )}

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
                      icon={hasReview ? <Pencil size={13} /> : <Star size={13} />}
                      onClick={() => handleOpenReview(b)}
                    >
                      {hasReview ? 'Edit Review' : 'Leave Review'}
                    </Button>
                  )}
                  {b.status === 'confirmed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<QrCode size={13} />}
                      onClick={() => setQrBooking(b)}
                    >
                      Show QR
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

      {/* QR check-in modal */}
      <Modal
        title="Check-In QR Code"
        open={!!qrBooking}
        onClose={() => setQrBooking(null)}
        footer={<Button variant="outline" onClick={() => setQrBooking(null)}>Close</Button>}
      >
        {qrBooking && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 2 }}>
              {qrBooking.movieTitle}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              {qrBooking.showDate} · {qrBooking.showTime} · {qrBooking.seats.length} seat(s)
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gold)', fontWeight: 600, marginBottom: 16 }}>
              {qrBooking.seats.map(s => seatLabel(s, templateForRoom(qrBooking.roomId))).join(' · ')}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <QrCodeView value={qrBooking.ticketCode} size={200} />
            </div>

            <div style={{
              fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 700,
              color: 'var(--gold)', letterSpacing: '0.08em', marginBottom: 6,
            }}>
              {qrBooking.ticketCode}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Show this code at the entrance. Staff will scan it to check you in.
            </div>
          </div>
        )}
      </Modal>

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