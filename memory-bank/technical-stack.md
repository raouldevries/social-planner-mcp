# Social Planner — Technical Stack Recommendation

**Version:** 1.0  
**Last Updated:** December 2024  
**Purpose:** Definitive technology selection guide for implementation teams

---

## Executive Summary

This document provides a thoroughly considered technology stack recommendation for Social Planner, a social media content planning and scheduling application. Each technology choice is evaluated against the specific requirements identified in the application design document, with particular attention to multi-tenant architecture, real-time collaboration, third-party API integrations, and long-term maintainability.

The recommended stack prioritizes developer productivity, type safety across the entire application, and proven scalability patterns for SaaS applications. Where multiple viable options exist, this document explains the trade-offs and provides clear rationale for the recommended choice.

---

## Frontend Architecture

### Core Framework: React 18 with TypeScript

React 18 represents the optimal choice for Social Planner's frontend for several interconnected reasons. The concurrent rendering capabilities introduced in React 18 directly benefit the calendar interface, where users may rapidly navigate between months while content cards stream in asynchronously. The automatic batching of state updates reduces unnecessary re-renders when multiple collaborators are editing simultaneously, and the Suspense boundaries provide elegant loading states for the analytics dashboard's data-heavy visualizations.

TypeScript integration is non-negotiable for an application of this complexity. The post editor alone involves interactions between rich text state, media attachments, channel configurations, and scheduling options—all of which benefit enormously from compile-time type checking. TypeScript's discriminated unions elegantly model the post status state machine, ensuring that status-specific fields (like `rejection_reason` for rejected posts) are only accessible in appropriate states.

```typescript
// Type-safe post status handling
type Post =
  | { status: 'draft'; content: string }
  | { status: 'pending_approval'; content: string; submitted_at: Date }
  | { status: 'rejected'; content: string; rejection_reason: string }
  | { status: 'scheduled'; content: string; scheduled_at: Date }
  | {
      status: 'published';
      content: string;
      published_at: Date;
      platform_ids: Record<string, string>;
    };

function getStatusMessage(post: Post): string {
  switch (post.status) {
    case 'rejected':
      return `Rejected: ${post.rejection_reason}`; // TypeScript knows rejection_reason exists
    case 'scheduled':
      return `Scheduled for ${post.scheduled_at.toLocaleDateString()}`;
    // ... other cases with type-safe access
  }
}
```

**Recommended versions:** React 18.2.x, TypeScript 5.3.x

### State Management: TanStack Query + Zustand

The state management strategy deliberately separates server state from client state, recognizing that these two categories have fundamentally different characteristics and optimal handling patterns.

TanStack Query (formerly React Query) manages all server-synchronized state including posts, articles, calendar data, analytics, and user information. Its built-in caching, background refetching, and optimistic updates are essential for the collaborative editing experience. When a user approves a post, the UI should reflect this immediately while the API call happens in the background—TanStack Query's mutation hooks with optimistic updates handle this pattern elegantly. The stale-while-revalidate caching strategy ensures that navigating back to previously viewed calendar months feels instantaneous while still fetching fresh data.

```typescript
// Optimistic update for post approval
const approvePost = useMutation({
  mutationFn: (postId: string) => api.posts.approve(postId),
  onMutate: async (postId) => {
    await queryClient.cancelQueries({ queryKey: ['posts', postId] });
    const previousPost = queryClient.getQueryData(['posts', postId]);
    queryClient.setQueryData(['posts', postId], (old: Post) => ({
      ...old,
      status: 'approved',
    }));
    return { previousPost };
  },
  onError: (err, postId, context) => {
    queryClient.setQueryData(['posts', postId], context?.previousPost);
  },
  onSettled: (data, error, postId) => {
    queryClient.invalidateQueries({ queryKey: ['posts', postId] });
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
  },
});
```

Zustand handles purely client-side state: sidebar collapse states, active filters, modal visibility, drag-and-drop operations, and UI preferences. Its minimal API surface and lack of boilerplate make it ideal for these ephemeral states that don't require persistence or synchronization. The middleware system allows selective persistence to localStorage for user preferences like calendar view mode and timezone display settings.

**Recommended versions:** TanStack Query 5.x, Zustand 4.x

### Styling: Tailwind CSS with Custom Design System

Tailwind CSS provides the utility-first foundation, but Social Planner requires a cohesive design system built on top of it. The status badge colors defined in the design document (Draft gray, Pending amber, Approved blue, etc.) should be codified as semantic color tokens that can be referenced consistently throughout the application.

```javascript
// tailwind.config.js - Design system extension
module.exports = {
  theme: {
    extend: {
      colors: {
        'status-draft': '#6B7280',
        'status-pending': '#F59E0B',
        'status-approved': '#3B82F6',
        'status-scheduled': '#8B5CF6',
        'status-published': '#10B981',
        'status-rejected': '#EF4444',
        'status-unpublished': '#F97316',
        'platform-instagram': '#E1306C',
        'platform-linkedin': '#0A66C2',
      },
      animation: {
        'card-drag': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
};
```

Headless UI and Radix UI primitives provide accessible, unstyled components for complex interactions like dropdowns, modals, and popovers. These libraries handle keyboard navigation, focus management, and ARIA attributes correctly—concerns that are easy to implement incorrectly when building from scratch.

**Recommended versions:** Tailwind CSS 3.4.x, Headless UI 1.7.x, Radix UI latest

### Calendar Component: FullCalendar

FullCalendar is the definitive choice for the calendar interface. While lighter alternatives exist, none match FullCalendar's feature completeness for the requirements specified: month and week views, drag-and-drop rescheduling, event overflow handling, and external calendar sync via iCal. The React wrapper provides proper lifecycle integration, and the premium plugins (while requiring a license for commercial use) offer timeline views that could support future roadmap features.

