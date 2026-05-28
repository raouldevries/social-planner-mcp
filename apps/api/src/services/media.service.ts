/**
 * Social Planner - Media Service
 *
 * Handles media file uploads, processing, and management.
 * Supports images and videos with thumbnail generation.
 */

import sharp from 'sharp';
import { prisma } from '../lib/prisma';
import * as s3 from '../lib/s3';
import { resolveMediaUrls } from '../lib/media-utils';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';
import { Prisma, UserRole } from '@social-planner/database';
import {
  extractVideoMetadata,
  generateVideoThumbnail,
  writeBufferToTempFile,
  cleanupTempFile,
} from '../lib/video';

// ============================================
// CONSTANTS
// ============================================

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const THUMBNAIL_SIZE = 300;

// ============================================
// TYPES
// ============================================

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface UserSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface MediaAssetSummary {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  altText: string | null;
  createdAt: string;
  uploadedBy: UserSummary;
  canEdit: boolean;
  canDelete: boolean;
}

export interface MediaListResult {
  data: MediaAssetSummary[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ============================================
// HELPERS
// ============================================

function isImage(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

function isVideo(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType);
}

function validateFile(file: UploadedFile): void {
  const isImageType = isImage(file.mimetype);
  const isVideoType = isVideo(file.mimetype);

  if (!isImageType && !isVideoType) {
    throw new AppError(
      'INVALID_FILE_TYPE',
      `Unsupported file type: ${file.mimetype}. Allowed: ${[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(', ')}`,
      400
    );
  }

  if (isImageType && file.size > MAX_IMAGE_SIZE) {
    throw new AppError(
      'FILE_TOO_LARGE',
      `Image file size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit`,
      400
    );
  }

  if (isVideoType && file.size > MAX_VIDEO_SIZE) {
    throw new AppError(
      'FILE_TOO_LARGE',
      `Video file size exceeds ${MAX_VIDEO_SIZE / 1024 / 1024}MB limit`,
      400
    );
  }
}

async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

interface MediaAssetWithUploader {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: bigint;
  storagePath: string;
  thumbnailPath: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  altText: string | null;
  createdAt: Date;
  uploadedById: string;
  uploadedBy: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

function formatMediaAsset(
  asset: MediaAssetWithUploader,
  currentUserId: string,
  userRole: UserRole = UserRole.VIEWER
): MediaAssetSummary {
  const isOwner = asset.uploadedById === currentUserId;
  const isAdmin = userRole === UserRole.ADMIN;
  const canModify = isOwner || isAdmin;
  return {
    id: asset.id,
    fileName: asset.fileName,
    fileType: asset.fileType,
    fileSize: asset.fileSize.toString(),
    ...resolveMediaUrls(asset),
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    altText: asset.altText,
    createdAt: asset.createdAt.toISOString(),
    uploadedBy: {
      id: asset.uploadedBy.id,
      name: asset.uploadedBy.fullName,
      avatarUrl: asset.uploadedBy.avatarUrl,
    },
    canEdit: canModify,
    canDelete: canModify,
  };
}

// Simple format for upload responses (without uploader info)
function formatMediaAssetSimple(
  asset: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: bigint;
    storagePath: string;
    thumbnailPath: string | null;
    width: number | null;
    height: number | null;
    duration: number | null;
    altText: string | null;
    createdAt: Date;
    uploadedById: string;
  },
  currentUserId: string
): MediaAssetSummary {
  return {
    id: asset.id,
    fileName: asset.fileName,
    fileType: asset.fileType,
    fileSize: asset.fileSize.toString(),
    ...resolveMediaUrls(asset),
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    altText: asset.altText,
    createdAt: asset.createdAt.toISOString(),
    uploadedBy: {
      id: currentUserId,
      name: '', // Will be filled by frontend or subsequent fetch
      avatarUrl: null,
    },
    canEdit: true,
    canDelete: true,
  };
}

// ============================================
// UPLOAD OPERATIONS
// ============================================

/**
 * Upload a media file
 */
export async function uploadMedia(
  file: UploadedFile,
  userId: string,
  options?: { folderId?: string; altText?: string }
): Promise<MediaAssetSummary> {
  validateFile(file);

  const isImageType = isImage(file.mimetype);
  const isVideoType = isVideo(file.mimetype);

  // Generate storage keys
  const storageKey = s3.generateStorageKey(userId, file.originalname, 'original');
  let thumbnailKey: string | null = null;
  let width: number | null = null;
  let height: number | null = null;
  let duration: number | null = null;

  // Process image - get dimensions and generate thumbnail
  if (isImageType) {
    const dimensions = await getImageDimensions(file.buffer);
    width = dimensions.width;
    height = dimensions.height;

    // Generate thumbnail
    thumbnailKey = s3.generateStorageKey(userId, file.originalname, 'thumbnail');
    const thumbnailBuffer = await generateThumbnail(file.buffer);

    await s3.uploadFile(thumbnailKey, thumbnailBuffer, {
      contentType: 'image/jpeg',
      metadata: { originalFile: file.originalname },
    });
  }

  // Process video - extract metadata and generate thumbnail
  if (isVideoType) {
    const ext = file.originalname.includes('.')
      ? file.originalname.substring(file.originalname.lastIndexOf('.'))
      : '.mp4';
    let tempPath: string | null = null;
    try {
      tempPath = await writeBufferToTempFile(file.buffer, ext);

      // Extract metadata (duration, dimensions)
      const metadata = await extractVideoMetadata(tempPath);
      if (metadata) {
        duration = metadata.duration;
        width = metadata.width;
        height = metadata.height;
      }

      // Generate thumbnail
      const thumbnailBuffer = await generateVideoThumbnail(tempPath, THUMBNAIL_SIZE);
      if (thumbnailBuffer) {
        thumbnailKey = s3.generateStorageKey(userId, file.originalname, 'thumbnail');
        await s3.uploadFile(thumbnailKey, thumbnailBuffer, {
          contentType: 'image/jpeg',
          metadata: { originalFile: file.originalname },
        });
      }
    } catch (err) {
      logger.warn(
        { err, fileName: file.originalname },
        'Video processing failed, uploading without thumbnail'
      );
    } finally {
      if (tempPath) await cleanupTempFile(tempPath);
    }
  }

  // Upload original file
  await s3.uploadFile(storageKey, file.buffer, {
    contentType: file.mimetype,
    metadata: { originalName: file.originalname },
  });

  // Verify folder exists if provided
  if (options?.folderId) {
    const folder = await prisma.mediaFolder.findUnique({
      where: { id: options.folderId },
    });

    if (!folder) {
      throw new AppError('FOLDER_NOT_FOUND', 'Folder not found', 404);
    }
  }

  // Create database record
  const asset = await prisma.mediaAsset.create({
    data: {
      uploadedById: userId,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: BigInt(file.size),
      storagePath: storageKey,
      thumbnailPath: thumbnailKey,
      width,
      height,
      duration,
      altText: options?.altText ?? null,
      folderId: options?.folderId ?? null,
      metadata: {},
    },
  });

  logger.info({ assetId: asset.id, userId }, 'Media uploaded successfully');

  return formatMediaAssetSimple(asset, userId);
}

/**
 * Upload multiple media files
 */
export async function uploadMultipleMedia(
  files: UploadedFile[],
  userId: string,
  options?: { folderId?: string }
): Promise<MediaAssetSummary[]> {
  const results: MediaAssetSummary[] = [];

  for (const file of files) {
    const asset = await uploadMedia(file, userId, options);
    results.push(asset);
  }

  return results;
}

// ============================================
// RETRIEVAL OPERATIONS
// ============================================

/**
 * Get media asset by ID
 */
export async function getMediaById(
  assetId: string,
  userId: string,
  userRole: UserRole
): Promise<MediaAssetSummary> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    include: {
      uploadedBy: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
    },
  });

  if (!asset) {
    throw new AppError('MEDIA_NOT_FOUND', 'Media asset not found', 404);
  }

  return formatMediaAsset(asset, userId, userRole);
}

