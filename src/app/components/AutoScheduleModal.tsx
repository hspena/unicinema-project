import React, { useMemo, useState } from 'react';
import { Button, Modal } from './ui';
import { Movie } from '../services/movieService';
import {
  SchedulePayload, AutoScheduleConfig,
  generateAutoSchedule, createSchedule, findClash,
  todayString, formatDate,
} from '../services/scheduleService';
import {
  IconGlyph, Sparkles, Calendar, Clock, Ticket, Popcorn,
  Plus, X, AlertTriangle, CheckCircle2, Film, Hourglass, Coffee,
} from '../utils/icons';

// ─── Reusable toggle (matches the look used elsewhere in Cinema Management) ─────

const ToggleRow = ({
  icon, title, subtitle, value, onChange,
}: {
  icon: React.ReactNode; title: string; subtitle: string;
  value: boolean; onChange: (v: boolean) => void;
}) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px', background: 'var(--navy)',
    border: `1px solid ${value ? 'var(--gold)' : 'var(--border)'}`,
    borderRadius: 'var(--radius)', transition: 'border-color var(--transition)',
  }}>
    <div>
      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon} {title}
      </div>
      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
    </div>
    <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, cursor: 'pointer', flexShrink: 0 }}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
      <span style={{
        position: 'absolute', inset: 0, borderRadius: 99,
        background: value ? 'var(--gold-dim)' : 'var(--surface-raised)',
        border: `1px solid ${value ? 'var(--gold)' : 'var(--border)'}`,
        transition: 'all var(--transition)',
      }}>
        <span style={{
          position: 'absolute', width: 16, height: 16, borderRadius: '50%',
          top: '50%', transform: 'translateY(-50%)',
          left: value ? 'calc(100% - 18px)' : '2px',
          background: value ? 'var(--gold)' : 'var(--text-muted)',
          transition: 'all var(--transition)',
        }} />
      </span>
    </label>
  </div>
);

// ─── Config state ──────────────────────────────────────────────────────────────

interface FormState {
  movieIds:     string[];
  dates:        string[];
  dayStart:     string;
  dayEnd:       string;
  gapMinutes:   number;
  repeatPerDay: number;
  recess:       boolean;
  recessStart:  string;
  recessEnd:    string;
  freeTickets:  boolean;
  snacks:       boolean;
}

const initialForm = (): FormState => ({
  movieIds: [], dates: [todayString()],
  dayStart: '10:00', dayEnd: '23:00',
  gapMinutes: 15, repeatPerDay: 2,
  recess: false, recessStart: '13:00', recessEnd: '14:00',
  freeTickets: false, snacks: true,
});

// ─── Component ───────────────────────────────────────────────────────────────

