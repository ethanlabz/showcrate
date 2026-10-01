import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { safeNext } from '../src/lib/auth/safe-next.ts';
import {
  RESERVED_USERNAMES,
  isReservedUsername,
  usernameSchema,
} from '../src/lib/validators/auth.schema.ts';
import { z } from 'zod';

describe('safeNext redirect validation', () => {
  it('resolves valid dashboard routes', () => {
    assert.strictEqual(safeNext('/dashboard'), '/dashboard');
    assert.strictEqual(safeNext('/dashboard/'), '/dashboard/');
    assert.strictEqual(safeNext('/dashboard/new'), '/dashboard/new');
    assert.strictEqual(safeNext('/dashboard/notifications'), '/dashboard/notifications');
    assert.strictEqual(
      safeNext('/dashboard/projects/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
      '/dashboard/projects/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    );
    assert.strictEqual(safeNext('/dashboard?tab=projects'), '/dashboard?tab=projects');
    assert.strictEqual(safeNext('%2Fdashboard%2Fnew'), '/dashboard/new');
  });

  it('rejects external and malicious redirect targets per acceptance checks', () => {
    // Exact targets from the specification:
    assert.strictEqual(safeNext('https://evil.example'), '/dashboard');
    assert.strictEqual(safeNext('//evil.example'), '/dashboard');
    assert.strictEqual(safeNext('/\\evil.example'), '/dashboard');
    assert.strictEqual(safeNext('/auth/login'), '/dashboard');
    assert.strictEqual(safeNext('/dashboardx'), '/dashboard');
  });

  it('rejects protocol injection, backslashes, and control characters', () => {
    assert.strictEqual(safeNext('http://example.com/dashboard'), '/dashboard');
    assert.strictEqual(safeNext('javascript:alert(1)'), '/dashboard');
    assert.strictEqual(safeNext('/dashboard/\\evil'), '/dashboard');
    assert.strictEqual(safeNext('/dashboard\x00evil'), '/dashboard');
    assert.strictEqual(safeNext('/dashboard\x1bevil'), '/dashboard');
    assert.strictEqual(safeNext(null), '/dashboard');
    assert.strictEqual(safeNext(undefined), '/dashboard');
    assert.strictEqual(safeNext(''), '/dashboard');
    assert.strictEqual(safeNext('%E0%A4%A'), '/dashboard'); // malformed URI component
  });
});

describe('Reserved usernames and signup validation', () => {
  const newlyReserved = [
    'dashboard',
    'dmca',
    'copyright',
    'legal',
    'abuse',
    'security',
    'cookies',
    'licenses',
    'subprocessors',
    'grievance',
  ];

  it('contains all newly reserved usernames', () => {
    for (const name of newlyReserved) {
      assert.ok(RESERVED_USERNAMES.has(name), `Expected ${name} to be reserved`);
      assert.ok(isReservedUsername(name), `Expected isReservedUsername(${name}) to be true`);
      assert.ok(isReservedUsername(name.toUpperCase()), `Expected case-insensitive check for ${name}`);
    }
  });

  it('contains legacy reserved usernames', () => {
    const legacy = ['admin', 'settings', 'new', 'notifications', 'showcrate'];
    for (const name of legacy) {
      assert.ok(RESERVED_USERNAMES.has(name), `Expected ${name} to be reserved`);
      assert.ok(isReservedUsername(name));
    }
  });

  it('rejects signup with reserved usernames via usernameSchema', () => {
    for (const name of [...newlyReserved, 'admin', 'settings', 'new']) {
      const result = usernameSchema.safeParse(name);
      assert.strictEqual(result.success, false, `Expected ${name} to be rejected by usernameSchema`);
      if (!result.success) {
        assert.ok(
          result.error.issues.some((i) => i.message.includes('reserved')),
          `Expected error message to mention reserved for ${name}`,
        );
      }
    }
  });

  it('accepts valid unreserved usernames', () => {
    assert.ok(usernameSchema.safeParse('valid-user').success);
    assert.ok(usernameSchema.safeParse('developer123').success);
    assert.ok(usernameSchema.safeParse('cool-project-lead').success);
  });
});

describe('Project ID UUID validation', () => {
  it('validates UUID project ids accurately', () => {
    const uuidSchema = z.string().uuid();
    assert.ok(uuidSchema.safeParse('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11').success);
    assert.strictEqual(uuidSchema.safeParse('not-a-uuid').success, false);
    assert.strictEqual(uuidSchema.safeParse('12345').success, false);
    assert.strictEqual(uuidSchema.safeParse('../escape').success, false);
  });
});

describe('Anonymous next URL generation and capping', () => {
  it('caps redirect next target at 200 characters', () => {
    const buildRedirectUrl = (pathname: string, search: string) => {
      const fullTarget = pathname + search;
      const capped = fullTarget.length > 200 ? fullTarget.slice(0, 200) : fullTarget;
      return `/auth/login?next=${encodeURIComponent(capped)}`;
    };

    const shortUrl = buildRedirectUrl('/dashboard', '');
    assert.strictEqual(shortUrl, '/auth/login?next=%2Fdashboard');

    const longParam = 'x'.repeat(250);
    const longUrl = buildRedirectUrl('/dashboard/projects', `?query=${longParam}`);
    const nextVal = decodeURIComponent(longUrl.split('next=')[1]);
    assert.strictEqual(nextVal.length, 200);
    assert.ok(nextVal.startsWith('/dashboard/projects?query='));
  });
});

