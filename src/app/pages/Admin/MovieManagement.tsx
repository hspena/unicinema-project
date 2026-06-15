import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal, IconPicker } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import {
  AlertTriangle, Search, Tags, Hourglass, Save, Film, IconGlyph, GENRE_ICON_KEYS,
} from '../../utils/icons';
import {
  Genre, GenrePayload, Movie, MoviePayload, ContentRating, CONTENT_RATINGS,
  subscribeToGenres, subscribeToMovies,
  createGenre, updateGenre, deleteGenre,
  createMovie,  updateMovie,  deleteMovie,
  seedDefaultGenres,
} from '../../services/movieService';
import { broadcastPromoToMoviegoers } from '../../services/notificationService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RatingBadge = ({ rating }: { rating: ContentRating }) => {
  const variant: 'success' | 'gold' | 'danger' =
    rating === 'U' || rating === 'PG' ? 'success' :
    rating === 'PG-13' || rating === '16' ? 'gold' : 'danger';
  return <Badge variant={variant}>{rating}</Badge>;
};

const emptyMovieForm = (): Omit<MoviePayload, 'createdBy'> => ({
  title: '', genreId: '', duration: 90, year: new Date().getFullYear(),
  rating: 'PG-13', synopsis: '', director: '', cast: '', emoji: '', color: '',
});

const emptyGenreForm = (): GenrePayload => ({
  name: '', emoji: '', color: '#1a1628',
});

// ─── Genre Form ───────────────────────────────────────────────────────────────

