import { useState } from 'react';
import { signupSchema } from '@/lib/validators/auth.schema';
import type { SignupInput } from '@/lib/validators/auth.schema';
import { createClient } from '@/lib/supabase/client';
import { safeNext } from '@/lib/auth/safe-next';

type FieldErrors = Partial<Record<keyof SignupInput, string>>;

export default function SignupForm() {
  const [values, setValues] = useState<SignupInput>({
    email: '',
    password: '',
    username: '',
    displayName: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'github' | null>(null);
  const [registered, setRegistered] = useState(false);

  function set(field: keyof SignupInput, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');

    const parsed = signupSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof SignupInput;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? 'Registration failed. Please try again.');
        return;
      }

      // Show inline confirmation notice instead of navigating away
      setRegistered(true);
    } catch {
      setServerError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'github') {
    setServerError('');
    setOauthLoading(provider);
    try {
      const next = new URLSearchParams(window.location.search).get('next');
      const target = safeNext(next);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`,
          scopes: 'read:user user:email',
        },
      });
      if (error) {
        setServerError(error.message ?? `Failed to start ${provider} sign-up.`);
        setOauthLoading(null);
      }
    } catch {
      setServerError('Network error. Please check your connection.');
      setOauthLoading(null);
    }
  }

  // After successful registration, show a "check your email" notice
  if (registered) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <p className="font-medium">Account created! Check your email ✓</p>
          <p className="mt-1 text-emerald-400/80">
            We sent a confirmation link to <span className="font-medium">{values.email}</span>.
            Click it to activate your account, then sign in.
          </p>
        </div>
        <a
          href="/auth/login"
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${errors.email ? 'border-destructive' : 'border-input'}`}
          placeholder="you@example.com"
          disabled={loading}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium text-foreground">
          Username
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
            showcrate.tech/
          </span>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={values.username}
            onChange={(e) => set('username', e.target.value.toLowerCase())}
            className={`w-full rounded-lg border bg-background pl-[calc(theme(spacing.3)+8.5rem)] pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${errors.username ? 'border-destructive' : 'border-input'}`}
            placeholder="yourname"
            disabled={loading}
            maxLength={39}
          />
        </div>
        {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className="text-sm font-medium text-foreground">
          Display name <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          id="displayName"
          type="text"
          autoComplete="name"
          value={values.displayName ?? ''}
          onChange={(e) => set('displayName', e.target.value)}
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${errors.displayName ? 'border-destructive' : 'border-input'}`}
          placeholder="Your Name"
          disabled={loading}
          maxLength={60}
        />
        {errors.displayName && <p className="text-xs text-destructive">{errors.displayName}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => set('password', e.target.value)}
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${errors.password ? 'border-destructive' : 'border-input'}`}
          placeholder="••••••••"
          disabled={loading}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>

      {serverError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer disabled:cursor-not-allowed mt-1"
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or continue with</span>
        </div>
      </div>

      {/* OAuth providers */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => handleOAuth('github')}
          disabled={loading || oauthLoading !== null}
          className="flex items-center justify-center gap-2 w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
            <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.09-.745.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 013.003-.404c1.02.005 2.046.138 3.003.404 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.435.375.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
          {oauthLoading === 'github' ? 'Redirecting…' : 'GitHub'}
        </button>
      </div>
    </form>
  );
}
