import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PriorityIndicator from './PriorityIndicator';

describe('PriorityIndicator', () => {
  it('renders 5 pips for priority 1', () => {
    const { container } = render(<PriorityIndicator priority={1} />);
    const pips = container.querySelectorAll('[role="img"] > span');
    expect(pips).toHaveLength(5);
  });

  it('has correct aria-label for priority 1', () => {
    render(<PriorityIndicator priority={1} />);
    expect(
      screen.getByRole('img', { name: /priority 1: critical/i })
    ).toBeInTheDocument();
  });

  it('has correct aria-label for priority 5', () => {
    render(<PriorityIndicator priority={5} />);
    expect(
      screen.getByRole('img', { name: /priority 5: minimal/i })
    ).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <PriorityIndicator priority={3} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
