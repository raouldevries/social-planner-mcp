# Social Planner — Application Design Document

**Version:** 1.0  
**Last Updated:** December 2024  
**Status:** Implementation Ready

---

## 1. Executive Summary

### Purpose and Vision

Social Planner is a social media content planning and scheduling application designed to streamline the content creation workflow for marketing teams, social media managers, and brand advocates. The application helps organizations navigate the complex waters of social media presence across Instagram and LinkedIn.

The application serves as a centralized command center where teams can plan, create, collaborate on, schedule, and analyze social media content. By consolidating these functions into a single platform, Social Planner eliminates the inefficiencies of managing multiple tools and disconnected workflows.

### Target Users

The primary users of Social Planner fall into four distinct categories. **Marketing Managers** oversee content strategy and require visibility into all scheduled content, approval workflows, and performance analytics. **Content Creators** spend their days crafting posts and articles, needing intuitive editing tools and clear feedback loops with approvers. **Social Media Coordinators** handle the tactical aspects of scheduling and publishing, requiring efficient bulk operations and timezone management. **Brand Ambassadors** participate in employee advocacy programs, needing simple interfaces to share approved company content through their personal channels.

### Core Value Proposition

Social Planner differentiates itself through three fundamental principles. First, **visual clarity** ensures that users can understand their content calendar at a glance, with color-coded status indicators and intuitive navigation. Second, **collaborative efficiency** reduces the friction in content approval processes through built-in review workflows, comment threads, and real-time notifications. Third, **platform intelligence** provides tailored experiences for Instagram and LinkedIn, respecting each platform's unique requirements while allowing content to be managed from a unified interface.

---

## 2. Feature Specifications

### 2.1 Calendar System

The calendar serves as the primary interface for content planning, providing users with a temporal view of all scheduled and published content.

#### User Stories

As a Marketing Manager, I want to view all scheduled content in a monthly calendar format so that I can ensure consistent posting frequency and identify content gaps. Acceptance criteria include displaying content items as cards on their scheduled dates, showing up to six items per day before collapsing into a "+N more" indicator, and supporting click-to-expand for days with many items.

As a Content Creator, I want to switch between month and week views so that I can choose the level of detail appropriate for my current task. The week view must display full content cards with thumbnails (60x60px minimum), titles (truncated at 45 characters), status badges, scheduled times in the user's timezone, and collaborator avatars (maximum three visible with overflow indicator).

As a Social Media Coordinator, I want to quickly navigate to today's date so that I can review immediately upcoming content. A "Today" button must be persistently visible and scroll the calendar to center on the current date regardless of which view is active.

As a Team Lead, I want to share a read-only version of our content calendar with external stakeholders so that they can review our planned content without accessing the full application. Share links must be generated with unique tokens, support optional password protection, allow setting expiration dates (1 day, 1 week, 1 month, or custom), and provide a clean, branded view without editing controls.

As a User, I want to sync my content calendar with Google Calendar so that I can see scheduled posts alongside my other appointments. The system must generate valid iCal (.ics) files containing all scheduled posts with their titles, scheduled times, and direct links back to Social Planner.

#### Sidebar Filters

The calendar sidebar provides saved filter views that users can switch between with a single click. "All content" displays every item regardless of status. "Published and scheduled" shows only items that have been published or are confirmed for future publication. "Draft content" surfaces work-in-progress items requiring attention. "Social posts only" filters to exclude articles, while "Articles only" shows the inverse. These saved views persist across sessions and apply immediately upon selection.

#### Advanced Filtering

Beyond saved views, users can construct complex filter combinations using multiple criteria. Content type filtering allows selecting posts, articles, or both. Publish status filtering includes Draft, Scheduled, and Published options with multi-select capability. Publish destination filters to Instagram, LinkedIn, or both platforms. Approval status filtering shows items as Pending, Approved, or Rejected. Collaborator filtering allows selecting specific team members to see their assigned content. Language filtering supports multilingual content teams. Custom field filtering enables workspace-specific categorization.

Filters combine using AND logic, and the active filter state displays as removable chips above the calendar. Users can save custom filter combinations as new sidebar views.

### 2.2 Social Media Post Management

Post creation and management forms the core workflow of Social Planner, enabling users to craft platform-optimized content efficiently.

#### Post Creation Interface

The post editor provides a rich text editing experience with platform awareness. The primary text field supports standard formatting including bold, italic, and line breaks. A live character counter displays the current count against platform limits (2,200 for Instagram, 3,000 for LinkedIn), changing color from green to yellow at 80% capacity and red when exceeded. An integrated emoji picker organizes emojis by category with recent-used shortcuts and skin tone selection.

Media attachment supports images (JPEG, PNG, GIF up to 8MB per image) and videos (MP4, MOV up to 100MB, 60 seconds for Instagram, 10 minutes for LinkedIn). Users can attach up to 10 images for Instagram carousel posts or single images/videos for LinkedIn. A drag-and-drop interface allows reordering carousel items, and each attachment displays a thumbnail preview with remove and crop options.

Link attachments automatically fetch OpenGraph metadata to display preview cards showing the destination page's title, description, and image. Users can override the preview text or disable the preview entirely for platforms that support text-only links.

#### Multi-Channel Publishing

Each post can target one or both supported platforms. Connection management allows users to authenticate multiple Instagram Business Accounts and LinkedIn Pages, with each connection displaying the account name, profile image, and last sync status. Per-post channel selection uses toggle switches, and posts must target at least one channel before scheduling.

The "Tailor by Channel" feature enables platform-specific customization from a single base post. When enabled, the editor displays parallel text fields for each selected channel, initialized with the base content but independently editable. Hashtag suggestions differ per platform based on character limits and best practices (Instagram supports up to 30, while 3-5 is optimal for LinkedIn). Mention formatting adjusts automatically—@username for Instagram, @[PersonName] with LinkedIn URN for LinkedIn. Scheduled times can differ per channel, allowing strategic timing for each platform's peak engagement windows.

#### Scheduling Options

Three scheduling modes accommodate different publishing workflows. "Publish Now" immediately queues the post for publication upon saving, with a confirmation dialog warning that the action cannot be undone. "Schedule for Later" opens a date-time picker defaulting to the next optimal posting time (determined by historical engagement data when available). The picker displays times in the user's configured timezone with a clear timezone indicator, and invalid times (past dates, times during platform maintenance windows) are disabled.

All times display in the user's preferred timezone as configured in their profile, with a global timezone selector available for users managing content across regions.

#### Post List Views

Four tabbed views organize posts by status. "Drafts" shows posts in Draft or Rejected status, sorted by last modified date descending. "Scheduled" displays posts approved and scheduled for future publication, sorted by scheduled date ascending. "Published" shows successfully published posts, sorted by publication date descending with engagement metrics summary. "Unpublished" lists posts that failed to publish or were manually unpublished, with error details and retry options.

### 2.3 Article Management

Articles provide long-form content capability that can be referenced within social media posts.

#### Article Editor

The article editor provides rich text editing including headings (H1-H4), bold, italic, underline, strikethrough, bullet lists, numbered lists, blockquotes, code blocks, and hyperlinks. Image insertion supports inline images with alt text and caption fields. A word count displays continuously, and autosave triggers every 30 seconds during active editing with visual confirmation.

Articles maintain two status states: Draft indicates work-in-progress, while Published indicates finalized content available for linking. Status changes require explicit user action with confirmation.

#### Article-Post Linking

When creating a social post, users can attach article references through a searchable article picker. Attached articles display as rich cards within the post showing the article title, excerpt (first 150 characters), and featured image. The article link can be positioned within the post text or appended automatically based on user preference.

#### Article Listing

The article library displays all articles in a sortable, searchable list showing title, status badge, author, created date, and last modified date. Search operates across titles and body content with highlighted result snippets. Bulk actions support status changes and deletion with confirmation.

### 2.4 Post Status Workflow

A state machine governs post lifecycle, ensuring content follows proper review processes before publication.

#### Primary Workflow States

**Draft** represents the initial state for all new posts. Posts remain in Draft until explicitly submitted for approval. Drafts can be edited freely, and there is no publication date requirement.

**Pending Approval** indicates posts awaiting reviewer action. Entry requires at least one channel selected and content meeting minimum requirements (non-empty text or media). Posts in this state trigger notifications to designated approvers. Editing is restricted to approved collaborators.

**Approved** represents posts cleared for scheduling. Approvers can add approval notes, and posts can be edited but require re-approval for substantive changes (text content, media, channels). Minor changes like scheduling time adjustment do not require re-approval.

**Scheduled** indicates posts queued for future publication. Entry requires an approved post with a valid future publication time. A background job monitors scheduled posts and initiates publication at the designated time.

**Published** represents posts successfully sent to platforms. Entry occurs after successful API response from target platforms. Posts store platform-specific post IDs for analytics retrieval and linking.

#### Alternative State Paths

**Pending → Rejected** occurs when approvers decline posts. Rejection requires a reason (minimum 10 characters) which displays to the post author. Rejected posts return to editable state and can be resubmitted after revision. Authors receive notification with rejection reason.

**Published → Unpublished** represents posts removed from platforms. This can occur through manual action via platform management interfaces, automatic action when platforms remove content for policy violations, or API failures during scheduled publishing. Unpublished posts display the reason and timestamp, and can be republished if issues are resolved.

#### Visual Status Indicators

