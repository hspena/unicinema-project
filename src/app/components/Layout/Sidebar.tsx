import React from 'react';
import { useAuth }  from '../../context/AuthContext';
import { UserRole } from '../../types';
import { NAV_CONFIG, ROLE_ICONS, ROLE_DISPLAY_NAMES } from '../../utils/helpers';
import { SelectField } from '../ui';

interface SidebarProps {
  isOpen:  boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { role, actualRole, currentView, setView, switchRole, logout } = useAuth();
  const navSections = NAV_CONFIG[role] ?? [];

  const handleNavClick = (view: string) => {
    setView(view);
    onClose(); // close sidebar on mobile after navigation
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Brand + close button (mobile) */}
      <div className="sidebar-brand" style={{ position: 'relative' }}>
        <div className="sidebar-brand-icon">🎬</div>
        <h1>CineHub</h1>
        <p>Universal Ticketing</p>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          style={{
            display: 'none', // shown via CSS on mobile
            position: 'absolute', top: 12, right: 12,
            background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: '1.2rem',
            cursor: 'pointer', padding: 4,
          }}
          className="sidebar-close-btn"
          aria-label="Close menu"
        >✕</button>
      </div>

      {/* Role switcher — Admin only */}
      {actualRole === 'Admin' && (
        <div className="sidebar-role-switcher">
          <SelectField
            value={role}
            onChange={(e) => switchRole(e.target.value as UserRole)}
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
        {navSections.map((section) => (
          <div key={section.section}>
            <div className="sidebar-section-label">{section.section}</div>
            {section.items.map((item) => (
              <div
                key={item.view}
                className={`nav-item ${currentView === item.view ? 'active' : ''}`}
                onClick={() => handleNavClick(item.view)}
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
          className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => handleNavClick('settings')}
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
            <div className="user-chip-name">{ROLE_DISPLAY_NAMES[role]}</div>
            <div className="user-chip-role">{role}</div>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>↩</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;