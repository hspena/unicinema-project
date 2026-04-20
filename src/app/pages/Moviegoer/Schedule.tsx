import React from 'react';
import { Card, Badge, Button } from '../../components/ui';
import { ROOMS, SCHEDULE } from '../../utils/mockData';

const Schedule = () => (
  <div className="page fade-in">
    <div className="page-header">
      <h2>Cinema Schedule</h2>
      <p>Browse what's on at each room today.</p>
    </div>

    {ROOMS.filter((r) => r.status === 'active').map((room) => (
      <Card
        key={room.id}
        title={room.name}
        className="fade-up"
        actions={<Badge variant={room.status === 'active' ? 'success' : 'muted'}>{room.status}</Badge>}
      >
        <div className="card-body">
          {SCHEDULE.map((s, i) => (
            <div key={i} className="schedule-slot">
              <div className="schedule-time">{s.time}</div>
              <div className="schedule-movie">
                <div className="schedule-movie-name">{s.movie}</div>
                <div className="schedule-movie-meta">{s.duration} min · {s.seats}</div>
              </div>
              <Button
                size="sm"
                variant={s.status === 'running' ? 'outline' : 'primary'}
              >
                {s.status === 'running' ? 'Running' : 'Book'}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    ))}
  </div>
);

export default Schedule;
