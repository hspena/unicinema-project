import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToMovies, subscribeToGenres, Movie, Genre } from '../../services/movieService';
import { getUserById } from '../../services/userService';

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'bot' | 'user';
type ChatStep    = 'welcome' | 'genre' | 'responding' | 'done';

interface Message {
  id:      number;
  role:    MessageRole;
  text:    string;
  chips?:  string[];       // quick-reply chips
  movies?: Movie[];        // movie cards to display
  typing?: boolean;        // shows typing indicator
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let msgId = 0;
const newMsg = (role: MessageRole, text: string, extra?: Partial<Message>): Message =>
  ({ id: ++msgId, role, text, ...extra });

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Stars ────────────────────────────────────────────────────────────────────
const Stars = ({ rating }: { rating: number }) => {
  const filled = Math.round(rating / 2);
  return (
    <span style={{ color: 'var(--gold)', fontSize: '0.75rem' }}>
      {'★'.repeat(filled)}{'☆'.repeat(5 - filled)}
    </span>
  );
};

// ─── Movie Card inside chat ────────────────────────────────────────────────────
const ChatMovieCard = ({ movie, genre }: { movie: Movie; genre?: Genre }) => (
  <div style={{
    display: 'flex', gap: 12, padding: '10px 12px',
    background: 'var(--navy)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', marginBottom: 8,
  }}>
    <div style={{
      width: 48, height: 48, borderRadius: 8, flexShrink: 0,
      background: movie.color || genre?.color || '#1a1628',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.6rem',
    }}>
      {movie.emoji || genre?.emoji || '🎬'}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
        {movie.title}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '2px 0' }}>
        {movie.year} · {movie.duration} min · {genre?.name ?? '—'}
      </div>
      <Stars rating={movie.rating / 2} />
      {movie.synopsis && (
        <div style={{
          fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 4,
          lineHeight: 1.4, display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {movie.synopsis}
        </div>
      )}
    </div>
  </div>
);

// ─── Typing indicator ─────────────────────────────────────────────────────────
const TypingDots = () => (
  <div style={{ display: 'flex', gap: 4, padding: '4px 0', alignItems: 'center' }}>
    {[0, 1, 2].map(i => (
      <span key={i} style={{
        width: 7, height: 7, borderRadius: '50%',
        background: 'var(--gold)', opacity: 0.7,
        animation: `pulse 1.2s ${i * 0.2}s infinite`,
      }} />
    ))}
  </div>
);

// ─── Main Chatbot Page ────────────────────────────────────────────────────────

const ChatbotPage = () => {
  const { uid } = useAuth();

  const [messages,    setMessages]    = useState<Message[]>([]);
  const [movies,      setMovies]      = useState<Movie[]>([]);
  const [genres,      setGenres]      = useState<Genre[]>([]);
  const [userInput,   setUserInput]   = useState('');
  const [step,        setStep]        = useState<ChatStep>('welcome');
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [userPrefs,   setUserPrefs]   = useState('');   // free-text preference
  const [userName,    setUserName]    = useState('');
  const [isTyping,    setIsTyping]    = useState(false);
  const [inputLocked, setInputLocked] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u1 = subscribeToMovies(setMovies);
    const u2 = subscribeToGenres(setGenres);
    if (uid) {
      getUserById(uid).then(u => {
        if (u) setUserName((u as any).displayName || u.name || 'there');
      });
    }
    return () => { u1(); u2(); };
  }, [uid]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Show welcome message after profile loads
  useEffect(() => {
    if (messages.length > 0) return; // already started
    const name = userName || 'there';
    const welcome: Message = newMsg('bot',
      `Hey ${name}! 👋 I'm CineBot, your personal movie advisor.\n\nI can help you find the perfect film to watch. What would you like to do?`,
      {
        chips: [
          '🎬 Recommend me a movie',
          '🎭 Browse by genre',
          '⭐ Show me top rated',
          '🎲 Surprise me!',
        ],
      }
    );
    setMessages([welcome]);
  }, [userName]);

  // ── Bot typing simulation ──────────────────────────────────────────────────
  const botSay = async (text: string, extra?: Partial<Message>, delayMs = 900) => {
    setIsTyping(true);
    await delay(delayMs);
    setIsTyping(false);
    setMessages(prev => [...prev, newMsg('bot', text, extra)]);
  };

  // ── User sends a message ───────────────────────────────────────────────────
  const userSay = (text: string) => {
    setMessages(prev => [...prev, newMsg('user', text)]);
  };

  // ── Handle quick-reply chip click ──────────────────────────────────────────
  const handleChip = async (chip: string) => {
    if (inputLocked) return;
    setInputLocked(true);
    userSay(chip);

    if (step === 'welcome') {
      if (chip === '🎲 Surprise me!') {
        await handleSurpriseMe();
      } else if (chip === '⭐ Show me top rated') {
        await handleTopRated();
      } else {
        // Ask for genre
        setStep('genre');
        await botSay(
          "Great choice! Which genre are you in the mood for?",
          {
            chips: genres.map(g => `${g.emoji || '🎬'} ${g.name}`).concat(['🎲 Any genre']),
          }
        );
      }
    } else if (step === 'genre') {
      if (chip === '🎲 Any genre') {
        setSelectedGenre(null);
        await handleRecommend(null, userPrefs);
      } else {
        const genreName = chip.replace(/^[^\w]+/, '').trim(); // strip emoji prefix
        const found     = genres.find(g => g.name.toLowerCase() === genreName.toLowerCase());
        setSelectedGenre(found ?? null);
        await handleRecommend(found ?? null, userPrefs);
      }
    }

    setInputLocked(false);
  };

  // ── Handle free-text input ─────────────────────────────────────────────────
  const handleSend = async () => {
    const text = userInput.trim();
    if (!text || inputLocked) return;
    setUserInput('');
    setInputLocked(true);
    userSay(text);

    if (step === 'welcome') {
      // Treat free text as preference description
      setUserPrefs(text);
      setStep('genre');
      await botSay(
        `Got it — "${text}". Which genre fits your mood best?`,
        { chips: genres.map(g => `${g.emoji || '🎬'} ${g.name}`).concat(['🎲 Any genre']) }
      );
    } else if (step === 'genre') {
      // Try to match a genre name from text
      const found = genres.find(g => text.toLowerCase().includes(g.name.toLowerCase()));
      setSelectedGenre(found ?? null);
      await handleRecommend(found ?? null, userPrefs || text);
    } else if (step === 'done') {
      // Free chat after recommendation
      await handleFollowUp(text);
    }

    setInputLocked(false);
  };

  // ── Recommend movies based on genre + prefs ────────────────────────────────
  const handleRecommend = async (genre: Genre | null, prefs: string) => {
    setStep('responding');

    const genreMsg = genre ? `in the **${genre.name}** genre` : 'across all genres';
    await botSay(
      `Perfect! Let me find some great ${genre ? genre.name : ''} films for you…`,
      undefined, 600
    );

    // Filter movies by genre, sort by rating
    let candidates = genre
      ? movies.filter(m => m.genreId === genre.id)
      : [...movies];

    // If prefs mention keywords, try to match synopsis/title
    if (prefs) {
      const keywords = prefs.toLowerCase().split(/\s+/);
      const scored   = candidates.map(m => ({
        movie: m,
        score: keywords.reduce((s, kw) =>
          s + (m.title.toLowerCase().includes(kw) ? 2 : 0)
            + (m.synopsis?.toLowerCase().includes(kw) ? 1 : 0), 0)
      }));
      scored.sort((a, b) => b.score - a.score || b.movie.rating - a.movie.rating);
      candidates = scored.map(s => s.movie);
    } else {
      candidates.sort((a, b) => b.rating - a.rating);
    }

    const picks = candidates.slice(0, 3);

    if (picks.length === 0) {
      await botSay(
        `Hmm, I couldn't find any ${genre?.name ?? ''} movies in our catalogue right now. Try a different genre?`,
        { chips: genres.map(g => `${g.emoji || '🎬'} ${g.name}`).concat(['🎲 Any genre']) }
      );
      setStep('genre');
      return;
    }

    await botSay(
      `Here are my top picks ${genreMsg} for you! 🎬`,
      { movies: picks },
      800
    );

    setStep('done');
    await botSay(
      "What do you think? Would you like recommendations in a different genre, or can I help with anything else?",
      {
        chips: [
          '🔄 Different genre',
          '⭐ Show top rated',
          '🎲 Surprise me!',
          '🎬 Browse all movies',
        ],
      },
      600
    );
  };

  // ── Top rated ─────────────────────────────────────────────────────────────
  const handleTopRated = async () => {
    setStep('responding');
    await botSay("Here are the highest rated films in our catalogue! ⭐", undefined, 700);
    const top = [...movies].sort((a, b) => b.rating - a.rating).slice(0, 3);
    if (top.length === 0) {
      await botSay("No movies in our catalogue yet. Check back soon!");
    } else {
      await botSay("Our top picks:", { movies: top }, 500);
    }
    setStep('done');
    await botSay(
      "Want to explore a specific genre or see more recommendations?",
      { chips: ['🎭 Browse by genre', '🔄 Try again', '🎲 Surprise me!'] },
      600
    );
  };

  // ── Surprise me ────────────────────────────────────────────────────────────
  const handleSurpriseMe = async () => {
    setStep('responding');
    await botSay("Ooh, I love spontaneity! 🎲 Picking something random for you…", undefined, 700);
    if (movies.length === 0) {
      await botSay("No movies in our catalogue yet. Check back soon!");
      setStep('done'); return;
    }
    const random = [...movies].sort(() => Math.random() - 0.5).slice(0, 1);
    await botSay("How about this one?", { movies: random }, 800);
    setStep('done');
    await botSay(
      "Like it? Or shall I pick another?",
      { chips: ['🎲 Pick another!', '🎭 Browse by genre', '⭐ Show top rated'] },
      500
    );
  };

  // ── Follow-up after recommendation ────────────────────────────────────────
  const handleFollowUp = async (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('another') || lower.includes('more') || lower.includes('different')) {
      await handleSurpriseMe();
    } else if (lower.includes('genre') || lower.includes('type')) {
      setStep('genre');
      await botSay(
        "Which genre are you feeling?",
        { chips: genres.map(g => `${g.emoji || '🎬'} ${g.name}`).concat(['🎲 Any genre']) }
      );
    } else if (lower.includes('top') || lower.includes('best') || lower.includes('rated')) {
      await handleTopRated();
    } else {
      setStep('genre');
      await botSay(
        "I'd love to help! Let me know which genre you're interested in:",
        { chips: genres.map(g => `${g.emoji || '🎬'} ${g.name}`).concat(['🎲 Any genre']) }
      );
    }
  };

  // ── Handle post-done chips ─────────────────────────────────────────────────
  const handleDoneChip = async (chip: string) => {
    if (inputLocked) return;
    setInputLocked(true);
    userSay(chip);

    if (chip.includes('genre') || chip.includes('Genre')) {
      setStep('genre');
      await botSay(
        "Which genre suits your mood?",
        { chips: genres.map(g => `${g.emoji || '🎬'} ${g.name}`).concat(['🎲 Any genre']) }
      );
    } else if (chip.includes('Surprise') || chip.includes('another')) {
      await handleSurpriseMe();
    } else if (chip.includes('top rated') || chip.includes('Top rated')) {
      await handleTopRated();
    } else if (chip.includes('Browse all')) {
      await botSay("Head to the **Now Showing** page to browse all available movies and book your tickets! 🎟️");
      setStep('done');
    } else if (chip.includes('Try again')) {
      setStep('welcome');
      await botSay(
        "Sure! What would you like to do?",
        { chips: ['🎬 Recommend me a movie', '🎭 Browse by genre', '⭐ Show me top rated', '🎲 Surprise me!'] }
      );
    }

    setInputLocked(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>

      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', flexShrink: 0,
        }}>🤖</div>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem' }}>
            CineBot
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Online · AI Movie Advisor
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {movies.length} movies in catalogue
        </div>
      </div>

      {/* Message list */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '20px',
        display: 'flex', flexDirection: 'column', gap: 16,
        WebkitOverflowScrolling: 'touch' as any,
      }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-end', gap: 8,
          }}>
            {/* Avatar */}
            {msg.role === 'bot' && (
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
              }}>🤖</div>
            )}

            <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 8,
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>

              {/* Text bubble */}
              {msg.text && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? 'var(--gold)' : 'var(--surface)',
                  color:      msg.role === 'user' ? 'var(--navy)' : 'var(--text-primary)',
                  border: msg.role === 'bot' ? '1px solid var(--border)' : 'none',
                  fontSize: '0.84rem', lineHeight: 1.55,
                  whiteSpace: 'pre-line',
                }}>
                  {msg.text}
                </div>
              )}

              {/* Movie cards */}
              {msg.movies && msg.movies.length > 0 && (
                <div style={{ width: '100%', minWidth: 260 }}>
                  {msg.movies.map(m => (
                    <ChatMovieCard
                      key={m.id}
                      movie={m}
                      genre={genres.find(g => g.id === m.genreId)}
                    />
                  ))}
                </div>
              )}

              {/* Quick-reply chips */}
              {msg.chips && msg.chips.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {msg.chips.map(chip => (
                    <button
                      key={chip}
                      onClick={() =>
                        step === 'done'
                          ? handleDoneChip(chip)
                          : handleChip(chip)
                      }
                      disabled={inputLocked}
                      style={{
                        padding: '6px 13px',
                        borderRadius: 99,
                        border: '1px solid var(--gold)',
                        background: 'transparent',
                        color: 'var(--gold)',
                        fontSize: '0.78rem',
                        cursor: inputLocked ? 'not-allowed' : 'pointer',
                        opacity: inputLocked ? 0.5 : 1,
                        transition: 'all var(--transition)',
                        fontFamily: 'var(--font-body)',
                      }}
                      onMouseEnter={e => !inputLocked && ((e.target as HTMLElement).style.background = 'var(--gold-dim)')}
                      onMouseLeave={e => ((e.target as HTMLElement).style.background = 'transparent')}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
            }}>🤖</div>
            <div style={{
              padding: '10px 14px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '16px 16px 16px 4px',
            }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', gap: 10, alignItems: 'flex-end',
        flexShrink: 0,
      }}>
        <textarea
          className="textarea-field"
          placeholder="Type a message or pick an option above…"
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={inputLocked}
          rows={1}
          style={{
            flex: 1, resize: 'none', minHeight: 40, maxHeight: 120,
            padding: '10px 13px', lineHeight: 1.4,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!userInput.trim() || inputLocked}
          style={{
            width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
            background: userInput.trim() && !inputLocked ? 'var(--gold)' : 'var(--surface-raised)',
            border: '1px solid var(--border)',
            color: userInput.trim() && !inputLocked ? 'var(--navy)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', cursor: userInput.trim() && !inputLocked ? 'pointer' : 'not-allowed',
            transition: 'all var(--transition)',
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
};

export default ChatbotPage;