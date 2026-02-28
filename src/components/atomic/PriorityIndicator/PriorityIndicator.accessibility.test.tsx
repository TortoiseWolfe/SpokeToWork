import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PriorityIndicator from './PriorityIndicator';

describe('PriorityIndicator Accessibility', () => {
  it('has role="img" with descriptive aria-label', () => {
    const { container } = render(<PriorityIndicator priority={2} />);
    const el = container.querySelector('[role="img"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('aria-label', 'Priority 2: High');
  });

  it('has title tooltip for hover context', () => {
    const { container } = render(<PriorityIndicator priority={3} />);
    const el = container.querySelector('[role="img"]');
    expect(el).toHaveAttribute('title', expect.stringContaining('P3'));
  });
});
