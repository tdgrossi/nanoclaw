# Roadmap: NanoClaw Observational Memory

## Overview

**Project:** NanoClaw Observational Memory
**Core Value:** Agents that maintain persistent, compressed memory across separate invocations and container restarts
**Granularity:** Standard

## Phases

- [ ] **Phase 1: Setup & Initialization** — Install packages, initialize Mastra Memory, configure LibSQL persistence and token thresholds
- [ ] **Phase 2: Memory Operations** — Inject prior observations before queries and persist new observations after queries

---

## Phase Details

### Phase 1: Setup & Initialization

**Goal:** Agent containers have Mastra Memory installed, initialized, and configured to persist LibSQL data to per-group mounted directories.

**Depends on:** Nothing

**Requirements:** MEM-01, MEM-02, MEM-03, MEM-04, MEM-07, MEM-08, MEM-09

**Success Criteria** (what must be TRUE):

1. `@mastra/memory` and `@mastra/libsql` are installed in the agent container build
2. Mastra Memory initializes at agent startup with `observationalMemory` enabled
3. LibSQL store persists to the per-group mounted directory and survives container restarts
4. `resourceId` maps to `chatJid` (per-group) and `threadId` maps to `sessionId` (per-user thread)
5. Memory token thresholds are configurable via environment variables or group config

**Plans:** TBD

### Phase 2: Memory Operations

**Goal:** Agents retrieve compressed observations before each query and save new observations after each query completes.

**Depends on:** Phase 1

**Requirements:** MEM-05, MEM-06

**Success Criteria** (what must be TRUE):

1. Before executing a query, agents retrieve compressed observations for the current `threadId` and inject them into the prompt context
2. After a query completes, user/assistant message pairs are saved as observations to the memory store
3. Memory operations use the correct `resourceId` (chatJid) and `threadId` (sessionId) pairing

**Plans:** TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Setup & Initialization | 0/0 | Not started | - |
| 2. Memory Operations | 0/0 | Not started | - |

---

## Coverage

**v1 Requirements:** 9 total
**Mapped:** 9/9

| Requirement | Phase |
|-------------|-------|
| MEM-01: Install @mastra/memory and @mastra/libsql | Phase 1 |
| MEM-02: Initialize Mastra Memory with observationalMemory enabled | Phase 1 |
| MEM-03: Configure token-based compression thresholds | Phase 1 |
| MEM-04: Persist LibSQL store to per-group mounted directory | Phase 1 |
| MEM-05: Before query — retrieve compressed observations, inject into prompt | Phase 2 |
| MEM-06: After query — save user/assistant message pair as observation | Phase 2 |
| MEM-07: resourceId = chatJid, threadId = sessionId | Phase 1 |
| MEM-08: Expose memory config via environment variables or group config | Phase 1 |
| MEM-09: Configurable token thresholds | Phase 1 |

**Status:** All v1 requirements mapped. No orphans.
