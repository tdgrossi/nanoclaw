/**
 * Mastra Memory initialization and observation retrieval.
 * Phase 1: Setup & Initialization
 * Phase 2: Memory Operations (retrieveObservations used there)
 */

import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import type { Memory as MemoryType } from '@mastra/memory';
import type { MastraDBMessage } from '@mastra/core/agent';

const MEMORY_DIR = '/workspace/group/.mastra';
const MEMORY_DB = 'memory.db';

// Token thresholds with defaults per D-02 and D-03
const DEFAULT_MESSAGE_TOKENS = 60000;
const DEFAULT_OBSERVATION_TOKENS = 35000;

function getEnvToken(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (val !== undefined) {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return defaultValue;
}

function log(message: string): void {
  console.error(`[memory] ${message}`);
}

/**
 * Initialize Mastra Memory eagerly at container startup.
 * LibSQL store persists to /workspace/group/.mastra/memory.db (per-group mounted volume).
 *
 * Per D-01: Memory init failure is FATAL — throws, agent exits with error.
 * Per D-03: Eager initialization in main() before query loop.
 * Per D-04: Storage path is /workspace/group/.mastra/memory.db
 *
 * @param resourceId - chatJid from ContainerInput (per-group, shared across users)
 * @param threadId - sessionId from ContainerInput (per-session, per-user thread)
 */
export function initMemory(resourceId: string, threadId: string): void {
  const messageTokens = getEnvToken('MASTRA_MESSAGE_TOKENS', DEFAULT_MESSAGE_TOKENS);
  const observationTokens = getEnvToken('MASTRA_OBSERVATION_TOKENS', DEFAULT_OBSERVATION_TOKENS);

  log(`Initializing Mastra Memory — resourceId=${resourceId} threadId=${threadId} messageTokens=${messageTokens} observationTokens=${observationTokens}`);

  // Ensure .mastra directory exists in the per-group mounted workspace
  // This directory is on the mounted volume, persisting across container restarts
  const { mkdirSync } = require('fs');
  mkdirSync(MEMORY_DIR, { recursive: true });

  const store = new LibSQLStore({
    id: 'nanoclaw-memory',
    url: `file:${MEMORY_DIR}/${MEMORY_DB}`,
  });

  log(`LibSQL store at ${MEMORY_DIR}/${MEMORY_DB}`);

  // Type assertion needed: @mastra/memory types don't fully expose observationalMemory
  // at the MemoryConstructorConfig level, but the runtime JS code correctly handles
  // config.options.observationalMemory (see Memory class constructor in index.cjs)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memory = new Memory({
    storage: store,
    options: {
      observationalMemory: {
        enabled: true,
        observation: {
          messageTokens,
        },
        reflection: {
          observationTokens,
        },
      },
    },
  } as any);

  log('Mastra Memory initialized successfully');

  // Store in module-level variable for retrieveObservations() in Phase 2
  (_memoryInstance as { resourceId: string; threadId: string; memory: MemoryType } | null) = {
    resourceId,
    threadId,
    memory,
  };
}

// Module-level reference for cross-function access
let _memoryInstance: { resourceId: string; threadId: string; memory: MemoryType } | null = null;

/**
 * Retrieve compressed observations for the current resourceId/threadId.
 * To be called by Phase 2 before-query hook.
 *
 * The new API uses getContext() which returns systemMessage containing
 * observations embedded with working memory instructions.
 */
export async function retrieveObservations(resourceId: string, threadId: string): Promise<string> {
  if (!_memoryInstance) {
    throw new Error('Memory not initialized. Call initMemory() before retrieveObservations().');
  }
  log(`Retrieving observations — resourceId=${resourceId} threadId=${threadId}`);
  const result = await _memoryInstance.memory.getContext({ threadId, resourceId });
  const observations = result.systemMessage ?? '';
  log(`Retrieved ${observations.length} chars of observations`);
  return observations;
}

/**
 * Save a user/assistant message pair as a single observation.
 * To be called by Phase 2 after-query hook.
 *
 * The new API uses saveMessages() which the OM engine observes automatically.
 */
export async function saveObservation(resourceId: string, threadId: string, userMessage: string, assistantMessage: string): Promise<void> {
  if (!_memoryInstance) {
    throw new Error('Memory not initialized. Call initMemory() before saveObservation().');
  }
  log(`Saving observation — resourceId=${resourceId} threadId=${threadId} (user ${userMessage.length} chars, assistant ${assistantMessage.length} chars)`);

  // Build MastraDBMessage with required content format (format: 2, parts array)
  const messages: MastraDBMessage[] = [
    {
      id: `user-${Date.now()}`,
      role: 'user',
      createdAt: new Date(),
      content: {
        format: 2,
        parts: [{ type: 'text', text: userMessage }],
      },
    },
    {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      createdAt: new Date(),
      content: {
        format: 2,
        parts: [{ type: 'text', text: assistantMessage }],
      },
    },
  ];

  await _memoryInstance.memory.saveMessages({ messages });
  log('Observation saved successfully');
}