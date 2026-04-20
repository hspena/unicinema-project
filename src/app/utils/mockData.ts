import { Movie, Room, ScheduleSlot, Snack, User } from '../types';

export const MOVIES: Movie[] = [
  { id: 1, title: 'Starfall Chronicles', genre: 'Sci-Fi',     duration: 128, rating: 8.4, emoji: '🚀', year: 2025, color: '#162040' },
  { id: 2, title: 'The Last Ember',       genre: 'Drama',     duration: 112, rating: 7.9, emoji: '🌊', year: 2025, color: '#1a1628' },
  { id: 3, title: 'Neon Requiem',         genre: 'Thriller',  duration: 105, rating: 8.1, emoji: '🌃', year: 2025, color: '#16281e' },
  { id: 4, title: 'Whispers in the Dark', genre: 'Horror',    duration: 98,  rating: 7.5, emoji: '👁️', year: 2024, color: '#281620' },
  { id: 5, title: 'Golden Horizon',       genre: 'Adventure', duration: 135, rating: 8.7, emoji: '🏔️', year: 2025, color: '#281e10' },
  { id: 6, title: 'Echo Chamber',         genre: 'Comedy',    duration: 94,  rating: 7.2, emoji: '😂', year: 2025, color: '#162028' },
];

export const USERS: User[] = [
  { id: 'USR001', name: 'Admin Master',  email: 'admin@unicinema.com',  role: 'Admin',        status: 'active',   joined: '2024-01-10' },
  { id: 'USR002', name: 'Galaxy Room',   email: 'galaxy@unicinema.com', role: 'Cinema Room',  status: 'active',   joined: '2024-02-14' },
  { id: 'USR003', name: 'Aurora Room',   email: 'aurora@unicinema.com', role: 'Cinema Room',  status: 'inactive', joined: '2024-03-01' },
  { id: 'USR004', name: 'James Walton',  email: 'james@unicinema.com',  role: 'Staff',        status: 'active',   joined: '2024-04-08' },
  { id: 'USR005', name: 'Maria Chen',    email: 'maria@unicinema.com',  role: 'Staff',        status: 'active',   joined: '2024-04-15' },
  { id: 'USR006', name: 'Alex Taylor',   email: 'alex@unicinema.com',   role: 'Moviegoer',    status: 'active',   joined: '2024-05-22' },
  { id: 'USR007', name: 'Sam Rivers',    email: 'sam@unicinema.com',    role: 'Moviegoer',    status: 'active',   joined: '2024-06-01' },
];

export const ROOMS: Room[] = [
  { id: 'RM001', name: 'Galaxy Hall',     capacity: 120, sections: 2, status: 'active',   currentMovie: 'Starfall Chronicles', nextShow: '14:30' },
  { id: 'RM002', name: 'Aurora Theatre',  capacity: 80,  sections: 2, status: 'active',   currentMovie: 'The Last Ember',      nextShow: '15:00' },
  { id: 'RM003', name: 'Nebula Screen',   capacity: 60,  sections: 1, status: 'inactive', currentMovie: '—',                   nextShow: '—'     },
  { id: 'RM004', name: 'Eclipse Hall',    capacity: 100, sections: 3, status: 'active',   currentMovie: 'Neon Requiem',        nextShow: '16:00' },
];

export const SCHEDULE: ScheduleSlot[] = [
  { time: '10:00', movie: 'Golden Horizon',       duration: 135, seats: '82/120', status: 'running'  },
  { time: '12:30', movie: 'Echo Chamber',         duration: 94,  seats: '45/120', status: 'upcoming' },
  { time: '14:30', movie: 'Starfall Chronicles',  duration: 128, seats: '0/120',  status: 'upcoming' },
  { time: '17:00', movie: 'The Last Ember',       duration: 112, seats: '0/120',  status: 'upcoming' },
  { time: '19:30', movie: 'Neon Requiem',         duration: 105, seats: '0/120',  status: 'upcoming' },
];

export const SNACKS: Snack[] = [
  { id: 1, name: 'Large Popcorn',  price: 8.50, emoji: '🍿', stock: 140 },
  { id: 2, name: 'Cola Drink',     price: 4.50, emoji: '🥤', stock: 200 },
  { id: 3, name: 'Nachos & Dip',   price: 7.00, emoji: '🌮', stock: 80  },
  { id: 4, name: 'Chocolate Bar',  price: 3.50, emoji: '🍫', stock: 160 },
  { id: 5, name: 'Hot Dog',        price: 6.00, emoji: '🌭', stock: 60  },
  { id: 6, name: 'Mineral Water',  price: 2.50, emoji: '💧', stock: 300 },
];
