import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, Button, Modal, QrScanner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import SeatMap from '../../components/ui/SeatMap';
import { Room, RoomTemplate, subscribeToRooms, subscribeToTemplates } from '../../services/templateService';
import { Movie, subscribeToMovies } from '../../services/movieService';
import { Schedule, subscribeToRoomSchedules, autoStatus, todayString, formatDate } from '../../services/scheduleService';
import { Booking, checkInBooking, findBookingByCode, getBookedSeats } from '../../services/bookingService';
import WalkupBooking from '../../components/WalkupBooking';
import GuestReviewModal, { ReviewableBooking } from '../../components/GuestReviewModal';
import {
  IconGlyph, Calendar, X, Building2, Ticket, Hourglass, Check,
  CheckCircle2, CircleDot, XCircle, Maximize, ScanLine, Star,
} from '../../utils/icons';


// ─── Fullscreen Carousel ──────────────────────────────────────────────────────

const FullscreenSchedule = ({
  schedules, movies, onClose,
}: {
  schedules: Schedule[];
  movies:    Movie[];
  onClose:   () => void;
}) => {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance every 6 seconds
  useEffect(() => {
    if (schedules.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIdx(p => (p + 1) % schedules.length);
    }, 6000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [schedules.length]);

  const goTo = (n: number) => {
    setIdx((n + schedules.length) % schedules.length);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  if (schedules.length === 0) {
    return (
      <div style={overlay}>
        <div style={overlayInner}>
          <div style={{ marginBottom: 20 }}><Calendar size={64} /></div>
          <div style={{ fontSize: '1.4rem', color: '#fff' }}>No shows scheduled today.</div>
          <button style={{ ...closeBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={onClose}><X size={14} /> Close</button>
        </div>
      </div>
    );
  }

  const s      = schedules[idx];
  const movie  = movies.find(m => m.id === s.movieId);
  const status = autoStatus(s.date, s.startTime, s.endTime);

  const statusLabel = {
    running:   { text: 'NOW PLAYING', color: '#4caf82', pulse: true },
    upcoming:  { text: 'UP NEXT',     color: '#c9a84c', pulse: false },
    completed: { text: 'COMPLETED',   color: '#888',    pulse: false },
    cancelled: { text: 'CANCELLED',   color: '#e05c5c', pulse: false },
  }[status];

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...overlayContent, background: movie?.color || '#0f1628' }}
        onClick={e => e.stopPropagation()}>

        {/* Close button */}
        <button style={{ ...closeBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}><X size={16} /></button>

        {/* Navigation arrows */}
        {schedules.length > 1 && (
          <>
            <button style={{ ...navBtn, left: 24 }} onClick={() => goTo(idx - 1)}>‹</button>
            <button style={{ ...navBtn, right: 24 }} onClick={() => goTo(idx + 1)}>›</button>
          </>
        )}

        {/* Status label */}
        <div style={{
          fontSize: '0.85rem', letterSpacing: '0.25em', fontWeight: 700,
          color: statusLabel.color,
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28,
          animation: statusLabel.pulse ? 'pulse 2s infinite' : 'none',
        }}>
          {statusLabel.pulse && (
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: statusLabel.color, display: 'inline-block',
            }} />
          )}
          {statusLabel.text}
        </div>

        {/* Movie icon */}
        <div style={{ marginBottom: 24, color: '#fff' }}>
          <IconGlyph iconKey={movie?.emoji} size={96} />
        </div>

        {/* Title */}
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(1.8rem, 5vw, 3.2rem)',
          fontWeight: 800, color: '#fff',
          textAlign: 'center', marginBottom: 12,
          textShadow: '0 2px 20px rgba(0,0,0,0.5)',
        }}>
          {movie?.title ?? '—'}
        </div>

        {/* Time */}
        <div style={{
          fontSize: 'clamp(1rem, 3vw, 1.5rem)',
          color: 'rgba(255,255,255,0.7)',
          marginBottom: 8,
        }}>
          {s.startTime} — {s.endTime}
        </div>

        {/* Duration + free badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)' }}>
            {movie?.duration} min
          </span>
          {s.freeTickets && (
            <span style={{
              padding: '3px 12px', borderRadius: 99,
              background: '#c9a84c', color: '#0f1628',
              fontSize: '0.8rem', fontWeight: 700,
            }}>
              FREE ENTRY
            </span>
          )}
        </div>

        {/* Slide dots */}
        {schedules.length > 1 && (
          <div style={{ display: 'flex', gap: 8 }}>
            {schedules.map((_, i) => (
              <span
                key={i}
                onClick={() => goTo(i)}
                style={{
                  width: i === idx ? 28 : 8, height: 8,
                  borderRadius: 99, cursor: 'pointer',
                  background: i === idx ? '#c9a84c' : 'rgba(255,255,255,0.25)',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        )}

        {/* Mini schedule strip at bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 32px',
          background: 'rgba(0,0,0,0.35)',
          display: 'flex', gap: 16, overflowX: 'auto',
        }}>
          {schedules.map((sc, i) => {
            const mv  = movies.find(m => m.id === sc.movieId);
            const st  = autoStatus(sc.date, sc.startTime, sc.endTime);
            const col = st === 'running' ? '#4caf82' : st === 'upcoming' ? '#c9a84c' : 'rgba(255,255,255,0.3)';
            return (
              <div
                key={sc.id}
                onClick={() => goTo(i)}
                style={{
                  flexShrink: 0, cursor: 'pointer', textAlign: 'center',
                  opacity: i === idx ? 1 : 0.6,
                  borderBottom: `2px solid ${i === idx ? '#c9a84c' : 'transparent'}`,
                  paddingBottom: 4, transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', color: 'rgba(255,255,255,0.85)' }}>
                  <IconGlyph iconKey={mv?.emoji} size={20} />
                </div>
                <div style={{ fontSize: '0.68rem', color: col, fontWeight: 600 }}>{sc.startTime}</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', maxWidth: 70,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {mv?.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Overlay styles ────────────────────────────────────────────────────────────
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(0,0,0,0.85)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const overlayInner: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  color: 'rgba(255,255,255,0.6)',
};
const overlayContent: React.CSSProperties = {
  position: 'relative',
  width: '100%', maxWidth: '100vw', height: '100vh',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  padding: '40px 80px 100px',
  transition: 'background 0.5s ease',
};
const closeBtn: React.CSSProperties = {
  position: 'absolute', top: 20, right: 24,
  background: 'rgba(255,255,255,0.15)', border: 'none',
  color: '#fff', fontSize: '1rem', padding: '6px 14px',
  borderRadius: 99, cursor: 'pointer',
};
const navBtn: React.CSSProperties = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
  background: 'rgba(255,255,255,0.1)', border: 'none',
  color: '#fff', fontSize: '2.5rem', width: 52, height: 52,
  borderRadius: '50%', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const statusBadge = (s: Schedule) => {
  const st  = autoStatus(s.date, s.startTime, s.endTime);
  const map = {
    running:   { v: 'success' as const, label: 'Running',   icon: <CircleDot size={11} /> },
    upcoming:  { v: 'info'    as const, label: 'Upcoming',  icon: <Hourglass size={11} /> },
    completed: { v: 'muted'   as const, label: 'Completed', icon: <CheckCircle2 size={11} /> },
    cancelled: { v: 'danger'  as const, label: 'Cancelled', icon: <XCircle size={11} /> },
  };
  const { v, label, icon } = map[st];
  return <Badge variant={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{icon} {label}</Badge>;
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const StaffIndex = () => {
  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [templates, setTemplates] = useState<RoomTemplate[]>([]);
  const [movies,    setMovies]    = useState<Movie[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookedSeats,  setBookedSeats]  = useState<string[]>([]);
  const [seatLoading,  setSeatLoading]  = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Walk-up booking state
  const [showWalkup, setShowWalkup] = useState(false);
  const [lastWalkup, setLastWalkup] = useState<{ code: string; name: string } | null>(null);

  // Check-in
  const [ticketCode,  setTicketCode]  = useState('');
  const [scanResult,  setScanResult]  = useState<{ ok: boolean; message: string } | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Guest review collection
  const [reviewBooking, setReviewBooking] = useState<ReviewableBooking | null>(null);
  const [showReview,    setShowReview]    = useState(false);

  // Fullscreen
  const [showFullscreen, setShowFullscreen] = useState(false);

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

  const todaySchedules = schedules
    .filter(s => s.date === todayString())
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Auto-select the currently running or next upcoming show
  useEffect(() => {
    if (!todaySchedules.length || selectedSchedule) return;
    const running = todaySchedules.find(s => autoStatus(s.date, s.startTime, s.endTime) === 'running');
    const first   = running ?? todaySchedules[0];
    if (first) handleSelectSchedule(first);
  }, [todaySchedules.length]);

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

  const handleCheckIn = async (rawCode?: string) => {
    const code = (rawCode ?? ticketCode).trim();
    if (!code) return;
    setScanLoading(true);
    setScanResult(null);
    try {
      const booking = await findBookingByCode(code);
      if (!booking) {
        setScanResult({ ok: false, message: `No ticket found for "${code.toUpperCase()}".` });
      } else if (booking.roomId !== activeRoom?.id) {
        setScanResult({ ok: false, message: 'This ticket is for a different room.' });
      } else if (booking.status === 'checked-in') {
        setScanResult({ ok: false, message: `Already checked in. (${booking.userName})` });
      } else if (booking.status === 'cancelled') {
        setScanResult({ ok: false, message: 'This ticket has been cancelled.' });
      } else {
        await checkInBooking(booking.id);
        setScanResult({ ok: true, message: `${booking.userName} — checked in! (${booking.movieTitle} ${booking.showTime})` });
        setTicketCode('');
        if (selectedSchedule?.id === booking.scheduleId) {
          const seats = await getBookedSeats(selectedSchedule.id);
          setBookedSeats(seats);
        }
      }
    } finally {
      setScanLoading(false);
    }
  };

  const handleCollectReview = async () => {
    const code = ticketCode.trim();
    if (!code) { setScanResult({ ok: false, message: 'Enter the guest\'s ticket code first.' }); return; }
    setScanLoading(true);
    setScanResult(null);
    try {
      const booking = await findBookingByCode(code);
      if (!booking) {
        setScanResult({ ok: false, message: `No ticket found for "${code.toUpperCase()}".` });
        return;
      }
      setReviewBooking({
        id:         booking.id,
        movieId:    booking.movieId,
        movieTitle: booking.movieTitle,
        userName:   booking.userName,
        userId:     booking.userId,
      });
      setShowReview(true);
    } finally {
      setScanLoading(false);
    }
  };

  const handleQrScanned = (text: string) => {
    setShowScanner(false);
    setTicketCode(text.toUpperCase());
    handleCheckIn(text);
  };

  if (!activeRoom) {
    return (
      <div className="page fade-in">
        <div className="page-header"><h2>Staff Panel</h2></div>
        <div className="empty-state">
          <div className="empty-state-icon"><Building2 size={32} /></div>
          <div className="empty-state-text">No active cinema room. Contact the Cinema Room Manager.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      {showFullscreen && (
        <FullscreenSchedule
          schedules={todaySchedules}
          movies={movies}
          onClose={() => setShowFullscreen(false)}
        />
      )}

      {/* QR Scanner Modal */}
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

      <div className="page-header">
        <h2>Staff Panel — {activeRoom.name}</h2>
        <p>Today's schedule and ticket check-in.</p>
      </div>

      {/* Date banner */}
      <div style={{
        padding: '10px 16px', marginBottom: 20,
        background: 'var(--gold-dim)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', fontSize: '0.82rem',
        color: 'var(--gold)', fontWeight: 600,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={13} /> {formatDate(todayString())}
        </span>
        <Button size="sm" icon={<Maximize size={14} />} onClick={() => setShowFullscreen(true)}>
          Fullscreen View
        </Button>
      </div>

      <div className="two-col" style={{ alignItems: 'start' }}>

        {/* Schedule list */}
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
                      <div className="schedule-movie-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconGlyph iconKey={movie?.emoji} size={15} /> {movie?.title ?? '—'}
                        {s.freeTickets && (
                          <span style={{
                            marginLeft: 7, fontSize: '0.65rem', padding: '1px 5px',
                            background: 'var(--gold)', color: 'var(--navy)',
                            borderRadius: 99, fontWeight: 700,
                          }}>FREE</span>
                        )}
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

        {/* Check-in */}
        <Card title="Ticket Check-In">
          <div className="card-body">
            {/* Walk-up booking button */}
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={() => setShowWalkup(true)}
            >
              <Ticket size={14} /> Walk-up / Venue Booking
            </button>

            <div style={{
              fontSize: '0.72rem', color: 'var(--text-muted)',
              textAlign: 'center', marginBottom: 14, padding: '0 8px',
            }}>
              For guests at the venue — book and check in directly with or without an account.
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 12 }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                OR verify an existing ticket code:
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div className="search-wrap" style={{ flex: 1 }}>
                <span className="search-icon"><Ticket size={14} /></span>
                <input
                  className="input-field"
                  placeholder="Ticket code e.g. TKT-A3F2KL"
                  value={ticketCode}
                  onChange={e => setTicketCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleCheckIn()}
                />
              </div>
              <Button onClick={() => handleCheckIn()} disabled={scanLoading} icon={scanLoading ? <Hourglass size={14} /> : <Check size={14} />}>
                {scanLoading ? '' : 'Verify'}
              </Button>
            </div>

            <button
              className="btn btn-outline"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={() => { setScanResult(null); setShowScanner(true); }}
            >
              <ScanLine size={14} /> Scan Ticket QR
            </button>

            <button
              className="btn btn-outline"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={handleCollectReview}
              disabled={scanLoading}
            >
              <Star size={14} /> Collect Guest Review
            </button>
            <div style={{
              fontSize: '0.7rem', color: 'var(--text-muted)',
              textAlign: 'center', marginBottom: 12, padding: '0 8px',
            }}>
              Enter a guest's ticket code above to record their movie review.
            </div>

            {scanResult && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 10,
                background: scanResult.ok ? 'rgba(76,175,130,0.1)' : 'rgba(224,92,92,0.1)',
                border: `1px solid ${scanResult.ok ? 'rgba(76,175,130,0.3)' : 'rgba(224,92,92,0.3)'}`,
                color: scanResult.ok ? 'var(--success)' : 'var(--danger)',
                fontSize: '0.83rem',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {scanResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {scanResult.message}
              </div>
            )}

            {/* Last walk-up result */}
            {lastWalkup && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius)',
                background: 'rgba(76,175,130,0.08)', border: '1px solid rgba(76,175,130,0.25)',
                fontSize: '0.8rem',
              }}>
                <div style={{ color: 'var(--success)', fontWeight: 600, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} /> Last walk-up: {lastWalkup.name}
                </div>
                <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {lastWalkup.code}
                </div>
              </div>
            )}
          </div>
        </Card>
        {activeRoom && (
          <WalkupBooking
            room={activeRoom}
            open={showWalkup}
            onClose={() => setShowWalkup(false)}
            onBooked={(code, name) => {
              setLastWalkup({ code, name });
              // Refresh seat map if a show is selected
              if (selectedSchedule) {
                getBookedSeats(selectedSchedule.id).then(setBookedSeats);
              }
            }}
          />
        )}

        <GuestReviewModal
          open={showReview}
          onClose={() => setShowReview(false)}
          booking={reviewBooking}
          movie={reviewBooking ? movies.find(m => m.id === reviewBooking.movieId) ?? null : null}
        />
      </div>

      {/* Seat map */}
      {activeTemplate && (
        <Card
          title={
            selectedSchedule
              ? `Seat Map — ${movies.find(m => m.id === selectedSchedule.movieId)?.title ?? '?'} @ ${selectedSchedule.startTime}`
              : 'Seat Map'
          }
        >
          {seatLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              Loading seat data…
            </div>
          ) : (
            <SeatMap template={activeTemplate} bookedSeats={bookedSeats} />
          )}
          {selectedSchedule && (
            <div style={{
              padding: '8px 16px', borderTop: '1px solid var(--border)',
              fontSize: '0.75rem', color: 'var(--text-muted)',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <CircleDot size={11} style={{ color: 'var(--danger)' }} /> Booked: {bookedSeats.length}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <CircleDot size={11} style={{ color: 'var(--gold)' }} /> Available: {
                  Object.values(activeTemplate.sections)
                    .reduce((s, sec) => s + sec.seatRows * sec.seatCols, 0) - bookedSeats.length
                }
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default StaffIndex;