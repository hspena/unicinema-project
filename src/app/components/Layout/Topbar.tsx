import React, { useState } from 'react';
import { useAuth }  from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getUserById } from '../../services/userService';

// Page title map
const PAGE_TITLES: Record<string, string> = {
  // Admin
  dashboard:   'Dashboard',
  users:       'User Management',
  rooms:       'Room Management',
  movies:      'Movie Management',
  snacks:      'Snacks Management',
  analytics:   'Analytics',
  // Manager
  'cm-dashboard':  'Dashboard',
  cinema:          'Cinema Management',
  staff:           'Staff Management',
  tickets:         'Ticket Management',
  'cm-analytics':  'Analytics',
  // Staff
  'staff-main': 'Staff Panel',
  // Moviegoer
  browse:       'Now Showing',
  schedule:     'Schedule',
  'my-tickets': 'My Tickets',
  // Shared
  settings:     'Settings',
};

interface TopbarProps {
  onMenuClick: () => void;
}

const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { currentView, uid, role } = useAuth();
  const { darkMode, setDarkMode }  = useTheme();
  const [showNotif, setShowNotif]  = useState(false);

  const title = PAGE_TITLES[currentView] ?? currentView;

  return (
    <header className="topbar">
      {/* Left: hamburger (mobile) + page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <button
          className="mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          ☰
        </button>
        <div className="topbar-title">{title}</div>
      </div>

      {/* Right: actions */}
      <div className="topbar-actions">
        {/* Theme toggle */}
        <button
          className="icon-btn"
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            onClick={() => setShowNotif(p => !p)}
            title="Notifications"
          >
            🔔
            <span className="notif-dot" />
          </button>

          {showNotif && (
            <div className="notif-dropdown" onClick={() => setShowNotif(false)}>
              <div className="notif-header">Notifications</div>
              <div className="notif-item">
                <div className="notif-icon">🎬</div>
                <div>
                  <div className="notif-text">New movie added to the catalogue</div>
                  <div className="notif-time">Just now</div>
                </div>
              </div>
              <div className="notif-item">
                <div className="notif-icon">🎟️</div>
                <div>
                  <div className="notif-text">Your ticket has been confirmed</div>
                  <div className="notif-time">5 min ago</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="avatar" title={role} style={{ cursor: 'default' }}>
          {role === 'Admin' ? '👑' :
           role === 'Cinema Room' ? '🏟️' :
           role === 'Staff' ? '👤' : '🎬'}
        </div>
      </div>
    </header>
  );
};

export default Topbar;