Status badges use consistent colors throughout the application: Draft appears in gray (#6B7280), Pending Approval in amber (#F59E0B), Approved in blue (#3B82F6), Scheduled in purple (#8B5CF6), Published in green (#10B981), Rejected in red (#EF4444), and Unpublished in orange (#F97316).

### 2.5 Ambassador/Team Sharing System

The ambassador system enables employee advocacy by allowing approved content to be shared by team members through their personal social media profiles.

#### Ambassador Groups

Workspace administrators can create ambassador groups representing teams of employees willing to share company content. Groups have a name, description, and member list. Members can be added individually by email or in bulk via CSV import. Each member has an invitation status of Pending, Active, or Declined. Active ambassadors receive a personalized sharing dashboard.

#### Content Queue for Ambassadors

Posts can be marked as "Available for Ambassador Sharing" during creation or afterward. Ambassador-available posts appear in a dedicated queue visible to all active ambassadors. Each ambassador sees the queue filtered to exclude posts they've already shared. Posts display preview content, suggested sharing text, and one-click share options.

#### Sharing Tracking

The system tracks sharing activity including which ambassadors have shared each post, share timestamps, and platform destinations. Aggregate metrics show total shares, unique ambassadors participating, and reach estimates. Individual ambassador dashboards display their sharing history and participation rate.

#### Notification System

Ambassadors receive notifications through email (immediate or daily digest based on preference), in-app notification center, and optional browser push notifications. Notification triggers include new content available for sharing, weekly participation summaries, and recognition for top sharers.

### 2.6 Collaboration Features

Collaboration capabilities enable team-based content workflows with clear communication and accountability.

#### Collaborator Assignment

Posts support multiple collaborators assigned during creation or afterward. Collaborators are selected from workspace members via a searchable dropdown with role indicators. Each collaborator's avatar appears on post cards throughout the interface (maximum three visible, with "+N" overflow). Collaborators receive notifications for post updates, comments, and review requests.

#### Request Workflows

"Request Edit" sends a notification to a specific collaborator asking them to revise the post. The requester can include a message explaining needed changes. The request appears as an action item in the recipient's dashboard. Completion marking clears the request and notifies the requester.

"Request Review" initiates the formal approval workflow. The post moves to Pending Approval status, and designated reviewers receive notification with direct link. Reviewers can Approve or Reject from the notification or post detail view.

#### Shareable Review Links

For external reviewers without system accounts, posts can be shared via review links. Links are generated with unique tokens (UUID v4 format) and support optional password protection (minimum 8 characters, complexity requirements). Link creators set expiration (1 hour to 30 days) and permissions (View Only or View + Comment). External reviewers see a simplified interface with post preview and comment form. Comments from external reviewers are tagged with their provided name and email.

#### Comment Threads

Each post has a comment section supporting threaded conversations. Comments support @mentions of workspace members which trigger notifications. Mentions autocomplete from the workspace member list. Comments display author avatar, name, timestamp (relative format, e.g., "2 hours ago"), and content. Edit and delete options are available to comment authors within 24 hours. Resolved/unresolved status helps track actionable feedback.

#### Activity Log

Every post maintains a chronological activity log capturing creation, status changes, edits (with before/after summaries), comments, assignments, approvals and rejections, and publication events. Log entries display timestamp, actor, and action description. Logs are filterable by activity type and exportable for audit purposes.

### 2.7 Post Analytics

The Reports tab provides performance insights for published content.

#### Engagement Metrics

For each published post, the system retrieves and displays engagement rate calculated as (engagements ÷ impressions × 100), total engagement count (likes, comments, shares combined), impressions count (total times content was displayed), and reach (unique accounts that saw the content, where available).

Metrics display both aggregate totals and per-platform breakdowns. Platform breakdowns use the platform's brand colors (Instagram gradient, LinkedIn blue) for visual clarity.

#### Visualization

Bar charts compare performance across platforms for the same post. Trend lines show performance over time for date range selections. Comparison views allow selecting multiple posts for side-by-side performance analysis.

#### Date Range Selection

Preset ranges include Last 7 days, Last 30 days, Last 90 days, and Year to date. Custom range selection allows any date span within the past two years. Range selection applies to all analytics views consistently.

#### Export Capabilities

"Export Report" generates a PDF containing selected posts' analytics with visualizations. "Print Report" opens system print dialog with print-optimized styling. Export includes a timestamp, generating user, and selected filters for context.

### 2.8 User Management

Multi-tenant architecture supports isolated workspaces with role-based access control.

#### Workspace Concept

A workspace represents an isolated environment containing its own posts, articles, media library, connected social accounts, and member roster. Users can belong to multiple workspaces with different roles in each. Workspace switching is available from the top navigation without re-authentication.

#### User Roles

**Owner** represents a single user per workspace with full administrative control. Owners can perform all actions including workspace deletion, billing management (if applicable), and ownership transfer.

**Admin** users have full content and member management capabilities. They can connect and disconnect social accounts, manage all posts regardless of author, invite and remove members, and assign roles up to Admin level.

**Editor** users have content creation and collaboration capabilities. They can create, edit, and delete their own posts, edit posts where they're assigned as collaborators, submit content for approval, and access the media library.

**Viewer** users have read-only access. They can view the calendar, posts, and analytics but cannot create or edit content. Viewers can participate in comment threads.

#### User Invitation Flow

Admins and Owners initiate invitations by entering an email address and selecting a role. The system sends an email with a unique invitation link valid for 7 days. New users clicking the link are prompted to create an account (or sign in if existing), after which they are automatically added to the workspace with the designated role. Pending invitations are visible in the member management interface with options to resend or revoke.

### 2.9 Media Library

Centralized asset management enables efficient reuse of approved visual content.

#### Upload and Storage

Users upload media via drag-and-drop, file picker, or paste from clipboard. Supported formats include JPEG, PNG, GIF, and WebP for images, and MP4 and MOV for videos. Upload limits are 50MB per image file and 500MB per video file. Upon upload, the system generates thumbnails (150px and 300px variants) and extracts metadata (dimensions, duration, file size).

#### Organization

Tags can be applied to assets for categorization, with workspace-configurable tag taxonomy. Folders provide hierarchical organization with unlimited nesting depth. Assets can exist in multiple folders via references (not copies).

#### Search

Full-text search covers file names, tags, and extracted text (via OCR for images containing text). Filter options include file type, upload date range, uploaded by, and tag.

#### Reuse

When attaching media to posts, users can select from the library via a modal interface. Recent uploads appear first, with search and filter capabilities. Selecting a library asset creates a reference, and changes to the original propagate to all referencing posts (unless explicitly detached).

---

## 3. Data Model

### Entity Relationship Overview

The Social Planner data model centers on the Workspace entity, which serves as the tenant boundary for all other entities. Users connect to Workspaces through a Membership join table that captures role assignments. Posts and Articles represent the primary content entities, with Posts having complex relationships to support multi-channel publishing and collaborative workflows.

### Core Entities

#### Workspace

The Workspace entity represents an isolated tenant environment. Fields include `id` (UUID, primary key), `name` (VARCHAR 100, required), `slug` (VARCHAR 50, unique, URL-safe identifier), `created_at` (TIMESTAMP WITH TIME ZONE), `updated_at` (TIMESTAMP WITH TIME ZONE), and `settings` (JSONB, workspace-specific configuration).

The settings JSON accommodates preferences such as default timezone, enabled features, and branding options without requiring schema migrations for new options.

#### User

The User entity represents authenticated individuals. Fields include `id` (UUID, primary key), `email` (VARCHAR 255, unique, required), `password_hash` (VARCHAR 255, bcrypt hash, nullable for OAuth users), `full_name` (VARCHAR 100, required), `avatar_url` (VARCHAR 500, nullable), `timezone` (VARCHAR 50, default 'UTC'), `email_verified_at` (TIMESTAMP WITH TIME ZONE, nullable), `auth_provider` (ENUM: 'local', 'google', 'microsoft', default 'local'), `auth_provider_id` (VARCHAR 255, nullable, external provider's user ID), `created_at` (TIMESTAMP WITH TIME ZONE), and `last_login_at` (TIMESTAMP WITH TIME ZONE, nullable).

#### Membership

The Membership entity connects Users to Workspaces with role context. Fields include `id` (UUID, primary key), `user_id` (UUID, foreign key to User), `workspace_id` (UUID, foreign key to Workspace), `role` (ENUM: 'owner', 'admin', 'editor', 'viewer'), `invited_by` (UUID, foreign key to User, nullable), `joined_at` (TIMESTAMP WITH TIME ZONE), and `is_active` (BOOLEAN, default true).

A unique constraint on (user_id, workspace_id) prevents duplicate memberships.

#### Social Account

The Social Account entity stores connected platform credentials. Fields include `id` (UUID, primary key), `workspace_id` (UUID, foreign key to Workspace), `platform` (ENUM: 'instagram', 'linkedin'), `platform_account_id` (VARCHAR 100, platform's identifier), `account_name` (VARCHAR 100, display name), `account_type` (VARCHAR 50, e.g., 'business_account', 'page'), `access_token` (TEXT, encrypted), `refresh_token` (TEXT, encrypted, nullable), `token_expires_at` (TIMESTAMP WITH TIME ZONE, nullable), `connected_by` (UUID, foreign key to User), `connected_at` (TIMESTAMP WITH TIME ZONE), and `last_sync_at` (TIMESTAMP WITH TIME ZONE, nullable).

#### Post

The Post entity represents social media content. Fields include `id` (UUID, primary key), `workspace_id` (UUID, foreign key to Workspace), `author_id` (UUID, foreign key to User), `status` (ENUM: 'draft', 'pending_approval', 'approved', 'scheduled', 'published', 'rejected', 'unpublished'), `base_content` (TEXT, primary post text), `created_at` (TIMESTAMP WITH TIME ZONE), `updated_at` (TIMESTAMP WITH TIME ZONE), `scheduled_at` (TIMESTAMP WITH TIME ZONE, nullable), `published_at` (TIMESTAMP WITH TIME ZONE, nullable), `rejection_reason` (TEXT, nullable), `is_ambassador_available` (BOOLEAN, default false), and `article_id` (UUID, foreign key to Article, nullable).

#### Post Channel

The Post Channel entity enables per-platform customization. Fields include `id` (UUID, primary key), `post_id` (UUID, foreign key to Post), `social_account_id` (UUID, foreign key to Social Account), `custom_content` (TEXT, nullable, overrides base_content if set), `scheduled_at` (TIMESTAMP WITH TIME ZONE, nullable, overrides post.scheduled_at if set), `platform_post_id` (VARCHAR 100, nullable, populated after publishing), `published_at` (TIMESTAMP WITH TIME ZONE, nullable), `publish_error` (TEXT, nullable), and `status` (ENUM: 'pending', 'published', 'failed').

A unique constraint on (post_id, social_account_id) prevents duplicate channel entries.

#### Article

The Article entity represents long-form content. Fields include `id` (UUID, primary key), `workspace_id` (UUID, foreign key to Workspace), `author_id` (UUID, foreign key to User), `title` (VARCHAR 200, required), `content` (TEXT, rich text content), `status` (ENUM: 'draft', 'published'), `featured_image_id` (UUID, foreign key to Media Asset, nullable), `created_at` (TIMESTAMP WITH TIME ZONE), `updated_at` (TIMESTAMP WITH TIME ZONE), and `published_at` (TIMESTAMP WITH TIME ZONE, nullable).

#### Media Asset

The Media Asset entity stores uploaded files. Fields include `id` (UUID, primary key), `workspace_id` (UUID, foreign key to Workspace), `uploaded_by` (UUID, foreign key to User), `file_name` (VARCHAR 255, original filename), `file_type` (VARCHAR 50, MIME type), `file_size` (BIGINT, bytes), `storage_path` (VARCHAR 500, cloud storage location), `thumbnail_path` (VARCHAR 500, nullable), `width` (INTEGER, nullable, pixels), `height` (INTEGER, nullable, pixels), `duration` (INTEGER, nullable, seconds for video), `created_at` (TIMESTAMP WITH TIME ZONE), and `metadata` (JSONB, extracted metadata).

#### Post Media

The Post Media join table links Posts to Media Assets. Fields include `id` (UUID, primary key), `post_id` (UUID, foreign key to Post), `media_asset_id` (UUID, foreign key to Media Asset), `position` (INTEGER, display order), and `alt_text` (VARCHAR 500, nullable).

#### Collaborator Assignment

The Collaborator Assignment entity tracks post collaborators. Fields include `id` (UUID, primary key), `post_id` (UUID, foreign key to Post), `user_id` (UUID, foreign key to User), `assigned_by` (UUID, foreign key to User), and `assigned_at` (TIMESTAMP WITH TIME ZONE).

A unique constraint on (post_id, user_id) prevents duplicate assignments.

#### Comment

The Comment entity stores discussion threads. Fields include `id` (UUID, primary key), `post_id` (UUID, foreign key to Post), `author_id` (UUID, foreign key to User, nullable for external), `external_author_name` (VARCHAR 100, nullable), `external_author_email` (VARCHAR 255, nullable), `parent_id` (UUID, self-referential foreign key, nullable), `content` (TEXT, required), `is_resolved` (BOOLEAN, default false), `created_at` (TIMESTAMP WITH TIME ZONE), and `updated_at` (TIMESTAMP WITH TIME ZONE).

#### Activity Log

The Activity Log entity captures audit trail. Fields include `id` (UUID, primary key), `workspace_id` (UUID, foreign key to Workspace), `post_id` (UUID, foreign key to Post, nullable), `article_id` (UUID, foreign key to Article, nullable), `actor_id` (UUID, foreign key to User), `action` (VARCHAR 50, e.g., 'created', 'status_changed', 'published'), `details` (JSONB, action-specific data), and `created_at` (TIMESTAMP WITH TIME ZONE).

#### Ambassador Group

The Ambassador Group entity organizes advocacy teams. Fields include `id` (UUID, primary key), `workspace_id` (UUID, foreign key to Workspace), `name` (VARCHAR 100, required), `description` (TEXT, nullable), and `created_at` (TIMESTAMP WITH TIME ZONE).

#### Ambassador Membership

The Ambassador Membership entity tracks group members. Fields include `id` (UUID, primary key), `group_id` (UUID, foreign key to Ambassador Group), `user_id` (UUID, foreign key to User, nullable), `email` (VARCHAR 255, for non-user ambassadors), `status` (ENUM: 'pending', 'active', 'declined'), `invited_at` (TIMESTAMP WITH TIME ZONE), and `responded_at` (TIMESTAMP WITH TIME ZONE, nullable).

#### Ambassador Share

The Ambassador Share entity records sharing activity. Fields include `id` (UUID, primary key), `post_id` (UUID, foreign key to Post), `ambassador_id` (UUID, foreign key to Ambassador Membership), `platform` (ENUM: 'instagram', 'linkedin'), `shared_at` (TIMESTAMP WITH TIME ZONE), and `share_url` (VARCHAR 500, nullable).

#### Share Link

The Share Link entity manages external sharing. Fields include `id` (UUID, primary key), `post_id` (UUID, foreign key to Post, nullable), `calendar_share` (BOOLEAN, for calendar sharing), `workspace_id` (UUID, foreign key to Workspace), `token` (VARCHAR 100, unique), `password_hash` (VARCHAR 255, nullable), `expires_at` (TIMESTAMP WITH TIME ZONE), `permissions` (ENUM: 'view', 'view_comment'), `created_by` (UUID, foreign key to User), and `created_at` (TIMESTAMP WITH TIME ZONE).

### Entity Relationship Diagram (Textual)

```
Workspace (1) ──────────── (N) Membership (N) ──────────── (1) User
    │                                                           │
    │ (1:N)                                                     │
    ▼                                                           │
Social Account                                                  │
    │                                                           │
    │ (N:1)                                                     │
    ▼                                                           │
Post Channel (N) ──────────── (1) Post ◄───────────────────────┘
                                  │      (author_id)
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
         Post Media          Comment           Activity Log
              │
              │ (N:1)
              ▼
        Media Asset

Post (N) ──────────── (0:1) Article

Post (1) ──────────── (N) Collaborator Assignment ──── (1) User

Ambassador Group (1) ──── (N) Ambassador Membership ──── (1) User

Post (1) ──────────── (N) Ambassador Share ──── (1) Ambassador Membership
```

---

## 4. User Interface Specifications

### 4.1 Global Navigation

The application shell consists of a persistent top navigation bar and context-sensitive sidebar. The top bar spans the full viewport width and contains (from left to right): the Social Planner logo linking to the calendar, a workspace selector dropdown showing the current workspace name with a chevron indicator, a global search input with keyboard shortcut hint (⌘K), a notification bell with unread count badge, and a user avatar opening a profile dropdown.

The profile dropdown includes the user's name and email, links to Account Settings, Workspace Settings (for Admins/Owners), a theme toggle (Light/Dark/System), and a Sign Out option.

### 4.2 Calendar View

The calendar occupies the main content area with a sidebar on the left.

#### Sidebar (240px width)

The sidebar header displays "Views" as a section label. The saved views list follows with items displaying as clickable rows highlighting on hover, with the active view having a filled background. A divider separates the filter section, which shows "Filters" as a label with a "Clear all" link when filters are active. Filter groups expand/collapse, and each group header shows the count of active selections. Filter options render as checkboxes for multi-select categories.

#### Calendar Header

The header row contains navigation controls: a "Today" button with outline style, left/right chevron buttons for previous/next navigation, and a prominent label showing the current month and year (e.g., "December 2024"). The view toggle appears as a segmented control with "Month" and "Week" options. A "Share" button with an icon opens the calendar sharing modal, and a "Sync" button with a calendar icon opens iCal export options.

#### Month View Grid

The grid displays a standard calendar layout with day-of-week headers (Sun–Sat or Mon–Sun based on locale) and six rows to accommodate all dates. Each day cell has a minimum height of 120px with the date number in the top-left corner. Today's date is highlighted with a distinctive background color.

Content items within day cells appear as compact cards showing a 32x32px thumbnail (or platform icon if no media), a title truncated with ellipsis at 25 characters, and a status dot using the standard color scheme. When more than four items exist, a "+N more" link appears at the bottom that expands to a modal showing all items for that day.

#### Week View

Seven columns of equal width display one day each. Each column has a header showing the day name and date number. Content cards within columns show expanded details: a 60x60px thumbnail, a title up to two lines, a status badge with label, a scheduled time, and collaborator avatars (up to three with overflow).

Drag-and-drop functionality allows rescheduling by moving cards between days. Visual feedback includes a dragging state with reduced opacity, drop targets highlighted on hover, and an invalid drop indicator for past dates.

### 4.3 Post Editor

The post editor opens as a modal or dedicated page depending on navigation context.

#### Header Section

The header spans the editor width with a status badge on the left, a title input (placeholder "Untitled Post") that auto-saves, and action buttons on the right: "Save Draft" (secondary), "Request Review" (secondary), and "Schedule" (primary, disabled until valid).

#### Content Section

The main editing area has a rich text toolbar with formatting buttons (bold, italic, link), an emoji picker trigger, and character count display. The text area supports auto-expanding height with a minimum of three lines. Platform tabs (Instagram, LinkedIn) appear when multiple channels are selected, each showing platform-specific character limits and content field.

#### Media Section

A dropzone area shows "Drag media here or click to upload" with supported format hints. Attached media displays as a grid of thumbnails with remove buttons and drag handles for reordering. A "Media Library" button opens the asset selector modal.

#### Channel Section

A list of connected accounts shows toggle switches for each, organized by platform. Selected channels display a checkmark, and hovering shows the account name and connection status.

#### Scheduling Section

Radio buttons offer "Publish Now" and "Schedule" options. When scheduled is selected, a date picker and time picker appear with timezone indicator. Per-channel time customization is available via an "Advanced" expansion.

#### Sidebar (Right)

The collapsible sidebar contains tabs for Settings, Collaborators, and Activity. The Settings tab includes article linking, ambassador availability toggle, and custom fields. The Collaborators tab shows a user selector and assigned list with remove option. The Activity tab displays the activity log in reverse chronological order.

### 4.4 Article Editor

The article editor provides a focused writing environment.

#### Header

The header displays a breadcrumb (Articles > Article Title), a status badge, and action buttons for "Save" and "Publish/Unpublish."

#### Editor

A full-width title input with large typography accommodates article titles. The rich text editor occupies the remaining viewport with a floating toolbar appearing on text selection. The word count displays in the bottom-right corner.

#### Sidebar

A collapsible right sidebar contains featured image selector, SEO preview (title/description truncation), and linked posts listing.

### 4.5 Media Library

The media library operates as both a standalone page and a modal selector.

#### Header

Filter controls span the header: a search input, a type filter dropdown (All, Images, Videos), a date range picker, and upload button.

#### Grid View

Assets display in a masonry-style grid with thumbnails at 200px width. Hovering reveals an overlay with file name, dimensions, and action buttons (Preview, Edit, Delete). Selection mode allows multi-select for bulk actions.

#### Detail Modal

Clicking an asset opens a detail modal showing a full preview, metadata (file name, type, size, dimensions, uploaded by, date), a tag editor, and a folder assignment selector. "Use" and "Cancel" buttons appear in selector mode.

### 4.6 Analytics Dashboard

The analytics interface presents performance data clearly.

#### Header

Controls include a date range selector with presets and custom option, a post selector (All Published or specific posts), and Export/Print buttons.

#### Metrics Cards

A row of cards displays aggregate metrics: Total Impressions, Total Engagements, Average Engagement Rate, and Posts Analyzed.

#### Charts Section

A primary bar chart compares platform performance for the selected posts. A secondary line chart shows metrics over time within the selected date range. Tooltips on hover display exact values.

#### Post Table

Below charts, a sortable table lists individual posts with columns for post title (truncated, linking to post detail), platforms (icons), published date, impressions, engagements, and engagement rate. Column headers allow ascending/descending sorting.

---

## 5. State Machine Diagrams

### 5.1 Post Status State Machine

```
                                    ┌─────────────────┐
                                    │                 │
                                    │     DRAFT       │◄────────────────────┐
                                    │                 │                     │
                                    └────────┬────────┘                     │
                                             │                              │
                                             │ submit_for_review()          │
                                             ▼                              │
                                    ┌─────────────────┐                     │
                              ┌─────│                 │─────┐               │
                              │     │    PENDING      │     │               │
                              │     │    APPROVAL     │     │               │
                              │     │                 │     │               │
                              │     └─────────────────┘     │               │
                              │                             │               │
                    approve() │                             │ reject()      │
                              ▼                             ▼               │
                    ┌─────────────────┐           ┌─────────────────┐       │
                    │                 │           │                 │       │
                    │    APPROVED     │           │    REJECTED     │───────┘
                    │                 │           │                 │
                    └────────┬────────┘           └─────────────────┘
                             │                      revise_and_resubmit()
                             │ schedule()
                             ▼
                    ┌─────────────────┐
                    │                 │
                    │   SCHEDULED     │◄────────────────┐
                    │                 │                 │
                    └────────┬────────┘                 │
                             │                          │
                             │ publish()                │ republish()
                             ▼                          │
                    ┌─────────────────┐                 │
                    │                 │─────────────────┘
                    │   PUBLISHED     │
                    │                 │
                    └────────┬────────┘
                             │
                             │ unpublish()
                             ▼
                    ┌─────────────────┐
                    │                 │
                    │  UNPUBLISHED    │
                    │                 │
                    └─────────────────┘
```

### State Transition Rules

**DRAFT → PENDING_APPROVAL** requires non-empty content (text or media), at least one channel selected, and actor has Editor or higher role. The action creates an activity log entry, sends notification to workspace approvers, and timestamps the submission.

**PENDING_APPROVAL → APPROVED** requires the actor to have Admin or Owner role. The action records the approver, creates an activity log entry, and notifies the post author.

**PENDING_APPROVAL → REJECTED** requires the actor to have Admin or Owner role and a rejection reason (minimum 10 characters). The action records the rejection reason and rejector, creates an activity log entry, and notifies the post author with the reason.

**REJECTED → DRAFT** is triggered automatically when the author edits a rejected post. The action clears the rejection reason and creates an activity log entry.

**APPROVED → SCHEDULED** requires a valid future datetime for at least one channel. The action sets the scheduled_at timestamp, creates an activity log entry, and queues the post for the publication scheduler.

**SCHEDULED → PUBLISHED** is triggered by the system scheduler at the scheduled time. The action calls platform APIs, stores returned post IDs, records actual published timestamp, creates an activity log entry, and triggers analytics sync.

**PUBLISHED → UNPUBLISHED** occurs via manual action, platform removal callback, or API failure during publishing. The action records the unpublish reason, preserves platform post IDs for reference, and creates an activity log entry.

**UNPUBLISHED → SCHEDULED** requires an Admin or Owner to initiate republish and a valid future datetime. The action resets the scheduled time, clears the unpublish reason, and creates an activity log entry.

### 5.2 Article Status State Machine

```
            ┌─────────────────┐
            │                 │
            │     DRAFT       │◄────────────┐
            │                 │             │
            └────────┬────────┘             │
                     │                      │
                     │ publish()            │ unpublish()
                     ▼                      │
            ┌─────────────────┐             │
            │                 │─────────────┘
            │   PUBLISHED     │
            │                 │
            └─────────────────┘
```

Article state transitions are simpler as they don't require approval workflows. Publishing requires a non-empty title and content, and records the published_at timestamp. Unpublishing returns the article to draft and clears the published_at timestamp while preserving all content.

---

## 6. API Endpoints

### 6.1 Authentication Endpoints

#### POST /api/auth/register

Creates a new user account. Request body contains `email` (string, required, valid email format), `password` (string, required, minimum 8 characters), and `full_name` (string, required, 2-100 characters). Response returns 201 Created with user object and JWT token, or 400 Bad Request with validation errors, or 409 Conflict if email exists.

#### POST /api/auth/login

Authenticates a user and returns tokens. Request body contains `email` (string, required) and `password` (string, required). Response returns 200 OK with access_token, refresh_token, and user object, or 401 Unauthorized for invalid credentials.

#### GET /api/auth/google

Initiates Google OAuth 2.0 flow. Redirects to Google's authorization page requesting `email` and `profile` scopes. After authorization, Google redirects to callback URL.

#### GET /api/auth/google/callback

Handles Google OAuth callback. Exchanges authorization code for tokens, creates or links user account based on email, and returns JWT tokens. New users are automatically registered with their Google profile name and avatar.

#### GET /api/auth/microsoft

Initiates Microsoft OAuth 2.0 flow. Redirects to Microsoft's authorization page requesting `openid`, `email`, and `profile` scopes. After authorization, Microsoft redirects to callback URL.

#### GET /api/auth/microsoft/callback

Handles Microsoft OAuth callback. Exchanges authorization code for tokens, creates or links user account based on email, and returns JWT tokens. New users are automatically registered with their Microsoft profile name and avatar.

#### POST /api/auth/refresh

Exchanges refresh token for new access token. Request body contains `refresh_token` (string, required). Response returns 200 OK with new access_token and refresh_token, or 401 Unauthorized if refresh token is invalid or expired.

#### POST /api/auth/logout

Invalidates current session. Request requires Authorization header. Response returns 204 No Content.

### 6.2 Workspace Endpoints

#### GET /api/workspaces

Lists workspaces accessible to authenticated user. Response returns 200 OK with array of workspace objects including id, name, slug, role, and member_count.

#### POST /api/workspaces

Creates a new workspace. Request body contains `name` (string, required, 3-100 characters) and `slug` (string, optional, auto-generated if omitted). Response returns 201 Created with workspace object where creator is assigned Owner role, or 400 Bad Request for validation errors.

#### GET /api/workspaces/:workspace_id

Retrieves workspace details. Response returns 200 OK with workspace object including settings, or 403 Forbidden if not a member, or 404 Not Found.

#### PATCH /api/workspaces/:workspace_id

Updates workspace settings. Requires Admin or Owner role. Request body contains partial workspace object with updatable fields. Response returns 200 OK with updated workspace, or 403 Forbidden.

#### DELETE /api/workspaces/:workspace_id

Deletes workspace and all associated data. Requires Owner role. Response returns 204 No Content, or 403 Forbidden.

### 6.3 Membership Endpoints

#### GET /api/workspaces/:workspace_id/members

Lists workspace members. Response returns 200 OK with array of membership objects including user details and role.

#### POST /api/workspaces/:workspace_id/members/invite

Invites a user to workspace. Requires Admin or Owner role. Request body contains `email` (string, required) and `role` (enum, required: admin/editor/viewer). Response returns 201 Created with invitation object, or 409 Conflict if already a member.

#### PATCH /api/workspaces/:workspace_id/members/:user_id

Updates member role. Requires Admin or Owner role; Admins cannot modify Owners. Request body contains `role` (enum, required). Response returns 200 OK with updated membership, or 403 Forbidden.

#### DELETE /api/workspaces/:workspace_id/members/:user_id

Removes member from workspace. Requires Admin or Owner role; Owner cannot be removed. Response returns 204 No Content, or 403 Forbidden.

### 6.4 Post Endpoints

#### GET /api/workspaces/:workspace_id/posts

Lists posts with filtering and pagination. Query parameters include `status` (comma-separated list), `platform` (instagram/linkedin), `author_id` (UUID), `from_date` (ISO 8601), `to_date` (ISO 8601), `page` (integer, default 1), and `per_page` (integer, default 20, max 100). Response returns 200 OK with paginated array of post summaries.

#### POST /api/workspaces/:workspace_id/posts

Creates a new post. Requires Editor or higher role. Request body contains `base_content` (string, optional), `channels` (array of objects with social_account_id and optional custom_content), `media_ids` (array of UUIDs), `article_id` (UUID, optional), and `is_ambassador_available` (boolean, optional). Response returns 201 Created with post object in Draft status.

#### GET /api/workspaces/:workspace_id/posts/:post_id

Retrieves full post details including channels, media, collaborators, and activity log. Response returns 200 OK with complete post object, or 404 Not Found.

#### PATCH /api/workspaces/:workspace_id/posts/:post_id

Updates post fields. Allowed fields vary by status: Draft allows all fields, Approved/Scheduled allow only scheduling changes. Request body contains partial post object. Response returns 200 OK with updated post, or 403 Forbidden if status prevents edit, or 422 Unprocessable Entity for invalid state transitions.

#### DELETE /api/workspaces/:workspace_id/posts/:post_id

Deletes a post. Requires author or Admin/Owner role. Published posts cannot be deleted (must unpublish first). Response returns 204 No Content, or 403 Forbidden, or 422 Unprocessable Entity if published.

#### POST /api/workspaces/:workspace_id/posts/:post_id/submit

Submits post for approval. Validates content requirements. Response returns 200 OK with updated post in Pending Approval status, or 422 Unprocessable Entity if validation fails.

#### POST /api/workspaces/:workspace_id/posts/:post_id/approve

Approves a pending post. Requires Admin or Owner role. Request body contains optional `notes` (string). Response returns 200 OK with updated post in Approved status, or 403 Forbidden, or 422 Unprocessable Entity if not in Pending status.

#### POST /api/workspaces/:workspace_id/posts/:post_id/reject

Rejects a pending post. Requires Admin or Owner role. Request body contains required `reason` (string, min 10 chars). Response returns 200 OK with updated post in Rejected status and rejection_reason set, or 403 Forbidden, or 422 Unprocessable Entity.

#### POST /api/workspaces/:workspace_id/posts/:post_id/schedule

Schedules an approved post. Request body contains `scheduled_at` (ISO 8601, required for all channels or per-channel). Response returns 200 OK with updated post in Scheduled status, or 422 Unprocessable Entity if not approved or invalid datetime.

#### POST /api/workspaces/:workspace_id/posts/:post_id/publish-now

Immediately publishes an approved post. Response returns 202 Accepted (publication is async), or 422 Unprocessable Entity if not approved.

#### POST /api/workspaces/:workspace_id/posts/:post_id/unpublish

Unpublishes a published post. Requires Admin or Owner role. Request body contains optional `reason` (string). Response returns 200 OK with updated post in Unpublished status, or 422 Unprocessable Entity if not published.

### 6.5 Article Endpoints

#### GET /api/workspaces/:workspace_id/articles

Lists articles with filtering. Query parameters include `status` (draft/published), `search` (string), `page` (integer), and `per_page` (integer). Response returns 200 OK with paginated array of article summaries.

#### POST /api/workspaces/:workspace_id/articles

Creates a new article. Requires Editor or higher role. Request body contains `title` (string, required), `content` (string, optional), and `featured_image_id` (UUID, optional). Response returns 201 Created with article object in Draft status.

#### GET /api/workspaces/:workspace_id/articles/:article_id

Retrieves full article content. Response returns 200 OK with complete article object.

#### PATCH /api/workspaces/:workspace_id/articles/:article_id

Updates article fields. Request body contains partial article object. Response returns 200 OK with updated article.

#### DELETE /api/workspaces/:workspace_id/articles/:article_id

Deletes an article. Unlinks from any associated posts. Response returns 204 No Content.

#### POST /api/workspaces/:workspace_id/articles/:article_id/publish

Publishes a draft article. Response returns 200 OK with updated article in Published status.

#### POST /api/workspaces/:workspace_id/articles/:article_id/unpublish

Unpublishes an article. Response returns 200 OK with updated article in Draft status.

### 6.6 Media Library Endpoints

#### GET /api/workspaces/:workspace_id/media

Lists media assets with filtering. Query parameters include `type` (image/video), `search` (string), `tags` (comma-separated), `from_date` (ISO 8601), `to_date` (ISO 8601), `page` (integer), and `per_page` (integer). Response returns 200 OK with paginated array of media assets with thumbnail URLs.

#### POST /api/workspaces/:workspace_id/media

Uploads new media asset. Request is multipart/form-data with `file` (binary, required), `tags` (array of strings, optional), and `folder_id` (UUID, optional). Response returns 201 Created with media asset object including storage_path and thumbnail_path.

#### GET /api/workspaces/:workspace_id/media/:media_id

Retrieves media asset details. Response returns 200 OK with full media asset object including metadata.

#### PATCH /api/workspaces/:workspace_id/media/:media_id

Updates media asset metadata. Request body contains `tags` (array of strings) and/or `folder_id` (UUID). Response returns 200 OK with updated media asset.

#### DELETE /api/workspaces/:workspace_id/media/:media_id

Deletes media asset. Fails if asset is referenced by posts. Response returns 204 No Content, or 422 Unprocessable Entity if in use.

### 6.7 Social Account Endpoints

#### GET /api/workspaces/:workspace_id/social-accounts

Lists connected social accounts. Response returns 200 OK with array of social account objects (access tokens excluded).

#### POST /api/workspaces/:workspace_id/social-accounts/connect/:platform

Initiates OAuth flow for platform connection. Redirects to platform authorization page with callback URL.

#### GET /api/workspaces/:workspace_id/social-accounts/callback/:platform

OAuth callback handler. Exchanges authorization code for tokens, stores encrypted credentials, and redirects to success page.

#### DELETE /api/workspaces/:workspace_id/social-accounts/:account_id

Disconnects a social account. Revokes platform tokens if possible. Fails if scheduled posts exist for account. Response returns 204 No Content, or 422 Unprocessable Entity if posts scheduled.

### 6.8 Collaboration Endpoints

#### GET /api/workspaces/:workspace_id/posts/:post_id/collaborators

Lists post collaborators. Response returns 200 OK with array of user objects.

#### POST /api/workspaces/:workspace_id/posts/:post_id/collaborators

Adds collaborators to post. Request body contains `user_ids` (array of UUIDs). Response returns 201 Created with updated collaborator list.

#### DELETE /api/workspaces/:workspace_id/posts/:post_id/collaborators/:user_id

Removes collaborator from post. Response returns 204 No Content.

#### GET /api/workspaces/:workspace_id/posts/:post_id/comments

Lists post comments (threaded). Response returns 200 OK with array of comment objects with nested replies.

#### POST /api/workspaces/:workspace_id/posts/:post_id/comments

Adds comment to post. Request body contains `content` (string, required), `parent_id` (UUID, optional for replies), and `mentions` (array of UUIDs, optional). Response returns 201 Created with comment object.

#### PATCH /api/workspaces/:workspace_id/posts/:post_id/comments/:comment_id

Updates comment content or resolved status. Request body contains `content` (string) and/or `is_resolved` (boolean). Response returns 200 OK with updated comment.

#### DELETE /api/workspaces/:workspace_id/posts/:post_id/comments/:comment_id

Deletes comment. Author only within 24 hours. Response returns 204 No Content, or 403 Forbidden.

#### GET /api/workspaces/:workspace_id/posts/:post_id/activity

Lists post activity log. Response returns 200 OK with array of activity log entries.

### 6.9 Share Link Endpoints

#### POST /api/workspaces/:workspace_id/posts/:post_id/share-links

Creates a share link for post. Request body contains `expires_in` (integer, hours), `permissions` (view/view_comment), and `password` (string, optional). Response returns 201 Created with share link object including token.

#### POST /api/workspaces/:workspace_id/share-links/calendar

Creates a calendar share link. Request body contains `expires_in` (integer, hours) and `password` (string, optional). Response returns 201 Created with share link object.

#### GET /api/share/:token

Public endpoint to access shared content. Request body contains optional `password` (string). Response returns 200 OK with post/calendar data, 401 Unauthorized if password required, or 404 Not Found if token invalid/expired.

### 6.10 Ambassador Endpoints

#### GET /api/workspaces/:workspace_id/ambassador-groups

Lists ambassador groups. Requires Admin or Owner role. Response returns 200 OK with array of group objects.

#### POST /api/workspaces/:workspace_id/ambassador-groups

Creates ambassador group. Requires Admin or Owner role. Request body contains `name` (string, required) and `description` (string, optional). Response returns 201 Created with group object.

#### POST /api/workspaces/:workspace_id/ambassador-groups/:group_id/members

Adds members to group. Request body contains `emails` (array of strings). Response returns 201 Created with invitation results.

#### GET /api/ambassador/queue

Gets available posts for authenticated ambassador. Response returns 200 OK with array of shareable posts.

#### POST /api/ambassador/shares

Records ambassador share. Request body contains `post_id` (UUID), `platform` (instagram/linkedin), and `share_url` (string, optional). Response returns 201 Created with share record.

### 6.11 Analytics Endpoints

#### GET /api/workspaces/:workspace_id/posts/:post_id/analytics

Retrieves analytics for a published post. Response returns 200 OK with engagement metrics per platform, or 404 Not Found if not published.

#### GET /api/workspaces/:workspace_id/analytics

Retrieves aggregate analytics. Query parameters include `from_date` (ISO 8601, required), `to_date` (ISO 8601, required), and `platform` (instagram/linkedin, optional). Response returns 200 OK with aggregate metrics and time-series data.

#### POST /api/workspaces/:workspace_id/analytics/export

Generates analytics export. Request body contains `from_date` (ISO 8601), `to_date` (ISO 8601), `post_ids` (array of UUIDs, optional), and `format` (pdf). Response returns 202 Accepted with export job ID.

#### GET /api/workspaces/:workspace_id/analytics/export/:job_id

Retrieves export job status and download URL when complete. Response returns 200 OK with job status and download_url when ready.

### 6.12 Calendar Endpoints

#### GET /api/workspaces/:workspace_id/calendar

Retrieves calendar data for date range. Query parameters include `from` (ISO 8601, required), `to` (ISO 8601, required), `status` (comma-separated), and `platform` (instagram/linkedin). Response returns 200 OK with array of calendar items (post summaries with scheduling info).

#### GET /api/workspaces/:workspace_id/calendar/ical

Generates iCal feed. Query parameters include `token` (string, user-specific feed token). Response returns 200 OK with text/calendar MIME type.

---

## 7. Authentication and Authorization

### 7.1 Authentication Architecture

Social Planner implements JWT-based authentication with refresh token rotation.

#### Token Structure

Access tokens are short-lived (15 minutes) JWTs containing `sub` (user_id), `email`, `iat` (issued at), and `exp` (expiration). Refresh tokens are long-lived (7 days) opaque tokens stored server-side with user association.

#### Session Management

Each login creates a new session record storing user_id, refresh_token_hash, created_at, expires_at, and user_agent. Multiple concurrent sessions are allowed (configurable limit per user). Session invalidation removes the server-side record, preventing refresh.

#### Password Security

Passwords are hashed using bcrypt with cost factor 12. Password requirements include minimum 8 characters, at least one uppercase letter, at least one lowercase letter, at least one number, and at least one special character.

### 7.2 OAuth Integration

Social platform connections use OAuth 2.0 with PKCE where supported.

#### Instagram Business Account

OAuth flow requests `instagram_basic`, `instagram_content_publish`, and `instagram_manage_insights` scopes. Tokens are exchanged for long-lived tokens (60 days) with automatic refresh before expiration.

#### LinkedIn Page

OAuth flow requests `r_liteprofile`, `r_organization_social`, `w_organization_social`, and `r_organization_admin` scopes. Access tokens (60 days) are refreshed proactively.

### 7.3 Role-Based Access Control Matrix

```
┌─────────────────────────────────────┬───────┬───────┬────────┬────────┐
│ Permission                          │ Owner │ Admin │ Editor │ Viewer │
├─────────────────────────────────────┼───────┼───────┼────────┼────────┤
│ Delete workspace                    │   ✓   │       │        │        │
│ Transfer ownership                  │   ✓   │       │        │        │
│ Manage billing                      │   ✓   │       │        │        │
├─────────────────────────────────────┼───────┼───────┼────────┼────────┤
│ Connect/disconnect social accounts  │   ✓   │   ✓   │        │        │
│ Invite members                      │   ✓   │   ✓   │        │        │
│ Remove members                      │   ✓   │   ✓   │        │        │
│ Change member roles                 │   ✓   │   ✓*  │        │        │
│ Approve/reject posts                │   ✓   │   ✓   │        │        │
│ Publish/unpublish posts             │   ✓   │   ✓   │        │        │
│ Manage ambassador groups            │   ✓   │   ✓   │        │        │
├─────────────────────────────────────┼───────┼───────┼────────┼────────┤
│ Create posts                        │   ✓   │   ✓   │   ✓    │        │
│ Edit own posts                      │   ✓   │   ✓   │   ✓    │        │
│ Edit any post                       │   ✓   │   ✓   │   ✓**  │        │
│ Delete own posts                    │   ✓   │   ✓   │   ✓    │        │
│ Delete any post                     │   ✓   │   ✓   │        │        │
│ Submit for approval                 │   ✓   │   ✓   │   ✓    │        │
│ Schedule approved posts             │   ✓   │   ✓   │   ✓    │        │
├─────────────────────────────────────┼───────┼───────┼────────┼────────┤
│ Create articles                     │   ✓   │   ✓   │   ✓    │        │
│ Publish articles                    │   ✓   │   ✓   │   ✓    │        │
├─────────────────────────────────────┼───────┼───────┼────────┼────────┤
│ Upload media                        │   ✓   │   ✓   │   ✓    │        │
│ Delete media                        │   ✓   │   ✓   │   ✓*** │        │
├─────────────────────────────────────┼───────┼───────┼────────┼────────┤
│ View calendar                       │   ✓   │   ✓   │   ✓    │   ✓    │
│ View posts                          │   ✓   │   ✓   │   ✓    │   ✓    │
│ View analytics                      │   ✓   │   ✓   │   ✓    │   ✓    │
│ Add comments                        │   ✓   │   ✓   │   ✓    │   ✓    │
│ Generate share links                │   ✓   │   ✓   │   ✓    │        │
└─────────────────────────────────────┴───────┴───────┴────────┴────────┘

*  Admin cannot modify Owner role or other Admins
** Editor can edit posts where assigned as collaborator
*** Editor can only delete media they uploaded
```

### 7.4 API Security

#### Rate Limiting

Global rate limit is 1000 requests per minute per IP. Authenticated rate limit is 100 requests per minute per user. Write operations are limited to 30 requests per minute. Responses include X-RateLimit-Remaining and X-RateLimit-Reset headers.

#### Request Validation

All request bodies are validated against JSON schemas. UUID parameters are validated for format. Date parameters are validated for ISO 8601 format and logical ranges. String inputs are sanitized to prevent XSS.

#### CORS Configuration

Allowed origins are configured per environment. Credentials are allowed for authenticated requests. Preflight caching is set to 86400 seconds.

---

## 8. Third-Party Integrations

### 8.1 Instagram Graph API Integration

#### API Version and Endpoints

Social Planner targets Instagram Graph API v18.0 (or latest stable). The base URL is `https://graph.facebook.com/v18.0`.

#### Authentication Flow

Users connect Instagram Business Accounts through Facebook Login. The OAuth flow redirects to Facebook, requests Instagram-specific permissions, and returns an authorization code. The code is exchanged for a short-lived token (1 hour), which is immediately exchanged for a long-lived token (60 days). A background job refreshes tokens 7 days before expiration.

#### Content Publishing

Single image posts use the two-step process: create media container (`POST /{ig-user-id}/media` with image_url and caption), then publish (`POST /{ig-user-id}/media_publish` with creation_id). Carousel posts create individual item containers, then a carousel container referencing child items, then publish the carousel.

Video posts require the video to be hosted at a public URL. The container creation polls for processing status before publishing is possible.

#### Rate Limits and Handling

Instagram imposes 200 API calls per user per hour. Publishing is limited to 25 posts per 24-hour period per account. The application implements exponential backoff on 429 responses, queues requests when approaching limits, and prioritizes scheduled publishes over analytics fetches.

#### Analytics Retrieval

Post insights are fetched via `GET /{media-id}/insights` requesting metrics for impressions, reach, engagement, and saved. Account-level insights use `GET /{ig-user-id}/insights` with period and metric parameters. Data is cached for 1 hour to reduce API calls.

### 8.2 LinkedIn Marketing API Integration

#### API Version and Endpoints

Social Planner uses LinkedIn Marketing API v2. The base URL is `https://api.linkedin.com/v2`.

#### Authentication Flow

OAuth 2.0 with authorization code grant flow requests `r_liteprofile`, `r_organization_social`, `w_organization_social`, and `r_organization_admin` scopes. The three-legged OAuth flow returns tokens valid for 60 days. Refresh tokens enable seamless re-authentication.

#### Content Publishing

Text posts use `POST /ugcPosts` with shareCommentary in specificContent. Image posts first upload the asset via `POST /assets?action=registerUpload`, then POST the binary to the returned uploadUrl, then create the post referencing the asset URN. Articles (link shares) include originalUrl and optional thumbnails.

LinkedIn requires the author URN (organization:company-id) and visibility settings (PUBLIC or CONNECTIONS).

#### Rate Limits and Handling

LinkedIn allows 100 API calls per day per user for certain endpoints. POST calls to ugcPosts are limited to 100 per day per organization. The application tracks daily usage per organization, queues non-urgent requests when approaching limits, and provides user feedback when limits prevent immediate action.

#### Analytics Retrieval

Share statistics use `GET /organizationalEntityShareStatistics` with parameters for organization, shares, and timeGranularity. Available metrics include impressions, clicks, likes, comments, and shares. Historical data is limited to 12 months.

### 8.3 Integration Error Handling

#### Retry Strategy

Transient errors (5xx, network timeouts) retry with exponential backoff starting at 1 second, doubling up to 32 seconds maximum with 5 attempts total. Rate limit errors (429) respect the Retry-After header if present, or default to 60 seconds. Authentication errors (401) attempt token refresh once before failing.

#### Failure Modes

When publishing fails, the post moves to Unpublished status with error details stored. Users receive notifications with actionable error messages. A "Retry" button is available when the error is transient. Permanent failures (policy violations, deleted accounts) require user intervention.

#### Webhook Integration

Instagram supports webhooks for account status changes. LinkedIn provides webhook callbacks for asset processing completion. The application registers webhook endpoints during account connection and processes callbacks to update internal state.

---

## 9. Technical Architecture

### 9.1 System Architecture Overview

Social Planner follows a modern three-tier architecture optimized for scalability and maintainability.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT TIER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │   Web Browser   │  │   Mobile App    │  │  External Apps  │          │
│  │   (React SPA)   │  │   (React Native)│  │   (API Clients) │          │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘          │
│           │                    │                    │                    │
└───────────┼────────────────────┼────────────────────┼────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION TIER                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     API Gateway / Load Balancer                   │   │
│  │                        (NGINX / AWS ALB)                          │   │
│  └────────────────────────────────┬─────────────────────────────────┘   │
│                                   │                                      │
│  ┌────────────────────────────────┼─────────────────────────────────┐   │
│  │                         API Servers                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │  Node.js    │  │  Node.js    │  │  Node.js    │  (Horizontal  │   │
│  │  │  Instance 1 │  │  Instance 2 │  │  Instance N │   Scaling)    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  └────────────────────────────────┬─────────────────────────────────┘   │
│                                   │                                      │
│  ┌────────────────────────────────┼─────────────────────────────────┐   │
│  │                     Background Workers                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │  Publisher  │  │  Analytics  │  │  Notifier   │               │   │
│  │  │   Worker    │  │   Worker    │  │   Worker    │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            DATA TIER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │   PostgreSQL    │  │      Redis      │  │    S3 / Blob    │          │
│  │   (Primary DB)  │  │  (Cache/Queue)  │  │    Storage      │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Technology Stack

#### Frontend

React 18 with TypeScript provides the foundation for the single-page application. TanStack Query (React Query) handles server state management and caching. Zustand manages client-side state for UI concerns. Tailwind CSS delivers utility-first styling with a custom design system. React Hook Form with Zod handles form management and validation. FullCalendar provides the calendar component with custom renderers. Tiptap delivers rich text editing for posts and articles.

#### Backend

Node.js 20 LTS with Express.js powers the REST API server. TypeScript ensures type safety across the codebase. Prisma ORM provides type-safe database access and migrations. Bull handles job queues backed by Redis for background processing. Passport.js manages authentication strategies for local and OAuth. Winston provides structured logging with log levels and transports. Jest and Supertest enable API testing.

#### Database

PostgreSQL 15 serves as the primary database with support for JSONB columns for flexible metadata storage. Full-text search via tsvector/tsquery enables content searching. Read replicas distribute query load in production.

#### Caching and Queuing

Redis 7 provides session storage, API response caching, Bull queue backing, and real-time pub/sub for WebSocket events.

#### File Storage

AWS S3 (or compatible object storage) stores media uploads. CloudFront (or equivalent CDN) delivers media with edge caching. Pre-signed URLs enable direct uploads from the client.

#### Infrastructure

Docker containers enable consistent development and deployment. Kubernetes orchestrates production deployment with horizontal pod autoscaling. GitHub Actions automates CI/CD pipelines. Terraform manages infrastructure as code.

### 9.3 Database Schema (SQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TYPE post_status AS ENUM ('draft', 'pending_approval', 'approved',
                                  'scheduled', 'published', 'rejected', 'unpublished');
CREATE TYPE article_status AS ENUM ('draft', 'published');
CREATE TYPE social_platform AS ENUM ('instagram', 'linkedin');
CREATE TYPE channel_status AS ENUM ('pending', 'published', 'failed');
CREATE TYPE share_permission AS ENUM ('view', 'view_comment');
CREATE TYPE ambassador_status AS ENUM ('pending', 'active', 'declined');

-- Core tables
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE auth_provider AS ENUM ('local', 'google', 'microsoft');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),  -- Nullable for OAuth users
    full_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'UTC',
    email_verified_at TIMESTAMPTZ,
    auth_provider auth_provider DEFAULT 'local',
    auth_provider_id VARCHAR(255),  -- External provider's user ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'viewer',
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, workspace_id)
);

