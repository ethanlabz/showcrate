import { useState, useEffect } from 'react';
import { usernameSchema } from '@/lib/validators/auth.schema';

interface Props {
  suggested: string;
  next: string;
}

export default function SocialUsernameForm({ suggested, next }: Props) {
  const [username, setUsername] = useState(suggested);
  const [validationError, setValidationError] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

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

      // Redirect to destination or their profile page
      const target = next && next !== '/' ? next : `/${json.data.username}`;
      window.location.href = target;
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

        {/* Input with the showcrate.tech/ prefix — same style as SignupForm */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none pointer-events-none">
            showcrate.tech/
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
            className={`w-full rounded-lg border bg-background pl-[calc(theme(spacing.3)+8.5rem)] pr-10 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
              validationError || serverError
                ? 'border-destructive focus:ring-destructive/30'
                : isValid
                ? 'border-emerald-500 focus:ring-emerald-500/30'
                : 'border-input'
            }`}
            placeholder="yourname"
            disabled={loading}
            maxLength={39}
            spellCheck={false}
          />

          {/* Green check when valid */}
          {isValid && !serverError && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-base leading-none select-none">
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