Custom renderers transform calendar events into the content cards specified in the design, displaying thumbnails, status badges, and collaborator avatars. The drag-and-drop API integrates with the scheduling mutation to update post scheduled times with proper timezone handling.

```typescript
// Custom event renderer for post cards
const renderPostCard = (eventInfo: EventContentArg) => {
  const post = eventInfo.event.extendedProps as Post;
  return (
    <div className="flex items-center gap-2 p-1 rounded bg-white shadow-sm">
      {post.thumbnail && (
        <img src={post.thumbnail} className="w-8 h-8 rounded object-cover" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{post.title}</p>
        <StatusBadge status={post.status} size="xs" />
      </div>
      <CollaboratorAvatars users={post.collaborators} max={2} size="xs" />
    </div>
  );
};
```

**Recommended version:** FullCalendar 6.x with React adapter

### Rich Text Editing: Tiptap

The post editor and article editor both require rich text capabilities, but with different feature sets. Tiptap's extension architecture allows sharing a common foundation while customizing each editor appropriately. The post editor needs character counting, emoji insertion, and platform-aware content validation, while the article editor requires headings, lists, images, and code blocks.

Tiptap is built on ProseMirror, providing a robust document model that supports collaborative editing extensions if real-time co-editing becomes a future requirement. The Y.js integration path is well-documented, making this a future-proof choice.

```typescript
// Post editor with character counting
const PostEditor = ({ maxLength, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, bulletList: false }),
      CharacterCount.configure({ limit: maxLength }),
      Emoji,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "What's on your mind?" }),
    ],
    onUpdate: ({ editor }) => {
      onChange({
        content: editor.getHTML(),
        characterCount: editor.storage.characterCount.characters(),
      });
    },
  });

  return (
    <div>
      <EditorContent editor={editor} />
      <CharacterCounter
        current={editor?.storage.characterCount.characters() ?? 0}
        max={maxLength}
      />
    </div>
  );
};
```

**Recommended version:** Tiptap 2.x

### Additional Frontend Libraries

**Date handling** uses date-fns for its modular architecture and excellent timezone support through date-fns-tz. The calendar and scheduling features require reliable timezone conversions, and date-fns provides immutable operations that integrate well with React's state model.

**Form management** uses React Hook Form with Zod for schema validation. The post creation form has complex conditional validation (different character limits per platform, required media for certain post types) that Zod schemas express cleanly.

**HTTP client** uses Axios with interceptors for authentication token management and error handling. The interceptor pattern centralizes token refresh logic and provides consistent error transformation.

---

## Backend Architecture

### Runtime: Node.js 20 LTS with Express.js

Node.js 20 LTS provides the stability required for production workloads while offering modern JavaScript features including native fetch, improved diagnostics, and performance enhancements. The event-driven architecture handles the concurrent nature of social media API calls efficiently—when publishing a post to multiple platforms, the requests can be parallelized without blocking.

Express.js remains the pragmatic choice for the API layer. While newer frameworks like Fastify offer marginal performance improvements, Express's ecosystem maturity, middleware availability, and developer familiarity reduce implementation risk. The middleware pattern cleanly separates concerns like authentication, rate limiting, request validation, and error handling.

```typescript
// Express application structure
const app = express();

// Global middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter);
app.use(requestLogger);

// Authentication middleware (applied selectively)
const requireAuth = passport.authenticate('jwt', { session: false });
const requireRole = (...roles: UserRole[]) => roleMiddleware(roles);

// Route registration
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', requireAuth, workspaceRoutes);
app.use('/api/share', shareRoutes); // Public share link access

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);
```

**Recommended versions:** Node.js 20.x LTS, Express.js 4.18.x, TypeScript 5.3.x

### ORM: Prisma

Prisma provides type-safe database access that propagates TypeScript types from the schema definition through to query results. This eliminates an entire class of runtime errors where code assumes a field exists that the database doesn't actually provide. The Prisma Client's fluent API handles complex queries including the nested includes required for loading posts with their channels, media, and collaborators.

```prisma
// schema.prisma - Core models
model Post {
  id                    String        @id @default(uuid())
  workspaceId           String        @map("workspace_id")
  authorId              String        @map("author_id")
  status                PostStatus    @default(DRAFT)
  baseContent           String?       @map("base_content")
  createdAt             DateTime      @default(now()) @map("created_at")
  updatedAt             DateTime      @updatedAt @map("updated_at")
  scheduledAt           DateTime?     @map("scheduled_at")
  publishedAt           DateTime?     @map("published_at")
  rejectionReason       String?       @map("rejection_reason")
  isAmbassadorAvailable Boolean       @default(false) @map("is_ambassador_available")
  articleId             String?       @map("article_id")

  workspace     Workspace           @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  author        User                @relation(fields: [authorId], references: [id])
  article       Article?            @relation(fields: [articleId], references: [id], onDelete: SetNull)
  channels      PostChannel[]
  media         PostMedia[]
  collaborators CollaboratorAssignment[]
  comments      Comment[]
  activityLogs  ActivityLog[]
  shareLinks    ShareLink[]
  ambassadorShares AmbassadorShare[]

  @@index([workspaceId, status])
  @@index([scheduledAt])
  @@index([authorId])
  @@map("posts")
}

enum PostStatus {
  DRAFT              @map("draft")
  PENDING_APPROVAL   @map("pending_approval")
  APPROVED           @map("approved")
  SCHEDULED          @map("scheduled")
  PUBLISHED          @map("published")
  REJECTED           @map("rejected")
  UNPUBLISHED        @map("unpublished")
}
```