CREATE TABLE social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform social_platform NOT NULL,
    platform_account_id VARCHAR(100) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    connected_by UUID NOT NULL REFERENCES users(id),
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    UNIQUE(workspace_id, platform, platform_account_id)
);

CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    width INTEGER,
    height INTEGER,
    duration INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    status article_status DEFAULT 'draft',
    featured_image_id UUID REFERENCES media_assets(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    status post_status DEFAULT 'draft',
    base_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    rejection_reason TEXT,
    is_ambassador_available BOOLEAN DEFAULT false,
    article_id UUID REFERENCES articles(id) ON DELETE SET NULL
);

CREATE TABLE post_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    custom_content TEXT,
    scheduled_at TIMESTAMPTZ,
    platform_post_id VARCHAR(100),
    published_at TIMESTAMPTZ,
    publish_error TEXT,
    status channel_status DEFAULT 'pending',
    UNIQUE(post_id, social_account_id)
);

CREATE TABLE post_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    alt_text VARCHAR(500)
);

CREATE TABLE collaborator_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    external_author_name VARCHAR(100),
    external_author_email VARCHAR(255),
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ambassador_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ambassador_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES ambassador_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    status ambassador_status DEFAULT 'pending',
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

CREATE TABLE ambassador_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    ambassador_id UUID NOT NULL REFERENCES ambassador_memberships(id) ON DELETE CASCADE,
    platform social_platform NOT NULL,
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    share_url VARCHAR(500)
);

