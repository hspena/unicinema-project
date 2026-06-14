import { NavSection, UserRole } from '../types';
import {
  LayoutGrid, Users, Building2, Film, Popcorn, BarChart3,
  User, Ticket, ClipboardList, Calendar, Bot,
} from 'lucide-react';
import { ROLE_ICON_COMPONENTS } from './icons';

export const ROLE_ICONS = ROLE_ICON_COMPONENTS;

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
      items: [{ icon: LayoutGrid, label: 'Dashboard', view: 'dashboard' }],
    },
    {
      section: 'Management',
      items: [
        { icon: Users,     label: 'Users',   view: 'users'   },
        { icon: Building2, label: 'Rooms',   view: 'rooms'   },
        { icon: Film,      label: 'Movies',  view: 'movies'  },
        { icon: Popcorn,   label: 'Snacks',  view: 'snacks'  },
      ],
    },
    {
      section: 'Insights',
      items: [{ icon: BarChart3, label: 'Analytics', view: 'analytics' }],
    },
  ],
  'Cinema Room': [
    {
      section: 'Overview',
      items: [{ icon: LayoutGrid, label: 'Dashboard', view: 'dashboard' }],
    },
    {
      section: 'Manage',
      items: [
        { icon: Film,   label: 'Cinema',  view: 'cinema'  },
        { icon: User,   label: 'Staff',   view: 'staff'   },
        { icon: Ticket, label: 'Tickets', view: 'tickets' },
      ],
    },
    {
      section: 'Insights',
      items: [{ icon: BarChart3, label: 'Analytics', view: 'cm-analytics' }],
    },
  ],
  Staff: [
    {
      section: 'Overview',
      items: [{ icon: ClipboardList, label: 'Schedule & Seats', view: 'staff-main' }],
    },
  ],
  Moviegoer: [
    {
      section: 'Discover',
      items: [
        { icon: Film,     label: 'Now Showing', view: 'browse'   },
        { icon: Calendar, label: 'Schedule',    view: 'schedule' },
        { icon: Bot,      label: 'CineBot',     view: 'cinebot'  },
      ],
    },
    {
      section: 'My Account',
      items: [
        { icon: Ticket, label: 'My Tickets', view: 'my-tickets' },
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
