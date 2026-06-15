import React, { useState, useRef, useEffect } from 'react';
import { useAuth }  from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Menu, Sun, Moon, Bell, Film, Ticket, XCircle, Clock, Tag, Settings } from '../../utils/icons';
import { ROLE_ICON_COMPONENTS } from '../../utils/icons';
import {
  AppNotification, NotificationType,
  subscribeToUserNotifications, markAllNotificationsRead, markNotificationRead,
} from '../../services/notificationService';
import { useBookingReminders } from '../../hooks/useBookingReminders';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',      users: 'User Management',
  rooms: 'Room Management',    movies: 'Movie Management',
  snacks: 'Snacks Management', analytics: 'Analytics',
  'cm-dashboard': 'Dashboard', cinema: 'Cinema Management',
  staff: 'Staff Management',   tickets: 'Ticket Management',
  'cm-analytics': 'Analytics', 'staff-main': 'Staff Panel',
  browse: 'Now Showing',       schedule: 'Schedule',
  'my-tickets': 'My Tickets',  settings: 'Settings',
  'cinebot': 'CineBot — Movie Advisor',
};

// Map a notification type to the icon shown in the dropdown.
const NOTIF_ICONS: Record<NotificationType, typeof Bell> = {
  booking:  Ticket,
  cancel:   XCircle,
  reminder: Clock,
  movie:    Film,
  promo:    Tag,
  system:   Settings,
};

// "Just now", "5 min ago", "2 h ago", "3 d ago", or a date.
const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)    return 'Just now';
  if (mins < 60)   return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)    return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
};

interface TopbarProps {
  onMenuClick: () => void;
}

const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { currentView, role, uid }  = useAuth();
  const { darkMode, setDarkMode }   = useTheme();
  const [showNotif, setShowNotif]   = useState(false);
  const [notifs, setNotifs]         = useState<AppNotification[]>([]);
  const notifRef                    = useRef<HTMLDivElement>(null);

  const title       = PAGE_TITLES[currentView] ?? currentView;
  const unreadCount = notifs.filter(n => !n.read).length;

  // Fire "starting soon" reminders for the logged-in user while the app is open.
  useBookingReminders(uid);

  // Live notifications for the logged-in user.
  useEffect(() => {
    if (!uid) { setNotifs([]); return; }
    const unsubscribe = subscribeToUserNotifications(uid, setNotifs);
    return unsubscribe;
  }, [uid]);

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

  const handleMarkAllRead = () => {
    if (uid && unreadCount > 0) markAllNotificationsRead(uid);
  };

  const handleNotifClick = (n: AppNotification) => {
    if (uid && !n.read) markNotificationRead(uid, n.id);
  };

  const RoleAvatarIcon = ROLE_ICON_COMPONENTS[role] ?? Film;

  return (
    <header className="topbar">

      {/* ── Left side: hamburger + title ── */}
      <div className="topbar-left">
        <button
          className="mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={20} />
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
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="notif-wrap">
          <button
            className="icon-btn notif-trigger"
            onClick={() => setShowNotif(p => !p)}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notif-badge notif-badge-count">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="notif-mark-read" onClick={handleMarkAllRead}>
                    Mark all read
                  </span>
                )}
              </div>

              {notifs.length === 0 ? (
                <div className="notif-empty">
                  <Bell size={22} />
                  <span>No notifications yet</span>
                </div>
              ) : (
                notifs.slice(0, 8).map((n) => {
                  const Icon = NOTIF_ICONS[n.type] ?? Bell;
                  return (
                    <div
                      key={n.id}
                      className={`notif-item ${n.read ? '' : 'notif-item-unread'}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <div className="notif-icon-wrap"><Icon size={16} /></div>
                      <div>
                        <div className="notif-text">
                          <strong>{n.title}</strong> — {n.message}
                        </div>
                        <div className="notif-time">{relativeTime(n.createdAt)}</div>
                      </div>
                      {!n.read && <span className="notif-unread-dot" />}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="topbar-avatar" title={role}>
          <RoleAvatarIcon size={17} />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