Prisma Migrate handles schema evolution with a clear migration history. The migration files are plain SQL, allowing DBAs to review changes before production deployment. The introspection capability also supports brownfield scenarios if the database schema needs to diverge from Prisma's management.

**Recommended version:** Prisma 5.x

### Authentication: Passport.js with JWT + Google/Microsoft OAuth

Passport.js orchestrates multiple authentication strategies: local username/password, Google OAuth 2.0, Microsoft OAuth 2.0, and OAuth flows for Instagram/LinkedIn social account connections. The strategy pattern isolates platform-specific OAuth handling while presenting a consistent interface to the rest of the application.

JWT tokens provide stateless authentication for API requests, with short-lived access tokens (15 minutes) and longer-lived refresh tokens (7 days) stored server-side for revocation capability. The refresh token rotation pattern ensures that compromised tokens have limited utility.

```typescript
// JWT strategy configuration
passport.use(
  'jwt',
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwt.accessSecret,
      issuer: 'social-planner-mcp',
      audience: 'planner-api',
    },
    async (payload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          include: {
            memberships: {
              where: { isActive: true },
              include: { workspace: true },
            },
          },
        });

        if (!user) return done(null, false);
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Google OAuth strategy
passport.use(
  'google',
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: `${config.apiUrl}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'), false);

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          // Create new user from Google profile
          user = await prisma.user.create({
            data: {
              email,
              fullName: profile.displayName || email.split('@')[0],
              avatarUrl: profile.photos?.[0]?.value,
              emailVerifiedAt: new Date(), // Google emails are verified
              passwordHash: '', // No password for OAuth users
              authProvider: 'google',
              authProviderId: profile.id,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Microsoft OAuth strategy
passport.use(
  'microsoft',
  new MicrosoftStrategy(
    {
      clientID: config.microsoft.clientId,
      clientSecret: config.microsoft.clientSecret,
      callbackURL: `${config.apiUrl}/api/auth/microsoft/callback`,
      scope: ['openid', 'email', 'profile'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Microsoft'), false);

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              fullName: profile.displayName || email.split('@')[0],
              avatarUrl: profile.photos?.[0]?.value,
              emailVerifiedAt: new Date(),
              passwordHash: '',
              authProvider: 'microsoft',
              authProviderId: profile.id,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);
```

**Recommended versions:** Passport.js 0.7.x, passport-jwt 4.x, passport-google-oauth20 2.x, passport-microsoft 1.x, jsonwebtoken 9.x

### Background Jobs: BullMQ

BullMQ (the successor to Bull) provides the robust job queue infrastructure required for scheduled publishing, analytics synchronization, and notification delivery. Its Redis-backed architecture ensures job persistence across server restarts, and the built-in retry mechanisms handle transient failures in third-party API calls.

The publisher worker exemplifies the job pattern: it runs on a schedule, queries for due posts, processes each through the platform APIs, and handles both success and failure outcomes with appropriate status updates.

```typescript
// Publisher worker implementation
const publisherQueue = new Queue('publisher', { connection: redis });

// Scheduled job to check for due posts
const publisherWorker = new Worker(
  'publisher',
  async (job) => {
    const { postId, channelId } = job.data;

    const channel = await prisma.postChannel.findUnique({
      where: { id: channelId },
      include: {
        post: true,
        socialAccount: true,
      },
    });

    if (!channel || channel.status !== 'pending') {
      return { skipped: true, reason: 'Channel not pending' };
    }

    try {
      const platformPostId = await publishToplatform(channel);

      await prisma.postChannel.update({
        where: { id: channelId },
        data: {
          status: 'published',
          platformPostId,
          publishedAt: new Date(),
        },
      });

      // Check if all channels are published
      await checkAndUpdatePostStatus(channel.postId);

      return { success: true, platformPostId };
    } catch (error) {
      await prisma.postChannel.update({
        where: { id: channelId },
        data: {
          status: 'failed',
          publishError: error.message,
        },
      });

      throw error; // Triggers retry
    }
  },
  {
    connection: redis,
    limiter: { max: 10, duration: 1000 }, // Rate limiting
  }
);

// Scheduler that enqueues due posts
const scheduler = new QueueScheduler('publisher', { connection: redis });
```

BullMQ's Dashboard (Bull Board) provides visibility into queue health, failed jobs, and processing metrics—essential for operations monitoring.

**Recommended version:** BullMQ 5.x

### Real-Time: Socket.io

The collaboration features require real-time updates: when one user adds a comment, other viewers of the same post should see it immediately. Socket.io provides the WebSocket abstraction with automatic fallback to long-polling, room-based message routing, and reconnection handling.

The room model maps naturally to Social Planner's structure: users join workspace rooms and optionally post-specific rooms when viewing details. Events broadcast to rooms ensure that only relevant users receive updates.

```typescript
// Socket.io server setup with authentication
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    socket.data.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  // Join workspace rooms based on user memberships
  socket.data.user.memberships.forEach((membership) => {
    socket.join(`workspace:${membership.workspaceId}`);
  });

  socket.on('join-post', (postId) => {
    socket.join(`post:${postId}`);
  });

  socket.on('leave-post', (postId) => {
    socket.leave(`post:${postId}`);
  });
});

// Broadcasting from API handlers
export const broadcastPostUpdate = (workspaceId: string, post: Post) => {
  io.to(`workspace:${workspaceId}`).emit('post:updated', {
    id: post.id,
    status: post.status,
    updatedAt: post.updatedAt,
  });
};
```

**Recommended version:** Socket.io 4.x

### API Documentation: OpenAPI with Scalar

The API documentation uses OpenAPI 3.1 specification generated from TypeScript types and Express route definitions. Scalar provides a modern, interactive documentation UI that surpasses Swagger UI in usability and aesthetics.

The tsoa library generates OpenAPI specs from TypeScript controllers with JSDoc annotations, ensuring that documentation stays synchronized with implementation.

```typescript
// Controller with OpenAPI documentation
@Route('posts')
@Tags('Posts')
export class PostsController extends Controller {
  /**
   * Retrieves a paginated list of posts for the workspace
   * @param workspaceId The workspace identifier
   * @param status Filter by post status (comma-separated)
   * @param page Page number for pagination
   * @param perPage Items per page (max 100)
   */
  @Get('{workspaceId}')
  @Security('jwt')
  @Response<UnauthorizedError>(401, 'Unauthorized')
  @Response<ForbiddenError>(403, 'Forbidden')
  public async getPosts(
    @Path() workspaceId: string,
    @Query() status?: string,
    @Query() page: number = 1,
    @Query() perPage: number = 20
  ): Promise<PaginatedResponse<PostSummary>> {
    // Implementation
  }
}
```

**Recommended versions:** tsoa 6.x, Scalar latest

---

## Database Layer

### Primary Database: PostgreSQL 15

PostgreSQL is the unambiguous choice for Social Planner's relational data. The multi-tenant workspace model, complex relationships between posts and their channels/media/collaborators, and the need for transactional consistency all demand a robust relational database.

PostgreSQL 15 brings specific advantages: the MERGE command simplifies upsert operations for analytics synchronization, JSON path queries enable efficient filtering on the settings JSONB columns, and improved sort performance benefits the calendar date-range queries.

The schema design leverages PostgreSQL's strengths including UUID primary keys generated by the database, ENUM types for status fields ensuring data integrity, JSONB columns for flexible metadata storage, full-text search via tsvector indexes, and row-level security policies for multi-tenant isolation.

```sql
-- Row-level security for multi-tenant isolation
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY posts_workspace_isolation ON posts
  USING (workspace_id IN (
    SELECT workspace_id FROM memberships
    WHERE user_id = current_setting('app.current_user_id')::uuid
    AND is_active = true
  ));

-- Function to set current user context
CREATE OR REPLACE FUNCTION set_current_user(user_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, false);
END;
$$ LANGUAGE plpgsql;
```

**Recommended version:** PostgreSQL 15.x

### Connection Pooling: PgBouncer

PgBouncer sits between the application servers and PostgreSQL, managing connection pooling to handle the connection overhead that would otherwise limit scalability. Transaction-mode pooling allows hundreds of concurrent application connections to share a smaller pool of actual database connections.

**Recommended version:** PgBouncer 1.21.x

### Caching and Queuing: Redis 7

Redis serves dual purposes: caching frequently accessed data and backing the BullMQ job queues. The caching layer stores session data and refresh tokens, API response caches for expensive queries (analytics aggregations), rate limiting counters, and real-time presence information for Socket.io.

Redis 7's function capabilities allow implementing complex caching patterns atomically, and the improved memory efficiency benefits cost optimization at scale.

```typescript
// Redis caching pattern for analytics
const ANALYTICS_CACHE_TTL = 3600; // 1 hour

export async function getPostAnalytics(postId: string): Promise<Analytics> {
  const cacheKey = `analytics:post:${postId}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const analytics = await prisma.postAnalytics.findUnique({
    where: { postId },
  });

  if (analytics) {
    await redis.setex(cacheKey, ANALYTICS_CACHE_TTL, JSON.stringify(analytics));
  }

  return analytics;
}

// Cache invalidation on analytics update
export async function invalidateAnalyticsCache(postId: string): Promise<void> {
  await redis.del(`analytics:post:${postId}`);
  // Also invalidate workspace aggregate cache
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { workspaceId: true },
  });
  if (post) {
    await redis.del(`analytics:workspace:${post.workspaceId}:*`);
  }
}
```

**Recommended version:** Redis 7.x

---

## File Storage and CDN

### Object Storage: AWS S3

AWS S3 provides the scalable, durable storage required for the media library. The design handles images and videos up to 500MB, potentially generating terabytes of storage for active workspaces. S3's eleven 9s of durability and integration with the broader AWS ecosystem make it the standard choice.

The upload flow uses pre-signed URLs to allow direct client-to-S3 uploads, avoiding the API server as a bottleneck. The API generates a pre-signed URL, the client uploads directly to S3, and a webhook or polling mechanism confirms completion and triggers thumbnail generation.

```typescript
// Pre-signed URL generation for direct upload
export async function createUploadUrl(
  workspaceId: string,
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; key: string }> {
  const key = `workspaces/${workspaceId}/media/${uuidv4()}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    ContentType: contentType,
    Metadata: {
      'workspace-id': workspaceId,
      'original-name': fileName,
    },
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return { uploadUrl, key };
}
```

S3 lifecycle policies automatically manage storage costs by transitioning infrequently accessed media to S3 Intelligent-Tiering and permanently deleting objects from soft-deleted workspaces after a retention period.

### CDN: CloudFront

CloudFront distributes media assets globally with edge caching, ensuring that users experience fast load times regardless of geographic location. The Origin Access Control (OAC) configuration restricts direct S3 access, requiring all requests to flow through CloudFront where caching, compression, and access logging occur.

Signed URLs for private media (draft posts, unpublished content) ensure that only authorized users can access assets, with URL expiration providing time-limited access.

### Image Processing: Sharp

The Sharp library handles thumbnail generation and image optimization on upload. Processing occurs asynchronously via a BullMQ job triggered by upload completion. The generated thumbnails are stored alongside originals in S3 with predictable naming conventions.

```typescript
// Thumbnail generation worker
const thumbnailWorker = new Worker(
  'thumbnails',
  async (job) => {
    const { key, bucket } = job.data;

    // Download original
    const original = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const buffer = await streamToBuffer(original.Body);

    // Generate thumbnails
    const thumbnails = await Promise.all([
      sharp(buffer).resize(150, 150, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer(),
      sharp(buffer).resize(300, 300, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer(),
    ]);

    // Upload thumbnails
    const basePath = key.replace(/\.[^.]+$/, '');
    await Promise.all([
      s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${basePath}_thumb_150.jpg`,
          Body: thumbnails[0],
          ContentType: 'image/jpeg',
        })
      ),
      s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${basePath}_thumb_300.jpg`,
          Body: thumbnails[1],
          ContentType: 'image/jpeg',
        })
      ),
    ]);

    return { thumbnails: [`${basePath}_thumb_150.jpg`, `${basePath}_thumb_300.jpg`] };
  },
  { connection: redis }
);
```

**Recommended version:** Sharp 0.33.x

---

## Third-Party API Integration

### Development Mode: Mock APIs

During initial development, mock API services simulate Instagram and LinkedIn responses. This allows full development of the publishing workflow without requiring live API credentials or risking rate limits during testing.

The mock service layer provides:

- Simulated OAuth flows that return test tokens
- Fake publishing endpoints that return valid response structures
- Mock analytics data generation for testing dashboard visualizations
- Configurable delays and error scenarios for testing error handling

```typescript
// services/social/mock/instagram.mock.ts
export class MockInstagramPublisher implements InstagramPublisher {
  async createMediaContainer(
    accountId: string,
    imageUrl: string,
    caption: string
  ): Promise<string> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return `mock_container_${Date.now()}`;
  }

  async publishContainer(accountId: string, containerId: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return `mock_post_${Date.now()}`;
  }

  async getInsights(mediaId: string): Promise<InstagramInsights> {
    return {
      impressions: Math.floor(Math.random() * 10000),
      reach: Math.floor(Math.random() * 8000),
      engagement: Math.floor(Math.random() * 500),
      likes: Math.floor(Math.random() * 400),
      comments: Math.floor(Math.random() * 50),
      shares: Math.floor(Math.random() * 30),
      saves: Math.floor(Math.random() * 20),
    };
  }
}

// Toggle between mock and real implementation via environment variable
export const getInstagramPublisher = () => {
  if (process.env.USE_MOCK_SOCIAL_APIS === 'true') {
    return new MockInstagramPublisher();
  }
  return new RealInstagramPublisher();
};
```

### Instagram Graph API (Production)

Integration with Instagram requires a Facebook App configured for Instagram Graph API access. The application needs `instagram_basic`, `instagram_content_publish`, and `instagram_manage_insights` permissions, obtained through Facebook Login OAuth flow.

The recommended approach uses the official Facebook SDK for authentication flows and direct HTTP calls for API operations. Axios interceptors handle token refresh when approaching expiration.

```typescript
// Instagram publishing service
export class InstagramPublisher {
  private async createMediaContainer(
    accountId: string,
    accessToken: string,
    mediaUrl: string,
    caption: string
  ): Promise<string> {
    const response = await axios.post(`${GRAPH_API_BASE}/${accountId}/media`, {
      image_url: mediaUrl,
      caption,
      access_token: accessToken,
    });
    return response.data.id;
  }

  private async publishContainer(
    accountId: string,
    accessToken: string,
    containerId: string
  ): Promise<string> {
    const response = await axios.post(`${GRAPH_API_BASE}/${accountId}/media_publish`, {
      creation_id: containerId,
      access_token: accessToken,
    });
    return response.data.id;
  }

  async publish(channel: PostChannel): Promise<string> {
    const { socialAccount, post } = channel;
    const content = channel.customContent || post.baseContent;
    const mediaUrls = await this.getPublicMediaUrls(post.media);

    if (mediaUrls.length === 0) {
      throw new Error('Instagram posts require at least one image');
    }

    if (mediaUrls.length === 1) {
      const containerId = await this.createMediaContainer(
        socialAccount.platformAccountId,
        socialAccount.accessToken,
        mediaUrls[0],
        content
      );
      return this.publishContainer(
        socialAccount.platformAccountId,
        socialAccount.accessToken,
        containerId
      );
    }

    // Carousel post handling for multiple images
    return this.publishCarousel(socialAccount, mediaUrls, content);
  }
}
```

### LinkedIn Marketing API

LinkedIn integration uses OAuth 2.0 with the `r_organization_social` and `w_organization_social` scopes for page management. The UGC Posts API handles content creation, with asset registration required for media uploads.

```typescript
// LinkedIn publishing service
export class LinkedInPublisher {
  private async registerAsset(
    accessToken: string,
    organizationUrn: string
  ): Promise<{ assetUrn: string; uploadUrl: string }> {
    const response = await axios.post(
      `${LINKEDIN_API_BASE}/assets?action=registerUpload`,
      {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: organizationUrn,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return {
      assetUrn: response.data.value.asset,
      uploadUrl:
        response.data.value.uploadMechanism[
          'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
        ].uploadUrl,
    };
  }

  async publish(channel: PostChannel): Promise<string> {
    const { socialAccount, post } = channel;
    const content = channel.customContent || post.baseContent;
    const organizationUrn = `urn:li:organization:${socialAccount.platformAccountId}`;

    const requestBody: any = {
      author: organizationUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: post.media.length > 0 ? 'IMAGE' : 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    };

    if (post.media.length > 0) {
      const mediaAssets = await this.uploadMedia(socialAccount, post.media);
      requestBody.specificContent['com.linkedin.ugc.ShareContent'].media = mediaAssets;
    }

    const response = await axios.post(`${LINKEDIN_API_BASE}/ugcPosts`, requestBody, {
      headers: { Authorization: `Bearer ${socialAccount.accessToken}` },
    });

    return response.headers['x-restli-id'];
  }
}
```

### Rate Limit Management

Both platforms impose rate limits that require careful management. A token bucket implementation tracks usage per account and delays requests when limits are approached.

```typescript
// Rate limiter for platform APIs
export class PlatformRateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();

  async acquire(platform: string, accountId: string): Promise<void> {
    const key = `${platform}:${accountId}`;
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = new TokenBucket({
        capacity: platform === 'instagram' ? 200 : 100,
        refillRate: platform === 'instagram' ? 200 / 3600 : 100 / 86400,
      });
      this.buckets.set(key, bucket);
    }

    if (!bucket.tryConsume()) {
      const waitTime = bucket.timeUntilAvailable();
      throw new RateLimitError(`Rate limit exceeded. Retry after ${waitTime}ms`, waitTime);
    }
  }
}
```

---

## Infrastructure and Deployment

### Containerization: Docker

Docker containers ensure consistent environments from development through production. The multi-stage build pattern creates minimal production images while supporting development tooling.

```dockerfile
# Multi-stage Dockerfile for API server
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/package.json ./

USER appuser
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
```

### Deployment: Single VPS with Docker Compose

For initial deployment, a single VPS running Docker Compose provides simplicity and cost-effectiveness. This approach is well-suited for early-stage applications before scaling requirements emerge. All services run on a single server with Traefik handling reverse proxy and SSL termination.

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    command:
      - '--providers.docker=true'
      - '--providers.docker.exposedbydefault=false'
      - '--entrypoints.web.address=:80'
      - '--entrypoints.websecure.address=:443'
      - '--certificatesresolvers.letsencrypt.acme.httpchallenge=true'
      - '--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web'
      - '--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}'
      - '--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json'
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - '/var/run/docker.sock:/var/run/docker.sock:ro'
      - 'letsencrypt:/letsencrypt'
    restart: unless-stopped

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      - DATABASE_URL=postgresql://planner:${DB_PASSWORD}@postgres:5432/planner
      - REDIS_URL=redis://redis:6379
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.api.rule=Host(`api.${DOMAIN}`)'
      - 'traefik.http.routers.api.entrypoints=websecure'
      - 'traefik.http.routers.api.tls.certresolver=letsencrypt'
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.web.rule=Host(`${DOMAIN}`)'
      - 'traefik.http.routers.web.entrypoints=websecure'
      - 'traefik.http.routers.web.tls.certresolver=letsencrypt'
    restart: unless-stopped

  worker:
    build:
      context: .
      dockerfile: apps/worker/Dockerfile
    environment:
      - DATABASE_URL=postgresql://planner:${DB_PASSWORD}@postgres:5432/planner
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=planner
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=planner
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  minio:
    image: minio/minio
    environment:
      - MINIO_ROOT_USER=${MINIO_ROOT_USER}
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  minio_data:
  letsencrypt:
```

**Future scaling path:** When traffic demands it, migration to Kubernetes or managed container services (AWS ECS, Google Cloud Run) follows naturally from the Docker-based architecture.

### CI/CD: GitHub Actions

GitHub Actions automates the build, test, and deployment pipeline. The workflow runs tests on pull requests, builds container images on merge to main, and deploys to staging automatically with production deployment requiring manual approval.

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:ci
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  build:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}/api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG_STAGING }}
      - run: kubectl set image deployment/planner-api api=ghcr.io/${{ github.repository }}/api:${{ github.sha }}
