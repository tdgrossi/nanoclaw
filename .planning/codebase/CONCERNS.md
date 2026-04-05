# Codebase Concerns

**Analysis Date:** 2026-04-04

## Tech Debt

### Database Migrations Without Versioning

**Issue:** Schema migrations use try/catch with no migration tracking system. Columns are added conditionally, but there's no way to track migration state or rollback.

**Files:**
- `src/db.ts` (lines 87-148)
- Migrations: context_mode, script, is_bot_message, is_main, channel, is_group

**Impact:** As schema evolves, migration logic becomes harder to reason about. No clear history of what migrations ran.

**Fix approach:** Implement a migrations table with version numbers, similar to typeorm or drizzle migration systems.

### Message Storage Without Retention Policy

**Issue:** Messages accumulate indefinitely in SQLite. No TTL or cleanup for old messages beyond the schema itself.

**Files:**
- `src/db.ts` (line 26-35: messages table)
- No cleanup mechanism detected in codebase

**Impact:** Database size grows unbounded, potentially causing performance degradation.

**Fix approach:** Add optional message retention period via config, with periodic cleanup job.

### In-Memory State Without Persistence on Error

**Issue:** In-memory state (registeredGroups, sessions, lastAgentTimestamp) is loaded from DB at startup but not persisted on every change. Only written when state change happens.

**Files:**
- `src/index.ts` (lines 67-71: in-memory state)
- `src/index.ts` (lines 97-105: loadState function)

**Impact:** If process crashes with dirty state, some updates may be lost.

**Fix approach:** Consider transactional writes or WAL mode for SQLite.

### Task Scheduler Drift Calculation

**Issue:** Interval-based tasks use anchor-to-last-run strategy to prevent drift, but cron tasks rely on library to prevent drift. Mixed strategies may cause confusion.

**Files:**
- `src/task-scheduler.ts` (lines 43-59: interval drift prevention)
- `src/task-scheduler.ts` (lines 36-40: cron drift via library)

**Impact:** Different task types behave differently. No unified drift prevention strategy.

**Fix approach:** Document mixed strategy, or implement consistent approach for all task types.

### Container Output Size Limit with Silent Truncation

**Issue:** Container output is capped at 10MB (CONTAINER_MAX_OUTPUT_SIZE) but truncation behavior isn't explicitly logged to the user.

**Files:**
- `src/config.ts` (line 51: 10485760 bytes default)
- `src/container-runner.ts` (line 461-471: output handling)

**Impact:** Users may not realize output was truncated, leading to incomplete agent responses.

**Fix approach:** Log when output exceeds limit and indicates truncation to user.

### IPC Authorization Checks Rely on Folder Matching

**Issue:** IPC message authorization only checks if targetGroup.folder equals sourceGroup, not cryptographic verification.

**Files:**
- `src/ipc.ts` (lines 78-94: authorization check)

**Impact:** If folder names can be predicted or spoofed, cross-group message injection becomes possible.

**Fix approach:** Implement signed tokens or other cryptographic verification for IPC messages.

### Remote Control Session State File Permissions

**Issue:** Remote control state is stored in plaintext JSON file in DATA_DIR, readable by any process with filesystem access.

**Files:**
- `src/remote-control.ts` (line 21: STATE_FILE location)
- `src/remote-control.ts` (lines 25-28: saveState)

**Impact:** Process information (PID, URLs, etc.) exposed to local users.

**Fix approach:** Consider storing in protected location or using process credentials.

### OneCLI SDK Singleton Initialization

**Issue:** OneCLI is instantiated at module level in both `src/index.ts` and `src/container-runner.ts`, but never explicitly closed or cleaned up.

**Files:**
- `src/index.ts` (line 76: new OneCLI)
- `src/container-runner.ts` (line 31: new OneCLI)

**Impact:** Resource leaks or connection pool exhaustion over long runtime.

**Fix approach:** Initialize on demand or implement proper lifecycle management.

## Known Bugs

### No Known Critical Bugs

**Status:** No critical bugs detected in codebase.

**Note:** See TODO/FIXME comments section - codebase has no explicit TODO or FIXME markers, suggesting active maintenance and cleanup.

## Security Considerations

### Mount Security Depends on External Allowlist

**Risk:** Mount security validation loads from `~/.config/nanoclaw/mount-allowlist.json`. If this file is missing or malformed, default blocked patterns apply but no warning is logged.

**Files:**
- `src/mount-security.ts` (lines 65-80: file loading)
- `src/config.ts` (line 28: MOUNT_ALLOWLIST_PATH)

**Current mitigation:** Defaults exist for sensitive paths (.ssh, .gnupg, .aws, etc.)

**Recommendations:**
- Log warning if allowlist file doesn't exist
- Validate allowlist JSON schema on load
- Add integrity check (hash) to prevent tampering

### Sender Allowlist Caching Risk

**Risk:** Sender allowlist is cached in memory and only reloaded on process restart. Changes to allowlist file require restart.

**Files:**
- `src/sender-allowlist.ts` (lines 18-24: caching)

**Current mitigation:** Reload function exists but not called automatically.

