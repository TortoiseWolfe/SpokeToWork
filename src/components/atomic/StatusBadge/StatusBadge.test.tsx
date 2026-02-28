import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('renders known status with mapped class and label', () => {
    render(<StatusBadge status="interviewing" />);
    const badge = screen.getByText('Interviewing');
    expect(badge).toHaveClass('badge', 'badge-primary');
  });

  it('renders unknown status as neutral with raw string', () => {
    render(<StatusBadge status="on_hold" />);
    const badge = screen.getByText('on_hold');
    expect(badge).toHaveClass('badge', 'badge-neutral');
  });

  it('renders "Unknown" for empty status', () => {
    render(<StatusBadge status="" />);
    expect(screen.getByText('Unknown')).toHaveClass('badge-neutral');
  });

  it('merges custom className', () => {
    render(<StatusBadge status="applied" className="badge-lg" />);
    expect(screen.getByText('Applied')).toHaveClass('badge-info', 'badge-lg');
  });
});
