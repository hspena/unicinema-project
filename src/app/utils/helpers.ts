import { NavSection, UserRole } from '../types';

export const ROLE_ICONS: Record<UserRole, string> = {
  Admin: '👑',
  'Cinema Room': '🏟️',
  Staff: '👤',
  Moviegoer: '🎬',
};

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  Admin: 'Admin Master',
  'Cinema Room': 'Galaxy Hall',
  Staff: 'James Walton',
  Moviegoer: 'Alex Taylor',
};

export const DEFAULT_VIEWS: Record<UserRole, string> = {
  Admin: 'dashboard',
  'Cinema Room': 'dashboard',
  Staff: 'staff-main',
  Moviegoer: 'browse',
};

export const NAV_CONFIG: Record<UserRole, NavSection[]> = {
  Admin: [
    {
      section: 'Overview',
      items: [{ icon: '📊', label: 'Dashboard', view: 'dashboard' }],
    },
    {
      section: 'Management',
      items: [
        { icon: '👥', label: 'Users',   view: 'users'   },
        { icon: '🏟️', label: 'Rooms',   view: 'rooms'   },
        { icon: '🎬', label: 'Movies',  view: 'movies'  },
        { icon: '🍿', label: 'Snacks',  view: 'snacks'  },
      ],
    },
    {
      section: 'Insights',
      items: [{ icon: '📈', label: 'Analytics', view: 'analytics' }],
    },
  ],
  'Cinema Room': [
    {
      section: 'Overview',
      items: [{ icon: '📊', label: 'Dashboard', view: 'dashboard' }],
    },
    {
      section: 'Manage',
      items: [
        { icon: '🎬', label: 'Cinema',  view: 'cinema'  },
        { icon: '👤', label: 'Staff',   view: 'staff'   },
        { icon: '🎟️', label: 'Tickets', view: 'tickets' },
      ],
    },
    {
      section: 'Insights',
      items: [{ icon: '📈', label: 'Analytics', view: 'cm-analytics' }],
    },
  ],
  Staff: [
    {
      section: 'Overview',
      items: [{ icon: '📋', label: 'Schedule & Seats', view: 'staff-main' }],
    },
  ],
  Moviegoer: [
    {
      section: 'Discover',
      items: [
        { icon: '🎬', label: 'Now Showing', view: 'browse'   },
        { icon: '🗓️', label: 'Schedule',    view: 'schedule' },
      ],
    },
    {
      section: 'My Account',
      items: [
        { icon: '🎟️', label: 'My Tickets', view: 'my-tickets', badge: '2' },
      ],
    },
  ],
};

export const getRoleBadgeVariant = (role: UserRole) => {
  const map: Record<UserRole, string> = {
    Admin: 'gold',
    'Cinema Room': 'info',
    Staff: 'warning',
    Moviegoer: 'muted',
  };
  return map[role];
};

export const formatCurrency = (amount: number) =>
  `RM ${amount.toFixed(2)}`;

export const getInitial = (name: string) => name.charAt(0).toUpperCase();
