# Codebase Structure

**Analysis Date:** 2026-04-04

## Directory Layout

```
nanoclaw/
├── src/                      # Main Node.js application (host-side)
├── container/                # Container build and runtime
├── groups/                   # Group memory templates
├── .claude/skills/           # Claude Code skills
├── config-examples/          # Example configuration files
├── docs/                     # Documentation
├── scripts/                  # Utility scripts
├── setup/                    # Setup utilities
├── launchd/                  # macOS service configuration
├── repo-tokens/             # Repository tokens (CI/CD)
└── .planning/codebase/      # Architecture documentation
```

## Directory Purposes

**src/:**
- Purpose: Core host-side application code
- Contains: TypeScript source files organized by domain
- Key files: `index.ts` (orchestrator), `db.ts` (persistence), `router.ts` (routing)
- Subdirs: `channels/` (messaging adapters)

**src/channels/:**
- Purpose: Messaging platform integrations (WhatsApp, Telegram, Discord, Slack, Gmail)
- Contains: Registry pattern, channel implementations via skills
- Key files: `registry.ts` (self-registration), `index.ts` (barrel import)

**container/:**
- Purpose: Containerized agent execution environment
- Contains: `agent-runner/` (container entry point), `skills/` (container-side skills)
- Key files: `Dockerfile`, `build.sh` (image build script)
- Subdirs: `agent-runner/src/` (Node.js runtime inside container)

**container/agent-runner/src/:**
- Purpose: Runs inside containers to execute Claude Agent SDK
- Contains: Agent initialization, message streaming, IPC handling
- Key files: `index.ts` (main entry), `ipc-mcp-stdio.ts` (MCP integration)

**container/skills/:**
- Purpose: Skills loaded inside containers at runtime
- Contains: `agent-browser/`, `capabilities/`, `slack-formatting/`, `status/`
- Format: Each skill has `SKILL.md` with instructions

**groups/:**
- Purpose: Per-group memory templates and configuration
- Contains: `main/` (main group template), `global/` (secondary group template)
- Key files: `CLAUDE.md` (agent instructions per group)

**.claude/skills/:**
- Purpose: Claude Code skills for user interaction
- Contains: Operational skills (setup, debug, customize), feature skills (add-*)
- Key skills: `/setup`, `/add-whatsapp`, `/add-telegram`, `/debug`, `/customize`

**config-examples/:**
- Purpose: Example configuration files
- Contains: `.env.example`, `launchd plist examples`

**scripts/:**
- Purpose: Utility scripts for setup and maintenance
- Contains: Skill application scripts

**setup/:**
- Purpose: Setup initialization code
- Contains: `index.ts` (setup runner)

**docs/:**
- Purpose: Project documentation
- Contains: `REQUIREMENTS.md` (architecture decisions), API docs

## Key File Locations

**Entry Points:**
- `src/index.ts`: Main orchestrator (line 517 `main()` function)
- `container/agent-runner/src/index.ts`: Container runtime entry
- `package.json`: `npm run dev` (tsx src/index.ts), `npm run build` (tsc)

**Configuration:**
- `src/config.ts`: All configuration constants and path resolution
- `src/types.ts`: Core TypeScript interfaces (RegisteredGroup, NewMessage, ScheduledTask, etc.)
- `src/env.ts`: Environment file reading utilities
- `.env`: User credentials and secrets (gitignored, never committed)

**Core Logic:**
- `src/index.ts`: Orchestrator, message loop, channel coordination
- `src/router.ts`: Message formatting and channel routing
- `src/db.ts`: SQLite database operations and schema
- `src/container-runner.ts`: Container lifecycle management
- `src/group-queue.ts`: Per-group queue and concurrency control

**IPC & Tasks:**
- `src/ipc.ts`: Inter-process communication watcher
- `src/task-scheduler.ts`: Scheduled task execution

**Security:**
- `src/sender-allowlist.ts`: Sender permission filtering
- `src/mount-security.ts`: Volume mount allowlisting

**Persistence:**
- `src/db.ts`: SQLite operations (messages, chats, groups, tasks, sessions)
- `src/group-folder.ts`: Group folder resolution and validation
- `src/remote-control.ts`: Remote control functionality

**Testing:**
- `src/*.test.ts`: Unit tests (co-located with source files)
- `vitest.config.ts`: Test runner configuration

