import React, { useEffect, useState } from 'react';
import { StatCard, Card, BarChart } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { Building2, Film, Ticket, DollarSign } from '../../utils/icons';
import { Movie, Genre, subscribeToMovies, subscribeToGenres } from '../../services/movieService';
import { Room, subscribeToRooms } from '../../services/templateService';
import { Schedule, subscribeToRoomSchedules } from '../../services/scheduleService';
import { Booking, subscribeToRoomBookings } from '../../services/bookingService';

const EmptyChart = ({ text }: { text: string }) => (
  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.83rem' }}>
    {text}
  </div>
);

const Analytics = () => {
  const { uid } = useAuth();

  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [movies,    setMovies]    = useState<Movie[]>([]);
  const [genres,    setGenres]    = useState<Genre[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookings,  setBookings]  = useState<Booking[]>([]);

  useEffect(() => {
    const u1 = subscribeToRooms(setRooms);
    const u2 = subscribeToMovies(setMovies);
    const u3 = subscribeToGenres(setGenres);
    return () => { u1(); u2(); u3(); };
  }, []);

  const myRoom = rooms.find(r => r.managerId === uid) ?? rooms[0] ?? null;

  useEffect(() => {
    if (!myRoom) { setSchedules([]); setBookings([]); return; }
    const u1 = subscribeToRoomSchedules(myRoom.id, setSchedules);
    const u2 = subscribeToRoomBookings(myRoom.id, setBookings);
    return () => { u1(); u2(); };
  }, [myRoom?.id]);

  if (!myRoom) {
    return (
      <div className="page fade-in">
        <div className="page-header"><h2>Room Analytics</h2></div>
        <div className="empty-state">
          <div className="empty-state-icon"><Building2 size={32} /></div>
          <div className="empty-state-text">No active cinema room assigned to you yet.</div>
        </div>
      </div>
    );
  }

  const activeBookings = bookings.filter(b => b.status !== 'cancelled');
  const totalTickets   = activeBookings.reduce((sum, b) => sum + b.seats.length, 0);
  const totalRevenue   = activeBookings.reduce((sum, b) => sum + (b.isFree ? 0 : b.totalPrice), 0);
  const featuredMovieIds = Array.from(new Set(schedules.map(s => s.movieId)));

  const moviePopularity = featuredMovieIds
    .map(id => {
      const movie = movies.find(m => m.id === id);
      return {
        label: movie?.title ?? '—',
        value: activeBookings.filter(b => b.movieId === id).reduce((sum, b) => sum + b.seats.length, 0),
      };
    })
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const genreBreakdown = genres
    .map(g => {
      const movieIds = movies.filter(m => m.genreId === g.id && featuredMovieIds.includes(m.id)).map(m => m.id);
      const value = activeBookings
        .filter(b => movieIds.includes(b.movieId))
        .reduce((sum, b) => sum + b.seats.length, 0);
      return { label: g.name, value };
    })
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>{myRoom.name} — Analytics</h2>
        <p>Performance insights for your cinema room.</p>
      </div>

      <div className="stats-grid">
        <StatCard icon={<Film size={22} />}      value={featuredMovieIds.length}       label="Movies Featured"    delay={1} />
        <StatCard icon={<Building2 size={22} />} value={schedules.length}              label="Total Shows"        delay={2} />
        <StatCard icon={<Ticket size={22} />}    value={totalTickets.toLocaleString()} label="Tickets Sold"       delay={3} />
        <StatCard
          icon={<DollarSign size={22} />}
          value={`RM ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          label="Revenue"
          delay={4}
        />
      </div>

      <div className="two-col">
        <Card title="Movie Popularity (tickets sold)">
          <div className="card-body">
            {moviePopularity.length > 0 ? <BarChart data={moviePopularity} /> : <EmptyChart text="No ticket sales yet." />}
          </div>
        </Card>
        <Card title="Genre Breakdown (tickets sold)">
          <div className="card-body">
            {genreBreakdown.length > 0 ? <BarChart data={genreBreakdown} /> : <EmptyChart text="No data yet." />}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
