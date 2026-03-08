import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

vi.mock('@/contexts/CompanyWorkspaceContext', () => ({
  useCompanyWorkspace: () => ({
    selectedCompanyId: null,
    selectCompany: vi.fn(),
    clearSelection: vi.fn(),
    activeRouteCompanyIds: new Set<string>(),
    refreshRouteCompanyIds: vi.fn(),
  }),
}));

vi.mock('@/components/map/MapContainer', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    // Canvas accessibility is MapContainer's own concern, tested there.
    // Here we assert CompanyMap's wrapper markup doesn't add violations.
    <div role="region" aria-label="Company map">
      {children}
    </div>
  ),
}));

import { CompanyMap } from './CompanyMap';

describe('CompanyMap — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <CompanyMap markers={[]} center={[0, 0]} zoom={10} />,
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