```

### Infrastructure as Code: Terraform

Terraform manages the cloud infrastructure including VPC networking, RDS PostgreSQL instances, ElastiCache Redis clusters, S3 buckets and CloudFront distributions, EKS Kubernetes cluster, and IAM roles and policies.

```hcl
# terraform/modules/database/main.tf
resource "aws_db_instance" "main" {
  identifier     = "${var.environment}-planner-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_storage_gb
  max_allocated_storage = var.db_max_storage_gb
  storage_encrypted     = true
  storage_type          = "gp3"

  db_name  = "planner"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  multi_az               = var.environment == "production"
  deletion_protection    = var.environment == "production"
  skip_final_snapshot    = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.environment}-planner-final" : null

  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn

  tags = {
    Environment = var.environment
    Application = "social-planner-mcp"
  }
}
```

---

## Monitoring and Observability

### Application Monitoring: Datadog or Grafana Cloud

Comprehensive observability requires APM tracing to track request flows across services, custom metrics for business KPIs (posts scheduled, posts published, API errors by platform), log aggregation with structured logging for searchability, and alerting with escalation policies.

Both Datadog and Grafana Cloud provide these capabilities. Datadog offers a more integrated experience with less configuration, while Grafana Cloud provides more flexibility and potentially lower costs. The choice depends on organizational preferences and existing tooling.

### Structured Logging: Pino

Pino provides high-performance structured logging that integrates with log aggregation systems. The structured format enables queries like "show all errors for workspace X" or "trace request Y through all services."

```typescript
// Pino logger configuration
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'planner-api',
    version: process.env.APP_VERSION,
  },
  redact: ['req.headers.authorization', 'password', 'accessToken'],
});

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || uuidv4();

  req.log = logger.child({ requestId, path: req.path, method: req.method });

  res.on('finish', () => {
    req.log.info(
      {
        statusCode: res.statusCode,
        duration: Date.now() - start,
        userId: req.user?.id,
        workspaceId: req.params.workspaceId,
      },
      'Request completed'
    );
  });

  next();
};
```

### Error Tracking: Sentry

Sentry captures exceptions with full context including stack traces, request data, and user information. The source map integration provides readable stack traces even from minified production JavaScript.

```typescript
// Sentry initialization
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new Sentry.Integrations.Prisma({ client: prisma }),
  ],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  beforeSend(event) {
    // Scrub sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
    }
    return event;
  },
});
```

---

## Security Considerations

### Secrets Management: AWS Secrets Manager or HashiCorp Vault

Sensitive configuration including database credentials, API keys, and encryption keys must not exist in code or environment files. AWS Secrets Manager integrates natively with EKS through the Secrets Store CSI Driver, mounting secrets as files or environment variables without application changes.

### Encryption

Data at rest encryption covers RDS instances using AWS-managed keys, S3 buckets with server-side encryption, and Redis with encryption at rest enabled. Data in transit encryption requires TLS 1.3 for all external connections, internal service communication over mTLS in production, and encrypted connections to databases and caches.

### Security Headers

Helmet.js configures security headers including Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, and Referrer-Policy.

---

## Development Environment

### Local Development: Docker Compose

Docker Compose provides a consistent local environment matching production services.

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - '3000:3000'
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/planner
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    ports:
      - '5432:5432'
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=planner
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  mailhog:
    image: mailhog/mailhog
    ports:
      - '1025:1025'
      - '8025:8025'

volumes:
  postgres_data:
  redis_data:
```

