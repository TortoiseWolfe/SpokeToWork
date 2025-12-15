# Performance Baseline

**Date**: 2025-12-15
**Status**: Pre-implementation

## Baseline Metrics (Manual Verification Required)

Before implementation, verify these metrics using Chrome DevTools:

### React Profiler Metrics

- [ ] Open React DevTools Profiler
- [ ] Record ConversationList interaction (typing in search)
- [ ] Record ConnectionManager interaction (accept/decline)
- [ ] Note wasted render percentage

### Network Tab Metrics

- [ ] Open Network tab, filter by XHR/Fetch
- [ ] Count requests over 1 minute with app idle
- [ ] Expected: Multiple polling requests from useOfflineQueue (30s), usePaymentButton (5s), connection-listener (30s)

### Expected Baseline (Pre-optimization)

- Wasted renders: >5% (target: <5%)
- Polling requests: ~20-30 per minute (target: 0 in steady state)
- CPU usage during idle: Elevated due to polling

## Post-Implementation Comparison

After completing all tasks, re-run these measurements to verify:

- Wasted renders reduced to <5%
- Polling requests reduced by 90%
- CPU usage reduced during idle
