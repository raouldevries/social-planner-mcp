# Plan: LinkedIn Image Publishing Support

> Enable the LinkedIn adapter to upload and attach images to posts, supporting both single-image and multi-image publishing

| Field   | Value                                                                                    |
| ------- | ---------------------------------------------------------------------------------------- |
| Created | 2026-03-05                                                                               |
| Status  | Planning                                                                                 |
| Target  | Add image upload and attachment support to the LinkedIn adapter in the publisher service |

---

## Skills & Tools

### Default Skills

| Skill            | Role                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `/audit-loop`    | Each step = one audit-loop cycle (test-first, implement, self-audit, codex audit, commit) |
| `/handover`      | Session transitions — create handover doc at session boundaries                           |
| `/code-reviewer` | Quality gate before commits — review against audit files below                            |

### Audit References

| File                                         | Purpose                                        |
| -------------------------------------------- | ---------------------------------------------- |
| `CLAUDE.md`                                  | Project conventions and code patterns          |
| `apps/api/src/services/publisher.service.ts` | Existing adapter pattern (Instagram reference) |

---

## Implementation Workflow

### Per-Step Flowchart

```
┌─────────────────────────────────────────────────────────────┐
│  1. READ PLAN                                               │
│     - Review the current step requirements                  │
│     - Understand acceptance criteria and sub-steps          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. IMPLEMENT                                               │
│     - Use `/audit-loop` Phase 1 (test-first)               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. AUDIT                                                   │
│     - `/code-reviewer` against CLAUDE.md patterns           │
│     - TypeScript compilation check                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. UPDATE PROGRESS                                         │
│     - Mark step as completed in Progress Tracking section   │
│     - Add notes about any deviations or learnings           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. ASK FOR CONFIRMATION                                    │
│     - Show summary of completed work                        │
│     - Wait for explicit approval before continuing          │
└─────────────────────────────────────────────────────────────┘
```

### Quality Gates

- [ ] `/audit-loop` was used for implementation (test-first)
- [ ] `/code-reviewer` audit passed
- [ ] Acceptance criteria from the step are met
- [ ] No regressions introduced
- [ ] TypeScript compiles cleanly (`npm run build`)
- [ ] Existing tests pass (`npm run test --filter=@social-planner/api`)

---

## Context

### Current State

The publisher service (`apps/api/src/services/publisher.service.ts`) uses an adapter pattern with a `PlatformAdapter` interface. The `InstagramAdapter` is fully implemented with media support (single image, carousel, video). The `LinkedInAdapter` currently only publishes text posts — it receives `mediaUrls` in the `PublishRequest` but ignores them entirely.

The media pipeline works correctly up to the adapter boundary:

- `channel.service.ts` builds `mediaUrls: string[]` from `post.media[].mediaAsset.storagePath` via `getPublicUrl()`
- `scheduler.service.ts` passes `mediaUrls` to the publish job
- The `processPublishingJob` function passes `mediaUrls` to `publisherService.publish()`
- LinkedIn adapter destructures only `{ content, accessToken, platformAccountId }`, ignoring `mediaUrls`

### Key Patterns Found

- **HTTP client:** Native `fetch()` throughout — no axios or third-party HTTP library
- **Image URL strategy:** Instagram uses public URLs passed directly to the API. LinkedIn requires a different approach: binary upload to a presigned URL
- **S3 utilities:** `apps/api/src/lib/s3.ts` has `downloadFile(key): Buffer` and `getPublicUrl(key): string`
- **LinkedIn API headers:** Already established in `apps/api/src/services/adapters/linkedin-analytics.adapter.ts`:
  ```typescript
  Authorization: `Bearer ${accessToken}`
  'X-Restli-Protocol-Version': '2.0.0'
  'LinkedIn-Version': '202601'
  ```
- **LinkedIn Version:** Publisher uses `'202601'`, analytics adapter uses `'202501'` — should align to latest
- **Author URN:** Already handled — org URNs passed as-is, personal profiles formatted as `urn:li:person:{id}`
- **Error handling:** Returns `PublishResult` with `{ success: false, error: string }` — no exceptions thrown from adapters
- **Logging:** Pino logger with structured context objects, redacts `accessToken`
- **Test infrastructure:** Vitest with `vi.mock()`, global setup in `apps/api/src/test/setup.ts`, no publisher tests exist yet

### Critical Gaps

