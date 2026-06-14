import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToMovies, subscribeToGenres, Movie, Genre } from '../../services/movieService';
import { getUserById } from '../../services/userService';
import { askCineBot, ChatTurn, GeminiError } from '../../services/geminiService';
import { Badge } from '../../components/ui';
import { IconGlyph, Bot, Send } from '../../utils/icons';
import type { ContentRating } from '../../services/movieService';

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'bot' | 'user';

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

// Builds the system instruction handed to Gemini, including the live catalogue
// so it can only ever recommend movies that actually exist in our database.
const buildSystemPrompt = (movies: Movie[], genres: Genre[], userName: string) => {
  const genreName = (id: string) => genres.find(g => g.id === id)?.name ?? 'Uncategorised';

  const catalogue = movies.length === 0
    ? '(The catalogue is currently empty — no movies are available to recommend.)'
    : movies.map(m =>
        `- "${m.title}" — ${genreName(m.genreId)} · ${m.year} · ${m.duration} min · Rated ${m.rating} — ${m.synopsis || 'No synopsis available.'}`
      ).join('\n');

  return `You are CineBot, a friendly and knowledgeable AI movie advisor for UniCinema, a university cinema's ticket-booking platform. You're chatting with ${userName || 'a moviegoer'}.

Your job is to have a natural conversation, understand what kind of film the user is in the mood for, and recommend movies — but ONLY from the catalogue below. Never invent or mention a movie that isn't listed.

CATALOGUE:
${catalogue}

GENRES AVAILABLE: ${genres.map(g => g.name).join(', ') || 'none'}

Guidelines:
- Be warm, concise (2-4 sentences), and conversational. Do not use emoji — the interface shows icons instead, so plain text reads best.
- When you recommend movies, put their EXACT titles (character-for-character matches from the catalogue) in "movieTitles" so the app can render rich cards with synopsis/rating — don't restate the synopsis in your reply text, just talk about why you picked them.
- Recommend at most 3 movies at once, and only ones from the catalogue.
- If nothing in the catalogue fits the request, say so honestly, leave "movieTitles" empty, and suggest trying a different genre or mood.
- Always include 2-4 short "suggestions" (quick-reply chip labels, each under 30 characters, plain text without emoji) for what the user might want to say next, e.g. "Different genre", "Top rated", "Surprise me".
- If asked about something unrelated to movies, cinema, or this app, gently steer back to helping them find something to watch.
- Respond ONLY with a JSON object matching the required schema (reply, movieTitles, suggestions) — no extra commentary.`;
};

// ─── Rating badge ─────────────────────────────────────────────────────────────
const RatingBadge = ({ rating }: { rating: ContentRating }) => {
  const variant: 'success' | 'gold' | 'danger' =
    rating === 'U' || rating === 'PG' ? 'success' :
    rating === 'PG-13' || rating === '16' ? 'gold' : 'danger';
  return <Badge variant={variant} style={{ fontSize: '0.65rem' }}>{rating}</Badge>;
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
    }}>
      <IconGlyph iconKey={movie.emoji || genre?.emoji} size={24} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
        {movie.title}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '2px 0' }}>
        {movie.year} · {movie.duration} min · {genre?.name ?? '—'}
      </div>
      <RatingBadge rating={movie.rating} />
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
  const [userName,    setUserName]    = useState('');
  const [isTyping,    setIsTyping]    = useState(false);
  const [inputLocked, setInputLocked] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const historyRef  = useRef<ChatTurn[]>([]);     // running conversation sent to Gemini

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

  // Show welcome message once the user's profile has loaded
  useEffect(() => {
    if (messages.length > 0) return; // already started
    const name = userName || 'there';
    const text =
      `Hey ${name}! I'm CineBot, your AI-powered movie advisor. Tell me what you're in the mood for — a genre, a vibe, an actor — and I'll find something from our catalogue for you. Or just pick an option below to get started!`;
    const chips = ['Recommend me a movie', 'Browse by genre', 'Show me top rated', 'Surprise me!'];
    setMessages([newMsg('bot', text, { chips })]);
    historyRef.current = [{ role: 'model', text }];
  }, [userName]);

  // ── User sends a message ───────────────────────────────────────────────────
  const userSay = (text: string) => {
    setMessages(prev => [...prev, newMsg('user', text)]);
  };

  // ── Send a message to Gemini and render whatever it comes back with ────────
  const sendToBot = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || inputLocked) return;

    setInputLocked(true);
    userSay(trimmed);
    historyRef.current = [...historyRef.current, { role: 'user', text: trimmed }];
    setIsTyping(true);

    try {
      const systemPrompt = buildSystemPrompt(movies, genres, userName);
      const result = await askCineBot(systemPrompt, historyRef.current);

      const cards = result.movieTitles
        .map(title => movies.find(m => m.title.toLowerCase() === title.toLowerCase()))
        .filter((m): m is Movie => !!m)
        .slice(0, 3);

      setIsTyping(false);
      setMessages(prev => [...prev, newMsg('bot', result.reply, {
        movies: cards.length ? cards : undefined,
        chips:  result.suggestions.length ? result.suggestions : undefined,
      })]);
      historyRef.current = [...historyRef.current, { role: 'model', text: result.reply }];
    } catch (err) {
      setIsTyping(false);
      const message = err instanceof GeminiError
        ? err.message
        : "I'm having trouble connecting right now — please try again in a moment.";
      setMessages(prev => [...prev, newMsg('bot', message)]);
    }

    setInputLocked(false);
  };

  // ── Handle quick-reply chip click ──────────────────────────────────────────
  const handleChip = (chip: string) => sendToBot(chip);

  // ── Handle free-text input ─────────────────────────────────────────────────
  const handleSend = () => {
    const text = userInput;
    setUserInput('');
    return sendToBot(text);
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
          color: 'var(--navy)', flexShrink: 0,
        }}><Bot size={20} /></div>
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
            alignItems: 'flex-start', gap: 8,
          }}>
            {/* Avatar */}
            {msg.role === 'bot' && (
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)',
              }}><Bot size={15} /></div>
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
                      onClick={() => handleChip(chip)}
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
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)',
            }}><Bot size={15} /></div>
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
            cursor: userInput.trim() && !inputLocked ? 'pointer' : 'not-allowed',
            transition: 'all var(--transition)',
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default ChatbotPage;