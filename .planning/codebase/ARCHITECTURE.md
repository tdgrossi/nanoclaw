# Architecture

**Analysis Date:** 2026-04-04

## Pattern Overview

**Overall:** Event-driven message processing with skill-based channel system

**Key Characteristics:**
- Single Node.js orchestrator process handles all message routing and system coordination
- Channel self-registration pattern allows dynamic addition of messaging integrations
- Container-based agent isolation using Docker/Apple Container for secure execution
- FIFO-based group queues enforce concurrency limits and message ordering
- SQLite database provides persistent state across restarts

## Layers

**Channel Layer:**
- Purpose: Abstract interface for multiple messaging platforms
- Location: `src/channels/`
- Contains: Channel registry (`registry.ts`), channel implementations
- Depends on: Core config, message storage
- Used by: Main orchestrator

**Message Processing Layer:**
- Purpose: Receive, filter, and route incoming messages to appropriate handlers
- Location: `src/index.ts` (orchestrator), `src/router.ts` (routing logic)
- Contains: Message loop, trigger pattern matching, sender allowlist filtering
- Depends on: Channel layer, database, config
- Used by: Orchestrator entry point

**Agent Execution Layer:**
- Purpose: Spawn and manage containerized Claude Agent SDK instances
- Location: `src/container-runner.ts` (host-side), `container/agent-runner/src/` (container-side)
- Contains: Container lifecycle, IPC communication, volume mounts, session management
- Depends on: Config (container image, paths), security config
- Used by: Message processing layer

**Persistence Layer:**
- Purpose: SQLite database for messages, groups, tasks, and sessions
- Location: `src/db.ts`
- Contains: Schema migrations, CRUD operations, state snapshots
- Depends on: SQLite (better-sqlite3), path config
- Used by: All layers that need persistent state

**IPC & Scheduling Layer:**
- Purpose: Inter-process communication and scheduled task execution
- Location: `src/ipc.ts`, `src/task-scheduler.ts`
- Contains: File-based IPC watcher, cron/interval task scheduling
- Depends on: Container runner, database
- Used by: Main orchestrator

**Security Layer:**
- Purpose: Access control, allowlisting, mount restrictions
- Location: `src/sender-allowlist.ts`, `src/mount-security.ts`
- Contains: Sender/permission validation, volume mount allowlisting
- Depends on: Config paths, group state
- Used by: Message processing, container execution

## Data Flow

**Message Ingestion Flow:**
1. Channel adapters poll their respective services (WhatsApp Web, Telegram API, etc.)
2. Incoming messages flow through `onMessage` callback
3. Allowlist filter checks sender permissions
4. Messages stored in SQLite via `storeMessage()`
5. Router checks if message meets trigger pattern (`@AssistantName`)
6. Non-trigger messages accumulate in DB for context gathering

**Message Processing Flow:**
1. Main loop polls for new messages via `getNewMessages()`
2. Messages deduplicated by group (chat_jid)
3. If container already running for group: pipe message via stdin
4. If container idle or no container: enqueue for new container
5. Group queue manages concurrency limits (max 5 concurrent)
6. On container availability: `processGroupMessages()` retrieves all pending messages
7. Messages formatted as XML and sent to container stdin

**Container Execution Flow:**
1. `runContainerAgent()` spawns container with mounted volumes
2. Container loads Claude Agent SDK, skills, and group memory
3. Agent processes prompt, tool calls execute inside container
4. Results stream to stdout via IPC markers
5. Host reads output, strips internal tags, sends via channel
6. Session ID persisted for conversation continuity

**Scheduled Task Flow:**
1. `startSchedulerLoop()` polls DB every 60 seconds
2. Tasks due (cron/interval/once) enqueued in group queues
3. Task containers spawned with `isScheduledTask=true` flag
4. Results logged to DB, messages sent to group chat
5. Next run time recalculated after completion

## Key Abstractions

