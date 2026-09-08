import React from 'react';
import BarChart from './BarChart';
import { pctText } from '../../utils/metrics';

interface ReviewLike { rating: number; createdAt: string }

interface ReviewSummaryProps {
  /** Reviews in scope — pass the movie-filtered set so the numbers follow the filter. */
  reviews: ReviewLike[];
  /** Label naming what's in scope, e.g. a movie title or "all movies". */
  scope?: string;
}

const Tile = ({ value, label, tone }: { value: string | number; label: string; tone?: string }) => (
  <div className="mini-stat">
    <div className="mini-stat-value" style={tone ? { color: tone } : undefined}>{value}</div>
    <div className="mini-stat-label">{label}</div>
  </div>
);

/**
 * Review health for whatever is currently in scope.
 *
 * A bare "5 stars: 12" is unreadable without a denominator, and an average
 * alone hides whether it came from consensus or from a fight. So: how loud is
 * the feedback, how positive, is it still arriving, and how is it spread.
 */
const ReviewSummary = ({ reviews, scope }: ReviewSummaryProps) => {
  const n = reviews.length;

  if (n === 0) {
    return (
      <div style={{ padding: '14px 0', color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>
        No reviews yet{scope ? ` for ${scope}` : ''}.
      </div>
    );
  }

  const avg      = reviews.reduce((s, r) => s + r.rating, 0) / n;
  const positive = reviews.filter(r => r.rating >= 4).length;
  const negative = reviews.filter(r => r.rating <= 2).length;

  const since = (days: number) => {
    const cut = Date.now() - days * 24 * 60 * 60 * 1000;
    return reviews.filter(r => new Date(r.createdAt).getTime() > cut).length;
  };
  const thisWeek = since(7);
  const prevWeek = since(14) - thisWeek;
  const weekChange = prevWeek > 0 ? ((thisWeek - prevWeek) / prevWeek) * 100 : null;
  const weekDelta  = weekChange === null ? null : `${weekChange > 0 ? '+' : ''}${pctText(weekChange)}`;

  // Spread matters: a 3.5 from all-3s is a different problem from a 3.5 that is
  // half 5s and half 1s.
  const distribution = [5, 4, 3, 2, 1].map(star => ({
    label: `${star} ★`,
    value: reviews.filter(r => r.rating === star).length,
  }));

  return (
    <div>
      <div className="mini-stat-row">
        <Tile value={n.toLocaleString()} label="Reviews" />
        <Tile value={`${avg.toFixed(1)} / 5`} label="Avg Rating" />
        <Tile
          value={pctText((positive / n) * 100)}
          label="Positive (4★+)"
          tone={positive / n >= 0.6 ? 'var(--success)' : negative / n >= 0.4 ? 'var(--danger)' : undefined}
        />
        <Tile value={weekDelta ? `${thisWeek} (${weekDelta})` : thisWeek} label="This Week" />
      </div>

      <div className="mini-stat-caption">Rating spread</div>
      <BarChart data={distribution} />
    </div>
  );
};

export default ReviewSummary;