**Recommendations:** Add file watcher for allowlist or periodic reload.

### Environment Variables Shadowed in Containers

**Risk:** .env file is mounted as /dev/null to prevent agent reading. However, this creates a confusing UX where agent can't see what env vars exist.

**Files:**
- `src/container-runner.ts` (lines 81-90: .env shadowing)

**Recommendations:** Consider documenting that credentials are injected by gateway, or show stub env file.

### IPC Directory Permissions

**Risk:** IPC directories created with default umask, potentially exposing inter-group communication to local users.

**Files:**
- `src/ipc.ts` (line 38: fs.mkdirSync with default mode)

**Recommendations:** Set explicit permissions on IPC directories (0o755 or stricter).

### No Rate Limiting on Message Processing

**Risk:** No rate limiting on agent invocations per group. A fast-moving chat could trigger many agent runs.

**Files:**
- `src/group-queue.ts` (queue-based limiting)
- `src/index.ts` (message loop)

**Current mitigation:** Concurrency limits exist but per-group rate limits do not.

**Recommendations:** Consider per-group rate limits or cooldown periods.

## Performance Bottlenecks

### SQLite Query Performance on Large Message Tables

**Problem:** Messages table has index on timestamp but queries may need filtering by chat_jid AND timestamp range.

**Files:**
- `src/db.ts` (line 38: single-column index)
- `src/db.ts` (line 200-260: message retrieval functions)

**Cause:** No compound index for common query patterns (chat_jid + timestamp).

**Improvement path:** Add compound index: `CREATE INDEX idx_chat_timestamp ON messages(chat_jid, timestamp)`.

### Serial Container Execution per Group

**Problem:** Each group processes one container at a time. Tasks and messages queue within a single group.

**Files:**
- `src/group-queue.ts` (lines 30-55: GroupState structure)
- `src/index.ts` (line 358-391: runAgent function)

**Cause:** Intentional design for isolation, but limits throughput within groups.

**Improvement path:** Consider configurable parallelization within groups for non-blocking tasks.

### Polling-Based IPC Watching

**Problem:** IPC directory scanning uses 1-second polling interval, not filesystem watching.

**Files:**
- `src/config.ts` (line 56: IPC_POLL_INTERVAL = 1000)
- `src/ipc.ts` (lines 40-52: poll loop)

**Cause:** Cross-platform compatibility; inotify/FSEvents not used.

**Improvement path:** Consider optional inotify for Linux where available.

### Snapshot Files Written on Every Agent Run

**Problem:** Groups snapshot and tasks snapshot written to JSON files on every agent invocation, even if unchanged.

**Files:**
- `src/container-runner.ts` (lines 697-725: write snapshots)
- Called from `src/index.ts` (lines 322-344)

**Cause:** No dirty checking; files written unconditionally.

**Improvement path:** Add dirty flag or checksum comparison before writing.

### Database Connections Not Pooled

**Problem:** SQLite uses single connection for entire process lifetime. Better-SQLite3 is synchronous by design.

**Files:**
- `src/db.ts` (lines 15-16: single db instance)
- `src/db.ts` (lines 151-160: initDatabase)

**Cause:** Intentional design for simplicity; better-sqlite3 is WAL-capable.

**Improvement path:** Consider WAL mode if not already enabled, or migration to poolable database.

## Fragile Areas

### Main Orchestrator Module Size

**Files:** `src/index.ts` (714 lines)

**Why fragile:** Monolithic orchestrator handles message loop, agent invocation, state management, and channel coordination. Changes risk breaking multiple concerns.

**Safe modification:** Break into smaller modules by concern before making major changes.

**Test coverage:** Partial - some test files exist but main orchestrator coverage unclear.

### Container Runner IPC Parsing

**Files:** `src/container-runner.ts` (lines 388-470: output parsing)

**Why fragile:** Relies on sentinel markers (---NANOCLAW_OUTPUT_START---, ---NANOCLAW_OUTPUT_END---) for robust parsing. Any change to agent-runner breaks this.

**Safe modification:** Add version negotiation between host and container, or use structured output (JSON lines).

**Test coverage:** Basic - output parsing tested but edge cases unclear.

### Sender Allowlist Validation Logic

**Files:** `src/sender-allowlist.ts` (lines 30-60: allowlist processing)

**Why fragile:** Allowlist supports wildcards, negation, and channel-specific rules. Logic is complex and error-prone.

**Safe modification:** Add comprehensive test suite covering all rule combinations.

**Test coverage:** Partial - test file exists but rule coverage unclear.

### Message Cursor Management

**Files:** `src/index.ts` (lines 281-310: lastAgentTimestamp tracking)

**Why fragile:** Rollback on agent error could cause message loss if cursor not updated atomically.

**Safe modification:** Implement atomic cursor updates with database transactions.

**Test coverage:** Basic error path tested.

### IPC Authorization by Folder Matching

**Files:** `src/ipc.ts` (lines 78-94: cross-group message routing)

**Why fragile:** Authorization relies on folder name matching. No cryptographic verification of message source.

**Safe modification:** Implement signed tokens or HMAC verification for IPC messages.

**Test coverage:** Not detected in test files.