CREATE TABLE share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    calendar_share BOOLEAN DEFAULT false,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    token VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    permissions share_permission DEFAULT 'view',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_memberships_workspace ON memberships(workspace_id);
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_posts_workspace_status ON posts(workspace_id, status);
CREATE INDEX idx_posts_scheduled ON posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_post_channels_post ON post_channels(post_id);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_activity_logs_post ON activity_logs(post_id);
CREATE INDEX idx_activity_logs_workspace ON activity_logs(workspace_id, created_at DESC);
CREATE INDEX idx_media_assets_workspace ON media_assets(workspace_id);
CREATE INDEX idx_articles_workspace ON articles(workspace_id);
CREATE INDEX idx_share_links_token ON share_links(token);

-- Full-text search indexes
CREATE INDEX idx_posts_content_search ON posts USING gin(to_tsvector('english', base_content));
CREATE INDEX idx_articles_search ON articles USING gin(
    to_tsvector('english', title || ' ' || COALESCE(content, ''))
);
```

### 9.4 Background Job Architecture

#### Publisher Worker

The publisher worker runs every minute, querying for posts where status is 'scheduled' and scheduled_at is less than or equal to the current time. For each due post, it loads channel configurations, calls the appropriate platform API per channel, updates channel status based on API response, transitions post status to 'published' when all channels succeed, logs activity, and triggers analytics sync job.

#### Analytics Worker

The analytics worker runs hourly, querying for recently published posts (last 7 days) with synced_at null or older than 6 hours. For each post, it fetches metrics from platform APIs, updates cached analytics data, and updates synced_at timestamp. Older posts are synced daily rather than hourly to conserve API quotas.

#### Notification Worker

The notification worker processes the notification queue in real-time. Events include post_submitted, post_approved, post_rejected, post_published, comment_added, collaborator_assigned, and ambassador_content_available. Each event determines recipients based on workspace membership and preferences, renders notification templates per delivery channel (email, in-app, push), and batches email notifications for digest preferences.

---

## 10. Implementation Roadmap

Implementation follows a step-by-step approach documented in detail in `implementation-plan.md`. The project is organized into 28 discrete steps across 6 phases. Each step has clear objectives, tasks, acceptance criteria, and dependencies.

### Phase 1: Foundation (Steps 1-5)

Establishes the technical foundation and core user flows.

- **Step 1:** Repository and development environment setup (monorepo, Docker Compose, MCP servers)
- **Step 2:** Database schema and Prisma setup (all entities, relationships, indexes)
- **Step 3:** Shared types package (TypeScript types, Zod validation schemas, constants)
- **Step 4:** API server foundation (Express setup, middleware, authentication with JWT)
- **Step 5:** Media library backend (S3/MinIO integration, upload handling, thumbnails)

**Phase 1 Deliverables:** Functional authentication, workspace/user management, media upload capability.

### Phase 2: Content Creation (Steps 6-10)

Implements core content creation and management features.

- **Step 6:** Post CRUD API endpoints
- **Step 7:** Article CRUD API endpoints
- **Step 8:** Social account connection (mock APIs for development, OAuth flows)
- **Step 9:** Multi-channel publishing configuration
- **Step 10:** Post status workflow API (state machine, approval/rejection)

**Phase 2 Deliverables:** Complete post and article creation, social account connectivity, multi-channel customization.

### Phase 3: Publishing Workflow (Steps 11-14)

Implements scheduling, publishing, and calendar features.

- **Step 11:** Scheduling API and timezone handling
- **Step 12:** Publisher worker (background jobs, mock platform publishing)
- **Step 13:** Calendar API endpoints
- **Step 14:** Collaboration API (comments, assignments, activity logs)

**Phase 3 Deliverables:** Complete publishing workflow, status management, collaboration backend.

### Phase 4: Frontend Foundation (Steps 15-22)

Builds the React frontend with all UI components.

- **Step 15:** Frontend project setup (React, TanStack Query, routing)
- **Step 16:** Design system and component library
- **Step 17:** Authentication UI and workspace switching
- **Step 18:** Calendar view (FullCalendar integration, month/week views)
- **Step 19:** Post editor (Tiptap, media attachments, channel selection)
- **Step 20:** Post list views (tabbed navigation, filtering)
- **Step 21:** Article editor
- **Step 22:** Media library UI

**Phase 4 Deliverables:** Complete frontend with all core features functional.

### Phase 5: Advanced Features (Steps 23-26)

Adds analytics, ambassador system, and external sharing.

- **Step 23:** Analytics dashboard (charts, metrics, export)
- **Step 24:** User and workspace settings
- **Step 25:** Ambassador system (groups, content queue, tracking)
- **Step 26:** Share links and external review

**Phase 5 Deliverables:** Analytics dashboard, ambassador advocacy system, external sharing.

### Phase 6: Production (Steps 27-28)

Prepares for production deployment.

- **Step 27:** Testing suite (unit, integration, E2E tests)
- **Step 28:** Production deployment (Docker Compose production config, VPS setup, CI/CD)

**Phase 6 Deliverables:** Production-ready application with comprehensive test coverage.

### Risk Mitigation Strategies

API rate limits from Instagram and LinkedIn present the primary integration risk. Mitigation includes implementing aggressive caching, request queuing, and clear user feedback when limits are approached.

OAuth token management complexity requires careful handling. Mitigation includes proactive token refresh, graceful degradation on auth failures, and clear reconnection flows.

Multi-tenant data isolation must be maintained rigorously. Mitigation includes row-level security policies, comprehensive access control tests, and audit logging.

Calendar performance at scale may degrade with many posts. Mitigation includes pagination, date range limiting, and query optimization with appropriate indexes.

---

## Appendix A: Glossary

**Ambassador** refers to an employee or team member participating in advocacy programs by sharing approved company content through personal social media profiles.

**Channel** denotes a specific social media account destination for a post, such as a particular Instagram Business Account or LinkedIn Page.

**Engagement Rate** is calculated as total engagements (likes, comments, shares) divided by impressions, expressed as a percentage.

**Long-lived Token** describes OAuth access tokens with extended validity periods (typically 60 days) that can be refreshed before expiration.

**Workspace** represents an isolated tenant environment containing its own content, members, and social account connections.

---

## Appendix B: API Response Examples

### Post Object Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "workspace_id": "660e8400-e29b-41d4-a716-446655440001",
  "author": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "full_name": "Jane Smith",
    "avatar_url": "https://cdn.example.com/avatars/jane.jpg"
  },
  "status": "scheduled",
  "base_content": "Excited to announce our new product line! 🚀",
  "channels": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "platform": "instagram",
      "account_name": "BrandOfficial",
      "custom_content": "Excited to announce our new product line! 🚀 #NewProduct #Launch",
      "scheduled_at": "2024-12-20T14:00:00Z",
      "status": "pending"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "platform": "linkedin",
      "account_name": "Brand Company Page",
      "custom_content": null,
      "scheduled_at": "2024-12-20T15:00:00Z",
      "status": "pending"
    }
  ],
  "media": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440005",
      "file_name": "product-hero.jpg",
      "thumbnail_url": "https://cdn.example.com/thumbs/product-hero.jpg",
      "position": 0,
      "alt_text": "New product packaging on display"
    }
  ],
  "collaborators": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440006",
      "full_name": "John Doe",
      "avatar_url": "https://cdn.example.com/avatars/john.jpg"
    }
  ],
  "article": null,
  "is_ambassador_available": true,
  "created_at": "2024-12-15T10:30:00Z",
  "updated_at": "2024-12-18T16:45:00Z",
  "scheduled_at": "2024-12-20T14:00:00Z"
}
```

