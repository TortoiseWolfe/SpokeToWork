import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

vi.mock('@/components/map/MapContainer', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    // Canvas accessibility is MapContainer's own concern, tested there.
    <div role="region" aria-label="Moderation map">
      {children}
    </div>
  ),
}));

vi.mock('react-map-gl/maplibre', () => ({
  Popup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import { ModerationMap } from './ModerationMap';

describe('ModerationMap — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <ModerationMap
        pendingMarkers={[]}
        approvedMarkers={[]}
        selectedContributionId={null}
        onSelectPending={() => {}}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
