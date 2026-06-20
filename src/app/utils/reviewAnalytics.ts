import { Movie, Genre } from '../services/movieService';
import { Booking } from '../services/bookingService';
import { Review } from '../services/reviewService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MovieStats {
  movieId:      string;
  title:        string;
  genre:        string;       // genre name (or '—')
  emoji:        string;
  color:        string;
  year:         number;
  price:        number;
  watchesDay:   number;       // people who watched today
  watches7d:    number;       // …in the last 7 days
  watches30d:   number;       // …in the last 30 days (month)
  watches365d:  number;       // …in the last 365 days (year)
  watchesTotal: number;       // …all-time
  avgRating:    number;       // 0 when no reviews
  reviewCount:  number;
}

export type SortKey = 'rating' | 'watches' | 'title';
export type SortDir = 'asc' | 'desc';

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Local 'YYYY-MM-DD' for a Date. */
const localDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Whole days between a show date ('YYYY-MM-DD') and `now`, measured from the
 * start of each local day. 0 = today, 1 = yesterday, etc. Future dates → negative.
 */
const daysAgo = (showDate: string, now: Date): number => {
  const show  = new Date(`${showDate}T00:00:00`);
  const today = new Date(`${localDateString(now)}T00:00:00`);
  return Math.round((today.getTime() - show.getTime()) / MS_PER_DAY);
};

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Build per-movie watch + rating stats.
 *
 * "Watched" counts seats from bookings with status 'checked-in' (true
 * attendance), bucketed by the show's date relative to `now`. Each window is
 * cumulative (today ⊆ 7d ⊆ 30d ⊆ 365d ⊆ total).
 */
export const computeMovieStats = (
  movies:   Movie[],
  bookings: Booking[],
  reviews:  Review[],
  genres:   Genre[],
  now:      Date = new Date(),
): MovieStats[] => {
  const genreName = (id: string) => genres.find(g => g.id === id)?.name ?? '—';

  const watched = bookings.filter(b => b.status === 'checked-in');

  return movies.map(m => {
    const movieWatched = watched.filter(b => b.movieId === m.id);
    let watchesDay = 0, watches7d = 0, watches30d = 0, watches365d = 0, watchesTotal = 0;

    for (const b of movieWatched) {
      const seats = b.seats?.length ?? 0;
      watchesTotal += seats;
      const d = daysAgo(b.showDate, now);
      if (d < 0) continue;            // future-dated shows don't count as watched yet
      if (d === 0) watchesDay  += seats;
      if (d < 7)   watches7d   += seats;
      if (d < 30)  watches30d  += seats;
      if (d < 365) watches365d += seats;
    }

    const movieReviews = reviews.filter(r => r.movieId === m.id);
    const reviewCount  = movieReviews.length;
    const avgRating    = reviewCount
      ? movieReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;

    return {
      movieId: m.id,
      title:   m.title,
      genre:   genreName(m.genreId),
      emoji:   m.emoji,
      color:   m.color,
      year:    m.year,
      price:   m.price ?? 10,
      watchesDay, watches7d, watches30d, watches365d, watchesTotal,
      avgRating, reviewCount,
    };
  });
};

// ─── Time series (for the trend line chart) ───────────────────────────────────

export type TrendRange = 'today' | '7d' | '30d' | 'year' | 'all';

export const TREND_RANGES: { key: TrendRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d',    label: '7 Days' },
  { key: '30d',   label: 'Month' },
  { key: 'year',  label: 'Year' },
  { key: 'all',   label: 'All Time' },
];

export interface TimeSeriesPoint {
  label:   string;          // x-axis / tooltip label (time or date)
  watches: number;          // seats watched in this bucket
  rating:  number | null;   // avg rating in this bucket (null = no reviews)
}

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtDay   = (d: Date) => d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
const fmtMonth = (d: Date) => d.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });

interface Buckets {
  labels:  string[];
  indexOf: (t: Date) => number;   // bucket index for a timestamp, or -1 if outside the range
}

