import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCanonical,
  type CanonicalLookupAdapter,
} from '../src/lib/routing/resolve-canonical.ts';

describe('resolveCanonical deterministic URL resolution', () => {
  // Mock store representing:
  // User 1: current username "bob", old username "alice"
  // Projects for User 1: live slug "doc-engine", old slug "v1-docs"
  const mockUsers = new Map<string, { id: string; username: string }>([
    ['u1', { id: 'u1', username: 'bob' }],
    ['u2', { id: 'u2', username: 'carol' }],
  ]);

  const mockUsernames = new Map<string, { id: string; username: string }>([
    ['bob', { id: 'u1', username: 'bob' }],
    ['carol', { id: 'u2', username: 'carol' }],
  ]);

  const mockRedirects = new Map<string, { old_username: string; user_id: string }>([
    ['alice', { old_username: 'alice', user_id: 'u1' }],
  ]);

  const mockLiveProjects = new Map<string, { id: string; slug: string }>([
    ['u1:doc-engine', { id: 'p1', slug: 'doc-engine' }],
    ['u2:portal', { id: 'p2', slug: 'portal' }],
  ]);

  const mockProjectRedirects = new Map<string, { new_slug: string }>([
    ['u1:v1-docs', { new_slug: 'doc-engine' }],
  ]);

  const adapter: CanonicalLookupAdapter = {
    async findUserByUsername(username: string) {
      return mockUsernames.get(username.toLowerCase()) || null;
    },
    async findUserById(userId: string) {
      return mockUsers.get(userId) || null;
    },
    async findUsernameRedirect(oldUsername: string) {
      return mockRedirects.get(oldUsername.toLowerCase()) || null;
    },
    async findLiveProject(ownerId: string, slug: string) {
      return mockLiveProjects.get(`${ownerId}:${slug}`) || null;
    },
    async findProjectRedirect(ownerId: string, oldSlug: string) {
      return mockProjectRedirects.get(`${ownerId}:${oldSlug}`) || null;
    },
  };

  it('immediately returns notfound for reserved usernames without DB queries', async () => {
    let queried = false;
    const trackingAdapter: CanonicalLookupAdapter = {
      async findUserByUsername() {
        queried = true;
        return null;
      },
      async findUserById() {
        queried = true;
        return null;
      },
      async findUsernameRedirect() {
        queried = true;
        return null;
      },
      async findLiveProject() {
        queried = true;
        return null;
      },
      async findProjectRedirect() {
        queried = true;
        return null;
      },
    };

    for (const reserved of ['dashboard', 'admin', 'editor', 'api', 'legal', 'security']) {
      const res = await resolveCanonical(reserved, undefined, trackingAdapter);
      assert.strictEqual(res.status, 'notfound');
    }
    assert.strictEqual(queried, false, 'Expected no DB queries for reserved names');
  });

  it('resolves active user profile without redirect', async () => {
    const res = await resolveCanonical('bob', undefined, adapter);
    assert.strictEqual(res.status, 'ok');
    if (res.status === 'ok') {
      assert.strictEqual(res.ownerId, 'u1');
      assert.strictEqual(res.canonicalUsername, 'bob');
    }
  });

  it('resolves active user and live project without redirect', async () => {
    const res = await resolveCanonical('bob', 'doc-engine', adapter);
    assert.strictEqual(res.status, 'ok');
    if (res.status === 'ok') {
      assert.strictEqual(res.ownerId, 'u1');
      assert.strictEqual(res.canonicalUsername, 'bob');
      assert.strictEqual(res.canonicalProjectSlug, 'doc-engine');
    }
  });

  it('redirects old username to current username in ONE 301 hop', async () => {
    const res = await resolveCanonical('alice', undefined, adapter);
    assert.strictEqual(res.status, 'redirect');
    if (res.status === 'redirect') {
      assert.strictEqual(res.location, '/bob');
      assert.strictEqual(res.canonicalUsername, 'bob');
    }
  });

  it('redirects old username with live project in ONE 301 hop', async () => {
    const res = await resolveCanonical('alice', 'doc-engine', adapter);
    assert.strictEqual(res.status, 'redirect');
    if (res.status === 'redirect') {
      assert.strictEqual(res.location, '/bob/doc-engine');
    }
  });

  it('redirects old project slug for current user in ONE 301 hop', async () => {
    const res = await resolveCanonical('bob', 'v1-docs', adapter);
    assert.strictEqual(res.status, 'redirect');
    if (res.status === 'redirect') {
      assert.strictEqual(res.location, '/bob/doc-engine');
    }
  });

  it('redirects BOTH old username AND old project slug in ONE single hop (no chains)', async () => {
    const res = await resolveCanonical('alice', 'v1-docs', adapter, {
      remainingPath: '/docs/getting-started',
      searchParams: 'ref=twitter&theme=dark',
    });
    assert.strictEqual(res.status, 'redirect');
    if (res.status === 'redirect') {
      // Must point directly to /bob/doc-engine/docs/getting-started?ref=twitter&theme=dark
      assert.strictEqual(
        res.location,
        '/bob/doc-engine/docs/getting-started?ref=twitter&theme=dark',
      );
    }
  });

  it('returns notfound for non-existent user and non-existent redirect', async () => {
    const res = await resolveCanonical('unknown-user', undefined, adapter);
    assert.strictEqual(res.status, 'notfound');
  });

  it('returns notfound for live user with non-existent project and no redirect', async () => {
    const res = await resolveCanonical('bob', 'nonexistent-project', adapter);
    assert.strictEqual(res.status, 'notfound');
  });
});
