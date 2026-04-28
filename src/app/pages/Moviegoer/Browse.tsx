import React, { useState, useEffect } from 'react';
import { Badge, Button, Modal } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import SeatMap from '../../components/ui/SeatMap';
import {
  Movie, Genre,
  subscribeToMovies, subscribeToGenres,
} from '../../services/movieService';
import {
  Room, RoomTemplate,
  subscribeToRooms, subscribeToTemplates, templateSeatCount,
} from '../../services/templateService';
import {
  Schedule, subscribeToAllSchedules,
  autoStatus, formatDate,
} from '../../services/scheduleService';
import {
  createBooking, getBookedSeats,
} from '../../services/bookingService';
import {
  Review, subscribeToMovieReviews, createReview,
  getUserReviewForMovie, getMovieAverageRating,
} from '../../services/reviewService';
import { getUserById } from '../../services/userService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Stars = ({ rating, max = 5, size = 'md', interactive = false, onRate }: {
  rating:      number;
  max?:        number;
  size?:       'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRate?:     (r: number) => void;
}) => {
  const [hover, setHover] = useState(0);
  const fs = size === 'sm' ? '0.82rem' : size === 'lg' ? '1.4rem' : '1rem';
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {Array.from({ length: max }, (_, i) => {
        const val  = i + 1;
        const fill = interactive ? (hover || rating) >= val : rating >= val;
        return (
          <span
            key={i}
            style={{
              fontSize: fs, color: fill ? 'var(--gold)' : 'var(--border)',
              cursor: interactive ? 'pointer' : 'default',
              transition: 'color 0.1s',
            }}
            onMouseEnter={() => interactive && setHover(val)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => interactive && onRate?.(val)}
          >★</span>
        );
      })}
    </span>
  );
};

// ─── Review Card ──────────────────────────────────────────────────────────────