1. **No image upload code** — LinkedIn requires a 3-step flow: initializeUpload → PUT binary → create post with image URN
2. **No binary download** — Need to fetch image binary from public URL or S3 to upload to LinkedIn
3. **No publisher tests** — No test file exists; need to mock `fetch()` for LinkedIn API calls
4. **Single vs multi-image** — LinkedIn uses different content structures: `content.media` (single) vs `content.multiImage.images` (2-20 images)

### LinkedIn API Flow (from official docs)

**Single image post:**

1. `POST /rest/images?action=initializeUpload` with `{ initializeUploadRequest: { owner: authorUrn } }` → returns `{ value: { uploadUrl, image: "urn:li:image:..." } }`
2. `PUT {uploadUrl}` with binary image body + `Authorization: Bearer` header → 201
3. `POST /rest/posts` with `content: { media: { id: "urn:li:image:...", altText: "..." } }` → 201

**Multi-image post (2-20 images):**

1. Repeat step 1-2 for each image
2. `POST /rest/posts` with `content: { multiImage: { images: [{ id: "urn:li:image:...", altText: "..." }, ...] } }` → 201

**Supported formats:** JPG, PNG, GIF (up to 250 frames). Max pixel count: 36,152,320.

---

## Phase 1: LinkedIn Image Upload Infrastructure

### Step 1.1: Add image upload methods to LinkedInAdapter

**Complexity:** M

**Acceptance criteria:**

- [ ] `LinkedInAdapter` has a private `uploadImage(imageUrl, accessToken, ownerUrn)` method that: (a) fetches the image binary from the URL, (b) calls LinkedIn's `initializeUpload` endpoint, (c) uploads binary to the returned `uploadUrl`, (d) returns the image URN string
- [ ] Method handles errors at each step (fetch fail, init fail, upload fail) and returns descriptive error messages
- [ ] Logger calls include structured context (`{ platform: 'linkedin', imageUrl, step }`)

**Sub-steps:**

a. Add `uploadImage` private method to `LinkedInAdapter` that accepts `(imageUrl: string, accessToken: string, ownerUrn: string): Promise<{ success: boolean; imageUrn?: string; error?: string }>`
b. Implement image binary fetching: `fetch(imageUrl)` → `response.arrayBuffer()` → `Buffer`
c. Implement `initializeUpload`: `POST https://api.linkedin.com/rest/images?action=initializeUpload` with body `{ initializeUploadRequest: { owner: ownerUrn } }` — extract `value.uploadUrl` and `value.image` from response
d. Implement binary upload: `PUT {uploadUrl}` with `Authorization: Bearer`, `Content-Type: application/octet-stream`, body = image buffer
e. Return `{ success: true, imageUrn: value.image }` on success, or `{ success: false, error: ... }` on failure

**Files:**

- `apps/api/src/services/publisher.service.ts`

**Dependencies:** None

---

### Step 1.2: Update publish method for single-image posts

**Complexity:** S

**Acceptance criteria:**

- [ ] When `mediaUrls` has exactly 1 entry, the adapter uploads the image and creates a post with `content.media` containing the image URN
- [ ] When `mediaUrls` is empty or undefined, the adapter publishes text-only as before (no regression)
- [ ] The `postBody` includes `content: { media: { id: imageUrn } }` for single-image posts

**Sub-steps:**

a. Extract `mediaUrls` from the `PublishRequest` in the `publish` method (currently ignored)
b. Add branching logic: if `mediaUrls?.length === 1`, call `uploadImage`, then include `content.media` in the post body
c. If `uploadImage` fails, return early with the upload error
d. Verify text-only path is unaffected when no media provided

**Files:**

- `apps/api/src/services/publisher.service.ts`

**Dependencies:** Step 1.1

---

### Step 1.3: Add multi-image post support

**Complexity:** M

**Acceptance criteria:**

- [ ] When `mediaUrls` has 2+ entries, all images are uploaded and the post is created with `content.multiImage.images` array
- [ ] Image upload is sequential (to respect rate limits) with early exit on first failure
- [ ] Maximum of 20 images enforced (LinkedIn API limit)
- [ ] Logging includes count of images being uploaded

**Sub-steps:**

