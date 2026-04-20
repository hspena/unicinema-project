// ─── User ─────────────────────────────────────────────────────────────────────
export type UserRole = 'Admin' | 'Cinema Room' | 'Staff' | 'Moviegoer';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joined: string;
}

// ─── Movie ────────────────────────────────────────────────────────────────────
export interface Movie {
  id: number;
  title: string;
  genre: string;
  duration: number;
  rating: number;
  emoji: string;
  year: number;
  color: string;
}

// ─── Room ─────────────────────────────────────────────────────────────────────
export type RoomStatus = 'active' | 'inactive';

export interface Room {
  id: string;
  name: string;
  capacity: number;
  sections: number;
  status: RoomStatus;
  currentMovie: string;
  nextShow: string;
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
export type ShowStatus = 'running' | 'upcoming';

export interface ScheduleSlot {
  time: string;
  movie: string;
  duration: number;
  seats: string;
  status: ShowStatus;
}

// ─── Snack ────────────────────────────────────────────────────────────────────
export interface Snack {
  id: number;
  name: string;
  price: number;
  emoji: string;
  stock: number;
}

// ─── Ticket ───────────────────────────────────────────────────────────────────
export type TicketStatus = 'upcoming' | 'attended';

export interface Ticket {
  id: string;
  name: string;
  movie: string;
  room?: string;
  time: string;
  seats: string;
  paid?: boolean;
  status?: TicketStatus;
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
export interface NavItem {
  icon: string;
  label: string;
  view: string;
  badge?: string;
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

// ─── BarChart ─────────────────────────────────────────────────────────────────
export interface BarChartItem {
  label: string;
  value: number;
}
