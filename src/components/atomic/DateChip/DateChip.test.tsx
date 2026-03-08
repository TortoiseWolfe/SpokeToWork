import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import DateChip from './DateChip';

describe('DateChip', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the formatted date', () => {
    render(<DateChip date="2026-03-15T10:00:00Z" />);
    expect(screen.getByText(/mar/i)).toBeInTheDocument();
  });

  it('shows label when provided', () => {
    render(<DateChip date="2026-03-15T10:00:00Z" label="Interview" />);
    expect(screen.getByText('Interview')).toBeInTheDocument();
  });

  it('applies badge-success for future dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01'));
    const { container } = render(<DateChip date="2026-03-15T10:00:00Z" />);
    expect(container.firstChild).toHaveClass('badge-success');
  });

  it('applies badge-error for past dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20'));
    const { container } = render(<DateChip date="2026-03-15T10:00:00Z" />);
    expect(container.firstChild).toHaveClass('badge-error');
  });

  it('applies custom className', () => {
    const { container } = render(
      <DateChip date="2026-03-15T10:00:00Z" className="custom" />
    );
    expect(container.firstChild).toHaveClass('custom');
  });
});
