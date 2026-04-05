# Requirements: NanoClaw Observational Memory

**Defined:** 2026-04-04
**Core Value:** Agents that maintain persistent, compressed memory across separate invocations and container restarts

## v1 Requirements

### Memory Integration

- [ ] **MEM-01**: Install @mastra/memory and @mastra/libsql in agent container
- [ ] **MEM-02**: Initialize Mastra Memory with observationalMemory enabled in agent-runner
- [ ] **MEM-03**: Configure token-based compression thresholds (messageTokens, reflection.observationTokens)
- [ ] **MEM-04**: Persist LibSQL store to per-group mounted directory (survives container restarts)

### Memory Operations

- [ ] **MEM-05**: Before query — retrieve compressed observations for threadId (sessionId), inject into prompt
- [ ] **MEM-06**: After query — save user/assistant message pair as observation
- [ ] **MEM-07**: Use resourceId = chatJid (per-group), threadId = sessionId (per-user thread)

### Configuration

- [ ] **MEM-08**: Expose memory configuration via environment variables or group config
- [ ] **MEM-09**: Configurable token thresholds (observation.messageTokens, reflection.observationTokens)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Semantic recall / vector search | Using only observational memory, no embeddings |
| Procedural memory | Deferred to future work |
| Full Mastra agent/server | Using only the memory package standalone |
| Cross-group memory | Per-group resourceId scoping |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MEM-01 | Phase 1 | Pending |
| MEM-02 | Phase 1 | Pending |
| MEM-03 | Phase 1 | Pending |
| MEM-04 | Phase 1 | Pending |
| MEM-05 | Phase 2 | Pending |
| MEM-06 | Phase 2 | Pending |
| MEM-07 | Phase 1 | Pending |
| MEM-08 | Phase 1 | Pending |
| MEM-09 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 after initial definition*
