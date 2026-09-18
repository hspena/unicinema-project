// ─── Gemini proxy (Netlify Function) ──────────────────────────────────────────
// Forwards CineBot's generateContent request to Gemini so the API key stays on
// the server. The browser posts the request body; this function owns the key,
// the model and the endpoint, so callers cannot use it to reach anything else.
//
// Env: GEMINI_API_KEY (server-only — do NOT prefix with REACT_APP_).

const GEMINI_MODEL = 'gemini-2.5-flash';
const ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// The system prompt embeds the movie catalogue, so allow a generous body,
// but refuse anything far beyond what CineBot ever sends.
const MAX_BODY_BYTES = 200_000;

// Origins allowed to call the proxy: the deployed site plus local dev.
// Origin headers can be forged outside a browser, so this only deters casual
// reuse from other websites — the Google-side quota cap is the real limit.
const allowedOrigins = (): string[] => [
  process.env.URL,              // primary site URL, set by Netlify
  process.env.DEPLOY_PRIME_URL, // branch / preview deploy URL
  'http://localhost:3000',
  'http://localhost:8888',      // `netlify dev`
].filter((o): o is string => Boolean(o));

const json = (status: number, message: string) =>
  new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return json(405, 'Method not allowed.');
  }

  const origin = req.headers.get('origin');
  if (origin && !allowedOrigins().includes(origin)) {
    return json(403, 'Origin not allowed.');
  }

  // Trim stray whitespace / wrapping quotes picked up when pasting into the Netlify UI
  const apiKey = process.env.GEMINI_API_KEY?.trim().replace(/^["']|["']$/g, '');
  if (!apiKey) {
    return json(500, 'CineBot is not configured on the server (GEMINI_API_KEY is missing).');
  }

  const body = await req.text();
  if (body.length > MAX_BODY_BYTES) {
    return json(413, 'Request too large.');
  }

  try {
    JSON.parse(body);
  } catch {
    return json(400, 'Request body must be JSON.');
  }

  const upstream = await fetch(ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body,
  });

  // Pass Gemini's status and body straight through so the client's existing
  // retry (429/503) and error-parsing logic keeps working unchanged.
  return new Response(await upstream.text(), {
    status:  upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
