import React from 'react';
import { Card, Button, SeatMap } from '../../components/ui';
import { SCHEDULE, SNACKS } from '../../utils/mockData';


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

const CinemaManagement = () => (
  <div className="page fade-in">
    <div className="page-header">
      <h2>Cinema Management</h2>
      <p>Configure your room template, seating, and movie schedule.</p>
    </div>

    {/* Seating template */}
    <Card
      title="Room Seating Template — Galaxy Hall"
      actions={<Button size="sm" variant="outline">Edit Template</Button>}
    >
      <SeatMap template={PREVIEW_TEMPLATE} />
    </Card>

    {/* Schedule */}
    <Card
      title="Movie Schedule"
      actions={<Button size="sm" icon="+">Add Slot</Button>}
    >
      <div className="card-body">
        <div className="schedule-day-label" style={{ marginBottom: 12 }}>Thursday, 19 Feb 2026</div>
        {SCHEDULE.map((s, i) => (
          <div key={i} className="schedule-slot">
            <div className="schedule-time">{s.time}</div>
            <div className="schedule-movie">
              <div className="schedule-movie-name">{s.movie}</div>
              <div className="schedule-movie-meta">{s.duration} min</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="icon-btn btn-icon" style={{ fontSize: '0.85rem' }}>✏️</button>
              <button className="icon-btn btn-icon" style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </Card>

    {/* Snacks */}
    <Card
      title="Snacks Available"
      actions={<Button size="sm" variant="outline" icon="+">Manage Snacks</Button>}
    >
      <div className="card-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {SNACKS.map((s) => (
            <div key={s.id} className="snack-card" style={{ padding: 12 }}>
              <span className="snack-icon" style={{ fontSize: '1.6rem' }}>{s.emoji}</span>
              <div>
                <div className="snack-name" style={{ fontSize: '0.82rem' }}>{s.name}</div>
                <div className="snack-price">RM {s.price.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>

    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
      <Button variant="outline">Save as Draft</Button>
      <Button icon="🚀">Deploy Room</Button>
    </div>
  </div>
);

export default CinemaManagement;
