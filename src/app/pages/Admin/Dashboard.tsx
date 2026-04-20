import React from 'react';
import { StatCard, Card, BarChart } from '../../components/ui';
import { ROOMS }    from '../../utils/mockData';
import Badge from '../../components/ui/Badge';

const ACTIVITY = [
  { time: '2 min ago',  title: 'New booking — Galaxy Hall',       sub: 'Alex Taylor · Seat A5, A6'         },
  { time: '8 min ago',  title: 'User registered',                 sub: 'New moviegoer account created'     },
  { time: '15 min ago', title: 'Movie schedule updated',          sub: 'Aurora Theatre · Tuesday schedule' },
  { time: '32 min ago', title: 'Snack restocked',                 sub: 'Large Popcorn · +100 units'        },
  { time: '1 hr ago',   title: 'Room deployed',                   sub: 'Eclipse Hall now active'           },
];

const AdminDashboard = () => (
  <div className="page fade-in">
    <div className="page-header">
      <h2>Dashboard Overview</h2>
      <p>Welcome back — here's what's happening across all cinemas today.</p>
    </div>

    <div className="stats-grid">
      <StatCard icon="🎬" value="4"        label="Active Rooms"    trend="2 this week"             trendUp delay={1} />
      <StatCard icon="🎟️" value="1,284"    label="Tickets Sold"    trend="12.4% vs last week"      trendUp delay={2} />
      <StatCard icon="👥" value="7"        label="Total Users"     trend="1 new today"             trendUp delay={3} />
      <StatCard icon="💰" value="RM 9,630" label="Revenue Today"   trend="8.2% vs yesterday"       trendUp delay={4} />
    </div>

    <div className="two-col">
      <Card title="Popular Movies Today">
        <div className="card-body">
          <BarChart data={[
            { label: 'Golden Horizon',      value: 340 },
            { label: 'Starfall Chronicles', value: 280 },
            { label: 'Neon Requiem',        value: 210 },
            { label: 'The Last Ember',      value: 180 },
            { label: 'Echo Chamber',        value: 150 },
          ]} />
        </div>
      </Card>

      <Card title="Active Cinema Rooms">
        <div className="card-body">
          {ROOMS.map((r) => (
            <div key={r.id} className="schedule-slot" style={{ marginBottom: 8 }}>
              <div>
                <span className={`status-dot ${r.status}`} />
                <span style={{ fontWeight: 600, fontSize: '0.87rem' }}>{r.name}</span>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  {r.currentMovie}
                </div>
              </div>
              <Badge variant={r.status === 'active' ? 'success' : 'muted'}>{r.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>

    <Card title="Recent Activity">
      <div className="card-body">
        <div className="ticket-timeline">
          {ACTIVITY.map((a, i) => (
            <div key={i} className="timeline-item">
              <div className="timeline-dot" />
              <div className="timeline-time">{a.time}</div>
              <div className="timeline-title">{a.title}</div>
              <div className="timeline-sub">{a.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  </div>
);

export default AdminDashboard;