### Code Quality: ESLint, Prettier, Husky

Consistent code style reduces cognitive load during code review and prevents style-related merge conflicts. ESLint with TypeScript rules catches potential errors, Prettier formats code automatically, and Husky runs checks on pre-commit to prevent problematic code from entering the repository.

---

## AI-Assisted Development Tooling

### Model Context Protocol (MCP) Integration

Claude Code with MCP servers significantly accelerates Social Planner development by providing AI with direct access to databases, documentation, design files, and version control systems. Rather than copying context manually, developers can work within Claude Code while it reads files, runs database commands, generates code from Figma designs, and manages GitHub operations directly.

The following MCP servers are recommended for Social Planner development, listed in priority order based on the application's technical requirements.

### Prisma MCP Server

**Purpose:** Database schema management, migrations, and development database operations.

Given Social Planner's complex data model with 20+ entities (posts, channels, articles, media, comments, ambassador system), the Prisma MCP server enables Claude to directly manage database operations. This eliminates context-switching when modifying schemas and ensures migration commands execute correctly.

**Installation:**

```bash
claude mcp add prisma -- npx -y prisma mcp
```

**Available Tools:**

- `migrate-status`: Check pending migrations against current database state
- `migrate-dev`: Create and execute new migrations with auto-generated names
- `migrate-reset`: Reset development database (includes safety confirmation)
- `Prisma-Studio`: Launch visual database browser for data inspection

