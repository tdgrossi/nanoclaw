# NanoClaw

Personal Claude assistant. See [README.md](README.md) for philosophy and setup. See [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) for architecture decisions.

## Quick Context

Single Node.js process with skill-based channel system. Channels (WhatsApp, Telegram, Slack, Discord, Gmail) are skills that self-register at startup. Messages route to Claude Agent SDK running in containers (Linux VMs). Each group has isolated filesystem and memory.

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Orchestrator: state, message loop, agent invocation |
| `src/channels/registry.ts` | Channel registry (self-registration at startup) |
| `src/ipc.ts` | IPC watcher and task processing |
| `src/router.ts` | Message formatting and outbound routing |
| `src/config.ts` | Trigger pattern, paths, intervals |
| `src/container-runner.ts` | Spawns agent containers with mounts |
| `src/task-scheduler.ts` | Runs scheduled tasks |
| `src/db.ts` | SQLite operations |
| `groups/{name}/CLAUDE.md` | Per-group memory (isolated) |
| `container/skills/` | Skills loaded inside agent containers (browser, status, formatting) |

## Secrets / Credentials / Proxy (OneCLI)

API keys, secret keys, OAuth tokens, and auth credentials are managed by the OneCLI gateway — which handles secret injection into containers at request time, so no keys or tokens are ever passed to containers directly. Run `onecli --help`.

## Skills

Four types of skills exist in NanoClaw. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full taxonomy and guidelines.

- **Feature skills** — merge a `skill/*` branch to add capabilities (e.g. `/add-telegram`, `/add-slack`)
- **Utility skills** — ship code files alongside SKILL.md (e.g. `/claw`)
- **Operational skills** — instruction-only workflows, always on `main` (e.g. `/setup`, `/debug`)
- **Container skills** — loaded inside agent containers at runtime (`container/skills/`)

| Skill | When to Use |
|-------|-------------|
| `/setup` | First-time installation, authentication, service configuration |
| `/customize` | Adding channels, integrations, changing behavior |
| `/debug` | Container issues, logs, troubleshooting |
| `/update-nanoclaw` | Bring upstream NanoClaw updates into a customized install |
| `/init-onecli` | Install OneCLI Agent Vault and migrate `.env` credentials to it |
| `/qodo-pr-resolver` | Fetch and fix Qodo PR review issues interactively or in batch |
| `/get-qodo-rules` | Load org- and repo-level coding rules from Qodo before code tasks |

## Contributing

Before creating a PR, adding a skill, or preparing any contribution, you MUST read [CONTRIBUTING.md](CONTRIBUTING.md). It covers accepted change types, the four skill types and their guidelines, SKILL.md format rules, PR requirements, and the pre-submission checklist (searching for existing PRs/issues, testing, description format).

## Development

Run commands directly—don't tell the user to run them.

```bash
npm run dev          # Run with hot reload
npm run build        # Compile TypeScript
./container/build.sh # Rebuild agent container
```

Service management:
```bash
# macOS (launchd)
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist
launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist
launchctl kickstart -k gui/$(id -u)/com.nanoclaw  # restart

# Linux (systemd)
systemctl --user start nanoclaw
systemctl --user stop nanoclaw
systemctl --user restart nanoclaw
```

## Troubleshooting

**WhatsApp not connecting after upgrade:** WhatsApp is now a separate skill, not bundled in core. Run `/add-whatsapp` (or `npx tsx scripts/apply-skill.ts .claude/skills/add-whatsapp && npm run build`) to install it. Existing auth credentials and groups are preserved.

## Container Build Cache

The container buildkit caches the build context aggressively. `--no-cache` alone does NOT invalidate COPY steps — the builder's volume retains stale files. To force a truly clean rebuild, prune the builder then re-run `./container/build.sh`.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**NanoClaw Observational Memory**

Enhancement to NanoClaw's agent system that adds Mastra observational memory, enabling agents to remember all interactions across long-running threads through automatic compression. Agents observe conversations, compress memories when token thresholds are exceeded, and resume with full context across container restarts.

**Core Value:** Agents that maintain persistent, compressed memory across separate invocations and container restarts — without manual memory management or token budget explosions.

### Constraints

