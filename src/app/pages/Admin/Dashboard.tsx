import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal } from '../../components/ui';
import { subscribeToUsers }         from '../../services/userService';
import { subscribeToRooms }         from '../../services/templateService';
import { subscribeToMovies, subscribeToGenres, Genre, Movie } from '../../services/movieService';
import { subscribeToAllSchedules, autoStatus, todayString } from '../../services/scheduleService';
import { subscribeToMovieReviews }  from '../../services/reviewService';
import { Review }                   from '../../services/reviewService';
import { User }                     from '../../types';
import { Room }                     from '../../services/templateService';
import { Schedule }                 from '../../services/scheduleService';
import { Booking }                  from '../../services/bookingService';
import { onValue, ref, off }        from 'firebase/database';
import { db }                       from '../../config/firebase';
import { Star, Building2, Ticket, Users, DollarSign, IconGlyph } from '../../utils/icons';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Stars = ({ rating }: { rating: number }) => (
  <span style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>
    {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
  </span>
);

const StatCard = ({ icon, value, label, sub, color }: {
  icon: React.ReactNode; value: string | number; label: string; sub?: string; color?: string;
}) => (
  <div className="stat-card">
    <div className="stat-card-icon">{icon}</div>
    <div className="stat-card-value" style={{ color: color ?? 'var(--text-primary)' }}>{value}</div>
    <div className="stat-card-label">{label}</div>
    {sub && <div style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: 6 }}>{sub}</div>}
  </div>
);

// ─── Reviews Panel ────────────────────────────────────────────────────────────

