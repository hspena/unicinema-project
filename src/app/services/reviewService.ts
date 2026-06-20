import {
  ref, set, get, update, remove, push, onValue, off,
} from 'firebase/database';
import { db } from '../config/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Review {
  id:          string;
  movieId:     string;
  userId:      string;
  displayName: string;   // snapshot at time of writing
  username:    string;
  rating:      number;   // 1–5 stars
  comment:     string;
  bookingId:   string;   // must have a booking to review
  createdAt:   string;
  updatedAt?:  string;
}

export type ReviewPayload = Omit<Review, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Firebase refs ────────────────────────────────────────────────────────────
const reviewsRef   = () => ref(db, 'reviews');
const reviewRef    = (id: string) => ref(db, `reviews/${id}`);

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createReview = async (payload: ReviewPayload): Promise<Review> => {
  const newRef = push(reviewsRef());
  const id     = newRef.key!;
  const review: Review = { ...payload, id, createdAt: new Date().toISOString() };
  await set(newRef, review);
  return review;
};

export const updateReview = async (
  id: string, rating: number, comment: string
): Promise<void> => {
  await update(reviewRef(id), { rating, comment, updatedAt: new Date().toISOString() });
};

export const deleteReview = async (id: string): Promise<void> => {
  await remove(reviewRef(id));
};

/** Get all reviews for a movie */
export const subscribeToMovieReviews = (
  movieId: string,
  callback: (reviews: Review[]) => void
): (() => void) => {
  const dbRef = reviewsRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const all = Object.values(snap.val()) as Review[];
    callback(
      all
        .filter(r => r.movieId === movieId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  });
  return () => off(dbRef);
};

/** Get all reviews across every movie (newest first) */
export const subscribeToAllReviews = (
  callback: (reviews: Review[]) => void
): (() => void) => {
  const dbRef = reviewsRef();
  onValue(dbRef, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const all = Object.values(snap.val()) as Review[];
    callback(
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  });
  return () => off(dbRef);
};

/** Check if a user has already reviewed a movie via a specific booking */
export const getUserReviewForMovie = async (
  userId: string, movieId: string
): Promise<Review | null> => {
  const snap = await get(reviewsRef());
  if (!snap.exists()) return null;
  const all  = Object.values(snap.val()) as Review[];
  return all.find(r => r.userId === userId && r.movieId === movieId) ?? null;
};

/** Get average rating for a movie */
export const getMovieAverageRating = (reviews: Review[]): number => {
  if (!reviews.length) return 0;
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
};