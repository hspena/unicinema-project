import React, { useState, useEffect } from 'react';
import { Button, Modal, Badge } from './ui';
import SeatMap from './ui/SeatMap';
import { Room, RoomTemplate, subscribeToTemplates } from '../services/templateService';
import { Movie, subscribeToMovies, Genre, subscribeToGenres } from '../services/movieService';
import { Schedule, subscribeToRoomSchedules, autoStatus, formatDate, todayString } from '../services/scheduleService';
import { createBooking, getBookedSeats } from '../services/bookingService';
import { createNotification } from '../services/notificationService';
import { getNotificationPrefs } from '../utils/preferences';
import { subscribeToUsers } from '../services/userService';
import { User } from '../types';
import {
  Check, ArrowLeft, ArrowRight, Hourglass, AlertTriangle, User as UserIcon,
  Search, X, Film, CircleDot, Clock, PartyPopper, IconGlyph,
} from '../utils/icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingMode = 'account' | 'guest';

interface WalkupBookingProps {
  room:     Room;
  open:     boolean;
  onClose:  () => void;
  onBooked?: (ticketCode: string, name: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateTicketCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'TKT-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ─── Component ────────────────────────────────────────────────────────────────

const WalkupBooking = ({ room, open, onClose, onBooked }: WalkupBookingProps) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  // Step 1: choose mode + guest/account info
  // Step 2: pick show
  // Step 3: pick seats
  // Step 4: confirm + done

  const [mode,          setMode]          = useState<BookingMode>('guest');
  const [guestName,     setGuestName]     = useState('');
  const [userSearch,    setUserSearch]    = useState('');
  const [selectedUser,  setSelectedUser]  = useState<User | null>(null);
  const [allUsers,      setAllUsers]      = useState<User[]>([]);

  const [movies,        setMovies]        = useState<Movie[]>([]);
  const [genres,        setGenres]        = useState<Genre[]>([]);
  const [templates,     setTemplates]     = useState<RoomTemplate[]>([]);
  const [schedules,     setSchedules]     = useState<Schedule[]>([]);

  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [bookedSeats,      setBookedSeats]      = useState<string[]>([]);
  const [chosenSeats,      setChosenSeats]      = useState<string[]>([]);
  const [seatsLoading,     setSeatsLoading]     = useState(false);

  const [isSaving,     setIsSaving]     = useState(false);
  const [error,        setError]        = useState('');
  const [doneTicket,   setDoneTicket]   = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    const u1 = subscribeToMovies(setMovies);
    const u2 = subscribeToGenres(setGenres);
    const u3 = subscribeToTemplates(setTemplates);
    const u4 = subscribeToRoomSchedules(room.id, setSchedules);
    const u5 = subscribeToUsers(users => setAllUsers(users.filter(u => u.role === 'Moviegoer')));
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [open, room.id]);

  const template = templates.find(t => t.id === room.templateId) ?? null;

  // Today's upcoming / running shows
  const todayStr    = todayString();
  const liveShows   = schedules.filter(s =>
    s.date === todayStr &&
    ['upcoming', 'running'].includes(autoStatus(s.date, s.startTime, s.endTime))
  ).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // User search results
  const userResults = userSearch.trim().length > 1
    ? allUsers.filter(u =>
        u.name.toLowerCase().includes(userSearch.toLowerCase())             ||
        (u as any).username?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
      ).slice(0, 6)
    : [];

  const patronName = mode === 'guest'
    ? guestName.trim()
    : (selectedUser ? ((selectedUser as any).displayName || selectedUser.name) : '');

  // ── Reset on close ─────────────────────────────────────────────────────────
  const handleClose = () => {
    setStep(1); setMode('guest'); setGuestName(''); setUserSearch('');
    setSelectedUser(null); setSelectedSchedule(null);
    setChosenSeats([]); setBookedSeats([]); setError('');
    setDoneTicket(null);
    onClose();
  };

  // ── Select show → load booked seats ───────────────────────────────────────
  const handleSelectShow = async (s: Schedule) => {
    setSelectedSchedule(s);
    setChosenSeats([]);
    setSeatsLoading(true);
    try {
      const seats = await getBookedSeats(s.id);
      setBookedSeats(seats);
    } finally {
      setSeatsLoading(false);
    }
  };

