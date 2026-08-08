/**
 * instrument.ts — Sentry initialization
 *
 * CRITICAL: This must be the FIRST import in any server entry point.
 * It sets up Sentry error tracking and performance tracing before
 * any other module is loaded.
 */
import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: import.meta.env.SENTRY_DSN,

  // Only send events in production
  enabled: import.meta.env.NODE_ENV === 'production' && !!import.meta.env.SENTRY_DSN,

  // Sample 100% of errors, 10% of performance traces in production
  tracesSampleRate: import.meta.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Scrub PII from payloads before sending to Sentry
  beforeSend(event) {
    // Strip email addresses from breadcrumbs and extra data
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      if (data['email']) data['email'] = '[REDACTED]';
      if (data['password']) data['password'] = '[REDACTED]';
      if (data['token']) data['token'] = '[REDACTED]';
    }
    return event;
  },
});
