import { useState, type FormEvent } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { signIn, signUp, signOut, type User, type ScoreSummary } from '../api';

interface AuthPanelProps {
  user: User | null;
  scores: ScoreSummary | null;
  error: string | null;
  onUserChange: (user: User | null) => void;
}

const RESULT_ICONS = { win: '🏆', tie: '🤝', loss: '💀' } as const;

// Server stores UTC "YYYY-MM-DD HH:MM:SS"; show it in the player's local time
const formatTime = (playedAt: string) =>
  new Date(playedAt.replace(' ', 'T') + 'Z').toLocaleString();

// Inline styles for things the precompiled index.css does not have
const panelStyle = { width: '100%', maxWidth: 420, marginBottom: 24 };

export function AuthPanel({ user, scores, error, onUserChange }: AuthPanelProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (action: 'signin' | 'signup', e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const signedIn = await (action === 'signin' ? signIn : signUp)(username, password);
      setPassword('');
      onUserChange(signedIn);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch {
      // Even if the server call fails, return to guest mode locally
    }
    setBusy(false);
    onUserChange(null);
  };

  const shownError = formError ?? error;

  if (!user) {
    return (
      <form
        onSubmit={e => submit('signin', e)}
        className="p-4 bg-amber-200/80 rounded-xl shadow-lg border-2 border-amber-400"
        style={panelStyle}
      >
        <p className="text-amber-900 font-medium">Playing as guest</p>
        <p className="text-amber-700 text-sm mt-1">
          Sign in or sign up to save your scores. Guest games are not saved.
        </p>

        <div className="flex gap-3 mt-2">
          <div className="w-full">
            <Label htmlFor="auth-username" className="text-amber-900 mt-2">Username</Label>
            <Input
              id="auth-username"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="mt-1"
              style={{ backgroundColor: '#fff' }}
            />
          </div>
          <div className="w-full">
            <Label htmlFor="auth-password" className="text-amber-900 mt-2">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1"
              style={{ backgroundColor: '#fff' }}
            />
          </div>
        </div>

        {shownError && <p className="text-red-600 text-sm mt-2">{shownError}</p>}

        <div className="flex gap-2 mt-2">
          <Button type="submit" disabled={busy} className="bg-amber-600 hover:bg-amber-700 text-white">
            Sign in
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => submit('signup')}
          >
            Sign up
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div
      className="p-4 bg-amber-200/80 rounded-xl shadow-lg border-2 border-amber-400"
      style={panelStyle}
    >
      <div className="flex items-center justify-between">
        <p className="text-amber-900">
          Signed in as <span className="font-medium">{user.username}</span>
        </p>
        <Button variant="outline" size="sm" disabled={busy} onClick={handleSignOut}>
          Sign out
        </Button>
      </div>

      {shownError && <p className="text-red-600 text-sm mt-2">{shownError}</p>}

      {scores && (
        <div className="mt-2 text-sm text-amber-800">
          <p>
            Games played: {scores.gamesPlayed} | Best score:{' '}
            {scores.bestScore === null ? '-' : `$${scores.bestScore}`}
          </p>
          {scores.recent.length > 0 && (
            <ul className="mt-2" style={{ maxHeight: 120, overflowY: 'auto' }}>
              {scores.recent.map(entry => (
                <li key={entry.id} className="flex justify-between text-xs mt-1">
                  <span>
                    {RESULT_ICONS[entry.result]} ${entry.score}
                  </span>
                  <span className="text-amber-600">{formatTime(entry.playedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
