import React, { useState } from 'react';
import { useAuth }  from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NAV_CONFIG, ROLE_ICONS } from '../../utils/helpers';

const NOTIFICATIONS = [
  { icon: '🎟️', text: 'Your booking for Golden Horizon is confirmed', time: '2 min ago'  },
  { icon: '🔔', text: 'Starfall Chronicles starts in 1 hour',          time: '30 min ago' },
  { icon: '✨', text: 'New movie added: Whispers in the Dark',          time: '2 hrs ago'  },
];

const Topbar = () => {
  const { role, currentView, setView } = useAuth();
  const { darkMode, setDarkMode }      = useTheme();
  const [showNotif, setShowNotif]      = useState(false);

  // Resolve topbar title from nav config
  const allItems = NAV_CONFIG[role]?.flatMap((s) => s.items) ?? [];
  const activeLabel = allItems.find((i) => i.view === currentView)?.label ?? 'Dashboard';
  const title = currentView === 'settings' ? 'Settings' : activeLabel;

  return (
    <div className="topbar">
      <span className="topbar-title font-heading">{title}</span>

      <div className="topbar-actions">
        {/* Theme toggle */}
        <button
          className="icon-btn"
          title="Toggle Theme"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            title="Notifications"
            onClick={() => setShowNotif((v) => !v)}
          >
            🔔
          </button>
          <span className="notif-dot" />

          {showNotif && (
            <div
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                width: 280,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow)',
                zIndex: 100,
                animation: 'fadeUp 0.2s ease',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                Notifications
              </div>

              {NOTIFICATIONS.map((n, i) => (
                <div
                  key={i}
                  className="nav-item"
                  style={{
                    padding: '11px 16px',
                    display: 'flex',
                    gap: 10,
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowNotif(false)}
                >
                  <span style={{ fontSize: '1.1rem' }}>{n.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{n.text}</div>
                    <div style={{ fontSize: '0.7rem',  color: 'var(--text-muted)',   marginTop: 2 }}>{n.time}</div>
                  </div>
                </div>
              ))}

              <div
                style={{
                  padding: '10px 16px',
                  textAlign: 'center',
                  fontSize: '0.76rem',
                  color: 'var(--gold)',
                  cursor: 'pointer',
                }}
              >
                View all notifications
              </div>
            </div>
          )}
        </div>

        {/* Avatar → settings */}
        <div
          className="avatar"
          style={{ cursor: 'pointer' }}
          title={role}
          onClick={() => setView('settings')}
        >
          {ROLE_ICONS[role]}
        </div>
      </div>
    </div>
  );
};

export default Topbar;
