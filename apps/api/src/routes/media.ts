/**
 * Social Planner - Media Routes
 *
 * API endpoints for media file uploads and management.
 * Supports images and videos with folder organization.
 */

import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireEditor, requireAdmin } from '../middleware/auth';
import { writeRateLimiter } from '../middleware/rateLimiter';
import { validate, validateQuery } from '../middleware/validate';
import { z } from 'zod';
import * as mediaService from '../services/media.service';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// ============================================
// MULTER CONFIGURATION
// ============================================

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (will be validated further in service)
    files: 10, // Max 10 files per request
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('INVALID_FILE_TYPE', `Unsupported file type: ${file.mimetype}`, 400));
    }
  },
});

// All routes require authentication
router.use(requireAuth);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const uploadOptionsSchema = z.object({
  folderId: z.string().uuid().optional(),
  altText: z.string().max(500).optional(),
});

const updateMediaSchema = z.object({
  altText: z.string().max(500).optional(),
  folderId: z.string().uuid().nullable().optional(),
});

const listMediaSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  folderId: z.string().uuid().optional(),
  fileType: z.enum(['image', 'video']).optional(),
  type: z.enum(['image', 'video']).optional(), // Alias for fileType (frontend compatibility)
  search: z.string().max(100).optional(),
  uploadedBy: z.enum(['all', 'mine']).optional(),
});

const createFolderSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().optional(),
});

// ============================================
// FOLDER MANAGEMENT (must be before /:id routes)
// ============================================

/**
 * GET /api/media/folders
 * List folders
 */
router.get('/folders', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const parentId = req.query.parentId as string | undefined;

    const folders = await mediaService.listFolders(userId, parentId ?? null);

    res.json({ folders });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/media/folders
 * Create a new folder
 */
router.post(
  '/folders',
  requireEditor,
  writeRateLimiter,
  validate(createFolderSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { name, parentId } = req.body as z.infer<typeof createFolderSchema>;

      const folder = await mediaService.createFolder(name, userId, parentId);

      res.status(201).json(folder);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/media/folders/:id
 * Delete a folder
 */
router.delete('/folders/:id', requireEditor, writeRateLimiter, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    await mediaService.deleteFolder(req.params.id, userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// UPLOAD ENDPOINTS
// ============================================

/**
 * POST /api/media/upload
 * Upload a single media file
 */
router.post(
  '/upload',
  requireEditor,
  writeRateLimiter,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError('NO_FILE', 'No file provided', 400);
      }

      const options = uploadOptionsSchema.parse(req.body);
      const userId = req.user!.id;

      const uploadOptions: { folderId?: string; altText?: string } = {};
      if (options.folderId) uploadOptions.folderId = options.folderId;
      if (options.altText) uploadOptions.altText = options.altText;

      const asset = await mediaService.uploadMedia(
        {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          buffer: req.file.buffer,
          size: req.file.size,
        },
        userId,
        uploadOptions
      );

      res.status(201).json(asset);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/media/upload-multiple
 * Upload multiple media files
 */
router.post(
  '/upload-multiple',
  requireEditor,
  writeRateLimiter,
  upload.array('files', 10),
  async (req, res, next) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new AppError('NO_FILES', 'No files provided', 400);
      }

      const options = uploadOptionsSchema.parse(req.body);
      const userId = req.user!.id;

      const uploadOptions: { folderId?: string } = {};
      if (options.folderId) uploadOptions.folderId = options.folderId;

      const assets = await mediaService.uploadMultipleMedia(
        files.map((file) => ({
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          buffer: file.buffer,
          size: file.size,
        })),
        userId,
        uploadOptions
      );

      res.status(201).json({ assets });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// VIDEO THUMBNAIL BACKFILL
// ============================================

/**
 * POST /api/media/backfill-thumbnails
 * Generate thumbnails for existing videos that don't have one (admin only)
 */
router.post('/backfill-thumbnails', requireAdmin, async (_req, res, next) => {
  try {
    const result = await mediaService.backfillVideoThumbnails();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================
// MEDIA RETRIEVAL
// ============================================

/**
 * GET /api/media
 * List media assets with filtering and pagination
 */
router.get('/', validateQuery(listMediaSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { page, perPage, folderId, fileType, type, search, uploadedBy } = req.query as {
      page?: string;
      perPage?: string;
      folderId?: string;
      fileType?: string;
      type?: string; // Alias for fileType
      search?: string;
      uploadedBy?: string;
    };

    const listOptions: {
      page?: number;
      perPage?: number;
      folderId?: string;
      fileType?: 'image' | 'video';
      search?: string;
      uploadedBy?: 'all' | 'mine';
    } = {};

    if (page) listOptions.page = parseInt(page);
    if (perPage) listOptions.perPage = parseInt(perPage);
    if (folderId) listOptions.folderId = folderId;
    // Support both fileType and type params (frontend sends 'type')
    const effectiveFileType = fileType ?? type;
    if (effectiveFileType === 'image' || effectiveFileType === 'video') {
      listOptions.fileType = effectiveFileType;
    }
    if (search) listOptions.search = search;
    if (uploadedBy === 'all' || uploadedBy === 'mine') {
      listOptions.uploadedBy = uploadedBy;
    }

    const result = await mediaService.listMedia(userId, userRole, listOptions);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/media/:id
 * Get media asset details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const asset = await mediaService.getMediaById(req.params.id, userId, userRole);
    res.json(asset);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/media/:id/download
 * Get a presigned download URL for a media asset
 */
router.get('/:id/download', async (req, res, next) => {
  try {
    const expiresIn = parseInt(req.query.expiresIn as string) || 3600;
    const url = await mediaService.getDownloadUrl(req.params.id, expiresIn);

    res.json({ url, expiresIn });
  } catch (error) {
    next(error);
  }
});

// ============================================
// MEDIA MANAGEMENT
// ============================================

/**
 * PATCH /api/media/:id
 * Update media asset metadata
 */
router.patch(
  '/:id',
  requireEditor,
  writeRateLimiter,
  validate(updateMediaSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const asset = await mediaService.updateMedia(req.params.id, userId, userRole, req.body);

      res.json(asset);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/media/:id
 * Delete a media asset
 */
router.delete('/:id', requireEditor, writeRateLimiter, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    await mediaService.deleteMedia(req.params.id, userId, userRole);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
