import React, { useEffect, useMemo, useState } from 'react';
import { Card, StatCard, Modal, Button, Badge, BarChart, LineChart } from '../../components/ui';
import type { LineSeries } from '../../components/ui/LineChart';
import { useAuth } from '../../context/AuthContext';
import {
  Film, Star, Ticket, Search, Tags, Save, Hourglass, BarChart3,
  ArrowUp, IconGlyph,
} from '../../utils/icons';
import {
  Movie, Genre, subscribeToMovies, subscribeToGenres, updateMovie,
} from '../../services/movieService';
import { Booking, subscribeToAllBookings } from '../../services/bookingService';
import { Review, subscribeToAllReviews } from '../../services/reviewService';
import {
  MovieStats, SortKey, SortDir, TrendRange, TREND_RANGES,
  computeMovieStats, sortMovieStats, computeTimeSeries,
} from '../../utils/reviewAnalytics';
import { generateRankingPdf } from '../../utils/reviewReport';

// ─── Small helpers ──────────────────────────────────────────────────────────

const Stars = ({ value }: { value: number }) => {
  const rounded = Math.round(value);
  return (
    <span style={{ display: 'inline-flex', gap: 1, color: 'var(--gold)' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={13} fill={n <= rounded ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
};

const fmtRating = (s: MovieStats) => (s.reviewCount ? s.avgRating.toFixed(1) : '—');

const WatchGrid = ({ s }: { s: MovieStats }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
    {[
      { label: 'Today',  value: s.watchesDay },
      { label: '7 Days', value: s.watches7d },
      { label: '30 Days', value: s.watches30d },
      { label: 'Year',   value: s.watches365d },
    ].map(({ label, value }) => (
      <div key={label} style={{
        padding: '6px 4px', textAlign: 'center', background: 'var(--navy)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--gold)' }}>{value}</div>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      </div>
    ))}
  </div>
);

const RATING_LINE = '#6aa9ff';

type TrendMode = 'watches' | 'rating' | 'both';

/**
 * A single line chart across the cumulative windows, toggleable between the
 * watch line, the average-rating line, or both at once (dual y-axis).
 */
const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    style={{
      padding: '4px 12px', borderRadius: 99, cursor: 'pointer',
      fontSize: '0.74rem', fontWeight: active ? 600 : 400, fontFamily: 'var(--font-body)',
      border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
      background: active ? 'var(--gold)' : 'transparent',
      color: active ? 'var(--navy)' : 'var(--text-muted)',
      transition: 'all var(--transition)',
    }}
  >
    {children}
  </button>
);

const TrendChart = ({
  movieIds, bookings, reviews,
}: {
  movieIds: string[] | 'all'; bookings: Booking[]; reviews: Review[];
}) => {
  const [mode,  setMode]  = useState<TrendMode>('both');
  const [range, setRange] = useState<TrendRange>('7d');

  const ts = useMemo(
    () => computeTimeSeries(movieIds, bookings, reviews, range),
    [movieIds, bookings, reviews, range]
  );

  const watchSeries: LineSeries = {
    name: 'Watches', color: 'var(--gold)', type: 'bar', axis: 'left', yMin: 0,
    points: ts.map(p => ({ label: p.label, value: p.watches })),
  };
  const ratingSeries: LineSeries = {
    name: 'Avg Rating', color: RATING_LINE, axis: 'right', yMin: 0, yMax: 5,
    format: (n) => n.toFixed(1),
    points: ts.map(p => ({ label: p.label, value: p.rating })),
  };

  // With a single metric, scale it on the left axis for a clean single-axis look.
  const series: LineSeries[] =
    mode === 'watches' ? [watchSeries] :
    mode === 'rating'  ? [{ ...ratingSeries, axis: 'left' }] :
    [watchSeries, ratingSeries];

  const MODES: { key: TrendMode; label: string }[] = [
    { key: 'watches', label: 'Watches' },
    { key: 'rating',  label: 'Avg Rating' },
    { key: 'both',    label: 'Both' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {MODES.map(m => (
          <Pill key={m.key} active={mode === m.key} onClick={() => setMode(m.key)}>{m.label}</Pill>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {TREND_RANGES.map(r => (
          <Pill key={r.key} active={range === r.key} onClick={() => setRange(r.key)}>{r.label}</Pill>
        ))}
      </div>
      <LineChart series={series} height={260} />
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const MovieReviews = () => {
  const { role } = useAuth();

  const [movies,   setMovies]   = useState<Movie[]>([]);
  const [genres,   setGenres]   = useState<Genre[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews,  setReviews]  = useState<Review[]>([]);

  // Toolbar / filters
  const [search,      setSearch]      = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [genreFilter, setGenreFilter] = useState('All');
  const [minRating,   setMinRating]   = useState(0);
  const [yearFilter,  setYearFilter]  = useState('All');
  const [minWatches,  setMinWatches]  = useState(0);
  const [sortKey,     setSortKey]     = useState<SortKey>('watches');
  const [sortDir,     setSortDir]     = useState<SortDir>('desc');

  // Selection / modals
  const [selected,    setSelected]    = useState<string[]>([]);
  const [detailId,    setDetailId]    = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [showReport,  setShowReport]  = useState(false);

  useEffect(() => {
    const u1 = subscribeToMovies(setMovies);
    const u2 = subscribeToGenres(setGenres);
    const u3 = subscribeToAllBookings(setBookings);
    const u4 = subscribeToAllReviews(setReviews);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const stats = useMemo(
    () => computeMovieStats(movies, bookings, reviews, genres),
    [movies, bookings, reviews, genres]
  );

  const years = useMemo(
    () => Array.from(new Set(movies.map(m => m.year))).sort((a, b) => b - a),
    [movies]
  );

  // ── Filter → sort pipeline ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = stats.filter(s => {
      const matchSearch = !q || s.title.toLowerCase().includes(q) || s.genre.toLowerCase().includes(q);
      const matchGenre  = genreFilter === 'All' || s.genre === genreFilter;
      const matchRating = s.avgRating >= minRating;
      const matchYear   = yearFilter === 'All' || String(s.year) === yearFilter;
      const matchWatch  = s.watchesTotal >= minWatches;
      return matchSearch && matchGenre && matchRating && matchYear && matchWatch;
    });
    return sortMovieStats(out, sortKey, sortDir);
  }, [stats, search, genreFilter, minRating, yearFilter, minWatches, sortKey, sortDir]);

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectedStats = stats.filter(s => selected.includes(s.movieId));
  const detail = detailId ? stats.find(s => s.movieId === detailId) ?? null : null;

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalWatches  = stats.reduce((sum, s) => sum + s.watchesTotal, 0);
  const totalReviews  = reviews.length;
  const overallRating = totalReviews
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Movie Reviews & Insights</h2>
        <p>
          {role === 'Admin' ? 'Cinema-wide' : 'Cinema'} viewership and ratings for every movie.
          Compare titles, drill into reviews, and export a ranking report.
        </p>
      </div>

      {/* Summary */}
      <div className="stats-grid">
        <StatCard icon={<Film size={22} />}       value={movies.length}             label="Movies"        delay={1} />
        <StatCard icon={<Ticket size={22} />}     value={totalWatches.toLocaleString()} label="Total Watches" delay={2} />
        <StatCard icon={<Star size={22} />}       value={totalReviews ? overallRating.toFixed(2) : '—'} label="Avg Rating" delay={3} />
        <StatCard icon={<BarChart3 size={22} />}  value={totalReviews}              label="Total Reviews" delay={4} />
      </div>

      {/* Toolbar */}
      <div className="table-toolbar" style={{ marginBottom: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 180 }}>
          <span className="search-icon"><Search size={14} /></span>
          <input
            className="input-field"
            placeholder="Search title or genre…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select className="select-field" style={{ width: 'auto' }} value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}>
          <option value="watches">Sort: Watches</option>
          <option value="rating">Sort: Rating</option>
          <option value="title">Sort: Title</option>
        </select>
        <Button
          variant="outline" size="sm"
          icon={<ArrowUp size={14} style={{ transform: sortDir === 'desc' ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition)' }} />}
          onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
        >
          {sortDir === 'asc' ? 'Asc' : 'Desc'}
        </Button>
        <Button variant="outline" size="sm" icon={<Tags size={14} />} onClick={() => setShowAdvanced(v => !v)}>
          {showAdvanced ? 'Hide Filters' : 'Filters'}
        </Button>
        <Button size="sm" icon={<Save size={14} />} onClick={() => setShowReport(true)}>Report</Button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <Card>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Genre</label>
              <select className="select-field" value={genreFilter} onChange={e => setGenreFilter(e.target.value)}>
                <option value="All">All Genres</option>
                {genres.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Release Year</label>
              <select className="select-field" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                <option value="All">All Years</option>
                {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Min Avg Rating: {minRating}</label>
              <input type="range" min={0} max={5} step={0.5} value={minRating}
                onChange={e => setMinRating(parseFloat(e.target.value))} />
            </div>
            <div className="input-group">
              <label className="input-label">Min Total Watches</label>
              <input className="input-field" type="number" min={0} value={minWatches}
                onChange={e => setMinWatches(parseInt(e.target.value) || 0)} />
            </div>
          </div>
        </Card>
      )}

      {/* Selection bar */}
      {selected.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '10px 14px', margin: '12px 0', background: 'var(--surface)',
          border: '1px solid var(--gold)', borderRadius: 'var(--radius)',
        }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {selected.length} movie{selected.length !== 1 ? 's' : ''} selected
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="outline" onClick={() => setSelected([])}>Clear</Button>
            <Button size="sm" icon={<BarChart3 size={14} />} disabled={selected.length < 2} onClick={() => setShowCompare(true)}>
              Compare ({selected.length})
            </Button>
          </div>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Film size={32} /></div>
          <div className="empty-state-text">
            {movies.length === 0 ? 'No movies yet.' : 'No movies match your filters.'}
          </div>
        </div>
      ) : (
        <div className="three-col" style={{ marginTop: 16 }}>
          {filtered.map(s => {
            const isSel = selected.includes(s.movieId);
            return (
              <div key={s.movieId} className="movie-card" style={{ border: isSel ? '1px solid var(--gold)' : undefined }}>
                <div
                  className="movie-poster"
                  style={{ background: s.color || '#1a1628', cursor: 'pointer', position: 'relative' }}
                  onClick={() => setDetailId(s.movieId)}
                >
                  <span style={{ color: 'var(--gold)' }}><IconGlyph iconKey={s.emoji} size={44} /></span>
                  <label
                    onClick={e => { e.stopPropagation(); }}
                    style={{ position: 'absolute', top: 8, left: 8, display: 'flex', cursor: 'pointer' }}
                  >
                    <input type="checkbox" checked={isSel} onChange={() => toggleSelect(s.movieId)} />
                  </label>
                  <div className="movie-genre-tag"><Badge variant="muted">{s.genre}</Badge></div>
                </div>
                <div className="movie-info">
                  <div className="movie-title" style={{ cursor: 'pointer' }} onClick={() => setDetailId(s.movieId)}>{s.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 10px' }}>
                    <Stars value={s.avgRating} />
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {fmtRating(s)} · {s.reviewCount} review{s.reviewCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <WatchGrid s={s} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Detail modal ── */}
      <Modal
        title={detail?.title ?? ''}
        open={!!detail}
        onClose={() => setDetailId(null)}
        className="modal-lg"
        footer={<Button onClick={() => setDetailId(null)}>Close</Button>}
      >
        {detail && (
          <DetailBody
            stats={detail}
            reviews={reviews.filter(r => r.movieId === detail.movieId)}
            bookings={bookings}
            allReviews={reviews}
          />
        )}
      </Modal>

      {/* ── Compare modal ── */}
      <Modal
        title={`Compare Movies (${selectedStats.length})`}
        open={showCompare}
        onClose={() => setShowCompare(false)}
        footer={<Button onClick={() => setShowCompare(false)}>Close</Button>}
      >
        <CompareBody stats={selectedStats} />
      </Modal>

      {/* ── Report modal ── */}
      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        stats={filtered}
      />
    </div>
  );
};

// ─── Detail body (watch breakdown + price edit + reviews) ──────────────────────

const DetailBody = ({
  stats, reviews, bookings, allReviews,
}: {
  stats: MovieStats; reviews: Review[]; bookings: Booking[]; allReviews: Review[];
}) => {
  const [price,  setPrice]  = useState(String(stats.price));
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const movieIds = useMemo(() => [stats.movieId], [stats.movieId]);

  useEffect(() => { setPrice(String(stats.price)); setSaved(false); }, [stats.movieId, stats.price]);

  const handleSavePrice = async () => {
    const value = parseFloat(price);
    if (isNaN(value) || value < 0) return;
    setSaving(true);
    try {
      await updateMovie(stats.movieId, { price: value });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Headline stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 'var(--radius)', flexShrink: 0,
          background: stats.color || '#1a1628', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: 'var(--gold)',
        }}>
          <IconGlyph iconKey={stats.emoji} size={30} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Stars value={stats.avgRating} />
            <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{fmtRating(stats)}</span>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              ({stats.reviewCount} review{stats.reviewCount !== 1 ? 's' : ''})
            </span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {stats.genre} · {stats.year} · {stats.watchesTotal} total watches
          </div>
        </div>
      </div>

      {/* Watch breakdown */}
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        Watches
      </div>
      <div style={{ marginBottom: 18 }}><WatchGrid s={stats} /></div>

      {/* Trend line (toggle metric + time range) */}
      <div style={{ marginBottom: 18 }}>
        <TrendChart movieIds={movieIds} bookings={bookings} reviews={allReviews} />
      </div>

      {/* Editable price (Admin + Manager) */}
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        Ticket Price
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>RM</span>
        <input
          className="input-field" type="number" min={0} step={0.5}
          value={price}
          onChange={e => { setPrice(e.target.value); setSaved(false); }}
          style={{ maxWidth: 120 }}
        />
        <Button size="sm" onClick={handleSavePrice} disabled={saving}
          icon={saving ? <Hourglass size={14} /> : <Save size={14} />}>
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </Button>
      </div>

      {/* Reviews */}
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        Individual Reviews ({reviews.length})
      </div>
      {reviews.length === 0 ? (
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '10px 0' }}>No reviews yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
          {reviews.map(r => (
            <div key={r.id} style={{ padding: '10px 12px', background: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{r.displayName || r.username}</span>
                <Stars value={r.rating} />
              </div>
              {r.comment && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>{r.comment}</div>
              )}
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6 }}>
                {r.createdAt?.split('T')[0]}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Compare body ─────────────────────────────────────────────────────────────

const CompareBody = ({ stats }: { stats: MovieStats[] }) => {
  if (stats.length < 2) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Select at least two movies to compare.</div>;
  }
  const watchData  = stats.map(s => ({ label: s.title, value: s.watchesTotal }));
  const ratingData = stats.map(s => ({ label: s.title, value: Number(s.avgRating.toFixed(1)) }));

  return (
    <div>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        Total Watches
      </div>
      <div style={{ marginBottom: 18 }}><BarChart data={watchData} /></div>

      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        Average Rating
      </div>
      <div style={{ marginBottom: 18 }}><BarChart data={ratingData} /></div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Movie</th><th>Today</th><th>7d</th><th>30d</th><th>Year</th><th>Total</th><th>Rating</th></tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.movieId}>
                <td>{s.title}</td>
                <td>{s.watchesDay}</td>
                <td>{s.watches7d}</td>
                <td>{s.watches30d}</td>
                <td>{s.watches365d}</td>
                <td>{s.watchesTotal}</td>
                <td>{fmtRating(s)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Report modal ─────────────────────────────────────────────────────────────

const REPORT_DEFAULT_CAP = 25;

const ReportModal = ({
  open, onClose, stats,
}: {
  open: boolean; onClose: () => void; stats: MovieStats[];
}) => {
  const [picked,  setPicked]  = useState<string[]>([]);
  const [basis,   setBasis]   = useState<SortKey>('watches');

  // When opened, default-select the strongest movies (capped) by total watches.
  useEffect(() => {
    if (!open) return;
    const top = sortMovieStats(stats, 'watches', 'desc')
      .slice(0, REPORT_DEFAULT_CAP)
      .map(s => s.movieId);
    setPicked(top);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) =>
    setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleDownload = () => {
    generateRankingPdf(stats, { selectedIds: picked, sortKey: basis });
    onClose();
  };

  return (
    <Modal
      title="Export Ranking Report"
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleDownload} disabled={picked.length === 0} icon={<Save size={14} />}>
            Download PDF ({picked.length})
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div className="input-group" style={{ margin: 0 }}>
          <label className="input-label">Rank by</label>
          <select className="select-field" style={{ width: 'auto' }} value={basis} onChange={e => setBasis(e.target.value as SortKey)}>
            <option value="watches">Total Watches</option>
            <option value="rating">Average Rating</option>
            <option value="title">Title</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
          <Button size="sm" variant="outline" onClick={() => setPicked(stats.map(s => s.movieId))}>Select All</Button>
          <Button size="sm" variant="outline" onClick={() => setPicked([])}>Clear</Button>
        </div>
      </div>

      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 8 }}>
        Choose which movies to include. Defaults to the top {REPORT_DEFAULT_CAP} by watches.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
        {stats.map(s => (
          <label key={s.movieId} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            background: 'var(--navy)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', cursor: 'pointer',
          }}>
            <input type="checkbox" checked={picked.includes(s.movieId)} onChange={() => toggle(s.movieId)} />
            <span style={{ flex: 1, fontSize: '0.83rem' }}>{s.title}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {s.watchesTotal} watches · {fmtRating(s)}★
            </span>
          </label>
        ))}
      </div>
    </Modal>
  );
};

export default MovieReviews;