**Rationale:** The Prisma MCP includes built-in safety checks that prevent destructive commands (like `migrate reset`) from executing without explicit user confirmation. This is critical when Claude is operating autonomously on database operations.

**Example Usage:**

```
"Check if the posts table has the rejection_reason column migrated"
"Create a migration adding the notification_preferences JSONB column to users"
"Open Prisma Studio to verify the test data was seeded correctly"
```

### Context7 MCP Server

**Purpose:** Real-time, version-specific documentation for frontend libraries.

Social Planner's frontend relies on several rapidly-evolving libraries: React 18, TanStack Query 5, FullCalendar 6, Tiptap 2, and Tailwind CSS. Context7 fetches current documentation directly from official sources and injects it into Claude's context, eliminating outdated API suggestions that lead to debugging time.

**Installation:**

```bash
# Basic installation (suitable for individual development)
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest

# With API key for higher rate limits (recommended for team use)
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest --api-key YOUR_API_KEY
```

API keys are available free at https://context7.com/dashboard.

**Available Tools:**

- `resolve-library-id`: Find Context7-compatible identifiers for libraries
- `get-library-docs`: Fetch documentation for specific libraries and topics

**Rationale:** The FullCalendar API changed significantly between versions 5 and 6, and TanStack Query 5 introduced breaking changes from version 4. Context7 ensures generated code matches the exact versions specified in Social Planner's package.json.

