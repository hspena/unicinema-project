import React, { ReactElement } from 'react';

// Admin
import {
  AdminDashboard,
  UserManagement,
  RoomManagement,
  MovieManagement,
  SnacksManagement,
  Analytics,
} from './pages/Admin';

// Manager (Cinema Room)
import {
  ManagerDashboard,
  CinemaManagement,
  StaffManagement,
  TicketManagement,
  ManagerAnalytics,
} from './pages/Manager';

// Staff
import StaffIndex from './pages/Staff/StaffIndex';

// Moviegoer
import { Browse, Schedule, MyTickets} from './pages/Moviegoer';
import ChatbotPage from './pages/Moviegoer/ChatbotPage';

// Shared
import MovieReviews from './pages/MovieReviews';
import Settings  from './pages/Settings';
import NotFound  from './pages/NotFound';

// ─── Route map ────────────────────────────────────────────────────────────────
// Keys must match the `view` strings in NAV_CONFIG (helpers.ts).
const ROUTE_MAP: Record<string, ReactElement> = {
  // Admin
  dashboard:    <AdminDashboard />,
  users:        <UserManagement />,
  rooms:        <RoomManagement />,
  movies:       <MovieManagement />,
  snacks:       <SnacksManagement />,
  analytics:    <Analytics />,
  reviews:      <MovieReviews />,

  // Manager
  'cm-dashboard':  <ManagerDashboard />,
  cinema:          <CinemaManagement />,
  staff:           <StaffManagement />,
  tickets:         <TicketManagement />,
  'cm-analytics':  <ManagerAnalytics />,
  'cm-reviews':    <MovieReviews />,

  // Staff
  'staff-main': <StaffIndex />,

  // Moviegoer
  browse:       <Browse />,
  schedule:     <Schedule />,
  'my-tickets': <MyTickets />,
  cinebot: <ChatbotPage />,

  // Shared
  settings:     <Settings />,
};

/**
 * Resolve a view key to its corresponding page element.
 * Falls back to <NotFound /> for unknown views.
 */
export const resolveView = (view: string): ReactElement =>
  ROUTE_MAP[view] ?? <NotFound />;
