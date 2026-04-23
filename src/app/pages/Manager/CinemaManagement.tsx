import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import SeatMap from '../../components/ui/SeatMap';
import {
  Room, RoomTemplate, subscribeToRooms, subscribeToTemplates,
  templateSeatCount,
} from '../../services/templateService';
import { Movie, subscribeToMovies } from '../../services/movieService';
import { Snack, subscribeToSnacks } from '../../services/snackService';
import {
  Schedule, SchedulePayload,
  subscribeToRoomSchedules, createSchedule, updateSchedule, deleteSchedule,
  computeEndTime, todayString, formatDate, autoStatus,
} from '../../services/scheduleService';
import { updateRoom } from '../../services/templateService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusBadge = (s: Schedule) => {
  const computed = autoStatus(s.date, s.startTime, s.endTime);
  const variant =
    computed === 'running'   ? 'success'  :
    computed === 'upcoming'  ? 'info'     :
    computed === 'completed' ? 'muted'    : 'danger';
  return <Badge variant={variant}>{computed}</Badge>;
};

const emptyScheduleForm = (roomId: string, uid: string): SchedulePayload => ({
  roomId,
  movieId:   '',
  date:      todayString(),
  startTime: '10:00',
  endTime:   '12:00',
  status:    'upcoming',
  createdBy: uid,
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

  // Auto-compute end time when movie or start time changes
  useEffect(() => {
    if (selectedMovie && form.startTime) {
      const end = computeEndTime(form.startTime, selectedMovie.duration);
      setForm(p => ({ ...p, endTime: end }));
    }
  }, [form.movieId, form.startTime]);

  return (
    <>
      {error && <div className="auth-error" style={{ marginBottom: 12 }}>⚠️ {error}</div>}

      {/* Preview */}
      {selectedMovie && (
        <div style={{
          padding: '10px 14px', marginBottom: 16,
          background: 'var(--navy)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 12,
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
        <select
          className="select-field"
          value={form.movieId}
          onChange={e => setForm(p => ({ ...p, movieId: e.target.value }))}
        >
          <option value="">Select a movie…</option>
          {movies.map(m => (
            <option key={m.id} value={m.id}>{m.emoji} {m.title} ({m.duration} min)</option>
          ))}
        </select>
      </div>

      <div className="input-group">
        <label className="input-label">Date *</label>
        <input
          className="input-field" type="date"
          value={form.date}
          onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
        />
      </div>

      <div className="input-row">
        <div className="input-group">
          <label className="input-label">Start Time *</label>
          <input
            className="input-field" type="time"
            value={form.startTime}
            onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
          />
        </div>
        <div className="input-group">
          <label className="input-label">End Time (auto)</label>
          <input
            className="input-field" type="time"
            value={form.endTime}
            readOnly
            style={{ opacity: 0.6, cursor: 'not-allowed' }}
          />
        </div>
      </div>
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const CinemaManagement = () => {
  const { uid } = useAuth();

  const [rooms,      setRooms]      = useState<Room[]>([]);
  const [templates,  setTemplates]  = useState<RoomTemplate[]>([]);
  const [movies,     setMovies]     = useState<Movie[]>([]);
  const [snacks,     setSnacks]     = useState<Snack[]>([]);
  const [schedules,  setSchedules]  = useState<Schedule[]>([]);

  const [dateFilter, setDateFilter] = useState(todayString());
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [editSchedule,    setEditSchedule]    = useState<Schedule | null>(null);
  const [scheduleForm,    setScheduleForm]    = useState<SchedulePayload | null>(null);
  const [formError,       setFormError]       = useState('');
  const [isSaving,        setIsSaving]        = useState(false);
  const [showSeatMap,     setShowSeatMap]     = useState(false);
  const [selectedScheduleForSeat, setSelectedScheduleForSeat] = useState<Schedule | null>(null);

  // ── Derive the manager's room ──────────────────────────────────────────────
  const myRoom     = rooms.find(r => r.managerId === uid) ?? rooms[0] ?? null;
  const myTemplate = myRoom ? templates.find(t => t.id === myRoom.templateId) ?? null : null;

  useEffect(() => {
    const u1 = subscribeToRooms(setRooms);
    const u2 = subscribeToTemplates(setTemplates);
    const u3 = subscribeToMovies(setMovies);
    const u4 = subscribeToSnacks(s => setSnacks(s.filter(sn => sn.available)));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // Subscribe to this room's schedules
  useEffect(() => {
    if (!myRoom) return;
    return subscribeToRoomSchedules(myRoom.id, setSchedules);
  }, [myRoom?.id]);

  // ── Filtered schedules for selected date ───────────────────────────────────
  const daySchedules = schedules
    .filter(s => s.date === dateFilter)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // ── Open add ───────────────────────────────────────────────────────────────
  const openAdd = () => {
    if (!myRoom) return;
    setScheduleForm(emptyScheduleForm(myRoom.id, uid ?? ''));
    setFormError('');
    setShowAddSchedule(true);
  };

  // ── Open edit ──────────────────────────────────────────────────────────────
  const openEdit = (s: Schedule) => {
    setScheduleForm({
      roomId:    s.roomId,
      movieId:   s.movieId,
      date:      s.date,
      startTime: s.startTime,
      endTime:   s.endTime,
      status:    s.status,
      createdBy: s.createdBy,
    });
    setFormError('');
    setEditSchedule(s);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!scheduleForm) return;
    if (!scheduleForm.movieId) { setFormError('Please select a movie.'); return; }
    if (!scheduleForm.date)    { setFormError('Please select a date.');  return; }
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

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteSchedule = async (s: Schedule) => {
    const movie = movies.find(m => m.id === s.movieId);
    if (!window.confirm(`Remove "${movie?.title ?? 'this show'}" from the schedule?`)) return;
    await deleteSchedule(s.id);
  };

  // ── Toggle room status ─────────────────────────────────────────────────────
  const handleToggleRoom = async () => {
    if (!myRoom) return;
    const newStatus = myRoom.status === 'active' ? 'inactive' : 'active';
    if (newStatus === 'inactive' && !window.confirm('Deactivate this room? Moviegoers will not be able to browse or book.')) return;
    await updateRoom(myRoom.id, { status: newStatus });
  };

  // ── No room assigned ───────────────────────────────────────────────────────
  if (!myRoom) {
    return (
      <div className="page fade-in">
        <div className="page-header">
          <h2>Cinema Management</h2>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🏟️</div>
          <div className="empty-state-text">No cinema room has been assigned to your account yet. Contact the Admin.</div>
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

      {/* ── Room status banner ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', marginBottom: 20,
        background: 'var(--surface)', border: `1px solid ${myRoom.status === 'active' ? 'var(--success)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: myRoom.status === 'active' ? 'var(--success)' : 'var(--text-muted)',
            display: 'inline-block',
            animation: myRoom.status === 'active' ? 'pulse 2s infinite' : 'none',
          }} />
          <div>
            <div style={{ fontWeight: 600, fontFamily: 'var(--font-heading)' }}>{myRoom.name}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {myTemplate
                ? `${myTemplate.gridRows * myTemplate.gridCols} sections · ${templateSeatCount(myTemplate)} seats`
                : 'No template assigned'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {myTemplate && (
            <Button variant="outline" size="sm" onClick={() => setShowSeatMap(true)}>
              🗺️ View Seat Map
            </Button>
          )}
          <Button
            variant={myRoom.status === 'active' ? 'danger' : 'primary'}
            size="sm"
            onClick={handleToggleRoom}
          >
            {myRoom.status === 'active' ? '⏸ Deactivate' : '▶ Activate Room'}
          </Button>
        </div>
      </div>

      <div className="two-col" style={{ alignItems: 'start' }}>

        {/* ── Left: Schedule ── */}
        <div>
          <Card
            title="Movie Schedule"
            actions={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="date"
                  className="input-field"
                  style={{ padding: '5px 10px', fontSize: '0.78rem', width: 'auto' }}
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                />
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
                  No shows scheduled for this date.
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
                        </div>
                        <div className="schedule-movie-meta">
                          {movie?.duration} min · ends {s.endTime}
                        </div>
                      </div>
                      {statusBadge(s)}
                      <div style={{ display: 'flex', gap: 5, marginLeft: 6 }}>
                        <button className="icon-btn btn-icon" onClick={() => openEdit(s)} title="Edit">✏️</button>
                        <button
                          className="icon-btn btn-icon"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeleteSchedule(s)}
                          title="Delete"
                        >🗑️</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* ── Right: Snacks + summary ── */}
        <div>
          <Card title="Room Summary">
            <div className="card-body">
              {[
                { label: 'Shows Today',    value: schedules.filter(s => s.date === todayString()).length },
                { label: 'Total Scheduled',value: schedules.length },
                { label: 'Snacks Available', value: snacks.length },
                { label: 'Template',       value: myTemplate?.name ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="room-stat">
                  <span>{label}</span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Available Snacks">
            <div className="card-body">
              {snacks.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>No snacks configured.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {snacks.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.3rem' }}>{s.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.83rem', fontWeight: 500 }}>{s.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Stock: {s.stock}
                        </div>
                      </div>
                      <span style={{ color: 'var(--gold)', fontSize: '0.82rem', fontWeight: 600 }}>
                        RM {s.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Add Schedule Modal ── */}
      <Modal
        title="Add Show"
        open={showAddSchedule}
        onClose={() => setShowAddSchedule(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddSchedule(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? '⏳ Saving…' : '🎬 Add Show'}
            </Button>
          </>
        }
      >
        {scheduleForm && (
          <ScheduleForm
            form={scheduleForm}
            setForm={setScheduleForm as any}
            movies={movies}
            error={formError}
          />
        )}
      </Modal>

      {/* ── Edit Schedule Modal ── */}
      <Modal
        title="Edit Show"
        open={!!editSchedule}
        onClose={() => setEditSchedule(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditSchedule(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? '⏳ Saving…' : '💾 Save Changes'}
            </Button>
          </>
        }
      >
        {scheduleForm && (
          <ScheduleForm
            form={scheduleForm}
            setForm={setScheduleForm as any}
            movies={movies}
            error={formError}
          />
        )}
      </Modal>

      {/* ── Seat Map Modal ── */}
      <Modal
        title={`Seat Map — ${myRoom.name}`}
        open={showSeatMap}
        onClose={() => setShowSeatMap(false)}
        footer={<Button onClick={() => setShowSeatMap(false)}>Close</Button>}
      >
        {myTemplate && <SeatMap template={myTemplate} />}
      </Modal>
    </div>
  );
};

export default CinemaManagement;