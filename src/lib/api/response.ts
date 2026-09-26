/**
 * api/response.ts — Standardized API response utility
 *
 * Replaces BaseController for Astro API routes.
 * All API responses go through these helpers — never call
 * new Response() or return raw JSON directly in routes.
 *
 * Response shape:
 *   Success: { success: true, data: T }
 *   Error:   { success: false, error: { message: string, code?: string } }
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
};

/**
 * Return a successful JSON response.
 * @param data     The response payload
 * @param status   HTTP status code (default 200)
 */
export function ok<T>(data: T, status = 200): Response {
  const body: ApiSuccess<T> = { success: true, data };
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

/**
 * Return an error JSON response.
 * NEVER include stack traces, internal paths, or sensitive info in `message`.
 *
 * @param message  Human-readable error message (safe for client consumption)
 * @param status   HTTP status code (default 400)
 * @param code     Optional machine-readable error code (e.g. 'PLAN_LIMIT_EXCEEDED')
 */
export function error(message: string, status = 400, code?: string): Response {
  const body: ApiError = {
    success: false,
    error: { message, ...(code ? { code } : {}) },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

// Convenience shortcuts for common HTTP statuses
export const unauthorized = (msg = 'Unauthorized') => error(msg, 401, 'UNAUTHORIZED');
export const forbidden = (msg = 'Forbidden') => error(msg, 403, 'FORBIDDEN');
export const notFound = (msg = 'Not found') => error(msg, 404, 'NOT_FOUND');
export const conflict = (msg: string, code?: string) => error(msg, 409, code);
export const unprocessable = (msg: string) => error(msg, 422, 'VALIDATION_ERROR');
export const serverError = (msg = 'Internal server error') => error(msg, 500, 'INTERNAL_ERROR');
export const tooManyRequests = (msg = 'Too many requests') => error(msg, 429, 'RATE_LIMITED');
