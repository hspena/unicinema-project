import React, { useState, useEffect } from 'react';
import { Badge, Button, Modal } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import SeatMap from '../../components/ui/SeatMap';
import { Movie, Genre, subscribeToMovies, subscribeToGenres } from '../../services/movieService';
import { Room, RoomTemplate, subscribeToRooms, subscribeToTemplates } from '../../services/templateService';
import { Schedule as ScheduleItem, subscribeToAllSchedules, autoStatus, formatDate } from '../../services/scheduleService';
import { createBooking, getBookedSeats } from '../../services/bookingService';
import {
  Review, subscribeToMovieReviews, createReview, updateReview as updateReviewFn,
  getUserReviewForMovie, getMovieAverageRating,
} from '../../services/reviewService';
import { getUserById } from '../../services/userService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Stars = ({ rating, max = 5, size = 'md', interactive = false, onRate }: {
  rating: number; max?: number; size?: 'sm' | 'md' | 'lg';
  interactive?: boolean; onRate?: (r: number) => void;
}) => {
  const [hover, setHover] = useState(0);
  const fs = size === 'sm' ? '0.82rem' : size === 'lg' ? '1.4rem' : '1rem';
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {Array.from({ length: max }, (_, i) => {
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

const ReviewCard = ({ review }: { review: Review }) => {
  const same = review.displayName.toLowerCase() === review.username.toLowerCase();
  return (
    <div style={{ padding: '12px 14px', background: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
          {review.displayName[0]}
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{review.displayName}</div>
          {!same && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>@{review.username}</div>}
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <Stars rating={review.rating} size="sm" />
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {new Date(review.createdAt).toLocaleDateString('en-MY')}
            {review.updatedAt && ' (edited)'}
          </div>
        </div>
      </div>
      {review.comment && (
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          "{review.comment}"
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Browse = () => {
  const { uid } = useAuth();

  const [movies,    setMovies]    = useState<Movie[]>([]);
  const [genres,    setGenres]    = useState<Genre[]>([]);
  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [templates, setTemplates] = useState<RoomTemplate[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  const [search,      setSearch]      = useState('');
  const [genreFilter, setGenreFilter] = useState('All');

  // Movie detail modal
  const [detailMovie,    setDetailMovie]    = useState<Movie | null>(null);
  const [detailReviews,  setDetailReviews]  = useState<Review[]>([]);
  const [movieSchedules, setMovieSchedules] = useState<ScheduleItem[]>([]);

  // Booking flow state
  const [bookingSchedule,  setBookingSchedule]  = useState<ScheduleItem | null>(null);
  const [bookedSeats,      setBookedSeats]       = useState<string[]>([]);
  const [chosenSeats,      setChosenSeats]       = useState<string[]>([]);
  const [seatsLoading,     setSeatsLoading]      = useState(false);
  const [showSeatModal,    setShowSeatModal]      = useState(false);
  const [showConfirmModal, setShowConfirmModal]   = useState(false);
  const [isBooking,        setIsBooking]          = useState(false);
  const [bookingDone,      setBookingDone]        = useState<{ ticketCode: string; isFree: boolean } | null>(null);

  // Review state
  const [myReview,      setMyReview]      = useState<Review | null>(null);
  const [reviewRating,  setReviewRating]  = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSaving,  setReviewSaving]  = useState(false);
  const [reviewError,   setReviewError]   = useState('');

  const [userProfile, setUserProfile] = useState<{ displayName: string; username: string } | null>(null);

  useEffect(() => {
    const u1 = subscribeToMovies(setMovies);
    const u2 = subscribeToGenres(setGenres);
    const u3 = subscribeToRooms(r => setRooms(r.filter(rm => rm.status === 'active')));
    const u4 = subscribeToTemplates(setTemplates);
    const u5 = subscribeToAllSchedules(setSchedules);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  useEffect(() => {
    if (!uid) return;
    getUserById(uid).then(u => {
      if (u) setUserProfile({
        displayName: (u as any).displayName || u.name,
        username:    (u as any).username    || u.name,
      });
    });
  }, [uid]);

  // ── Open movie detail ──────────────────────────────────────────────────────
  const openDetail = async (movie: Movie) => {
    setDetailMovie(movie);
    setBookingDone(null);
    setReviewRating(0);
    setReviewComment('');
    setReviewError('');
    setMyReview(null);

    const ms = schedules.filter(s =>
      s.movieId === movie.id &&
      ['upcoming', 'running'].includes(autoStatus(s.date, s.startTime, s.endTime))
    ).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
    setMovieSchedules(ms);

    if (uid) {
      const existing = await getUserReviewForMovie(uid, movie.id);
      if (existing) { setMyReview(existing); setReviewRating(existing.rating); setReviewComment(existing.comment); }
    }
  };

  // Subscribe to reviews when detail modal opens
  useEffect(() => {
    if (!detailMovie) return;
    return subscribeToMovieReviews(detailMovie.id, reviews => {
      setDetailReviews(reviews);
      const mine = reviews.find(r => r.userId === uid);
      if (mine && !myReview) { setMyReview(mine); setReviewRating(mine.rating); setReviewComment(mine.comment); }
    });
  }, [detailMovie?.id]);

  // ── "Book Ticket" button per show ─────────────────────────────────────────
  const handleOpenBooking = async (s: ScheduleItem) => {
    setBookingSchedule(s);
    setChosenSeats([]);
    setBookingDone(null);
    setSeatsLoading(true);
    setShowSeatModal(true);
    try {
      const seats = await getBookedSeats(s.id);
      setBookedSeats(seats);
    } finally {
      setSeatsLoading(false);
    }
  };

  // ── Confirm booking ────────────────────────────────────────────────────────
  const handleBook = async () => {
    if (!uid || !bookingSchedule || !detailMovie || !userProfile) return;
    setIsBooking(true);
    try {
      const isFree = bookingSchedule.freeTickets ?? false;
      const booking = await createBooking({
        scheduleId: bookingSchedule.id,
        roomId:     bookingSchedule.roomId,
        movieId:    detailMovie.id,
        movieTitle: detailMovie.title,
        showDate:   bookingSchedule.date,
        showTime:   bookingSchedule.startTime,
        userId:     uid,
        userName:   userProfile.displayName,
        userEmail:  '',
        seats:      chosenSeats,
        totalPrice: isFree ? 0 : chosenSeats.length * 10,
        isFree,
        status:     'confirmed',
      });
      setBookingDone({ ticketCode: booking.ticketCode, isFree });
      setShowConfirmModal(false);
      setShowSeatModal(false);
    } finally {
      setIsBooking(false);
    }
  };

  // ── Submit review ──────────────────────────────────────────────────────────
  const handleSubmitReview = async () => {
    if (!uid || !detailMovie || !userProfile) return;
    if (reviewRating === 0) { setReviewError('Please select a star rating.'); return; }
    setReviewSaving(true);
    setReviewError('');
    try {
      if (myReview) {
        await updateReviewFn(myReview.id, reviewRating, reviewComment);
      } else {
        const r = await createReview({
          movieId: detailMovie.id, userId: uid,
          displayName: userProfile.displayName, username: userProfile.username,
          rating: reviewRating, comment: reviewComment, bookingId: '',
        });
        setMyReview(r);
      }
    } catch (e: any) {
      setReviewError(e.message ?? 'Failed to save review.');
    } finally {
      setReviewSaving(false);
    }
  };

  const template = bookingSchedule
    ? templates.find(t => t.id === rooms.find(r => r.id === bookingSchedule.roomId)?.templateId) ?? null
    : null;

  const avgRating    = getMovieAverageRating(detailReviews);
  const otherReviews = detailReviews.filter(r => r.userId !== uid);

  const filtered = movies.filter(m => {
    const genre = genres.find(g => g.id === m.genreId);
    const q = search.toLowerCase();
    const matchSearch = m.title.toLowerCase().includes(q) || genre?.name.toLowerCase().includes(q);
    const matchGenre  = genreFilter === 'All' || m.genreId === genreFilter;
    return matchSearch && matchGenre;
  });

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Now Showing & Upcoming</h2>
        <p>Browse movies and book your seats.</p>
      </div>

      {/* Search */}
      <div className="table-toolbar" style={{ marginBottom: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 180 }}>
          <span className="search-icon">🔍</span>
          <input className="input-field" placeholder="Search movies…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Genre pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {[{ id: 'All', name: 'All', emoji: '🎬' }, ...genres].map(g => (
          <div key={g.id} onClick={() => setGenreFilter(g.id)} style={{
            padding: '4px 12px', borderRadius: 99, cursor: 'pointer',
            fontSize: '0.74rem', fontWeight: 500,
            background: genreFilter === g.id ? 'var(--gold)' : 'var(--surface)',
            color:      genreFilter === g.id ? 'var(--navy)' : 'var(--text-muted)',
            border: '1px solid var(--border)', transition: 'all var(--transition)',
          }}>
            {(g as any).emoji ?? '🎬'} {g.name}
          </div>
        ))}
      </div>

      {/* Movie grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎬</div>
          <div className="empty-state-text">No movies found.</div>
        </div>
      ) : (
        <div className="three-col">
          {filtered.map(m => {
            const genre   = genres.find(g => g.id === m.genreId);
            const hasShow = schedules.some(s =>
              s.movieId === m.id &&
              ['upcoming', 'running'].includes(autoStatus(s.date, s.startTime, s.endTime))
            );
            return (
              <div key={m.id} className="movie-card">
                <div className="movie-poster" style={{ background: m.color || genre?.color || '#1a1628', cursor: 'pointer' }}
                  onClick={() => openDetail(m)}>
                  <span style={{ fontSize: '3.5rem' }}>{m.emoji || genre?.emoji || '🎬'}</span>
                  <div className="movie-genre-tag"><Badge variant="muted">{genre?.name ?? '—'}</Badge></div>
                  {!hasShow && (
                    <div style={{ position: 'absolute', top: 10, left: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem' }}>
                      No upcoming shows
                    </div>
                  )}
                </div>
                <div className="movie-info">
                  <div className="movie-title">{m.title}</div>
                  <div className="movie-meta">{m.year} · {m.duration} min</div>
                  <Stars rating={Math.round(m.rating / 2)} size="sm" />
                  {m.synopsis && (
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {m.synopsis}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <Button variant="outline" size="sm" style={{ flex: 1 }} onClick={() => openDetail(m)}>
                      Details & Reviews
                    </Button>
                    {hasShow && (
                      <Button size="sm" style={{ flex: 1 }} onClick={() => openDetail(m)}>
                        🎟️ Book Ticket
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ Movie Detail Modal ══ */}
      <Modal
        title={detailMovie?.title ?? ''}
        open={!!detailMovie}
        onClose={() => setDetailMovie(null)}
        footer={<Button variant="outline" onClick={() => setDetailMovie(null)}>Close</Button>}
      >
        {detailMovie && (() => {
          const genre = genres.find(g => g.id === detailMovie.genreId);
          return (
            <div>
              {/* Booking done banner */}
              {bookingDone && (
                <div style={{ padding: '14px 16px', marginBottom: 16, background: 'rgba(76,175,130,0.12)', border: '1px solid rgba(76,175,130,0.35)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🎉</div>
                  <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>Booking Confirmed!</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em' }}>
                    {bookingDone.ticketCode}
                  </div>
                  {bookingDone.isFree && <Badge variant="gold" style={{ marginTop: 8 }}>🎟️ Free Entry</Badge>}
                </div>
              )}

              {/* Header */}
              <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 72, height: 72, borderRadius: 'var(--radius)', flexShrink: 0, background: detailMovie.color || genre?.color || '#1a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem' }}>
                  {detailMovie.emoji || genre?.emoji || '🎬'}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700 }}>{detailMovie.title}</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '3px 0' }}>
                    {detailMovie.year} · {detailMovie.duration} min · {genre?.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Stars rating={Math.round(detailMovie.rating / 2)} size="sm" />
                    {detailReviews.length > 0 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {avgRating.toFixed(1)} · {detailReviews.length} review{detailReviews.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {detailMovie.synopsis && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                  {detailMovie.synopsis}
                </div>
              )}

              {/* ── Available Shows ── */}
              {movieSchedules.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Available Shows
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {movieSchedules.map(s => {
                      const room   = rooms.find(r => r.id === s.roomId);
                      const status = autoStatus(s.date, s.startTime, s.endTime);
                      return (
                        <div key={s.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', borderRadius: 'var(--radius)',
                          border: '1px solid var(--border)', background: 'var(--navy)',
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.83rem', fontWeight: 500 }}>
                              {formatDate(s.date)} · {s.startTime}–{s.endTime}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {room?.name ?? '—'}
                              {s.freeTickets && (
                                <span style={{ marginLeft: 8, padding: '0 6px', background: 'var(--gold)', color: 'var(--navy)', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700 }}>
                                  FREE
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant={status === 'running' ? 'success' : 'info'}>
                            {status === 'running' ? '🔴 Now' : '⏳ Upcoming'}
                          </Badge>
                          {/* ← Book Ticket button per show */}
                          <Button size="sm" onClick={() => handleOpenBooking(s)}>
                            🎟️ Book
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {movieSchedules.length === 0 && (
                <div style={{ padding: '12px 16px', marginBottom: 16, background: 'var(--surface-raised)', borderRadius: 'var(--radius)', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No upcoming shows scheduled for this movie yet.
                </div>
              )}

              {/* ── Reviews ── */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Reviews {detailReviews.length > 0 && `(${detailReviews.length})`}
                </div>

                {uid && (
                  <div style={{ padding: '12px 14px', background: 'var(--surface)', border: `1px solid ${myReview ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 'var(--radius)', marginBottom: 14 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                      {myReview ? '✏️ Edit Your Review' : '✍️ Write a Review'}
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Stars rating={reviewRating} size="lg" interactive onRate={setReviewRating} />
                      {reviewRating > 0 && (
                        <span style={{ marginLeft: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][reviewRating]}
                        </span>
                      )}
                    </div>
                    <textarea
                      className="textarea-field" rows={2}
                      placeholder="Share your thoughts… (optional)"
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      style={{ marginBottom: 8 }}
                    />
                    {reviewError && <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginBottom: 6 }}>⚠️ {reviewError}</div>}
                    <Button size="sm" onClick={handleSubmitReview} disabled={reviewSaving}>
                      {reviewSaving ? '⏳ Saving…' : myReview ? '💾 Update' : '📝 Submit Review'}
                    </Button>
                  </div>
                )}

                {detailReviews.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                    No reviews yet. Be the first!
                  </div>
                ) : (
                  <>
                    {myReview && <ReviewCard review={myReview} />}
                    {otherReviews.map(r => <ReviewCard key={r.id} review={r} />)}
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ══ Seat Picker Modal ══ */}
      <Modal
        title={bookingSchedule
          ? `Choose Seats — ${detailMovie?.title} @ ${bookingSchedule.startTime}`
          : 'Choose Seats'}
        open={showSeatModal}
        onClose={() => { setShowSeatModal(false); setChosenSeats([]); }}
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowSeatModal(false); setChosenSeats([]); }}>
              Cancel
            </Button>
            <Button
              disabled={chosenSeats.length === 0}
              onClick={() => setShowConfirmModal(true)}
            >
              Continue ({chosenSeats.length} seat{chosenSeats.length !== 1 ? 's' : ''}) →
            </Button>
          </>
        }
      >
        {bookingSchedule && (
          <>
            {/* Show info bar */}
            <div style={{ padding: '8px 12px', marginBottom: 14, background: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{formatDate(bookingSchedule.date)}</span>
              <span>{bookingSchedule.startTime} – {bookingSchedule.endTime}</span>
              <span>{rooms.find(r => r.id === bookingSchedule.roomId)?.name ?? '—'}</span>
            </div>

            {seatsLoading ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                Loading seat availability…
              </div>
            ) : template ? (
              <SeatMap
                template={template}
                bookedSeats={bookedSeats}
                onConfirm={seats => setChosenSeats(seats)}
              />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                No seat layout configured for this room yet.
              </div>
            )}
          </>
        )}
      </Modal>

      {/* ══ Confirm Booking Modal ══ */}
      <Modal
        title="Confirm Booking"
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Back</Button>
            <Button onClick={handleBook} disabled={isBooking}>
              {isBooking ? '⏳ Booking…' : '🎟️ Confirm Booking'}
            </Button>
          </>
        }
      >
        {bookingSchedule && detailMovie && (
          <div>
            <div style={{ padding: '14px 16px', background: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{detailMovie.title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {formatDate(bookingSchedule.date)} · {bookingSchedule.startTime}–{bookingSchedule.endTime}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {rooms.find(r => r.id === bookingSchedule.roomId)?.name}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Seats', value: `${chosenSeats.length} seat(s)` },
                { label: 'Price', value: bookingSchedule.freeTickets ? '🎟️ FREE' : `RM ${(chosenSeats.length * 10).toFixed(2)}` },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '10px 12px', background: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold)', marginTop: 3 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Selected seats: <span style={{ color: 'var(--gold)' }}>{chosenSeats.join(', ')}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Browse;