**Channel Interface:**
- Purpose: Unified interface for diverse messaging platforms
- Examples: `src/channels/registry.ts`
- Pattern: Factory pattern with self-registration
- Key methods: `connect()`, `disconnect()`, `sendMessage()`, `ownsJid()`, `setTyping()`

**Group State Manager:**
- Purpose: Manages per-group container lifecycle and message ordering
- Examples: `src/group-queue.ts`
- Pattern: FIFO queue with concurrency limiting
- State tracking: active/idle/waiting with retry logic

**Container Runner:**
- Purpose: Abstracts container lifecycle for agent execution
- Examples: `src/container-runner.ts`, `container/agent-runner/src/index.ts`
- Pattern: Spawn/wait/streams output
- Features: Volume mount management, IPC file watching, session persistence

**IPC Message Protocol:**
- Purpose: Bidirectional communication between host and containers
- Examples: `src/ipc.ts`
- Pattern: File-based messages with JSON payloads
- Security: Authorization checks verify source group permissions

**Task Scheduler:**
- Purpose: Execute recurring or one-time Claude tasks
- Examples: `src/task-scheduler.ts`
- Pattern: Cron/interval parser with DB-backed scheduling
- Features: Context modes (group/isolated), run logging

## Entry Points

**Main Application:**
- Location: `src/index.ts` (line 517 `main()` function)
- Triggers: Direct execution via `node dist/index.js` or `npm run dev`
- Responsibilities: Initialize all subsystems, connect channels, start loops
- Key initialization order: DB init → load state → connect channels → start scheduler → start IPC watcher → start message loop

**Channel Initialization:**
- Location: `src/channels/index.ts` (self-registration)
- Triggers: Module import in `src/index.ts`
- Responsibilities: Each channel registers via `registerChannel()` factory

**Container Entry Point:**
- Location: `container/agent-runner/src/index.ts` (line 1)
- Triggers: Container starts, reads stdin for ContainerInput JSON
- Responsibilities: Initialize SDK, load skills, process messages, emit results

**IPC Watcher:**
- Location: `src/ipc.ts` (line 30 `startIpcWatcher()`)
- Triggers: Called from main after state loaded
- Responsibilities: Watch IPC directories, process messages and tasks, enforce authorization

**Task Scheduler:**
- Location: `src/task-scheduler.ts` (line 1)
- Triggers: Called from main after IPC watcher starts
- Responsibilities: Poll DB for due tasks, enqueue for execution, manage run logs

## Error Handling

**Strategy:** Graceful degradation with state recovery

**Patterns:**
- Message processing errors: Roll back cursor, retry on next poll
- Container errors: Retry with backoff (up to 5 retries), close container
- Channel disconnections: Automatic reconnect attempts (handled by channel implementation)
- Database errors: Fatal - process exits
- IPC authorization: Reject and log unauthorized attempts

**Recovery Mechanisms:**
- Cursor rollback on agent errors prevents duplicate responses
- Orphan container cleanup on startup (`cleanupOrphans()`)
- Pending message recovery on startup checks for unprocessed messages
- OneCLI agent ensure-on-startup recovers from missed agent creation

## Cross-Cutting Concerns

**Logging:**
- Framework: Pino with pretty printing
- Location: `src/logger.ts` (re-export from pino)
- Levels: debug, info, warn, error, fatal

**Validation:**
- Config validation: Timezone validation before acceptance
- Group folder validation: `isValidGroupFolder()` checks path safety
- Mount validation: Allowlist-based security for volume mounts
- Sender validation: Allowlist filter before message storage

**Authentication:**
- Channel auth: Managed by channel implementations (OAuth, QR codes, etc.)
- Secrets: Injected via OneCLI gateway at container runtime
- IPC auth: Source group verification for inter-group messaging
- Sender auth: Allowlist filtering by sender ID per group

---

*Architecture analysis: 2026-04-04*