const ReviewsPanel = ({ movies, genres }: { movies: Movie[]; genres: Genre[] }) => {
  const [allReviews, setAllReviews] = useState<(Review & { movieTitle: string; genreName: string })[]>([]);
  const [filterMovie, setFilterMovie] = useState('All');
  const [filterRating, setFilterRating] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!movies.length) return;
    const unsubs: (() => void)[] = [];
    const collected: Map<string, Review & { movieTitle: string; genreName: string }> = new Map();

    movies.forEach(movie => {
      const genre = genres.find(g => g.id === movie.genreId);
      const u = subscribeToMovieReviews(movie.id, reviews => {
        reviews.forEach(r => {
          collected.set(r.id, { ...r, movieTitle: movie.title, genreName: genre?.name ?? '—' });
        });
        // Remove reviews no longer in this movie's list
        Array.from(collected.values())
          .filter(r => r.movieId === movie.id && !reviews.find(rv => rv.id === r.id))
          .forEach(r => collected.delete(r.id));

        const sorted = Array.from(collected.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllReviews(sorted);
        setLoading(false);
      });
      unsubs.push(u);
    });

    if (!movies.length) setLoading(false);
    return () => unsubs.forEach(u => u());
  }, [movies.length, genres.length]);

  const filtered = allReviews.filter(r => {
    const matchMovie  = filterMovie  === 'All' || r.movieId === filterMovie;
    const matchRating = filterRating === 'All' || r.rating  === parseInt(filterRating);
    return matchMovie && matchRating;
  });

  const avgOverall = allReviews.length
    ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)
    : '—';

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Reviews', value: allReviews.length },
          { label: 'Avg Rating',    value: `${avgOverall} / 5` },
          { label: '5 Stars',       value: allReviews.filter(r => r.rating === 5).length },
          { label: 'This Week',     value: allReviews.filter(r => {
              const d = new Date(r.createdAt);
              const w = new Date(); w.setDate(w.getDate() - 7);
              return d > w;
            }).length },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, minWidth: 100,
            padding: '12px 14px', background: 'var(--navy)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--gold)' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="select-field" style={{ width: 'auto', flex: 1 }}
          value={filterMovie} onChange={e => setFilterMovie(e.target.value)}>
          <option value="All">All Movies</option>
          {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
        <select className="select-field" style={{ width: 'auto' }}
          value={filterRating} onChange={e => setFilterRating(e.target.value)}>
          <option value="All">All Ratings</option>
          {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ★</option>)}
        </select>
      </div>

      {/* Review list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>Loading reviews…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>No reviews found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 460, overflowY: 'auto' }}>
          {filtered.map(r => {
            const same = r.displayName.toLowerCase() === r.username.toLowerCase();
            return (
              <div key={r.id} style={{
                padding: '12px 14px', background: 'var(--navy)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.8rem', flexShrink: 0 }}>
                    {r.displayName[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{r.displayName}</span>
                      {!same && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>@{r.username}</span>}
                      <Badge variant="gold">{r.movieTitle}</Badge>
                      <Badge variant="muted">{r.genreName}</Badge>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                      <Stars rating={r.rating} />
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {new Date(r.createdAt).toLocaleDateString('en-MY')}
                        {r.updatedAt && ' (edited)'}
                      </span>
                    </div>
                    {r.comment && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        "{r.comment}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────

const AdminDashboard = () => {
  const [users,     setUsers]     = useState<User[]>([]);
  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [movies,    setMovies]    = useState<Movie[]>([]);
  const [genres,    setGenres]    = useState<Genre[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [showReviews, setShowReviews] = useState(false);

  useEffect(() => {
    const u1 = subscribeToUsers(setUsers);
    const u2 = subscribeToRooms(setRooms);
    const u3 = subscribeToMovies(setMovies);
    const u4 = subscribeToGenres(setGenres);
    const u5 = subscribeToAllSchedules(setSchedules);

    // Subscribe to all bookings
    const bookRef = ref(db, 'bookings');
    const bookHandler = onValue(bookRef, snap => {
      if (!snap.exists()) { setBookings([]); return; }
      setBookings(Object.values(snap.val()) as Booking[]);
    });

    return () => { u1(); u2(); u3(); u4(); u5(); off(bookRef, 'value', bookHandler); };
  }, []);

  const today          = todayString();
  const activeRooms    = rooms.filter(r => r.status === 'active').length;
  const totalUsers     = users.length;
  const moviegoers     = users.filter(u => u.role === 'Moviegoer').length;
  const todayBookings  = bookings.filter(b => b.bookedAt?.startsWith(today) && b.status !== 'cancelled');
  const ticketsSold    = bookings.filter(b => b.status !== 'cancelled').length;
  const revenue        = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.totalPrice ?? 0), 0);
  const todayRevenue   = todayBookings.reduce((s, b) => s + (b.totalPrice ?? 0), 0);
  const todaySchedules = schedules.filter(s => s.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Movie popularity: count bookings per movie
  const movieBookingCount = movies.map(m => ({
    movie: m,
    count: bookings.filter(b => b.movieId === m.id && b.status !== 'cancelled').length,
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  const maxCount = movieBookingCount[0]?.count || 1;

  // Recent bookings
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime())
    .slice(0, 5);

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Dashboard Overview</h2>
          <p>Here's what's happening across all cinemas today.</p>
        </div>
        <Button onClick={() => setShowReviews(true)} icon={<Star size={14} />}>
          View All Reviews
        </Button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon={<Building2 size={20} />} value={activeRooms}          label="Active Rooms"   sub={`${rooms.length} total`} />
        <StatCard icon={<Ticket size={20} />}     value={ticketsSold}          label="Tickets Sold"   sub={`${todayBookings.length} today`} />
        <StatCard icon={<Users size={20} />}      value={totalUsers}            label="Total Users"    sub={`${moviegoers} moviegoers`} />
        <StatCard icon={<DollarSign size={20} />} value={`RM ${revenue.toFixed(0)}`} label="Total Revenue" sub={`RM ${todayRevenue.toFixed(0)} today`} color="var(--gold)" />
      </div>

      <div className="two-col">
        {/* Popular movies */}
        <Card title="Most Booked Movies" actions={<Badge variant="muted">{movies.length} total</Badge>}>
          <div className="card-body">
            {movieBookingCount.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.83rem', textAlign: 'center', padding: '16px 0' }}>
                No booking data yet.
              </div>
            ) : (
              movieBookingCount.map(({ movie, count }) => (
                <div key={movie.id} className="bar-row">
                  <div className="bar-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconGlyph iconKey={movie.emoji} size={14} /> {movie.title}
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <div className="bar-value">{count}</div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Active rooms */}
        <Card title="Cinema Rooms">
          <div className="card-body">
            {rooms.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.83rem', textAlign: 'center', padding: '16px 0' }}>
                No rooms yet.
              </div>
            ) : (
              rooms.map(r => {
                const nowPlaying = todaySchedules.find(s =>
                  s.roomId === r.id && autoStatus(s.date, s.startTime, s.endTime) === 'running'
                );
                const nowMovie = nowPlaying ? movies.find(m => m.id === nowPlaying.movieId) : null;
                return (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', marginBottom: 8,
                    background: 'var(--navy)', borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                  }}>
                    <span style={{
                      width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                      background: r.status === 'active' ? 'var(--success)' : 'var(--text-muted)',
                      animation: r.status === 'active' ? 'pulse 2s infinite' : 'none',
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.84rem' }}>{r.name}</div>
                      <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
                        {nowMovie ? `▶ ${nowMovie.title}` : '— No show running'}
                      </div>
                    </div>
                    <Badge variant={r.status === 'active' ? 'success' : 'muted'}>{r.status}</Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Today's schedule + Recent bookings */}
      <div className="two-col">
        <Card title="Today's Schedule" actions={<Badge variant="muted">{todaySchedules.length} shows</Badge>}>
          <div className="card-body">
            {todaySchedules.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.83rem', textAlign: 'center', padding: '16px 0' }}>
                No shows scheduled for today.
              </div>
            ) : (
              todaySchedules.map(s => {
                const movie  = movies.find(m => m.id === s.movieId);
                const room   = rooms.find(r => r.id === s.roomId);
                const status = autoStatus(s.date, s.startTime, s.endTime);
                const vMap   = { running: 'success', upcoming: 'info', completed: 'muted', cancelled: 'danger' } as const;
                return (
                  <div key={s.id} className="schedule-slot">
                    <div className="schedule-time">{s.startTime}</div>
                    <div className="schedule-movie" style={{ flex: 1 }}>
                      <div className="schedule-movie-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconGlyph iconKey={movie?.emoji} size={15} /> {movie?.title ?? '—'}</div>
                      <div className="schedule-movie-meta">{room?.name} · {movie?.duration} min</div>
                    </div>
                    <Badge variant={vMap[status]}>{status}</Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card title="Recent Bookings">
          <div className="card-body">
            {recentBookings.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.83rem', textAlign: 'center', padding: '16px 0' }}>
                No bookings yet.
              </div>
            ) : (
              recentBookings.map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <div className="avatar" style={{ width: 30, height: 30, fontSize: '0.75rem', flexShrink: 0 }}>
                    {b.userName?.[0] ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.userName}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {b.movieTitle} · {b.seats?.length ?? 0} seat(s)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gold)', fontWeight: 600 }}>
                      {b.isFree ? 'FREE' : `RM ${b.totalPrice?.toFixed(2)}`}
                    </div>
                    <Badge variant={b.status === 'confirmed' ? 'info' : b.status === 'checked-in' ? 'success' : 'danger'}>
                      {b.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Reviews Modal */}
      <Modal
        title={<><Star size={16} style={{ verticalAlign: -3, marginRight: 6 }} /> Moviegoer Reviews</>}
        open={showReviews}
        onClose={() => setShowReviews(false)}
        footer={<Button onClick={() => setShowReviews(false)}>Close</Button>}
      >
        <ReviewsPanel movies={movies} genres={genres} />
      </Modal>
    </div>
  );
};

export default AdminDashboard;