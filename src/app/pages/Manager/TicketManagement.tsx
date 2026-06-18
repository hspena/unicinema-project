import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal, QrScanner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { subscribeToRooms, subscribeToTemplates, Room, roomManagerIds } from '../../services/templateService';
import { Movie, subscribeToMovies } from '../../services/movieService';
import { Schedule, subscribeToRoomSchedules, formatDate } from '../../services/scheduleService';
import {
  Booking, subscribeToRoomBookings,
  checkInBooking, cancelBooking, findBookingByCode,
} from '../../services/bookingService';
import { CheckCircle2, Ticket, Hourglass, XCircle, Search, Check, ScanLine } from '../../utils/icons';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusBadge = (status: Booking['status']) => {
  const map: Record<Booking['status'], { variant: any; label: string }> = {
    'confirmed':  { variant: 'info',    label: 'Confirmed'   },
    'checked-in': { variant: 'success', label: 'Checked In'  },
    'cancelled':  { variant: 'danger',  label: 'Cancelled'   },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const TicketManagement = () => {
  const { uid } = useAuth();

  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [movies,    setMovies]    = useState<Movie[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookings,  setBookings]  = useState<Booking[]>([]);

  // Check-in by code
  const [ticketCode,    setTicketCode]    = useState('');
  const [scanResult,    setScanResult]    = useState<{ ok: boolean; message: string; booking?: Booking } | null>(null);
  const [scanLoading,   setScanLoading]   = useState(false);
  const [showScanner,   setShowScanner]   = useState(false);

  // Filters
  const [scheduleFilter, setScheduleFilter] = useState<string>('All');
  const [statusFilter,   setStatusFilter]   = useState<string>('All');
  const [search,         setSearch]         = useState('');

  // Detail modal
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  const myRoom = rooms.find(r => uid && roomManagerIds(r).includes(uid)) ?? rooms[0] ?? null;

  useEffect(() => {
    const u1 = subscribeToRooms(setRooms);
    const u2 = subscribeToMovies(setMovies);
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    if (!myRoom) return;
    const u1 = subscribeToRoomSchedules(myRoom.id, setSchedules);
    const u2 = subscribeToRoomBookings(myRoom.id, setBookings);
    return () => { u1(); u2(); };
  }, [myRoom?.id]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total      = bookings.length;
  const confirmed  = bookings.filter(b => b.status === 'confirmed').length;
  const checkedIn  = bookings.filter(b => b.status === 'checked-in').length;
  const cancelled  = bookings.filter(b => b.status === 'cancelled').length;

  // ── Filtered bookings ──────────────────────────────────────────────────────
  const filtered = bookings.filter(b => {
    const matchSchedule = scheduleFilter === 'All' || b.scheduleId === scheduleFilter;
    const matchStatus   = statusFilter   === 'All' || b.status     === statusFilter;
    const q             = search.toLowerCase();
    const matchSearch   =
      b.userName.toLowerCase().includes(q)    ||
      b.ticketCode.toLowerCase().includes(q)  ||
      b.movieTitle.toLowerCase().includes(q)  ||
      b.userEmail.toLowerCase().includes(q);
    return matchSchedule && matchStatus && matchSearch;
  }).sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());

  // ── Ticket code check-in (shared by typed code and scanned QR) ──────────────
  const handleScanCheckIn = async (rawCode?: string) => {
    const code = (rawCode ?? ticketCode).trim();
    if (!code) return;
    setScanLoading(true);
    setScanResult(null);
    try {
      const booking = await findBookingByCode(code);
      if (!booking) {
        setScanResult({ ok: false, message: `No ticket found with code "${code.toUpperCase()}".` });
      } else if (booking.roomId !== myRoom?.id) {
        setScanResult({ ok: false, message: 'This ticket is for a different cinema room.' });
      } else if (booking.status === 'checked-in') {
        setScanResult({ ok: false, message: 'This ticket has already been checked in.', booking });
      } else if (booking.status === 'cancelled') {
        setScanResult({ ok: false, message: 'This ticket has been cancelled.', booking });
      } else {
        await checkInBooking(booking.id);
        setScanResult({ ok: true, message: `${booking.userName} checked in successfully!`, booking });
        setTicketCode('');
      }
    } finally {
      setScanLoading(false);
    }
  };

  // ── QR scan → check-in ───────────────────────────────────────────────────────
  const handleQrScanned = (text: string) => {
    setShowScanner(false);
    setTicketCode(text.toUpperCase());
    handleScanCheckIn(text);
  };

  const handleCheckIn = async (b: Booking) => {
    if (b.status !== 'confirmed') return;
    await checkInBooking(b.id);
    setDetailBooking(null);
  };

  const handleCancel = async (b: Booking) => {
    if (!window.confirm(`Cancel booking ${b.ticketCode}?`)) return;
    await cancelBooking(b.id);
    setDetailBooking(null);
  };

  if (!myRoom) {
    return (
      <div className="page fade-in">
        <div className="page-header"><h2>Ticket Management</h2></div>
        <div className="empty-state">
          <div className="empty-state-icon"><Ticket size={32} /></div>
          <div className="empty-state-text">No cinema room assigned. Contact the Admin.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Ticket Management</h2>
        <p>{myRoom.name} — view and manage all bookings and check-ins.</p>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { icon: <Ticket size={20} />,      value: total,     label: 'Total Bookings' },
          { icon: <CheckCircle2 size={20} />, value: checkedIn, label: 'Checked In'     },
          { icon: <Hourglass size={20} />,    value: confirmed, label: 'Pending Entry'  },
          { icon: <XCircle size={20} />,      value: cancelled, label: 'Cancelled'      },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Quick check-in panel ── */}
      <Card title="Quick Check-In" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div className="search-wrap" style={{ flex: 1 }}>
              <span className="search-icon"><Ticket size={14} /></span>
              <input
                className="input-field"
                placeholder="Enter ticket code e.g. TKT-A3F2KL…"
                value={ticketCode}
                onChange={e => setTicketCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleScanCheckIn()}
              />
            </div>
            <Button variant="outline" onClick={() => { setScanResult(null); setShowScanner(true); }} icon={<ScanLine size={14} />}>
              Scan QR
            </Button>
            <Button onClick={() => handleScanCheckIn()} disabled={scanLoading} icon={scanLoading ? <Hourglass size={14} /> : <Check size={14} />}>
              {scanLoading ? '' : 'Check In'}
            </Button>
          </div>

          {scanResult && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--radius)',
              background: scanResult.ok ? 'rgba(76,175,130,0.1)' : 'rgba(224,92,92,0.1)',
              border: `1px solid ${scanResult.ok ? 'rgba(76,175,130,0.3)' : 'rgba(224,92,92,0.3)'}`,
              color: scanResult.ok ? 'var(--success)' : 'var(--danger)',
              fontSize: '0.83rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {scanResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {scanResult.message}
              </div>
              {scanResult.booking && (
                <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {scanResult.booking.movieTitle} · {scanResult.booking.showTime} · Seats: {scanResult.booking.seats.length}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ── Filters ── */}
      <div className="table-toolbar" style={{ marginBottom: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 180 }}>
          <span className="search-icon"><Search size={14} /></span>
          <input
            className="input-field"
            placeholder="Search name, email, ticket code, movie…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="select-field" style={{ width: 'auto' }}
          value={scheduleFilter}
          onChange={e => setScheduleFilter(e.target.value)}
        >
          <option value="All">All Shows</option>
          {schedules.map(s => {
            const movie = movies.find(m => m.id === s.movieId);
            return (
              <option key={s.id} value={s.id}>
                {s.date} {s.startTime} — {movie?.title ?? '?'}
              </option>
            );
          })}
        </select>

        <select
          className="select-field" style={{ width: 'auto' }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked-in">Checked In</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* ── Bookings list ── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Ticket size={32} /></div>
          <div className="empty-state-text">
            {bookings.length === 0 ? 'No bookings yet.' : 'No bookings match your filters.'}
          </div>
        </div>
      ) : (
        filtered.map(b => (
          <div
            key={b.id}
            className="ticket-card"
            style={{ cursor: 'pointer' }}
            onClick={() => setDetailBooking(b)}
          >
            <div className="ticket-card-top">
              <div className="avatar">{b.userName[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>{b.userName}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {b.userEmail} · <span style={{ color: 'var(--gold)' }}>{b.ticketCode}</span>
                </div>
              </div>
              {statusBadge(b.status)}
            </div>
            <div className="ticket-card-divider" />
            <div className="ticket-card-bottom">
              <div>
                <div className="ticket-info-label">Movie</div>
                <div className="ticket-info-value">{b.movieTitle}</div>
              </div>
              <div>
                <div className="ticket-info-label">Show</div>
                <div className="ticket-info-value">{b.showDate} · {b.showTime}</div>
              </div>
              <div>
                <div className="ticket-info-label">Seats</div>
                <div className="ticket-info-value">{b.seats.length} seat{b.seats.length !== 1 ? 's' : ''}</div>
              </div>
              <div>
                <div className="ticket-info-label">Total</div>
                <div className="ticket-info-value" style={{ color: 'var(--gold)' }}>
                  RM {b.totalPrice.toFixed(2)}
                </div>
              </div>
              {b.status === 'confirmed' && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                  <Button
                    size="sm"
                    onClick={e => { e.stopPropagation(); handleCheckIn(b); }}
                    icon={<Check size={13} />}
                  >
                    Check In
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {/* ── QR Scanner Modal ── */}
      <Modal
        title="Scan Ticket QR"
        open={showScanner}
        onClose={() => setShowScanner(false)}
        footer={<Button variant="outline" onClick={() => setShowScanner(false)}>Cancel</Button>}
      >
        <QrScanner
          active={showScanner}
          onScan={handleQrScanned}
          onError={msg => { setShowScanner(false); setScanResult({ ok: false, message: msg }); }}
        />
      </Modal>

      {/* ── Detail Modal ── */}
      <Modal
        title={`Booking — ${detailBooking?.ticketCode}`}
        open={!!detailBooking}
        onClose={() => setDetailBooking(null)}
        footer={
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            {detailBooking?.status === 'confirmed' && (
              <Button variant="danger" onClick={() => handleCancel(detailBooking!)}>
                Cancel Booking
              </Button>
            )}
            <div style={{ flex: 1 }} />
            {detailBooking?.status === 'confirmed' && (
              <Button onClick={() => handleCheckIn(detailBooking!)} icon={<Check size={14} />}>
                Check In
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailBooking(null)}>Close</Button>
          </div>
        }
      >
        {detailBooking && (
          <div>
            {/* Guest info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div className="avatar" style={{ width: 48, height: 48, fontSize: '1.2rem' }}>
                {detailBooking.userName[0]}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{detailBooking.userName}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{detailBooking.userEmail}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>{statusBadge(detailBooking.status)}</div>
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Ticket Code',  value: detailBooking.ticketCode },
                { label: 'Movie',        value: detailBooking.movieTitle },
                { label: 'Show Date',    value: detailBooking.showDate },
                { label: 'Show Time',    value: detailBooking.showTime },
                { label: 'Seats',        value: `${detailBooking.seats.length} seat(s)` },
                { label: 'Total Paid',   value: `RM ${detailBooking.totalPrice.toFixed(2)}` },
                { label: 'Booked At',    value: new Date(detailBooking.bookedAt).toLocaleString('en-MY') },
                { label: 'Checked In',   value: detailBooking.checkedInAt
                    ? new Date(detailBooking.checkedInAt).toLocaleString('en-MY')
                    : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  padding: '8px 12px', background: 'var(--navy)',
                  borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  <div style={{ fontSize: '0.82rem', color: label === 'Ticket Code' ? 'var(--gold)' : 'var(--text-primary)', marginTop: 3, fontWeight: label === 'Ticket Code' ? 700 : 400 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Seat IDs */}
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4 }}>Seat IDs</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {detailBooking.seats.map(s => (
                <span key={s} style={{
                  padding: '2px 8px', borderRadius: 4,
                  background: 'var(--gold-dim)', color: 'var(--gold)',
                  fontSize: '0.72rem', fontWeight: 600, border: '1px solid var(--border)',
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TicketManagement;