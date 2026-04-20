import React from 'react';
import { StatCard, Badge, Button } from '../../components/ui';
import { Ticket } from '../../types';

const TICKETS: Ticket[] = [
  { id: 'TKT8842', name: 'Alex Taylor', movie: 'Golden Horizon', time: '10:00', seats: 'C4, C5', paid: true  },
  { id: 'TKT8843', name: 'Sam Rivers',  movie: 'Golden Horizon', time: '10:00', seats: 'D2',     paid: true  },
  { id: 'TKT8844', name: 'Jordan Wu',   movie: 'Echo Chamber',   time: '12:30', seats: 'A6, A7', paid: false },
];

const TicketManagement = () => (
  <div className="page fade-in">
    <div className="page-header">
      <h2>Ticket Management</h2>
      <p>View and manage all ticket bookings for Galaxy Hall.</p>
    </div>

    <div className="stats-grid" style={{ marginBottom: 20 }}>
      <StatCard icon="🎟️" value="284" label="Tickets Today"  delay={1} />
      <StatCard icon="💺" value="82"  label="Occupied Now"   delay={2} />
      <StatCard icon="✅" value="38"  label="Checked In"     delay={3} />
      <StatCard icon="⏳" value="44"  label="Pending Entry"  delay={4} />
    </div>

    {TICKETS.map((t) => (
      <div key={t.id} className="ticket-card">
        <div className="ticket-card-top">
          <div className="avatar">{t.name[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>{t.name}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Booking ID: <span style={{ color: 'var(--gold)' }}>{t.id}</span>
            </div>
          </div>
          <Badge variant={t.paid ? 'success' : 'warning'}>{t.paid ? 'Paid' : 'Unpaid'}</Badge>
        </div>
        <div className="ticket-card-divider" />
        <div className="ticket-card-bottom">
          <div>
            <div className="ticket-info-label">Movie</div>
            <div className="ticket-info-value">{t.movie}</div>
          </div>
          <div>
            <div className="ticket-info-label">Show Time</div>
            <div className="ticket-info-value">{t.time}</div>
          </div>
          <div>
            <div className="ticket-info-label">Seats</div>
            <div className="ticket-info-value">{t.seats}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <Button size="sm" icon="✓">Check In</Button>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default TicketManagement;
