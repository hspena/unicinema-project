import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import SeatMap from '../../components/ui/SeatMap';
import { Room, RoomTemplate, subscribeToRooms, subscribeToTemplates } from '../../services/templateService';
import { Movie, subscribeToMovies } from '../../services/movieService';
import { Schedule, subscribeToRoomSchedules, autoStatus, todayString, formatDate } from '../../services/scheduleService';
import {
  Booking, subscribeToScheduleBookings,
  checkInBooking, findBookingByCode,
} from '../../services/bookingService';
import { getBookedSeats } from '../../services/bookingService';

// ─── Status badge ─────────────────────────────────────────────────────────────
const statusBadge = (s: Schedule) => {
  const status = autoStatus(s.date, s.startTime, s.endTime);
  const map = {
    running:   { variant: 'success' as const, label: '🔴 Running'   },
    upcoming:  { variant: 'info'    as const, label: '⏳ Upcoming'  },
    completed: { variant: 'muted'   as const, label: '✅ Completed' },
    cancelled: { variant: 'danger'  as const, label: '❌ Cancelled' },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const StaffIndex = () => {
  const { uid } = useAuth();

  const [rooms,      setRooms]      = useState<Room[]>([]);
  const [templates,  setTemplates]  = useState<RoomTemplate[]>([]);
  const [movies,     setMovies]     = useState<Movie[]>([]);
  const [schedules,  setSchedules]  = useState<Schedule[]>([]);

  // Seat map state
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [bookedSeats,      setBookedSeats]      = useState<string[]>([]);
  const [seatLoading,      setSeatLoading]      = useState(false);

  // Check-in state
  const [ticketCode,  setTicketCode]  = useState('');
  const [scanResult,  setScanResult]  = useState<{ ok: boolean; message: string; booking?: Booking } | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  // The staff sees the first active room (in a real system, staff would be assigned to a room)
  const activeRoom     = rooms.find(r => r.status === 'active') ?? rooms[0] ?? null;
  const activeTemplate = activeRoom ? templates.find(t => t.id === activeRoom.templateId) ?? null : null;

  useEffect(() => {
    const u1 = subscribeToRooms(setRooms);
    const u2 = subscribeToTemplates(setTemplates);
    const u3 = subscribeToMovies(setMovies);
    return () => { u1(); u2(); u3(); };
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    return subscribeToRoomSchedules(activeRoom.id, setSchedules);
  }, [activeRoom?.id]);

  // Today's schedule sorted by time
  const todaySchedules = schedules
    .filter(s => s.date === todayString())
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Currently running show
  const runningShow = todaySchedules.find(
    s => autoStatus(s.date, s.startTime, s.endTime) === 'running'
  ) ?? todaySchedules[0] ?? null;

  // ── Load booked seats when schedule is selected ────────────────────────────
  const handleSelectSchedule = async (s: Schedule) => {
    setSelectedSchedule(s);
    setSeatLoading(true);
    try {
      const seats = await getBookedSeats(s.id);
      setBookedSeats(seats);
    } finally {
      setSeatLoading(false);
    }
  };

  useEffect(() => {
    if (runningShow && !selectedSchedule) {
      handleSelectSchedule(runningShow);
    }
  }, [runningShow?.id]);

  // ── Check-in by code ───────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    if (!ticketCode.trim()) return;
    setScanLoading(true);
    setScanResult(null);
    try {
      const booking = await findBookingByCode(ticketCode.trim());
      if (!booking) {
        setScanResult({ ok: false, message: `No ticket found for code "${ticketCode.toUpperCase()}".` });
      } else if (booking.roomId !== activeRoom?.id) {
        setScanResult({ ok: false, message: 'This ticket is for a different room.' });
      } else if (booking.status === 'checked-in') {
        setScanResult({ ok: false, message: 'Already checked in.', booking });
      } else if (booking.status === 'cancelled') {
        setScanResult({ ok: false, message: 'This ticket has been cancelled.', booking });
      } else {
        await checkInBooking(booking.id);
        setScanResult({ ok: true, message: `✅ ${booking.userName} — check-in successful!`, booking });
        setTicketCode('');
        // Refresh booked seats if relevant
        if (selectedSchedule && booking.scheduleId === selectedSchedule.id) {
          const seats = await getBookedSeats(selectedSchedule.id);
          setBookedSeats(seats);
        }
      }
    } finally {
      setScanLoading(false);
    }
  };

  if (!activeRoom) {
    return (
      <div className="page fade-in">
        <div className="page-header"><h2>Staff Panel</h2></div>
        <div className="empty-state">
          <div className="empty-state-icon">🏟️</div>
          <div className="empty-state-text">No active cinema room found. Contact the Cinema Room Manager.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Staff Panel — {activeRoom.name}</h2>
        <p>Today's schedule and ticket check-in.</p>
      </div>

      {/* ── Today's date banner ── */}
      <div style={{
        padding: '10px 16px', marginBottom: 20,
        background: 'var(--gold-dim)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', fontSize: '0.82rem',
        color: 'var(--gold)', fontWeight: 600,
      }}>
        📅 {formatDate(todayString())}
      </div>

      {/* ── Top row: Schedule + Check-in ── */}
      <div className="two-col" style={{ alignItems: 'start' }}>

        {/* Today's schedule */}
        <Card title="Today's Schedule">
          <div className="card-body">
            {todaySchedules.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.83rem' }}>
                No shows scheduled for today.
              </div>
            ) : (
              todaySchedules.map(s => {
                const movie    = movies.find(m => m.id === s.movieId);
                const isActive = selectedSchedule?.id === s.id;
                return (
                  <div
                    key={s.id}
                    className="schedule-slot"
                    style={{
                      cursor: 'pointer',
                      borderColor: isActive ? 'var(--gold)' : undefined,
                      background:  isActive ? 'var(--gold-dim)' : undefined,
                    }}
                    onClick={() => handleSelectSchedule(s)}
                  >
                    <div className="schedule-time">{s.startTime}</div>
                    <div className="schedule-movie" style={{ flex: 1 }}>
                      <div className="schedule-movie-name">
                        {movie?.emoji} {movie?.title ?? '—'}
                      </div>
                      <div className="schedule-movie-meta">
                        {movie?.duration} min · ends {s.endTime}
                      </div>
                    </div>
                    {statusBadge(s)}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Quick check-in */}
        <Card title="Ticket Check-In">
          <div className="card-body">
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div className="search-wrap" style={{ flex: 1 }}>
                <span className="search-icon">🎟️</span>
                <input
                  className="input-field"
                  placeholder="Ticket code e.g. TKT-A3F2KL"
                  value={ticketCode}
                  onChange={e => setTicketCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleCheckIn()}
                />
              </div>
              <Button onClick={handleCheckIn} disabled={scanLoading}>
                {scanLoading ? '⏳' : '✓ Verify'}
              </Button>
            </div>

            {scanResult && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 12,
                background: scanResult.ok ? 'rgba(76,175,130,0.1)' : 'rgba(224,92,92,0.1)',
                border: `1px solid ${scanResult.ok ? 'rgba(76,175,130,0.3)' : 'rgba(224,92,92,0.3)'}`,
                color: scanResult.ok ? 'var(--success)' : 'var(--danger)',
                fontSize: '0.83rem',
              }}>
                {scanResult.message}
                {scanResult.booking && (
                  <div style={{ marginTop: 5, fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                    {scanResult.booking.movieTitle} · {scanResult.booking.showTime} · {scanResult.booking.seats.length} seat(s)
                  </div>
                )}
              </div>
            )}

            <div style={{
              padding: 12, background: 'var(--navy)', borderRadius: 'var(--radius)',
              fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center',
            }}>
              Type the ticket code and press Enter or click Verify.
            </div>
          </div>
        </Card>
      </div>

      {/* ── Seat map for selected show ── */}
      {activeTemplate && (
        <Card
          title={
            selectedSchedule
              ? `Seat Overview — ${movies.find(m => m.id === selectedSchedule.movieId)?.title ?? '?'} @ ${selectedSchedule.startTime}`
              : 'Seat Overview'
          }
        >
          {seatLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              Loading seat data…
            </div>
          ) : (
            <SeatMap
              template={activeTemplate}
              bookedSeats={bookedSeats}
            />
          )}
          {selectedSchedule && (
            <div style={{
              padding: '8px 16px', borderTop: '1px solid var(--border)',
              fontSize: '0.75rem', color: 'var(--text-muted)',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>🔴 Booked: {bookedSeats.length}</span>
              <span>🟡 Available: {activeTemplate ? Object.values(activeTemplate.sections).reduce((s, sec) => s + sec.seatRows * sec.seatCols, 0) - bookedSeats.length : 0}</span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default StaffIndex;