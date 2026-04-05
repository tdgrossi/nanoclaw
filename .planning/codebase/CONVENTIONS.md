# Coding Conventions

**Analysis Date:** 2026-04-04

## Naming Patterns

**Files:**
- TypeScript source files use kebab-case or lowercase: `container-runner.ts`, `group-queue.ts`
- Test files co-located with source using `.test.ts` suffix: `db.test.ts`
- Interfaces and types use PascalCase: `NewMessage`, `RegisteredGroup`, `ChannelOpts`

**Functions:**
- Functions use camelCase: `registerChannel`, `getChannelFactory`, `runContainerAgent`
- Private/internal functions prefixed with underscore: `_initTestDatabase`, `_setRegisteredGroups`
- Event handlers named descriptively: `onMessage`, `onChatMetadata`

**Variables:**
- Variables use camelCase: `groupJid`, `testInput`, `newTimestamp`
- Constants in SCREAMING_SNAKE_CASE: `MAX_CONCURRENT_CONTAINERS`, `MAX_RETRIES`, `BASE_RETRY_MS`
- Boolean variables often prefixed with `is`, `has`, `should`: `isMain`, `hasChannel`, `shouldProcess`

**Types:**
- Interfaces prefixed with descriptive nouns: `ChannelFactory`, `QueuedTask`, `GroupState`
- Type aliases for unions: `OnInboundMessage`, `OnChatMetadata`
- Internal/undocumented functions use underscore prefix: `_initTestDatabase`, `_setRegisteredGroups`

## Code Style

**Formatting:**
- Tool: Prettier (`.prettierrc`)
- Single quotes enabled: `"singleQuote": true`
- Files: `src/**/*.ts`
- Commands:
  - `npm run format` - Apply formatting
  - `npm run format:check` - Verify formatting

**Linting:**
- Tool: ESLint 9.x with TypeScript ESLint
- Config: `eslint.config.js`
- Ignores: `node_modules/`, `dist/`, `container/`, `groups/`
- Key rules enforced:
  - `@typescript-eslint/no-unused-vars: error` - All unused variables are errors
  - `@typescript-eslint/no-explicit-any: warn` - Discouraged
  - `no-catch-all/no-catch-all: warn` - Discourages catching generic `catch (err)`
  - Unused parameters must be prefixed with `_`

**TypeScript:**
- Target: ES2022
- Module: NodeNext (ES modules with `.js` extensions)
- Strict mode enabled
- No `any` types (enforced with warnings)
- Explicit return types on exported functions

**Import Organization:**
1. Node.js built-ins: `import fs from 'fs'`, `import path from 'path'`
2. External packages: `@onecli-sh/sdk`, `pino`, `better-sqlite3`, `zod`
3. Internal modules: relative imports with `.js` extensions

Example from `src/index.ts`:
```typescript
import pino from 'pino'; // External
import { OneCLI } from '@onecli-sh/sdk'; // External
import { ASSISTANT_NAME, GROUPS_DIR } from './config.js'; // Internal
import './channels/index.js'; // Side-effect import (register channels)
import { registerChannel } from './channels/registry.js'; // Internal
```

## Error Handling

**Strategy:** Explicit error returns and typed errors

**Patterns:**

1. **Try-catch with logging:**
```typescript
try {
  await this.processMessagesFn(groupJid);
} catch (err) {
  logger.error({ groupJid, err }, 'Error processing messages for group');
  this.scheduleRetry(groupJid, state);
}
```

2. **Explicit error returns:**
```typescript
function sendMessage(groupJid: string, text: string): boolean {
  try {
    // ... implementation
    return true;
  } catch {
    return false; // Silent failure with boolean return
  }
}
```

3. **Error throwing for critical failures:**
```typescript
export function routeOutbound(channels: Channel[], jid: string, text: string): Promise<void> {
  const channel = channels.find((c) => c.ownsJid(jid) && c.isConnected());
  if (!channel) throw new Error(`No channel for JID: ${jid}`);
  return channel.sendMessage(jid, text);
}
```

