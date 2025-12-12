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

    if pnpm exec vitest run "$pattern" --reporter=basic --pool=forks --poolOptions.forks.singleFork 2>&1 | tee /tmp/batch-output.txt | tail -5; then
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

# Variant using threads pool - for tests that crash with forks due to IPC cleanup issues
run_batch_threads() {
    local name=$1
    local pattern=$2

    echo -e "${YELLOW}=== $name ===${NC}"

    if pnpm exec vitest run "$pattern" --reporter=basic --pool=threads 2>&1 | tee /tmp/batch-output.txt | tail -5; then
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

# Batch 4: Organism components - explicit directories (vitest doesn't expand globs)
run_batch "Organisms (A-C)" "src/components/organisms/AdminModerationQueue src/components/organisms/ApplicationForm src/components/organisms/ChatWindow src/components/organisms/CompanyDetailDrawer src/components/organisms/CompanyForm src/components/organisms/CompanyImport src/components/organisms/CompanyTable src/components/organisms/ConnectionManager src/components/organisms/ConversationList src/components/organisms/CreateGroupModal"
run_batch "Organisms (H-U)" "src/components/organisms/HomeLocationSettings src/components/organisms/NextRidePanel src/components/organisms/RouteBuilder src/components/organisms/RouteCompanyList src/components/organisms/RouteDetailDrawer src/components/organisms/RouteSidebar src/components/organisms/UnifiedSidebar"

# Batch 5: Other component directories
run_batch "Auth Components" "src/components/auth"
run_batch "Form Components" "src/components/forms"
run_batch "Map Components" "src/components/map"
run_batch "Payment Components" "src/components/payment"
run_batch "Privacy Components" "src/components/privacy"
run_batch "Subatomic Components" "src/components/subatomic"

# Batch 5: Lib - split by subdirectory to prevent OOM
run_batch "Lib (messaging)" "src/lib/messaging"
run_batch "Lib (companies)" "src/lib/companies"
run_batch "Lib (logger)" "src/lib/logger"
run_batch "Lib (auth)" "src/lib/auth"
run_batch "Lib (payments)" "src/lib/payments"
run_batch "Lib (validation)" "src/lib/validation"
run_batch "Lib (avatar)" "src/lib/avatar"

# Batch 6: Services - split by file to prevent OOM
run_batch "Services (welcome)" "src/services/messaging/welcome-service.test.ts"
run_batch "Services (connection)" "src/services/messaging/__tests__/connection-service.test.ts"
run_batch "Services (message)" "src/services/messaging/__tests__/message-service.test.ts"
run_batch "Services (offline-queue)" "src/services/messaging/__tests__/offline-queue-service.test.ts"
run_batch "Services (group-key)" "src/services/messaging/__tests__/group-key-service.test.ts"
run_batch "Services (key)" "src/services/messaging/__tests__/key-service.test.ts"
run_batch "Services (gdpr)" "src/services/messaging/__tests__/gdpr-service.test.ts"

run_batch "Schemas" "src/schemas"

# Utils split - jsdom-sensitive tests run individually to avoid pollution
run_batch "Utils (consent)" "src/utils/consent-history.test.ts"
run_batch "Utils (privacy)" "src/utils/privacy.test.ts"
run_batch "Utils (privacy-utils)" "src/utils/privacy-utils.test.ts"
run_batch "Utils (offline-queue)" "src/utils/offline-queue.browser.test.ts"

# Run remaining utils - each file as individual batch to prevent OOM
run_batch "Utils (error-handler)" "src/utils/error-handler.test.ts"
run_batch "Utils (font-loader)" "src/utils/font-loader.test.ts"
run_batch "Utils (web3forms)" "src/utils/web3forms.test.ts"
run_batch "Utils (background-sync)" "src/utils/background-sync.test.ts"
run_batch "Utils (performance)" "src/utils/performance.test.ts"
run_batch "Utils (consent)" "src/utils/consent.test.ts"
run_batch "Utils (email)" "src/utils/email/email-service.test.ts"  # isolate:false in workspace prevents IPC crash
run_batch "Utils (consent-types)" "src/utils/consent-types.test.ts"
run_batch "Utils (map-utils)" "src/utils/__tests__/map-utils.test.ts"
run_batch "Utils (analytics)" "src/utils/analytics.test.ts"
run_batch "Utils (colorblind)" "src/utils/__tests__/colorblind.test.ts"

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
