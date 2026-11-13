/**
 * api/async-handler.ts — Async error boundary for Astro API routes
 *
 * Wraps an async API route handler to:
 * 1. Catch all unhandled promise rejections
 * 2. Send errors to Sentry (with context)
 * 3. Return a safe 500 response — never leaks internal error detail
 *
 * Usage in an API route:
 *   export const POST = asyncHandler(async ({ request, cookies }) => {
 *     ...
 *     return ok(data);
 *   });
 */
import type { APIContext, APIRoute } from 'astro';
import * as Sentry from '@sentry/astro';
import { serverError } from './response';

type HandlerFn = (context: APIContext) => Promise<Response>;

export function asyncHandler(fn: HandlerFn): APIRoute {
  return async (context: APIContext): Promise<Response> => {
    try {
      return await fn(context);
    } catch (err: unknown) {
      // Capture to Sentry with request context
      Sentry.withScope((scope) => {
        scope.setTag('route', context.url.pathname);
        scope.setTag('method', context.request.method);
        if (context.locals.user) {
          scope.setUser({ id: context.locals.user.id });
        }
        Sentry.captureException(err);
      });

      // Never surface internal error details to the client
      return serverError();
    }
  };
}
