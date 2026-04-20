import React from 'react';
import { StatCard, Card, Badge } from '../../components/ui';
import { SCHEDULE } from '../../utils/mockData';

const ManagerDashboard = () => (
  <div className="page fade-in">
    <div className="page-header">
      <h2>Galaxy Hall Dashboard</h2>
      <p>Manage your cinema room, schedule, and staff.</p>
    </div>

    <div className="stats-grid">
      <StatCard icon="🎟️" value="284"       label="Tickets Today"    trend="14.2% vs yesterday" trendUp delay={1} />
      <StatCard icon="💰" value="RM 2,412"  label="Today's Revenue"  trend="11.8% increase"     trendUp delay={2} />
      <StatCard icon="👤" value="3"         label="Active Staff"                                        delay={3} />
      <StatCard icon="🎬" value="5"         label="Shows Today"                                         delay={4} />
    </div>

    <div className="two-col">
      <Card title="Today's Schedule">
        <div className="card-body">
          <div className="schedule-timeline">
            {SCHEDULE.map((s, i) => (
              <div key={i} className="schedule-slot">
                <div className="schedule-time">{s.time}</div>
                <div className="schedule-movie">
                  <div className="schedule-movie-name">{s.movie}</div>
                  <div className="schedule-movie-meta">{s.duration} min · {s.seats}</div>
                </div>
                <Badge variant={s.status === 'running' ? 'success' : 'muted'}>{s.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Room Status">
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span className="status-dot active" />
            <span style={{ fontWeight: 600, color: 'var(--success)' }}>Room is LIVE</span>
          </div>
          {[
            ['Current Movie',    'Golden Horizon'],
            ['Next Show',        '12:30 — Echo Chamber'],
            ['Occupancy',        '82 / 120'],
            ['Snacks Available', 'Yes'],
            ['Payment Mode',     'Online + Counter'],
          ].map(([label, val]) => (
            <div key={label} className="room-stat">
              <span>{label}</span>
              <span>{val}</span>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-danger" style={{ width: '100%' }}>Deactivate Room</button>
          </div>
        </div>
      </Card>
    </div>
  </div>
);

export default ManagerDashboard;
