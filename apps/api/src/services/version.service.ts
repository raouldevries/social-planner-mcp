/**
 * Social Planner - Version Service
 *
 * Handles post version history - creating snapshots on updates and restoring previous versions.
 */

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

// ============================================
// TYPES
// ============================================

export interface PostVersionSummary {
  id: string;
  version: number;
  content: string | null;
  createdBy: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  createdAt: string;
  isCurrent: boolean;
}

// ============================================
// HELPERS
// ============================================

const versionSelect = {
  id: true,
  version: true,
  content: true,
  createdAt: true,
  createdBy: {
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
    },
  },
};

function formatVersion(version: any, isCurrent: boolean): PostVersionSummary {
  return {
    id: version.id,
    version: version.version,
    content: version.content,
    createdBy: {
      id: version.createdBy.id,
      fullName: version.createdBy.fullName,
      avatarUrl: version.createdBy.avatarUrl,
    },
    createdAt: version.createdAt.toISOString(),
    isCurrent,
  };
}

// ============================================
// VERSION OPERATIONS
// ============================================

/**
 * Get all versions for a post
 */
export async function getPostVersions(postId: string): Promise<PostVersionSummary[]> {
  // Verify post exists
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!post) {
    throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
  }

  const versions = await prisma.postVersion.findMany({
    where: { postId },
    select: versionSelect,
    orderBy: { version: 'desc' },
  });

  if (versions.length === 0) {
    return [];
  }

  // First item (highest version number) is current
  return versions.map((v, index) => formatVersion(v, index === 0));
}

/**
 * Get a single version by ID
 */
export async function getVersionById(versionId: string): Promise<PostVersionSummary> {
  const version = await prisma.postVersion.findUnique({
    where: { id: versionId },
    select: {
      ...versionSelect,
      postId: true,
    },
  });

  if (!version) {
    throw new AppError('VERSION_NOT_FOUND', 'Version not found', 404);
  }

  // Check if this is the current version
  const latestVersion = await prisma.postVersion.findFirst({
    where: { postId: version.postId },
    orderBy: { version: 'desc' },
    select: { id: true },
  });

  const isCurrent = latestVersion?.id === version.id;

  return formatVersion(version, isCurrent);
}

/**
 * Create a new version for a post
 * Called automatically when post content changes
 */
export async function createVersion(
  postId: string,
  content: string | null,
  userId: string
): Promise<PostVersionSummary> {
  // Get the current highest version number for this post
  const lastVersion = await prisma.postVersion.findFirst({
    where: { postId },
    orderBy: { version: 'desc' },
    select: { version: true, content: true },
  });

  // Skip if content is unchanged
  if (lastVersion && lastVersion.content === content) {
    // Return the existing version
    const existing = await prisma.postVersion.findFirst({
      where: { postId },
      orderBy: { version: 'desc' },
      select: versionSelect,
    });
    return formatVersion(existing, true);
  }

  const nextVersion = (lastVersion?.version ?? 0) + 1;

  const version = await prisma.postVersion.create({
    data: {
      postId,
      version: nextVersion,
      content,
      createdById: userId,
    },
    select: versionSelect,
  });

  return formatVersion(version, true);
}

/**
 * Restore a previous version
 * Updates the post's baseContent and creates a new version entry
 */
export async function restoreVersion(
  versionId: string,
  userId: string
): Promise<{ post: any; newVersion: PostVersionSummary }> {
  const version = await prisma.postVersion.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      postId: true,
      content: true,
      version: true,
    },
  });

  if (!version) {
    throw new AppError('VERSION_NOT_FOUND', 'Version not found', 404);
  }

  // Check if this is already the current version
  const latestVersion = await prisma.postVersion.findFirst({
    where: { postId: version.postId },
    orderBy: { version: 'desc' },
    select: { id: true },
  });

  if (latestVersion?.id === version.id) {
    throw new AppError('ALREADY_CURRENT', 'This is already the current version', 400);
  }

  // Update post and create new version in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update the post's baseContent
    const updatedPost = await tx.post.update({
      where: { id: version.postId },
      data: { baseContent: version.content },
      select: {
        id: true,
        baseContent: true,
        updatedAt: true,
      },
    });

    // Get next version number
    const lastVersion = await tx.postVersion.findFirst({
      where: { postId: version.postId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (lastVersion?.version ?? 0) + 1;

    // Create a new version entry for the restore
    const newVersion = await tx.postVersion.create({
      data: {
        postId: version.postId,
        version: nextVersion,
        content: version.content,
        createdById: userId,
      },
      select: versionSelect,
    });

    return { post: updatedPost, newVersion };
  });

  return {
    post: result.post,
    newVersion: formatVersion(result.newVersion, true),
  };
}

/**
 * Get the latest version for a post (utility function)
 */
export async function getLatestVersion(postId: string): Promise<PostVersionSummary | null> {
  const version = await prisma.postVersion.findFirst({
    where: { postId },
    orderBy: { version: 'desc' },
    select: versionSelect,
  });

  if (!version) {
    return null;
  }

  return formatVersion(version, true);
}
