# Connecting Claude Desktop to Social Planner

This guide explains how to connect Claude Desktop (or other MCP-compatible AI assistants) to Social Planner for AI-assisted content creation and scheduling.

## Prerequisites

- Social Planner account with EDITOR or ADMIN role
- Claude Desktop installed (or another MCP-compatible client)
- Social Planner instance with MCP enabled (`MCP_ENABLED=true`)

## Step 1: Register an MCP Client

1. Log into Social Planner
2. Go to **Settings → AI Assistants**
3. Click **Register New Client**
4. Enter a name (e.g., "Claude Desktop - Work Laptop")
5. Add redirect URI: `http://localhost:3000/callback` (for Claude Desktop)
6. Select permissions:
   - **Read Posts** - View your posts and drafts
   - **Create Posts** - Create new draft posts
   - **Schedule Posts** - Schedule posts for publishing (requires approval)
   - **Read Channels** - View connected social accounts
   - **Read Analytics** - View post analytics
7. Click **Register**
8. **IMPORTANT**: Copy the Client ID and Client Secret immediately. The secret will not be shown again.

## Step 2: Configure Claude Desktop

Add the following to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "social-planner-mcp": {
      "transport": "http",
      "url": "https://your-instance.com/api/mcp",
      "auth": {
        "type": "oauth2",
        "clientId": "YOUR_CLIENT_ID",
        "clientSecret": "YOUR_CLIENT_SECRET",
        "authorizationUrl": "https://your-instance.com/api/mcp/oauth/authorize",
        "tokenUrl": "https://your-instance.com/api/mcp/oauth/token",
        "scopes": ["read_posts", "create_posts", "schedule_posts", "read_channels"]
      }
    }
  }
}
```

Replace:

- `your-instance.com` with your Social Planner domain
- `YOUR_CLIENT_ID` with the Client ID from Step 1
- `YOUR_CLIENT_SECRET` with the Client Secret from Step 1

## Step 3: Authorize Connection

1. Restart Claude Desktop
2. Claude will prompt you to authorize the Social Planner connection
3. Log in and approve the requested permissions
4. You should see a success message

## Available Tools

Once connected, Claude can use these tools:

### `list_posts`

List your posts with optional filtering by status, date range, or channel.

**Example prompt**: "Show me all my draft posts from this week"

### `get_post`

Get detailed information about a specific post including content, channels, and scheduling info.

**Example prompt**: "Get the details of post abc123"

### `list_channels`

View connected social media accounts (Instagram, LinkedIn).

**Example prompt**: "What social accounts do I have connected?"

### `create_post`

Create a new draft post with content and optional media.

**Example prompt**: "Create a LinkedIn post about our new product launch"

### `update_post`

Modify an existing draft post.

**Example prompt**: "Update the hashtags on my latest draft"

### `schedule_post`

Schedule a post for publishing. This creates a **pending action** that you must approve in the web interface.

**Example prompt**: "Schedule this post for tomorrow at 9 AM"

### `submit_for_approval`

Submit a draft for approval review (if your workflow requires it).

**Example prompt**: "Submit this draft for review"

## Confirmation Flow

For safety, scheduling actions require your explicit approval:

1. Claude requests to schedule a post via the `schedule_post` tool
2. You see a notification badge in the Social Planner header
3. Click the badge to see "Pending AI Requests"
4. Review the details (post content, scheduled time, channels)
5. Click **Approve** to execute or **Reject** to cancel
6. Only approved actions are executed

This ensures you maintain control over what gets published to your social accounts.

## Revoking Access

To disconnect Claude Desktop:

1. Go to **Settings → AI Assistants**
2. Find the client and click **Revoke**
3. All active sessions will be terminated immediately
4. Claude Desktop will need to re-authorize to connect again

## Troubleshooting

### Connection Failed

- Verify your Client ID and Secret are correct
- Ensure the redirect URI matches exactly
- Check that MCP is enabled on your Social Planner instance

### Authorization Denied

- Make sure you're logged into Social Planner
- Verify your account has EDITOR or ADMIN role
- Check that requested scopes are within your client's registered scopes

### Tools Not Working

- Verify the tool requires scopes you've authorized
- Check for pending actions that need approval
- Review the audit log in Settings for error details

### Token Expired

- Claude Desktop should automatically refresh tokens
- If issues persist, revoke the client and re-authorize

## Security Best Practices

1. **Use specific names** for clients (e.g., "Claude Desktop - Home MacBook")
2. **Grant minimal scopes** - only what you need
3. **Review pending actions** before approving
4. **Revoke unused clients** - remove clients you no longer use
5. **Monitor audit logs** - check for unexpected activity

## API Reference

For developers building custom MCP clients:

### OAuth Endpoints

- `GET /api/mcp/oauth/authorize` - Authorization endpoint
- `POST /api/mcp/oauth/token` - Token exchange/refresh
- `POST /api/mcp/oauth/revoke` - Token revocation

### MCP Server

- `POST /api/mcp` - Main MCP endpoint (initialize, tool calls)
- `GET /api/mcp` - SSE streaming (optional)
- `DELETE /api/mcp` - Session cleanup

### Scopes

| Scope            | Description                        |
| ---------------- | ---------------------------------- |
| `read_posts`     | View posts and drafts              |
| `create_posts`   | Create and edit drafts             |
| `schedule_posts` | Schedule posts (requires approval) |
| `read_channels`  | View connected social accounts     |
| `read_analytics` | View post analytics                |

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review error messages in Claude Desktop logs
3. Contact your Social Planner administrator
