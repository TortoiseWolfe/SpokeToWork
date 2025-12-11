#!/bin/bash
# Run full test suite in batches to avoid OOM
# Each batch runs in a separate vitest process that exits and frees memory

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

export NODE_OPTIONS="--max-old-space-size=4096"

echo -e "${YELLOW}Running tests in batches to avoid OOM...${NC}"
echo ""

FAILED=0
TOTAL_PASSED=0
TOTAL_FAILED=0

run_batch() {
    local name=$1
    local pattern=$2

    echo -e "${YELLOW}=== $name ===${NC}"

    if pnpm exec vitest run "$pattern" --reporter=basic 2>&1 | tee /tmp/batch-output.txt | tail -5; then
        # Extract pass/fail counts
        PASSED=$(grep -oP '\d+(?= passed)' /tmp/batch-output.txt | tail -1 || echo "0")
        FAILED_COUNT=$(grep -oP '\d+(?= failed)' /tmp/batch-output.txt | tail -1 || echo "0")
        TOTAL_PASSED=$((TOTAL_PASSED + ${PASSED:-0}))
        TOTAL_FAILED=$((TOTAL_FAILED + ${FAILED_COUNT:-0}))
        echo -e "${GREEN}✓ $name complete${NC}"
    else
        echo -e "${RED}✗ $name had failures${NC}"
        FAILED=1
    fi
    echo ""
}

# Batch 1: Atomic components (fast, small)
run_batch "Atomic Components" "src/components/atomic"

# Batch 2: Molecular components
run_batch "Molecular Components" "src/components/molecular"

# Batch 3: Organism components - split into smaller batches to avoid OOM
run_batch "Organisms (Auth/Avatar)" "src/components/organisms/Auth* src/components/organisms/Avatar*"
run_batch "Organisms (Blog/Chat)" "src/components/organisms/Blog* src/components/organisms/Chat*"
run_batch "Organisms (Company/Connection)" "src/components/organisms/Company* src/components/organisms/Connection*"
run_batch "Organisms (Consent/Cookie)" "src/components/organisms/Consent* src/components/organisms/Cookie*"
run_batch "Organisms (Dashboard-Home)" "src/components/organisms/Dashboard* src/components/organisms/Home*"
run_batch "Organisms (Message-Payment)" "src/components/organisms/Message* src/components/organisms/Payment*"
run_batch "Organisms (Privacy-Route)" "src/components/organisms/Privacy* src/components/organisms/Route*"
run_batch "Organisms (Settings-Unified)" "src/components/organisms/Settings* src/components/organisms/Unified*"

# Batch 4: Hooks
run_batch "Hooks" "src/hooks"

# Batch 5: Lib/Services
run_batch "Lib & Services" "src/lib src/services src/schemas src/utils"

# Batch 6: Unit tests in tests/
run_batch "Unit Tests" "tests/unit"

# Batch 7: Remaining tests
run_batch "Other Tests" "src/tests"

echo "================================"
echo -e "Total: ${GREEN}$TOTAL_PASSED passed${NC}, ${RED}$TOTAL_FAILED failed${NC}"

if [ $FAILED -eq 1 ] || [ $TOTAL_FAILED -gt 0 ]; then
    echo -e "${RED}Some tests failed${NC}"
    exit 1
else
    echo -e "${GREEN}All batches completed successfully${NC}"
    exit 0
fi
