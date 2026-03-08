import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

vi.mock('@/hooks/useDeviceType', () => ({
  useDeviceType: () => ({
    category: 'desktop',
    isTouch: false,
    viewportWidth: 1440,
  }),
}));

import { SplitWorkspaceLayout } from './SplitWorkspaceLayout';

describe('SplitWorkspaceLayout — accessibility', () => {
  it('has no axe violations (desktop)', async () => {
    const { container } = render(
      <SplitWorkspaceLayout
        table={<div>table</div>}
        map={<div>map</div>}
        mobileSheet={<div>sheet</div>}
      />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
