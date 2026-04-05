# State: NanoClaw Observational Memory

## Project Reference

**Project:** NanoClaw Observational Memory
**Core Value:** Agents that maintain persistent, compressed memory across separate invocations and container restarts — without manual memory management or token budget explosions.
**Current Focus:** Phase 1: Setup & Initialization

## Current Position

**Milestone:** v1 — Observational Memory
**Phase:** 1 — Setup & Initialization (Not started)
**Plan:** None selected yet

## Performance Metrics

| Metric | Value |
|--------|-------|
| Total Phases | 2 |
| Requirements | 9 |
| Phase 1 Requirements | 7 |
| Phase 2 Requirements | 2 |

## Accumulated Context

### Key Decisions

- **Standalone Mastra memory only:** Using only `@mastra/memory` and `@mastra/libsql` — no full Mastra agent/server overhead
- **sessionId maps to threadId:** Natural fit with existing session persistence architecture
- **Per-group LibSQL storage:** Survives container restarts via mounted volume
- **Observational memory only:** User specified observational, no semantic recall or vector search
- **resourceId = chatJid, threadId = sessionId:** Per-group shared memory with per-user thread isolation

### Architecture Notes

- Injection point: `runQuery()` in `container/agent-runner/src/index.ts`
- Before query: retrieve compressed observations for resourceId/threadId, prepend to prompt
- After query: save user/assistant message pair as observation
- Storage: LibSQL file in per-group mounted directory
- Current PreCompact hook already archives conversations to `conversations/` before SDK compaction

### Phase 1 Deliverables

- Install `@mastra/memory` and `@mastra/libsql` in agent container build
- Initialize Mastra Memory with `observationalMemory` enabled
- Configure token-based compression thresholds
- Persist LibSQL store to per-group mounted directory
- Wire up resourceId/threadId mapping
- Expose config via environment variables or group config

### Phase 2 Deliverables

- Before query: retrieve compressed observations and inject into prompt
- After query: save user/assistant message pair as observation

## Session Continuity

**Last updated:** 2026-04-04
**Last phase worked:** None
