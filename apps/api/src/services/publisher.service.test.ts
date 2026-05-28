/**
 * Publisher Service Tests — LinkedIn image publishing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger to avoid noise in test output
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { publish, escapeLinkedInLittleText, type PublishRequest } from './publisher.service';

// Helper to create a mock Response
function mockResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {}
): Response {
  const headersObj = new Headers(headers);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headersObj,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
  } as unknown as Response;
}

const baseRequest: PublishRequest = {
  platform: 'LINKEDIN',
  content: 'Test post content',
  accessToken: 'test-access-token',
  platformAccountId: 'urn:li:organization:12345',
};

describe('LinkedInAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('text-only posts', () => {
    it('should publish a text-only post when no mediaUrls provided', async () => {
      const mockFetch = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(mockResponse(201, null, { 'x-restli-id': 'urn:li:share:123' }));

      const result = await publish(baseRequest);

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('urn:li:share:123');
      expect(result.publishedUrl).toBe('https://www.linkedin.com/feed/update/urn:li:share:123');

      // Should only make one fetch call (create post)
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify the post body has no content field
      const postCall = mockFetch.mock.calls[0];
      const postBody = JSON.parse(postCall[1]!.body as string);
      expect(postBody.content).toBeUndefined();
      expect(postBody.commentary).toBe('Test post content');
      expect(postBody.author).toBe('urn:li:organization:12345');
    });

    it('should publish text-only when mediaUrls is empty array', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        mockResponse(201, null, { 'x-restli-id': 'urn:li:share:456' })
      );

      const result = await publish({ ...baseRequest, mediaUrls: [] });

      expect(result.success).toBe(true);
    });

    it('should format personal profile URN correctly', async () => {
      const mockFetch = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(mockResponse(201, null, { 'x-restli-id': 'urn:li:share:789' }));

      await publish({ ...baseRequest, platformAccountId: 'abc123' });

      const postBody = JSON.parse(mockFetch.mock.calls[0][1]!.body as string);
      expect(postBody.author).toBe('urn:li:person:abc123');
    });

    it('should escape LinkedIn Little Text reserved chars in commentary', async () => {
      const mockFetch = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(mockResponse(201, null, { 'x-restli-id': 'urn:li:share:esc' }));

      await publish({
        ...baseRequest,
        content: 'Houtbouw wordt nog (te) vaak — met HSB (houtskeletbouw) [ok].',
      });

      const postBody = JSON.parse(mockFetch.mock.calls[0][1]!.body as string);
      expect(postBody.commentary).toBe(
        'Houtbouw wordt nog \\(te\\) vaak — met HSB \\(houtskeletbouw\\) \\[ok\\].'
      );
    });
  });

  describe('escapeLinkedInLittleText', () => {
    it('escapes all reserved characters', () => {
      expect(escapeLinkedInLittleText('()<>[]_{}@|*~')).toBe(
        '\\(\\)\\<\\>\\[\\]\\_\\{\\}\\@\\|\\*\\~'
      );
    });

    it('escapes backslash without double-escaping the backslashes it introduces', () => {
      expect(escapeLinkedInLittleText('a\\b(c)')).toBe('a\\\\b\\(c\\)');
    });

    it('leaves plain text untouched', () => {
      expect(escapeLinkedInLittleText('Hello, world! 123 éé — "quoted"')).toBe(
        'Hello, world! 123 éé — "quoted"'
      );
    });
  });

  describe('single-image posts', () => {
    it('should upload image and create post with content.media', async () => {
      const mockFetch = vi
        .spyOn(globalThis, 'fetch')
        // 1. Fetch image binary
        .mockResolvedValueOnce(mockResponse(200, null))
        // 2. initializeUpload
        .mockResolvedValueOnce(
          mockResponse(200, {
            value: {
              uploadUrl: 'https://api.linkedin.com/upload/image123',
              image: 'urn:li:image:img001',
            },
          })
        )
        // 3. PUT binary upload
        .mockResolvedValueOnce(mockResponse(201))
        // 4. Create post
        .mockResolvedValueOnce(
          mockResponse(201, null, { 'x-restli-id': 'urn:li:share:with-image' })
        );

      const result = await publish({
        ...baseRequest,
        mediaUrls: ['https://storage.example.com/photo.jpg'],
      });

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('urn:li:share:with-image');
      expect(mockFetch).toHaveBeenCalledTimes(4);

      // Verify initializeUpload call
      const initCall = mockFetch.mock.calls[1];
      expect(initCall[0]).toBe('https://api.linkedin.com/rest/images?action=initializeUpload');
      const initBody = JSON.parse(initCall[1]!.body as string);
      expect(initBody.initializeUploadRequest.owner).toBe('urn:li:organization:12345');

      // Verify binary upload call
      const uploadCall = mockFetch.mock.calls[2];
      expect(uploadCall[0]).toBe('https://api.linkedin.com/upload/image123');
      expect(uploadCall[1]!.method).toBe('PUT');

      // Verify post body includes content.media
      const postBody = JSON.parse(mockFetch.mock.calls[3][1]!.body as string);
      expect(postBody.content).toEqual({ media: { id: 'urn:li:image:img001' } });
    });
  });

  describe('multi-image posts', () => {
    it('should upload multiple images and create post with content.multiImage', async () => {
      const mockFetch = vi
        .spyOn(globalThis, 'fetch')
        // Image 1: fetch + init + upload
        .mockResolvedValueOnce(mockResponse(200, null)) // fetch img 1
        .mockResolvedValueOnce(
          mockResponse(200, {
            value: { uploadUrl: 'https://api.linkedin.com/upload/1', image: 'urn:li:image:001' },
          })
        )
        .mockResolvedValueOnce(mockResponse(201)) // PUT img 1
        // Image 2: fetch + init + upload
        .mockResolvedValueOnce(mockResponse(200, null)) // fetch img 2
        .mockResolvedValueOnce(
          mockResponse(200, {
            value: { uploadUrl: 'https://api.linkedin.com/upload/2', image: 'urn:li:image:002' },
          })
        )
        .mockResolvedValueOnce(mockResponse(201)) // PUT img 2
        // Create post
        .mockResolvedValueOnce(mockResponse(201, null, { 'x-restli-id': 'urn:li:share:multi' }));

      const result = await publish({
        ...baseRequest,
        mediaUrls: [
          'https://storage.example.com/photo1.jpg',
          'https://storage.example.com/photo2.jpg',
        ],
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(7); // 3 per image + 1 post

      // Verify post body includes multiImage content
      const postBody = JSON.parse(mockFetch.mock.calls[6][1]!.body as string);
      expect(postBody.content).toEqual({
        multiImage: {
          images: [{ id: 'urn:li:image:001' }, { id: 'urn:li:image:002' }],
        },
      });
    });
  });

  describe('error handling', () => {
    it('should return error when image fetch fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(404));

      const result = await publish({
        ...baseRequest,
        mediaUrls: ['https://storage.example.com/missing.jpg'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to upload image 1/1');
      expect(result.error).toContain('Failed to fetch image');
    });

    it('should return error when initializeUpload fails', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(mockResponse(200, null)) // fetch image OK
        .mockResolvedValueOnce(mockResponse(400, 'Bad Request')); // initializeUpload fails

      const result = await publish({
        ...baseRequest,
        mediaUrls: ['https://storage.example.com/photo.jpg'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('initializeUpload failed');
    });

    it('should return error when binary upload fails', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(mockResponse(200, null)) // fetch image
        .mockResolvedValueOnce(
          mockResponse(200, {
            value: { uploadUrl: 'https://api.linkedin.com/upload/x', image: 'urn:li:image:x' },
          })
        )
        .mockResolvedValueOnce(mockResponse(500)); // binary upload fails

      const result = await publish({
        ...baseRequest,
        mediaUrls: ['https://storage.example.com/photo.jpg'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('binary upload failed');
    });

    it('should fail early on second image if it cannot be fetched', async () => {
      vi.spyOn(globalThis, 'fetch')
        // Image 1: succeeds
        .mockResolvedValueOnce(mockResponse(200, null))
        .mockResolvedValueOnce(
          mockResponse(200, {
            value: { uploadUrl: 'https://api.linkedin.com/upload/1', image: 'urn:li:image:001' },
          })
        )
        .mockResolvedValueOnce(mockResponse(201))
        // Image 2: fetch fails
        .mockResolvedValueOnce(mockResponse(500));

      const result = await publish({
        ...baseRequest,
        mediaUrls: ['https://storage.example.com/ok.jpg', 'https://storage.example.com/fail.jpg'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to upload image 2/2');
    });

    it('should return error when LinkedIn post creation fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        mockResponse(403, { message: 'Insufficient permissions' })
      );

      const result = await publish(baseRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions');
    });

    it('should return error when access token is missing', async () => {
      const result = await publish({ ...baseRequest, accessToken: '' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('LinkedIn access token is required');
    });

    it('should return error when platformAccountId is missing', async () => {
      const result = await publish({ ...baseRequest, platformAccountId: '' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('LinkedIn account ID is required');
    });
  });
});
