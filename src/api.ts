// Small helpers for calling the API server (server/index.mjs).
// Vite forwards /api/* to the server, see vite.config.ts.

export interface User {
  id: number;
  username: string;
}

export interface ScoreEntry {
  id: number;
  score: number;
  result: 'win' | 'tie' | 'loss';
  playedAt: string; // UTC, "YYYY-MM-DD HH:MM:SS"
}

export interface ScoreSummary {
  gamesPlayed: number;
  bestScore: number | null;
  recent: ScoreEntry[];
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('Cannot reach the server. Is `npm run server` running?');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status}).`);
  }
  return data as T;
}

const post = <T>(url: string, body?: unknown) =>
  request<T>(url, { method: 'POST', body: JSON.stringify(body ?? {}) });

export const signUp = (username: string, password: string) =>
  post<{ user: User }>('/api/signup', { username, password }).then(d => d.user);

export const signIn = (username: string, password: string) =>
  post<{ user: User }>('/api/signin', { username, password }).then(d => d.user);

export const signOut = () => post<{ ok: true }>('/api/signout');

export const getMe = () => request<{ user: User | null }>('/api/me').then(d => d.user);

export const saveScore = (score: number) => post<{ ok: true }>('/api/scores', { score });

export const getScores = () => request<ScoreSummary>('/api/scores');