const AutoScheduleModal = ({
  open, onClose, roomId, uid, movies, onApplySnacks, onDone,
}: {
  open:          boolean;
  onClose:       () => void;
  roomId:        string;
  uid:           string;
  movies:        Movie[];
  onApplySnacks: (enabled: boolean) => Promise<void>;
  onDone:        () => void;
}) => {
  const [form, setForm]       = useState<FormState>(initialForm);
  const [newDate, setNewDate] = useState('');
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState(false);
  const [result, setResult]   = useState<{ created: number; skipped: number } | null>(null);

  const reset = () => { setForm(initialForm()); setNewDate(''); setError(''); setResult(null); };
  const close = () => { reset(); onClose(); };

  // Live preview of what would be generated
  const preview: SchedulePayload[] = useMemo(() => {
    if (form.movieIds.length === 0 || form.dates.length === 0) return [];
    const config: AutoScheduleConfig = {
      roomId, createdBy: uid,
      movieIds: form.movieIds, dates: [...form.dates].sort(),
      dayStart: form.dayStart, dayEnd: form.dayEnd,
      gapMinutes: form.gapMinutes, repeatPerDay: form.repeatPerDay,
      recessStart: form.recess ? form.recessStart : undefined,
      recessEnd:   form.recess ? form.recessEnd   : undefined,
      freeTickets: form.freeTickets,
    };
    return generateAutoSchedule(config, movies);
  }, [form, roomId, uid, movies]);

  const previewByDate = useMemo(() => {
    const map: Record<string, SchedulePayload[]> = {};
    for (const slot of preview) (map[slot.date] ??= []).push(slot);
    return map;
  }, [preview]);

  const toggleMovie = (id: string) => {
    setForm(p => ({
      ...p,
      movieIds: p.movieIds.includes(id)
        ? p.movieIds.filter(m => m !== id)
        : [...p.movieIds, id],
    }));
  };

  const addDate = () => {
    if (!newDate || form.dates.includes(newDate)) return;
    setForm(p => ({ ...p, dates: [...p.dates, newDate].sort() }));
    setNewDate('');
  };
  const removeDate = (d: string) =>
    setForm(p => ({ ...p, dates: p.dates.filter(x => x !== d) }));

  const handleGenerate = async () => {
    setError('');
    if (form.movieIds.length === 0) { setError('Select at least one movie.'); return; }
    if (form.dates.length === 0)    { setError('Add at least one date.'); return; }
    if (form.dayStart >= form.dayEnd) { setError('Day start must be before day end.'); return; }
    if (form.recess) {
      if (form.recessStart >= form.recessEnd) { setError('Rest time start must be before its end.'); return; }
      if (form.recessStart < form.dayStart || form.recessEnd > form.dayEnd) {
        setError('Rest time must fall within the day window.'); return;
      }
    }
    if (preview.length === 0) {
      setError('No shows fit in the given time window. Widen the window or shorten the gap.');
      return;
    }

    setBusy(true);
    try {
      let created = 0, skipped = 0;
      for (const slot of preview) {
        const clash = await findClash(slot.roomId, slot.date, slot.startTime, slot.endTime);
        if (clash) { skipped++; continue; }
        await createSchedule(slot);
        created++;
      }
      await onApplySnacks(form.snacks);
      setResult({ created, skipped });
      onDone();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to generate the schedule.');
    } finally {
      setBusy(false);
    }
  };

  // ── Result screen ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <Modal
        title="Schedule Generated" open={open} onClose={close}
        footer={<Button onClick={close}>Done</Button>}
      >
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ color: 'var(--success)', marginBottom: 10 }}><CheckCircle2 size={40} /></div>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 6 }}>
            {result.created} show{result.created === 1 ? '' : 's'} created
          </div>
          {result.skipped > 0 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {result.skipped} skipped due to clashes with existing shows.
            </div>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Sparkles size={16} /> Auto Schedule</span>}
      open={open} onClose={close}
      footer={
        <>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={busy || preview.length === 0}
            icon={busy ? <Hourglass size={14} /> : <Sparkles size={14} />}>
            {busy ? 'Generating…' : `Generate ${preview.length} Show${preview.length === 1 ? '' : 's'}`}
          </Button>
        </>
      }
    >
      {error && (
        <div className="auth-error" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ── Movie selection ── */}
      <div className="input-group">
        <label className="input-label">Movies to include *</label>
        {movies.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No movies available.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {movies.map(m => {
              const active = form.movieIds.includes(m.id);
              return (
                <button key={m.id} type="button" onClick={() => toggleMovie(m.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 12px', borderRadius: 99, cursor: 'pointer',
                    fontSize: '0.78rem', fontFamily: 'var(--font-body)',
                    border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                    background: active ? 'var(--gold-dim)' : 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                    transition: 'all var(--transition)',
                  }}>
                  <IconGlyph iconKey={m.emoji} size={14} /> {m.title}
                  <span style={{ opacity: 0.6 }}>· {m.duration}m</span>
                </button>
              );
            })}
          </div>
        )}
        {form.movieIds.length > 1 && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
            Movies will alternate before repeating.
          </div>
        )}
      </div>

      {/* ── Time window ── */}
      <div className="input-row">
        <div className="input-group">
          <label className="input-label">Day starts at *</label>
          <input className="input-field" type="time" value={form.dayStart}
            onChange={e => setForm(p => ({ ...p, dayStart: e.target.value }))} />
        </div>
        <div className="input-group">
          <label className="input-label">Day ends at *</label>
          <input className="input-field" type="time" value={form.dayEnd}
            onChange={e => setForm(p => ({ ...p, dayEnd: e.target.value }))} />
        </div>
      </div>

      {/* ── Gap + repeat ── */}
      <div className="input-row">
        <div className="input-group">
          <label className="input-label">Gap between shows (min) *</label>
          <input className="input-field" type="number" min={0} max={240} value={form.gapMinutes}
            onChange={e => setForm(p => ({ ...p, gapMinutes: Math.max(0, Number(e.target.value)) }))} />
        </div>
        <div className="input-group">
          <label className="input-label">Repeats per movie / day *</label>
          <input className="input-field" type="number" min={1} max={20} value={form.repeatPerDay}
            onChange={e => setForm(p => ({ ...p, repeatPerDay: Math.max(1, Number(e.target.value)) }))} />
        </div>
      </div>

      {/* ── Rest / recess window ── */}
      <div style={{ marginBottom: 4 }}>
        <ToggleRow
          icon={<Coffee size={14} />} title="Rest / Recess Time"
          subtitle="Reserve a daily break window — no shows are scheduled during it"
          value={form.recess} onChange={v => setForm(p => ({ ...p, recess: v }))}
        />
        {form.recess && (
          <div className="input-row" style={{ marginTop: 10 }}>
            <div className="input-group">
              <label className="input-label">Rest starts at *</label>
              <input className="input-field" type="time" value={form.recessStart}
                onChange={e => setForm(p => ({ ...p, recessStart: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Rest ends at *</label>
              <input className="input-field" type="time" value={form.recessEnd}
                onChange={e => setForm(p => ({ ...p, recessEnd: e.target.value }))} />
            </div>
          </div>
        )}
      </div>

      {/* ── Dates ── */}
      <div className="input-group">
        <label className="input-label">Dates *</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input className="input-field" type="date" value={newDate} min={todayString()}
            onChange={e => setNewDate(e.target.value)} style={{ flex: 1 }} />
          <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={addDate}>Add date</Button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {form.dates.map(d => (
            <span key={d} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 99, fontSize: '0.74rem',
              background: 'var(--surface-raised)', border: '1px solid var(--border)',
            }}>
              <Calendar size={11} /> {d === todayString() ? 'Today' : d}
              <button type="button" onClick={() => removeDate(d)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex' }}>
                <X size={12} />
              </button>
            </span>
          ))}
          {form.dates.length === 0 && (
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>No dates yet — add one above.</span>
          )}
        </div>
      </div>

      {/* ── Toggles ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4, marginBottom: 16 }}>
        <ToggleRow
          icon={<Ticket size={14} />} title="Free Tickets"
          subtitle="Mark every generated show as free to book"
          value={form.freeTickets} onChange={v => setForm(p => ({ ...p, freeTickets: v }))}
        />
        <ToggleRow
          icon={<Popcorn size={14} />} title="Offer Snacks"
          subtitle="Turn all snacks on (or off) for this schedule"
          value={form.snacks} onChange={v => setForm(p => ({ ...p, snacks: v }))}
        />
      </div>

      {/* ── Live preview ── */}
      {preview.length > 0 && (
        <div style={{
          background: 'var(--navy)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '12px 14px',
        }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--gold)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={13} /> Preview · {preview.length} show{preview.length === 1 ? '' : 's'} across {Object.keys(previewByDate).length} day{Object.keys(previewByDate).length === 1 ? '' : 's'}
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(previewByDate).map(([date, slots]) => (
              <div key={date}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>
                  {date === todayString() ? 'Today' : formatDate(date)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {slots.map((s, i) => {
                    const movie = movies.find(m => m.id === s.movieId);
                    const showRecess = form.recess
                      && s.endTime <= form.recessStart
                      && (slots[i + 1] ? slots[i + 1].startTime >= form.recessEnd : true);
                    return (
                      <React.Fragment key={i}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          fontSize: '0.76rem', padding: '4px 0',
                        }}>
                          <span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--gold)', minWidth: 96 }}>
                            {s.startTime}–{s.endTime}
                          </span>
                          <IconGlyph iconKey={movie?.emoji} size={13} />
                          <span style={{ color: 'var(--text-primary)' }}>{movie?.title ?? '—'}</span>
                          {s.freeTickets && (
                            <span style={{ fontSize: '0.62rem', padding: '0 5px', background: 'var(--gold)', color: 'var(--navy)', borderRadius: 99, fontWeight: 700 }}>FREE</span>
                          )}
                        </div>
                        {showRecess && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontSize: '0.72rem', padding: '4px 0', color: 'var(--text-muted)',
                          }}>
                            <span style={{ fontFamily: 'var(--font-mono, monospace)', minWidth: 96 }}>
                              {form.recessStart}–{form.recessEnd}
                            </span>
                            <Coffee size={12} />
                            <span style={{ fontStyle: 'italic' }}>Rest / recess — no shows</span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {form.movieIds.length > 0 && preview.length === 0 && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Film size={14} /> No shows fit the current time window. Widen it or reduce the gap.
        </div>
      )}
    </Modal>
  );
};

export default AutoScheduleModal;
