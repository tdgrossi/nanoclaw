# External Integrations

**Analysis Date:** 2026-04-04

## APIs & External Services

**AI & Agent:**
- Claude Agent SDK - Claude Code execution
  - SDK: `@anthropic-ai/claude-agent-sdk` (in container)
  - Access: Via IPC through OneCLI gateway
  - Auth: OneCLI handles credential injection

**Messaging Channels (Optional):**

**Telegram:**
- Telegram Bot API - Multi-channel messaging
  - SDK: `grammy`
  - Auth: Bot token (`TELEGRAM_BOT_TOKEN`)
  - Features: Direct messages, group chats, @mention triggers
  - Setup: Via `/add-telegram` skill
  - Source: `nanoclaw-telegram.git`

**WhatsApp:**
- WhatsApp Web Protocol - Legacy-compatible messaging
  - SDK: `@whiskeysockets/baileys`
  - Auth: QR code or pairing code authentication
  - Features: Personal/linked device, group chats
  - Setup: Via `/add-whatsapp` skill
  - Source: `nanoclaw-whatsapp.git`
  - Auth storage: `store/auth/creds.json`

**Discord:**
- Discord Bot API - Server messaging
  - SDK: Discord.js
  - Auth: Bot token
  - Features: Text channels, slash commands
  - Setup: Via `/add-discord` skill
  - Source: `nanoclaw-discord.git`

**Slack:**
- Slack API - Team workspace messaging
  - SDK: `@slack/bolt`
  - Auth: Bot Token, App Token
  - Features: Socket Mode (no public URL needed)
  - Setup: Via `/add-slack` skill
  - Source: `nanoclaw-slack.git`
  - Env vars: `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`

**Gmail:**
- Gmail API - Email access
  - SDK: `googleapis`
  - Auth: OAuth 2.0 with GCP credentials
  - Features: Read, send, search, draft emails
  - Modes: Tool-only or full channel (polling inbox)
  - Setup: Via `/add-gmail` skill
  - Source: `nanoclaw-gmail.git`
  - Credentials: `~/.gmail-mcp/credentials.json`
  - Mount: `~/.gmail-mcp` into agent containers

## Data Storage

**Database:**
- SQLite (Local filesystem)
  - ORM: `better-sqlite3`
  - Location: `store/messages.db`
  - Tables: chats, messages, scheduled_tasks, registered_groups, router_state, sessions
  - Indexes: timestamp, group_folder

**File Storage:**
- Local filesystem only (no cloud storage)
  - Auth credentials: `store/auth/`
  - Group data: `groups/{name}/`
  - Session data: `data/sessions/`
  - Logs: `logs/`

**Cache:**
- None (in-memory caching only)

## Authentication & Identity

**Auth Provider:**
- OneCLI Gateway - Secret injection
  - Purpose: Inject credentials into containers without passing secrets to containers
  - SDK: `@onecli-sh/sdk`
  - URL: Configurable via `ONECLI_URL` (default: `http://localhost:10254`)
  - Approach: Credentials never leave the host; containers receive injected tokens

**Channel Authentication:**
- Per-channel authentication (see above)
- OAuth 2.0 for Gmail
- Bot tokens for Telegram, Discord, Slack
- Pairing codes for WhatsApp

## Monitoring & Observability

**Logging:**
- Pino structured logging
  - Pretty output to console
  - File output to `logs/nanoclaw.log`
  - Levels: Debug, Info, Warn, Error

**Error Tracking:**
- None (rely on logs and manual monitoring)

**Metrics:**
- None (built for individual users)

## CI/CD & Deployment

**Hosting:**
- Individual user deployment (personal fork)
- No cloud hosting

**Service Management:**
- macOS: launchd (plist)
- Linux: systemd
- Alternative: Manual process (`npm start`)

**Container Build:**
- Docker build with caching
- Build script: `container/build.sh`
- Customizable via `CONTAINER_RUNTIME` env var

## Environment Configuration

**Required env vars:**
- `ASSISTANT_NAME` - Trigger name (default: Andy)
- `ASSISTANT_HAS_OWN_NUMBER` - WhatsApp config (true/false)
- `ONECLI_URL` - OneCLI gateway URL (default: http://localhost:10254)
- `TZ` - Timezone for scheduling

**Optional env vars:**
- `CONTAINER_IMAGE` - Agent container image (default: nanoclaw-agent:latest)
- `CONTAINER_TIMEOUT` - Container timeout (default: 1800000ms)
- `MAX_CONCURRENT_CONTAINERS` - Parallel agent limit (default: 5)
- `IDLE_TIMEOUT` - Container idle timeout (default: 1800000ms)
- `IPC_POLL_INTERVAL` - Message polling interval (default: 1000ms)

**Channel env vars (optional):**
- `TELEGRAM_BOT_TOKEN`
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`

**Secrets location:**
- `.env` - Local configuration (not synced to git)
- `store/auth/` - Channel authentication credentials
- `~/.gmail-mcp/` - Gmail OAuth credentials
- OneCLI gateway - Handles all secret injection

## Webhooks & Callbacks

**Incoming:**
- None (polling-based architecture)

**Outgoing:**
- Telegram webhooks (optional, polling also supported)
- Slack webhooks (optional, Socket Mode preferred)
- Discord webhooks (optional)

**IPC Communication:**
- File-based IPC in agent containers
- Locations:
  - `/workspace/ipc/input/` - Messages to process
  - `/workspace/ipc/tasks/` - Scheduled task execution
  - `/workspace/ipc/messages/` - Message history
- JSON file-based protocol

## Container Integration

**Agent Container:**
- Base: Node 22-slim
- Includes: Chromium, Git, curl, Node.js
- Mounts: Group workspace, global workspace, environment config
- Security: Non-root user, workspace isolation
- Entry: JSON via stdin, JSON via stdout

**Credential Injection:**
- OneCLI gateway handles all secret injection
- Credentials never passed directly to containers
- Environment variables injected at request time

---

*Integration audit: 2026-04-04*
