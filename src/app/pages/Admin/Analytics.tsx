import React, { useEffect, useMemo, useState } from 'react';
import { StatCard, Card, Badge, BarChart, RangeFilter } from '../../components/ui';
import { Building2, Ticket, DollarSign, CheckCircle2 } from '../../utils/icons';
import { Movie, Genre, subscribeToMovies, subscribeToGenres } from '../../services/movieService';
import {
  Room, RoomTemplate, subscribeToRooms, subscribeToTemplates, templateSeatCount,
} from '../../services/templateService';
import { Schedule, subscribeToAllSchedules } from '../../services/scheduleService';
import { Booking, subscribeToAllBookings } from '../../services/bookingService';
import {
  TimeRange, computeOccupancy, computeAttendance, seatsIn, revenueOf,
  changeVs, money, pctText, rangeBounds, bookingsInRange, schedulesInRange,
} from '../../utils/metrics';

const EmptyChart = ({ text }: { text: string }) => (
  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.83rem' }}>
    {text}
  </div>
);

const Analytics = () => {
  const [movies,   setMovies]   = useState<Movie[]>([]);
  const [genres,   setGenres]   = useState<Genre[]>([]);
  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [templates, setTemplates] = useState<RoomTemplate[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookings,  setBookings]  = useState<Booking[]>([]);

  useEffect(() => {
    const u1 = subscribeToMovies(setMovies);
    const u2 = subscribeToGenres(setGenres);
    const u3 = subscribeToRooms(setRooms);
    const u4 = subscribeToAllBookings(setBookings);
    const u5 = subscribeToTemplates(setTemplates);
    const u6 = subscribeToAllSchedules(setSchedules);
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, []);

  // ── Reporting period ──────────────────────────────────────────────────────
  // Every figure and chart below is scoped to this range, so "occupancy" always
  // means occupancy *of the period you picked* rather than a lifetime average
  // that no amount of recent trading can move.
  const [range, setRange] = useState<TimeRange>('month');
  const bounds = useMemo(() => rangeBounds(range), [range]);

  const scoped     = useMemo(() => bookingsInRange(bookings, bounds), [bookings, bounds]);
  const prevScoped = useMemo(() => bookingsInRange(bookings, bounds, true), [bookings, bounds]);
  const scopedShows = useMemo(() => schedulesInRange(schedules, bounds), [schedules, bounds]);

  const totalTickets = seatsIn(scoped);
  const totalRevenue = revenueOf(scoped);

  const seatsForRoom = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    const tpl  = room && templates.find(t => t.id === room.templateId);
    return tpl ? templateSeatCount(tpl) : 0;
  };

  const occupancy   = computeOccupancy(scopedShows, scoped, seatsForRoom);
  const attendance  = computeAttendance(scoped);
  const ticketTrend = changeVs(totalTickets, seatsIn(prevScoped));
  const perTicket   = totalTickets > 0 ? totalRevenue / totalTickets : 0;
  const activeRooms = rooms.filter(r => r.status === 'active').length;

  const fmtDate = (d: Date) => d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  const rangeHint = bounds.from && bounds.to
    ? range === 'today'
      ? fmtDate(bounds.from)
      : `${fmtDate(bounds.from)} – ${fmtDate(new Date(bounds.to.getTime() - 1))}`
    : 'Every show on record';

  const moviePopularity = movies
    .map(m => ({
      label: m.title,
      value: seatsIn(scoped.filter(b => b.movieId === m.id)),
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const roomActivity = rooms
    .map(r => ({
      label: r.name,
      value: seatsIn(scoped.filter(b => b.roomId === r.id)),
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const genreBreakdown = genres
    .map(g => {
      const movieIds = movies.filter(m => m.genreId === g.id).map(m => m.id);
      return { label: g.name, value: seatsIn(scoped.filter(b => movieIds.includes(b.movieId))) };
    })
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const nothingYet = `No tickets sold ${range === 'all' ? 'yet' : `in ${bounds.label.toLowerCase()}`}.`;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Report Analytics</h2>
        <p>
          {movies.length} {movies.length === 1 ? 'movie' : 'movies'} across {activeRooms} active of{' '}
          {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}.
        </p>
      </div>

      <RangeFilter value={range} onChange={setRange} hint={rangeHint} />

      <div className="stats-grid">
        <StatCard
          icon={<Building2 size={22} />}
          value={occupancy.capacity > 0 ? pctText(occupancy.pct) : '—'}
          label="Seat Occupancy"
          sub={occupancy.capacity > 0
            ? `${occupancy.sold.toLocaleString()} of ${occupancy.capacity.toLocaleString()} seats · ${occupancy.shows} shows`
            : scopedShows.length === 0 ? 'No shows in this period' : 'No rooms with seat templates yet'}
          color="var(--gold)"
          delay={1}
        />
        <StatCard
          icon={<CheckCircle2 size={22} />}
          value={attendance.expected > 0 ? pctText(attendance.pct) : '—'}
          label="Attendance"
          sub={attendance.expected > 0
            ? `${attendance.noShows.toLocaleString()} no-shows of ${attendance.expected.toLocaleString()} booked`
            : 'No shows have finished in this period'}
          subTone={attendance.expected > 0 && attendance.pct < 75 ? 'bad' : 'muted'}
          delay={2}
        />
        <StatCard
          icon={<Ticket size={22} />}
          value={totalTickets.toLocaleString()}
          label="Tickets Sold"
          sub={range === 'all'
            ? 'Across every show on record'
            : ticketTrend ? `vs ${seatsIn(prevScoped).toLocaleString()} the period before` : 'No prior period to compare'}
          trend={ticketTrend?.label}
          trendUp={ticketTrend?.up}
          delay={3}
        />
        <StatCard
          icon={<DollarSign size={22} />}
          value={money(totalRevenue)}
          label="Revenue"
          sub={totalTickets > 0 ? `${money(perTicket)} per ticket` : nothingYet}
          delay={4}
        />
      </div>

      <div className="two-col">
        <Card title="Movie Popularity (tickets sold)" actions={<Badge variant="muted">{bounds.label}</Badge>}>
          <div className="card-body">
            {moviePopularity.length > 0 ? <BarChart data={moviePopularity} /> : <EmptyChart text={nothingYet} />}
          </div>
        </Card>
        <Card title="Room Activity (tickets sold)" actions={<Badge variant="muted">{bounds.label}</Badge>}>
          <div className="card-body">
            {roomActivity.length > 0 ? <BarChart data={roomActivity} /> : <EmptyChart text={nothingYet} />}
          </div>
        </Card>
      </div>

      <Card title="Genre Breakdown (tickets sold)" actions={<Badge variant="muted">{bounds.label}</Badge>}>
        <div className="card-body">
          {genreBreakdown.length > 0 ? <BarChart data={genreBreakdown} /> : <EmptyChart text={nothingYet} />}
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
