import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal, StatCard, ReviewSummary } from '../../components/ui';
import { subscribeToRooms, subscribeToTemplates, templateSeatCount, RoomTemplate } from '../../services/templateService';
import { subscribeToMovies, subscribeToGenres, Genre, Movie } from '../../services/movieService';
import { subscribeToAllSchedules, effectiveStatus, todayString } from '../../services/scheduleService';
import { subscribeToMovieReviews }  from '../../services/reviewService';
import { Review }                   from '../../services/reviewService';
import { Room }                     from '../../services/templateService';
import { Schedule }                 from '../../services/scheduleService';
import { Booking }                  from '../../services/bookingService';
import { onValue, ref, off }        from 'firebase/database';
import { db }                       from '../../config/firebase';
import { Star, Building2, Ticket, Calendar, DollarSign, IconGlyph } from '../../utils/icons';
import {
  computeOccupancy, seatsIn, revenueOf, isLive, changeVs, startOfDay, DAY_MS, moneyShort, pctText,
} from '../../utils/metrics';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Stars = ({ rating }: { rating: number }) => (
  <span style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>
    {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
  </span>
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

  // Scoped = movie filter only. The summary should follow the movie you picked,
  // but not the star filter — that one drills into the list below, and letting
  // it drive the average would just echo the filter back at you ("5★ → avg 5.0").
  const scoped   = allReviews.filter(r => filterMovie === 'All' || r.movieId === filterMovie);
  const filtered = scoped.filter(r => filterRating === 'All' || r.rating === parseInt(filterRating));

  const scopeName = filterMovie === 'All'
    ? undefined
    : movies.find(m => m.id === filterMovie)?.title;

  return (
    <div>
      {/* Summary — follows the movie filter */}
      <ReviewSummary reviews={scoped} scope={scopeName} />

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
  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [movies,    setMovies]    = useState<Movie[]>([]);
  const [genres,    setGenres]    = useState<Genre[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [templates, setTemplates] = useState<RoomTemplate[]>([]);
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [showReviews, setShowReviews] = useState(false);

  useEffect(() => {
    const u2 = subscribeToRooms(setRooms);
    const u3 = subscribeToMovies(setMovies);
    const u4 = subscribeToGenres(setGenres);
    const u5 = subscribeToAllSchedules(setSchedules);
    const u6 = subscribeToTemplates(setTemplates);

    // Subscribe to all bookings
    const bookRef = ref(db, 'bookings');
    const bookHandler = onValue(bookRef, snap => {
      if (!snap.exists()) { setBookings([]); return; }
      setBookings(Object.values(snap.val()) as Booking[]);
    });

    return () => { u2(); u3(); u4(); u5(); u6(); off(bookRef, 'value', bookHandler); };
  }, []);

  const today          = todayString();
  const todaySchedules = schedules.filter(s => s.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // ── Today ─────────────────────────────────────────────────────────────────
  // This page is headed "what's happening today", so the tiles report today and
  // keep the all-time totals as context underneath. Ticket figures count seats,
  // not bookings — a 4-seat booking is four tickets.
  const yesterday      = new Date(startOfDay(new Date()).getTime() - DAY_MS);
  const yesterdayStr   = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  const forShowDate    = (d: string) => bookings.filter(b => isLive(b) && b.showDate === d);

  const todayBookings  = forShowDate(today);
  const ticketsToday   = seatsIn(todayBookings);
  const ticketTrend    = changeVs(ticketsToday, seatsIn(forShowDate(yesterdayStr)));

  const ticketsSold    = seatsIn(bookings.filter(isLive));
  const revenue        = revenueOf(bookings);
  const todayRevenue   = revenueOf(todayBookings);

  const seatsForRoom = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    const tpl  = room && templates.find(t => t.id === room.templateId);
    return tpl ? templateSeatCount(tpl) : 0;
  };
  const todayOccupancy = computeOccupancy(todaySchedules, bookings, seatsForRoom);

  const runningNow  = todaySchedules.filter(s => effectiveStatus(s) === 'running');
  const upcomingNow = todaySchedules.filter(s => effectiveStatus(s) === 'upcoming');

  // Movie popularity: count bookings per movie
  const movieBookingCount = movies.map(m => ({
    movie: m,
    count: seatsIn(bookings.filter(b => isLive(b) && b.movieId === m.id)),
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
        <StatCard
          icon={<Ticket size={20} />}
          value={ticketsToday.toLocaleString()}
          label="Tickets Today"
          sub={`${ticketsSold.toLocaleString()} all time`}
          trend={ticketTrend?.label}
          trendUp={ticketTrend?.up}
          delay={1}
        />
        <StatCard
          icon={<DollarSign size={20} />}
          value={moneyShort(todayRevenue)}
          label="Revenue Today"
          sub={`${moneyShort(revenue)} all time`}
          color="var(--gold)"
          delay={2}
        />
        <StatCard
          icon={<Building2 size={20} />}
          value={todayOccupancy.capacity > 0 ? pctText(todayOccupancy.pct) : '—'}
          label="Seats Filled Today"
          sub={todayOccupancy.capacity > 0
            ? `${todayOccupancy.sold.toLocaleString()} of ${todayOccupancy.capacity.toLocaleString()} seats`
            : 'No bookable shows today'}
          delay={3}
        />
        <StatCard
          icon={<Calendar size={20} />}
          value={todaySchedules.length}
          label="Shows Today"
          sub={`${runningNow.length} running now · ${upcomingNow.length} still to come`}
          subTone={runningNow.length > 0 ? 'good' : 'muted'}
          delay={4}
        />
      </div>

      <div className="two-col">
        {/* Popular movies */}
        <Card title="Top Movies by Tickets" actions={<Badge variant="muted">{movies.length} total</Badge>}>
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
                  s.roomId === r.id && effectiveStatus(s) === 'running'
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
                const status = effectiveStatus(s);
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