**Example Usage:**

```
"Create a FullCalendar month view with eventClick and dateClick handlers. use context7"
"Implement infinite scroll for the post list using TanStack Query. use context7"
"Set up Tiptap with StarterKit, CharacterCount, and custom emoji extension. use context7"
```

**Recommended Configuration:** Add this rule to Claude Code settings for automatic invocation:

```
Always use context7 when generating code that involves React, TanStack Query,
FullCalendar, Tiptap, Tailwind, or any npm library documentation.
```

### Figma MCP Server

**Purpose:** Design-to-code translation for UI components.

Social Planner's UI includes complex components—the calendar views, post editor, media library grid, and analytics dashboard—that benefit from accurate design translation. The Figma MCP provides Claude with structured access to Figma files, enabling generation of React components with correct spacing, colors, typography, and layout.

**Installation (requires Figma Desktop app):**

1. Update Figma Desktop to the latest version
2. Enable MCP Server: Settings → Dev Mode → Enable MCP Server
3. Server starts automatically at `http://127.0.0.1:3845/sse`

```bash
claude mcp add figma -- npx -y @anthropic/figma-dev-mode-mcp-server
```

**Alternative Installation (Framelink, no Figma Desktop required):**

```bash
# Obtain Figma API token at: https://www.figma.com/developers/api#access-tokens
claude mcp add figma -e FIGMA_ACCESS_TOKEN=your_token -- npx -y @anthropic/framelink-figma-mcp
```

**Available Tools:**

- `get_code`: Generate React/Tailwind code from selected Figma frames
- `get_variable_defs`: Extract design tokens (colors, spacing, typography) as CSS variables
- `get_code_connect_map`: Map Figma components to existing codebase components

