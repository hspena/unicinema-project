import React, { useState, useEffect } from 'react';
import { Card, Badge } from '../../components/ui';
import { useAuth }     from '../../context/AuthContext';
import { Movie, subscribeToMovies, Genre, subscribeToGenres } from '../../services/movieService';
import { Room, subscribeToRooms } from '../../services/templateService';
import {
  Schedule as ScheduleItem,
  subscribeToAllSchedules,
  formatDate, todayString,
} from '../../services/scheduleService';

// ─── Time-bucket helper ───────────────────────────────────────────────────────

type TimeBucket = 'past' | 'today' | 'upcoming';

const getBucket = (date: string, startTime: string, endTime: string): TimeBucket => {
  const now   = new Date();
  const today = todayString();

  if (date < today) return 'past';
  if (date > today) return 'upcoming';

  // date === today
  const end = new Date(`${date}T${endTime}:00`);
  if (now > end) return 'past';

  return 'today';
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const statusConfig = {
  running:   { variant: 'success' as const, label: '🔴 Now Playing' },
  upcoming:  { variant: 'info'    as const, label: '⏳ Upcoming'    },
  completed: { variant: 'muted'   as const, label: '✅ Completed'   },
  cancelled: { variant: 'danger'  as const, label: '❌ Cancelled'   },
};

const getStatus = (date: string, start: string, end: string) => {
  const now   = new Date();
  const s     = new Date(`${date}T${start}:00`);
  const e     = new Date(`${date}T${end}:00`);
  if (now >= s && now <= e) return 'running';
  if (now < s)              return 'upcoming';
  return 'completed';
};

// ─── Filter button ────────────────────────────────────────────────────────────

const FilterBtn = ({
  label, active, onClick, count,
}: {
  label: string; active: boolean; onClick: () => void; count: number;
}) => (
  <button
    onClick={onClick}
    style={{
      padding: '7px 16px',
      borderRadius: 99,
      border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
      background: active ? 'var(--gold)' : 'transparent',
      color: active ? 'var(--navy)' : 'var(--text-muted)',
      fontSize: '0.78rem', fontWeight: active ? 600 : 400,
      fontFamily: 'var(--font-body)',
      cursor: 'pointer',
      transition: 'all 0.18s ease',
      display: 'flex', alignItems: 'center', gap: 6,
    }}
  >
    {label}
    <span style={{
      fontSize: '0.68rem',
      background: active ? 'rgba(0,0,0,0.2)' : 'var(--surface-raised)',
      color: active ? 'var(--navy)' : 'var(--text-muted)',
      borderRadius: 99, padding: '1px 7px', fontWeight: 600,
    }}>
      {count}
    </span>
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const SchedulePage = () => {
  const { role } = useAuth();
  const isMoviegoer = role === 'Moviegoer';

  const [movies,    setMovies]    = useState<Movie[]>([]);
  const [genres,    setGenres]    = useState<Genre[]>([]);
  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  // Moviegoers default to 'today', others default to 'today' but can see all
  const [bucket, setBucket] = useState<TimeBucket>('today');

  useEffect(() => {
    const u1 = subscribeToMovies(setMovies);
    const u2 = subscribeToGenres(setGenres);
    const u3 = subscribeToRooms(setRooms);
    const u4 = subscribeToAllSchedules(setSchedules);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // Bucket counts
  const pastCount     = schedules.filter(s => getBucket(s.date, s.startTime, s.endTime) === 'past').length;
  const todayCount    = schedules.filter(s => getBucket(s.date, s.startTime, s.endTime) === 'today').length;
  const upcomingCount = schedules.filter(s => getBucket(s.date, s.startTime, s.endTime) === 'upcoming').length;

  // Filtered schedules for selected bucket
  const filtered = schedules
    .filter(s => getBucket(s.date, s.startTime, s.endTime) === bucket)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

  // Group by room
  const byRoom = rooms
    .map(room => ({
      room,
      schedules: filtered.filter(s => s.roomId === room.id),
    }))
    .filter(({ schedules }) => schedules.length > 0);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Cinema Schedule</h2>
        <p>
          {isMoviegoer
            ? 'Browse current and upcoming shows to book your seat.'
            : 'View past, current, and upcoming shows across all rooms.'}
        </p>
      </div>

      {/* ── Time bucket filters ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Moviegoers cannot see past */}
        {!isMoviegoer && (
          <FilterBtn
            label="📁 Past"
            active={bucket === 'past'}
            onClick={() => setBucket('past')}
            count={pastCount}
          />
        )}
        <FilterBtn
          label="🔴 Today"
          active={bucket === 'today'}
          onClick={() => setBucket('today')}
          count={todayCount}
        />
        <FilterBtn
          label="⏳ Upcoming"
          active={bucket === 'upcoming'}
          onClick={() => setBucket('upcoming')}
          count={upcomingCount}
        />

        {/* Date label */}
        <span style={{ marginLeft: 8, fontSize: '0.78rem', fontWeight: 600, color: 'var(--gold)' }}>
          {bucket === 'today'    && formatDate(todayString())}
          {bucket === 'upcoming' && 'Future shows'}
          {bucket === 'past'     && 'Past shows'}
        </span>
      </div>

      {/* ── Schedule content ── */}
      {byRoom.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            {bucket === 'past' ? '📁' : bucket === 'today' ? '📅' : '⏳'}
          </div>
          <div className="empty-state-text">
            {schedules.length === 0
              ? 'No schedules have been added yet.'
              : bucket === 'past'
              ? 'No past shows to display.'
              : bucket === 'today'
              ? 'No shows scheduled for today.'
              : 'No upcoming shows scheduled.'}
          </div>
        </div>
      ) : (
        byRoom.map(({ room, schedules: roomSchedules }) => {
          // Group past/upcoming schedules by date for better readability
          const dateGroups = Array.from(new Set(roomSchedules.map(s => s.date))).sort(
            bucket === 'past' ? (a, b) => b.localeCompare(a) : undefined
          );

          return (
            <Card
              key={room.id}
              title={room.name}
              actions={
                <Badge variant={room.status === 'active' ? 'success' : 'muted'}>
                  {room.status}
                </Badge>
              }
              style={{ marginBottom: 16 }}
            >
              <div className="card-body">
                {dateGroups.map(date => (
                  <div key={date}>
                    {/* Date label (only when showing multiple dates) */}
                    {bucket !== 'today' && (
                      <div style={{
                        fontSize: '0.7rem', fontWeight: 600,
                        color: date === todayString() ? 'var(--gold)' : 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                        marginBottom: 8, marginTop: 10,
                        paddingBottom: 4, borderBottom: '1px solid var(--border)',
                      }}>
                        {date === todayString() ? '📅 Today' : formatDate(date)}
                      </div>
                    )}

                    {roomSchedules
                      .filter(s => s.date === date)
                      .map(s => {
                        const movie  = movies.find(m => m.id === s.movieId);
                        const genre  = genres.find(g => g.id === movie?.genreId);
                        const status = getStatus(s.date, s.startTime, s.endTime);
                        const { variant, label } = statusConfig[status];

                        return (
                          <div key={s.id} className="schedule-slot" style={{
                            opacity: bucket === 'past' ? 0.7 : 1,
                          }}>
                            {/* Mini poster */}
                            <div style={{
                              width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                              background: movie?.color || genre?.color || '#1a1628',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '1.4rem',
                            }}>
                              {movie?.emoji || genre?.emoji || '🎬'}
                            </div>

                            <div className="schedule-movie" style={{ flex: 1 }}>
                              <div className="schedule-movie-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {movie?.title ?? '—'}
                                {s.freeTickets && (
                                  <span style={{
                                    fontSize: '0.62rem', padding: '1px 6px',
                                    background: 'var(--gold)', color: 'var(--navy)',
                                    borderRadius: 99, fontWeight: 700,
                                  }}>FREE</span>
                                )}
                              </div>
                              <div className="schedule-movie-meta">
                                {s.startTime} – {s.endTime}
                                {movie && <> · {movie.duration} min</>}
                                {genre  && <> · {genre.name}</>}
                              </div>
                            </div>

                            <Badge variant={variant}>{label}</Badge>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default SchedulePage;