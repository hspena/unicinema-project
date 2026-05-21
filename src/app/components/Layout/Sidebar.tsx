import React, { useEffect, useState } from 'react';
import { useAuth }       from '../../context/AuthContext';
import { UserRole, User} from '../../types';
import { NAV_CONFIG, ROLE_ICONS } from '../../utils/helpers';
import { SelectField }   from '../ui';
import { getUserById }   from '../../services/userService';

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
        <div className="sidebar-brand-icon">🎬</div>
        <div style={{ flex: 1 }}>
          <h1>CineHub</h1>
          <p>Universal Ticketing</p>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          ✕
        </button>
      </div>

      {/* Role switcher — Admin only */}
      {actualRole === 'Admin' && (
        <div className="sidebar-role-switcher">
          <SelectField
            value={role}
            onChange={e => switchRole(e.target.value as UserRole)}
            options={[
              { value: 'Admin',       label: '👑 Admin'               },
              { value: 'Cinema Room', label: '🏟️ Cinema Room Manager' },
              { value: 'Staff',       label: '👤 Staff'               },
              { value: 'Moviegoer',   label: '🎬 Moviegoer'           },
            ]}
          />
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navSections.map(section => (
          <div key={section.section}>
            <div className="sidebar-section-label">{section.section}</div>
            {section.items.map(item => (
              <div
                key={item.view}
                className={`nav-item${currentView === item.view ? ' active' : ''}`}
                onClick={() => handleNav(item.view)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </div>
            ))}
          </div>
        ))}

        <div className="sidebar-section-label">Account</div>
        <div
          className={`nav-item${currentView === 'settings' ? ' active' : ''}`}
          onClick={() => handleNav('settings')}
        >
          <span className="nav-icon">⚙️</span>
          <span>Settings</span>
        </div>
      </nav>

      {/* User chip / logout */}
      <div className="sidebar-footer">
        <div className="user-chip" onClick={logout} title="Click to log out">
          <div className="avatar">{ROLE_ICONS[role]}</div>
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
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>↩</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;