  // ── Confirm booking + immediate check-in ──────────────────────────────────
  const handleConfirm = async () => {
    if (!selectedSchedule || chosenSeats.length === 0) return;
    setIsSaving(true);
    setError('');
    try {
      const movie      = movies.find(m => m.id === selectedSchedule.movieId);
      const isFree     = selectedSchedule.freeTickets ?? false;
      const userId     = mode === 'account' && selectedUser ? selectedUser.id : 'GUEST';
      const userName   = patronName;
      const userEmail  = mode === 'account' && selectedUser ? selectedUser.email : '';

      const booking = await createBooking({
        scheduleId: selectedSchedule.id,
        roomId:     room.id,
        movieId:    selectedSchedule.movieId,
        movieTitle: movie?.title ?? '—',
        showDate:   selectedSchedule.date,
        showTime:   selectedSchedule.startTime,
        userId,
        userName,
        userEmail,
        seats:      chosenSeats,
        totalPrice: isFree ? 0 : chosenSeats.length * (movie?.price ?? 10),
        isFree,
        paid:       true,          // paid at the counter on walk-up
        status:     'checked-in',  // ← immediately checked in
      });

      // Also mark checkedInAt
      const { update, ref } = await import('firebase/database');
      const { db } = await import('../config/firebase');
      await update(ref(db, `bookings/${booking.id}`), {
        checkedInAt: new Date().toISOString(),
      });

      // If booked under a real account, let that moviegoer know (if opted in).
      if (mode === 'account' && selectedUser &&
          (await getNotificationPrefs(selectedUser.id)).bookingConfirmations) {
        createNotification(selectedUser.id, {
          type:    'booking',
          title:   'Booking confirmed',
          message: `${movie?.title ?? 'Movie'} · ${chosenSeats.join(', ')} · ${booking.ticketCode}`,
        });
      }

      setDoneTicket({ code: booking.ticketCode, name: userName });
      setStep(4);
      onBooked?.(booking.ticketCode, userName);
    } catch (e: any) {
      setError(e.message ?? 'Booking failed.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Step titles ────────────────────────────────────────────────────────────
  const titles = ['', 'Patron Details', 'Select Show', 'Select Seats', 'Done'];

  return (
    <Modal
      title={`Walk-up Booking — ${titles[step]}`}
      open={open}
      onClose={handleClose}
      footer={
        step === 4 ? (
          <Button onClick={handleClose}><Check size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Done</Button>
        ) : step === 1 ? (
          <>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={() => {
                if (mode === 'guest' && !guestName.trim()) { setError('Please enter the guest name.'); return; }
                if (mode === 'account' && !selectedUser)   { setError('Please select an account.'); return; }
                setError(''); setStep(2);
              }}
            >
              Next <ArrowRight size={14} style={{ verticalAlign: -2, marginLeft: 4 }} />
            </Button>
          </>
        ) : step === 2 ? (
          <>
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Back</Button>
            <Button
              onClick={() => {
                if (!selectedSchedule) { setError('Please select a show.'); return; }
                setError(''); setStep(3);
              }}
            >
              Next <ArrowRight size={14} style={{ verticalAlign: -2, marginLeft: 4 }} />
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Back</Button>
            <Button onClick={handleConfirm} disabled={isSaving || chosenSeats.length === 0}>
              {isSaving
                ? <><Hourglass size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Booking…</>
                : <><Check size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Check In ({chosenSeats.length} seat{chosenSeats.length !== 1 ? 's' : ''})</>}
            </Button>
          </>
        )
      }
    >
      {/* ── Step indicator ── */}
      {step < 4 && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700,
                background: step >= n ? 'var(--gold)' : 'var(--surface-raised)',
                color:      step >= n ? 'var(--navy)' : 'var(--text-muted)',
                border:     step >= n ? 'none' : '1px solid var(--border)',
                transition: 'all var(--transition)',
              }}>{n}</div>
              {n < 3 && (
                <div style={{
                  flex: 1, height: 2,
                  background: step > n ? 'var(--gold)' : 'var(--border)',
                  transition: 'background var(--transition)',
                }} />
              )}
            </div>
          ))}
        </div>
      )}

      {error && <div className="auth-error" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {error}</div>}

      {/* ══ STEP 1: Patron ══ */}
      {step === 1 && (
        <div>
          {/* Mode selector */}
          <div className="login-tabs" style={{ marginBottom: 18 }}>
            <button
              className={`login-tab ${mode === 'guest' ? 'active' : ''}`}
              onClick={() => { setMode('guest'); setSelectedUser(null); setError(''); }}
            >
              <UserIcon size={14} style={{ verticalAlign: -2, marginRight: 5 }} /> Walk-in Guest
            </button>
            <button
              className={`login-tab ${mode === 'account' ? 'active' : ''}`}
              onClick={() => { setMode('account'); setGuestName(''); setError(''); }}
            >
              <Search size={14} style={{ verticalAlign: -2, marginRight: 5 }} /> Find Account
            </button>
          </div>

          {mode === 'guest' ? (
            <>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                The moviegoer doesn't have an account. Enter their name and the booking will be
                created as a guest check-in — no account required.
              </div>
              <div className="input-group">
                <label className="input-label">Guest Name *</label>
                <input
                  className="input-field"
                  placeholder="e.g. Ahmad Fadzli"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  autoFocus
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                The moviegoer has an account. Search by name, username, or email.
              </div>
              <div className="input-group">
                <label className="input-label">Search Moviegoer</label>
                <input
                  className="input-field"
                  placeholder="Name, @username or email…"
                  value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); setSelectedUser(null); }}
                  autoFocus
                />
              </div>

              {/* Search results */}
              {userResults.length > 0 && !selectedUser && (
                <div style={{
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  overflow: 'hidden', marginTop: -8,
                }}>
                  {userResults.map(u => (
                    <div
                      key={u.id}
                      onClick={() => { setSelectedUser(u); setUserSearch((u as any).displayName || u.name); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--navy)',
                        transition: 'background var(--transition)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-raised)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--navy)')}
                    >
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                        {((u as any).displayName || u.name)[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.83rem', fontWeight: 500 }}>
                          {(u as any).displayName || u.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          @{(u as any).username || '—'} · {u.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected user chip */}
              {selectedUser && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: 'var(--gold-dim)', border: '1px solid var(--gold)',
                  borderRadius: 'var(--radius)',
                }}>
                  <div className="avatar" style={{ width: 36, height: 36 }}>
                    {((selectedUser as any).displayName || selectedUser.name)[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {(selectedUser as any).displayName || selectedUser.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      @{(selectedUser as any).username} · {selectedUser.email}
                    </div>
                  </div>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}
                    onClick={() => { setSelectedUser(null); setUserSearch(''); }}
                  ><X size={15} /></button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ STEP 2: Show ══ */}
      {step === 2 && (
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            Booking for: <strong style={{ color: 'var(--gold)' }}>{patronName}</strong>
            {mode === 'guest' && <Badge variant="muted" style={{ marginLeft: 8 }}>Guest</Badge>}
          </div>

          {liveShows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.83rem' }}>
              No upcoming shows for today in this room.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {liveShows.map(s => {
                const movie   = movies.find(m => m.id === s.movieId);
                const genre   = genres.find(g => g.id === movie?.genreId);
                const isSelected = selectedSchedule?.id === s.id;
                const status  = autoStatus(s.date, s.startTime, s.endTime);

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectShow(s)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', cursor: 'pointer',
                      borderRadius: 'var(--radius)',
                      border: `2px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--gold-dim)' : 'var(--navy)',
                      transition: 'all var(--transition)',
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                      background: movie?.color || genre?.color || '#1a1628',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <IconGlyph iconKey={movie?.emoji || genre?.emoji} size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {movie?.title ?? '—'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {s.startTime} – {s.endTime} · {movie?.duration} min
                        {s.freeTickets && (
                          <span style={{
                            marginLeft: 8, padding: '0 6px',
                            background: 'var(--gold)', color: 'var(--navy)',
                            borderRadius: 99, fontSize: '0.62rem', fontWeight: 700,
                          }}>FREE</span>
                        )}
                      </div>
                    </div>
                    <Badge variant={status === 'running' ? 'success' : 'info'}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {status === 'running' ? <CircleDot size={12} /> : <Clock size={12} />}
                        {status === 'running' ? 'Now' : 'Soon'}
                      </span>
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ STEP 3: Seats ══ */}
      {step === 3 && (
        <div>
          {selectedSchedule && (
            <div style={{
              padding: '8px 12px', marginBottom: 14,
              background: 'var(--navy)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', fontSize: '0.78rem', color: 'var(--text-muted)',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>
                {movies.find(m => m.id === selectedSchedule.movieId)?.title} · {selectedSchedule.startTime}
              </span>
              <span style={{ color: 'var(--gold)' }}>
                Patron: {patronName}
              </span>
            </div>
          )}

          {seatsLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              Loading seat availability…
            </div>
          ) : template ? (
            <SeatMap
              template={template}
              bookedSeats={bookedSeats}
              onConfirm={seats => setChosenSeats(seats)}
            />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
              No seat template configured for this room.
            </div>
          )}
        </div>
      )}

      {/* ══ STEP 4: Done ══ */}
      {step === 4 && doneTicket && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ marginBottom: 14, color: 'var(--gold)', display: 'flex', justifyContent: 'center' }}><PartyPopper size={56} /></div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--success)', marginBottom: 8 }}>
            Checked In Successfully!
          </div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            {doneTicket.name} is now checked in.
            {mode === 'guest' && ' (Guest booking)'}
          </div>

          {/* Ticket code */}
          <div style={{
            display: 'inline-block', padding: '14px 28px',
            background: 'var(--gold-dim)', border: '2px dashed var(--gold)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Ticket Code
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.15em' }}>
              {doneTicket.code}
            </div>
          </div>

          <div style={{ marginTop: 20, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {chosenSeats.length} seat{chosenSeats.length !== 1 ? 's' : ''} · {selectedSchedule?.startTime}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default WalkupBooking;