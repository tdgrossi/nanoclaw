# Phase 2: Memory Operations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 02-memory-operations
**Mode:** discuss
**Areas discussed:** Injection approach, Saving timing

## Assumptions Presented

### Injection approach
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Observations prepended to prompt string before pushing into `MessageStream` | Confident | Works with existing `MessageStream` architecture in `runQuery()` |
| `retrieveObservations()` called at start of `runQuery()` | Confident | `_memoryInstance` module-level singleton available after Phase 1 init |
| Empty string prepending is safe on `MessageStream.push()` | Confident | `stream.push()` accepts any string, empty string produces no content |
| SessionId fallback to `'default'` when undefined | Confident | Consistent with Phase 1 `initMemory()` fallback |

## User's Choice

### Injection approach
**User deferred to Claude's recommendation.**

**Recommended approach:** Prepend observations to prompt string before pushing into `MessageStream`
- Call `retrieveObservations(resourceId, sessionId)` at start of `runQuery()`
- If observations exist, prepend to prompt: `[Prior context]\n\n[original prompt]`
- Empty observations returns `""`, prepending empty string is safe
- Rationale: Works with existing `MessageStream` architecture; no SDK changes needed; clear and debuggable

## Claude's Discretion

The following areas were identified as Claude's discretion (user said "you decide"):

- **Exact prepending format** — e.g., `--- Prior Context ---\n{obs}\n---\n{prompt}` vs just `{obs}\n{prompt}`
- **Whether to include a header/boundary when prepending observations**
- **Error handling for save failures** (non-fatal for Phase 2)

