import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { VisibilityControls } from './VisibilityControls';

expect.extend(toHaveNoViolations);

describe('VisibilityControls accessibility', () => {
  it('has no axe violations in default state', async () => {
    const { container } = render(
      <VisibilityControls
        profilePublic={true}
        resumeVisibleTo="none"
        onChange={() => {}}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations in all-open state', async () => {
    const { container } = render(
      <VisibilityControls
        profilePublic={true}
        resumeVisibleTo="all_employers"
        onChange={() => {}}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations in disabled state', async () => {
    const { container } = render(
      <VisibilityControls
        profilePublic={false}
        resumeVisibleTo="applied"
        onChange={() => {}}
        disabled={true}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
