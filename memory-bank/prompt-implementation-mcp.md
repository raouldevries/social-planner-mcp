You are a senior backend engineer specializing in MCP (Model Context Protocol) server implementations, with expertise in Express/Prisma/TypeScript monorepo architectures.

<context>
<tech_stack>
- Monorepo structure: apps/api (Express/Prisma/PostgreSQL/Redis/BullMQ), apps/web (React/Vite/TanStack Query/Zustand/Tailwind)
- Auth: [Your current auth system - JWT/session/etc.]
- Existing API patterns: [Your route structure, e.g., /api/v1/posts]
</tech_stack>

<existing_plan>

1. Confirm contracts and scopes
   - 1.1 Define MCP tool schema (name, inputs, outputs, error shape)
   - 1.2 Map tools to existing API routes (create post, schedule post, list channels)
   - 1.3 Define OAuth flow for Claude Desktop connect and token scopes
   - 1.4 Define audit log fields (user, org, action, payload, result, timestamps)

2. MCP server service
   - 2.1 Create a new MCP server service/package (e.g., apps/mcp)
   - 2.2 Implement MCP tool registry: create_post, schedule_post, list_channels, list_posts
   - 2.3 Implement tool handlers: validate input, call API endpoints, return structured results
   - 2.4 Add rate limiting + request logging

3. Auth bridge + audit logging
   - 3.1 Add OAuth connect flow in web UI: "Connect Claude" → OAuth grant → store tokens
   - 3.2 Implement token storage (short-lived access + refresh)
   - 3.3 Enforce scopes (create/schedule only)
   - 3.4 Add audit log model + write on every MCP action

4. API enhancements for MCP use
   - 4.1 Create endpoints: POST /api/posts, POST /api/posts/:id/schedule, GET /api/channels
   - 4.2 Add confirmation step in scheduling (draft + proposal, user confirms)
   - 4.3 Add validations (length, platform rules, time window)

5. Docs + tests
   - 5.1 Document setup and OAuth flow
   - 5.2 Add MCP tool smoke tests
   - 5.3 Add security tests for scope enforcement
     </existing_plan>

<claude_md_file>
Located at: /CLAUDE.md (project root)
</claude_md_file>

<repository_structure>
apps/api/src/
├── app.ts # Express app setup
├── server.ts # Server entry point
├── config/
│ └── index.ts # Environment configuration
├── lib/
│ ├── prisma.ts # Prisma client
│ ├── redis.ts # Redis client
│ ├── s3.ts # S3/MinIO client
│ └── logger.ts # Winston logger
├── middleware/
│ ├── auth.ts # Passport JWT authentication
│ ├── validate.ts # Zod validation middleware
│ ├── rateLimiter.ts # Rate limiting
│ ├── errorHandler.ts # Error handling
│ └── index.ts
├── routes/
│ ├── auth.ts # Authentication routes
│ ├── posts.ts # Post CRUD
│ ├── channels.ts # Channel management
│ ├── social-accounts.ts # OAuth social connections
│ ├── media.ts # Media upload
│ ├── analytics.ts # Analytics endpoints
│ ├── analytics-sync.ts # Real-time analytics sync
│ ├── scheduler.ts # Publishing scheduler
│ ├── comments.ts # Post comments
│ ├── notifications.ts # User notifications
│ ├── users.ts # User management
│ ├── dashboard.ts # Dashboard stats
│ ├── ambassador.ts # Ambassador system
│ ├── sharelinks.ts # Share link management
│ ├── articles.ts # Article management
│ ├── calendar-events.ts # Calendar events
│ ├── activity.ts # Activity logging
│ ├── versions.ts # Post versioning
│ ├── health.ts # Health check
│ └── index.ts
├── services/
│ ├── auth.service.ts # Authentication logic
│ ├── post.service.ts # Post business logic
│ ├── channel.service.ts # Channel logic
│ ├── publisher.service.ts # Social publishing (Instagram/LinkedIn)
│ ├── scheduler.service.ts # BullMQ job scheduling
│ ├── analytics.service.ts # Analytics aggregation
│ ├── analytics-sync.service.ts # Platform analytics sync
│ ├── notification.service.ts # Notification dispatch
│ ├── email.service.ts # Email sending (Resend)
│ ├── media.service.ts # Media processing
│ ├── user.service.ts # User management
│ ├── comment.service.ts # Comment handling
│ ├── ambassador.service.ts # Ambassador features
│ ├── sharelink.service.ts # Share links
│ ├── article.service.ts # Articles
│ ├── calendar-event.service.ts # Calendar events
│ ├── activity.service.ts # Activity logging
│ ├── version.service.ts # Version control
│ ├── social-account.service.ts # Social account management
│ ├── dashboard.service.ts # Dashboard metrics
│ ├── adapters/
│ │ ├── instagram-analytics.adapter.ts # Instagram Graph API
│ │ ├── linkedin-analytics.adapter.ts # LinkedIn API
│ │ └── index.ts # Adapter registry
│ └── index.ts
├── test/
│ └── setup.ts # Test configuration
└── utils/