4. **Empty catch blocks for ignored errors:**
```typescript
try {
  database.exec(`ALTER TABLE ...`);
} catch {
  /* column already exists */
}
```

5. **Async error handling in event handlers:**
```typescript
enqueueMessageCheck(groupJid: string): void {
  if (this.shuttingDown) return;

  const state = this.getGroup(groupJid);
  // ... logic

  this.runForGroup(groupJid, 'messages').catch((err) =>
    logger.error({ groupJid, err }, 'Unhandled error in runForGroup'),
  );
}
```

**No Catch-All Rule:**
- ESLint rule `no-catch-all/no-catch-all: warn` discourages bare `catch` blocks
- Requires explicitly typed catch parameters: `catch (err: Error)`

## Logging

**Framework:** Pino with pino-pretty transport

**Configuration:** `src/logger.ts`
```typescript
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } },
});
```

**Patterns:**
- Structured logging with context objects: `logger.info({ jid, identifier }, 'message')`
- Log levels: `debug`, `info`, `warn`, `error`, `fatal`
- Use debug for verbose operational info
- Use error with error objects: `logger.error({ err }, 'message')`

**Uncaught exception handling:**
```typescript
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled rejection');
});
```

## Comments

**When to Comment:**
- JSDoc on exported functions with complex logic
- Inline comments for non-obvious business logic
- Explain why, not what (code shows what)
- Mark test intent with descriptive comments

**Examples:**
```typescript
/**
 * Mark the container as idle-waiting (finished work, waiting for IPC input).
 * If tasks are pending, preempt the idle container immediately.
 */
notifyIdle(groupJid: string): void { ... }

/**
 * Mount Allowlist - Security configuration for additional mounts
 * This file should be stored at ~/.config/nanoclaw/mount-allowlist.json
 * and is NOT mounted into any container, making it tamper-proof from agents.
 */
export interface MountAllowlist { ... }
```

**Test comments:**
```typescript
// Sentinel markers must match container-runner.ts
const OUTPUT_START_MARKER = '---NANOCLAW_OUTPUT_START---';

// The registry is module-level state, so we need a fresh module per test.
// Tests are ordered to account for cumulative registrations.
```

## Function Design

**Size:** Functions are kept small and focused (< 50 lines typical). Complex logic is broken into smaller helper functions.

**Parameters:**
- Max 3-4 parameters before considering object parameter
- Parameters with defaults: `function fn(a: string, b = 'default'): void`
- Unused parameters must be prefixed with `_`

**Return Values:**
- Boolean returns for operations with clear success/failure: `sendMessage(): boolean`
- `Promise<void>` for async operations that throw on failure
- Explicit typed return objects for complex operations: `getNewMessages(): { messages, newTimestamp }`

**Patterns:**
- Async/await for asynchronous operations
- Early returns for guard clauses
- Named exports for public API, internal functions use underscore prefix

## Module Design

**Exports:**
- Named exports for all public APIs
- Re-exports for backwards compatibility: `export { escapeXml, formatMessages } from './router.js';`
- No default exports

**Barrel Files:**
- Channels module uses `src/channels/index.ts` for self-registration side effects
- Imports registered channels: `import './channels/index.js';`

**Private Module State:**
- Singleton state kept at module level: `let db: Database.Database;`
- Test helpers prefixed with underscore: `_initTestDatabase()`, `_setRegisteredGroups()`

**File Structure Pattern:**
```
src/
├── config.ts          # Configuration and constants
├── logger.ts          # Logging setup
├── types.ts          # Shared type definitions
├── index.ts          # Main entry point (orchestrator)
├── db.ts              # Database operations
├── router.ts          # Message routing utilities
├── group-queue.ts     # Queue management
├── channels/
│   ├── index.ts      # Channel registration (side-effect import)
│   └── registry.ts   # Channel registry
└── [module].ts       # Each major feature in its own file
```

---

*Convention analysis: 2026-04-04*
