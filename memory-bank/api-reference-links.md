# Social Planner - API Documentation Reference

> Social media content planning for Instagram and LinkedIn

## Meta Platform (Instagram & Facebook Pages)

### Getting Started

| Resource                   | URL                                                      |
| -------------------------- | -------------------------------------------------------- |
| Meta for Developers Portal | https://developers.facebook.com/                         |
| App Dashboard              | https://developers.facebook.com/apps                     |
| Graph API Explorer         | https://developers.facebook.com/tools/explorer/          |
| Access Token Debugger      | https://developers.facebook.com/tools/debug/accesstoken/ |

### Instagram Graph API

| Resource                    | URL                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| Instagram Platform Overview | https://developers.facebook.com/docs/instagram/                                                |
| Getting Started             | https://developers.facebook.com/docs/instagram-api/getting-started                             |
| Content Publishing Guide    | https://developers.facebook.com/docs/instagram-api/guides/content-publishing/                  |
| IG User Media Endpoint      | https://developers.facebook.com/docs/instagram-api/reference/ig-user/media                     |
| IG Media Publish Endpoint   | https://developers.facebook.com/docs/instagram-api/reference/ig-user/media-publish             |
| Reels Specifications        | https://developers.facebook.com/docs/instagram-api/reference/ig-user/media#reel-specifications |
| Carousel Posts              | https://developers.facebook.com/docs/instagram-api/guides/content-publishing#carousel-posts    |
| Comment Moderation          | https://developers.facebook.com/docs/instagram-api/guides/comment-moderation                   |
| Insights API                | https://developers.facebook.com/docs/instagram-api/guides/insights                             |

#### Instagram Publishing Requirements

- Business or Creator account required
- Must be linked to a Facebook Page
- 25 posts per 24 hours limit
- JPEG only for images
- Reels: MOV/MP4, max 15 minutes, 4:5 to 1.91:1 aspect ratio

#### Required Permissions

```
instagram_basic
instagram_content_publish
instagram_manage_comments
instagram_manage_insights
pages_show_list
pages_read_engagement
```

### Facebook Pages API

| Resource           | URL                                                                    |
| ------------------ | ---------------------------------------------------------------------- |
| Pages API Overview | https://developers.facebook.com/docs/pages/                            |
| Publishing Posts   | https://developers.facebook.com/docs/pages/publishing                  |
| Page Feed Endpoint | https://developers.facebook.com/docs/graph-api/reference/page/feed     |
| Page Photos        | https://developers.facebook.com/docs/graph-api/reference/page/photos   |
| Page Videos        | https://developers.facebook.com/docs/graph-api/reference/page/videos   |
| Scheduled Posts    | https://developers.facebook.com/docs/pages/publishing#scheduled-posts  |
| Page Insights      | https://developers.facebook.com/docs/graph-api/reference/page/insights |

#### Required Permissions

```
pages_manage_posts
pages_read_engagement
pages_show_list
pages_read_user_content
```

### Meta Authentication & Tokens

| Resource                    | URL                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------- |
| Facebook Login Overview     | https://developers.facebook.com/docs/facebook-login/                                    |
| Facebook Login for Business | https://developers.facebook.com/docs/facebook-login/facebook-login-for-business         |
| Access Tokens               | https://developers.facebook.com/docs/facebook-login/guides/access-tokens                |
| Long-Lived Tokens           | https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived |
| Page Access Tokens          | https://developers.facebook.com/docs/facebook-login/guides/access-tokens#pagetokens     |
| Permissions Reference       | https://developers.facebook.com/docs/permissions/reference                              |

#### Token Lifetimes

- Short-lived user token: ~1 hour
- Long-lived user token: ~60 days
- Page access token: Never expires (if derived from long-lived user token)

### Meta App Review

| Resource              | URL                                                                            |
| --------------------- | ------------------------------------------------------------------------------ |
| App Review Overview   | https://developers.facebook.com/docs/app-review                                |
| Submission Guide      | https://developers.facebook.com/docs/app-review/submission-guide               |
| Business Verification | https://developers.facebook.com/docs/development/release/business-verification |

---

## LinkedIn

### Getting Started

| Resource                  | URL                                            |
| ------------------------- | ---------------------------------------------- |
| LinkedIn Developer Portal | https://developer.linkedin.com/                |
| Product Catalog           | https://developer.linkedin.com/product-catalog |
| My Apps                   | https://www.linkedin.com/developers/apps       |
| API Documentation Home    | https://learn.microsoft.com/en-us/linkedin/    |

