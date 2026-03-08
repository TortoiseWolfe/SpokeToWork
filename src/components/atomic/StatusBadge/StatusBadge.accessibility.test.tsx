import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import StatusBadge from './StatusBadge';

expect.extend(toHaveNoViolations);

describe('StatusBadge Accessibility', () => {
  it('has no axe violations for known status', async () => {
    const { container } = render(<StatusBadge status="screening" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations for unknown status', async () => {
    const { container } = render(<StatusBadge status="mystery" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
