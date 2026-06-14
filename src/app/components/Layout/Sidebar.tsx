import React, { useEffect, useState } from 'react';
import { useAuth }       from '../../context/AuthContext';
import { UserRole, User} from '../../types';
import { NAV_CONFIG, ROLE_ICONS } from '../../utils/helpers';
import { SelectField }   from '../ui';
import { getUserById }   from '../../services/userService';
import { subscribeToUserBookings } from '../../services/bookingService';
import { Film, X, Settings, Undo2 } from '../../utils/icons';

interface SidebarProps {
  isOpen:  boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { role, actualRole, uid, currentView, setView, switchRole, logout } = useAuth();
  const navSections = NAV_CONFIG[role] ?? [];

  const [userProfile, setUserProfile] = useState<{
    displayName: string;
    username:    string;
  } | null>(null);
  const [upcomingTickets, setUpcomingTickets] = useState(0);

  // Fetch the logged-in user's real profile from Firebase
  useEffect(() => {
    if (!uid) return;
    getUserById(uid).then(u => {
      if (!u) return;
      setUserProfile({
        displayName: (u as any).displayName || u.name || 'User',
        username:    (u as any).username    || '',
      });
    });
  }, [uid]);

  // Count confirmed bookings whose showtime hasn't happened yet, for the "My Tickets" badge
  useEffect(() => {
    if (!uid) return;
    return subscribeToUserBookings(uid, bookings => {
      const now = new Date();
      setUpcomingTickets(bookings.filter(b =>
        b.status === 'confirmed' && new Date(`${b.showDate}T${b.showTime}`) > now
      ).length);
    });
  }, [uid]);

  const handleNav = (view: string) => {
    setView(view);
    onClose();
  };

  // Whether displayName and username are the same — if so, only show one
  const showUsername =
    userProfile?.username &&
    userProfile.username.toLowerCase() !== userProfile.displayName.toLowerCase();

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>

      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon"><Film size={22} /></div>
        <div style={{ flex: 1 }}>
          <h1>CineHub</h1>
          <p>Universal Ticketing</p>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <X size={16} />
        </button>
      </div>

      {/* Role switcher — Admin only */}
      {actualRole === 'Admin' && (
        <div className="sidebar-role-switcher">
          <SelectField
            value={role}
            onChange={e => switchRole(e.target.value as UserRole)}
            options={[
              { value: 'Admin',       label: 'Admin'               },
              { value: 'Cinema Room', label: 'Cinema Room Manager' },
              { value: 'Staff',       label: 'Staff'               },
              { value: 'Moviegoer',   label: 'Moviegoer'           },
            ]}
          />
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navSections.map(section => (
          <div key={section.section}>
            <div className="sidebar-section-label">{section.section}</div>
            {section.items.map(item => {
              const badge = item.view === 'my-tickets'
                ? (upcomingTickets > 0 ? String(upcomingTickets) : undefined)
                : item.badge;
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.view}
                  className={`nav-item${currentView === item.view ? ' active' : ''}`}
                  onClick={() => handleNav(item.view)}
                >
                  <span className="nav-icon"><ItemIcon size={17} /></span>
                  <span>{item.label}</span>
                  {badge && <span className="nav-badge">{badge}</span>}
                </div>
              );
            })}
          </div>
        ))}

        <div className="sidebar-section-label">Account</div>
        <div
          className={`nav-item${currentView === 'settings' ? ' active' : ''}`}
          onClick={() => handleNav('settings')}
        >
          <span className="nav-icon"><Settings size={17} /></span>
          <span>Settings</span>
        </div>
      </nav>

      {/* User chip / logout */}
      <div className="sidebar-footer">
        <div className="user-chip" onClick={logout} title="Click to log out">
          <div className="avatar">{(() => { const RoleIcon = ROLE_ICONS[role]; return <RoleIcon size={16} />; })()}</div>
          <div className="user-chip-info">
            {/* Display name from Firebase, falls back to role label */}
            <div className="user-chip-name">
              {userProfile?.displayName ?? role}
            </div>
            {/* Show @username if different from displayName */}
            {showUsername ? (
              <div className="user-chip-role">@{userProfile!.username}</div>
            ) : (
              <div className="user-chip-role">{role}</div>
            )}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}><Undo2 size={13} /></span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;