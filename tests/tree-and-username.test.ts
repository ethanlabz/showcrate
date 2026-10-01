import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export function generateDocSlug(title: string, existingSlugs: Set<string>): string {
  let baseSlug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!baseSlug) {
    baseSlug = 'page';
  }

  let candidate = baseSlug;
  let suffix = 2;
  while (existingSlugs.has(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix++;
  }
  return candidate;
}

export function validateNodeDepth(parentDepth: number): boolean {
  // If parent is at depth D, adding a child gives depth D + 1
  // Max depth is 5
  return parentDepth + 1 <= 5;
}

export function checkCycle(nodeId: string, targetParentId: string | null, parentMap: Map<string, string | null>): boolean {
  if (!targetParentId) return false;
  if (nodeId === targetParentId) return true;

  let current: string | null = targetParentId;
  const visited = new Set<string>();

  while (current) {
    if (current === nodeId) return true;
    if (visited.has(current)) return true; // loop in tree
    visited.add(current);
    current = parentMap.get(current) || null;
  }
  return false;
}

export function calculateSubtreeDepth(nodeId: string, childrenMap: Map<string, string[]>): number {
  const children = childrenMap.get(nodeId) || [];
  if (children.length === 0) return 1;

  let maxChildDepth = 0;
  for (const childId of children) {
    maxChildDepth = Math.max(maxChildDepth, calculateSubtreeDepth(childId, childrenMap));
  }
  return 1 + maxChildDepth;
}

export function isCooldownActive(lastChangedAt: Date | null, now: Date = new Date()): { active: boolean; nextAllowedDate?: Date } {
  if (!lastChangedAt) return { active: false };

  const cooldownMs = 30 * 24 * 60 * 60 * 1000;
  const elapsed = now.getTime() - lastChangedAt.getTime();

  if (elapsed < cooldownMs) {
    return {
      active: true,
      nextAllowedDate: new Date(lastChangedAt.getTime() + cooldownMs),
    };
  }

  return { active: false };
}

describe('Doc Tree Invariants and Slug Generation', () => {
  it('generates clean kebab-case slugs from titles', () => {
    const existing = new Set<string>();
    assert.strictEqual(generateDocSlug('Getting Started', existing), 'getting-started');
    assert.strictEqual(generateDocSlug('API Reference & SDK v2', existing), 'api-reference-sdk-v2');
    assert.strictEqual(generateDocSlug('   Leading & Trailing Spaces   ', existing), 'leading-trailing-spaces');
    assert.strictEqual(generateDocSlug('!!!Special Symbols???', existing), 'special-symbols');
  });

  it('falls back to "page" if title produces empty slug', () => {
    const existing = new Set<string>();
    assert.strictEqual(generateDocSlug('???', existing), 'page');
    assert.strictEqual(generateDocSlug('   ', existing), 'page');
  });

  it('appends -2, -3 suffixes on slug collisions among live pages', () => {
    const existing = new Set<string>(['intro', 'intro-2', 'api']);
    assert.strictEqual(generateDocSlug('Intro', existing), 'intro-3');
    assert.strictEqual(generateDocSlug('API', existing), 'api-2');
  });

  it('validates tree max depth of 5', () => {
    // Root level child has parentDepth 0 -> depth 1 (valid)
    assert.strictEqual(validateNodeDepth(0), true);
    // Depth 2
    assert.strictEqual(validateNodeDepth(1), true);
    // Depth 5 (parent is at depth 4)
    assert.strictEqual(validateNodeDepth(4), true);
    // Depth 6 (parent is at depth 5, child would be depth 6 -> invalid)
    assert.strictEqual(validateNodeDepth(5), false);
    assert.strictEqual(validateNodeDepth(6), false);
  });

  it('detects cycles when moving a node into its own descendant', () => {
    // Tree:
    // folderA -> folderB -> folderC
    const parentMap = new Map<string, string | null>([
      ['folderA', null],
      ['folderB', 'folderA'],
      ['folderC', 'folderB'],
    ]);

    // Moving folderA into folderC is a cycle!
    assert.strictEqual(checkCycle('folderA', 'folderC', parentMap), true);
    // Moving folderA into itself is a cycle!
    assert.strictEqual(checkCycle('folderA', 'folderA', parentMap), true);
    // Moving folderC into folderA is NOT a cycle
    assert.strictEqual(checkCycle('folderC', 'folderA', parentMap), false);
    // Moving folderC to root (null) is NOT a cycle
    assert.strictEqual(checkCycle('folderC', null, parentMap), false);
  });

  it('calculates subtree depth accurately for move validation', () => {
    // Subtree: parent -> child1, child2 -> grandchild
    const childrenMap = new Map<string, string[]>([
      ['p1', ['c1', 'c2']],
      ['c1', []],
      ['c2', ['gc1']],
      ['gc1', []],
    ]);

    // p1 has depth 3 (p1 -> c2 -> gc1)
    assert.strictEqual(calculateSubtreeDepth('p1', childrenMap), 3);
    // c1 has depth 1
    assert.strictEqual(calculateSubtreeDepth('c1', childrenMap), 1);
  });
});

describe('Username Cooldown Logic', () => {
  it('allows username change if never changed before', () => {
    const result = isCooldownActive(null);
    assert.strictEqual(result.active, false);
  });

  it('enforces 30-day cooldown if changed recently', () => {
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    const result = isCooldownActive(twentyDaysAgo);
    assert.strictEqual(result.active, true);
    assert.ok(result.nextAllowedDate);
    assert.ok(result.nextAllowedDate.getTime() > Date.now());
  });

  it('allows username change after 30 days have elapsed', () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const result = isCooldownActive(thirtyOneDaysAgo);
    assert.strictEqual(result.active, false);
  });
});
