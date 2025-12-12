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

# Batch 1: Hooks (run early - useFontFamily needs jsdom, sensitive to env pollution)
run_batch "Hooks" "src/hooks"

# Batch 2: Atomic components
run_batch "Atomic Components" "src/components/atomic"

# Batch 3: Molecular components
run_batch "Molecular Components" "src/components/molecular"

# Batch 4: Organism components - split to avoid OOM
run_batch "Organisms (A-B)" "src/components/organisms/A* src/components/organisms/B*"
run_batch "Organisms (C)" "src/components/organisms/C*"
run_batch "Organisms (D-H)" "src/components/organisms/D* src/components/organisms/H*"
run_batch "Organisms (M-P)" "src/components/organisms/M* src/components/organisms/P*"
run_batch "Organisms (R-U)" "src/components/organisms/R* src/components/organisms/S* src/components/organisms/U*"

# Batch 5: Other component directories
run_batch "Auth Components" "src/components/auth"
run_batch "Form Components" "src/components/forms"
run_batch "Map Components" "src/components/map"
run_batch "Payment Components" "src/components/payment"
run_batch "Privacy Components" "src/components/privacy"
run_batch "Subatomic Components" "src/components/subatomic"

# Batch 5: Lib/Services - split by directory
run_batch "Lib" "src/lib"
run_batch "Services" "src/services"
run_batch "Schemas" "src/schemas"

# Utils split - jsdom-sensitive tests run individually to avoid pollution
run_batch "Utils (consent)" "src/utils/consent-history.test.ts"
run_batch "Utils (privacy)" "src/utils/privacy.test.ts"
run_batch "Utils (privacy-utils)" "src/utils/privacy-utils.test.ts"
run_batch "Utils (rest)" "src/utils"

# Batch 6: Contexts
run_batch "Contexts" "src/contexts"

# Batch 7: Config
run_batch "Config" "src/config"

# Batch 8: Unit tests in tests/
run_batch "Unit Tests" "tests/unit"

# Batch 9: Integration tests
run_batch "Integration Tests" "tests/integration"

# Batch 10: Contract tests
run_batch "Contract Tests" "tests/contract"

# Batch 11: Remaining tests
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
