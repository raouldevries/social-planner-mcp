/**
 * Social Planner - Media URL Utilities
 *
 * Centralized media URL resolution. All API responses that include media
 * URLs should use these helpers instead of calling getPublicUrl() directly.
 * This prevents the class of bug where a new endpoint accidentally returns
 * raw storage paths instead of public URLs.
 */

import { getPublicUrl } from './s3';

/**
 * Resolve a single storage path to a public URL.
 * Returns null if the path is null/undefined.
 */
export function resolveMediaUrl(storagePath: string): string;
export function resolveMediaUrl(storagePath: string | null | undefined): string | null;
export function resolveMediaUrl(storagePath: string | null | undefined): string | null {
  return storagePath ? getPublicUrl(storagePath) : null;
}

/**
 * Resolve both url and thumbnailUrl from a raw media asset.
 * Use this when mapping Prisma media assets to API response shapes.
 */
export function resolveMediaUrls(asset: { storagePath: string; thumbnailPath: string | null }): {
  url: string;
  thumbnailUrl: string | null;
} {
  return {
    url: getPublicUrl(asset.storagePath),
    thumbnailUrl: asset.thumbnailPath ? getPublicUrl(asset.thumbnailPath) : null,
  };
}
