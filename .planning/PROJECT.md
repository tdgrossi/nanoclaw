# NanoClaw Observational Memory

## What This Is

Enhancement to NanoClaw's agent system that adds Mastra observational memory, enabling agents to remember all interactions across long-running threads through automatic compression. Agents observe conversations, compress memories when token thresholds are exceeded, and resume with full context across container restarts.

## Core Value

Agents that maintain persistent, compressed memory across separate invocations and container restarts — without manual memory management or token budget explosions.

## Requirements

### Active

- [ ] Add @mastra/memory and @mastra/libsql to agent containers
- [ ] Integrate Mastra Memory into agent-runner (container/agent-runner/src/index.ts)
- [ ] Configure observational memory with token-based compression thresholds
- [ ] Per-user thread memory using sessionId as threadId
- [ ] LibSQL storage persisted to per-group mounted directory (survives container restarts)
- [ ] Memory loaded before first query, saved after each query completion

### Out of Scope

- Semantic recall / vector search — using only observational memory, not embeddings
- Procedural memory — deferred to future work
- Mastra agent class — using only the memory package standalone

## Context

**Existing Architecture:**
- NanoClaw spawns agent containers per-group via `runContainerAgent()` in `src/container-runner.ts`
- Agent runs inside container via Claude Agent SDK in `container/agent-runner/src/index.ts`
- Session persistence via `sessionId` passed through `ContainerInput`
- Sessions stored in per-group `.claude/` directories on mounted volumes
- `PreCompact` hook already archives conversations to `conversations/` before SDK compaction

**Current Memory:**
- Claude Code built-in session management (sessionId / resumeSessionAt)
- `CLAUDE_CODE_DISABLE_AUTO_MEMORY: '0'` enables Claude's auto memory
- No cross-invocation persistent memory beyond session resume

**Mastra Memory Integration Point:**
- `runQuery()` in `container/agent-runner/src/index.ts` is the injection point
- Before query: retrieve compressed observations for resourceId/threadId, prepend to prompt
- After query: save user/assistant message pair as observation
- Storage: LibSQL file in per-group mounted directory

**Resource/Thread Model:**
- `resourceId` = `chatJid` (per-group, shared across users in group)
- `threadId` = `sessionId` (per-session, each user conversation thread)

## Constraints

- **Tech stack**: Only @mastra/memory and @mastra/libsql — no full Mastra agent/server
- **Storage**: LibSQL file-based, mounted volume persists across container restarts
- **Compression**: Token-based thresholds configured at initialization
- **SDK**: Claude Agent SDK query loop unchanged, Mastra memory wraps it

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Standalone Mastra memory only | Cleanest integration, no agent/server overhead | — Pending |
| sessionId → threadId mapping | Natural fit with existing session persistence | — Pending |
| Per-group LibSQL storage | Survives container restarts via mounted volume | — Pending |
| Observational memory only | User specified observational, no semantic recall | — Pending |

---

*Last updated: 2026-04-04 after initialization*