### Task Scheduler Loop

**Files:** `src/task-scheduler.ts` (lines 200-280: scheduler loop)

**Why fragile:** Infinite loop with polling and error handling. Crashes in task execution could destabilize scheduler.

**Safe modification:** Add task-level error boundaries and exponential backoff for retries.

**Test coverage:** Partial - scheduler tested but task error paths unclear.

## Scaling Limits

### Single-Process Architecture

**Resource:** Node.js event loop

**Current capacity:**
- Limited by MAX_CONCURRENT_CONTAINERS (default 5)
- Each container uses memory and CPU
- No horizontal scaling mechanism

**Limit:** Process can handle 5 concurrent agent runs. Beyond that, groups queue.

**Scaling path:** Consider process manager (PM2) or container orchestration for multi-process deployment.

### SQLite Database Size

**Resource:** Disk space and query performance

**Current capacity:**
- No documented size limits
- Indexes exist but may not cover all query patterns

**Limit:** As messages accumulate, query performance degrades. Large databases (>1GB) may cause issues.

**Scaling path:** Implement message archival to cold storage, or periodic cleanup policy.

### Memory Usage

**Resource:** RAM

**Current capacity:**
- Each container consumes memory inside VM/container
- Node process holds in-memory state

**Limit:** No memory monitoring or limits enforced.

**Scaling path:** Add memory monitoring and graceful degradation.

### IPC File Accumulation

**Resource:** DATA_DIR storage

**Current capacity:**
- No cleanup for processed IPC files
- File deletion on success but error cases may leave files

**Limit:** Accumulated IPC files could fill disk.

**Scaling path:** Implement cleanup job for old IPC files.

## Dependencies at Risk

### OneCLI SDK Coupling

**Risk:** SDK is coupled at module level with hardcoded URL. If API changes, all callers break.

**Files:**
- `src/index.ts` (line 76)
- `src/container-runner.ts` (line 31)

**Impact:** Breaking API changes require code changes across codebase.

**Migration plan:** Abstract OneCLI behind interface, making substitution easier.

### Better-SQLite3 Native Module

**Risk:** better-sqlite3 is a native Node module requiring compilation.

**Impact:** Platform-specific builds may break on Node version upgrades or OS updates.

**Migration plan:** Consider pure-JS alternatives (sql.js) for portability, accepting performance tradeoff.

### Pino Logger Configuration

**Risk:** Logger configured at module level with pretty printing. In production, pretty printing adds overhead.

**Files:**
- `src/logger.ts` (module-level pino config)
- `src/config.ts` (LOG_LEVEL env var)

**Impact:** Performance overhead in production if LOG_LEVEL=debug.

**Migration plan:** Separate dev/prod configurations, or disable pretty printing in production.

## Missing Critical Features

### Backup and Restore Mechanism

**Problem:** No backup system for SQLite database or state files.

**Blocks:** Disaster recovery scenarios.

**Priority:** High

### Health Check Endpoint

**Problem:** No HTTP health endpoint for monitoring (e.g., for systemd or orchestrators).

**Blocks:** Integration with process supervisors.

**Priority:** Medium

### Graceful Shutdown

**Problem:** Signal handling exists but graceful container cleanup on SIGTERM is not fully implemented.

**Blocks:** Clean restart and upgrade procedures.

**Priority:** Medium

### Structured Logging Output

**Problem:** Logs are human-readable via pino-pretty. No JSON structured logs for log aggregation systems.

**Blocks:** Integration with centralized logging (ELK, Datadog, etc.).

**Priority:** Low (pino supports JSON output mode)

### Message Retry Logic

**Problem:** Failed message sends (after channel error) are not retried.

**Blocks:** Reliable message delivery under transient failures.

**Priority:** Medium

## Test Coverage Gaps

### Missing Unit Tests

**What's not tested:**
- `src/mount-security.ts` - no test file detected
- `src/ipc.ts` - no test file detected
- `src/config.ts` - no test file detected

**Risk:** Security module and core config untested, high change risk.

**Priority:** High for mount-security, medium for config.

### Integration Test Coverage

**What's not tested:**
- Full message flow: channel -> orchestrator -> agent -> container -> response
- Multi-group concurrent interactions
- IPC cross-group messaging

**Risk:** System-level issues may not be caught by unit tests.

**Priority:** Medium

### Error Path Testing

**What's not tested:**
- Container runtime failures
- Database corruption scenarios
- IPC file permission errors
- OneCLI gateway unreachable

**Risk:** Error paths may not handle edge cases gracefully.

**Priority:** Medium

### Snapshot File Tests

**What's not tested:**
- Groups snapshot format changes
- Tasks snapshot format changes
- Version compatibility

**Risk:** Breaking changes to snapshot formats cause runtime failures.

**Priority:** Low (snapshot format is internal)

### Channel Integration Tests

**What's not tested:**
- Each channel implementation (WhatsApp, Telegram, Discord, Slack, Gmail)
- Channel authentication flows
- Channel reconnection logic

**Risk:** Channel-specific bugs not caught by test suite.

**Priority:** High (channels are critical)

---

*Concerns audit: 2026-04-04*