**Container Side:**
- `container/agent-runner/src/index.ts`: Runs inside container, manages Claude SDK
- `container/agent-runner/src/ipc-mcp-stdio.ts`: MCP server integration
- `container/skills/*/SKILL.md`: Container skill instructions

## Naming Conventions

**Files:**
- Source files: `kebab-case.ts` (e.g., `container-runner.ts`, `group-queue.ts`)
- Test files: `*.test.ts` suffix (e.g., `db.test.ts`)
- Channel directories: lowercase channel name (e.g., `channels/whatsapp/`)
- Skill directories: kebab-case (e.g., `add-whatsapp/`, `use-local-whisper/`)

**Directories:**
- Source code: lowercase/kebab-case (e.g., `src/channels/`)
- Group templates: lowercase (e.g., `groups/main/`, `groups/global/`)
- Skills: kebab-case for feature skills (e.g., `.claude/skills/add-whatsapp/`)

**TypeScript:**
- Interfaces: PascalCase (e.g., `RegisteredGroup`, `ContainerInput`, `ChannelOpts`)
- Types: PascalCase (e.g., `ChannelFactory`, `OnInboundMessage`)
- Enums: Not used (discriminated unions instead)

**Variables:**
- Variables: camelCase (e.g., `registeredGroups`, `lastTimestamp`)
- Constants: camelCase with descriptive names (e.g., `MAX_CONCURRENT_CONTAINERS`)
- Private class members: Underscore prefix (e.g., `_setRegisteredGroups()`)

**Functions:**
- Functions: camelCase (e.g., `registerChannel()`, `startMessageLoop()`)
- Async functions: Same naming, return Promise
- Handlers: Often named with `handle` prefix (e.g., `handleRemoteControl()`)

**Configuration:**
- Environment variables: UPPER_SNAKE_CASE (e.g., `ASSISTANT_NAME`, `ONECLI_URL`)
- Config constants: camelCase exported (e.g., `export const ASSISTANT_NAME`)

## Where to Add New Code

**New Channel Integration:**
- Primary code: Create `src/channels/{channel-name}/` directory
- Implementation: Implement Channel interface, call `registerChannel()` in index
- Example: See WhatsApp, Telegram skills for pattern

**New Container Skill:**
- Implementation: Create `container/skills/{skill-name}/SKILL.md`
- Instructions: Write SKILL.md with @instructions for Claude to follow
- Loading: Skills automatically loaded by agent-runner from directory

**New Claude Code Skill:**
- Primary code: Create `.claude/skills/{skill-name}/SKILL.md`
- Instructions: Write SKILL.md with @instructions for Claude Code
- Registration: Skills auto-discovered from directory structure

**New Utility/Helpers:**
- Shared helpers: Add to `src/` directory if used by multiple modules
- Channel-specific: Add to `src/channels/{channel-name}/`
- Container-specific: Add to `container/agent-runner/src/`

**Database Schema Changes:**
- Location: `src/db.ts` (schema migrations in `createSchema()`)
- Migration: Add try/catch for column additions to handle existing DBs
- Example: Lines 88-100 in `src/db.ts` show column addition pattern

**Security Features:**
- Sender allowlist: `src/sender-allowlist.ts`
- Mount security: `src/mount-security.ts`
- IPC authorization: `src/ipc.ts` (authorization checks in `processIpcFiles()`)

## Special Directories

**groups/:**
- Purpose: Group-specific memory and configuration templates
- Generated: Yes, populated at runtime when groups register
- Committed: Only template files in `main/` and `global/`
- Contains: `CLAUDE.md` (agent instructions), `logs/` (group activity logs)

**store/:**
- Purpose: Application state snapshots
- Generated: Yes, created at runtime
- Committed: No, excluded from version control
- Contains: Session snapshots, task snapshots

**data/:**
- Purpose: Persistent runtime data
- Generated: Yes, created at runtime
- Committed: No
- Contains: SQLite database (`nanoclaw.db`), IPC directories

**container/agent-runner/:**
- Purpose: Container image build context
- Generated: No, committed to repo
- Committed: Yes
- Contains: `Dockerfile`, `src/`, `package.json`

**.planning/codebase/:**
- Purpose: Architecture documentation
- Generated: Yes, created by codebase mapper
- Committed: Yes (for planning purposes)
- Contains: `ARCHITECTURE.md`, `STRUCTURE.md`

---

*Structure analysis: 2026-04-04*
