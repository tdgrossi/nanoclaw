# Quick Task 260405-ci3: Mastra Memory Version Update Compatibility

## One-liner

Fixed breaking API changes in `@mastra/memory` v1.13.1 and `@mastra/libsql` v1.7.4 by updating `memory.ts` to use the new `Memory` class, `getContext()` method, and `saveMessages()` with proper `MastraDBMessage` format.

## What Was Done

Checked for breaking API changes after updating `@mastra/memory` from an earlier version to `^1.13.1` and `@mastra/libsql` from an earlier version to `^1.7.4`. Found three breaking changes and fixed them:

### Breaking Changes Found

1. **`createMemory` factory replaced by `Memory` class**
   - Old: `createMemory({ store, observationalMemory: true, options: {...} })`
   - New: `new Memory({ storage: store, options: { observationalMemory: {...} } })`

2. **`LibSQLStore` now requires `id` property**
   - Old: `new LibSQLStore({ url: 'file:...' })`
   - New: `new LibSQLStore({ id: 'nanoclaw-memory', url: 'file:...' })`

3. **`getMemories()` replaced by `getContext()`**
   - Old: `memory.getMemories(resourceId, threadId)` returned string directly
   - New: `memory.getContext({ threadId, resourceId })` returns object with `systemMessage` property

4. **`addMemories()` replaced by `saveMessages()` with MastraDBMessage format**
   - Old: `memory.addMemories(resourceId, threadId, [{ role: 'user', content: '...' }])`
   - New: `memory.saveMessages({ messages: [{ id, role, createdAt, content: { format: 2, parts: [{ type: 'text', text }] } }] })`

5. **Type definitions lag runtime**
   - `MemoryConstructorConfig` in type definitions does not expose `observationalMemory` even though runtime JS code correctly handles it at `config.options.observationalMemory`
   - Workaround: Used `as any` type assertion

## Files Modified

| File | Change |
|------|--------|
| `container/agent-runner/src/memory.ts` | Updated API calls for v1.13.1 |
| `container/agent-runner/package-lock.json` | Updated dependency lockfile |

## Verification

- `npm run build` passes in `container/agent-runner/` without `@mastra/memory` or `@mastra/libsql` errors

## Commit

**Hash:** `cf49f73`
**Message:** `fix(container): update memory.ts for @mastra/memory v1.13.1 API changes`

---

## Deviations from Plan

**Auto-fixed Issues (Rule 1 - Bug):** Fixed multiple breaking API incompatibilities discovered during compilation

| Issue | Fix |
|-------|-----|
| `createMemory` not exported | Replaced with `new Memory` class |
| `LibSQLStore` missing `id` | Added `id: 'nanoclaw-memory'` |
| `getMemories` doesn't exist | Changed to `getContext({ threadId, resourceId })` |
| `addMemories` doesn't exist | Changed to `saveMessages({ messages: [...] })` |
| `MastraDBMessage` not exported from `@mastra/memory` | Imported from `@mastra/core/agent` |
| `observationalMemory` type mismatch | Used `as any` assertion |

## Threat Flags

None - no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- [x] Build passes
- [x] Commit hash `cf49f73` exists
- [x] `container/agent-runner/src/memory.ts` exists and is correct
