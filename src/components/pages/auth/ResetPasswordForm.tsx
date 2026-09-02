import { useState, useEffect } from "react";
import { resetPasswordSchema } from "@/lib/validators/auth.schema";
import type { ResetPasswordInput } from "@/lib/validators/auth.schema";

type FieldErrors = Partial<Record<keyof ResetPasswordInput, string>>;

export default function ResetPasswordForm() {
  const [values, setValues] = useState<ResetPasswordInput>({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  // Supabase appends #access_token=...&type=recovery to the URL.
  // The Supabase JS client (loaded server-side) exchanges this for a session cookie.
  // We just need to confirm the user landed here from a valid recovery link.
  const [hasRecoveryToken, setHasRecoveryToken] = useState(true);

  useEffect(() => {
    // Check if the URL hash indicates a recovery flow
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setHasRecoveryToken(true);
    } else if (!hash) {
      // No hash — this might be a direct visit, warn the user
      setHasRecoveryToken(false);
    }
  }, []);

  function set(field: keyof ResetPasswordInput, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const parsed = resetPasswordSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof ResetPasswordInput;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const json = await res.json();
      if (!res.ok) {
        setServerError(
          json.error ?? "Failed to reset password. The link may have expired.",
        );
        return;
      }

      setSuccess(true);
    } catch {
      setServerError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  if (!hasRecoveryToken) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <p className="text-sm text-muted-foreground">
          This link is invalid or has expired. Please request a new password
          reset.
        </p>
        <a
          href="/auth/forgot-password"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Request new link
        </a>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-6 w-6 text-primary"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <p className="font-medium text-foreground">Password updated</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You can now sign in with your new password.
          </p>
        </div>
        <a
          href="/auth/login"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-foreground"
        >
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => set("password", e.target.value)}
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${errors.password ? "border-destructive" : "border-input"}`}
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          disabled={loading}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-foreground"
        >
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(e) => set("confirmPassword", e.target.value)}
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${errors.confirmPassword ? "border-destructive" : "border-input"}`}
          placeholder="••••••••"
          disabled={loading}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword}</p>
        )}
      </div>

      {serverError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? "Updating password…" : "Update password"}
      </button>
    </form>
  );
}
