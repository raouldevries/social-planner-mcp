# Social Planner — Implementation Plan

**Version:** 1.0
**Last Updated:** January 2026
**Purpose:** Step-by-step development guide for implementation teams

---

## Table of Contents

- [How to Use This Document](#how-to-use-this-document)
- [Step 1: Repository and Development Environment Setup](#step-1-repository-and-development-environment-setup)
  - [1.1 Initialize Monorepo Structure](#11-initialize-monorepo-structure)
  - [1.2 Configure Package Manager and Build System](#12-configure-package-manager-and-build-system)
  - [1.3 Create Base TypeScript Configuration](#13-create-base-typescript-configuration)
  - [1.4 Configure Docker Development Environment](#14-configure-docker-development-environment)
  - [1.5 Create Development Setup Script](#15-create-development-setup-script)
  - [1.6 Configure ESLint and Prettier](#16-configure-eslint-and-prettier)
  - [1.7 Configure Git Hooks](#17-configure-git-hooks)
  - [1.8 Configure Claude Code MCP Servers](#18-configure-claude-code-mcp-servers)
- [Step 2: Database Schema and Prisma Setup](#step-2-database-schema-and-prisma-setup)
  - [2.1 Initialize Database Package](#21-initialize-database-package)
  - [2.2 Create Prisma Schema](#22-create-prisma-schema)
  - [2.3 Create Database Seed Script](#23-create-database-seed-script)
  - [2.4 Export Prisma Client](#24-export-prisma-client)
- [Step 3: Shared Types Package](#step-3-shared-types-package)
  - [3.1 Initialize Shared Package](#31-initialize-shared-package)
  - [3.2 Define Status and Role Constants](#32-define-status-and-role-constants)
  - [3.3 Define API Request/Response Types](#33-define-api-requestresponse-types)
  - [3.4 Create Validation Schemas](#34-create-validation-schemas)
  - [3.5 Create Package Exports](#35-create-package-exports)
- [Step 4: API Server Foundation](#step-4-api-server-foundation)
  - [4.1 Initialize API Package](#41-initialize-api-package)
  - [4.2 Create Application Configuration](#42-create-application-configuration)
  - [4.3 Create Logger](#43-create-logger)
  - [4.4 Create Database Client](#44-create-database-client)
  - [4.5 Create Redis Client](#45-create-redis-client)
  - [4.6 Create Authentication Middleware](#46-create-authentication-middleware)
  - [4.7 Create Validation Middleware](#47-create-validation-middleware)
  - [4.8 Create Error Handler](#48-create-error-handler)
  - [4.9 Create Rate Limiter](#49-create-rate-limiter)
  - [4.10 Create Express Application](#410-create-express-application)
  - [4.11 Create Server Entry Point](#411-create-server-entry-point)
  - [4.12 Create Health Check Route](#412-create-health-check-route)
- [Step 5: Authentication API Endpoints](#step-5-authentication-api-endpoints)
  - [5.1 Create Auth Service](#51-create-auth-service)
  - [5.2 Create Auth Routes](#52-create-auth-routes)
- [Step 6: Workspace and Membership API Endpoints](#step-6-workspace-and-membership-api-endpoints)
  - [6.1 Create Workspace Service](#61-create-workspace-service)
  - [6.2 Create Workspace Routes](#62-create-workspace-routes)
- Steps 7-23: _(Implemented - see progress.md for details)_
- [Step 24: User Management Page](#step-24-user-management-page)
  - [24.1 Create User Management Hooks](#241-create-user-management-hooks)
  - [24.2 Create Users Page Component](#242-create-users-page-component)
  - [24.3 Create User Table Component](#243-create-user-table-component)
  - [24.4 Update Pages Index](#244-update-pages-index)
- Steps 25-30: _(Implemented - see progress.md for details)_
- [Step 31: Production Deployment](#step-31-production-deployment)
  - [31.1 Create Production Docker Compose](#311-create-production-docker-compose)
  - [31.2 Create Production Environment Template](#312-create-production-environment-template)
  - [31.3 Hetzner Cloud Deployment Steps](#313-hetzner-cloud-deployment-steps)
  - [31.4 CI/CD Pipeline with GitHub Container Registry](#314-cicd-pipeline-with-github-container-registry)
    - [31.4.1 Create Deploy SSH Key](#3141-create-deploy-ssh-key)
    - [31.4.2 Configure GitHub Secrets](#3142-configure-github-secrets)
    - [31.4.3 Create GitHub Actions Workflow](#3143-create-github-actions-workflow)
    - [31.4.4 Update Production Docker Compose](#3144-update-production-docker-compose)
    - [31.4.5 Server-Side GHCR Authentication](#3145-server-side-ghcr-authentication)
    - [31.4.6 Test the Pipeline](#3146-test-the-pipeline)
    - [31.4.7 Optional: Deployment Environments](#3147-optional-deployment-environments)
    - [31.4.8 Optional: Restrict Deploy Key](#3148-optional-restrict-deploy-key)
    - [31.4.9 Rollback Procedure](#3149-rollback-procedure)
- [Step 32: Real-Time Analytics API Integration](#step-32-real-time-analytics-api-integration)
  - [32.1 Add Analytics Sync Configuration](#321-add-analytics-sync-configuration)
    - [32.1.1 Ensure OAuth Scopes + Token Refresh Support](#3211-ensure-oauth-scopes--token-refresh-support)
  - [32.2 Create Analytics Sync Service](#322-create-analytics-sync-service)
    - [32.2.1 Implement syncChannelAnalytics](#3221-implement-syncchannelanalytics)
    - [32.2.2 Implement syncAllAnalytics](#3222-implement-syncallanalytics)
    - [32.2.3 Add Sync Eligibility + Rate Limit Guards](#3223-add-sync-eligibility--rate-limit-guards)
  - [32.3 Create LinkedIn Analytics Adapter](#323-create-linkedin-analytics-adapter)
  - [32.4 Create Instagram Analytics Adapter](#324-create-instagram-analytics-adapter)
    - [32.4.1 Add Media-Type Guardrails](#3241-add-media-type-guardrails)
  - [32.5 Register Adapters and Create Index](#325-register-adapters-and-create-index)
  - [32.6 Create Analytics Sync API Routes](#326-create-analytics-sync-api-routes)
    - [32.6.1 Register Analytics Sync Routes](#3261-register-analytics-sync-routes)
  - [32.7 Set Up Background Sync Worker](#327-set-up-background-sync-worker)
    - [32.7.1 Wire Worker Process in Runtime](#3271-wire-worker-process-in-runtime)
  - [32.8 Update Frontend to Show Sync Status](#328-update-frontend-to-show-sync-status)
  - [32.9 Add Dependencies](#329-add-dependencies)
  - [32.10 Update Docker Compose for Production](#3210-update-docker-compose-for-production)
  - [32.11 Unit Tests](#3211-unit-tests)
  - [32.12 Integration Tests](#3212-integration-tests)

---

## How to Use This Document

This implementation plan is structured as **discrete, numbered steps** rather than time-based phases. Each step includes a clear objective, specific tasks, files to create, acceptance criteria, and dependencies on previous steps. Steps are designed to be completed sequentially, though some parallel work is possible where dependencies allow.

> **IMPORTANT: Step Completion Rule**
>
> Claude must **NEVER proceed to the next step without explicit user confirmation**. After completing a step, Claude should summarize what was done and wait for the user to say "go", "next", "proceed", or similar before starting the next step. This ensures the user can review, test, and approve each step before moving forward.

### Claude Workflow for Each Step

When implementing a step, Claude must follow this workflow:

1. **Before Starting**
   - Read the step requirements from this document
   - Update `memory-bank/progress.md` to mark step as "In Progress"
   - Create a todo list for the step's tasks

2. **During Implementation**
   - Complete each task in the step
   - Mark todos as completed as you go
   - Document any decisions or deviations in progress.md

3. **After Completing**
   - Update `memory-bank/progress.md` with:
     - Actions taken
     - Files created/modified
     - Issues encountered (if any)
     - Acceptance criteria checklist
   - Update the status table in progress.md
   - Summarize what was done to the user
   - **WAIT for user confirmation before proceeding**

4. **Update Chat History**
   - Add significant decisions to `memory-bank/chat-history.md`

**Progress Tracking:** Use `memory-bank/progress.md` to track completion status. Additionally, create a `progress.json` file in your repository root for programmatic tracking:

```json
{
  "currentStep": 1,
  "steps": {
    "1": { "status": "in_progress", "completedTasks": [], "blockers": [] },
    "2": { "status": "not_started", "completedTasks": [], "blockers": [] }
  },
  "lastUpdated": "2024-12-23T10:00:00Z"
}
```

---

## Step 1: Repository and Development Environment Setup

### Objective

Establish the monorepo structure, development tooling, and local development environment that all subsequent work depends upon.

### Tasks

**1.1 Initialize Monorepo Structure**

Create the following directory structure:

```
social-planner-mcp/
├── apps/
│   ├── api/                    # Express.js backend
│   ├── web/                    # React frontend
│   └── worker/                 # Background job processors
├── packages/
│   ├── database/               # Prisma schema and migrations
│   ├── shared/                 # Shared TypeScript types
│   └── ui/                     # Shared UI components
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── Dockerfile.api
├── scripts/
│   ├── init.sh                 # Development setup script
│   └── seed.sh                 # Database seeding
├── .github/
│   └── workflows/
├── package.json
├── turbo.json
├── tsconfig.base.json
└── progress.json
```

**1.2 Configure Package Manager and Build System**

Create root `package.json`:

```json
{
  "name": "social-planner-mcp",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "db:migrate": "turbo run db:migrate --filter=@social-planner/database",
    "db:seed": "turbo run db:seed --filter=@social-planner/database",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.3.0",
    "prettier": "^3.1.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0"
  }
}
```

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    },
    "db:migrate": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    }
  }
}
```

**1.3 Create Base TypeScript Configuration**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**1.4 Configure Docker Development Environment**

Create `docker/docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: planner-postgres
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: planner
      POSTGRES_PASSWORD: planner_dev
      POSTGRES_DB: planner_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U planner -d planner_dev']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: planner-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio
    container_name: planner-minio
    ports:
      - '9000:9000'
      - '9001:9001'
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

  mailhog:
    image: mailhog/mailhog
    container_name: planner-mailhog
    ports:
      - '1025:1025'
      - '8025:8025'

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

**1.5 Create Development Setup Script**

Create `scripts/init.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Initializing Social Planner development environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed."; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose -f docker/docker-compose.dev.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services..."
sleep 5

# Run database migrations
echo "🗄️ Running database migrations..."
npm run db:migrate

# Seed database (optional)
if [ "$1" = "--seed" ]; then
  echo "🌱 Seeding database..."
  npm run db:seed
fi

# Create MinIO bucket
echo "📁 Creating MinIO bucket..."
docker exec planner-minio mc alias set local http://localhost:9000 minioadmin minioadmin 2>/dev/null || true
docker exec planner-minio mc mb local/planner-media 2>/dev/null || true

echo "✅ Development environment ready!"
echo ""
echo "Services:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - MinIO Console: http://localhost:9001"
echo "  - MailHog: http://localhost:8025"
echo ""
echo "Run 'npm run dev' to start the development servers."
```

**1.6 Configure ESLint and Prettier**

Create `.eslintrc.js`:

```javascript
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  ignorePatterns: ['dist', 'node_modules', '*.js'],
};
```

Create `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

**1.7 Configure Git Hooks**

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

Create `.lintstagedrc.js`:

```javascript
module.exports = {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
```

**1.8 Configure Claude Code MCP Servers**

MCP (Model Context Protocol) servers connect Claude Code to external tools, enabling AI-assisted development with direct access to databases, documentation, design files, and version control. Configure these before beginning implementation work.

**Prerequisites:**

- Claude Code installed: `npm install -g @anthropic-ai/claude-code`
- GitHub Personal Access Token (for GitHub MCP)
- Figma Desktop app (for Figma MCP, optional)
- Context7 API key (optional, for higher rate limits)

**Install Prisma MCP Server:**

Enables database migrations, schema management, and Prisma Studio access.

```bash
cd /path/to/social-planner-mcp
claude mcp add prisma -- npx -y prisma mcp
```

**Install Context7 MCP Server:**

Provides real-time documentation for React, TanStack Query, FullCalendar, Tiptap, and other frontend libraries.

```bash
# Basic (rate limited)
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest

# With API key (recommended) - get free key at https://context7.com/dashboard
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest --api-key YOUR_API_KEY
```

**Install Figma MCP Server (if using Figma designs):**

Enables design-to-code translation for UI components.

```bash
# Requires Figma Desktop with MCP enabled: Settings → Dev Mode → Enable MCP Server
claude mcp add figma -- npx -y @anthropic/figma-dev-mode-mcp-server

# Alternative without Figma Desktop (requires API token from figma.com/developers/api)
claude mcp add figma -e FIGMA_ACCESS_TOKEN=your_token -- npx -y @anthropic/framelink-figma-mcp
```

**Install GitHub MCP Server:**

Enables PR creation, issue management, and repository operations.

```bash
# Create token at github.com/settings/tokens with scopes: repo, read:org, read:user
claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token -- npx -y @modelcontextprotocol/server-github
```

**Verify Installation:**

```bash
# List configured servers
claude mcp list

# Start Claude Code and check status
claude
# Inside Claude Code:
/mcp
```

All servers should show as `connected`.

**Create MCP Setup Script:**

Create `scripts/setup-mcp.sh` for team onboarding:

```bash
#!/bin/bash
set -e

echo "🤖 Configuring Claude Code MCP servers for Social Planner..."

# Check prerequisites
command -v claude >/dev/null 2>&1 || { echo "Claude Code is required. Install with: npm install -g @anthropic-ai/claude-code"; exit 1; }

# Navigate to project root
cd "$(dirname "$0")/.."

# Prisma MCP (database operations)
echo "📦 Adding Prisma MCP..."
claude mcp add prisma -- npx -y prisma mcp

# Context7 MCP (library documentation)
echo "📚 Adding Context7 MCP..."
if [ -n "$CONTEXT7_API_KEY" ]; then
  claude mcp add context7 -- npx -y @upstash/context7-mcp@latest --api-key "$CONTEXT7_API_KEY"
else
  claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
  echo "  ℹ️  Using rate-limited mode. Set CONTEXT7_API_KEY for higher limits."
fi

# Figma MCP (design-to-code)
echo "🎨 Adding Figma MCP..."
if [ -n "$FIGMA_ACCESS_TOKEN" ]; then
  claude mcp add figma -e FIGMA_ACCESS_TOKEN="$FIGMA_ACCESS_TOKEN" -- npx -y @anthropic/framelink-figma-mcp
else
  claude mcp add figma -- npx -y @anthropic/figma-dev-mode-mcp-server
  echo "  ℹ️  Using Figma Desktop mode. Ensure MCP is enabled in Figma settings."
fi

# GitHub MCP (version control)
echo "🐙 Adding GitHub MCP..."
if [ -n "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN" -- npx -y @modelcontextprotocol/server-github
else
  echo "  ⚠️  GITHUB_PERSONAL_ACCESS_TOKEN not set. Skipping GitHub MCP."
  echo "      Create token at: https://github.com/settings/tokens"
fi

echo ""
echo "✅ MCP setup complete! Verify with: claude mcp list"
echo ""
echo "Usage tips:"
echo "  - Add 'use context7' to prompts for up-to-date library docs"
echo "  - Select Figma frames before asking Claude to generate components"
echo "  - Use '/mcp' inside Claude Code to check server status"
```

**Create Team Configuration File:**

For consistent team setup, create `.mcp.json` in project root (add to `.gitignore` if it contains tokens):

```json
{
  "mcpServers": {
    "prisma": {
      "command": "npx",
      "args": ["-y", "prisma", "mcp"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "figma": {
      "command": "npx",
      "args": ["-y", "@anthropic/figma-dev-mode-mcp-server"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

**Add to .env.example:**

```bash
# MCP Server Configuration (optional)
CONTEXT7_API_KEY=
FIGMA_ACCESS_TOKEN=
GITHUB_PERSONAL_ACCESS_TOKEN=
```

### Files to Create

- `package.json` (root)
- `turbo.json`
- `tsconfig.base.json`
- `.eslintrc.js`
- `.prettierrc`
- `.gitignore`
- `.env.example`
- `docker/docker-compose.dev.yml`
- `scripts/init.sh`
- `scripts/setup-mcp.sh`
- `.husky/pre-commit`
- `.lintstagedrc.js`
- `.mcp.json`
- `progress.json`

### Acceptance Criteria

- Running `npm install` completes without errors
- Running `docker-compose -f docker/docker-compose.dev.yml up -d` starts all services
- PostgreSQL, Redis, MinIO, and MailHog are accessible at their respective ports
- ESLint and Prettier configurations are validated by running `npm run lint`
- Git hooks trigger on commit
- Running `claude mcp list` shows configured MCP servers
- Inside Claude Code, `/mcp` shows all servers as `connected`

### Dependencies

None (this is the first step)

---

## Step 2: Database Schema and Prisma Setup

### Objective

Implement the complete database schema using Prisma, including all entities, relationships, enums, and indexes defined in the design document.

> **MCP Tip:** Use the Prisma MCP server for this step. Commands like "check migration status", "create a migration for the posts table", or "open Prisma Studio" execute directly without leaving Claude Code. The server includes safety confirmations for destructive operations like `migrate reset`.

### Tasks

**2.1 Initialize Database Package**

Create `packages/database/package.json`:

```json
{
  "name": "@social-planner/database",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "db:migrate": "prisma migrate dev",
    "db:migrate:prod": "prisma migrate deploy",
    "db:seed": "ts-node prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate",
    "db:reset": "prisma migrate reset --force"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0"
  },
  "devDependencies": {
    "prisma": "^5.7.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.3.0"
  }
}
```

**2.2 Create Prisma Schema**

Create `packages/database/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// ENUMS
// ============================================

enum UserRole {
  ADMIN   // Can manage users, social accounts, approve/reject posts
  EDITOR  // Can create/edit posts, articles, upload media
  VIEWER  // Read-only access, can comment
}

enum PostStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  SCHEDULED
  PUBLISHED
  REJECTED
  UNPUBLISHED
}

enum ArticleStatus {
  DRAFT
  PUBLISHED
}

enum SocialPlatform {
  INSTAGRAM
  LINKEDIN
}

enum ChannelStatus {
  PENDING
  PUBLISHED
  FAILED
}

enum SharePermission {
  VIEW
  VIEW_COMMENT
}

enum AmbassadorStatus {
  PENDING
  ACTIVE
  DECLINED
}

enum NotificationType {
  POST_SUBMITTED
  POST_APPROVED
  POST_REJECTED
  POST_PUBLISHED
  POST_FAILED
  COMMENT_ADDED
  MENTION
  COLLABORATOR_ASSIGNED
  EDIT_REQUESTED
  REVIEW_REQUESTED
  AMBASSADOR_CONTENT
}

enum AuthProvider {
  LOCAL
  GOOGLE
  MICROSOFT
}

// ============================================
// CORE ENTITIES
// ============================================

model User {
  id              String       @id @default(uuid())
  email           String       @unique
  passwordHash    String?      @map("password_hash")  // Nullable for OAuth users
  fullName        String       @map("full_name")
  avatarUrl       String?      @map("avatar_url")
  timezone        String       @default("UTC")
  emailVerifiedAt DateTime?    @map("email_verified_at")
  authProvider    AuthProvider @default(LOCAL) @map("auth_provider")
  authProviderId  String?      @map("auth_provider_id")  // External provider's user ID
  role            UserRole     @default(EDITOR)  // Single workspace, role on user
  createdAt       DateTime     @default(now()) @map("created_at")
  lastLoginAt     DateTime?    @map("last_login_at")

  // Relations
  postsAuthored          Post[]
  articlesAuthored       Article[]
  mediaUploaded          MediaAsset[]
  collaboratorAssignments CollaboratorAssignment[] @relation("AssignedTo")
  assignmentsMade        CollaboratorAssignment[] @relation("AssignedBy")
  comments               Comment[]
  activityLogs           ActivityLog[]
  shareLinksCreated      ShareLink[]
  ambassadorMemberships  AmbassadorMembership[]
  notifications          Notification[]
  sessions               Session[]

  @@map("users")
}

model Session {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  refreshToken String   @unique @map("refresh_token")
  userAgent    String?  @map("user_agent")
  ipAddress    String?  @map("ip_address")
  createdAt    DateTime @default(now()) @map("created_at")
  expiresAt    DateTime @map("expires_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("sessions")
}

// NOTE: Single workspace architecture - no Workspace/Membership models needed
// All users share the "Acme" workspace. Roles are stored directly on User.

// ============================================
// SOCIAL ACCOUNTS
// ============================================

model SocialAccount {
  id                String         @id @default(uuid())
  platform          SocialPlatform
  platformAccountId String         @map("platform_account_id")
  accountName       String         @map("account_name")
  accountType       String?        @map("account_type")
  accessToken       String         @map("access_token")
  refreshToken      String?        @map("refresh_token")
  tokenExpiresAt    DateTime?      @map("token_expires_at")
  profileImageUrl   String?        @map("profile_image_url")
  connectedById     String         @map("connected_by")
  connectedAt       DateTime       @default(now()) @map("connected_at")
  lastSyncAt        DateTime?      @map("last_sync_at")

  connectedBy User          @relation(fields: [connectedById], references: [id])
  channels    PostChannel[]

  @@unique([platform, platformAccountId])
  @@map("social_accounts")
}

// ============================================
// CONTENT: POSTS
// ============================================

model Post {
  id                    String     @id @default(uuid())
  authorId              String     @map("author_id")
  status                PostStatus @default(DRAFT)
  baseContent           String?    @map("base_content")
  createdAt             DateTime   @default(now()) @map("created_at")
  updatedAt             DateTime   @updatedAt @map("updated_at")
  scheduledAt           DateTime?  @map("scheduled_at")
  publishedAt           DateTime?  @map("published_at")
  rejectionReason       String?    @map("rejection_reason")
  isAmbassadorAvailable Boolean    @default(false) @map("is_ambassador_available")
  articleId             String?    @map("article_id")
  linkUrl               String?    @map("link_url")
  linkPreview           Json?      @map("link_preview")

  author       User                    @relation(fields: [authorId], references: [id])
  article      Article?                @relation(fields: [articleId], references: [id], onDelete: SetNull)
  channels     PostChannel[]
  media        PostMedia[]
  collaborators CollaboratorAssignment[]
  comments     Comment[]
  activityLogs ActivityLog[]
  shareLinks   ShareLink[]
  ambassadorShares AmbassadorShare[]

  @@index([status])
  @@index([scheduledAt])
  @@index([authorId])
  @@index([createdAt])
  @@map("posts")
}

model PostChannel {
  id              String        @id @default(uuid())
  postId          String        @map("post_id")
  socialAccountId String        @map("social_account_id")
  customContent   String?       @map("custom_content")
  scheduledAt     DateTime?     @map("scheduled_at")
  platformPostId  String?       @map("platform_post_id")
  publishedAt     DateTime?     @map("published_at")
  publishError    String?       @map("publish_error")
  status          ChannelStatus @default(PENDING)

  post          Post          @relation(fields: [postId], references: [id], onDelete: Cascade)
  socialAccount SocialAccount @relation(fields: [socialAccountId], references: [id], onDelete: Cascade)
  analytics     PostAnalytics?

  @@unique([postId, socialAccountId])
  @@index([postId])
  @@index([status, scheduledAt])
  @@map("post_channels")
}

model PostAnalytics {
  id            String   @id @default(uuid())
  channelId     String   @unique @map("channel_id")
  impressions   Int      @default(0)
  reach         Int      @default(0)
  engagements   Int      @default(0)
  likes         Int      @default(0)
  comments      Int      @default(0)
  shares        Int      @default(0)
  saves         Int      @default(0)
  clicks        Int      @default(0)
  syncedAt      DateTime @map("synced_at")
  rawData       Json?    @map("raw_data")

  channel PostChannel @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@map("post_analytics")
}

// ============================================
// CONTENT: ARTICLES
// ============================================

model Article {
  id              String        @id @default(uuid())
  authorId        String        @map("author_id")
  title           String
  content         String?
  status          ArticleStatus @default(DRAFT)
  featuredImageId String?       @map("featured_image_id")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  publishedAt     DateTime?     @map("published_at")

  author        User        @relation(fields: [authorId], references: [id])
  featuredImage MediaAsset? @relation(fields: [featuredImageId], references: [id], onDelete: SetNull)
  posts         Post[]
  activityLogs  ActivityLog[]

  @@index([status])
  @@index([authorId])
  @@map("articles")
}

// ============================================
// MEDIA LIBRARY
// ============================================

model MediaAsset {
  id            String   @id @default(uuid())
  uploadedById  String   @map("uploaded_by")
  fileName      String   @map("file_name")
  fileType      String   @map("file_type")
  fileSize      BigInt   @map("file_size")
  storagePath   String   @map("storage_path")
  thumbnailPath String?  @map("thumbnail_path")
  width         Int?
  height        Int?
  duration      Int?
  altText       String?  @map("alt_text")
  metadata      Json     @default("{}")
  createdAt     DateTime @default(now()) @map("created_at")
  folderId      String?  @map("folder_id")

  uploadedBy     User          @relation(fields: [uploadedById], references: [id])
  folder         MediaFolder?  @relation(fields: [folderId], references: [id], onDelete: SetNull)
  postMedia      PostMedia[]
  articlesFeatured Article[]
  tags           MediaTag[]

  @@index([createdAt])
  @@map("media_assets")
}

model MediaFolder {
  id          String   @id @default(uuid())
  name        String
  parentId    String?  @map("parent_id")
  createdAt   DateTime @default(now()) @map("created_at")

  parent    MediaFolder?  @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children  MediaFolder[] @relation("FolderHierarchy")
  assets    MediaAsset[]

  @@map("media_folders")
}

model MediaTag {
  id   String @id @default(uuid())
  name String @unique

  assets MediaAsset[]

  @@map("media_tags")
}

model PostMedia {
  id           String  @id @default(uuid())
  postId       String  @map("post_id")
  mediaAssetId String  @map("media_asset_id")
  position     Int     @default(0)
  altText      String? @map("alt_text")

  post       Post       @relation(fields: [postId], references: [id], onDelete: Cascade)
  mediaAsset MediaAsset @relation(fields: [mediaAssetId], references: [id], onDelete: Cascade)

  @@unique([postId, mediaAssetId])
  @@index([postId])
  @@map("post_media")
}

// ============================================
// COLLABORATION
// ============================================

model CollaboratorAssignment {
  id         String   @id @default(uuid())
  postId     String   @map("post_id")
  userId     String   @map("user_id")
  assignedById String @map("assigned_by")
  assignedAt DateTime @default(now()) @map("assigned_at")

  post       Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  user       User @relation("AssignedTo", fields: [userId], references: [id], onDelete: Cascade)
  assignedBy User @relation("AssignedBy", fields: [assignedById], references: [id])

  @@unique([postId, userId])
  @@index([postId])
  @@index([userId])
  @@map("collaborator_assignments")
}

model Comment {
  id                  String   @id @default(uuid())
  postId              String   @map("post_id")
  authorId            String?  @map("author_id")
  externalAuthorName  String?  @map("external_author_name")
  externalAuthorEmail String?  @map("external_author_email")
  parentId            String?  @map("parent_id")
  content             String
  isResolved          Boolean  @default(false) @map("is_resolved")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  post     Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  author   User?     @relation(fields: [authorId], references: [id], onDelete: SetNull)
  parent   Comment?  @relation("CommentThread", fields: [parentId], references: [id], onDelete: Cascade)
  replies  Comment[] @relation("CommentThread")
  mentions CommentMention[]

  @@index([postId])
  @@index([parentId])
  @@map("comments")
}

model CommentMention {
  id        String @id @default(uuid())
  commentId String @map("comment_id")
  userId    String @map("user_id")

  comment Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@unique([commentId, userId])
  @@map("comment_mentions")
}

// ============================================
// ACTIVITY & NOTIFICATIONS
// ============================================

model ActivityLog {
  id        String   @id @default(uuid())
  postId    String?  @map("post_id")
  articleId String?  @map("article_id")
  actorId   String   @map("actor_id")
  action    String
  details   Json     @default("{}")
  createdAt DateTime @default(now()) @map("created_at")

  post    Post?    @relation(fields: [postId], references: [id], onDelete: Cascade)
  article Article? @relation(fields: [articleId], references: [id], onDelete: Cascade)
  actor   User     @relation(fields: [actorId], references: [id])

  @@index([createdAt])
  @@index([postId])
  @@index([articleId])
  @@map("activity_logs")
}

model Notification {
  id        String           @id @default(uuid())
  userId    String           @map("user_id")
  type      NotificationType
  title     String
  body      String
  data      Json             @default("{}")
  readAt    DateTime?        @map("read_at")
  createdAt DateTime         @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt])
  @@index([userId, createdAt])
  @@map("notifications")
}

// ============================================
// SHARE LINKS
// ============================================

model ShareLink {
  id            String          @id @default(uuid())
  postId        String?         @map("post_id")
  calendarShare Boolean         @default(false) @map("calendar_share")
  token         String          @unique
  passwordHash  String?         @map("password_hash")
  expiresAt     DateTime        @map("expires_at")
  permissions   SharePermission @default(VIEW)
  createdById   String          @map("created_by")
  createdAt     DateTime        @default(now()) @map("created_at")

  post      Post? @relation(fields: [postId], references: [id], onDelete: Cascade)
  createdBy User  @relation(fields: [createdById], references: [id])

  @@index([token])
  @@index([expiresAt])
  @@map("share_links")
}

// ============================================
// AMBASSADOR SYSTEM
// ============================================

model AmbassadorGroup {
  id          String   @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime @default(now()) @map("created_at")

  members AmbassadorMembership[]

  @@map("ambassador_groups")
}

model AmbassadorMembership {
  id          String           @id @default(uuid())
  groupId     String           @map("group_id")
  userId      String?          @map("user_id")
  email       String?
  status      AmbassadorStatus @default(PENDING)
  invitedAt   DateTime         @default(now()) @map("invited_at")
  respondedAt DateTime?        @map("responded_at")

  group  AmbassadorGroup   @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user   User?             @relation(fields: [userId], references: [id], onDelete: Cascade)
  shares AmbassadorShare[]

  @@index([groupId])
  @@index([userId])
  @@map("ambassador_memberships")
}

model AmbassadorShare {
  id           String         @id @default(uuid())
  postId       String         @map("post_id")
  ambassadorId String         @map("ambassador_id")
  platform     SocialPlatform
  sharedAt     DateTime       @default(now()) @map("shared_at")
  shareUrl     String?        @map("share_url")

  post       Post                 @relation(fields: [postId], references: [id], onDelete: Cascade)
  ambassador AmbassadorMembership @relation(fields: [ambassadorId], references: [id], onDelete: Cascade)

  @@index([postId])
  @@index([ambassadorId])
  @@map("ambassador_shares")
}
```

**2.3 Create Database Seed Script**

Create `packages/database/prisma/seed.ts`:

```typescript
import { PrismaClient, UserRole, PostStatus, SocialPlatform } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('demo123456', 12);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@planner.app' },
    update: {},
    create: {
      email: 'demo@planner.app',
      passwordHash,
      fullName: 'Demo User',
      timezone: 'Europe/Amsterdam',
      emailVerifiedAt: new Date(),
    },
  });

  // Create demo workspace
  const demoWorkspace = await prisma.workspace.upsert({
    where: { slug: 'demo-workspace' },
    update: {},
    create: {
      name: 'Demo Workspace',
      slug: 'demo-workspace',
      settings: {
        defaultTimezone: 'Europe/Amsterdam',
        features: {
          ambassadors: true,
          analytics: true,
        },
      },
    },
  });

  // Add user as owner
  await prisma.membership.upsert({
    where: {
      userId_workspaceId: {
        userId: demoUser.id,
        workspaceId: demoWorkspace.id,
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      workspaceId: demoWorkspace.id,
      role: UserRole.OWNER,
    },
  });

  // Create sample posts in various states
  const posts = [
    { status: PostStatus.DRAFT, content: 'Draft post content' },
    { status: PostStatus.PENDING_APPROVAL, content: 'Pending review post' },
    { status: PostStatus.SCHEDULED, content: 'Scheduled for tomorrow' },
    { status: PostStatus.PUBLISHED, content: 'Already published content' },
  ];

  for (const postData of posts) {
    await prisma.post.create({
      data: {
        workspaceId: demoWorkspace.id,
        authorId: demoUser.id,
        status: postData.status,
        baseContent: postData.content,
        scheduledAt:
          postData.status === PostStatus.SCHEDULED ? new Date(Date.now() + 86400000) : undefined,
        publishedAt: postData.status === PostStatus.PUBLISHED ? new Date() : undefined,
      },
    });
  }

  console.log('✅ Seed completed');
  console.log(`   Created user: ${demoUser.email}`);
  console.log(`   Created workspace: ${demoWorkspace.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**2.4 Export Prisma Client**

Create `packages/database/src/index.ts`:

```typescript
export * from '@prisma/client';
export { PrismaClient } from '@prisma/client';
```

### Files to Create

- `packages/database/package.json`
- `packages/database/tsconfig.json`
- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/seed.ts`
- `packages/database/src/index.ts`

### Acceptance Criteria

- `npm run db:migrate` creates all tables successfully
- `npm run db:seed` populates demo data without errors
- `npx prisma studio` opens and displays all tables correctly
- All foreign key relationships are properly enforced
- Indexes exist on all columns specified in the schema

### Dependencies

- Step 1 (Repository Setup)

---

## Step 3: Shared Types Package

### Objective

Create a shared TypeScript package containing type definitions, validation schemas, and constants used by both frontend and backend.

### Tasks

**3.1 Initialize Shared Package**

Create `packages/shared/package.json`:

```json
{
  "name": "@social-planner/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

**3.2 Define Status and Role Constants**

Create `packages/shared/src/constants/status.ts`:

```typescript
export const POST_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  REJECTED: 'REJECTED',
  UNPUBLISHED: 'UNPUBLISHED',
} as const;

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];

export const ARTICLE_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const;

export type ArticleStatus = (typeof ARTICLE_STATUS)[keyof typeof ARTICLE_STATUS];

export const USER_ROLE = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const SOCIAL_PLATFORM = {
  INSTAGRAM: 'INSTAGRAM',
  LINKEDIN: 'LINKEDIN',
} as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORM)[keyof typeof SOCIAL_PLATFORM];

export const STATUS_COLORS = {
  DRAFT: '#6B7280',
  PENDING_APPROVAL: '#F59E0B',
  APPROVED: '#3B82F6',
  SCHEDULED: '#8B5CF6',
  PUBLISHED: '#10B981',
  REJECTED: '#EF4444',
  UNPUBLISHED: '#F97316',
} as const;

export const PLATFORM_LIMITS = {
  INSTAGRAM: {
    textMaxLength: 2200,
    hashtagLimit: 30,
    mediaMaxCount: 10,
    imageMaxSizeMB: 8,
    videoMaxSizeMB: 100,
    videoMaxDurationSeconds: 60,
  },
  LINKEDIN: {
    textMaxLength: 3000,
    hashtagLimit: 5,
    mediaMaxCount: 1,
    imageMaxSizeMB: 8,
    videoMaxSizeMB: 200,
    videoMaxDurationSeconds: 600,
  },
} as const;
```

**3.3 Define API Request/Response Types**

Create `packages/shared/src/types/api.ts`:

```typescript
import type { PostStatus, ArticleStatus, UserRole, SocialPlatform } from '../constants/status';

// ============================================
// COMMON TYPES
// ============================================

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

// ============================================
// AUTH TYPES
// ============================================

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
}

export interface RefreshRequest {
  refreshToken: string;
}

// ============================================
// USER TYPES
// ============================================

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  timezone: string;
}

export interface UserWithMemberships extends UserSummary {
  memberships: MembershipSummary[];
}

// ============================================
// WORKSPACE TYPES
// ============================================

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: UserRole;
  memberCount: number;
}

export interface WorkspaceDetail extends WorkspaceSummary {
  settings: WorkspaceSettings;
  createdAt: string;
}

export interface WorkspaceSettings {
  defaultTimezone?: string;
  features?: {
    ambassadors?: boolean;
    analytics?: boolean;
  };
}

export interface CreateWorkspaceRequest {
  name: string;
  slug?: string;
}

// ============================================
// MEMBERSHIP TYPES
// ============================================

export interface MembershipSummary {
  workspaceId: string;
  workspaceName: string;
  role: UserRole;
}

export interface MemberDetail {
  id: string;
  userId: string;
  user: UserSummary;
  role: UserRole;
  joinedAt: string;
}

export interface InviteMemberRequest {
  email: string;
  role: Exclude<UserRole, 'OWNER'>;
}

export interface UpdateMemberRequest {
  role: Exclude<UserRole, 'OWNER'>;
}

// ============================================
// SOCIAL ACCOUNT TYPES
// ============================================

export interface SocialAccountSummary {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  profileImageUrl: string | null;
  lastSyncAt: string | null;
}

// ============================================
// POST TYPES
// ============================================

export interface PostSummary {
  id: string;
  status: PostStatus;
  baseContent: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  author: UserSummary;
  channels: PostChannelSummary[];
  mediaCount: number;
  thumbnailUrl: string | null;
  collaboratorCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostDetail extends PostSummary {
  rejectionReason: string | null;
  isAmbassadorAvailable: boolean;
  article: ArticleSummary | null;
  linkUrl: string | null;
  linkPreview: LinkPreview | null;
  media: PostMediaItem[];
  collaborators: CollaboratorSummary[];
}

export interface PostChannelSummary {
  id: string;
  socialAccountId: string;
  platform: SocialPlatform;
  accountName: string;
  customContent: string | null;
  scheduledAt: string | null;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  publishError: string | null;
}

export interface PostMediaItem {
  id: string;
  mediaAssetId: string;
  position: number;
  altText: string | null;
  fileName: string;
  fileType: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
}

export interface LinkPreview {
  title: string;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
}

export interface CollaboratorSummary {
  userId: string;
  user: UserSummary;
  assignedAt: string;
}

export interface CreatePostRequest {
  baseContent?: string;
  channels?: {
    socialAccountId: string;
    customContent?: string;
    scheduledAt?: string;
  }[];
  mediaIds?: string[];
  articleId?: string;
  isAmbassadorAvailable?: boolean;
  linkUrl?: string;
}

export interface UpdatePostRequest {
  baseContent?: string;
  channels?: {
    socialAccountId: string;
    customContent?: string;
    scheduledAt?: string;
  }[];
  mediaIds?: string[];
  articleId?: string | null;
  isAmbassadorAvailable?: boolean;
  linkUrl?: string | null;
}

export interface SchedulePostRequest {
  scheduledAt: string;
  channelSchedules?: {
    socialAccountId: string;
    scheduledAt: string;
  }[];
}

export interface RejectPostRequest {
  reason: string;
}

// ============================================
// ARTICLE TYPES
// ============================================

export interface ArticleSummary {
  id: string;
  title: string;
  status: ArticleStatus;
  author: UserSummary;
  featuredImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface ArticleDetail extends ArticleSummary {
  content: string | null;
  linkedPostCount: number;
}

export interface CreateArticleRequest {
  title: string;
  content?: string;
  featuredImageId?: string;
}

export interface UpdateArticleRequest {
  title?: string;
  content?: string;
  featuredImageId?: string | null;
}

// ============================================
// MEDIA TYPES
// ============================================

export interface MediaAssetSummary {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  createdAt: string;
}

export interface MediaAssetDetail extends MediaAssetSummary {
  storagePath: string;
  altText: string | null;
  metadata: Record<string, unknown>;
  tags: string[];
  folder: MediaFolderSummary | null;
  uploadedBy: UserSummary;
}

export interface MediaFolderSummary {
  id: string;
  name: string;
  parentId: string | null;
}

export interface CreateUploadUrlRequest {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface CreateUploadUrlResponse {
  uploadUrl: string;
  assetId: string;
  expiresAt: string;
}

// ============================================
// COMMENT TYPES
// ============================================

export interface CommentSummary {
  id: string;
  content: string;
  author: UserSummary | null;
  externalAuthorName: string | null;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  replies: CommentSummary[];
  mentions: string[];
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
  mentions?: string[];
}

export interface UpdateCommentRequest {
  content?: string;
  isResolved?: boolean;
}

// ============================================
// CALENDAR TYPES
// ============================================

export interface CalendarItem {
  id: string;
  type: 'post' | 'article';
  title: string;
  status: PostStatus | ArticleStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  platforms: SocialPlatform[];
  thumbnailUrl: string | null;
  collaborators: UserSummary[];
}

export interface CalendarFilters {
  status?: PostStatus[];
  platform?: SocialPlatform[];
  authorId?: string;
  collaboratorId?: string;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface PostAnalyticsSummary {
  impressions: number;
  reach: number;
  engagements: number;
  engagementRate: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}

export interface PostAnalyticsDetail {
  postId: string;
  aggregate: PostAnalyticsSummary;
  byPlatform: Record<SocialPlatform, PostAnalyticsSummary>;
  syncedAt: string;
}

export interface WorkspaceAnalytics {
  dateRange: {
    from: string;
    to: string;
  };
  aggregate: PostAnalyticsSummary;
  byPlatform: Record<SocialPlatform, PostAnalyticsSummary>;
  timeSeries: {
    date: string;
    impressions: number;
    engagements: number;
  }[];
  topPosts: {
    postId: string;
    content: string;
    engagementRate: number;
    platform: SocialPlatform;
  }[];
}
```

**3.4 Create Validation Schemas**

Create `packages/shared/src/validation/schemas.ts`:

```typescript
import { z } from 'zod';
import { USER_ROLE, POST_STATUS, ARTICLE_STATUS, SOCIAL_PLATFORM } from '../constants/status';

// ============================================
// AUTH SCHEMAS
// ============================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ============================================
// WORKSPACE SCHEMAS
// ============================================

export const createWorkspaceSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  settings: z.record(z.unknown()).optional(),
});

// ============================================
// MEMBERSHIP SCHEMAS
// ============================================

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
});

export const updateMemberSchema = z.object({
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
});

// ============================================
// POST SCHEMAS
// ============================================

export const createPostSchema = z.object({
  baseContent: z.string().max(5000).optional(),
  channels: z
    .array(
      z.object({
        socialAccountId: z.string().uuid(),
        customContent: z.string().max(5000).optional(),
        scheduledAt: z.string().datetime().optional(),
      })
    )
    .optional(),
  mediaIds: z.array(z.string().uuid()).max(10).optional(),
  articleId: z.string().uuid().optional(),
  isAmbassadorAvailable: z.boolean().optional(),
  linkUrl: z.string().url().optional(),
});

export const updatePostSchema = createPostSchema.partial().extend({
  articleId: z.string().uuid().nullable().optional(),
  linkUrl: z.string().url().nullable().optional(),
});

export const schedulePostSchema = z.object({
  scheduledAt: z.string().datetime(),
  channelSchedules: z
    .array(
      z.object({
        socialAccountId: z.string().uuid(),
        scheduledAt: z.string().datetime(),
      })
    )
    .optional(),
});

export const rejectPostSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(1000),
});

// ============================================
// ARTICLE SCHEMAS
// ============================================

export const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().optional(),
  featuredImageId: z.string().uuid().optional(),
});

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  featuredImageId: z.string().uuid().nullable().optional(),
});

// ============================================
// COMMENT SCHEMAS
// ============================================

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000),
  parentId: z.string().uuid().optional(),
  mentions: z.array(z.string().uuid()).optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  isResolved: z.boolean().optional(),
});

// ============================================
// MEDIA SCHEMAS
// ============================================

export const createUploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().regex(/^(image|video)\/.+$/),
  fileSize: z
    .number()
    .positive()
    .max(500 * 1024 * 1024), // 500MB max
});

export const updateMediaAssetSchema = z.object({
  altText: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  folderId: z.string().uuid().nullable().optional(),
});

// ============================================
// SHARE LINK SCHEMAS
// ============================================

export const createShareLinkSchema = z.object({
  expiresInHours: z.number().min(1).max(720), // 1 hour to 30 days
  permissions: z.enum(['VIEW', 'VIEW_COMMENT']),
  password: z.string().min(8).optional(),
});

// ============================================
// QUERY SCHEMAS
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
});

export const postFiltersSchema = z.object({
  status: z
    .string()
    .transform((s) => s.split(',').filter(Boolean))
    .optional(),
  platform: z.enum(['INSTAGRAM', 'LINKEDIN']).optional(),
  authorId: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export const calendarFiltersSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  status: z
    .string()
    .transform((s) => s.split(',').filter(Boolean))
    .optional(),
  platform: z
    .string()
    .transform((s) => s.split(',').filter(Boolean))
    .optional(),
});
```

**3.5 Create Package Exports**

Create `packages/shared/src/index.ts`:

```typescript
// Constants
export * from './constants/status';

// Types
export * from './types/api';

// Validation
export * from './validation/schemas';
```

### Files to Create

- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/constants/status.ts`
- `packages/shared/src/types/api.ts`
- `packages/shared/src/validation/schemas.ts`
- `packages/shared/src/index.ts`

### Acceptance Criteria

- Package builds without errors
- All types are properly exported and can be imported in other packages
- Zod schemas validate correctly with appropriate error messages
- Constants match the values defined in Prisma schema

### Dependencies

- Step 1 (Repository Setup)
- Step 2 (Database Schema) — for ensuring type consistency

---

## Step 4: API Server Foundation

### Objective

Create the Express.js API server with authentication, middleware, and core infrastructure that all API endpoints will build upon.

### Tasks

**4.1 Initialize API Package**

Create `apps/api/package.json`:

```json
{
  "name": "@social-planner/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@social-planner/database": "workspace:*",
    "@social-planner/shared": "workspace:*",
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "zod": "^3.22.0",
    "pino": "^8.16.0",
    "pino-http": "^8.5.0",
    "ioredis": "^5.3.0",
    "bullmq": "^5.0.0",
    "uuid": "^9.0.0",
    "date-fns": "^3.0.0",
    "date-fns-tz": "^2.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "@types/compression": "^1.7.0",
    "@types/morgan": "^1.9.0",
    "@types/bcrypt": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/passport": "^1.0.0",
    "@types/passport-jwt": "^4.0.0",
    "@types/uuid": "^9.0.0",
    "tsx": "^4.6.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^6.0.0"
  }
}
```

**4.2 Create Application Configuration**

Create `apps/api/src/config/index.ts`:

```typescript
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // S3/MinIO
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_BUCKET: z.string().default('planner-media'),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_REGION: z.string().default('us-east-1'),

  // OAuth - Instagram
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  INSTAGRAM_REDIRECT_URI: z.string().optional(),

  // OAuth - LinkedIn
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_REDIRECT_URI: z.string().optional(),

  // Email
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@planner.app'),

  // Frontend URL (for CORS and links)
  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
```

**4.3 Create Logger**

Create `apps/api/src/lib/logger.ts`:

```typescript
import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    config.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        }
      : undefined,
  base: {
    service: 'planner-api',
  },
  redact: ['req.headers.authorization', 'password', 'accessToken', 'refreshToken'],
});
```

**4.4 Create Database Client**

Create `apps/api/src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@social-planner/database';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query', (e) => {
    logger.debug({ query: e.query, duration: e.duration }, 'Database query');
  });

  globalForPrisma.prisma = prisma;
}
```

**4.5 Create Redis Client**

Create `apps/api/src/lib/redis.ts`:

```typescript
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      logger.error('Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

redis.on('connect', () => {
  logger.info('Redis connected');
});
```

**4.6 Create Authentication Middleware**

Create `apps/api/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { UserRole } from '@social-planner/shared';

// Extend Express Request type
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      fullName: string;
      timezone: string;
    }

    interface Request {
      workspaceId?: string;
      workspaceMembership?: {
        role: UserRole;
        isActive: boolean;
      };
    }
  }
}

// JWT Strategy
passport.use(
  'jwt',
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.JWT_ACCESS_SECRET,
      issuer: 'social-planner-mcp',
      audience: 'planner-api',
    },
    async (payload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: {
            id: true,
            email: true,
            fullName: true,
            timezone: true,
          },
        });

        if (!user) {
          return done(null, false);
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Authentication middleware
export const requireAuth = passport.authenticate('jwt', { session: false });

// Workspace context middleware
export const requireWorkspace = async (req: Request, res: Response, next: NextFunction) => {
  const workspaceId = req.params.workspaceId || req.params.workspace_id;

  if (!workspaceId) {
    return res.status(400).json({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace ID is required',
    });
  }

  if (!req.user) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: req.user.id,
        workspaceId,
      },
    },
  });

  if (!membership || !membership.isActive) {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'You do not have access to this workspace',
    });
  }

  req.workspaceId = workspaceId;
  req.workspaceMembership = {
    role: membership.role as UserRole,
    isActive: membership.isActive,
  };

  next();
};

// Role-based access control
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.workspaceMembership) {
      return res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Workspace context not initialized',
      });
    }

    if (!roles.includes(req.workspaceMembership.role)) {
      return res.status(403).json({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `This action requires one of the following roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

// Token generation utilities
export function generateAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN,
    issuer: 'social-planner-mcp',
    audience: 'planner-api',
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
    issuer: 'social-planner-mcp',
  });
}

export function verifyRefreshToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET, {
      issuer: 'social-planner-mcp',
    }) as { sub: string };
  } catch {
    return null;
  }
}
```

**4.7 Create Validation Middleware**

Create `apps/api/src/middleware/validate.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req[target]);
      req[target] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};

        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(err.message);
        });

        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details,
        });
      }
      next(error);
    }
  };
}
```

**4.8 Create Error Handler**

Create `apps/api/src/middleware/errorHandler.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@social-planner/database';
import { logger } from '../lib/logger';
import { config } from '../config';

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Log error
  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      workspaceId: req.workspaceId,
    },
    'Request error'
  );

  // Handle known error types
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          code: 'CONFLICT',
          message: 'A record with this value already exists',
        });
      case 'P2025':
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
        });
      default:
        break;
    }
  }

  // Default error response
  const statusCode = 500;
  const response: Record<string, unknown> = {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  };

  // Include stack trace in development
  if (config.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
}
```

**4.9 Create Rate Limiter**

Create `apps/api/src/middleware/rateLimiter.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}

export function rateLimiter(config: RateLimitConfig) {
  const { windowMs, max, keyGenerator } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator ? keyGenerator(req) : `ratelimit:${req.ip}:${req.path}`;

    try {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.pexpire(key, windowMs);
      }

      const ttl = await redis.pttl(key);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));
      res.setHeader('X-RateLimit-Reset', Date.now() + ttl);

      if (current > max) {
        return res.status(429).json({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil(ttl / 1000),
        });
      }

      next();
    } catch (error) {
      // If Redis fails, allow request to proceed
      next();
    }
  };
}

// Preset rate limiters
export const globalRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
});

export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  keyGenerator: (req) => `ratelimit:auth:${req.ip}`,
});

export const writeRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  keyGenerator: (req) => `ratelimit:write:${req.user?.id || req.ip}`,
});
```

**4.10 Create Express Application**

Create `apps/api/src/app.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import passport from 'passport';
import pinoHttp from 'pino-http';
import { config } from './config';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { globalRateLimiter } from './middleware/rateLimiter';

// Import routes (to be created in subsequent steps)
import authRoutes from './routes/auth';
import workspaceRoutes from './routes/workspaces';
import healthRoutes from './routes/health';

const app = express();

// Trust proxy (for rate limiting behind load balancer)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(pinoHttp({ logger }));

// Passport initialization
app.use(passport.initialize());

// Rate limiting
app.use(globalRateLimiter);

// Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
```

**4.11 Create Server Entry Point**

Create `apps/api/src/server.ts`:

```typescript
import app from './app';
import { config } from './config';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';

async function main() {
  // Verify database connection
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to database');
    process.exit(1);
  }

  // Verify Redis connection
  try {
    await redis.ping();
    logger.info('Redis connected');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to Redis');
    process.exit(1);
  }

  // Start server
  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Server started');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');

    server.close(async () => {
      logger.info('HTTP server closed');

      await prisma.$disconnect();
      logger.info('Database disconnected');

      redis.disconnect();
      logger.info('Redis disconnected');

      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});
```

**4.12 Create Health Check Route**

Create `apps/api/src/routes/health.ts`:

```typescript
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

const router = Router();

router.get('/', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/ready', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    // Database not ready
  }

  try {
    await redis.ping();
    checks.redis = true;
  } catch {
    // Redis not ready
  }

  const allHealthy = Object.values(checks).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
```

### Files to Create

- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/src/config/index.ts`
- `apps/api/src/lib/logger.ts`
- `apps/api/src/lib/prisma.ts`
- `apps/api/src/lib/redis.ts`
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/middleware/validate.ts`
- `apps/api/src/middleware/errorHandler.ts`
- `apps/api/src/middleware/rateLimiter.ts`
- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/src/routes/health.ts`
- `apps/api/.env.example`

### Acceptance Criteria

- Server starts without errors when running `npm run dev`
- Health check endpoint returns 200 OK at `/health`
- Readiness check at `/health/ready` verifies database and Redis connections
- Invalid requests return proper JSON error responses
- Rate limiting headers are present in responses
- CORS is configured correctly for frontend origin

### Dependencies

- Step 1 (Repository Setup)
- Step 2 (Database Schema)
- Step 3 (Shared Types)

---

## Step 5: Authentication API Endpoints

### Objective

Implement complete authentication flow including registration, login, token refresh, logout, and password reset.

### Tasks

**5.1 Create Auth Service**

Create `apps/api/src/services/auth.service.ts`:

```typescript
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

const SALT_ROUNDS = 12;
const SESSION_PREFIX = 'session:';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    timezone: string;
  };
}

export async function registerUser(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResult> {
  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    throw new AppError('EMAIL_EXISTS', 'An account with this email already exists', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      timezone: 'UTC',
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      timezone: true,
    },
  });

  // Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token
  await storeSession(user.id, refreshToken);

  return { accessToken, refreshToken, user };
}

export async function loginUser(
  email: string,
  password: string,
  userAgent?: string,
  ipAddress?: string
): Promise<AuthResult> {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      timezone: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Store session
  await storeSession(user.id, refreshToken, userAgent, ipAddress);

  // Remove passwordHash from response
  const { passwordHash: _, ...userWithoutPassword } = user;

  return { accessToken, refreshToken, user: userWithoutPassword };
}

export async function refreshTokens(refreshToken: string): Promise<AuthResult> {
  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    throw new AppError('INVALID_TOKEN', 'Invalid or expired refresh token', 401);
  }

  // Check if session exists
  const sessionKey = `${SESSION_PREFIX}${payload.sub}:${refreshToken}`;
  const sessionExists = await redis.exists(sessionKey);

  if (!sessionExists) {
    throw new AppError('SESSION_EXPIRED', 'Session has expired or been revoked', 401);
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      timezone: true,
    },
  });

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User no longer exists', 401);
  }

  // Delete old session
  await redis.del(sessionKey);

  // Generate new tokens
  const newAccessToken = generateAccessToken(user.id);
  const newRefreshToken = generateRefreshToken(user.id);

  // Store new session
  await storeSession(user.id, newRefreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
}

export async function logoutUser(userId: string, refreshToken?: string): Promise<void> {
  if (refreshToken) {
    // Delete specific session
    const sessionKey = `${SESSION_PREFIX}${userId}:${refreshToken}`;
    await redis.del(sessionKey);
  } else {
    // Delete all sessions for user
    const pattern = `${SESSION_PREFIX}${userId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export async function logoutAllSessions(userId: string): Promise<void> {
  const pattern = `${SESSION_PREFIX}${userId}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

async function storeSession(
  userId: string,
  refreshToken: string,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  const sessionKey = `${SESSION_PREFIX}${userId}:${refreshToken}`;
  const sessionData = JSON.stringify({
    userId,
    userAgent,
    ipAddress,
    createdAt: new Date().toISOString(),
  });

  // Store session with 7-day expiry
  await redis.setex(sessionKey, 7 * 24 * 60 * 60, sessionData);
}

export async function verifyEmail(token: string): Promise<void> {
  const key = `email_verification:${token}`;
  const userId = await redis.get(key);

  if (!userId) {
    throw new AppError('INVALID_TOKEN', 'Invalid or expired verification token', 400);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });

  await redis.del(key);
}

export async function initiatePasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return;
  }

  const token = uuid();
  const key = `password_reset:${token}`;

  // Store token with 1-hour expiry
  await redis.setex(key, 60 * 60, user.id);

  // TODO: Send password reset email
  // await sendPasswordResetEmail(user.email, token);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const key = `password_reset:${token}`;
  const userId = await redis.get(key);

  if (!userId) {
    throw new AppError('INVALID_TOKEN', 'Invalid or expired reset token', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Delete reset token
  await redis.del(key);

  // Invalidate all existing sessions
  await logoutAllSessions(userId);
}
```

**5.2 Create Auth Routes**

Create `apps/api/src/routes/auth.ts`:

```typescript
import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { registerSchema, loginSchema, refreshTokenSchema } from '@social-planner/shared';
import * as authService from '../services/auth.service';
import { z } from 'zod';

const router = Router();

// Apply rate limiting to auth routes
router.use(authRateLimiter);

/**
 * POST /api/auth/register
 * Create a new user account
 */
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;
    const result = await authService.registerUser(email, password, fullName);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const userAgent = req.get('User-Agent');
    const ipAddress = req.ip;

    const result = await authService.loginUser(email, password, userAgent, ipAddress);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Exchange refresh token for new access token
 */
router.post('/refresh', validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshTokens(refreshToken);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Invalidate current session
 */
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken;
    await authService.logoutUser(req.user!.id, refreshToken);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout-all
 * Invalidate all sessions for current user
 */
router.post('/logout-all', requireAuth, async (req, res, next) => {
  try {
    await authService.logoutAllSessions(req.user!.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        timezone: true,
        emailVerifiedAt: true,
        createdAt: true,
        memberships: {
          where: { isActive: true },
          select: {
            workspaceId: true,
            role: true,
            workspace: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/forgot-password
 * Initiate password reset flow
 */
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    await authService.initiatePasswordReset(req.body.email);

    // Always return success to prevent email enumeration
    res.json({
      message: 'If an account exists with this email, a reset link has been sent',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/reset-password
 * Complete password reset with token
 */
const resetPasswordSchema = z.object({
  token: z.string(),
  password: registerSchema.shape.password,
});

router.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    next(error);
  }
});

// Import prisma for /me endpoint
import { prisma } from '../lib/prisma';

export default router;
```

### Files to Create

- `apps/api/src/services/auth.service.ts`
- `apps/api/src/routes/auth.ts`

### Acceptance Criteria

- Registration creates a new user and returns tokens
- Login with valid credentials returns tokens
- Login with invalid credentials returns 401
- Token refresh with valid refresh token returns new tokens
- Token refresh with expired/invalid token returns 401
- Logout invalidates the session
- Password reset flow works end-to-end
- Rate limiting prevents brute force attempts

### Dependencies

- Step 4 (API Server Foundation)

---

## Step 6: Workspace and Membership API Endpoints

> ⚠️ **DEPRECATED:** This step was replaced with **Post Management API** due to the single-workspace architecture decision. All users belong to one "Acme" workspace. User roles are stored directly on the User entity. See the Continuation Note section for the updated step descriptions.

### Objective (Original - Not Implemented)

Implement workspace CRUD operations and membership management including invitations and role updates.

### Tasks

**6.1 Create Workspace Service**

Create `apps/api/src/services/workspace.service.ts`:

```typescript
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@social-planner/shared';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

export async function createWorkspace(name: string, slug: string | undefined, userId: string) {
  // Generate slug if not provided
  let workspaceSlug = slug || generateSlug(name);

  // Ensure slug uniqueness
  let slugExists = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  let counter = 1;
  while (slugExists) {
    workspaceSlug = `${generateSlug(name)}-${counter}`;
    slugExists = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    });
    counter++;
  }

  // Create workspace with owner membership in a transaction
  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        name,
        slug: workspaceSlug,
        settings: {
          defaultTimezone: 'UTC',
          features: {
            ambassadors: true,
            analytics: true,
          },
        },
      },
    });

    await tx.membership.create({
      data: {
        userId,
        workspaceId: ws.id,
        role: 'OWNER',
      },
    });

    return ws;
  });

  return {
    ...workspace,
    role: 'OWNER' as UserRole,
    memberCount: 1,
  };
}

export async function getWorkspacesForUser(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      workspace: {
        include: {
          _count: {
            select: { memberships: { where: { isActive: true } } },
          },
        },
      },
    },
  });

  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    role: m.role as UserRole,
    memberCount: m.workspace._count.memberships,
  }));
}

export async function getWorkspaceById(workspaceId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    include: {
      workspace: {
        include: {
          _count: {
            select: { memberships: { where: { isActive: true } } },
          },
        },
      },
    },
  });

  if (!membership || !membership.isActive) {
    throw new AppError('FORBIDDEN', 'You do not have access to this workspace', 403);
  }

  return {
    id: membership.workspace.id,
    name: membership.workspace.name,
    slug: membership.workspace.slug,
    settings: membership.workspace.settings,
    createdAt: membership.workspace.createdAt.toISOString(),
    role: membership.role as UserRole,
    memberCount: membership.workspace._count.memberships,
  };
}

export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string; settings?: Record<string, unknown> }
) {
  return prisma.workspace.update({
    where: { id: workspaceId },
    data,
  });
}

export async function deleteWorkspace(workspaceId: string) {
  await prisma.workspace.delete({
    where: { id: workspaceId },
  });
}

export async function getWorkspaceMembers(workspaceId: string) {
  const memberships = await prisma.membership.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          timezone: true,
        },
      },
    },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  });

  return memberships.map((m) => ({
    id: m.id,
    userId: m.userId,
    user: m.user,
    role: m.role as UserRole,
    joinedAt: m.joinedAt.toISOString(),
  }));
}

export async function inviteMember(
  workspaceId: string,
  email: string,
  role: Exclude<UserRole, 'OWNER'>,
  invitedById: string
) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    // Check if already a member
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: existingUser.id,
          workspaceId,
        },
      },
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        throw new AppError('ALREADY_MEMBER', 'User is already a member of this workspace', 409);
      }

      // Reactivate membership
      await prisma.membership.update({
        where: { id: existingMembership.id },
        data: {
          isActive: true,
          role,
          invitedById,
        },
      });

      return { status: 'reactivated' };
    }

    // Add existing user directly
    await prisma.membership.create({
      data: {
        userId: existingUser.id,
        workspaceId,
        role,
        invitedById,
      },
    });

    return { status: 'added' };
  }

  // Create invitation for new user
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.invitation.create({
    data: {
      email: email.toLowerCase(),
      workspaceId,
      role,
      token,
      invitedById,
      expiresAt,
    },
  });

  // TODO: Send invitation email
  // await sendInvitationEmail(email, token, workspace.name);

  return { status: 'invited', token };
}

export async function updateMemberRole(
  workspaceId: string,
  targetUserId: string,
  newRole: Exclude<UserRole, 'OWNER'>,
  actorRole: UserRole
) {
  const targetMembership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: targetUserId,
        workspaceId,
      },
    },
  });

  if (!targetMembership || !targetMembership.isActive) {
    throw new AppError('NOT_FOUND', 'Member not found', 404);
  }

  if (targetMembership.role === 'OWNER') {
    throw new AppError('FORBIDDEN', 'Cannot modify workspace owner', 403);
  }

  if (actorRole === 'ADMIN' && targetMembership.role === 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Admins cannot modify other admins', 403);
  }

  return prisma.membership.update({
    where: { id: targetMembership.id },
    data: { role: newRole },
  });
}

export async function removeMember(workspaceId: string, targetUserId: string, actorRole: UserRole) {
  const targetMembership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: targetUserId,
        workspaceId,
      },
    },
  });

  if (!targetMembership || !targetMembership.isActive) {
    throw new AppError('NOT_FOUND', 'Member not found', 404);
  }

  if (targetMembership.role === 'OWNER') {
    throw new AppError('FORBIDDEN', 'Cannot remove workspace owner', 403);
  }

  if (actorRole === 'ADMIN' && targetMembership.role === 'ADMIN') {
    throw new AppError('FORBIDDEN', 'Admins cannot remove other admins', 403);
  }

  await prisma.membership.update({
    where: { id: targetMembership.id },
    data: { isActive: false },
  });
}

export async function acceptInvitation(token: string, userId: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    throw new AppError('INVALID_TOKEN', 'Invalid or expired invitation', 400);
  }

  if (invitation.expiresAt < new Date()) {
    throw new AppError('EXPIRED', 'This invitation has expired', 400);
  }

  if (invitation.acceptedAt) {
    throw new AppError('ALREADY_ACCEPTED', 'This invitation has already been used', 400);
  }

  // Verify user email matches invitation
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.email !== invitation.email) {
    throw new AppError('EMAIL_MISMATCH', 'Invitation email does not match your account', 400);
  }

  // Create membership and mark invitation as accepted
  await prisma.$transaction([
    prisma.membership.create({
      data: {
        userId,
        workspaceId: invitation.workspaceId,
        role: invitation.role,
        invitedById: invitation.invitedById,
      },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    }),
  ]);
}
```

**6.2 Create Workspace Routes**

Create `apps/api/src/routes/workspaces.ts`:

```typescript
import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth, requireWorkspace, requireRole } from '../middleware/auth';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema,
  updateMemberSchema,
} from '@social-planner/shared';
import * as workspaceService from '../services/workspace.service';

const router = Router();

// All workspace routes require authentication
router.use(requireAuth);

/**
 * GET /api/workspaces
 * List workspaces for current user
 */
router.get('/', async (req, res, next) => {
  try {
    const workspaces = await workspaceService.getWorkspacesForUser(req.user!.id);
    res.json(workspaces);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workspaces
 * Create a new workspace
 */
router.post('/', validate(createWorkspaceSchema), async (req, res, next) => {
  try {
    const { name, slug } = req.body;
    const workspace = await workspaceService.createWorkspace(name, slug, req.user!.id);
    res.status(201).json(workspace);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workspaces/:workspaceId
 * Get workspace details
 */
router.get('/:workspaceId', async (req, res, next) => {
  try {
    const workspace = await workspaceService.getWorkspaceById(req.params.workspaceId, req.user!.id);
    res.json(workspace);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/workspaces/:workspaceId
 * Update workspace settings
 */
router.patch(
  '/:workspaceId',
  requireWorkspace,
  requireRole('OWNER', 'ADMIN'),
  validate(updateWorkspaceSchema),
  async (req, res, next) => {
    try {
      const workspace = await workspaceService.updateWorkspace(req.workspaceId!, req.body);
      res.json(workspace);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/workspaces/:workspaceId
 * Delete workspace (owner only)
 */
router.delete('/:workspaceId', requireWorkspace, requireRole('OWNER'), async (req, res, next) => {
  try {
    await workspaceService.deleteWorkspace(req.workspaceId!);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// MEMBERSHIP ROUTES
// ============================================

/**
 * GET /api/workspaces/:workspaceId/members
 * List workspace members
 */
router.get('/:workspaceId/members', requireWorkspace, async (req, res, next) => {
  try {
    const members = await workspaceService.getWorkspaceMembers(req.workspaceId!);
    res.json(members);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workspaces/:workspaceId/members/invite
 * Invite a new member
 */
router.post(
  '/:workspaceId/members/invite',
  requireWorkspace,
  requireRole('OWNER', 'ADMIN'),
  validate(inviteMemberSchema),
  async (req, res, next) => {
    try {
      const { email, role } = req.body;
      const result = await workspaceService.inviteMember(
        req.workspaceId!,
        email,
        role,
        req.user!.id
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/workspaces/:workspaceId/members/:userId
 * Update member role
 */
router.patch(
  '/:workspaceId/members/:userId',
  requireWorkspace,
  requireRole('OWNER', 'ADMIN'),
  validate(updateMemberSchema),
  async (req, res, next) => {
    try {
      await workspaceService.updateMemberRole(
        req.workspaceId!,
        req.params.userId,
        req.body.role,
        req.workspaceMembership!.role
      );
      res.json({ message: 'Member role updated' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/workspaces/:workspaceId/members/:userId
 * Remove member from workspace
 */
router.delete(
  '/:workspaceId/members/:userId',
  requireWorkspace,
  requireRole('OWNER', 'ADMIN'),
  async (req, res, next) => {
    try {
      await workspaceService.removeMember(
        req.workspaceId!,
        req.params.userId,
        req.workspaceMembership!.role
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

### Files to Create

- `apps/api/src/services/workspace.service.ts`
- `apps/api/src/routes/workspaces.ts`

### Acceptance Criteria

- Creating a workspace assigns creator as OWNER
- Workspace slug is auto-generated if not provided
- Only OWNER and ADMIN can invite members
- OWNER cannot be removed or demoted
- ADMIN cannot modify other ADMINs
- Invitation tokens expire after 7 days
- Existing users are added directly, new users receive invitation

### Dependencies

- Step 5 (Authentication API)

---

## Step 24: User Management Page

### Objective

Implement the User Management page that allows administrators to view, search, and manage all users in the system. This includes listing users, changing user roles, and removing users. Since Social Planner uses a single-workspace architecture, all users belong to the same workspace and user management is simplified to role-based access control.

### Prerequisites

- Backend API already implemented in `apps/api/src/routes/users.ts`
- Available endpoints:
  - `GET /api/users` - List users with pagination, search, and role filtering
  - `GET /api/users/:id` - Get user details
  - `PATCH /api/users/:id/role` - Update user role (ADMIN, EDITOR, VIEWER)
  - `DELETE /api/users/:id` - Delete user

### Tasks

**24.1 Create User Management Hooks**

Create `apps/web/src/hooks/useUsers.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiError } from '@/lib/api';
import toast from 'react-hot-toast';

// Types
interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

interface UsersResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

interface UseUsersOptions {
  page?: number;
  perPage?: number;
  search?: string;
  role?: 'ADMIN' | 'EDITOR' | 'VIEWER';
}

// Query keys
export const userKeys = {
  all: ['users'] as const,
  list: (options: UseUsersOptions) => [...userKeys.all, 'list', options] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

// Hooks
export function useUsers(options: UseUsersOptions = {}) {
  const { page = 1, perPage = 20, search, role } = options;

  return useQuery({
    queryKey: userKeys.list(options),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('perPage', String(perPage));
      if (search) params.set('search', search);
      if (role) params.set('role', role);

      const { data } = await api.get<UsersResponse>(`/users?${params}`);
      return data;
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: 'ADMIN' | 'EDITOR' | 'VIEWER';
    }) => {
      const { data } = await api.patch(`/users/${userId}/role`, { role });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('User role updated');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('User deleted');
    },
    onError: (error) => {
      toast.error(getApiError(error).message);
    },
  });
}
```

**24.2 Create Users Page Component**

Create `apps/web/src/pages/Users.tsx`:

```typescript
import { useState, useCallback } from 'react';
import { useUsers, useUpdateUserRole, useDeleteUser } from '@/hooks/useUsers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Empty } from '@/components/ui/Empty';
import { Pagination } from '@/components/ui/Pagination';

// Component implementation with:
// - User table with columns: Avatar, Name, Email, Role, Created, Actions
// - Search input for filtering by name/email
// - Role filter dropdown
// - Change role dropdown per user
// - Delete button with confirmation modal
// - Pagination controls
```

**24.3 Create User Table Component**

Create reusable table component for displaying users with:

- Sortable columns
- Role badge with color coding (ADMIN=red, EDITOR=blue, VIEWER=gray)
- Avatar with fallback initials
- Relative date formatting for created/last login
- Action dropdown with role change and delete options

**24.4 Update Pages Index**

Update `apps/web/src/pages/index.tsx` to export the real Users component instead of placeholder.

### UI Specifications

**User List Table Columns:**
| Column | Description |
|--------|-------------|
| Avatar | User avatar or initials fallback |
| Name | Full name, clickable for details |
| Email | User email address |
| Role | Badge showing ADMIN/EDITOR/VIEWER |
| Created | Relative date (e.g., "3 days ago") |
| Actions | Dropdown with Change Role, Delete |

**Role Badge Colors:**

- ADMIN: Red background (`bg-red-100 text-red-800`)
- EDITOR: Blue background (`bg-blue-100 text-blue-800`)
- VIEWER: Gray background (`bg-gray-100 text-gray-800`)

**Empty State:**

- Show when no users match search/filter
- Message: "No users found"
- Clear filters button

**Delete Confirmation Modal:**

- Title: "Delete User"
- Message: "Are you sure you want to delete {userName}? This action cannot be undone."
- Buttons: Cancel (secondary), Delete (danger)

### Files to Create

- `apps/web/src/hooks/useUsers.ts` - TanStack Query hooks for user management
- `apps/web/src/pages/Users.tsx` - Main Users page component

### Files to Modify

- `apps/web/src/pages/index.tsx` - Export real Users component

### Acceptance Criteria

- [ ] Users page displays paginated list of all users
- [ ] Search filters users by name or email
- [ ] Role filter shows only users with selected role
- [ ] Admin can change any user's role (except own admin role)
- [ ] Admin can delete users (except self)
- [ ] Delete requires confirmation modal
- [ ] Loading states shown during API calls
- [ ] Error states handled gracefully
- [ ] Empty state shown when no users match filters
- [ ] Pagination works correctly

### Dependencies

- Step 16 (Authentication UI) - for protected routes
- Step 17 (Layout and Navigation) - for page shell
- Backend users API (already implemented)

---

## Continuation Note

> **Architecture Note:** The original plan included multi-workspace support (Step 6: Workspace and Membership API). This was replaced with a single-workspace architecture where all users belong to one "Acme" workspace. User roles (ADMIN, EDITOR, VIEWER) are stored directly on the User entity.

This implementation plan continues with the following steps (not fully detailed here to conserve space, but following the same comprehensive format). **The step numbers below match `progress.json`:**

**Step 6: Post Management API** — CRUD operations for posts, status transitions, scheduling, collaborators (replaced Workspace API due to single-workspace architecture)

**Step 7: Article Management API** — Article CRUD, publishing, linked posts

**Step 8: Social Account Service** — Social account OAuth flows, token management

**Step 9: Channel Service** — Post channels, channel scheduling, platform adapters

**Step 10: Activity and Notification Service** — Activity logging, notification delivery, workflow helpers

**Step 11: Scheduler Service** — BullMQ queues, publishing worker, platform adapters

**Step 12: Media Service** — S3 client, file upload, thumbnail generation, folder management

**Step 13: User Service** — Profile endpoints, password change, admin user list, role management

**Step 14: Comment Service** — Threading support, mention parsing, notifications integration

**Step 15: Frontend Project Setup** — Vite React scaffolding, Tailwind, TanStack Query, Zustand

> **MCP Tip:** Use Context7 throughout frontend development. Add "use context7" to prompts when working with React, TanStack Query, Tailwind, or any npm library to ensure generated code uses current API patterns.

**Step 16: UI Component Library** — Design tokens, Button, Input, Modal, Card, and other base components

**Step 17: Authentication UI** — Login, registration, password reset, OAuth callback screens

> **MCP Tip:** If Figma designs exist, use the Figma MCP to generate components. Select frames in Figma Desktop, then ask Claude to "generate the sidebar component from the selected Figma frame using React and Tailwind".

**Step 18: Calendar Component** — FullCalendar integration with custom renderers, drag-and-drop

> **MCP Tip:** FullCalendar's API changed significantly in v6. Always use Context7 when implementing calendar features: "Create a FullCalendar month view with drag-and-drop event moving. use context7"

**Step 19: Post Editor** — Tiptap rich text editor, media attachments, channel selection, scheduling

> **MCP Tip:** Tiptap configuration can be complex. Use Context7 for extension setup: "Configure Tiptap with StarterKit, CharacterCount, and Placeholder extensions. use context7"

**Step 20: Post List Views** — Filters, post cards, pagination, URL state management

**Step 21: Article Editor** — Long-form content editor with Tiptap, article list

**Step 22: Media Library UI** — Upload, grid display, filters, media picker, folder management

**Step 23: Analytics Dashboard** — Charts, metrics cards, date range selector, top posts table

> **MCP Tip:** For Recharts or Chart.js implementation, Context7 ensures correct prop usage: "Create a bar chart showing post engagement by platform using Recharts. use context7"

**Step 24: Settings Page** — Profile settings, security settings, user management (admin)

**Step 25: Social Accounts Page** — Connect/disconnect social accounts, account cards, OAuth modals

**Step 26: Dashboard Page** — Stats grid, recent activity, upcoming posts, quick actions

**Step 27: Testing Suite** — Vitest unit tests, Playwright E2E tests, test utilities

**Step 28: Share Links and External Review** — Public share links, password protection, external comments, calendar sharing

**Step 29: Apple-Inspired Design System** — Complete visual overhaul applying Apple Human Interface Guidelines and Jony Ive design philosophy. Includes: SF Pro system font stack, muted neutral color palette (`neutral-*`), subtle layered shadows (`shadow-card`, `shadow-card-hover`), backdrop blur for modals, pill-shaped tab controls, touch-friendly 44px tap targets, Apple-style `cubic-bezier(0.16, 1, 0.3, 1)` easing curves, refined typography with tighter letter-spacing, FullCalendar custom styling overrides. Components updated: Button, Input, Modal, Card, Layout. Pages updated: Calendar, Dashboard, PostList.

**Step 30: Ambassador System** — Groups, content queue, share tracking, email notifications (not yet implemented)

**Step 31: Production Deployment** — Docker Compose production config, hosting setup, CI/CD pipelines

---

## Step 31: Production Deployment

### Objective

Deploy Social Planner to production with a cost-effective hosting solution, production-ready Docker configuration, and automated CI/CD pipelines.

### Deployment Order Summary

Complete these steps in order. DNS configuration is grouped together to minimize DNS propagation delays.

| Order | Task                       | Description                                   |
| ----- | -------------------------- | --------------------------------------------- |
| 1     | **Create VPS**             | Set up Hetzner Cloud server with Docker       |
| 2     | **Create Object Storage**  | S3-compatible storage for media files         |
| 3     | **Configure Firewall**     | Open SSH, HTTP, HTTPS ports                   |
| 4     | **DNS Configuration**      | Point domain/subdomains to server IP          |
| 5     | **Email DNS Records**      | Add SPF, DKIM, DMARC for email deliverability |
| 6     | **Server Setup**           | SSH in, clone repo, create directories        |
| 7     | **Email Provider Setup**   | Configure Resend for production emails        |
| 8     | **Production Environment** | Create .env with all secrets                  |
| 9     | **Build and Deploy**       | Docker build, start services, run migrations  |
| 10    | **OAuth Configuration**    | Update Google/Microsoft OAuth URLs            |
| 11    | **SSL/TLS Setup**          | Configure Let's Encrypt via Traefik           |
| 12    | **Verification**           | Test all endpoints and email sending          |

> **Important:** Steps 4-5 should be done together since you'll be in DNS settings. Email DNS records (SPF, DKIM) are required for emails to not land in spam.

### Hosting Options Analysis

| Provider                   | Cost            | Resources                            | Best For                     |
| -------------------------- | --------------- | ------------------------------------ | ---------------------------- |
| **Hetzner Cloud**          | ~€13/month      | 3 vCPU, 4GB RAM, 80GB NVMe + 1TB S3  | **Recommended** - best value |
| **Oracle Cloud Free Tier** | $0/month        | 4 ARM cores, 24GB RAM, 200GB storage | Free option (ARM64)          |
| **Railway**                | $5/month credit | Auto-scaling, managed services       | Easiest deployment           |
| **Render**                 | Free tier       | 512MB RAM, sleeps after 15min        | Hobby/demo projects          |
| **Fly.io**                 | ~$0-5/month     | 256MB-1GB RAM, global edge           | Low-latency needs            |

### Recommended: Hetzner Cloud (x86_64)

Hetzner Cloud offers the best price-to-performance ratio with EU data centers (GDPR compliant), native S3-compatible object storage, and pre-installed Docker support.

#### Hetzner Cloud Resources

| Component          | Hetzner Product                    | Monthly Cost |
| ------------------ | ---------------------------------- | ------------ |
| **VPS**            | CPX21 (3 vCPU, 4GB RAM, 80GB NVMe) | ~€8          |
| **Object Storage** | 1TB S3-compatible                  | €4.90        |
| **Total**          |                                    | **~€13/mo**  |

#### Why Hetzner

- **Pre-installed Docker**: Select "Docker CE" app when creating server
- **Native S3 storage**: No need to run MinIO - use Hetzner Object Storage directly
- **EU data centers**: Germany & Finland (GDPR compliant, ISO27001 certified)
- **20TB traffic included**: More than enough for this app
- **Transparent pricing**: No surprise renewal increases
- **Terraform support**: Matches the IaC approach in `technical-stack.md`

#### Hetzner Setup Steps

**Phase 1: Create Hetzner Cloud Account**

1. Go to https://console.hetzner.cloud
2. Create account and project
3. Add SSH key in Security → SSH Keys

**Phase 2: Create VPS Instance**

1. Hetzner Console → Servers → Add Server
2. Configuration:
   - **Location**: Falkenstein or Nuremberg (Germany) for GDPR
   - **Image**: Apps → Docker CE (Ubuntu-based with Docker pre-installed)
   - **Type**: CPX21 (3 vCPU, 4GB RAM, 80GB NVMe) - ~€8/mo
   - **Networking**: Public IPv4 + IPv6
   - **SSH Key**: Select your key
   - **Name**: social-planner-mcp

**Phase 3: Create Object Storage**

1. Hetzner Console → Object Storage → Create Bucket
2. Configuration:
   - **Name**: planner-media
   - **Location**: Same region as VPS (fsn1 for Falkenstein)
3. Create S3 credentials in Object Storage → S3 Credentials
4. Note the Access Key, Secret Key, and Endpoint URL

**Phase 4: Configure Firewall**

1. Hetzner Console → Firewalls → Create Firewall
2. Inbound rules:
   - SSH (22) from your IP only
   - HTTP (80) from anywhere
   - HTTPS (443) from anywhere
3. Apply to your server

### Tasks

**31.1 Create Production Docker Compose**

Create `docker/docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile.api
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://planner:${DB_PASSWORD}@postgres:5432/planner
      - REDIS_URL=redis://redis:6379
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      # Hetzner Object Storage (S3-compatible)
      - S3_ENDPOINT=${S3_ENDPOINT}
      - S3_REGION=${S3_REGION}
      - S3_BUCKET=${S3_BUCKET}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
    ports:
      - '4000:4000'
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'wget', '--spider', '-q', 'http://localhost:4000/health']
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    build:
      context: ..
      dockerfile: docker/Dockerfile.web
      args:
        - VITE_API_URL=${API_URL}
        - VITE_APP_URL=${APP_URL}
    restart: unless-stopped
    ports:
      - '80:80'
    depends_on:
      - api

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_USER=planner
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=planner
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U planner']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  # Note: MinIO removed - using Hetzner Object Storage instead

volumes:
  postgres_data:
  redis_data:
```

**31.2 Create Production Environment Template**

Create `docker/.env.prod.example`:

```bash
# Database
DB_PASSWORD=your-secure-password-here

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Hetzner Object Storage (S3-compatible)
S3_ENDPOINT=https://fsn1.your-objectstorage.com
S3_REGION=fsn1
S3_BUCKET=planner-media
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# URLs
API_URL=https://api.yourdomain.com
APP_URL=https://app.yourdomain.com
```

**31.3 Hetzner Cloud Deployment Steps**

#### Domain Strategy

Use subdomains of your existing domain:

- `planner.yourdomain.com` — Web app
- `api.planner.yourdomain.com` — API

#### Phase 5: DNS Configuration

Create A records at your domain registrar pointing to Hetzner Cloud public IP:

- `planner.yourdomain.com` → [Hetzner IP]
- `api.planner.yourdomain.com` → [Hetzner IP]

#### Phase 5b: Email DNS Records

**Do this while you're in DNS settings (same session as Phase 5).**

Add these records to enable email sending from your domain:

| Type | Name                | Value                                               | Purpose                          |
| ---- | ------------------- | --------------------------------------------------- | -------------------------------- |
| TXT  | `@`                 | `v=spf1 include:resend.com ~all`                    | SPF - Authorizes Resend to send  |
| TXT  | `resend._domainkey` | `[provided by Resend]`                              | DKIM - Cryptographic signature   |
| TXT  | `_dmarc`            | `v=DMARC1; p=none; rua=mailto:admin@yourdomain.com` | DMARC - Policy for failed checks |

**Steps:**

1. Sign up at https://resend.com
2. Add your domain in Resend dashboard
3. Resend will provide the exact DNS records to add
4. Add records at your domain registrar
5. Click "Verify" in Resend dashboard (may take a few minutes)

> **Note:** Without these records, emails will likely go to spam. Verification can take 5-60 minutes due to DNS propagation.

#### Phase 6: Server Setup

SSH into server (Docker is pre-installed if you selected Docker CE app):

```bash
ssh root@[HETZNER_PUBLIC_IP]

# Verify Docker is installed
docker --version
docker compose version

# Create app directory
mkdir -p /opt/social-planner-mcp
cd /opt/social-planner-mcp

# Clone repository (after GitHub repo is created)
git clone https://github.com/[YOUR_USERNAME]/social-planner-mcp.git .
```

#### Phase 7: Production Environment

Create `/opt/social-planner-mcp/.env` on the server:

```bash
# Domain
DOMAIN=planner.yourdomain.com
ACME_EMAIL=your@email.com

# Database
DB_USER=planner
DB_PASSWORD=[generate: openssl rand -base64 32]
DB_NAME=planner

# Redis
REDIS_PASSWORD=[generate: openssl rand -base64 32]

# JWT Secrets
JWT_ACCESS_SECRET=[generate: openssl rand -base64 64]
JWT_REFRESH_SECRET=[generate: openssl rand -base64 64]

# Hetzner Object Storage (S3-compatible)
S3_ENDPOINT=https://fsn1.your-objectstorage.com
S3_REGION=fsn1
S3_BUCKET=planner-media
S3_ACCESS_KEY=[from Hetzner Console → Object Storage → S3 Credentials]
S3_SECRET_KEY=[from Hetzner Console → Object Storage → S3 Credentials]

# Email - Resend (https://resend.com)
# Option A: Use Resend SMTP (works with existing nodemailer code)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=[your Resend API key starting with re_]
EMAIL_FROM=noreply@yourdomain.com

# Option B: Use Resend SDK (better deliverability tracking - requires code change)
# RESEND_API_KEY=re_xxxxx

# Google OAuth (update with production URLs after deployment)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Microsoft OAuth (optional)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

#### Phase 8: Build and Deploy

```bash
cd /opt/social-planner-mcp

# Build images (x86_64 native on Hetzner)
docker compose -f docker/docker-compose.prod.yml build

# Start services
docker compose -f docker/docker-compose.prod.yml up -d

# Run database migrations
docker compose -f docker/docker-compose.prod.yml exec api \
  npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma

# Seed database (optional - for demo data)
docker compose -f docker/docker-compose.prod.yml exec api \
  node packages/database/prisma/seed.js
```

#### Phase 9: OAuth Configuration

Update Google OAuth at https://console.cloud.google.com/apis/credentials:

1. Edit the Social Planner OAuth client
2. Add production URIs:
   - Authorized JavaScript origins: `https://planner.yourdomain.com`
   - Authorized redirect URIs: `https://api.planner.yourdomain.com/api/auth/google/callback`

#### Phase 10: Verification

Test all endpoints:

- Web app: https://planner.yourdomain.com
- API health: https://api.planner.yourdomain.com/health

#### Hetzner Monthly Costs

| Component                   | Monthly Cost |
| --------------------------- | ------------ |
| CPX21 VPS (3 vCPU, 4GB RAM) | ~€8          |
| Object Storage (1TB)        | €4.90        |
| **Total**                   | **~€13/mo**  |

**31.4 CI/CD Pipeline with GitHub Container Registry**

Automated deployment pipeline that builds images in GitHub Actions, pushes to GitHub Container Registry (GHCR), and deploys to production with zero manual intervention.

**Why this approach:**

| Benefit               | Description                                         |
| --------------------- | --------------------------------------------------- |
| **Fast deploys**      | Pull takes ~10 seconds vs ~2 min build on server    |
| **No build failures** | If CI passes, deploy works (same image)             |
| **Easy rollback**     | Pull previous tag: `docker compose pull api:v1.2.3` |
| **Server stays cool** | No CPU spike during deploys                         |
| **Secure**            | SSH key-based, encrypted secrets, full audit trail  |

---

**31.4.1 Create Deploy SSH Key**

Generate a dedicated SSH key for GitHub Actions (not your personal key):

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-deploy-planner" -f ~/.ssh/planner-deploy -N ""

# Copy public key to server
ssh-copy-id -i ~/.ssh/planner-deploy.pub root@your-server

# View private key (you'll add this to GitHub Secrets)
cat ~/.ssh/planner-deploy
```

**Security note:** This key is separate from your personal SSH key. If compromised, revoke it without affecting your other access.

---

**31.4.2 Configure GitHub Secrets**

Go to GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret

| Secret Name      | Value                                          |
| ---------------- | ---------------------------------------------- |
| `SERVER_HOST`    | Your server IP (e.g., `123.45.67.89`)          |
| `SERVER_SSH_KEY` | Contents of `~/.ssh/planner-deploy` (private) |

**How secrets work:**

- Encrypted at rest, never shown in logs
- Only available to GitHub Actions workflows
- Cannot be read after saving (only overwritten)

---

**31.4.3 Create GitHub Actions Workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  workflow_dispatch: # Allow manual trigger

env:
  REGISTRY: ghcr.io
  API_IMAGE: ghcr.io/${{ github.repository }}/api
  WEB_IMAGE: ghcr.io/${{ github.repository }}/web

jobs:
  build-and-push:
    name: Build and Push Images
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata for API
        id: meta-api
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.API_IMAGE }}
          tags: |
            type=sha,prefix=
            type=raw,value=latest

      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/Dockerfile.api
          push: true
          tags: ${{ steps.meta-api.outputs.tags }}
          labels: ${{ steps.meta-api.outputs.labels }}

      - name: Extract metadata for Web
        id: meta-web
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.WEB_IMAGE }}
          tags: |
            type=sha,prefix=
            type=raw,value=latest

      - name: Build and push Web image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/Dockerfile.web
          push: true
          tags: ${{ steps.meta-web.outputs.tags }}
          labels: ${{ steps.meta-web.outputs.labels }}

  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build-and-push
    environment: production # Optional: requires approval

    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: root
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/social-planner

            # Login to GHCR
            echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin

            # Pull latest images
            docker compose pull api web

            # Restart services with new images
            docker compose up -d api web

            # Clean up old images
            docker image prune -f

            # Verify services are running
            docker compose ps

      - name: Health check
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: root
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            sleep 10
            curl -f http://localhost:3000/health || exit 1
            echo "✅ API health check passed"
```

---

**31.4.4 Update Production Docker Compose**

Update `docker/docker-compose.yml` to use GHCR images instead of building locally:

```yaml
services:
  api:
    image: ghcr.io/raouldevries/social-planner-mcp/api:latest
    # Remove 'build' section - we pull pre-built images now
    restart: unless-stopped
    # ... rest of config stays the same

  web:
    image: ghcr.io/raouldevries/social-planner-mcp/web:latest
    # Remove 'build' section
    restart: unless-stopped
    # ... rest of config stays the same
```

---

**31.4.5 Server-Side GHCR Authentication**

On first deploy, authenticate Docker on the server to pull private images:

```bash
# SSH into server
ssh root@your-server

# Create GitHub Personal Access Token (PAT) with 'read:packages' scope
# Go to: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)

# Login to GHCR on server
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Credentials are saved in ~/.docker/config.json
```

**Alternative:** Make images public in GitHub Packages settings (no auth needed).

---

**31.4.6 Test the Pipeline**

```bash
# Make a small change
echo "# CI/CD test" >> README.md
git add README.md
git commit -m "test: Verify CI/CD pipeline"
git push origin main

# Watch the deployment
# GitHub → Actions → Build and Deploy workflow
```

Expected flow:

1. ✅ Build and Push Images (~2-3 min)
2. ✅ Deploy to Production (~30 sec)
3. ✅ Health check passes

---

**31.4.7 Optional: Deployment Environments**

Add manual approval for production deploys:

1. GitHub → Settings → Environments → New environment
2. Name: `production`
3. Enable "Required reviewers" → Add yourself
4. Now deploys wait for your approval

---

**31.4.8 Optional: Restrict Deploy Key**

For maximum security, restrict what the SSH key can do:

```bash
# On server, edit authorized_keys
nano ~/.ssh/authorized_keys

# Change from:
ssh-ed25519 AAAA... github-deploy-planner

# To (restricts key to only run deploy script):
command="/opt/social-planner/scripts/deploy.sh",no-port-forwarding,no-agent-forwarding,no-X11-forwarding ssh-ed25519 AAAA... github-deploy-planner
```

Create `/opt/social-planner/scripts/deploy.sh`:

```bash
#!/bin/bash
set -e
cd /opt/social-planner
docker compose pull api web
docker compose up -d api web
docker image prune -f
```

```bash
chmod +x /opt/social-planner/scripts/deploy.sh
```

---

**31.4.9 Rollback Procedure**

If a deploy breaks production:

```bash
# SSH into server
ssh root@your-server

# See available image tags
docker images ghcr.io/raouldevries/social-planner-mcp/api

# Pull specific version (use commit SHA from GitHub Actions)
docker compose pull api:abc1234
docker compose up -d api

# Or use previous 'latest' from cache
docker compose up -d --no-pull
```

### Alternative: Oracle Cloud Free Tier (ARM64)

For free hosting with ARM64 architecture:

1. Create Oracle Cloud account at https://cloud.oracle.com
2. Create ARM Compute Instance (VM.Standard.A1.Flex)
   - 4 OCPUs, 24GB RAM available in free tier
   - Select Ubuntu 22.04
3. Install Docker manually: `curl -fsSL https://get.docker.com | sh`
4. Add `platforms: linux/arm64` to docker-compose services
5. All dependencies support ARM64 (bcrypt, sharp, Prisma, etc.)
6. Use MinIO for S3 storage instead of Hetzner Object Storage

**Oracle Free Tier Resources:**

- 4 ARM cores, 24GB RAM, 200GB storage
- 10TB/month outbound network
- Always free (does not expire)

### Acceptance Criteria

- [ ] Production Docker Compose file created
- [ ] Environment template documented
- [ ] Hosting provider selected and configured
- [ ] SSL/TLS configured (via Cloudflare or Let's Encrypt)
- [ ] Database backups configured
- [ ] Monitoring/health checks in place
- [ ] CI/CD deploys to production on main branch
- [ ] Email provider configured (Resend)
- [ ] Email DNS records verified (SPF, DKIM, DMARC)
- [ ] Test email sending works (review requests, ambassador notifications)

> **MCP Tip:** Use the GitHub MCP for deployment workflows. Create PRs, monitor CI status, and manage releases without leaving Claude Code: "Create a PR from feature/ambassador-system to main with a changelog summary"

---

## Step 32: Real-Time Analytics API Integration

### Objective

Implement real-time analytics syncing from LinkedIn and Instagram APIs to replace mock data with actual post performance metrics. This enables the Reports page and per-post analytics views to display real impressions, reach, engagement, likes, comments, shares, and clicks from published social media content.

### Prerequisites

**LinkedIn OAuth Scopes Required:**

| Scope                    | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| `r_organization_social`  | Retrieve organization posts and engagement data |
| `rw_organization_admin`  | Access organization reporting/analytics data    |
| `r_member_postAnalytics` | Retrieve member post analytics (personal posts) |

**Instagram Permissions Required:**

| Permission                  | Purpose                              |
| --------------------------- | ------------------------------------ |
| `instagram_basic`           | Basic profile information            |
| `instagram_manage_insights` | Access to media insights and metrics |

**Existing Infrastructure:**

- `PostChannel.platformPostId` stores the external post ID after publishing ✅
- `PostAnalytics` table schema ready for storing metrics ✅
- Analytics UI (dashboard and per-post views) functional ✅
- LinkedIn and Instagram publishing working in production ✅

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Analytics Sync Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌─────────────────────┐                   │
│  │ Cron Trigger │────▶│ Analytics Sync      │                   │
│  │ (every 6h)   │     │ Service             │                   │
│  └──────────────┘     └─────────┬───────────┘                   │
│                                 │                                │
│         ┌───────────────────────┼───────────────────────┐       │
│         ▼                       ▼                       ▼       │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐ │
│  │ LinkedIn     │       │ Instagram    │       │ (Future)     │ │
│  │ Adapter      │       │ Adapter      │       │ Adapters     │ │
│  └──────┬───────┘       └──────┬───────┘       └──────────────┘ │
│         │                       │                                │
│         ▼                       ▼                                │
│  ┌──────────────┐       ┌──────────────┐                        │
│  │ LinkedIn API │       │ Instagram    │                        │
│  │ /shareStats  │       │ Graph API    │                        │
│  └──────────────┘       └──────────────┘                        │
│                                                                  │
│         └───────────────────────┬───────────────────────┘       │
│                                 ▼                                │
│                    ┌────────────────────────┐                   │
│                    │   PostAnalytics Table  │                   │
│                    │   (Prisma/PostgreSQL)  │                   │
│                    └────────────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tasks

**32.1 Add Analytics Sync Configuration**

Update `apps/api/src/config/index.ts` to add analytics sync settings:

```typescript
// Add to configSchema
// Analytics Sync
ANALYTICS_SYNC_ENABLED: z.coerce.boolean().default(true),
ANALYTICS_SYNC_INTERVAL_HOURS: z.coerce.number().default(6),
ANALYTICS_MIN_POST_AGE_HOURS: z.coerce.number().default(1), // Don't sync posts published less than 1 hour ago
```

**32.1.1 Ensure OAuth Scopes + Token Refresh Support**

Update the social OAuth flow to request the required analytics scopes and persist token expiry/refresh metadata.
Add a refresh path so the sync can recover expired tokens without manual re-auth.

**32.2 Create Analytics Sync Service**

Create `apps/api/src/services/analytics-sync.service.ts`:

```typescript
/**
 * Social Planner - Analytics Sync Service
 *
 * Fetches real analytics data from social media platforms
 * and updates PostAnalytics records.
 */

import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import type { SocialPlatform, PostAnalytics } from '@social-planner/database';

// ============================================
// TYPES
// ============================================

export interface AnalyticsMetrics {
  impressions: number;
  reach: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}

export interface SyncResult {
  channelId: string;
  success: boolean;
  metrics?: AnalyticsMetrics;
  error?: string;
}

interface PlatformAnalyticsAdapter {
  fetchAnalytics(
    platformPostId: string,
    accessToken: string,
    platformAccountId: string
  ): Promise<AnalyticsMetrics | null>;
}

// ============================================
// ADAPTER REGISTRY
// ============================================

const adapters: Record<string, PlatformAnalyticsAdapter> = {};

export function registerAdapter(platform: SocialPlatform, adapter: PlatformAnalyticsAdapter): void {
  adapters[platform] = adapter;
}

// ============================================
// SYNC FUNCTIONS
// ============================================

/**
 * Sync analytics for a single channel
 */
export async function syncChannelAnalytics(channelId: string): Promise<SyncResult> {
  // Implementation in 32.2.1
}

/**
 * Sync analytics for all published posts within a date range
 */
export async function syncAllAnalytics(options?: {
  fromDate?: Date;
  toDate?: Date;
  platform?: SocialPlatform;
}): Promise<{ synced: number; failed: number; skipped: number }> {
  // Implementation in 32.2.2
}

/**
 * Manual trigger for syncing a specific post's analytics
 */
export async function syncPostAnalytics(postId: string): Promise<SyncResult[]> {
  // Implementation in 32.2.3
}
```

**32.2.1 Implement syncChannelAnalytics**

```typescript
export async function syncChannelAnalytics(channelId: string): Promise<SyncResult> {
  try {
    // Get channel with social account and access token
    const channel = await prisma.postChannel.findUnique({
      where: { id: channelId },
      include: {
        socialAccount: {
          select: {
            id: true,
            platform: true,
            accessToken: true,
            platformAccountId: true,
          },
        },
      },
    });

    if (!channel) {
      return { channelId, success: false, error: 'Channel not found' };
    }

    if (!channel.platformPostId) {
      return { channelId, success: false, error: 'No platform post ID - post not published' };
    }

    if (channel.status !== 'PUBLISHED') {
      return { channelId, success: false, error: 'Channel not in PUBLISHED status' };
    }

    const { socialAccount } = channel;
    const adapter = adapters[socialAccount.platform];

    if (!adapter) {
      return {
        channelId,
        success: false,
        error: `No adapter for platform: ${socialAccount.platform}`,
      };
    }

    if (!socialAccount.accessToken) {
      return { channelId, success: false, error: 'Social account access token expired or missing' };
    }

    // Fetch metrics from platform API
    const metrics = await adapter.fetchAnalytics(
      channel.platformPostId,
      socialAccount.accessToken,
      socialAccount.platformAccountId || ''
    );

    if (!metrics) {
      return { channelId, success: false, error: 'Failed to fetch metrics from platform' };
    }

    // Upsert analytics record
    await prisma.postAnalytics.upsert({
      where: { channelId },
      create: {
        channelId,
        impressions: metrics.impressions,
        reach: metrics.reach,
        engagements: metrics.engagements,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        saves: metrics.saves,
        clicks: metrics.clicks,
        syncedAt: new Date(),
        rawData: { source: 'api', platform: socialAccount.platform },
      },
      update: {
        impressions: metrics.impressions,
        reach: metrics.reach,
        engagements: metrics.engagements,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        saves: metrics.saves,
        clicks: metrics.clicks,
        syncedAt: new Date(),
        rawData: { source: 'api', platform: socialAccount.platform },
      },
    });

    logger.info(
      { channelId, platform: socialAccount.platform, metrics },
      'Analytics synced successfully'
    );

    return { channelId, success: true, metrics };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ channelId, error: errorMessage }, 'Failed to sync channel analytics');
    return { channelId, success: false, error: errorMessage };
  }
}
```

**32.2.2 Implement syncAllAnalytics**

```typescript
export async function syncAllAnalytics(options?: {
  fromDate?: Date;
  toDate?: Date;
  platform?: SocialPlatform;
}): Promise<{ synced: number; failed: number; skipped: number }> {
  const { fromDate, toDate, platform } = options || {};

  // Default: sync posts from last 90 days
  const defaultFromDate = new Date();
  defaultFromDate.setDate(defaultFromDate.getDate() - 90);

  // Find all published channels that need syncing
  const channels = await prisma.postChannel.findMany({
    where: {
      status: 'PUBLISHED',
      platformPostId: { not: null },
      publishedAt: {
        gte: fromDate || defaultFromDate,
        ...(toDate && { lte: toDate }),
      },
      ...(platform && {
        socialAccount: { platform },
      }),
    },
    select: { id: true },
  });

  let synced = 0;
  let failed = 0;
  let skipped = 0;

  for (const channel of channels) {
    const result = await syncChannelAnalytics(channel.id);
    if (result.success) {
      synced++;
    } else if (result.error?.includes('No adapter')) {
      skipped++;
    } else {
      failed++;
    }
  }

  logger.info(
    { synced, failed, skipped, total: channels.length },
    'Analytics sync batch completed'
  );

  return { synced, failed, skipped };
}
```

**32.2.3 Add Sync Eligibility + Rate Limit Guards**

- Respect `ANALYTICS_MIN_POST_AGE_HOURS` to avoid syncing fresh posts.
- Skip channels recently synced within the interval window to reduce API usage.
- Add backoff handling for 429/5xx responses and cap per-run channel syncs.

**32.3 Create LinkedIn Analytics Adapter**

Create `apps/api/src/services/adapters/linkedin-analytics.adapter.ts`:

```typescript
/**
 * LinkedIn Analytics Adapter
 *
 * Fetches post analytics using LinkedIn Marketing API.
 *
 * API Documentation:
 * - Share Statistics: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/share-statistics
 * - Organization Share Statistics: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/organizations/organization-share-statistics
 *
 * Required Scopes:
 * - r_organization_social (for organization posts)
 * - rw_organization_admin (for organization analytics)
 * - r_member_postAnalytics (for personal posts)
 */

import { logger } from '../../lib/logger';
import type { AnalyticsMetrics } from '../analytics-sync.service';

// LinkedIn API base URL
const LINKEDIN_API_URL = 'https://api.linkedin.com/rest';

// LinkedIn API version header
const LINKEDIN_VERSION = '202501';

interface LinkedInShareStatistic {
  totalShareStatistics: {
    uniqueImpressionsCount: number;
    shareCount: number;
    likeCount: number;
    commentCount: number;
    clickCount: number;
    engagement: number;
    impressionCount: number;
  };
  share: string; // URN of the share/post
}

interface LinkedInShareStatisticsResponse {
  elements: LinkedInShareStatistic[];
}

export class LinkedInAnalyticsAdapter {
  /**
   * Fetch analytics for a LinkedIn post
   *
   * @param platformPostId - The LinkedIn post URN (e.g., "urn:li:share:123456" or "urn:li:ugcPost:123456")
   * @param accessToken - OAuth access token
   * @param platformAccountId - Organization URN (e.g., "urn:li:organization:123456")
   */
  async fetchAnalytics(
    platformPostId: string,
    accessToken: string,
    platformAccountId: string
  ): Promise<AnalyticsMetrics | null> {
    try {
      logger.debug({ platformPostId, platformAccountId }, 'Fetching LinkedIn analytics');

      // Determine if this is an organization post or personal post
      const isOrganizationPost = platformAccountId.includes('organization');

      let response: Response;

      if (isOrganizationPost) {
        // Use Organization Share Statistics API
        // GET /organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity={orgUrn}&shares=List({shareUrn})
        const params = new URLSearchParams({
          q: 'organizationalEntity',
          organizationalEntity: platformAccountId,
          shares: `List(${platformPostId})`,
        });

        response = await fetch(
          `${LINKEDIN_API_URL}/organizationalEntityShareStatistics?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'X-Restli-Protocol-Version': '2.0.0',
              'LinkedIn-Version': LINKEDIN_VERSION,
            },
          }
        );
      } else {
        // Use Share Statistics API for personal posts
        // GET /shareStatistics?q=shares&shares=List({shareUrn})
        const params = new URLSearchParams({
          q: 'shares',
          shares: `List(${platformPostId})`,
        });

        response = await fetch(`${LINKEDIN_API_URL}/shareStatistics?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': LINKEDIN_VERSION,
          },
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          { status: response.status, error: errorText, platformPostId },
          'LinkedIn analytics API error'
        );
        return null;
      }

      const data = (await response.json()) as LinkedInShareStatisticsResponse;

      if (!data.elements || data.elements.length === 0) {
        logger.warn({ platformPostId }, 'No analytics data returned from LinkedIn');
        return null;
      }

      const stats = data.elements[0].totalShareStatistics;

      const metrics: AnalyticsMetrics = {
        impressions: stats.impressionCount || 0,
        reach: stats.uniqueImpressionsCount || 0,
        engagements:
          (stats.likeCount || 0) +
          (stats.commentCount || 0) +
          (stats.shareCount || 0) +
          (stats.clickCount || 0),
        likes: stats.likeCount || 0,
        comments: stats.commentCount || 0,
        shares: stats.shareCount || 0,
        saves: 0, // LinkedIn doesn't have a saves metric
        clicks: stats.clickCount || 0,
      };

      logger.info({ platformPostId, metrics }, 'LinkedIn analytics fetched successfully');

      return metrics;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ platformPostId, error: errorMessage }, 'Failed to fetch LinkedIn analytics');
      return null;
    }
  }
}
```

**32.4 Create Instagram Analytics Adapter**

Create `apps/api/src/services/adapters/instagram-analytics.adapter.ts`:

```typescript
/**
 * Instagram Analytics Adapter
 *
 * Fetches post insights using Instagram Graph API.
 *
 * API Documentation:
 * - Media Insights: https://developers.facebook.com/docs/instagram-api/reference/ig-media/insights
 *
 * Required Permissions:
 * - instagram_basic
 * - instagram_manage_insights
 *
 * Available Metrics by Media Type:
 * - IMAGE/CAROUSEL: impressions, reach, engagement, saved, video_views (if video in carousel)
 * - VIDEO/REELS: impressions, reach, engagement, saved, video_views, plays
 */

import { logger } from '../../lib/logger';
import type { AnalyticsMetrics } from '../analytics-sync.service';

const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

interface InstagramInsight {
  name: string;
  period: string;
  values: { value: number }[];
  title: string;
  description: string;
  id: string;
}

interface InstagramInsightsResponse {
  data: InstagramInsight[];
  error?: {
    message: string;
    code: number;
  };
}

interface InstagramMediaResponse {
  like_count?: number;
  comments_count?: number;
  media_type?: string;
  error?: {
    message: string;
    code: number;
  };
}

export class InstagramAnalyticsAdapter {
  /**
   * Fetch analytics for an Instagram post
   *
   * @param platformPostId - The Instagram media ID
   * @param accessToken - Facebook/Instagram access token
   * @param platformAccountId - Instagram Business Account ID (not used for insights, but kept for interface consistency)
   */
  async fetchAnalytics(
    platformPostId: string,
    accessToken: string,
    _platformAccountId: string
  ): Promise<AnalyticsMetrics | null> {
    try {
      logger.debug({ platformPostId }, 'Fetching Instagram analytics');

      // First, get basic media info (likes, comments, media_type)
      const mediaResponse = await fetch(
        `${GRAPH_API_URL}/${platformPostId}?fields=like_count,comments_count,media_type&access_token=${accessToken}`
      );

      if (!mediaResponse.ok) {
        const errorData = await mediaResponse.json();
        logger.error(
          { status: mediaResponse.status, error: errorData, platformPostId },
          'Instagram media API error'
        );
        return null;
      }

      const mediaData = (await mediaResponse.json()) as InstagramMediaResponse;

      // Determine metrics based on media type
      // IMAGE and CAROUSEL_ALBUM support: impressions, reach, engagement, saved
      // VIDEO and REELS support: impressions, reach, saved, plays, video_views
      const isVideo = mediaData.media_type === 'VIDEO' || mediaData.media_type === 'REELS';

      const metrics = isVideo
        ? 'impressions,reach,saved,plays'
        : 'impressions,reach,engagement,saved';

      // Fetch insights
      const insightsResponse = await fetch(
        `${GRAPH_API_URL}/${platformPostId}/insights?metric=${metrics}&access_token=${accessToken}`
      );

      if (!insightsResponse.ok) {
        const errorData = await insightsResponse.json();
        logger.error(
          { status: insightsResponse.status, error: errorData, platformPostId },
          'Instagram insights API error'
        );
        // Return partial data from media endpoint if insights fail
        return {
          impressions: 0,
          reach: 0,
          engagements: (mediaData.like_count || 0) + (mediaData.comments_count || 0),
          likes: mediaData.like_count || 0,
          comments: mediaData.comments_count || 0,
          shares: 0, // Instagram doesn't expose shares via API
          saves: 0,
          clicks: 0, // Instagram doesn't expose clicks for organic posts
        };
      }

      const insightsData = (await insightsResponse.json()) as InstagramInsightsResponse;

      // Parse insights into metrics
      const insightsMap: Record<string, number> = {};
      for (const insight of insightsData.data) {
        insightsMap[insight.name] = insight.values[0]?.value || 0;
      }

      const analyticsMetrics: AnalyticsMetrics = {
        impressions: insightsMap.impressions || 0,
        reach: insightsMap.reach || 0,
        engagements:
          (mediaData.like_count || 0) + (mediaData.comments_count || 0) + (insightsMap.saved || 0),
        likes: mediaData.like_count || 0,
        comments: mediaData.comments_count || 0,
        shares: 0, // Instagram doesn't expose shares
        saves: insightsMap.saved || 0,
        clicks: 0, // Instagram doesn't expose clicks for organic posts
      };

      logger.info(
        { platformPostId, metrics: analyticsMetrics },
        'Instagram analytics fetched successfully'
      );

      return analyticsMetrics;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ platformPostId, error: errorMessage }, 'Failed to fetch Instagram analytics');
      return null;
    }
  }
}
```

**32.4.1 Add Media-Type Guardrails**

- Fetch `media_product_type` to distinguish Reels vs regular video.
- Define a fallback mapping when a metric is rejected (e.g., drop `plays`/`video_views`, use `views`).
- Decide how to map `views` vs `impressions` in `PostAnalytics` (e.g., store `views` as `impressions` for IG).

**32.5 Register Adapters and Create Index**

Create `apps/api/src/services/adapters/index.ts`:

```typescript
/**
 * Analytics Adapters Index
 *
 * Registers all platform-specific analytics adapters.
 */

import { registerAdapter } from '../analytics-sync.service';
import { LinkedInAnalyticsAdapter } from './linkedin-analytics.adapter';
import { InstagramAnalyticsAdapter } from './instagram-analytics.adapter';

// Create adapter instances
const linkedInAdapter = new LinkedInAnalyticsAdapter();
const instagramAdapter = new InstagramAnalyticsAdapter();

// Register adapters
export function initializeAnalyticsAdapters(): void {
  registerAdapter('LINKEDIN', linkedInAdapter);
  registerAdapter('INSTAGRAM', instagramAdapter);
}

export { LinkedInAnalyticsAdapter, InstagramAnalyticsAdapter };
```

**32.6 Create Analytics Sync API Routes**

Create `apps/api/src/routes/analytics-sync.ts`:

```typescript
/**
 * Analytics Sync Routes
 *
 * Provides API endpoints for triggering analytics sync operations.
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { syncPostAnalytics, syncAllAnalytics } from '../services/analytics-sync.service';
import { logger } from '../lib/logger';

const router = Router();

/**
 * POST /api/analytics/sync/post/:postId
 * Manually sync analytics for a specific post
 * Requires ADMIN or EDITOR role
 */
router.post(
  '/sync/post/:postId',
  requireAuth,
  requireRole(['ADMIN', 'EDITOR']),
  async (req, res) => {
    try {
      const { postId } = req.params;
      const results = await syncPostAnalytics(postId);

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      res.json({
        message: `Synced ${successful} channel(s), ${failed} failed`,
        results,
      });
    } catch (error) {
      logger.error({ error, postId: req.params.postId }, 'Failed to sync post analytics');
      res.status(500).json({ error: 'Failed to sync analytics' });
    }
  }
);

/**
 * POST /api/analytics/sync/all
 * Trigger a full analytics sync (admin only)
 */
router.post('/sync/all', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { platform, fromDate, toDate } = req.body;

    const result = await syncAllAnalytics({
      platform,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });

    res.json({
      message: `Analytics sync completed: ${result.synced} synced, ${result.failed} failed, ${result.skipped} skipped`,
      ...result,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to sync all analytics');
    res.status(500).json({ error: 'Failed to sync analytics' });
  }
});

export default router;
```

**32.6.1 Register Analytics Sync Routes**

Mount the new router in `apps/api/src/routes/index.ts` (e.g., `/analytics` namespace).

**32.7 Set Up Background Sync Worker**

Option A: Simple Cron Job using node-cron

Update `apps/api/src/server.ts`:

```typescript
import cron from 'node-cron';
import { syncAllAnalytics } from './services/analytics-sync.service';
import { initializeAnalyticsAdapters } from './services/adapters';
import { config } from './config';

// Initialize analytics adapters
initializeAnalyticsAdapters();

// Schedule analytics sync (runs every 6 hours by default)
if (config.ANALYTICS_SYNC_ENABLED) {
  const intervalHours = config.ANALYTICS_SYNC_INTERVAL_HOURS;

  // Cron expression: "0 */6 * * *" = every 6 hours at minute 0
  cron.schedule(`0 */${intervalHours} * * *`, async () => {
    logger.info('Starting scheduled analytics sync');
    try {
      const result = await syncAllAnalytics();
      logger.info({ result }, 'Scheduled analytics sync completed');
    } catch (error) {
      logger.error({ error }, 'Scheduled analytics sync failed');
    }
  });

  logger.info({ intervalHours }, 'Analytics sync scheduler initialized');
}
```

Option B: BullMQ Worker (for more robust job handling)

Create `apps/api/src/workers/analytics-sync.worker.ts`:

```typescript
import { Worker, Queue } from 'bullmq';
import { redis } from '../lib/redis';
import { syncAllAnalytics, syncChannelAnalytics } from '../services/analytics-sync.service';
import { initializeAnalyticsAdapters } from '../services/adapters';
import { logger } from '../lib/logger';

// Initialize adapters
initializeAnalyticsAdapters();

// Create queue
export const analyticsSyncQueue = new Queue('analytics-sync', { connection: redis });

// Create worker
const worker = new Worker(
  'analytics-sync',
  async (job) => {
    switch (job.name) {
      case 'sync-all':
        return await syncAllAnalytics(job.data);
      case 'sync-channel':
        return await syncChannelAnalytics(job.data.channelId);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  { connection: redis }
);

worker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, jobName: job.name, result }, 'Analytics sync job completed');
});

worker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, jobName: job?.name, error }, 'Analytics sync job failed');
});

// Schedule recurring sync job
export async function scheduleAnalyticsSync(): Promise<void> {
  await analyticsSyncQueue.add(
    'sync-all',
    {},
    {
      repeat: {
        pattern: '0 */6 * * *', // Every 6 hours
      },
    }
  );
  logger.info('Scheduled recurring analytics sync job');
}
```

**32.7.1 Wire Worker Process in Runtime**

If using BullMQ, ensure the worker process starts (new service in Docker Compose or reuse `apps/worker` with a dedicated entry).

**32.8 Update Frontend to Show Sync Status**

Update the analytics hooks to include sync functionality:

`apps/web/src/hooks/useAnalytics.ts`:

```typescript
// Add mutation for manual sync
export function useSyncPostAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await api.post(`/analytics/sync/post/${postId}`);
      return response.data;
    },
    onSuccess: (_, postId) => {
      // Invalidate analytics queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: analyticsKeys.post(postId) });
      queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboard() });
    },
  });
}
```

Add sync button to post analytics view:

```tsx
// In PostAnalyticsPanel.tsx
const { mutate: syncAnalytics, isPending: isSyncing } = useSyncPostAnalytics();

<Button variant="outline" size="sm" onClick={() => syncAnalytics(postId)} disabled={isSyncing}>
  {isSyncing ? <Spinner size="sm" /> : <RefreshIcon />}
  Refresh Analytics
</Button>;
```

Add last sync info to the UI (e.g., `syncedAt` and last error, if any) so users can see staleness.

**32.9 Add Dependencies**

```bash
# Add node-cron for scheduled jobs (if using Option A)
npm install node-cron --filter=@social-planner/api
npm install -D @types/node-cron --filter=@social-planner/api
```

**32.10 Update Docker Compose for Production**

Ensure environment variables are passed to the API container:

```yaml
# docker/docker-compose.prod.yml
services:
  api:
    environment:
      - ANALYTICS_SYNC_ENABLED=true
      - ANALYTICS_SYNC_INTERVAL_HOURS=6
```

### Testing Strategy

**32.11 Unit Tests**

Create `apps/api/src/services/analytics-sync.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncChannelAnalytics } from './analytics-sync.service';

describe('Analytics Sync Service', () => {
  describe('syncChannelAnalytics', () => {
    it('should return error if channel not found', async () => {
      const result = await syncChannelAnalytics('non-existent-id');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error if no platformPostId', async () => {
      // Create channel without platformPostId
      const result = await syncChannelAnalytics('channel-without-post-id');
      expect(result.success).toBe(false);
      expect(result.error).toContain('platform post ID');
    });

    it('should successfully sync LinkedIn analytics', async () => {
      // Mock LinkedIn API response
      // Test implementation
    });

    it('should successfully sync Instagram analytics', async () => {
      // Mock Instagram API response
      // Test implementation
    });
  });
});
```

**32.12 Integration Tests**

Create E2E tests for the analytics sync flow:

```typescript
// e2e/analytics-sync.spec.ts
test('manual analytics sync updates post metrics', async ({ page }) => {
  // 1. Navigate to a published post
  // 2. Click sync button
  // 3. Verify metrics are updated
});
```

### Environment Variables Summary

Add to `docker/.env.prod.example`:

```bash
# Analytics Sync Configuration
ANALYTICS_SYNC_ENABLED=true
ANALYTICS_SYNC_INTERVAL_HOURS=6
ANALYTICS_MIN_POST_AGE_HOURS=1
```

### File Structure Summary

```
apps/api/src/
├── config/
│   └── index.ts                          # Add analytics sync config
├── services/
│   ├── analytics-sync.service.ts         # NEW: Main sync service
│   ├── analytics-sync.service.test.ts    # NEW: Unit tests
│   └── adapters/
│       ├── index.ts                      # NEW: Adapter registry
│       ├── linkedin-analytics.adapter.ts # NEW: LinkedIn adapter
│       └── instagram-analytics.adapter.ts# NEW: Instagram adapter
├── routes/
│   ├── analytics-sync.ts                 # NEW: Sync API routes
│   └── index.ts                          # Register new routes
├── workers/
│   └── analytics-sync.worker.ts          # NEW: BullMQ worker (Option B)
└── server.ts                             # Add cron scheduler (Option A)

apps/web/src/
├── hooks/
│   └── useAnalytics.ts                   # Add sync mutation
└── components/
    └── analytics/
        └── PostAnalyticsPanel.tsx        # Add sync button
```

### Acceptance Criteria

- [ ] LinkedIn analytics adapter fetches real metrics from LinkedIn API
- [ ] Instagram analytics adapter fetches real metrics from Instagram Graph API
- [ ] Analytics sync runs automatically every 6 hours (configurable)
- [ ] Manual sync available via API endpoint (`POST /api/analytics/sync/post/:postId`)
- [ ] Admin can trigger full sync via API (`POST /api/analytics/sync/all`)
- [ ] PostAnalytics records are created/updated with real data
- [ ] Analytics dashboard displays real metrics instead of mock data
- [ ] Per-post analytics view shows real engagement data
- [ ] Sync button in UI allows manual refresh of analytics
- [ ] Error handling for expired tokens, rate limits, and API errors
- [ ] Logging captures sync operations for debugging
- [ ] Unit tests cover adapter logic and sync service
- [ ] E2E tests verify full sync flow
- [ ] OAuth tokens/scopes refreshed automatically for analytics sync
- [ ] Sync eligibility rules prevent unnecessary API calls
- [ ] Analytics sync routes registered in API router
- [ ] Worker process runs in deployed environment (if using BullMQ)

### API Rate Limits and Considerations

**LinkedIn:**

- Rate limit: 100 requests per day per application
- Recommendation: Batch requests, sync during off-peak hours
- Token refresh: Access tokens expire after 60 days

**Instagram:**

- Rate limit: 200 requests per hour per user
- Insights are only available for Business/Creator accounts
- Token refresh: Long-lived tokens expire after 60 days
- Account insights vs media insights have different supported metrics
- Starting v22+, `impressions` may be unavailable for certain media types; use `views` and `reach` instead
- Media insights metrics vary by media type (e.g., `plays` not supported for some carousel/image posts)
- Verified `IMAGE` media support: `reach`, `saved`, `likes`, `comments`, `shares`, `total_interactions`, `views`
- Verified `CAROUSEL_ALBUM` media support: `reach`, `saved`, `likes`, `comments`, `shares`, `total_interactions`, `views`
- Verified `VIDEO` media support (includes Reels; distinguish via `media_product_type=REELS`): `reach`, `saved`, `likes`, `comments`, `shares`, `total_interactions`, `views` (no `plays`/`video_views` for this reel)

### Future Enhancements

1. **Historical Analytics Tracking** - Store daily snapshots for trend analysis
2. **Analytics Webhooks** - Real-time updates when platforms support webhooks
3. **Comparative Analytics** - Compare performance across time periods
4. **Export to CSV/PDF** - Download analytics reports
5. **Alert Thresholds** - Notify when posts exceed performance targets

---

## Step 33: Shared Media Library

### Objective

Transform the user-scoped media library into a workspace-shared library where all authenticated users can view and use all uploaded files. Currently, each user only sees their own uploads due to `uploadedById` filtering.

**Scope:** Full sharing without private visibility. All media is accessible to all authenticated users. Only owner or ADMIN can edit/delete.

### Prerequisites

- Media upload and storage working (S3/MinIO) ✅
- MediaAsset, MediaFolder models exist ✅
- User roles (ADMIN, EDITOR, VIEWER) implemented ✅
- Single workspace architecture in place ✅

### Problem Analysis

**Current Issues:**

| Issue                   | Location                                      | Impact                       |
| ----------------------- | --------------------------------------------- | ---------------------------- |
| User-scoped list query  | `media.service.ts:listMedia()`                | Users only see own uploads   |
| User-scoped folders     | `createdById` filter in `listFolders()`       | No shared folder access      |
| No uploader attribution | Response lacks `uploadedBy`                   | Can't tell who uploaded what |
| Query param mismatch    | Frontend sends `type`, API expects `fileType` | Type filter silently fails   |
| No edit/delete checks   | Services don't verify ownership               | Anyone could modify/delete   |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                  Shared Media Library Architecture               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Query Logic (no visibility field needed):                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ listMedia:   No filter (all assets visible)              │   │
│  │ listFolders: No filter (all folders visible)             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Permission Matrix:                                              │
│  ┌─────────────┬────────┬────────┬────────┬────────┐           │
│  │ Action      │ Owner  │ ADMIN  │ EDITOR │ VIEWER │           │
│  ├─────────────┼────────┼────────┼────────┼────────┤           │
│  │ View/Use    │   ✓    │   ✓    │   ✓    │   ✓    │           │
│  │ Upload      │   ✓    │   ✓    │   ✓    │   ✗    │           │
│  │ Edit Meta   │   ✓    │   ✓    │   ✗    │   ✗    │           │
│  │ Delete      │   ✓    │   ✓    │   ✗    │   ✗    │           │
│  └─────────────┴────────┴────────┴────────┴────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tasks

**33.1 Update listMedia Query (Remove User Filter)**

Update `apps/api/src/services/media.service.ts`:

```typescript
export async function listMedia(
  userId: string, // Keep for "My Uploads" filter option
  options?: {
    page?: number;
    perPage?: number;
    folderId?: string | null;
    fileType?: 'image' | 'video';
    search?: string;
    uploadedBy?: 'all' | 'mine'; // Optional filter
  }
): Promise<MediaListResult> {
  const { page = 1, perPage = 20, folderId, fileType, search, uploadedBy = 'all' } = options || {};

  const where: Prisma.MediaAssetWhereInput = {
    // Only filter by user if "mine" is selected
    ...(uploadedBy === 'mine' && { uploadedById: userId }),
    ...(folderId !== undefined && { folderId }),
    ...(fileType && { fileType: { startsWith: fileType } }),
    ...(search && {
      fileName: { contains: search, mode: 'insensitive' },
    }),
  };

  // Include uploader info for attribution
  const assets = await prisma.mediaAsset.findMany({
    where,
    include: {
      uploadedBy: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * perPage,
    take: perPage,
  });

  const total = await prisma.mediaAsset.count({ where });

  return {
    assets: assets.map((asset) => formatMediaAsset(asset, userId)),
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  };
}

// Update formatMediaAsset to include permissions
function formatMediaAsset(asset: MediaAssetWithUploader, currentUserId: string): MediaAssetSummary {
  const isOwner = asset.uploadedById === currentUserId;
  return {
    id: asset.id,
    fileName: asset.fileName,
    fileType: asset.fileType,
    fileSize: Number(asset.fileSize),
    url: getPublicUrl(asset.storagePath),
    thumbnailUrl: asset.thumbnailPath ? getPublicUrl(asset.thumbnailPath) : null,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    createdAt: asset.createdAt.toISOString(),
    uploadedBy: {
      id: asset.uploadedBy.id,
      name: asset.uploadedBy.name,
      avatarUrl: asset.uploadedBy.avatarUrl,
    },
    canEdit: isOwner, // Frontend uses this to show/hide edit button
    canDelete: isOwner, // Frontend uses this to show/hide delete button
  };
}
```

---

**33.2 Update listFolders Query (Remove User Filter)**

```typescript
export async function listFolders(
  userId: string,
  parentId?: string | null
): Promise<MediaFolderSummary[]> {
  const folders = await prisma.mediaFolder.findMany({
    where: {
      parentId: parentId ?? null,
      // No createdById filter - all folders visible
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    createdBy: folder.createdBy,
  }));
}
```

---

**33.3 Add Permission Checks for Edit/Delete**

**33.3.1 Update updateMedia**

```typescript
export async function updateMedia(
  assetId: string,
  userId: string,
  userRole: UserRole,
  data: UpdateMediaAssetRequest
): Promise<MediaAssetDetail> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    throw new AppError('Media asset not found', 404);
  }

  // Permission check: only owner or ADMIN can edit
  const isOwner = asset.uploadedById === userId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new AppError('Only the owner or admin can edit this media asset', 403);
  }

  // Proceed with update...
}
```

**33.3.2 Update deleteMedia**

```typescript
export async function deleteMedia(
  assetId: string,
  userId: string,
  userRole: UserRole
): Promise<void> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    include: { postMedia: true },
  });

  if (!asset) {
    throw new AppError('Media asset not found', 404);
  }

  // Permission check: only owner or ADMIN can delete
  const isOwner = asset.uploadedById === userId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new AppError('Only the owner or admin can delete this media asset', 403);
  }

  if (asset.postMedia.length > 0) {
    throw new AppError('Cannot delete media that is attached to posts', 400);
  }

  // Proceed with deletion...
}
```

---

**33.4 Fix Query Param Mismatch (type vs fileType)**

**Option A: API accepts both (recommended)**

Update `apps/api/src/routes/media.ts`:

```typescript
const listMediaSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  folderId: z.string().uuid().optional(),
  fileType: z.enum(['image', 'video']).optional(),
  type: z.enum(['image', 'video']).optional(), // Alias for fileType
  search: z.string().max(100).optional(),
  uploadedBy: z.enum(['all', 'mine']).optional(),
});

// In handler:
const { fileType, type, ...rest } = req.query;
const effectiveFileType = fileType ?? type; // Accept either
```

**Option B: Frontend sends fileType**

Update `apps/web/src/hooks/useMedia.ts`:

```typescript
// Change from:
if (filters.type) params.set('type', filters.type);

// To:
if (filters.type) params.set('fileType', filters.type);
```

---

**33.5 Update Shared Types**

Update `packages/shared/src/types/api.ts`:

```typescript
export interface UserSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface MediaAssetSummary {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  createdAt: string;
  uploadedBy: UserSummary; // NEW: who uploaded this
  canEdit: boolean; // NEW: can current user edit
  canDelete: boolean; // NEW: can current user delete
}
```

---

**33.6 Update Frontend**

**33.6.1 Update useMedia hook**

```typescript
export interface MediaFilters {
  type?: 'image' | 'video';
  search?: string;
  folderId?: string;
  uploadedBy?: 'all' | 'mine'; // NEW: filter option
  page?: number;
  perPage?: number;
}
```

**33.6.2 Update Media Library page**

```tsx
// Add optional "My Uploads" toggle
<button
  onClick={() => setUploadedByFilter((f) => (f === 'mine' ? 'all' : 'mine'))}
  className={uploadedByFilter === 'mine' ? 'active' : ''}
>
  {uploadedByFilter === 'mine' ? 'Show All' : 'My Uploads'}
</button>
```

**33.6.3 Show uploader attribution on media cards**

```tsx
function MediaCard({ asset }: { asset: MediaAssetSummary }) {
  return (
    <div className="media-card">
      <img src={asset.thumbnailUrl ?? asset.url} alt={asset.fileName} />

      <div className="media-footer">
        <span className="file-size">{formatBytes(asset.fileSize)}</span>

        {/* Show who uploaded */}
        <div className="uploader">
          <img
            src={asset.uploadedBy.avatarUrl ?? '/default-avatar.png'}
            alt=""
            className="w-4 h-4 rounded-full"
          />
          <span className="text-xs text-gray-500">{asset.uploadedBy.name}</span>
        </div>
      </div>

      {/* Conditionally show edit/delete based on permissions */}
      <div className="actions">
        {asset.canEdit && <button>Edit</button>}
        {asset.canDelete && <button>Delete</button>}
      </div>
    </div>
  );
}
```

---

**33.7 Update API Routes to Pass User Role**

Update `apps/api/src/routes/media.ts` to pass `userRole` to service functions:

```typescript
router.patch('/:id', requireEditor, async (req, res, next) => {
  try {
    const asset = await mediaService.updateMedia(
      req.params.id,
      req.user!.id,
      req.user!.role, // Pass role for permission check
      req.body
    );
    res.json(asset);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireEditor, async (req, res, next) => {
  try {
    await mediaService.deleteMedia(
      req.params.id,
      req.user!.id,
      req.user!.role // Pass role for permission check
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
```

---

### Acceptance Criteria

- [ ] All users see all media in the library (not just their own)
- [ ] Uploader name/avatar shown on each media card
- [ ] Optional "My Uploads" filter works correctly
- [ ] Type filter (Images/Videos) works correctly
- [ ] Only owner or ADMIN can edit media metadata
- [ ] Only owner or ADMIN can delete media
- [ ] Edit/Delete buttons hidden for users without permission
- [ ] No schema/migration changes required

### Implementation Priority

| Sub-step                               | Effort | Impact       | Order |
| -------------------------------------- | ------ | ------------ | ----- |
| 33.1 Remove user filter in listMedia   | 10 min | **Critical** | 1     |
| 33.2 Remove user filter in listFolders | 5 min  | High         | 2     |
| 33.4 Fix type/fileType param mismatch  | 5 min  | High         | 3     |
| 33.5 Update shared types               | 10 min | Medium       | 4     |
| 33.6.3 Show uploader in UI             | 15 min | Medium       | 5     |
| 33.3 Add edit/delete permission checks | 20 min | Medium       | 6     |
| 33.7 Pass userRole to services         | 10 min | Medium       | 7     |

**Total estimated time: ~75 minutes**

---

### Testing Checklist

```typescript
describe('Shared Media Library', () => {
  it('User A uploads file, User B sees it in library', async () => {});
  it('Type filter returns only images when type=image', async () => {});
  it('Type filter returns only videos when type=video', async () => {});
  it('uploadedBy=mine filter returns only current user files', async () => {});
  it('Non-owner cannot delete another user file (403)', async () => {});
  it('Non-owner cannot edit another user file (403)', async () => {});
  it('ADMIN can delete any user file', async () => {});
  it('ADMIN can edit any user file', async () => {});
  it('Response includes uploadedBy with name and avatar', async () => {});
  it('Response includes canEdit/canDelete based on ownership', async () => {});
});
```

---

## MCP Usage Reference

Quick reference for MCP server usage throughout implementation:

| Step                  | Primary MCP Servers | Example Prompts                                              |
| --------------------- | ------------------- | ------------------------------------------------------------ |
| 2: Database Schema    | Prisma              | "Check migration status", "Create migration for posts table" |
| 7-10: Backend APIs    | Prisma              | "Open Prisma Studio to verify test data"                     |
| 15-17: Frontend Setup | Context7, Figma     | "Generate the navigation component. use context7"            |
| 18: Calendar          | Context7            | "Create FullCalendar with eventClick handler. use context7"  |
| 19: Post Editor       | Context7, Figma     | "Configure Tiptap with CharacterCount. use context7"         |
| 22: Media Library     | Context7, Figma     | "Generate thumbnail grid with lazy loading. use context7"    |
| 23: Analytics         | Context7            | "Create Recharts bar chart. use context7"                    |
| 27: Testing           | Context7            | "Write Vitest tests for auth service. use context7"          |
| 29: Design System     | Figma               | "Apply Apple-inspired design tokens to components"           |
| 31: Deployment        | GitHub              | "Create PR with deployment checklist"                        |
| 32: Analytics API     | Context7            | "Fetch LinkedIn share statistics API. use context7"          |
| 33: Shared Media      | Prisma, Context7    | "Add visibility column migration", "Update media query"      |

**Combined Workflow Example:**

When implementing a new feature like the ambassador sharing system:

```
1. "Run prisma migrate status to check current schema"
2. "Create a migration adding ambassador_shares table with user and post relations"
3. "Generate the AmbassadorShareCard component from the selected Figma frame. use context7"
4. "Write TanStack Query hooks for ambassador share CRUD operations. use context7"
5. "Create a PR for the ambassador sharing feature, linking to issue #47"
```

This integrated approach keeps all development activities within Claude Code, reducing context-switching and ensuring consistency.

---

## Progress Tracking Template

Maintain a `progress.json` file to track implementation status:

```json
{
  "projectName": "Social Planner",
  "startDate": "2024-12-23",
  "currentStep": 1,
  "totalSteps": 33,
  "steps": {
    "1": {
      "name": "Repository and Development Environment Setup",
      "status": "in_progress",
      "startedAt": "2024-12-23T10:00:00Z",
      "completedAt": null,
      "completedTasks": ["1.1 Initialize Monorepo Structure", "1.2 Configure Package Manager"],
      "remainingTasks": [
        "1.3 Create Base TypeScript Configuration",
        "1.4 Configure Docker Development Environment",
        "1.5 Create Development Setup Script",
        "1.6 Configure ESLint and Prettier",
        "1.7 Configure Husky and lint-staged",
        "1.8 Configure Claude Code MCP Servers"
      ],
      "blockers": [],
      "notes": ""
    }
  },
  "mcpStatus": {
    "prisma": "connected",
    "context7": "connected",
    "figma": "not_configured",
    "github": "connected"
  },
  "lastUpdated": "2024-12-23T14:30:00Z"
}
```

---

_This implementation plan provides a systematic approach to building Social Planner. Each step builds upon previous work, ensuring a stable foundation for subsequent features. Follow the acceptance criteria to verify completion before proceeding to the next step._
