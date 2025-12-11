# Research: Test Suite Memory Optimization

**Feature**: 042-test-memory-optimization
**Date**: 2025-12-09

## Research Tasks

### 1. happy-dom vs jsdom Memory Usage

**Decision**: Use happy-dom as default test environment

**Rationale**:

- happy-dom uses significantly less memory than jsdom (~40-60% reduction in typical scenarios)
- **CORRECTION (CHK037)**: happy-dom is NOT installed. Must install via `pnpm add -D happy-dom`
- Compatible with Vitest and React Testing Library

**Alternatives considered**:
| Alternative | Reason Rejected |
|-------------|-----------------|
| Keep jsdom | Causes OOM crashes - the problem we're solving |
| node environment | No DOM APIs for component tests |

---

### 2. Vitest Sequential Execution

**Decision**: Use `pool: 'forks'` with `singleFork: true`

**Rationale**:

- Prevents memory accumulation across parallel workers
- Already proven pattern in `scripts/test-organisms-sequential.sh`
- Fork isolation prevents memory leaks from affecting subsequent tests

**Alternatives considered**:
| Alternative | Reason Rejected |
|-------------|-----------------|
| `pool: 'threads'` with singleThread | Forks provide better memory isolation |
| Multiple workers with memory limits | Harder to predict total memory usage |
| Default parallel execution | Causes memory accumulation leading to OOM |

---

### 3. Hybrid Environment Strategy

**Decision**: happy-dom default + per-file jsdom fallback for incompatible tests

**Rationale**:

- From clarification session - allows adopting happy-dom benefits while handling edge cases
- More granular control than all-or-nothing approach
- Can gradually fix incompatible tests over time

**Implementation Options**:

1. `environmentMatchGlobs` in vitest.config.ts for glob-based overrides
2. Inline `// @vitest-environment jsdom` comment at top of specific test files

---

### 4. NODE_OPTIONS Memory Limit

**Decision**: Set `NODE_OPTIONS='--max-old-space-size=4096'` in test scripts

**Rationale**:

- Explicit memory limit prevents runaway allocation
- Matches Docker container limit (4GB)
- Helps Node.js garbage collector make better decisions

**Alternatives considered**:
| Alternative | Reason Rejected |
|-------------|-----------------|
| Environment variable in .env | Not portable, easy to miss |
| Docker memory limits alone | Doesn't help Node.js GC behavior |
| Lower limit (e.g., 2048) | May be insufficient for large test suites |

---

## Resolved Unknowns

| Unknown                                     | Resolution                                                          |
| ------------------------------------------- | ------------------------------------------------------------------- |
| happy-dom compatibility with existing tests | Test after implementation; use `environmentMatchGlobs` for fallback |
| CI/CD impact                                | Out of scope - local Docker optimization only per clarification     |
| Rollback strategy                           | Hybrid approach - keep jsdom for incompatible tests via config      |
| Memory monitoring                           | Use `docker stats` during test execution                            |

## References

- Vitest Environment Configuration: https://vitest.dev/config/#environment
- happy-dom GitHub: https://github.com/nicholasricci/happy-dom
- Vitest Pool Options: https://vitest.dev/config/#pool
