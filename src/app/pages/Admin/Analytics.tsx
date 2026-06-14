import React, { useEffect, useState } from 'react';
import { StatCard, Card, BarChart } from '../../components/ui';
import { Film, Building2, Ticket, DollarSign } from '../../utils/icons';
import { Movie, Genre, subscribeToMovies, subscribeToGenres } from '../../services/movieService';
import { Room, subscribeToRooms } from '../../services/templateService';
import { Booking, subscribeToAllBookings } from '../../services/bookingService';

const EmptyChart = ({ text }: { text: string }) => (
  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.83rem' }}>
    {text}
  </div>
);

const Analytics = () => {
  const [movies,   setMovies]   = useState<Movie[]>([]);
  const [genres,   setGenres]   = useState<Genre[]>([]);
  const [rooms,    setRooms]    = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const u1 = subscribeToMovies(setMovies);
    const u2 = subscribeToGenres(setGenres);
    const u3 = subscribeToRooms(setRooms);
    const u4 = subscribeToAllBookings(setBookings);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const activeBookings = bookings.filter(b => b.status !== 'cancelled');
  const totalTickets   = activeBookings.reduce((sum, b) => sum + b.seats.length, 0);
  const totalRevenue   = activeBookings.reduce((sum, b) => sum + (b.isFree ? 0 : b.totalPrice), 0);

  const moviePopularity = movies
    .map(m => ({
      label: m.title,
      value: activeBookings.filter(b => b.movieId === m.id).reduce((sum, b) => sum + b.seats.length, 0),
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const roomActivity = rooms
    .map(r => ({
      label: r.name,
      value: activeBookings.filter(b => b.roomId === r.id).length,
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const genreBreakdown = genres
    .map(g => {
      const movieIds = movies.filter(m => m.genreId === g.id).map(m => m.id);
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
        <h2>Report Analytics</h2>
        <p>Insights across all cinema rooms and user activity.</p>
      </div>

      <div className="stats-grid">
        <StatCard icon={<Film size={22} />}      value={movies.length}                label="Movies in System"   delay={1} />
        <StatCard icon={<Building2 size={22} />} value={rooms.length}                 label="Cinema Rooms"       delay={2} />
        <StatCard icon={<Ticket size={22} />}    value={totalTickets.toLocaleString()} label="Total Tickets Sold" delay={3} />
        <StatCard
          icon={<DollarSign size={22} />}
          value={`RM ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          label="Total Revenue"
          delay={4}
        />
      </div>

      <div className="two-col">
        <Card title="Movie Popularity (tickets sold)">
          <div className="card-body">
            {moviePopularity.length > 0 ? <BarChart data={moviePopularity} /> : <EmptyChart text="No ticket sales yet." />}
          </div>
        </Card>
        <Card title="Room Activity (bookings)">
          <div className="card-body">
            {roomActivity.length > 0 ? <BarChart data={roomActivity} /> : <EmptyChart text="No bookings yet." />}
          </div>
        </Card>
      </div>

      <Card title="Genre Breakdown (tickets sold)">
        <div className="card-body">
          {genreBreakdown.length > 0 ? <BarChart data={genreBreakdown} /> : <EmptyChart text="No data yet." />}
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
