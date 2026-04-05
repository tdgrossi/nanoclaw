# Phase 1: Setup & Initialization - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Install `@mastra/memory` and `@mastra/libsql` in the agent container build, initialize Mastra Memory at container startup with `observationalMemory` enabled, persist LibSQL store to the per-group mounted directory, wire up `resourceId`/`threadId` mapping, and expose token threshold configuration via environment variables.

Phase 2 (Memory Operations) will wire in the actual before/after query hooks using this setup.

</domain>

<decisions>
## Implementation Decisions

### Error handling
- **D-01:** Memory initialization failures are **fatal** — agent exits with error, no graceful degradation
  - Rationale: Phase 1 implementation should surface issues clearly; degraded memory behavior would be silent and hard to debug

### Configuration exposure
- **D-02:** Token thresholds configured via environment variables: `MASTRA_MESSAGE_TOKENS`, `MASTRA_OBSERVATION_TOKENS`
  - Default values hardcoded in initialization code
  - Agent reads at startup from `process.env`
  - Rationale: Simple, aligns with existing container env injection pattern

### Initialization timing
- **D-03:** Mastra Memory initialized **eagerly at container startup** (not lazily on first query)
  - Rationale: First-query latency is acceptable trade-off for clean initialization order; errors surface before any query runs

### Storage path
- **D-04:** LibSQL store at `/workspace/group/.mastra/memory.db`
  - Follows `.mastra/` hidden directory pattern, similar to existing `.claude/` session storage
  - Rationale: Per-group mounted volume ensures persistence across container restarts

### Resource/thread mapping
- **D-05:** `resourceId = chatJid` (per-group), `threadId = sessionId` (per-session)
  - Locked from project docs

### Injection point
- **D-06:** Memory initialized in `main()` before query loop, not inside `runQuery()`
  - Rationale: Initialization happens once at startup, not per-query

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core integration files
- `container/agent-runner/src/index.ts` — Agent runner entry point, `main()` function, `runQuery()` function (injection point)
- `container/agent-runner/package.json` — Container dependencies (add `@mastra/memory`, `@mastra/libsql` here)
- `container/Dockerfile` — Container build (package installation happens here)
- `container/build.sh` — Container build script

### Requirements
- `docs/REQUIREMENTS.md` §v1 Requirements — MEM-01 through MEM-04, MEM-07 through MEM-09

### Project context
- `.planning/PROJECT.md` §Constraints — Mastra memory standalone only, LibSQL file-based, token thresholds
- `.planning/PROJECT.md` §Mastra Memory Integration Point — injection in `runQuery()`, before/after query hooks

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `createPreCompactHook()` in `container/agent-runner/src/index.ts` — existing hook pattern that archives conversations before compaction; Mastra Memory could follow similar hook registration pattern

### Established Patterns
- Session storage in `groupFolder/.claude/` — `.mastra/` follows same hidden-directory convention
- Env vars passed to SDK via `sdkEnv` in `runQuery()` — same mechanism can pass `MASTRA_MESSAGE_TOKENS`, `MASTRA_OBSERVATION_TOKENS`
- `process.env` access in Node.js — straightforward env var reading

### Integration Points
- `main()` in `container/agent-runner/src/index.ts` — where Mastra Memory initialization should be added (before query loop)
- `container/agent-runner/package.json` — add `@mastra/memory` and `@mastra/libsql` as dependencies
- `container/Dockerfile` — may need build changes if `@mastra/libsql` requires native module compilation

</codebase_context>

<specifics>
## Specific Ideas

No specific product references or "I want it like X" moments — standard Mastra Memory initialization with NanoClaw-specific resource/thread mapping.

</specifics>

<deferred>
## Deferred Ideas

- Lazy initialization (on first query) — not chosen; eager initialization at startup is simpler for Phase 1
- Per-group config file (`.claude/memory-config.json`) — not chosen for Phase 1; env vars sufficient
- Graceful degradation on memory init failure — not chosen; fatal error for Phase 1

</deferred>

---

*Phase: 01-setup-initialization*
*Context gathered: 2026-04-04*
