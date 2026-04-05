# Testing Patterns

**Analysis Date:** 2026-04-04

## Test Framework

**Runner:**
- Vitest 4.x (config: `vitest.config.ts`)
- Alternative skills config: `vitest.skills.config.ts`

**Assertion Library:**
- Vitest built-in `expect` API
- Matchers: `toBe`, `toEqual`, `toContain`, `toHaveLength`, `toBeDefined`, `toBeUndefined`, etc.

**Additional Libraries:**
- `@vitest/coverage-v8` - Code coverage reporting
- `better-sqlite3` - In-memory database for tests
- EventEmitter (Node.js built-in) - Mocking child processes

**Run Commands:**
```bash
npm run test              # Run all tests (vitest run)
npm run test:watch        # Watch mode (vitest)
npm run typecheck         # TypeScript validation
npm run lint              # ESLint validation
npm run build             # TypeScript compilation
```

## Test File Organization

**Location:**
- Co-located with source files in same directory
- File pattern: `*.test.ts` suffix
- Config: `vitest.config.ts` includes `['src/**/*.test.ts', 'setup/**/*.test.ts']`

**Naming:**
- `src/db.test.ts` - Tests for `src/db.ts`
- `src/channels/registry.test.ts` - Tests for `src/channels/registry.ts`
- `setup/register.test.ts` - Tests for `setup/register.ts`

**Structure:**
```
src/
├── db.ts                 # Implementation
├── db.test.ts           # Tests
├── index.ts             # Implementation
├── routing.test.ts      # Tests
└── channels/
    ├── registry.ts      # Implementation
    └── registry.test.ts # Tests
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- storeMessage (NewMessage format) ---

describe('storeMessage', () => {
  it('stores a message and retrieves it', () => {
    storeChatMetadata('group@g.us', '2024-01-01T00:00:00.000Z');
    store({ id: 'msg-1', chat_jid: 'group@g.us', ... });
    const messages = getMessagesSince('group@g.us', '2024-01-01T00:00:00.000Z', 'Andy');
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe('msg-1');
  });
});
```

**Test Organization Patterns:**
1. **Describe blocks** group related functionality: `describe('storeMessage')`, `describe('getMessagesSince')`
2. **It blocks** test specific behaviors with descriptive names
3. **Comments** separate test groups: `// --- storeMessage ---`
4. **beforeEach** for common setup (database initialization, test data)

**Setup Pattern (from db.test.ts):**
```typescript
beforeEach(() => {
  _initTestDatabase();  // Reset test database
});

// Helper to store a message using the normalized NewMessage interface
function store(overrides: { id: string; chat_jid: string; ... }) {
  storeMessage({
    id: overrides.id,
    chat_jid: overrides.chat_jid,
    sender: overrides.sender,
    sender_name: overrides.sender_name,
    content: overrides.content,
    timestamp: overrides.timestamp,
    is_from_me: overrides.is_from_me ?? false,
  });
}
```

**Assertion Patterns:**
```typescript
expect(messages).toHaveLength(1);
expect(messages[0].content).toBe('updated');
expect(getTaskById('task-3')).toBeUndefined();
expect(group.isMain).toBe(true);
expect(group.isMain).toBeUndefined();  // Optional properties
expect(messages[1].timestamp > messages[0].timestamp).toBe(true);  // Ordering
```

## Mocking

**Framework:** Vitest's `vi` API

**Patterns:**

1. **Mocking modules with vi.mock:**
```typescript
vi.mock('./config.js', () => ({
  CONTAINER_IMAGE: 'nanoclaw-agent:latest',
  CONTAINER_MAX_OUTPUT_SIZE: 10485760,
  CONTAINER_TIMEOUT: 1800000,
  DATA_DIR: '/tmp/nanoclaw-test-data',
  GROUPS_DIR: '/tmp/nanoclaw-test-groups',
  IDLE_TIMEOUT: 1800000,
  ONECLI_URL: 'http://localhost:10254',
  TIMEZONE: 'America/Los_Angeles',
}));
```

2. **Mocking with actual module preserved:**
```typescript
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(() => false),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
      readFileSync: vi.fn(() => ''),
    },
  };
});
```

3. **Mocking class instances:**
```typescript
vi.mock('@onecli-sh/sdk', () => ({
  OneCLI: class {
    applyContainerConfig = vi.fn().mockResolvedValue(true);
    createAgent = vi.fn().mockResolvedValue({ id: 'test' });
    ensureAgent = vi.fn().mockResolvedValue({ name: 'test', identifier: 'test', created: true });
  },
}));
```

4. **Mocking functions:**
```typescript
vi.mock('./mount-security.js', () => ({
  validateAdditionalMounts: vi.fn(() => []),
}));
```

5. **Mocking child_process spawn:**
```typescript
vi.mock('child_process', async () => {
  const actual = await vi.importActual<typeof import('child_process')>('child_process');
  return {
    ...actual,
    spawn: vi.fn(() => fakeProc),
    exec: vi.fn((_cmd: string, _opts: unknown, cb?: (err: Error | null) => void) => {
      if (cb) cb(null);
      return new EventEmitter();
    }),
  };
});
```

**Mock Function Creation:**
```typescript
const onOutput = vi.fn(async () => {});

// Assertions
expect(onOutput).toHaveBeenCalledWith(
  expect.objectContaining({ result: 'Here is my response' }),
);
expect(onOutput).not.toHaveBeenCalled();
```

**Fake Timers:**
```typescript
beforeEach(() => {
  vi.useFakeTimers();
  fakeProc = createFakeProcess();
});

afterEach(() => {
  vi.useRealTimers();
});

// Advance timers
await vi.advanceTimersByTimeAsync(10);
await vi.advanceTimersByTimeAsync(1830000);
```

