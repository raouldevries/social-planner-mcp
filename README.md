# Social Planner — MCP-connected

A social media content planner for Instagram and LinkedIn that you can drive from your own AI agent via the **Model Context Protocol (MCP)**. Schedule, draft, and approve posts from a calendar UI — or do all of it by talking to Claude or ChatGPT, with the planner exposed as a remote MCP server.

Built end-to-end with agentic coding as the primary workflow. The `memory-bank/` directory contains the full design docs, implementation plan, and session-by-session build journal used to drive Claude Code through the project.

---

## What's interesting about it

- **MCP server built into the API.** The Express app exposes an OAuth-protected MCP endpoint (`/api/mcp`) that any MCP client (Claude Desktop, Claude Code, ChatGPT, etc.) can connect to. Tools include `create_post`, `schedule_post`, `list_posts`, `approve_post`, `list_social_accounts`, and more. From inside Claude you can say _"draft a LinkedIn post about X and schedule it for Friday morning"_ and the planner does the rest — with the same approval workflow as the UI.
- **Production LinkedIn and Instagram publishing.** Real OAuth flows, real Graph/UGC API calls, token refresh, media upload through MinIO/S3, and analytics sync. Not stubs.
- **Calendar-first UX.** FullCalendar 6 with month/week/day views, drag-and-drop rescheduling, multi-channel post fan-out, and inline approval state.
- **Collaboration.** Comments, activity logs, role-based access (admin/editor/viewer), feedback widget, ambassador share-link advocacy.
- **Agentic build artifacts.** `memory-bank/app-design-document.md`, `memory-bank/technical-stack.md`, `memory-bank/implementation-plan.md`, and `memory-bank/progress.md` are the real planning and journal documents used to scaffold and ship this app with Claude Code.

## Tech stack

- **Monorepo:** Turborepo + npm workspaces
- **API:** Node.js + Express + Passport (JWT + Google/Microsoft OAuth) + Zod
- **Web:** React + Vite + TanStack Query + Zustand + Tiptap + FullCalendar + Tailwind
- **DB:** PostgreSQL via Prisma
- **Queue:** BullMQ on Redis (worker app)
- **Storage:** S3-compatible (MinIO locally)
- **Email:** MailHog (dev) / Resend (prod)
- **MCP:** OAuth 2.1 server with PKCE, tool registry, audit log, rate limiting
- **Deploy:** Docker Compose + Traefik on a single VPS
- **i18n:** react-i18next (EN + NL)
- **Testing:** Vitest (unit), Playwright (E2E)

## Prerequisites

- Node.js 20+
- Docker Desktop
- npm 10+

## Quick start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development services (PostgreSQL, Redis, MinIO, MailHog)
./scripts/init.sh

# Run migrations + seed
npm run db:migrate
npm run db:seed

# Start everything
npm run dev
```

Default seed account: `admin@admin.com` / `admin`.

> ⚠️ **Local development only.** The seed creates a hard-coded admin account purely for convenience. Never seed a deployment you don't fully control — the seed script throws if `NODE_ENV=production`, but you should still configure real auth before any non-local use.

## Development services

| Service       | URL                   | Credentials             |
| ------------- | --------------------- | ----------------------- |
| Web           | http://localhost:5173 | —                       |
| API           | http://localhost:3001 | —                       |
| PostgreSQL    | localhost:5432        | planner / planner_dev   |
| Redis         | localhost:6379        | —                       |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| MailHog       | http://localhost:8025 | —                       |

## Scripts

```bash
npm run dev          # Start all development servers
npm run build        # Build all packages
npm run lint         # Lint all packages
npm run test         # Run unit tests (Vitest)
npm run test:e2e     # Run E2E tests (Playwright)
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

## Project structure

```
apps/
  api/                # Express REST API + MCP server (port 3001)
  web/                # React SPA (port 5173)
  worker/             # BullMQ background workers
packages/
  database/           # Prisma schema, migrations, client
  shared/             # Shared TypeScript types + Zod schemas
  ui/                 # Shared React components
docker/               # Production Docker Compose + Traefik config
memory-bank/          # Design docs, implementation plan, build journal
docs/                 # Handover docs, MCP integration guide
e2e/                  # Playwright tests
```

## Connecting the MCP server

Once running locally, the MCP endpoint is at `http://localhost:3001/api/mcp` with OAuth at `http://localhost:3001/api/mcp/oauth`. See `docs/mcp-integration.md` for the full setup — registering an MCP client, getting an access token, and adding it to Claude Desktop / Claude Code config.

## About the build

This repository is a portfolio piece showing what shipping a real, multi-feature production app with agentic coding actually looks like. The interesting reading isn't the code alone — it's the artifacts in `memory-bank/`:

- `app-design-document.md` — full feature and data-model spec written before any code
- `technical-stack.md` — tech choices with rationale
- `implementation-plan.md` — the 28-step plan driven through Claude Code
- `progress.md` — step-by-step build log with audits at each step
- `plans/` — per-feature plans for the work added after the core was shipped

## Known advisories

`npm audit` currently reports 15 remaining advisories (8 high, 7 moderate), mostly in development tooling (`vitest` 3.x, `@typescript-eslint/*` 7.x, `esbuild`) and a few runtime transitive/direct packages (`nodemailer`, `uuid`, `bcrypt` install tooling via `tar`/`@mapbox/node-pre-gyp`). The critical advisory has been resolved. Clearing the rest requires major-version upgrades (`vitest@4`, `@typescript-eslint@8`, `uuid@14`, `nodemailer@8`), left as follow-up work for this showcase snapshot. Run `npm audit fix --force` if you want a clean audit, and re-run `npm run build && npm test` afterward.

## License

MIT — see [LICENSE](LICENSE).
