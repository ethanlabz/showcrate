/**
 * src/lib/routing/generate-slug.ts
 *
 * Generates URL-safe kebab-case slugs from titles with collision suffixes.
 */

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