const ReviewCard = ({ review }: { review: Review }) => {
  const same = review.displayName.toLowerCase() === review.username.toLowerCase();
  return (
    <div style={{
      padding: '12px 14px', background: 'var(--navy)',
      border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
          {review.displayName[0]}
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{review.displayName}</div>
          {!same && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>@{review.username}</div>
          )}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <Stars rating={review.rating} size="sm" />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {new Date(review.createdAt).toLocaleDateString('en-MY')}
            {review.updatedAt && ' (edited)'}
          </span>
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
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [search,      setSearch]      = useState('');
  const [genreFilter, setGenreFilter] = useState('All');

  // Movie detail + booking flow
  const [detailMovie,    setDetailMovie]    = useState<Movie | null>(null);
  const [detailReviews,  setDetailReviews]  = useState<Review[]>([]);
  const [movieSchedules, setMovieSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [bookedSeats,    setBookedSeats]    = useState<string[]>([]);
  const [chosenSeats,    setChosenSeats]    = useState<string[]>([]);
  const [seatsLoading,   setSeatsLoading]   = useState(false);

  // Booking confirm
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [isBooking,    setIsBooking]    = useState(false);
  const [bookingDone,  setBookingDone]  = useState<{ ticketCode: string; isFree: boolean } | null>(null);

  // Review
  const [myReview,       setMyReview]       = useState<Review | null>(null);
  const [reviewRating,   setReviewRating]   = useState(0);
  const [reviewComment,  setReviewComment]  = useState('');
  const [reviewSaving,   setReviewSaving]   = useState(false);
  const [reviewError,    setReviewError]    = useState('');
  const [hasBookedMovie, setHasBookedMovie] = useState(false);

  // User profile
  const [userProfile, setUserProfile] = useState<{ displayName: string; username: string; name: string } | null>(null);

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
      if (u) setUserProfile({ displayName: (u as any).displayName || u.name, username: (u as any).username || u.name, name: u.name });
    });
  }, [uid]);

  // ── Open movie detail ──────────────────────────────────────────────────────
  const openDetail = async (movie: Movie) => {
    setDetailMovie(movie);
    setChosenSeats([]);
    setSelectedSchedule(null);
    setBookingDone(null);
    setReviewRating(0);
    setReviewComment('');
    setReviewError('');

    // Filter schedules for this movie that are upcoming or running
    const ms = schedules.filter(s =>
      s.movieId === movie.id &&
      ['upcoming', 'running'].includes(autoStatus(s.date, s.startTime, s.endTime))
    ).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
    setMovieSchedules(ms);

    // Check if user has previously booked this movie (for review eligibility)
    if (uid) {
      const existing = await getUserReviewForMovie(uid, movie.id);
      setMyReview(existing);
      if (existing) { setReviewRating(existing.rating); setReviewComment(existing.comment); }
    }
  };

  // Subscribe to reviews when detail opens
  useEffect(() => {
    if (!detailMovie) return;
    return subscribeToMovieReviews(detailMovie.id, reviews => {
      setDetailReviews(reviews);
      // Check if user has a confirmed/checked-in booking for this movie
      // We use the reviews' bookingIds to infer — but better: we check auth context bookings
      // For simplicity: if they have a review already they clearly booked
      const mine = reviews.find(r => r.userId === uid);
      if (mine) { setMyReview(mine); setReviewRating(mine.rating); setReviewComment(mine.comment); }
    });
  }, [detailMovie?.id]);

  // ── Select a schedule ──────────────────────────────────────────────────────
  const handleSelectSchedule = async (s: Schedule) => {
    setSelectedSchedule(s);
    setChosenSeats([]);
    setSeatsLoading(true);
    try {
      const seats = await getBookedSeats(s.id);
      setBookedSeats(seats);
    } finally {
      setSeatsLoading(false);
    }
  };

  // ── Book ───────────────────────────────────────────────────────────────────
  const handleBook = async () => {
    if (!uid || !selectedSchedule || !detailMovie || !userProfile) return;
    setIsBooking(true);
    try {
      const room     = rooms.find(r => r.id === selectedSchedule.roomId);
      const isFree   = selectedSchedule.freeTickets ?? false;

      const booking = await createBooking({
        scheduleId: selectedSchedule.id,
        roomId:     selectedSchedule.roomId,
        movieId:    detailMovie.id,
        movieTitle: detailMovie.title,
        showDate:   selectedSchedule.date,
        showTime:   selectedSchedule.startTime,
        userId:     uid,
        userName:   userProfile.displayName,
        userEmail:  '',
        seats:      chosenSeats,
        totalPrice: isFree ? 0 : chosenSeats.length * 10, // placeholder price
        isFree,
        status:     'confirmed',
      });

      setBookingDone({ ticketCode: booking.ticketCode, isFree });
      setHasBookedMovie(true);
      setShowConfirm(false);
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
        const { updateReview } = await import('../../services/reviewService');
        await updateReview(myReview.id, reviewRating, reviewComment);
      } else {
        const review = await createReview({
          movieId:     detailMovie.id,
          userId:      uid,
          displayName: userProfile.displayName,
          username:    userProfile.username,
          rating:      reviewRating,
          comment:     reviewComment,
          bookingId:   '',
        });
        setMyReview(review);
      }
    } catch (e: any) {
      setReviewError(e.message ?? 'Failed to save review.');
    } finally {
      setReviewSaving(false);
    }
  };

  // ── Filtered movies ────────────────────────────────────────────────────────
  const filtered = movies.filter(m => {
    const genre = genres.find(g => g.id === m.genreId);
    const q = search.toLowerCase();
    const matchSearch = m.title.toLowerCase().includes(q) || genre?.name.toLowerCase().includes(q);
    const matchGenre  = genreFilter === 'All' || m.genreId === genreFilter;
    return matchSearch && matchGenre;
  });

  const template   = detailMovie && selectedSchedule
    ? templates.find(t => t.id === rooms.find(r => r.id === selectedSchedule.roomId)?.templateId) ?? null
    : null;

  const avgRating  = getMovieAverageRating(detailReviews);
  const otherReviews = detailReviews.filter(r => r.userId !== uid);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Now Showing & Upcoming</h2>
        <p>Browse movies and book your seats.</p>
      </div>

      {/* Toolbar */}
      <div className="table-toolbar" style={{ marginBottom: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 180 }}>
          <span className="search-icon">🔍</span>
          <input
            className="input-field"
            placeholder="Search movies…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Genre pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {[{ id: 'All', name: 'All', emoji: '🎬' }, ...genres].map(g => (
          <div
            key={g.id}
            onClick={() => setGenreFilter(g.id)}
            style={{
              padding: '4px 12px', borderRadius: 99, cursor: 'pointer',
              fontSize: '0.74rem', fontWeight: 500,
              background: genreFilter === g.id ? 'var(--gold)' : 'var(--surface)',
              color:      genreFilter === g.id ? 'var(--navy)' : 'var(--text-muted)',
              border: '1px solid var(--border)', transition: 'all var(--transition)',
            }}
          >
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
              <div key={m.id} className="movie-card" onClick={() => openDetail(m)} style={{ cursor: 'pointer' }}>
                <div className="movie-poster" style={{ background: m.color || genre?.color || '#1a1628' }}>
                  <span style={{ fontSize: '3.5rem' }}>{m.emoji || genre?.emoji || '🎬'}</span>
                  <div className="movie-genre-tag">
                    <Badge variant="muted">{genre?.name ?? '—'}</Badge>
                  </div>
                  {!hasShow && (
                    <div style={{
                      position: 'absolute', top: 10, left: 10,
                      padding: '2px 8px', borderRadius: 99,
                      background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)',
                      fontSize: '0.65rem',
                    }}>No upcoming shows</div>
                  )}
                </div>
                <div className="movie-info">
                  <div className="movie-title">{m.title}</div>
                  <div className="movie-meta">{m.year} · {m.duration} min</div>
                  <Stars rating={Math.round(m.rating / 2)} size="sm" />
                  {m.synopsis && (
                    <div style={{
                      fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 6,
                      lineHeight: 1.5, display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{m.synopsis}</div>
                  )}
                  <Button
                    size="sm"
                    style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                    variant={hasShow ? 'primary' : 'outline'}
                    onClick={e => { e.stopPropagation(); openDetail(m); }}
                  >
                    {hasShow ? '🎟️ Book Ticket' : '📋 View Details'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Movie Detail Modal ── */}
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
              {/* Booking success banner */}
              {bookingDone && (
                <div style={{
                  padding: '14px 16px', marginBottom: 16,
                  background: 'rgba(76,175,130,0.12)',
                  border: '1px solid rgba(76,175,130,0.35)',
                  borderRadius: 'var(--radius)', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🎉</div>
                  <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>
                    Booking Confirmed!
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Your ticket code:
                  </div>
                  <div style={{
                    fontFamily: 'monospace', fontSize: '1.3rem',
                    fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em',
                  }}>
                    {bookingDone.ticketCode}
                  </div>
                  {bookingDone.isFree && (
                    <Badge variant="gold" style={{ marginTop: 8 }}>🎟️ Free Entry</Badge>
                  )}
                </div>
              )}

              {/* Header */}
              <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 'var(--radius)', flexShrink: 0,
                  background: detailMovie.color || genre?.color || '#1a1628',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem',
                }}>
                  {detailMovie.emoji || genre?.emoji || '🎬'}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700 }}>
                    {detailMovie.title}
                  </div>
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

              {/* ── Show times ── */}
              {movieSchedules.length > 0 && !bookingDone && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Available Shows
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {movieSchedules.map(s => {
                      const room      = rooms.find(r => r.id === s.roomId);
                      const isSelected = selectedSchedule?.id === s.id;
                      const status    = autoStatus(s.date, s.startTime, s.endTime);
                      return (
                        <div
                          key={s.id}
                          onClick={() => handleSelectSchedule(s)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px', borderRadius: 'var(--radius)',
                            border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                            background: isSelected ? 'var(--gold-dim)' : 'var(--navy)',
                            cursor: 'pointer', transition: 'all var(--transition)',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                              {formatDate(s.date)} · {s.startTime}–{s.endTime}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {room?.name ?? '—'}
                              {s.freeTickets && (
                                <span style={{
                                  marginLeft: 8, padding: '0px 6px',
                                  background: 'var(--gold)', color: 'var(--navy)',
                                  borderRadius: 99, fontSize: '0.65rem', fontWeight: 700,
                                }}>FREE</span>
                              )}
                            </div>
                          </div>
                          <Badge variant={status === 'running' ? 'success' : 'info'}>
                            {status === 'running' ? '🔴 Now' : '⏳ Upcoming'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Seat picker ── */}
              {selectedSchedule && template && !bookingDone && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Choose Your Seats
                  </div>
                  {seatsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                      Loading seat availability…
                    </div>
                  ) : (
                    <SeatMap
                      template={template}
                      bookedSeats={bookedSeats}
                      onConfirm={seats => { setChosenSeats(seats); setShowConfirm(true); }}
                    />
                  )}
                </div>
              )}

              {/* ── Reviews section ── */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Reviews {detailReviews.length > 0 && `(${detailReviews.length})`}
                </div>

                {/* Write / Edit review */}
                {uid && (
                  <div style={{
                    padding: '12px 14px', background: 'var(--surface)',
                    border: `1px solid ${myReview ? 'var(--gold)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', marginBottom: 14,
                  }}>
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
                      className="textarea-field"
                      rows={2}
                      placeholder="Share your thoughts about this movie… (optional)"
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      style={{ marginBottom: 8 }}
                    />
                    {reviewError && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginBottom: 6 }}>⚠️ {reviewError}</div>
                    )}
                    <Button size="sm" onClick={handleSubmitReview} disabled={reviewSaving}>
                      {reviewSaving ? '⏳ Saving…' : myReview ? '💾 Update Review' : '📝 Submit Review'}
                    </Button>
                  </div>
                )}

                {/* Other reviews */}
                {otherReviews.length === 0 && !myReview ? (
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

      {/* ── Booking Confirm Modal ── */}
      <Modal
        title="Confirm Booking"
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Back</Button>
            <Button onClick={handleBook} disabled={isBooking}>
              {isBooking ? '⏳ Booking…' : '🎟️ Confirm Booking'}
            </Button>
          </>
        }
      >
        {selectedSchedule && detailMovie && (
          <div>
            <div style={{
              padding: '14px 16px', background: 'var(--navy)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 16,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{detailMovie.title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {formatDate(selectedSchedule.date)} · {selectedSchedule.startTime}–{selectedSchedule.endTime}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {rooms.find(r => r.id === selectedSchedule.roomId)?.name}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Seats', value: `${chosenSeats.length} seat(s)` },
                { label: 'Price', value: selectedSchedule.freeTickets ? '🎟️ FREE' : `RM ${(chosenSeats.length * 10).toFixed(2)}` },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  padding: '10px 12px', background: 'var(--navy)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                }}>
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