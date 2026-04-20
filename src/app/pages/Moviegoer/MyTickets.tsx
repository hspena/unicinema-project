import React from 'react';
import { Badge } from '../../components/ui';
import { Ticket } from '../../types';

const MY_TICKETS: Ticket[] = [
  { id: 'TKT8842', name: 'Alex Taylor', movie: 'Golden Horizon',      room: 'Galaxy Hall',    time: 'Thu 19 Feb · 10:00', seats: 'C4, C5', status: 'upcoming'  },
  { id: 'TKT7701', name: 'Alex Taylor', movie: 'Starfall Chronicles', room: 'Eclipse Hall',   time: 'Fri 20 Feb · 19:30', seats: 'A3',     status: 'upcoming'  },
  { id: 'TKT6610', name: 'Alex Taylor', movie: 'Neon Requiem',        room: 'Aurora Theatre', time: 'Mon 16 Feb · 14:30', seats: 'B6, B7', status: 'attended'  },
];

const MyTickets = () => (
  <div className="page fade-in">
    <div className="page-header">
      <h2>My Tickets</h2>
      <p>All your upcoming and past bookings.</p>
    </div>

    {MY_TICKETS.map((t) => (
      <div key={t.id} className="ticket-card">
        <div className="ticket-card-top">
          <span style={{ fontSize: '2rem' }}>{t.status === 'upcoming' ? '🎟️' : '✅'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.movie}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.room}</div>
          </div>
          <Badge variant={t.status === 'upcoming' ? 'success' : 'muted'}>{t.status}</Badge>
        </div>
        <div className="ticket-card-divider" />
        <div className="ticket-card-bottom">
          <div>
            <div className="ticket-info-label">Date &amp; Time</div>
            <div className="ticket-info-value">{t.time}</div>
          </div>
          <div>
            <div className="ticket-info-label">Seats</div>
            <div className="ticket-info-value">{t.seats}</div>
          </div>
          <div>
            <div className="ticket-info-label">Ticket ID</div>
            <div className="ticket-info-value" style={{ color: 'var(--gold)' }}>{t.id}</div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default MyTickets;
