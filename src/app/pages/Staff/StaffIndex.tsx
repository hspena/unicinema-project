import React from 'react';
import { Card, Button, SeatMap } from '../../components/ui';
import { SCHEDULE } from '../../utils/mockData';

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

const StaffPage = () => (
  <div className="page fade-in">
    <div className="page-header">
      <h2>Staff Panel — Galaxy Hall</h2>
      <p>View today's schedule and manage ticket check-ins.</p>
    </div>

    <div className="two-col">
      <Card title="Today's Movie Schedule">
        <div className="card-body">
          {SCHEDULE.map((s, i) => (
            <div key={i} className="schedule-slot">
              <div className="schedule-time">{s.time}</div>
              <div className="schedule-movie">
                <div className="schedule-movie-name">{s.movie}</div>
                <div className="schedule-movie-meta">{s.duration} min</div>
              </div>
              <div className="schedule-seats">{s.seats}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Seat Overview — 10:00 Show">
        <SeatMap template={PREVIEW_TEMPLATE} />
      </Card>
    </div>

    <Card title="Ticket Check-In">
      <div className="card-body">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <span className="search-icon">🎟️</span>
            <input className="input-field" placeholder="Enter Ticket ID to check in…" />
          </div>
          <Button>Check In</Button>
        </div>
        <div style={{ padding: 12, background: 'var(--navy)', borderRadius: 'var(--radius)', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Scan or type a ticket ID to verify and check in guests.
        </div>
      </div>
    </Card>
  </div>
);

export default StaffPage;
