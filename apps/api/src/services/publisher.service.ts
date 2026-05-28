/**
 * Social Planner - Publisher Service
 *
 * Handles publishing content to various social media platforms.
 * Uses adapter pattern for platform-specific implementations.
 */

import { logger } from '../lib/logger';

// ============================================
// HELPERS
// ============================================

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.wmv', '.webm'];

/**
 * Check if a URL points to a video file.
 * Strips query parameters before checking to avoid false matches on presigned URLs.
 */
function isVideoUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    // Fallback for malformed URLs: check before any '?' query string
    const pathPart = url.split('?')[0].toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => pathPart.endsWith(ext));
  }
}

/**
 * Escape reserved characters for LinkedIn's "Little Text" commentary format.
 * Unescaped reserved chars cause silent truncation at the first occurrence.
 * Backslash must be first in the character class so it's processed before
 * the backslashes we introduce in replacements.
 */
export function escapeLinkedInLittleText(text: string): string {
  return text.replace(/([\\()<>[\]_{}@|*~])/g, '\\$1');
}

// ============================================
// TYPES
// ============================================

export interface PublishRequest {
  platform: string;
  content: string;
  accessToken: string;
  mediaUrls?: string[];
  /** Platform-specific account ID (e.g., LinkedIn org URN or personal profile ID) */
  platformAccountId?: string;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  publishedUrl?: string;
  error?: string;
}

interface PlatformAdapter {
  publish(request: PublishRequest): Promise<PublishResult>;
}

// ============================================
// PLATFORM ADAPTERS
// ============================================

/**
 * Instagram Publishing Adapter
 * Uses Instagram Graph API for Business/Creator accounts
 */
class InstagramAdapter implements PlatformAdapter {
  private readonly GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

  async publish(request: PublishRequest): Promise<PublishResult> {
    const { content, accessToken, platformAccountId, mediaUrls } = request;

    try {
      logger.info(
        {
          platform: 'instagram',
          contentLength: content.length,
          platformAccountId,
          hasMedia: !!mediaUrls?.length,
        },
        'Publishing to Instagram'
      );

      // Validate required fields
      if (!accessToken) {
        return {
          success: false,
          error: 'Instagram access token is required',
        };
      }

      if (!platformAccountId) {
        return {
          success: false,
          error: 'Instagram account ID is required',
        };
      }

      // Instagram requires media for all posts
      if (!mediaUrls || mediaUrls.length === 0) {
        return {
          success: false,
          error: 'Instagram requires at least one image or video to publish',
        };
      }

      // For single media posts
      if (mediaUrls.length === 1) {
        return await this.publishSingleMedia(platformAccountId, accessToken, content, mediaUrls[0]);
      }

      // For carousel posts (multiple media)
      return await this.publishCarousel(platformAccountId, accessToken, content, mediaUrls);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ platform: 'instagram', error: errorMessage }, 'Instagram publishing failed');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Publish a single image or video post
   */
  private async publishSingleMedia(
    accountId: string,
    accessToken: string,
    caption: string,
    mediaUrl: string
  ): Promise<PublishResult> {
    const isVideo = isVideoUrl(mediaUrl);

    // Step 1: Create media container
    const containerParams = new URLSearchParams({
      access_token: accessToken,
      caption,
      ...(isVideo ? { video_url: mediaUrl, media_type: 'REELS' } : { image_url: mediaUrl }),
    });

    const containerResponse = await fetch(
      `${this.GRAPH_API_URL}/${accountId}/media?${containerParams.toString()}`,
      { method: 'POST' }
    );

    if (!containerResponse.ok) {
      const error = await this.parseError(containerResponse);
      return { success: false, error: `Failed to create media container: ${error}` };
    }

    const containerData = (await containerResponse.json()) as { id: string };
    const containerId = containerData.id;

    // Step 2: For videos, wait for processing
    if (isVideo) {
      const ready = await this.waitForMediaReady(containerId, accessToken);
      if (!ready.success) {
        return ready;
      }
    }

    // Step 3: Publish the container
    const publishParams = new URLSearchParams({
      access_token: accessToken,
      creation_id: containerId,
    });

    const publishResponse = await fetch(
      `${this.GRAPH_API_URL}/${accountId}/media_publish?${publishParams.toString()}`,
      { method: 'POST' }
    );

    if (!publishResponse.ok) {
      const error = await this.parseError(publishResponse);
      return { success: false, error: `Failed to publish media: ${error}` };
    }

    const publishData = (await publishResponse.json()) as { id: string };
    logger.info({ platformPostId: publishData.id }, 'Instagram post published successfully');

    // Fetch permalink for the published post
    const publishedUrl = await this.fetchPermalink(publishData.id, accessToken);

    return {
      success: true,
      platformPostId: publishData.id,
      ...(publishedUrl && { publishedUrl }),
    };
  }

