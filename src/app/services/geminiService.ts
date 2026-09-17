// ─── Gemini AI Chat Service ───────────────────────────────────────────────────
// Wraps calls to Google's Gemini API (generateContent) for the CineBot chatbot.
//
// NOTE: The browser never sees the API key. Requests go to the Netlify Function
// in netlify/functions/gemini.mts, which adds GEMINI_API_KEY server-side and
// forwards the call to Gemini. Locally, run `netlify dev` so the function is
// served alongside the app — plain `npm start` has no function to call.

const ENDPOINT = '/.netlify/functions/gemini';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface CineBotReply {
  reply:        string;     // the message to show the user
  movieTitles:  string[];   // titles of catalogue movies to display as cards
  suggestions:  string[];   // quick-reply chip suggestions for the user
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Extracts a human-readable message from Gemini's (sometimes JSON) error body
const parseErrorMessage = (status: number, body: string): string => {
  try {
    const parsed = JSON.parse(body);
    if (parsed?.error?.message) return parsed.error.message;
  } catch {
    // body wasn't JSON — fall through to raw text
  }
  return body || `request failed with status ${status}`;
};

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply:       { type: 'STRING' },
    movieTitles: { type: 'ARRAY', items: { type: 'STRING' } },
    suggestions: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['reply', 'movieTitles', 'suggestions'],
};

export class GeminiError extends Error {}

// ── Ask CineBot for a reply, given the running conversation + a system prompt ──
export const askCineBot = async (
  systemPrompt: string,
  history:      ChatTurn[],
): Promise<CineBotReply> => {
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: history.map(turn => ({
      role:  turn.role,
      parts: [{ text: turn.text }],
    })),
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema:   RESPONSE_SCHEMA,
      temperature:      0.7,
    },
  };

  const MAX_ATTEMPTS = 3;
  let res: Response | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    res = await fetch(ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    // 503 = model temporarily overloaded, 429 = rate-limited — both are worth a brief retry
    if ((res.status === 503 || res.status === 429) && attempt < MAX_ATTEMPTS) {
      await sleep(attempt * 1000);
      continue;
    }
    break;
  }

  if (!res) {
    throw new GeminiError('Could not reach Gemini.');
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    const reason  = parseErrorMessage(res.status, errBody);
    if (res.status === 503 || res.status === 429) {
      throw new GeminiError("CineBot's brain is a little overloaded right now — please try again in a few seconds.");
    }
    if (res.status === 404) {
      throw new GeminiError('CineBot service is unavailable. When running locally, start the app with `netlify dev`.');
    }
    throw new GeminiError(`Gemini request failed: ${reason}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new GeminiError('Gemini returned an empty response.');
  }

  try {
    const parsed = JSON.parse(text);
    return {
      reply:       typeof parsed.reply === 'string' ? parsed.reply : '',
      movieTitles: Array.isArray(parsed.movieTitles) ? parsed.movieTitles.filter((t: unknown) => typeof t === 'string') : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.filter((s: unknown) => typeof s === 'string') : [],
    };
  } catch {
    throw new GeminiError('Gemini returned a response that could not be parsed.');
  }
};