### Posts API (Content Publishing)

| Resource          | URL                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| Posts API         | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api           |
| Images API        | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api          |
| Videos API        | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api          |
| Documents API     | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/documents-api       |
| Multi-Image Posts | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/multiimage-post-api |
| Rich Media Shares | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/rich-media-shares   |

### Personal Profile Publishing

| Resource                       | URL                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Share on LinkedIn              | https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin        |
| Sign In with LinkedIn (OpenID) | https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2 |

#### Required Product & Scope

- Product: "Share on LinkedIn"
- Scope: `w_member_social`
- Self-serve approval

### Company Page Publishing

| Resource                      | URL                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Community Management Overview | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview             |
| Community Management API      | https://developer.linkedin.com/product-catalog/marketing/community-management-api                                   |
| Migration Guide               | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-api-migration-guide  |
| Organization Lookup           | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-lookup-api     |
| Organization Access Control   | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-access-control |

#### Required Scopes

```
w_organization_social
r_organization_social
rw_organization_admin
```

#### Approval Requirements

- Registered legal entity (LLC, Corp, etc.)
- Business email verification
- Company page admin verification
- Demo video submission
- Privacy policy URL

### LinkedIn Authentication

| Resource               | URL                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Authorization Overview | https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication              |
| OAuth 2.0              | https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow     |
| Token Introspection    | https://learn.microsoft.com/en-us/linkedin/shared/authentication/token-introspection         |
| Refresh Tokens         | https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens |

#### Token Lifetime

- Access token: 60 days
- Refresh token: 365 days (if enabled)

### LinkedIn API Requirements

All API requests require these headers:

```
Authorization: Bearer {access_token}
X-Restli-Protocol-Version: 2.0.0
LinkedIn-Version: YYYYMM (e.g., 202411)
Content-Type: application/json
```

#### Rate Limits

- 150 posts per day per account
- 100 API calls per day (Development tier)
- 100,000 API calls per day (Standard tier)

---

## Quick Reference: Publishing Endpoints

### Instagram

```
# Create media container
POST https://graph.facebook.com/v21.0/{ig-user-id}/media

# Publish media
POST https://graph.facebook.com/v21.0/{ig-user-id}/media_publish
```

### Facebook Pages

```
# Publish to page feed
POST https://graph.facebook.com/v21.0/{page-id}/feed

# Publish photo
POST https://graph.facebook.com/v21.0/{page-id}/photos

# Publish video
POST https://graph.facebook.com/v21.0/{page-id}/videos
```

### LinkedIn

```
# Create post (personal or organization)
POST https://api.linkedin.com/rest/posts

# Upload image
POST https://api.linkedin.com/rest/images?action=initializeUpload

# Upload video
POST https://api.linkedin.com/rest/videos?action=initializeUpload
```

---

## Postman Collections

| Platform                | URL                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Instagram API           | https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api                  |
| LinkedIn Marketing APIs | https://www.postman.com/linkedin-developer-apis/linkedin-marketing-solutions-versioned-apis |

---

## Support & Community

| Platform | Resource                 | URL                                                                              |
| -------- | ------------------------ | -------------------------------------------------------------------------------- |
| Meta     | Developer Support        | https://developers.facebook.com/support/                                         |
| Meta     | Bug Reports              | https://developers.facebook.com/support/bugs/                                    |
| Meta     | Community Forum          | https://developers.facebook.com/community/                                       |
| LinkedIn | Developer Support Portal | https://developer.linkedin.com/support                                           |
| LinkedIn | API Changelog            | https://learn.microsoft.com/en-us/linkedin/marketing/integrations/recent-changes |

---

## Implementation Checklist

### Meta (Instagram + Facebook Pages)

- [ ] Create Meta Developer account
- [ ] Create App (Business type)
- [ ] Add Facebook Login product
- [ ] Add Instagram Graph API product
- [ ] Configure OAuth redirect URIs
- [ ] Implement token exchange flow
- [ ] Implement long-lived token refresh
- [ ] Submit for App Review
- [ ] Complete Business Verification

### LinkedIn

- [ ] Create LinkedIn Developer account
- [ ] Create App
- [ ] Verify company page
- [ ] Add "Share on LinkedIn" product (personal profiles)
- [ ] Apply for Community Management API (company pages)
- [ ] Configure OAuth 2.0 redirect URIs
- [ ] Implement token refresh logic
- [ ] Submit demo video (if company pages)

---

_Last updated: December 2025_
_Graph API version: v21.0_
_LinkedIn API version: 202411_
