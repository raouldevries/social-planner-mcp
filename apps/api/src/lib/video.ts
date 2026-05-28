/**
 * Social Planner - Video Processing
 *
 * Extracts thumbnails and metadata from video files using FFmpeg.
 * Requires FFmpeg to be installed on the system.
 */

import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { logger } from './logger';

// ============================================
// TYPES
// ============================================

export interface VideoMetadata {
  duration: number; // seconds
  width: number;
  height: number;
}

// ============================================
// VIDEO METADATA
// ============================================

/**
 * Extract metadata (duration, dimensions) from a video file.
 * Returns null if extraction fails.
 */
export function extractVideoMetadata(filePath: string): Promise<VideoMetadata | null> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) {
        logger.warn({ err, filePath }, 'Failed to extract video metadata');
        resolve(null);
        return;
      }

      const videoStream = data.streams.find((s) => s.codec_type === 'video');
      const duration = data.format.duration ? Math.round(data.format.duration) : 0;
      const width = videoStream?.width ?? 0;
      const height = videoStream?.height ?? 0;

      resolve({ duration, width, height });
    });
  });
}

// ============================================
// THUMBNAIL GENERATION
// ============================================

/**
 * Generate a JPEG thumbnail from a video file.
 * Extracts a frame at 25% of the video duration (or 1s for very short videos).
 * Returns the thumbnail as a Buffer, or null if generation fails.
 */
export async function generateVideoThumbnail(
  videoPath: string,
  thumbnailSize: number = 300
): Promise<Buffer | null> {
  const outputDir = join(tmpdir(), `planner-thumb-${randomUUID()}`);
  const outputFile = join(outputDir, 'thumbnail.jpg');

  try {
    await fs.mkdir(outputDir, { recursive: true });

    // Get duration to pick a good frame
    const metadata = await extractVideoMetadata(videoPath);
    const seekTime = metadata && metadata.duration > 2 ? metadata.duration * 0.25 : 1;

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(seekTime)
        .frames(1)
        .outputOptions([
          `-vf`,
          `scale=${thumbnailSize}:${thumbnailSize}:force_original_aspect_ratio=increase,crop=${thumbnailSize}:${thumbnailSize}`,
          '-q:v',
          '5',
        ])
        .output(outputFile)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    const thumbnailBuffer = await fs.readFile(outputFile);
    return thumbnailBuffer;
  } catch (err) {
    logger.warn({ err, videoPath }, 'Failed to generate video thumbnail');
    return null;
  } finally {
    // Clean up temp directory
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// ============================================
// BUFFER HELPERS
// ============================================

/**
 * Write a buffer to a temporary file and return its path.
 * Caller is responsible for cleaning up.
 */
export async function writeBufferToTempFile(buffer: Buffer, extension: string): Promise<string> {
  const tempPath = join(tmpdir(), `planner-video-${randomUUID()}${extension}`);
  await fs.writeFile(tempPath, buffer);
  return tempPath;
}

/**
 * Clean up a temporary file.
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore cleanup errors
  }
}