const buildBuckets = (range: TrendRange, now: Date, earliest: Date | null): Buckets => {
  // Today → one bucket per hour.
  if (range === 'today') {
    const labels  = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
    const today0  = startOfDay(now).getTime();
    return { labels, indexOf: (t) => (startOfDay(t).getTime() === today0 ? t.getHours() : -1) };
  }

  // 7 Days / Month → one bucket per day.
  if (range === '7d' || range === '30d') {
    const len  = range === '7d' ? 7 : 30;
    const base = startOfDay(now).getTime();
    const labels = Array.from({ length: len }, (_, i) => fmtDay(new Date(base - (len - 1 - i) * DAY)));
    return {
      labels,
      indexOf: (t) => {
        const diff = Math.round((base - startOfDay(t).getTime()) / DAY);
        return diff >= 0 && diff < len ? len - 1 - diff : -1;
      },
    };
  }

  // Year → last 12 months; All Time → from the earliest data month. One bucket per month.
  const m0     = now.getFullYear() * 12 + now.getMonth();
  const mStart = range === 'year'
    ? m0 - 11
    : earliest ? earliest.getFullYear() * 12 + earliest.getMonth() : m0;
  const len    = Math.max(1, m0 - mStart + 1);
  const labels = Array.from({ length: len }, (_, i) => {
    const m = mStart + i;
    return fmtMonth(new Date(Math.floor(m / 12), m % 12, 1));
  });
  return {
    labels,
    indexOf: (t) => {
      const idx = (t.getFullYear() * 12 + t.getMonth()) - mStart;
      return idx >= 0 && idx < len ? idx : -1;
    },
  };
};

/** When a booking's show actually happened (date + scheduled start time). */
const bookingDate = (b: Booking) => new Date(`${b.showDate}T${b.showTime || '00:00'}:00`);

/**
 * Build a watch + rating time series for a set of movies (`'all'` = every movie)
 * over the given range. Watches use checked-in bookings bucketed by show time;
 * ratings average the reviews created within each bucket (null = no reviews).
 */
export const computeTimeSeries = (
  movieIds: string[] | 'all',
  bookings: Booking[],
  reviews:  Review[],
  range:    TrendRange,
  now:      Date = new Date(),
): TimeSeriesPoint[] => {
  const inSet = movieIds === 'all' ? () => true : (id: string) => movieIds.includes(id);

  const relBookings = bookings.filter(b => b.status === 'checked-in' && inSet(b.movieId));
  const relReviews  = reviews.filter(r => inSet(r.movieId));

  // Earliest timestamp across the data, needed only to size the 'all' range.
  let earliest: Date | null = null;
  const consider = (d: Date) => { if (earliest === null || d.getTime() < earliest.getTime()) earliest = d; };
  if (range === 'all') {
    relBookings.forEach(b => consider(bookingDate(b)));
    relReviews.forEach(r => consider(new Date(r.createdAt)));
  }

  const { labels, indexOf } = buildBuckets(range, now, earliest);
  const watches   = labels.map(() => 0);
  const ratingSum = labels.map(() => 0);
  const ratingCnt = labels.map(() => 0);

  for (const b of relBookings) {
    const i = indexOf(bookingDate(b));
    if (i >= 0) watches[i] += b.seats?.length ?? 0;
  }
  for (const r of relReviews) {
    const i = indexOf(new Date(r.createdAt));
    if (i >= 0) { ratingSum[i] += r.rating; ratingCnt[i] += 1; }
  }

  return labels.map((label, i) => ({
    label,
    watches: watches[i],
    rating:  ratingCnt[i] ? ratingSum[i] / ratingCnt[i] : null,
  }));
};

/** Sort a copy of the stats array by the chosen key/direction. */
export const sortMovieStats = (
  stats: MovieStats[],
  key:   SortKey,
  dir:   SortDir,
): MovieStats[] => {
  const sign = dir === 'asc' ? 1 : -1;
  return [...stats].sort((a, b) => {
    let cmp: number;
    if (key === 'title')   cmp = a.title.localeCompare(b.title);
    else if (key === 'rating') cmp = a.avgRating - b.avgRating;
    else /* watches */     cmp = a.watchesTotal - b.watchesTotal;
    // Stable tiebreaker on title so ordering is deterministic.
    if (cmp === 0) cmp = a.title.localeCompare(b.title) * (dir === 'asc' ? 1 : -1);
    return cmp * sign;
  });
};