  /**
   * Publish a carousel post with multiple images/videos
   */
  private async publishCarousel(
    accountId: string,
    accessToken: string,
    caption: string,
    mediaUrls: string[]
  ): Promise<PublishResult> {
    // Step 1: Create containers for each media item
    const childContainerIds: string[] = [];

    for (const mediaUrl of mediaUrls) {
      const isVideo = isVideoUrl(mediaUrl);
      const containerParams = new URLSearchParams({
        access_token: accessToken,
        is_carousel_item: 'true',
        ...(isVideo ? { video_url: mediaUrl, media_type: 'VIDEO' } : { image_url: mediaUrl }),
      });

      const containerResponse = await fetch(
        `${this.GRAPH_API_URL}/${accountId}/media?${containerParams.toString()}`,
        { method: 'POST' }
      );

      if (!containerResponse.ok) {
        const error = await this.parseError(containerResponse);
        return { success: false, error: `Failed to create carousel item: ${error}` };
      }

      const containerData = (await containerResponse.json()) as { id: string };
      childContainerIds.push(containerData.id);

      // Wait for video processing
      if (isVideo) {
        const ready = await this.waitForMediaReady(containerData.id, accessToken);
        if (!ready.success) {
          return ready;
        }
      }
    }

    // Step 2: Create carousel container
    const carouselParams = new URLSearchParams({
      access_token: accessToken,
      caption,
      media_type: 'CAROUSEL',
      children: childContainerIds.join(','),
    });

    const carouselResponse = await fetch(
      `${this.GRAPH_API_URL}/${accountId}/media?${carouselParams.toString()}`,
      { method: 'POST' }
    );

    if (!carouselResponse.ok) {
      const error = await this.parseError(carouselResponse);
      return { success: false, error: `Failed to create carousel: ${error}` };
    }

    const carouselData = (await carouselResponse.json()) as { id: string };

    // Step 3: Publish the carousel
    const publishParams = new URLSearchParams({
      access_token: accessToken,
      creation_id: carouselData.id,
    });

    const publishResponse = await fetch(
      `${this.GRAPH_API_URL}/${accountId}/media_publish?${publishParams.toString()}`,
      { method: 'POST' }
    );

    if (!publishResponse.ok) {
      const error = await this.parseError(publishResponse);
      return { success: false, error: `Failed to publish carousel: ${error}` };
    }

    const publishData = (await publishResponse.json()) as { id: string };
    logger.info({ platformPostId: publishData.id }, 'Instagram carousel published successfully');

    // Fetch permalink for the published carousel
    const publishedUrl = await this.fetchPermalink(publishData.id, accessToken);

    return {
      success: true,
      platformPostId: publishData.id,
      ...(publishedUrl && { publishedUrl }),
    };
  }

  /**
   * Fetch the permalink for a published Instagram media post
   */
  private async fetchPermalink(mediaId: string, accessToken: string): Promise<string | undefined> {
    try {
      const response = await fetch(
        `${this.GRAPH_API_URL}/${mediaId}?fields=permalink&access_token=${accessToken}`
      );
      if (!response.ok) return undefined;
      const data = (await response.json()) as { permalink?: string };
      return data.permalink;
    } catch {
      return undefined;
    }
  }

  /**
   * Wait for video media to be ready for publishing
   */
  private async waitForMediaReady(
    containerId: string,
    accessToken: string,
    maxAttempts = 30
  ): Promise<PublishResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusResponse = await fetch(
        `${this.GRAPH_API_URL}/${containerId}?fields=status_code&access_token=${accessToken}`
      );

      if (!statusResponse.ok) {
        const error = await this.parseError(statusResponse);
        return { success: false, error: `Failed to check media status: ${error}` };
      }

      const statusData = (await statusResponse.json()) as { status_code: string };

      if (statusData.status_code === 'FINISHED') {
        return { success: true };
      }

