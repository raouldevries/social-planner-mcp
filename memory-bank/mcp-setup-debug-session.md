# MCP Setup Debug Session - Social Planner

## Goal

Connect Claude Desktop to Social Planner via MCP (Model Context Protocol)

## Current Status

The connection is failing - the bridge script exits immediately after starting.

## Setup Completed

### 1. MCP Client Registered

- **Client ID:** `your-mcp-client-id`
- **Client Secret:** `your-mcp-client-secret`

### 2. Bridge Script Downloaded

- Location: `/Users/your-username/Downloads/mcp-stdio-bridge.js`
- Verified: File content is valid JavaScript (not corrupted RTF)

### 3. Node.js Installed

- Version: v25.5.0
- Installed via Homebrew

### 4. Claude Desktop Config

File: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "social-planner-mcp": {
      "command": "node",
      "args": ["/Users/your-username/Downloads/mcp-stdio-bridge.js"],
      "env": {
        "MCP_URL": "https://app.example.com/api/mcp",
        "MCP_TOKEN_URL": "https://app.example.com/api/mcp/oauth/token",
        "MCP_CLIENT_ID": "your-mcp-client-id",
        "MCP_CLIENT_SECRET": "your-mcp-client-secret"
      }
    }
  }
}
```

## Error Observed

From Claude Desktop MCP logs:

```
Server started and connected successfully
Server transport closed
Server transport closed unexpectedly, this is likely due to the process exiting early.
```

The bridge script is crashing/exiting immediately.

## Next Debug Steps

### Step 1: Test the bridge script manually

Run this in Terminal to see what's happening:

```bash
export MCP_URL="https://app.example.com/api/mcp"
export MCP_TOKEN_URL="https://app.example.com/api/mcp/oauth/token"
export MCP_CLIENT_ID="your-mcp-client-id"
export MCP_CLIENT_SECRET="your-mcp-client-secret"

echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}' | node /Users/your-username/Downloads/mcp-stdio-bridge.js
```

This will show:

- Any error messages from the script
- The response from the server
- Debug output on stderr

### Step 2: Check if script runs at all

```bash
node /Users/your-username/Downloads/mcp-stdio-bridge.js
```

Then type `{}` and press Enter. See what happens.

### Step 3: Check Node can find the script

```bash
ls -la /Users/your-username/Downloads/mcp-stdio-bridge.js
cat /Users/your-username/Downloads/mcp-stdio-bridge.js | head -20
```

### Step 4: Test OAuth token endpoint directly

```bash
curl -X POST https://app.example.com/api/mcp/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grantType": "client_credentials",
    "clientId": "your-mcp-client-id",
    "clientSecret": "your-mcp-client-secret",
    "scope": "read_posts create_posts schedule_posts read_channels read_analytics"
  }'
```

Should return an access token if credentials are correct.

## Alternative: Direct HTTP Config (if Claude Desktop supports it)

Newer Claude Desktop versions support direct HTTP transport without the bridge script:

```json
{
  "mcpServers": {
    "social-planner-mcp": {
      "url": "https://app.example.com/api/mcp",
      "headers": {
        "Authorization": "Basic b1hTd0M5bGNWbmlka1VDSkdUNTVIQTpldmlodlp2MURlNFdPYndUTGVWRzZwUGN1MW9iTmVTZHhFTUF1ODRaZ1R3"
      }
    }
  }
}
```

This was tried first but Claude Desktop showed an error requiring "command" field, indicating the HTTP transport isn't supported in that version.

## Useful Commands

Check Node version:

```bash
node --version
```

Check if Homebrew is in PATH:

```bash
echo $PATH | grep homebrew
```

If brew/node not found after install:

```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
```

View Claude Desktop logs:

- In Claude Desktop error popup, click "Open developer settings"
- Or check: `~/Library/Logs/Claude/`

## Files Reference

- Bridge script source: `https://app.example.com/mcp-stdio-bridge.js`
- Config location (macOS): `~/Library/Application Support/Claude/claude_desktop_config.json`
- Config location (Windows): `%APPDATA%\Claude\claude_desktop_config.json`