### Analytics Response

```json
{
  "post_id": "550e8400-e29b-41d4-a716-446655440000",
  "date_range": {
    "from": "2024-12-01T00:00:00Z",
    "to": "2024-12-31T23:59:59Z"
  },
  "aggregate": {
    "impressions": 15420,
    "engagements": 892,
    "engagement_rate": 5.78
  },
  "by_platform": {
    "instagram": {
      "impressions": 10200,
      "reach": 8500,
      "engagements": 612,
      "engagement_rate": 6.0,
      "breakdown": {
        "likes": 520,
        "comments": 45,
        "shares": 32,
        "saves": 15
      }
    },
    "linkedin": {
      "impressions": 5220,
      "engagements": 280,
      "engagement_rate": 5.36,
      "breakdown": {
        "likes": 210,
        "comments": 35,
        "shares": 35
      }
    }
  },
  "synced_at": "2024-12-19T12:00:00Z"
}
```

---

## 11. Development Tools — MCP Server Configuration

The development workflow for Social Planner leverages Claude Code with Model Context Protocol (MCP) servers to accelerate implementation. MCP servers provide Claude with direct access to databases, documentation, design files, and version control systems, enabling more accurate code generation and automated workflows.

### 11.1 Required MCP Servers

Four MCP servers are recommended for Social Planner development, listed in priority order.