      if (statusData.status_code === 'ERROR') {
        return { success: false, error: 'Media processing failed' };
      }

      // Wait 2 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return { success: false, error: 'Media processing timeout' };
  }

  /**
   * Parse error response from Instagram API
   */
  private async parseError(response: Response): Promise<string> {
    try {
      const errorData = (await response.json()) as { error?: { message?: string } };
      return errorData.error?.message || `HTTP ${response.status}`;
    } catch {
      return `HTTP ${response.status}`;
    }
  }
}

/**
 * LinkedIn Publishing Adapter
 * Uses LinkedIn Marketing API for company pages and personal profiles
 */
class LinkedInAdapter implements PlatformAdapter {
  private readonly LINKEDIN_API_URL = 'https://api.linkedin.com';
  private readonly LINKEDIN_VERSION = '202601';
  private readonly MAX_IMAGES = 20;

  async publish(request: PublishRequest): Promise<PublishResult> {
    const { content, accessToken, platformAccountId, mediaUrls } = request;

    try {
      logger.info(
        {
          platform: 'linkedin',
          contentLength: content.length,
          platformAccountId,
          hasMedia: !!mediaUrls?.length,
          mediaCount: mediaUrls?.length ?? 0,
        },
        'Publishing to LinkedIn'
      );

      // Validate required fields
      if (!accessToken) {
        return {
          success: false,
          error: 'LinkedIn access token is required',
        };
      }

      if (!platformAccountId) {
        return {
          success: false,
          error: 'LinkedIn account ID is required',
        };
      }

      // Determine author URN
      // For organizations: platformAccountId is already "urn:li:organization:123456"
      // For personal profiles: platformAccountId is the member sub, needs to be formatted
      const authorUrn = platformAccountId.startsWith('urn:li:')
        ? platformAccountId
        : `urn:li:person:${platformAccountId}`;

      // Upload media if provided
      let contentField: Record<string, unknown> | undefined;

      if (mediaUrls && mediaUrls.length > 0) {
        // Separate videos from images
        const videoUrls = mediaUrls.filter((url) => isVideoUrl(url));
        const imageUrls = mediaUrls.filter((url) => !isVideoUrl(url));

        if (videoUrls.length > 0) {
          // LinkedIn supports only 1 video per post, no mixing with images
          const videoUrl = videoUrls[0];
          if (videoUrls.length > 1) {
            logger.warn(
              { platform: 'linkedin', requested: videoUrls.length },
              'LinkedIn supports only 1 video per post, using first video'
            );
          }

          const result = await this.uploadVideo(videoUrl, accessToken, authorUrn);
          if (!result.success) {
            return {
              success: false,
              error: `Failed to upload video: ${result.error}`,
            };
          }
          contentField = {
            media: { id: result.videoUrn },
          };
        } else if (imageUrls.length > 0) {
          const urls = imageUrls.slice(0, this.MAX_IMAGES);
          if (imageUrls.length > this.MAX_IMAGES) {
            logger.warn(
              { platform: 'linkedin', requested: imageUrls.length, limit: this.MAX_IMAGES },
              'Truncating images to LinkedIn maximum'
            );
          }

          // Upload all images sequentially
          const imageUrns: string[] = [];
          for (let i = 0; i < urls.length; i++) {
            const result = await this.uploadImage(urls[i], accessToken, authorUrn);
            if (!result.success) {
              return {
                success: false,
                error: `Failed to upload image ${i + 1}/${urls.length}: ${result.error}`,
              };
            }
            imageUrns.push(result.imageUrn!);
          }

          // Single image vs multi-image content structure
          if (imageUrns.length === 1) {
            contentField = {
              media: { id: imageUrns[0] },
            };
          } else {
            contentField = {
              multiImage: {
                images: imageUrns.map((urn) => ({ id: urn })),
              },
            };
          }
        }
      }

      // Create post using LinkedIn Posts API
      // commentary uses LinkedIn "Little Text" format — reserved chars must be escaped
      // or LinkedIn silently truncates at the first unescaped one.
      const postBody: Record<string, unknown> = {
        author: authorUrn,
        commentary: escapeLinkedInLittleText(content),
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      };

      if (contentField) {
        postBody.content = contentField;
      }

      logger.info(
        { authorUrn, postBodyPreview: content.substring(0, 100), hasContent: !!contentField },
        'LinkedIn API request'
      );

      const response = await fetch(`${this.LINKEDIN_API_URL}/rest/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': this.LINKEDIN_VERSION,
        },
        body: JSON.stringify(postBody),
      });

      // LinkedIn returns 201 Created with x-restli-id header for the post ID
      if (response.status === 201) {
        const postId = response.headers.get('x-restli-id') || `li_${Date.now()}`;
        logger.info({ platformPostId: postId }, 'LinkedIn post created successfully');
        return {
          success: true,
          platformPostId: postId,
          publishedUrl: `https://www.linkedin.com/feed/update/${postId}`,
        };
      }

      // Handle error response
      const errorText = await response.text();
      let errorMessage = `LinkedIn API error: ${response.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      logger.error({ status: response.status, error: errorMessage }, 'LinkedIn API request failed');

      return {
        success: false,
        error: errorMessage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ platform: 'linkedin', error: errorMessage }, 'LinkedIn publishing failed');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Upload an image to LinkedIn and return the image URN.
   * Flow: fetch binary → initializeUpload → PUT binary → return URN
   */
  private async uploadImage(
    imageUrl: string,
    accessToken: string,
    ownerUrn: string
  ): Promise<{ success: boolean; imageUrn?: string; error?: string }> {
    try {
      logger.info(
        { platform: 'linkedin', imageUrl, step: 'fetch' },
        'Fetching image for LinkedIn upload'
      );

      // Step 1: Fetch the image binary
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return {
          success: false,
          error: `Failed to fetch image from ${imageUrl}: HTTP ${imageResponse.status}`,
        };
      }
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // Step 2: Initialize upload with LinkedIn
      logger.info(
        { platform: 'linkedin', imageUrl, step: 'initializeUpload' },
        'Initializing LinkedIn image upload'
      );

      const initResponse = await fetch(
        `${this.LINKEDIN_API_URL}/rest/images?action=initializeUpload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': this.LINKEDIN_VERSION,
          },
          body: JSON.stringify({
            initializeUploadRequest: { owner: ownerUrn },
          }),
        }
      );

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        return {
          success: false,
          error: `LinkedIn initializeUpload failed (${initResponse.status}): ${errorText}`,
        };
      }

      const initData = (await initResponse.json()) as {
        value: { uploadUrl: string; image: string };
      };
      const { uploadUrl, image: imageUrn } = initData.value;

      // Step 3: Upload binary to the presigned URL
      logger.info(
        { platform: 'linkedin', imageUrl, step: 'binaryUpload', imageUrn },
        'Uploading image binary to LinkedIn'
      );

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer,
      });

      if (!uploadResponse.ok && uploadResponse.status !== 201) {
        return {
          success: false,
          error: `LinkedIn binary upload failed (${uploadResponse.status})`,
        };
      }

      logger.info(
        { platform: 'linkedin', imageUrn, step: 'complete' },
        'LinkedIn image upload completed'
      );

      return { success: true, imageUrn };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        { platform: 'linkedin', imageUrl, error: errorMessage },
        'LinkedIn image upload failed'
      );
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Upload a video to LinkedIn and return the video URN.
   * Flow: fetch binary → initializeUpload → PUT binary → poll status → return URN
   */
  private async uploadVideo(
    videoUrl: string,
    accessToken: string,
    ownerUrn: string
  ): Promise<{ success: boolean; videoUrn?: string; error?: string }> {
    try {
      logger.info(
        { platform: 'linkedin', videoUrl, step: 'fetch' },
        'Fetching video for LinkedIn upload'
      );

      // Step 1: Fetch the video binary
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        return {
          success: false,
          error: `Failed to fetch video from ${videoUrl}: HTTP ${videoResponse.status}`,
        };
      }
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

      // Step 2: Initialize video upload with LinkedIn
      logger.info(
        { platform: 'linkedin', videoUrl, step: 'initializeUpload', sizeBytes: videoBuffer.length },
        'Initializing LinkedIn video upload'
      );

      const initResponse = await fetch(
        `${this.LINKEDIN_API_URL}/rest/videos?action=initializeUpload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': this.LINKEDIN_VERSION,
          },
          body: JSON.stringify({
            initializeUploadRequest: {
              owner: ownerUrn,
              fileSizeBytes: videoBuffer.length,
              uploadCaptions: false,
              uploadThumbnail: false,
            },
          }),
        }
      );

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        return {
          success: false,
          error: `LinkedIn video initializeUpload failed (${initResponse.status}): ${errorText}`,
        };
      }

      const initData = (await initResponse.json()) as {
        value: {
          uploadInstructions: Array<{ uploadUrl: string; firstByte: number; lastByte: number }>;
          video: string;
        };
      };
      const { uploadInstructions, video: videoUrn } = initData.value;

      // Step 3: Upload binary chunks to the presigned URLs, collect etags
      const uploadedPartIds: string[] = [];

      for (let i = 0; i < uploadInstructions.length; i++) {
        const instruction = uploadInstructions[i];
        const chunk = videoBuffer.subarray(instruction.firstByte, instruction.lastByte + 1);

        logger.info(
          {
            platform: 'linkedin',
            step: 'binaryUpload',
            videoUrn,
            chunk: i + 1,
            totalChunks: uploadInstructions.length,
            chunkSize: chunk.length,
          },
          'Uploading video chunk to LinkedIn'
        );

        const uploadResponse = await fetch(instruction.uploadUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream',
          },
          body: chunk,
        });

        if (!uploadResponse.ok && uploadResponse.status !== 201) {
          return {
            success: false,
            error: `LinkedIn video chunk ${i + 1} upload failed (${uploadResponse.status})`,
          };
        }

        // Capture etag for finalizeUpload - LinkedIn requires these as part IDs
        const etag = uploadResponse.headers.get('etag');
        if (etag) {
          uploadedPartIds.push(etag);
        }
      }

      // Step 4: Finalize the upload with collected part IDs
      const finalizeResponse = await fetch(
        `${this.LINKEDIN_API_URL}/rest/videos?action=finalizeUpload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': this.LINKEDIN_VERSION,
          },
          body: JSON.stringify({
            finalizeUploadRequest: {
              video: videoUrn,
              uploadToken: '',
              uploadedPartIds,
            },
          }),
        }
      );

      if (!finalizeResponse.ok) {
        const errorText = await finalizeResponse.text();
        logger.warn(
          {
            platform: 'linkedin',
            videoUrn,
            status: finalizeResponse.status,
            error: errorText,
            partCount: uploadedPartIds.length,
          },
          'LinkedIn video finalize returned non-OK'
        );
      }

      // Step 5: Poll for video processing completion (max 5 minutes)
      const maxWaitMs = 5 * 60 * 1000;
      const pollIntervalMs = 5000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitMs) {
        const statusResponse = await fetch(
          `${this.LINKEDIN_API_URL}/rest/videos/${encodeURIComponent(videoUrn)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'X-Restli-Protocol-Version': '2.0.0',
              'LinkedIn-Version': this.LINKEDIN_VERSION,
            },
          }
        );

        if (statusResponse.ok) {
          const statusData = (await statusResponse.json()) as Record<string, unknown>;
          const status = (statusData.status || statusData.uploadStatus || '') as string;

          logger.info(
            { platform: 'linkedin', videoUrn, status, rawKeys: Object.keys(statusData) },
            'LinkedIn video processing poll'
          );

          if (status === 'AVAILABLE' || status === 'PROCESSING_COMPLETE') {
            logger.info(
              { platform: 'linkedin', videoUrn, step: 'complete' },
              'LinkedIn video upload completed'
            );
            return { success: true, videoUrn };
          }

          if (status === 'FAILED' || status === 'PROCESSING_FAILED') {
            return {
              success: false,
              error: `LinkedIn video processing failed (status: ${status})`,
            };
          }

          logger.debug(
            { platform: 'linkedin', videoUrn, status },
            'Waiting for LinkedIn video processing'
          );
        } else {
          const errorText = await statusResponse.text();
          logger.warn(
            { platform: 'linkedin', videoUrn, httpStatus: statusResponse.status, error: errorText },
            'LinkedIn video status poll returned non-OK'
          );
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }

      // Timeout — fail instead of creating a post with unprocessed video
      return {
        success: false,
        error: 'LinkedIn video processing timed out after 5 minutes',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        { platform: 'linkedin', videoUrl, error: errorMessage },
        'LinkedIn video upload failed'
      );
      return { success: false, error: errorMessage };
    }
  }
}

/**
 * Facebook Publishing Adapter
 * Uses Facebook Graph API for pages
 */
class FacebookAdapter implements PlatformAdapter {
  async publish(request: PublishRequest): Promise<PublishResult> {
    const { content } = request;

    try {
      logger.info(
        { platform: 'facebook', contentLength: content.length },
        'Publishing to Facebook'
      );

      // TODO: Implement actual Facebook Graph API integration
      // In production, this would:
      // 1. Get page ID from account
      // 2. Post to /{page-id}/feed or /{page-id}/photos
      // 3. Handle media uploads

      return {
        success: false,
        error: 'Facebook publishing not yet implemented',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ platform: 'facebook', error: errorMessage }, 'Facebook publishing failed');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

/**
 * Twitter/X Publishing Adapter
 * Uses Twitter API v2
 */
class TwitterAdapter implements PlatformAdapter {
  async publish(request: PublishRequest): Promise<PublishResult> {
    const { content } = request;

    try {
      logger.info({ platform: 'twitter', contentLength: content.length }, 'Publishing to Twitter');

      // Check content length limit (280 characters for Twitter)
      if (content.length > 280) {
        return {
          success: false,
          error: 'Content exceeds Twitter character limit (280)',
        };
      }

      // TODO: Implement actual Twitter API v2 integration
      // In production, this would:
      // 1. Create a tweet using POST /2/tweets
      // 2. Handle media uploads separately
      // 3. Handle threads for long content

      return {
        success: false,
        error: 'Twitter publishing not yet implemented',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ platform: 'twitter', error: errorMessage }, 'Twitter publishing failed');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

/**
 * TikTok Publishing Adapter
 * Uses TikTok Content Posting API
 */
class TikTokAdapter implements PlatformAdapter {
  async publish(request: PublishRequest): Promise<PublishResult> {
    const { content } = request;

    try {
      logger.info({ platform: 'tiktok', contentLength: content.length }, 'Publishing to TikTok');

      // TikTok requires video content - cannot post text-only
      // TODO: Implement actual TikTok Content Posting API integration

      return {
        success: false,
        error: 'TikTok publishing not yet implemented',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ platform: 'tiktok', error: errorMessage }, 'TikTok publishing failed');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

// ============================================
// ADAPTER REGISTRY
// ============================================

const adapters: Record<string, PlatformAdapter> = {
  INSTAGRAM: new InstagramAdapter(),
  LINKEDIN: new LinkedInAdapter(),
  FACEBOOK: new FacebookAdapter(),
  TWITTER: new TwitterAdapter(),
  TIKTOK: new TikTokAdapter(),
};

// ============================================
// PUBLIC API
// ============================================

/**
 * Publish content to a social platform
 */
export async function publish(request: PublishRequest): Promise<PublishResult> {
  const adapter = adapters[request.platform.toUpperCase()];

  if (!adapter) {
    logger.warn({ platform: request.platform }, 'Unknown platform requested');
    return {
      success: false,
      error: `Unsupported platform: ${request.platform}`,
    };
  }

  return adapter.publish(request);
}

/**
 * Check if a platform is supported for publishing
 */
export function isPlatformSupported(platform: string): boolean {
  return platform.toUpperCase() in adapters;
}

/**
 * Get list of supported platforms
 */
export function getSupportedPlatforms(): string[] {
  return Object.keys(adapters);
}

/**
 * Validate content for a specific platform
 */
export function validateContent(
  platform: string,
  content: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const platformUpper = platform.toUpperCase();

  switch (platformUpper) {
    case 'TWITTER':
      if (content.length > 280) {
        errors.push(`Content exceeds Twitter limit (${content.length}/280 characters)`);
      }
      break;

    case 'INSTAGRAM':
      if (content.length > 2200) {
        errors.push(`Content exceeds Instagram limit (${content.length}/2200 characters)`);
      }
      break;

    case 'LINKEDIN':
      if (content.length > 3000) {
        errors.push(`Content exceeds LinkedIn limit (${content.length}/3000 characters)`);
      }
      break;

    case 'FACEBOOK':
      if (content.length > 63206) {
        errors.push(`Content exceeds Facebook limit (${content.length}/63206 characters)`);
      }
      break;

    case 'TIKTOK':
      if (content.length > 2200) {
        errors.push(`Content exceeds TikTok caption limit (${content.length}/2200 characters)`);
      }
      break;

    default:
      errors.push(`Unknown platform: ${platform}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
