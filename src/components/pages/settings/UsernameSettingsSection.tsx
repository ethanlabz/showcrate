import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface UsernameSettingsSectionProps {
  initialUsername: string;
  usernameChangedAt: string | null;
}

export function UsernameSettingsSection({
  initialUsername,
  usernameChangedAt,
}: UsernameSettingsSectionProps) {
  const [username, setUsername] = useState(initialUsername);
  const [status, setStatus] = useState<
    'idle' | 'checking' | 'available' | 'unavailable' | 'invalid'
  >('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // 30-day cooldown check
  const { isCooldown, cooldownDateString } = useMemo(() => {
    if (!usernameChangedAt) return { isCooldown: false, cooldownDateString: '' };
    const changed = new Date(usernameChangedAt);
    const expiry = new Date(changed.getTime() + 30 * 24 * 60 * 60 * 1000);
    const active = expiry.getTime() > Date.now();
    const formatted = expiry.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return { isCooldown: active, cooldownDateString: formatted };
  }, [usernameChangedAt]);

  // Projected next allowed date (30 days from today)
  const nextAllowedDateString = useMemo(() => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return future.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // Debounced live availability check
  useEffect(() => {
    if (isCooldown) return;

    const trimmed = username.trim().toLowerCase();

    if (trimmed === initialUsername.toLowerCase()) {
      setStatus('idle');
      setStatusMessage('');
      return;
    }

    // Format check: 3-39 chars, alphanumeric and single hyphens
    const usernameRegex = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,37}[a-z0-9]$/;
    if (trimmed.length < 3) {
      setStatus('invalid');
      setStatusMessage('Username must be at least 3 characters.');
      return;
    }
    if (trimmed.length > 39) {
      setStatus('invalid');
      setStatusMessage('Username cannot exceed 39 characters.');
      return;
    }
    if (!usernameRegex.test(trimmed)) {
      setStatus('invalid');
      setStatusMessage('Only lowercase letters, numbers, and single hyphens (no leading or trailing hyphens).');
      return;
    }

    setStatus('checking');
    setStatusMessage('Checking availability...');

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/account/username/available?name=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          setStatus('unavailable');
          setStatusMessage('Error checking availability');
          return;
        }
        const data = await res.json();
        if (data.status === 'available') {
          setStatus('available');
          setStatusMessage('Username is available');
        } else if (data.status === 'unavailable') {
          setStatus('unavailable');
          setStatusMessage('Username is unavailable or reserved');
        } else {
          setStatus('invalid');
          setStatusMessage('Invalid username format');
        }
      } catch {
        setStatus('unavailable');
        setStatusMessage('Network error checking availability');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, initialUsername, isCooldown]);

  const handleConfirmChange = async () => {
    setSubmitting(true);
    setSubmitError(null);

    const targetUsername = username.trim().toLowerCase();

    try {
      const res = await fetch('/api/account/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          const date = data.nextAllowedDate || 'in 30 days';
          setSubmitError(`Username change is on cooldown until ${date}.`);
        } else if (res.status === 409) {
          setSubmitError('This username is already taken or held by a redirect.');
        } else if (res.status === 422) {
          setSubmitError(data.error || 'Invalid username format.');
        } else {
          setSubmitError(data.error || 'Failed to update username.');
        }
        setSubmitting(false);
        return;
      }

      setSubmitSuccess(`Username updated to @${targetUsername}. Refreshing...`);
      setConfirmOpen(false);

      // Refresh viewer session and layout props so sidebar "Public profile" link updates
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch {
      setSubmitError('Network error updating username. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="settings-username" className="text-sm font-medium text-foreground flex items-center gap-1.5">
          <span>Username</span>
          {isCooldown && <Lock className="h-3 w-3 text-muted-foreground" />}
        </Label>
        {!isCooldown && status === 'available' && (
          <Button
            type="button"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            className="bg-accent text-accent-foreground hover:bg-accent-hover text-xs font-semibold h-7 px-2.5"
          >
            Change username
          </Button>
        )}
      </div>

      {isCooldown ? (
        <div className="space-y-2">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm font-mono select-none">
              @
            </span>
            <Input
              id="settings-username"
              value={initialUsername}
              readOnly
              disabled
              className="pl-7 bg-surface-raised/40 border-border/40 text-muted-foreground font-mono cursor-not-allowed select-none"
            />
          </div>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-300 flex items-start gap-2.5">
            <Lock className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-medium text-foreground">Username change on cooldown</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                You can change your username again after <span className="font-semibold text-foreground">{cooldownDateString}</span>. Usernames can only be changed once every 30 days.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm font-mono select-none">
              @
            </span>
            <Input
              id="settings-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              maxLength={39}
              placeholder="username"
              className="pl-7 pr-28 bg-surface border-border/60 text-foreground font-mono text-sm focus-visible:ring-accent"
            />
            <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
              {status === 'checking' && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                  Checking
                </span>
              )}
              {status === 'available' && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  Available
                </span>
              )}
              {status === 'unavailable' && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Unavailable
                </span>
              )}
            </div>
          </div>

          {submitSuccess && (
            <p className="text-[11px] text-emerald-400 flex items-center gap-1">
              <Check className="h-3 w-3" />
              <span>{submitSuccess}</span>
            </p>
          )}

          {status === 'invalid' && (
            <p className="text-[11px] text-destructive">{statusMessage}</p>
          )}

          {status === 'unavailable' && (
            <p className="text-[11px] text-destructive">{statusMessage}</p>
          )}

          {status === 'idle' && (
            <p className="text-[11px] text-muted-foreground">
              Your public profile is at <span className="font-mono text-foreground">/{initialUsername}</span>. Usernames can be changed once every 30 days.
            </p>
          )}

          {status === 'available' && (
            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <span className="text-emerald-400">
                Handle <span className="font-mono font-medium">@{username.trim().toLowerCase()}</span> is free.
              </span>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="text-accent hover:underline font-medium cursor-pointer"
              >
                Review & Confirm →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs px-4">
          <div className="bg-surface border border-border/70 rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">
                  Change username to @{username.trim().toLowerCase()}?
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confirm your username change.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm cursor-pointer p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="rounded-lg bg-surface-raised/60 border border-border/50 p-3.5 text-xs text-muted-foreground space-y-2.5">
              <p className="text-foreground leading-relaxed">
                Your old profile and project links will keep redirecting. You can change your username again after <span className="font-semibold text-accent">{nextAllowedDateString}</span>.
              </p>
              <div className="border-t border-border/30 pt-2 text-[11px] text-muted-foreground/80 space-y-1">
                <div>• Your previous handle <span className="font-mono text-foreground">@{initialUsername}</span> will be permanently reserved for you.</div>
                <div>• Existing links will receive a 301 canonical redirect.</div>
              </div>
            </div>

            {submitError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={submitting}
                onClick={handleConfirmChange}
                className="bg-accent text-accent-foreground hover:bg-accent-hover font-medium"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Changing...
                  </>
                ) : (
                  'Confirm change'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
