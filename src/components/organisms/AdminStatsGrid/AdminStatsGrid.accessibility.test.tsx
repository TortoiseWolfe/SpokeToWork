import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import AdminStatsGrid from './AdminStatsGrid';

describe('AdminStatsGrid a11y', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <AdminStatsGrid
        totalRoutes={10}
        activeRoutes={7}
        inactiveRoutes={3}
        avgStopsPerRoute={4}
        avgDistanceMiles={12}
        routesPerMetro={[{ metroId: 'm1', metroName: 'Cleveland', count: 10 }]}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