/**
 * Get presigned download URL for a media asset
 */
export async function getDownloadUrl(assetId: string, expiresIn: number = 3600): Promise<string> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    select: { storagePath: true },
  });

  if (!asset) {
    throw new AppError('MEDIA_NOT_FOUND', 'Media asset not found', 404);
  }

  return s3.getPresignedDownloadUrl(asset.storagePath, expiresIn);
}

/**
 * List media assets with pagination and filtering
 * All media is shared - no user filtering by default
 */
export async function listMedia(
  userId: string,
  userRole: UserRole,
  options?: {
    page?: number;
    perPage?: number;
    folderId?: string | null;
    fileType?: 'image' | 'video';
    search?: string;
    uploadedBy?: 'all' | 'mine';
  }
): Promise<MediaListResult> {
  const page = options?.page ?? 1;
  const perPage = options?.perPage ?? 20;
  const skip = (page - 1) * perPage;

  // Build where clause
  const where: Prisma.MediaAssetWhereInput = {};

  // Filter by uploader if "mine" is selected
  if (options?.uploadedBy === 'mine') {
    where.uploadedById = userId;
  }

  if (options?.folderId !== undefined) {
    where.folderId = options.folderId;
  }

  if (options?.fileType === 'image') {
    where.fileType = { in: ALLOWED_IMAGE_TYPES };
  } else if (options?.fileType === 'video') {
    where.fileType = { in: ALLOWED_VIDEO_TYPES };
  }

  if (options?.search) {
    where.fileName = { contains: options.search, mode: 'insensitive' };
  }

  // Get count and items with uploader info
  const [total, items] = await Promise.all([
    prisma.mediaAsset.count({ where }),
    prisma.mediaAsset.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
  ]);

  const totalPages = Math.ceil(total / perPage);
  return {
    data: items.map((item) => formatMediaAsset(item, userId, userRole)),
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

// ============================================
// UPDATE OPERATIONS
// ============================================

/**
 * Update media asset metadata
 */
export async function updateMedia(
  assetId: string,
  userId: string,
  userRole: UserRole,
  data: { altText?: string; folderId?: string | null }
): Promise<MediaAssetSummary> {
  // Verify ownership or admin
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    select: { uploadedById: true },
  });

  if (!asset) {
    throw new AppError('MEDIA_NOT_FOUND', 'Media asset not found', 404);
  }

  const isOwner = asset.uploadedById === userId;
  const isAdmin = userRole === UserRole.ADMIN;
  if (!isOwner && !isAdmin) {
    throw new AppError('FORBIDDEN', 'You do not have permission to update this asset', 403);
  }

  // Verify folder exists if provided
  if (data.folderId) {
    const folder = await prisma.mediaFolder.findUnique({
      where: { id: data.folderId },
    });

    if (!folder) {
      throw new AppError('FOLDER_NOT_FOUND', 'Folder not found', 404);
    }
  }

  const updateData: { altText?: string | null; folderId?: string | null } = {};
  if (data.altText !== undefined) updateData.altText = data.altText;
  if (data.folderId !== undefined) updateData.folderId = data.folderId;

  const updated = await prisma.mediaAsset.update({
    where: { id: assetId },
    data: updateData,
    include: {
      uploadedBy: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
    },
  });

  return formatMediaAsset(updated, userId, userRole);
}

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Delete a media asset
 */
