# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Social Planner is a social media content planning and scheduling application for Instagram and LinkedIn. It provides calendar-based content planning, multi-channel publishing, approval workflows, collaboration features, analytics, and an ambassador advocacy system.

## Documentation

All design specifications are in `memory-bank/`:

- `app-design-document.md` — Full feature specs, data model, API endpoints, UI specifications
- `technical-stack.md` — Technology choices with rationale
- `implementation-plan.md` — 28-step implementation guide with code examples

**Always consult these files before implementing features.**

## Architecture

Turborepo monorepo structure:

```
apps/
  api/          # Express.js REST API (port 3000)
  web/          # React SPA with Vite (port 5173)
  worker/       # BullMQ background job processors (not yet implemented)
packages/
  database/     # Prisma schema, migrations, client export
  shared/       # TypeScript types, Zod schemas, constants (shared between api/web)
  ui/           # Shared React components
```

### API Structure (apps/api)

- `src/routes/` — Express route handlers (one file per resource)
- `src/services/` — Business logic layer (corresponding service per route)
- `src/middleware/` — Auth (Passport JWT), validation (Zod), error handling
- `src/lib/` — Shared utilities (prisma client, redis, s3, logger)

### Web Structure (apps/web)

- `src/pages/` — Route-level page components
- `src/components/` — Reusable UI components organized by feature (calendar/, post/, ui/)
- `src/hooks/` — TanStack Query hooks for API calls (one hook file per resource)
- `src/stores/` — Zustand stores (currently just authStore)
- `src/lib/` — API client configuration

### Shared Package (packages/shared)

- `src/types/api.ts` — All API request/response TypeScript types
- `src/validation/schemas.ts` — Zod validation schemas (used by both api and web)
- `src/constants/` — Shared constants and status enums

## Commands

```bash
# Development
npm run dev                              # Start all services (API, web)
npm run dev --filter=@social-planner/api       # Start only API
npm run dev --filter=@social-planner/web       # Start only frontend

# Database
npm run db:migrate                       # Run Prisma migrations
npm run db:seed                          # Seed demo data (admin@admin.com / admin)
npm run db:studio                        # Open Prisma Studio
npm run db:reset                         # Reset database (drops all data)

# Testing
npm run test                             # Run all unit tests (Vitest)
npm run test --filter=@social-planner/api      # Run API tests only
npm run test --filter=@social-planner/web      # Run web tests only
npx vitest run apps/api/src/services/auth.service.test.ts  # Run single test file
npm run test:e2e                         # Run Playwright E2E tests
npm run test:e2e:ui                      # Run E2E tests with UI
npm run test:e2e:headed                  # Run E2E tests in headed mode

# Build & Lint
npm run build                            # Build all packages
npm run lint                             # Lint all packages
npm run lint:fix                         # Auto-fix lint issues
npm run format                           # Format with Prettier

# Docker (local services)
docker-compose -f docker/docker-compose.dev.yml up -d    # Start PostgreSQL, Redis, MinIO, MailHog
docker-compose -f docker/docker-compose.dev.yml down     # Stop services
```

## Key Technical Decisions

- **Authentication**: Custom JWT with Passport.js + Google/Microsoft OAuth (access tokens 15min, refresh tokens 7 days)
- **Social APIs**: LinkedIn and Instagram publishing are production-ready (real API integration)
- **Deployment**: Single VPS with Docker Compose and Traefik (not Kubernetes)
- **State Management**: TanStack Query for server state, Zustand for client state
- **Calendar**: FullCalendar 6.x with custom event renderers
- **Rich Text**: Tiptap 2.x with platform-aware character counting
- **i18n**: react-i18next with English (default) and Dutch
- **Email**: MailHog (dev), Resend (production)
- **Design**: Modern, minimal, Claude.ai-inspired color scheme
- **Notifications**: In-app + email only (no browser push)
- **Real-time**: Basic updates only (new comments, post status changes)
- **Ambassador System**: Email notifications with share links (no OAuth for ambassadors)
- **Mobile**: Responsive web only (React Native is future consideration)
- **Onboarding**: New users join the single "Acme" workspace, land on Calendar (month view). Social accounts must be connected via OAuth.
- **Architecture**: Single workspace for all users (no multi-tenancy)
- **OAuth Linking**: Auto-link accounts when same email exists

## Data Model

Core entities: User, Post, PostChannel, Article, MediaAsset, SocialAccount, Comment, ActivityLog

Post status flow: `DRAFT → PENDING_APPROVAL → APPROVED → SCHEDULED → PUBLISHED`

Single workspace: All users share one "Acme" workspace. User roles (ADMIN, EDITOR, VIEWER) are stored directly on the User entity. No multi-tenancy.

## Code Patterns

### Adding a New API Resource

1. Define types in `packages/shared/src/types/api.ts`
2. Add Zod schemas in `packages/shared/src/validation/schemas.ts`
3. Create service in `apps/api/src/services/{resource}.service.ts`
4. Create route in `apps/api/src/routes/{resource}.ts`
5. Export route in `apps/api/src/routes/index.ts`
6. Register route in `apps/api/src/app.ts`
7. Create hook in `apps/web/src/hooks/use{Resource}.ts`

### TanStack Query Conventions

- Query keys follow pattern: `{ all: [resource], list: (filters) => [...], detail: (id) => [...] }`
- Mutations invalidate relevant queries on success
- Use `staleTime` for caching (typically 2-5 minutes)

### API Response Patterns

- Success: Return data directly
- Errors: Throw `AppError(message, statusCode)` from services
- Validation: Use `validate(schema)` middleware in routes

## MCP Servers

Configured MCP servers for development:

- **Prisma**: Database migrations and Prisma Studio
- **Context7**: Up-to-date library documentation (use "use context7" in prompts)
- **GitHub**: PR/issue management
- **Figma**: Design-to-code (if Figma designs available)
