/**
 * Social Planner - S3 Client
 *
 * AWS S3 compatible client for MinIO/S3 storage.
 * Handles file uploads, downloads, and presigned URLs.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { logger } from './logger';

// ============================================
// S3 CLIENT
// ============================================

export const s3Client = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO
});

const BUCKET = config.S3_BUCKET;

// ============================================
// UPLOAD OPERATIONS
// ============================================

export interface UploadOptions {
  contentType: string;
  metadata?: Record<string, string>;
}

/**
 * Upload a file to S3
 */
export async function uploadFile(key: string, body: Buffer, options: UploadOptions): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: options.contentType,
    Metadata: options.metadata,
  });

  try {
    await s3Client.send(command);
    logger.info({ key, bucket: BUCKET }, 'File uploaded to S3');
  } catch (error) {
    logger.error({ key, error }, 'Failed to upload file to S3');
    throw error;
  }
}

/**
 * Upload a file stream to S3
 */
export async function uploadStream(
  key: string,
  stream: NodeJS.ReadableStream,
  options: UploadOptions
): Promise<void> {
  // Convert stream to buffer for S3 upload
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  await uploadFile(key, buffer, options);
}

// ============================================
// DOWNLOAD OPERATIONS
// ============================================

/**
 * Download a file from S3
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  try {
    const response = await s3Client.send(command);
    const stream = response.Body as NodeJS.ReadableStream;

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  } catch (error) {
    logger.error({ key, error }, 'Failed to download file from S3');
    throw error;
  }
}

/**
 * Get a readable stream for a file
 */
export async function getFileStream(key: string): Promise<NodeJS.ReadableStream> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  return response.Body as NodeJS.ReadableStream;
}

// ============================================
// PRESIGNED URLs
// ============================================

/**
 * Generate a presigned URL for downloading a file
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a presigned URL for uploading a file
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

// ============================================
// FILE OPERATIONS
// ============================================

/**
 * Check if a file exists in S3
 */
export async function fileExists(key: string): Promise<boolean> {
  const command = new HeadObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  try {
    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(
  key: string
): Promise<{
  contentType: string | null;
  contentLength: number | null;
  metadata: Record<string, string> | null;
}> {
  const command = new HeadObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);

  return {
    contentType: response.ContentType ?? null,
    contentLength: response.ContentLength ?? null,
    metadata: response.Metadata ?? null,
  };
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  try {
    await s3Client.send(command);
    logger.info({ key, bucket: BUCKET }, 'File deleted from S3');
  } catch (error) {
    logger.error({ key, error }, 'Failed to delete file from S3');
    throw error;
  }
}

/**
 * Delete multiple files from S3
 */
export async function deleteFiles(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => deleteFile(key)));
}

/**
 * List files in a directory
 */
export async function listFiles(
  prefix: string,
  maxKeys: number = 1000
): Promise<Array<{ key: string; size: number | null; lastModified: Date | null }>> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await s3Client.send(command);

  return (
    response.Contents?.map((item) => ({
      key: item.Key!,
      size: item.Size ?? null,
      lastModified: item.LastModified ?? null,
    })) ?? []
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a storage key for a media file
 */
export function generateStorageKey(
  userId: string,
  fileName: string,
  type: 'original' | 'thumbnail' = 'original'
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const prefix = type === 'thumbnail' ? 'thumbnails' : 'media';

  return `${prefix}/${userId}/${timestamp}-${sanitizedFileName}`;
}

/**
 * Get the public URL for a file (if bucket is public)
 * Uses S3_PUBLIC_URL in production, falls back to S3_ENDPOINT for development
 */
export function getPublicUrl(key: string): string {
  const baseUrl = config.S3_PUBLIC_URL || config.S3_ENDPOINT;
  return `${baseUrl}/${BUCKET}/${key}`;
}