export async function deleteMedia(
  assetId: string,
  userId: string,
  userRole: UserRole
): Promise<void> {
  // Get asset to verify ownership and get storage paths
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    select: {
      uploadedById: true,
      storagePath: true,
      thumbnailPath: true,
      postMedia: { select: { id: true } },
    },
  });

  if (!asset) {
    throw new AppError('MEDIA_NOT_FOUND', 'Media asset not found', 404);
  }

  const isOwner = asset.uploadedById === userId;
  const isEditorOrAbove = userRole === UserRole.ADMIN || userRole === UserRole.EDITOR;
  if (!isOwner && !isEditorOrAbove) {
    throw new AppError('FORBIDDEN', 'You do not have permission to delete this asset', 403);
  }

  // Check if media is in use
  if (asset.postMedia.length > 0) {
    throw new AppError(
      'MEDIA_IN_USE',
      'Cannot delete media that is attached to posts. Remove from posts first.',
      400
    );
  }

  // Delete from S3
  const keysToDelete = [asset.storagePath];
  if (asset.thumbnailPath) {
    keysToDelete.push(asset.thumbnailPath);
  }

  await s3.deleteFiles(keysToDelete);

  // Delete from database
  await prisma.mediaAsset.delete({ where: { id: assetId } });

  logger.info({ assetId, userId }, 'Media deleted successfully');
}

