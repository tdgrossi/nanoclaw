/**
 * Mastra Memory initialization and observation retrieval.
 * Phase 1: Setup & Initialization
 * Phase 2: Memory Operations (retrieveObservations used there)
 */

import { createMemory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

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

  // Ensure .mastra directory exists in the per-group mounted workspace
  // This directory is on the mounted volume, persisting across container restarts
  const { mkdirSync } = require('fs');
  mkdirSync(MEMORY_DIR, { recursive: true });

  const store = new LibSQLStore({
    url: `file:${MEMORY_DIR}/${MEMORY_DB}`,
  });

  const memory = createMemory({
    store,
    observationalMemory: true,
    options: {
      messageTokens,
      reflection: {
        observationTokens,
      },
    },
    // resourceId = chatJid per D-05
    // threadId = sessionId per D-05
    // Both are passed from ContainerInput in main()
  });

  // Store in module-level variable for retrieveObservations() in Phase 2
  (_memoryInstance as { resourceId: string; threadId: string; memory: ReturnType<typeof createMemory> } | null) = {
    resourceId,
    threadId,
    memory,
  };
}

// Module-level reference for cross-function access
let _memoryInstance: { resourceId: string; threadId: string; memory: ReturnType<typeof createMemory> } | null = null;

/**
 * Retrieve compressed observations for the current resourceId/threadId.
 * To be called by Phase 2 before-query hook.
 */
export function retrieveObservations(resourceId: string, threadId: string): Promise<string> {
  if (!_memoryInstance) {
    throw new Error('Memory not initialized. Call initMemory() before retrieveObservations().');
  }
  return _memoryInstance.memory.getMemories(resourceId, threadId);
}