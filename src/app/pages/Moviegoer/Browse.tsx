import React, { useState } from 'react';
import { Badge, Button, Modal, SelectField, SeatMap } from '../../components/ui';
import { MOVIES, ROOMS, SCHEDULE } from '../../utils/mockData';
import { Movie } from '../../types';

const PREVIEW_TEMPLATE = {
  id: 'preview', name: 'Preview', gridRows: 2, gridCols: 2,
  createdBy: '', createdAt: '',
  sections: {
    'r0c0': { name: 'Section A', seatRows: 3, seatCols: 6 },
    'r0c1': { name: 'Section B', seatRows: 3, seatCols: 6 },
    'r1c0': { name: 'Section C', seatRows: 4, seatCols: 6 },
    'r1c1': { name: 'Section D', seatRows: 4, seatCols: 6 },
  },
};

const GENRES = ['All', 'Action', 'Drama', 'Sci-Fi', 'Comedy', 'Horror'];

const Browse = () => {
  const [showBooking,    setShowBooking]    = useState(false);
  const [selectedMovie,  setSelectedMovie]  = useState<Movie | null>(null);

  const activeRooms = ROOMS.filter((r) => r.status === 'active');

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Now Showing &amp; Upcoming</h2>
        <p>Choose a movie and book your seats today.</p>
      </div>

      {/* Search + genre filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
          <span className="search-icon">🔍</span>
          <input className="input-field" placeholder="Search movies…" />
        </div>
        {GENRES.map((g) => (
          <button key={g} className="btn btn-outline btn-sm">{g}</button>
        ))}
      </div>

      {/* Movie grid */}
      <div className="three-col">
        {MOVIES.map((m) => (
          <div
            key={m.id}
            className="movie-card"
            onClick={() => { setSelectedMovie(m); setShowBooking(true); }}
          >
            <div className="movie-poster" style={{ background: m.color }}>
              <span style={{ fontSize: '3.5rem' }}>{m.emoji}</span>
              <div className="movie-genre-tag">
                <Badge variant="muted">{m.genre}</Badge>
              </div>
            </div>
            <div className="movie-info">
              <div className="movie-title">{m.title}</div>
              <div className="movie-meta">{m.year} · {m.duration} min</div>
              <div className="movie-rating">{'★'.repeat(Math.round(m.rating / 2))} {m.rating}</div>
              <Button style={{ marginTop: 10, width: '100%' }} size="sm">Book Ticket</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Booking modal */}
      <Modal
        title={`Book Tickets — ${selectedMovie?.title ?? ''}`}
        open={showBooking}
        onClose={() => setShowBooking(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBooking(false)}>Cancel</Button>
            <Button icon="🎟️">Confirm Booking</Button>
          </>
        }
      >
        <SelectField
          label="Select Cinema Room"
          value=""
          options={activeRooms.map((r) => ({ value: r.id, label: r.name }))}
          onChange={() => {}}
        />
        <SelectField
          label="Select Show Time"
          value=""
          options={SCHEDULE.map((s) => ({
            value: s.time,
            label: `${s.time} — ${s.seats} available`,
          }))}
          onChange={() => {}}
        />
        <div style={{ marginTop: 4, marginBottom: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Select your seats:
        </div>
        <SeatMap template={PREVIEW_TEMPLATE} onConfirm={(seats) => console.log(seats)} />
      </Modal>
    </div>
  );
};

export default Browse;
