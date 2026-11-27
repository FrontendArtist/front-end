import { revalidateTag } from 'next/cache';
import { VALID_CACHE_TAGS } from './cacheTags';

/**
 * Invalidate Next.js cache tags using stale-while-revalidate ('max' profile).
 * Server-only helper (must not be imported by client component graphs).
 * @param {string[]} tags
 */
export function invalidateCacheTags(tags) {
  for (const tag of tags) {
    if (VALID_CACHE_TAGS.has(tag)) {
      revalidateTag(tag, 'max');
    }
  }
}