apps/web/src/
├── App.tsx # Main app with routing
├── main.tsx # Entry point
├── components/
│ ├── ui/ # Reusable UI components
│ │ ├── Button.tsx
│ │ ├── Modal.tsx
│ │ ├── Input.tsx
│ │ ├── Select.tsx
│ │ ├── Card.tsx
│ │ ├── Toast.tsx
│ │ └── ...
│ ├── post/ # Post-related components
│ │ ├── PostCard.tsx
│ │ ├── SchedulingSection.tsx
│ │ ├── CommentThread.tsx
│ │ └── ...
│ ├── calendar/ # Calendar components
│ ├── analytics/ # Analytics charts
│ ├── settings/ # Settings panels
│ ├── media/ # Media library
│ ├── article/ # Article components
│ ├── share/ # Share components
│ └── social-accounts/ # Social account management
├── hooks/
│ └── use*.ts # TanStack Query hooks (one per resource)
├── pages/
│ └── *.tsx # Route-level page components
├── stores/
│ └── authStore.ts # Zustand auth store
├── lib/
│ └── api.ts # Axios API client
├── locales/
│ ├── en/ # English translations
│ └── nl/ # Dutch translations
├── data/ # Static data/constants
├── types/ # TypeScript type definitions
└── test/
└── setup.ts # Test configuration
</repository_structure>
</context>

<task>
Expand the existing plan into a detailed implementation guide with file-level specificity for my Social Planner codebase.
</task>

<requirements>
**Output format**: Write the implementation plan in Markdown format and save it to the `memory-bank/` folder in this repository (e.g., `memory-bank/mcp-implementation-plan.md`).

For each step, provide:

1. **Files to create/modify**: Exact paths within the monorepo
2. **Code patterns**: Match existing conventions in my codebase
3. **Prisma schema changes**: New models with field definitions
4. **Dependencies**: Packages to install with versions
5. **Environment variables**: New config required
6. **Migration concerns**: Impact on existing functionality

Focus especially on:

- MCP SDK integration (@modelcontextprotocol/sdk or equivalent)
- How MCP server authenticates requests from Claude Desktop
- Token storage strategy (separate table vs. extending existing User/Org model)
- How the confirmation flow works (MCP returns pending state → web UI shows confirmation → user approves → schedule executes)
  </requirements>

<output_format>

## Architecture Decision: [MCP Server Approach]

[2-3 sentences: standalone service vs. integrated into apps/api, with rationale]

## Phase 1: [Phase Name]

**Estimated effort**: [X hours/days]

### Step 1.1: [Step Name]

**Files**:

- `apps/api/src/path/to/file.ts` — [what this file does]
- `apps/api/prisma/schema.prisma` — [schema additions]

**Implementation**:

```typescript
// Key code snippet or pattern
```

**Dependencies**:

```bash
pnpm add package@version -F @social-planner/api
```

**Notes**: [Gotchas, decisions, or alternatives considered]

---

[Continue for each substep...]

## Migration Checklist

- [ ] [Database migration command]
- [ ] [Environment variable to add]
- [ ] [Deployment consideration]

## Open Questions

[List anything that needs clarification from the existing codebase or product requirements]
</output_format>

Think through the implementation systematically. Where my existing codebase patterns are unclear from the provided context, note what you'd need to see (e.g., "Need to see existing auth middleware to determine integration approach").
