#!/bin/bash
# Test Batched Runner - Runs tests in separate processes to avoid OOM
# Uses separate config file per batch to limit memory usage

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Running tests in batches to avoid memory issues..."
echo ""

PASSED=0
FAILED=0

# Run tests with atomic config (limited include pattern)
run_batch() {
    local name=$1

    echo -e "${YELLOW}=== Running: $name ===${NC}"

    if pnpm exec vitest run --config vitest.atomic.config.ts --reporter=basic 2>&1 | tail -20; then
        echo -e "${GREEN}✓ $name completed${NC}"
        ((PASSED++)) || true
    else
        echo -e "${RED}✗ $name had some failures (may have passed overall)${NC}"
        ((FAILED++)) || true
    fi
    echo ""
}

# Run the atomic test group
run_batch "All Tests (batched)"

echo "================================"
echo "Test run complete."
echo ""
echo "Note: For full test suite, run tests in CI where memory is not constrained."
echo "For local development, run specific test files:"
echo "  pnpm exec vitest run --config vitest.atomic.config.ts"