#### Prisma MCP Server

The Prisma MCP server enables natural language database management, including running migrations, checking migration status, and managing the PostgreSQL schema. This server is essential given the application's complex data model with 20+ entities and numerous relationships.

**Installation:**

```bash
claude mcp add prisma -- npx -y prisma mcp
```

**Capabilities:** The server exposes tools for `migrate-status` (check pending migrations), `migrate-dev` (create and execute migrations), `migrate-reset` (reset database for development), and `Prisma-Studio` (open visual database browser). The server includes built-in safety checks that prevent destructive commands from executing without explicit user confirmation.

**Usage Examples:**

- "Check if there are any pending migrations"
- "Create a migration for adding the notification preferences table"
- "Open Prisma Studio to inspect the posts table"

#### Context7 MCP Server

Context7 provides real-time, version-specific documentation directly in Claude's context window. This eliminates outdated API suggestions for rapidly evolving libraries like React 19, TanStack Query 5, and Tailwind CSS 4. For Social Planner's frontend stack—which includes FullCalendar, Tiptap, and multiple UI libraries—accurate documentation is critical.

**Installation:**

```bash
# Basic installation (rate limited)
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest

# With API key for higher rate limits (recommended)
# Obtain free API key at: https://context7.com/dashboard
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest --api-key YOUR_API_KEY
```

