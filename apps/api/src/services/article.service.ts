/**
 * Social Planner - Article Service
 *
 * Handles article CRUD operations and publishing.
 * Articles can be linked to posts for content repurposing.
 */

import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@social-planner/database';
import type {
  ArticleSummary,
  ArticleDetail,
  CreateArticleRequest,
  UpdateArticleRequest,
  PaginatedResponse,
  UserSummary,
} from '@social-planner/shared';

// ============================================
// HELPERS
// ============================================

const userSummarySelect = {
  id: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  timezone: true,
  role: true,
};

const articleSummarySelect = {
  id: true,
  title: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  plannedAt: true,
  author: {
    select: userSummarySelect,
  },
  featuredImage: {
    select: {
      id: true,
      storagePath: true,
      thumbnailPath: true,
    },
  },
};

const articleDetailSelect = {
  ...articleSummarySelect,
  content: true,
  featuredImageId: true,
  _count: {
    select: {
      posts: true,
    },
  },
};

function formatUserSummary(user: any): UserSummary {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    role: user.role,
  };
}

function formatArticleSummary(article: any): ArticleSummary {
  return {
    id: article.id,
    title: article.title,
    status: article.status,
    author: formatUserSummary(article.author),
    featuredImageUrl: article.featuredImage?.storagePath ?? null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    publishedAt: article.publishedAt?.toISOString() ?? null,
    plannedAt: article.plannedAt?.toISOString() ?? null,
  };
}

function formatArticleDetail(article: any): ArticleDetail {
  return {
    ...formatArticleSummary(article),
    content: article.content,
    linkedPostCount: article._count.posts,
  };
}

// ============================================
// ARTICLE CRUD
// ============================================

export interface ArticleFilters {
  status?: 'DRAFT' | 'PUBLISHED';
  authorId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export async function getArticles(
  filters: ArticleFilters,
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResponse<ArticleSummary>> {
  const where: Prisma.ArticleWhereInput = {};

  // Status filter
  if (filters.status) {
    where.status = filters.status;
  }

  // Author filter
  if (filters.authorId) {
    where.authorId = filters.authorId;
  }

  // Date range filter (filters by plannedAt for calendar views)
  if (filters.fromDate || filters.toDate) {
    where.plannedAt = {};
    if (filters.fromDate) {
      where.plannedAt.gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      where.plannedAt.lte = new Date(filters.toDate);
    }
  }

  // Search filter
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { content: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      select: articleSummarySelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.article.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return {
    data: articles.map(formatArticleSummary),
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

export async function getArticleById(articleId: string): Promise<ArticleDetail> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: articleDetailSelect,
  });

  if (!article) {
    throw new AppError('ARTICLE_NOT_FOUND', 'Article not found', 404);
  }

  return formatArticleDetail(article);
}

export async function createArticle(
  authorId: string,
  data: CreateArticleRequest
): Promise<ArticleDetail> {
  // Validate featured image if provided
  if (data.featuredImageId) {
    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id: data.featuredImageId },
    });

    if (!mediaAsset) {
      throw new AppError('INVALID_MEDIA', 'Featured image not found', 400);
    }
  }

  const article = await prisma.article.create({
    data: {
      authorId,
      title: data.title,
      content: data.content ?? null,
      featuredImageId: data.featuredImageId ?? null,
      plannedAt: data.plannedAt ? new Date(data.plannedAt) : null,
    },
    select: articleDetailSelect,
  });

  return formatArticleDetail(article);
}

export async function updateArticle(
  articleId: string,
  _userId: string,
  data: UpdateArticleRequest
): Promise<ArticleDetail> {
  const existingArticle = await prisma.article.findUnique({
    where: { id: articleId },
    select: { status: true, authorId: true },
  });

  if (!existingArticle) {
    throw new AppError('ARTICLE_NOT_FOUND', 'Article not found', 404);
  }

  // Validate featured image if provided
  if (data.featuredImageId) {
    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id: data.featuredImageId },
    });

    if (!mediaAsset) {
      throw new AppError('INVALID_MEDIA', 'Featured image not found', 400);
    }
  }

  // Build update data
  const updateData: Prisma.ArticleUpdateInput = {};

  if (data.title !== undefined) {
    updateData.title = data.title;
  }
  if (data.content !== undefined) {
    updateData.content = data.content ?? null;
  }
  if (data.featuredImageId !== undefined) {
    updateData.featuredImage = data.featuredImageId
      ? { connect: { id: data.featuredImageId } }
      : { disconnect: true };
  }
  if (data.plannedAt !== undefined) {
    updateData.plannedAt = data.plannedAt ? new Date(data.plannedAt) : null;
  }

  const article = await prisma.article.update({
    where: { id: articleId },
    data: updateData,
    select: articleDetailSelect,
  });

  return formatArticleDetail(article);
}

export async function deleteArticle(articleId: string, _userId: string): Promise<void> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      status: true,
      authorId: true,
      _count: { select: { posts: true } },
    },
  });

  if (!article) {
    throw new AppError('ARTICLE_NOT_FOUND', 'Article not found', 404);
  }

  // Warn if article has linked posts (they will be unlinked, not deleted)
  if (article._count.posts > 0) {
    // Posts will have their articleId set to null due to onDelete: SetNull
  }

  await prisma.article.delete({ where: { id: articleId } });
}

// ============================================
// PUBLISHING
// ============================================

export async function publishArticle(articleId: string, _userId: string): Promise<ArticleDetail> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { status: true, title: true, content: true },
  });

  if (!article) {
    throw new AppError('ARTICLE_NOT_FOUND', 'Article not found', 404);
  }

  if (article.status === 'PUBLISHED') {
    throw new AppError('ALREADY_PUBLISHED', 'Article is already published', 400);
  }

  // Validate article has content
  if (!article.content || article.content.trim().length === 0) {
    throw new AppError('NO_CONTENT', 'Article must have content to be published', 400);
  }

  const updated = await prisma.article.update({
    where: { id: articleId },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
    select: articleDetailSelect,
  });

  return formatArticleDetail(updated);
}

export async function unpublishArticle(articleId: string, _userId: string): Promise<ArticleDetail> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { status: true },
  });

  if (!article) {
    throw new AppError('ARTICLE_NOT_FOUND', 'Article not found', 404);
  }

  if (article.status !== 'PUBLISHED') {
    throw new AppError('NOT_PUBLISHED', 'Article is not published', 400);
  }

  const updated = await prisma.article.update({
    where: { id: articleId },
    data: {
      status: 'DRAFT',
      publishedAt: null,
    },
    select: articleDetailSelect,
  });

  return formatArticleDetail(updated);
}

// ============================================
// LINKED POSTS
// ============================================

export async function getLinkedPosts(
  articleId: string,
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResponse<{ id: string; status: string; createdAt: string }>> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true },
  });

  if (!article) {
    throw new AppError('ARTICLE_NOT_FOUND', 'Article not found', 404);
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { articleId },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.post.count({ where: { articleId } }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return {
    data: posts.map((p) => ({
      id: p.id,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
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
// SCHEDULING (Calendar)
// ============================================

export async function rescheduleArticle(
  articleId: string,
  plannedAt: string | null
): Promise<ArticleSummary> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true },
  });

  if (!article) {
    throw new AppError('ARTICLE_NOT_FOUND', 'Article not found', 404);
  }

  const updated = await prisma.article.update({
    where: { id: articleId },
    data: {
      plannedAt: plannedAt ? new Date(plannedAt) : null,
    },
    select: articleSummarySelect,
  });

  return formatArticleSummary(updated);
}