**Rationale:** The official Figma MCP server uses accessibility trees rather than screenshots, providing semantic understanding of design structure. This results in more accurate layout translation, proper semantic HTML, and consistent application of the design system tokens defined in `tailwind.config.js`.

**Example Usage:**

```
"Convert the selected post card component to React with Tailwind, matching our status color tokens"
"Extract all spacing values from the calendar grid design as Tailwind spacing scale"
"Generate the media library thumbnail grid from the Figma frame"
```

### GitHub MCP Server

**Purpose:** Repository operations, issue tracking, and pull request management.

The GitHub MCP eliminates context-switching between terminal and browser for version control operations. Developers can create branches, commit changes, open pull requests, and manage issues entirely within Claude Code.

**Installation:**

1. Create Personal Access Token at https://github.com/settings/tokens
2. Select scopes: `repo`, `read:org`, `read:user`

```bash
claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token -- npx -y @modelcontextprotocol/server-github
```

**Available Tools:**

- Repository: search, clone, list branches, get file contents
- Issues: create, update, search, add comments, manage labels
- Pull Requests: create, review, merge, list checks
- Actions: list workflow runs, check status, download logs

**Rationale:** For a team project like Social Planner with multiple contributors, the ability to create well-documented PRs, link commits to issues, and monitor CI status without leaving the development context improves velocity and reduces friction.

**Example Usage:**

```
"Create a feature branch for the ambassador sharing system"
"Open a PR from feature/calendar-drag-drop with a summary of the changes made"
"Find all open issues labeled 'frontend' and 'high-priority'"
"Check if the CI workflow passed on the latest commit to main"
```

### MCP Configuration Reference

**Quick Setup Script:**

```bash
#!/bin/bash
# setup-mcp.sh - Configure all MCP servers for Social Planner

cd /path/to/social-planner-mcp

# Prisma (database operations)
claude mcp add prisma -- npx -y prisma mcp

# Context7 (library documentation)
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest

# Figma (design-to-code) - requires Figma Desktop running
claude mcp add figma -- npx -y @anthropic/figma-dev-mode-mcp-server

# GitHub (version control) - replace with your token
claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=$GITHUB_TOKEN -- npx -y @modelcontextprotocol/server-github

# Verify installation
claude mcp list
```

**Manual Configuration File:**

For team environments or complex configurations, edit `~/.claude.json` or project `.mcp.json` directly:

```json
{
  "mcpServers": {
    "prisma": {
      "command": "npx",
      "args": ["-y", "prisma", "mcp"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "env": {
        "DEFAULT_MINIMUM_TOKENS": "10000"
      }
    },
    "figma": {
      "command": "npx",
      "args": ["-y", "@anthropic/figma-dev-mode-mcp-server"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**Scope Options:**

| Scope                       | Storage Location            | Use Case                                                |
| --------------------------- | --------------------------- | ------------------------------------------------------- |
| `--scope project` (default) | `.mcp.json` in project root | Team collaboration, can be committed to version control |
| `--scope user`              | `~/.claude.json`            | Personal configuration, available across all projects   |

**Verification:**

```bash
# List configured servers
claude mcp list

# Inside Claude Code, check connection status
/mcp
```

All servers should display as `connected`. If a server fails to connect, remove and re-add it:

```bash
claude mcp remove prisma
claude mcp add prisma -- npx -y prisma mcp
```

### Integration with Development Workflow

The MCP servers integrate into Social Planner's development workflow at each stage:

**Schema Development:** When adding new entities (e.g., notification preferences, custom fields), use Prisma MCP to create migrations, verify they apply correctly, and inspect the resulting schema in Prisma Studio—all without leaving the code context.

**Component Implementation:** For UI components defined in Figma, use the Figma MCP to extract the design, then Context7 to ensure the generated React/Tailwind code uses current API patterns. The result is pixel-accurate components with correct library usage.

**Feature Completion:** When a feature is ready, use GitHub MCP to create a well-documented PR linking to relevant issues, then monitor CI status until merge.

**Combined Workflow Example:**

```
1. "Run prisma migrate status to check the current schema"
2. "Create a migration adding ambassador_shares table with foreign keys to posts and users"
3. "Generate the AmbassadorShareCard component from the selected Figma frame. use context7"
4. "Create a PR for the ambassador sharing feature, linking to issue #47"
```

This integrated approach reduces context-switching and ensures consistency between design specifications, database schema, and implementation code.

---

## Summary of Recommended Versions

| Category                 | Technology     | Version  |
| ------------------------ | -------------- | -------- |
| **Frontend**             | React          | 18.2.x   |
|                          | TypeScript     | 5.3.x    |
|                          | TanStack Query | 5.x      |
|                          | Zustand        | 4.x      |
|                          | Tailwind CSS   | 3.4.x    |
|                          | FullCalendar   | 6.x      |
|                          | Tiptap         | 2.x      |
| **Backend**              | Node.js        | 20.x LTS |
|                          | Express.js     | 4.18.x   |
|                          | Prisma         | 5.x      |
|                          | BullMQ         | 5.x      |
|                          | Socket.io      | 4.x      |
|                          | Passport.js    | 0.7.x    |
| **Database**             | PostgreSQL     | 15.x     |
|                          | Redis          | 7.x      |
| **Infrastructure**       | Docker         | 24.x     |
|                          | Docker Compose | 2.x      |
|                          | Traefik        | 3.x      |
| **AI Development Tools** | Prisma MCP     | latest   |
|                          | Context7 MCP   | latest   |
|                          | Figma MCP      | latest   |
|                          | GitHub MCP     | latest   |

---

_This technical stack recommendation provides a production-ready foundation for Social Planner. Individual technology choices should be re-evaluated against team expertise and organizational standards before final adoption._
