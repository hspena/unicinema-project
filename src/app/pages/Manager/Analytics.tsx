import React, { useEffect, useMemo, useState } from 'react';
import { StatCard, Card, Badge, BarChart, RangeFilter } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { Building2, Ticket, DollarSign, CheckCircle2, Popcorn } from '../../utils/icons';
import { Movie, Genre, subscribeToMovies, subscribeToGenres } from '../../services/movieService';
import {
  Room, RoomTemplate, subscribeToRooms, subscribeToTemplates, templateSeatCount, roomManagerIds,
} from '../../services/templateService';
import { Schedule, subscribeToRoomSchedules } from '../../services/scheduleService';
import { Booking, subscribeToRoomBookings } from '../../services/bookingService';
import {
  TimeRange, computeOccupancy, computeAttendance, seatsIn, revenueOf,
  snackRevenueOf, snackItemsIn,
  changeVs, money, pctText, rangeBounds, bookingsInRange, schedulesInRange,
} from '../../utils/metrics';

const EmptyChart = ({ text }: { text: string }) => (
  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.83rem' }}>
    {text}
  </div>
);

const Analytics = () => {
  const { uid } = useAuth();

  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [templates, setTemplates] = useState<RoomTemplate[]>([]);
  const [movies,    setMovies]    = useState<Movie[]>([]);
  const [genres,    setGenres]    = useState<Genre[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [range,     setRange]     = useState<TimeRange>('month');

  useEffect(() => {
    const u1 = subscribeToRooms(setRooms);
    const u2 = subscribeToMovies(setMovies);
    const u3 = subscribeToGenres(setGenres);
    const u4 = subscribeToTemplates(setTemplates);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const myRoom = rooms.find(r => uid && roomManagerIds(r).includes(uid)) ?? rooms[0] ?? null;

  useEffect(() => {
    if (!myRoom) { setSchedules([]); setBookings([]); return; }
    const u1 = subscribeToRoomSchedules(myRoom.id, setSchedules);
    const u2 = subscribeToRoomBookings(myRoom.id, setBookings);
    return () => { u1(); u2(); };
  }, [myRoom?.id]);

  // ── Reporting period ──────────────────────────────────────────────────────
  // Declared above the no-room early return below: hooks must run in the same
  // order on every render, so they cannot sit after a conditional return.
  const bounds      = useMemo(() => rangeBounds(range), [range]);
  const scoped      = useMemo(() => bookingsInRange(bookings, bounds), [bookings, bounds]);
  const prevScoped  = useMemo(() => bookingsInRange(bookings, bounds, true), [bookings, bounds]);
  const scopedShows = useMemo(() => schedulesInRange(schedules, bounds), [schedules, bounds]);

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

  const totalTickets     = seatsIn(scoped);
  const totalRevenue     = revenueOf(scoped);
  const featuredMovieIds = Array.from(new Set(scopedShows.map(s => s.movieId)));

  // ── Operational health ────────────────────────────────────────────────────
  // "Movies featured" and "total shows" are inventory counts — they tell you
  // what you scheduled, never whether it worked. Occupancy and attendance do.
  const seatsForRoom = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    const tpl  = room && templates.find(t => t.id === room.templateId);
    return tpl ? templateSeatCount(tpl) : 0;
  };

  const occupancy   = computeOccupancy(scopedShows, scoped, seatsForRoom);
  const attendance  = computeAttendance(scoped);
  const ticketTrend = changeVs(totalTickets, seatsIn(prevScoped));
  const perTicket   = totalTickets > 0 ? totalRevenue / totalTickets : 0;

  const snackRevenue = snackRevenueOf(scoped);
  const snackItems   = snackItemsIn(scoped);
  const snackShare   = totalRevenue > 0 ? (snackRevenue / totalRevenue) * 100 : 0;

  const fmtDate = (d: Date) => d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  const rangeHint = bounds.from && bounds.to
    ? range === 'today'
      ? fmtDate(bounds.from)
      : `${fmtDate(bounds.from)} – ${fmtDate(new Date(bounds.to.getTime() - 1))}`
    : 'Every show on record';

  const nothingYet = `No tickets sold ${range === 'all' ? 'yet' : `in ${bounds.label.toLowerCase()}`}.`;

  const moviePopularity = featuredMovieIds
    .map(id => ({
      label: movies.find(m => m.id === id)?.title ?? '—',
      value: seatsIn(scoped.filter(b => b.movieId === id)),
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const genreBreakdown = genres
    .map(g => {
      const movieIds = movies.filter(m => m.genreId === g.id && featuredMovieIds.includes(m.id)).map(m => m.id);
      return { label: g.name, value: seatsIn(scoped.filter(b => movieIds.includes(b.movieId))) };
    })
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>{myRoom.name} — Analytics</h2>
        <p>
          {featuredMovieIds.length} {featuredMovieIds.length === 1 ? 'movie' : 'movies'} across{' '}
          {scopedShows.length} scheduled {scopedShows.length === 1 ? 'show' : 'shows'} in this period.
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
            : scopedShows.length === 0 ? 'No shows in this period' : 'No seat template assigned to this room'}
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
        <StatCard
          icon={<Popcorn size={22} />}
          value={money(snackRevenue)}
          label="Snack Revenue"
          sub={snackItems > 0
            ? `${snackItems.toLocaleString()} ${snackItems === 1 ? 'item' : 'items'} · ${pctText(snackShare)} of takings`
            : `No snacks sold ${range === 'all' ? 'yet' : `in ${bounds.label.toLowerCase()}`}.`}
          delay={5}
        />
      </div>

      <div className="two-col">
        <Card title="Movie Popularity (tickets sold)" actions={<Badge variant="muted">{bounds.label}</Badge>}>
          <div className="card-body">
            {moviePopularity.length > 0 ? <BarChart data={moviePopularity} /> : <EmptyChart text={nothingYet} />}
          </div>
        </Card>
        <Card title="Genre Breakdown (tickets sold)" actions={<Badge variant="muted">{bounds.label}</Badge>}>
          <div className="card-body">
            {genreBreakdown.length > 0 ? <BarChart data={genreBreakdown} /> : <EmptyChart text={nothingYet} />}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