const GenreForm = ({
  form, setForm, error,
}: {
  form:    GenrePayload;
  setForm: React.Dispatch<React.SetStateAction<GenrePayload>>;
  error:   string;
}) => (
  <>
    {error && <div className="auth-error" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {error}</div>}

    {/* Live preview */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: 12,
      background: 'var(--navy)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', marginBottom: 16,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 'var(--radius)',
        background: form.color || '#1a1628',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--gold)', flexShrink: 0,
      }}>
        <IconGlyph iconKey={form.emoji} size={26} />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
          {form.name || 'Genre Name'}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
          Preview
        </div>
      </div>
    </div>

    <div className="input-group">
      <label className="input-label">Genre Name *</label>
      <input
        className="input-field"
        placeholder="e.g. Sci-Fi, Documentary"
        value={form.name}
        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
      />
    </div>

    <div className="input-row">
      <div className="input-group">
        <label className="input-label">Default Icon</label>
        <IconPicker
          value={form.emoji}
          onChange={key => setForm(p => ({ ...p, emoji: key }))}
          options={GENRE_ICON_KEYS}
        />
      </div>
      <div className="input-group">
        <label className="input-label">Default Poster Color</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="input-field"
            placeholder="#1a1628"
            value={form.color}
            onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
            style={{ flex: 1 }}
          />
          <input
            type="color"
            value={form.color || '#1a1628'}
            onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
            style={{ width: 36, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer' }}
          />
        </div>
      </div>
    </div>
  </>
);

// ─── Movie Form ───────────────────────────────────────────────────────────────

const MovieForm = ({
  form, setForm, genres, error,
}: {
  form:    Omit<MoviePayload, 'createdBy'>;
  setForm: React.Dispatch<React.SetStateAction<Omit<MoviePayload, 'createdBy'>>>;
  genres:  Genre[];
  error:   string;
}) => {
  const selectedGenre = genres.find(g => g.id === form.genreId);

  return (
    <>
      {error && <div className="auth-error" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {error}</div>}

      {/* Live preview */}
      <div className="mf-preview">
        <div
          className="mf-preview-poster"
          style={{ background: form.color || selectedGenre?.color || '#1a1628', color: 'var(--gold)' }}
        >
          <IconGlyph iconKey={form.emoji || selectedGenre?.emoji} size={36} />
        </div>
        <div className="mf-preview-info">
          <div className="mf-preview-title">{form.title || 'Movie Title'}</div>
          <div className="mf-preview-meta">
            {form.year} · {form.duration} min
            {selectedGenre && <> · <Badge variant="gold">{selectedGenre.name}</Badge></>}
          </div>
          <RatingBadge rating={form.rating} />
        </div>
      </div>

      {/* Title */}
      <div className="input-group">
        <label className="input-label">Movie Title *</label>
        <input
          className="input-field"
          placeholder="e.g. Starfall Chronicles"
          value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
        />
      </div>

      {/* Genre + Duration */}
      <div className="input-row">
        <div className="input-group">
          <label className="input-label">Genre *</label>
          <select
            className="select-field"
            value={form.genreId}
            onChange={e => {
              const g = genres.find(x => x.id === e.target.value);
              setForm(p => ({
                ...p,
                genreId: e.target.value,
                emoji: p.emoji || g?.emoji || '',
                color: p.color || g?.color || '',
              }));
            }}
          >
            <option value="">Select genre…</option>
            {genres.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Duration (min) *</label>
          <input
            className="input-field" type="number" min={1} max={300}
            value={form.duration}
            onChange={e => setForm(p => ({ ...p, duration: parseInt(e.target.value) || 0 }))}
          />
        </div>
      </div>

      {/* Year + Rating */}
      <div className="input-row">
        <div className="input-group">
          <label className="input-label">Release Year *</label>
          <input
            className="input-field" type="number" min={1900} max={2099}
            value={form.year}
            onChange={e => setForm(p => ({ ...p, year: parseInt(e.target.value) || 2025 }))}
          />
        </div>
        <div className="input-group">
          <label className="input-label">Content Rating *</label>
          <select
            className="select-field"
            value={form.rating}
            onChange={e => setForm(p => ({ ...p, rating: e.target.value as ContentRating }))}
          >
            {CONTENT_RATINGS.map(r => (
              <option key={r.value} value={r.value}>{r.label} — {r.description}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Director + Cast */}
      <div className="input-group">
        <label className="input-label">Director</label>
        <input
          className="input-field" placeholder="e.g. Ahmad Fadzli"
          value={form.director}
          onChange={e => setForm(p => ({ ...p, director: e.target.value }))}
        />
      </div>
      <div className="input-group">
        <label className="input-label">Cast (comma-separated)</label>
        <input
          className="input-field" placeholder="e.g. Ali, Siti, Rahman"
          value={form.cast}
          onChange={e => setForm(p => ({ ...p, cast: e.target.value }))}
        />
      </div>

      {/* Custom poster */}
      <div className="input-row">
        <div className="input-group">
          <label className="input-label">Custom Icon (optional)</label>
          <IconPicker
            value={form.emoji}
            onChange={key => setForm(p => ({ ...p, emoji: p.emoji === key ? '' : key }))}
            options={GENRE_ICON_KEYS}
          />
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 5 }}>
            Click to override the genre's default icon. Click again to clear.
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">Custom Color (optional)</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="input-field"
              placeholder={selectedGenre?.color || '#1a1628'}
              value={form.color}
              onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
              style={{ flex: 1 }}
            />
            <input
              type="color"
              value={form.color || selectedGenre?.color || '#1a1628'}
              onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
              style={{ width: 36, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>

      <div className="input-group">
        <label className="input-label">Synopsis</label>
        <textarea
          className="textarea-field" rows={3}
          placeholder="Brief description of the movie…"
          value={form.synopsis}
          onChange={e => setForm(p => ({ ...p, synopsis: e.target.value }))}
        />
      </div>
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const MovieManagement = () => {
  const { uid } = useAuth();

  const [genres, setGenres] = useState<Genre[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [tab,    setTab]    = useState<'movies' | 'genres'>('movies');

  // ── Search / filter ────────────────────────────────────────────────────────
  const [search,      setSearch]      = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('All');

  // ── Genre modal state ──────────────────────────────────────────────────────
  const [showAddGenre,  setShowAddGenre]  = useState(false);
  const [editGenre,     setEditGenre]     = useState<Genre | null>(null);
  const [genreForm,     setGenreForm]     = useState<GenrePayload>(emptyGenreForm());
  const [genreError,    setGenreError]    = useState('');
  const [genreSaving,   setGenreSaving]   = useState(false);

  // ── Movie modal state ──────────────────────────────────────────────────────
  const [showAddMovie,  setShowAddMovie]  = useState(false);
  const [editMovie,     setEditMovie]     = useState<Movie | null>(null);
  const [detailMovie,   setDetailMovie]   = useState<Movie | null>(null);
  const [movieForm,     setMovieForm]     = useState(emptyMovieForm());
  const [movieError,    setMovieError]    = useState('');
  const [movieSaving,   setMovieSaving]   = useState(false);

  // ── Subscriptions ──────────────────────────────────────────────────────────
  useEffect(() => {
    const u1 = subscribeToGenres(setGenres);
    const u2 = subscribeToMovies(setMovies);
    return () => { u1(); u2(); };
  }, []);

  // ── Seed genres on first load ──────────────────────────────────────────────
  useEffect(() => {
    seedDefaultGenres();
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const genreById = (id: string) => genres.find(g => g.id === id);

  const filteredMovies = movies.filter(m => {
    const genre = genreById(m.genreId);
    const q = search.toLowerCase();
    const matchSearch =
      m.title.toLowerCase().includes(q)    ||
      m.director?.toLowerCase().includes(q)||
      m.cast?.toLowerCase().includes(q)    ||
      genre?.name.toLowerCase().includes(q);
    const matchGenre = genreFilter === 'All' || m.genreId === genreFilter;
    return matchSearch && matchGenre;
  });

  // ── Genre actions ──────────────────────────────────────────────────────────
  const openAddGenre = () => {
    setGenreForm(emptyGenreForm());
    setGenreError('');
    setShowAddGenre(true);
  };

  const openEditGenre = (g: Genre) => {
    setGenreForm({ name: g.name, emoji: g.emoji, color: g.color });
    setGenreError('');
    setEditGenre(g);
  };

  const handleSaveGenre = async () => {
    if (!genreForm.name.trim()) { setGenreError('Genre name is required.'); return; }
    setGenreSaving(true);
    setGenreError('');
    try {
      if (editGenre) {
        await updateGenre(editGenre.id, genreForm);
        setEditGenre(null);
      } else {
        await createGenre(genreForm);
        setShowAddGenre(false);
      }
    } catch (e: any) {
      setGenreError(e.message ?? 'Failed to save genre.');
    } finally {
      setGenreSaving(false);
    }
  };

  const handleDeleteGenre = async (g: Genre) => {
    const inUse = movies.some(m => m.genreId === g.id);
    if (inUse) {
      alert(`Cannot delete "${g.name}" — it is used by ${movies.filter(m => m.genreId === g.id).length} movie(s). Re-assign those movies first.`);
      return;
    }
    if (!window.confirm(`Delete genre "${g.name}"?`)) return;
    await deleteGenre(g.id);
  };

  // ── Movie actions ──────────────────────────────────────────────────────────
  const openAddMovie = () => {
    setMovieForm(emptyMovieForm());
    setMovieError('');
    setShowAddMovie(true);
  };

  const openEditMovie = (m: Movie) => {
    setMovieForm({
      title: m.title, genreId: m.genreId, duration: m.duration,
      year: m.year, rating: m.rating, synopsis: m.synopsis,
      director: m.director, cast: m.cast, emoji: m.emoji, color: m.color,
    });
    setMovieError('');
    setEditMovie(m);
  };

  const validateMovie = () => {
    if (!movieForm.title.trim())  return 'Movie title is required.';
    if (!movieForm.genreId)       return 'Please select a genre.';
    if (movieForm.duration < 1)   return 'Duration must be at least 1 minute.';
    if (movieForm.year < 1900)    return 'Please enter a valid year.';
    return '';
  };

  const handleSaveMovie = async () => {
    const err = validateMovie();
    if (err) { setMovieError(err); return; }
    setMovieSaving(true);
    setMovieError('');
    try {
      const genre = genreById(movieForm.genreId);
      const payload: MoviePayload = {
        ...movieForm,
        emoji:     movieForm.emoji || genre?.emoji || 'film',
        color:     movieForm.color || genre?.color || '#1a1628',
        createdBy: uid ?? 'unknown',
      };
      if (editMovie) {
        await updateMovie(editMovie.id, payload);
        setEditMovie(null);
      } else {
        await createMovie(payload);
        setShowAddMovie(false);
        // Let opted-in moviegoers know a new movie is now showing.
        broadcastPromoToMoviegoers({
          type:    'movie',
          title:   'New movie added',
          message: `${payload.title} is now in the catalogue`,
        });
      }
    } catch (e: any) {
      setMovieError(e.message ?? 'Failed to save movie.');
    } finally {
      setMovieSaving(false);
    }
  };

  const handleDeleteMovie = async (m: Movie) => {
    if (!window.confirm(`Delete "${m.title}"?`)) return;
    await deleteMovie(m.id);
    if (detailMovie?.id === m.id) setDetailMovie(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Movie Management</h2>
        <p>Manage movies and genres available across all cinema rooms.</p>
      </div>

      {/* Tabs */}
      <div className="rm-tabs" style={{ marginBottom: 20 }}>
        <button className={`rm-tab ${tab === 'movies' ? 'active' : ''}`} onClick={() => setTab('movies')}>
          <Film size={14} style={{ verticalAlign: -2, marginRight: 5 }} /> Movies ({movies.length})
        </button>
        <button className={`rm-tab ${tab === 'genres' ? 'active' : ''}`} onClick={() => setTab('genres')}>
          <Tags size={14} style={{ verticalAlign: -2, marginRight: 5 }} /> Genres ({genres.length})
        </button>
      </div>

      {/* ══════════════ MOVIES TAB ══════════════ */}
      {tab === 'movies' && (
        <>
          {/* Toolbar */}
          <div className="table-toolbar" style={{ marginBottom: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div className="search-wrap" style={{ flex: 1, minWidth: 180 }}>
              <span className="search-icon"><Search size={14} /></span>
              <input
                className="input-field"
                placeholder="Search title, director, cast…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="select-field" style={{ width: 'auto' }}
              value={genreFilter}
              onChange={e => setGenreFilter(e.target.value)}
            >
              <option value="All">All Genres</option>
              {genres.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <Button icon="+" onClick={openAddMovie}>Add Movie</Button>
          </div>

          {/* Genre filter pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {[{ id: 'All', name: 'All', emoji: 'film' }, ...genres].map(g => {
              const count = g.id === 'All' ? movies.length : movies.filter(m => m.genreId === g.id).length;
              if (g.id !== 'All' && count === 0) return null;
              return (
                <div
                  key={g.id}
                  onClick={() => setGenreFilter(g.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 12px', borderRadius: 99, cursor: 'pointer',
                    fontSize: '0.74rem', fontWeight: 500,
                    background: genreFilter === g.id ? 'var(--gold)' : 'var(--surface)',
                    color:      genreFilter === g.id ? 'var(--navy)' : 'var(--text-muted)',
                    border: '1px solid var(--border)', transition: 'all var(--transition)',
                  }}
                >
                  <IconGlyph iconKey={g.emoji} size={13} /> {g.name} ({count})
                </div>
              );
            })}
          </div>

          {/* Movie grid */}
          {filteredMovies.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Film size={32} /></div>
              <div className="empty-state-text">
                {movies.length === 0 ? 'No movies yet. Add one to get started.' : 'No movies match your search.'}
              </div>
            </div>
          ) : (
            <div className="three-col">
              {filteredMovies.map(m => {
                const genre = genreById(m.genreId);
                return (
                  <div key={m.id} className="movie-card">
                    <div
                      className="movie-poster"
                      style={{ background: m.color || genre?.color || '#1a1628', cursor: 'pointer' }}
                      onClick={() => setDetailMovie(m)}
                    >
                      <span style={{ color: 'var(--gold)' }}><IconGlyph iconKey={m.emoji || genre?.emoji} size={48} /></span>
                      <div className="movie-genre-tag">
                        <Badge variant="muted">{genre?.name ?? '—'}</Badge>
                      </div>
                    </div>
                    <div className="movie-info">
                      <div className="movie-title">{m.title}</div>
                      <div className="movie-meta">
                        {m.year} · {m.duration} min{m.director ? ` · ${m.director}` : ''}
                      </div>
                      <RatingBadge rating={m.rating} />
                      {m.synopsis && (
                        <div style={{
                          fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 6,
                          lineHeight: 1.5, display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {m.synopsis}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <Button variant="outline" size="sm" style={{ flex: 1 }} onClick={() => openEditMovie(m)}>Edit</Button>
                        <Button variant="danger"  size="sm" style={{ flex: 1 }} onClick={() => handleDeleteMovie(m)}>Delete</Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════ GENRES TAB ══════════════ */}
      {tab === 'genres' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 10 }}>
            <Button icon="+" onClick={openAddGenre}>Add Genre</Button>
          </div>

          {genres.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Tags size={32} /></div>
              <div className="empty-state-text">No genres yet.</div>
            </div>
          ) : (
            <Card>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Genre</th>
                      <th>Default Icon</th>
                      <th>Default Color</th>
                      <th>Movies</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {genres.map(g => {
                      const movieCount = movies.filter(m => m.genreId === g.id).length;
                      return (
                        <tr key={g.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: 6,
                                background: g.color, display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                color: 'var(--gold)', flexShrink: 0,
                              }}>
                                <IconGlyph iconKey={g.emoji} size={18} />
                              </div>
                              <span style={{ fontWeight: 500 }}>{g.name}</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--gold)' }}><IconGlyph iconKey={g.emoji} size={20} /></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 20, height: 20, borderRadius: 4,
                                background: g.color, border: '1px solid var(--border)',
                              }} />
                              <code style={{ fontSize: '0.75rem', color: 'var(--gold)' }}>{g.color}</code>
                            </div>
                          </td>
                          <td>
                            <Badge variant={movieCount > 0 ? 'info' : 'muted'}>
                              {movieCount} movie{movieCount !== 1 ? 's' : ''}
                            </Badge>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <Button variant="outline" size="sm" onClick={() => openEditGenre(g)}>Edit</Button>
                              <Button variant="danger"  size="sm" onClick={() => handleDeleteGenre(g)}>Delete</Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Add Genre Modal ── */}
      <Modal
        title="Add Genre"
        open={showAddGenre}
        onClose={() => setShowAddGenre(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddGenre(false)}>Cancel</Button>
            <Button onClick={handleSaveGenre} disabled={genreSaving} icon={genreSaving ? <Hourglass size={14} /> : <Save size={14} />}>
              {genreSaving ? 'Saving…' : 'Save Genre'}
            </Button>
          </>
        }
      >
        <GenreForm form={genreForm} setForm={setGenreForm} error={genreError} />
      </Modal>

      {/* ── Edit Genre Modal ── */}
      <Modal
        title={`Edit Genre — ${editGenre?.name}`}
        open={!!editGenre}
        onClose={() => setEditGenre(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditGenre(null)}>Cancel</Button>
            <Button onClick={handleSaveGenre} disabled={genreSaving} icon={genreSaving ? <Hourglass size={14} /> : <Save size={14} />}>
              {genreSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <GenreForm form={genreForm} setForm={setGenreForm} error={genreError} />
      </Modal>

      {/* ── Add Movie Modal ── */}
      <Modal
        title="Add New Movie"
        open={showAddMovie}
        onClose={() => setShowAddMovie(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddMovie(false)}>Cancel</Button>
            <Button onClick={handleSaveMovie} disabled={movieSaving} icon={movieSaving ? <Hourglass size={14} /> : <Film size={14} />}>
              {movieSaving ? 'Adding…' : 'Add Movie'}
            </Button>
          </>
        }
      >
        <MovieForm form={movieForm} setForm={setMovieForm} genres={genres} error={movieError} />
      </Modal>

      {/* ── Edit Movie Modal ── */}
      <Modal
        title={`Edit — ${editMovie?.title}`}
        open={!!editMovie}
        onClose={() => setEditMovie(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditMovie(null)}>Cancel</Button>
            <Button onClick={handleSaveMovie} disabled={movieSaving} icon={movieSaving ? <Hourglass size={14} /> : <Save size={14} />}>
              {movieSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <MovieForm form={movieForm} setForm={setMovieForm} genres={genres} error={movieError} />
      </Modal>

      {/* ── Detail Modal ── */}
      <Modal
        title={detailMovie?.title ?? ''}
        open={!!detailMovie}
        onClose={() => setDetailMovie(null)}
        footer={
          <>
            <Button variant="danger"  onClick={() => handleDeleteMovie(detailMovie!)}>Delete</Button>
            <Button variant="outline" onClick={() => { openEditMovie(detailMovie!); setDetailMovie(null); }}>Edit</Button>
            <Button onClick={() => setDetailMovie(null)}>Close</Button>
          </>
        }
      >
        {detailMovie && (() => {
          const genre = genreById(detailMovie.genreId);
          return (
            <div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 'var(--radius)', flexShrink: 0,
                  background: detailMovie.color || genre?.color || '#1a1628',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)',
                }}>
                  <IconGlyph iconKey={detailMovie.emoji || genre?.emoji} size={36} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700 }}>
                    {detailMovie.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0' }}>
                    {detailMovie.year} · {detailMovie.duration} min
                    {genre && <> · <Badge variant="gold">{genre.name}</Badge></>}
                  </div>
                  <RatingBadge rating={detailMovie.rating} />
                </div>
              </div>
              {detailMovie.synopsis && (
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
                  {detailMovie.synopsis}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Director', value: detailMovie.director || '—' },
                  { label: 'Cast',     value: detailMovie.cast     || '—' },
                  { label: 'Added',    value: detailMovie.createdAt?.split('T')[0] || '—' },
                  { label: 'ID',       value: detailMovie.id.slice(0, 12) + '…' },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    padding: '8px 12px', background: 'var(--navy)',
                    borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: 3 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default MovieManagement;