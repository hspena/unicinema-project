import React, { useState, useRef, useEffect } from 'react';
import { useAuth }  from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',      users: 'User Management',
  rooms: 'Room Management',    movies: 'Movie Management',
  snacks: 'Snacks Management', analytics: 'Analytics',
  'cm-dashboard': 'Dashboard', cinema: 'Cinema Management',
  staff: 'Staff Management',   tickets: 'Ticket Management',
  'cm-analytics': 'Analytics', 'staff-main': 'Staff Panel',
  browse: 'Now Showing',       schedule: 'Schedule',
  'my-tickets': 'My Tickets',  settings: 'Settings',
};

interface TopbarProps {
  onMenuClick: () => void;
}

const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { currentView, role }     = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const [showNotif, setShowNotif] = useState(false);
  const notifRef                  = useRef<HTMLDivElement>(null);

  const title = PAGE_TITLES[currentView] ?? currentView;

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roleAvatar =
    role === 'Admin'       ? '👑'  :
    role === 'Cinema Room' ? '🏟️' :
    role === 'Staff'       ? '👤'  : '🎬';

  return (
    <header className="topbar">

      {/* ── Left side: hamburger + title ── */}
      <div className="topbar-left">
        <button
          className="mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          ☰
        </button>
        <span className="topbar-title">{title}</span>
      </div>

      {/* ── Right side: theme + notif + avatar ── */}
      <div className="topbar-right">

        {/* Theme toggle */}
        <button
          className="icon-btn"
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="notif-wrap">
          <button
            className="icon-btn notif-trigger"
            onClick={() => setShowNotif(p => !p)}
            title="Notifications"
          >
            🔔
            <span className="notif-badge" />
          </button>

          {showNotif && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <span>Notifications</span>
                <span className="notif-mark-read" onClick={() => setShowNotif(false)}>
                  Mark all read
                </span>
              </div>

              {[
                { icon: '🎬', text: 'New movie added to the catalogue', time: 'Just now'    },
                { icon: '🎟️', text: 'Your ticket has been confirmed',   time: '5 min ago'  },
              ].map((n, i) => (
                <div key={i} className="notif-item">
                  <div className="notif-icon-wrap">{n.icon}</div>
                  <div>
                    <div className="notif-text">{n.text}</div>
                    <div className="notif-time">{n.time}</div>
                  </div>
                </div>
              ))}

              <div className="notif-view-all">View all notifications</div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="topbar-avatar" title={role}>
          {roleAvatar}
        </div>
      </div>
    </header>
  );
};

export default Topbar;