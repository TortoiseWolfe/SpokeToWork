import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DateChip from './DateChip';

describe('DateChip Accessibility', () => {
  it('has a title attribute for full date on hover', () => {
    const { container } = render(<DateChip date="2026-03-15T10:00:00Z" />);
    expect(container.firstChild).toHaveAttribute('title');
  });

  it('renders as a span (inline, non-interactive)', () => {
    const { container } = render(<DateChip date="2026-03-15T10:00:00Z" />);
    expect(container.firstChild?.nodeName).toBe('SPAN');
  });
});
