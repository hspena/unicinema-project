import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import SeatMap from '../../components/ui/SeatMap';
import { Room, RoomTemplate, subscribeToRooms, subscribeToTemplates, templateSeatCount, updateRoom } from '../../services/templateService';
import { Movie, subscribeToMovies } from '../../services/movieService';
import { Snack, subscribeToSnacks, updateSnack, CATEGORY_ICONS } from '../../services/snackService';
import {
  Schedule, SchedulePayload,
  subscribeToRoomSchedules, createSchedule, updateSchedule, deleteSchedule,
  computeEndTime, todayString, formatDate, autoStatus, findClash,
} from '../../services/scheduleService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusBadge = (s: Schedule) => {
  const computed = autoStatus(s.date, s.startTime, s.endTime);
  const map = {
    running:   { v: 'success' as const, label: '🔴 Running'   },
    upcoming:  { v: 'info'    as const, label: '⏳ Upcoming'  },
    completed: { v: 'muted'   as const, label: '✅ Done'      },
    cancelled: { v: 'danger'  as const, label: '❌ Cancelled' },
  };
  const { v, label } = map[computed];
  return <Badge variant={v}>{label}</Badge>;
};

const emptyForm = (roomId: string, uid: string): SchedulePayload => ({
  roomId, movieId: '', date: todayString(),
  startTime: '10:00', endTime: '12:00',
  freeTickets: false, status: 'upcoming', createdBy: uid,
});

// ─── Schedule Form ────────────────────────────────────────────────────────────

