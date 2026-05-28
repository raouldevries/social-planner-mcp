/**
 * Social Planner - Article Routes
 *
 * CRUD operations and publishing for articles.
 * Articles can be linked to posts for content repurposing.
 */

import { Router } from 'express';
import { validate, validateQuery } from '../middleware/validate';
import { requireAuth, requireEditor } from '../middleware/auth';
import { writeRateLimiter } from '../middleware/rateLimiter';
import {
  createArticleSchema,
  updateArticleSchema,
  rescheduleArticleSchema,
  paginationSchema,
  articleFiltersSchema,
} from '@social-planner/shared';
import * as articleService from '../services/article.service';

const router = Router();

// All article routes require authentication
router.use(requireAuth);

// ============================================
// ARTICLE CRUD
// ============================================

/**
 * GET /api/articles
 * List articles with filtering and pagination
 */
router.get(
  '/',
  validateQuery(paginationSchema.merge(articleFiltersSchema)),
  async (req, res, next) => {
    try {
      const { page, perPage, ...filters } = req.query as any;
      const result = await articleService.getArticles(filters, page, perPage);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/articles/:id
 * Get article details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const article = await articleService.getArticleById(req.params.id);
    res.json(article);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/articles
 * Create a new article
 */
router.post(
  '/',
  writeRateLimiter,
  requireEditor,
  validate(createArticleSchema),
  async (req, res, next) => {
    try {
      const article = await articleService.createArticle(req.user!.id, req.body);
      res.status(201).json(article);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/articles/:id
 * Update an article
 */
router.patch(
  '/:id',
  writeRateLimiter,
  requireEditor,
  validate(updateArticleSchema),
  async (req, res, next) => {
    try {
      const article = await articleService.updateArticle(req.params.id, req.user!.id, req.body);
      res.json(article);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/articles/:id
 * Delete an article
 */
router.delete('/:id', writeRateLimiter, requireEditor, async (req, res, next) => {
  try {
    await articleService.deleteArticle(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUBLISHING
// ============================================

/**
 * POST /api/articles/:id/publish
 * Publish an article
 */
router.post('/:id/publish', writeRateLimiter, requireEditor, async (req, res, next) => {
  try {
    const article = await articleService.publishArticle(req.params.id, req.user!.id);
    res.json(article);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/articles/:id/unpublish
 * Unpublish an article (revert to draft)
 */
router.post('/:id/unpublish', writeRateLimiter, requireEditor, async (req, res, next) => {
  try {
    const article = await articleService.unpublishArticle(req.params.id, req.user!.id);
    res.json(article);
  } catch (error) {
    next(error);
  }
});

// ============================================
// SCHEDULING (Calendar)
// ============================================

/**
 * PATCH /api/articles/:id/reschedule
 * Update the planned date for calendar visibility
 */
router.patch(
  '/:id/reschedule',
  writeRateLimiter,
  requireEditor,
  validate(rescheduleArticleSchema),
  async (req, res, next) => {
    try {
      const article = await articleService.rescheduleArticle(req.params.id, req.body.plannedAt);
      res.json(article);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// LINKED POSTS
// ============================================

/**
 * GET /api/articles/:id/posts
 * Get posts linked to this article
 */
router.get('/:id/posts', validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const { page, perPage } = req.query as any;
    const result = await articleService.getLinkedPosts(req.params.id, page, perPage);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
