import { useState, useEffect } from 'react';
import { usernameSchema } from '@/lib/validators/auth.schema';
import { safeNext } from '@/lib/auth/safe-next';

interface Props {
  suggested: string;
  next: string;
}

export default function SocialUsernameForm({ suggested, next }: Props) {
  const [host, setHost] = useState('showcrate.netlify.app');
  const [username, setUsername] = useState(suggested);
  const [validationError, setValidationError] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.host) {
      setHost(window.location.host);
    }
  }, []);

  // Validate live as the user types
  useEffect(() => {
    if (!username) {
      setValidationError('');
      return;
    }
    const result = usernameSchema.safeParse(username);
    setValidationError(result.success ? '' : result.error.issues[0]?.message ?? '');
  }, [username]);

  const isValid = username.length > 0 && !validationError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');

    // Final client-side guard
    const result = usernameSchema.safeParse(username);
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Invalid username');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/set-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error?.message ?? 'Failed to set username. Please try again.');
        return;
      }

      // Redirect to validated next destination, defaulting to /dashboard
      window.location.href = safeNext(next);
    } catch {
      setServerError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium text-foreground">
          Username
        </label>

        {/* Input with domain prefix */}
        <div
          className={`flex items-center rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus-within:ring-2 ${
            validationError || serverError
              ? 'border-destructive focus-within:ring-destructive/30'
              : isValid
              ? 'border-emerald-500 focus-within:ring-emerald-500/30'
              : 'border-input focus-within:ring-ring'
          }`}
        >
          <span className="text-muted-foreground select-none pointer-events-none whitespace-nowrap pr-1 text-xs">
            {host}/
          </span>
          <input
            id="username"
            type="text"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase());
              setServerError('');
            }}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="yourname"
            disabled={loading}
            maxLength={39}
            spellCheck={false}
          />

          {/* Green check when valid */}
          {isValid && !serverError && (
            <span className="text-emerald-500 text-base leading-none select-none pl-2">
              ✓
            </span>
          )}
        </div>

        {/* Live validation error */}
        {validationError && (
          <p className="text-xs text-destructive">{validationError}</p>
        )}

        {/* Constraints hint when field is empty or valid */}
        {!validationError && (
          <p className="text-xs text-muted-foreground">
            3–39 chars · lowercase letters, numbers, and hyphens only
          </p>
        )}
      </div>

      {/* Server-side error (e.g. username already taken) */}
      {serverError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !isValid}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? 'Setting up your account…' : 'Continue'}
      </button>

      <div className="flex items-center justify-center pt-1">
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
            } finally {
              window.location.href = '/auth/login';
            }
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer"
        >
          Sign out and use a different account
        </button>
      </div>
    </form>
  );
}