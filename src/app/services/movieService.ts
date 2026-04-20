import {
  ref, set, get, update, remove, push, onValue, off,
} from 'firebase/database';
import { db } from '../config/firebase';

// ─── Genre Types ──────────────────────────────────────────────────────────────

export interface Genre {
  id:    string;
  name:  string;
  emoji: string;   // default poster emoji for this genre
  color: string;   // default poster background color
}

export type GenrePayload = Omit<Genre, 'id'>;

// ─── Movie Types ──────────────────────────────────────────────────────────────

export interface Movie {
  id:        string;
  title:     string;
  genreId:   string;   // references Genre.id
  duration:  number;
  year:      number;
  rating:    number;   // 0–10
  synopsis:  string;
  director:  string;
  cast:      string;   // comma-separated
  emoji:     string;   // overrides genre default if set
  color:     string;   // overrides genre default if set
  createdBy: string;
  createdAt: string;
}

export type MoviePayload = Omit<Movie, 'id' | 'createdAt'>;

// ─── Firebase refs ────────────────────────────────────────────────────────────
const genresRef = () => ref(db, 'genres');
const genreRef  = (id: string) => ref(db, `genres/${id}`);
const moviesRef = () => ref(db, 'movies');
const movieRef  = (id: string) => ref(db, `movies/${id}`);

// ─── Genre CRUD ───────────────────────────────────────────────────────────────

export const createGenre = async (payload: GenrePayload): Promise<Genre> => {
  const newRef = push(genresRef());
  const id     = newRef.key!;
  const genre: Genre = { id, ...payload };
  await set(newRef, genre);
  return genre;
};

export const updateGenre = async (
  id: string, payload: Partial<GenrePayload>
): Promise<void> => {
  await update(genreRef(id), payload);
};

export const deleteGenre = async (id: string): Promise<void> => {
  await remove(genreRef(id));
};

export const subscribeToGenres = (
  callback: (genres: Genre[]) => void
): (() => void) => {
  const dbRef = genresRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.values(snap.val()) as Genre[]);
  });
  return () => off(dbRef);
};

// ─── Movie CRUD ───────────────────────────────────────────────────────────────

export const createMovie = async (payload: MoviePayload): Promise<Movie> => {
  const newRef = push(moviesRef());
  const id     = newRef.key!;
  const movie: Movie = { ...payload, id, createdAt: new Date().toISOString() };
  await set(newRef, movie);
  return movie;
};

export const updateMovie = async (
  id: string, payload: Partial<MoviePayload>
): Promise<void> => {
  await update(movieRef(id), payload);
};

export const deleteMovie = async (id: string): Promise<void> => {
  await remove(movieRef(id));
};

export const subscribeToMovies = (
  callback: (movies: Movie[]) => void
): (() => void) => {
  const dbRef = moviesRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.values(snap.val()) as Movie[]);
  });
  return () => off(dbRef);
};

// ─── Seed default genres (call once on first setup) ───────────────────────────

export const seedDefaultGenres = async (): Promise<void> => {
  const snap = await get(genresRef());
  if (snap.exists()) return; // already seeded

  const defaults: GenrePayload[] = [
    { name: 'Action',      emoji: '💥', color: '#281610' },
    { name: 'Drama',       emoji: '🌊', color: '#1a1628' },
    { name: 'Sci-Fi',      emoji: '🚀', color: '#162040' },
    { name: 'Comedy',      emoji: '😂', color: '#162028' },
    { name: 'Horror',      emoji: '👁️', color: '#281620' },
    { name: 'Thriller',    emoji: '🌃', color: '#16281e' },
    { name: 'Adventure',   emoji: '🏔️', color: '#281e10' },
    { name: 'Romance',     emoji: '🌹', color: '#28101e' },
    { name: 'Animation',   emoji: '✨', color: '#101e28' },
    { name: 'Documentary', emoji: '🎙️', color: '#1e2810' },
  ];

  for (const g of defaults) await createGenre(g);
  console.log('✅ Default genres seeded.');
};