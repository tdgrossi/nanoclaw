# Technology Stack

**Analysis Date:** 2026-04-04

## Languages

**Primary:**
- TypeScript 5.7 - Main application and core logic
- JavaScript 9.35 - Configuration and test code (ESLint)

**Secondary:**
- Bash - Build scripts and service management
- Shell scripts - Container entrypoint

## Runtime

**Environment:**
- Node.js 20+ (engine requirement)
- ES2022 target (TypeScript compilation target)

**Package Manager:**
- npm (Node.js default)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Node.js ES Modules - Module system with ES2022 features
- No web framework - Lightweight event-driven architecture

**Testing:**
- Vitest 4.0.18 - Test runner with coverage support
- V8 Coverage Provider - Coverage reporting
- TypeScript ESLint - Type-aware linting

**Build/Dev:**
- TypeScript 5.7 - Compilation to JavaScript
- tsx 4.19 - TypeScript execution for development
- Prettier 3.8.1 - Code formatting
- ESLint 9.35 - Linting with no-catch-all plugin
- Husky 9.1.7 - Git hooks (pre-commit)

## Key Dependencies

**Critical:**
- `@onecli-sh/sdk` 0.2.0 - Secret injection gateway for credential management
- `better-sqlite3` 11.10.0 - SQLite database (message storage, task scheduling)
- `@anthropic-ai/claude-agent-sdk` 0.2.76 - Claude Agent SDK (in agent container)

**Infrastructure:**
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

**Container Runtime:**
- Docker - Container isolation
- Apple Container - macOS container option
- Node 22-slim - Container base image
- Chromium - Browser automation (agent-browser)

## Configuration

**TypeScript:**
- Target: ES2022
- Module: NodeNext
- Strict mode enabled
- Source maps enabled

**Build Tools:**
- ESLint config: `eslint.config.js`
- Prettier config: `.prettierrc` (single quotes)
- Vitest config: `vitest.config.ts`
- Test patterns: `src/**/*.test.ts`, `setup/**/*.test.ts`

**Environment:**
- `.env` file support (falls back to process.env)
- Environment config in `data/env/env` (container mount)
- Secret injection via OneCLI gateway

## Platform Requirements

**Development:**
- Node.js 20+
- npm
- TypeScript
- Git

**Production:**
- Node.js 20+
- SQLite support (better-sqlite3 native module)
- Docker or Apple Container runtime
- Service manager (launchd/systemd)
- Chromium for browser automation

**Container Build:**
- Docker or container runtime
- Linux VM (for agent containers)

---

*Stack analysis: 2026-04-04*