**Fake Process Creation (for child_process mocking):**
```typescript
function createFakeProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    stdin: PassThrough;
    stdout: PassThrough;
    stderr: PassThrough;
    kill: ReturnType<typeof vi.fn>;
    pid: number;
  };
  proc.stdin = new PassThrough();
  proc.stdout = new PassThrough();
  proc.stderr = new PassThrough();
  proc.kill = vi.fn();
  proc.pid = 12345;
  return proc;
}
```

**What to Mock:**
- External modules: `vi.mock('./config.js')`
- Node.js built-ins with side effects: `vi.mock('fs')`, `vi.mock('child_process')`
- Third-party SDKs: `vi.mock('@onecli-sh/sdk')`
- Functions with complex behavior: `vi.fn()`

**What NOT to Mock:**
- Test utilities (better-sqlite3 for integration tests)
- Modules under test
- Simple pure functions
- Test data factories/helpers

## Fixtures and Factories

**Test Data:**
- Inline factory functions for test objects: `makeMsg(overrides)` pattern
- Constants for sentinel values: `OUTPUT_START_MARKER`, `OUTPUT_END_MARKER`
- Date strings as ISO format: `'2024-01-01T00:00:00.000Z'`

**Example from routing.test.ts:**
```typescript
function makeMsg(overrides: Partial<NewMessage> = {}): NewMessage {
  return {
    id: '1',
    chat_jid: 'group@g.us',
    sender: '123@s.whatsapp.net',
    sender_name: 'Alice',
    content: 'hello',
    timestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}
```

**Test Database:**
- In-memory SQLite database for each test suite
- Schema created in beforeEach
- Data reset between tests via `_initTestDatabase()`

**Example from register.test.ts:**
```typescript
function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`CREATE TABLE IF NOT EXISTS registered_groups (...)`);
  return db;
}

beforeEach(() => {
  db = createTestDb();
});
```

**Test Fixtures for Files:**
```typescript
let tmpDir: string;
let groupsDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nanoclaw-register-test-'));
  groupsDir = path.join(tmpDir, 'groups');
  fs.mkdirSync(path.join(groupsDir, 'main'), { recursive: true });
  // ... create test files
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
```

## Test Types

**Unit Tests:**
- Focus on isolated functions and classes
- Extensive mocking of dependencies
- Examples: `registry.test.ts`, `routing.test.ts`, `formatting.test.ts`

**Integration Tests:**
- Test database interactions with in-memory SQLite
- Example: `db.test.ts` (500+ lines, comprehensive CRUD coverage)
- Example: `container-runner.test.ts` (full timeout and output processing flow)

**Setup/Registration Tests:**
- File system operations and templating logic
- Example: `setup/register.test.ts` (400+ lines)
- Covers: SQL injection prevention, template copying, CLAUDE.md updates

## Coverage

**Requirements:** Not explicitly enforced

**View Coverage:**
```bash
npm run test  # Run tests
```

**Coverage patterns observed:**
- Comprehensive test suites with edge cases
- Database operations: 100+ test cases in `db.test.ts`
- Boundary conditions: LIMIT behavior, timestamp filtering, empty arrays
- Error cases: SQL injection, missing templates, duplicate inserts
- State transitions: isMain flag changes, re-registration scenarios

## Common Patterns

**Async Testing:**
```typescript
it('timeout after output resolves as success', async () => {
  const resultPromise = runContainerAgent(testGroup, testInput, () => {}, onOutput);

  emitOutputMarker(fakeProc, { status: 'success', result: 'response', newSessionId: 'session-123' });
  await vi.advanceTimersByTimeAsync(10);
  await vi.advanceTimersByTimeAsync(1830000);
  fakeProc.emit('close', 137);
  await vi.advanceTimersByTimeAsync(10);

  const result = await resultPromise;
  expect(result.status).toBe('success');
});
```

**Error Testing:**
```typescript
it('timeout with no output resolves as error', async () => {
  const resultPromise = runContainerAgent(testGroup, testInput, () => {}, onOutput);
  await vi.advanceTimersByTimeAsync(1830000);
  fakeProc.emit('close', 137);
  await vi.advanceTimersByTimeAsync(10);

  const result = await resultPromise;
  expect(result.status).toBe('error');
  expect(result.error).toContain('timed out');
  expect(onOutput).not.toHaveBeenCalled();
});
```

**Module State Testing:**
```typescript
// Registry is module-level state, so tests are ordered
describe('channel registry', () => {
  it('getChannelFactory returns undefined for unknown channel', () => {
    expect(getChannelFactory('nonexistent')).toBeUndefined();
  });

  it('registerChannel and getChannelFactory round-trip', () => {
    const factory = () => null;
    registerChannel('test-channel', factory);
    expect(getChannelFactory('test-channel')).toBe(factory);
  });
  // Note: Later tests depend on earlier registrations
});
```

**Parameterization Testing:**
```typescript
it('handles requiresTrigger=false', () => {
  // Test specific configuration
});

it('defaults is_main to 0', () => {
  // Test default behavior
});

it('stores is_main flag', () => {
  // Test explicit setting
});
```

**Boundary Condition Testing:**
```typescript
it('returns empty for no registered groups', () => {
  const { messages, newTimestamp } = getNewMessages([], '', 'Andy');
  expect(messages).toHaveLength(0);
  expect(newTimestamp).toBe('');
});

it('handles empty string', () => {
  expect(escapeXml('')).toBe('');
});
```

---

*Testing analysis: 2026-04-04*
