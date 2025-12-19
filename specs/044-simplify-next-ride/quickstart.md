# Quickstart: Simplify Next Ride Feature

**Feature**: 044-simplify-next-ride
**Date**: 2025-12-18

## Prerequisites

- Docker and Docker Compose installed
- Repository cloned
- `.env` file configured with Supabase credentials

## Development Setup

```bash
# Start development environment
docker compose up

# Verify dev server is running
curl http://localhost:3001/

# Access the companies page
open http://localhost:3001/companies
```

## Testing the Feature

### Manual Testing

1. **Set an active route**:
   - Go to the companies page
   - In the route sidebar (left), click a route to set it as active
   - The route should be highlighted

2. **Test the filter**:
   - Check the "On Active Route" checkbox in the filters
   - Only companies on the active route should appear
   - Uncheck to see all companies again

3. **Test the visual indicator**:
   - With filter unchecked, companies on active route should show a bicycle icon
   - Hover over the icon to see tooltip "On active route"

4. **Test empty state**:
   - Set an active route that has no companies
   - Check the "On Active Route" filter
   - Should see message "No companies on this route yet"

5. **Test mobile**:
   - Resize browser to mobile width
   - Visual indicator should be icon-only (no text)

### Automated Testing

```bash
# Run unit tests
docker compose exec spoketowork pnpm test src/components/molecular/CompanyFilters
docker compose exec spoketowork pnpm test src/components/organisms/CompanyTable

# Run E2E tests
docker compose exec spoketowork pnpm exec playwright test tests/e2e/companies/

# Run accessibility tests
docker compose exec spoketowork pnpm run test:a11y
```

## Key Files

| File                                                         | Purpose              |
| ------------------------------------------------------------ | -------------------- |
| `src/components/molecular/CompanyFilters/CompanyFilters.tsx` | Filter checkbox      |
| `src/components/molecular/CompanyRow/CompanyRow.tsx`         | Visual indicator     |
| `src/components/organisms/CompanyTable/CompanyTable.tsx`     | Table with filtering |
| `src/app/companies/page.tsx`                                 | Page wiring          |
| `src/hooks/useRoutes.ts`                                     | Active route data    |
| `src/types/company.ts`                                       | Type definitions     |

## Troubleshooting

### Filter not working

1. Check that you have an active route set
2. Verify the route has companies added to it
3. Check browser console for errors

### Visual indicator not showing

1. Ensure `activeRouteCompanyIds` prop is passed to CompanyTable
2. Check that company ID matches (shared vs private company)

### Tests failing

```bash
# Clear test cache and re-run
docker compose exec spoketowork pnpm run clean:next
docker compose exec spoketowork pnpm test --run
```

## Related Documentation

- [Spec](./spec.md) - Feature specification
- [Plan](./plan.md) - Implementation plan
- [Research](./research.md) - Design decisions
- [Data Model](./data-model.md) - Entity relationships