**Capabilities:** The server provides `resolve-library-id` (find Context7-compatible library identifiers) and `get-library-docs` (fetch documentation for specific libraries and topics). Documentation is fetched in real-time from official sources.

**Usage Examples:**

- "Create a FullCalendar month view with drag-and-drop. use context7"
- "Implement optimistic updates with TanStack Query for post approval. use context7"
- "Set up Tiptap with character counting and emoji picker. use context7"

**Recommended Rule:** Add this rule to Claude Code settings so Context7 is invoked automatically:

```
Always use context7 when I need code generation, setup or configuration steps, or library/API documentation.
```

#### Figma MCP Server

The Figma MCP server bridges design and development by providing Claude with direct access to Figma files, enabling accurate translation of designs to React components with proper spacing, colors, and layout. This is particularly valuable for Social Planner's complex UI components: the calendar views, post editor, media library, and analytics dashboard.

**Installation (requires Figma Desktop app):**

1. Open Figma Desktop and update to the latest version
2. Navigate to Settings → Dev Mode → Enable MCP Server
3. The server starts at `http://127.0.0.1:3845/sse`

```bash
claude mcp add figma -- npx -y @anthropic/figma-dev-mode-mcp-server
```

**Alternative (Framelink, works without Figma Desktop):**

```bash
# Obtain Figma API token at: https://www.figma.com/developers/api#access-tokens
claude mcp add figma -e FIGMA_ACCESS_TOKEN=your_token -- npx -y @anthropic/framelink-figma-mcp
```

