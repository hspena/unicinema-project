import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from '../../components/ui';
import { Movie, subscribeToMovies, Genre, subscribeToGenres } from '../../services/movieService';
import { Room, subscribeToRooms } from '../../services/templateService';
import {
  Schedule as ScheduleItem,
  subscribeToAllSchedules,
  autoStatus, formatDate, todayString,
} from '../../services/scheduleService';

const statusConfig = {
  running:   { variant: 'success' as const, label: '🔴 Now Playing' },
  upcoming:  { variant: 'info'    as const, label: '⏳ Upcoming'    },
  completed: { variant: 'muted'   as const, label: '✅ Completed'   },
  cancelled: { variant: 'danger'  as const, label: '❌ Cancelled'   },
};

const SchedulePage = () => {
  const [movies,    setMovies]    = useState<Movie[]>([]);
  const [genres,    setGenres]    = useState<Genre[]>([]);
  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [dateFilter,    setDateFilter]    = useState(todayString());
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  useEffect(() => {
    const u1 = subscribeToMovies(setMovies);
    const u2 = subscribeToGenres(setGenres);
    const u3 = subscribeToRooms(setRooms);           // ← ALL rooms, not just active
    const u4 = subscribeToAllSchedules(setSchedules);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // Fix: use Array.from instead of spread to avoid TS downlevelIteration error
  const scheduleDates = Array.from(new Set(schedules.map(s => s.date))).sort();

  const daySchedules = schedules.filter(s => s.date === dateFilter);

  // Build room groups — only include rooms that have at least one schedule for this date
  const byRoom = rooms
    .map(room => {
      let roomSchedules = daySchedules
        .filter(s => s.roomId === room.id)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      if (onlyAvailable) {
        roomSchedules = roomSchedules.filter(s =>
          ['upcoming', 'running'].includes(autoStatus(s.date, s.startTime, s.endTime))
        );
      }

      return { room, schedules: roomSchedules };
    })
    .filter(({ schedules }) => schedules.length > 0); // only rooms with shows

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Cinema Schedule</h2>
        <p>See what's playing at each room.</p>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center',
        marginBottom: 20, flexWrap: 'wrap',
        padding: '12px 16px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            📅 Date:
          </span>
          <input
            type="date"
            className="input-field"
            style={{ padding: '5px 10px', fontSize: '0.78rem', width: 'auto' }}
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          />
        </div>

        {/* Quick date buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {scheduleDates.slice(0, 7).map(d => {
            const isToday = d === todayString();
            const label   = isToday
              ? 'Today'
              : new Date(d + 'T00:00:00').toLocaleDateString('en-MY', {
                  weekday: 'short', month: 'short', day: 'numeric',
                });
            return (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className={`btn btn-sm ${d === dateFilter ? 'btn-primary' : 'btn-outline'}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Upcoming only toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginLeft: 'auto' }}>
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={e => setOnlyAvailable(e.target.checked)}
            style={{ width: 14, height: 14 }}
          />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Upcoming only
          </span>
        </label>
      </div>

      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gold)', marginBottom: 16 }}>
        {formatDate(dateFilter)}
      </div>

      {/* Schedule list */}
      {byRoom.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-text">
            {schedules.length === 0
              ? 'No schedules have been added yet.'
              : 'No shows found for this date.'}
          </div>
        </div>
      ) : (
        byRoom.map(({ room, schedules: roomSchedules }) => (
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
              {roomSchedules.map(s => {
                const movie  = movies.find(m => m.id === s.movieId);
                const genre  = genres.find(g => g.id === movie?.genreId);
                const status = autoStatus(s.date, s.startTime, s.endTime);
                const { variant, label } = statusConfig[status];

                return (
                  <div key={s.id} className="schedule-slot">
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
                        {s.startTime} – {s.endTime} · {movie?.duration} min
                        {genre && <> · {genre.name}</>}
                      </div>
                    </div>

                    <Badge variant={variant}>{label}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

export default SchedulePage;