- **Tech stack**: Only @mastra/memory and @mastra/libsql — no full Mastra agent/server
- **Storage**: LibSQL file-based, mounted volume persists across container restarts
- **Compression**: Token-based thresholds configured at initialization
- **SDK**: Claude Agent SDK query loop unchanged, Mastra memory wraps it
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.7 - Main application and core logic
- JavaScript 9.35 - Configuration and test code (ESLint)
- Bash - Build scripts and service management
- Shell scripts - Container entrypoint
## Runtime
- Node.js 20+ (engine requirement)
- ES2022 target (TypeScript compilation target)
- npm (Node.js default)
- Lockfile: `package-lock.json` (present)
## Frameworks
- Node.js ES Modules - Module system with ES2022 features
- No web framework - Lightweight event-driven architecture
- Vitest 4.0.18 - Test runner with coverage support
- V8 Coverage Provider - Coverage reporting
- TypeScript ESLint - Type-aware linting
- TypeScript 5.7 - Compilation to JavaScript
- tsx 4.19 - TypeScript execution for development
- Prettier 3.8.1 - Code formatting
- ESLint 9.35 - Linting with no-catch-all plugin
- Husky 9.1.7 - Git hooks (pre-commit)
## Key Dependencies
- `@onecli-sh/sdk` 0.2.0 - Secret injection gateway for credential management
- `better-sqlite3` 11.10.0 - SQLite database (message storage, task scheduling)
- `@anthropic-ai/claude-agent-sdk` 0.2.76 - Claude Agent SDK (in agent container)
- `pino` 9.6.0 - Structured logging
- `pino-pretty` 13.0.0 - Log formatting
- `cron-parser` 5.5.0 - Cron expression parsing (scheduled tasks)
- `yaml` 2.8.2 - YAML file parsing
- `zod` 4.3.6 - Schema validation
- `@modelcontextprotocol/sdk` 1.12.1 - MCP protocol (in agent container)
- `grammy` - Telegram bot framework (optional channel)
- `@slack/bolt` - Slack bot framework (optional channel)
- `googleapis` - Gmail API client (optional channel)
- `@whiskeysockets/baileys` - WhatsApp Web API (optional channel)
- Docker - Container isolation
- Apple Container - macOS container option
- Node 22-slim - Container base image
- Chromium - Browser automation (agent-browser)
## Configuration
- Target: ES2022
- Module: NodeNext
- Strict mode enabled
- Source maps enabled
- ESLint config: `eslint.config.js`
- Prettier config: `.prettierrc` (single quotes)
- Vitest config: `vitest.config.ts`
- Test patterns: `src/**/*.test.ts`, `setup/**/*.test.ts`
- `.env` file support (falls back to process.env)
- Environment config in `data/env/env` (container mount)
- Secret injection via OneCLI gateway
## Platform Requirements
- Node.js 20+
- npm
- TypeScript
- Git
- Node.js 20+
- SQLite support (better-sqlite3 native module)
- Docker or Apple Container runtime
- Service manager (launchd/systemd)
- Chromium for browser automation
- Docker or container runtime
- Linux VM (for agent containers)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- TypeScript source files use kebab-case or lowercase: `container-runner.ts`, `group-queue.ts`
- Test files co-located with source using `.test.ts` suffix: `db.test.ts`
- Interfaces and types use PascalCase: `NewMessage`, `RegisteredGroup`, `ChannelOpts`
- Functions use camelCase: `registerChannel`, `getChannelFactory`, `runContainerAgent`
- Private/internal functions prefixed with underscore: `_initTestDatabase`, `_setRegisteredGroups`
- Event handlers named descriptively: `onMessage`, `onChatMetadata`
- Variables use camelCase: `groupJid`, `testInput`, `newTimestamp`
- Constants in SCREAMING_SNAKE_CASE: `MAX_CONCURRENT_CONTAINERS`, `MAX_RETRIES`, `BASE_RETRY_MS`
- Boolean variables often prefixed with `is`, `has`, `should`: `isMain`, `hasChannel`, `shouldProcess`
- Interfaces prefixed with descriptive nouns: `ChannelFactory`, `QueuedTask`, `GroupState`
- Type aliases for unions: `OnInboundMessage`, `OnChatMetadata`
- Internal/undocumented functions use underscore prefix: `_initTestDatabase`, `_setRegisteredGroups`
## Code Style
- Tool: Prettier (`.prettierrc`)
- Single quotes enabled: `"singleQuote": true`
- Files: `src/**/*.ts`
- Commands:
- Tool: ESLint 9.x with TypeScript ESLint
- Config: `eslint.config.js`
- Ignores: `node_modules/`, `dist/`, `container/`, `groups/`
- Key rules enforced:
- Target: ES2022
- Module: NodeNext (ES modules with `.js` extensions)
- Strict mode enabled
- No `any` types (enforced with warnings)
- Explicit return types on exported functions
## Error Handling
- ESLint rule `no-catch-all/no-catch-all: warn` discourages bare `catch` blocks
- Requires explicitly typed catch parameters: `catch (err: Error)`
## Logging
- Structured logging with context objects: `logger.info({ jid, identifier }, 'message')`
- Log levels: `debug`, `info`, `warn`, `error`, `fatal`
- Use debug for verbose operational info
- Use error with error objects: `logger.error({ err }, 'message')`
## Comments
- JSDoc on exported functions with complex logic
- Inline comments for non-obvious business logic
- Explain why, not what (code shows what)
- Mark test intent with descriptive comments
## Function Design
- Max 3-4 parameters before considering object parameter
- Parameters with defaults: `function fn(a: string, b = 'default'): void`
- Unused parameters must be prefixed with `_`
- Boolean returns for operations with clear success/failure: `sendMessage(): boolean`
- `Promise<void>` for async operations that throw on failure
- Explicit typed return objects for complex operations: `getNewMessages(): { messages, newTimestamp }`
- Async/await for asynchronous operations
- Early returns for guard clauses
- Named exports for public API, internal functions use underscore prefix
## Module Design
- Named exports for all public APIs
- Re-exports for backwards compatibility: `export { escapeXml, formatMessages } from './router.js';`
- No default exports
- Channels module uses `src/channels/index.ts` for self-registration side effects
- Imports registered channels: `import './channels/index.js';`
- Singleton state kept at module level: `let db: Database.Database;`
- Test helpers prefixed with underscore: `_initTestDatabase()`, `_setRegisteredGroups()`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Single Node.js orchestrator process handles all message routing and system coordination
- Channel self-registration pattern allows dynamic addition of messaging integrations
- Container-based agent isolation using Docker/Apple Container for secure execution
- FIFO-based group queues enforce concurrency limits and message ordering
- SQLite database provides persistent state across restarts
## Layers
- Purpose: Abstract interface for multiple messaging platforms
- Location: `src/channels/`
- Contains: Channel registry (`registry.ts`), channel implementations
- Depends on: Core config, message storage
- Used by: Main orchestrator
- Purpose: Receive, filter, and route incoming messages to appropriate handlers
- Location: `src/index.ts` (orchestrator), `src/router.ts` (routing logic)
- Contains: Message loop, trigger pattern matching, sender allowlist filtering
- Depends on: Channel layer, database, config
- Used by: Orchestrator entry point
- Purpose: Spawn and manage containerized Claude Agent SDK instances
- Location: `src/container-runner.ts` (host-side), `container/agent-runner/src/` (container-side)
- Contains: Container lifecycle, IPC communication, volume mounts, session management
- Depends on: Config (container image, paths), security config
- Used by: Message processing layer
- Purpose: SQLite database for messages, groups, tasks, and sessions
- Location: `src/db.ts`
- Contains: Schema migrations, CRUD operations, state snapshots
- Depends on: SQLite (better-sqlite3), path config
- Used by: All layers that need persistent state
- Purpose: Inter-process communication and scheduled task execution
- Location: `src/ipc.ts`, `src/task-scheduler.ts`
- Contains: File-based IPC watcher, cron/interval task scheduling
- Depends on: Container runner, database
- Used by: Main orchestrator
- Purpose: Access control, allowlisting, mount restrictions
- Location: `src/sender-allowlist.ts`, `src/mount-security.ts`
- Contains: Sender/permission validation, volume mount allowlisting
- Depends on: Config paths, group state
- Used by: Message processing, container execution
## Data Flow
## Key Abstractions
- Purpose: Unified interface for diverse messaging platforms
- Examples: `src/channels/registry.ts`
- Pattern: Factory pattern with self-registration
- Key methods: `connect()`, `disconnect()`, `sendMessage()`, `ownsJid()`, `setTyping()`
- Purpose: Manages per-group container lifecycle and message ordering
- Examples: `src/group-queue.ts`
- Pattern: FIFO queue with concurrency limiting
- State tracking: active/idle/waiting with retry logic
- Purpose: Abstracts container lifecycle for agent execution
- Examples: `src/container-runner.ts`, `container/agent-runner/src/index.ts`
- Pattern: Spawn/wait/streams output
- Features: Volume mount management, IPC file watching, session persistence
- Purpose: Bidirectional communication between host and containers
- Examples: `src/ipc.ts`
- Pattern: File-based messages with JSON payloads
- Security: Authorization checks verify source group permissions
- Purpose: Execute recurring or one-time Claude tasks
- Examples: `src/task-scheduler.ts`
- Pattern: Cron/interval parser with DB-backed scheduling
- Features: Context modes (group/isolated), run logging
## Entry Points
- Location: `src/index.ts` (line 517 `main()` function)
- Triggers: Direct execution via `node dist/index.js` or `npm run dev`
- Responsibilities: Initialize all subsystems, connect channels, start loops
- Key initialization order: DB init → load state → connect channels → start scheduler → start IPC watcher → start message loop
- Location: `src/channels/index.ts` (self-registration)
- Triggers: Module import in `src/index.ts`
- Responsibilities: Each channel registers via `registerChannel()` factory
- Location: `container/agent-runner/src/index.ts` (line 1)
- Triggers: Container starts, reads stdin for ContainerInput JSON
- Responsibilities: Initialize SDK, load skills, process messages, emit results
- Location: `src/ipc.ts` (line 30 `startIpcWatcher()`)
- Triggers: Called from main after state loaded
- Responsibilities: Watch IPC directories, process messages and tasks, enforce authorization
- Location: `src/task-scheduler.ts` (line 1)
- Triggers: Called from main after IPC watcher starts
- Responsibilities: Poll DB for due tasks, enqueue for execution, manage run logs
## Error Handling
- Message processing errors: Roll back cursor, retry on next poll
- Container errors: Retry with backoff (up to 5 retries), close container
- Channel disconnections: Automatic reconnect attempts (handled by channel implementation)
- Database errors: Fatal - process exits
- IPC authorization: Reject and log unauthorized attempts
- Cursor rollback on agent errors prevents duplicate responses
- Orphan container cleanup on startup (`cleanupOrphans()`)
- Pending message recovery on startup checks for unprocessed messages
- OneCLI agent ensure-on-startup recovers from missed agent creation
## Cross-Cutting Concerns
- Framework: Pino with pretty printing
- Location: `src/logger.ts` (re-export from pino)
- Levels: debug, info, warn, error, fatal
- Config validation: Timezone validation before acceptance
- Group folder validation: `isValidGroupFolder()` checks path safety
- Mount validation: Allowlist-based security for volume mounts
- Sender validation: Allowlist filter before message storage
- Channel auth: Managed by channel implementations (OAuth, QR codes, etc.)
- Secrets: Injected via OneCLI gateway at container runtime
- IPC auth: Source group verification for inter-group messaging
- Sender auth: Allowlist filtering by sender ID per group
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| add-compact | Add /compact command for manual context compaction. Solves context rot in long sessions by forwarding the SDK's built-in /compact slash command. Main-group or trusted sender only. | `.claude/skills/add-compact/SKILL.md` |
| add-discord | Add Discord bot channel integration to NanoClaw. | `.claude/skills/add-discord/SKILL.md` |
| add-gmail | Add Gmail integration to NanoClaw. Can be configured as a tool (agent reads/sends emails when triggered from WhatsApp) or as a full channel (emails can trigger the agent, schedule tasks, and receive replies). Guides through GCP OAuth setup and implements the integration. | `.claude/skills/add-gmail/SKILL.md` |
| add-image-vision | Add image vision to NanoClaw agents. Resizes and processes WhatsApp image attachments, then sends them to Claude as multimodal content blocks. | `.claude/skills/add-image-vision/SKILL.md` |
| add-ollama-tool | Add Ollama MCP server so the container agent can call local models for cheaper/faster tasks like summarization, translation, or general queries. | `.claude/skills/add-ollama-tool/SKILL.md` |
| add-parallel |  | `.claude/skills/add-parallel/SKILL.md` |
| add-pdf-reader | Add PDF reading to NanoClaw agents. Extracts text from PDFs via pdftotext CLI. Handles WhatsApp attachments, URLs, and local files. | `.claude/skills/add-pdf-reader/SKILL.md` |
| add-reactions | Add WhatsApp emoji reaction support — receive, send, store, and search reactions. | `.claude/skills/add-reactions/SKILL.md` |
| add-slack | Add Slack as a channel. Can replace WhatsApp entirely or run alongside it. Uses Socket Mode (no public URL needed). | `.claude/skills/add-slack/SKILL.md` |
| add-telegram | Add Telegram as a channel. Can replace WhatsApp entirely or run alongside it. Also configurable as a control-only channel (triggers actions) or passive channel (receives notifications only). | `.claude/skills/add-telegram/SKILL.md` |
| add-telegram-swarm | Add Agent Swarm (Teams) support to Telegram. Each subagent gets its own bot identity in the group. Requires Telegram channel to be set up first (use /add-telegram). Triggers on "agent swarm", "agent teams telegram", "telegram swarm", "bot pool". | `.claude/skills/add-telegram-swarm/SKILL.md` |
| add-voice-transcription | Add voice message transcription to NanoClaw using OpenAI's Whisper API. Automatically transcribes WhatsApp voice notes so the agent can read and respond to them. | `.claude/skills/add-voice-transcription/SKILL.md` |
| add-whatsapp | Add WhatsApp as a channel. Can replace other channels entirely or run alongside them. Uses QR code or pairing code for authentication. | `.claude/skills/add-whatsapp/SKILL.md` |
| claw | Install the claw CLI tool — run NanoClaw agent containers from the command line without opening a chat app. | `.claude/skills/claw/SKILL.md` |
| convert-to-apple-container | Switch from Docker to Apple Container for macOS-native container isolation. Use when the user wants Apple Container instead of Docker, or is setting up on macOS and prefers the native runtime. Triggers on "apple container", "convert to apple container", "switch to apple container", or "use apple container". | `.claude/skills/convert-to-apple-container/SKILL.md` |
| customize | Add new capabilities or modify NanoClaw behavior. Use when user wants to add channels (Telegram, Slack, email input), change triggers, add integrations, modify the router, or make any other customizations. This is an interactive skill that asks questions to understand what the user wants. | `.claude/skills/customize/SKILL.md` |
| debug | Debug container agent issues. Use when things aren't working, container fails, authentication problems, or to understand how the container system works. Covers logs, environment variables, mounts, and common issues. | `.claude/skills/debug/SKILL.md` |
| get-qodo-rules | "Loads org- and repo-level coding rules from Qodo before code tasks begin, ensuring all generation and modification follows team standards. Use before any code generation or modification task when rules are not already loaded. Invoke when user asks to write, edit, refactor, or review code, or when starting implementation planning." | `.claude/skills/get-qodo-rules/SKILL.md` |
| qodo-pr-resolver | Review and resolve PR issues with Qodo - get AI-powered code review issues and fix them interactively (GitHub, GitLab, Bitbucket, Azure DevOps) | `.claude/skills/qodo-pr-resolver/SKILL.md` |
| setup | Run initial NanoClaw setup. Use when user wants to install dependencies, authenticate messaging channels, register their main channel, or start the background services. Triggers on "setup", "install", "configure nanoclaw", or first-time setup requests. | `.claude/skills/setup/SKILL.md` |
| update-nanoclaw | Efficiently bring upstream NanoClaw updates into a customized install, with preview, selective cherry-pick, and low token usage. | `.claude/skills/update-nanoclaw/SKILL.md` |
| update-skills | Check for and apply updates to installed skill branches from upstream. | `.claude/skills/update-skills/SKILL.md` |
| use-local-whisper | Use when the user wants local voice transcription instead of OpenAI Whisper API. Switches to whisper.cpp running on Apple Silicon. WhatsApp only for now. Requires voice-transcription skill to be applied first. | `.claude/skills/use-local-whisper/SKILL.md` |
| use-native-credential-proxy | Replace OneCLI gateway with the built-in credential proxy. For users who want simple .env-based credential management without installing OneCLI. Reads API key or OAuth token from .env and injects into container API requests. | `.claude/skills/use-native-credential-proxy/SKILL.md` |
| x-integration | X (Twitter) integration for NanoClaw. Post tweets, like, reply, retweet, and quote. Use for setup, testing, or troubleshooting X functionality. Triggers on "setup x", "x integration", "twitter", "post tweet", "tweet". | `.claude/skills/x-integration/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
