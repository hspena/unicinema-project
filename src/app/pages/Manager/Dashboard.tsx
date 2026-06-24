import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal } from '../../components/ui';
import { useAuth }                    from '../../context/AuthContext';
import { subscribeToRooms, subscribeToTemplates, templateSeatCount, Room, RoomTemplate, roomManagerIds } from '../../services/templateService';
import { subscribeToMovies, subscribeToGenres, Movie, Genre } from '../../services/movieService';
import { subscribeToRoomSchedules, autoStatus, todayString, formatDate } from '../../services/scheduleService';
import { subscribeToRoomBookings, Booking } from '../../services/bookingService';
import { subscribeToMovieReviews, getMovieAverageRating, Review } from '../../services/reviewService';
import { Schedule } from '../../services/scheduleService';
import { Star, Building2, Ticket, DollarSign, CheckCircle2, Calendar, IconGlyph } from '../../utils/icons';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Stars = ({ rating }: { rating: number }) => (
  <span style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>
    {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
  </span>
);

// ─── Reviews panel (room-scoped) ──────────────────────────────────────────────

const RoomReviewsPanel = ({
  roomMovieIds, movies, genres,
}: {
  roomMovieIds: string[];
  movies:       Movie[];
  genres:       Genre[];
}) => {
  const [allReviews, setAllReviews] = useState<(Review & { movieTitle: string })[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filterMovie,  setFilterMovie]  = useState('All');
  const [filterRating, setFilterRating] = useState('All');

  useEffect(() => {
    if (!roomMovieIds.length) { setLoading(false); return; }
    const collected = new Map<string, Review & { movieTitle: string }>();
    const unsubs: (() => void)[] = [];

    roomMovieIds.forEach(movieId => {
      const movie = movies.find(m => m.id === movieId);
      const u = subscribeToMovieReviews(movieId, reviews => {
        reviews.forEach(r => {
          collected.set(r.id, { ...r, movieTitle: movie?.title ?? '—' });
        });
        Array.from(collected.values())
          .filter(r => r.movieId === movieId && !reviews.find(rv => rv.id === r.id))
          .forEach(r => collected.delete(r.id));
        const sorted = Array.from(collected.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllReviews(sorted);
        setLoading(false);
      });
      unsubs.push(u);
    });

    if (!roomMovieIds.length) setLoading(false);
    return () => unsubs.forEach(u => u());
  }, [roomMovieIds.join(','), movies.length]);

  const filtered = allReviews.filter(r => {
    const matchMovie  = filterMovie  === 'All' || r.movieId === filterMovie;
    const matchRating = filterRating === 'All' || r.rating === parseInt(filterRating);
    return matchMovie && matchRating;
  });

  const avg = allReviews.length
    ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)
    : '—';

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Reviews', value: allReviews.length },
          { label: 'Avg Rating',    value: `${avg} / 5` },
          { label: '5 Stars',       value: allReviews.filter(r => r.rating === 5).length },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, minWidth: 90, padding: '10px 12px',
            background: 'var(--navy)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--gold)' }}>{s.value}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <select className="select-field" style={{ width: 'auto', flex: 1 }}
          value={filterMovie} onChange={e => setFilterMovie(e.target.value)}>
          <option value="All">All Movies</option>
          {movies.filter(m => roomMovieIds.includes(m.id)).map(m => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
        <select className="select-field" style={{ width: 'auto' }}
          value={filterRating} onChange={e => setFilterRating(e.target.value)}>
          <option value="All">All Ratings</option>
          {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ★</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>No reviews yet for this room's movies.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
          {filtered.map(r => {
            const same = r.displayName.toLowerCase() === r.username.toLowerCase();
            return (
              <div key={r.id} style={{ padding: '12px 14px', background: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div className="avatar" style={{ width: 30, height: 30, fontSize: '0.78rem', flexShrink: 0 }}>{r.displayName[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.83rem' }}>{r.displayName}</span>
                      {!same && <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>@{r.username}</span>}
                      <Badge variant="gold">{r.movieTitle}</Badge>
                    </div>
                    <div style={{ display: 'flex', gap: 8, margin: '3px 0' }}>
                      <Stars rating={r.rating} />
                      <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                        {new Date(r.createdAt).toLocaleDateString('en-MY')}
                      </span>
                    </div>
                    {r.comment && (
                      <div style={{ fontSize: '0.79rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
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

// ─── Main Manager Dashboard ───────────────────────────────────────────────────

const CMDashboard = () => {
  const { uid } = useAuth();

  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [templates, setTemplates] = useState<RoomTemplate[]>([]);
  const [movies,    setMovies]    = useState<Movie[]>([]);
  const [genres,    setGenres]    = useState<Genre[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [showReviews, setShowReviews] = useState(false);

  useEffect(() => {
    const u1 = subscribeToRooms(setRooms);
    const u2 = subscribeToTemplates(setTemplates);
    const u3 = subscribeToMovies(setMovies);
    const u4 = subscribeToGenres(setGenres);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const myRoom     = rooms.find(r => uid && roomManagerIds(r).includes(uid)) ?? rooms[0] ?? null;
  const myTemplate = myRoom ? templates.find(t => t.id === myRoom.templateId) ?? null : null;

  useEffect(() => {
    if (!myRoom) return;
    const u1 = subscribeToRoomSchedules(myRoom.id, setSchedules);
    const u2 = subscribeToRoomBookings(myRoom.id, setBookings);
    return () => { u1(); u2(); };
  }, [myRoom?.id]);

  const today          = todayString();
  const todaySchedules = schedules
    .filter(s => s.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const todayBookings  = bookings.filter(b => b.showDate === today && b.status !== 'cancelled');
  const todayRevenue   = todayBookings.reduce((s, b) => s + (b.totalPrice ?? 0), 0);
  const totalTickets   = bookings.filter(b => b.status !== 'cancelled').length;
  const checkedIn      = bookings.filter(b => b.status === 'checked-in').length;
  const totalSeats     = myTemplate ? templateSeatCount(myTemplate) : 0;

  // Movies that have been shown / scheduled in this room
  const roomMovieIds   = Array.from(new Set(schedules.map(s => s.movieId)));
  const roomMovies     = movies.filter(m => roomMovieIds.includes(m.id));

  // Movie booking breakdown
  const movieStats = roomMovies.map(m => ({
    movie: m,
    count: bookings.filter(b => b.movieId === m.id && b.status !== 'cancelled').length,
  })).sort((a, b) => b.count - a.count);
  const maxCount = movieStats[0]?.count || 1;

  // Upcoming shows (not yet completed)
  const upcomingShows = schedules
    .filter(s => ['upcoming', 'running'].includes(autoStatus(s.date, s.startTime, s.endTime)))
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .slice(0, 5);

  if (!myRoom) {
    return (
      <div className="page fade-in">
        <div className="page-header"><h2>Dashboard</h2></div>
        <div className="empty-state">
          <div className="empty-state-icon"><Building2 size={32} /></div>
          <div className="empty-state-text">No room assigned. Contact the Admin.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>{myRoom.name} — Dashboard</h2>
          <p>Manage your cinema room, schedule, and bookings.</p>
        </div>
        <Button onClick={() => setShowReviews(true)} icon={<Star size={14} />}>
          View Reviews
        </Button>
      </div>

      {/* Room status banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', marginBottom: 20,
        background: 'var(--surface)',
        border: `1px solid ${myRoom.status === 'active' ? 'var(--success)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
      }}>
        <span style={{
          width: 9, height: 9, borderRadius: '50%',
          background: myRoom.status === 'active' ? 'var(--success)' : 'var(--text-muted)',
          animation: myRoom.status === 'active' ? 'pulse 2s infinite' : 'none',
          flexShrink: 0,
        }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{myRoom.name}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {myTemplate
              ? `${myTemplate.name} · ${totalSeats} seats · ${myTemplate.gridRows * myTemplate.gridCols} sections`
              : 'No template assigned'}
          </div>
        </div>
        <Badge variant={myRoom.status === 'active' ? 'success' : 'muted'} style={{ marginLeft: 'auto' }}>
          {myRoom.status}
        </Badge>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon"><Ticket size={20} /></div>
          <div className="stat-card-value">{todayBookings.length}</div>
          <div className="stat-card-label">Bookings Today</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{totalTickets} all time</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><DollarSign size={20} /></div>
          <div className="stat-card-value" style={{ color: 'var(--gold)' }}>RM {todayRevenue.toFixed(0)}</div>
          <div className="stat-card-label">Revenue Today</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
            RM {bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.totalPrice ?? 0), 0).toFixed(0)} total
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><CheckCircle2 size={20} /></div>
          <div className="stat-card-value">{checkedIn}</div>
          <div className="stat-card-label">Checked In</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {bookings.filter(b => b.status === 'confirmed').length} pending
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon"><Calendar size={20} /></div>
          <div className="stat-card-value">{todaySchedules.length}</div>
          <div className="stat-card-label">Shows Today</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{schedules.length} scheduled total</div>
        </div>
      </div>

      <div className="two-col">
        {/* Today's schedule */}
        <Card title="Today's Schedule" actions={<Badge variant="muted">{formatDate(today)}</Badge>}>
          <div className="card-body">
            {todaySchedules.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px 0', fontSize: '0.83rem' }}>
                No shows scheduled for today.
              </div>
            ) : (
              todaySchedules.map(s => {
                const movie  = movies.find(m => m.id === s.movieId);
                const status = autoStatus(s.date, s.startTime, s.endTime);
                const showBookings = bookings.filter(b => b.scheduleId === s.id && b.status !== 'cancelled');
                const vMap   = { running: 'success', upcoming: 'info', completed: 'muted', cancelled: 'danger' } as const;
                return (
                  <div key={s.id} className="schedule-slot">
                    <div className="schedule-time">{s.startTime}</div>
                    <div className="schedule-movie" style={{ flex: 1 }}>
                      <div className="schedule-movie-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconGlyph iconKey={movie?.emoji} size={15} /> {movie?.title ?? '—'}
                        {s.freeTickets && (
                          <span style={{ marginLeft: 8, fontSize: '0.62rem', padding: '1px 5px', background: 'var(--gold)', color: 'var(--navy)', borderRadius: 99, fontWeight: 700 }}>
                            FREE
                          </span>
                        )}
                      </div>
                      <div className="schedule-movie-meta">
                        {movie?.duration} min · {showBookings.length} booked
                        {totalSeats > 0 && ` / ${totalSeats} seats`}
                      </div>
                    </div>
                    <Badge variant={vMap[status]}>{status}</Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Movie stats */}
        <Card title="Movie Bookings" actions={<Badge variant="muted">{roomMovies.length} movies</Badge>}>
          <div className="card-body">
            {movieStats.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px 0', fontSize: '0.83rem' }}>
                No booking data yet.
              </div>
            ) : (
              movieStats.map(({ movie, count }) => (
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
      </div>

      {/* Upcoming shows */}
      {upcomingShows.length > 0 && (
        <Card title="Upcoming Shows">
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingShows.map(s => {
                const movie  = movies.find(m => m.id === s.movieId);
                const status = autoStatus(s.date, s.startTime, s.endTime);
                const vMap   = { running: 'success', upcoming: 'info', completed: 'muted', cancelled: 'danger' } as const;
                return (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '9px 12px', background: 'var(--navy)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  }}>
                    <span style={{ display: 'inline-flex' }}><IconGlyph iconKey={movie?.emoji} size={22} /></span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.83rem' }}>{movie?.title ?? '—'}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {s.date === today ? 'Today' : s.date} · {s.startTime}–{s.endTime}
                      </div>
                    </div>
                    <Badge variant={vMap[status]}>{status}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Reviews Modal */}
      <Modal
        title={<><Star size={16} style={{ verticalAlign: -3, marginRight: 6 }} /> Reviews — {myRoom.name}</>}
        open={showReviews}
        onClose={() => setShowReviews(false)}
        footer={<Button onClick={() => setShowReviews(false)}>Close</Button>}
      >
        <RoomReviewsPanel
          roomMovieIds={roomMovieIds}
          movies={movies}
          genres={genres}
        />
      </Modal>
    </div>
  );
};

export default CMDashboard;