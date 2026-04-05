# Phase 2: Memory Operations - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Inject prior observations before each query (MEM-05) and save user/assistant message pairs after each query completes (MEM-06), using the Mastra Memory setup from Phase 1. The before-query hook retrieves compressed observations for `resourceId`/`threadId` and prepends them to the prompt. The after-query hook saves message pairs as observations.

</domain>

<decisions>
## Implementation Decisions

### Injection approach
- **D-01:** Observations prepended to prompt string before pushing into `MessageStream`
  - Call `retrieveObservations(resourceId, sessionId)` at start of `runQuery()`
  - If observations exist, prepend to prompt: `[Prior context]\n\n[original prompt]`
  - Empty observations returns `""`, prepending empty string is safe
  - Rationale: Works with existing `MessageStream` architecture; no SDK changes needed; clear and debuggable

### Saving timing
- **D-02:** Observations saved **after query completes** — in `main()` after `runQuery()` returns, before waiting for next IPC
  - Save after each query turn (not after each message exchange within a query)
  - Rationale: `runQuery()` returns when the full query completes; this is the natural boundary

### SessionId handling
- **D-03:** Use current `sessionId` from `main()` scope — the sessionId the query actually ran with
  - If `sessionId` is undefined, use `'default'` (consistent with Phase 1 init fallback)
  - Rationale: The sessionId after `queryResult.newSessionId` update is the one we want for the NEXT query's observations

### Save function signature
- **D-04:** Add `saveObservation(resourceId: string, threadId: string, userMessage: string, assistantMessage: string): Promise<void>` to `memory.ts`
  - Saves a user/assistant pair as a single observation
  - Rationale: Clean API for Phase 2's save requirement; abstracts storage details

### Claude's Discretion
- Exact prepending format (e.g., `--- Prior Context ---\n{obs}\n---\n{prompt}` vs just `{obs}\n{prompt}`)
- Whether to include a header/boundary when prepending observations
- Error handling for save failures (non-fatal for Phase 2)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core integration files
- `container/agent-runner/src/index.ts` — `runQuery()` (injection point), `main()` query loop, session tracking
- `container/agent-runner/src/memory.ts` — `initMemory()`, `retrieveObservations()` (Phase 1), new `saveObservation()` (Phase 2)

### Phase 1 context
- `.planning/phases/01-setup-initialization/01-CONTEXT.md` — Decisions from Phase 1 (D-01 through D-06)

### Requirements
- `docs/REQUIREMENTS.md` §MEM-05, MEM-06 — Memory operations requirements
- `.planning/REQUIREMENTS.md` §MEM-05, MEM-06 — Same requirements in planning docs

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `retrieveObservations()` already in `memory.ts` — exported function from Phase 1
- `MessageStream` architecture in `runQuery()` — prompt pushed as first message, IPC messages piped during query

### Established Patterns
- Session tracking in `main()`: `sessionId` variable updated after each `queryResult.newSessionId`
- `resourceId = chatJid`, `threadId = sessionId` — locked from Phase 1 (D-05)
- Env var reading via `process.env` — already in `memory.ts` for token thresholds
- Module-level `_memoryInstance` — already stores initialized memory for cross-function access

### Integration Points
- `runQuery()` line 344: `stream.push(prompt)` — prepend observations before this line
- `main()` line 589: after `runQuery()` returns — save observation here
- `container/agent-runner/src/memory.ts` — add `saveObservation()` export

</codebase_context>

<specifics>
## Specific Ideas

No specific product references or "I want it like X" moments — standard Mastra Memory operation integration.

</specifics>

<deferred>
## Deferred Ideas

- System prompt injection via `systemPrompt.append` — not used; prepend approach is simpler and more debuggable
- Save after each assistant message within a query — not chosen; per-query-turn is the right granularity
- Graceful degradation on save failure — not chosen; Phase 2 makes save non-fatal (unlike Phase 1 init)

</deferred>

---

*Phase: 02-memory-operations*
*Context gathered: 2026-04-05*