a. Add branching for `mediaUrls.length >= 2`: upload all images sequentially, collecting URNs
b. Cap at 20 images (LinkedIn limit) — log a warning and truncate if exceeded
c. Build post body with `content: { multiImage: { images: imageUrns.map(urn => ({ id: urn })) } }`
d. If any upload fails, return early with error indicating which image failed

**Files:**

- `apps/api/src/services/publisher.service.ts`

**Dependencies:** Step 1.1

---

## Phase 2: Testing

### Step 2.1: Add publisher service tests for LinkedIn image flow

**Complexity:** M

**Acceptance criteria:**

- [ ] Test file `apps/api/src/services/publisher.service.test.ts` exists with tests covering:
  - LinkedIn text-only post (existing behavior)
  - LinkedIn single-image post (initializeUpload + binary upload + post creation)
  - LinkedIn multi-image post (multiple uploads + multiImage content)
  - Upload failure handling (initializeUpload fails, binary upload fails)
  - Empty mediaUrls falls back to text-only
- [ ] All tests mock `global.fetch` — no real network calls
- [ ] Tests follow existing patterns from `email.service.test.ts` (vi.hoisted, vi.mock)

**Sub-steps:**

a. Create `apps/api/src/services/publisher.service.test.ts`
b. Set up `global.fetch` mocking using `vi.fn()` to intercept all fetch calls
c. Write test for text-only LinkedIn post — mock fetch to return 201 with `x-restli-id` header
d. Write test for single-image post — mock sequence: image fetch → initializeUpload response → binary upload 201 → post creation 201
e. Write test for multi-image post — similar sequence with multiple image uploads
f. Write error handling tests — initializeUpload returns 400, binary upload returns 500
g. Verify tests pass: `npx vitest run apps/api/src/services/publisher.service.test.ts`

**Files:**

- `apps/api/src/services/publisher.service.test.ts` (new)

**Dependencies:** Steps 1.1, 1.2, 1.3

---

## Phase 3: Verification & Cleanup

### Step 3.1: TypeScript compilation and integration verification

**Complexity:** S

**Acceptance criteria:**

- [ ] `npm run build` passes with no new TypeScript errors
- [ ] `npm run test --filter=@social-planner/api` passes (all existing + new tests)
- [ ] `npm run lint` passes with no new warnings

**Sub-steps:**

a. Run TypeScript build and fix any type errors
b. Run full API test suite to check for regressions
c. Run linter and fix any issues
d. Review the diff for any accidentally committed debug code or console.logs

**Files:**

- `apps/api/src/services/publisher.service.ts`
- `apps/api/src/services/publisher.service.test.ts`

**Dependencies:** Steps 1.1–2.1

---

## Risk Areas & Recommendations

| Component                | Issue                                                   | Recommendation                                                                                             |
| ------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| LinkedIn API rate limits | 100 API calls/day (dev tier), 150 posts/day             | Upload images sequentially, not in parallel. Log remaining quota if headers provide it                     |
| Image binary download    | Public URLs may be slow or timeout                      | Add reasonable timeout (30s) to image fetch. Consider using S3 `downloadFile` if URL points to our storage |
| LinkedIn API version     | Publisher uses `202601`, analytics uses `202501`        | Keep consistent — use `202601` which matches current publisher code                                        |
| Upload URL expiry        | LinkedIn upload URLs have an `uploadUrlExpiresAt` field | Upload immediately after receiving URL — don't batch initializeUpload calls                                |

### Breaking Changes

None expected. The change is additive — text-only posts continue to work when no `mediaUrls` are provided. The `PublishRequest` interface already includes `mediaUrls?: string[]`.

### Testing Recommendations

- Mock `fetch` at the test level with response sequences for multi-step flows
- Test the edge case of exactly 1 image (single path) vs 2+ images (multi-image path)
- Test with 20+ images to verify truncation
- Manual testing with real LinkedIn API requires a connected LinkedIn account and valid access token

### Quick Wins

- Step 1.2 (single-image) unblocks the most common use case — most posts have 1 image

---

## Progress Tracking

### Phase 1: LinkedIn Image Upload Infrastructure

- [ ] Step 1.1: Add image upload methods to LinkedInAdapter
- [ ] Step 1.2: Update publish method for single-image posts
- [ ] Step 1.3: Add multi-image post support

### Phase 2: Testing

- [ ] Step 2.1: Add publisher service tests for LinkedIn image flow

### Phase 3: Verification & Cleanup

- [ ] Step 3.1: TypeScript compilation and integration verification