// ============================================
// VIDEO THUMBNAIL BACKFILL
// ============================================

/**
 * Generate thumbnails for existing videos that don't have one.
 * Returns the number of videos processed.
 */
export async function backfillVideoThumbnails(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const videos = await prisma.mediaAsset.findMany({
    where: {
      fileType: { in: ALLOWED_VIDEO_TYPES },
      thumbnailPath: null,
    },
    select: {
      id: true,
      storagePath: true,
      fileName: true,
      uploadedById: true,
    },
  });

  let succeeded = 0;
  let failed = 0;

  for (const video of videos) {
    let tempPath: string | null = null;
    try {
      // Download original video from S3
      const videoBuffer = await s3.downloadFile(video.storagePath);
      const ext = video.fileName.includes('.')
        ? video.fileName.substring(video.fileName.lastIndexOf('.'))
        : '.mp4';
      tempPath = await writeBufferToTempFile(videoBuffer, ext);

      // Extract metadata
      const metadata = await extractVideoMetadata(tempPath);

      // Generate thumbnail
      const thumbnailBuffer = await generateVideoThumbnail(tempPath, THUMBNAIL_SIZE);

      const updateData: {
        duration?: number;
        width?: number;
        height?: number;
        thumbnailPath?: string;
      } = {};

      if (metadata) {
        updateData.duration = metadata.duration;
        updateData.width = metadata.width;
        updateData.height = metadata.height;
      }

      if (thumbnailBuffer) {
        const thumbnailKey = s3.generateStorageKey(video.uploadedById, video.fileName, 'thumbnail');
        await s3.uploadFile(thumbnailKey, thumbnailBuffer, {
          contentType: 'image/jpeg',
          metadata: { originalFile: video.fileName },
        });
        updateData.thumbnailPath = thumbnailKey;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.mediaAsset.update({
          where: { id: video.id },
          data: updateData,
        });
      }

      succeeded++;
      logger.info({ assetId: video.id }, 'Video thumbnail backfilled');
    } catch (err) {
      failed++;
      logger.warn({ err, assetId: video.id }, 'Failed to backfill video thumbnail');
    } finally {
      if (tempPath) await cleanupTempFile(tempPath);
    }
  }

  return { processed: videos.length, succeeded, failed };
}

// ============================================
// FOLDER OPERATIONS
// ============================================

/**
 * Create a media folder
 */
export async function createFolder(
  name: string,
  userId: string,
  parentId?: string
): Promise<{ id: string; name: string; parentId: string | null }> {
  // Verify parent folder exists if provided
  if (parentId) {
    const parent = await prisma.mediaFolder.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new AppError('FOLDER_NOT_FOUND', 'Parent folder not found', 404);
    }
  }

  const folder = await prisma.mediaFolder.create({
    data: {
      name,
      createdById: userId,
      parentId: parentId ?? null,
    },
  });

  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
  };
}

/**
 * List folders
 */
export async function listFolders(
  _userId: string,
  parentId?: string | null
): Promise<Array<{ id: string; name: string; parentId: string | null; assetCount: number }>> {
  const folders = await prisma.mediaFolder.findMany({
    where: {
      parentId: parentId ?? null,
    },
    include: {
      _count: {
        select: { assets: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    assetCount: folder._count.assets,
  }));
}

/**
 * Delete a folder
 */
export async function deleteFolder(folderId: string, userId: string): Promise<void> {
  const folder = await prisma.mediaFolder.findUnique({
    where: { id: folderId },
    select: {
      createdById: true,
      _count: { select: { assets: true, children: true } },
    },
  });

  if (!folder) {
    throw new AppError('FOLDER_NOT_FOUND', 'Folder not found', 404);
  }

  if (folder.createdById !== userId) {
    throw new AppError('FORBIDDEN', 'You do not have permission to delete this folder', 403);
  }

  if (folder._count.assets > 0 || folder._count.children > 0) {
    throw new AppError(
      'FOLDER_NOT_EMPTY',
      'Cannot delete folder that contains files or subfolders',
      400
    );
  }

  await prisma.mediaFolder.delete({ where: { id: folderId } });
}
