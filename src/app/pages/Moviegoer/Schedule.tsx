import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal } from '../../components/ui';
import SeatMap from '../../components/ui/SeatMap';
import PaymentModal from '../../components/PaymentModal';
import { useAuth }     from '../../context/AuthContext';
import { Movie, subscribeToMovies, Genre, subscribeToGenres } from '../../services/movieService';
import { Room, RoomTemplate, subscribeToRooms, subscribeToTemplates } from '../../services/templateService';
import {
  Schedule as ScheduleItem,
  subscribeToAllSchedules,
  formatDate, todayString, snacksAllowed,
} from '../../services/scheduleService';
import { createBooking, getBookedSeats, BookingSnack } from '../../services/bookingService';
import SnackSelector, { SnackSummary, snacksTotal } from '../../components/SnackSelector';
import { getUserById } from '../../services/userService';
import { createNotification } from '../../services/notificationService';
import { getNotificationPrefs } from '../../utils/preferences';
import {
  IconGlyph, CircleDot, Hourglass, CheckCircle2, XCircle, Folder, Calendar,
  Ticket, PartyPopper, CreditCard, AlertTriangle,
} from '../../utils/icons';

// Price charged per seat for paid (non-free) shows, in RM.
const SEAT_PRICE = 10;

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
  running:   { variant: 'success' as const, label: 'Now Playing', icon: <CircleDot size={11} /> },
  upcoming:  { variant: 'info'    as const, label: 'Upcoming',    icon: <Hourglass size={11} /> },
  completed: { variant: 'muted'   as const, label: 'Completed',   icon: <CheckCircle2 size={11} /> },
  cancelled: { variant: 'danger'  as const, label: 'Cancelled',   icon: <XCircle size={11} /> },
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
  label: React.ReactNode; active: boolean; onClick: () => void; count: number;
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
  const { role, uid } = useAuth();
  const isMoviegoer = role === 'Moviegoer';

  const [movies,    setMovies]    = useState<Movie[]>([]);
  const [genres,    setGenres]    = useState<Genre[]>([]);
  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [templates, setTemplates] = useState<RoomTemplate[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  // Moviegoers default to 'today', others default to 'today' but can see all
  const [bucket, setBucket] = useState<TimeBucket>('today');

  // ── Booking flow state ──
  const [userProfile,      setUserProfile]      = useState<{ displayName: string; username: string } | null>(null);
  const [bookingSchedule,  setBookingSchedule]  = useState<ScheduleItem | null>(null);
  const [bookedSeats,      setBookedSeats]      = useState<string[]>([]);
  const [chosenSeats,      setChosenSeats]      = useState<string[]>([]);
  const [chosenSnacks,     setChosenSnacks]     = useState<BookingSnack[]>([]);
  const [seatError,        setSeatError]        = useState('');
  const [seatsLoading,     setSeatsLoading]     = useState(false);
  const [showSeatModal,    setShowSeatModal]    = useState(false);
  const [showSnackModal,   setShowSnackModal]   = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isBooking,        setIsBooking]        = useState(false);
  const [bookingDone,      setBookingDone]      = useState<{ ticketCode: string; isFree: boolean } | null>(null);

  useEffect(() => {
    const u1 = subscribeToMovies(setMovies);
    const u2 = subscribeToGenres(setGenres);
    const u3 = subscribeToRooms(setRooms);
    const u4 = subscribeToAllSchedules(setSchedules);
    const u5 = subscribeToTemplates(setTemplates);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  useEffect(() => {
    if (!uid) return;
    getUserById(uid).then(u => {
      if (u) setUserProfile({
        displayName: (u as any).displayName || u.name,
        username:    (u as any).username    || u.name,
      });
    });
  }, [uid]);

  const bookingMovie = bookingSchedule ? movies.find(m => m.id === bookingSchedule.movieId) ?? null : null;
  const seatPrice    = bookingMovie?.price ?? SEAT_PRICE;
  const bookingRoom  = bookingSchedule ? rooms.find(r => r.id === bookingSchedule.roomId) ?? null : null;
  const bookingTemplate = bookingRoom ? templates.find(t => t.id === bookingRoom.templateId) ?? null : null;

  // ── Price breakdown ──
  const isFreeShow      = bookingSchedule?.freeTickets ?? false;
  const allowSnacks     = bookingSchedule ? snacksAllowed(bookingSchedule) : false;
  const seatCost   = isFreeShow ? 0 : chosenSeats.length * seatPrice;
  const snackCost  = snacksTotal(chosenSnacks);
  const grandTotal = seatCost + snackCost;

  // ── Open seat picker for a show ──
  const handleOpenBooking = async (s: ScheduleItem) => {
    setBookingSchedule(s);
    setChosenSeats([]);
    setChosenSnacks([]);
    setSeatError('');
    setBookingDone(null);
    setSeatsLoading(true);
    setShowSeatModal(true);
    try {
      setBookedSeats(await getBookedSeats(s.id));
    } finally {
      setSeatsLoading(false);
    }
  };

  // ── Confirm booking (paymentRef provided once a paid show has been settled) ──
  const handleBook = async (paymentRef?: string) => {
    if (!uid || !bookingSchedule || !bookingMovie || !userProfile) return;
    setIsBooking(true);
    try {
      const isFree = bookingSchedule.freeTickets ?? false;
      const booking = await createBooking({
        scheduleId: bookingSchedule.id,
        roomId:     bookingSchedule.roomId,
        movieId:    bookingMovie.id,
        movieTitle: bookingMovie.title,
        showDate:   bookingSchedule.date,
        showTime:   bookingSchedule.startTime,
        userId:     uid,
        userName:   userProfile.displayName,
        userEmail:  '',
        seats:      chosenSeats,
        ...(chosenSnacks.length ? { snacks: chosenSnacks } : {}),
        totalPrice: grandTotal,
        isFree,
        paid:       true,           // free shows are settled; paid shows reach here only after payment
        ...(paymentRef ? { paymentRef } : {}),
        status:     'confirmed',
      });
      setBookingDone({ ticketCode: booking.ticketCode, isFree });
      setShowPaymentModal(false);
      setShowConfirmModal(false);
      setShowSeatModal(false);

      if ((await getNotificationPrefs(uid)).bookingConfirmations) {
        createNotification(uid, {
          type:    'booking',
          title:   'Booking confirmed',
          message: `${bookingMovie.title} · ${chosenSeats.join(', ')} · ${booking.ticketCode}`,
        });
      }
    } finally {
      setIsBooking(false);
    }
  };

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
            label={<><Folder size={13} /> Past</>}
            active={bucket === 'past'}
            onClick={() => setBucket('past')}
            count={pastCount}
          />
        )}
        <FilterBtn
          label={<><CircleDot size={13} /> Today</>}
          active={bucket === 'today'}
          onClick={() => setBucket('today')}
          count={todayCount}
        />
        <FilterBtn
          label={<><Hourglass size={13} /> Upcoming</>}
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
            {bucket === 'past' ? <Folder size={32} /> : bucket === 'today' ? <Calendar size={32} /> : <Hourglass size={32} />}
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
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        {date === todayString() ? <><Calendar size={11} /> Today</> : formatDate(date)}
                      </div>
                    )}

                    {roomSchedules
                      .filter(s => s.date === date)
                      .map(s => {
                        const movie  = movies.find(m => m.id === s.movieId);
                        const genre  = genres.find(g => g.id === movie?.genreId);
                        const status = getStatus(s.date, s.startTime, s.endTime);
                        const { variant, label, icon } = statusConfig[status];

                        return (
                          <div key={s.id} className="schedule-slot" style={{
                            opacity: bucket === 'past' ? 0.7 : 1,
                          }}>
                            {/* Mini poster */}
                            <div style={{
                              width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                              background: movie?.color || genre?.color || '#1a1628',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <IconGlyph iconKey={movie?.emoji || genre?.emoji} size={22} />
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

                            <Badge variant={variant} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{icon} {label}</Badge>

                            {/* Moviegoers can book directly from the schedule */}
                            {isMoviegoer && (status === 'running' || status === 'upcoming') && movie && room.status === 'active' && (
                              <Button
                                size="sm"
                                icon={<Ticket size={13} />}
                                onClick={() => handleOpenBooking(s)}
                                style={{ marginLeft: 8, flexShrink: 0 }}
                              >
                                Book
                              </Button>
                            )}
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

      {/* ══ Seat Picker Modal ══ */}
      <Modal
        title={bookingSchedule
          ? `Choose Seats — ${bookingMovie?.title ?? ''} @ ${bookingSchedule.startTime}`
          : 'Choose Seats'}
        open={showSeatModal}
        onClose={() => { setShowSeatModal(false); setChosenSeats([]); setChosenSnacks([]); setSeatError(''); }}
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowSeatModal(false); setChosenSeats([]); setChosenSnacks([]); setSeatError(''); }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (chosenSeats.length === 0) { setSeatError('Please select at least one seat to continue.'); return; }
                setSeatError('');
                allowSnacks ? setShowSnackModal(true) : setShowConfirmModal(true);
              }}
            >
              Continue ({chosenSeats.length} seat{chosenSeats.length !== 1 ? 's' : ''}) →
            </Button>
          </>
        }
      >
        {bookingSchedule && (
          <>
            <div style={{ padding: '8px 12px', marginBottom: 14, background: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{formatDate(bookingSchedule.date)}</span>
              <span>{bookingSchedule.startTime} – {bookingSchedule.endTime}</span>
              <span>{bookingRoom?.name ?? '—'}</span>
            </div>

            {seatError && (
              <div className="auth-error" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} /> {seatError}
              </div>
            )}

            {seatsLoading ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                Loading seat availability…
              </div>
            ) : bookingTemplate ? (
              <SeatMap
                template={bookingTemplate}
                bookedSeats={bookedSeats}
                onChange={seats => { setChosenSeats(seats); if (seats.length) setSeatError(''); }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                No seat layout configured for this room yet.
              </div>
            )}
          </>
        )}
      </Modal>

      {/* ══ Snack Selection Modal ══ */}
      <Modal
        title="Add Snacks"
        open={showSnackModal}
        onClose={() => setShowSnackModal(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowSnackModal(false)}>Back</Button>
            <Button onClick={() => { setShowSnackModal(false); setShowConfirmModal(true); }}>
              {chosenSnacks.length > 0
                ? `Continue · RM ${snackCost.toFixed(2)} →`
                : 'Continue →'}
            </Button>
          </>
        }
      >
        <SnackSelector value={chosenSnacks} onChange={setChosenSnacks} />
      </Modal>

      {/* ══ Confirm Booking Modal ══ */}
      <Modal
        title="Confirm Booking"
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Back</Button>
            {grandTotal === 0 ? (
              <Button onClick={() => handleBook()} disabled={isBooking} icon={isBooking ? <Hourglass size={14} /> : <Ticket size={14} />}>
                {isBooking ? 'Booking…' : 'Confirm Booking'}
              </Button>
            ) : (
              <Button
                onClick={() => { setShowConfirmModal(false); setShowPaymentModal(true); }}
                disabled={isBooking}
                icon={<CreditCard size={14} />}
              >
                Proceed to Payment
              </Button>
            )}
          </>
        }
      >
        {bookingSchedule && bookingMovie && (
          <div>
            <div style={{ padding: '14px 16px', background: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{bookingMovie.title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {formatDate(bookingSchedule.date)} · {bookingSchedule.startTime}–{bookingSchedule.endTime}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {bookingRoom?.name}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Seats', value: bookingSchedule.freeTickets
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ticket size={14} /> FREE</span>
                    : `RM ${seatCost.toFixed(2)}` },
                { label: 'Snacks', value: snackCost > 0 ? `RM ${snackCost.toFixed(2)}` : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '10px 12px', background: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold)', marginTop: 3 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Snack lines */}
            {chosenSnacks.length > 0 && (
              <div style={{ padding: '10px 14px', background: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 14 }}>
                <SnackSummary snacks={chosenSnacks} />
              </div>
            )}

            {/* Grand total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--gold-dim)', border: '1px solid var(--gold)', borderRadius: 'var(--radius)', marginBottom: 14 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Total</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gold)' }}>
                {grandTotal === 0
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ticket size={14} /> FREE</span>
                  : `RM ${grandTotal.toFixed(2)}`}
              </span>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Selected seats: <span style={{ color: 'var(--gold)' }}>{chosenSeats.join(', ')}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* ══ Payment Gateway Modal (paid shows only) ══ */}
      <PaymentModal
        open={showPaymentModal}
        amount={grandTotal}
        movieTitle={bookingMovie?.title ?? ''}
        seatCount={chosenSeats.length}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={(paymentRef) => handleBook(paymentRef)}
      />

      {/* ══ Booking Confirmed Modal ══ */}
      <Modal
        title="Booking Confirmed"
        open={!!bookingDone}
        onClose={() => setBookingDone(null)}
        footer={<Button onClick={() => setBookingDone(null)}>Done</Button>}
      >
        {bookingDone && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ marginBottom: 8, color: 'var(--success)' }}><PartyPopper size={32} /></div>
            <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>Booking Confirmed!</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              {bookingMovie?.title} · {bookingSchedule && formatDate(bookingSchedule.date)} · {bookingSchedule?.startTime}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em' }}>
              {bookingDone.ticketCode}
            </div>
            {bookingDone.isFree && (
              <Badge variant="gold" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Ticket size={12} /> Free Entry
              </Badge>
            )}
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 12 }}>
              View it any time under <strong style={{ color: 'var(--gold)' }}>My Tickets</strong>.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SchedulePage;