**Capabilities:** The server provides `get_code` (generate React/Tailwind code from selected frames), `get_variable_defs` (extract design tokens and CSS variables), and `get_code_connect_map` (map Figma components to codebase components).

**Usage Examples:**

- "Convert the selected calendar card component to React with Tailwind"
- "Extract all color tokens from our design system as CSS custom properties"
- "Generate the post editor layout from the Figma frame"

#### GitHub MCP Server

The GitHub MCP server enables direct interaction with repositories, issues, pull requests, and CI/CD workflows from within Claude Code. This streamlines the development workflow by eliminating context switching between terminal and browser.

**Installation:**

1. Create a GitHub Personal Access Token at https://github.com/settings/tokens
2. Select scopes: `repo`, `read:org`, `read:user`

```bash
claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token -- npx -y @modelcontextprotocol/server-github
```

**Capabilities:** The server provides tools for repository management (search, clone, create), issue tracking (create, update, search, comment), pull request operations (create, review, merge), and workflow monitoring (list runs, check status).

**Usage Examples:**

- "Create a PR from feature/calendar-drag-drop with a summary of changes"
- "Find all open issues labeled 'bug' in the frontend"
- "Check the status of the CI workflow on the main branch"

### 11.2 Configuration Reference

#### Quick Setup Commands

```bash
# Navigate to project directory
cd /path/to/social-planner-mcp

# Install all four MCP servers
claude mcp add prisma -- npx -y prisma mcp
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
claude mcp add figma -- npx -y @anthropic/figma-dev-mode-mcp-server
claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxx -- npx -y @modelcontextprotocol/server-github

# Verify installation
claude mcp list
```

#### Scope Options

MCP servers can be configured at different scopes depending on team needs.

**Project scope (default):** Server configuration stored in `.mcp.json` within the project directory. Recommended for team collaboration as the configuration can be committed to version control (excluding sensitive tokens).

```bash
claude mcp add --scope project prisma -- npx -y prisma mcp
```

**User scope:** Server configuration stored in `~/.claude.json`. Available across all projects for the current user.

```bash
claude mcp add --scope user prisma -- npx -y prisma mcp
```

#### Environment Variables

For team environments, sensitive tokens should be loaded from environment variables rather than hardcoded in commands.

```bash
# Set environment variables in shell profile (.zshrc, .bashrc)
export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token
export FIGMA_ACCESS_TOKEN=figd_your_token
export CONTEXT7_API_KEY=your_api_key

# Reference in MCP commands
claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN -- npx -y @modelcontextprotocol/server-github
```

#### Manual Configuration File

For complex setups, directly edit the configuration file at `~/.claude.json` or project `.mcp.json`:

```json
{
  "mcpServers": {
    "prisma": {
      "command": "npx",
      "args": ["-y", "prisma", "mcp"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest", "--api-key", "YOUR_API_KEY"]
    },
    "figma": {
      "command": "npx",
      "args": ["-y", "@anthropic/figma-dev-mode-mcp-server"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token"
      }
    }
  }
}
```

### 11.3 Verification and Troubleshooting

#### Verifying Server Status

After configuration, verify all servers are connected:

```bash
# List configured servers
claude mcp list

# Start Claude Code
claude

# Inside Claude Code, check server status
/mcp
```

All four servers should display as `connected`.

#### Common Issues

**Server not connecting:** Remove and re-add the server.

```bash
claude mcp remove prisma
claude mcp add prisma -- npx -y prisma mcp
```

**Permission errors with Prisma:** Ensure the database is running and `DATABASE_URL` environment variable is set correctly.

**Figma server timeout:** Verify Figma Desktop is running with MCP server enabled in Dev Mode settings.

**GitHub authentication failures:** Regenerate the Personal Access Token and ensure required scopes are selected.

**Context7 rate limiting:** Register for a free API key at context7.com/dashboard for higher limits.

### 11.4 Development Workflow Integration

The MCP servers integrate into the Social Planner development workflow as follows:

**Database changes:** When modifying the Prisma schema, use the Prisma MCP to create migrations, verify status, and reset development databases as needed. Claude can directly execute migration commands without leaving the code context.

**Frontend development:** When implementing UI components, invoke Context7 for accurate library documentation. For components with existing Figma designs, use the Figma MCP to extract design specifications and generate initial React/Tailwind code.

**Version control:** Use the GitHub MCP to create branches, commit changes, open pull requests, and manage issues without switching to browser or separate terminal windows.

**Example combined workflow:**

```
1. "Check the Prisma migration status"
2. "Create a migration for adding post_reactions table"
3. "Generate a React component for the reaction button based on the Figma selection. use context7"
4. "Create a PR with these changes and link it to issue #42"
```

---

_Document generated for Social Planner development initiative. For questions or clarifications, contact the technical architecture team._