const ScheduleForm = ({
  form, setForm, movies, error,
}: {
  form:    SchedulePayload;
  setForm: React.Dispatch<React.SetStateAction<SchedulePayload>>;
  movies:  Movie[];
  error:   string;
}) => {
  const selectedMovie = movies.find(m => m.id === form.movieId);

  useEffect(() => {
    if (selectedMovie && form.startTime) {
      setForm(p => ({ ...p, endTime: computeEndTime(p.startTime, selectedMovie.duration) }));
    }
  }, [form.movieId, form.startTime]);

  return (
    <>
      {error && (
        <div className="auth-error" style={{ marginBottom: 12 }}>⚠️ {error}</div>
      )}

      {/* Movie preview */}
      {selectedMovie && (
        <div style={{
          padding: '10px 14px', marginBottom: 16,
          background: selectedMovie.color || 'var(--navy)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: '1.8rem' }}>{selectedMovie.emoji}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{selectedMovie.title}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {selectedMovie.duration} min · {form.startTime} → {form.endTime}
            </div>
          </div>
        </div>
      )}

      <div className="input-group">
        <label className="input-label">Movie *</label>
        <select className="select-field" value={form.movieId}
          onChange={e => setForm(p => ({ ...p, movieId: e.target.value }))}>
          <option value="">Select a movie…</option>
          {movies.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.title} ({m.duration} min)</option>)}
        </select>
      </div>

      <div className="input-group">
        <label className="input-label">Date *</label>
        <input className="input-field" type="date" value={form.date}
          onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
      </div>

      <div className="input-row">
        <div className="input-group">
          <label className="input-label">Start Time *</label>
          <input className="input-field" type="time" value={form.startTime}
            onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} />
        </div>
        <div className="input-group">
          <label className="input-label">End Time (auto)</label>
          <input className="input-field" type="time" value={form.endTime} readOnly
            style={{ opacity: 0.6, cursor: 'not-allowed' }} />
        </div>
      </div>

      {/* Free Tickets Toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', background: 'var(--navy)',
        border: `1px solid ${form.freeTickets ? 'var(--gold)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)', marginTop: 4,
        transition: 'border-color var(--transition)',
      }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            🎟️ Free Tickets
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Moviegoers can book without payment for this show
          </div>
        </div>
        <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.freeTickets}
            onChange={e => setForm(p => ({ ...p, freeTickets: e.target.checked }))}
            style={{ opacity: 0, width: 0, height: 0 }} />
          <span style={{
            position: 'absolute', inset: 0, borderRadius: 99,
            background: form.freeTickets ? 'var(--gold-dim)' : 'var(--surface-raised)',
            border: `1px solid ${form.freeTickets ? 'var(--gold)' : 'var(--border)'}`,
            transition: 'all var(--transition)',
          }}>
            <span style={{
              position: 'absolute', width: 16, height: 16, borderRadius: '50%',
              top: '50%', transform: 'translateY(-50%)',
              left: form.freeTickets ? 'calc(100% - 18px)' : '2px',
              background: form.freeTickets ? 'var(--gold)' : 'var(--text-muted)',
              transition: 'all var(--transition)',
            }} />
          </span>
        </label>
      </div>
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const CinemaManagement = () => {
  const { uid } = useAuth();

  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [templates, setTemplates] = useState<RoomTemplate[]>([]);
  const [movies,    setMovies]    = useState<Movie[]>([]);
  const [snacks,    setSnacks]    = useState<Snack[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [tab,        setTab]        = useState<'schedule' | 'snacks'>('schedule');
  const [dateFilter, setDateFilter] = useState(todayString());

  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [editSchedule,    setEditSchedule]    = useState<Schedule | null>(null);
  const [scheduleForm,    setScheduleForm]    = useState<SchedulePayload | null>(null);
  const [formError,       setFormError]       = useState('');
  const [isSaving,        setIsSaving]        = useState(false);
  const [showSeatMap,     setShowSeatMap]     = useState(false);

  const myRoom     = rooms.find(r => r.managerId === uid) ?? rooms[0] ?? null;
  const myTemplate = myRoom ? templates.find(t => t.id === myRoom.templateId) ?? null : null;

  useEffect(() => {
    const u1 = subscribeToRooms(setRooms);
    const u2 = subscribeToTemplates(setTemplates);
    const u3 = subscribeToMovies(setMovies);
    const u4 = subscribeToSnacks(setSnacks);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  useEffect(() => {
    if (!myRoom) return;
    return subscribeToRoomSchedules(myRoom.id, setSchedules);
  }, [myRoom?.id]);

  const daySchedules = schedules
    .filter(s => s.date === dateFilter)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const openAdd = () => {
    if (!myRoom) return;
    setScheduleForm(emptyForm(myRoom.id, uid ?? ''));
    setFormError('');
    setShowAddSchedule(true);
  };

  const openEdit = (s: Schedule) => {
    setScheduleForm({
      roomId: s.roomId, movieId: s.movieId, date: s.date,
      startTime: s.startTime, endTime: s.endTime,
      freeTickets: s.freeTickets ?? false,
      status: s.status, createdBy: s.createdBy,
    });
    setFormError('');
    setEditSchedule(s);
  };

  const handleSave = async () => {
    if (!scheduleForm) return;
    if (!scheduleForm.movieId) { setFormError('Please select a movie.'); return; }
    if (!scheduleForm.date)    { setFormError('Please select a date.'); return; }

    // ── Clash check ──────────────────────────────────────────────────────────
    const clash = await findClash(
      scheduleForm.roomId,
      scheduleForm.date,
      scheduleForm.startTime,
      scheduleForm.endTime,
      editSchedule?.id
    );
    if (clash) {
      const clashMovie = movies.find(m => m.id === clash.movieId);
      setFormError(
        `Time clash with "${clashMovie?.title ?? 'another movie'}" (${clash.startTime}–${clash.endTime}). Please choose a different time.`
      );
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      if (editSchedule) {
        await updateSchedule(editSchedule.id, scheduleForm);
        setEditSchedule(null);
      } else {
        await createSchedule(scheduleForm);
        setShowAddSchedule(false);
      }
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to save schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSchedule = async (s: Schedule) => {
    const movie = movies.find(m => m.id === s.movieId);
    if (!window.confirm(`Remove "${movie?.title ?? 'this show'}"?`)) return;
    await deleteSchedule(s.id);
  };

  const handleToggleRoom = async () => {
    if (!myRoom) return;
    await updateRoom(myRoom.id, { status: myRoom.status === 'active' ? 'inactive' : 'active' });
  };

  // ── Snack toggle ───────────────────────────────────────────────────────────
  const handleToggleSnack = async (s: Snack) => {
    await updateSnack(s.id, { available: !s.available });
  };

  if (!myRoom) {
    return (
      <div className="page fade-in">
        <div className="page-header"><h2>Cinema Management</h2></div>
        <div className="empty-state">
          <div className="empty-state-icon">🏟️</div>
          <div className="empty-state-text">No cinema room assigned. Contact the Admin.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Cinema Management</h2>
        <p>Configure schedules and manage your cinema room.</p>
      </div>

      {/* ── Room banner ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', marginBottom: 20,
        background: 'var(--surface)',
        border: `1px solid ${myRoom.status === 'active' ? 'var(--success)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
            background: myRoom.status === 'active' ? 'var(--success)' : 'var(--text-muted)',
            animation: myRoom.status === 'active' ? 'pulse 2s infinite' : 'none',
          }} />
          <div>
            <div style={{ fontWeight: 600, fontFamily: 'var(--font-heading)' }}>{myRoom.name}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {myTemplate ? `${templateSeatCount(myTemplate)} seats` : 'No template'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {myTemplate && (
            <Button variant="outline" size="sm" onClick={() => setShowSeatMap(true)}>🗺️ Seat Map</Button>
          )}
          <Button
            variant={myRoom.status === 'active' ? 'danger' : 'primary'}
            size="sm"
            onClick={handleToggleRoom}
          >
            {myRoom.status === 'active' ? '⏸ Deactivate' : '▶ Activate'}
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="rm-tabs" style={{ marginBottom: 20 }}>
        <button className={`rm-tab ${tab === 'schedule' ? 'active' : ''}`} onClick={() => setTab('schedule')}>
          📅 Schedule ({schedules.length})
        </button>
        <button className={`rm-tab ${tab === 'snacks' ? 'active' : ''}`} onClick={() => setTab('snacks')}>
          🍿 Snacks ({snacks.filter(s => s.available).length} active)
        </button>
      </div>

      {/* ══ Schedule Tab ══ */}
      {tab === 'schedule' && (
        <Card
          title="Movie Schedule"
          actions={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="date" className="input-field"
                style={{ padding: '5px 10px', fontSize: '0.78rem', width: 'auto' }}
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)} />
              <Button size="sm" icon="+" onClick={openAdd}>Add Show</Button>
            </div>
          }
        >
          <div className="card-body">
            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--gold)', marginBottom: 12 }}>
              {formatDate(dateFilter)}
            </div>

            {daySchedules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                No shows for this date. Click "Add Show" to schedule one.
              </div>
            ) : (
              daySchedules.map(s => {
                const movie = movies.find(m => m.id === s.movieId);
                return (
                  <div key={s.id} className="schedule-slot">
                    <div className="schedule-time">{s.startTime}</div>
                    <div className="schedule-movie" style={{ flex: 1 }}>
                      <div className="schedule-movie-name">
                        {movie?.emoji} {movie?.title ?? '—'}
                        {s.freeTickets && (
                          <span style={{
                            marginLeft: 8, fontSize: '0.68rem', padding: '1px 6px',
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
                    <div style={{ display: 'flex', gap: 5, marginLeft: 6 }}>
                      <button className="icon-btn btn-icon" onClick={() => openEdit(s)}>✏️</button>
                      <button className="icon-btn btn-icon" style={{ color: 'var(--danger)' }}
                        onClick={() => handleDeleteSchedule(s)}>🗑️</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* ══ Snacks Tab ══ */}
      {tab === 'snacks' && (
        <Card title="Snack Configuration">
          <div className="card-body">
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Toggle snacks on or off for this room. Snack details are managed by the Admin.
            </div>
            {snacks.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                No snacks in the system yet. Ask the Admin to add some.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {snacks.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '10px 14px',
                    background: 'var(--navy)',
                    border: `1px solid ${s.available ? 'var(--border)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: 'var(--radius)',
                    opacity: s.available ? 1 : 0.5,
                    transition: 'all var(--transition)',
                  }}>
                    <span style={{ fontSize: '1.6rem' }}>{s.emoji || CATEGORY_ICONS[s.category]}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{s.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        RM {s.price.toFixed(2)} · Stock: {s.stock}
                      </div>
                    </div>
                    {/* Toggle */}
                    <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, cursor: 'pointer', flexShrink: 0 }}>
                      <input type="checkbox" checked={s.available}
                        onChange={() => handleToggleSnack(s)}
                        style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{
                        position: 'absolute', inset: 0, borderRadius: 99,
                        background: s.available ? 'var(--gold-dim)' : 'var(--surface-raised)',
                        border: `1px solid ${s.available ? 'var(--gold)' : 'var(--border)'}`,
                        transition: 'all var(--transition)',
                      }}>
                        <span style={{
                          position: 'absolute', width: 16, height: 16, borderRadius: '50%',
                          top: '50%', transform: 'translateY(-50%)',
                          left: s.available ? 'calc(100% - 18px)' : '2px',
                          background: s.available ? 'var(--gold)' : 'var(--text-muted)',
                          transition: 'all var(--transition)',
                        }} />
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Modals ── */}
      <Modal title="Add Show" open={showAddSchedule} onClose={() => setShowAddSchedule(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddSchedule(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? '⏳ Saving…' : '🎬 Add Show'}</Button>
          </>
        }
      >
        {scheduleForm && <ScheduleForm form={scheduleForm} setForm={setScheduleForm as any} movies={movies} error={formError} />}
      </Modal>

      <Modal title="Edit Show" open={!!editSchedule} onClose={() => setEditSchedule(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditSchedule(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? '⏳ Saving…' : '💾 Save Changes'}</Button>
          </>
        }
      >
        {scheduleForm && <ScheduleForm form={scheduleForm} setForm={setScheduleForm as any} movies={movies} error={formError} />}
      </Modal>

      <Modal title={`Seat Map — ${myRoom.name}`} open={showSeatMap} onClose={() => setShowSeatMap(false)}
        footer={<Button onClick={() => setShowSeatMap(false)}>Close</Button>}
      >
        {myTemplate && <SeatMap template={myTemplate} />}
      </Modal>
    </div>
  );
};

export default CinemaManagement;