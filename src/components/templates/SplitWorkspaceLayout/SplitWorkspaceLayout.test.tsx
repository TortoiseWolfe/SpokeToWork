import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockDeviceType = vi.fn();
vi.mock('@/hooks/useDeviceType', () => ({
  useDeviceType: () => mockDeviceType(),
}));

import { SplitWorkspaceLayout } from './SplitWorkspaceLayout';

describe('SplitWorkspaceLayout', () => {
  beforeEach(() => {
    mockDeviceType.mockReset();
  });

  describe('desktop', () => {
    beforeEach(() => {
      mockDeviceType.mockReturnValue({
        category: 'desktop',
        isTouch: false,
        viewportWidth: 1440,
      });
    });

    it('renders table and map slots side by side', () => {
      render(
        <SplitWorkspaceLayout
          table={<div data-testid="slot-table">table</div>}
          map={<div data-testid="slot-map">map</div>}
          mobileSheet={<div data-testid="slot-sheet">sheet</div>}
        />
      );
      expect(screen.getByTestId('slot-table')).toBeInTheDocument();
      expect(screen.getByTestId('slot-map')).toBeInTheDocument();
      expect(screen.queryByTestId('slot-sheet')).not.toBeInTheDocument();
    });

    it('uses a flex row with a width-collapsible table panel', () => {
      render(
        <SplitWorkspaceLayout
          table={<div>t</div>}
          map={<div>m</div>}
          mobileSheet={<div>s</div>}
        />
      );
      const root = screen.getByTestId('split-workspace-desktop');
      expect(root.className).toMatch(/flex/);
      expect(
        screen.getByTestId('split-workspace-table-panel').className
      ).toMatch(/w-1\/2/);
    });

    it('table panel scrolls, map panel does not', () => {
      render(
        <SplitWorkspaceLayout
          table={<div>t</div>}
          map={<div>m</div>}
          mobileSheet={<div>s</div>}
        />
      );
      expect(
        screen.getByTestId('split-workspace-table-panel').className
      ).toMatch(/overflow-y-auto/);
      expect(screen.getByTestId('split-workspace-map-panel').className).toMatch(
        /overflow-hidden/
      );
    });

    it('exposes map and table panels as labelled regions', () => {
      render(
        <SplitWorkspaceLayout
          table={<div>t</div>}
          map={<div>m</div>}
          mobileSheet={<div>s</div>}
          mapLabel="Company map"
          tableLabel="Company list"
        />
      );
      expect(screen.getByRole('region', { name: 'Company map' })).toBe(
        screen.getByTestId('split-workspace-map-panel')
      );
      expect(screen.getByRole('region', { name: 'Company list' })).toBe(
        screen.getByTestId('split-workspace-table-panel')
      );
    });
  });

  describe('tablet — treated as desktop layout', () => {
    it('uses the side-by-side grid (tablet is wide enough)', () => {
      mockDeviceType.mockReturnValue({
        category: 'tablet',
        isTouch: true,
        viewportWidth: 1024,
      });
      render(
        <SplitWorkspaceLayout
          table={<div data-testid="slot-table">t</div>}
          map={<div data-testid="slot-map">m</div>}
          mobileSheet={<div data-testid="slot-sheet">s</div>}
        />
      );
      expect(screen.getByTestId('split-workspace-desktop')).toBeInTheDocument();
      expect(screen.queryByTestId('slot-sheet')).not.toBeInTheDocument();
    });
  });

  describe('mobile', () => {
    beforeEach(() => {
      mockDeviceType.mockReturnValue({
        category: 'mobile',
        isTouch: true,
        viewportWidth: 390,
      });
    });

    it('renders map full-screen and mobileSheet slot, not table', () => {
      render(
        <SplitWorkspaceLayout
          table={<div data-testid="slot-table">table</div>}
          map={<div data-testid="slot-map">map</div>}
          mobileSheet={<div data-testid="slot-sheet">sheet</div>}
        />
      );
      expect(screen.getByTestId('slot-map')).toBeInTheDocument();
      expect(screen.getByTestId('slot-sheet')).toBeInTheDocument();
      expect(screen.queryByTestId('slot-table')).not.toBeInTheDocument();
    });

    it('map panel is fixed inset', () => {
      render(
        <SplitWorkspaceLayout
          table={<div>t</div>}
          map={<div>m</div>}
          mobileSheet={<div>s</div>}
        />
      );
      expect(
        screen.getByTestId('split-workspace-mobile-map').className
      ).toMatch(/fixed/);
      expect(
        screen.getByTestId('split-workspace-mobile-map').className
      ).toMatch(/inset-0/);
    });

    it('map panel has a region landmark with label', () => {
      render(
        <SplitWorkspaceLayout
          table={<div>t</div>}
          map={<div>m</div>}
          mobileSheet={<div>s</div>}
          mapLabel="Company map"
        />
      );
      expect(screen.getByRole('region', { name: 'Company map' })).toBe(
        screen.getByTestId('split-workspace-mobile-map')
      );
    });
  });

  describe('hydration', () => {
    it('renders skeleton before mount, then real layout', () => {
      mockDeviceType.mockReturnValue({
        category: 'mobile',
        isTouch: true,
        viewportWidth: 390,
      });
      render(
        <SplitWorkspaceLayout
          table={<div>t</div>}
          map={<div>m</div>}
          mobileSheet={<div>s</div>}
        />
      );
      // Post-mount: skeleton is gone, mobile layout is present.
      expect(
        screen.queryByTestId('split-workspace-skeleton')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('split-workspace-mobile')).toBeInTheDocument();
    });
  });
});
